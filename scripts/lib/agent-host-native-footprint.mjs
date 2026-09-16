import path from "node:path";
import { createHash, randomBytes, createHmac } from "node:crypto";
import { lstatSync, realpathSync, readdirSync, readFileSync, openSync, fstatSync, closeSync, readSync,
  mkdirSync, writeFileSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { nativeBoundaryError } from "./agent-host-native-authority.mjs";

export const nativeDigest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = code => { throw nativeBoundaryError(code); };
const samePath = (a, b) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
const privateTemps = new WeakMap();
const secretName = name => /^(?:\.env(?:\..*)?|auth\.json|credentials(?:\.json)?|id_(?:rsa|ed25519)|.*\.(?:key|pem|pfx))$/i.test(name);
export function physicalIdentity(file, directory = true) {
  try {
    if (!path.isAbsolute(file) || path.normalize(file) !== file || file === path.parse(file).root || /[\x00-\x1f]/.test(file)
        || (process.platform === "win32" && (!/^[a-z]:\\/i.test(file) || file.slice(2).includes(":") || file.split("\\").some(p => /[. ]$/.test(p))))) fail("native_root_invalid");
    for (let current = file;; current = path.dirname(current)) {
      if (lstatSync(current).isSymbolicLink()) fail("native_reparse_denied");
      if (current === path.dirname(current)) break;
    }
    const s = lstatSync(file, { bigint: true });
    if ((directory ? !s.isDirectory() : !s.isFile() || s.nlink !== 1n) || !samePath(realpathSync.native(file), file)) fail("native_root_invalid");
    return nativeDigest([realpathSync.native(file), String(s.dev), String(s.ino)]);
  } catch (e) { if (e.protocolAdmission) throw e; fail("native_root_unavailable"); }
}
export function nativeRelative(value) {
  if (typeof value !== "string" || !value || value.length > 512 || /[\\:\x00-\x1f\x7f]/.test(value) || value.startsWith("/")
      || value.split("/").some(p => !p || p === "." || p === ".." || /[. ]$/.test(p) || p.toLowerCase() === ".git" || secretName(p))) fail("native_scope_invalid");
  return value;
}
function git(root, args) {
  try {
    const env = {};
    const allowed = ["SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "COMSPEC", "TEMP", "TMP", "USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA"];
    for (const key of Object.keys(process.env)) if (allowed.includes(key.toUpperCase())) env[key] = process.env[key];
    // Never use shell, hooks, fsmonitor, textconv or repo-configured diff programs.
    return execFileSync("git", ["--literal-pathspecs", "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", ...args], {
      cwd: root, windowsHide: true, shell: false, timeout: 10000, maxBuffer: 2 * 1024 * 1024,
      env: { ...env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null" },
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch { fail("native_git_observation_failed"); }
}
function boundedFileDigest(file) {
  physicalIdentity(file, false);
  const stat = lstatSync(file, { bigint: true });
  if (stat.size > 8n * 1024n * 1024n) fail("native_inventory_limit");
  const fd = openSync(file, "r");
  try {
    const first = fstatSync(fd, { bigint: true });
    if (first.ino !== stat.ino || first.size !== stat.size || (stat.dev !== 0n && stat.dev !== first.dev)) fail("native_file_identity_drift");
    const buffer = Buffer.alloc(Number(stat.size) + 1);
    let used = 0;
    while (used < buffer.length) { const n = readSync(fd, buffer, used, buffer.length - used, used); if (!n) break; used += n; }
    const last = fstatSync(fd, { bigint: true });
    if (used !== Number(stat.size) || last.size !== first.size || last.mtimeNs !== first.mtimeNs || physicalIdentity(file, false) !== nativeDigest([realpathSync.native(file), String(stat.dev), String(stat.ino)])) fail("native_file_identity_drift");
    return createHash("sha256").update(buffer.subarray(0, used)).digest("hex");
  } finally { closeSync(fd); }
}
// Metadata only for the bounded tree. Content hashes are taken only for dirty
// non-secret Git paths. Dependencies are explicitly an observation gap.
function tree(root, { metadata = false, allowGitRoot = false, ownedRepository = null } = {}) {
  const rows = [], skipped = []; let count = 0;
  function walk(dir, relative, depth) {
    if (depth > 24) fail("native_inventory_limit");
    const names = readdirSync(dir).sort();
    if (names.length + count > 8192) fail("native_inventory_limit");
    for (const name of names) {
      if (++count > 8192) fail("native_inventory_limit");
      const rel = relative ? `${relative}/${name}` : name, file = path.join(dir, name);
      const s = lstatSync(file, { bigint: true });
      if (s.isSymbolicLink() || (!s.isDirectory() && !s.isFile())) fail("native_reparse_denied");
      if (name.toLowerCase() === ".git") {
        if (ownedRepository && relative === ownedRepository && name === ".git" && s.isDirectory()) {
          // Only a repository created inside a freshly marked fixture root.
          // Traverse all its objects/logs for cleanup; never adopt a checkout.
        } else {
          if (relative || metadata || !allowGitRoot) fail("native_extra_repository");
          if (!s.isDirectory()) fail("native_worktree_denied");
          continue;
        }
      }
      const row = { path: rel, kind: s.isDirectory() ? "directory" : "file", identity: `${s.dev}:${s.ino}` };
      if (s.isFile()) Object.assign(row, { bytes: String(s.size), time: String(s.mtimeNs), links: String(s.nlink) });
      rows.push(row);
      if (s.isDirectory()) {
        if (!metadata) {
          // A bare clone has HEAD/objects/refs without a .git directory.
          if (!(ownedRepository && rel === `${ownedRepository}/.git`) && ["HEAD", "objects", "refs"].every(n => existsSync(path.join(file, n)))) fail("native_extra_repository");
        }
        if ((!metadata && ["node_modules", ".venv", "venv"].includes(name.toLowerCase())) || (metadata && ["objects", "logs"].includes(name.toLowerCase()))) {
          skipped.push(rel); row.directoryTime = String(s.mtimeNs);
        } else walk(file, rel, depth + 1);
      }
    }
  }
  walk(root, "", 0);
  return { rows, skipped };
}
export function captureNativeFootprint(root, expected) {
  try {
    const rootIdentity = physicalIdentity(root), gitIdentity = physicalIdentity(path.join(root, ".git"));
    if (!samePath(path.resolve(git(root, ["rev-parse", "--show-toplevel"]).trim()), root)
      || !samePath(path.resolve(root, git(root, ["rev-parse", "--git-common-dir"]).trim()), path.join(root, ".git"))) fail("native_repository_identity_invalid");
    const worktrees = git(root, ["worktree", "list", "--porcelain", "-z"]);
    const roots = worktrees.split("\0").filter(v => v.startsWith("worktree ")).map(v => v.slice(9));
    if (roots.length !== 1 || !samePath(path.resolve(roots[0]), root)) fail("native_worktree_denied");
    const head = git(root, ["rev-parse", "HEAD"]).trim(), branch = git(root, ["symbolic-ref", "--short", "HEAD"]).trim();
    const origin = git(root, ["remote", "get-url", "origin"]).trim();
    if (head !== expected.head || branch !== expected.branch || origin.replace(/\.git$/, "").toLowerCase() !== expected.origin.replace(/\.git$/, "").toLowerCase()) fail("native_repository_identity_drift");
    const status = git(root, ["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"]);
    const rows = status.split("\0").filter(Boolean);
    if (rows.length > 128) fail("native_inventory_limit");
    let total = 0;
    const dirty = rows.map(row => {
      const rel = nativeRelative(row.slice(3));
      let digest = null;
      try {
        total += Number(lstatSync(path.join(root, rel)).size);
        if (total > 32 * 1024 * 1024) fail("native_inventory_limit");
        digest = boundedFileDigest(path.join(root, rel));
      } catch (e) {
        if (!row.slice(0, 2).includes("D")) throw e;
        try { lstatSync(path.join(root, rel)); throw e; } catch (missing) { if (missing.code !== "ENOENT") throw e; }
      }
      return { path: rel, status: row.slice(0, 2), digest };
    });
    if (dirty.length > 128) fail("native_inventory_limit");
    const inventory = tree(root, { allowGitRoot: true }), metadata = tree(path.join(root, ".git"), { metadata: true });
    // Hash small Git authority files; never emit their bytes/origin/branch/paths.
    const gitAuthority = ["HEAD", "config", "index", "packed-refs"].map(name => {
      const file = path.join(root, ".git", name);
      try { return [name, boundedFileDigest(file)]; } catch (e) { try { lstatSync(file); } catch (m) { if (m.code === "ENOENT") return [name, null]; } throw e; }
    });
    const value = { rootIdentity, gitIdentity, head, branch, originDigest: nativeDigest(origin), worktreesDigest: nativeDigest(worktrees),
      dirty, inventory, metadataDigest: nativeDigest([metadata, gitAuthority]), coverage: "bounded_root_metadata_git_dirty_bytes_dependencies_partial" };
    return { ...value, digest: nativeDigest(value) };
  } catch (e) { if (e.protocolAdmission) throw e; fail("native_footprint_unavailable"); }
}
export function compareNativeFootprint(before, after, writePaths) {
  const violations = [];
  for (const key of ["rootIdentity", "gitIdentity", "head", "branch", "originDigest", "worktreesDigest", "metadataDigest"])
    if (before[key] !== after[key]) violations.push("repository_metadata_or_identity_drift");
  for (const dirty of before.dirty) {
    if (JSON.stringify(dirty) !== JSON.stringify(after.dirty.find(row => row.path === dirty.path))) violations.push("preexisting_dirty_changed");
  }
  const old = new Map(before.inventory.rows.map(r => [r.path, r])), next = new Map(after.inventory.rows.map(r => [r.path, r]));
  const changed = [...new Set([...old.keys(), ...next.keys()])].filter(p => JSON.stringify(old.get(p)) !== JSON.stringify(next.get(p)));
  for (const rel of changed) {
    if (!writePaths.some(p => rel === p || rel.startsWith(p + "/") || (next.get(rel)?.kind === "directory" && p.startsWith(rel + "/")))) violations.push("unexpected_changed_path");
  }
  return { violations: [...new Set(violations)], changedDigests: changed.sort().map(nativeDigest) };
}
function createOwnedTemp(parent, attempt, repository = null) {
  const parentIdentity = physicalIdentity(parent), token = randomBytes(32), name = `attempt-${randomBytes(16).toString("hex")}`;
  const root = path.join(parent, name);
  mkdirSync(root);
  const identity = physicalIdentity(root), marker = createHmac("sha256", token).update(JSON.stringify([attempt, identity, parentIdentity])).digest("hex");
  writeFileSync(path.join(root, ".roost-attempt-owner"), marker, { flag: "wx", mode: 0o600 });
  const proof = Object.freeze({});
  if (repository) mkdirSync(path.join(root, repository));
  privateTemps.set(proof, { root, parent, parentIdentity, identity, marker, attempt, repository, done: false });
  return proof;
}
export const createNativeOwnedTemp = (parent, attempt) => createOwnedTemp(parent, attempt);
// This allocates a NEW empty repository directory. There is no adopt-path API.
export const createNativeOwnedRepositoryTemp = (parent, attempt) => createOwnedTemp(parent, attempt, "repository");
export function inspectNativeOwnedTemp(proof, attempt) {
  const saved = privateTemps.get(proof);
  if (!saved || saved.done || saved.attempt !== attempt || physicalIdentity(saved.parent) !== saved.parentIdentity || physicalIdentity(saved.root) !== saved.identity) fail("native_temp_ownership_unproven");
  const markerFile = path.join(saved.root, ".roost-attempt-owner");
  physicalIdentity(markerFile, false);
  if (lstatSync(markerFile).size !== 64 || readFileSync(markerFile, "utf8") !== saved.marker) fail("native_temp_ownership_unproven");
  const inventory = tree(saved.root, { ownedRepository: saved.repository });
  if (inventory.skipped.length || inventory.rows.some(r => r.kind === "file" && r.links !== "1")) fail("native_temp_ownership_unproven");
  return { root: saved.root, identity: saved.identity, digest: nativeDigest(inventory), inventory };
}
export function cleanupNativeOwnedTemp(proof, attempt) {
  // No recursive rm: every entry is inspected, identity-bound and unlinked only
  // after tree ownership has been proven. Missing markers preserve all bytes.
  const first = inspectNativeOwnedTemp(proof, attempt);
  if (inspectNativeOwnedTemp(proof, attempt).digest !== first.digest) fail("native_temp_changed");
  const rows = first.inventory.rows.filter(r => r.path !== ".roost-attempt-owner").sort((a, b) => b.path.split("/").length - a.path.split("/").length);
  for (const row of rows) {
    inspectNativeOwnedTemp(proof, attempt);
    const target = path.resolve(first.root, row.path);
    if (!target.startsWith(first.root + path.sep)) fail("native_temp_ownership_unproven");
    const stat = lstatSync(target, { bigint: true });
    if (`${stat.dev}:${stat.ino}` !== row.identity || stat.isSymbolicLink()) fail("native_temp_changed");
    if (row.kind === "directory") rmdirSync(target); else unlinkSync(target);
  }
  inspectNativeOwnedTemp(proof, attempt);
  unlinkSync(path.join(first.root, ".roost-attempt-owner")); rmdirSync(first.root);
  privateTemps.get(proof).done = true;
  return Object.freeze({ scope: "attempt_owned_temp", identity: first.identity, remaining: 0 });
}
