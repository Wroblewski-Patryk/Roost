import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { isReferenceSiteChecklist } from "../product-engineering/reference-site-checklist-contract";

const uuid = z.string().uuid();
const archiveCommandSchema = z.object({
  requestId: uuid,
  previewToken: z.string().min(10).max(8192),
  reason: z.string().trim().min(12).max(2000)
}).strict();

type Db = Prisma.TransactionClient;
type Admission = { scopeId: string; taskId: string; taskStatus: string; scopeVersion: number; current: boolean };
type Composition = { selectionId: string; taskId: string; taskStatus: string; operation: string; version: number; current: boolean };
type Execution = { id: string; taskId: string; status: string };
type ProcedureArchiveImpact = {
  steps: number;
  pipelineStages: Array<{ id: string; status: string; pipelineId: string | null }>;
  pipelineRuns: Array<{ id: string; status: string }>;
  stageRuns: Array<{ id: string; status: string }>;
  policies: Array<{ id: string; status: string }>;
  applicationLinks: Array<{ applicationId: string; required: boolean; status: string }>;
  capabilityLinks: Array<{ capabilityDefinitionId: string; required: boolean; deprecated: boolean }>;
  taskAdmissions: Admission[];
  activeExecutions: Execution[];
  compositionTasks: Composition[];
  protectedChecklist: boolean;
  procedureContracts: number;
  procedureContractVersions: Array<{ id: string; sourceVersion: string }>;
};

const activePipelineRun = new Set(["pending", "running", "blocked"]);
const activeStageRun = new Set(["pending", "running", "blocked"]);
const activeExecution = new Set(["queued", "claimed", "running", "waiting_for_approval"]);
const activeTask = (status: string) => status !== "done" && status !== "archived";
const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function sign(payload: string) {
  return createHmac("sha256", env.authTokenSecret).update(`roost-procedure-archive-v1:${payload}`).digest("base64url");
}

function decodeToken(token: string, workspaceId: string, userId: string, procedureId: string) {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = Buffer.from(sign(encoded));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (value.schema !== "roost-procedure-archive-v1" || value.workspaceId !== workspaceId ||
      value.userId !== userId || value.procedureId !== procedureId ||
      typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest) ||
      !Number.isSafeInteger(value.issuedAt) || value.issuedAt > Date.now() + 5000 ||
      Date.now() - value.issuedAt > 300000) return null;
    return value as { digest: string; issuedAt: number };
  } catch { return null; }
}

async function currentPreview(db: Db, workspaceId: string, procedureId: string) {
  const procedure = await db.procedure.findFirst({
    where: { id: procedureId, workspaceId },
    select: { id: true, familyId: true, name: true, version: true, status: true, updatedAt: true,
      scope: true, steps: { select: { id: true, updatedAt: true, validationRule: true }, orderBy: { id: "asc" } } }
  });
  if (!procedure) return { error: "procedure_not_found" } as const;

  const stages = await db.pipelineStage.findMany({ where: { workspaceId, procedureId },
    select: { id: true, status: true, pipelineId: true }, orderBy: { id: "asc" } });
  const stageIds = stages.map(row => row.id);
  const pipelineIds = [...new Set(stages.map(row => row.pipelineId).filter((id): id is string => Boolean(id)))];
  const [pipelineRuns, stageRuns, policies, applicationLinks, capabilityLinks, admissions, compositions, executions, checklist, contracts] = await Promise.all([
    pipelineIds.length ? db.pipelineRun.findMany({ where: { workspaceId, pipelineId: { in: pipelineIds }, status: { in: ["pending", "running", "blocked"] } },
      select: { id: true, status: true }, orderBy: { id: "asc" } }) : [],
    stageIds.length ? db.stageRun.findMany({ where: { workspaceId, pipelineStageId: { in: stageIds } },
      select: { id: true, status: true }, orderBy: { id: "asc" } }) : [],
    db.policy.findMany({ where: { workspaceId, procedureId }, select: { id: true, status: true }, orderBy: { id: "asc" } }),
    db.applicationProcedure.findMany({ where: { procedureId, application: { workspaceId } },
      select: { applicationId: true, required: true, application: { select: { status: true } } }, orderBy: { applicationId: "asc" } }),
    db.capabilityProcedure.findMany({ where: { procedureId, capabilityDefinition: { workspaceId } },
      select: { capabilityDefinitionId: true, required: true, capabilityDefinition: { select: { deprecated: true } } }, orderBy: { capabilityDefinitionId: "asc" } }),
    db.$queryRaw<Admission[]>`
      SELECT s.id AS "scopeId",s.task_id AS "taskId", t.status::text AS "taskStatus", s.version AS "scopeVersion",
        s.version = (SELECT max(x.version) FROM task_admission_scopes x WHERE x.task_id=s.task_id) AS current
      FROM task_admission_scopes s JOIN tasks t ON t.id=s.task_id
      WHERE s.workspace_id=${workspaceId}::uuid AND s.procedure_id=${procedureId}::uuid
      ORDER BY s.task_id,s.version`,
    db.$queryRaw<Composition[]>`
      SELECT s.id AS "selectionId",t.id AS "taskId",t.status::text AS "taskStatus",s.operation,s.version,
        s.version=(SELECT max(x.version) FROM task_composition_selections x
          WHERE x.task_id=s.task_id AND x.operation=s.operation) AS current
      FROM task_composition_selections s JOIN tasks t ON t.id=s.task_id
      WHERE s.workspace_id=${workspaceId}::uuid
        AND (s.base_procedure_id=${procedureId}::uuid OR s.extension_procedure_id=${procedureId}::uuid)
      ORDER BY t.id,s.operation,s.version`,
    db.$queryRaw<Execution[]>`
      SELECT DISTINCT e.id,e.task_id AS "taskId",e.status::text AS status
      FROM agent_executions e WHERE e.workspace_id=${workspaceId}::uuid
        AND e.status IN ('queued','claimed','running','waiting_for_approval')
        AND (EXISTS (SELECT 1 FROM task_admission_scopes s WHERE s.task_id=e.task_id AND s.procedure_id=${procedureId}::uuid)
          OR EXISTS (SELECT 1 FROM task_composition_selections s WHERE s.task_id=e.task_id
            AND (s.base_procedure_id=${procedureId}::uuid OR s.extension_procedure_id=${procedureId}::uuid)))
      ORDER BY e.id`,
    db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) AS count FROM reference_site_checklist_decisions
      WHERE workspace_id=${workspaceId}::uuid AND procedure_id=${procedureId}::uuid`,
    db.$queryRaw<Array<{ id: string; sourceVersion: string }>>`SELECT v.id,v.source_version AS "sourceVersion" FROM procedure_contract_versions v
      WHERE v.workspace_id=${workspaceId}::uuid AND v.procedure_id=${procedureId}::uuid AND procedure_contract_valid(v)
      ORDER BY v.id`
  ]);

  const impact: ProcedureArchiveImpact = {
    steps: procedure.steps.length,
    pipelineStages: stages.map(row => ({ id: row.id, status: row.status, pipelineId: row.pipelineId })),
    pipelineRuns: pipelineRuns.map(row => ({ id: row.id, status: row.status })),
    stageRuns: stageRuns.map(row => ({ id: row.id, status: row.status })),
    policies: policies.map(row => ({ id: row.id, status: row.status })),
    applicationLinks: applicationLinks.map(row => ({ applicationId: row.applicationId, required: row.required, status: row.application.status })),
    capabilityLinks: capabilityLinks.map(row => ({ capabilityDefinitionId: row.capabilityDefinitionId, required: row.required, deprecated: row.capabilityDefinition.deprecated })),
    taskAdmissions: admissions,
    activeExecutions: executions,
    compositionTasks: compositions,
    protectedChecklist: isReferenceSiteChecklist(procedure.scope, procedure.steps) || Number(checklist[0]?.count ?? 0) > 0,
    procedureContracts: contracts.length,
    procedureContractVersions: contracts
  };
  const blockers = [
    ...(procedure.status === "archived" ? ["already_archived"] : []),
    ...(impact.protectedChecklist ? ["protected_checklist"] : []),
    ...(impact.pipelineStages.some(row => row.status === "active") ? ["active_pipeline_stage"] : []),
    ...(impact.pipelineRuns.some(row => activePipelineRun.has(row.status)) ? ["active_pipeline_run"] : []),
    ...(impact.stageRuns.some(row => activeStageRun.has(row.status)) ? ["active_stage_run"] : []),
    ...(impact.policies.some(row => row.status === "active") ? ["active_policy"] : []),
    ...(applicationLinks.some(row => row.required) ? ["required_application_link"] : []),
    ...(capabilityLinks.some(row => row.required) ? ["required_capability_link"] : []),
    ...(impact.taskAdmissions.some(row => row.current && activeTask(row.taskStatus)) ? ["active_task_admission"] : []),
    ...(impact.compositionTasks.some(row => row.current && activeTask(row.taskStatus)) ? ["active_composition_task"] : []),
    ...(impact.activeExecutions.some(row => activeExecution.has(row.status)) ? ["active_execution"] : [])
  ];
  const root = { id: procedure.id, familyId: procedure.familyId, name: procedure.name,
    version: procedure.version, status: procedure.status, updatedAt: procedure.updatedAt.toISOString() };
  const digest = sha({ root, impact, blockers, steps: procedure.steps });
  return { procedure: root, impact, blockers, digest };
}

export async function procedureArchivePreview(workspaceId: string, userId: string, procedureId: string) {
  const snapshot = await prisma.$transaction(async db => {
    await db.$executeRaw`SET TRANSACTION READ ONLY`;
    return currentPreview(db, workspaceId, procedureId);
  }, { isolationLevel: "Serializable", timeout: 20000 });
  if ("error" in snapshot) return snapshot;
  const issuedAt = Date.now();
  const encoded = Buffer.from(JSON.stringify({ schema: "roost-procedure-archive-v1", workspaceId, userId,
    procedureId, digest: snapshot.digest, issuedAt })).toString("base64url");
  return { ...snapshot, previewToken: `${encoded}.${sign(encoded)}`, expiresAt: new Date(issuedAt + 300000).toISOString() };
}

export async function archiveProcedure(workspaceId: string, userId: string, procedureId: string, body: unknown) {
  const input = archiveCommandSchema.parse(body);
  const requestHash = sha({ workspaceId, userId, procedureId, input });
  const replay = async () => {
    const prior = await prisma.auditLog.findUnique({ where: { id: input.requestId } });
    if (!prior) return null;
    if (prior.workspaceId !== workspaceId || prior.actorType !== "user" || prior.actorId !== userId ||
      prior.action !== "procedure.archive" || (prior.inputPayload as Record<string, unknown>).requestHash !== requestHash)
      return { error: "procedure_archive_request_reused" } as const;
    return { ...(prior.outputPayload as Record<string, unknown>), replayed: true };
  };
  const prior = await replay();
  if (prior) return prior;
  const token = decodeToken(input.previewToken, workspaceId, userId, procedureId);
  if (!token) return { error: "procedure_archive_preview_expired" } as const;
  try { return await prisma.$transaction(async db => {
    const membership = await db.$queryRaw<Array<{ role: string; taskScopeId: string | null }>>`
      SELECT role::text AS role,task_scope_id AS "taskScopeId" FROM workspace_memberships
      WHERE workspace_id=${workspaceId}::uuid AND user_id=${userId}::uuid FOR SHARE`;
    if (membership.length !== 1 || membership[0]?.role !== "owner" || membership[0]?.taskScopeId)
      return { error: "procedure_archive_forbidden" } as const;
    // Admission and composition inserts lock this fence before binding a procedure.
    // Keep the archive lock order the same so those writes cannot deadlock it.
    await db.$queryRaw`SELECT id FROM ready_source_fence WHERE id=1 FOR UPDATE`;
    const locked = await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM procedures
      WHERE id=${procedureId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
    if (!locked.length) return { error: "procedure_not_found" } as const;
    const snapshot = await currentPreview(db, workspaceId, procedureId);
    if ("error" in snapshot) return snapshot;
    if (snapshot.digest !== token.digest) return { error: "procedure_archive_stale" } as const;
    if (snapshot.blockers.length) return { error: "procedure_archive_blocked", blockers: snapshot.blockers } as const;
    const updated = await db.procedure.update({ where: { id: procedureId }, data: { status: "archived" } });
    const output = { procedure: { id: updated.id, familyId: updated.familyId, version: updated.version,
      name: updated.name, status: updated.status }, auditLogId: input.requestId, previewDigest: snapshot.digest,
      previousStatus: snapshot.procedure.status, replayed: false };
    await db.auditLog.create({ data: { id: input.requestId, workspaceId, actorType: "user", actorId: userId,
      action: "procedure.archive", resourceType: "Procedure", resourceId: procedureId,
      correlationId: `procedure-archive:${input.requestId}`,
      inputPayload: { reason: input.reason, requestHash, previewDigest: snapshot.digest, procedureVersion: snapshot.procedure.version },
      outputPayload: output as unknown as Prisma.InputJsonValue } });
    await db.event.create({ data: { id: randomUUID(), workspaceId, type: "procedure_archived", source: "roost",
      actorType: "user", actorId: userId, resourceType: "Procedure", resourceId: procedureId,
      correlationId: `procedure-archive:${input.requestId}`,
      payload: { auditLogId: input.requestId, familyId: updated.familyId, version: updated.version,
        previewDigest: snapshot.digest } } });
    return output;
  }, { isolationLevel: "Serializable", timeout: 20000 }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
      (["P2002", "P2034"].includes(error.code) ||
        (error.code === "P2010" && ["40P01", "40001"].includes(String(error.meta?.code))))) {
      return await replay() ?? { error: "procedure_archive_conflict" };
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("procedure_archive_inactive_binding") || message.includes("reference_site_checklist_immutable"))
      return { error: "procedure_archive_conflict" };
    throw error;
  }
}
