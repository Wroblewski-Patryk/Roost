import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validPacketFixture, sealPacket } from "./fixtures/execution-packet.mjs";
import { validateExecutionPacket } from "./lib/agent-host-execution-packet.mjs";
import { hermesTaskToolsets, hermesStartupArgs } from "./lib/agent-host-hermes-startup.mjs";
import { prepareCodeReviewDecision, codeReviewerConfigSchema } from "./lib/agent-host-code-reviewer.mjs";
import { finalizeLocalCommit } from "./lib/agent-host-local-commit.mjs";
import { prepareCodingTests, runCodingTests } from "./lib/agent-host-coding-tests.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { collectWorkspaceEvidence } from "./lib/agent-host-workspace-evidence.mjs";
import { createTaskBranch } from "./lib/agent-host-task-branch.mjs";

const digest = value => createHash("sha256").update(value).digest("hex");
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Roost Test", "-c", "user.email=test@invalid.local", ...args],
  { cwd, encoding: "utf8", windowsHide: true }).trim();

function readonlyFixture(kind = "auditor") {
  const f = validPacketFixture(), c = f.packet.contract;
  c.nativeBoundary = { profile: "inspect-readonly", readPaths: ["README.md"], runtime: { required: false, ports: [] },
    inspectReadOnly: kind === "auditor" ? { kind } : { kind, verifiedExecutionId: randomUUID(),
      verifiedEvidenceDigest: "a".repeat(64) } };
  c.access = { ...c.access, tools: ["repository_read"], permissions: ["repository_read"], sandbox: "read-only" };
  f.packet.procedureComposition.fields.tools = ["repository_read"];
  sealPacket(f.packet);
  return f;
}

test("inspect-readonly packet grants only repository read and Hermes expands no native tools", () => {
  const f = readonlyFixture();
  assert.equal(validateExecutionPacket(f.packet, f.claimed, f.taskContext, f.applicationContext), f.packet);
  assert.deepEqual(hermesTaskToolsets({ contract: f.packet.contract }), ["bot_room"]);
  assert.equal(hermesStartupArgs({ contract: f.packet.contract }).at(-1), "bot_room");
  for (const mutation of [
    c => { c.access.tools.push("repository_write"); },
    c => { c.access.permissions.push("local_test"); },
    c => { c.access.sandbox = "workspace-write"; },
    c => { c.nativeBoundary.readPaths = [".env"]; }
  ]) {
    const bad = readonlyFixture(); mutation(bad.packet.contract); sealPacket(bad.packet);
    assert.throws(() => validateExecutionPacket(bad.packet, bad.claimed, bad.taskContext, bad.applicationContext));
  }
});

test("read-only verifier and code reviewer have explicit evidence links", () => {
  const verifier = readonlyFixture("verifier");
  assert.equal(validateExecutionPacket(verifier.packet, verifier.claimed, verifier.taskContext, verifier.applicationContext), verifier.packet);
  const reviewer = readonlyFixture("verifier");
  reviewer.packet.contract.nativeBoundary.inspectReadOnly = { kind: "code-reviewer", verifiedTaskId: randomUUID(),
    verifiedExecutionId: randomUUID(), verifiedEvidenceDigest: "b".repeat(64),
    baselineCommit: "a".repeat(40), reviewedCommit: "b".repeat(40) };
  sealPacket(reviewer.packet);
  assert.equal(validateExecutionPacket(reviewer.packet, reviewer.claimed, reviewer.taskContext, reviewer.applicationContext), reviewer.packet);
  delete reviewer.packet.contract.nativeBoundary.inspectReadOnly.verifiedTaskId; sealPacket(reviewer.packet);
  assert.throws(() => validateExecutionPacket(reviewer.packet, reviewer.claimed, reviewer.taskContext, reviewer.applicationContext));
});

test("review transport accepts only exact commit and material digest", () => {
  const reviewedCommit = "a".repeat(40), materialVersion = "b".repeat(64), executionId = randomUUID();
  const config = { agentId: randomUUID(), grantId: randomUUID(), credentialTarget: "Roost/Gate2/CodeReviewer",
    certificateFingerprint: "c".repeat(64) };
  assert.equal(codeReviewerConfigSchema.safeParse(config).success, true);
  const review = { reviewedCommit, verifiedEvidenceDigest: materialVersion, verifiedExecutionId: executionId };
  const view = { materialVersion, expectedVersion: "d".repeat(64) };
  const audit = { reviewedCommit, verifiedEvidenceDigest: materialVersion, verifiedExecutionId: executionId };
  const candidate = { decision: "approve", reviewedCommit, evidenceDigest: materialVersion,
    summary: "Exact parser commit accepted", evidence: [{ kind: "test", reference: "guardrails test",
      result: "The suite passed", verdict: "pass" }] };
  const body = prepareCodeReviewDecision({ finalResponse: JSON.stringify(candidate), view, review, config, readOnlyAudit: audit });
  assert.equal(body.reviewedCommit, reviewedCommit); assert.equal(body.executionId, executionId);
  assert.throws(() => prepareCodeReviewDecision({ finalResponse: JSON.stringify({ ...candidate, reviewedCommit: "e".repeat(40) }),
    view, review, config, readOnlyAudit: audit }));
  assert.throws(() => prepareCodeReviewDecision({ finalResponse: JSON.stringify({ ...candidate,
    evidence: [{ kind: "artifact", reference: "diff", result: "reviewed diff" }] }), view, review, config, readOnlyAudit: audit }));
});

test("local finalizer cannot infer commit authority from a coding result", () => {
  assert.throws(() => finalizeLocalCommit({ firstWrite: { operations: { localCommit: false } },
    nativeReviewReceipt: { verdict: "verified_candidate" }, nativeReviewReceiptDigest: "a".repeat(64),
    candidateTests: { passed: true }, workspaceEvidence: {}, writePaths: ["src"] }), /local_commit_unproven/);
});

test("Worker creates exactly the pinned task branch from a clean baseline", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "roost-gate2-branch-"));
  try {
    const taskId = randomUUID(), branch = `codex/task-${taskId}`;
    git(root, "init", "-b", "main");
    git(root, "commit", "--allow-empty", "-m", "Baseline");
    const baseline = git(root, "rev-parse", "HEAD");
    await createTaskBranch(root, branch);
    assert.equal(git(root, "branch", "--show-current"), branch);
    assert.equal(git(root, "rev-parse", "HEAD"), baseline);
    await assert.rejects(createTaskBranch(root, branch), error =>
      error.message === "agent_execution_recovery_blocked" && error.recoveryReason === "repository_mismatch");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("configured npm acceptance test runs in a real owned Windows Job", { skip: process.platform !== "win32", timeout: 30000 }, async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "roost-gate2-test-"));
  try {
    const repo = path.join(root, "repo"), manifestPath = path.join(root, "tests.json");
    mkdirSync(repo); git(repo, "init", "-b", "main"); mkdirSync(path.join(repo, "scripts"));
    const acceptanceTest = "configured smoke test", nodeAcceptance = "focused node test";
    const expectedCommand = "node -e \"process.exit(0)\"";
    writeFileSync(path.join(repo, "package.json"), JSON.stringify({ scripts: { smoke: expectedCommand } }));
    writeFileSync(path.join(repo, "scripts", "smoke.test.mjs"),
      "import test from 'node:test'; import assert from 'node:assert/strict'; test('smoke',()=>assert.equal(1,1));\n");
    git(repo, "add", "--", "package.json", "scripts/smoke.test.mjs"); git(repo, "commit", "-m", "Baseline");
    writeFileSync(manifestPath, JSON.stringify({ schemaVersion: "roost-gate2-test-manifest-v1",
      repositoryOrigin: "https://example.invalid/pilot.git", commands: [{ kind: "npm_script", script: "smoke",
        expectedCommand, acceptanceTest }, { kind: "node_test", relativePath: "scripts/smoke.test.mjs",
        acceptanceTest: nodeAcceptance }] }));
    const proof = prepareCodingTests({ manifestPath, repositoryPath: repo,
      originUrl: "https://example.invalid/pilot.git", acceptanceTests: [acceptanceTest, nodeAcceptance] });
    const result = await runCodingTests(proof, { phase: "candidate", workspaceSeal: "a".repeat(64),
      remainingMs: () => 20000, assertAuthority: () => {} });
    assert.equal(result.passed, true);
    assert.equal(result.tests[0].exitCode, 0);
    assert.equal(result.tests[1].exitCode, 0);
    assert.equal(result.tests[1].relativePath, "scripts/smoke.test.mjs");
    assert.equal(result.tests[0].outputDigest.length, 64);
    await assert.rejects(() => runCodingTests(proof, { phase: "candidate", workspaceSeal: "a".repeat(64),
      remainingMs: () => 20000, assertAuthority: () => {} }), /coding_tests_unproven/);
    writeFileSync(manifestPath, JSON.stringify({ schemaVersion: "roost-gate2-test-manifest-v1",
      repositoryOrigin: "https://example.invalid/pilot.git", commands: [{ kind: "node_test",
        relativePath: "scripts/../outside.test.mjs", acceptanceTest: nodeAcceptance }] }));
    assert.throws(() => prepareCodingTests({ manifestPath, repositoryPath: repo,
      originUrl: "https://example.invalid/pilot.git", acceptanceTests: [nodeAcceptance] }), /coding_tests_unproven/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("local finalizer commits exact observed bytes under a writer lock", { timeout: 30000 }, async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "roost-gate2-commit-"));
  let lock;
  try {
    const repo = path.join(root, "repo"), state = path.join(root, "state"), taskId = randomUUID();
    const branch = `codex/task-${taskId}`;
    mkdirSync(repo); git(repo, "init", "-b", branch);
    mkdirSync(path.join(repo, "src"));
    writeFileSync(path.join(repo, "src", "pilot.txt"), "baseline\n");
    git(repo, "add", "--", "src/pilot.txt"); git(repo, "commit", "-m", "Baseline");
    const baselineCommit = git(repo, "rev-parse", "HEAD");
    writeFileSync(path.join(repo, "src", "pilot.txt"), "candidate\n");
    const workspaceEvidence = await collectWorkspaceEvidence({ repositoryPath: repo, expectedHead: baselineCommit,
      expectedBranch: branch, inputSeal: "a".repeat(64) });
    assert.deepEqual(workspaceEvidence.status, [" M src/pilot.txt"]);
    assert.equal(JSON.stringify(workspaceEvidence).includes("\\u0000"), false);
    assert.equal(workspaceEvidence.manifest[0].working.sha256, digest(readFileSync(path.join(repo, "src", "pilot.txt"))));
    lock = await acquireWriterLock(state);
    const receipt = finalizeLocalCommit({ repositoryPath: repo, writerLock: lock, executionId: randomUUID(),
      taskId, baselineCommit, branch, writePaths: ["src/pilot.txt"],
      firstWrite: { decisionId: randomUUID(), baselineCommit, branch, expiresAt: new Date(Date.now() + 30000).toISOString(),
        operations: { localCommit: true } }, nativeReviewReceipt: { verdict: "verified_candidate" },
      nativeReviewReceiptDigest: "b".repeat(64), candidateTests: { passed: true, digest: "c".repeat(64) },
      workspaceEvidence, assertAuthority: () => {} });
    assert.equal(receipt.commit, git(repo, "rev-parse", "HEAD"));
    assert.equal(git(repo, "rev-parse", "HEAD^1"), baselineCommit);
    assert.deepEqual(receipt.paths, ["src/pilot.txt"]);
    assert.equal(git(repo, "status", "--porcelain=v1"), "");
    assert.equal(git(repo, "show", "HEAD:src/pilot.txt"), "candidate");
    assert.equal(receipt.remotePush, false); assert.equal(receipt.deployment, false);
  } finally { await lock?.release(); rmSync(root, { recursive: true, force: true }); }
});
