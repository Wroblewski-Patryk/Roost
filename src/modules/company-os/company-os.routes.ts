import { Router } from "express";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { workflowDefinitionDraftsRouter, workflowDefinitionRecoveryRouter } from "./workflow-definition-drafts.routes";

const collectionNames = [
  "processes",
  "pipelines",
  "pipeline-stages",
  "procedures",
  "procedure-steps",
  "company-roles",
  "resources",
  "tool-adapters",
  "integration-capabilities",
  "standards",
  "pipeline-runs",
  "pipeline-run-task-links",
  "stage-runs",
  "approvals",
  "checklist-templates",
  "checklist-items",
  "acceptance-criteria",
  "audit-logs",
  "policies",
  "metrics",
  "risks",
  "controls",
  "knowledge-items",
  "decision-logs",
  "automation-rules",
  "triggers",
  "artifacts",
  "dependencies",
  "business-functions",
  "stakeholders"
] as const;

const collectionSchema = z.enum(collectionNames);
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).strict();
const actorTypeSchema = z.enum(["user", "agent", "system", "integration"]);
const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
const approvalRequestSchema = z.object({
  requestedByType: actorTypeSchema,
  requestedById: z.string().trim().min(1).max(200).optional(),
  requestedForAction: z.string().trim().min(1).max(200),
  resourceType: z.string().trim().min(1).max(120),
  resourceId: z.string().trim().min(1).max(300).optional(),
  riskLevel: riskLevelSchema.default("medium"),
  approverRoleId: z.string().uuid().optional(),
  pipelineRunId: z.string().uuid().optional(),
  stageRunId: z.string().uuid().optional(),
  expiresAt: z.coerce.date().optional(),
  inputPayload: z.record(z.unknown()).default({})
}).strict();
const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  decisionReason: z.string().trim().min(1).max(2000)
}).strict();
const jsonObjectSchema = z.record(z.unknown()).default({});
const verificationStatusSchema = z.enum(["not_started", "pending", "passed", "failed", "waived"]);
const startStageSchema = z.object({
  pipelineStageId: z.string().uuid(),
  assignedActorType: actorTypeSchema.optional(),
  assignedActorId: z.string().trim().min(1).max(200).optional(),
  inputPayload: jsonObjectSchema,
  approvalId: z.string().uuid().optional()
}).strict();
const blockStageSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  approvalId: z.string().uuid().optional(),
  errorState: z.record(z.unknown()).optional()
}).strict();
const validateStageSchema = z.object({
  validationStatus: verificationStatusSchema.default("passed"),
  validationResult: z.record(z.unknown()).default({}),
  acceptanceCriteria: z.array(z.object({
    id: z.string().uuid(),
    validationStatus: verificationStatusSchema,
    evidence: z.record(z.unknown()).default({})
  }).strict()).default([])
}).strict();
const completeStageSchema = z.object({
  outputPayload: jsonObjectSchema,
  validationResult: z.record(z.unknown()).default({}),
  approvalId: z.string().uuid().optional()
}).strict();
const pipelineRunTaskLinkSchema = z.object({
  taskId: z.string().uuid(),
  linkType: z.string().trim().min(1).max(64).default("evidence"),
  source: z.string().trim().min(1).max(64).default("companycore")
}).strict();
const automationEvaluationSchema = z.object({
  ruleIds: z.array(z.string().uuid()).max(25).optional(),
  mode: z.enum(["dry_run", "execute"]).default("dry_run"),
  idempotencyKey: z.string().trim().min(1).max(300).optional(),
  context: z.record(z.unknown()).default({})
}).strict();
const operatingStatusSchema = z.enum(["draft", "active", "paused", "archived", "retired", "deprecated"]);
const createStandardSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  checklistId: z.string().uuid().nullable().optional(),
  validationMethod: z.string().trim().max(2000).nullable().optional(),
  ownerRoleId: z.string().uuid().nullable().optional(),
  status: operatingStatusSchema.default("active")
}).strict();
const updateStandardSchema = createStandardSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one standard field is required."
});

type CollectionName = typeof collectionNames[number];
type AutomationActionKind = "request_approval" | "emit_event" | "start_stage" | "block_stage" | "validate_stage" | "complete_stage";

type AutomationActionProposal = {
  ruleId: string;
  ruleName: string;
  actionKind: AutomationActionKind;
  requiresApproval: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  target: {
    resourceType: string | null;
    resourceId: string | null;
    pipelineRunId: string | null;
    stageRunId: string | null;
  };
  payload: Record<string, unknown>;
};

type CollectionReader = {
  list: (workspaceId: string, limit: number) => Promise<unknown[]>;
  get: (workspaceId: string, id: string) => Promise<unknown | null>;
};

type RouteActor = ReturnType<typeof authActor>;
type CompanyOsTx = Prisma.TransactionClient;
type StartStageInput = z.infer<typeof startStageSchema>;
type BlockStageInput = z.infer<typeof blockStageSchema>;
type ValidateStageInput = z.infer<typeof validateStageSchema>;
type CompleteStageInput = z.infer<typeof completeStageSchema>;

type CompanyOsCommandError = {
  status: number;
  error: string;
};

type StageLifecycleCommandResult = {
  stageRun: Record<string, unknown>;
  auditLog: { id: string };
  correlationId: string;
};

const terminalPipelineStatuses = new Set(["completed", "failed", "cancelled"]);
const terminalStageStatuses = new Set(["completed", "failed", "skipped"]);
const acceptedValidationStatuses = new Set(["passed", "waived"]);

function commandError(status: number, error: string): CompanyOsCommandError {
  return { status, error };
}

function isCommandError(result: StageLifecycleCommandResult | CompanyOsCommandError): result is CompanyOsCommandError {
  return "error" in result;
}

function workspaceWhere(workspaceId: string) {
  return { workspaceId };
}

function authActor(req: { auth?: { authType: "user" | "api_key"; userId?: string; apiKeyId?: string } }) {
  if (req.auth?.authType === "user") {
    return {
      actorType: "user" as const,
      actorId: req.auth.userId ?? null
    };
  }

  return {
    actorType: "agent" as const,
    actorId: req.auth?.apiKeyId ?? null
  };
}

function asInputJson(value: Record<string, unknown>) {
  return value as Prisma.InputJsonObject;
}

function asJsonArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function asJsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function valueAtPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[part];
  }, source);
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stageRequiresApproval(stage: { requiredApprovals: Prisma.JsonValue }) {
  return asJsonArray(stage.requiredApprovals).length > 0;
}

function appendStageLog(logs: Prisma.JsonValue, entry: Record<string, unknown>) {
  return [
    ...asJsonArray(logs),
    {
      ...entry,
      at: new Date().toISOString()
    }
  ] as Prisma.InputJsonArray;
}

async function getApprovedApproval(
  workspaceId: string,
  approvalId: string,
  pipelineRunId: string,
  stageRunId: string | null
) {
  const approval = await prisma.approval.findFirst({
    where: { id: approvalId, workspaceId }
  });

  if (!approval) {
    return { error: "approval_not_found" as const, approval: null };
  }

  const matchesPipelineRun = approval.pipelineRunId === pipelineRunId;
  const matchesStageRun = Boolean(stageRunId && approval.stageRunId === stageRunId);
  const matchesResource = Boolean(stageRunId && approval.resourceType === "stage_run" && approval.resourceId === stageRunId);

  if (!matchesPipelineRun && !matchesStageRun && !matchesResource) {
    return { error: "approval_scope_mismatch" as const, approval: null };
  }

  if (approval.expiresAt && approval.expiresAt.getTime() <= Date.now()) {
    return { error: "approval_expired" as const, approval: null };
  }

  if (approval.status !== "approved") {
    return { error: "approval_not_approved" as const, approval: null };
  }

  return { error: null, approval };
}

async function createStageLifecycleEvidence(
  tx: CompanyOsTx,
  params: {
    workspaceId: string;
    actor: RouteActor;
    action: string;
    eventType: string;
    resourceId: string;
    pipelineRunId: string;
    stageRunId: string;
    inputPayload: Record<string, unknown>;
    outputPayload: Record<string, unknown>;
    approvalId?: string | null;
    correlationId: string;
  }
) {
  const auditLog = await tx.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      actorType: params.actor.actorType,
      actorId: params.actor.actorId,
      action: params.action,
      resourceType: "stage_run",
      resourceId: params.resourceId,
      inputPayload: asInputJson(params.inputPayload),
      outputPayload: asInputJson(params.outputPayload),
      approvalId: params.approvalId ?? undefined,
      pipelineRunId: params.pipelineRunId,
      stageRunId: params.stageRunId,
      correlationId: params.correlationId
    }
  });

  await tx.event.create({
    data: {
      workspaceId: params.workspaceId,
      type: params.eventType,
      source: "companycore",
      actorType: params.actor.actorType,
      actorId: params.actor.actorId,
      resourceType: "stage_run",
      resourceId: params.resourceId,
      correlationId: params.correlationId,
      payload: {
        stageRunId: params.stageRunId,
        pipelineRunId: params.pipelineRunId,
        auditLogId: auditLog.id,
        approvalId: params.approvalId ?? null
      }
    }
  });

  return auditLog;
}

async function createDefinitionEvidence(
  tx: CompanyOsTx,
  params: {
    workspaceId: string;
    actor: RouteActor;
    action: string;
    eventType: string;
    resourceType: string;
    resourceId: string;
    inputPayload: Record<string, unknown>;
    outputPayload: Record<string, unknown>;
    correlationId: string;
  }
) {
  const auditLog = await tx.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      actorType: params.actor.actorType,
      actorId: params.actor.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      inputPayload: asInputJson(params.inputPayload),
      outputPayload: asInputJson(params.outputPayload),
      correlationId: params.correlationId
    }
  });

  await tx.event.create({
    data: {
      workspaceId: params.workspaceId,
      type: params.eventType,
      source: "companycore",
      actorType: params.actor.actorType,
      actorId: params.actor.actorId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      correlationId: params.correlationId,
      payload: {
        auditLogId: auditLog.id,
        action: params.action
      }
    }
  });

  return auditLog;
}

function automationConditionMatches(
  condition: Prisma.JsonValue,
  event: {
    type: string;
    payload: Prisma.JsonValue | null;
    resourceType: string | null;
    resourceId: string | null;
  }
) {
  const rule = asJsonObject(condition);
  const payload = asJsonObject(event.payload);

  if (typeof rule.eventType === "string" && rule.eventType !== event.type) {
    return false;
  }

  if (Array.isArray(rule.eventTypes) && !rule.eventTypes.includes(event.type)) {
    return false;
  }

  if (typeof rule.resourceType === "string" && rule.resourceType !== event.resourceType) {
    return false;
  }

  if (typeof rule.resourceId === "string" && rule.resourceId !== event.resourceId) {
    return false;
  }

  if (typeof rule.payloadPath === "string") {
    const actual = valueAtPath(payload, rule.payloadPath);
    if (rule.exists === true && actual === undefined) {
      return false;
    }
    if ("equals" in rule && !valuesEqual(actual, rule.equals)) {
      return false;
    }
    if (typeof rule.contains === "string" && !String(actual ?? "").includes(rule.contains)) {
      return false;
    }
  }

  if (typeof rule.stageRunStatus === "string") {
    const status = valueAtPath(payload, "status") ?? valueAtPath(payload, "stageRunStatus");
    if (status !== rule.stageRunStatus) {
      return false;
    }
  }

  return true;
}

function automationActionKind(action: Prisma.JsonValue): AutomationActionKind | null {
  const actionObject = asJsonObject(action);
  if (typeof actionObject.type === "string") {
    const actionKind = actionObject.type;
    if (["request_approval", "emit_event", "start_stage", "block_stage", "validate_stage", "complete_stage"].includes(actionKind)) {
      return actionKind as AutomationActionKind;
    }
  }
  if (actionObject.requestApproval === true || actionObject.createApproval === true) {
    return "request_approval";
  }
  if (actionObject.emitEvent === true) {
    return "emit_event";
  }
  return null;
}

function riskLevelFromAction(action: Prisma.JsonValue): "low" | "medium" | "high" | "critical" {
  const actionObject = asJsonObject(action);
  return riskLevelSchema.safeParse(actionObject.riskLevel).success
    ? actionObject.riskLevel as "low" | "medium" | "high" | "critical"
    : "medium";
}

function createAutomationProposal(
  rule: { id: string; name: string; action: Prisma.JsonValue },
  event: {
    resourceType: string | null;
    resourceId: string | null;
    payload: Prisma.JsonValue | null;
  }
): AutomationActionProposal | null {
  const actionKind = automationActionKind(rule.action);
  if (!actionKind) {
    return null;
  }

  const actionObject = asJsonObject(rule.action);
  const payload = asJsonObject(event.payload);
  const riskLevel = riskLevelFromAction(rule.action);
  const stageRunId = typeof actionObject.stageRunId === "string"
    ? actionObject.stageRunId
    : typeof payload.stageRunId === "string"
      ? payload.stageRunId
      : event.resourceType === "stage_run"
        ? event.resourceId
        : null;
  const pipelineRunId = typeof actionObject.pipelineRunId === "string"
    ? actionObject.pipelineRunId
    : typeof payload.pipelineRunId === "string"
      ? payload.pipelineRunId
      : null;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    actionKind,
    requiresApproval: actionKind !== "emit_event" || riskLevel === "high" || riskLevel === "critical",
    riskLevel,
    target: {
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      pipelineRunId,
      stageRunId
    },
    payload: actionObject
  };
}

function automationEvidenceMatches(
  inputPayload: Prisma.JsonValue,
  params: { sourceEventId: string; ruleId: string; actionKind: AutomationActionKind; idempotencyKey: string }
) {
  const input = asJsonObject(inputPayload);
  return input.sourceEventId === params.sourceEventId
    && input.ruleId === params.ruleId
    && input.actionKind === params.actionKind
    && input.idempotencyKey === params.idempotencyKey;
}

function isStageLifecycleAction(actionKind: AutomationActionKind) {
  return ["start_stage", "block_stage", "validate_stage", "complete_stage"].includes(actionKind);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function lifecyclePayloadError(error: string): CompanyOsCommandError {
  return commandError(400, error);
}

async function executeAutomationLifecycleProposal(params: {
  workspaceId: string;
  actor: RouteActor;
  proposal: AutomationActionProposal;
}): Promise<StageLifecycleCommandResult | CompanyOsCommandError> {
  const { workspaceId, actor, proposal } = params;
  const payload = proposal.payload;

  if (proposal.actionKind === "start_stage") {
    const pipelineRunId = proposal.target.pipelineRunId ?? optionalString(payload.pipelineRunId);
    const pipelineStageId = optionalString(payload.pipelineStageId);
    if (!pipelineRunId || !pipelineStageId) {
      return lifecyclePayloadError("automation_lifecycle_payload_invalid");
    }

    return startStageCommand({
      workspaceId,
      actor,
      pipelineRunId,
      input: startStageSchema.parse({
        pipelineStageId,
        assignedActorType: payload.assignedActorType,
        assignedActorId: payload.assignedActorId,
        inputPayload: asJsonObject(payload.inputPayload as Prisma.JsonValue),
        approvalId: payload.approvalId
      })
    });
  }

  if (proposal.actionKind === "block_stage") {
    const stageRunId = proposal.target.stageRunId ?? optionalString(payload.stageRunId);
    const reason = optionalString(payload.reason);
    if (!stageRunId || !reason) {
      return lifecyclePayloadError("automation_lifecycle_payload_invalid");
    }

    return blockStageCommand({
      workspaceId,
      actor,
      stageRunId,
      input: blockStageSchema.parse({
        reason,
        approvalId: payload.approvalId,
        errorState: asJsonObject(payload.errorState as Prisma.JsonValue)
      })
    });
  }

  if (proposal.actionKind === "validate_stage") {
    const stageRunId = proposal.target.stageRunId ?? optionalString(payload.stageRunId);
    if (!stageRunId) {
      return lifecyclePayloadError("automation_lifecycle_payload_invalid");
    }

    return validateStageCommand({
      workspaceId,
      actor,
      stageRunId,
      input: validateStageSchema.parse({
        validationStatus: payload.validationStatus,
        validationResult: asJsonObject(payload.validationResult as Prisma.JsonValue),
        acceptanceCriteria: Array.isArray(payload.acceptanceCriteria) ? payload.acceptanceCriteria : []
      })
    });
  }

  if (proposal.actionKind === "complete_stage") {
    const stageRunId = proposal.target.stageRunId ?? optionalString(payload.stageRunId);
    if (!stageRunId) {
      return lifecyclePayloadError("automation_lifecycle_payload_invalid");
    }

    return completeStageCommand({
      workspaceId,
      actor,
      stageRunId,
      input: completeStageSchema.parse({
        outputPayload: asJsonObject(payload.outputPayload as Prisma.JsonValue),
        validationResult: asJsonObject(payload.validationResult as Prisma.JsonValue),
        approvalId: payload.approvalId
      })
    });
  }

  return lifecyclePayloadError("automation_lifecycle_action_invalid");
}

async function startStageCommand(params: {
  workspaceId: string;
  actor: RouteActor;
  pipelineRunId: string;
  input: StartStageInput;
}): Promise<StageLifecycleCommandResult | CompanyOsCommandError> {
  const { workspaceId, actor, pipelineRunId, input } = params;
  const [pipelineRun, pipelineStage, existingStageRun, activeStageRun] = await Promise.all([
    prisma.pipelineRun.findFirst({
      where: { id: pipelineRunId, workspaceId }
    }),
    prisma.pipelineStage.findFirst({
      where: { id: input.pipelineStageId, workspaceId }
    }),
    prisma.stageRun.findFirst({
      where: {
        workspaceId,
        pipelineRunId,
        pipelineStageId: input.pipelineStageId
      }
    }),
    prisma.stageRun.findFirst({
      where: {
        workspaceId,
        pipelineRunId,
        status: { in: ["running", "blocked"] },
        pipelineStageId: { not: input.pipelineStageId }
      }
    })
  ]);

  if (!pipelineRun) {
    return commandError(404, "pipeline_run_not_found");
  }

  if (!pipelineStage || pipelineStage.pipelineId !== pipelineRun.pipelineId) {
    return commandError(404, "pipeline_stage_not_found");
  }

  if (terminalPipelineStatuses.has(pipelineRun.status)) {
    return commandError(409, "invalid_pipeline_transition");
  }

  if (existingStageRun && terminalStageStatuses.has(existingStageRun.status)) {
    return commandError(409, "invalid_stage_transition");
  }

  if (activeStageRun) {
    return commandError(409, "active_stage_run_exists");
  }

  const needsApproval = stageRequiresApproval(pipelineStage);
  let approvalId: string | null = null;

  if (needsApproval || input.approvalId) {
    if (!input.approvalId) {
      return commandError(409, "approval_required");
    }

    const approvalCheck = await getApprovedApproval(workspaceId, input.approvalId, pipelineRun.id, existingStageRun?.id ?? null);
    if (approvalCheck.error) {
      return commandError(approvalCheck.error === "approval_not_found" ? 404 : 409, approvalCheck.error);
    }
    approvalId = approvalCheck.approval!.id;
  }

  const correlationId = randomUUID();
  const result = await prisma.$transaction(async (tx) => {
    const stageRun = existingStageRun
      ? await tx.stageRun.update({
        where: { id: existingStageRun.id },
        data: {
          status: "running",
          assignedActorType: input.assignedActorType,
          assignedActorId: input.assignedActorId,
          inputPayload: asInputJson(input.inputPayload),
          startedAt: existingStageRun.startedAt ?? new Date(),
          completedAt: null,
          approvalStatus: approvalId ? "approved" : existingStageRun.approvalStatus
        },
        include: { pipelineStage: true, pipelineRun: true, acceptanceCriteria: true, approvals: true }
      })
      : await tx.stageRun.create({
        data: {
          workspaceId,
          pipelineRunId: pipelineRun.id,
          pipelineStageId: pipelineStage.id,
          assignedActorType: input.assignedActorType,
          assignedActorId: input.assignedActorId,
          status: "running",
          inputPayload: asInputJson(input.inputPayload),
          startedAt: new Date(),
          approvalStatus: approvalId ? "approved" : "pending"
        },
        include: { pipelineStage: true, pipelineRun: true, acceptanceCriteria: true, approvals: true }
      });

    await tx.pipelineRun.update({
      where: { id: pipelineRun.id },
      data: {
        status: "running",
        currentStageId: pipelineStage.id,
        startedAt: pipelineRun.startedAt ?? new Date(),
        errorState: Prisma.JsonNull
      }
    });

    const auditLog = await createStageLifecycleEvidence(tx, {
      workspaceId,
      actor,
      action: "stage_run.started",
      eventType: "stage_started",
      resourceId: stageRun.id,
      pipelineRunId: pipelineRun.id,
      stageRunId: stageRun.id,
      inputPayload: {
        pipelineStageId: input.pipelineStageId,
        assignedActorType: input.assignedActorType ?? null,
        assignedActorId: input.assignedActorId ?? null,
        approvalId
      },
      outputPayload: {
        stageRunId: stageRun.id,
        status: stageRun.status,
        currentStageId: pipelineStage.id
      },
      approvalId,
      correlationId
    });

    return { stageRun, auditLog };
  });

  return {
    stageRun: result.stageRun as unknown as Record<string, unknown>,
    auditLog: result.auditLog,
    correlationId
  };
}

async function blockStageCommand(params: {
  workspaceId: string;
  actor: RouteActor;
  stageRunId: string;
  input: BlockStageInput;
}): Promise<StageLifecycleCommandResult | CompanyOsCommandError> {
  const { workspaceId, actor, stageRunId, input } = params;
  const stageRun = await prisma.stageRun.findFirst({
    where: { id: stageRunId, workspaceId },
    include: { pipelineRun: true, pipelineStage: true }
  });

  if (!stageRun) {
    return commandError(404, "stage_run_not_found");
  }

  if (terminalStageStatuses.has(stageRun.status) || terminalPipelineStatuses.has(stageRun.pipelineRun.status)) {
    return commandError(409, "invalid_stage_transition");
  }

  let approvalId: string | null = null;
  if (input.approvalId) {
    const approvalCheck = await getApprovedApproval(workspaceId, input.approvalId, stageRun.pipelineRunId, stageRun.id);
    if (approvalCheck.error) {
      return commandError(approvalCheck.error === "approval_not_found" ? 404 : 409, approvalCheck.error);
    }
    approvalId = approvalCheck.approval!.id;
  }

  const correlationId = randomUUID();
  const result = await prisma.$transaction(async (tx) => {
    const blockedStageRun = await tx.stageRun.update({
      where: { id: stageRun.id },
      data: {
        status: "blocked",
        logs: appendStageLog(stageRun.logs, {
          level: "warning",
          message: input.reason,
          action: "block",
          errorState: input.errorState ?? null
        }),
        approvalStatus: approvalId ? "approved" : stageRun.approvalStatus
      },
      include: { pipelineStage: true, pipelineRun: true, acceptanceCriteria: true, approvals: true }
    });

    await tx.pipelineRun.update({
      where: { id: stageRun.pipelineRunId },
      data: {
        status: "blocked",
        errorState: input.errorState ? asInputJson(input.errorState) : {
          reason: input.reason,
          stageRunId: stageRun.id
        }
      }
    });

    const auditLog = await createStageLifecycleEvidence(tx, {
      workspaceId,
      actor,
      action: "stage_run.blocked",
      eventType: "stage_blocked",
      resourceId: blockedStageRun.id,
      pipelineRunId: stageRun.pipelineRunId,
      stageRunId: blockedStageRun.id,
      inputPayload: {
        reason: input.reason,
        approvalId,
        errorState: input.errorState ?? null
      },
      outputPayload: {
        stageRunId: blockedStageRun.id,
        status: blockedStageRun.status,
        pipelineRunStatus: "blocked"
      },
      approvalId,
      correlationId
    });

    return { stageRun: blockedStageRun, auditLog };
  });

  return {
    stageRun: result.stageRun as unknown as Record<string, unknown>,
    auditLog: result.auditLog,
    correlationId
  };
}

async function validateStageCommand(params: {
  workspaceId: string;
  actor: RouteActor;
  stageRunId: string;
  input: ValidateStageInput;
}): Promise<StageLifecycleCommandResult | CompanyOsCommandError> {
  const { workspaceId, actor, stageRunId, input } = params;
  const stageRun = await prisma.stageRun.findFirst({
    where: { id: stageRunId, workspaceId },
    include: { pipelineRun: true, pipelineStage: true }
  });

  if (!stageRun) {
    return commandError(404, "stage_run_not_found");
  }

  if (terminalStageStatuses.has(stageRun.status)) {
    return commandError(409, "invalid_stage_transition");
  }

  if (input.acceptanceCriteria.length > 0) {
    const criteria = await prisma.acceptanceCriterion.findMany({
      where: {
        workspaceId,
        stageRunId: stageRun.id,
        id: { in: input.acceptanceCriteria.map((criterion) => criterion.id) }
      },
      select: { id: true }
    });
    if (criteria.length !== input.acceptanceCriteria.length) {
      return commandError(404, "acceptance_criterion_not_found");
    }
  }

  const correlationId = randomUUID();
  const result = await prisma.$transaction(async (tx) => {
    for (const criterion of input.acceptanceCriteria) {
      await tx.acceptanceCriterion.update({
        where: { id: criterion.id },
        data: {
          validationStatus: criterion.validationStatus,
          evidence: asInputJson(criterion.evidence),
          verifiedByType: actor.actorType,
          verifiedById: actor.actorId,
          verifiedAt: new Date()
        }
      });
    }

    const validatedStageRun = await tx.stageRun.update({
      where: { id: stageRun.id },
      data: {
        validationResult: {
          status: input.validationStatus,
          ...input.validationResult
        }
      },
      include: { pipelineStage: true, pipelineRun: true, acceptanceCriteria: true, approvals: true }
    });

    const auditLog = await createStageLifecycleEvidence(tx, {
      workspaceId,
      actor,
      action: "stage_run.validated",
      eventType: "stage_validated",
      resourceId: validatedStageRun.id,
      pipelineRunId: stageRun.pipelineRunId,
      stageRunId: validatedStageRun.id,
      inputPayload: {
        validationStatus: input.validationStatus,
        acceptanceCriteria: input.acceptanceCriteria.map((criterion) => ({
          id: criterion.id,
          validationStatus: criterion.validationStatus
        }))
      },
      outputPayload: {
        stageRunId: validatedStageRun.id,
        validationResult: validatedStageRun.validationResult
      },
      correlationId
    });

    return { stageRun: validatedStageRun, auditLog };
  });

  return {
    stageRun: result.stageRun as unknown as Record<string, unknown>,
    auditLog: result.auditLog,
    correlationId
  };
}

async function completeStageCommand(params: {
  workspaceId: string;
  actor: RouteActor;
  stageRunId: string;
  input: CompleteStageInput;
}): Promise<StageLifecycleCommandResult | CompanyOsCommandError> {
  const { workspaceId, actor, stageRunId, input } = params;
  const stageRun = await prisma.stageRun.findFirst({
    where: { id: stageRunId, workspaceId },
    include: {
      pipelineRun: true,
      pipelineStage: true,
      acceptanceCriteria: true
    }
  });

  if (!stageRun) {
    return commandError(404, "stage_run_not_found");
  }

  if (!["running", "blocked"].includes(stageRun.status) || terminalPipelineStatuses.has(stageRun.pipelineRun.status)) {
    return commandError(409, "invalid_stage_transition");
  }

  const incompleteRequiredCriterion = stageRun.acceptanceCriteria.find((criterion) => (
    criterion.required && !acceptedValidationStatuses.has(criterion.validationStatus)
  ));
  if (incompleteRequiredCriterion) {
    return commandError(409, "acceptance_criteria_incomplete");
  }

  const needsApproval = stageRequiresApproval(stageRun.pipelineStage);
  let approvalId: string | null = null;
  if (needsApproval || input.approvalId) {
    if (!input.approvalId) {
      return commandError(409, "approval_required");
    }

    const approvalCheck = await getApprovedApproval(workspaceId, input.approvalId, stageRun.pipelineRunId, stageRun.id);
    if (approvalCheck.error) {
      return commandError(approvalCheck.error === "approval_not_found" ? 404 : 409, approvalCheck.error);
    }
    approvalId = approvalCheck.approval!.id;
  }

  const correlationId = randomUUID();
  const result = await prisma.$transaction(async (tx) => {
    const completedStageRun = await tx.stageRun.update({
      where: { id: stageRun.id },
      data: {
        status: "completed",
        outputPayload: asInputJson(input.outputPayload),
        validationResult: {
          status: "passed",
          ...input.validationResult
        },
        approvalStatus: approvalId ? "approved" : stageRun.approvalStatus,
        completedAt: new Date()
      },
      include: { pipelineStage: true, pipelineRun: true, acceptanceCriteria: true, approvals: true }
    });

    await tx.pipelineRun.update({
      where: { id: stageRun.pipelineRunId },
      data: {
        status: "running",
        currentStageId: stageRun.pipelineStageId,
        errorState: Prisma.JsonNull
      }
    });

    const auditLog = await createStageLifecycleEvidence(tx, {
      workspaceId,
      actor,
      action: "stage_run.completed",
      eventType: "stage_completed",
      resourceId: completedStageRun.id,
      pipelineRunId: stageRun.pipelineRunId,
      stageRunId: completedStageRun.id,
      inputPayload: {
        approvalId,
        validationResult: input.validationResult
      },
      outputPayload: {
        stageRunId: completedStageRun.id,
        status: completedStageRun.status
      },
      approvalId,
      correlationId
    });

    return { stageRun: completedStageRun, auditLog };
  });

  return {
    stageRun: result.stageRun as unknown as Record<string, unknown>,
    auditLog: result.auditLog,
    correlationId
  };
}

const collectionReaders: Record<CollectionName, CollectionReader> = {
  "processes": {
    list: (workspaceId, take) => prisma.process.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { ownerRole: true, pipelines: true, procedures: true, policies: true, metrics: true }
    }),
    get: (workspaceId, id) => prisma.process.findFirst({
      where: { id, workspaceId },
      include: { ownerRole: true, pipelines: true, procedures: true, policies: true, metrics: true }
    })
  },
  "pipelines": {
    list: (workspaceId, take) => prisma.pipeline.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { process: true, defaultOwnerRole: true, stages: { orderBy: { position: "asc" } } }
    }),
    get: (workspaceId, id) => prisma.pipeline.findFirst({
      where: { id, workspaceId },
      include: {
        process: true,
        defaultOwnerRole: true,
        stages: { orderBy: { position: "asc" }, include: { procedure: true, assignedRole: true } },
        runs: { orderBy: { startedAt: "desc" }, take: 10 }
      }
    })
  },
  "pipeline-stages": {
    list: (workspaceId, take) => prisma.pipelineStage.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: [{ pipelineId: "asc" }, { position: "asc" }],
      take,
      include: { pipeline: true, procedure: true, assignedRole: true }
    }),
    get: (workspaceId, id) => prisma.pipelineStage.findFirst({
      where: { id, workspaceId },
      include: { pipeline: true, procedure: { include: { steps: true } }, assignedRole: true }
    })
  },
  "procedures": {
    list: (workspaceId, take) => prisma.procedure.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { process: true, ownerRole: true, steps: { orderBy: { stepOrder: "asc" } } }
    }),
    get: (workspaceId, id) => prisma.procedure.findFirst({
      where: { id, workspaceId },
      include: { process: true, ownerRole: true, steps: { orderBy: { stepOrder: "asc" }, include: { requiredToolAdapter: true } } }
    })
  },
  "procedure-steps": {
    list: (workspaceId, take) => prisma.procedureStep.findMany({
      where: { procedure: { workspaceId } },
      orderBy: [{ procedureId: "asc" }, { stepOrder: "asc" }],
      take,
      include: { procedure: true, requiredToolAdapter: true }
    }),
    get: (workspaceId, id) => prisma.procedureStep.findFirst({
      where: { id, procedure: { workspaceId } },
      include: { procedure: true, requiredToolAdapter: true }
    })
  },
  "company-roles": {
    list: (workspaceId, take) => prisma.companyRole.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { name: "asc" },
      take
    }),
    get: (workspaceId, id) => prisma.companyRole.findFirst({ where: { id, workspaceId } })
  },
  "resources": {
    list: (workspaceId, take) => prisma.resource.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { ownerRole: true, relatedProcess: true, relatedProject: true }
    }),
    get: (workspaceId, id) => prisma.resource.findFirst({
      where: { id, workspaceId },
      include: { ownerRole: true, relatedProcess: true, relatedProject: true }
    })
  },
  "tool-adapters": {
    list: (workspaceId, take) => prisma.toolAdapter.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { name: "asc" },
      take,
      include: { ownerRole: true, capabilities: true }
    }),
    get: (workspaceId, id) => prisma.toolAdapter.findFirst({
      where: { id, workspaceId },
      include: { ownerRole: true, capabilities: true }
    })
  },
  "integration-capabilities": {
    list: (workspaceId, take) => prisma.integrationCapability.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { capabilityKey: "asc" },
      take,
      include: { toolAdapter: true }
    }),
    get: (workspaceId, id) => prisma.integrationCapability.findFirst({
      where: { id, workspaceId },
      include: { toolAdapter: true }
    })
  },
  "standards": {
    list: (workspaceId, take) => prisma.standard.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { name: "asc" },
      take,
      include: { ownerRole: true }
    }),
    get: (workspaceId, id) => prisma.standard.findFirst({
      where: { id, workspaceId },
      include: { ownerRole: true, procedures: true }
    })
  },
  "pipeline-runs": {
    list: (workspaceId, take) => prisma.pipelineRun.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { startedAt: "desc" },
      take,
      include: { pipeline: true, currentStage: true, approvals: true }
    }),
    get: (workspaceId, id) => prisma.pipelineRun.findFirst({
      where: { id, workspaceId },
      include: { pipeline: true, currentStage: true, stageRuns: true, approvals: true, auditLogs: true }
    })
  },
  "pipeline-run-task-links": {
    list: (workspaceId, take) => prisma.pipelineRunTaskLink.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { pipelineRun: true, task: true }
    }),
    get: (workspaceId, id) => prisma.pipelineRunTaskLink.findFirst({
      where: { id, workspaceId },
      include: { pipelineRun: true, task: true }
    })
  },
  "stage-runs": {
    list: (workspaceId, take) => prisma.stageRun.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { startedAt: "desc" },
      take,
      include: { pipelineRun: true, pipelineStage: true, approvals: true }
    }),
    get: (workspaceId, id) => prisma.stageRun.findFirst({
      where: { id, workspaceId },
      include: { pipelineRun: true, pipelineStage: true, approvals: true, acceptanceCriteria: true, auditLogs: true }
    })
  },
  "approvals": {
    list: (workspaceId, take) => prisma.approval.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { approverRole: true, pipelineRun: true, stageRun: true }
    }),
    get: (workspaceId, id) => prisma.approval.findFirst({
      where: { id, workspaceId },
      include: { approverRole: true, pipelineRun: true, stageRun: true, auditLogs: true }
    })
  },
  "checklist-templates": {
    list: (workspaceId, take) => prisma.checklistTemplate.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { name: "asc" },
      take,
      include: { items: { orderBy: { itemOrder: "asc" } } }
    }),
    get: (workspaceId, id) => prisma.checklistTemplate.findFirst({
      where: { id, workspaceId },
      include: { items: { orderBy: { itemOrder: "asc" } } }
    })
  },
  "checklist-items": {
    list: (workspaceId, take) => prisma.checklistItem.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: [{ checklistTemplateId: "asc" }, { itemOrder: "asc" }],
      take,
      include: { checklistTemplate: true }
    }),
    get: (workspaceId, id) => prisma.checklistItem.findFirst({
      where: { id, workspaceId },
      include: { checklistTemplate: true, acceptanceCriteria: true }
    })
  },
  "acceptance-criteria": {
    list: (workspaceId, take) => prisma.acceptanceCriterion.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { checklistItem: true, pipelineRun: true, stageRun: true }
    }),
    get: (workspaceId, id) => prisma.acceptanceCriterion.findFirst({
      where: { id, workspaceId },
      include: { checklistItem: true, pipelineRun: true, stageRun: true }
    })
  },
  "audit-logs": {
    list: (workspaceId, take) => prisma.auditLog.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { toolAdapter: true, approval: true }
    }),
    get: (workspaceId, id) => prisma.auditLog.findFirst({
      where: { id, workspaceId },
      include: { toolAdapter: true, approval: true, pipelineRun: true, stageRun: true }
    })
  },
  "policies": {
    list: (workspaceId, take) => prisma.policy.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { name: "asc" },
      take,
      include: { escalationRole: true, process: true, procedure: true }
    }),
    get: (workspaceId, id) => prisma.policy.findFirst({
      where: { id, workspaceId },
      include: { escalationRole: true, process: true, procedure: true }
    })
  },
  "metrics": {
    list: (workspaceId, take) => prisma.metric.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { name: "asc" },
      take,
      include: { ownerRole: true, process: true, pipeline: true }
    }),
    get: (workspaceId, id) => prisma.metric.findFirst({
      where: { id, workspaceId },
      include: { ownerRole: true, process: true, pipeline: true }
    })
  },
  "risks": {
    list: (workspaceId, take) => prisma.risk.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: [{ riskLevel: "desc" }, { createdAt: "desc" }],
      take,
      include: { controls: true, process: true, pipeline: true }
    }),
    get: (workspaceId, id) => prisma.risk.findFirst({
      where: { id, workspaceId },
      include: { controls: true, process: true, pipeline: true }
    })
  },
  "controls": {
    list: (workspaceId, take) => prisma.control.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { risk: true, ownerRole: true }
    }),
    get: (workspaceId, id) => prisma.control.findFirst({
      where: { id, workspaceId },
      include: { risk: true, ownerRole: true }
    })
  },
  "knowledge-items": {
    list: (workspaceId, take) => prisma.knowledgeItem.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { updatedAt: "desc" },
      take,
      include: { process: true, pipeline: true, project: true, client: true, agent: true }
    }),
    get: (workspaceId, id) => prisma.knowledgeItem.findFirst({
      where: { id, workspaceId },
      include: { process: true, pipeline: true, project: true, client: true, agent: true }
    })
  },
  "decision-logs": {
    list: (workspaceId, take) => prisma.decisionLog.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { decidedAt: "desc" },
      take,
      include: { process: true, pipeline: true, project: true }
    }),
    get: (workspaceId, id) => prisma.decisionLog.findFirst({
      where: { id, workspaceId },
      include: { process: true, pipeline: true, project: true }
    })
  },
  "automation-rules": {
    list: (workspaceId, take) => prisma.automationRule.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { pipeline: true, triggers: true }
    }),
    get: (workspaceId, id) => prisma.automationRule.findFirst({
      where: { id, workspaceId },
      include: { pipeline: true, triggers: true }
    })
  },
  "triggers": {
    list: (workspaceId, take) => prisma.trigger.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { automationRule: true }
    }),
    get: (workspaceId, id) => prisma.trigger.findFirst({
      where: { id, workspaceId },
      include: { automationRule: true }
    })
  },
  "artifacts": {
    list: (workspaceId, take) => prisma.artifact.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { resource: true }
    }),
    get: (workspaceId, id) => prisma.artifact.findFirst({
      where: { id, workspaceId },
      include: { resource: true }
    })
  },
  "dependencies": {
    list: (workspaceId, take) => prisma.dependency.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { createdAt: "desc" },
      take,
      include: { fromResource: true, toResource: true }
    }),
    get: (workspaceId, id) => prisma.dependency.findFirst({
      where: { id, workspaceId },
      include: { fromResource: true, toResource: true }
    })
  },
  "business-functions": {
    list: (workspaceId, take) => prisma.businessFunction.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { name: "asc" },
      take,
      include: { accountableRole: true }
    }),
    get: (workspaceId, id) => prisma.businessFunction.findFirst({
      where: { id, workspaceId },
      include: { accountableRole: true }
    })
  },
  "stakeholders": {
    list: (workspaceId, take) => prisma.stakeholder.findMany({
      where: workspaceWhere(workspaceId),
      orderBy: { name: "asc" },
      take,
      include: { client: true }
    }),
    get: (workspaceId, id) => prisma.stakeholder.findFirst({
      where: { id, workspaceId },
      include: { client: true }
    })
  }
};

async function countGroup(workspaceId: string) {
  const [
    processes,
    pipelines,
    pipelineStages,
    procedures,
    procedureSteps,
    companyRoles,
    resources,
    toolAdapters,
    integrationCapabilities,
    standards,
    pipelineRuns,
    stageRuns,
    approvals,
    checklistTemplates,
    checklistItems,
    acceptanceCriteria,
    auditLogs,
    events,
    policies,
    metrics,
    risks,
    controls,
    knowledgeItems,
    decisionLogs,
    automationRules,
    triggers,
    artifacts,
    dependencies,
    businessFunctions,
    stakeholders
  ] = await Promise.all([
    prisma.process.count({ where: workspaceWhere(workspaceId) }),
    prisma.pipeline.count({ where: workspaceWhere(workspaceId) }),
    prisma.pipelineStage.count({ where: workspaceWhere(workspaceId) }),
    prisma.procedure.count({ where: workspaceWhere(workspaceId) }),
    prisma.procedureStep.count({ where: { procedure: { workspaceId } } }),
    prisma.companyRole.count({ where: workspaceWhere(workspaceId) }),
    prisma.resource.count({ where: workspaceWhere(workspaceId) }),
    prisma.toolAdapter.count({ where: workspaceWhere(workspaceId) }),
    prisma.integrationCapability.count({ where: workspaceWhere(workspaceId) }),
    prisma.standard.count({ where: workspaceWhere(workspaceId) }),
    prisma.pipelineRun.count({ where: workspaceWhere(workspaceId) }),
    prisma.stageRun.count({ where: workspaceWhere(workspaceId) }),
    prisma.approval.count({ where: workspaceWhere(workspaceId) }),
    prisma.checklistTemplate.count({ where: workspaceWhere(workspaceId) }),
    prisma.checklistItem.count({ where: workspaceWhere(workspaceId) }),
    prisma.acceptanceCriterion.count({ where: workspaceWhere(workspaceId) }),
    prisma.auditLog.count({ where: workspaceWhere(workspaceId) }),
    prisma.event.count({ where: workspaceWhere(workspaceId) }),
    prisma.policy.count({ where: workspaceWhere(workspaceId) }),
    prisma.metric.count({ where: workspaceWhere(workspaceId) }),
    prisma.risk.count({ where: workspaceWhere(workspaceId) }),
    prisma.control.count({ where: workspaceWhere(workspaceId) }),
    prisma.knowledgeItem.count({ where: workspaceWhere(workspaceId) }),
    prisma.decisionLog.count({ where: workspaceWhere(workspaceId) }),
    prisma.automationRule.count({ where: workspaceWhere(workspaceId) }),
    prisma.trigger.count({ where: workspaceWhere(workspaceId) }),
    prisma.artifact.count({ where: workspaceWhere(workspaceId) }),
    prisma.dependency.count({ where: workspaceWhere(workspaceId) }),
    prisma.businessFunction.count({ where: workspaceWhere(workspaceId) }),
    prisma.stakeholder.count({ where: workspaceWhere(workspaceId) })
  ]);

  return {
    definitions: {
      processes,
      pipelines,
      pipelineStages,
      procedures,
      procedureSteps,
      companyRoles,
      resources,
      toolAdapters,
      integrationCapabilities,
      standards
    },
    runtime: {
      pipelineRuns,
      stageRuns,
      approvals,
      checklistTemplates,
      checklistItems,
      acceptanceCriteria,
      auditLogs,
      events
    },
    governance: {
      policies,
      metrics,
      risks,
      controls,
      knowledgeItems,
      decisionLogs,
      automationRules,
      triggers,
      artifacts,
      dependencies,
      businessFunctions,
      stakeholders
    }
  };
}

export const companyOsRouter = Router();

companyOsRouter.use("/workflow-definitions/drafts", workflowDefinitionDraftsRouter);
companyOsRouter.use("/workflow-definitions", workflowDefinitionRecoveryRouter);

companyOsRouter.post("/standards", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const body = createStandardSchema.parse(req.body);
  const actor = authActor(req);
  const correlationId = randomUUID();

  const [ownerRole, checklist] = await Promise.all([
    body.ownerRoleId
      ? prisma.companyRole.findFirst({ where: { id: body.ownerRoleId, workspaceId } })
      : Promise.resolve(null),
    body.checklistId
      ? prisma.checklistTemplate.findFirst({ where: { id: body.checklistId, workspaceId } })
      : Promise.resolve(null)
  ]);

  if (body.ownerRoleId && !ownerRole) {
    return res.status(404).json({ error: "owner_role_not_found" });
  }

  if (body.checklistId && !checklist) {
    return res.status(404).json({ error: "checklist_not_found" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const standard = await tx.standard.create({
        data: {
          workspaceId,
          name: body.name,
          category: body.category,
          description: body.description ?? undefined,
          checklistId: body.checklistId ?? undefined,
          validationMethod: body.validationMethod ?? undefined,
          ownerRoleId: body.ownerRoleId ?? undefined,
          status: body.status
        },
        include: { ownerRole: true, procedures: true }
      });

      const auditLog = await createDefinitionEvidence(tx, {
        workspaceId,
        actor,
        action: "standard.created",
        eventType: "standard_created",
        resourceType: "standard",
        resourceId: standard.id,
        inputPayload: body,
        outputPayload: {
          standardId: standard.id,
          name: standard.name,
          category: standard.category,
          status: standard.status,
          version: standard.version
        },
        correlationId
      });

      return { standard, auditLog };
    });

    return res.status(201).json({
      data: {
        ...result.standard,
        correlationId,
        auditLogId: result.auditLog.id
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "standard_version_conflict" });
    }
    throw error;
  }
}));

companyOsRouter.patch("/standards/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const id = z.string().uuid().parse(req.params.id);
  const body = updateStandardSchema.parse(req.body);
  const actor = authActor(req);
  const correlationId = randomUUID();

  const existing = await prisma.standard.findFirst({
    where: { id, workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const [ownerRole, checklist] = await Promise.all([
    body.ownerRoleId
      ? prisma.companyRole.findFirst({ where: { id: body.ownerRoleId, workspaceId } })
      : Promise.resolve(null),
    body.checklistId
      ? prisma.checklistTemplate.findFirst({ where: { id: body.checklistId, workspaceId } })
      : Promise.resolve(null)
  ]);

  if (body.ownerRoleId && !ownerRole) {
    return res.status(404).json({ error: "owner_role_not_found" });
  }

  if (body.checklistId && !checklist) {
    return res.status(404).json({ error: "checklist_not_found" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const standard = await tx.standard.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          category: body.category,
          description: body.description,
          checklistId: body.checklistId,
          validationMethod: body.validationMethod,
          ownerRoleId: body.ownerRoleId,
          status: body.status
        },
        include: { ownerRole: true, procedures: true }
      });

      const auditLog = await createDefinitionEvidence(tx, {
        workspaceId,
        actor,
        action: "standard.updated",
        eventType: "standard_updated",
        resourceType: "standard",
        resourceId: standard.id,
        inputPayload: body,
        outputPayload: {
          standardId: standard.id,
          name: standard.name,
          category: standard.category,
          status: standard.status,
          version: standard.version
        },
        correlationId
      });

      return { standard, auditLog };
    });

    return res.json({
      data: {
        ...result.standard,
        correlationId,
        auditLogId: result.auditLog.id
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "standard_version_conflict" });
    }
    throw error;
  }
}));

companyOsRouter.delete("/standards/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const id = z.string().uuid().parse(req.params.id);
  const actor = authActor(req);
  const correlationId = randomUUID();

  const existing = await prisma.standard.findFirst({
    where: { id, workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const result = await prisma.$transaction(async (tx) => {
    const standard = await tx.standard.update({
      where: { id: existing.id },
      data: { status: "archived" },
      include: { ownerRole: true, procedures: true }
    });

    const auditLog = await createDefinitionEvidence(tx, {
      workspaceId,
      actor,
      action: "standard.archived",
      eventType: "standard_archived",
      resourceType: "standard",
      resourceId: standard.id,
      inputPayload: { id: standard.id },
      outputPayload: {
        standardId: standard.id,
        status: standard.status,
        version: standard.version
      },
      correlationId
    });

    return { standard, auditLog };
  });

  res.json({
    data: {
      ...result.standard,
      archived: true,
      correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

companyOsRouter.post("/approvals/request", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const body = approvalRequestSchema.parse(req.body);
  const correlationId = randomUUID();
  const actor = authActor(req);

  const [
    approverRole,
    pipelineRun,
    stageRun
  ] = await Promise.all([
    body.approverRoleId
      ? prisma.companyRole.findFirst({ where: { id: body.approverRoleId, workspaceId } })
      : Promise.resolve(null),
    body.pipelineRunId
      ? prisma.pipelineRun.findFirst({ where: { id: body.pipelineRunId, workspaceId } })
      : Promise.resolve(null),
    body.stageRunId
      ? prisma.stageRun.findFirst({ where: { id: body.stageRunId, workspaceId } })
      : Promise.resolve(null)
  ]);

  if (body.approverRoleId && !approverRole) {
    return res.status(404).json({ error: "approver_role_not_found" });
  }

  if (body.pipelineRunId && !pipelineRun) {
    return res.status(404).json({ error: "pipeline_run_not_found" });
  }

  if (body.stageRunId && !stageRun) {
    return res.status(404).json({ error: "stage_run_not_found" });
  }

  if (pipelineRun && stageRun && stageRun.pipelineRunId !== pipelineRun.id) {
    return res.status(409).json({ error: "stage_run_pipeline_mismatch" });
  }

  const result = await prisma.$transaction(async (tx) => {
    const approval = await tx.approval.create({
      data: {
        workspaceId,
        requestedByType: body.requestedByType,
        requestedById: body.requestedById,
        requestedForAction: body.requestedForAction,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        riskLevel: body.riskLevel,
        approverRoleId: body.approverRoleId,
        status: "pending",
        expiresAt: body.expiresAt,
        pipelineRunId: body.pipelineRunId,
        stageRunId: body.stageRunId
      },
      include: { approverRole: true, pipelineRun: true, stageRun: true }
    });

    const auditLog = await tx.auditLog.create({
      data: {
        workspaceId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "approval.requested",
        resourceType: "approval",
        resourceId: approval.id,
        inputPayload: body.inputPayload as Prisma.InputJsonObject,
        outputPayload: {
          approvalId: approval.id,
          status: approval.status,
          requestedForAction: approval.requestedForAction
        },
        approvalId: approval.id,
        pipelineRunId: body.pipelineRunId,
        stageRunId: body.stageRunId,
        correlationId
      }
    });

    await tx.event.create({
      data: {
        workspaceId,
        type: "approval_requested",
        source: "companycore",
        actorType: actor.actorType,
        actorId: actor.actorId,
        resourceType: "approval",
        resourceId: approval.id,
        correlationId,
        payload: {
          approvalId: approval.id,
          auditLogId: auditLog.id,
          requestedForAction: approval.requestedForAction,
          riskLevel: approval.riskLevel
        }
      }
    });

    return { approval, auditLog };
  });

  res.status(201).json({
    data: {
      ...result.approval,
      correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

companyOsRouter.post("/approvals/:id/decision", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const id = z.string().uuid().parse(req.params.id);
  const body = approvalDecisionSchema.parse(req.body);
  const actor = authActor(req);

  const approval = await prisma.approval.findFirst({
    where: { id, workspaceId },
    include: { approverRole: true, pipelineRun: true, stageRun: true }
  });

  if (!approval) {
    return res.status(404).json({ error: "not_found" });
  }

  if (approval.status !== "pending") {
    return res.status(409).json({ error: "approval_already_decided" });
  }

  if (approval.expiresAt && approval.expiresAt.getTime() <= Date.now()) {
    return res.status(409).json({ error: "approval_expired" });
  }

  const correlationId = randomUUID();
  const result = await prisma.$transaction(async (tx) => {
    const decidedApproval = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: body.decision,
        decisionReason: body.decisionReason,
        approverUserId: req.auth!.authType === "user" ? req.auth!.userId : undefined,
        decidedAt: new Date()
      },
      include: { approverRole: true, pipelineRun: true, stageRun: true }
    });

    const auditLog = await tx.auditLog.create({
      data: {
        workspaceId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "approval.decided",
        resourceType: "approval",
        resourceId: approval.id,
        inputPayload: {
          decision: body.decision,
          decisionReason: body.decisionReason
        },
        outputPayload: {
          approvalId: approval.id,
          status: decidedApproval.status
        },
        approvalId: approval.id,
        pipelineRunId: approval.pipelineRunId,
        stageRunId: approval.stageRunId,
        correlationId
      }
    });

    await tx.event.create({
      data: {
        workspaceId,
        type: body.decision === "approved" ? "approval_approved" : "approval_rejected",
        source: "companycore",
        actorType: actor.actorType,
        actorId: actor.actorId,
        resourceType: "approval",
        resourceId: approval.id,
        correlationId,
        payload: {
          approvalId: approval.id,
          auditLogId: auditLog.id,
          decision: body.decision
        }
      }
    });

    return { approval: decidedApproval, auditLog };
  });

  res.json({
    data: {
      ...result.approval,
      correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

companyOsRouter.post("/pipeline-runs/:id/actions/start-stage", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const pipelineRunId = z.string().uuid().parse(req.params.id);
  const body = startStageSchema.parse(req.body);
  const actor = authActor(req);
  const result = await startStageCommand({ workspaceId, actor, pipelineRunId, input: body });

  if (isCommandError(result)) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json({
    data: {
      ...result.stageRun,
      correlationId: result.correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

companyOsRouter.post("/pipeline-runs/:id/task-links", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const pipelineRunId = z.string().uuid().parse(req.params.id);
  const input = pipelineRunTaskLinkSchema.parse(req.body);
  const actor = authActor(req);
  const correlationId = randomUUID();

  const [pipelineRun, task] = await Promise.all([
    prisma.pipelineRun.findFirst({ where: { id: pipelineRunId, workspaceId } }),
    prisma.task.findFirst({ where: { id: input.taskId, workspaceId } })
  ]);

  if (!pipelineRun || !task) {
    return res.status(404).json({ error: "not_found" });
  }

  const link = await prisma.pipelineRunTaskLink.upsert({
    where: {
      workspaceId_pipelineRunId_taskId_linkType: {
        workspaceId,
        pipelineRunId,
        taskId: input.taskId,
        linkType: input.linkType
      }
    },
    update: {
      source: input.source
    },
    create: {
      workspaceId,
      pipelineRunId,
      taskId: input.taskId,
      linkType: input.linkType,
      source: input.source
    }
  });

  const auditLog = await prisma.auditLog.create({
    data: {
      workspaceId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "pipeline_run.task_linked",
      resourceType: "pipeline_run_task_link",
      resourceId: link.id,
      pipelineRunId,
      inputPayload: {
        taskId: input.taskId,
        linkType: input.linkType,
        source: input.source
      },
      outputPayload: {
        pipelineRunTaskLinkId: link.id
      },
      correlationId
    }
  });

  await prisma.event.create({
    data: {
      workspaceId,
      type: "pipeline_run_task_linked",
      source: "companycore",
      actorType: actor.actorType,
      actorId: actor.actorId,
      resourceType: "pipeline_run_task_link",
      resourceId: link.id,
      correlationId,
      payload: {
        pipelineRunTaskLinkId: link.id,
        pipelineRunId,
        taskId: input.taskId,
        linkType: input.linkType,
        source: input.source,
        auditLogId: auditLog.id
      }
    }
  });

  res.status(201).json({
    data: {
      ...link,
      correlationId,
      auditLogId: auditLog.id
    }
  });
}));

companyOsRouter.post("/stage-runs/:id/actions/block", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const stageRunId = z.string().uuid().parse(req.params.id);
  const body = blockStageSchema.parse(req.body);
  const actor = authActor(req);
  const result = await blockStageCommand({ workspaceId, actor, stageRunId, input: body });

  if (isCommandError(result)) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json({
    data: {
      ...result.stageRun,
      correlationId: result.correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

companyOsRouter.post("/stage-runs/:id/actions/validate", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const stageRunId = z.string().uuid().parse(req.params.id);
  const body = validateStageSchema.parse(req.body);
  const actor = authActor(req);
  const result = await validateStageCommand({ workspaceId, actor, stageRunId, input: body });

  if (isCommandError(result)) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json({
    data: {
      ...result.stageRun,
      correlationId: result.correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

companyOsRouter.post("/stage-runs/:id/actions/complete", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const stageRunId = z.string().uuid().parse(req.params.id);
  const body = completeStageSchema.parse(req.body);
  const actor = authActor(req);
  const result = await completeStageCommand({ workspaceId, actor, stageRunId, input: body });

  if (isCommandError(result)) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json({
    data: {
      ...result.stageRun,
      correlationId: result.correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

companyOsRouter.post("/events/:id/actions/evaluate-automation-rules", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const eventId = z.string().uuid().parse(req.params.id);
  const body = automationEvaluationSchema.parse(req.body);
  const actor = authActor(req);

  const sourceEvent = await prisma.event.findFirst({
    where: { id: eventId, workspaceId }
  });

  if (!sourceEvent) {
    return res.status(404).json({ error: "event_not_found" });
  }

  const rules = await prisma.automationRule.findMany({
    where: {
      workspaceId,
      status: "active",
      ...(body.ruleIds ? { id: { in: body.ruleIds } } : {}),
      triggers: {
        some: {
          workspaceId,
          status: "active",
          OR: [
            { eventType: null },
            { eventType: sourceEvent.type }
          ]
        }
      }
    },
    include: {
      triggers: true
    },
    orderBy: { createdAt: "asc" }
  });

  const matchedRules = rules.filter((rule) => automationConditionMatches(rule.condition, sourceEvent));
  const proposals = matchedRules
    .map((rule) => createAutomationProposal(rule, sourceEvent))
    .filter((proposal): proposal is AutomationActionProposal => Boolean(proposal));
  const unsupportedRules = matchedRules
    .filter((rule) => !automationActionKind(rule.action))
    .map((rule) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      reason: "unsupported_action"
    }));

  if (body.mode === "dry_run") {
    return res.json({
      data: {
        mode: body.mode,
        sourceEventId: sourceEvent.id,
        matchedRuleIds: matchedRules.map((rule) => rule.id),
        proposals,
        skipped: unsupportedRules,
        executed: [],
        emittedEventIds: [],
        auditLogIds: []
      }
    });
  }

  const idempotencyBase = body.idempotencyKey ?? sourceEvent.id;
  const correlationId = randomUUID();
  const lifecycleExecutions: Array<{
    proposal: AutomationActionProposal;
    idempotencyKey: string;
  }> = [];
  const result = await prisma.$transaction(async (tx) => {
    const executed: Array<Record<string, unknown>> = [];
    const skipped = [...unsupportedRules] as Array<Record<string, unknown>>;
    const emittedEventIds: string[] = [];
    const auditLogIds: string[] = [];

    for (const proposal of proposals) {
      const idempotencyKey = [
        idempotencyBase,
        proposal.ruleId,
        proposal.actionKind,
        proposal.target.resourceType ?? "event",
        proposal.target.resourceId ?? sourceEvent.id,
        proposal.target.stageRunId ?? proposal.target.pipelineRunId ?? "none"
      ].join(":");

      const existingEvidence = await tx.auditLog.findMany({
        where: {
          workspaceId,
          action: "automation_rule.action_proposed",
          resourceType: "event",
          resourceId: sourceEvent.id
        },
        take: 25,
        orderBy: { createdAt: "desc" }
      });
      const alreadyProcessed = existingEvidence.find((auditLog) => automationEvidenceMatches(auditLog.inputPayload, {
        sourceEventId: sourceEvent.id,
        ruleId: proposal.ruleId,
        actionKind: proposal.actionKind,
        idempotencyKey
      }));

      if (alreadyProcessed) {
        skipped.push({
          ruleId: proposal.ruleId,
          ruleName: proposal.ruleName,
          actionKind: proposal.actionKind,
          reason: "already_processed",
          auditLogId: alreadyProcessed.id
        });
        continue;
      }

      const matchAuditLog = await tx.auditLog.create({
        data: {
          workspaceId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "automation_rule.matched",
          resourceType: "event",
          resourceId: sourceEvent.id,
          inputPayload: {
            sourceEventId: sourceEvent.id,
            ruleId: proposal.ruleId,
            idempotencyKey
          },
          outputPayload: {
            actionKind: proposal.actionKind,
            requiresApproval: proposal.requiresApproval,
            riskLevel: proposal.riskLevel
          },
          correlationId
        }
      });
      auditLogIds.push(matchAuditLog.id);

      const matchedEvent = await tx.event.create({
        data: {
          workspaceId,
          type: "automation_rule_matched",
          source: "companycore",
          actorType: actor.actorType,
          actorId: actor.actorId,
          resourceType: "event",
          resourceId: sourceEvent.id,
          correlationId,
          payload: {
            sourceEventId: sourceEvent.id,
            ruleId: proposal.ruleId,
            auditLogId: matchAuditLog.id,
            idempotencyKey
          }
        }
      });
      emittedEventIds.push(matchedEvent.id);

      const proposalAuditLog = await tx.auditLog.create({
        data: {
          workspaceId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "automation_rule.action_proposed",
          resourceType: "event",
          resourceId: sourceEvent.id,
          inputPayload: asInputJson({
            sourceEventId: sourceEvent.id,
            ruleId: proposal.ruleId,
            actionKind: proposal.actionKind,
            idempotencyKey,
            context: body.context
          }),
          outputPayload: asInputJson({
            proposal
          }),
          correlationId
        }
      });
      auditLogIds.push(proposalAuditLog.id);

      const proposedEvent = await tx.event.create({
        data: {
          workspaceId,
          type: "automation_action_proposed",
          source: "companycore",
          actorType: actor.actorType,
          actorId: actor.actorId,
          resourceType: proposal.target.resourceType ?? "event",
          resourceId: proposal.target.resourceId ?? sourceEvent.id,
          correlationId,
          payload: {
            sourceEventId: sourceEvent.id,
            ruleId: proposal.ruleId,
            actionKind: proposal.actionKind,
            auditLogId: proposalAuditLog.id,
            idempotencyKey
          }
        }
      });
      emittedEventIds.push(proposedEvent.id);

      if (proposal.actionKind === "emit_event") {
        const emitted = await tx.event.create({
          data: {
            workspaceId,
            type: typeof proposal.payload.eventType === "string" ? proposal.payload.eventType : "automation_event_emitted",
            source: "companycore",
            actorType: actor.actorType,
            actorId: actor.actorId,
            resourceType: proposal.target.resourceType ?? "event",
            resourceId: proposal.target.resourceId ?? sourceEvent.id,
            correlationId,
            payload: asInputJson({
              sourceEventId: sourceEvent.id,
              ruleId: proposal.ruleId,
              context: body.context,
              payload: asJsonObject(proposal.payload.payload as Prisma.JsonValue)
            })
          }
        });
        emittedEventIds.push(emitted.id);
        executed.push({
          ruleId: proposal.ruleId,
          actionKind: proposal.actionKind,
          eventId: emitted.id
        });
        continue;
      }

      if (proposal.actionKind === "request_approval") {
        const approverRole = typeof proposal.payload.approverRoleId === "string"
          ? null
          : typeof proposal.payload.notifyRole === "string"
            ? await tx.companyRole.findFirst({
              where: { workspaceId, name: proposal.payload.notifyRole }
            })
            : null;
        const approval = await tx.approval.create({
          data: {
            workspaceId,
            requestedByType: actor.actorType,
            requestedById: actor.actorId,
            requestedForAction: typeof proposal.payload.requestedForAction === "string"
              ? proposal.payload.requestedForAction
              : `automation.${proposal.ruleName}`,
            resourceType: proposal.target.resourceType ?? "event",
            resourceId: proposal.target.resourceId ?? sourceEvent.id,
            riskLevel: proposal.riskLevel,
            approverRoleId: typeof proposal.payload.approverRoleId === "string"
              ? proposal.payload.approverRoleId
              : approverRole?.id,
            pipelineRunId: proposal.target.pipelineRunId ?? undefined,
            stageRunId: proposal.target.stageRunId ?? undefined,
          }
        });

        const approvalAuditLog = await tx.auditLog.create({
          data: {
            workspaceId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            action: "approval.requested",
            resourceType: "approval",
            resourceId: approval.id,
            inputPayload: {
              sourceEventId: sourceEvent.id,
              ruleId: proposal.ruleId,
              actionKind: proposal.actionKind,
              idempotencyKey
            },
            outputPayload: {
              approvalId: approval.id,
              status: approval.status
            },
            approvalId: approval.id,
            pipelineRunId: approval.pipelineRunId,
            stageRunId: approval.stageRunId,
            correlationId
          }
        });
        auditLogIds.push(approvalAuditLog.id);

        const approvalEvent = await tx.event.create({
          data: {
            workspaceId,
            type: "approval_requested",
            source: "companycore",
            actorType: actor.actorType,
            actorId: actor.actorId,
            resourceType: "approval",
            resourceId: approval.id,
            correlationId,
            payload: {
              approvalId: approval.id,
              auditLogId: approvalAuditLog.id,
              sourceEventId: sourceEvent.id,
              ruleId: proposal.ruleId
            }
          }
        });
        emittedEventIds.push(approvalEvent.id);
        executed.push({
          ruleId: proposal.ruleId,
          actionKind: proposal.actionKind,
          approvalId: approval.id
        });
        continue;
      }

      if (isStageLifecycleAction(proposal.actionKind)) {
        lifecycleExecutions.push({ proposal, idempotencyKey });
        continue;
      }

      const failedAuditLog = await tx.auditLog.create({
        data: {
          workspaceId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "automation_rule.failed",
          resourceType: "event",
          resourceId: sourceEvent.id,
          inputPayload: {
            sourceEventId: sourceEvent.id,
            ruleId: proposal.ruleId,
            actionKind: proposal.actionKind,
            idempotencyKey
          },
          outputPayload: {
            reason: "action_requires_lifecycle_helper"
          },
          errorState: {
            reason: "action_requires_lifecycle_helper"
          },
          correlationId
        }
      });
      auditLogIds.push(failedAuditLog.id);

      const failedEvent = await tx.event.create({
        data: {
          workspaceId,
          type: "automation_rule_failed",
          source: "companycore",
          actorType: actor.actorType,
          actorId: actor.actorId,
          resourceType: "event",
          resourceId: sourceEvent.id,
          correlationId,
          payload: {
            sourceEventId: sourceEvent.id,
            ruleId: proposal.ruleId,
            actionKind: proposal.actionKind,
            auditLogId: failedAuditLog.id,
            reason: "action_requires_lifecycle_helper"
          }
        }
      });
      emittedEventIds.push(failedEvent.id);
      skipped.push({
        ruleId: proposal.ruleId,
        ruleName: proposal.ruleName,
        actionKind: proposal.actionKind,
        reason: "action_requires_lifecycle_helper"
      });
    }

    return { executed, skipped, emittedEventIds, auditLogIds };
  });

  for (const lifecycleExecution of lifecycleExecutions) {
    const { proposal, idempotencyKey } = lifecycleExecution;
    const lifecycleResult = await executeAutomationLifecycleProposal({
      workspaceId,
      actor,
      proposal
    });

    if (!isCommandError(lifecycleResult)) {
      result.executed.push({
        ruleId: proposal.ruleId,
        actionKind: proposal.actionKind,
        stageRunId: lifecycleResult.stageRun.id,
        commandAuditLogId: lifecycleResult.auditLog.id,
        commandCorrelationId: lifecycleResult.correlationId
      });
      result.auditLogIds.push(lifecycleResult.auditLog.id);
      continue;
    }

    const failedAuditLog = await prisma.auditLog.create({
      data: {
        workspaceId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "automation_rule.failed",
        resourceType: "event",
        resourceId: sourceEvent.id,
        inputPayload: {
          sourceEventId: sourceEvent.id,
          ruleId: proposal.ruleId,
          actionKind: proposal.actionKind,
          idempotencyKey
        },
        outputPayload: {
          reason: lifecycleResult.error,
          status: lifecycleResult.status
        },
        errorState: {
          reason: lifecycleResult.error,
          status: lifecycleResult.status
        },
        correlationId
      }
    });
    result.auditLogIds.push(failedAuditLog.id);

    const failedEvent = await prisma.event.create({
      data: {
        workspaceId,
        type: "automation_rule_failed",
        source: "companycore",
        actorType: actor.actorType,
        actorId: actor.actorId,
        resourceType: "event",
        resourceId: sourceEvent.id,
        correlationId,
        payload: {
          sourceEventId: sourceEvent.id,
          ruleId: proposal.ruleId,
          actionKind: proposal.actionKind,
          auditLogId: failedAuditLog.id,
          reason: lifecycleResult.error,
          status: lifecycleResult.status
        }
      }
    });
    result.emittedEventIds.push(failedEvent.id);
    result.skipped.push({
      ruleId: proposal.ruleId,
      ruleName: proposal.ruleName,
      actionKind: proposal.actionKind,
      reason: lifecycleResult.error,
      status: lifecycleResult.status
    });
  }

  res.json({
    data: {
      mode: body.mode,
      sourceEventId: sourceEvent.id,
      correlationId,
      matchedRuleIds: matchedRules.map((rule) => rule.id),
      proposals,
      ...result
    }
  });
}));

companyOsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const [
    counts,
    pendingApprovals,
    blockedPipelineRuns,
    failedStageRuns,
    highRisks,
    unhealthyAdapters,
    recentPipelineRuns,
    recentApprovals,
    recentAuditLogs,
    recentEvents
  ] = await Promise.all([
    countGroup(workspaceId),
    prisma.approval.findMany({
      where: { workspaceId, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { approverRole: true, pipelineRun: true, stageRun: true }
    }),
    prisma.pipelineRun.findMany({
      where: { workspaceId, status: { in: ["blocked", "failed"] } },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { pipeline: true, currentStage: true }
    }),
    prisma.stageRun.findMany({
      where: { workspaceId, status: { in: ["blocked", "failed"] } },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { pipelineRun: true, pipelineStage: true }
    }),
    prisma.risk.findMany({
      where: { workspaceId, riskLevel: { in: ["high", "critical"] }, status: "active" },
      orderBy: [{ riskLevel: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { controls: true }
    }),
    prisma.toolAdapter.findMany({
      where: { workspaceId, healthStatus: { not: "healthy" } },
      orderBy: { name: "asc" },
      take: 10,
      include: { capabilities: true }
    }),
    prisma.pipelineRun.findMany({
      where: { workspaceId },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { pipeline: true, currentStage: true }
    }),
    prisma.approval.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { approverRole: true }
    }),
    prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.event.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  res.json({
    data: {
      service: "company-os",
      workspaceId,
      counts,
      attention: {
        pendingApprovals,
        blockedPipelineRuns,
        failedStageRuns,
        highRisks,
        unhealthyAdapters
      },
      recent: {
        pipelineRuns: recentPipelineRuns,
        approvals: recentApprovals,
        auditLogs: recentAuditLogs,
        events: recentEvents
      },
      collections: collectionNames
    }
  });
}));

companyOsRouter.get("/:collection", asyncHandler(async (req, res) => {
  const collection = collectionSchema.parse(req.params.collection);
  const { limit } = listQuerySchema.parse(req.query);
  const data = await collectionReaders[collection].list(req.auth!.workspaceId, limit);
  res.json({ data });
}));

companyOsRouter.get("/:collection/:id", asyncHandler(async (req, res) => {
  const collection = collectionSchema.parse(req.params.collection);
  const id = z.string().uuid().parse(req.params.id);
  const data = await collectionReaders[collection].get(req.auth!.workspaceId, id);

  if (!data) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ data });
}));
