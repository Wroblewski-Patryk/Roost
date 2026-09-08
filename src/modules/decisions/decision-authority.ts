import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { resolveReviewPrincipal, type ReviewActor } from "../../auth/agent-principal";
import { requireRuntimeContent } from "../agent-runtime/runtime-redaction-policy";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { decisionAuthorityDeclaration, mandateCommand } from "./decision-authority-contract";
import { resolveDecisionAuthority, type AuthorityMandate, type AuthorityWorker } from "./decision-authority-policy";

type Db = Prisma.TransactionClient;
export async function taskDecisionAuthorities(db: Db, workspaceId: string, taskId: string) {
  return db.$queryRaw<any[]>`SELECT a.decision_id AS "decisionId",a.authority AS "acceptedAuthority",CASE WHEN a.authority->>'status'='delegated' THEN a.authority->>'epoch' IS NOT DISTINCT FROM decision_authority_epoch(a.workspace_id,a.authority) ELSE true END AS current
    FROM task_decision_effects e JOIN decision_acceptances a ON a.id=e.acceptance_id WHERE e.workspace_id=${workspaceId}::uuid AND e.task_id=${taskId}::uuid AND a.authority IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM task_decision_effects next WHERE next.task_id=e.task_id AND next.supersedes_id=e.decision_id) ORDER BY a.decision_id`;
}
const wire = (row: any) => ({ id: row.mandate_id, versionId: row.id, workspaceId: row.workspace_id, workforceId: row.workforce_id, version: row.version,
  ...row.body, issuer: { kind: "user" as const, id: row.issuer_user_id }, createdAt: row.created_at, revision: row.id });

export async function authorityState(db: Db, workspaceId: string) {
  await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
  await db.$executeRaw`SELECT decision_authority_invalidate(${workspaceId}::uuid)`;
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } });
  const ownerActive = !!workspace && !!await db.workspaceMembership.findFirst({where:{workspaceId,userId:workspace.ownerUserId,role:"owner"}});
  const rows = await db.$queryRaw<any[]>`SELECT DISTINCT ON(mandate_id) * FROM workforce_mandate_versions WHERE workspace_id=${workspaceId}::uuid ORDER BY mandate_id,version DESC LIMIT 2001`;
  const roster = await db.$queryRaw<any[]>`SELECT decision_worker(${workspaceId}::uuid,id) AS value,name FROM workforce_entities WHERE workspace_id=${workspaceId}::uuid ORDER BY id LIMIT 2001`;
  const workers: AuthorityWorker[] = roster.map(row => row.value);
  return { ownerUserId: workspace?.ownerUserId, ownerActive, mandates: rows.map(wire) as AuthorityMandate[], workers, labels: roster.map(row => ({ id: row.value.id, name: row.name })), truncated: rows.length > 2000 || roster.length > 2000 };
}

export async function decisionAuthority(db: Db, workspaceId: string, body: any, impact: any, loaded?: Awaited<ReturnType<typeof authorityState>>, operation?: string) {
  const state = loaded ?? await authorityState(db, workspaceId);
  if (!state.ownerUserId || !state.ownerActive || state.truncated) return { status: "blocked", reason: "authority_catalog_incomplete", path: [] };
  // Historical proposals stay owner-only; absence never turns into delegated authority.
  if (!body.authority) return { status: "owner_reserved", reason: "unclassified_owner", principal: { kind: "user", id: state.ownerUserId }, path: [], mandate: null };
  const parsed = decisionAuthorityDeclaration.safeParse(body.authority);
  if (!parsed.success) return { status: "blocked", reason: "authority_declaration_invalid", path: [] };
  const taskIds: string[] = impact?.taskIds ?? [];
  const risks = taskIds.length ? await db.$queryRaw<any[]>`SELECT t.id,a.result->>'level' AS level FROM tasks t LEFT JOIN task_risk_assessments a ON a.id=task_risk_current(t.id) WHERE t.workspace_id=${workspaceId}::uuid AND t.id=ANY(${taskIds}::uuid[])` : [];
  const levels = ["low", "medium", "high", "critical"] as const;
  const risk = !risks.length || risks.some(row => !levels.includes(row.level)) ? null : levels[Math.max(...risks.map(row => levels.indexOf(row.level)))];
  const declaredTaskIds = parsed.data.entities.filter(entity => entity.type === "task").map(entity => entity.id);
  if (taskIds.some(taskId => !declaredTaskIds.includes(taskId))) return { status: "blocked", reason: "authority_scope_incomplete", path: [] };
  for (const entity of parsed.data.entities) {
    const exists = (await db.$queryRaw<any[]>`SELECT decision_node(${workspaceId}::uuid,${entity.type},${entity.id}::uuid) IS NOT NULL AS value`)[0]?.value;
    if (!exists) return { status: "blocked", reason: "authority_scope_invalid", path: [] };
  }
  const result = resolveDecisionAuthority({ workspaceId, ownerUserId: state.ownerUserId, declaration: parsed.data, workers: state.workers, mandates: state.mandates,
    operation: operation ?? (body.supersedesId ? "supersede_decision" : "accept_decision"), risk: risk ?? null, now: Date.now() });
  const epoch = result.status === "delegated" ? (await db.$queryRaw<any[]>`SELECT decision_authority_epoch(${workspaceId}::uuid,${JSON.stringify(result)}::jsonb) AS value`)[0].value : null;
  return { ...result, epoch };
}

export async function interviewDecisionAuthority(db: Db, workspaceId: string, block: any, loaded?: Awaited<ReturnType<typeof authorityState>>) {
  const state = loaded ?? await authorityState(db, workspaceId);
  if (!state.ownerActive) return {status:"blocked",reason:"authority_catalog_incomplete",path:[]};
  const domain = block.decisionClass === "mandate" ? "mandate_change" : block.decisionClass;
  if (domain !== "ordinary_domain") return { status: "owner_reserved", reason: domain === "task_scope" ? "unclassified_owner" : domain, principal: { kind: "user", id: state.ownerUserId }, path: [], mandate: null };
  if (!block.authority || block.authority.domain !== "ordinary_domain") return { status: "blocked", reason: "authority_declaration_invalid", path: [] };
  const impact = { taskIds: block.dependencies.map((dependency: any) => dependency.taskId) };
  const answer = await decisionAuthority(db, workspaceId, { authority: block.authority }, impact, state, "answer_interview");
  const accept = await decisionAuthority(db, workspaceId, { authority: block.authority }, impact, state, "accept_interview");
  if (answer.status !== "delegated" || accept.status !== "delegated") return answer.status === "delegated" ? accept : answer;
  if (answer.principal?.kind !== "user" || accept.principal?.id !== answer.principal.id || answer.mandate?.id !== accept.mandate?.id) return { status: "blocked", reason: "authority_human_response_required", path: answer.path };
  return answer;
}

export async function mandateView(db: Db, workspaceId: string, actor: ReviewActor) {
  const state = await authorityState(db, workspaceId);
  const principal = await resolveReviewPrincipal(db, workspaceId, actor);
  const history = await db.$queryRaw<any[]>`SELECT * FROM workforce_mandate_versions WHERE workspace_id=${workspaceId}::uuid ORDER BY created_at DESC,id DESC LIMIT 201`;
  const sources = await db.$queryRaw<any[]>`SELECT d.id,d.title FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id JOIN decision_acceptances a ON a.decision_id=d.id WHERE d.workspace_id=${workspaceId}::uuid AND d.status='accepted' AND r.body->'authority'->>'domain'='mandate_change' AND a.actor_user_id=${state.ownerUserId}::uuid ORDER BY d.id LIMIT 101`;
  const expectedVersion = reviewDigest({ owner: state.ownerUserId, mandates: state.mandates, workers: state.workers, principal });
  const entityCatalog = await db.$queryRaw<any[]>`SELECT * FROM (
    (SELECT 'task' AS type,id,title AS name FROM tasks WHERE workspace_id=${workspaceId}::uuid ORDER BY id LIMIT 101)
    UNION ALL (SELECT 'application',id,name FROM applications WHERE workspace_id=${workspaceId}::uuid ORDER BY id LIMIT 101)
    UNION ALL (SELECT 'project',id,name FROM projects WHERE workspace_id=${workspaceId}::uuid ORDER BY id LIMIT 101)
    UNION ALL (SELECT 'procedure',id,name FROM procedures WHERE workspace_id=${workspaceId}::uuid ORDER BY id LIMIT 101)
  ) records ORDER BY type,id`;
  const result = { expectedVersion, canWrite: state.ownerActive && principal?.kind === "user" && principal.id === state.ownerUserId,
    entityCatalog,
    departments: await db.workspaceDepartment.findMany({where:{workspaceId,key:{not:"00-ogolny"}},select:{key:true,name:true},orderBy:{key:"asc"}}),
    ownerUserId: state.ownerUserId, mandates: state.mandates, history: history.slice(0, 200).map(wire),
    workforce: state.workers.map(worker => ({ ...worker, name: state.labels.find(label => label.id === worker.id)?.name })),
    sources: sources.slice(0, 100), truncated: state.truncated || history.length > 200 || sources.length > 100 };
  requireRuntimeContent(result, "decision.authority.read", { workspaceId });
  return result;
}

export async function issueMandate(db: Db, workspaceId: string, actor: ReviewActor, input: unknown) {
  const command = mandateCommand.parse(input);
  requireRuntimeContent(command, "decision.authority.command", { workspaceId });
  const current = await mandateView(db, workspaceId, actor);
  if (!current.canWrite || !current.ownerUserId) return { error: "decision_authority_forbidden" };
  const requestHash = reviewDigest({ command, actor: current.ownerUserId });
  const previous = (await db.$queryRaw<any[]>`SELECT * FROM workforce_mandate_versions WHERE workspace_id=${workspaceId}::uuid AND request_id=${command.requestId}::uuid`)[0];
  if (previous) return previous.request_hash === requestHash ? { record: wire(previous), replayed: true } : { error: "decision_authority_request_conflict" };
  if (command.expectedVersion !== current.expectedVersion) return { error: "decision_authority_stale" };
  const prior = current.mandates.find(mandate => mandate.id === command.mandateId);
  if (command.mandateId && !prior) return { error: "decision_authority_not_found" };
  const worker = prior?.workforceId ? {id:prior.workforceId} : current.workforce.find(worker => worker.principal?.kind === command.body.holder.kind && worker.principal.id === command.body.holder.id);
  if (!worker) return { error: "decision_authority_principal_invalid" };
  const mandateId = command.mandateId ?? randomUUID(), version = (prior?.version ?? 0) + 1, versionId = randomUUID();
  await db.$executeRaw`INSERT INTO workforce_mandate_versions(id,mandate_id,workspace_id,workforce_id,version,body,issuer_user_id,source_decision_id,request_id,request_hash)
   VALUES(${versionId}::uuid,${mandateId}::uuid,${workspaceId}::uuid,${worker.id}::uuid,${version},${JSON.stringify(command.body)}::jsonb,${current.ownerUserId}::uuid,${command.body.sourceDecisionId}::uuid,${command.requestId}::uuid,${requestHash})`;
  await db.event.create({ data: { workspaceId, type: "workforce_mandate_recorded", source: "roost", actorType: "user", actorId: current.ownerUserId,
    resourceType: "workforce", resourceId: worker.id, payload: { mandateId, version, status: command.body.status, sourceDecisionId: command.body.sourceDecisionId } } });
  return { record: { id: mandateId, version, versionId }, replayed: false };
}
