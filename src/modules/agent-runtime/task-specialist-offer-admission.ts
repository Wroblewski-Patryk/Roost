import type { Prisma } from "@prisma/client";
import { object, reviewDigest } from "./task-review-contract";

type Db = Prisma.TransactionClient;
const equal = (a: unknown, b: unknown) => reviewDigest({ value: a ?? null }) === reviewDigest({ value: b ?? null });

// A review action is an exact, durable offer. Acceptance acknowledges that
// offer; only a separate owner Submit can create a spendable Ready pin.
export async function specialistOfferAdmissionError(db: Db, workspaceId: string, childTaskId: string,
  contract: unknown, requestedBy?: { requestedByType: string; requestedById: string | null }) {
  const action = await db.taskReviewAction.findUnique({ where: { childTaskId }, include: { specialistDecision: true } });
  if (!action) return null;
  if (action.workspaceId !== workspaceId || action.action !== "create_specialist_task") return "specialist_offer_invalid";
  if (action.specialistDecision?.decision !== "accept") return action.specialistDecision ? "specialist_offer_rejected" : "specialist_offer_pending";
  const current = (await db.$queryRaw<Array<{ current: boolean }>>`
    SELECT task_specialist_acceptance_current(a) AS current FROM task_review_actions a WHERE a.id=${action.id}::uuid`)[0]?.current;
  if (!current) return "specialist_offer_stale";
  const offered = object(object(action.snapshot).contract), candidate = object(contract);
  // The owner may fill measurement and narrow budgets. Every other offered
  // term, including tests, recovery, all roles and source references, is fixed.
  const fixedTerms = (value: Record<string, any>) => {
    const { budgets, ...terms } = value;
    const { measurement, ...singleTask } = object(terms.singleTask);
    return { ...terms, singleTask };
  };
  if (!equal(fixedTerms(candidate), fixedTerms(offered)))
    return "specialist_offer_scope_changed";
  const ceiling = object(offered.budgets), budget = object(candidate.budgets);
  if (![budget.maxAttempts, budget.maxDurationSeconds, budget.maxOutputTokens].every(Number.isInteger)
    || budget.maxAttempts !== 1 || budget.maxDurationSeconds < 60 || budget.maxOutputTokens < 128
    || budget.maxDurationSeconds > ceiling.maxDurationSeconds || budget.maxOutputTokens > ceiling.maxOutputTokens)
    return "specialist_offer_budget_exceeded";
  const owner = await db.workspace.findFirst({ where: { id: workspaceId }, select: { ownerUserId: true } });
  const pinActor = requestedBy ?? object((await db.task.findUnique({ where: { id: childTaskId }, select: { executionReadiness: true } }))?.executionReadiness);
  if (!owner || pinActor.requestedByType !== "user" || pinActor.requestedById !== owner.ownerUserId
    || !await db.workspaceMembership.findFirst({ where: { workspaceId, userId: owner.ownerUserId, role: "owner" } }))
    return "specialist_owner_budget_approval_required";
  return null;
}
