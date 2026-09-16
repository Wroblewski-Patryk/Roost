// Source/synthetic diagnosis only. Never invokes an installed provider, reads
// real host state, acquires the global Writer or changes production enforcement.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, renameSync, unlinkSync, rmdirSync,
  realpathSync, existsSync, symlinkSync, lstatSync, readdirSync } from "node:fs";
import { captureNativeFootprint, compareNativeFootprint, createNativeOwnedRepositoryTemp,
  inspectNativeOwnedTemp, cleanupNativeOwnedTemp, physicalIdentity } from "./lib/agent-host-native-footprint.mjs";

const windows = { skip: process.platform !== "win32" };
function fixture(t, { esm = false } = {}) {
  const attempt = randomUUID(), owner = createNativeOwnedRepositoryTemp(realpathSync.native(os.tmpdir()), attempt);
  const { root } = inspectNativeOwnedTemp(owner, attempt), repository = path.join(root, "repository");
  writeFileSync(path.join(root, ".roost-b18-scope"), "synthetic-footprint-diagnosis\n", { flag: "wx" });
  t.after(() => { assert.equal(cleanupNativeOwnedTemp(owner, attempt).remaining, 0); assert.equal(existsSync(root), false); });
  const environment = {};
  for (const key of Object.keys(process.env)) if (["SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "COMSPEC", "TEMP", "TMP"].includes(key.toUpperCase())) environment[key] = process.env[key];
  Object.assign(environment, { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "NUL", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" });
  const run = (command, args) => execFileSync(command, args, { cwd: repository, env: environment,
    windowsHide: true, timeout: 10000, maxBuffer: 65536, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const git = (...args) => run("git", ["--literal-pathspecs", "-c", "core.hooksPath=", "-c", "core.fsmonitor=false", "-c", "commit.gpgsign=false", ...args]).trim();
  git("init"); git("config", "user.name", "Fixture"); git("config", "user.email", "fixture@example.invalid"); git("config", "core.autocrlf", "false");
  const relative = esm ? "src/add.mjs" : "add.cjs", file = path.join(repository, relative);
  if (esm) mkdirSync(path.dirname(file));
  const initial = esm ? "export function add(a, b) {\n  return a - b;\n}\n" : "function add(a, b) {\n  return a - b;\n}\nmodule.exports = { add };\n";
  const tests = esm ? "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from './src/add.mjs';\ntest('addition', () => assert.equal(add(2, 3), 5));\n"
    : "const test = require('node:test');\nconst assert = require('node:assert/strict');\nconst { add } = require('./add.cjs');\ntest('addition', () => {\n  assert.equal(add(2, 3), 5);\n  assert.equal(add(-4, 7), 3);\n  assert.equal(add(0, 9), 9);\n});\n";
  writeFileSync(file, initial); writeFileSync(path.join(repository, esm ? "add.test.mjs" : "add.test.cjs"), tests);
  assert.throws(() => run(process.execPath, ["--test"]), error => error.status === 1);
  git("add", "--", relative, esm ? "add.test.mjs" : "add.test.cjs"); git("commit", "-m", "Synthetic arithmetic baseline");
  git("branch", "-m", "codex/synthetic-footprint"); git("remote", "add", "origin", "https://example.invalid/ArithmeticSmoke.git");
  const expected = { head: git("rev-parse", "HEAD"), branch: "codex/synthetic-footprint", origin: "https://example.invalid/ArithmeticSmoke.git" };
  const capture = () => captureNativeFootprint(repository, expected), before = capture();
  assert.equal(before.digest, capture().digest);
  return { root, repository, file, relative, initial, git, run, capture, before,
    repair() { writeFileSync(file, initial.replace("a - b", "a + b")); },
    compare(allowed = [relative]) { return compareNativeFootprint(before, capture(), allowed); } };
}
const report = (t, name, result) => t.diagnostic(JSON.stringify({ variant: name, ...result }));

for (const esm of [false, true]) test(`B18 normal ${esm ? "src/add.mjs" : "B17 add.cjs"} repair plus node test`, windows, t => {
  const f = fixture(t, { esm }); f.repair(); assert.match(f.run(process.execPath, ["--test"]), /# pass 1\b/);
  const result = f.compare(); assert.deepEqual(result.violations, []); assert.equal(result.changedDigests.length, 1);
  report(t, esm ? "src_repair_and_test" : "b17_shape_repair_and_test", { violations: result.violations, changed: result.changedDigests.length });
});
test("B18 in-place replace and completed atomic replacement stay inside the declared file", windows, t => {
  const f = fixture(t), temporary = f.file + ".b18-tmp";
  writeFileSync(temporary, f.initial.replace("a - b", "a + b")); renameSync(temporary, f.file);
  assert.match(f.run(process.execPath, ["--test"]), /# pass 1\b/);
  const result = f.compare(); assert.deepEqual(result.violations, []); assert.equal(result.changedDigests.length, 1);
  report(t, "completed_atomic_replace", { violations: result.violations, changed: 1 });
});
test("B18 a surviving atomic temporary file is unexpected under the exact-file policy", windows, t => {
  const f = fixture(t); f.repair(); writeFileSync(f.file + ".b18-tmp", "synthetic\n");
  const result = f.compare(); assert.deepEqual(result.violations, ["unexpected_changed_path"]); assert.equal(result.changedDigests.length, 2);
  report(t, "retained_atomic_temp", { violations: result.violations, changed: 2 });
});
test("B18 terminal test and read-only git status introduce no footprint changes", windows, t => {
  const f = fixture(t); assert.throws(() => f.run(process.execPath, ["--test"]), e => e.status === 1);
  f.git("status", "--porcelain=v1", "--untracked-files=all");
  assert.deepEqual(f.compare(), { violations: [], changedDigests: [] });
  report(t, "terminal_test_and_status_optional_locks_off", { violations: [], changed: 0 });
});
test("B18 normal new source fails an exact-file scope but passes an explicitly declared directory", windows, t => {
  const f = fixture(t, { esm: true }); writeFileSync(path.join(f.repository, "src/helper.mjs"), "export const value = 1;\n");
  assert.deepEqual(f.compare().violations, ["unexpected_changed_path"]);
  assert.deepEqual(f.compare(["src"]).violations, []);
  report(t, "new_source", { exactFile: ["unexpected_changed_path"], declaredDirectory: [] });
});
test("B18 protected Git configuration change is metadata drift, not an ordinary write-path violation", windows, t => {
  const f = fixture(t); f.git("config", "b18.synthetic", "true");
  assert.deepEqual(f.compare().violations, ["repository_metadata_or_identity_drift"]);
  report(t, "protected_git_config", { violations: f.compare().violations });
});
test("B18 nested repository-shaped directory is denied and removed only by its creator", windows, t => {
  const f = fixture(t), nested = path.join(f.repository, "nested"), dotgit = path.join(nested, ".git");
  mkdirSync(nested); mkdirSync(dotgit); const identity = physicalIdentity(dotgit);
  try {
    assert.throws(f.capture, /native_extra_repository/);
    report(t, "nested_repository_shape", { captureError: "native_extra_repository", completionMapping: "footprint_unavailable" });
  } finally {
    assert.equal(physicalIdentity(dotgit), identity); assert.deepEqual(readdirSync(dotgit), []); rmdirSync(dotgit);
    assert.deepEqual(readdirSync(nested), []); rmdirSync(nested);
  }
});
test("B18 a junction to an owned external sentinel is denied before target contents are read", windows, t => {
  const f = fixture(t), external = path.join(f.root, "external"), junction = path.join(f.repository, "linked");
  mkdirSync(external); writeFileSync(path.join(external, "sentinel.txt"), "synthetic\n");
  symlinkSync(external, junction, "junction"); const linkId = lstatSync(junction, { bigint: true }).ino;
  try {
    assert.throws(f.capture, /native_(?:reparse_denied|root_invalid)/);
    report(t, "junction", { captureError: "native_reparse_denied", completionMapping: "footprint_unavailable" });
  } finally {
    assert.equal(lstatSync(junction, { bigint: true }).ino, linkId); assert.equal(lstatSync(junction).isSymbolicLink(), true); unlinkSync(junction);
  }
});
test("B18 outside-root content is not proven by the repository footprint", windows, t => {
  const f = fixture(t), external = path.join(f.root, "outside-sentinel.txt");
  // Still inside this test's own marked root; never touch foreign host content.
  writeFileSync(external, "before\n"); const identity = physicalIdentity(external, false), before = f.capture();
  writeFileSync(external, "after\n"); assert.equal(physicalIdentity(external, false), identity);
  assert.deepEqual(compareNativeFootprint(before, f.capture(), [f.relative]), { violations: [], changedDigests: [] });
  report(t, "existing_owned_outside_root_sentinel", { violations: [], coverage: "outside_root_not_observed" });
});
test("B18 secret-named synthetic file is rejected before content hashing", windows, t => {
  const f = fixture(t); writeFileSync(path.join(f.repository, ".env"), "B18_SYNTHETIC_ONLY\n");
  assert.throws(f.capture, /native_scope_invalid/);
  report(t, "secret_named_synthetic_file", { captureError: "native_scope_invalid", completionMapping: "footprint_unavailable" });
});
test("B18 byte-preserving rewrite of an undeclared test can cause unexpected_changed_path", windows, t => {
  const f = fixture(t), file = path.join(f.repository, "add.test.cjs"), temporary = file + ".b18-tmp";
  writeFileSync(temporary, readFileSync(file)); renameSync(temporary, file);
  assert.equal(f.git("status", "--porcelain=v1"), "");
  assert.deepEqual(f.compare().violations, ["unexpected_changed_path"]);
  report(t, "undeclared_byte_identical_atomic_rewrite", { gitDirty: false, violations: ["unexpected_changed_path"] });
});
