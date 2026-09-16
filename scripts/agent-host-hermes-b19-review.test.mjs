import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, realpathSync, unlinkSync, linkSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHermesCodingFixture } from "./fixtures/hermes-coding-smoke.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { acquireApplicationLease, releaseApplicationLease } from "./lib/agent-host-application-lease.mjs";
import { captureNativeFootprint, compareNativeFootprint, nativeRelative, nativeDigest, physicalIdentity, createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";
import { createNativeReview, captureNativeReview, completeNativeReview, assertNativeReviewCleanup, recordNativeReviewCleanup, nativeReviewLocation, readDurableNativeReview } from "./lib/agent-host-native-review.mjs";
import { buildWindowsJobLauncher, startWindowsJob } from "./lib/agent-host-windows-job.mjs";
import { qualifyNativeReconciliation, issueNativeReconciliationApproval, reconcileNativeArtifacts, dryRunLegacyNativeReconciliation } from "./lib/agent-host-native-reconciliation.mjs";
const windows = { skip: process.platform !== "win32", timeout: 60000 };
function owned(t, beforeCleanup = async () => {}) {
  const attempt = randomUUID(), proof = createNativeOwnedTemp(realpathSync.native(os.tmpdir()), attempt), root = inspectNativeOwnedTemp(proof, attempt).root;
  t.after(async () => { await beforeCleanup(); assert.equal(cleanupNativeOwnedTemp(proof, attempt).remaining, 0); assert.equal(existsSync(root), false); }); return root;
}
async function reviewFixture(t, { extra = false, protectedChange = false, beforeCapture = () => {} } = {}) {
  let writerLock, lease;
  const state = owned(t, async () => { if (lease) releaseApplicationLease(lease); if (writerLock) await writerLock.release(); }), f = createHermesCodingFixture(); let removed = false;
  writeFileSync(path.join(f.root, ".roost-b19-scope"), "synthetic-review\n");
  t.after(() => { if (!removed) f.cleanup(); });
  writerLock = await acquireWriterLock(state);
  const identity = { executionId: f.attempt, workspaceId: randomUUID(), taskId: randomUUID(), applicationId: randomUUID(), attempt: 1 };
  lease = acquireApplicationLease({ writerLock, applicationId: identity.applicationId, attempt: identity.executionId, runtime: { required: false, ports: [] } });
  const expected = { head: f.head, branch: f.f.packet.contract.singleTask.branch, origin: f.f.claimed.application.repositories[0].url };
  const before = captureNativeFootprint(f.repository, expected);
  let capturedDigest;
  const review = createNativeReview({ writerLock, applicationLease: lease, envelope: { identity, revisions: { ready: "a".repeat(64) } }, rootIdentity: before.rootIdentity, preFootprintDigest: before.digest,
    assertWorkspaceStable() { if (captureNativeFootprint(f.repository, expected).digest !== capturedDigest) throw Error("native_post_verification_footprint_changed"); } });
  const file = path.join(f.repository, "add.cjs"); writeFileSync(file, readFileSync(file, "utf8").replace("a - b", "a + b"));
  if (extra) writeFileSync(path.join(f.repository, "helper.cjs"), "module.exports = 1;\n");
  if (protectedChange) f.git("config", "b19.synthetic", "true");
  const job = await (await startWindowsJob(await buildWindowsJobLauncher(f.root), { executable: process.execPath, argv: ["--test"], cwd: f.repository,
    environment: { SYSTEMROOT: process.env.SystemRoot }, input: "", attempt: f.attempt, durationMs: 10000 })).completion;
  const after = captureNativeFootprint(f.repository, expected), comparison = compareNativeFootprint(before, after, ["add.cjs"]);
  capturedDigest = after.digest;
  beforeCapture({ directory: nativeReviewLocation(review), f });
  const projection = captureNativeReview(review, { ownedTreeReceipt: job, comparison, postFootprintDigest: after.digest, violations: comparison.violations });
  return { f, state, review, projection, comparison, directory: nativeReviewLocation(review),
    cleanup(capability) { assertNativeReviewCleanup(capability, f.attempt); f.cleanup(); removed = true; recordNativeReviewCleanup(capability, f.attempt); } };
}
test("B19 durable capture, independent test, receipt then cleanup; public evidence contains no names", windows, async t => {
  const x = await reviewFixture(t);
  assert.equal(readDurableNativeReview(x.directory).payload.stage, "captured");
  const result = await completeNativeReview(x.review, { verify() {
    assert.equal(existsSync(x.f.repository), true); assert.equal(readDurableNativeReview(x.directory).payload.stage, "captured"); return x.f.verify();
  }, installation() { assert.equal(existsSync(x.f.repository), true); assert.equal(readDurableNativeReview(x.directory).payload.stage, "verified"); return { status: "PASS" }; } });
  assert.equal(result.publicReceipt.verdict, "verified_candidate");
  assert.equal(result.publicReceipt.releaseAllowed, false);
  const privateEvidence = readDurableNativeReview(x.directory); assert.equal(privateEvidence.payload.privateChanges[0].path, "add.cjs");
  for (const forbidden of ["add.cjs", x.f.root, "return a", nativeDigest("add.cjs")]) assert.ok(!JSON.stringify(result.publicReceipt).includes(forbidden));
  assert.throws(() => assertNativeReviewCleanup(structuredClone(result.capability), x.f.attempt));
  x.cleanup(result.capability); assert.equal(existsSync(x.f.root), false); assert.equal(readDurableNativeReview(x.directory).payload.stage, "cleaned");
  assert.throws(() => x.cleanup(result.capability));
});
test("B19 unknown safe file is scope review, never security violation; exact acceptance refusal retains fixture", windows, async t => {
  const x = await reviewFixture(t, { extra: true }); assert.deepEqual(x.comparison.violations, []); assert.equal(x.projection.scopeReviewRequired, true);
  const result = await completeNativeReview(x.review, { verify: () => x.f.verify() });
  assert.equal(result.publicReceipt.verdict, "verification_blocked"); assert.equal(result.verification.reason, "smoke_unexpected_diff");
  assert.equal(existsSync(x.f.repository), true); assert.throws(() => x.cleanup(result.capability));
  assert.equal(readDurableNativeReview(x.directory).payload.privateChanges.length, 2);
});
test("B19 safe reviewed extra output fails acceptance and retains a bounded receipt", windows, async t => {
  const x = await reviewFixture(t, { extra: true });
  const result = await completeNativeReview(x.review, { verify() {
    // Explicit independent acceptance-negative fixture, never arbitrary shell.
    assert.equal(readFileSync(path.join(x.f.repository, "helper.cjs"), "utf8"), "module.exports = 1;\n");
    return { before: x.f.before, after: { exit: 0, passed: true }, minimalChange: true, testUnchanged: true, baselineCommitUnchanged: true };
  } });
  assert.equal(result.publicReceipt.verdict, "acceptance_failed"); assert.deepEqual(result.publicReceipt.violations, []);
  x.cleanup(result.capability); assert.equal(existsSync(path.join(x.directory, "review.json")), true);
});
test("B19 protected metadata remains boundary violation even with successful tests", windows, async t => {
  const x = await reviewFixture(t, { protectedChange: true }), result = await completeNativeReview(x.review, { verify: () => x.f.verify() });
  assert.equal(result.publicReceipt.verdict, "boundary_violation"); assert.throws(() => x.cleanup(result.capability));
  assert.equal(existsSync(x.f.root), true);
});
test("B19 installation failure persists refusal before cleanup can be considered", windows, async t => {
  const x = await reviewFixture(t), result = await completeNativeReview(x.review, { verify: () => x.f.verify(), installation() { throw Error("synthetic_installation_changed"); } });
  assert.equal(result.publicReceipt.verdict, "verification_blocked"); assert.throws(() => x.cleanup(result.capability));
  assert.equal(readDurableNativeReview(x.directory).payload.installation.reason, "synthetic_installation_changed");
});

for (const phase of ["verification", "installation", "cleanup"]) test(`B19 repository drift at ${phase} retains fixture and denies cleanup`, windows, async t => {
  const x = await reviewFixture(t), drift = () => writeFileSync(path.join(x.f.repository, "late.txt"), "synthetic drift\n");
  const result = await completeNativeReview(x.review, { verify() {
    const value = x.f.verify(); if (phase === "verification") drift(); return value;
  }, installation() { if (phase === "installation") drift(); return { status: "PASS" }; } });
  if (phase === "cleanup") drift(); else assert.equal(result.publicReceipt.verdict, "verification_blocked");
  assert.throws(() => x.cleanup(result.capability)); assert.equal(existsSync(x.f.repository), true);
  assert.equal(readDurableNativeReview(x.directory).payload.stage, "final");
});
test("B19 interrupted evidence publication preserves captured evidence and workspace", windows, async t => {
  const x = await reviewFixture(t), before = readFileSync(path.join(x.directory, "review.json"));
  writeFileSync(path.join(x.directory, "review.json.next"), "synthetic interrupted write");
  await assert.rejects(completeNativeReview(x.review, { verify: () => x.f.verify() }));
  assert.ok(readFileSync(path.join(x.directory, "review.json")).equals(before)); assert.equal(existsSync(x.f.root), true);
});
test("B19 capture publication failure leaves prepared evidence and original fixture", windows, async t => {
  let saved;
  await assert.rejects(reviewFixture(t, { beforeCapture(x) { saved = x; writeFileSync(path.join(x.directory, "review.json.next"), "synthetic interruption"); } }));
  assert.equal(readDurableNativeReview(saved.directory).payload.stage, "prepared"); assert.equal(existsSync(saved.f.repository), true);
});
test("B19 final publication failure preserves completed independent verification", windows, async t => {
  const x = await reviewFixture(t);
  await assert.rejects(completeNativeReview(x.review, { verify: () => x.f.verify(), installation() {
    writeFileSync(path.join(x.directory, "review.json.next"), "synthetic interruption"); return { status: "PASS" };
  } }));
  const retained = readDurableNativeReview(x.directory); assert.equal(retained.payload.stage, "verified"); assert.equal(retained.payload.verification.status, "PASS");
  assert.equal(existsSync(x.f.root), true);
});
test("B19 cleanup identity failure preserves final evidence and never deletes unmarked files", windows, async t => {
  const x = await reviewFixture(t), result = await completeNativeReview(x.review, { verify: () => x.f.verify() });
  const marker = path.join(x.f.root, ".roost-attempt-owner"), original = readFileSync(marker);
  try { writeFileSync(marker, "foreign"); assert.throws(() => x.cleanup(result.capability)); assert.equal(existsSync(x.f.repository), true); }
  finally { writeFileSync(marker, original); }
  assert.equal(readDurableNativeReview(x.directory).payload.stage, "final"); x.cleanup(result.capability);
});
test("B19 hardlinks, ADS and traversal fail; safe secret examples stay ordinary content", windows, t => {
  const f = createHermesCodingFixture(); t.after(() => f.cleanup());
  const expected = { head: f.head, branch: f.f.packet.contract.singleTask.branch, origin: f.f.claimed.application.repositories[0].url };
  const before = captureNativeFootprint(f.repository, expected);
  for (const name of [".env.example", "credentials.json.template"]) writeFileSync(path.join(f.repository, name), "SYNTHETIC_PLACEHOLDER\n");
  assert.deepEqual(compareNativeFootprint(before, captureNativeFootprint(f.repository, expected)).violations, []);
  for (const name of ["../escape", "file:stream", "NUL", ".git/config", ".env", ".codex/config"]) assert.throws(() => nativeRelative(name));
  const linked = path.join(f.repository, "linked.cjs"); linkSync(path.join(f.repository, "add.cjs"), linked);
  try { assert.throws(() => captureNativeFootprint(f.repository, expected), /native_(?:root_invalid|hardlink_denied)/); } finally { unlinkSync(linked); }
});
function recovered(t) {
  const root = owned(t), child = fileURLToPath(new URL("./fixtures/native-recovery-child.mjs", import.meta.url));
  const result = JSON.parse(execFileSync(process.execPath, [child, root], { windowsHide: true, timeout: 30000, maxBuffer: 8192, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  return { root, state: path.join(root, "state"), directory: path.join(root, "state", result.review) };
}
test("B19 fully bound stopped child reconciles exact pair once; spent survives", windows, t => {
  const x = recovered(t), q = qualifyNativeReconciliation(x.directory); assert.equal(q.eligible, true, JSON.stringify(q));
  const before = readFileSync(path.join(x.state, "synthetic-spent.json"));
  const grant = issueNativeReconciliationApproval({ directory: x.directory, assertOwnerAuthority() {} });
  assert.throws(() => reconcileNativeArtifacts(structuredClone(grant)));
  assert.equal(reconcileNativeArtifacts(grant).deleted, 2); assert.equal(reconcileNativeArtifacts(grant).deleted, 0);
  assert.equal(existsSync(path.join(x.state, "agent-host-writer.lock")), false); assert.equal(existsSync(path.join(x.state, "agent-host-recovery.lock")), false);
  assert.ok(readFileSync(path.join(x.state, "synthetic-spent.json")).equals(before)); assert.equal(qualifyNativeReconciliation(x.directory).completed, true);
});
for (const phase of ["lease_remove_intent", "writer_remove_intent", "writer_removed"]) test(`B19 reconciliation interruption at ${phase} retains barrier and resumes with a fresh approval`, windows, async t => {
  const x = recovered(t), file = path.join(x.directory, "reconciliation.json");
  const grant = issueNativeReconciliationApproval({ directory: x.directory, assertOwnerAuthority() {
    if (existsSync(file) && JSON.parse(readFileSync(file)).payload.phase === phase) throw Error("synthetic_owner_revocation");
  } });
  assert.throws(() => reconcileNativeArtifacts(grant), /synthetic_owner_revocation/);
  assert.equal(existsSync(path.join(x.state, "agent-host-recovery.lock")), true);
  await assert.rejects(acquireWriterLock(x.state), /writer_locked/);
  const resumed = issueNativeReconciliationApproval({ directory: x.directory, assertOwnerAuthority() {} });
  assert.equal(reconcileNativeArtifacts(resumed).completed, true);
  assert.equal(existsSync(path.join(x.state, "agent-host-recovery.lock")), false);
});
test("B19 changed/foreign artifact and revoked or expired approval never delete", windows, t => {
  const x = recovered(t); let allowed = true;
  const grant = issueNativeReconciliationApproval({ directory: x.directory, assertOwnerAuthority() { if (!allowed) throw Error("revoked"); } });
  allowed = false; assert.throws(() => reconcileNativeArtifacts(grant), /revoked/); allowed = true;
  const oldNow = Date.now; try { Date.now = () => oldNow() + 60001; assert.throws(() => reconcileNativeArtifacts(grant), /expired/); } finally { Date.now = oldNow; }
  const writer = path.join(x.state, "agent-host-writer.lock"), original = readFileSync(writer);
  const replacement = writer + ".replacement"; writeFileSync(replacement, original); renameSync(replacement, writer);
  assert.equal(qualifyNativeReconciliation(x.directory).eligible, false); assert.throws(() => reconcileNativeArtifacts(grant)); assert.ok(readFileSync(writer).equals(original));
});
test("B19 tampered receipt, missing Job and reused live PID are refused", windows, t => {
  const x = recovered(t), file = path.join(x.directory, "review.json"), key = readFileSync(path.join(x.directory, "integrity.key")), original = JSON.parse(readFileSync(file));
  const publish = payload => writeFileSync(file, JSON.stringify({ payload, signature: createHmac("sha256", key).update(JSON.stringify(payload) + "\n").digest("hex") }) + "\n");
  writeFileSync(file, JSON.stringify({ ...original, signature: "0".repeat(64) })); assert.deepEqual(qualifyNativeReconciliation(x.directory).missingEvidence, ["native_review_integrity_unproven"]);
  const missing = structuredClone(original.payload); missing.job = null; publish(missing); assert.deepEqual(qualifyNativeReconciliation(x.directory).missingEvidence, ["native_recovery_job_chain_missing"]);
  const reused = structuredClone(original.payload); reused.job.rootPid = process.pid; reused.job.rootCreationTime = "100000000000000000"; reused.public.jobDigest = nativeDigest(reused.job); publish(reused);
  assert.deepEqual(qualifyNativeReconciliation(x.directory).missingEvidence, ["native_recovery_pid_reused"]);
  assert.equal(existsSync(path.join(x.state, "agent-host-writer.lock")), true);
});

test("B19 approval expiry during removal intent preserves the pair and recovery barrier", windows, t => {
  const x = recovered(t), file = path.join(x.directory, "reconciliation.json"), originalNow = Date.now;
  const grant = issueNativeReconciliationApproval({ directory: x.directory, assertOwnerAuthority() {
    if (existsSync(file) && JSON.parse(readFileSync(file)).payload.phase === "lease_remove_intent") Date.now = () => originalNow() + 60001;
  } });
  try { assert.throws(() => reconcileNativeArtifacts(grant), /approval_expired/); } finally { Date.now = originalNow; }
  const review = readDurableNativeReview(x.directory).payload;
  assert.equal(existsSync(path.join(x.state, review.binding.lease.name)), true);
  assert.equal(existsSync(path.join(x.state, review.binding.writer.name)), true);
  assert.equal(existsSync(path.join(x.state, "agent-host-recovery.lock")), true);
});
test("B19 legacy dry run lists missing chain and cannot issue cleanup authority", windows, t => {
  const state = owned(t), writer = path.join(state, "agent-host-writer.lock"), leaseName = "application-synthetic.lease", spentName = "synthetic-spent.json";
  writeFileSync(writer, JSON.stringify({ ownerPid: process.pid, ownerNonce: "synthetic", createdAt: new Date().toISOString() }));
  writeFileSync(path.join(state, leaseName), JSON.stringify({ writer: "synthetic", attempt: randomUUID() })); writeFileSync(path.join(state, spentName), JSON.stringify({ attemptDigest: "a".repeat(64) }));
  const before = [writer, path.join(state, leaseName), path.join(state, spentName)].map(p => readFileSync(p));
  const q = dryRunLegacyNativeReconciliation({ stateDirectory: state, leaseName, spentName }); assert.equal(q.eligible, false); assert.equal(q.deletionAuthorized, false); assert.equal(q.missingEvidence.length, 7);
  assert.throws(() => issueNativeReconciliationApproval({ directory: state, assertOwnerAuthority() {} }));
  [writer, path.join(state, leaseName), path.join(state, spentName)].forEach((p, i) => assert.ok(readFileSync(p).equals(before[i])));
});
