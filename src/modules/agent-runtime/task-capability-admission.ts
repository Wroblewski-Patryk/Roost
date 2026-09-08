import { Prisma } from "@prisma/client";
import { readyTransaction } from "./task-execution-readiness";
import { suspensionBlocks } from "./capability-suspension";
type Db = Prisma.TransactionClient;
export async function reviewTransaction<T>(work: (db: Db) => Promise<T>) {
  try {
    return await readyTransaction(async db => {
      const result = await work(db);
      // Force deferred failures inside the callback, before Prisma can return a
      // business result. The database still enforces these checks at commit for
      // direct writers. All child/dependency/use effects now exist in this tx.
      await db.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
      return result;
    });
  } catch (error) {
    const diagnostic = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010" && error.meta?.code === "P0001" ? String(error.meta.message) : error instanceof Prisma.PrismaClientUnknownRequestError ? error.message : "";
    if (/\b(?:capability_(?:receipt_required|use_invalid|scope_invalid|grant_denied)|task_review_child_invalid)\b/.test(diagnostic)) return { error: "capability_context_changed" };
    throw error;
  }
}
export const grantOperations = ["review_decision", "return_to_executor", "create_specialist_task"] as const;
export async function grantScope(db: Db, taskId: string, credentialId: string, issuerUserId: string) {
  return (await db.$queryRaw<Array<{ hash: string | null }>>`SELECT task_capability_scope(${taskId}::uuid,${credentialId}::uuid,${issuerUserId}::uuid) AS hash`)[0]!.hash;
}
export async function grantState(db: Db, id: string) {
  return (await db.$queryRaw<Array<{ status: string; base: string }>>`SELECT task_capability_status(g) AS status,task_capability_base(g) AS base FROM task_capability_grants g WHERE id=${id}::uuid`)[0]!;
}
export async function admitCapability(db: Db, workspaceId: string, taskId: string, principal: any, operation: string, grantId?: string, prior?: any) {
  const execution = await db.agentExecution.findFirst({where:{workspaceId,taskId},orderBy:[{createdAt:"desc"},{id:"desc"}]});
  if(execution && await suspensionBlocks(db,workspaceId,taskId,execution.applicationId,operation,principal.kind==="agent"?principal.id:null,principal.credentialId)) return {error:"native_capability_suspended"};
  if (principal.kind !== "agent") return grantId ? { error: "capability_agent_only" } : { grant: null };
  if (!grantId) return { error: "capability_grant_required" };
  await db.$queryRaw`SELECT id FROM task_capability_grants WHERE id=${grantId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
  const grant = await db.taskCapabilityGrant.findFirst({ where: { id: grantId, workspaceId, taskId, agentId: principal.id, credentialId: principal.credentialId, operation }, include: { usage: true } });
  if (!grant) return { error: "capability_grant_scope_mismatch" };
  const state = await grantState(db, grant.id);
  if (prior) {
    if (state.base !== "active") return { error: `capability_grant_${state.base}` };
    const usage = grant.usage;
    if (prior.capabilityGrantId !== grant.id || !usage || usage.requestId !== prior.requestId || !(usage.decisionId === prior.id || usage.actionId === prior.id) ||
      usage.postScopeHash !== await grantScope(db, taskId, principal.credentialId, grant.issuerUserId)) return { error: "capability_grant_replay_stale" };
  } else if (state.status !== "active") return { error: `capability_grant_${state.status}` };
  return { grant };
}
export async function recordCapabilityUse(db: Db, grant: any, requestId: string, kind: "decision" | "action", businessId: string) {
  if (!grant) return;
  const postScopeHash = await grantScope(db, grant.taskId, grant.credentialId, grant.issuerUserId);
  if (!postScopeHash) throw new Error("capability_scope_invalid");
  await db.taskCapabilityUse.create({ data: { workspaceId: grant.workspaceId, grantId: grant.id, requestId,
    ...(kind === "decision" ? { decisionId: businessId } : { actionId: businessId }), postScopeHash,
    snapshot: { agentId: grant.agentId, credentialId: grant.credentialId, credentialClass: grant.credentialClass, operation: grant.operation, applicationId: grant.applicationId, taskId: grant.taskId } } });
  await db.event.create({ data: { workspaceId: grant.workspaceId, taskId: grant.taskId, type: "task_capability.used", source: "roost", actorType: "agent", actorId: grant.agentId,
    resourceType: "task_capability_grant", resourceId: grant.id, payload: { grantId: grant.id, operation: grant.operation, credentialId: grant.credentialId, requestId, businessId } } });
}
export async function agentGrantAccess(db: Db, workspaceId: string, taskId: string, principal: any) {
  if (principal?.kind !== "agent") return null;
  const grants = await db.$queryRaw<Array<{ id: string; operation: string; status: string }>>`SELECT id,operation,task_capability_status(g) AS status FROM task_capability_grants g WHERE workspace_id=${workspaceId}::uuid AND task_id=${taskId}::uuid AND agent_id=${principal.id}::uuid AND credential_id=${principal.credentialId}::uuid ORDER BY (task_capability_status(g)='active') DESC,created_at DESC,id DESC LIMIT 100`;
  return Object.fromEntries(grantOperations.map(op => { const g = grants.find(g => g.operation === op); return [op, { grantId: g?.id ?? null, status: g?.status ?? "required" }]; }));
}
