import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, lstatSync, realpathSync } from "node:fs";
import { verifyHermesSplitInventory, installationInventory, assertHermesSplitFreshness } from "./lib/agent-host-hermes-installation-split.mjs";
import { swapHermesEnvironment } from "./lib/agent-host-hermes-rebuild-transaction.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { renderHermesNativeProfile, hermesNativeProfileVersion, hermesLegacyNativeProfileDigest } from "./lib/agent-host-hermes-profile.mjs";
import { sealHermesStartup, hermesStartupEnvironment } from "./lib/agent-host-hermes-startup.mjs";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { verifyHermesDistributions } from "./lib/agent-host-hermes-distributions.mjs";
const sha = b => createHash("sha256").update(b).digest("hex");
function temp(t) {
  const root = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "roost-b16-test-")));
  t.after(() => { assert.equal(path.dirname(root).toLowerCase(), realpathSync.native(os.tmpdir()).toLowerCase()); rmSync(root, { recursive: true, force: true }); });
  return root;
}
function split(t) {
  const root = temp(t), checkout = path.join(root, "checkout"), python = path.join(root, "python");
  mkdirSync(checkout); mkdirSync(python); mkdirSync(path.join(checkout, "__pycache__"));
  writeFileSync(path.join(checkout, "module.py"), "x = 1\n"); writeFileSync(path.join(python, "python.exe"), "synthetic interpreter");
  const row = (r, f) => ({ path: f, size: lstatSync(path.join(r, f)).size, sha256: sha(readFileSync(path.join(r, f))) });
  const manifest = { commit: "a".repeat(40), roots: [{ kind: "checkout", path: checkout, files: [row(checkout, "module.py")] }, { kind: "pythonBase", path: python, files: [row(python, "python.exe")] }] };
  const bytes = Buffer.from(JSON.stringify(manifest)), generation = randomUUID();
  const cachePath = path.join(checkout, "__pycache__/module.cpython-313.pyc"), cache = Buffer.alloc(24);
  cache.write("f30d0d0a", 0, "hex"); cache.writeUInt32LE(Math.floor(lstatSync(path.join(checkout, "module.py")).mtimeMs / 1000) >>> 0, 8); cache.writeUInt32LE(6, 12); writeFileSync(cachePath, cache);
  const entry = () => ({ ...row(checkout, "__pycache__/module.cpython-313.pyc"), source: "module.py", sourceSha256: manifest.roots[0].files[0].sha256, kind: "cpython-313" });
  const generated = { schemaVersion: "roost-hermes-generated-v1", generation, immutableDigest: sha(bytes), interpreterDigest: manifest.roots[1].files[0].sha256, compiler: "cpython-3.13.1-source-verified", roots: [{ kind: "checkout", files: [entry()] }, { kind: "pythonBase", files: [] }] };
  return { root, checkout, python, manifest, bytes, generated, cachePath, cache, entry, verify: () => verifyHermesSplitInventory(manifest, bytes, generated, { generation }) };
}
test("immutable add/change/missing and private-state separation", t => {
  const x = split(t); assert.equal(x.verify().immutableFiles, 2);
  writeFileSync(path.join(x.root, "auth.json"), "private synthetic state outside manifest"); assert.equal(x.verify().inventoryFiles, 3);
  writeFileSync(path.join(x.checkout, "unexpected.py"), "x"); assert.throws(x.verify, /inventory_changed/); rmSync(path.join(x.checkout, "unexpected.py"));
  writeFileSync(path.join(x.checkout, "module.py"), "x = 2\n"); assert.throws(x.verify, /immutable_changed/);
  rmSync(path.join(x.checkout, "module.py")); assert.throws(x.verify, /inventory_changed/);
});
test("inventory admits package code names but never opens credential data", t => {
  const root = temp(t); writeFileSync(path.join(root, "cookies.py"), "# synthetic source"); writeFileSync(path.join(root, "credentials.py"), "# synthetic source");
  assert.equal(installationInventory(root).length, 2);
  writeFileSync(path.join(root, "auth.json"), "private fixture"); assert.throws(() => installationInventory(root), /inventory_unsafe/);
});
test("full SHA observation freshness rejects copies, changed bytes, additions, missing files and regenerated caches", t => {
  const x = split(t), proof = x.verify(); assertHermesSplitFreshness(proof);
  assert.throws(() => assertHermesSplitFreshness(structuredClone(proof)), /observation_unproven/);
  writeFileSync(path.join(x.checkout, "module.py"), "x = 2\n"); assert.throws(() => assertHermesSplitFreshness(proof), /inventory_changed/);
  writeFileSync(path.join(x.checkout, "module.py"), "x = 1\n"); assert.throws(() => assertHermesSplitFreshness(proof), /inventory_changed/);
  const y = split(t), fresh = y.verify(); writeFileSync(path.join(y.checkout, "extra.py"), "extra"); assert.throws(() => assertHermesSplitFreshness(fresh), /inventory_changed/);
  rmSync(path.join(y.checkout, "extra.py")); rmSync(y.cachePath); assert.throws(() => assertHermesSplitFreshness(fresh), /inventory_changed/);
  writeFileSync(y.cachePath, y.cache); assert.throws(() => assertHermesSplitFreshness(fresh), /inventory_changed/);
});
test("generated receipt refresh changes only generated evidence; unexplained body/header/source/orphan fail", t => {
  const x = split(t), immutableBefore = sha(x.bytes); x.verify();
  x.cache[20] = 1; writeFileSync(x.cachePath, x.cache); assert.throws(x.verify, /generated_changed/);
  x.generated.roots[0].files[0] = x.entry(); x.verify(); assert.equal(sha(x.bytes), immutableBefore);
  x.cache[4] = 3; writeFileSync(x.cachePath, x.cache); x.generated.roots[0].files[0] = x.entry(); assert.throws(x.verify, /header_invalid/);
  x.cache[4] = 0; writeFileSync(x.cachePath, x.cache); x.generated.roots[0].files[0] = x.entry();
  x.generated.roots[0].files[0].sourceSha256 = "f".repeat(64); assert.throws(x.verify, /source_changed/);
  x.generated.roots[0].files[0] = x.entry(); writeFileSync(path.join(x.checkout, "__pycache__/orphan.cpython-313.pyc"), x.cache); assert.throws(x.verify, /inventory_changed/);
});
test("generated receipt cannot replay another immutable manifest/generation/interpreter", t => {
  const x = split(t); x.generated.generation = randomUUID(); assert.throws(x.verify, /binding_invalid/);
  assert.throws(() => verifyHermesSplitInventory(x.manifest, Buffer.from("changed"), x.generated, { generation: x.generated.generation }), /binding_invalid/);
});
test("profile v5 has official lazy denial; historical v4 digest remains fixed", () => {
  assert.equal(hermesNativeProfileVersion, "roost-hermes-profile-v5");
  assert.equal(hermesLegacyNativeProfileDigest, "b0f5d12b36e48654ae269cde01140be7bc06cae157cfb70c6393d5127dc0c8c7");
  assert.equal(JSON.parse(renderHermesNativeProfile()).security.allow_lazy_installs, false);
});
test("RECORD supports native Windows separators while rejecting tampering and traversal", t => {
  const root = temp(t), site = path.join(root, "Lib/site-packages"), info = path.join(site, "example-1.dist-info"); mkdirSync(info, { recursive: true });
  const metadata = "Name: example\nVersion: 1\n", record = path.join(info, "RECORD"); writeFileSync(path.join(info, "METADATA"), metadata);
  const entries = `example-1.dist-info\\METADATA,sha256=${createHash('sha256').update(metadata).digest('base64url')},${Buffer.byteLength(metadata)}\nexample-1.dist-info\\RECORD,,\n`;
  writeFileSync(record, entries); assert.equal(verifyHermesDistributions(root, [{ name: "example", version: "1" }]).hashedRows, 1);
  writeFileSync(path.join(info, "METADATA"), metadata + "changed"); assert.throws(() => verifyHermesDistributions(root, [{ name: "example", version: "1" }]), /integrity_changed/);
  writeFileSync(path.join(info, "METADATA"), metadata); writeFileSync(record, "../../../outside.py,,\n");
  assert.throws(() => verifyHermesDistributions(root, [{ name: "example", version: "1" }]), /path_invalid/);
});
test("startup strips ambient target without reading its value and rejects missing/overridden denial", { skip: process.platform !== "win32" }, async t => {
  const x = await nativeFixture(t);
  const source = {}; Object.defineProperty(source, "HERMES_LAZY_INSTALL_TARGET", { enumerable: true, get() { throw new Error("must not read"); } });
  const environment = hermesStartupEnvironment(x.options.provider.profile, source, x.options.repositoryPath);
  assert.equal(environment.HERMES_DISABLE_LAZY_INSTALLS, "1"); assert.equal(Object.hasOwn(environment, "HERMES_LAZY_INSTALL_TARGET"), false);
  for (const mutate of [e => delete e.HERMES_DISABLE_LAZY_INSTALLS, e => { e.HERMES_DISABLE_LAZY_INSTALLS = "0"; }, e => { e.HERMES_LAZY_INSTALL_TARGET = "override"; }]) {
    const candidate = structuredClone(x.checked.candidate); mutate(candidate.environment);
    assert.throws(() => sealHermesStartup({ ...x.checked.options, candidate }), /hermes_startup_(candidate|environment)_invalid/);
  }
});
for (const failure of ["prepared", "staging_verified", "old_renamed", "new_renamed", "metadata_1", "metadata_2", "canonical_verified", null]) {
  test(`atomic rebuild ${failure ?? "success"} preserves old state on every precommit failure`, async t => {
    const root = temp(t), checkout = path.join(root, "checkout"), state = path.join(root, "state"); mkdirSync(checkout); mkdirSync(state);
    const id = randomUUID(), staging = path.join(checkout, `venv.b16-staging-${id}`), rollback = path.join(checkout, `venv.b16-rollback-${id}`);
    mkdirSync(path.join(checkout, "venv")); mkdirSync(staging);
    writeFileSync(path.join(checkout, "venv", "payload"), "old"); writeFileSync(path.join(staging, "payload"), "new");
    const metadata = path.join(root, "binding.json"), added = path.join(root, "generated.json"); writeFileSync(metadata, "old binding");
    const journalPath = path.join(root, "journal.json"), writer = await acquireWriterLock(state);
    const options = { writer, checkout, staging, rollback, journalPath,
      updates: [{ file: metadata, bytes: Buffer.from("new binding") }, { file: added, bytes: Buffer.from("new generated") }],
      excludeProcesses: async () => {}, verifyStaging: async () => assert.equal(readFileSync(path.join(staging, "payload"), "utf8"), "new"),
      verifyCanonical: async () => assert.equal(readFileSync(path.join(checkout, "venv", "payload"), "utf8"), "new"),
      phase: name => { if (name === failure) throw new Error("injected transaction failure"); } };
    try {
      if (failure) await assert.rejects(swapHermesEnvironment(options), /rebuild_rolled_back/);
      else assert.equal((await swapHermesEnvironment(options)).status, "DONE");
      assert.equal(readFileSync(path.join(checkout, "venv", "payload"), "utf8"), failure ? "old" : "new");
      assert.equal(readFileSync(metadata, "utf8"), failure ? "old binding" : "new binding"); assert.equal(existsSync(added), !failure);
      assert.equal(existsSync(staging), false); assert.equal(existsSync(rollback), false);
      await assert.rejects(swapHermesEnvironment(options));
    } finally { await writer.release(); }
  });
}
test("postcommit cleanup failure retains the verified canonical environment and rollback for reconciliation", async t => {
  const root = temp(t), checkout = path.join(root, "checkout"), state = path.join(root, "state"); mkdirSync(checkout); mkdirSync(state);
  const id = randomUUID(), staging = path.join(checkout, `venv.b16-staging-${id}`), rollback = path.join(checkout, `venv.b16-rollback-${id}`);
  mkdirSync(path.join(checkout, "venv")); mkdirSync(staging); writeFileSync(path.join(checkout, "venv", "payload"), "old"); writeFileSync(path.join(staging, "payload"), "new");
  const writer = await acquireWriterLock(state);
  try {
    await assert.rejects(swapHermesEnvironment({ writer, checkout, staging, rollback, journalPath: path.join(root, "journal.json"), updates: [],
      excludeProcesses: async () => {}, verifyStaging: async () => {}, verifyCanonical: async () => {},
      phase: name => { if (name === "cleanup") throw new Error("injected cleanup failure"); } }), /rebuild_cleanup_required/);
    assert.equal(readFileSync(path.join(checkout, "venv", "payload"), "utf8"), "new"); assert.equal(readFileSync(path.join(rollback, "payload"), "utf8"), "old");
    assert.equal(JSON.parse(readFileSync(path.join(root, "journal.json"))).events.at(-1), "committed_cleanup_blocked");
  } finally { await writer.release(); }
});
