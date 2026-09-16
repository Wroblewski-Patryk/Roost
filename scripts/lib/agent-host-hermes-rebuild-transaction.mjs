// Explicit maintenance only; no automatic startup/recovery caller.
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, lstatSync, realpathSync, readdirSync, readFileSync, writeFileSync, renameSync, rmSync, openSync, fsyncSync, closeSync } from "node:fs";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
const sha = b => createHash("sha256").update(b).digest("hex");
const fail = code => { throw new Error(code); };
function identity(file) { const s = lstatSync(file, { bigint: true }); if (s.isSymbolicLink()) fail("rebuild_link_denied"); return `${s.dev}:${s.ino}`; }
function canonical(file) {
  if (!path.isAbsolute(file) || path.normalize(file) !== file || realpathSync.native(file).toLowerCase() !== file.toLowerCase()) fail("rebuild_path_invalid");
  for (let cur = file;; cur = path.dirname(cur)) { identity(cur); if (cur === path.dirname(cur)) break; }
}
function durableWrite(file, bytes, exclusive = false) {
  const fd = openSync(file, exclusive ? "wx" : "w", 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}
function boundedTree(root, n = { count: 0 }) {
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (++n.count > 60000 || e.isSymbolicLink()) fail("rebuild_cleanup_unsafe");
    if (e.isDirectory()) boundedTree(path.join(root, e.name), n);
    else if (!e.isFile()) fail("rebuild_cleanup_unsafe");
  }
}
export function removeOwnedRebuildTree(parent, target, expectedIdentity) {
  canonical(parent); canonical(target);
  if (path.dirname(target) !== parent || !/^venv\.b16-(?:staging|rollback)-[a-f0-9-]{36}$/.test(path.basename(target))
      || identity(target) !== expectedIdentity) fail("rebuild_cleanup_ownership_invalid");
  boundedTree(target); rmSync(target, { recursive: true });
}
export function rebuildDirectoryIdentity(file) { canonical(file); return identity(file); }

// Every publication is under the genuine Writer and an external durable journal.
// Before commit, all failures roll back names AND metadata. After commit, a
// cleanup error retains the verified new environment and reports cleanup debt;
// it never tries to restore a partly deleted old environment.
export async function swapHermesEnvironment({ writer, checkout, staging, rollback, journalPath, updates,
  verifyStaging, verifyCanonical, excludeProcesses, phase = () => {} }) {
  assertWriterLock(writer); canonical(checkout); canonical(staging);
  const canonicalVenv = path.join(checkout, "venv"); canonical(canonicalVenv);
  if (path.dirname(staging) !== checkout || path.dirname(rollback) !== checkout
      || !/^venv\.b16-staging-[a-f0-9-]{36}$/.test(path.basename(staging))
      || path.basename(rollback) !== path.basename(staging).replace("staging", "rollback") || existsSync(rollback)
      || existsSync(journalPath)) fail("rebuild_transaction_paths_invalid");
  canonical(path.dirname(journalPath));
  if (path.relative(checkout, journalPath).split(path.sep)[0] !== "..") fail("rebuild_journal_must_be_external");
  const prior = updates.map(u => {
    canonical(path.dirname(u.file));
    if (existsSync(u.file)) { canonical(u.file); if (lstatSync(u.file).nlink !== 1) fail("rebuild_metadata_link_denied"); }
    return { ...u, original: existsSync(u.file) ? readFileSync(u.file) : null };
  });
  if (new Set(prior.map(u => u.file.toLowerCase())).size !== prior.length || prior.length > 12
      || prior.some(u => u.bytes.length > 16 * 1024 * 1024)) fail("rebuild_updates_invalid");
  const oldIdentity = identity(canonicalVenv), newIdentity = identity(staging), id = randomUUID();
  let oldMoved = false, newMoved = false, committed = false, applied = 0;
  const backupFiles = [];
  const events = [], log = state => {
    events.push(state); if (events.length > 32) fail("rebuild_journal_limit");
    durableWrite(journalPath, JSON.stringify({ schemaVersion: 1, id, events, oldIdentity, newIdentity,
      updates: prior.map((u, index) => ({ name: path.basename(u.file), before: u.original === null ? null : sha(u.original), after: sha(u.bytes), backup: backupFiles[index] ? path.basename(backupFiles[index]) : null })) }, null, 2) + "\n", events.length === 1);
  };
  const check = async name => { assertWriterLock(writer); await excludeProcesses(); await phase(name); };
  try {
    for (const [index, u] of prior.entries()) {
      const backup = `${journalPath}.before-${index}`;
      if (u.original !== null) { durableWrite(backup, u.original, true); backupFiles[index] = backup; }
    }
    log("prepared"); await check("prepared"); await verifyStaging(); log("staging_verified"); await check("staging_verified");
    for (const u of prior) if (u.original === null ? existsSync(u.file) : !readFileSync(u.file).equals(u.original)) fail("rebuild_metadata_changed");
    renameSync(canonicalVenv, rollback); oldMoved = true; log("old_renamed"); await check("old_renamed");
    renameSync(staging, canonicalVenv); newMoved = true; log("new_renamed"); await check("new_renamed");
    for (const u of prior) {
      // Counter is advanced first so a failed/torn write is also restored.
      applied++; durableWrite(u.file, u.bytes); await check(`metadata_${applied}`);
    }
    log("metadata_written"); await verifyCanonical(); await check("canonical_verified");
    if (identity(canonicalVenv) !== newIdentity) fail("rebuild_identity_changed");
    for (const u of prior) if (!readFileSync(u.file).equals(u.bytes)) fail("rebuild_metadata_readback_failed");
    log("committed"); committed = true;
    await check("cleanup"); removeOwnedRebuildTree(checkout, rollback, oldIdentity); log("complete");
    for (const file of backupFiles.filter(Boolean)) rmSync(file);
    return Object.freeze({ status: "DONE", transaction: id, rollbackRemoved: true, canonicalIdentity: newIdentity });
  } catch (error) {
    if (committed) { log("committed_cleanup_blocked"); throw Object.assign(new Error("rebuild_cleanup_required"), { cause: error, committed: true }); }
    try {
      assertWriterLock(writer); await excludeProcesses();
      for (const u of prior.slice(0, applied).reverse()) {
        if (u.original === null) { if (existsSync(u.file)) rmSync(u.file); }
        else durableWrite(u.file, u.original);
      }
      if (newMoved) { if (identity(canonicalVenv) !== newIdentity) fail("rebuild_identity_changed"); renameSync(canonicalVenv, staging); }
      if (oldMoved) { if (identity(rollback) !== oldIdentity) fail("rebuild_identity_changed"); renameSync(rollback, canonicalVenv); }
      if (identity(canonicalVenv) !== oldIdentity) fail("rebuild_rollback_failed");
      for (const u of prior) if (u.original === null ? existsSync(u.file) : !readFileSync(u.file).equals(u.original)) fail("rebuild_rollback_failed");
      removeOwnedRebuildTree(checkout, staging, newIdentity); log("rolled_back");
      for (const file of backupFiles.filter(Boolean)) rmSync(file);
    } catch (rollbackError) { throw Object.assign(new Error("rebuild_rollback_requires_reconciliation"), { cause: error, rollbackError }); }
    throw Object.assign(new Error("rebuild_rolled_back"), { cause: error, rolledBack: true });
  }
}
