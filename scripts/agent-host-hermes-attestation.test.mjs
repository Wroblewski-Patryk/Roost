import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, unlink, rmdir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import path from "node:path";
import os from "node:os";
import { attestHermes, runVersionProbe, versionProbeEnvironment } from "./lib/agent-host-hermes-attestation.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const officialPin = contract.registry.providers.find(p => p.kind === "hermes_codex");
async function fixture(run) {
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), "roost-attestation-test-")));
  const checkout = path.join(directory, "checkout"), python = path.join(directory, "python"), probe = path.join(directory, "probe");
  const executable = path.join(checkout, "venv", "Scripts", "hermes.exe");
  const created = [];
  async function file(target, contents) { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, contents); created.push(target); }
  await mkdir(probe); await mkdir(python);
  const source = Buffer.from("synthetic source; no upstream execution");
  const pin = { ...officialPin, sourceHashes: { "source.py": digest(source) } };
  await file(path.join(checkout, "source.py"), source);
  await file(path.join(checkout, ".git", "HEAD"), pin.commit);
  await file(path.join(checkout, "venv", "pyvenv.cfg"), `home = ${python}\ninclude-system-site-packages = false\n`);
  await file(executable, `synthetic launcher\n#!${path.join(checkout, "venv", "Scripts", "python.exe")}\n`);
  await file(path.join(python, "python.exe"), "synthetic python");
  const roots = [];
  for (const [kind, root] of [["checkout", checkout], ["pythonBase", python]]) {
    roots.push({ kind, path: root, files: await Promise.all(created.filter(p => p.startsWith(root + path.sep)).map(async p => ({ path: path.relative(root, p).split(path.sep).join("/"), sha256: digest(await readFile(p)) }))) });
  }
  const manifest = { schemaVersion: 1, source: pin.officialSource, version: pin.version, commit: pin.commit, release: pin.release,
    signature: "unsigned", executable, probeDirectory: probe, roots };
  const manifestPath = path.join(directory, "manifest.json");
  const input = { executablePath: executable, attestation: { manifestPath, sha256: "" } };
  const seal = async () => { const bytes = JSON.stringify(manifest); await writeFile(manifestPath, bytes); input.attestation.sha256 = digest(bytes); };
  await seal(); created.push(manifestPath);
  let probes = 0;
  const deps = { expectedPin: pin, useCache: false, verifyProbe: async () => {}, runVersion: async (exe, options) => {
    probes++; assert.equal(exe, executable); assert.equal(options.env.ROOST_AGENT_API_KEY, undefined);
    return { code: null, output: `Hermes Agent v${pin.version} (2026.9.11)\nInstall directory: PRIVATE_SENTINEL\n` };
  } };
  try { await run({ input, manifest, seal, deps, file, checkout, probe, probes: () => probes }); }
  finally {
    // Remove only files and directories owned by this unique fixture, without recursive deletion.
    for (const p of [...new Set(created)].reverse()) await unlink(p).catch(() => {});
    async function emptyDirs(root) { for (const d of await readdir(root, { withFileTypes: true })) if (d.isDirectory()) await emptyDirs(path.join(root, d.name)); await rmdir(root); }
    await emptyDirs(directory);
  }
}
test("version environment drops credentials, profiles, Python injection and network bypass", () => {
  const env = versionProbeEnvironment("C:\\Fictional\\probe", { SystemRoot: "C:\\Windows", PATH: "SECRET", ROOST_AGENT_API_KEY: "SECRET", OPENAI_API_KEY: "SECRET", PYTHONPATH: "SECRET", USERPROFILE: "SECRET", NO_PROXY: "SECRET", NODE_OPTIONS: "SECRET" });
  assert.equal(JSON.stringify(env).includes("SECRET"), false);
  assert.equal(env.PATH, "C:\\Windows\\System32"); assert.equal(env.HTTPS_PROXY, "http://127.0.0.1:9");
});
test("missing receipt fails without starting a process", async () => assert.deepEqual(await attestHermes({}), { blockers: ["hermes_attestation_missing"] }));
test("verified bytes and version produce safe diagnostics but never task admission", { skip: process.platform !== "win32" }, () => fixture(async f => {
  const result = await attestHermes(f.input, f.deps), projected = contract.projectProvider({ kind: "hermes_codex", ...result });
  assert.equal(result.installation.status, "verified"); assert.equal(f.probes(), 1);
  assert.equal(projected.installedVersion, officialPin.version); assert.equal(projected.executionSupported, false);
  assert.equal(contract.providerAdmissionReason(projected), "hermes_compatibility_unproven");
  assert.equal(JSON.stringify(projected).includes("PRIVATE_SENTINEL"), false);
  assert.equal(JSON.stringify(projected).includes(f.checkout), false);
  assert.deepEqual(contract.projectProvider(projected), projected);
}));
test("heartbeat snapshot keeps its original timestamp; an explicit fresh check detects drift", { skip: process.platform !== "win32" }, () => fixture(async f => {
  const dependencies = { ...f.deps, useCache: true };
  const first = await attestHermes(f.input, dependencies);
  await writeFile(f.input.executablePath, "changed since the startup check");
  assert.deepEqual(await attestHermes(f.input, dependencies), first); assert.equal(f.probes(), 1);
  assert.deepEqual(await attestHermes(f.input, f.deps), { blockers: ["hermes_integrity_mismatch"] });
}));
for (const [label, change, code] of [
  ["manifest digest", async f => { f.input.attestation.sha256 = "0".repeat(64); }, "hermes_attestation_invalid"],
  ["source identity", async f => { f.manifest.source = "https://example.invalid/fork"; await f.seal(); }, "hermes_attestation_invalid"],
  ["commit", async f => { f.manifest.commit = "0".repeat(40); await f.seal(); }, "hermes_attestation_invalid"],
  ["changed executable", async f => { await writeFile(f.input.executablePath, "unknown shim PRIVATE_SENTINEL"); }, "hermes_integrity_mismatch"],
  ["changed source", async f => { await writeFile(path.join(f.checkout, "source.py"), "changed"); }, "hermes_integrity_mismatch"],
  ["extra module", async f => { await f.file(path.join(f.checkout, "sitecustomize.py"), "injection"); }, "hermes_integrity_mismatch"],
  ["receipt traversal", async f => { f.manifest.roots[0].files[0].path = "../outside"; await f.seal(); }, "hermes_integrity_mismatch"],
  ["writable probe", async f => { delete f.deps.verifyProbe; }, "hermes_probe_unsafe"],
  ["wrong version", async f => { f.deps.runVersion = async () => ({ code: null, output: "Hermes Agent v9.9.9 (future)\nSECRET" }); }, "hermes_version_mismatch"],
  ["duplicate banner", async f => { f.deps.runVersion = async () => ({ code: null, output: "Hermes Agent v0.21.2 (a)\nHermes Agent v0.21.2 (b)" }); }, "hermes_version_mismatch"],
  ["process timeout", async f => { f.deps.runVersion = async () => ({ code: "hermes_version_timeout", output: "SECRET" }); }, "hermes_version_timeout"],
  ["private exception", async f => { f.deps.runVersion = async () => { throw Error("PRIVATE_SENTINEL"); }; }, "hermes_attestation_invalid"]
]) test(`attestation rejects ${label}`, { skip: process.platform !== "win32" }, () => fixture(async f => {
  await change(f); const result = await attestHermes(f.input, f.deps);
  assert.deepEqual(result, { blockers: [code] });
  if (!["wrong version", "duplicate banner", "process timeout", "private exception"].includes(label)) assert.equal(f.probes(), 0);
}));
for (const [kind, expected] of [["timeout", "hermes_version_timeout"], ["overflow", "hermes_version_failed"], ["stop failure", "hermes_probe_stop_failed"]]) {
  test(`version subprocess ${kind} is bounded and discards output`, async () => {
    let stopped = 0;
    const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough() });
    const result = await runVersionProbe("PRIVATE_SENTINEL", {}, { timeoutMs: 10,
      spawnProcess: (exe, args, options) => { assert.deepEqual(args, ["--version"]); assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
        if (kind === "overflow") queueMicrotask(() => child.stdout.write("SECRET".repeat(10000))); return child; },
      stop: async () => { stopped++; if (kind === "stop failure") throw Error("SECRET"); child.emit("close", 1); } });
    assert.deepEqual(result, { code: expected, output: "" }); assert.equal(stopped, 1);
  });
}

test("fresh attestation cannot bypass an uncertain diagnostic process stop", { skip: process.platform !== "win32" }, () => fixture(async f => {
  let probes = 0;
  const dependencies = { ...f.deps, runVersion: async () => { probes++; return { code: "hermes_probe_stop_failed", output: "" }; } };
  assert.deepEqual(await attestHermes(f.input, dependencies), { blockers: ["hermes_probe_stop_failed"] });
  assert.deepEqual(await attestHermes(f.input, { ...dependencies, useCache: false }), { blockers: ["hermes_probe_stop_failed"] });
  assert.equal(probes, 1);
}));
