// All private state here is freshly owned synthetic data. No installed provider.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, randomBytes, createHash, createHmac } from "node:crypto";
import { realpathSync, mkdirSync, writeFileSync, readFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { createHermesB21CodingFixture } from "./fixtures/hermes-coding-smoke.mjs";
import { createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp, nativeDigest, physicalIdentity,
  captureNativeFootprint, compareNativeFootprint, nativeFootprintPolicy } from "./lib/agent-host-native-footprint.mjs";
import { nativeArtifactSnapshot, readDurableNativeReview } from "./lib/agent-host-native-review.mjs";
import { legacyRecoveryIdentityDigest, legacyInputIdentityVersion } from "./lib/agent-host-recovery-identity.mjs";
import { readRecoverySupplement, recoverySupplementDirectory } from "./lib/agent-host-recovery-supplement.mjs";
import { inspectPreservedB21Recovery, createB21RecoverySupplement, qualifySupplementedB21Recovery } from "./lib/agent-host-hermes-b24-supplement.mjs";
import { issueNativeReconciliationApproval, reconcileNativeArtifacts } from "./lib/agent-host-native-reconciliation.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";
const sha = b => createHash("sha256").update(b).digest("hex"), h = "a".repeat(64), windows = { skip: process.platform !== "win32", timeout: 60000 };
function fixture(t, ownership = false) {
  const f = createHermesB21CodingFixture(); t.after(() => f.cleanup());
  const attempt = randomUUID(), proof = createNativeOwnedTemp(realpathSync.native(os.tmpdir()), attempt), state = inspectNativeOwnedTemp(proof, attempt).root;
  t.after(() => cleanupNativeOwnedTemp(proof, attempt));
  const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
  const write = (file, value) => { writeFileSync(file, JSON.stringify(value) + "\n"); return sha(readFileSync(file)); };
  const roots = ["checkout", "pythonBase"].map((kind, i) => {
    const directory = path.join(state, kind); mkdirSync(directory); const name = i ? "python.exe" : "hermes.exe", data = "synthetic non-executable bytes\n";
    writeFileSync(path.join(directory, name), data); return { kind, path: directory, files: [{ path: name, size: Buffer.byteLength(data), sha256: sha(data) }] };
  });
  const manifest = { schemaVersion: 2, commit: pin.commit, version: pin.version, source: pin.officialSource, roots, executable: path.join(roots[0].path, "hermes.exe") };
  const manifestPath = path.join(state, "manifest.json"), manifestDigest = write(manifestPath, manifest), generation = randomUUID();
  const generatedReceiptPath = path.join(state, "generated.json"), generatedReceiptSha256 = write(generatedReceiptPath, {
    schemaVersion: "roost-hermes-generated-v1", generation, immutableDigest: manifestDigest, interpreterDigest: roots[1].files[0].sha256,
    compiler: "cpython-3.13.1-source-verified", roots: roots.map(r => ({ kind: r.kind, files: [] })) });
  const attestationPath = path.join(state, "installation.json"); write(attestationPath, { manifestPath, manifestSha256: manifestDigest, generatedReceiptPath, generatedReceiptSha256, generation });
  const expected = { head: f.head, branch: f.f.packet.contract.singleTask.branch, origin: f.f.claimed.application.repositories[0].url };
  const before = captureNativeFootprint(f.repository, expected);
  writeFileSync(path.join(f.repository, "add.cjs"), readFileSync(path.join(f.repository, "add.cjs"), "utf8").replace("a - b", "a + b"));
  const cache = path.join(f.repository, "synthetic", "cache", "one", "two", "three"); mkdirSync(cache, { recursive: true });
  for (const name of ["one.bin", "two.bin", "three.bin"]) writeFileSync(path.join(cache, name), "synthetic opaque bytes");
  const after = captureNativeFootprint(f.repository, expected), comparison = compareNativeFootprint(before, after, ["add.cjs"]);
  const identity = { executionId: f.attempt, workspaceId: randomUUID(), taskId: randomUUID(), applicationId: randomUUID(), attempt: 1 };
  const owner = { pid: 2147483000, creationTime: "133000000000000000", executableDigest: h, executablePathDigest: h };
  const writerPath = path.join(state, "agent-host-writer.lock"), leasePath = path.join(state, "application-" + nativeDigest(identity.applicationId) + ".lease"), spentPath = path.join(state, "hermes-b21-smoke-consumed.json");
  write(writerPath, { ownerNonce: randomUUID(), ownerPid: owner.pid, ownerProcess: owner });
  const writer = nativeArtifactSnapshot(writerPath);
  write(leasePath, { attempt: f.attempt, writer: writer.record.ownerNonce, application: nativeDigest(identity.applicationId) });
  write(spentPath, { state: "dispatch_reserved", scope: "one_real_hermes_coding_smoke_b21_only", attemptDigest: legacyRecoveryIdentityDigest(identity, legacyInputIdentityVersion) });
  const jobBytes = "synthetic job binary", launcher = path.join(f.root, "roost-job.exe"); writeFileSync(launcher, jobBytes);
  const job = { attempt: f.attempt, job: randomUUID(), cleanup: true, activeProcesses: 0, jobClosed: true, assignedBeforeResume: true,
    resumed: true, killOnClose: true, breakaway: false, executableDigest: h, launcherSha256: sha(jobBytes), sourceSha256: h,
    rootPid: owner.pid + 1, rootCreationTime: owner.creationTime, launcherPid: owner.pid + 2, launcherCreationTime: owner.creationTime };
  const binding = { identity, rootIdentity: before.rootIdentity, ready: h, preFootprintDigest: before.digest,
    writer, lease: nativeArtifactSnapshot(leasePath), spent: nativeArtifactSnapshot(spentPath) };
  const reviewDirectory = path.join(state, "review"); mkdirSync(reviewDirectory); const key = randomBytes(32); writeFileSync(path.join(reviewDirectory, "integrity.key"), key);
  const payload = { version: "roost-native-review-v2", policy: nativeFootprintPolicy, stage: "final",
    integrityKeyIdentity: physicalIdentity(path.join(reviewDirectory, "integrity.key"), false), binding, job,
    postFootprintDigest: after.digest, privateChanges: comparison.changes,
    public: { verdict: "acceptance_failed", violations: [], categoryCounts: comparison.categoryCounts, scopeReviewRequired: true,
      jobDigest: nativeDigest(job), bindingDigest: nativeDigest(binding) }, verification: { status: "REFUSED", reason: "smoke_unexpected_diff" },
    installation: { status: "PASS", manifestDigest } };
  if (ownership) payload.fixtureOwnership = {
    version: "roost-native-fixture-ownership-v1", repositoryIdentity: before.rootIdentity, fixtureRootIdentity: physicalIdentity(f.root), fixtureParentIdentity: physicalIdentity(path.dirname(f.root)),
    markerIdentity: physicalIdentity(path.join(f.root, ".roost-attempt-owner"), false), markerDigest: sha(readFileSync(path.join(f.root, ".roost-attempt-owner"))),
    scopeMarkerIdentity: physicalIdentity(path.join(f.root, ".roost-smoke-scope"), false), scopeMarkerDigest: sha(readFileSync(path.join(f.root, ".roost-smoke-scope"))) };
  const reviewPath = path.join(reviewDirectory, "review.json"), reviewDigest = write(reviewPath, { payload,
    signature: createHmac("sha256", key).update(JSON.stringify(payload) + "\n").digest("hex") });
  const reportPath = path.join(state, "result.json"); write(reportPath, { scope: "one_real_hermes_coding_smoke_b21_only", authorizationSpent: true,
    nativeReviewReceiptDigest: reviewDigest, cleanupRequiredAt: f.root, baseline: { exit: 1 },
    installation: { manifestDigest, executableDigest: roots[0].files[0].sha256, split: { inventoryFiles: 2, immutableFiles: 2, generatedFiles: 0, generation } } });
  return { f, state, writerPath, leasePath, spentPath, reviewPath, reviewDirectory, reportPath, manifestPath,
    directory: recoverySupplementDirectory(state, reviewDigest), options: { reportPath, reviewDirectory, installation: { attestationPath, manifestPath }, assertOwnerAuthority() {} } };
}
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
