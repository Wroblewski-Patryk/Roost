// File-only installation verification. Generated Python code is never imported.
// Receipts are provisioned by explicit maintenance, never learned during admission.
import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync, realpathSync } from "node:fs";
import { z } from "zod";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const relative = z.string().min(1).max(2048).refine(s => !s.includes("\\") && !s.includes(":") && !/[\x00-\x1f]/.test(s)
  && s.split("/").every(p => p && p !== "." && p !== ".." && !/[. ]$/.test(p)));
const file = z.object({ path: relative, sha256: hash, size: z.number().int().nonnegative() }).strict();
const generated = file.extend({ source: relative, sourceSha256: hash, kind: z.enum(["cpython-313", "checkout-fingerprint"]) }).strict();
export const hermesGeneratedReceiptSchema = z.object({
  schemaVersion: z.literal("roost-hermes-generated-v1"), generation: z.string().uuid(),
  immutableDigest: hash, interpreterDigest: hash, compiler: z.literal("cpython-3.13.1-source-verified"),
  roots: z.array(z.object({ kind: z.enum(["checkout", "pythonBase"]), files: z.array(generated).max(60000) }).strict()).length(2)
}).strict();
export const hermesImmutableRootsSchema = z.array(z.object({ kind: z.enum(["checkout", "pythonBase"]),
  path: z.string().min(1), files: z.array(file).min(1).max(60000) }).strict()).length(2);
const deny = reason => { throw Object.assign(new Error(reason), { protocolAdmission: true, retryable: false }); };
export function installationGeneratedPath(name) { return name.endsWith(".pyc") || name === ".bytecode-fingerprint"; }
export function installationInventory(root, relative = "", files = [], excludedRootChild) {
  for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (!relative && name === excludedRootChild) continue;
    if (entry.isSymbolicLink() || /(^|\/)(?:\.env|\.op\.env|auth\.json|credentials?(?:\.json|\.yaml|\.yml)?|cookies?(?:\.json|\.sqlite|\.txt)?|\.codex)(?:\/|$)/i.test(name)) deny("hermes_split_inventory_unsafe");
    if (entry.isDirectory()) installationInventory(root, name, files);
    else if (entry.isFile()) files.push(name); else deny("hermes_split_inventory_unsafe");
    if (files.length > 60000) deny("hermes_split_inventory_limit");
  }
  return files.sort();
}
function physical(file) {
  for (let current = file;; current = path.dirname(current)) {
    if (lstatSync(current).isSymbolicLink()) deny("hermes_split_inventory_unsafe");
    if (current === path.dirname(current)) break;
  }
  if (realpathSync.native(file).toLowerCase() !== file.toLowerCase()) deny("hermes_split_inventory_unsafe");
}
export function verifyGeneratedFile(root, entry, immutable, commit) {
  const source = immutable.get(entry.source);
  if (!source || source.sha256 !== entry.sourceSha256) deny("hermes_generated_source_changed");
  const file = path.join(root, entry.path), bytes = readFileSync(file);
  if (bytes.length !== entry.size || sha(bytes) !== entry.sha256) deny("hermes_generated_changed");
  if (entry.kind === "checkout-fingerprint") {
    if (entry.path !== ".bytecode-fingerprint" || entry.source !== ".git/HEAD" || bytes.toString("utf8") !== `git:HEAD:${commit}`) deny("hermes_generated_fingerprint_invalid");
    return;
  }
  const match = /^(?:(.*)\/)?__pycache__\/([^/]+)\.cpython-313(?:\.opt-[12])?\.pyc$/.exec(entry.path);
  if (!match || `${match[1] ? match[1] + "/" : ""}${match[2]}.py` !== entry.source || bytes.length < 17
      || bytes.subarray(0, 4).toString("hex") !== "f30d0d0a") deny("hermes_generated_mapping_invalid");
  const flags = bytes.readUInt32LE(4);
  // Timestamp mode only in this maintenance policy; hash modes need a separately
  // qualified compiler receipt. Header shape alone never admits new bytecode.
  const stat = lstatSync(path.join(root, entry.source));
  if (flags !== 0 || bytes.readUInt32LE(8) !== (Math.floor(stat.mtimeMs / 1000) >>> 0)
      || bytes.readUInt32LE(12) !== (stat.size >>> 0)) deny("hermes_generated_header_invalid");
}
export function verifyHermesSplitInventory(manifest, manifestBytes, generatedReceipt, record, maintenance) {
  const roots = hermesImmutableRootsSchema.parse(manifest.roots), cache = hermesGeneratedReceiptSchema.parse(generatedReceipt);
  if (cache.immutableDigest !== sha(manifestBytes) || cache.generation !== record.generation
      || roots[0].kind !== "checkout" || roots[1].kind !== "pythonBase"
      || cache.roots[0].kind !== "checkout" || cache.roots[1].kind !== "pythonBase"
      || cache.interpreterDigest !== roots[1].files.find(f => f.path === "python.exe")?.sha256) deny("hermes_split_binding_invalid");
  let count = 0;
  let excluded;
  if (maintenance) {
    assertWriterLock(maintenance.writer);
    physical(maintenance.rollback);
    const stat = lstatSync(maintenance.rollback, { bigint: true });
    if (path.dirname(maintenance.rollback) !== roots[0].path || !/^venv\.b16-rollback-[a-f0-9-]{36}$/.test(path.basename(maintenance.rollback))
        || `${stat.dev}:${stat.ino}` !== maintenance.identity) deny("hermes_split_maintenance_ownership_invalid");
    excluded = path.basename(maintenance.rollback);
  }
  for (let index = 0; index < roots.length; index++) {
    const root = roots[index]; physical(root.path);
    const immutable = new Map(root.files.map(f => [f.path, f])), derived = new Map(cache.roots[index].files.map(f => [f.path, f]));
    if (immutable.size !== root.files.length || derived.size !== cache.roots[index].files.length
        || root.files.some(f => installationGeneratedPath(f.path)) || [...derived.keys()].some(n => !installationGeneratedPath(n))) deny("hermes_split_partition_invalid");
    const names = installationInventory(root.path, "", [], index === 0 ? excluded : undefined);
    if (names.length !== immutable.size + derived.size || names.some(n => !immutable.has(n) && !derived.has(n))) deny("hermes_split_inventory_changed");
    for (const name of names) {
      const target = path.join(root.path, name); physical(target);
      const expected = immutable.get(name), before = lstatSync(target, { bigint: true });
      if (!before.isFile()) deny("hermes_split_inventory_unsafe");
      if (expected) {
        if (before.size !== BigInt(expected.size) || sha(readFileSync(target)) !== expected.sha256) deny("hermes_split_immutable_changed");
      } else verifyGeneratedFile(root.path, derived.get(name), immutable, manifest.commit);
      const after = lstatSync(target, { bigint: true });
      if (before.ino !== after.ino || before.mtimeNs !== after.mtimeNs || before.size !== after.size) deny("hermes_split_inventory_changed");
      count++;
    }
    if (JSON.stringify(installationInventory(root.path, "", [], index === 0 ? excluded : undefined)) !== JSON.stringify(names)) deny("hermes_split_inventory_changed");
  }
  return { inventoryFiles: count, immutableFiles: roots.reduce((n, r) => n + r.files.length, 0),
    generatedFiles: cache.roots.reduce((n, r) => n + r.files.length, 0), generation: cache.generation };
}
