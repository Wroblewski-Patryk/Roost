import type { AgentExecution, Prisma } from "@prisma/client";
import { inspectReady, lockReadyTask } from "./task-execution-readiness";

export const contextStopCode = "agent_execution_context_invalidated";

export async function guardExecutionContext(db: Prisma.TransactionClient, execution: AgentExecution, revalidate = false) {
  const task = await lockReadyTask(db, execution.workspaceId, execution.taskId);
  const current = await db.agentExecution.findUnique({ where: { id: execution.id } });
  if (current?.contextInvalidatedAt) return { error: contextStopCode };
  const pin = task?.executionReadiness as { status?: string; pinId?: string; revision?: string } | null;
  const bound = (execution.metadata as { readyContextPin?: { pinId?: string; revision?: string } }).readyContextPin;
  if (revalidate || pin?.status !== "ready" || pin?.pinId !== bound?.pinId || pin?.revision !== bound?.revision) {
    const ready = await inspectReady(db, execution.workspaceId, execution.taskId, execution);
    if (ready.error) {
      const fenced = await db.agentExecution.findUnique({ where: { id: execution.id } });
      return { error: fenced?.contextInvalidatedAt ? contextStopCode : ready.error };
    }
  }
  return {};
}

export async function acknowledgeContextStop(db: Prisma.TransactionClient, execution: AgentExecution) {
  await lockReadyTask(db, execution.workspaceId, execution.taskId);
  const current = await db.agentExecution.findFirst({ where: { id: execution.id, workspaceId: execution.workspaceId, leaseToken: execution.leaseToken } });
  if (!current?.contextInvalidatedAt) return { error: "agent_context_stop_not_requested" };
  if (!current.contextStoppedAt) {
    const stopped = await db.agentExecution.updateMany({ where: { id: current.id, contextStoppedAt: null, leaseToken: current.leaseToken },
      data: { contextStoppedAt: new Date(), status: "waiting_for_approval" } });
    if (!stopped.count) return { error: "agent_context_stop_conflict" };
    await db.agentExecutionEvent.create({ data: { workspaceId: current.workspaceId, executionId: current.id,
      type: "context_stopped", level: "warning", message: "Host confirmed process-tree stop. Checkpoint and ownership retained; explicit owner reconciliation is required.",
      payload: { attempt: current.attempt, checkpointVersion: current.checkpointVersion, contextInvalidation: current.contextInvalidation } as Prisma.InputJsonValue } });
  }
  const saved = await db.agentExecution.findUniqueOrThrow({ where: { id: current.id } });
  return { stopped: true, checkpoint: saved.checkpoint, checkpointVersion: saved.checkpointVersion, contextStoppedAt: saved.contextStoppedAt };
}
