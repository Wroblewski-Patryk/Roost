import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync, existsSync } from "node:fs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { prepareHermesB17Audit, assertHermesB17Audit, reserveHermesB17Audit, closeBlockedHermesB17Audit, prepareHermesB14Audit, reserveHermesB14Audit } from "./lib/agent-host-hermes-b14-audit.mjs";
import { issueHermesB17SmokeActivation, consumeHermesB17SmokeActivation, issueHermesB14SmokeActivation, consumeHermesB14SmokeActivation,
  issueHermesSmokeActivation, consumeHermesSmokeActivation, revokeHermesSmokeActivation, hermesB17SmokeScope } from "./lib/agent-host-hermes-smoke-activation.mjs";
import { collectHermesLaunchProofs, qualifyHermesLaunch } from "./lib/agent-host-hermes-launch-admission.mjs";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { withHermesLaunchFixture } from "./fixtures/hermes-launch.mjs";
import { createHermesB17CodingFixture } from "./fixtures/hermes-coding-smoke.mjs";
import { publishHermesGeneratedReceipt, verifyHermesGeneratedBodies } from "./lib/agent-host-hermes-generated-maintenance.mjs";
import { hermesGeneratedEventAllowed, watchHermesInstallation } from "./lib/agent-host-hermes-installation-watch.mjs";
const windows = { skip: process.platform !== "win32" };
const sha = b => createHash("sha256").update(b).digest("hex");
function root(t) {
  const parent = realpathSync.native(os.tmpdir()), directory = realpathSync.native(mkdtempSync(path.join(parent, "roost-b17-test-")));
  t.after(() => { assert.equal(path.dirname(directory), parent); rmSync(directory, { recursive: true, force: true }); });
  return directory;
}
function state(t) {
  const directory = root(t), before = new Map();
  for (const name of ["b13", "b14"]) {
    const file = path.join(directory, `hermes-${name}-smoke-consumed.json`), bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, state: name === "b13" ? "dispatch_reserved" : "preflight_blocked" }));
    writeFileSync(file, bytes); before.set(file, bytes);
  }
  return { directory, before };
}
test("B17 audit preserves both earlier records, reserves once and rejects replay/restart/JSON/cross-scope", windows, t => {
  const x = state(t), a = prepareHermesB17Audit(x.directory), concurrent = prepareHermesB17Audit(x.directory);
  assert.throws(() => reserveHermesB17Audit(structuredClone(a), {})); assert.throws(() => reserveHermesB14Audit(a, {}));
  const r = reserveHermesB17Audit(a, { executionId: randomUUID() }); assert.equal(r.b17SpentRecordRetained, true);
  assert.equal(JSON.parse(readFileSync(path.join(x.directory, "hermes-b17-smoke-consumed.json"))).scope, hermesB17SmokeScope);
  for (const [file, bytes] of x.before) assert.ok(readFileSync(file).equals(bytes));
  assert.throws(() => reserveHermesB17Audit(a, {})); assert.throws(() => reserveHermesB17Audit(concurrent, {})); assert.throws(() => prepareHermesB17Audit(x.directory));
  writeFileSync([...x.before.keys()][1], "changed"); assert.throws(() => assertHermesB17Audit(a));
});
test("B17 refuses Writer/missing prior evidence and burns terminal preflight failure separately", windows, async t => {
  const x = state(t), writer = await acquireWriterLock(x.directory);
  try { assert.throws(() => prepareHermesB17Audit(x.directory)); } finally { await writer.release(); }
  const a = prepareHermesB17Audit(x.directory); closeBlockedHermesB17Audit(a, { executionId: randomUUID() }, "synthetic_preflight_failure");
  assert.throws(() => reserveHermesB17Audit(a, {}));
  assert.equal(JSON.parse(readFileSync(path.join(x.directory, "hermes-b17-smoke-consumed.json"))).state, "preflight_blocked");
  assert.throws(() => prepareHermesB17Audit(root(t)));
  const other = root(t); writeFileSync(path.join(other, "hermes-b13-smoke-consumed.json"), "prior"); const old = prepareHermesB14Audit(other);
  assert.throws(() => reserveHermesB17Audit(old, {}));
});
test("B17 one-time grant rejects cross-B13/B14/B17, JSON, revocation, changed executable/task/model/workspace", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await nativeFixture(t, { executablePath: fixture.executablePath, edit(f) { f.packet.contract.budgets.maxDurationSeconds = 300; f.packet.contract.nativeBoundary.writePaths = ["add.cjs"]; } });
    const receipt = qualifyHermesLaunch(x.projection, collectHermesLaunchProofs(x.projection, fixture.jobArtifact));
    x.f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: x.envelope.revisions.packet, contextRevision: x.envelope.revisions.context };
    for (const issue of [issueHermesSmokeActivation, issueHermesB14SmokeActivation]) {
      const old = issue(x.projection, receipt, () => {}); assert.throws(() => consumeHermesB17SmokeActivation(old, x.projection, x.options));
    }
    for (const consume of [consumeHermesSmokeActivation, consumeHermesB14SmokeActivation]) {
      const grant = issueHermesB17SmokeActivation(x.projection, receipt, () => {}); assert.throws(() => consume(grant, x.projection, x.options));
      assert.throws(() => consumeHermesB17SmokeActivation(grant, x.projection, x.options));
    }
    const revoked = issueHermesB17SmokeActivation(x.projection, receipt, () => {}); revokeHermesSmokeActivation(revoked);
    assert.throws(() => consumeHermesB17SmokeActivation(revoked, x.projection, x.options));
    for (const modify of [p => { p.provider = { ...p.provider, executablePath: p.provider.executablePath + ".other" }; },
      p => { p.envelope = structuredClone(p.envelope); p.envelope.identity.taskId = randomUUID(); },
      p => { p.envelope = structuredClone(p.envelope); p.envelope.identity.workspaceId = randomUUID(); },
      p => { p.envelope = structuredClone(p.envelope); p.envelope.contract.modelSelection.model = "gpt-6-astra"; }]) {
      const grant = issueHermesB17SmokeActivation(x.projection, receipt, () => {}), altered = { ...x.projection }; modify(altered);
      assert.throws(() => consumeHermesB17SmokeActivation(grant, altered, x.options)); assert.throws(() => consumeHermesB17SmokeActivation(grant, x.projection, x.options));
    }
    const grant = issueHermesB17SmokeActivation(x.projection, receipt, () => {});
    assert.throws(() => consumeHermesB17SmokeActivation(structuredClone(grant), x.projection, x.options));
    const handoff = consumeHermesB17SmokeActivation(grant, x.projection, x.options); assert.equal(handoff.activation.scope, hermesB17SmokeScope);
    assert.throws(() => consumeHermesB17SmokeActivation(grant, x.projection, x.options));
  });
});
test("B17 fixture has a new scope marker, deterministic FAIL, exact minimal repair and owned cleanup", windows, () => {
  const f = createHermesB17CodingFixture();
  try {
    assert.equal(f.before.exit, 1); assert.equal(JSON.parse(readFileSync(path.join(f.root, ".roost-smoke-scope"))).scope, hermesB17SmokeScope);
    const file = path.join(f.repository, "add.cjs"), original = readFileSync(file, "utf8"); writeFileSync(file, original.replace("a - b", "a + b"));
    const verified = f.verify(); assert.equal(verified.after.exit, 0); assert.equal(verified.minimalChange, true);
  } finally { assert.equal(f.cleanup().remaining, 0); assert.equal(existsSync(f.root), false); }
});
for (const fault of ["prepared", "generated_published", "attestation_published", null]) test(`generated-only transaction ${fault ?? "success"} preserves immutable files and rolls back failures`, async t => {
  const directory = root(t), stateDirectory = path.join(directory, "state"); mkdirSync(stateDirectory);
  const attestationPath = path.join(directory, "attestation.json"), generatedPath = path.join(directory, "generated.json"), immutable = path.join(directory, "immutable.json");
  const beforeAttestation = Buffer.from("old attestation"), beforeGenerated = Buffer.from("old generated"), nextAttestation = Buffer.from("next attestation"), nextGenerated = Buffer.from("next generated");
  writeFileSync(attestationPath, beforeAttestation); writeFileSync(generatedPath, beforeGenerated); writeFileSync(immutable, "fixed immutable"); const digest = sha(readFileSync(immutable));
  const writer = await acquireWriterLock(stateDirectory), options = { writer, attestationPath, generatedPath, beforeAttestation, beforeGenerated, nextAttestation, nextGenerated,
    phase: name => { if (name === fault) throw new Error("injected"); } };
  try {
    if (fault) assert.throws(() => publishHermesGeneratedReceipt(options), /injected/); else assert.equal(publishHermesGeneratedReceipt(options).updated, true);
    assert.ok(readFileSync(attestationPath).equals(fault ? beforeAttestation : nextAttestation)); assert.ok(readFileSync(generatedPath).equals(fault ? beforeGenerated : nextGenerated));
    assert.equal(sha(readFileSync(immutable)), digest);
    if (!fault) assert.throws(() => publishHermesGeneratedReceipt(options), /stale/);
  } finally { await writer.release(); }
});
test("installation watcher accepts only source-mapped cache activity, rejects package/launcher/source writes", () => {
  const files = new Set(["module.py", "pkg/part.py", ".git/HEAD"]), directories = new Set(["pkg", ".git"]);
  for (const name of ["__pycache__", "__pycache__/module.cpython-313.pyc", "pkg/__pycache__/part.cpython-313.opt-1.pyc.123", ".bytecode-fingerprint"])
    assert.equal(hermesGeneratedEventAllowed(name, files, directories, "checkout"), true);
  for (const name of ["module.py", "__pycache__/other.cpython-313.pyc", "Lib/site-packages/boto3", "venv/Scripts/hermes.exe", "../outside", null])
    assert.equal(hermesGeneratedEventAllowed(name, files, directories, "checkout"), false);
});
test("isolated pinned compiler proves synthetic cache body equivalence and rejects a forged body", windows, t => {
  const metadata = path.join(process.env.LOCALAPPDATA, "hermes", "roost-installation-attestation.json");
  if (!existsSync(metadata)) { t.skip("optional local pinned interpreter not provisioned"); return; }
  const record = JSON.parse(readFileSync(metadata)), manifest = JSON.parse(readFileSync(record.manifestPath));
  const python = record.pythonExecutable, expected = manifest.roots.find(r => r.kind === "pythonBase").files.find(f => f.path === "python.exe").sha256;
  assert.equal(sha(readFileSync(python)), expected);
  const directory = root(t), source = path.join(directory, "fixture.py"), cache = path.join(directory, "fixture.pyc");
  writeFileSync(source, "value = 17\n");
  execFileSync(python, ["-I", "-S", "-B", "-c", "import sys,marshal; s=sys.argv[1]; b=open(s,'rb').read(); open(sys.argv[2],'wb').write(bytes(16)+marshal.dumps(compile(b,s,'exec',dont_inherit=True,optimize=0)))", source, cache],
    { cwd: directory, env: { SYSTEMROOT: process.env.SystemRoot }, windowsHide: true, timeout: 10000, stdio: "pipe" });
  assert.equal(verifyHermesGeneratedBodies(python, [{ cache, source, optimize: 0 }], directory).verifiedBodies, 1);
  writeFileSync(source, "value = 18\n"); assert.throws(() => verifyHermesGeneratedBodies(python, [{ cache, source, optimize: 0 }], directory), /body_unproven/);
});
test("native installation watcher detects a real immutable write while mapped cache events remain provisional", windows, async t => {
  const directory = root(t), checkout = path.join(directory, "checkout"), python = path.join(directory, "python"), stateDirectory = path.join(directory, "state");
  for (const d of [checkout, python, stateDirectory, path.join(checkout, "__pycache__")]) mkdirSync(d);
  writeFileSync(path.join(checkout, "module.py"), "value = 1\n"); writeFileSync(path.join(python, "python.exe"), "synthetic");
  const manifestPath = path.join(directory, "manifest.json"), attestationPath = path.join(directory, "attestation.json");
  const bytes = JSON.stringify({ schemaVersion: 2, roots: [{ kind: "checkout", path: checkout, files: [{ path: "module.py" }] }, { kind: "pythonBase", path: python, files: [{ path: "python.exe" }] }] });
  writeFileSync(manifestPath, bytes); writeFileSync(attestationPath, JSON.stringify({ manifestSha256: sha(bytes) }));
  const writer = await acquireWriterLock(stateDirectory), watcher = watchHermesInstallation({ installation: { manifestPath, attestationPath }, writer });
  try {
    writeFileSync(path.join(checkout, "__pycache__/module.cpython-313.pyc"), "synthetic provisional cache");
    await new Promise(resolve => setTimeout(resolve, 100)); watcher.assertUnchanged();
    writeFileSync(path.join(checkout, "module.py"), "value = 2\n");
    let blocked = false;
    for (let i = 0; i < 40 && !blocked; i++) { await new Promise(resolve => setTimeout(resolve, 25)); try { watcher.assertUnchanged(); } catch { blocked = true; } }
    assert.equal(blocked, true); assert.equal(watcher.close().observedViolation, true);
  } finally { watcher.close(); await writer.release(); }
});
