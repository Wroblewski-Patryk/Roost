import { Router } from "express";
import { ActorType, OperatingStatus, Prisma, ProcedureStepType } from "@prisma/client";
import { z } from "zod";
import { adapterManifest } from "../../auth/capabilities";
import { prisma } from "../../db/prisma";
import { sendApiError } from "../../middleware/api-error";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

type CoverageStatus = "covered" | "partial" | "missing" | "deferred";

type CoverageRow = {
  concept: string;
  status: CoverageStatus;
  currentSources: string[];
  unsupportedTargetFields: string[];
  notes: string;
};

const targetCoverage: CoverageRow[] = [
  {
    concept: "Pipeline",
    status: "partial",
    currentSources: ["Process", "Pipeline", "PipelineStage", "PipelineRun"],
    unsupportedTargetFields: ["reusableType", "targetEntityType", "templateFlag", "paperclipEnabledFlag"],
    notes: "Current pipeline records are process-centric definitions with stages, runs, schemas, owner roles, status, version, automation, risk, and metrics."
  },
  {
    concept: "PipelineStage",
    status: "partial",
    currentSources: ["PipelineStage", "StageRun", "Approval", "AcceptanceCriterion"],
    unsupportedTargetFields: ["wipLimit", "firstClassEvidenceRequirement", "paperclipInstruction"],
    notes: "Stage definitions include entry/exit conditions, role, procedure, tools, approvals, failure strategy, retry policy, and runtime stage runs."
  },
  {
    concept: "PipelineTransition",
    status: "missing",
    currentSources: [],
    unsupportedTargetFields: ["fromStageId", "toStageId", "condition", "transitionApprovalPolicy", "transitionEvidencePolicy"],
    notes: "No reusable transition graph exists; movement is currently derived from stage conditions and lifecycle commands."
  },
  {
    concept: "WorkflowItem",
    status: "partial",
    currentSources: ["PipelineRun", "PipelineRunTaskLink", "StageRun"],
    unsupportedTargetFields: ["entityType", "entityId", "departmentId", "subscriptionProductId", "serviceProjectId", "customEntityId"],
    notes: "Pipeline runs can link tasks, clients, projects, documents, stages, approvals, audit logs, and acceptance criteria, but there is no universal entity attachment model."
  },
  {
    concept: "Procedure",
    status: "partial",
    currentSources: ["Procedure", "ProcedureStep", "WorkflowDefinitionDraft"],
    unsupportedTargetFields: ["procedureType", "triggerPolicy", "paperclipContext", "relatedPipelineStageId"],
    notes: "Procedures and steps cover owner, tools, permissions, expected result, quality standard, input/output, validation, and rollback instructions."
  },
  {
    concept: "Checklist",
    status: "partial",
    currentSources: ["ChecklistTemplate", "ChecklistItem", "AcceptanceCriterion"],
    unsupportedTargetFields: ["universalAttachmentTarget", "reusableEvidencePolicy"],
    notes: "Checklist and acceptance criteria data exists, including target type/id and evidence JSON, but attachment normalization is not universal."
  },
  {
    concept: "EvidenceLog",
    status: "partial",
    currentSources: ["AuditLog", "Event", "AcceptanceCriterion", "Artifact", "KnowledgeLink"],
    unsupportedTargetFields: ["evidenceType", "submitter", "fileRef", "commitRef", "screenshotRef", "workflowItemId"],
    notes: "Evidence is available through audit logs, events, acceptance evidence, artifacts, and knowledge links, but not one dedicated evidence ledger."
  },
  {
    concept: "ApprovalPolicy",
    status: "partial",
    currentSources: ["Approval", "Policy", "Control"],
    unsupportedTargetFields: ["separateApprovalPolicy", "separateApprovalRequest", "immutableApprovalDecision"],
    notes: "Approval request and decision state share one Approval table, with broader policy/control models and audit/event evidence."
  },
  {
    concept: "Blueprint",
    status: "missing",
    currentSources: [],
    unsupportedTargetFields: ["entitySchema", "fieldDefinition", "customObjectDefinition", "schemaLifecycle"],
    notes: "JSON schemas exist on selected records, but no dedicated blueprint or entity schema model exists."
  },
  {
    concept: "LinkedAsset",
    status: "partial",
    currentSources: ["Resource", "Artifact", "Dependency", "KnowledgeItem", "KnowledgeLink", "GoogleDriveFile"],
    unsupportedTargetFields: ["universalAssetRelation", "assetType", "assetId", "relationDescription"],
    notes: "Assets are represented by resources, artifacts, dependencies, knowledge links, and Drive files rather than one universal linked-asset relation."
  },
  {
    concept: "PaperclipSyncContext",
    status: "partial",
    currentSources: ["WorkforceEntity", "MCPManifest", "RouteManifest"],
    unsupportedTargetFields: ["objectAllowedActions", "objectBlockedActions", "defaultAgent", "objectApprovalPolicy", "lastObjectSyncDate"],
    notes: "Paperclip sync details exist for workforce entities and route/MCP capabilities, but not as object-level sync context."
  }
];

export const processCoreRouter = Router();

const optionalText = z.string().trim().min(1).optional().nullable();
const procedureStepSchema = z.object({
  instruction: z.string().trim().min(1),
  stepType: z.nativeEnum(ProcedureStepType).optional(),
  requiredToolAdapterId: z.string().uuid().optional().nullable(),
  expectedInput: z.record(z.unknown()).optional(),
  expectedOutput: z.record(z.unknown()).optional(),
  validationRule: z.record(z.unknown()).optional(),
  rollbackInstruction: optionalText
});
const procedureCommandSchema = z.object({
  name: z.string().trim().min(1),
  purpose: z.string().trim().min(1),
  scope: optionalText,
  processId: z.string().uuid().optional().nullable(),
  ownerRoleId: z.string().uuid().optional().nullable(),
  expectedResult: optionalText,
  requiredTools: z.array(z.string().trim().min(1)).optional(),
  requiredPermissions: z.array(z.string().trim().min(1)).optional(),
  steps: z.array(procedureStepSchema).min(1)
});
const procedureUpdateSchema = procedureCommandSchema.partial().extend({ steps: z.array(procedureStepSchema).min(1).optional() });

function requestActor(req: Express.Request) {
  return req.auth!.authType === "user"
    ? { actorType: ActorType.user, actorId: req.auth!.userId ?? null }
    : { actorType: ActorType.agent, actorId: req.auth!.apiKeyId ?? null };
}

async function auditProcedure(req: Express.Request, action: string, procedureId: string, input: Record<string, unknown>) {
  await prisma.auditLog.create({ data: {
    workspaceId: req.auth!.workspaceId,
    ...requestActor(req),
    action,
    resourceType: "Procedure",
    resourceId: procedureId,
    correlationId: `process-core:procedure:${procedureId}:${Date.now()}`,
    inputPayload: input as Prisma.InputJsonValue
  } });
}

async function validateProcedureRelations(workspaceId: string, input: { processId?: string | null; ownerRoleId?: string | null; steps?: Array<{ requiredToolAdapterId?: string | null }> }) {
  if (input.processId && !await prisma.process.findFirst({ where: { id: input.processId, workspaceId } })) return "process_not_found";
  if (input.ownerRoleId && !await prisma.companyRole.findFirst({ where: { id: input.ownerRoleId, workspaceId } })) return "owner_role_not_found";
  const adapterIds = input.steps?.map((step) => step.requiredToolAdapterId).filter((id): id is string => Boolean(id)) ?? [];
  if (adapterIds.length && await prisma.toolAdapter.count({ where: { id: { in: adapterIds }, workspaceId } }) !== new Set(adapterIds).size) return "tool_adapter_not_found";
  return null;
}

function byWorkspace(workspaceId: string) {
  return { workspaceId };
}

processCoreRouter.get("/coverage", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const [
    processes,
    pipelines,
    pipelineStages,
    procedures,
    procedureSteps,
    checklistTemplates,
    checklistItems,
    acceptanceCriteria,
    pipelineRuns,
    pipelineRunTaskLinks,
    stageRuns,
    approvals,
    auditLogs,
    events,
    policies,
    controls,
    resources,
    artifacts,
    dependencies,
    knowledgeItems,
    knowledgeLinks,
    googleDriveFiles,
    workforceEntities
  ] = await Promise.all([
    prisma.process.count({ where: byWorkspace(workspaceId) }),
    prisma.pipeline.count({ where: byWorkspace(workspaceId) }),
    prisma.pipelineStage.count({ where: byWorkspace(workspaceId) }),
    prisma.procedure.count({ where: byWorkspace(workspaceId) }),
    prisma.procedureStep.count({ where: { procedure: byWorkspace(workspaceId) } }),
    prisma.checklistTemplate.count({ where: byWorkspace(workspaceId) }),
    prisma.checklistItem.count({ where: byWorkspace(workspaceId) }),
    prisma.acceptanceCriterion.count({ where: byWorkspace(workspaceId) }),
    prisma.pipelineRun.count({ where: byWorkspace(workspaceId) }),
    prisma.pipelineRunTaskLink.count({ where: byWorkspace(workspaceId) }),
    prisma.stageRun.count({ where: byWorkspace(workspaceId) }),
    prisma.approval.count({ where: byWorkspace(workspaceId) }),
    prisma.auditLog.count({ where: byWorkspace(workspaceId) }),
    prisma.event.count({ where: byWorkspace(workspaceId) }),
    prisma.policy.count({ where: byWorkspace(workspaceId) }),
    prisma.control.count({ where: byWorkspace(workspaceId) }),
    prisma.resource.count({ where: byWorkspace(workspaceId) }),
    prisma.artifact.count({ where: byWorkspace(workspaceId) }),
    prisma.dependency.count({ where: byWorkspace(workspaceId) }),
    prisma.knowledgeItem.count({ where: byWorkspace(workspaceId) }),
    prisma.knowledgeLink.count({ where: byWorkspace(workspaceId) }),
    prisma.googleDriveFile.count({ where: byWorkspace(workspaceId) }),
    prisma.workforceEntity.count({ where: byWorkspace(workspaceId) })
  ]);

  const processCoreRoutes = adapterManifest.routes.processCore;
  const processCoreMethods = [...new Set(processCoreRoutes.map((route) => route.method))];
  const writableCapabilities = [...new Set(processCoreRoutes
    .filter((route) => route.method !== "GET")
    .map((route) => route.capability))];

  res.json({
    data: {
      service: "process-core",
      packet: "coverage",
      mode: "read_only",
      counts: {
        workflowDefinitions: {
          processes,
          pipelines,
          pipelineStages,
          procedures,
          procedureSteps
        },
        workflowRuntime: {
          pipelineRuns,
          pipelineRunTaskLinks,
          stageRuns
        },
        governanceAndEvidence: {
          approvals,
          policies,
          controls,
          checklistTemplates,
          checklistItems,
          acceptanceCriteria,
          auditLogs,
          events
        },
        assetsAndKnowledge: {
          resources,
          artifacts,
          dependencies,
          knowledgeItems,
          knowledgeLinks,
          googleDriveFiles
        },
        workforce: {
          workforceEntities
        }
      },
      targetCoverage,
      unsupportedConcepts: targetCoverage
        .filter((row) => row.status === "missing")
        .map((row) => row.concept),
      nextRecommendedPackets: [
        "workflow_attachment_packet",
        "governance_and_evidence_packet",
        "asset_and_workforce_context_packet",
        "paperclip_authority_packet"
      ],
      apiExposure: {
        route: "/v1/process-core/coverage",
        capability: "process-core:read",
        methods: processCoreMethods,
        writableCapabilities
      },
      mcpExposure: {
        expectedToolName: "companycore_get_process_core_coverage",
        riskLevel: "read",
        requiresApproval: false
      }
    }
  });
}));

processCoreRouter.get("/procedures", asyncHandler(async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const procedures = await prisma.procedure.findMany({
    where: {
      workspaceId: req.auth!.workspaceId,
      ...(status && Object.values(OperatingStatus).includes(status as OperatingStatus) ? { status: status as OperatingStatus } : {})
    },
    include: { process: true, ownerRole: true, qualityStandard: true, steps: { orderBy: { stepOrder: "asc" } }, stages: true },
    orderBy: [{ status: "asc" }, { name: "asc" }, { version: "desc" }]
  });
  res.json({ data: procedures });
}));

processCoreRouter.get("/procedures/:id", asyncHandler(async (req, res) => {
  const procedure = await prisma.procedure.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId },
    include: { process: true, ownerRole: true, qualityStandard: true, steps: { orderBy: { stepOrder: "asc" }, include: { requiredToolAdapter: true } }, stages: true, policies: true }
  });
  if (!procedure) return sendApiError(res, 404, "procedure_not_found");
  res.json({ data: procedure });
}));

processCoreRouter.post("/procedures", asyncHandler(async (req, res) => {
  const input = procedureCommandSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const relationError = await validateProcedureRelations(workspaceId, input);
  if (relationError) return sendApiError(res, 404, relationError);
  const procedure = await prisma.procedure.create({
    data: {
      workspaceId,
      name: input.name,
      purpose: input.purpose,
      scope: input.scope,
      processId: input.processId,
      ownerRoleId: input.ownerRoleId,
      expectedResult: input.expectedResult,
      requiredTools: (input.requiredTools ?? []) as Prisma.InputJsonValue,
      requiredPermissions: (input.requiredPermissions ?? []) as Prisma.InputJsonValue,
      status: OperatingStatus.draft,
      steps: { create: input.steps.map((step, index) => ({
        ...step,
        stepOrder: index + 1,
        expectedInput: (step.expectedInput ?? {}) as Prisma.InputJsonValue,
        expectedOutput: (step.expectedOutput ?? {}) as Prisma.InputJsonValue,
        validationRule: (step.validationRule ?? {}) as Prisma.InputJsonValue
      })) }
    },
    include: { process: true, ownerRole: true, steps: { orderBy: { stepOrder: "asc" } } }
  });
  await auditProcedure(req, "procedure.create_draft", procedure.id, { name: procedure.name, version: procedure.version });
  await createEvent({ type: "procedure_draft_created", workspaceId, ...requestActor(req), resourceType: "Procedure", resourceId: procedure.id, payload: { familyId: procedure.familyId, version: procedure.version } });
  res.status(201).json({ data: procedure });
}));

processCoreRouter.patch("/procedures/:id", asyncHandler(async (req, res) => {
  const input = procedureUpdateSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const existing = await prisma.procedure.findFirst({ where: { id: String(req.params.id), workspaceId }, include: { steps: { orderBy: { stepOrder: "asc" } } } });
  if (!existing) return sendApiError(res, 404, "procedure_not_found");
  const relationError = await validateProcedureRelations(workspaceId, input);
  if (relationError) return sendApiError(res, 404, relationError);

  const steps = input.steps ?? existing.steps.map((step) => ({
    instruction: step.instruction,
    stepType: step.stepType,
    requiredToolAdapterId: step.requiredToolAdapterId,
    expectedInput: step.expectedInput as Record<string, unknown>,
    expectedOutput: step.expectedOutput as Record<string, unknown>,
    validationRule: step.validationRule as Record<string, unknown>,
    rollbackInstruction: step.rollbackInstruction
  }));
  const data = {
    name: input.name ?? existing.name,
    purpose: input.purpose ?? existing.purpose,
    scope: input.scope === undefined ? existing.scope : input.scope,
    processId: input.processId === undefined ? existing.processId : input.processId,
    ownerRoleId: input.ownerRoleId === undefined ? existing.ownerRoleId : input.ownerRoleId,
    expectedResult: input.expectedResult === undefined ? existing.expectedResult : input.expectedResult,
    requiredTools: (input.requiredTools ?? existing.requiredTools) as Prisma.InputJsonValue,
    requiredPermissions: (input.requiredPermissions ?? existing.requiredPermissions) as Prisma.InputJsonValue
  };

  const procedure = await prisma.$transaction(async (tx) => {
    if (existing.status === OperatingStatus.draft) {
      const updated = await tx.procedure.update({ where: { id: existing.id }, data });
      if (input.steps) {
        await tx.procedureStep.deleteMany({ where: { procedureId: existing.id } });
        await tx.procedureStep.createMany({ data: steps.map((step, index) => ({
          procedureId: existing.id,
          stepOrder: index + 1,
          instruction: step.instruction,
          stepType: step.stepType,
          requiredToolAdapterId: step.requiredToolAdapterId,
          expectedInput: (step.expectedInput ?? {}) as Prisma.InputJsonValue,
          expectedOutput: (step.expectedOutput ?? {}) as Prisma.InputJsonValue,
          validationRule: (step.validationRule ?? {}) as Prisma.InputJsonValue,
          rollbackInstruction: step.rollbackInstruction
        })) });
      }
      return updated;
    }

    const latest = await tx.procedure.aggregate({ where: { workspaceId, familyId: existing.familyId }, _max: { version: true } });
    return tx.procedure.create({
      data: {
        ...data,
        workspaceId,
        familyId: existing.familyId,
        version: (latest._max.version ?? existing.version) + 1,
        status: OperatingStatus.draft,
        qualityStandardId: existing.qualityStandardId,
        steps: { create: steps.map((step, index) => ({
          instruction: step.instruction,
          stepOrder: index + 1,
          stepType: step.stepType,
          requiredToolAdapterId: step.requiredToolAdapterId,
          expectedInput: (step.expectedInput ?? {}) as Prisma.InputJsonValue,
          expectedOutput: (step.expectedOutput ?? {}) as Prisma.InputJsonValue,
          validationRule: (step.validationRule ?? {}) as Prisma.InputJsonValue,
          rollbackInstruction: step.rollbackInstruction
        })) }
      }
    });
  });
  await auditProcedure(req, existing.status === OperatingStatus.draft ? "procedure.update_draft" : "procedure.propose_revision", procedure.id, { sourceProcedureId: existing.id, changed: Object.keys(input) });
  await createEvent({ type: existing.status === OperatingStatus.draft ? "procedure_draft_updated" : "procedure_revision_proposed", workspaceId, ...requestActor(req), resourceType: "Procedure", resourceId: procedure.id, payload: { familyId: procedure.familyId, version: procedure.version, sourceProcedureId: existing.id } });
  const response = await prisma.procedure.findUnique({ where: { id: procedure.id }, include: { process: true, ownerRole: true, steps: { orderBy: { stepOrder: "asc" } } } });
  res.json({ data: response });
}));

processCoreRouter.post("/procedures/:id/actions/activate", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const existing = await prisma.procedure.findFirst({ where: { id: String(req.params.id), workspaceId }, include: { steps: true } });
  if (!existing) return sendApiError(res, 404, "procedure_not_found");
  if (existing.status !== OperatingStatus.draft) return sendApiError(res, 409, "only_draft_procedure_can_be_activated");
  if (!existing.steps.length || !existing.expectedResult) return sendApiError(res, 409, "procedure_activation_requirements_missing");
  const procedure = await prisma.$transaction(async (tx) => {
    await tx.procedure.updateMany({ where: { workspaceId, familyId: existing.familyId, status: OperatingStatus.active }, data: { status: OperatingStatus.retired } });
    return tx.procedure.update({ where: { id: existing.id }, data: { status: OperatingStatus.active }, include: { steps: { orderBy: { stepOrder: "asc" } }, process: true, ownerRole: true } });
  });
  await auditProcedure(req, "procedure.activate", procedure.id, { familyId: procedure.familyId, version: procedure.version });
  await createEvent({ type: "procedure_activated", workspaceId, ...requestActor(req), resourceType: "Procedure", resourceId: procedure.id, payload: { familyId: procedure.familyId, version: procedure.version } });
  res.json({ data: procedure });
}));

processCoreRouter.post("/procedures/:id/actions/archive", asyncHandler(async (req, res) => {
  const existing = await prisma.procedure.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId } });
  if (!existing) return sendApiError(res, 404, "procedure_not_found");
  const procedure = await prisma.procedure.update({ where: { id: existing.id }, data: { status: OperatingStatus.archived } });
  await auditProcedure(req, "procedure.archive", procedure.id, { previousStatus: existing.status });
  await createEvent({ type: "procedure_archived", workspaceId: req.auth!.workspaceId, ...requestActor(req), resourceType: "Procedure", resourceId: procedure.id, payload: { familyId: procedure.familyId, version: procedure.version } });
  res.json({ data: procedure });
}));
