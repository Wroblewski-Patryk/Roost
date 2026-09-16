import test from "node:test";
import assert from "node:assert/strict";
import { nativeBoundaryResultBlocked } from "../modules/agent-runtime/task-review-contract";

const native = { nativeBoundary: { profile: "coding-local" } };
const receipt = { policyVersion: "roost-hermes-native-audited-coding-v1", classification: "review_required",
  ownerRiskReference: "ADR-004-v7-native-tools", authorityProfile: "coding-local",
  authorities: ["repository_read", "repository_write", "local_test"], toolsets: ["file", "terminal"],
  footprintPolicy: "roost-root-scoped-coding-v2", scopeReviewRequired: false,
  releaseAllowed: false, reviewRequired: true, violations: [], postFootprintDigest: "a".repeat(64), jobReceiptDigest: "b".repeat(64) };
const review = { version: "roost-native-review-public-v2", policy: "roost-root-scoped-coding-v2", verdict: "verified_candidate",
  verification: "PASS", installation: "PASS", reviewRequired: true, releaseAllowed: false, scopeReviewRequired: false, violations: [],
  postFootprintDigest: receipt.postFootprintDigest, jobDigest: receipt.jobReceiptDigest };
const verified = { nativeToolReceipt: receipt, nativeReviewReceipt: review, nativeReviewReceiptDigest: "c".repeat(64) };
test("completion/review negative-evidence guard leaves ordinary result semantics intact", () => {
  assert.equal(nativeBoundaryResultBlocked({}, {}), false);
  assert.equal(nativeBoundaryResultBlocked({}, native), true);
  assert.equal(nativeBoundaryResultBlocked({ nativeToolReceipt: receipt }, native), true);
  assert.equal(nativeBoundaryResultBlocked(verified, native), false);
});
test("boundary violation cannot be hidden behind completed/candidate metadata", () => {
  for (const classification of ["boundary_violation", "policy_blocked", "completed", "candidate_result", "policy_checked"])
    assert.equal(nativeBoundaryResultBlocked({ ...verified, outcome: "candidate_result", nativeToolReceipt: { ...receipt, classification } }, native), true);
  assert.equal(nativeBoundaryResultBlocked({ outcome: "boundary_violation", nativeToolReceipt: receipt }, native), true);
});
test("release claims and incomplete post-run proof remain blocked", () => {
  for (const change of [{ releaseAllowed: true }, { reviewRequired: false }, { violations: ["cleanup_unproven"] },
    { violations: undefined }, { postFootprintDigest: null }, { jobReceiptDigest: null }, { policyVersion: "unknown" },
    { authorities: [...receipt.authorities, "remote_push"] }, { toolsets: ["file", "terminal", "web"] }])
    assert.equal(nativeBoundaryResultBlocked({ ...verified, nativeToolReceipt: { ...receipt, ...change } }, native), true);
});
test("missing, negative, stale or cross-result durable review cannot approve a native result", () => {
  for (const change of [{ verdict: "acceptance_failed" }, { verdict: "boundary_violation" }, { verification: "REFUSED" },
    { installation: "BLOCKED" }, { postFootprintDigest: "d".repeat(64) }, { jobDigest: "e".repeat(64) }, { scopeReviewRequired: true }])
    assert.equal(nativeBoundaryResultBlocked({ ...verified, nativeReviewReceipt: { ...review, ...change } }, native), true);
  assert.equal(nativeBoundaryResultBlocked({ ...verified, nativeReviewReceiptDigest: undefined }, native), true);
});
