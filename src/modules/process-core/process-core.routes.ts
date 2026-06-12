import { Router } from "express";
import { adapterManifest } from "../../auth/capabilities";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";

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
  const writableCapabilities = processCoreRoutes
    .filter((route) => route.method !== "GET")
    .map((route) => route.capability);

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
        methods: processCoreRoutes.map((route) => route.method),
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
