import { z } from "zod";

const id = z.string().uuid();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const commit = z.string().regex(/^[a-f0-9]{40}$/);
const timestamp = z.string().datetime();
const receiptSchema = z.object({
  schemaVersion: z.literal("roost-refused-tracked-rollback-v1"), completed: z.literal(true), replay: z.boolean(),
  executionId: id, reviewDigest: digest, journalDigest: digest,
  restoredFileCount: z.number().int().min(1).max(8), archivedFileCount: z.number().int().min(1).max(8), baselineCommit: commit,
  cleanBaseBranch: z.literal(true), taskBranchRemoved: z.literal(true), writerLeaseRetained: z.literal(true),
  releaseAllowed: z.literal(false), executionAuthorized: z.literal(false), modelsInvoked: z.literal(false), remoteEffects: z.literal(false)
}).strict();
// Admission metadata is read only to match identities. Its signature, private
// paths, origin, owner and installation identity never enter the view model.
const recordSchema = z.object({
  requestId: id, recordedAt: timestamp, receipt: receiptSchema,
  signed: z.object({ signature: z.string().regex(/^[a-f0-9]{128}$/), payload: z.object({
    schemaVersion: z.literal("roost-refused-tracked-recovery-admission-v1"), operation: z.literal("restore_task_changes"),
    requestId: id, issuedAt: timestamp, expiresAt: timestamp,
    scope: z.object({ schemaVersion: z.literal("roost-refused-tracked-rollback-v1"), operation: z.literal("restore_task_changes"),
      executionId: id, baselineCommit: commit, reviewDigest: digest })
  }) })
});

export type RefusedTrackedRecoveryEvidence = {
  requestId: string; executionId: string; baselineCommit: string; reviewDigest: string; journalDigest: string;
  restoredFileCount: number; archivedFileCount: number; recordedAt: string;
  writerLeaseRetained: true; modelsInvoked: false; remoteEffects: false; releaseAllowed: false; executionAuthorized: false;
};

type HistoricalExecution = {
  id: string; status: string; checkpoint?: unknown; errorState?: unknown; metadata?: unknown;
};
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

// This is a display projection of server-recorded evidence, not a signature
// verifier or an authority to retry, accept a candidate, release or unlock.
export function refusedTrackedRecoveryEvidence(execution: HistoricalExecution): RefusedTrackedRecoveryEvidence[] {
  const history = object(execution.metadata).refusedTrackedRecoveries;
  const checkpoint = object(execution.checkpoint), error = object(execution.errorState);
  const baseline = checkpoint.headCommit;
  const review = object(error.details).nativeReviewReceiptDigest;
  if (execution.status !== "failed" || checkpoint.stage !== "spawn_intent" || error.code !== "agent_native_review_blocked"
    || !id.safeParse(execution.id).success || !commit.safeParse(baseline).success
    || !digest.safeParse(review).success || !Array.isArray(history) || history.length > 8) return [];
  const requestCounts = new Map<unknown, number>();
  for (const row of history) { const key = object(row).requestId; requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1); }
  return history.flatMap(row => {
    const parsed = recordSchema.safeParse(row);
    if (!parsed.success) return [];
    const { requestId, recordedAt, receipt, signed: { payload } } = parsed.data;
    const scope = payload.scope;
    if (requestCounts.get(requestId) !== 1 || payload.requestId !== requestId || scope.executionId !== execution.id
      || receipt.executionId !== execution.id || receipt.baselineCommit !== baseline || scope.baselineCommit !== baseline
      || receipt.reviewDigest !== review || scope.reviewDigest !== review || receipt.restoredFileCount !== receipt.archivedFileCount
      || Date.parse(payload.expiresAt) <= Date.parse(payload.issuedAt) || Date.parse(recordedAt) < Date.parse(payload.issuedAt)
      || Date.parse(recordedAt) >= Date.parse(payload.expiresAt)) return [];
    return [{ requestId, recordedAt, executionId: receipt.executionId, baselineCommit: receipt.baselineCommit,
      reviewDigest: receipt.reviewDigest, journalDigest: receipt.journalDigest,
      restoredFileCount: receipt.restoredFileCount, archivedFileCount: receipt.archivedFileCount,
      writerLeaseRetained: receipt.writerLeaseRetained, modelsInvoked: receipt.modelsInvoked, remoteEffects: receipt.remoteEffects,
      releaseAllowed: receipt.releaseAllowed, executionAuthorized: receipt.executionAuthorized }];
  });
}
