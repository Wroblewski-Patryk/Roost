// No API/CLI/config route. This exception is pinned to one historical pair;
// ordinary and future recovery remains the strict B19 implementation.
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, openSync, writeFileSync, fsyncSync, closeSync, mkdirSync, unlinkSync } from "node:fs";
import { physicalIdentity, nativeDigest, inspectNativeOwnedTemp } from "./agent-host-native-footprint.mjs";
import { writerLockFilename, recoveryLockFilename } from "./agent-host-writer-lock.mjs";
const fixedScope = "2f20e802749e16deacc6b1f1b447b057b20bb1f94e8375c62278fe4dfe173d12";
const productionEnabled = false; // B20 completed: terminally spent, no restart or reuse.
const grants = new WeakMap();
const policy = "roost-b17-legacy-exception-v1", decision = "ADR-004-v12-B20-exact-legacy-pair";
const journalName = "b20-legacy-recovery", spentName = "exception-consumed.json";
const missing = ["writer_process_creation_executable_identity", "signed_terminal_review", "full_task_workspace_application_attempt_join",
  "ready_root_manifest_binding", "root_and_launcher_creation_executable_identity", "genuine_at_origin_job_descendant_termination_chain"];
const fail = code => { throw Error(`b17_legacy_${code}`); };
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const encode = value => Buffer.from(JSON.stringify(value) + "\n");
function snapshot(file) {
  const identity = physicalIdentity(file, false), bytes = readFileSync(file);
  if (bytes.length > 65536 || identity !== physicalIdentity(file, false)) fail("artifact_unproven");
  return { name: path.basename(file), identity, digest: hash(bytes) };
}
function same(directory, item) {
  if (!item || !/^[a-zA-Z0-9_.-]{1,160}$/.test(item.name) || [".", ".."].includes(item.name)) fail("artifact_name_invalid");
  if (JSON.stringify(snapshot(path.join(directory, item.name))) !== JSON.stringify(item)) fail("artifact_changed");
}
function create(file, value) {
  const bytes = encode(value), fd = openSync(file, "wx", 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  if (!readFileSync(file).equals(bytes)) fail("journal_readback_failed");
  return snapshot(file);
}
function authority(s) {
  s.assertOwnerAuthority();
  if (Date.now() < s.wall || Date.now() - s.wall >= 60000 || performance.now() - s.at < 0 || performance.now() - s.at >= 60000) fail("approval_expired");
}
function inventory(s, lease, writer) {
  const names = readdirSync(s.state);
  if (names.length > 128) fail("inventory_limit");
  const artifacts = names.filter(n => /(?:writer.*\.lock|\.lease)$/i.test(n)).sort();
  const expected = [lease && s.binding.lease.name, writer && s.binding.writer.name].filter(Boolean).sort();
  if (JSON.stringify(artifacts) !== JSON.stringify(expected)) fail("additional_or_missing_artifact");
}
function check(s, lease, writer) {
  authority(s);
  if (physicalIdentity(s.state) !== s.binding.stateIdentity || physicalIdentity(s.directory) !== s.directoryIdentity) fail("parent_changed");
  same(s.state, s.barrier);
  inventory(s, lease, writer);
  if (lease) same(s.state, s.binding.lease);
  if (writer) same(s.state, s.binding.writer);
  for (const item of s.binding.spent) same(s.state, item);
  if (s.last) same(s.directory, s.last);
  if (s.consumed) same(s.directory, s.consumed);
  // Callback is trusted local inspection code, never a serialized process claim.
  const result = s.processCheck();
  if (result?.ownerAbsent !== true || result?.matchingExecutables !== 0 || result?.ownerChildren !== 0 || result?.jobLaunchers !== 0
      || result?.historicalBinding !== "unavailable_owner_exception") fail("process_check_failed");
  s.processChecks = { at: new Date().toISOString(), ownerAbsent: true, matchingExecutables: 0, ownerChildren: 0, jobLaunchers: 0,
    historicalBinding: "unavailable_owner_exception" };
  inventory(s, lease, writer);
  same(s.state, s.barrier);
  if (lease) same(s.state, s.binding.lease);
  if (writer) same(s.state, s.binding.writer);
  for (const item of s.binding.spent) same(s.state, item);
  authority(s); // A slow inspection must not extend the grant.
}
function journal(s, stage, extra = {}) {
  if (s.last) same(s.directory, s.last);
  const record = { policy, scopeDigest: s.scopeDigest, ownerDecision: decision, stage, timestamp: new Date().toISOString(),
    previousDigest: s.last?.digest ?? null, processChecks: s.processChecks ?? null, ...extra };
  s.last = create(path.join(s.directory, `${String(++s.sequence).padStart(2, "0")}-${stage}.json`), record);
}
function prepare({ stateDirectory, binding, assertOwnerAuthority, processCheck }, synthetic) {
  if (typeof assertOwnerAuthority !== "function" || typeof processCheck !== "function") fail("owner_authority_required");
  assertOwnerAuthority(); binding = structuredClone(binding);
  const scopeDigest = nativeDigest(binding);
  if (!synthetic && (!productionEnabled || scopeDigest !== fixedScope)) fail("scope_disabled_or_mismatch");
  if (binding.policy !== policy || binding.ownerDecision !== decision || binding.writer?.name !== writerLockFilename
      || !/^application-[a-f0-9]{64}\.lease$/.test(binding.lease?.name ?? "") || binding.spent?.length !== 3
      || binding.spent.map(x => x.name).join() !== ["b13", "b14", "b17"].map(n => `hermes-${n}-smoke-consumed.json`).join()
      || physicalIdentity(stateDirectory) !== binding.stateIdentity) fail("scope_invalid");
  const directory = path.join(stateDirectory, journalName);
  // A previous invocation, even an interrupted prepare, cannot recreate a grant.
  if (existsSync(directory)) fail("new_owner_approval_required");
  const s = { state: stateDirectory, directory, binding, scopeDigest, assertOwnerAuthority, processCheck,
    wall: Date.now(), at: performance.now(), sequence: 0, used: false };
  // Barrier FIRST; any following error leaves it in place, never force-unlinks it.
  s.barrier = create(path.join(stateDirectory, recoveryLockFilename), { policy, scopeDigest, ownerDecision: decision, nonce: randomUUID() });
  mkdirSync(directory); s.directoryIdentity = physicalIdentity(directory);
  journal(s, "barrier", { barrier: s.barrier, acceptedMissingHistoricalEvidence: missing,
    before: { writer: binding.writer, lease: binding.lease, spent: binding.spent }, intendedOrder: ["application_lease", "writer"],
    historicalJobDigest: binding.historicalJobDigest, historicalRootDigest: binding.historicalRootDigest });
  check(s, true, true);
  const writer = JSON.parse(readFileSync(path.join(stateDirectory, binding.writer.name))), lease = JSON.parse(readFileSync(path.join(stateDirectory, binding.lease.name)));
  if (lease.writer !== writer.ownerNonce || binding.lease.name !== `application-${lease.application}.lease`) fail("pair_join_invalid");
  journal(s, "prepared");
  const grant = Object.freeze({}); grants.set(grant, s); return grant;
}
export function prepareLegacyB17Exception(options) { return prepare(options, false); }
// Test admission can only address a freshly allocated genuine owned temp root.
// There is no adopt-directory option, environment switch or serialized proof.
export function prepareSyntheticB17Exception({ ownership, attempt, ...options }) {
  const owned = inspectNativeOwnedTemp(ownership, attempt);
  if (options.stateDirectory !== owned.root) fail("synthetic_scope_invalid");
  return prepare(options, true);
}
export function executeLegacyB17Exception(grant) {
  const s = grants.get(grant); if (!s || s.used) fail("grant_unproven_or_spent");
  s.used = true; // Burn the in-memory grant even if the first check fails.
  check(s, true, true);
  s.consumed = create(path.join(s.directory, spentName), { policy, scopeDigest: s.scopeDigest, ownerDecision: decision,
    consumedAt: new Date().toISOString(), reusable: false, restartRequiresNewOwnerApproval: true });
  journal(s, "grant_consumed");
  journal(s, "lease_remove_intent"); check(s, true, true);
  // Exact single-file unlink only; never glob, rename, adopt or recursive cleanup.
  same(s.state, s.binding.lease); unlinkSync(path.join(s.state, s.binding.lease.name));
  if (existsSync(path.join(s.state, s.binding.lease.name))) fail("lease_readback_failed");
  journal(s, "lease_removed", { leaseAbsent: true });
  check(s, false, true); journal(s, "writer_remove_intent"); check(s, false, true);
  same(s.state, s.binding.writer); unlinkSync(path.join(s.state, s.binding.writer.name));
  if (existsSync(path.join(s.state, s.binding.writer.name))) fail("writer_readback_failed");
  journal(s, "writer_removed", { writerAbsent: true }); check(s, false, false);
  journal(s, "complete", { leaseAbsent: true, writerAbsent: true, spentUnchanged: true, exceptionSpent: true, strictB19Unchanged: true });
  check(s, false, false); same(s.state, s.barrier); unlinkSync(path.join(s.state, recoveryLockFilename));
  if (existsSync(path.join(s.state, recoveryLockFilename))) fail("barrier_readback_failed");
  return Object.freeze({ completed: true, removed: 2, leaseAbsent: true, writerAbsent: true, spentUnchanged: true, barrierReleased: true,
    exceptionSpent: true, journalDigest: s.last.digest, scopeDigest: s.scopeDigest });
}
