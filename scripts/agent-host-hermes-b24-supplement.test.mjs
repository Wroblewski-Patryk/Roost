// All private state here is freshly owned synthetic data. No installed provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { writeFileSync, readFileSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { nativeArtifactSnapshot, readDurableNativeReview } from './lib/agent-host-native-review.mjs';
import { readRecoverySupplement } from './lib/agent-host-recovery-supplement.mjs';
import { inspectPreservedB21Recovery, createB21RecoverySupplement, qualifySupplementedB21Recovery } from './lib/agent-host-hermes-b24-supplement.mjs';
import { issueNativeReconciliationApproval, reconcileNativeArtifacts } from './lib/agent-host-native-reconciliation.mjs';
import { syntheticRecoveryFixture as fixture } from './fixtures/hermes-recovery-evidence.mjs';
const windows = { skip: process.platform !== 'win32', timeout: 60000 };

test("B24 original REFUSED plus one independent PASS remains blocked on missing historical fixture ownership", windows, t => {
  const x = fixture(t), paths = [x.writerPath, x.leasePath, x.spentPath, x.reviewPath, x.reportPath], old = paths.map(nativeArtifactSnapshot);
  const result = createB21RecoverySupplement(x.options);
  assert.equal(result.projection.laterVerification, "later_independent_test_passed");
  assert.deepEqual(result.eligibility.missingEvidence, ["native_recovery_original_fixture_ownership_missing"]);
  assert.equal(result.eligibility.eligible, false); assert.equal(result.eligibility.deletionAuthorized, false);
  assert.deepEqual(paths.map(nativeArtifactSnapshot), old); assert.equal(readDurableNativeReview(x.reviewDirectory).payload.verification.status, "REFUSED");
  assert.equal(readRecoverySupplement(x.directory).events.length, 3);
  assert.throws(() => createB21RecoverySupplement(x.options), /replay_denied/);
  assert.equal(existsSync(path.join(x.state, "agent-host-recovery.lock")), false);
});
test("B24 complete synthetic original ownership makes only diagnostic eligibility, never a cleanup grant", { ...windows, timeout: 120000 }, t => {
  const x = fixture(t, true), result = createB21RecoverySupplement(x.options);
  assert.equal(result.eligibility.eligible, true); assert.deepEqual(result.eligibility.missingEvidence, []);
  assert.equal(result.eligibility.deletionAuthorized, false); assert.equal(result.eligibility.executionAuthorized, false);
  assert.throws(() => issueNativeReconciliationApproval({ directory: x.reviewDirectory, assertOwnerAuthority() {} }), /review_not_eligible/);
  assert.throws(() => reconcileNativeArtifacts(result.eligibility), /approval_unproven/);
  assert.equal(existsSync(x.f.root), true); assert.equal(existsSync(x.writerPath), true); assert.equal(existsSync(x.leasePath), true);
  const observation = inspectPreservedB21Recovery(x.options);
  assert.equal(qualifySupplementedB21Recovery(observation, x.directory).eligible, true);
  writeFileSync(path.join(x.state, "agent-host-recovery.lock"), "synthetic barrier");
  assert.deepEqual(qualifySupplementedB21Recovery(observation, x.directory).missingEvidence, ["native_b24_recovery_barrier_present"]);
});
for (const target of ["writerPath", "leasePath", "spentPath", "reportPath", "reviewPath", "manifestPath", "fixture", "marker", "barrier"]) test("B24 fresh qualification rejects drift of " + target, windows, t => {
  const x = fixture(t), observation = inspectPreservedB21Recovery(x.options);
  const file = target === "fixture" ? path.join(x.f.repository, "add.cjs") : target === "marker" ? path.join(x.f.root, ".roost-smoke-scope")
    : target === "barrier" ? path.join(x.state, "agent-host-recovery.lock") : x[target];
  if (target === "barrier") writeFileSync(file, "synthetic barrier");
  else { const raw = readFileSync(file); renameSync(file, file + ".replaced"); writeFileSync(file, raw); unlinkSync(file + ".replaced"); }
  const result = qualifySupplementedB21Recovery(observation, x.directory);
  assert.equal(result.eligible, false); assert.equal(result.deletionAuthorized, false); assert.ok(result.missingEvidence.length);
  assert.notDeepEqual(result.missingEvidence, ["native_b24_evidence_unproven"], "drift must fail before attempting to open the missing supplement");
});
test("B24 forged observation and missing owner authority cannot publish or grant", windows, t => {
  const x = fixture(t);
  assert.equal(qualifySupplementedB21Recovery({}, x.directory).eligible, false);
  assert.throws(() => createB21RecoverySupplement({ ...x.options, assertOwnerAuthority: undefined }), /owner_authority_required/);
  assert.equal(existsSync(x.directory), false);
});
