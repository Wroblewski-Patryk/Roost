// Synthetic preparation/proof-refusal cases. The placeholder Python executable
// is never launched; genuine owned Windows/Python proof is a separate root gate.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, realpathSync, mkdtempSync, rmSync, existsSync, renameSync,
  symlinkSync, unlinkSync, linkSync, lstatSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { prepareCodingTests, runCodingTests, pythonRuntimeInventory, qualifyPythonRuntimeObservation, pythonUnittestCounts } from "./lib/agent-host-coding-tests.mjs";
import { physicalIdentity } from "./lib/agent-host-native-footprint.mjs";

const originUrl = "https://example.invalid/python-fixture.git", relativePath = "backend/tests/test_async_runtime.py",
 sourcePath = "backend/migrations/env.py", configPath = "backend/pyproject.toml", sha = b => createHash("sha256").update(b).digest("hex");
function fixture(t, { writable = true } = {}) {
 const parent = realpathSync.native(os.tmpdir()), root = mkdtempSync(path.join(parent, "roost-python-tests-")), identity = physicalIdentity(root);
 const repositoryPath = path.join(root, "repository"), runtimeRoot = path.join(root, "runtime"), manifestPath = path.join(root, "manifest.json"), links = [];
 t.after(() => { assert.equal(physicalIdentity(root), identity); assert.equal(path.dirname(realpathSync.native(root)), parent);
  assert(path.basename(root).startsWith("roost-python-tests-")); for (const link of links) if (existsSync(link) || lstatSync(link, { throwIfNoEntry: false })) unlinkSync(link);
  rmSync(root, { recursive: true, force: false }); });
 mkdirSync(path.join(repositoryPath, "backend", "migrations"), { recursive: true }); mkdirSync(path.join(repositoryPath, "backend", "tests"));
 writeFileSync(path.join(repositoryPath, sourcePath), "# Synthetic tracked migration source.\n");
 writeFileSync(path.join(repositoryPath, configPath), '[project]\nname="fixture"\n');
 const git = (...args) => execFileSync("git", ["--literal-pathspecs", "-c", "core.hooksPath=", "-c", "core.autocrlf=false", "-c", "commit.gpgsign=false", "-c", "core.fsmonitor=false",
  "-c", "user.name=Synthetic", "-c", "user.email=fixture@example.invalid", ...args],
  { cwd: repositoryPath, windowsHide: true, shell: false, timeout: 10000, maxBuffer: 65536, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
 git("init", "-b", "codex/fixture"); git("add", "--", sourcePath, configPath); git("commit", "-m", "Synthetic Python baseline");
 mkdirSync(path.join(runtimeRoot, "Lib", "site-packages"), { recursive: true });
 const executable = path.join(runtimeRoot, "python.exe"); writeFileSync(executable, "MZ synthetic placeholder; preparation only, never execute.\n");
 writeFileSync(path.join(runtimeRoot, "roost-python-runtime.json"), JSON.stringify({ schemaVersion: "roost-python-unittest-runtime-v1", version: "3.11.9", executable: "python.exe" }));
 writeFileSync(path.join(runtimeRoot, "python311._pth"), ".\nLib\nLib/site-packages\nimport site\n");
 writeFileSync(path.join(runtimeRoot, "Lib", "site-packages", "dependency.py"), "# Synthetic dependency.\n");
 const command = { kind: "python_unittest", relativePath, sourcePaths: [sourcePath], configurationPaths: [configPath], runtimeRoot,
  pythonVersion: "3.11.9", executableIdentity: physicalIdentity(executable, false), executableDigest: sha(readFileSync(executable)), runtimeDigest: pythonRuntimeInventory(runtimeRoot).digest,
  acceptanceTest: `python -I -B ${relativePath}` };
 const manifest = { schemaVersion: "roost-gate2-test-manifest-v1", repositoryOrigin: originUrl, commands: [command] }, save = () => writeFileSync(manifestPath, JSON.stringify(manifest)); save();
 const args = { manifestPath, repositoryPath, originUrl, acceptanceTests: [command.acceptanceTest], writePaths: writable ? [relativePath, configPath] : [relativePath] };
 return { root, repositoryPath, runtimeRoot, executable, command, manifest, args, save, links, git, testFile: path.join(repositoryPath, relativePath),
  prepare: () => prepareCodingTests(args) };
}
const run = proof => runCodingTests(proof, { phase: "candidate", workspaceSeal: "a".repeat(64), remainingMs: () => 30000, assertAuthority: () => {} });

test("pure Python repository needs no npm/package.json and exact future test may be absent", t => {
 const f = fixture(t); assert.ok(f.prepare()); assert.equal(existsSync(path.join(f.repositoryPath, "package.json")), false); assert.equal(existsSync(f.testFile), false);
 assert.throws(() => prepareCodingTests({ ...f.args, writePaths: [configPath] }), /coding_tests_unproven/);
});
test("Python command rejects executable/module/args/env choices and path/scope/label escapes", t => {
 const f = fixture(t);
 for (const change of [{ executable: "python.exe" }, { argv: [] }, { module: "pytest" }, { environment: {} }, { relativePath: "../test_escape.py" },
  { relativePath: "backend/tests/--test.py" }, { sourcePaths: [relativePath] }, { sourcePaths: [sourcePath, sourcePath] }, { sourcePaths: ["backend/missing.py"] },
  { sourcePaths: ["backend/pyproject.toml"] }, { configurationPaths: ["backend/alembic.ini"] }, { runtimeRoot: f.repositoryPath },
  { runtimeRoot: "relative/runtime" }, { runtimeRoot: f.root }, { pythonVersion: "3.10.1" }, { acceptanceTest: f.command.acceptanceTest + " --verbose" }]) {
  f.manifest.commands = [{ ...f.command, ...change }]; f.save(); assert.throws(f.prepare, /coding_tests_unproven/);
 }
});
test("external runtime version marker, executable identity/content and full tree must match sealed manifest", t => {
 for (const surface of ["version", "marker-extra", "exe", "identity", "runtime", "untracked-config"]) {
  const f = fixture(t);
  if (surface === "version") f.command.pythonVersion = "3.11.10";
  if (surface === "marker-extra") writeFileSync(path.join(f.runtimeRoot, "roost-python-runtime.json"), JSON.stringify({ schemaVersion: "roost-python-unittest-runtime-v1", version: "3.11.9", executable: "python.exe", env: {} }));
  if (surface === "exe") writeFileSync(f.executable, "changed");
  if (surface === "identity") f.command.executableIdentity = "f".repeat(64);
  if (surface === "runtime") writeFileSync(path.join(f.runtimeRoot, "Lib", "extra.py"), "extra");
  if (surface === "untracked-config") f.command.configurationPaths = ["pyproject.toml"];
  f.save(); assert.throws(f.prepare, /coding_tests_unproven/, surface);
 }
});
test("tracked Python/config baseline must be unchanged at preparation", t => {
 for (const name of [sourcePath, configPath]) { const f = fixture(t); writeFileSync(path.join(f.repositoryPath, name), "# changed before scope\n"); assert.throws(f.prepare, /coding_tests_unproven/); }
});
test("runtime reparse points, hardlinks, customizers and executable/outside .pth entries are refused", t => {
 for (const surface of ["link", "hardlink", "sitecustomize", "pth-code", "pth-escape"]) {
  const f = fixture(t), dependency = path.join(f.runtimeRoot, "Lib", "site-packages", "dependency.py");
  if (surface === "link") { const outside = path.join(f.root, "outside"), link = path.join(f.runtimeRoot, "Lib", "foreign");
   mkdirSync(outside); writeFileSync(path.join(outside, "dependency.py"), "outside"); symlinkSync(outside, link, "junction"); f.links.push(link); }
  if (surface === "hardlink") { const alias = path.join(f.root, "alias.py"); linkSync(dependency, alias); f.links.push(alias); }
  if (surface === "sitecustomize") writeFileSync(path.join(f.runtimeRoot, "Lib", "sitecustomize.py"), "raise RuntimeError('not admitted')");
  if (surface === "pth-code") writeFileSync(path.join(f.runtimeRoot, "Lib", "site-packages", "unsafe.pth"), "import os; os.system('anything')\n");
  if (surface === "pth-escape") writeFileSync(path.join(f.runtimeRoot, "Lib", "site-packages", "unsafe.pth"), "../../outside\n");
  assert.throws(() => pythonRuntimeInventory(f.runtimeRoot));
 }
});
test("manifest/runtime/nonwritable-source drift refuses before any native Python launch", async t => {
 for (const surface of ["manifest", "runtime", "config", "source", "replacement-root"]) {
  const f = fixture(t, { writable: false }), proof = f.prepare(); writeFileSync(f.testFile, "# Candidate fixture.\n");
  if (surface === "manifest") writeFileSync(f.args.manifestPath, "{}");
  if (surface === "runtime") writeFileSync(path.join(f.runtimeRoot, "Lib", "site-packages", "dependency.py"), "changed");
  if (surface === "config") writeFileSync(path.join(f.repositoryPath, configPath), "changed");
  if (surface === "source") writeFileSync(path.join(f.repositoryPath, sourcePath), "changed");
  if (surface === "replacement-root") { renameSync(f.runtimeRoot, path.join(f.root, "old-runtime")); mkdirSync(f.runtimeRoot); }
  await assert.rejects(run(proof), /coding_tests_unproven/);
 }
});
test("owned fixed probe must report exact actual version/isolation and contained base/search paths", t => {
 const f = fixture(t), runtime = { root: f.runtimeRoot, executable: f.executable, version: "3.11.9" }, report = { version: "3.11.9", executable: f.executable,
  prefix: f.runtimeRoot, basePrefix: f.runtimeRoot, paths: [f.runtimeRoot, path.join(f.runtimeRoot, "Lib")], isolated: true, ignoreEnvironment: true, bytecodeDisabled: true, safePath: true };
 const bytes = v => [Buffer.from(JSON.stringify(v))]; assert.equal(qualifyPythonRuntimeObservation(bytes(report), runtime).version, "3.11.9");
 for (const change of [{ version: "3.11.10" }, { isolated: false }, { ignoreEnvironment: false }, { bytecodeDisabled: false }, { safePath: false },
  { executable: path.join(f.repositoryPath, "python.exe") }, { prefix: f.root }, { basePrefix: f.root }, { paths: [f.root] }, { paths: [f.repositoryPath] }, { paths: [] }, { argv: [] }])
  assert.throws(() => qualifyPythonRuntimeObservation(bytes({ ...report, ...change }), runtime), /coding_tests_unproven/);
});
test("unittest counter captures genuine summary shape for GREEN/RED and refuses empty/skipped/ambiguous output", () => {
 const chunks = s => [Buffer.from(s)];
 assert.deepEqual(pythonUnittestCounts(chunks("test_bridge ... ok\n\nRan 2 tests in 0.010s\n\nOK\n"), 0), { totalTests: 2, passedTests: 2, failedTests: 0, pendingTests: 0 });
 assert.deepEqual(pythonUnittestCounts(chunks("Ran 3 tests in 0.010s\nFAILED (failures=1, errors=1)\n"), 1), { totalTests: 3, passedTests: 1, failedTests: 2, pendingTests: 0 });
 for (const [text, exit] of [["Ran 0 tests in 0.001s\nOK\n", 0], ["Ran 1 test in 0.001s\nOK (skipped=1)\n", 0],
  ["Ran 1 test in 0.001s\nOK\n", 1], ["Ran 1 test in 0.001s\nFAILED (errors=1)\n", 0],
  ["Ran 1 test in 0.001s\nFAILED (errors=1, errors=1)\n", 1], ["Ran 1 test in 0.001s\nFAILED (unexpected successes=1)\n", 1],
  ["Ran 1 test in 0.001s\nOK\nRan 1 test in 0.001s\nOK\n", 0], ["ImportError before unittest discovery\n", 1]])
  assert.throws(() => pythonUnittestCounts(chunks(text), exit), /coding_tests_unproven/);
});
