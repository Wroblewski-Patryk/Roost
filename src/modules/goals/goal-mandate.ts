import { createHash } from "node:crypto";
import { Prisma, type EvidenceRecord } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { resolveReviewPrincipal } from "../../auth/agent-principal";
import type { AuthContext } from "../../auth/api-key.middleware";
import { taskSourceScope } from "../agent-runtime/task-source-trust";

type Db = Prisma.TransactionClient;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (status: number, code: string): never => { throw new GoalMandateError(status, code); };

export class GoalMandateError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}

export type GoalMandateDraftInput = {
  result: string; metric: string; unit: string; targetValue: number; evidenceSource: string;
  accountableUserId: string; bindingDeadline?: Date | null; forecastDate?: Date | null;
  forecastBasis?: string | null; executionSchedule?: string | null; provenance: string;
};

export function goalEvidenceDigest(evidence: EvidenceRecord) {
  return hash({ id: evidence.id, workspaceId: evidence.workspaceId, entityType: evidence.entityType,
    entityId: evidence.entityId, type: evidence.type, source: evidence.source, reference: evidence.reference,
    url: evidence.url, description: evidence.description, observedAt: evidence.observedAt.toISOString(),
    verificationStatus: evidence.verificationStatus, verifiedAt: evidence.verifiedAt?.toISOString() ?? null,
    updatedAt: evidence.updatedAt.toISOString(), metadata: evidence.metadata });
}

async function adoptedGoalMandate(db: Db, workspaceId: string, goalId: string) {
  const head = await db.goalMandateHead.findFirst({ where: { workspaceId, goalId } });
  if (!head) return null;
  return db.goalMandateVersion.findFirst({ where: { id: head.currentVersionId, workspaceId, goalId, status: "adopted" },
    select: { id: true, workspaceId: true, goalId: true, version: true, result: true, metric: true, unit: true,
      targetValue: true, evidenceSource: true, accountableUserId: true, bindingDeadline: true, forecastDate: true,
      forecastBasis: true, executionSchedule: true, provenance: true, adoptedAt: true, adoptedByUserId: true } });
}

export async function currentGoalMandate(db: Db, workspaceId: string, goalId: string) {
  const goal = await db.goal.findFirst({ where: { id: goalId, workspaceId, status: { not: "archived" } }, select: { id: true } });
  if (!goal) return null;
  const version = await adoptedGoalMandate(db, workspaceId, goalId);
  if (!version) return null;
  const accountable = await db.workspaceMembership.findFirst({ where: { workspaceId,
    userId: version.accountableUserId, taskScopeId: null, role: { in: ["owner", "admin", "member"] } },
    select: { id: true } });
  return accountable ? version : null;
}

async function ownedGoal(db: Db, workspaceId: string, userId: string, goalId: string) {
  const workspace = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } });
  if (!workspace) fail(403, "goal_owner_required");
  const goal = await db.goal.findFirst({ where: { id: goalId, workspaceId, status: { not: "archived" } },
    select: { id: true, title: true, status: true, updatedAt: true, deadline: true, priority: true } });
  if (!goal) fail(404, "goal_not_found");
  return goal;
}

export async function createGoalMandateDraft(workspaceId: string, userId: string, goalId: string, input: GoalMandateDraftInput) {
  return prisma.$transaction(async db => {
    await ownedGoal(db, workspaceId, userId, goalId);
    const accountable = await db.workspaceMembership.findFirst({ where: { workspaceId, userId: input.accountableUserId,
      taskScopeId: null, role: { in: ["owner", "admin", "member"] } }, select: { id: true } });
    if (!accountable) fail(400, "goal_accountable_member_required");
    if (input.forecastDate && !input.forecastBasis?.trim()) fail(400, "goal_forecast_basis_required");
    return db.goalMandateVersion.create({ data: { workspaceId, goalId, ...input, status: "draft", createdByUserId: userId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function impactSnapshot(db: Db, workspaceId: string, goalId: string, draftId: string, currentId: string | null) {
  const [goal, draft, tasks, targets, measurements] = await Promise.all([
    db.goal.findFirst({ where: { id: goalId, workspaceId }, select: { id: true, title: true, status: true,
      priority: true, deadline: true, updatedAt: true } }),
    db.goalMandateVersion.findFirst({ where: { id: draftId, workspaceId, goalId, status: "draft" } }),
    db.task.findMany({ where: { workspaceId, goalId }, select: { id: true, title: true, status: true, targetId: true,
      updatedAt: true, executionReadiness: true }, orderBy: { id: "asc" } }),
    db.target.findMany({ where: { workspaceId, goalId }, select: { id: true, title: true, status: true,
      metricId: true, targetValue: true, currentValue: true, updatedAt: true,
      metricRef: { select: { id: true, updatedAt: true, currentValue: true, targetValue: true, status: true } } },
      orderBy: { id: "asc" } }),
    db.goalMeasurement.findMany({ where: { workspaceId, goalId }, select: { id: true, status: true, createdAt: true },
      orderBy: { id: "asc" } })
  ]);
  if (!goal || goal.status === "archived") fail(404, "goal_not_found");
  if (!draft) throw new GoalMandateError(409, "goal_draft_stale");
  const accountable = await db.workspaceMembership.findFirst({ where: { workspaceId,
    userId: draft.accountableUserId, taskScopeId: null, role: { in: ["owner", "admin", "member"] } },
    select: { id: true, role: true, createdAt: true } });
  if (!accountable) fail(409, "goal_accountable_member_changed");
  const snapshot = { goal, draft, accountable, currentId, tasks, targets, measurements };
  return { goalId, draftId, expectedCurrentId: currentId, impactDigest: hash(snapshot),
    counts: { tasks: tasks.length, targets: targets.length, measurements: measurements.length,
      readyTasks: tasks.filter(task => (task.executionReadiness as any)?.status === "ready").length },
    examples: { tasks: tasks.slice(0, 5).map(task => ({ id: task.id, title: task.title })),
      targets: targets.slice(0, 5).map(target => ({ id: target.id, title: target.title })) },
    effects: ["The accepted target and measurement source change only after separate owner confirmation.",
      "Linked tasks must revalidate Ready before a new execution.",
      "Existing Target and Metric values remain legacy, unverified data; they do not establish progress."] };
}

export async function previewGoalMandateDraft(workspaceId: string, userId: string, goalId: string, draftId: string) {
  return prisma.$transaction(async db => {
    await ownedGoal(db, workspaceId, userId, goalId);
    const head = await db.goalMandateHead.findFirst({ where: { workspaceId, goalId } });
    const impact = await impactSnapshot(db, workspaceId, goalId, draftId, head?.currentVersionId ?? null);
    const receipt = await db.goalMandatePreview.create({ data: { workspaceId, goalId, draftId,
      expectedCurrentId: impact.expectedCurrentId, impactDigest: impact.impactDigest, ownerUserId: userId,
      expiresAt: new Date(Date.now() + 15 * 60_000) } });
    return { ...impact, previewId: receipt.id, expiresAt: receipt.expiresAt };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function adoptGoalMandateDraft(workspaceId: string, userId: string, goalId: string,
  draftId: string, previewId: string, expectedCurrentId: string | null, impactDigest: string) {
  return prisma.$transaction(async db => {
    await db.$queryRaw`SELECT id FROM workspaces WHERE id=${workspaceId}::uuid AND owner_user_id=${userId}::uuid FOR UPDATE`;
    await db.$queryRaw`SELECT id FROM goals WHERE id=${goalId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
    await ownedGoal(db, workspaceId, userId, goalId);
    const draft = await db.goalMandateVersion.findFirst({ where: { id: draftId, workspaceId, goalId, status: "draft" } });
    if (!draft) fail(409, "goal_draft_stale");
    const head = await db.goalMandateHead.findFirst({ where: { workspaceId, goalId } });
    const currentId = head?.currentVersionId ?? null;
    if (currentId !== expectedCurrentId) fail(409, "goal_current_changed");
    const receipt = await db.goalMandatePreview.findFirst({ where: { id: previewId, workspaceId, goalId, draftId,
      expectedCurrentId, impactDigest, ownerUserId: userId, consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!receipt) throw new GoalMandateError(409, "goal_preview_required");
    const impact = await impactSnapshot(db, workspaceId, goalId, draftId, currentId);
    if (impact.impactDigest !== impactDigest) fail(409, "goal_impact_changed");
    await db.goalMandatePreview.update({ where: { id: receipt.id }, data: { consumedAt: new Date() } });
    if (currentId) await db.goalMandateVersion.update({ where: { id: currentId }, data: { status: "superseded" } });
    const adopted = await db.goalMandateVersion.update({ where: { id: draftId }, data: {
      status: "adopted", version: head?.nextVersion ?? 1, previousVersionId: currentId,
      impactDigest, adoptedByUserId: userId, adoptedAt: new Date() } });
    await db.goalMandateHead.upsert({ where: { goalId }, create: { workspaceId, goalId, currentVersionId: adopted.id,
      nextVersion: 2 }, update: { currentVersionId: adopted.id, nextVersion: { increment: 1 } } });
    await db.event.create({ data: { workspaceId, type: "goal_mandate_adopted", source: "roost", resourceType: "goal",
      resourceId: goalId, payload: { goalId, versionId: adopted.id, version: adopted.version, previousVersionId: currentId,
        impactDigest, counts: impact.counts, adoptedByUserId: userId } } });
    return adopted;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
}

async function currentEvidence(db: Db, workspaceId: string, goalId: string, evidenceId: string, taskId: string | null) {
  await db.$queryRaw`SELECT id FROM evidence_records WHERE id=${evidenceId}::uuid AND workspace_id=${workspaceId}::uuid FOR SHARE`;
  const evidence = await db.evidenceRecord.findFirst({ where: { id: evidenceId, workspaceId, verificationStatus: "verified" } });
  if (!evidence) throw new GoalMandateError(409, "goal_evidence_unverified");
  if (taskId) {
    const task = await db.task.findFirst({ where: { id: taskId, workspaceId, goalId,
      status: { not: "archived" } }, select: { id: true } });
    if (!task || evidence.entityType !== "task" || evidence.entityId !== taskId) fail(409, "goal_evidence_scope_invalid");
  } else if (evidence.entityType !== "goal" || evidence.entityId !== goalId) fail(409, "goal_evidence_scope_invalid");
  return evidence;
}

export async function proposeGoalMeasurement(workspaceId: string, actor: { type: "user" | "agent"; id: string; auth?: AuthContext },
  goalId: string, versionId: string, evidenceId: string, taskId: string | null, value: number, note: string, observedAt: Date) {
  try { return await prisma.$transaction(async db => {
    const current = await currentGoalMandate(db, workspaceId, goalId);
    if (!current || current.id !== versionId) fail(409, "goal_version_changed");
    if (actor.type === "user") await ownedGoal(db, workspaceId, actor.id, goalId);
    if (actor.type === "agent") {
      if (!taskId) fail(403, "goal_task_agent_required");
      await db.$queryRaw`SELECT id FROM tasks WHERE id=${taskId}::uuid
        AND workspace_id=${workspaceId}::uuid FOR SHARE`;
      const principal = await resolveReviewPrincipal(db, workspaceId, actor.auth);
      if (principal?.kind !== "agent" || principal.id !== actor.id ||
        !await taskSourceScope(db, workspaceId, taskId!, actor.id)) fail(403, "goal_agent_credential_invalid");
      const task = await db.task.findFirst({ where: { id: taskId!, workspaceId, goalId,
        assignedWorkforceEntityId: actor.id, status: { in: ["todo", "in_progress"] } }, select: { id: true } });
      if (!task) fail(404, "goal_task_scope_invalid");
    }
    const evidence = await currentEvidence(db, workspaceId, goalId, evidenceId, taskId);
    if (observedAt > new Date() || observedAt.getTime() < evidence.observedAt.getTime() - 86400000)
      fail(400, "goal_observation_time_invalid");
    const accepted = actor.type === "user";
    const row = await db.goalMeasurement.create({ data: { workspaceId, goalId, versionId, evidenceId,
      evidenceDigest: goalEvidenceDigest(evidence), evidenceRevision: evidence.updatedAt, taskId, value, note,
      observedAt, proposedByType: actor.type, proposedById: actor.id,
      status: accepted ? "accepted" : "proposed", decidedByUserId: accepted ? actor.id : null,
      decidedAt: accepted ? new Date() : null } });
    await db.event.create({ data: { workspaceId, type: accepted ? "goal_measurement_accepted" : "goal_measurement_proposed",
      source: "roost", resourceType: "goal", resourceId: goalId,
      payload: { measurementId: row.id, versionId, evidenceId, taskId, actorType: actor.type, actorId: actor.id } } });
    return row;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034"
      || error.code === "P2010" && (error.meta as { code?: string } | undefined)?.code === "40001"))
      fail(409, "goal_concurrent_change");
    throw error;
  }
}

export async function decideGoalMeasurement(workspaceId: string, userId: string, goalId: string,
  measurementId: string, decision: "accept" | "reject") {
  return prisma.$transaction(async db => {
    await ownedGoal(db, workspaceId, userId, goalId);
    const row = await db.goalMeasurement.findFirst({ where: { id: measurementId, workspaceId, goalId, status: "proposed" } });
    if (!row) throw new GoalMandateError(409, "goal_measurement_not_pending");
    const current = await currentGoalMandate(db, workspaceId, goalId);
    if (!current || current.id !== row.versionId) fail(409, "goal_version_changed");
    await currentEvidence(db, workspaceId, goalId, row.evidenceId, row.taskId);
    const evidence = await db.evidenceRecord.findUniqueOrThrow({ where: { id: row.evidenceId } });
    if (goalEvidenceDigest(evidence) !== row.evidenceDigest || evidence.updatedAt.getTime() !== row.evidenceRevision.getTime())
      fail(409, "goal_evidence_changed");
    const updated = await db.goalMeasurement.update({ where: { id: row.id }, data: { status: decision === "accept" ? "accepted" : "rejected",
      decidedByUserId: userId, decidedAt: new Date() } });
    await db.event.create({ data: { workspaceId, type: "goal_measurement_decided", source: "roost", resourceType: "goal",
      resourceId: goalId, payload: { measurementId: row.id, decision, decidedByUserId: userId } } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function ownerGoalMandateView(workspaceId: string, goalId: string) {
  return prisma.$transaction(async db => {
    const goal = await db.goal.findFirst({ where: { id: goalId, workspaceId }, select: { id: true, title: true,
      status: true, priority: true, deadline: true, updatedAt: true } });
    if (!goal) fail(404, "goal_not_found");
    const current = await adoptedGoalMandate(db, workspaceId, goalId);
    const accountableCurrent = current ? Boolean(await db.workspaceMembership.findFirst({ where: { workspaceId,
      userId: current.accountableUserId, taskScopeId: null, role: { in: ["owner", "admin", "member"] } },
      select: { id: true } })) : null;
    const [versions, measurements, latestAcceptedRow, measurementTotalCount, tasks, allTaskIds, executions] = await Promise.all([
      db.goalMandateVersion.findMany({ where: { workspaceId, goalId }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.goalMeasurement.findMany({ where: { workspaceId, goalId }, orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }], take: 100 }),
      current ? db.goalMeasurement.findFirst({ where: { workspaceId, goalId, versionId: current.id, status: "accepted" },
        orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }] }) : Promise.resolve(null),
      db.goalMeasurement.count({ where: { workspaceId, goalId } }),
      db.task.findMany({ where: { workspaceId, goalId }, select: { id: true, title: true, status: true,
        priority: true, dueDate: true, estimatedDurationMinutes: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
      db.task.findMany({ where: { workspaceId, goalId }, select: { id: true } }),
      db.agentExecution.findMany({ where: { workspaceId, OR: [{ goalIdAtQueue: goalId }, { parentGoalIdAtQueue: goalId }] },
        select: { id: true, taskId: true, applicationId: true, agentHostId: true, status: true, attempt: true,
          goalIdAtQueue: true, mandateVersionIdAtQueue: true, parentGoalIdAtQueue: true,
          startedAt: true, completedAt: true, createdAt: true },
        orderBy: { createdAt: "desc" } })
    ]);
    const relevantMeasurements = latestAcceptedRow && !measurements.some(item => item.id === latestAcceptedRow.id)
      ? [...measurements, latestAcceptedRow] : measurements;
    const evidenceIds = [...new Set(relevantMeasurements.map(item => item.evidenceId))];
    const measuredTaskIds = [...new Set(relevantMeasurements.map(item => item.taskId).filter((id): id is string => !!id))];
    const [evidence, measuredTasks] = await Promise.all([
      db.evidenceRecord.findMany({ where: { workspaceId, id: { in: evidenceIds } } }),
      db.task.findMany({ where: { workspaceId, id: { in: measuredTaskIds } },
        select: { id: true, goalId: true, status: true } })
    ]);
    const evidenceById = new Map(evidence.map(item => [item.id, item]));
    const measuredTaskById = new Map(measuredTasks.map(item => [item.id, item]));
    const mappedMeasurements = relevantMeasurements.map(item => {
      const source = evidenceById.get(item.evidenceId);
      const evidenceCurrent = !!source && source.verificationStatus === "verified"
        && source.updatedAt.getTime() === item.evidenceRevision.getTime()
        && goalEvidenceDigest(source) === item.evidenceDigest
        && (item.taskId ? source.entityType === "task" && source.entityId === item.taskId
          && measuredTaskById.get(item.taskId)?.goalId === goalId
          && measuredTaskById.get(item.taskId)?.status !== "archived"
          : source.entityType === "goal" && source.entityId === goalId);
      return { ...item, evidenceCurrent, source: source ? { id: source.id, entityType: source.entityType,
        entityId: source.entityId, reference: source.reference, url: source.url, verificationStatus: source.verificationStatus } : null };
    });
    const latestAccepted = mappedMeasurements.find(item => item.id === latestAcceptedRow?.id) ?? null;
    const progress = latestAccepted?.evidenceCurrent ? latestAccepted : null;
    const executionRows = executions.map(row => {
      const elapsedMs = row.startedAt && row.completedAt ? Math.max(0, row.completedAt.getTime() - row.startedAt.getTime()) : null;
      return { id: row.id, taskId: row.taskId, applicationId: row.applicationId, agentHostId: row.agentHostId,
        status: row.status, attempt: row.attempt, goalIdAtQueue: row.goalIdAtQueue,
        mandateVersionIdAtQueue: row.mandateVersionIdAtQueue, parentGoalIdAtQueue: row.parentGoalIdAtQueue,
        startedAt: row.startedAt, completedAt: row.completedAt, elapsedMs, modelCost: null,
        providerInputTokens: null, providerOutputTokens: null, usageSource: "worker_reported_or_unknown" };
    });
    const elapsedKnown = executionRows.filter(row => row.elapsedMs !== null);
    const reviews = await db.taskReviewDecision.findMany({ where: { workspaceId,
      executionId: { in: executionRows.map(row => row.id) } }, select: { id: true, executionId: true, decision: true,
        action: { select: { action: true } } } });
    const currentTaskIds = allTaskIds.map(task => task.id);
    const historicalUnknown = await db.agentExecution.count({ where: { workspaceId, taskId: { in: currentTaskIds },
      goalIdAtQueue: null, parentGoalIdAtQueue: null } });
    return { goal, current, accountableCurrent, versions, measurements: mappedMeasurements,
      measurementTotalCount, measurementRowsOmittedCount: Math.max(0, measurementTotalCount - mappedMeasurements.length),
      taskRowsOmittedCount: Math.max(0, allTaskIds.length - tasks.length),
      progressStatus: progress ? "current" : latestAccepted ? "stale_evidence" : "unknown",
      progress: progress ? { value: progress.value, observedAt: progress.observedAt, evidenceId: progress.evidenceId,
        measurementId: progress.id, versionId: progress.versionId, status: "evidence_current" } : null,
      tasks, economics: { executions: executionRows.slice(0, 200), attemptCount: executionRows.length,
        executionRowsOmittedCount: Math.max(0, executionRows.length - 200),
        acceptedOutcomeCount: new Set(reviews.filter(row => row.decision === "approve").map(row => row.executionId)).size,
        reviewReturnCount: reviews.filter(row => row.action?.action === "return_to_executor").length,
        observedExecutionElapsedMs: executionRows.length > 0 && historicalUnknown === 0
          && elapsedKnown.length === executionRows.length
          ? elapsedKnown.reduce((sum, row) => sum + row.elapsedMs!, 0) : null,
        elapsedUnknownCount: executionRows.length - elapsedKnown.length,
        observedModelCost: null, modelCostUnknownCount: executionRows.length,
        humanEffortMinutes: null, providerInputTokens: null, providerOutputTokens: null,
        historicalUnknownAttributionCount: historicalUnknown } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
