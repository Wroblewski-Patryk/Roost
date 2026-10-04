import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, realpathSync, readFileSync, symlinkSync, unlinkSync, linkSync } from "node:fs";
import { prepareCodingTests, runCodingTests } from "./lib/agent-host-coding-tests.mjs";
import { createNativeOwnedRepositoryTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";

const originUrl = "https://example.invalid/FormatterFixture.git", relativePath = "src/format.test.ts", source = "src/format.ts";
const acceptanceTest = `node --experimental-strip-types --test -- ${relativePath}`;
const passing = "import test from 'node:test'; import assert from 'node:assert/strict'; import { format } from './format.ts';\n"
  + "test('typed formatter', () => { const value: number = 2; assert.equal(format(value), 'Value: 2'); assert.equal(process.env.OPENAI_API_KEY, undefined); });\n";
function fixture(t, writable = true) {
  const attempt = randomUUID(), owner = createNativeOwnedRepositoryTemp(realpathSync.native(os.tmpdir()), attempt);
  const { root } = inspectNativeOwnedTemp(owner, attempt), repositoryPath = path.join(root, "repository");
  t.after(() => { assert.equal(cleanupNativeOwnedTemp(owner, attempt).remaining, 0); assert.equal(existsSync(root), false); });
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(?:SYSTEMROOT|WINDIR|PATH|PATHEXT|COMSPEC|TEMP|TMP)$/i.test(key)));
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_TERMINAL_PROMPT: "0" });
  const git = (...args) => execFileSync("git", ["--literal-pathspecs", "-c", "core.hooksPath=", "-c", "core.fsmonitor=false", "-c", "commit.gpgsign=false",
    "-c", "user.name=Synthetic fixture", "-c", "user.email=fixture@example.invalid", ...args],
    { cwd: repositoryPath, env, windowsHide: true, shell: false, timeout: 10000, maxBuffer: 65536, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  mkdirSync(path.join(repositoryPath, "src"));
  writeFileSync(path.join(repositoryPath, source), "export function format(value: number): string { return `Value: ${value}`; }\n");
  git("init", "-b", "codex/fixture"); git("add", "--", source); git("commit", "-m", "Synthetic formatter baseline");
  const command = { kind: "node_typescript_test", relativePath, sourcePaths: [source], acceptanceTest };
  const manifest = { schemaVersion: "roost-gate2-test-manifest-v1", repositoryOrigin: originUrl, commands: [command] };
  const manifestPath = path.join(root, "tests.json"), save = () => writeFileSync(manifestPath, JSON.stringify(manifest)); save();
  const args = { manifestPath, repositoryPath, originUrl, acceptanceTests: [acceptanceTest], writePaths: writable ? [relativePath, source] : [relativePath] };
  return { root, repositoryPath, manifest, command, manifestPath, args, save, git,
    testFile: path.join(repositoryPath, relativePath), sourceFile: path.join(repositoryPath, source), prepare: () => prepareCodingTests(args) };
}
const run = (proof, assertAuthority = () => {}) => runCodingTests(proof,
  { phase: "candidate", workspaceSeal: "a".repeat(64), remainingMs: () => 45000, assertAuthority });

test("absent TypeScript test needs exact write scope and no root package or npm", t => {
  const f = fixture(t); assert.equal(existsSync(f.testFile), false); assert.equal(existsSync(path.join(f.repositoryPath, "package.json")), false);
  assert.ok(f.prepare());
  for (const writePaths of [undefined, [], ["src"], ["src/*.test.ts"], ["src/other.test.ts"], [relativePath, relativePath]])
    assert.throws(() => prepareCodingTests({ ...f.args, writePaths }), /coding_tests_unproven/);
  writeFileSync(f.testFile, passing); f.git("add", "--", relativePath); f.git("commit", "-m", "Synthetic existing test");
  assert.throws(() => prepareCodingTests({ ...f.args, writePaths: [source] }), /coding_tests_unproven/);
});

test("malformed paths, command construction and acceptance mismatch fail closed", t => {
  const f = fixture(t);
  for (const change of [{ relativePath: "../foreign.test.ts" }, { relativePath: "--test.test.ts" }, { relativePath: "src/*.test.ts" },
    { relativePath: ".codex/private.test.ts" }, { relativePath: "src/format.test.mjs" }, { sourcePaths: [] },
    { sourcePaths: [source, source] }, { sourcePaths: ["../foreign.ts"] }, { sourcePaths: [relativePath] },
    { acceptanceTest: acceptanceTest + " --watch" }, { executable: process.execPath }, { argv: ["--eval", "1"] }]) {
    f.manifest.commands = [{ ...f.command, ...change }]; f.save(); assert.throws(f.prepare, /coding_tests_unproven/);
  }
});

test("source must exist tracked and unchanged at preparation", t => {
  const f = fixture(t); writeFileSync(f.sourceFile, "export const changed = true;\n");
  assert.throws(f.prepare, /coding_tests_unproven/);
  f.git("checkout", "--", source); writeFileSync(path.join(f.repositoryPath, "src/untracked.ts"), "export const untracked = true;\n");
  f.manifest.commands = [{ ...f.command, sourcePaths: ["src/untracked.ts"] }]; f.save(); assert.throws(f.prepare, /coding_tests_unproven/);
});

test("manifest, protected source, package introduction and unapproved writes prevent native launch", async t => {
  for (const mutation of ["manifest", "source", "package", "nested-package", "unapproved", "binary", "missing"]) {
    const f = fixture(t, false), proof = f.prepare();
    if (mutation !== "missing") writeFileSync(f.testFile, passing);
    if (mutation === "manifest") writeFileSync(f.manifestPath, "{}");
    if (mutation === "source") writeFileSync(f.sourceFile, "export const changed = true;\n");
    if (mutation === "package") writeFileSync(path.join(f.repositoryPath, "package.json"), '{}');
    if (mutation === "nested-package") writeFileSync(path.join(f.repositoryPath, "src/package.json"), '{}');
    if (mutation === "unapproved") writeFileSync(path.join(f.repositoryPath, "unapproved.txt"), "unapproved\n");
    if (mutation === "binary") writeFileSync(f.testFile, Buffer.from([255, 0]));
    await assert.rejects(run(proof), /coding_tests_unproven/, mutation);
  }
});

test("changed current runtime identity or version cannot use an existing proof", async t => {
  const f = fixture(t), proof = f.prepare(); writeFileSync(f.testFile, passing);
  for (const key of ["execPath", "version"]) {
    const descriptor = Object.getOwnPropertyDescriptor(process, key);
    try { Object.defineProperty(process, key, { ...descriptor, value: key === "version" ? "v22.99.99" : path.join(f.root, "unapproved-node.exe") });
      await assert.rejects(run(proof), /coding_tests_unproven/);
    } finally { Object.defineProperty(process, key, descriptor); }
  }
});

test("test symlink is rejected before reading external contents", async t => {
  const f = fixture(t), proof = f.prepare(), outside = path.join(f.root, "outside.ts"); writeFileSync(outside, passing);
  try { symlinkSync(outside, f.testFile, "file"); }
  catch (error) { if (["EPERM", "EACCES"].includes(error.code)) { t.skip("Symlink creation unavailable"); return; } throw error; }
  try { await assert.rejects(run(proof), /coding_tests_unproven/); assert.equal(readFileSync(outside, "utf8"), passing); }
  finally { unlinkSync(f.testFile); }
});

test("test hardlink cannot become an approved test source", async t => {
  const f = fixture(t), proof = f.prepare(), outside = path.join(f.root, "outside.ts"); writeFileSync(outside, passing);
  linkSync(outside, f.testFile);
  try { await assert.rejects(run(proof), /coding_tests_unproven/); assert.equal(readFileSync(outside, "utf8"), passing); }
  finally { unlinkSync(f.testFile); }
});

test("actual native fixed Node22 TypeScript run closes Job and rejects skipped, empty, failed or drifting candidate", {
  skip: process.platform !== "win32" || !/^v22\./.test(process.version), timeout: 120000
}, async t => {
  const f = fixture(t), proof = f.prepare(); writeFileSync(f.testFile, passing);
  // The explicit source write may be edited by coding before its candidate is
  // pinned; it must then remain unchanged throughout verification.
  writeFileSync(f.sourceFile, "export function format(value: number): string { const label: string = 'Value: '; return label + value; }\n");
  const result = await run(proof); assert.equal(result.passed, true); assert.equal(result.tests.length, 1);
  assert.equal(result.tests[0].kind, "node_typescript_test"); assert.equal(result.tests[0].acceptanceTest, acceptanceTest);
  assert.deepEqual(result.tests[0].testCounts, { totalTests: 1, passedTests: 1, failedTests: 0, pendingTests: 0 });
  assert.match(result.tests[0].jobDigest, /^[a-f0-9]{64}$/); assert.equal("output" in result.tests[0], false);
  assert.equal(result.tests[0].runtimeVersion, process.version); assert.match(result.tests[0].runtimeDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.tests[0].sourceDigests[0].relativePath, source); assert.match(result.tests[0].testDigest, /^[a-f0-9]{64}$/);
  await assert.rejects(run(proof), /coding_tests_unproven/);
  f.git("checkout", "--", source);
  for (const testSource of ["import test from 'node:test'; test.skip('skip', () => {});\n", "export const noTests: boolean = true;\n",
    passing + `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(f.sourceFile)}, 'export const drift = true;');\n`,
    passing + `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(f.manifestPath)}, '{}');\n`,
    passing + `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(path.join(f.repositoryPath, "unapproved.txt"))}, 'unapproved');\n`]) {
    const next = f.prepare(); writeFileSync(f.testFile, testSource); await assert.rejects(run(next), /coding_tests_unproven/);
    f.git("checkout", "--", source); f.save();
    const unapproved = path.join(f.repositoryPath, "unapproved.txt"); if (existsSync(unapproved)) unlinkSync(unapproved);
  }
  const failure = f.prepare(); writeFileSync(f.testFile, "import test from 'node:test'; import assert from 'node:assert/strict'; test('failure', () => assert.equal(1, 2));\n");
  const failed = await run(failure); assert.equal(failed.passed, false); assert.equal(failed.tests[0].testCounts.failedTests, 1);
});
