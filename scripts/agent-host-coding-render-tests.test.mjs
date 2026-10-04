import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, realpathSync, readFileSync, symlinkSync, unlinkSync, linkSync, cpSync, renameSync, mkdtempSync, rmSync, lstatSync, readdirSync } from "node:fs";
import { prepareCodingTests, runCodingTests } from "./lib/agent-host-coding-tests.mjs";
import { physicalIdentity } from "./lib/agent-host-native-footprint.mjs";

const originUrl = "https://example.invalid/RenderedFixture.git", relativePath = "web/scripts/activity.test.ts";
const source = "web/src/activity.tsx", model = "web/src/model.ts";
const acceptanceTest = `node --experimental-strip-types --test -- ${relativePath}`;
const component = "export function Activity({items, emptyLabel}: {items: Array<{title:string;when:string}>;emptyLabel:string}) {\n"
  + "return items.length ? <div>{items.map((item,index)=><article key={index} className='activity-row'><p>{item.title}</p><time>{item.when}</time></article>)}</div> : <p className='activity-empty'>{emptyLabel}</p>; }\n";
const passing = `import test from 'node:test'; import assert from 'node:assert/strict';
import { createRequire } from 'node:module'; import { readFileSync } from 'node:fs'; import path from 'node:path';
const require = createRequire(path.join(process.env.ROOST_TEST_DEPENDENCY_ROOT!, 'package.json'));
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server'), ts = require('typescript');
const transpiled = ts.transpileModule(readFileSync(new URL('../src/activity.tsx', import.meta.url), 'utf8'), {
  compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}, fileName: 'activity.tsx'
}).outputText;
const shim = {exports: {} as any}; new Function('require','exports','module',transpiled)(require, shim.exports, shim);
test('empty actual activity renders neutral copy and no invented rows', () => {
  const html = renderToStaticMarkup(React.createElement(shim.exports.Activity, {items:[],emptyLabel:'No data yet.'}));
  assert.match(html, /No data yet\./); assert.doesNotMatch(html, /activity-row|<article/);
  assert.equal(process.env.OPENAI_API_KEY, undefined); assert.equal(process.env.NODE_OPTIONS, undefined);
  assert.equal(process.env.ROOST_ARBITRARY_TEST_ENV, undefined);
});
test('populated actual activity renders title and time without empty copy', () => {
  const html = renderToStaticMarkup(React.createElement(shim.exports.Activity, {items:[{title:'Actual event',when:'Unknown time'}],emptyLabel:'No data yet.'}));
  assert.match(html, /Actual event/); assert.match(html, /Unknown time/); assert.doesNotMatch(html, /No data yet\./);
  assert.equal((html.match(/class="activity-row"/g)||[]).length, 1);
});
`;
function fixture(t, { real = false, writable = true } = {}) {
  const parent = realpathSync.native(os.tmpdir()), root = mkdtempSync(path.join(parent, "roost-render-fixture-"));
  const identity = physicalIdentity(root), repositoryPath = path.join(root, "repository"), toolkit = path.join(root, "toolkit");
  t.after(() => {
    assert.equal(physicalIdentity(root), identity); assert.equal(path.dirname(realpathSync.native(root)), parent);
    assert.ok(path.basename(root).startsWith("roost-render-fixture-"));
    function inspect(directory) {
      for (const name of readdirSync(directory)) {
        const filename = path.join(directory, name), stat = lstatSync(filename);
        assert.equal(stat.isSymbolicLink(), false);
        if (stat.isDirectory()) inspect(filename); else assert.equal(stat.nlink, 1);
      }
    }
    inspect(root); rmSync(root, { recursive: true, force: false }); assert.equal(existsSync(root), false);
  });
  mkdirSync(path.join(repositoryPath, "web", "src"), { recursive: true }); mkdirSync(path.join(repositoryPath, "web", "scripts"));
  writeFileSync(path.join(repositoryPath, source), component); writeFileSync(path.join(repositoryPath, model), "export const actual = true;\n");
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(?:SYSTEMROOT|WINDIR|PATH|PATHEXT|COMSPEC|TEMP|TMP)$/i.test(key)));
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_TERMINAL_PROMPT: "0" });
  const git = (...args) => execFileSync("git", ["--literal-pathspecs", "-c", "core.hooksPath=", "-c", "core.fsmonitor=false", "-c", "commit.gpgsign=false",
    "-c", "user.name=Synthetic fixture", "-c", "user.email=fixture@example.invalid", ...args],
    { cwd: repositoryPath, env, windowsHide: true, shell: false, timeout: 10000, maxBuffer: 65536, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "codex/fixture"); git("add", "--", source, model); git("commit", "-m", "Synthetic activity baseline");
  mkdirSync(path.join(toolkit, "node_modules"), { recursive: true });
  const packages = {}, pending = ["react", "react-dom", "typescript"], versions = {};
  while (pending.length) {
    const name = pending.pop(); if (packages[`node_modules/${name}`]) continue;
    const installed = real ? realpathSync.native(path.resolve("node_modules", name)) : null;
    const pkg = real ? JSON.parse(readFileSync(path.join(installed, "package.json"))) : { name, version: name === "typescript" ? "5.9.3" : "18.3.1" };
    const destination = path.join(toolkit, "node_modules", name);
    if (real) cpSync(installed, destination, { recursive: true, dereference: true });
    else { mkdirSync(destination, { recursive: true }); writeFileSync(path.join(destination, "package.json"), JSON.stringify(pkg)); writeFileSync(path.join(destination, "index.js"), "// Preparation-only fixture.\n"); }
    packages[`node_modules/${name}`] = { version: pkg.version, ...(pkg.dependencies ? { dependencies: pkg.dependencies } : {}) };
    if (["react", "react-dom", "typescript"].includes(name)) versions[name === "react-dom" ? "reactDom" : name] = pkg.version;
    pending.push(...Object.keys(pkg.dependencies ?? {}));
  }
  const dependencies = { react: versions.react, "react-dom": versions.reactDom, typescript: versions.typescript };
  writeFileSync(path.join(toolkit, "package.json"), JSON.stringify({ name: "synthetic-render-toolkit", private: true, dependencies }));
  writeFileSync(path.join(toolkit, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { "": { dependencies }, ...packages } }));
  writeFileSync(path.join(toolkit, "node_modules", ".package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages }));
  const command = { kind: "node_typescript_render_test", relativePath, sourcePaths: [model, source], dependencyRoot: toolkit, versions, acceptanceTest };
  const manifest = { schemaVersion: "roost-gate2-test-manifest-v1", repositoryOrigin: originUrl, commands: [command] };
  const manifestPath = path.join(root, "tests.json"), save = () => writeFileSync(manifestPath, JSON.stringify(manifest)); save();
  const args = { manifestPath, repositoryPath, originUrl, acceptanceTests: [acceptanceTest], writePaths: writable ? [relativePath, source] : [relativePath] };
  return { root, repositoryPath, toolkit, manifestPath, manifest, command, args, save, git, testFile: path.join(repositoryPath, relativePath),
    sourceFile: path.join(repositoryPath, source), prepare: () => prepareCodingTests(args) };
}
const run = (proof, assertAuthority = () => {}) => runCodingTests(proof,
  { phase: "candidate", workspaceSeal: "a".repeat(64), remainingMs: () => 60000, assertAuthority });

test("render preparation admits exact tracked TS/TSX, new test scope and declared external toolkit", t => {
  const f = fixture(t); assert.ok(f.prepare()); assert.equal(existsSync(f.testFile), false);
  for (const change of [{ dependencyRoot: "relative/toolkit" }, { dependencyRoot: f.repositoryPath },
    { sourcePaths: [source, source] }, { sourcePaths: ["web/src/untracked.tsx"] }, { sourcePaths: [relativePath] },
    { sourcePaths: ["../outside.tsx"] }, { relativePath: "web/scripts/activity.test.tsx" },
    { acceptanceTest: acceptanceTest + " --watch" }, { versions: { ...f.command.versions, react: "^18.3.1" } },
    { versions: { ...f.command.versions, reactDom: "18.3.0" } }, { env: {} }, { argv: [] }, { executable: process.execPath }]) {
    f.manifest.commands = [{ ...f.command, ...change }]; f.save(); assert.throws(f.prepare, /coding_tests_unproven/);
  }
  f.manifest.commands = [f.command]; f.save();
  assert.throws(() => prepareCodingTests({ ...f.args, writePaths: [source] }), /coding_tests_unproven/);
  // The existing plain TypeScript variant still refuses TSX and toolkit fields.
  f.manifest.commands = [{ kind: "node_typescript_test", relativePath, sourcePaths: [source], acceptanceTest }]; f.save();
  assert.throws(f.prepare, /coding_tests_unproven/);
});

test("toolkit extras, lock mismatch, undeclared package, bin wrappers and package version mismatch are rejected", t => {
  for (const mutation of ["root-extra", "module-extra", "bin", "version", "lock-version", "root-dependency", "hidden-lock", "extra-lock-package"]) {
    const f = fixture(t);
    if (mutation === "root-extra") writeFileSync(path.join(f.toolkit, ".npmrc"), "registry=unapproved");
    if (mutation === "module-extra") mkdirSync(path.join(f.toolkit, "node_modules", "extra"));
    if (mutation === "bin") mkdirSync(path.join(f.toolkit, "node_modules", ".bin"));
    if (mutation === "version") writeFileSync(path.join(f.toolkit, "node_modules", "react", "package.json"), JSON.stringify({ name: "react", version: "18.3.0" }));
    if (mutation === "lock-version") writeFileSync(path.join(f.toolkit, "package-lock.json"), JSON.stringify({ lockfileVersion: 2 }));
    if (mutation === "root-dependency") writeFileSync(path.join(f.toolkit, "package.json"), JSON.stringify({ private: true, dependencies: { react: "^18.3.1" } }));
    if (mutation === "hidden-lock") writeFileSync(path.join(f.toolkit, "node_modules", ".package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: {} }));
    if (mutation === "extra-lock-package") {
      const file = path.join(f.toolkit, "package-lock.json"), lock = JSON.parse(readFileSync(file));
      lock.packages["node_modules/extra"] = { version: "1.0.0" }; writeFileSync(file, JSON.stringify(lock));
    }
    assert.throws(f.prepare, /coding_tests_unproven/, mutation);
  }
});

test("manifest, protected TSX, complete toolkit content/config/inventory and root identity drift prevent launch", async t => {
  for (const mutation of ["manifest", "source", "dependency", "config", "extra", "root"]) {
    const f = fixture(t, { writable: false }), proof = f.prepare(); writeFileSync(f.testFile, passing);
    if (mutation === "manifest") writeFileSync(f.manifestPath, "{}");
    if (mutation === "source") writeFileSync(f.sourceFile, component + "// drift\n");
    if (mutation === "dependency") writeFileSync(path.join(f.toolkit, "node_modules", "react", "index.js"), "// drift");
    if (mutation === "config") writeFileSync(path.join(f.toolkit, "package.json"), "{}");
    if (mutation === "extra") writeFileSync(path.join(f.toolkit, "node_modules", "typescript", "extra.js"), "// extra");
    if (mutation === "root") {
      const replacement = path.join(f.root, "replacement"), retained = path.join(f.root, "retained-toolkit");
      assert.equal(path.dirname(replacement), f.root); assert.equal(path.dirname(retained), f.root);
      cpSync(f.toolkit, replacement, { recursive: true }); renameSync(f.toolkit, retained); renameSync(replacement, f.toolkit);
    }
    await assert.rejects(run(proof), /coding_tests_unproven/, mutation);
  }
});

test("render dependency and source hardlinks are refused", t => {
  for (const surface of ["dependency", "source"]) {
    const f = fixture(t), filename = surface === "dependency" ? path.join(f.toolkit, "node_modules", "react", "index.js") : f.sourceFile;
    const alias = path.join(f.root, `alias-${surface}`); linkSync(filename, alias);
    try { assert.throws(f.prepare, /coding_tests_unproven/); } finally { unlinkSync(alias); }
  }
});

test("large composition sources are bounded independently of tests and dependency inventory", t => {
  const f = fixture(t); writeFileSync(f.sourceFile, component + "//" + "x".repeat(260000));
  f.git("add", "--", source); f.git("commit", "-m", "Synthetic large composition source"); assert.ok(f.prepare());
  writeFileSync(f.sourceFile, component + "//" + "x".repeat(1024 * 1024));
  f.git("add", "--", source); f.git("commit", "-m", "Synthetic oversized composition source");
  assert.throws(f.prepare, /coding_tests_unproven/);
  f.git("checkout", "HEAD~1", "--", source);
  f.git("commit", "-m", "Restore synthetic bounded source");
  const large = path.join(f.toolkit, "node_modules", "typescript", "oversized.js");
  writeFileSync(large, Buffer.alloc(16 * 1024 * 1024 + 1)); assert.throws(f.prepare, /coding_tests_unproven/); unlinkSync(large);
  let deep = path.join(f.toolkit, "node_modules", "typescript");
  for (let index = 0; index < 16; index++) { deep = path.join(deep, "nested"); mkdirSync(deep); }
  assert.throws(f.prepare, /coding_tests_unproven/);
});

test("toolkit root junction and nested module resolution are refused", t => {
  const f = fixture(t), retained = path.join(f.root, "junction-target");
  renameSync(f.toolkit, retained);
  try { symlinkSync(retained, f.toolkit, process.platform === "win32" ? "junction" : "dir"); }
  catch (error) { if (["EPERM", "EACCES"].includes(error.code)) { t.skip("Directory symlink creation unavailable"); return; } throw error; }
  try { assert.throws(f.prepare, /coding_tests_unproven/); } finally { unlinkSync(f.toolkit); }
  renameSync(retained, f.toolkit); mkdirSync(path.join(f.toolkit, "node_modules", "react", "node_modules"));
  assert.throws(f.prepare, /coding_tests_unproven/);
});

test("external dependency and source symlinks cannot escape declared roots", t => {
  for (const surface of ["dependency", "source"]) {
    const f = fixture(t), filename = surface === "dependency" ? path.join(f.toolkit, "node_modules", "react", "index.js") : f.sourceFile;
    const outside = path.join(f.root, "external.tsx"); writeFileSync(outside, readFileSync(filename)); unlinkSync(filename);
    try { symlinkSync(outside, filename, "file"); }
    catch (error) { if (["EPERM", "EACCES"].includes(error.code)) { t.skip("Symlink creation unavailable"); return; } throw error; }
    try { assert.throws(f.prepare, /coding_tests_unproven/); } finally { unlinkSync(filename); }
  }
});

test("real ReactDOM SSR runs in fixed Node22 Windows Job, attests exact markup assertions and closes descendants", {
  skip: process.platform !== "win32" || !/^v22\./.test(process.version), timeout: 180000
}, async t => {
  const f = fixture(t, { real: true }), proof = f.prepare(); writeFileSync(f.testFile, passing);
  // Only the granted TSX is mutable before the candidate is captured.
  writeFileSync(f.sourceFile, component + "// candidate component\n");
  const result = await run(proof); assert.equal(result.passed, true);
  const report = result.tests[0]; assert.equal(report.kind, "node_typescript_render_test");
  assert.deepEqual(report.testCounts, { totalTests: 2, passedTests: 2, failedTests: 0, pendingTests: 0 });
  assert.deepEqual(report.dependencyVersions, f.command.versions); assert.ok(report.dependencyBytes > 23 * 1024 * 1024);
  assert.ok(report.dependencyFileCount > 100); assert.equal(report.sourceDigests[1].relativePath, source);
  for (const key of ["dependencyDigest", "jobDigest", "testDigest", "runtimeDigest"]) assert.match(report[key], /^[a-f0-9]{64}$/);
  assert.equal("dependencyRoot" in report, false); assert.equal("output" in report, false);
  await assert.rejects(run(proof), /coding_tests_unproven/);
  f.git("checkout", "--", source);
  // Registered assertions must exist; a passing file wrapper is insufficient.
  for (const text of ["export const noAssertions = true;\n", "import test from 'node:test'; test.skip('skip',()=>{});\n"]) {
    const next = f.prepare(); writeFileSync(f.testFile, text); await assert.rejects(run(next), /coding_tests_unproven/);
  }
  // Passing assertions cannot hide mutation of candidate source or dependencies.
  for (const surface of ["source", "dependency", "manifest"]) {
    const target = surface === "source" ? f.sourceFile : surface === "manifest" ? f.manifestPath : path.join(f.toolkit, "node_modules", "react", "index.js");
    const original = readFileSync(target), next = f.prepare();
    writeFileSync(f.testFile, passing + `\nimport {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(target)}, '// mutation after assertions');\n`);
    await assert.rejects(run(next), /coding_tests_unproven/, surface); writeFileSync(target, original);
  }
});
