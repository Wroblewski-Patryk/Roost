import type { AgentExecution, Prisma } from "@prisma/client";
import { z } from "zod";
import { inspectReady, lockReadyTask } from "./task-execution-readiness";
import { reviewDigest } from "./task-review-contract";
import { requireRuntimeContent } from "./runtime-redaction-policy";

type Db = Prisma.TransactionClient;
const uuid = z.string().uuid();
const note = z.string().trim().min(3).max(2000).refine(value => !/\b(?:Bearer\s+\S+|-----BEGIN .*PRIVATE KEY|(?:password|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*\S+)/i.test(value));
export const continuationApprovalSchema = z.object({ requestId: uuid, previousExecutionId: uuid,
  previousMaterialDigest: z.string().regex(/^[a-f0-9]{64}$/), readyPinId: uuid,
  readyRevision: z.string().regex(/^[a-f0-9]{64}$/), diagnosis: note, changedPlan: note }).strict();

const record = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const admittedClass = (execution: AgentExecution) => execution.applicationId !== null
  || record(record(execution.metadata).executionContract).executionClass === "roost-company-information-runtime-v1";
const plan = (contract: unknown) => {
  const c = record(contract);
  return { objective: c.objective, scope: c.scope, singleTask: c.singleTask, acceptance: c.acceptance };
};
const budget = (contract: unknown) => {
  const b = record(record(contract).budgets);
  return { maxAttempts: b.maxAttempts, maxDurationSeconds: b.maxDurationSeconds, maxOutputTokens: b.maxOutputTokens };
};
const companyBudget = (contract: unknown) => !["roost-company-information-v1", "roost-company-information-runtime-v1"].includes(record(contract).executionClass)
  || budget(contract).maxAttempts === 1;
export const executionPlanDigest = (contract: unknown) => reviewDigest(plan(contract));
export const executionBudgetDigest = (contract: unknown) => reviewDigest(budget(contract));
export const executionStopDigest = (execution: AgentExecution) => reviewDigest({ id: execution.id,
  status: execution.status, completedAt: execution.completedAt, checkpointVersion: execution.checkpointVersion,
  checkpoint: execution.checkpoint, errorState: execution.errorState, usage: execution.usage,
  summary: execution.summary, finalResponse: execution.finalResponse, verification: execution.verification });

export async function latestSpentTaskExecution(db: Db, workspaceId: string, taskId: string, excludeExecutionId?: string) {
  const executions = await db.agentExecution.findMany({ where: { workspaceId, taskId, attempt: { gte: 1 },
    ...(excludeExecutionId ? { id: { not: excludeExecutionId } } : {}),
    OR: [{ applicationId: { not: null } }, { metadata: { path: ["executionContract", "executionClass"], equals: "roost-company-information-runtime-v1" } }] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 });
  return executions[0] ?? null;
}

async function continuationEligibility(db: Db, previous: AgentExecution | null) {
  if (!previous) return { eligible: false, reason: "execution_continuation_not_required" };
  if (!admittedClass(previous) || !previous.completedAt || !["failed", "cancelled", "completed"].includes(previous.status))
    return { eligible: false, reason: "execution_not_terminal" };
  if (previous.status !== "completed") return { eligible: true, reason: null };
  const review = await db.taskReviewDecision.findFirst({ where: { workspaceId: previous.workspaceId, executionId: previous.id },
    orderBy: { createdAt: "desc" }, include: { action: true } });
  if (review?.decision === "reject") return review.action?.action === "return_to_executor"
    ? { eligible: true, reason: null }
    : { eligible: false, reason: review.action ? "execution_review_specialist_task" : "execution_review_manager_action_required" };
  return { eligible: false, reason: review?.decision === "approve" ? "execution_result_accepted" : "execution_review_required" };
}

export async function continuationView(db: Db, workspaceId: string, taskId: string) {
  const task = await db.task.findFirst({ where: { workspaceId, id: taskId } });
  if (!task) return { error: "task_not_found" } as const;
  const previous = await latestSpentTaskExecution(db, workspaceId, taskId);
  const eligibility = await continuationEligibility(db, previous);
  const pin = record(task.executionReadiness);
  let reason = eligibility.reason;
  if (eligibility.eligible && previous) {
    const oldPin = record(record(previous.metadata).readyContextPin);
    const b = budget(pin.contract);
    if (pin.status !== "ready" || !uuid.safeParse(pin.pinId).success || !/^[a-f0-9]{64}$/.test(pin.revision ?? "")) reason = "execution_continuation_ready_required";
    else if (pin.pinId === oldPin.pinId)
      reason = "execution_continuation_ready_stale";
    else if (executionPlanDigest(pin.contract) === executionPlanDigest(record(previous.metadata).executionContract))
      reason = "execution_continuation_plan_unchanged";
    else if (![b.maxAttempts, b.maxDurationSeconds, b.maxOutputTokens].every(value => Number.isInteger(value) && value > 0)
      || !companyBudget(pin.contract))
      reason = "execution_continuation_budget_invalid";
    else {
      const inspected = await inspectReady(db, workspaceId, taskId, undefined, true);
      if (inspected.error) reason = inspected.error;
    }
  }
  const checked = pin.status === "ready"
    ? await assertExecutionContinuation(db, workspaceId, taskId, pin) : null;
  const ready = checked && !("error" in checked) && checked.continuationEventId
    ? await inspectReady(db, workspaceId, taskId, undefined, true) : null;
  const validContinuation = Boolean(ready && !ready.error && checked && !("error" in checked) && checked.continuationEventId);
  return { previousExecution: previous ? { id: previous.id, status: previous.status, attempt: previous.attempt,
      completedAt: previous.completedAt, usage: previous.usage, errorState: previous.errorState,
      checkpoint: previous.checkpoint, checkpointVersion: previous.checkpointVersion,
      materialDigest: executionStopDigest(previous) } : null,
    eligible: eligibility.eligible && !reason, reason, readyPinId: pin.status === "ready" ? pin.pinId ?? null : null,
    readyRevision: pin.status === "ready" ? pin.revision ?? null : null,
    continuation: validContinuation && checked && !("error" in checked) ? { eventId: checked.continuationEventId,
      previousExecutionId: previous!.id, approvedAt: checked.approvedAt, approvedByUserId: checked.approvedByUserId } : null };
}

export async function approveExecutionContinuation(db: Db, workspaceId: string, taskId: string, ownerUserId: string, raw: unknown) {
  const input = continuationApprovalSchema.parse(raw);
  try { requireRuntimeContent({ diagnosis: input.diagnosis, changedPlan: input.changedPlan },
    "owner.execution_continuation", { workspaceId, taskId }); }
  catch { return { error: "agent_runtime_content_blocked" } as const; }
  const task = await lockReadyTask(db, workspaceId, taskId);
  if (!task) return { error: "task_not_found" } as const;
  const workspace = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId } });
  if (!workspace) return { error: "forbidden" } as const;
  const priorEvent = await db.event.findUnique({ where: { id: input.requestId } });
  if (priorEvent) {
    const payload = record(priorEvent.payload);
    return priorEvent.type === "task_execution_continuation_approved" && priorEvent.workspaceId === workspaceId
      && priorEvent.taskId === taskId && payload.previousExecutionId === input.previousExecutionId
      && payload.previousMaterialDigest === input.previousMaterialDigest
      && payload.readyPinId === input.readyPinId && payload.readyRevision === input.readyRevision
      && payload.diagnosis === input.diagnosis && payload.changedPlan === input.changedPlan
      ? { continuation: payload, replayed: true } : { error: "execution_continuation_key_conflict" };
  }
  const previous = await latestSpentTaskExecution(db, workspaceId, taskId);
  if (!previous || previous.id !== input.previousExecutionId) return { error: "execution_continuation_stale" } as const;
  if (executionStopDigest(previous) !== input.previousMaterialDigest) return { error: "execution_continuation_stale" } as const;
  const eligibility = await continuationEligibility(db, previous);
  if (!eligibility.eligible) return { error: eligibility.reason! } as const;
  if (await db.agentExecution.count({ where: { workspaceId, taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } }))
    return { error: "task_agent_execution_active" } as const;
  const ready = await inspectReady(db, workspaceId, taskId);
  if (ready.error) return { error: ready.error } as const;
  const pin = record(ready.pin), oldPin = record(record(previous.metadata).readyContextPin);
  if (pin.pinId !== input.readyPinId || pin.revision !== input.readyRevision || pin.pinId === oldPin.pinId
    || !uuid.safeParse(pin.pinId).success || !/^[a-f0-9]{64}$/.test(pin.revision ?? ""))
    return { error: "execution_continuation_ready_stale" } as const;
  const oldContract = record(previous.metadata).executionContract;
  if (executionPlanDigest(pin.contract) === executionPlanDigest(oldContract)) return { error: "execution_continuation_plan_unchanged" } as const;
  const b = budget(pin.contract);
  if (![b.maxAttempts, b.maxDurationSeconds, b.maxOutputTokens].every(value => Number.isInteger(value) && value > 0)
    || !companyBudget(pin.contract))
    return { error: "execution_continuation_budget_invalid" } as const;
  const approvedAt = new Date().toISOString();
  const payload = { schemaVersion: "roost-task-execution-continuation-v1", eventId: input.requestId,
    taskId, previousExecutionId: previous.id, previousCheckpointVersion: previous.checkpointVersion,
    previousMaterialDigest: input.previousMaterialDigest,
    previousStatus: previous.status, previousReadyPinId: oldPin.pinId ?? null, readyPinId: pin.pinId,
    readyRevision: pin.revision, planDigest: executionPlanDigest(pin.contract), budgetDigest: executionBudgetDigest(pin.contract),
    approvedByUserId: ownerUserId, approvedAt, diagnosis: input.diagnosis, changedPlan: input.changedPlan };
  await db.event.create({ data: { id: input.requestId, workspaceId, taskId, type: "task_execution_continuation_approved",
    source: "roost", actorType: "user", actorId: ownerUserId, resourceType: "agent_execution",
    resourceId: previous.id, payload } });
  return { continuation: payload, replayed: false };
}

export async function assertExecutionContinuation(db: Db, workspaceId: string, taskId: string, pin: unknown,
  sourcePin?: { pinId: string; revision: string }, excludeExecutionId?: string) {
  const previous = await latestSpentTaskExecution(db, workspaceId, taskId, excludeExecutionId);
  if (!previous) return { previousExecutionId: null, continuationEventId: null,
    approvedAt: null, approvedByUserId: null };
  const eligibility = await continuationEligibility(db, previous);
  if (!eligibility.eligible) return { error: eligibility.reason! } as const;
  const current = record(pin), source = sourcePin ?? { pinId: current.pinId, revision: current.revision };
  if (!uuid.safeParse(source.pinId).success || !/^[a-f0-9]{64}$/.test(source.revision ?? ""))
    return { error: "execution_continuation_required" } as const;
  const event = await db.event.findFirst({ where: { workspaceId, taskId,
    type: "task_execution_continuation_approved", resourceId: previous.id,
    payload: { path: ["readyPinId"], equals: source.pinId } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  if (!event) return { error: "execution_continuation_required" } as const;
  const approval = record(event?.payload);
  const workspace = await db.workspace.findFirst({ where: { id: workspaceId }, select: { ownerUserId: true } });
  if (approval.schemaVersion !== "roost-task-execution-continuation-v1" || approval.eventId !== event.id
    || approval.previousExecutionId !== previous.id || approval.previousCheckpointVersion !== previous.checkpointVersion
    || approval.previousMaterialDigest !== executionStopDigest(previous)
    || approval.previousReadyPinId !== (record(record(previous.metadata).readyContextPin).pinId ?? null)
    || approval.readyPinId !== source.pinId || approval.readyRevision !== source.revision
    || executionPlanDigest(current.contract) === executionPlanDigest(record(previous.metadata).executionContract)
    || approval.planDigest !== executionPlanDigest(current.contract) || approval.budgetDigest !== executionBudgetDigest(current.contract)
    || event.actorType !== "user" || event.actorId !== approval.approvedByUserId
    || approval.approvedByUserId !== workspace?.ownerUserId)
    return { error: "execution_continuation_stale" } as const;
  return { previousExecutionId: previous.id, continuationEventId: event.id,
    approvedAt: approval.approvedAt as string, approvedByUserId: approval.approvedByUserId as string };
}

export async function assertBoundExecutionContinuation(db: Db, execution: AgentExecution, pin: unknown) {
  const bound = record(record(execution.metadata).readyContextPin);
  const sourcePin = bound.continuationSourcePinId && bound.continuationSourceRevision
    ? { pinId: bound.continuationSourcePinId as string, revision: bound.continuationSourceRevision as string } : undefined;
  const checked = await assertExecutionContinuation(db, execution.workspaceId, execution.taskId,
    pin, sourcePin, execution.id);
  if ("error" in checked) return checked;
  return checked.continuationEventId === (bound.continuationEventId ?? null)
    ? checked : { error: "execution_continuation_stale" } as const;
}
