import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { nativeDigest } from "./lib/agent-host-native-footprint.mjs";
import { nativeArtifactSnapshot } from "./lib/agent-host-native-review.mjs";
import { createB21RecoverySupplement } from "./lib/agent-host-hermes-b24-supplement.mjs";
import { syntheticRecoveryFixture } from "./fixtures/hermes-recovery-evidence.mjs";
import { b21AdoptionScope, b21AdoptionMaxAgeMs, b21AdoptionApprovalMaxAgeMs, b21AdoptionDirectory,
  observeB21LegacyAdoption, approveB21LegacyAdoption, publishB21LegacyAdoption, readB21LegacyAdoption,
  qualifyB21LegacyAdoption } from "./lib/agent-host-hermes-b25-adoption.mjs";
import { reconcileNativeArtifacts, issueNativeReconciliationApproval } from "./lib/agent-host-native-reconciliation.mjs";
const windows = { skip: process.platform !== "win32", timeout: 180000 };
function fixture(t) {
  const x = syntheticRecoveryFixture(t), b24 = createB21RecoverySupplement(x.options);
  const options = { ...x.options, supplementDirectory: x.directory,
    expected: { originalReviewDigest: b24.projection.originalReviewDigest, supplementDigest: b24.projection.supplementDigest } };
  const candidate = observeB21LegacyAdoption(options);
  const approval = { scope: b21AdoptionScope, ...options.expected, frozenEvidenceDigest: candidate.review.frozenEvidenceDigest,
    ownerDecisionDigest: nativeDigest("synthetic owner explicitly accepts missing original ownership for B25 only"), missingOriginalOwnershipAccepted: true };
  const args = { observation: candidate.observation, approval, assertOwnerAuthority() {} };
  return { ...x, options, candidate, args, adoptionDirectory: b21AdoptionDirectory(x.state, options.expected.originalReviewDigest) };
}
test("B25 adopts exactly once, preserves B21/B24, supports read-only B26 preparation, never cleanup", windows, t => {
  const x = fixture(t), files = [x.writerPath, x.leasePath, x.spentPath, x.reportPath, x.reviewPath,
    ...readdirSync(x.directory).filter(n => n.endsWith(".json")).map(n => path.join(x.directory, n))];
  const old = files.map(nativeArtifactSnapshot), key = readFileSync(path.join(x.directory, "integrity.key"));
  const grant = approveB21LegacyAdoption(x.args), result = publishB21LegacyAdoption(grant);
  assert.equal(result.stage, "adopted"); assert.equal(result.eligibleForB26Preparation, true);
  for (const k of ["cleanupAuthorized", "executionAuthorized", "configAuthorized", "apiAuthorized"]) assert.equal(result[k], false);
  const record = readB21LegacyAdoption(x.adoptionDirectory, x.directory);
  assert.equal(record.events.length, 2); assert.equal(record.payload.originalOwnershipBackfilled, false);
  assert.equal(record.payload.classification, "owner_approved_legacy_adoption");
  assert.equal(record.payload.frozenEvidence.binding.originalVerification, "REFUSED");
  assert.deepEqual(files.map(nativeArtifactSnapshot), old); assert.ok(key.equals(readFileSync(path.join(x.directory, "integrity.key"))));
  assert.equal(existsSync(path.join(x.state, "agent-host-recovery.lock")), false);
  assert.equal(qualifyB21LegacyAdoption(x.options, x.adoptionDirectory).eligibleForB26Preparation, true);
  assert.throws(() => publishB21LegacyAdoption(grant), /replay_denied/);
  assert.throws(() => publishB21LegacyAdoption(structuredClone(grant)), /replay_denied/);
  assert.throws(() => reconcileNativeArtifacts(result), /approval_unproven/);
  assert.throws(() => issueNativeReconciliationApproval({ directory: x.reviewDirectory, assertOwnerAuthority() {} }), /review_not_eligible/);
  // A fresh controller observation cannot reissue a previously reserved adoption.
  const again = observeB21LegacyAdoption(x.options);
  assert.throws(() => publishB21LegacyAdoption(approveB21LegacyAdoption({ ...x.args, observation: again.observation })), /already_reserved/);
  const privateText = JSON.stringify(record);
  for (const canary of [x.f.root, x.state, x.f.attempt, "return a", "add.cjs", key.toString("hex")]) assert.ok(!privateText.includes(canary));
  assert.equal(existsSync(x.f.root), true);
  // Full file IDs, not just equal manifest bytes, survive a controller restart.
  const executable = path.join(x.state, "checkout", "hermes.exe"), raw = readFileSync(executable);
  renameSync(executable, executable + ".old"); writeFileSync(executable, raw); unlinkSync(executable + ".old");
  assert.deepEqual(qualifyB21LegacyAdoption(x.options, x.adoptionDirectory).missingEvidence, ["native_b25_frozen_evidence_changed"]);
});
test("B25 approval requires explicit legacy acceptance, exact frozen tuple and opaque observation", windows, t => {
  const x = fixture(t);
  for (const field of ["originalReviewDigest", "supplementDigest", "frozenEvidenceDigest"]) {
    assert.throws(() => approveB21LegacyAdoption({ ...x.args, approval: { ...x.args.approval, [field]: "b".repeat(64) } }), /approval_mismatch/);
  }
  assert.throws(() => approveB21LegacyAdoption({ ...x.args, approval: { ...x.args.approval, missingOriginalOwnershipAccepted: false } }));
  assert.throws(() => approveB21LegacyAdoption({ ...x.args, approval: { ...x.args.approval, arbitraryPath: x.f.root } }));
  assert.throws(() => approveB21LegacyAdoption({ ...x.args, observation: structuredClone(x.candidate.observation) }), /observation_unproven/);
  assert.throws(() => approveB21LegacyAdoption({ ...x.args, assertOwnerAuthority: undefined }), /owner_approval_required/);
  assert.throws(() => observeB21LegacyAdoption({ ...x.options, expected: { ...x.options.expected, supplementDigest: "b".repeat(64) } }), /reference_mismatch/);
  assert.throws(() => observeB21LegacyAdoption({ ...x.options, reportPath: x.options.reportPath.replace(x.state, x.state + "\\.") }));
  assert.equal(existsSync(x.adoptionDirectory), false);
});
test("B25 cross-attempt observation cannot borrow another approval", windows, t => {
  const a = fixture(t), b = fixture(t);
  assert.throws(() => approveB21LegacyAdoption({ ...a.args, observation: b.candidate.observation }), /approval_mismatch/);
  assert.throws(() => observeB21LegacyAdoption({ ...b.options, expected: a.options.expected }), /reference_mismatch/);
});
test("B25 owner withdrawal and expired observations cannot publish", windows, t => {
  const x = fixture(t); let authorized = true;
  const grant = approveB21LegacyAdoption({ ...x.args, assertOwnerAuthority() { if (!authorized) throw Error("synthetic_owner_revoked"); } });
  authorized = false; assert.throws(() => publishB21LegacyAdoption(grant), /owner_revoked/); authorized = true;
  assert.throws(() => publishB21LegacyAdoption(grant), /replay_denied/);
  const now = Date.now(); t.mock.method(Date, "now", () => now + b21AdoptionApprovalMaxAgeMs + 1);
  assert.throws(() => approveB21LegacyAdoption(x.args), /approval_expired/);
  assert.equal(existsSync(x.adoptionDirectory), false);
});
test("B25 adopted evidence expires without auto-renewal or cleanup", windows, t => {
  const x = fixture(t), result = publishB21LegacyAdoption(approveB21LegacyAdoption(x.args));
  const files = readdirSync(x.adoptionDirectory), now = Date.now();
  t.mock.method(Date, "now", () => now + b21AdoptionMaxAgeMs + 1);
  assert.equal(Date.parse(result.expiresAt) <= Date.now(), true);
  assert.deepEqual(qualifyB21LegacyAdoption(x.options, x.adoptionDirectory).missingEvidence, ["native_b25_adoption_expired"]);
  assert.deepEqual(readdirSync(x.adoptionDirectory), files); assert.equal(existsSync(x.f.root), true);
});
for (const target of ["writerPath", "leasePath", "spentPath", "reportPath", "reviewPath", "manifestPath", "fixture", "marker", "owner-marker", "root", "supplement", "installation", "barrier"]) test("B25 rejects frozen " + target + " replacement before any adoption write", windows, t => {
  const x = fixture(t);
  const file = target === "fixture" ? path.join(x.f.repository, "add.cjs") : target === "marker" ? path.join(x.f.root, ".roost-smoke-scope")
    : target === "owner-marker" ? path.join(x.f.root, ".roost-attempt-owner")
    : target === "supplement" ? path.join(x.directory, "03-finalized.json") : target === "installation" ? path.join(x.state, "checkout", "hermes.exe") : x[target];
  if (target === "barrier") writeFileSync(path.join(x.state, "agent-host-recovery.lock"), "synthetic barrier");
  else if (target === "root") {
    // Move the original aside and put a foreign empty directory at the same path.
    const old = x.f.root + "-old"; renameSync(x.f.root, old); mkdirSync(x.f.root);
    try { assert.throws(() => approveB21LegacyAdoption(x.args)); assert.equal(existsSync(x.adoptionDirectory), false); }
    finally { // Restore only our exact, empty replacement before owned cleanup.
      const out = x.f.root + "-replacement"; renameSync(x.f.root, out); renameSync(old, x.f.root);
      // Removed by the test-owned helper after adding it under its owned root.
      renameSync(out, path.join(x.f.root, "empty-replacement"));
    }
    return;
  } else { const raw = readFileSync(file); renameSync(file, file + ".old"); writeFileSync(file, raw); unlinkSync(file + ".old"); }
  assert.throws(() => approveB21LegacyAdoption(x.args)); assert.equal(existsSync(x.adoptionDirectory), false);
});
test("B25 interrupted publication retains prepared evidence and denies both restart and B26 qualification", windows, t => {
  const x = fixture(t); let calls = 0;
  const grant = approveB21LegacyAdoption({ ...x.args, assertOwnerAuthority() { if (++calls === 4) throw Error("synthetic interruption"); } });
  assert.throws(() => publishB21LegacyAdoption(grant), /interruption/);
  assert.equal(readB21LegacyAdoption(x.adoptionDirectory, x.directory).payload.stage, "prepared");
  assert.deepEqual(qualifyB21LegacyAdoption(x.options, x.adoptionDirectory).missingEvidence, ["native_b25_adoption_incomplete"]);
  assert.throws(() => publishB21LegacyAdoption(grant), /replay_denied/);
  const next = approveB21LegacyAdoption(x.args); assert.throws(() => publishB21LegacyAdoption(next), /already_reserved/);
  assert.equal(existsSync(x.f.root), true); assert.equal(existsSync(x.writerPath), true); assert.equal(existsSync(x.leasePath), true);
});
for (const situation of ["alive", "pid-reused", "unobservable"]) test("B25 refuses " + situation + " original process", windows, t => {
  const x = fixture(t), original = childProcess.execFileSync;
  const fake = (exe, args, options) => {
    if (exe !== "powershell.exe") return original(exe, args, options);
    if (situation === "unobservable") throw Error("synthetic observation unavailable");
    const source = Buffer.from(args.at(-1), "base64").toString("utf16le"), pid = Number(/Get-Process -Id (\d+)/.exec(source)[1]);
    return JSON.stringify({ pid, creationTime: situation === "alive" ? "133000000000000000" : "134000000000000000", executable: process.execPath });
  };
  childProcess.execFileSync = fake; syncBuiltinESMExports();
  try { assert.throws(() => approveB21LegacyAdoption(x.args), situation === "alive" ? /process_alive/ : situation === "pid-reused" ? /pid_reused/ : /observation_unavailable/); }
  finally { childProcess.execFileSync = original; syncBuiltinESMExports(); }
  assert.equal(existsSync(x.adoptionDirectory), false);
});
test("B25 journal refuses tamper, missing stage, physical replacement, unknown fields and extra replay files", windows, t => {
  const x = fixture(t); publishB21LegacyAdoption(approveB21LegacyAdoption(x.args));
  const file = path.join(x.adoptionDirectory, "02-adopted.json"), raw = readFileSync(file);
  for (const mutate of [r => { r.payload.approval.frozenEvidenceDigest = "b".repeat(64); }, r => { r.payload.cleanupAuthorized = true; }, r => { r.payload.privatePath = "synthetic"; }]) {
    const r = JSON.parse(raw); mutate(r); writeFileSync(file, JSON.stringify(r));
    assert.throws(() => readB21LegacyAdoption(x.adoptionDirectory, x.directory)); writeFileSync(file, raw);
  }
  const old = file + ".old"; renameSync(file, old);
  // An unrecognized entry is itself disallowed; move original outside the journal.
  const held = path.join(x.state, "held-adopted.json"); renameSync(old, held);
  assert.equal(qualifyB21LegacyAdoption(x.options, x.adoptionDirectory).eligibleForB26Preparation, false);
  writeFileSync(file, raw); assert.throws(() => readB21LegacyAdoption(x.adoptionDirectory, x.directory), /integrity_unproven/);
  unlinkSync(file); renameSync(held, file);
  writeFileSync(path.join(x.adoptionDirectory, "03-replay.json"), "{}");
  assert.throws(() => readB21LegacyAdoption(x.adoptionDirectory, x.directory), /journal_invalid/);
});
