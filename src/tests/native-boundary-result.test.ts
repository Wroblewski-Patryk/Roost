import test from "node:test";
import assert from "node:assert/strict";
import { nativeBoundaryResultBlocked } from "../modules/agent-runtime/task-review-contract";

const native = { nativeBoundary: { profile: "coding-local" } };
const receipt = { policyVersion: "roost-hermes-native-audited-coding-v1", classification: "review_required",
  ownerRiskReference: "ADR-004-v7-native-tools", authorityProfile: "coding-local",
  authorities: ["repository_read", "repository_write", "local_test"], toolsets: ["file", "terminal"],
  releaseAllowed: false, reviewRequired: true, violations: [], postFootprintDigest: "a".repeat(64), jobReceiptDigest: "b".repeat(64) };
test("completion/review negative-evidence guard leaves ordinary result semantics intact", () => {
  assert.equal(nativeBoundaryResultBlocked({}, {}), false);
  assert.equal(nativeBoundaryResultBlocked({}, native), true);
  assert.equal(nativeBoundaryResultBlocked({ nativeToolReceipt: receipt }, native), false);
});
test("boundary violation cannot be hidden behind completed/candidate metadata", () => {
  for (const classification of ["boundary_violation", "policy_blocked", "completed", "candidate_result", "policy_checked"])
    assert.equal(nativeBoundaryResultBlocked({ outcome: "candidate_result", nativeToolReceipt: { ...receipt, classification } }, native), true);
  assert.equal(nativeBoundaryResultBlocked({ outcome: "boundary_violation", nativeToolReceipt: receipt }, native), true);
});
test("release claims and incomplete post-run proof remain blocked", () => {
  for (const change of [{ releaseAllowed: true }, { reviewRequired: false }, { violations: ["cleanup_unproven"] },
    { violations: undefined }, { postFootprintDigest: null }, { jobReceiptDigest: null }, { policyVersion: "unknown" },
    { authorities: [...receipt.authorities, "remote_push"] }, { toolsets: ["file", "terminal", "web"] }])
    assert.equal(nativeBoundaryResultBlocked({ nativeToolReceipt: { ...receipt, ...change } }, native), true);
});
