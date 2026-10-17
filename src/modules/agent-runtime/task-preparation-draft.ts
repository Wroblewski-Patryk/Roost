import { createHash } from "node:crypto";
import { Prisma, type TaskPreparationDraft } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { redactionPolicy, runtimeSecrets } from "./runtime-redaction-policy";
import { submissionVersion } from "./task-execution-readiness";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const reference = z.object({ id: z.string().min(1).max(240), revision: z.string().max(240), evidence: z.string().max(2000).optional() }).strict();
const optionalReference = reference.nullable();
const values = z.object({
  version: z.string().max(2000), outcome: z.string().max(2000), allowed: z.string().max(60000),
  forbidden: z.string().max(60000), prompt: z.string().max(20000), baseBranch: z.string().max(240),
  maxAttempts: z.string().max(2000), maxDurationSeconds: z.string().max(2000),
  maxOutputTokens: z.string().max(2000), restrictions: z.string().max(60000),
  criteria: z.string().max(60000), tests: z.string().max(60000), evidence: z.string().max(60000),
  handoff: z.string().max(2000), failure: z.string().max(2000), escalation: z.string().max(2000),
  rollbackInstructions: z.string().max(2000)
}).strict();
const groups = ["company", "product", "technical", "procedures", "skills", "dependencies", "decisions"] as const;
const referenceGroups = z.object(Object.fromEntries(groups.map(group => [group, z.array(reference).max(50)])) as Record<typeof groups[number], z.ZodArray<typeof reference>>).strict();
const noneGroups = z.object(Object.fromEntries(groups.map(group => [group, z.string().max(2000)])) as Record<typeof groups[number], z.ZodString>).strict();
const list = z.array(z.string().min(1).max(160)).max(100);
export const taskPreparationBodySchema = z.object({
  taskRoles: z.object({ requester: optionalReference, executor: optionalReference,
    verifier: optionalReference, releaser: optionalReference }).strict(),
  singleTask: z.object({ component: optionalReference, manager: optionalReference,
    metric: z.string().max(2000), comparison: z.enum(["eq", "lte", "gte"]),
    target: z.string().max(2000), unit: z.string().max(2000), method: z.string().max(2000),
    problems: z.array(z.object({ statement: z.string().max(400), causalLink: z.string().max(2000) }).strict()).min(1).max(3),
    mechanism: z.string().max(2000), inseparability: z.string().max(2000), evidence: optionalReference
  }).strict(),
  values, backend: z.enum(["codex_responses", "ollama_loopback"]), model: z.string().max(160),
  modelDigest: z.string().max(80), effort: z.string().max(80),
  competencies: list, tools: list, permissions: list, refs: referenceGroups, none: noneGroups,
  rollbackMode: z.string().max(80)
}).strict();
export const taskPreparationSaveSchema = z.object({
  requestId: z.string().uuid(), expectedVersion: z.number().int().min(0).max(1_000_000),
  expectedEditorVersion: sha256,
  executionClass: z.enum(["application", "roost-company-information-v1", "roost-company-information-runtime-v1"]),
  applicationId: z.string().uuid().nullable(), draft: taskPreparationBodySchema
}).strict();
export type TaskPreparationSave = z.infer<typeof taskPreparationSaveSchema>;

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]))
    : value;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const latest = (db: Prisma.TransactionClient, workspaceId: string, taskId: string) => db.taskPreparationDraft.findFirst({
  where: { workspaceId, taskId }, orderBy: { version: "desc" }
});
const projection = (row: TaskPreparationDraft | null) => row ? {
  id: row.id, version: row.version, editorVersion: row.editorVersion,
  executionClass: row.executionClass, applicationId: row.applicationId,
  draft: row.body, bodyDigest: row.bodyDigest, actorUserId: row.actorUserId, savedAt: row.createdAt
} : null;

export async function readTaskPreparationDraft(workspaceId: string, taskId: string, actorUserId: string) {
  return prisma.$transaction(async db => {
    await db.$executeRaw`SET TRANSACTION READ ONLY`;
    const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: actorUserId }, select: { id: true } });
    if (!owner) return { error: "task_draft_owner_required" };
    const task = await db.task.findFirst({ where: { id: taskId, workspaceId }, select: { id: true } });
    if (!task) return { error: "task_not_found" };
    return { latest: projection(await latest(db, workspaceId, taskId)) };
  });
}

async function referencesBelongToWorkspace(db: Prisma.TransactionClient, workspaceId: string, taskId: string,
  input: TaskPreparationSave, taskProjectId: string | null) {
  const body = input.draft;
  const ids = (refs: Array<{ id: string } | null>) => [...new Set(refs.filter((item): item is { id: string } => Boolean(item)).map(item => item.id))];
  const uuidIds = (refs: Array<{ id: string } | null>) => {
    const found = ids(refs);
    return found.every(id => z.string().uuid().safeParse(id).success) ? found : null;
  };
  const companyRecordIds = uuidIds(body.refs.company);
  const applicationRecordIds = uuidIds([...body.refs.product, ...body.refs.technical, body.singleTask.evidence]);
  const procedureIds = uuidIds(body.refs.procedures), dependencyIds = uuidIds(body.refs.dependencies);
  const decisionIds = uuidIds(body.refs.decisions);
  const workforceIds = uuidIds([body.taskRoles.executor, body.taskRoles.verifier, body.taskRoles.releaser, body.singleTask.manager]);
  const componentIds = uuidIds([body.singleTask.component]);
  const requesterIds = uuidIds([body.taskRoles.requester]);
  if ([companyRecordIds, applicationRecordIds, procedureIds, dependencyIds, decisionIds, workforceIds, componentIds, requesterIds].some(item => item === null)) return false;
  if (!input.applicationId && (applicationRecordIds!.length > 0 || componentIds!.length > 0)) return false;
  const [companyRecords, applicationRecords, procedures, dependencies, decisions, workforce, components, requesters, application] = await Promise.all([
    db.companyRecord.count({ where: { workspaceId, applicationId: null, id: { in: companyRecordIds! } } }),
    db.companyRecord.count({ where: { workspaceId, applicationId: input.applicationId, id: { in: applicationRecordIds! } } }),
    db.procedure.count({ where: { workspaceId, id: { in: procedureIds! } } }),
    db.dependency.count({ where: { workspaceId, id: { in: dependencyIds! } } }),
    db.decision.count({ where: { workspaceId, id: { in: decisionIds! } } }),
    db.workforceEntity.count({ where: { workspaceId, id: { in: workforceIds! } } }),
    db.applicationArchitectureComponent.count({ where: { id: { in: componentIds! }, applicationId: input.applicationId ?? undefined,
      application: { workspaceId } } }),
    db.workspaceMembership.count({ where: { workspaceId, userId: { in: requesterIds! } } }),
    input.applicationId ? db.application.findFirst({ where: { id: input.applicationId, workspaceId,
      ...(taskProjectId ? { projects: { some: { projectId: taskProjectId } } } : {}) }, select: { id: true } }) : Promise.resolve(null)
  ]);
  return companyRecords === companyRecordIds!.length && applicationRecords === applicationRecordIds!.length
    && procedures === procedureIds!.length
    && dependencies === dependencyIds!.length && decisions === decisionIds!.length
    && workforce === workforceIds!.length && components === componentIds!.length
    && requesters === requesterIds!.length
    && (!input.applicationId || Boolean(taskProjectId && application))
    && (input.executionClass === "application") === Boolean(input.applicationId);
}

export async function saveTaskPreparationDraft(workspaceId: string, taskId: string, actorUserId: string, input: TaskPreparationSave) {
  const bodyBytes = Buffer.byteLength(JSON.stringify(input.draft), "utf8");
  if (bodyBytes > 480_000) return { error: "task_draft_too_large" };
  const sanitized = redactionPolicy.sanitize(input.draft, { mode: "required", secrets: runtimeSecrets() });
  if (sanitized.blocked || sanitized.redacted) return { error: "task_draft_sensitive_content" };
  const requestHash = hash({ workspaceId, taskId, actorUserId, input });
  try {
    return await prisma.$transaction(async db => {
      const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: actorUserId }, select: { id: true } });
      if (!owner) return { error: "task_draft_owner_required" };
      const locked = await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM tasks WHERE id=${taskId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
      if (!locked.length) return { error: "task_not_found" };
      const prior = await db.taskPreparationDraft.findUnique({ where: { id: input.requestId } });
      if (prior) return prior.workspaceId === workspaceId && prior.taskId === taskId && prior.requestHash === requestHash
        ? { latest: projection(prior), replayed: true, currentVersion: (await latest(db, workspaceId, taskId))?.version ?? prior.version }
        : { error: "task_draft_request_conflict" };
      const task = await db.task.findFirst({ where: { id: taskId, workspaceId }, select: {
        id: true, projectId: true, status: true, executionReadiness: true
      } });
      if (!task) return { error: "task_not_found" };
      const pin = task.executionReadiness && typeof task.executionReadiness === "object" && !Array.isArray(task.executionReadiness)
        ? task.executionReadiness as Record<string, unknown> : {};
      if (!["todo", "in_progress"].includes(task.status) || pin.pinId || pin.status === "ready")
        return { error: "task_draft_accepted_or_closed" };
      if (await db.agentExecution.count({ where: { workspaceId, taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } }))
        return { error: "task_draft_execution_active" };
      const current = await latest(db, workspaceId, taskId);
      if ((current?.version ?? 0) !== input.expectedVersion)
        return { error: "task_draft_version_conflict", currentVersion: current?.version ?? 0 };
      if (input.expectedEditorVersion !== await submissionVersion(db, workspaceId, taskId, input.applicationId))
        return { error: "task_draft_context_changed" };
      if (!await referencesBelongToWorkspace(db, workspaceId, taskId, input, task.projectId))
        return { error: "task_draft_reference_invalid" };
      const created = await db.taskPreparationDraft.create({ data: {
        id: input.requestId, workspaceId, taskId, version: input.expectedVersion + 1,
        editorVersion: input.expectedEditorVersion, executionClass: input.executionClass,
        applicationId: input.applicationId, body: input.draft as Prisma.InputJsonValue,
        bodyDigest: hash(input.draft), requestHash, actorUserId
      } });
      await db.event.create({ data: { workspaceId, taskId, type: "task_preparation_draft_saved", source: "roost",
        resourceType: "task", resourceId: taskId,
        payload: { draftId: created.id, version: created.version, actorUserId, bodyDigest: created.bodyDigest,
          editorVersion: created.editorVersion } } });
      return { latest: projection(created), replayed: false };
    }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 20000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const prior = await prisma.taskPreparationDraft.findUnique({ where: { id: input.requestId } });
      if (prior?.workspaceId === workspaceId && prior.taskId === taskId && prior.requestHash === requestHash)
        return { latest: projection(prior), replayed: true, currentVersion: (await prisma.taskPreparationDraft.findFirst({
          where: { workspaceId, taskId }, orderBy: { version: "desc" }, select: { version: true }
        }))?.version ?? prior.version };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2010"))
      return { error: "task_draft_version_conflict" };
    throw error;
  }
}
