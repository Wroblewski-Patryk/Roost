// Local task template. The complete sealed input and provider output are never
// saved to this repository or returned as diagnostics.
import path from "node:path";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, realpathSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { validPacketFixture, pinReadyFixture } from "./execution-packet.mjs";
import { createNativeOwnedRepositoryTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp, physicalIdentity } from "../lib/agent-host-native-footprint.mjs";
import { createDurableNativeFixture, inspectDurableNativeFixture, cleanupDurableNativeFixture } from "../lib/agent-host-fixture-ownership.mjs";
const initial = "function add(a, b) {\n  return a - b;\n}\nmodule.exports = { add };\n";
const expected = initial.replace("a - b", "a + b");
const tests = "const test = require('node:test');\nconst assert = require('node:assert/strict');\nconst { add } = require('./add.cjs');\ntest('addition', () => {\n  assert.equal(add(2, 3), 5);\n  assert.equal(add(-4, 7), 3);\n  assert.equal(add(0, 9), 9);\n});\n";
const sha = value => createHash("sha256").update(value).digest("hex");
const deny = code => { throw new Error(code); };
function environment() {
  const result = {};
  for (const [key, value] of Object.entries(process.env)) if (["SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "COMSPEC", "TEMP", "TMP"].includes(key.toUpperCase())) result[key] = value;
  return { ...result, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" };
}
function nodeTest(repository) {
  let output, exit;
  try { output = execFileSync(process.execPath, ["--test"], { cwd: repository, env: environment(), windowsHide: true, timeout: 10000,
    maxBuffer: 65536, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); exit = 0; }
  catch (error) { if (!Number.isInteger(error.status)) deny("smoke_test_unavailable"); exit = error.status; output = String(error.stdout ?? ""); }
  return { exit, outputDigest: sha(output), passed: exit === 0 && /# pass 1\b/.test(output) && /# fail 0\b/.test(output),
    failed: exit === 1 && /# fail 1\b/.test(output) };
}
function createFixture(scope, durable) {
  // Regenerate every synthetic identity consistently; no existing application is adopted.
  let encoded = JSON.stringify(validPacketFixture());
  for (const id of new Set(encoded.match(/00000000-0000-4000-8000-\d{12}/g))) encoded = encoded.replaceAll(id, randomUUID());
  const f = JSON.parse(encoded), c = f.packet.contract;
  f.taskContext.executionPacket = f.packet;
  f.claimed.application.name = "ArithmeticSmoke"; f.claimed.application.slug = "arithmetic-smoke";
  f.claimed.application.repositories = [{ url: "https://example.invalid/ArithmeticSmoke.git", isPrimary: true }];
  f.applicationContext.application = f.claimed.application;
  c.objective.outcome = "Correct the add(a,b) implementation in add.cjs.";
  c.singleTask.problems[0].outcome = c.objective.outcome;
  c.singleTask.problems[0].statement = "The addition function subtracts instead of adding.";
  c.scope.allowed = ["Replace only the subtraction operator in add.cjs with addition; preserve all other bytes.", "Inspect add.cjs and add.test.cjs; run node --test; stop after it passes and summarize the changed file and result."];
  c.scope.forbidden = ["Change tests, Git metadata or any other file", "Create repositories, clones, worktrees, external temporary directories or application instances", "Read credentials, secrets or user files", "Use network resources, install dependencies or invoke package managers", "Commit, push, deploy or run destructive Git commands"];
  c.access.restrictions = [...c.scope.forbidden, "Work only in the assigned repository. Inspect only files needed for this task."];
  c.acceptance = { criteria: ["Only the subtraction operator is replaced with addition in add.cjs", "The unchanged test passes"], tests: ["node --test"], evidence: ["Changed filename and test outcome"] };
  c.modelSelection = { model: "gpt-5.6-sol", reasoningEffort: "medium" };
  c.budgets.maxDurationSeconds = 300; c.budgets.maxAttempts = 1;
  c.nativeBoundary = { profile: "coding-local", writePaths: ["add.cjs"], runtime: { required: false, ports: [] } };
  const fixtureOwnership = durable && createDurableNativeFixture(realpathSync.native(os.tmpdir()), { ...durable,
    identity: { executionId: f.claimed.id, workspaceId: f.claimed.workspaceId, taskId: f.claimed.taskId, applicationId: f.claimed.applicationId, attempt: f.claimed.attempt } });
  const ownership = fixtureOwnership ? null : createNativeOwnedRepositoryTemp(realpathSync.native(os.tmpdir()), f.claimed.id);
  const root = fixtureOwnership ? inspectDurableNativeFixture(fixtureOwnership).root : inspectNativeOwnedTemp(ownership, f.claimed.id).root, repository = path.join(root, "repository");
  const cleanup = () => fixtureOwnership ? cleanupDurableNativeFixture(fixtureOwnership) : cleanupNativeOwnedTemp(ownership, f.claimed.id);
  const scopeMarker = scope || durable ? JSON.stringify({ schemaVersion: 1, scope: scope ?? "managed_native_fixture_v1", attemptDigest: sha(f.claimed.id) }) + "\n" : null;
  const git = (...args) => execFileSync("git", ["--literal-pathspecs", "-c", "core.hooksPath=", "-c", "core.fsmonitor=false", "-c", "commit.gpgsign=false", ...args],
    { cwd: repository, env: environment(), windowsHide: true, timeout: 10000, maxBuffer: 65536, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    if (scopeMarker) writeFileSync(path.join(root, ".roost-smoke-scope"), scopeMarker, { flag: "wx", mode: 0o600 });
    git("init"); git("config", "user.name", "Fixture"); git("config", "user.email", "fixture@example.invalid"); git("config", "core.autocrlf", "false");
    writeFileSync(path.join(repository, "add.cjs"), initial); writeFileSync(path.join(repository, "add.test.cjs"), tests);
    const before = nodeTest(repository); if (!before.failed) deny("smoke_baseline_not_failed");
    git("add", "--", "add.cjs", "add.test.cjs"); git("commit", "-m", "Arithmetic fixture baseline");
    git("branch", "-m", c.singleTask.branch); git("remote", "add", "origin", f.claimed.application.repositories[0].url);
    const head = git("rev-parse", "HEAD"), identity = physicalIdentity(repository);
    const prepare = () => {
      f.claimed.startedAt = new Date().toISOString(); pinReadyFixture(f);
      f.taskContext.readyAdmission.riskAdmission.commit = head; f.claimed.metadata.readyContextPin.riskAdmissionCommit = head;
      return f;
    };
    const observe = (requireFix = true) => {
        if (scopeMarker && readFileSync(path.join(root, ".roost-smoke-scope"), "utf8") !== scopeMarker) deny("smoke_scope_marker_changed");
        if (physicalIdentity(repository) !== identity || git("rev-parse", "HEAD") !== head || git("rev-list", "--count", "HEAD") !== "1") deny("smoke_repository_changed");
        for (const name of ["add.cjs", "add.test.cjs"]) physicalIdentity(path.join(repository, name), false);
        const implementation = readFileSync(path.join(repository, "add.cjs"), "utf8"), fixed = implementation === expected;
        if ((!fixed && (requireFix || implementation !== initial)) || readFileSync(path.join(repository, "add.test.cjs"), "utf8") !== tests
            || git("status", "--porcelain=v1", "--untracked-files=all") !== (fixed ? "M add.cjs" : "")) deny("smoke_unexpected_diff");
        // Execute only after exact byte validation, never arbitrary agent-modified tests.
        const after = nodeTest(repository); if (requireFix && !after.passed) deny("smoke_independent_test_failed");
        return { before, after, changedFiles: fixed ? ["add.cjs"] : [], minimalChange: fixed, testUnchanged: true, baselineCommitUnchanged: true,
          implementationDigest: sha(implementation), testDigest: sha(tests), diffDigest: sha(git("diff", "--no-ext-diff", "--no-textconv", "--", "add.cjs")) };
    };
    return { root, repository, ownership, fixtureOwnership, attempt: f.claimed.id, f, before, head, git, prepare,
      verify: () => observe(true), observeUnfixed: () => observe(false),
      cleanup() { const receipt = cleanup(); if (existsSync(root)) deny("smoke_cleanup_incomplete"); return receipt; }
    };
  } catch (error) { cleanup(); throw error; }
}
export const createHermesCodingFixture = durable => createFixture(null, durable);
export const createHermesB17CodingFixture = durable => createFixture("one_real_hermes_coding_smoke_b17_only", durable);
export const createHermesB21CodingFixture = durable => createFixture("one_real_hermes_coding_smoke_b21_only", durable);
