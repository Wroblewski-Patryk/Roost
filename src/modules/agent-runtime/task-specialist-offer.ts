import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ReviewActor } from "../../auth/agent-principal";
import { resolveReviewPrincipal } from "../../auth/agent-principal";
import { lockReadyTask } from "./task-execution-readiness";
import { object, reviewDigest } from "./task-review-contract";
import { requireRuntimeContent } from "./runtime-redaction-policy";

type Db = Prisma.TransactionClient;
const id = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/);
const reason = z.string().trim().min(3).max(1000).refine(value => !/\b(?:Bearer\s+\S+|-----BEGIN .*PRIVATE KEY|(?:password|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*\S+)/i.test(value));
const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ requestId: id, expectedVersion: hash, decision: z.literal("accept") }).strict(),
  z.object({ requestId: id, expectedVersion: hash, decision: z.literal("reject"), reason }).strict()
]);

async function state(db: Db, workspaceId: string, childTaskId: string, actor: ReviewActor) {
  const action = await db.taskReviewAction.findUnique({ where: { childTaskId }, include: { specialistDecision: true } });
  if (!action || action.workspaceId !== workspaceId || action.action !== "create_specialist_task") return { error: "task_specialist_offer_not_found" } as const;
  // Lock order matches parent review admission: parent first, child second.
  const parent = await lockReadyTask(db, workspaceId, action.taskId);
  const child = await lockReadyTask(db, workspaceId, childTaskId);
  if (!parent || !child) return { error: "task_specialist_offer_not_found" } as const;
  const principal = await resolveReviewPrincipal(db, workspaceId, actor);
  if (!principal) return { error: "task_specialist_offer_forbidden" } as const;
  const specialistId = object(action.snapshot).executor?.id;
  const specialist = principal.kind === "agent" && principal.id === specialistId;
  const owner = principal.kind === "user" && Boolean(await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: principal.id } }))
    && Boolean(await db.workspaceMembership.findFirst({ where: { workspaceId, userId: principal.id, role: "owner" } }));
  if (!specialist && !owner) return { error: "task_specialist_offer_forbidden" } as const;
  const status = (await db.$queryRaw<Array<{ current: boolean; accepted: boolean; version: string }>>`
    SELECT task_specialist_offer_current(a) AS current,task_specialist_acceptance_current(a) AS accepted,
      task_specialist_offer_version(a) AS version
    FROM task_review_actions a WHERE a.id=${action.id}::uuid`)[0];
  const decision = action.specialistDecision;
  const pending = !decision && child.executionReadiness && object(child.executionReadiness).status === "draft";
  const offer = { id: action.id, parentTaskId: action.taskId, childTaskId, specialistId,
    scope: object(action.correction).scope, outcome: object(action.correction).outcome,
    contract: object(action.snapshot).contract,
    budgetCeiling: object(object(action.snapshot).contract).budgets,
    status: decision?.decision === "accept" ? "accepted" : decision?.decision === "reject" ? "rejected" : "pending",
    decision: decision ? { id: decision.id, decision: decision.decision, reason: decision.reason, createdAt: decision.createdAt } : null };
  return { action, parent, child, principal, current: Boolean(status?.current), accepted: Boolean(status?.accepted), expectedVersion: status?.version ?? "", offer,
    canDecide: Boolean(specialist && status?.current && pending),
    canSubmit: Boolean(owner && status?.accepted) };
}

export async function specialistOfferView(db: Db, workspaceId: string, childTaskId: string, actor: ReviewActor) {
  const s = await state(db, workspaceId, childTaskId, actor);
  if ("error" in s) return s;
  const result = { offer: s.offer, expectedVersion: s.expectedVersion, canDecide: s.canDecide, canSubmit: s.canSubmit,
    reason: !s.current || s.offer.status === "accepted" && !s.accepted ? "specialist_offer_stale" : s.offer.status === "rejected" ? "specialist_offer_rejected" : null };
  requireRuntimeContent(result, "specialist_offer.read", { workspaceId, taskId: childTaskId });
  return result;
}

export async function decideSpecialistOffer(db: Db, workspaceId: string, childTaskId: string, actor: ReviewActor, body: unknown) {
  const input = decisionSchema.parse(body);
  requireRuntimeContent(input, "specialist_offer.command", { workspaceId, taskId: childTaskId });
  const s = await state(db, workspaceId, childTaskId, actor);
  if ("error" in s) return s;
  const principal = s.principal;
  if (principal.kind !== "agent" || principal.id !== s.offer.specialistId || !principal.credentialId || !principal.credentialPrefix || !principal.credentialVersion)
    return { error: "task_specialist_offer_forbidden" } as const;
  const requestHash = reviewDigest({ input, specialistId: principal.id, credentialId: principal.credentialId });
  const prior = s.action.specialistDecision;
  if (prior) {
    if (prior.requestId !== input.requestId || prior.requestHash !== requestHash) return { error: "task_specialist_offer_decided" } as const;
    if (!s.current) return { error: "task_specialist_offer_stale" } as const;
    return { offer: s.offer, replayed: true };
  }
  if (!s.canDecide || input.expectedVersion !== s.expectedVersion) return { error: "task_specialist_offer_stale" } as const;
  const saved = await db.taskSpecialistDecision.create({ data: { workspaceId, actionId: s.action.id,
    parentTaskId: s.action.taskId, childTaskId, specialistId: principal.id, actorCredentialId: principal.credentialId,
    actorCredentialPrefix: principal.credentialPrefix, actorCredentialVersion: principal.credentialVersion,
    requestId: input.requestId, requestHash,
    expectedVersion: input.expectedVersion, decision: input.decision, reason: input.decision === "reject" ? input.reason : null } });
  await db.event.create({ data: { workspaceId, taskId: childTaskId, actorType: "agent", actorId: principal.id,
    type: `task_specialist_offer_${input.decision}ed`, source: "roost", resourceType: "task_specialist_decision",
    resourceId: saved.id, payload: { actionId: s.action.id, parentTaskId: s.action.taskId, childTaskId,
      specialistId: principal.id, decision: input.decision, credentialId: principal.credentialId } } });
  const offer = { ...s.offer, status: input.decision === "accept" ? "accepted" : "rejected",
    decision: { id: saved.id, decision: saved.decision, reason: saved.reason, createdAt: saved.createdAt } };
  return { offer, replayed: false };
}
