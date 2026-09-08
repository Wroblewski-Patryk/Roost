import { resolveReviewPrincipal, type ReviewActor } from "../../auth/agent-principal";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Prisma } from "@prisma/client";
import { lockReadyTask } from "./task-execution-readiness";
import { resolveTaskRoleContext } from "./task-role-context";
import { correctionDraft, object, reviewActionSchema, reviewDecisionSchema, reviewDigest, wire } from "./task-review-contract";

const loadESM = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
const roleValidator = loadESM(pathToFileURL(path.resolve(__dirname, "../../../scripts/lib/agent-host-task-roles.mjs")).href);
type Db = Prisma.TransactionClient;
const decisionView = (d: any) => d ? { id: d.id, executionId: d.executionId, materialVersion: d.materialVersion, decision: d.decision, evidence: d.evidence, verifierId: d.verifierId, verifierLabel: object(d.snapshot).labels?.verifier, actorUserId: d.actorUserId, actorAgentId: d.actorAgentId, actorCredentialId: d.actorCredentialId, actorCredentialPrefix: d.actorCredentialPrefix, createdAt: d.createdAt, action: d.action ? actionView(d.action) : null } : null;
const actionView = (a: any) => ({ id: a.id, action: a.action, actorUserId: a.actorUserId, actorAgentId: a.actorAgentId, actorCredentialId: a.actorCredentialId, actorCredentialPrefix: a.actorCredentialPrefix, managerId: a.managerId, managerLabel: object(a.snapshot).managerLabel, childTaskId: a.childTaskId, correction: a.correction, createdAt: a.createdAt });

async function state(db: Db, workspaceId: string, taskId: string, actor: ReviewActor) {
  const task = await lockReadyTask(db, workspaceId, taskId);
  if (!task) return { error: "task_not_found" } as const;
  const execution = await db.agentExecution.findFirst({ where: { workspaceId, taskId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  if (execution) await db.$queryRaw`SELECT id FROM agent_executions WHERE id=${execution.id}::uuid FOR UPDATE`;
  const material = execution ? (await db.$queryRaw<Array<{ material: any; version: string }>>`SELECT task_review_material(e) AS material, encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex') AS version FROM agent_executions e WHERE id=${execution.id}::uuid`)[0] : null;
  const result = material?.material ?? null;
  const pin = object(task.executionReadiness), contract = object(result?.contract);
  const authorities = await resolveTaskRoleContext(db, workspaceId, task, contract);
  const workers = await db.workforceEntity.findMany({ where: { workspaceId, id: { in: [authorities.verifier?.id, authorities.accountableManager?.id].filter((id): id is string => Boolean(id)) } }, select: { id: true, name: true } });
  const labels = { verifier: workers.find(w=>w.id===authorities.verifier?.id)?.name, manager: workers.find(w=>w.id===authorities.accountableManager?.id)?.name };
  const { taskRolesSchema, roleAuthoritiesSchema, taskRoleIssues } = await roleValidator;
  let roleIssues: any[] = [];
  if (!taskRolesSchema.safeParse(contract.taskRoles).success || !roleAuthoritiesSchema.safeParse(authorities).success || !contract.singleTask || !Array.isArray(contract.assignment?.competencies)) roleIssues = [{ reason: "task_roles_required" }];
  else roleIssues = taskRoleIssues(contract, { roleAuthorities: authorities }, { workspaceId });
  const decision = execution ? await db.taskReviewDecision.findUnique({ where: { executionId: execution.id }, include: { action: true } }) : null;
  const principal = await resolveReviewPrincipal(db, workspaceId, actor);
  const roleMatches = (role: any) => principal && role?.principal?.kind === principal.kind && role.principal.id === principal.id;
  const materialVersion = material?.version ?? null;
  const current = Boolean(execution?.status === "completed" && execution.completedAt && !execution.contextInvalidatedAt && result?.pin?.pinId && pin.pinId === result.pin.pinId && task.assignedWorkforceEntityId === contract.assignment?.agentId);
  const expectedVersion = reviewDigest({ task: { id: task.id, updatedAt: task.updatedAt, readiness: pin, provenance: task.executionRoleProvenance, executor: task.assignedWorkforceEntityId }, result, authorities, decision });
  return { task, execution, result, contract, authorities, labels, decision, materialVersion, expectedVersion, current, roleIssues, principal, roleMatches,
    canReview: current && !decision && !roleIssues.length && roleMatches(authorities.verifier),
    canManage: current && decision?.decision === "reject" && !decision.action && !roleIssues.length && roleMatches(authorities.accountableManager) };
}

export async function taskReviewView(db: Db, workspaceId: string, taskId: string, actor: ReviewActor, cursor?: string) {
  const s = await state(db, workspaceId, taskId, actor);
  if ("error" in s) return s;
  if (cursor && !await db.taskReviewDecision.findFirst({ where: { id: cursor, workspaceId, taskId } })) return { error: "task_review_cursor_invalid" };
  const history = await db.taskReviewDecision.findMany({ where: { workspaceId, taskId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include: { action: true } });
  const specialists = await db.workforceEntity.findMany({ where: { workspaceId, type: "agent", status: "active", source: { not: "user" } }, select: { id: true, name: true, role: true, skillIndex: true, updatedAt: true }, orderBy: { name: "asc" }, take: 501 });
  return { task: { id: taskId, title: s.task.title }, expectedVersion: s.expectedVersion, materialVersion: s.materialVersion,
    result: s.result, labels: s.labels, decision: decisionView(s.decision), canReview: Boolean(s.canReview), canManage: Boolean(s.canManage),
    reason: !s.execution ? "no_result" : !s.current ? "stale_result" : s.roleIssues.length ? "roles_need_context" : s.canReview || s.canManage ? null : s.decision ? s.decision.action ? "action_recorded" : s.decision.decision === "approve" ? "approved" : "manager_required" : "verifier_required",
    history: history.slice(0, 50).map(decisionView), nextCursor: history.length > 50 ? history[49]!.id : null,
    specialists: specialists.slice(0, 500).map(w => ({ id: w.id, label: w.name, revision: w.updatedAt.toISOString(), competencies: w.skillIndex, role: w.role })), specialistsTruncated: specialists.length > 500 };
}

export async function recordTaskReview(db: Db, workspaceId: string, taskId: string, actor: ReviewActor, body: unknown) {
  const input = reviewDecisionSchema.parse(body), s = await state(db, workspaceId, taskId, actor);
  if ("error" in s) return s;
  const principal = s.principal;
  const actorUserId = principal?.kind === "user" ? principal.id : null;
  const actorAgentId = principal?.kind === "agent" ? principal.id : null;
  const actorCredentialId = principal?.credentialId ?? null, actorCredentialPrefix = principal?.credentialPrefix ?? null;
  const actorEvidence = { actorUserId, actorAgentId, actorCredentialId, actorCredentialPrefix };
  const requestHash = reviewDigest(principal?.kind === "user" ? { input, actorUserId, taskId } : { input, ...actorEvidence, taskId });
  const prior = await db.taskReviewDecision.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: input.requestId } }, include: { action: true } });
  if (principal && !prior && !s.current) return { error: "task_review_stale" };
  if (!principal || !s.roleMatches(s.authorities.verifier) || s.roleIssues.length) return { error: "task_review_forbidden" };
  if (prior) return prior.requestHash === requestHash ? { decision: decisionView(prior), replayed: true } : { error: "task_review_key_conflict" };
  if (!s.current || input.executionId !== s.execution?.id || input.materialVersion !== s.materialVersion || input.expectedVersion !== s.expectedVersion) return { error: "task_review_stale" };
  if (!s.canReview) return { error: "task_review_already_decided" };
  const { requestId, expectedVersion: _version, executionId, materialVersion, decision, ...evidence } = input;
  const saved = await db.taskReviewDecision.create({ data: { workspaceId, taskId, executionId, requestId, requestHash, materialVersion, ...actorEvidence,
    verifierId: s.contract.taskRoles.verifier.id, managerId: s.contract.taskRoles.accountableManager.id, decision, evidence: wire(evidence), snapshot: wire({ result: s.result, authorities: s.authorities, labels: s.labels, reviewedVersion: s.expectedVersion }) } });
  // Review changes admission only; it never edits assignment, task branch or files.
  if (decision === "reject") await db.task.update({ where: { id: taskId }, data: { executionReadiness: { ...object(s.task.executionReadiness), status: "needs_revalidation", reason: "review_rejected" } } });
  await db.event.create({ data: { workspaceId, taskId, actorType: principal.kind, actorId: principal.id, type: "task_review_decided", source: "roost", resourceType: "task_review", resourceId: saved.id, payload: { reviewId: saved.id, executionId, materialVersion, decision, ...actorEvidence } } });
  return { decision: decisionView(saved), replayed: false };
}

export async function actOnTaskReview(db: Db, workspaceId: string, taskId: string, actor: ReviewActor, body: unknown) {
  const input = reviewActionSchema.parse(body), s = await state(db, workspaceId, taskId, actor);
  if ("error" in s) return s;
  const principal = s.principal;
  const actorUserId = principal?.kind === "user" ? principal.id : null;
  const actorAgentId = principal?.kind === "agent" ? principal.id : null;
  const actorCredentialId = principal?.credentialId ?? null, actorCredentialPrefix = principal?.credentialPrefix ?? null;
  const actorEvidence = { actorUserId, actorAgentId, actorCredentialId, actorCredentialPrefix };
  const requestHash = reviewDigest(principal?.kind === "user" ? { input, actorUserId, taskId } : { input, ...actorEvidence, taskId });
  const prior = await db.taskReviewAction.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: input.requestId } } });
  const manager = s.authorities.accountableManager;
  if (!principal || !s.roleMatches(manager) || s.roleIssues.length) return { error: "task_review_forbidden" };
  if (prior) return prior.requestHash === requestHash ? { action: actionView(prior), replayed: true } : { error: "task_review_key_conflict" };
  if (!s.current || s.expectedVersion !== input.expectedVersion || s.decision?.id !== input.reviewId) return { error: "task_review_stale" };
  if (!s.canManage) return { error: "task_review_manager_action_required" };
  const evidence = object(s.decision!.evidence), correction = { ...evidence.correction, scope: [...new Set(input.scope)] };
  if (input.scope.some(scope => !evidence.correction.scope.includes(scope))) return { error: "task_review_scope_expanded" };
  const executorId = input.action === "create_specialist_task" ? input.specialist.id : s.contract.assignment.agentId;
  const executor = await db.workforceEntity.findFirst({ where: { id: executorId, workspaceId, type: "agent", status: "active" } });
  if (!executor?.role || executor.source === "user" || !Array.isArray(executor.skillIndex) || correction.competencies.some((skill: string) => !(executor.skillIndex as any[]).includes(skill)) || input.action === "create_specialist_task" && (executor.id === s.contract.assignment.agentId || executor.updatedAt.toISOString() !== input.specialist.revision)) return { error: "task_review_specialist_invalid" };
  const childTaskId = input.action === "create_specialist_task" ? randomUUID() : null;
  const targetId = childTaskId ?? taskId, draft = correctionDraft(s.contract, targetId, executor, correction);
  const readiness = { status: "draft", reason: "review_correction", applicationId: s.result.applicationId, contract: draft };
  let dependencyId: string | null = null;
  if (childTaskId) {
    await db.task.create({ data: { id: childTaskId, workspaceId, projectId: s.task.projectId, goalId: s.task.goalId, title: correction.outcome, description: correction.scope.join("\n"), assignedWorkforceEntityId: executor.id, source: "roost", executionReadiness: readiness } });
    const dependency = await db.dependency.create({ data: { workspaceId, dependencyType: "review_correction", fromEntityType: "task", fromEntityId: taskId, toEntityType: "task", toEntityId: childTaskId, metadata: { reviewId: input.reviewId } } });
    dependencyId = dependency.id;
  }
  const action = await db.taskReviewAction.create({ data: { workspaceId, taskId, reviewId: input.reviewId, requestId: input.requestId, requestHash, ...actorEvidence, managerId: manager!.id, action: input.action, childTaskId, dependencyId, correction,
    snapshot: wire({ reviewedVersion: s.expectedVersion, manager, managerLabel: s.labels.manager, executor: { id: executor.id, revision: executor.updatedAt.toISOString() }, contract: draft }) } });
  await db.task.update({ where: { id: taskId }, data: childTaskId ? { executionReadiness: { ...object(s.task.executionReadiness), status: "needs_decision", reason: "review_specialist_pending" } } : { executionReadiness: { ...object(s.task.executionReadiness), ...readiness } } });
  await db.event.create({ data: { workspaceId, taskId, actorType: principal.kind, actorId: principal.id, type: "task_review_manager_action", source: "roost", resourceType: "task_review_action", resourceId: action.id, payload: { actionId: action.id, reviewId: input.reviewId, action: input.action, ...actorEvidence, childTaskId, dependencyId } } });
  return { action: actionView(action), replayed: false };
}
