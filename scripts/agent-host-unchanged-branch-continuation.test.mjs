import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, realpathSync, unlinkSync, renameSync } from "node:fs";
import { observeUnchangedTaskBranch } from "./lib/agent-host-unchanged-branch-continuation.mjs";
import { readDurableNativeReview, createNativeReview, prepareNativeReviewResume, authorizeNativeReviewResume,
  captureNativeReview, completeNativeReview, nativeReviewLocation } from "./lib/agent-host-native-review.mjs";
import { nativeDigest, captureNativeFootprint, compareNativeFootprint, createNativeOwnedRepositoryTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";
import { issueNativeReconciliationApproval, reconcileNativeArtifacts } from "./lib/agent-host-native-reconciliation.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { acquireApplicationLease } from "./lib/agent-host-application-lease.mjs";
import { fixtureRuntimeBinding } from "./lib/agent-host-fixture-ownership.mjs";
import { buildWindowsJobLauncher, startWindowsJob } from "./lib/agent-host-windows-job.mjs";

if (process.argv[2] === "unchanged-branch-child") {
  const root = process.argv[3], repository = path.join(root, "repository"), state = path.join(root, "state");
  mkdirSync(state);
  const identity = { executionId: randomUUID(), workspaceId: randomUUID(), taskId: randomUUID(), applicationId: randomUUID(), attempt: 1 };
  const git = (...args) => execFileSync("git", args, { cwd: repository, windowsHide: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", `codex/task-${identity.taskId}`);
  git("config", "user.name", "Synthetic Fixture"); git("config", "user.email", "fixture@example.invalid");
  git("remote", "add", "origin", "https://example.invalid/UnchangedBranch.git");
  writeFileSync(path.join(repository, "source.txt"), "unchanged synthetic source\n");
  git("add", "source.txt"); git("-c", "core.hooksPath=", "commit", "-m", "synthetic baseline");
  const workspace = { root: repository, expected: { head: git("rev-parse", "HEAD"), branch: git("branch", "--show-current"), origin: git("remote", "get-url", "origin") } };
  const before = captureNativeFootprint(repository, workspace.expected), writerLock = await acquireWriterLock(state);
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
  process.stdout.write(JSON.stringify({ directory: nativeReviewLocation(review), state, workspace, spentPath }) + "\n");
} else {

test("Existing branch without current authority and explicit predecessor is refused before reading API", async () => {
  let calls = 0;
  await assert.rejects(observeUnchangedTaskBranch({ api() { calls++; }, claimed: {}, firstWrite: {} }),
    e => e.recoveryReason === "repository_mismatch" && e.retryable === false);
  assert.equal(calls, 0);
});

test("A separately admitted new attempt can reuse only the unchanged reconciled initial task branch", {
  skip: process.platform !== "win32", timeout: 60000
}, async t => {
  const attempt = randomUUID(), temp = createNativeOwnedRepositoryTemp(realpathSync.native(os.tmpdir()), attempt);
  const root = inspectNativeOwnedTemp(temp, attempt).root;
  t.after(() => { assert.equal(cleanupNativeOwnedTemp(temp, attempt).remaining, 0); assert.equal(existsSync(root), false); });
  const x = JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), "unchanged-branch-child", root], {
    windowsHide: true, timeout: 30000, encoding: "utf8", maxBuffer: 8192, stdio: ["ignore", "pipe", "pipe"] }));
  // The fixture has a genuine zero-edit, closed Windows Job and signed refused
  // review, with the canonical task branch bound before native capture.
  const review = readDurableNativeReview(x.directory), b = review.payload.binding;
  const agentHostId = randomUUID();
  const previous = { id: b.identity.executionId, workspaceId: b.identity.workspaceId, taskId: b.identity.taskId,
    applicationId: b.identity.applicationId, agentHostId, attempt: 1, status: "failed", completedAt: new Date().toISOString(),
    leaseToken: null, leaseExpiresAt: null, contextInvalidatedAt: null, finalResponse: null, changedFiles: [],
    checkpoint: { headCommit: x.workspace.expected.head, branch: x.workspace.expected.branch },
    metadata: { executionContract: { nativeBoundary: { profile: "coding-local" }, singleTask: { branch: x.workspace.expected.branch } },
      readyContextPin: { riskAdmissionCommit: x.workspace.expected.head, revision: b.ready } },
    errorState: { code: "agent_native_review_blocked", details: { nativeReviewReceiptDigest: review.digest, nativeReviewReceipt: review.payload.public } } };
  const claimed = { id: randomUUID(), workspaceId: previous.workspaceId, taskId: previous.taskId,
    applicationId: previous.applicationId, agentHostId, attempt: 1, leaseToken: randomUUID(), checkpoint: { stage: "claimed" },
    metadata: { predecessorExecutionId: previous.id } };
  const firstWrite = { schemaVersion: "roost-first-write-admission-v1", executionId: claimed.id,
    workspaceId: claimed.workspaceId, taskId: claimed.taskId, applicationId: claimed.applicationId,
    decisionId: randomUUID(), baselineCommit: x.workspace.expected.head, branch: x.workspace.expected.branch,
    operations: { localCommit: true }, issuedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() };
  const args = { claimed, firstWrite, stateDirectory: x.state, repositoryPath: x.workspace.root, expected: x.workspace.expected,
    async api(route, options) {
      assert.equal(route, `/v1/agent-runtime/executions/${claimed.id}/actions/prior-coding-refusal`);
      assert.deepEqual(options, { method: "POST", body: JSON.stringify({ leaseToken: claimed.leaseToken }) });
      return previous;
    } };
  const deny = a => assert.rejects(observeUnchangedTaskBranch(a), e => e.recoveryReason === "repository_mismatch");
  // This fixture's exact task branch must be selected before native capture.
  assert.equal(x.workspace.expected.branch, `codex/task-${claimed.taskId}`);
  await t.test("Released API lease alone does not qualify an unreconciled native attempt", () => deny(args));
  assert.equal(reconcileNativeArtifacts(issueNativeReconciliationApproval({ directory: x.directory, workspace: x.workspace, assertOwnerAuthority() {} })).completed, true);
  const spentBytes = readFileSync(x.spentPath), reviewBytes = readFileSync(path.join(x.directory, "review.json"));
  await t.test("Real native chain reuses branch without deleting spent record or accepting old result", async () => {
    const observed = await observeUnchangedTaskBranch(args);
    assert.equal(observed.predecessorExecutionId, previous.id); assert.equal(observed.reviewDigest, review.digest);
    assert.ok(readFileSync(x.spentPath).equals(spentBytes)); assert.ok(readFileSync(path.join(x.directory, "review.json")).equals(reviewBytes));
    assert.equal(previous.status, "failed"); assert.equal(observed.dispatchAuthority, undefined);
  });
  for (const [label, target, key, value] of [
    ["foreign current task", "claimed", "taskId", randomUUID()],
    ["foreign current application", "claimed", "applicationId", randomUUID()],
    ["foreign current workspace", "claimed", "workspaceId", randomUUID()],
    ["foreign current host", "claimed", "agentHostId", randomUUID()],
    ["same consumed execution", "claimed", "id", previous.id],
    ["missing current lease", "claimed", "leaseToken", undefined],
    ["foreign predecessor task", "previous", "taskId", randomUUID()],
    ["foreign predecessor application", "previous", "applicationId", randomUUID()],
    ["foreign predecessor host", "previous", "agentHostId", randomUUID()],
    ["nonterminal predecessor", "previous", "status", "running"],
    ["completed candidate predecessor", "previous", "status", "completed"],
    ["live previous lease", "previous", "leaseToken", randomUUID()],
    ["previous output", "previous", "finalResponse", "candidate"],
    ["previous changed paths", "previous", "changedFiles", ["source.txt"]],
    ["old first write reused", "firstWrite", "executionId", previous.id],
    ["expired first write", "firstWrite", "expiresAt", new Date(0).toISOString()],
    ["missing first write expiry", "firstWrite", "expiresAt", undefined],
    ["changed current baseline", "firstWrite", "baselineCommit", "f".repeat(40)],
    ["no local commit authority", "firstWrite", "operations", { localCommit: false }],
    ["existing candidate verification", "firstWrite", "existingCommitVerification", {}],
    ["reviewer correction authority", "firstWrite", "continuation", {}]
  ]) await t.test(label, async () => {
    const c = structuredClone(claimed), f = structuredClone(firstWrite), p = structuredClone(previous);
    ({ claimed: c, firstWrite: f, previous: p })[target][key] = value;
    await deny({ ...args, claimed: c, firstWrite: f, api: async () => p });
  });
  await t.test("Wrong predecessor receipt digest and candidate result revision are refused", async () => {
    const p = structuredClone(previous); p.errorState.details.nativeReviewReceiptDigest = "e".repeat(64);
    await deny({ ...args, api: async () => p }); p.errorState.details.nativeReviewReceiptDigest = review.digest;
    p.metadata.resultRevision = randomUUID(); await deny({ ...args, api: async () => p });
  });
  await t.test("Unsigned review and missing genuine resume chain cannot qualify", async () => {
    const file = path.join(x.directory, "review.json"), record = JSON.parse(reviewBytes);
    try { writeFileSync(file, JSON.stringify({ ...record, signature: "0".repeat(64) })); await deny(args); }
    finally { writeFileSync(file, reviewBytes); }
    const resume = path.join(x.directory, "resume-authorized.json");
    renameSync(resume, resume + ".held"); try { await deny(args); } finally { renameSync(resume + ".held", resume); }
  });
  await t.test("Wrong signed reconciliation phase and missing journal are refused", async () => {
    const file = path.join(x.directory, "reconciliation.json"), bytes = readFileSync(file), j = JSON.parse(bytes);
    const key = readFileSync(path.join(x.directory, "integrity.key"));
    try {
      j.payload.phase = "writer_removed";
      writeFileSync(file, JSON.stringify({ payload: j.payload, signature: createHmac("sha256", key).update(JSON.stringify(j.payload) + "\n").digest("hex") }) + "\n");
      await deny(args);
    } finally { writeFileSync(file, bytes); }
    renameSync(file, file + ".held"); try { await deny(args); } finally { renameSync(file + ".held", file); }
  });
  await t.test("Retained spent drift and missing spent record are refused", async () => {
    try { writeFileSync(x.spentPath, JSON.stringify({ state: "unused", attemptDigest: nativeDigest(b.identity) })); await deny(args); }
    finally { writeFileSync(x.spentPath, spentBytes); }
    renameSync(x.spentPath, x.spentPath + ".held"); try { await deny(args); } finally { renameSync(x.spentPath + ".held", x.spentPath); }
  });
  await t.test("Actual workspace change cannot be adopted", async () => {
    const file = path.join(x.workspace.root, "late.txt"); writeFileSync(file, "unexpected\n");
    try { await deny(args); } finally { unlinkSync(file); }
  });
  await t.test("Unavailable predecessor service fails closed", () => deny({ ...args, api: async () => { throw Error("unavailable"); } }));
});
}
