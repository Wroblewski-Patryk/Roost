import assert from "node:assert/strict";
import test from "node:test";
import { refusedTrackedRecoveryEvidence } from "./refused-tracked-recovery-model";

const executionId = "00000000-0000-4000-8000-000000000001";
const requestId = "00000000-0000-4000-8000-000000000002";
const foreignId = "00000000-0000-4000-8000-000000000003";
const baseline = "a".repeat(40), review = "b".repeat(64), journal = "c".repeat(64);
function fixture() {
  return { id: executionId, status: "failed", checkpoint: { stage: "spawn_intent", headCommit: baseline },
    errorState: { code: "agent_native_review_blocked", details: { nativeReviewReceiptDigest: review } },
    metadata: { refusedTrackedRecoveries: [{ requestId, recordedAt: "2026-10-04T11:03:00Z",
      paths: ["private/file.ts"], origin: "https://private.invalid/repository", ownerSecret: "DO_NOT_PROJECT",
      signed: { signature: "d".repeat(128), payload: {
        schemaVersion: "roost-refused-tracked-recovery-admission-v1", operation: "restore_task_changes", requestId,
        ownerUserId: foreignId, installationId: foreignId, firstWriteDecisionId: foreignId,
        issuedAt: "2026-10-04T11:00:00Z", expiresAt: "2026-10-04T11:05:00Z",
        scope: { schemaVersion: "roost-refused-tracked-rollback-v1", operation: "restore_task_changes", executionId,
          baselineCommit: baseline, reviewDigest: review, privateRoot: "PRIVATE_ROOT" }
      } }, receipt: { schemaVersion: "roost-refused-tracked-rollback-v1", completed: true, replay: false, executionId,
        reviewDigest: review, journalDigest: journal, restoredFileCount: 4, archivedFileCount: 4, baselineCommit: baseline,
        cleanBaseBranch: true, taskBranchRemoved: true, writerLeaseRetained: true,
        modelsInvoked: false, remoteEffects: false, releaseAllowed: false, executionAuthorized: false }
    }] } };
}

test("projects completed exact historical restoration without private data or changing the failed execution", () => {
  const execution = fixture(), before = JSON.stringify(execution);
  assert.deepEqual(refusedTrackedRecoveryEvidence(execution), [{ requestId, executionId, baselineCommit: baseline,
    reviewDigest: review, journalDigest: journal, restoredFileCount: 4, archivedFileCount: 4,
    recordedAt: "2026-10-04T11:03:00Z", writerLeaseRetained: true, modelsInvoked: false, remoteEffects: false,
    releaseAllowed: false, executionAuthorized: false }]);
  assert.equal(JSON.stringify(execution), before);
  const projected = JSON.stringify(refusedTrackedRecoveryEvidence(execution));
  for (const privateValue of ["PRIVATE_ROOT", "DO_NOT_PROJECT", "private/file.ts", "private.invalid", "ownerUserId", "installationId", "signature", "paths", "origin"]) assert.ok(!projected.includes(privateValue));
});

const receiptMutations: Array<[string, unknown]> = [
  ["schemaVersion", "future"], ["completed", false], ["replay", "false"], ["executionId", foreignId],
  ["baselineCommit", "f".repeat(40)], ["reviewDigest", "f".repeat(64)], ["journalDigest", "invalid"],
  ["restoredFileCount", 0], ["archivedFileCount", 9], ["restoredFileCount", 1.5], ["archivedFileCount", 3],
  ["cleanBaseBranch", false], ["taskBranchRemoved", false], ["writerLeaseRetained", false],
  ["modelsInvoked", true], ["remoteEffects", true], ["releaseAllowed", true], ["executionAuthorized", true],
  ["privatePath", "MUST_NOT_LEAK"]
];
for (const [key, value] of receiptMutations) test(`rejects malformed or unsafe receipt ${key}=${String(value)}`, () => {
  const execution = fixture(); Object.assign(execution.metadata.refusedTrackedRecoveries[0].receipt, { [key]: value });
  assert.deepEqual(refusedTrackedRecoveryEvidence(execution), []);
});
for (const key of ["modelsInvoked", "remoteEffects", "releaseAllowed", "executionAuthorized", "writerLeaseRetained", "completed"]) test(`rejects missing required receipt flag ${key}`, () => {
  const execution = fixture(); delete (execution.metadata.refusedTrackedRecoveries[0].receipt as Record<string, unknown>)[key];
  assert.deepEqual(refusedTrackedRecoveryEvidence(execution), []);
});

test("binds restoration to the exact historical execution, checkpoint and admission", () => {
  const mutations: Array<(execution: ReturnType<typeof fixture>) => void> = [
    e => { e.id = foreignId; }, e => { e.checkpoint.headCommit = "f".repeat(40); },
    e => { e.errorState.details.nativeReviewReceiptDigest = "f".repeat(64); },
    e => { e.metadata.refusedTrackedRecoveries[0].signed.payload.requestId = foreignId; },
    e => { e.metadata.refusedTrackedRecoveries[0].signed.payload.scope.executionId = foreignId; },
    e => { e.metadata.refusedTrackedRecoveries[0].signed.payload.scope.baselineCommit = "f".repeat(40); },
    e => { e.metadata.refusedTrackedRecoveries[0].signed.payload.scope.reviewDigest = "f".repeat(64); },
    e => { e.metadata.refusedTrackedRecoveries[0].signed.signature = "invalid"; },
    e => { e.metadata.refusedTrackedRecoveries[0].signed.payload.operation = "model_launch"; },
    e => { e.metadata.refusedTrackedRecoveries[0].signed.payload.scope.operation = "release"; }
  ];
  for (const mutate of mutations) { const execution = fixture(); mutate(execution); assert.deepEqual(refusedTrackedRecoveryEvidence(execution), []); }
});

test("accepts durable replay evidence without implying another model attempt", () => {
  const execution = fixture(); execution.metadata.refusedTrackedRecoveries[0].receipt.replay = true;
  assert.equal(refusedTrackedRecoveryEvidence(execution)[0].modelsInvoked, false);
});

test("does not display incomplete, ambiguous or unbound history", () => {
  for (const metadata of [null, {}, { refusedTrackedRecoveries: null }, { refusedTrackedRecoveries: [null, {}, "malformed"] }]) assert.deepEqual(refusedTrackedRecoveryEvidence({ ...fixture(), metadata }), []);
  const execution = fixture(), row = execution.metadata.refusedTrackedRecoveries[0];
  for (const history of [[{ ...row, receipt: undefined }], [row, row], Array(9).fill(row)]) assert.deepEqual(refusedTrackedRecoveryEvidence({ ...execution, metadata: { refusedTrackedRecoveries: history } }), []);
  assert.deepEqual(refusedTrackedRecoveryEvidence({ ...execution, checkpoint: null }), []);
  assert.deepEqual(refusedTrackedRecoveryEvidence({ ...execution, errorState: null }), []);
  assert.deepEqual(refusedTrackedRecoveryEvidence({ ...execution, checkpoint: { ...execution.checkpoint, stage: "prepared" } }), []);
  assert.deepEqual(refusedTrackedRecoveryEvidence({ ...execution, errorState: { ...execution.errorState, code: "another_failure" } }), []);
  for (const status of ["completed", "running", "cancelled", "queued"]) assert.deepEqual(refusedTrackedRecoveryEvidence({ ...execution, status }), []);
});

test("invalid timestamps and recording outside the admitted completion window are hidden", () => {
  for (const recordedAt of ["invalid", "2026-10-04T10:59:59Z", "2026-10-04T11:05:00Z"]) {
    const execution = fixture(); execution.metadata.refusedTrackedRecoveries[0].recordedAt = recordedAt;
    assert.deepEqual(refusedTrackedRecoveryEvidence(execution), []);
  }
  const execution = fixture(); execution.metadata.refusedTrackedRecoveries[0].signed.payload.expiresAt = "2026-10-04T10:59:59Z";
  assert.deepEqual(refusedTrackedRecoveryEvidence(execution), []);
});

test("filters malformed records without allowing their private data into a valid projection", () => {
  const execution = fixture();
  const invalid = { ...execution.metadata.refusedTrackedRecoveries[0], requestId: foreignId, receipt: { privatePath: "MUST_NOT_LEAK" } };
  const history = [invalid, ...execution.metadata.refusedTrackedRecoveries];
  const result = refusedTrackedRecoveryEvidence({ ...execution, metadata: { refusedTrackedRecoveries: history } });
  assert.equal(result.length, 1); assert.ok(!JSON.stringify(result).includes("MUST_NOT_LEAK"));
});
