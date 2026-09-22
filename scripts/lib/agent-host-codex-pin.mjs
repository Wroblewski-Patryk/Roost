// Static identity only. Never load/execute a candidate, read Codex home, discover
// credentials, create signing keys or grant launch authority from this record.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { physicalIdentity, nativeDigest } from "./agent-host-native-footprint.mjs";

export const codexPinVersion = "roost-codex-static-pin-v1";
const names = ["codex.exe", "codex-code-mode-host.exe", "codex-command-runner.exe", "codex-windows-sandbox-setup.exe"];
const h = z.string().regex(/^[a-f0-9]{64}$/), version = z.string().regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/);
const fail = (stage = "identity") => { throw Object.assign(Error("codex_runtime_pin_blocked"), { protocolAdmission: true, retryable: false,
  publicMessage: "The exact Codex installation pin is missing or changed.", details: { reason: "codex_runtime_pin_blocked", inspectionStage: stage } }); };
const sha = b => createHash("sha256").update(b).digest("hex");
const env = key => process.env[Object.keys(process.env).find(k => k.toUpperCase() === key)];
function chunk(fd, size, offset) {
  if (!Number.isSafeInteger(size) || size < 0 || size > 1048576 || !Number.isSafeInteger(offset) || offset < 0) fail();
  const b = Buffer.alloc(size); if (fs.readSync(fd, b, 0, size, offset) !== size) fail(); return b;
}
function pe(fd) {
  const dos = chunk(fd, 64, 0); if (dos.toString("ascii", 0, 2) !== "MZ") fail();
  const offset = dos.readUInt32LE(60), header = chunk(fd, 264, offset);
  if (header.readUInt32LE(0) !== 0x4550 || header.readUInt16LE(4) !== 0x8664 || header.readUInt16LE(24) !== 0x20b) fail();
  const count = header.readUInt16LE(6), optional = header.readUInt16LE(20);
  if (count < 1 || count > 96 || optional < 240) fail();
  const sections = chunk(fd, count * 40, offset + 24 + optional);
  const rva = address => {
    for (let i = 0; i < count; i++) { const s = i * 40, start = sections.readUInt32LE(s + 12), bytes = sections.readUInt32LE(s + 16);
      if (address >= start && address < start + bytes) return sections.readUInt32LE(s + 20) + address - start; }
    fail();
  };
  const dll = address => { const bytes = chunk(fd, 256, rva(address)), end = bytes.indexOf(0);
    if (end < 1) fail(); const name = bytes.toString("ascii", 0, end).toLowerCase(); if (!/^[a-z0-9_.-]+\.dll$/.test(name)) fail(); return name; };
  const imports = new Set(), scan = (directory, width, delay) => {
    const address = header.readUInt32LE(24 + 112 + directory * 8); if (!address) return;
    let cursor = rva(address);
    for (let i = 0; i < 128; i++, cursor += width) { const row = chunk(fd, width, cursor); if (row.every(v => v === 0)) return;
      if (delay && row.readUInt32LE(0) !== 1) fail(); imports.add(dll(row.readUInt32LE(delay ? 4 : 12))); }
    fail();
  };
  scan(1, 20, false);
  scan(13, 32, true);
  return { format: "PE32+_AMD64", subsystem: header.readUInt16LE(24 + 68), imports: [...imports].sort(),
    certificateBytes: header.readUInt32LE(24 + 112 + 4 * 8 + 4) };
}
function file(filePath, { executable = false, system = false, findVersion = false, capture = false, maxBytes = 536870912 } = {}) {
  let fd;
  try {
    physicalIdentity(path.dirname(filePath));
    const before = fs.lstatSync(filePath, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || (!system && before.nlink !== 1n) || before.size < 1n || before.size > BigInt(maxBytes)
      || fs.realpathSync.native(filePath).toLowerCase() !== filePath.toLowerCase()) fail();
    fd = fs.openSync(filePath, "r"); const first = fs.fstatSync(fd, { bigint: true });
    if (first.ino !== before.ino || first.size !== before.size || before.dev !== 0n && first.dev !== before.dev) fail();
    const parsed = executable ? pe(fd) : null, hash = createHash("sha256"), buffer = Buffer.alloc(1048576), versions = new Set();
    let used = 0, tail = ""; const captured = [];
    while (used < Number(first.size)) { const n = fs.readSync(fd, buffer, 0, Math.min(buffer.length, Number(first.size) - used), used); if (!n) fail();
      used += n; hash.update(buffer.subarray(0, n));
      if (capture) captured.push(Buffer.from(buffer.subarray(0, n)));
      if (findVersion) { const s = tail + buffer.subarray(0, n).toString("latin1");
        for (const m of s.matchAll(/version: (\d+\.\d+\.\d+(?:-[a-z0-9.]+)?)\nplatform:/g)) versions.add(m[1]); tail = s.slice(-160); }
    }
    const last = fs.fstatSync(fd, { bigint: true }), after = fs.lstatSync(filePath, { bigint: true });
    const stamp = s => [s.ino, s.size, s.mtimeNs, s.ctimeNs, s.nlink].map(String).join(":");
    if (stamp(before) !== stamp(after) || stamp(first) !== stamp(last) || after.ino !== last.ino) fail();
    if (findVersion && versions.size !== 1) fail();
    return { path: filePath, identity: nativeDigest([fs.realpathSync.native(filePath), String(after.dev), String(after.ino)]),
      bytes: used, sha256: hash.digest("hex"), ...(capture ? { body: Buffer.concat(captured) } : {}),
      ...(parsed ? { pe: parsed } : {}), ...(findVersion ? { version: [...versions][0] } : {}) };
  } catch { fail(); } finally { if (fd !== undefined) fs.closeSync(fd); }
}
function resolution(executablePath) {
  const search = env("PATH"), extensions = env("PATHEXT"); if (!search || !extensions || !path.isAbsolute(executablePath)) fail();
  let resolved;
  for (const dir of [process.cwd(), ...search.split(path.delimiter)]) {
    if (!dir || !path.isAbsolute(dir)) fail();
    for (const name of ["codex.exe", "codex.cmd", "codex.bat", "codex.ps1"]) {
      const p = path.join(dir, name); if (fs.existsSync(p)) { resolved = fs.realpathSync.native(p); break; }
    }
    if (resolved) break;
  }
  if (!resolved || resolved.toLowerCase() !== executablePath.toLowerCase()) fail();
  return { requested: "codex", resolvedPathDigest: nativeDigest(resolved), pathDigest: sha(search), pathExtDigest: sha(extensions), shim: "none" };
}

// Returned data is an observation for operator review, never a launch receipt.
export function observeCodexInstallation(executablePath) {
  let stage = "entrypoint";
  try {
    if (process.platform !== "win32" || path.basename(executablePath) !== "codex.exe") fail();
    const root = path.dirname(executablePath), rootIdentity = physicalIdentity(root);
    stage = "path_resolution"; const lookup = resolution(executablePath);
    const artifacts = names.map((name, index) => { stage = "artifact_" + index; return file(path.join(root, name), { executable: true, findVersion: name === "codex.exe" }); });
    stage = "system_dependencies";
    const systemRoot = path.join(env("SYSTEMROOT"), "System32"); physicalIdentity(systemRoot);
    const imports = [...new Set(artifacts.flatMap(x => x.pe.imports))].sort();
    const dependencies = imports.map(name => /^(api|ext)-ms-/.test(name) ? { name, type: "os_api_set" }
      : { name, type: "system32_direct_import", ...file(path.join(systemRoot, name), { system: true }) });
    return { schemaVersion: codexPinVersion, providerKind: "direct_codex", version: artifacts[0].version,
      root, rootIdentity, entrypoint: executablePath, launch: "absolute_native_executable_no_shim", lookup, artifacts, dependencies,
      closure: "static_imports_and_three_known_helpers_only", realLaunchQualified: false, systemIsolation: false };
  } catch { fail(stage); }
}
export function codexInstallationDigest(observation) { return nativeDigest(observation); }
const recordSchema = z.object({ schemaVersion: z.literal(codexPinVersion), pinId: z.string().uuid(), revision: z.number().int().positive(),
  state: z.enum(["observed", "revoked"]), observedAt: z.string().datetime(), expiresAt: z.string().datetime(),
  version, installationDigest: h, observation: z.record(z.unknown()),
  authority: z.literal("observation_only_requires_signed_owner_acceptance"), realIssuerQualified: z.literal(false) }).strict();
// Inventory readback only. No launch/admission module imports this observer.
export function inspectCodexPin(pinPath) {
  try {
    physicalIdentity(pinPath, false); const first = file(pinPath, { maxBytes: 65536, capture: true });
    const bytes = first.body;
    const p = recordSchema.parse(JSON.parse(bytes)), now = Date.now(), start = Date.parse(p.observedAt), end = Date.parse(p.expiresAt);
    if (p.state !== "observed" || start > now || end <= now || end <= start || end - start > 86400000) fail();
    const fresh = observeCodexInstallation(p.observation.entrypoint);
    if (codexInstallationDigest(fresh) !== p.installationDigest || codexInstallationDigest(p.observation) !== p.installationDigest
      || fresh.version !== p.version || file(pinPath, { maxBytes: 65536 }).sha256 !== first.sha256) fail();
    return { schemaVersion: codexPinVersion, pinId: p.pinId, revision: p.revision, receiptDigest: first.sha256,
      installationDigest: p.installationDigest, version: p.version };
  } catch { fail(); }
}
