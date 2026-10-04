import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, realpathSync, unlinkSync, renameSync } from "node:fs";
import { acquireWriterLock, writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import { acquireApplicationLease } from "./lib/agent-host-application-lease.mjs";
import { nativeDigest, captureNativeFootprint, compareNativeFootprint, createNativeOwnedRepositoryTemp,
  inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";
import { fixtureRuntimeBinding } from "./lib/agent-host-fixture-ownership.mjs";
import { createNativeReview, prepareNativeReviewResume, authorizeNativeReviewResume, captureNativeReview,
  completeNativeReview, nativeReviewLocation, assertNativeReviewCleanup } from "./lib/agent-host-native-review.mjs";
import { buildWindowsJobLauncher, startWindowsJob } from "./lib/agent-host-windows-job.mjs";
import { qualifyNativeReconciliation, issueNativeReconciliationApproval, reconcileNativeArtifacts } from "./lib/agent-host-native-reconciliation.mjs";

// The child produces genuine signed reviews and an actual closed Windows Job.
// It never launches a provider or calls a model; process.exit(0) leaves no edits.
if (process.argv[2] === "refused-recovery-child") {
  const root = process.argv[3], repository = path.join(root, "repository"), state = path.join(root, "state");
  mkdirSync(state);
  const git = (...args) => execFileSync("git", args, { cwd: repository, windowsHide: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "codex/synthetic-refused-recovery");
  git("config", "user.name", "Synthetic Fixture"); git("config", "user.email", "fixture@example.invalid");
  git("remote", "add", "origin", "https://example.invalid/RefusedRecovery.git");
  writeFileSync(path.join(repository, "source.txt"), "unchanged synthetic source\n");
  git("add", "source.txt"); git("-c", "core.hooksPath=", "commit", "-m", "synthetic baseline");
  const workspace = { root: repository, expected: { head: git("rev-parse", "HEAD"), branch: git("branch", "--show-current"), origin: git("remote", "get-url", "origin") } };
  const before = captureNativeFootprint(repository, workspace.expected), writerLock = await acquireWriterLock(state);
  const identity = { executionId: randomUUID(), workspaceId: randomUUID(), taskId: randomUUID(), applicationId: randomUUID(), attempt: 1 };
  const applicationLease = acquireApplicationLease({ writerLock, applicationId: identity.applicationId, attempt: identity.executionId, runtime: { required: false, ports: [] } });
  const spentPath = path.join(state, "synthetic-spent.json");
  writeFileSync(spentPath, JSON.stringify({ state: "dispatch_reserved", attemptDigest: nativeDigest(identity) }), { flag: "wx" });
  const review = createNativeReview({ writerLock, applicationLease, envelope: { identity, revisions: { ready: "a".repeat(64) } },
    rootIdentity: before.rootIdentity, preFootprintDigest: before.digest, spentPath });
  const launcher = await buildWindowsJobLauncher(root), authorityDigest = nativeDigest("synthetic owner authority");
  const runtime = { executable: fixtureRuntimeBinding(process.execPath), node: fixtureRuntimeBinding(process.execPath),
    launcher: fixtureRuntimeBinding(launcher.executable), deadline: new Date(Date.now() + 60000).toISOString() };
  prepareNativeReviewResume(review, { runtime, authorityDigest });
  const job = await (await startWindowsJob(launcher, { executable: process.execPath, argv: ["-e", "process.exit(0)"], cwd: repository,
    environment: { SYSTEMROOT: process.env.SystemRoot }, input: "", attempt: identity.executionId, durationMs: 10000,
    confirmResume: assignment => authorizeNativeReviewResume(review, { assignment, runtime, authorityDigest }) })).completion;
  const after = captureNativeFootprint(repository, workspace.expected), comparison = compareNativeFootprint(before, after, ["source.txt"]);
  captureNativeReview(review, { ownedTreeReceipt: job, postFootprintDigest: after.digest, violations: comparison.violations, comparison });
  const result = await completeNativeReview(review, { verify() { throw Error("coding_tests_unproven"); }, installation: () => ({ status: "PASS", manifestDigest: "d".repeat(64) }) });
  assert.equal(result.publicReceipt.verdict, "verification_blocked");
  assert.throws(() => assertNativeReviewCleanup(result.capability, identity.executionId), /cleanup_denied/);
  process.stdout.write(JSON.stringify({ directory: nativeReviewLocation(review), state, workspace, spentPath }) + "\n");
} else {
  test("Refused unchanged coding recovery needs signed native chain and immutable current workspace; consumed attempt remains spent", {
    skip: process.platform !== "win32", timeout: 60000
  }, async t => {
    const attempt = randomUUID(), proof = createNativeOwnedRepositoryTemp(realpathSync.native(os.tmpdir()), attempt);
    const root = inspectNativeOwnedTemp(proof, attempt).root;
    t.after(() => { assert.equal(cleanupNativeOwnedTemp(proof, attempt).remaining, 0); assert.equal(existsSync(root), false); });
    const x = JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), "refused-recovery-child", root], {
      windowsHide: true, timeout: 30000, encoding: "utf8", maxBuffer: 8192, stdio: ["ignore", "pipe", "pipe"] }));
    const options = { directory: x.directory, workspace: x.workspace, assertOwnerAuthority() {} };
    const qualify = () => qualifyNativeReconciliation(x.directory, undefined, x.workspace);
    const receipt = path.join(x.directory, "review.json"), originalBytes = readFileSync(receipt), original = JSON.parse(originalBytes);
    const key = readFileSync(path.join(x.directory, "integrity.key")), spentBytes = readFileSync(x.spentPath);
    const unchanged = captureNativeFootprint(x.workspace.root, x.workspace.expected).digest;
    const writeSigned = payload => writeFileSync(receipt, JSON.stringify({ payload,
      signature: createHmac("sha256", key).update(JSON.stringify(payload) + "\n").digest("hex") }) + "\n");
    const preserve = () => { assert.equal(existsSync(path.join(x.state, writerLockFilename)), true);
      assert.equal(existsSync(path.join(x.state, original.payload.binding.lease.name)), true); assert.ok(readFileSync(x.spentPath).equals(spentBytes)); };
    await t.test("missing workspace and arbitrary verdict/reason remain refused", () => {
      assert.deepEqual(qualifyNativeReconciliation(x.directory).missingEvidence, ["native_recovery_workspace_evidence_missing"]);
      assert.throws(() => issueNativeReconciliationApproval({ directory: x.directory, assertOwnerAuthority() {} }), /workspace_evidence_missing/);
      assert.equal(qualify().eligible, true, JSON.stringify(qualify())); preserve();
    });
    const mutations = [
      ["different refusal reason", p => { p.verification.reason = "native_verification_result_invalid"; }],
      ["different verdict", p => { p.public.verdict = "verified_candidate"; }],
      ["changed post footprint", p => { p.postFootprintDigest = "e".repeat(64); p.public.postFootprintDigest = p.postFootprintDigest; }],
      ["signed private change", p => { p.privateChanges = [{ path: "source.txt" }]; }],
      ["public changed path", p => { p.public.changedPathIds = ["e".repeat(64)]; }],
      ["boundary violation", p => { p.public.violations = ["protected_path_changed"]; }],
      ["scope review", p => { p.public.scopeReviewRequired = true; }],
      ["capture refusal", p => { p.public.refusalCode = "native_capture_failed"; }],
      ["failed installation", p => { p.installation.status = "BLOCKED"; }],
      ["missing installation digest", p => { p.installation.manifestDigest = null; }],
      ["wrong binding digest", p => { p.public.bindingDigest = "e".repeat(64); }],
      ["wrong root", p => { p.binding.rootIdentity = "e".repeat(64); p.public.bindingDigest = nativeDigest(p.binding); }],
      ["missing resume", p => { p.resume = null; }],
      ["different resume digest", p => { p.resume.digest = "e".repeat(64); }],
      ["active descendants", p => { p.job.activeProcesses = 1; }],
      ["open Job", p => { p.job.jobClosed = false; }],
      ["failed root", p => { p.job.rootExit = 1; }],
      ["terminated root", p => { p.job.terminationReason = "timeout"; }],
      ["wrong attempt", p => { p.job.attempt = randomUUID(); }],
      ["missing owned cleanup", p => { p.job.cleanup = false; }],
      ["breakaway", p => { p.job.breakaway = true; }],
      ["live root PID", p => { p.job.rootPid = process.pid; p.job.rootCreationTime = "100000000000000000"; }]
    ];
    for (const [label, mutate] of mutations) await t.test(label, () => {
      const p = structuredClone(original.payload); mutate(p); p.public.jobDigest = nativeDigest(p.job); writeSigned(p);
      try { assert.equal(qualify().eligible, false, label); assert.throws(() => issueNativeReconciliationApproval(options)); preserve(); }
      finally { writeFileSync(receipt, originalBytes); }
    });
    await t.test("unsigned changed review fails before any deletion", () => {
      writeFileSync(receipt, JSON.stringify({ ...original, signature: "0".repeat(64) }));
      try { assert.deepEqual(qualify().missingEvidence, ["native_review_integrity_unproven"]); preserve(); }
      finally { writeFileSync(receipt, originalBytes); }
    });
    await t.test("replaced signed resume artifact cannot be adopted", () => {
      const file = path.join(x.directory, "resume-authorized.json"), held = file + ".held";
      renameSync(file, held); writeFileSync(file, readFileSync(held));
      try { assert.equal(qualify().eligible, false); preserve(); } finally { unlinkSync(file); renameSync(held, file); }
    });
    const drift = path.join(x.workspace.root, "late.txt");
    await t.test("actual workspace drift after approval invalidates grant", () => {
      const grant = issueNativeReconciliationApproval(options); writeFileSync(drift, "unexpected\n");
      try { assert.deepEqual(qualify().missingEvidence, ["native_recovery_workspace_changed"]);
        assert.throws(() => reconcileNativeArtifacts(grant), /workspace_changed/); preserve(); }
      finally { unlinkSync(drift); }
    });
    await t.test("workspace drift at durable removal intent retains pair and barrier", () => {
      const journal = path.join(x.directory, "reconciliation.json");
      const grant = issueNativeReconciliationApproval({ ...options, assertOwnerAuthority() {
        if (existsSync(journal) && JSON.parse(readFileSync(journal)).payload.phase === "lease_remove_intent" && !existsSync(drift)) writeFileSync(drift, "late concurrent change\n");
      } });
      try { assert.throws(() => reconcileNativeArtifacts(grant), /workspace_changed/); preserve();
        assert.equal(existsSync(path.join(x.state, "agent-host-recovery.lock")), true); }
      finally { if (existsSync(drift)) unlinkSync(drift); }
    });
    await t.test("fresh explicit approval releases exact artifacts only and never relaunches", () => {
      assert.equal(captureNativeFootprint(x.workspace.root, x.workspace.expected).digest, unchanged);
      const grant = issueNativeReconciliationApproval(options), result = reconcileNativeArtifacts(grant);
      assert.equal(result.completed, true); assert.equal(result.spentRetained, true);
      assert.equal(existsSync(path.join(x.state, writerLockFilename)), false);
      assert.equal(existsSync(path.join(x.state, original.payload.binding.lease.name)), false);
      assert.ok(readFileSync(x.spentPath).equals(spentBytes)); assert.ok(readFileSync(receipt).equals(originalBytes));
      assert.equal(captureNativeFootprint(x.workspace.root, x.workspace.expected).digest, unchanged);
      assert.equal(reconcileNativeArtifacts(grant).replay, true); assert.equal(qualify().completed, true);
    });
  });
}
