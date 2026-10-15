import { Router } from "express";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { requireWorkspaceRole } from "../../auth/workspace-access";
import { archiveProcedure } from "../process-core/procedure-archive";

type RouteActor = {
  actorType: "user" | "agent";
  actorId: string | null;
};

type SqlClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

type WorkflowDefinitionRootType = "process" | "pipeline" | "procedure";
type WorkflowDefinitionRiskLevel = "low" | "medium" | "high" | "critical";
type WorkflowDefinitionStatus = "draft" | "active" | "paused" | "archived" | "retired" | "deprecated";

type WorkflowDefinitionDraftRecord = {
  id: string;
  workspace_id: string;
  root_object_type: WorkflowDefinitionRootType;
  root_object_id: string | null;
  name: string;
  reason: string | null;
  status: WorkflowDefinitionStatus;
  risk_level: WorkflowDefinitionRiskLevel;
  base_version: number | null;
  target_version: number | null;
  change_set: Record<string, unknown>;
  impact_preview: Record<string, unknown>;
  idempotency_key: string | null;
  actor_type: "user" | "agent" | "system" | "integration";
  actor_id: string | null;
  source_channel: string | null;
  created_at: Date;
  updated_at: Date;
};

type RootRecord = {
  id: string;
  family_id?: string | null;
  name: string;
  version: number;
  status: string;
  purpose?: string;
  description?: string | null;
  department?: string | null;
  category?: string | null;
  maturity_level?: string;
  scope?: string | null;
  process_id?: string | null;
  default_owner_role_id?: string | null;
  trigger_type?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  is_automatable?: boolean;
  risk_level?: WorkflowDefinitionRiskLevel;
  owner_role_id?: string | null;
  related_policies?: unknown;
  related_metrics?: unknown;
  required_tools?: unknown;
  required_permissions?: unknown;
  expected_result?: string | null;
  quality_standard_id?: string | null;
};

type CountRow = {
  count: bigint | number | string;
};

type DuplicateNameRow = {
  id: string;
};

type ProcedureStepRecord = {
  step_order: number;
  instruction: string;
  step_type: string;
  required_tool_adapter_id: string | null;
  expected_input: Record<string, unknown>;
  expected_output: Record<string, unknown>;
  validation_rule: Record<string, unknown>;
  rollback_instruction: string | null;
};

type ApprovalRecord = {
  id: string;
  status: string;
  resource_type: string;
  resource_id: string | null;
};

type PipelineStageRecord = {
  name: string;
  description: string | null;
  position: number;
  expected_input: Record<string, unknown>;
  expected_output: Record<string, unknown>;
  entry_conditions: unknown[];
  exit_conditions: unknown[];
  assigned_role_id: string | null;
  procedure_id: string | null;
  required_tools: unknown[];
  required_approvals: unknown[];
  estimated_duration: string | null;
  failure_strategy: string | null;
  retry_policy: Record<string, unknown>;
  status: string;
  external_id: string | null;
  source: string | null;
};

type ImpactPreview = {
  root: {
    type: WorkflowDefinitionRootType;
    id: string | null;
    exists: boolean;
    status: string | null;
    currentVersion: number | null;
    targetVersion: number | null;
  };
  counts: Record<string, number>;
  changedFields: string[];
  approvalRequired: boolean;
  approvalReasons: string[];
  duplicateNameRisk: boolean;
  generatedAt: string;
};

type ImpactPreviewError = {
  status: number;
  error: string;
};

const rootObjectTypeSchema = z.enum(["process", "pipeline", "procedure"]);
const workflowDraftStatusSchema = z.enum(["draft", "active", "paused", "archived", "retired", "deprecated"]);
const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
const jsonObjectSchema = z.record(z.unknown()).default({});

const createWorkflowDefinitionDraftSchema = z.object({
  rootObjectType: rootObjectTypeSchema,
  rootObjectId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(240),
  reason: z.string().trim().min(1).max(2000).optional(),
  riskLevel: riskLevelSchema.default("medium"),
  changeSet: jsonObjectSchema,
  idempotencyKey: z.string().trim().min(1).max(160).optional(),
  sourceChannel: z.string().trim().min(1).max(80).optional()
}).strict();

const updateWorkflowDefinitionDraftSchema = z.object({
  name: z.string().trim().min(1).max(240).optional(),
  reason: z.string().trim().min(1).max(2000).optional(),
  status: workflowDraftStatusSchema.optional(),
  riskLevel: riskLevelSchema.optional(),
  changeSet: jsonObjectSchema.optional(),
  idempotencyKey: z.string().trim().min(1).max(160).optional(),
  sourceChannel: z.string().trim().min(1).max(80).optional()
}).strict();

const listWorkflowDefinitionDraftsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  rootObjectType: rootObjectTypeSchema.optional(),
  status: workflowDraftStatusSchema.optional()
}).strict();

const activateWorkflowDefinitionDraftSchema = z.object({
  approvalId: z.string().uuid().optional(),
  sourceChannel: z.string().trim().min(1).max(80).optional()
}).strict();

const archiveWorkflowDefinitionVersionSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().trim().min(1).max(160).optional(),
  sourceChannel: z.string().trim().min(1).max(80).optional()
}).strict();

const createRollbackDraftSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  riskLevel: riskLevelSchema.default("medium"),
  idempotencyKey: z.string().trim().min(1).max(160).optional(),
  sourceChannel: z.string().trim().min(1).max(80).optional()
}).strict();

const procedureStepDraftSchema = z.object({
  stepOrder: z.number().int().min(1),
  instruction: z.string().trim().min(1).max(4000),
  stepType: z.enum(["manual", "automated", "agent", "human_review", "integration_call"]).default("manual"),
  requiredToolAdapterId: z.string().uuid().optional(),
  expectedInput: z.record(z.unknown()).default({}),
  expectedOutput: z.record(z.unknown()).default({}),
  validationRule: z.record(z.unknown()).default({}),
  rollbackInstruction: z.string().trim().min(1).max(4000).optional()
}).strict();

const procedureChangeSetSchema = z.object({
  processId: z.string().uuid().optional(),
  purpose: z.string().trim().min(1).max(2000).optional(),
  scope: z.string().trim().min(1).max(2000).nullable().optional(),
  ownerRoleId: z.string().uuid().nullable().optional(),
  requiredTools: z.array(z.string().trim().min(1).max(120)).optional(),
  requiredPermissions: z.array(z.string().trim().min(1).max(120)).optional(),
  expectedResult: z.string().trim().min(1).max(2000).nullable().optional(),
  qualityStandardId: z.string().uuid().nullable().optional(),
  steps: z.array(procedureStepDraftSchema).optional()
}).passthrough();

const processChangeSetSchema = z.object({
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  ownerRoleId: z.string().uuid().nullable().optional(),
  department: z.string().trim().min(1).max(160).nullable().optional(),
  category: z.string().trim().min(1).max(160).nullable().optional(),
  maturityLevel: z.string().trim().min(1).max(80).optional(),
  relatedPolicies: z.array(z.string().trim().min(1).max(160)).optional(),
  relatedMetrics: z.array(z.string().trim().min(1).max(160)).optional()
}).passthrough();

const pipelineStageDraftSchema = z.object({
  name: z.string().trim().min(1).max(240),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  position: z.number().int().min(0),
  expectedInput: z.record(z.unknown()).default({}),
  expectedOutput: z.record(z.unknown()).default({}),
  entryConditions: z.array(z.unknown()).default([]),
  exitConditions: z.array(z.unknown()).default([]),
  assignedRoleId: z.string().uuid().nullable().optional(),
  procedureId: z.string().uuid().nullable().optional(),
  requiredTools: z.array(z.string().trim().min(1).max(120)).default([]),
  requiredApprovals: z.array(z.string().trim().min(1).max(160)).default([]),
  estimatedDuration: z.string().trim().min(1).max(120).nullable().optional(),
  failureStrategy: z.string().trim().min(1).max(2000).nullable().optional(),
  retryPolicy: z.record(z.unknown()).default({}),
  status: workflowDraftStatusSchema.default("active"),
  externalId: z.string().trim().min(1).max(200).nullable().optional(),
  source: z.string().trim().min(1).max(80).nullable().optional()
}).passthrough();

const pipelineChangeSetSchema = z.object({
  processId: z.string().uuid().nullable().optional(),
  purpose: z.string().trim().min(1).max(2000).optional(),
  triggerType: z.enum(["manual", "schedule", "webhook", "clickup_status_change", "drive_file_created", "github_push", "n8n_webhook", "agent_decision", "system_event"]).optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
  defaultOwnerRoleId: z.string().uuid().nullable().optional(),
  isAutomatable: z.boolean().optional(),
  riskLevel: riskLevelSchema.optional(),
  stages: z.array(pipelineStageDraftSchema).optional()
}).passthrough();

export const workflowDefinitionDraftsRouter = Router();
export const workflowDefinitionRecoveryRouter = Router();

function authActor(req: { auth?: { authType: "user" | "api_key"; userId?: string; apiKeyId?: string } }): RouteActor {
  if (req.auth?.authType === "api_key") {
    return { actorType: "agent", actorId: req.auth.apiKeyId ?? null };
  }
  return { actorType: "user", actorId: req.auth?.userId ?? null };
}

function asJson(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function toCount(row: CountRow | undefined): number {
  if (!row) {
    return 0;
  }
  return Number(row.count);
}

function serializeWorkflowDefinitionDraft(record: WorkflowDefinitionDraftRecord) {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    rootObjectType: record.root_object_type,
    rootObjectId: record.root_object_id,
    name: record.name,
    reason: record.reason,
    status: record.status,
    riskLevel: record.risk_level,
    baseVersion: record.base_version,
    targetVersion: record.target_version,
    changeSet: record.change_set,
    impactPreview: record.impact_preview,
    idempotencyKey: record.idempotency_key,
    actorType: record.actor_type,
    actorId: record.actor_id,
    sourceChannel: record.source_channel,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

async function findWorkflowDefinitionDraft(workspaceId: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<WorkflowDefinitionDraftRecord[]>(
    `SELECT * FROM "workflow_definition_drafts"
     WHERE "workspace_id" = $1::uuid AND "id" = $2::uuid
     LIMIT 1`,
    workspaceId,
    id
  );
  return rows[0] ?? null;
}

async function findWorkflowDefinitionDraftByIdempotencyKey(workspaceId: string, idempotencyKey: string) {
  const rows = await prisma.$queryRawUnsafe<WorkflowDefinitionDraftRecord[]>(
    `SELECT * FROM "workflow_definition_drafts"
     WHERE "workspace_id" = $1::uuid AND "idempotency_key" = $2
     LIMIT 1`,
    workspaceId,
    idempotencyKey
  );
  return rows[0] ?? null;
}

async function listWorkflowDefinitionDrafts(
  workspaceId: string,
  filters: z.infer<typeof listWorkflowDefinitionDraftsQuerySchema>
) {
  return prisma.$queryRawUnsafe<WorkflowDefinitionDraftRecord[]>(
    `SELECT * FROM "workflow_definition_drafts"
     WHERE "workspace_id" = $1::uuid
       AND ($2::"WorkflowDefinitionRootType" IS NULL OR "root_object_type" = $2::"WorkflowDefinitionRootType")
       AND ($3::"OperatingStatus" IS NULL OR "status" = $3::"OperatingStatus")
     ORDER BY "updated_at" DESC, "created_at" DESC
     LIMIT $4`,
    workspaceId,
    filters.rootObjectType ?? null,
    filters.status ?? null,
    filters.limit
  );
}

async function loadWorkflowDefinitionRoot(
  workspaceId: string,
  rootObjectType: WorkflowDefinitionRootType,
  rootObjectId?: string
) {
  if (!rootObjectId) {
    return null;
  }

  const tableByType: Record<WorkflowDefinitionRootType, string> = {
    process: "processes",
    pipeline: "pipelines",
    procedure: "procedures"
  };

  const rows = await prisma.$queryRawUnsafe<RootRecord[]>(
    `SELECT *
     FROM "${tableByType[rootObjectType]}"
     WHERE "workspace_id" = $1::uuid AND "id" = $2::uuid
     LIMIT 1`,
    workspaceId,
    rootObjectId
  );
  return rows[0] ?? null;
}

async function findArchiveEvidenceByIdempotencyKey(
  workspaceId: string,
  rootObjectType: WorkflowDefinitionRootType,
  rootObjectId: string,
  idempotencyKey: string
) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; output_payload: Record<string, unknown> }[]>(
    `SELECT "id", "output_payload"
     FROM "audit_logs"
     WHERE "workspace_id" = $1::uuid
       AND "action" = 'workflow_definition_version.archived'
       AND "resource_type" = $2
       AND "resource_id" = $3
       AND "input_payload"->>'idempotencyKey' = $4
     ORDER BY "created_at" DESC
     LIMIT 1`,
    workspaceId,
    `workflow_definition_${rootObjectType}`,
    rootObjectId,
    idempotencyKey
  );
  return rows[0] ?? null;
}

async function countActiveRuntimeDependencies(
  workspaceId: string,
  rootObjectType: WorkflowDefinitionRootType,
  rootObjectId: string
) {
  if (rootObjectType === "process") {
    return countSql(
      `SELECT COUNT(*)
       FROM "pipeline_runs" pr
       JOIN "pipelines" p ON p."id" = pr."pipeline_id"
       WHERE pr."workspace_id" = $1::uuid
         AND p."process_id" = $2::uuid
         AND pr."status" IN ('pending', 'running', 'blocked')`,
      workspaceId,
      rootObjectId
    );
  }

  if (rootObjectType === "pipeline") {
    return countSql(
      `SELECT COUNT(*)
       FROM "pipeline_runs"
       WHERE "workspace_id" = $1::uuid
         AND "pipeline_id" = $2::uuid
         AND "status" IN ('pending', 'running', 'blocked')`,
      workspaceId,
      rootObjectId
    );
  }

  return countSql(
    `SELECT COUNT(*)
     FROM "stage_runs" sr
     JOIN "pipeline_stages" ps ON ps."id" = sr."pipeline_stage_id"
     WHERE sr."workspace_id" = $1::uuid
       AND ps."procedure_id" = $2::uuid
       AND sr."status" IN ('pending', 'running', 'blocked')`,
    workspaceId,
    rootObjectId
  );
}

async function archiveWorkflowDefinitionRootVersion(
  tx: SqlClient,
  params: {
    workspaceId: string;
    rootObjectType: WorkflowDefinitionRootType;
    rootObjectId: string;
  }
) {
  const tableByType: Record<WorkflowDefinitionRootType, string> = {
    process: "processes",
    pipeline: "pipelines",
    procedure: "procedures"
  };

  const rows = await tx.$queryRawUnsafe<RootRecord[]>(
    `UPDATE "${tableByType[params.rootObjectType]}"
     SET "status" = 'archived'::"OperatingStatus",
         "updated_at" = NOW()
     WHERE "workspace_id" = $1::uuid AND "id" = $2::uuid
     RETURNING *`,
    params.workspaceId,
    params.rootObjectId
  );
  return rows[0] ?? null;
}

async function loadActiveWorkflowDefinitionRootByFamily(
  workspaceId: string,
  rootObjectType: WorkflowDefinitionRootType,
  familyId: string
) {
  const tableByType: Record<WorkflowDefinitionRootType, string> = {
    process: "processes",
    pipeline: "pipelines",
    procedure: "procedures"
  };

  const rows = await prisma.$queryRawUnsafe<RootRecord[]>(
    `SELECT *
     FROM "${tableByType[rootObjectType]}"
     WHERE "workspace_id" = $1::uuid
       AND "family_id" = $2::uuid
       AND "status" = 'active'::"OperatingStatus"
     ORDER BY "version" DESC
     LIMIT 1`,
    workspaceId,
    familyId
  );
  return rows[0] ?? null;
}

async function buildRollbackChangeSet(rootObjectType: WorkflowDefinitionRootType, root: RootRecord) {
  const marker = {
    kind: "rollback_to_version",
    rollbackSourceRootObjectId: root.id,
    rollbackSourceVersion: root.version
  };

  if (rootObjectType === "process") {
    return {
      ...marker,
      description: root.description ?? null,
      ownerRoleId: root.owner_role_id ?? null,
      department: root.department ?? null,
      category: root.category ?? null,
      maturityLevel: root.maturity_level ?? "defined",
      relatedPolicies: Array.isArray(root.related_policies) ? root.related_policies : [],
      relatedMetrics: Array.isArray(root.related_metrics) ? root.related_metrics : []
    };
  }

  if (rootObjectType === "pipeline") {
    const stages = await loadPipelineStages(root.id);
    return {
      ...marker,
      processId: root.process_id ?? null,
      purpose: root.purpose ?? "",
      triggerType: root.trigger_type ?? "manual",
      inputSchema: root.input_schema ?? {},
      outputSchema: root.output_schema ?? {},
      defaultOwnerRoleId: root.default_owner_role_id ?? null,
      isAutomatable: root.is_automatable ?? false,
      riskLevel: root.risk_level ?? "medium",
      stages: stages.map((stage) => ({
        name: stage.name,
        description: stage.description,
        position: stage.position,
        expectedInput: stage.expected_input,
        expectedOutput: stage.expected_output,
        entryConditions: stage.entry_conditions,
        exitConditions: stage.exit_conditions,
        assignedRoleId: stage.assigned_role_id,
        procedureId: stage.procedure_id,
        requiredTools: stage.required_tools,
        requiredApprovals: stage.required_approvals,
        estimatedDuration: stage.estimated_duration,
        failureStrategy: stage.failure_strategy,
        retryPolicy: stage.retry_policy,
        status: stage.status,
        externalId: stage.external_id,
        source: stage.source
      }))
    };
  }

  const steps = await loadProcedureSteps(root.id);
  return {
    ...marker,
    processId: root.process_id ?? null,
    purpose: root.purpose ?? "",
    scope: root.scope ?? null,
    ownerRoleId: root.owner_role_id ?? null,
    requiredTools: Array.isArray(root.required_tools) ? root.required_tools : [],
    requiredPermissions: Array.isArray(root.required_permissions) ? root.required_permissions : [],
    expectedResult: root.expected_result ?? null,
    qualityStandardId: root.quality_standard_id ?? null,
    steps: steps.map((step) => ({
      stepOrder: step.step_order,
      instruction: step.instruction,
      stepType: step.step_type,
      requiredToolAdapterId: step.required_tool_adapter_id,
      expectedInput: step.expected_input,
      expectedOutput: step.expected_output,
      validationRule: step.validation_rule,
      rollbackInstruction: step.rollback_instruction
    }))
  };
}

async function createDefinitionEvidence(
  tx: SqlClient,
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
  const auditId = randomUUID();
  const eventId = randomUUID();

  const auditRows = await tx.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO "audit_logs" (
      "id",
      "workspace_id",
      "actor_type",
      "actor_id",
      "action",
      "resource_type",
      "resource_id",
      "input_payload",
      "output_payload",
      "correlation_id"
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::"ActorType",
      $4,
      $5,
      $6,
      $7,
      $8::jsonb,
      $9::jsonb,
      $10
    )
    RETURNING "id"`,
    auditId,
    params.workspaceId,
    params.actor.actorType,
    params.actor.actorId,
    params.action,
    params.resourceType,
    params.resourceId,
    JSON.stringify(params.inputPayload),
    JSON.stringify(params.outputPayload),
    params.correlationId
  );

  await tx.$queryRawUnsafe(
    `INSERT INTO "events" (
      "id",
      "workspace_id",
      "type",
      "payload",
      "source",
      "actor_type",
      "actor_id",
      "resource_type",
      "resource_id",
      "correlation_id",
      "updated_at"
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3,
      $4::jsonb,
      'companycore',
      $5::"ActorType",
      $6,
      $7,
      $8,
      $9,
      NOW()
    )`,
    eventId,
    params.workspaceId,
    params.eventType,
    JSON.stringify({ auditLogId: auditRows[0]?.id ?? auditId, action: params.action }),
    params.actor.actorType,
    params.actor.actorId,
    params.resourceType,
    params.resourceId,
    params.correlationId
  );

  return { id: auditRows[0]?.id ?? auditId };
}

async function countSql(query: string, ...values: unknown[]) {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(query, ...values);
  return toCount(rows[0]);
}

async function hasDuplicateName(table: "processes" | "pipelines" | "procedures", workspaceId: string, name: string, excludeId: string | null) {
  const rows = await prisma.$queryRawUnsafe<DuplicateNameRow[]>(
    `SELECT "id"
     FROM "${table}"
     WHERE "workspace_id" = $1::uuid
       AND lower("name") = lower($2)
       AND ($3::uuid IS NULL OR "id" <> $3::uuid)
     LIMIT 1`,
    workspaceId,
    name,
    excludeId
  );
  return rows.length > 0;
}

function changedFields(changeSet: Record<string, unknown>) {
  return Object.keys(changeSet).sort();
}

async function buildWorkflowDefinitionImpactPreview(
  workspaceId: string,
  input: {
    rootObjectType: WorkflowDefinitionRootType;
    rootObjectId: string | null;
    name: string;
    riskLevel: WorkflowDefinitionRiskLevel;
    changeSet: Record<string, unknown>;
  }
): Promise<ImpactPreview | ImpactPreviewError> {
  const root = await loadWorkflowDefinitionRoot(workspaceId, input.rootObjectType, input.rootObjectId ?? undefined);
  if (input.rootObjectId && !root) {
    return { status: 404, error: "workflow_root_not_found" };
  }

  const fields = changedFields(input.changeSet);
  const approvalReasons: string[] = [];
  const counts: Record<string, number> = {};
  let duplicateNameRisk = false;

  if (input.rootObjectType === "process") {
    duplicateNameRisk = await hasDuplicateName("processes", workspaceId, input.name, input.rootObjectId);
    counts.pipelines = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "pipelines" WHERE "workspace_id" = $1::uuid AND "process_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    counts.procedures = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "procedures" WHERE "workspace_id" = $1::uuid AND "process_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    counts.pipelineRuns = input.rootObjectId
      ? await countSql(
        `SELECT COUNT(*)
         FROM "pipeline_runs" pr
         JOIN "pipelines" p ON p."id" = pr."pipeline_id"
         WHERE pr."workspace_id" = $1::uuid AND p."process_id" = $2::uuid`,
        workspaceId,
        input.rootObjectId
      )
      : 0;
    counts.policies = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "policies" WHERE "workspace_id" = $1::uuid AND "process_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    counts.risks = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "risks" WHERE "workspace_id" = $1::uuid AND "process_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    if (counts.pipelineRuns > 0) {
      approvalReasons.push("process has runtime pipeline history");
    }
  }

  if (input.rootObjectType === "pipeline") {
    duplicateNameRisk = await hasDuplicateName("pipelines", workspaceId, input.name, input.rootObjectId);
    counts.stages = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "pipeline_stages" WHERE "workspace_id" = $1::uuid AND "pipeline_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    counts.pipelineRuns = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "pipeline_runs" WHERE "workspace_id" = $1::uuid AND "pipeline_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    counts.activePipelineRuns = input.rootObjectId
      ? await countSql(
        `SELECT COUNT(*) FROM "pipeline_runs"
         WHERE "workspace_id" = $1::uuid
           AND "pipeline_id" = $2::uuid
           AND "status" IN ('pending', 'running', 'blocked')`,
        workspaceId,
        input.rootObjectId
      )
      : 0;
    counts.automationRules = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "automation_rules" WHERE "workspace_id" = $1::uuid AND "pipeline_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    counts.risks = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "risks" WHERE "workspace_id" = $1::uuid AND "pipeline_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    counts.metrics = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "metrics" WHERE "workspace_id" = $1::uuid AND "pipeline_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    if (root?.status === "active") {
      approvalReasons.push("pipeline definition is active");
    }
    if (counts.automationRules > 0) {
      approvalReasons.push("pipeline is linked to automation rules");
    }
    if (counts.activePipelineRuns > 0) {
      approvalReasons.push("pipeline has active runtime work");
    }
  }

  if (input.rootObjectType === "procedure") {
    duplicateNameRisk = await hasDuplicateName("procedures", workspaceId, input.name, input.rootObjectId);
    counts.steps = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "procedure_steps" WHERE "procedure_id" = $1::uuid`, input.rootObjectId)
      : 0;
    counts.stages = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "pipeline_stages" WHERE "workspace_id" = $1::uuid AND "procedure_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    counts.stageRuns = input.rootObjectId
      ? await countSql(
        `SELECT COUNT(*)
         FROM "stage_runs" sr
         JOIN "pipeline_stages" ps ON ps."id" = sr."pipeline_stage_id"
         WHERE sr."workspace_id" = $1::uuid AND ps."procedure_id" = $2::uuid`,
        workspaceId,
        input.rootObjectId
      )
      : 0;
    counts.policies = input.rootObjectId
      ? await countSql(`SELECT COUNT(*) FROM "policies" WHERE "workspace_id" = $1::uuid AND "procedure_id" = $2::uuid`, workspaceId, input.rootObjectId)
      : 0;
    if (counts.stages > 0 || counts.stageRuns > 0) {
      approvalReasons.push("procedure is linked to runtime stages");
    }
  }

  if (duplicateNameRisk) {
    approvalReasons.push("definition name already exists");
  }
  if (["high", "critical"].includes(input.riskLevel)) {
    approvalReasons.push(`${input.riskLevel} risk change`);
  }

  return {
    root: {
      type: input.rootObjectType,
      id: input.rootObjectId,
      exists: Boolean(root),
      status: root?.status ?? null,
      currentVersion: root?.version ?? null,
      targetVersion: root?.version ? root.version + 1 : 1
    },
    counts,
    changedFields: fields,
    approvalRequired: approvalReasons.length > 0,
    approvalReasons,
    duplicateNameRisk,
    generatedAt: new Date().toISOString()
  };
}

async function validateWorkspaceRelation(
  table: "processes" | "procedures" | "company_roles" | "standards" | "tool_adapters",
  workspaceId: string,
  id: string | null | undefined,
  error: string
) {
  if (!id) {
    return null;
  }

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "${table}"
     WHERE "workspace_id" = $1::uuid AND "id" = $2::uuid
     LIMIT 1`,
    workspaceId,
    id
  );

  if (!rows[0]) {
    return { status: 404, error };
  }

  return null;
}

async function validateDraftApproval(workspaceId: string, draftId: string, approvalId: string | undefined, approvalRequired: boolean) {
  if (!approvalId) {
    return approvalRequired ? { status: 409, error: "workflow_definition_approval_required" } : null;
  }

  const rows = await prisma.$queryRawUnsafe<ApprovalRecord[]>(
    `SELECT "id", "status"::text AS "status", "resource_type", "resource_id"
     FROM "approvals"
     WHERE "workspace_id" = $1::uuid AND "id" = $2::uuid
     LIMIT 1`,
    workspaceId,
    approvalId
  );
  const approval = rows[0];

  if (!approval) {
    return { status: 404, error: "approval_not_found" };
  }

  if (approval.resource_type !== "workflow_definition_draft" || approval.resource_id !== draftId) {
    return { status: 409, error: "approval_resource_mismatch" };
  }

  if (approval.status !== "approved") {
    return { status: 409, error: "approval_not_approved" };
  }

  return null;
}

async function loadProcedureSteps(procedureId: string) {
  return prisma.$queryRawUnsafe<ProcedureStepRecord[]>(
    `SELECT
      "step_order",
      "instruction",
      "step_type"::text AS "step_type",
      "required_tool_adapter_id",
      "expected_input",
      "expected_output",
      "validation_rule",
      "rollback_instruction"
     FROM "procedure_steps"
     WHERE "procedure_id" = $1::uuid
     ORDER BY "step_order" ASC`,
    procedureId
  );
}

async function loadPipelineStages(pipelineId: string) {
  return prisma.$queryRawUnsafe<PipelineStageRecord[]>(
    `SELECT
      "name",
      "description",
      "position",
      "expected_input",
      "expected_output",
      "entry_conditions",
      "exit_conditions",
      "assigned_role_id",
      "procedure_id",
      "required_tools",
      "required_approvals",
      "estimated_duration",
      "failure_strategy",
      "retry_policy",
      "status"::text AS "status",
      "external_id",
      "source"
     FROM "pipeline_stages"
     WHERE "pipeline_id" = $1::uuid
     ORDER BY "position" ASC`,
    pipelineId
  );
}

function normalizeProcedureSteps(existingSteps: ProcedureStepRecord[], changeSet: Record<string, unknown>) {
  const parsed = procedureChangeSetSchema.parse(changeSet);
  if (!parsed.steps) {
    return existingSteps.map((step) => ({
      stepOrder: step.step_order,
      instruction: step.instruction,
      stepType: step.step_type,
      requiredToolAdapterId: step.required_tool_adapter_id,
      expectedInput: step.expected_input,
      expectedOutput: step.expected_output,
      validationRule: step.validation_rule,
      rollbackInstruction: step.rollback_instruction
    }));
  }

  const seenOrders = new Set<number>();
  for (const step of parsed.steps) {
    if (seenOrders.has(step.stepOrder)) {
      throw new Error("duplicate_step_order");
    }
    seenOrders.add(step.stepOrder);
  }

  return parsed.steps;
}

async function insertProcedureStep(tx: SqlClient, procedureId: string, step: ReturnType<typeof normalizeProcedureSteps>[number]) {
  await tx.$queryRawUnsafe(
    `INSERT INTO "procedure_steps" (
      "id",
      "procedure_id",
      "step_order",
      "instruction",
      "step_type",
      "required_tool_adapter_id",
      "expected_input",
      "expected_output",
      "validation_rule",
      "rollback_instruction",
      "updated_at"
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3,
      $4,
      $5::"ProcedureStepType",
      $6::uuid,
      $7::jsonb,
      $8::jsonb,
      $9::jsonb,
      $10,
      NOW()
    )`,
    randomUUID(),
    procedureId,
    step.stepOrder,
    step.instruction,
    step.stepType,
    step.requiredToolAdapterId ?? null,
    JSON.stringify(step.expectedInput ?? {}),
    JSON.stringify(step.expectedOutput ?? {}),
    JSON.stringify(step.validationRule ?? {}),
    step.rollbackInstruction ?? null
  );
}

function normalizePipelineStages(existingStages: PipelineStageRecord[], changeSet: Record<string, unknown>) {
  const parsed = pipelineChangeSetSchema.parse(changeSet);
  if (!parsed.stages) {
    return existingStages.map((stage) => ({
      name: stage.name,
      description: stage.description,
      position: stage.position,
      expectedInput: stage.expected_input,
      expectedOutput: stage.expected_output,
      entryConditions: stage.entry_conditions,
      exitConditions: stage.exit_conditions,
      assignedRoleId: stage.assigned_role_id,
      procedureId: stage.procedure_id,
      requiredTools: stage.required_tools,
      requiredApprovals: stage.required_approvals,
      estimatedDuration: stage.estimated_duration,
      failureStrategy: stage.failure_strategy,
      retryPolicy: stage.retry_policy,
      status: stage.status as WorkflowDefinitionStatus,
      externalId: stage.external_id,
      source: stage.source
    }));
  }

  const seenPositions = new Set<number>();
  for (const stage of parsed.stages) {
    if (seenPositions.has(stage.position)) {
      throw new Error("duplicate_stage_position");
    }
    seenPositions.add(stage.position);
  }

  return parsed.stages;
}

async function insertPipelineStage(tx: SqlClient, workspaceId: string, pipelineId: string, stage: ReturnType<typeof normalizePipelineStages>[number]) {
  await tx.$queryRawUnsafe(
    `INSERT INTO "pipeline_stages" (
      "id",
      "workspace_id",
      "pipeline_id",
      "name",
      "description",
      "position",
      "expected_input",
      "expected_output",
      "entry_conditions",
      "exit_conditions",
      "assigned_role_id",
      "procedure_id",
      "required_tools",
      "required_approvals",
      "estimated_duration",
      "failure_strategy",
      "retry_policy",
      "status",
      "external_id",
      "source",
      "updated_at"
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4,
      $5,
      $6,
      $7::jsonb,
      $8::jsonb,
      $9::jsonb,
      $10::jsonb,
      $11::uuid,
      $12::uuid,
      $13::jsonb,
      $14::jsonb,
      $15,
      $16,
      $17::jsonb,
      $18::"OperatingStatus",
      $19,
      $20,
      NOW()
    )`,
    randomUUID(),
    workspaceId,
    pipelineId,
    stage.name,
    stage.description ?? null,
    stage.position,
    JSON.stringify(stage.expectedInput ?? {}),
    JSON.stringify(stage.expectedOutput ?? {}),
    JSON.stringify(stage.entryConditions ?? []),
    JSON.stringify(stage.exitConditions ?? []),
    stage.assignedRoleId ?? null,
    stage.procedureId ?? null,
    JSON.stringify(stage.requiredTools ?? []),
    JSON.stringify(stage.requiredApprovals ?? []),
    stage.estimatedDuration ?? null,
    stage.failureStrategy ?? null,
    JSON.stringify(stage.retryPolicy ?? {}),
    stage.status ?? "active",
    stage.externalId ?? null,
    stage.source ?? "companycore"
  );
}

async function activateProcedureDraft(
  tx: SqlClient,
  params: {
    workspaceId: string;
    draft: WorkflowDefinitionDraftRecord;
    root: RootRecord;
    impactPreview: ImpactPreview;
    approvalId: string | null;
    actor: RouteActor;
    sourceChannel: string;
    correlationId: string;
  }
) {
  const parsedChangeSet = procedureChangeSetSchema.parse(params.draft.change_set);
  const existingSteps = await loadProcedureSteps(params.root.id);
  const steps = normalizeProcedureSteps(existingSteps, params.draft.change_set);
  const activatedProcedureId = randomUUID();
  const requiredTools = parsedChangeSet.requiredTools ?? (Array.isArray(params.root.required_tools) ? params.root.required_tools : []);
  const requiredPermissions = parsedChangeSet.requiredPermissions ?? (Array.isArray(params.root.required_permissions) ? params.root.required_permissions : []);

  await tx.$queryRawUnsafe(
    `UPDATE "procedures"
     SET "status" = 'deprecated'::"OperatingStatus",
         "updated_at" = NOW()
     WHERE "workspace_id" = $1::uuid AND "id" = $2::uuid`,
    params.workspaceId,
    params.root.id
  );

  const insertedRows = await tx.$queryRawUnsafe<RootRecord[]>(
    `INSERT INTO "procedures" (
      "id",
      "workspace_id",
      "process_id",
      "name",
      "purpose",
      "scope",
      "owner_role_id",
      "version",
      "status",
      "required_tools",
      "required_permissions",
      "expected_result",
      "quality_standard_id",
      "family_id",
      "updated_at"
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4,
      $5,
      $6,
      $7::uuid,
      $8,
      'active'::"OperatingStatus",
      $9::jsonb,
      $10::jsonb,
      $11,
      $12::uuid,
      $13::uuid,
      NOW()
    )
    RETURNING *`,
    activatedProcedureId,
    params.workspaceId,
    parsedChangeSet.processId ?? params.root.process_id ?? null,
    params.draft.name,
    parsedChangeSet.purpose ?? params.root.purpose ?? params.draft.name,
    parsedChangeSet.scope === undefined ? params.root.scope ?? null : parsedChangeSet.scope,
    parsedChangeSet.ownerRoleId === undefined ? params.root.owner_role_id ?? null : parsedChangeSet.ownerRoleId,
    params.draft.target_version ?? params.root.version + 1,
    JSON.stringify(requiredTools),
    JSON.stringify(requiredPermissions),
    parsedChangeSet.expectedResult === undefined ? params.root.expected_result ?? null : parsedChangeSet.expectedResult,
    parsedChangeSet.qualityStandardId === undefined ? params.root.quality_standard_id ?? null : parsedChangeSet.qualityStandardId,
    params.root.family_id ?? params.root.id
  );

  for (const step of steps) {
    await insertProcedureStep(tx, activatedProcedureId, step);
  }

  const draftRows = await tx.$queryRawUnsafe<WorkflowDefinitionDraftRecord[]>(
    `UPDATE "workflow_definition_drafts"
     SET "status" = 'active'::"OperatingStatus",
         "impact_preview" = $1::jsonb,
         "source_channel" = $2,
         "updated_at" = NOW()
     WHERE "workspace_id" = $3::uuid AND "id" = $4::uuid
     RETURNING *`,
    JSON.stringify(params.impactPreview),
    params.sourceChannel,
    params.workspaceId,
    params.draft.id
  );

  const auditLog = await createDefinitionEvidence(tx, {
    workspaceId: params.workspaceId,
    actor: params.actor,
    action: "workflow_definition_draft.activated",
    eventType: "workflow_definition_draft_activated",
    resourceType: "workflow_definition_draft",
    resourceId: params.draft.id,
    inputPayload: {
      draftId: params.draft.id,
      approvalId: params.approvalId
    },
    outputPayload: {
      draftId: params.draft.id,
      rootObjectType: params.draft.root_object_type,
      previousVersion: params.root.version,
      previousProcedureId: params.root.id,
      activatedProcedureId,
      newVersion: insertedRows[0]?.version ?? params.draft.target_version,
      approvalId: params.approvalId,
      impactPreview: params.impactPreview,
      rollbackCandidate: {
        procedureId: params.root.id,
        version: params.root.version
      }
    },
    correlationId: params.correlationId
  });

  return {
    draft: draftRows[0]!,
    activatedRoot: insertedRows[0]!,
    activatedRootObjectId: activatedProcedureId,
    activatedProcedure: insertedRows[0]!,
    auditLog
  };
}

async function activateProcessDraft(
  tx: SqlClient,
  params: {
    workspaceId: string;
    draft: WorkflowDefinitionDraftRecord;
    root: RootRecord;
    impactPreview: ImpactPreview;
    approvalId: string | null;
    actor: RouteActor;
    sourceChannel: string;
    correlationId: string;
  }
) {
  const parsedChangeSet = processChangeSetSchema.parse(params.draft.change_set);
  const activatedProcessId = randomUUID();
  const relatedPolicies = parsedChangeSet.relatedPolicies ?? (Array.isArray(params.root.related_policies) ? params.root.related_policies : []);
  const relatedMetrics = parsedChangeSet.relatedMetrics ?? (Array.isArray(params.root.related_metrics) ? params.root.related_metrics : []);

  await tx.$queryRawUnsafe(
    `UPDATE "processes"
     SET "status" = 'deprecated'::"OperatingStatus",
         "updated_at" = NOW()
     WHERE "workspace_id" = $1::uuid AND "id" = $2::uuid`,
    params.workspaceId,
    params.root.id
  );

  const insertedRows = await tx.$queryRawUnsafe<RootRecord[]>(
    `INSERT INTO "processes" (
      "id",
      "workspace_id",
      "name",
      "description",
      "owner_role_id",
      "department",
      "category",
      "status",
      "version",
      "maturity_level",
      "related_policies",
      "related_metrics",
      "family_id",
      "updated_at"
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3,
      $4,
      $5::uuid,
      $6,
      $7,
      'active'::"OperatingStatus",
      $8,
      $9,
      $10::jsonb,
      $11::jsonb,
      $12::uuid,
      NOW()
    )
    RETURNING *`,
    activatedProcessId,
    params.workspaceId,
    params.draft.name,
    parsedChangeSet.description === undefined ? params.root.description ?? null : parsedChangeSet.description,
    parsedChangeSet.ownerRoleId === undefined ? params.root.owner_role_id ?? null : parsedChangeSet.ownerRoleId,
    parsedChangeSet.department === undefined ? params.root.department ?? null : parsedChangeSet.department,
    parsedChangeSet.category === undefined ? params.root.category ?? null : parsedChangeSet.category,
    params.draft.target_version ?? params.root.version + 1,
    parsedChangeSet.maturityLevel ?? params.root.maturity_level ?? "defined",
    JSON.stringify(relatedPolicies),
    JSON.stringify(relatedMetrics),
    params.root.family_id ?? params.root.id
  );

  return finishActivation(tx, {
    workspaceId: params.workspaceId,
    draft: params.draft,
    root: params.root,
    activatedRoot: insertedRows[0]!,
    activatedRootObjectId: activatedProcessId,
    rootObjectType: "process",
    impactPreview: params.impactPreview,
    approvalId: params.approvalId,
    actor: params.actor,
    sourceChannel: params.sourceChannel,
    correlationId: params.correlationId,
    rollbackCandidate: {
      processId: params.root.id,
      version: params.root.version
    }
  });
}

async function activatePipelineDraft(
  tx: SqlClient,
  params: {
    workspaceId: string;
    draft: WorkflowDefinitionDraftRecord;
    root: RootRecord;
    impactPreview: ImpactPreview;
    approvalId: string | null;
    actor: RouteActor;
    sourceChannel: string;
    correlationId: string;
  }
) {
  const parsedChangeSet = pipelineChangeSetSchema.parse(params.draft.change_set);
  const existingStages = await loadPipelineStages(params.root.id);
  const stages = normalizePipelineStages(existingStages, params.draft.change_set);
  const activatedPipelineId = randomUUID();

  await tx.$queryRawUnsafe(
    `UPDATE "pipelines"
     SET "status" = 'deprecated'::"OperatingStatus",
         "updated_at" = NOW()
     WHERE "workspace_id" = $1::uuid AND "id" = $2::uuid`,
    params.workspaceId,
    params.root.id
  );

  const insertedRows = await tx.$queryRawUnsafe<RootRecord[]>(
    `INSERT INTO "pipelines" (
      "id",
      "workspace_id",
      "process_id",
      "name",
      "purpose",
      "trigger_type",
      "input_schema",
      "output_schema",
      "default_owner_role_id",
      "status",
      "version",
      "is_automatable",
      "risk_level",
      "family_id",
      "updated_at"
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4,
      $5,
      $6::"TriggerType",
      $7::jsonb,
      $8::jsonb,
      $9::uuid,
      'active'::"OperatingStatus",
      $10,
      $11,
      $12::"RiskLevel",
      $13::uuid,
      NOW()
    )
    RETURNING *`,
    activatedPipelineId,
    params.workspaceId,
    parsedChangeSet.processId === undefined ? params.root.process_id ?? null : parsedChangeSet.processId,
    params.draft.name,
    parsedChangeSet.purpose ?? params.root.purpose ?? params.draft.name,
    parsedChangeSet.triggerType ?? params.root.trigger_type ?? "manual",
    JSON.stringify(parsedChangeSet.inputSchema ?? params.root.input_schema ?? {}),
    JSON.stringify(parsedChangeSet.outputSchema ?? params.root.output_schema ?? {}),
    parsedChangeSet.defaultOwnerRoleId === undefined ? params.root.default_owner_role_id ?? null : parsedChangeSet.defaultOwnerRoleId,
    params.draft.target_version ?? params.root.version + 1,
    parsedChangeSet.isAutomatable ?? params.root.is_automatable ?? false,
    parsedChangeSet.riskLevel ?? params.root.risk_level ?? params.draft.risk_level,
    params.root.family_id ?? params.root.id
  );

  for (const stage of stages) {
    await insertPipelineStage(tx, params.workspaceId, activatedPipelineId, stage);
  }

  return finishActivation(tx, {
    workspaceId: params.workspaceId,
    draft: params.draft,
    root: params.root,
    activatedRoot: insertedRows[0]!,
    activatedRootObjectId: activatedPipelineId,
    rootObjectType: "pipeline",
    impactPreview: params.impactPreview,
    approvalId: params.approvalId,
    actor: params.actor,
    sourceChannel: params.sourceChannel,
    correlationId: params.correlationId,
    rollbackCandidate: {
      pipelineId: params.root.id,
      version: params.root.version
    }
  });
}

async function finishActivation(
  tx: SqlClient,
  params: {
    workspaceId: string;
    draft: WorkflowDefinitionDraftRecord;
    root: RootRecord;
    activatedRoot: RootRecord;
    activatedRootObjectId: string;
    rootObjectType: WorkflowDefinitionRootType;
    impactPreview: ImpactPreview;
    approvalId: string | null;
    actor: RouteActor;
    sourceChannel: string;
    correlationId: string;
    rollbackCandidate: Record<string, unknown>;
  }
) {
  const draftRows = await tx.$queryRawUnsafe<WorkflowDefinitionDraftRecord[]>(
    `UPDATE "workflow_definition_drafts"
     SET "status" = 'active'::"OperatingStatus",
         "impact_preview" = $1::jsonb,
         "source_channel" = $2,
         "updated_at" = NOW()
     WHERE "workspace_id" = $3::uuid AND "id" = $4::uuid
     RETURNING *`,
    JSON.stringify(params.impactPreview),
    params.sourceChannel,
    params.workspaceId,
    params.draft.id
  );

  const auditLog = await createDefinitionEvidence(tx, {
    workspaceId: params.workspaceId,
    actor: params.actor,
    action: "workflow_definition_draft.activated",
    eventType: "workflow_definition_draft_activated",
    resourceType: "workflow_definition_draft",
    resourceId: params.draft.id,
    inputPayload: {
      draftId: params.draft.id,
      approvalId: params.approvalId
    },
    outputPayload: {
      draftId: params.draft.id,
      rootObjectType: params.rootObjectType,
      previousVersion: params.root.version,
      previousRootObjectId: params.root.id,
      activatedRootObjectId: params.activatedRootObjectId,
      newVersion: params.activatedRoot.version ?? params.draft.target_version,
      approvalId: params.approvalId,
      impactPreview: params.impactPreview,
      rollbackCandidate: params.rollbackCandidate
    },
    correlationId: params.correlationId
  });

  return {
    draft: draftRows[0]!,
    activatedRoot: params.activatedRoot,
    activatedRootObjectId: params.activatedRootObjectId,
    auditLog
  };
}

workflowDefinitionRecoveryRouter.post("/:rootObjectType/:rootObjectId/actions/archive", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const rootObjectType = rootObjectTypeSchema.parse(req.params.rootObjectType);
  const rootObjectId = z.string().uuid().parse(req.params.rootObjectId);
  if (rootObjectType === "procedure") {
    if (!requireWorkspaceRole(req, res, "owner")) return;
    const result = await archiveProcedure(workspaceId, req.auth!.userId!, rootObjectId, req.body);
    if ("error" in result) return res.status(result.error === "procedure_not_found" ? 404 : result.error === "procedure_archive_forbidden" ? 403 : 409).json({ error: result.error });
    return res.json({ data: result });
  }
  const body = archiveWorkflowDefinitionVersionSchema.parse(req.body);
  const actor = authActor(req);
  const correlationId = randomUUID();

  if (body.idempotencyKey) {
    const existingArchive = await findArchiveEvidenceByIdempotencyKey(
      workspaceId,
      rootObjectType,
      rootObjectId,
      body.idempotencyKey
    );
    if (existingArchive) {
      const root = await loadWorkflowDefinitionRoot(workspaceId, rootObjectType, rootObjectId);
      return res.status(200).json({
        data: {
          rootObjectType,
          rootObjectId,
          status: root?.status ?? "archived",
          idempotentReplay: true,
          auditLogId: existingArchive.id,
          archived: root?.status === "archived"
        }
      });
    }
  }

  const root = await loadWorkflowDefinitionRoot(workspaceId, rootObjectType, rootObjectId);
  if (!root) {
    return res.status(404).json({ error: "workflow_root_not_found" });
  }

  if (root.status === "active") {
    return res.status(409).json({ error: "workflow_archive_active_version_blocked" });
  }

  if (root.status === "archived") {
    return res.status(409).json({ error: "workflow_archive_already_archived" });
  }

  const activeRuntimeDependencies = await countActiveRuntimeDependencies(workspaceId, rootObjectType, rootObjectId);
  if (activeRuntimeDependencies > 0) {
    return res.status(409).json({
      error: "workflow_archive_active_runtime_dependency",
      activeRuntimeDependencies
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const archivedRoot = await archiveWorkflowDefinitionRootVersion(tx, {
      workspaceId,
      rootObjectType,
      rootObjectId
    });

    if (!archivedRoot) {
      return null;
    }

    const auditLog = await createDefinitionEvidence(tx, {
      workspaceId,
      actor,
      action: "workflow_definition_version.archived",
      eventType: "workflow_definition_version_archived",
      resourceType: `workflow_definition_${rootObjectType}`,
      resourceId: rootObjectId,
      inputPayload: {
        rootObjectType,
        rootObjectId,
        reason: body.reason,
        idempotencyKey: body.idempotencyKey ?? null,
        sourceChannel: body.sourceChannel ?? "api"
      },
      outputPayload: {
        rootObjectType,
        rootObjectId,
        previousStatus: root.status,
        status: archivedRoot.status,
        version: archivedRoot.version,
        activeRuntimeDependencies
      },
      correlationId
    });

    return { archivedRoot, auditLog };
  });

  if (!result) {
    return res.status(404).json({ error: "workflow_root_not_found" });
  }

  return res.json({
    data: {
      rootObjectType,
      rootObjectId,
      status: result.archivedRoot.status,
      version: result.archivedRoot.version,
      archived: true,
      activeRuntimeDependencies,
      correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

workflowDefinitionRecoveryRouter.post("/:rootObjectType/:rootObjectId/actions/create-rollback-draft", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const rootObjectType = rootObjectTypeSchema.parse(req.params.rootObjectType);
  const rootObjectId = z.string().uuid().parse(req.params.rootObjectId);
  const body = createRollbackDraftSchema.parse(req.body);
  const actor = authActor(req);
  const correlationId = randomUUID();

  if (body.idempotencyKey) {
    const existingDraft = await findWorkflowDefinitionDraftByIdempotencyKey(workspaceId, body.idempotencyKey);
    if (existingDraft) {
      return res.status(200).json({ data: serializeWorkflowDefinitionDraft(existingDraft) });
    }
  }

  const historicalRoot = await loadWorkflowDefinitionRoot(workspaceId, rootObjectType, rootObjectId);
  if (!historicalRoot) {
    return res.status(404).json({ error: "workflow_root_not_found" });
  }

  if (historicalRoot.status === "active") {
    return res.status(409).json({ error: "workflow_rollback_source_active" });
  }

  const activeRoot = await loadActiveWorkflowDefinitionRootByFamily(
    workspaceId,
    rootObjectType,
    historicalRoot.family_id ?? historicalRoot.id
  );
  if (!activeRoot) {
    return res.status(409).json({ error: "workflow_rollback_active_version_not_found" });
  }

  const changeSet = await buildRollbackChangeSet(rootObjectType, historicalRoot);
  const impactPreview = await buildWorkflowDefinitionImpactPreview(workspaceId, {
    rootObjectType,
    rootObjectId: activeRoot.id,
    name: historicalRoot.name,
    riskLevel: body.riskLevel,
    changeSet
  });
  if ("error" in impactPreview) {
    return res.status(impactPreview.status).json({ error: impactPreview.error });
  }

  const result = await prisma.$transaction(async (tx) => {
    const draftRows = await tx.$queryRawUnsafe<WorkflowDefinitionDraftRecord[]>(
      `INSERT INTO "workflow_definition_drafts" (
        "id",
        "workspace_id",
        "root_object_type",
        "root_object_id",
        "name",
        "reason",
        "risk_level",
        "base_version",
        "target_version",
        "change_set",
        "impact_preview",
        "idempotency_key",
        "actor_type",
        "actor_id",
        "source_channel",
        "updated_at"
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::"WorkflowDefinitionRootType",
        $4::uuid,
        $5,
        $6,
        $7::"RiskLevel",
        $8,
        $9,
        $10::jsonb,
        $11::jsonb,
        $12,
        $13::"ActorType",
        $14,
        $15,
        NOW()
      )
      RETURNING *`,
      randomUUID(),
      workspaceId,
      rootObjectType,
      activeRoot.id,
      historicalRoot.name,
      body.reason,
      body.riskLevel,
      activeRoot.version,
      activeRoot.version + 1,
      JSON.stringify(changeSet),
      JSON.stringify(impactPreview),
      body.idempotencyKey ?? null,
      actor.actorType,
      actor.actorId,
      body.sourceChannel ?? "api"
    );
    const draft = draftRows[0]!;

    const auditLog = await createDefinitionEvidence(tx, {
      workspaceId,
      actor,
      action: "workflow_definition_rollback_draft.created",
      eventType: "workflow_definition_rollback_draft_created",
      resourceType: "workflow_definition_draft",
      resourceId: draft.id,
      inputPayload: {
        rootObjectType,
        historicalRootObjectId: historicalRoot.id,
        historicalVersion: historicalRoot.version,
        activeRootObjectId: activeRoot.id,
        activeVersion: activeRoot.version,
        reason: body.reason,
        idempotencyKey: body.idempotencyKey ?? null,
        sourceChannel: body.sourceChannel ?? "api"
      },
      outputPayload: {
        draftId: draft.id,
        rootObjectType,
        rootObjectId: draft.root_object_id,
        status: draft.status,
        baseVersion: draft.base_version,
        targetVersion: draft.target_version,
        rollbackSourceRootObjectId: historicalRoot.id,
        rollbackSourceVersion: historicalRoot.version,
        impactPreview
      },
      correlationId
    });

    return { draft, auditLog };
  });

  return res.status(201).json({
    data: {
      ...serializeWorkflowDefinitionDraft(result.draft),
      impactPreview,
      rollbackSource: {
        rootObjectType,
        rootObjectId: historicalRoot.id,
        version: historicalRoot.version,
        status: historicalRoot.status
      },
      correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

workflowDefinitionDraftsRouter.post("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const body = createWorkflowDefinitionDraftSchema.parse(req.body);
  const actor = authActor(req);
  const correlationId = randomUUID();

  if (body.idempotencyKey) {
    const existingDraft = await findWorkflowDefinitionDraftByIdempotencyKey(workspaceId, body.idempotencyKey);
    if (existingDraft) {
      return res.status(200).json({ data: serializeWorkflowDefinitionDraft(existingDraft) });
    }
  }

  const root = await loadWorkflowDefinitionRoot(workspaceId, body.rootObjectType, body.rootObjectId);
  if (body.rootObjectId && !root) {
    return res.status(404).json({ error: "workflow_root_not_found" });
  }

  const baseVersion = typeof root?.version === "number" ? root.version : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const draftRows = await tx.$queryRawUnsafe<WorkflowDefinitionDraftRecord[]>(
        `INSERT INTO "workflow_definition_drafts" (
          "id",
          "workspace_id",
          "root_object_type",
          "root_object_id",
          "name",
          "reason",
          "risk_level",
          "base_version",
          "target_version",
          "change_set",
          "idempotency_key",
          "actor_type",
          "actor_id",
          "source_channel",
          "updated_at"
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::"WorkflowDefinitionRootType",
          $4::uuid,
          $5,
          $6,
          $7::"RiskLevel",
          $8,
          $9,
          $10::jsonb,
          $11,
          $12::"ActorType",
          $13,
          $14,
          NOW()
        )
        RETURNING *`,
        randomUUID(),
        workspaceId,
        body.rootObjectType,
        body.rootObjectId ?? null,
        body.name,
        body.reason ?? null,
        body.riskLevel,
        baseVersion,
        baseVersion ? baseVersion + 1 : 1,
        JSON.stringify(body.changeSet),
        body.idempotencyKey ?? null,
        actor.actorType,
        actor.actorId,
        body.sourceChannel ?? "api"
      );
      const draft = draftRows[0]!;

      const auditLog = await createDefinitionEvidence(tx, {
        workspaceId,
        actor,
        action: "workflow_definition_draft.created",
        eventType: "workflow_definition_draft_created",
        resourceType: "workflow_definition_draft",
        resourceId: draft.id,
        inputPayload: body,
        outputPayload: {
          draftId: draft.id,
          rootObjectType: draft.root_object_type,
          rootObjectId: draft.root_object_id,
          status: draft.status,
          targetVersion: draft.target_version
        },
        correlationId
      });

      return { draft, auditLog };
    });

    return res.status(201).json({
      data: {
        ...serializeWorkflowDefinitionDraft(result.draft),
        correlationId,
        auditLogId: result.auditLog.id
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "workflow_definition_draft_conflict" });
    }
    throw error;
  }
}));

workflowDefinitionDraftsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const query = listWorkflowDefinitionDraftsQuerySchema.parse(req.query);
  const drafts = await listWorkflowDefinitionDrafts(workspaceId, query);

  return res.json({
    data: drafts.map(serializeWorkflowDefinitionDraft)
  });
}));

workflowDefinitionDraftsRouter.get("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const id = z.string().uuid().parse(req.params.id);
  const draft = await findWorkflowDefinitionDraft(workspaceId, id);

  if (!draft) {
    return res.status(404).json({ error: "not_found" });
  }

  return res.json({ data: serializeWorkflowDefinitionDraft(draft) });
}));

workflowDefinitionDraftsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const id = z.string().uuid().parse(req.params.id);
  const body = updateWorkflowDefinitionDraftSchema.parse(req.body);
  const actor = authActor(req);
  const correlationId = randomUUID();
  const existing = await findWorkflowDefinitionDraft(workspaceId, id);

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const draftRows = await tx.$queryRawUnsafe<WorkflowDefinitionDraftRecord[]>(
        `UPDATE "workflow_definition_drafts"
        SET
          "name" = COALESCE($1, "name"),
          "reason" = COALESCE($2, "reason"),
          "status" = COALESCE($3::"OperatingStatus", "status"),
          "risk_level" = COALESCE($4::"RiskLevel", "risk_level"),
          "change_set" = COALESCE($5::jsonb, "change_set"),
          "idempotency_key" = COALESCE($6, "idempotency_key"),
          "source_channel" = COALESCE($7, "source_channel"),
          "updated_at" = NOW()
        WHERE "workspace_id" = $8::uuid AND "id" = $9::uuid
        RETURNING *`,
        body.name ?? null,
        body.reason ?? null,
        body.status ?? null,
        body.riskLevel ?? null,
        body.changeSet === undefined ? null : JSON.stringify(body.changeSet),
        body.idempotencyKey ?? null,
        body.sourceChannel ?? null,
        workspaceId,
        existing.id
      );
      const draft = draftRows[0]!;

      const auditLog = await createDefinitionEvidence(tx, {
        workspaceId,
        actor,
        action: "workflow_definition_draft.updated",
        eventType: "workflow_definition_draft_updated",
        resourceType: "workflow_definition_draft",
        resourceId: draft.id,
        inputPayload: body,
        outputPayload: {
          draftId: draft.id,
          status: draft.status,
          riskLevel: draft.risk_level
        },
        correlationId
      });

      return { draft, auditLog };
    });

    return res.json({
      data: {
        ...serializeWorkflowDefinitionDraft(result.draft),
        correlationId,
        auditLogId: result.auditLog.id
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "workflow_definition_draft_conflict" });
    }
    throw error;
  }
}));

workflowDefinitionDraftsRouter.post("/:id/actions/preview-impact", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const id = z.string().uuid().parse(req.params.id);
  const actor = authActor(req);
  const correlationId = randomUUID();
  const existing = await findWorkflowDefinitionDraft(workspaceId, id);

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const impactPreview = await buildWorkflowDefinitionImpactPreview(workspaceId, {
    rootObjectType: existing.root_object_type,
    rootObjectId: existing.root_object_id,
    name: existing.name,
    riskLevel: existing.risk_level,
    changeSet: existing.change_set
  });

  if ("error" in impactPreview) {
    return res.status(impactPreview.status).json({ error: impactPreview.error });
  }

  const result = await prisma.$transaction(async (tx) => {
    const draftRows = await tx.$queryRawUnsafe<WorkflowDefinitionDraftRecord[]>(
      `UPDATE "workflow_definition_drafts"
      SET "impact_preview" = $1::jsonb,
          "updated_at" = NOW()
      WHERE "workspace_id" = $2::uuid AND "id" = $3::uuid
      RETURNING *`,
      JSON.stringify(impactPreview),
      workspaceId,
      existing.id
    );
    const draft = draftRows[0]!;

    const auditLog = await createDefinitionEvidence(tx, {
      workspaceId,
      actor,
      action: "workflow_definition_draft.previewed",
      eventType: "workflow_definition_draft_previewed",
      resourceType: "workflow_definition_draft",
      resourceId: draft.id,
      inputPayload: { id: draft.id },
      outputPayload: {
        draftId: draft.id,
        impactPreview: asJson(impactPreview)
      },
      correlationId
    });

    return { draft, auditLog };
  });

  return res.json({
    data: {
      ...serializeWorkflowDefinitionDraft(result.draft),
      impactPreview,
      correlationId,
      auditLogId: result.auditLog.id
    }
  });
}));

workflowDefinitionDraftsRouter.post("/:id/actions/activate", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const id = z.string().uuid().parse(req.params.id);
  const body = activateWorkflowDefinitionDraftSchema.parse(req.body ?? {});
  const actor = authActor(req);
  const correlationId = randomUUID();
  const existing = await findWorkflowDefinitionDraft(workspaceId, id);

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  if (existing.status !== "draft") {
    return res.status(409).json({ error: "workflow_definition_draft_not_activatable" });
  }

  if (!existing.root_object_id) {
    return res.status(409).json({ error: "workflow_definition_root_required" });
  }

  const root = await loadWorkflowDefinitionRoot(workspaceId, existing.root_object_type, existing.root_object_id);
  if (!root) {
    return res.status(404).json({ error: "workflow_root_not_found" });
  }

  if (existing.base_version !== root.version) {
    return res.status(409).json({ error: "stale_workflow_definition_draft" });
  }

  const relationChecks: Array<{ status: number; error: string } | null> = [];
  try {
    if (existing.root_object_type === "process") {
      const parsedChangeSet = processChangeSetSchema.parse(existing.change_set);
      relationChecks.push(
        await validateWorkspaceRelation("company_roles", workspaceId, parsedChangeSet.ownerRoleId, "owner_role_not_found")
      );
    }

    if (existing.root_object_type === "pipeline") {
      const parsedChangeSet = pipelineChangeSetSchema.parse(existing.change_set);
      const stages = normalizePipelineStages(await loadPipelineStages(root.id), existing.change_set);
      relationChecks.push(
        await validateWorkspaceRelation("processes", workspaceId, parsedChangeSet.processId, "process_not_found"),
        await validateWorkspaceRelation("company_roles", workspaceId, parsedChangeSet.defaultOwnerRoleId, "default_owner_role_not_found")
      );
      for (const stage of stages) {
        relationChecks.push(
          await validateWorkspaceRelation("company_roles", workspaceId, stage.assignedRoleId, "assigned_role_not_found"),
          await validateWorkspaceRelation("procedures", workspaceId, stage.procedureId, "procedure_not_found")
        );
      }
    }

    if (existing.root_object_type === "procedure") {
      const parsedChangeSet = procedureChangeSetSchema.parse(existing.change_set);
      const steps = normalizeProcedureSteps(await loadProcedureSteps(root.id), existing.change_set);
      relationChecks.push(
        await validateWorkspaceRelation("processes", workspaceId, parsedChangeSet.processId, "process_not_found"),
        await validateWorkspaceRelation("company_roles", workspaceId, parsedChangeSet.ownerRoleId, "owner_role_not_found"),
        await validateWorkspaceRelation("standards", workspaceId, parsedChangeSet.qualityStandardId, "quality_standard_not_found")
      );
      for (const step of steps) {
        relationChecks.push(await validateWorkspaceRelation("tool_adapters", workspaceId, step.requiredToolAdapterId, "tool_adapter_not_found"));
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === "duplicate_step_order") {
      return res.status(400).json({ error: "duplicate_step_order" });
    }
    if (error instanceof Error && error.message === "duplicate_stage_position") {
      return res.status(400).json({ error: "duplicate_stage_position" });
    }
    throw error;
  }

  const relationError = relationChecks.find(Boolean);
  if (relationError) {
    return res.status(relationError.status).json({ error: relationError.error });
  }

  const impactPreview = await buildWorkflowDefinitionImpactPreview(workspaceId, {
    rootObjectType: existing.root_object_type,
    rootObjectId: existing.root_object_id,
    name: existing.name,
    riskLevel: existing.risk_level,
    changeSet: existing.change_set
  });

  if ("error" in impactPreview) {
    return res.status(impactPreview.status).json({ error: impactPreview.error });
  }

  const approvalError = await validateDraftApproval(workspaceId, existing.id, body.approvalId, impactPreview.approvalRequired);
  if (approvalError) {
    return res.status(approvalError.status).json({ error: approvalError.error });
  }

  try {
    const activationInput = {
      workspaceId,
      draft: existing,
      root,
      impactPreview,
      approvalId: body.approvalId ?? null,
      actor,
      sourceChannel: body.sourceChannel ?? existing.source_channel ?? "api",
      correlationId
    };
    const result = await prisma.$transaction(async (tx) => {
      if (existing.root_object_type === "process") {
        return activateProcessDraft(tx, activationInput);
      }
      if (existing.root_object_type === "pipeline") {
        return activatePipelineDraft(tx, activationInput);
      }
      return activateProcedureDraft(tx, activationInput);
    });

    return res.json({
      data: {
        ...serializeWorkflowDefinitionDraft(result.draft),
        activatedRootObjectType: existing.root_object_type,
        activatedRootObjectId: result.activatedRootObjectId,
        previousRootObjectId: root.id,
        previousVersion: root.version,
        newVersion: result.activatedRoot.version,
        approvalId: body.approvalId ?? null,
        impactPreview,
        correlationId,
        auditLogId: result.auditLog.id
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "workflow_definition_activation_conflict" });
    }
    throw error;
  }
}));
