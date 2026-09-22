import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import cp from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { randomUUID } from "node:crypto";
import { observeCodexInstallation, inspectCodexPin, codexInstallationDigest, codexPinVersion } from "./lib/agent-host-codex-pin.mjs";

const windows = { skip: process.platform !== "win32" };
// Synthetic bytes test parsing/identity only; never a runnable/publisher proof.
function syntheticPe(main = false) {
  const b = Buffer.alloc(2048); b.write("MZ"); b.writeUInt32LE(128, 60);
  b.writeUInt32LE(0x4550, 128); b.writeUInt16LE(0x8664, 132); b.writeUInt16LE(1, 134);
  b.writeUInt16LE(240, 148); b.writeUInt16LE(0x20b, 152);
  b.writeUInt32LE(0x1000, 404); b.writeUInt32LE(1536, 408); b.writeUInt32LE(512, 412);
  if (main) b.write("version: 0.0.1-test\nplatform:", 512);
  return b;
}
function fixture(t) {
  const parent = fs.realpathSync.native(os.tmpdir()), root = fs.mkdtempSync(path.join(parent, "roost-codex-inventory-"));
  const executable = path.join(root, "codex.exe"), pinPath = path.join(root, "inventory.json");
  const key = Object.keys(process.env).find(k => k.toUpperCase() === "PATH"), original = process.env[key];
  process.env[key] = root + path.delimiter + original;
  t.after(() => { process.env[key] = original; assert.equal(fs.realpathSync.native(root), root);
    assert.equal(path.dirname(root), parent); fs.rmSync(root, { recursive: true }); });
  for (const name of ["codex.exe", "codex-code-mode-host.exe", "codex-command-runner.exe", "codex-windows-sandbox-setup.exe"])
    fs.writeFileSync(path.join(root, name), syntheticPe(name === "codex.exe"));
  const observation = observeCodexInstallation(executable), now = Date.now();
  const record = { schemaVersion: codexPinVersion, pinId: randomUUID(), revision: 1, state: "observed",
    observedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString(), version: observation.version,
    installationDigest: codexInstallationDigest(observation), observation,
    authority: "observation_only_requires_signed_owner_acceptance", realIssuerQualified: false };
  const publish = () => fs.writeFileSync(pinPath, JSON.stringify(record)); publish();
  return { root, executable, pinPath, record, publish };
}
function withoutProcesses(run) {
  const methods = ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync"], originals = new Map(); let starts = 0;
  for (const m of methods) { originals.set(m, cp[m]); cp[m] = () => { starts++; throw Error("unexpected_execution"); }; }
  syncBuiltinESMExports();
  try { run(); assert.equal(starts, 0); }
  finally { for (const [m, f] of originals) cp[m] = f; syncBuiltinESMExports(); }
}
test("static observation validates without executing any candidate", windows, t => {
  const x = fixture(t);
  withoutProcesses(() => {
    const pin = inspectCodexPin(x.pinPath); assert.equal(pin.version, "0.0.1-test");
    assert.equal(x.record.observation.realLaunchQualified, false); assert.equal(x.record.realIssuerQualified, false);
    assert.equal(Object.hasOwn(pin, "grant"), false);
  });
});
const changes = {
  runtimeBytes: x => fs.appendFileSync(x.executable, "drift"),
  helperBytes: x => fs.appendFileSync(path.join(x.root, "codex-command-runner.exe"), "drift"),
  missingHelper: x => fs.unlinkSync(path.join(x.root, "codex-code-mode-host.exe")),
  invalidPe: x => fs.writeFileSync(x.executable, "not a PE"),
  ambiguousVersion: x => fs.appendFileSync(x.executable, "version: 0.0.2-test\nplatform:"),
  forgedDigest: x => { x.record.installationDigest = "f".repeat(64); x.publish(); },
  forgedVersion: x => { x.record.version = "0.0.3"; x.publish(); },
  forgedDependency: x => { x.record.observation.dependencies.push({ name: "invented.dll" }); x.publish(); },
  expired: x => { x.record.expiresAt = x.record.observedAt; x.publish(); },
  revoked: x => { x.record.state = "revoked"; x.publish(); },
  excessiveLifetime: x => { x.record.expiresAt = new Date(Date.now() + 172800000).toISOString(); x.publish(); },
  malformed: x => fs.writeFileSync(x.pinPath, "{"),
  oversized: x => fs.writeFileSync(x.pinPath, Buffer.alloc(65537)),
  shim: x => { x.record.observation.entrypoint = path.join(x.root, "codex.cmd"); x.publish(); },
  renamedInstallation: x => { fs.renameSync(x.executable, x.executable + ".old"); fs.copyFileSync(x.executable + ".old", x.executable); }
};
for (const [name, mutate] of Object.entries(changes)) test(`static inventory refuses ${name}`, windows, t => {
  const x = fixture(t); mutate(x); withoutProcesses(() => assert.throws(() => inspectCodexPin(x.pinPath), /codex_runtime_pin_blocked/));
});
for (const variable of ["PATH", "PATHEXT"]) test(`static inventory refuses ${variable} drift`, windows, t => {
  const x = fixture(t), key = Object.keys(process.env).find(k => k.toUpperCase() === variable), original = process.env[key];
  process.env[key] += variable === "PATH" ? path.delimiter + x.root : ";.NEW";
  try { withoutProcesses(() => assert.throws(() => inspectCodexPin(x.pinPath))); } finally { process.env[key] = original; }
});
test("operator-selected genuine inventory remains observation only", {
  skip: process.platform !== "win32" || !process.env.ROOST_CODEX_PIN_TEST_REFERENCE
}, () => {
  withoutProcesses(() => {
    const pin = inspectCodexPin(path.resolve(process.env.ROOST_CODEX_PIN_TEST_REFERENCE));
    assert.equal(pin.schemaVersion, codexPinVersion); assert.equal(Object.hasOwn(pin, "grant"), false);
  });
});
