import type { Prisma } from "@prisma/client";
import { object, reviewDigest } from "./task-review-contract";

// Review decisions do not queue work. A rejected correction needs the manager's
// explicit disposition and a fresh, independently validated Submit contract.
export async function reviewAdmissionError(db: Prisma.TransactionClient, workspaceId: string, taskId: string, contract?: any) {
  if((await db.$queryRaw<any[]>`SELECT task_interview_pending(${taskId}::uuid) AS value`)[0].value)return "material_unknown_pending";
  const latest = await db.taskReviewDecision.findFirst({ where: { workspaceId, taskId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { action: true } });
  if (latest?.decision === "reject" && !latest.action) return "task_review_manager_action_required";
  if (latest?.decision === "reject" && latest.action?.childTaskId) {
    const child = await db.agentExecution.findFirst({ where: { workspaceId, taskId: latest.action.childTaskId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { reviewDecision: true } });
    if (child?.status !== "completed" || child.reviewDecision?.decision !== "approve") return "task_review_specialist_pending";
  }
  const correctionAction = latest?.decision === "reject" && latest.action?.action === "return_to_executor" ? latest.action :
    !latest ? await db.taskReviewAction.findUnique({ where: { childTaskId: taskId } }) : null;
  if (correctionAction && contract) {
    const agreed = object(correctionAction.correction), draft = object(object(correctionAction.snapshot).contract);
    if (contract.assignment?.agentId !== draft.assignment?.agentId || contract.singleTask?.component?.id !== draft.singleTask?.component?.id ||
      contract.objective?.outcome !== agreed.outcome || reviewDigest(contract.scope ?? {}) !== reviewDigest({ allowed: agreed.scope, forbidden: agreed.excluded }) ||
      reviewDigest(contract.assignment?.competencies ?? []) !== reviewDigest(agreed.competencies)) return "task_review_correction_mismatch";
  }
  return null;
}
