// Original creation evidence in the existing native-review integrity boundary.
// Durable JSON is evidence, never an execution capability.
import path from "node:path";
import { randomBytes, createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, openSync, writeFileSync, fsyncSync, closeSync, lstatSync } from "node:fs";
import { z } from "zod";
import { writerRecoveryEvidence } from "./agent-host-writer-lock.mjs";
import { installationInventory } from "./agent-host-hermes-installation-split.mjs";
import { createNativeOwnedRepositoryTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp, nativeDigest, physicalIdentity } from "./agent-host-native-footprint.mjs";
const h = z.string().regex(/^[a-f0-9]{64}$/), holders = new WeakMap();
const fail = () => { throw Object.assign(Error("native_fixture_ownership_unproven"), { leaseLost: true }); };
const bytes = v => Buffer.from(JSON.stringify(v) + "\n");
const sha = b => createHash("sha256").update(b).digest("hex");
const identitySchema = z.object({ executionId: z.string().uuid(), workspaceId: z.string().uuid(), taskId: z.string().uuid(), applicationId: z.string().uuid(), attempt: z.literal(1) }).strict();
const artifactSchema = z.object({ identity: h, digest: h }).strict();
const birthSchema = z.object({ version: z.literal("roost-fixture-origin-v1"), identity: identitySchema, authorityDigest: h,
  at: z.string().datetime(), expiresAt: z.string().datetime(), nonce: h, rootPath: h, root: h, parent: h, repository: h,
  marker: artifactSchema, writer: artifactSchema, directory: h, state: h, key: h, self: h }).strict();
function artifact(file) {
  const identity = physicalIdentity(file, false), a = lstatSync(file, { bigint: true });
  if (a.size > 12n * 1024n * 1024n) fail();
  const raw = readFileSync(file), b = lstatSync(file, { bigint: true });
  if (a.ino !== b.ino || a.dev !== b.dev || a.ctimeNs !== b.ctimeNs || a.mtimeNs !== b.mtimeNs || a.size !== b.size) fail();
  return { identity, digest: sha(raw), raw };
}
export const fixtureFileBinding = file => { const { identity, digest } = artifact(file); return { identity, digest }; };
export function fixtureRuntimeBinding(file) {
  const identity = physicalIdentity(file, false), before = lstatSync(file, { bigint: true });
  if (before.size > 128n * 1024n * 1024n) fail();
  const digest = sha(readFileSync(file)), after = lstatSync(file, { bigint: true });
  if (before.ino !== after.ino || before.ctimeNs !== after.ctimeNs || before.mtimeNs !== after.mtimeNs || before.size !== after.size) fail();
  return { pathDigest: nativeDigest(file), identity, digest };
}
export const fixtureTaskDigest = identity => nativeDigest(identitySchema.parse(identity));
// File-only physical snapshot. Admission must first verify the approved install
// with its existing opaque installation proof; this is not an approval writer.
export function fixtureInstallationBinding({ attestationPath, manifestPath }) {
  const attestation = JSON.parse(artifact(attestationPath).raw), manifestFile = artifact(manifestPath), manifest = JSON.parse(manifestFile.raw);
  if (manifest.schemaVersion !== 2 || manifest.roots?.length !== 2 || attestation.manifestPath !== manifestPath
      || attestation.manifestSha256 !== manifestFile.digest) fail();
  const generatedFile = artifact(attestation.generatedReceiptPath), generated = JSON.parse(generatedFile.raw);
  if (generatedFile.digest !== attestation.generatedReceiptSha256 || generated.roots?.length !== 2) fail();
  const rows = []; let count = 0;
  for (const [index, root] of manifest.roots.entries()) {
    const rootIdentity = physicalIdentity(root.path), seen = new Set(), parents = new Set(), names = installationInventory(root.path);
    for (const f of [...root.files, ...generated.roots[index].files]) {
      if (++count > 60000 || typeof f.path !== "string" || /[\\:\x00-\x1f]/.test(f.path)
          || f.path.split("/").some(n => !n || n === "." || n === ".." || /[. ]$/.test(n)) || seen.has(f.path)) fail();
      seen.add(f.path); const file = path.join(root.path, f.path), stat = lstatSync(file, { bigint: true });
      // Approved package-manager hardlinks are allowed here, never in fixture.
      const parent = path.dirname(file); if (!parents.has(parent)) { physicalIdentity(parent); parents.add(parent); }
      if (!stat.isFile() || stat.isSymbolicLink()) fail();
      rows.push([rootIdentity, nativeDigest(f.path), ...[stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs, stat.birthtimeNs, stat.mode, stat.nlink].map(String)]);
    }
    if (names.length !== seen.size || names.some(n => !seen.has(n)) || nativeDigest(installationInventory(root.path)) !== nativeDigest(names)) fail();
  }
  return { control: [attestationPath, manifestPath, attestation.generatedReceiptPath].map(file => ({ pathDigest: nativeDigest(file), ...fixtureFileBinding(file) })),
    files: count, physicalDigest: nativeDigest(rows) };
}
function key(directory) { const k = readFileSync(path.join(directory, "integrity.key")); if (k.length !== 32) fail(); return k; }
function signature(directory, payload) { return createHmac("sha256", key(directory)).update("roost-original-fixture-v1\n").update(bytes(payload)).digest("hex"); }
export function writeFixtureEvidence(directory, name, value) {
  if (!["fixture-created.json", "fixture-ready.json", "resume-authorized.json"].includes(name)) fail();
  const file = path.join(directory, name), fd = openSync(file, "wx", 0o600);
  try {
    const payload = { ...value, directory: physicalIdentity(directory), state: physicalIdentity(path.dirname(directory)),
      key: physicalIdentity(path.join(directory, "integrity.key"), false), self: physicalIdentity(file, false) };
    writeFileSync(fd, bytes({ payload, signature: signature(directory, payload) })); fsyncSync(fd);
  } finally { closeSync(fd); }
  return readFixtureEvidence(directory, name);
}
export function readFixtureEvidence(directory, name) {
  if (!["fixture-created.json", "fixture-ready.json", "resume-authorized.json"].includes(name)) fail();
  const file = path.join(directory, name), item = artifact(file), record = JSON.parse(item.raw);
  if (Object.keys(record).sort().join() !== "payload,signature" || !h.safeParse(record.signature).success
      || !timingSafeEqual(Buffer.from(record.signature, "hex"), Buffer.from(signature(directory, record.payload), "hex"))) fail();
  const p = record.payload;
  if (p.directory !== physicalIdentity(directory) || p.state !== physicalIdentity(path.dirname(directory))
      || p.key !== physicalIdentity(path.join(directory, "integrity.key"), false) || p.self !== item.identity) fail();
  return { payload: p, identity: item.identity, digest: item.digest };
}
export function createDurableNativeFixture(parent, { writerLock, identity, authorityDigest, expiresAt }) {
  identity = identitySchema.parse(identity); h.parse(authorityDigest);
  const now = Date.now(), expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now || expiry - now > 3600000) fail();
  const writer = writerRecoveryEvidence(writerLock), directory = path.join(writer.directory, "native-review-" + identity.executionId);
  // Reserving this deterministic directory is exclusive. Partial publication is
  // never adopted/reconstructed, and cannot proceed to provider admission.
  mkdirSync(directory);
  const fd = openSync(path.join(directory, "integrity.key"), "wx", 0o600);
  try { writeFileSync(fd, randomBytes(32)); fsyncSync(fd); } finally { closeSync(fd); }
  const ownership = createNativeOwnedRepositoryTemp(parent, identity.executionId), root = inspectNativeOwnedTemp(ownership, identity.executionId).root;
  const created = writeFixtureEvidence(directory, "fixture-created.json", { version: "roost-fixture-origin-v1", identity, authorityDigest,
    at: new Date(now).toISOString(), expiresAt, nonce: randomBytes(32).toString("hex"), rootPath: nativeDigest(root), root: physicalIdentity(root),
    parent: physicalIdentity(parent), repository: physicalIdentity(path.join(root, "repository")),
    marker: fixtureFileBinding(path.join(root, ".roost-attempt-owner")), writer: fixtureFileBinding(path.join(writer.directory, writer.name)) });
  const proof = Object.freeze({}); holders.set(proof, { directory, root, ownership, identity, created, writerLock, at: now, lifetime: expiry - now, monotonic: performance.now() });
  inspectDurableNativeFixture(proof); return proof;
}
export function readOriginalFixture(directory, root, { historical = false, removed = false } = {}) {
  const r = readFixtureEvidence(directory, "fixture-created.json"), p = birthSchema.parse(r.payload);
  if (Date.parse(p.expiresAt) <= Date.parse(p.at) || Date.parse(p.expiresAt) - Date.parse(p.at) > 3600000
      || !historical && (Date.now() < Date.parse(p.at) || Date.now() >= Date.parse(p.expiresAt))) fail();
  if (p.rootPath !== nativeDigest(root) || p.parent !== physicalIdentity(path.dirname(root))) fail();
  if (!removed && (p.root !== physicalIdentity(root) || p.repository !== physicalIdentity(path.join(root, "repository"))
      || nativeDigest(p.marker) !== nativeDigest(fixtureFileBinding(path.join(root, ".roost-attempt-owner"))))) fail();
  return r;
}
export function inspectDurableNativeFixture(proof) {
  const s = holders.get(proof); if (!s) fail();
  const r = readOriginalFixture(s.directory, s.root), w = writerRecoveryEvidence(s.writerLock);
  if (r.digest !== s.created.digest || performance.now() < s.monotonic || performance.now() - s.monotonic >= s.lifetime || Date.now() < s.at
      || nativeDigest(r.payload.writer) !== nativeDigest(fixtureFileBinding(path.join(w.directory, w.name)))) fail();
  return { root: s.root, directory: s.directory, identity: s.identity, birth: { identity: r.identity, digest: r.digest }, authorityDigest: r.payload.authorityDigest };
}
export function cleanupDurableNativeFixture(proof) {
  inspectDurableNativeFixture(proof); const s = holders.get(proof);
  return cleanupNativeOwnedTemp(s.ownership, s.identity.executionId);
}
