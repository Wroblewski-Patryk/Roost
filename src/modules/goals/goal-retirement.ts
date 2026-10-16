import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { GoalMandateError } from "./goal-mandate";

type Db = Prisma.TransactionClient;
const command = z.object({ requestId: z.string().uuid(), previewToken: z.string().min(10).max(8192),
  reason: z.string().trim().min(12).max(2000) }).strict();
const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (code: string): never => { throw new GoalMandateError(409, code); };

function sign(encoded: string) {
  return createHmac("sha256", env.authTokenSecret).update(`roost-goal-retirement-v1:${encoded}`).digest("base64url");
}

function decodeToken(token: string, workspaceId: string, userId: string, goalId: string) {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = Buffer.from(sign(encoded)), supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (value.schema !== "roost-goal-retirement-v1" || value.workspaceId !== workspaceId ||
      value.userId !== userId || value.goalId !== goalId || !/^[a-f0-9]{64}$/.test(value.digest) ||
      !Number.isSafeInteger(value.issuedAt) || value.issuedAt > Date.now() + 5000 ||
      Date.now() - value.issuedAt > 300000) return null;
    return value as { digest: string; issuedAt: number };
  } catch { return null; }
}

async function snapshot(db: Db, workspaceId: string, goalId: string) {
  const goal = await db.goal.findFirst({ where: { id: goalId, workspaceId },
    select: { id: true, title: true, status: true, updatedAt: true } });
  if (!goal) throw new GoalMandateError(404, "goal_not_found");
  const [head, tasks, targets, children, measurements, executions] = await Promise.all([
    db.goalMandateHead.findFirst({ where: { workspaceId, goalId },
      select: { id: true, currentVersionId: true, nextVersion: true, updatedAt: true } }),
    db.task.findMany({ where: { workspaceId, goalId }, select: { id: true, title: true, status: true,
      source: true, externalId: true, executionReadiness: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.target.findMany({ where: { workspaceId, goalId }, select: { id: true, status: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.goal.findMany({ where: { workspaceId, parentGoalId: goalId }, select: { id: true, status: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.goalMeasurement.findMany({ where: { workspaceId, goalId }, select: { id: true, status: true }, orderBy: { id: "asc" } }),
    db.agentExecution.findMany({ where: { workspaceId, OR: [{ goalIdAtQueue: goalId },
      { parentGoalIdAtQueue: goalId }, { task: { goalId } }] },
      select: { id: true, taskId: true, status: true, mandateVersionIdAtQueue: true }, orderBy: { id: "asc" } })
  ]);
  const version = head ? await db.goalMandateVersion.findFirst({ where: { id: head.currentVersionId,
    workspaceId, goalId, status: "adopted" }, select: { id: true, version: true, status: true } }) : null;
  const blockers = [
    ...(goal.status === "archived" ? ["already_archived"] : []),
    ...(!head || !version ? ["mandate_changed"] : []),
    ...(children.some(row => row.status !== "archived") ? ["active_child_goal"] : []),
    ...(targets.some(row => row.status !== "archived") ? ["active_target"] : []),
    ...(executions.some(row => ["queued", "claimed", "running", "waiting_for_approval"].includes(row.status)) ? ["active_execution"] : [])
  ];
  const impact = { tasks: tasks.map(row => ({ id: row.id, title: row.title, status: row.status,
    source: row.source, externalId: row.externalId, readiness: (row.executionReadiness as any)?.status ?? null })),
    targetCount: targets.length, childGoalCount: children.length, measurementCount: measurements.length,
    executionCount: executions.length, activeExecutionCount: executions.filter(row =>
      ["queued", "claimed", "running", "waiting_for_approval"].includes(row.status)).length };
  return { goal, head, version, impact, blockers,
    digest: sha({ goal, head, version, tasks, targets, children, measurements, executions, blockers }) };
}

export async function previewGoalRetirement(workspaceId: string, userId: string, goalId: string) {
  const result = await prisma.$transaction(async db => {
    await db.$executeRaw`SET TRANSACTION READ ONLY`;
    const workspace = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } });
    if (!workspace) throw new GoalMandateError(403, "goal_owner_required");
    return snapshot(db, workspaceId, goalId);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
  const issuedAt = Date.now();
  const encoded = Buffer.from(JSON.stringify({ schema: "roost-goal-retirement-v1", workspaceId, userId,
    goalId, digest: result.digest, issuedAt })).toString("base64url");
  return { ...result, previewToken: `${encoded}.${sign(encoded)}`,
    expiresAt: new Date(issuedAt + 300000).toISOString() };
}

export async function retireGoal(workspaceId: string, userId: string, goalId: string, body: unknown) {
  const input = command.parse(body);
  const requestHash = sha({ workspaceId, userId, goalId, input });
  const replay = async () => {
    const prior = await prisma.auditLog.findUnique({ where: { id: input.requestId } });
    if (!prior) return null;
    if (prior.workspaceId !== workspaceId || prior.actorType !== "user" || prior.actorId !== userId ||
      prior.action !== "goal.retire" || prior.resourceId !== goalId ||
      (prior.inputPayload as Record<string, unknown>).requestHash !== requestHash) fail("goal_retirement_request_reused");
    return { ...(prior.outputPayload as Record<string, unknown>), replayed: true };
  };
  const prior = await replay();
  if (prior) return prior;
  const token = decodeToken(input.previewToken, workspaceId, userId, goalId);
  if (!token) throw new GoalMandateError(409, "goal_retirement_preview_expired");
  const expectedDigest = token.digest;
  try { return await prisma.$transaction(async db => {
    const owner = await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM workspaces
      WHERE id=${workspaceId}::uuid AND owner_user_id=${userId}::uuid FOR SHARE`;
    if (!owner.length) throw new GoalMandateError(403, "goal_owner_required");
    // Match Ready lock order; the head and Goal source triggers also acquire this fence.
    await db.$queryRaw`SELECT id FROM ready_source_fence WHERE id=1 FOR UPDATE`;
    await db.$queryRaw`SELECT id FROM goals WHERE id=${goalId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
    const current = await snapshot(db, workspaceId, goalId);
    if (current.digest !== expectedDigest) fail("goal_retirement_stale");
    if (current.blockers.length) fail("goal_retirement_blocked");
    const versionId = current.head!.currentVersionId;
    const invalidated = current.impact.tasks.filter(row => row.readiness === "ready").length;
    await db.goalMandateHead.delete({ where: { goalId } });
    await db.goalMandateVersion.update({ where: { id: versionId }, data: { status: "retired" } });
    const archived = await db.goal.update({ where: { id: goalId }, data: { status: "archived" } });
    const output = { goalId, status: archived.status, retiredMandateVersionId: versionId,
      linkedTaskCount: current.impact.tasks.length, readyTasksInvalidated: invalidated,
      auditLogId: input.requestId, previewDigest: current.digest, replayed: false };
    await db.auditLog.create({ data: { id: input.requestId, workspaceId, actorType: "user", actorId: userId,
      action: "goal.retire", resourceType: "Goal", resourceId: goalId,
      correlationId: `goal-retirement:${input.requestId}`,
      inputPayload: { reason: input.reason, requestHash, previewDigest: current.digest,
        mandateVersionId: versionId, linkedTaskIds: current.impact.tasks.map(row => row.id) },
      outputPayload: output } });
    await db.event.create({ data: { id: randomUUID(), workspaceId, type: "goal_retired", source: "roost",
      actorType: "user", actorId: userId, resourceType: "Goal", resourceId: goalId,
      correlationId: `goal-retirement:${input.requestId}`,
      payload: { auditLogId: input.requestId, mandateVersionId: versionId,
        linkedTaskIds: current.impact.tasks.map(row => row.id), readyTasksInvalidated: invalidated } } });
    return output;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
      (["P2002", "P2034"].includes(error.code) || error.code === "P2010" &&
        ["40P01", "40001"].includes(String(error.meta?.code))))
      return await replay() ?? fail("goal_retirement_conflict");
    throw error;
  }
}
