import path from "node:path";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { nativeDigest, physicalIdentity } from "./agent-host-native-footprint.mjs";
const fail = code => { throw Error(code); };
export function b26Exists(file) { try { lstatSync(file); return true; } catch (e) { if (e.code === "ENOENT") return false; throw e; } }
export function b26Inventory(root) {
  const rows = [], paths = new Map(); let total = 0;
  function visit(file, rel, depth) {
    if (depth > 24 || rows.length >= 512 || path.resolve(file) !== file || file !== root && !file.startsWith(root + path.sep)) fail("native_b26_scope_invalid");
    const stat = lstatSync(file, { bigint: true }), directory = stat.isDirectory();
    if (stat.isSymbolicLink() || !directory && (!stat.isFile() || stat.nlink !== 1n)) fail("native_b26_link_or_object_denied");
    const item = { pathDigest: nativeDigest(rel), identity: physicalIdentity(file, directory), kind: directory ? "directory" : "file" };
    if (!directory) {
      total += Number(stat.size); if (stat.size > 12n * 1024n * 1024n || total > 32 * 1024 * 1024) fail("native_b26_inventory_limit");
      const data = readFileSync(file), after = lstatSync(file, { bigint: true });
      if (stat.ino !== after.ino || stat.dev !== after.dev || stat.size !== after.size || stat.mtimeNs !== after.mtimeNs || stat.ctimeNs !== after.ctimeNs) fail("native_b26_inventory_drift");
      Object.assign(item, { bytes: String(stat.size), time: String(stat.mtimeNs), digest: createHash("sha256").update(data).digest("hex") });
    }
    rows.push(item); paths.set(item.pathDigest, file);
    if (directory) for (const name of readdirSync(file).sort()) {
      if (!name || /[\\/:\x00-\x1f]/.test(name) || [".", ".."].includes(name) || /[. ]$/.test(name)) fail("native_b26_scope_invalid");
      visit(path.join(file, name), rel ? rel + "/" + name : name, depth + 1);
    }
  }
  if (!b26Exists(root)) return { rows, paths };
  visit(root, "", 0);
  return { rows, paths, fixtureDigest: nativeDigest(rows.slice(1)), plan: [...rows].reverse() };
}
export function assertB26Remaining(root, plan, removed, pending = null) {
  const current = b26Inventory(root), expected = plan.slice(removed), actual = new Map(current.rows.map(r => [r.pathDigest, r]));
  for (const [offset, item] of expected.entries()) {
    const value = actual.get(item.pathDigest);
    if (!value && offset === 0 && pending === removed) continue;
    if (!value || nativeDigest(value) !== nativeDigest(item)) fail("native_b26_inventory_drift");
    actual.delete(item.pathDigest);
  }
  if (actual.size) fail("native_b26_foreign_entry");
  return current;
}
// Metadata only for other managed state. Never read unrelated file contents.
export function b26OutsideStateDigest(state, excluded) {
  const rows = []; let count = 0;
  function walk(directory, relative = "", depth = 0) {
    if (depth > 12) fail("native_b26_state_inventory_limit");
    for (const name of readdirSync(directory).sort()) {
      if (!relative && excluded.includes(name)) continue;
      if (++count > 8192) fail("native_b26_state_inventory_limit");
      const file = path.join(directory, name), rel = relative ? relative + "/" + name : name, stat = lstatSync(file, { bigint: true });
      if (stat.isSymbolicLink() || !stat.isDirectory() && !stat.isFile()) fail("native_b26_state_inventory_unsafe");
      rows.push([nativeDigest(rel), physicalIdentity(file, stat.isDirectory()), stat.isDirectory() ? "directory" : [String(stat.size), String(stat.mtimeNs), String(stat.ctimeNs)]]);
      if (stat.isDirectory()) walk(file, rel, depth + 1);
    }
  }
  walk(state); return nativeDigest(rows);
}
