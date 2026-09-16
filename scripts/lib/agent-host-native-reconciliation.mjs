// Owner-authorized cleanup only. A signed completed review can never launch a
// provider. Legacy/PID-only records intentionally cannot mint this capability.
import path from "node:path";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync, rmdirSync } from "node:fs";
import { nativeArtifactSnapshot, readDurableNativeReview } from "./agent-host-native-review.mjs";
import { nativeDigest, physicalIdentity, nativeFootprintPolicy } from "./agent-host-native-footprint.mjs";
import { observeWindowsProcessIdentity, currentNativeProcessIdentity } from "./agent-host-process-identity.mjs";
import { writerLockFilename, recoveryLockFilename } from "./agent-host-writer-lock.mjs";
import { bridgeRecoveryIdentity, legacyInputIdentityVersion } from "./agent-host-recovery-identity.mjs";
import { readOriginalFixture, readFixtureEvidence, fixtureFileBinding, fixtureRuntimeBinding, fixtureTaskDigest, fixtureInstallationBinding } from "./agent-host-fixture-ownership.mjs";
import { b26Inventory, assertB26Remaining, b26Exists } from "./agent-host-b26-inventory.mjs";
const grants = new WeakMap(), hash = /^[a-f0-9]{64}$/, uuid = /^[a-f0-9-]{36}$/i;
const fail = reason => { throw Error(reason); };
const bytes = value => Buffer.from(JSON.stringify(value) + "\n");
function exactName(name) {
  if (typeof name !== "string" || !/^[a-zA-Z0-9_.-]{1,180}$/.test(name) || name === "." || name === "..") fail("native_recovery_artifact_invalid");
  return name;
}
function matches(state, expected, absentAllowed = false) {
  const file = path.join(state, exactName(expected.name));
  if (!existsSync(file)) { if (absentAllowed) return false; fail("native_recovery_artifact_missing"); }
  const now = nativeArtifactSnapshot(file);
  if (now.identity !== expected.identity || now.digest !== expected.digest) fail("native_recovery_foreign_or_changed_artifact");
  return true;
}
function ownerGone(identity, label) {
  if (!identity || !Number.isSafeInteger(identity.pid) || !/^\d{16,20}$/.test(identity.creationTime ?? "")) fail(`native_recovery_${label}_identity_missing`);
  const now = observeWindowsProcessIdentity(identity.pid);
  if (now) fail(now.creationTime !== identity.creationTime ? "native_recovery_pid_reused" : "native_recovery_process_alive");
}
function readJournal(directory, key) {
  const file = path.join(directory, "reconciliation.json"); if (!existsSync(file)) return null;
  const { record: { payload, signature } } = nativeArtifactSnapshot(file);
  if (!hash.test(signature ?? "") || !timingSafeEqual(Buffer.from(signature, "hex"), createHmac("sha256", key).update(bytes(payload)).digest())) fail("native_recovery_journal_invalid");
  return payload;
}
function journal(directory, key, payload) {
  const file = path.join(directory, "reconciliation.json"), pending = file + ".next";
  const data = bytes({ payload, signature: createHmac("sha256", key).update(bytes(payload)).digest("hex") });
  const fd = openSync(pending, "wx", 0o600); try { writeFileSync(fd, data); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(pending, file); if (!readFileSync(file).equals(data)) fail("native_recovery_journal_unproven");
}
function qualify(directory, fixture) {
  const review = readDurableNativeReview(directory), p = review.payload, state = path.dirname(directory), stateIdentity = physicalIdentity(state), b = p.binding;
  if (p.policy !== nativeFootprintPolicy || !["final", "cleaned"].includes(p.stage)) fail("native_recovery_terminal_evidence_missing");
  if (!b || !hash.test(b.rootIdentity) || !hash.test(b.ready) || !hash.test(b.preFootprintDigest) || !hash.test(p.postFootprintDigest ?? "")) fail("native_recovery_root_ready_chain_missing");
  if (!b.identity || !["executionId", "workspaceId", "taskId", "applicationId"].every(k => uuid.test(b.identity[k] ?? "")) || b.identity.attempt !== 1) fail("native_recovery_attempt_identity_missing");
  if (!b.spent || b.spent.record?.state !== "dispatch_reserved") fail("native_recovery_spent_chain_missing");
  bridgeRecoveryIdentity(b.identity, b.spent.record.attemptDigest,
    b.spent.record.scope === "one_real_hermes_coding_smoke_b21_only" ? legacyInputIdentityVersion : undefined);
  if (b.writer?.name !== writerLockFilename || b.lease?.name !== `application-${nativeDigest(b.identity.applicationId)}.lease`
      || b.lease.record.attempt !== b.identity.executionId || b.lease.record.application !== nativeDigest(b.identity.applicationId)
      || b.lease.record.writer !== b.writer.record.ownerNonce) fail("native_recovery_lease_writer_chain_missing");
  const owner = b.writer.record.ownerProcess, job = p.job;
  if (!owner || owner.pid !== b.writer.record.ownerPid || !hash.test(owner.executableDigest) || !hash.test(owner.executablePathDigest)) fail("native_recovery_owner_identity_missing");
  if (!job || job.attempt !== b.identity.executionId || !uuid.test(job.job) || job.cleanup !== true || job.activeProcesses !== 0
      || job.jobClosed !== true || job.assignedBeforeResume !== true || !(job.resumed === true || b.fixture && p.readyResume && job.version === "roost-windows-job-v2" && job.resumed === false) || job.killOnClose !== true || job.breakaway !== false
      || !hash.test(job.executableDigest) || !hash.test(job.launcherSha256) || !hash.test(job.sourceSha256)
      || nativeDigest(job) !== p.public?.jobDigest) fail("native_recovery_job_chain_missing");
  if (!["verified_candidate", "acceptance_failed", "process_failed"].includes(p.public.verdict) || p.public.violations.length
      || !["PASS", "FAIL"].includes(p.verification?.status) || p.installation?.status !== "PASS") fail("native_recovery_review_not_eligible");
  const key = readFileSync(path.join(directory, "integrity.key")), previous = readJournal(directory, key);
  if (previous && (previous.reviewDigest !== review.digest || !["prepared", "fixture_remove_intent", "fixture_removed_entry", "fixture_removed", "lease_remove_intent", "lease_removed", "writer_remove_intent", "writer_removed", "complete"].includes(previous.phase))) fail("native_recovery_journal_invalid");
  if (b.fixture) verifyFixtureRecovery({ review, state, previous }, fixture);
  if (previous?.phase === "complete" && !existsSync(path.join(state, recoveryLockFilename))) return { complete: true, review, state, key, previous, stateIdentity };
  matches(state, b.spent);
  const releaseIntent = p.stage === "cleaned" && p.leaseWriterReleaseIntent === true;
  const leaseMayBeAbsent = releaseIntent || previous && ["lease_remove_intent", "lease_removed", "writer_remove_intent", "writer_removed", "complete"].includes(previous.phase), writerMayBeAbsent = releaseIntent || previous && ["writer_remove_intent", "writer_removed", "complete"].includes(previous.phase);
  const leasePresent = matches(state, b.lease, leaseMayBeAbsent), writerPresent = matches(state, b.writer, writerMayBeAbsent);
  if (!writerPresent && leasePresent) fail("native_recovery_release_order_invalid");
  // PID absence is accepted ONLY with the original signed creation/executable
  // identity and a genuine-at-origin zero-active Job proof for all descendants.
  ownerGone(owner, "owner");
  ownerGone({ pid: job.rootPid, creationTime: job.rootCreationTime }, "root");
  ownerGone({ pid: job.launcherPid, creationTime: job.launcherCreationTime }, "launcher");
  return { complete: false, review, state, key, previous, stateIdentity };
}
function acquireReconciliationController(q, grant) {
  const file = path.join(grant.directory, ".reconciliation-controller.json");
  const sign = payload => createHmac("sha256", q.key).update("native-reconciliation-controller-v1\n").update(bytes(payload)).digest("hex");
  if (b26Exists(file)) {
    const old = nativeArtifactSnapshot(file), { payload, signature } = old.record;
    if (!hash.test(signature ?? "") || signature !== sign(payload) || payload.self !== physicalIdentity(file, false)
        || payload.reviewDigest !== grant.digest || payload.directory !== grant.identity) fail("native_recovery_controller_unproven");
    ownerGone(payload.owner, "controller");
    if (nativeArtifactSnapshot(file).digest !== old.digest) fail("native_recovery_controller_unproven");
    unlinkSync(file);
  }
  const fd = openSync(file, "wx", 0o600);
  try {
    const payload = { owner: currentNativeProcessIdentity(), nonce: randomUUID(), reviewDigest: grant.digest,
      directory: grant.identity, self: physicalIdentity(file, false) };
    writeFileSync(fd, bytes({ payload, signature: sign(payload) })); fsyncSync(fd);
  } finally { closeSync(fd); }
  return { file, artifact: nativeArtifactSnapshot(file) };
}
function verifyFixtureRecovery(q, fixture) {
  const p = q.review.payload, b = p.binding;
  if (!fixture?.root || !fixture?.executable || !fixture?.installation || !p.readyResume) fail("native_recovery_fixture_evidence_missing");
  const directory = path.join(q.state, "native-review-" + b.identity.executionId);
  const birth = readOriginalFixture(directory, fixture.root, { historical: true, removed: !!q.previous?.fixture || p.stage === "cleaned" });
  const ready = readFixtureEvidence(directory, "fixture-ready.json");
  if (ready.identity !== p.readyResume.identity || ready.digest !== p.readyResume.digest || ready.payload.bindingDigest !== nativeDigest(b)
      || ready.payload.authorityDigest !== birth.payload.authorityDigest || ready.payload.executionRestorable !== false) fail("native_recovery_fixture_binding_changed");
  const resume = p.resume ? readFixtureEvidence(directory, "resume-authorized.json") : null, r = resume?.payload ?? ready.payload;
  if (birth.digest !== b.fixture.digest || birth.identity !== b.fixture.identity || fixtureTaskDigest(birth.payload.identity) !== fixtureTaskDigest(b.identity)
      || resume && (resume.digest !== p.resume.digest || resume.identity !== p.resume.identity || r.readyDigest !== ready.digest || r.version !== "roost-native-resume-v1"
        || nativeDigest(r.runtime) !== nativeDigest(ready.payload.runtime)) || r.bindingDigest !== nativeDigest(b)
      || r.authorityDigest !== birth.payload.authorityDigest || r.executionRestorable !== false
      || Date.parse(r.at) < Date.parse(birth.payload.at) || Date.parse(r.at) >= Date.parse(birth.payload.expiresAt)
      || !Number.isFinite(Date.parse(r.runtime.deadline)) || Date.parse(r.at) >= Date.parse(r.runtime.deadline)
      || p.job.resumed && (!resume || p.job.resumeReceipt !== resume.digest)
      || resume && ["job", "rootPid", "rootCreationTime", "launcherPid", "launcherCreationTime", "executableDigest", "launcherSha256", "sourceSha256"].some(k => r.assignment[k] !== p.job[k])
      || r.runtime.executable.digest !== p.job.executableDigest || r.runtime.launcher.digest !== p.job.launcherSha256) fail("native_recovery_fixture_binding_changed");
  if (nativeDigest(fixtureRuntimeBinding(fixture.executable)) !== nativeDigest(r.runtime.executable)
      || nativeDigest(fixtureRuntimeBinding(process.execPath)) !== nativeDigest(r.runtime.node)
      || nativeDigest(fixtureInstallationBinding(fixture.installation)) !== nativeDigest(r.runtime.installation)) fail("native_recovery_fixture_runtime_changed");
  if (p.stage === "cleaned") {
    if (b26Exists(fixture.root)) fail("native_recovery_fixture_binding_changed");
  } else if (!q.previous?.fixture) {
    if (nativeDigest(fixtureFileBinding(path.join(fixture.root, ".roost-smoke-scope"))) !== nativeDigest(r.runtime.scopeMarker)) fail("native_recovery_fixture_marker_changed");
    if (!Array.isArray(p.fixturePlan) || p.fixturePlanDigest !== nativeDigest(p.fixturePlan)
        || nativeDigest(b26Inventory(fixture.root).plan) !== p.fixturePlanDigest) fail("native_recovery_fixture_binding_changed");
  } else {
    const f = q.previous.fixture;
    if (f.rootDigest !== nativeDigest(fixture.root) || f.planDigest !== p.fixturePlanDigest || f.planDigest !== nativeDigest(f.plan)
        || !Number.isInteger(f.removed) || f.removed < 0 || f.removed > f.plan.length || f.pending !== null && f.pending !== f.removed) fail("native_recovery_fixture_binding_changed");
    assertB26Remaining(fixture.root, f.plan, f.removed, f.pending);
  }
}
export function qualifyNativeReconciliation(directory, fixture) {
  try { const q = qualify(directory, fixture); return { eligible: !q.complete, completed: q.complete, missingEvidence: [], reviewDigest: q.review.digest }; }
  catch (e) { return { eligible: false, completed: false, missingEvidence: [/^native_[a-z_]+$/.test(e.message) ? e.message : "native_recovery_evidence_unproven"] }; }
}
export function dryRunLegacyNativeReconciliation({ stateDirectory, leaseName, spentName }) {
  physicalIdentity(stateDirectory);
  const writer = nativeArtifactSnapshot(path.join(stateDirectory, writerLockFilename)), lease = nativeArtifactSnapshot(path.join(stateDirectory, exactName(leaseName))), spent = nativeArtifactSnapshot(path.join(stateDirectory, exactName(spentName)));
  const missingEvidence = ["signed_terminal_review", "full_task_workspace_application_attempt_join", "ready_root_manifest_binding",
    "root_and_launcher_creation_executable_identity", "genuine_at_origin_job_descendant_termination_chain", "scoped_owner_cleanup_approval"];
  if (!writer.record.ownerProcess) missingEvidence.unshift("writer_process_creation_executable_identity");
  return Object.freeze({ eligible: false, dryRun: true, artifactCount: 2, deletionAuthorized: false, missingEvidence,
    writerLeaseNonceMatches: lease.record.writer === writer.record.ownerNonce,
    spentRetained: true, snapshotDigest: nativeDigest([writer, lease, spent]) });
}
export function issueNativeReconciliationApproval({ directory, fixture, assertOwnerAuthority }) {
  if (typeof assertOwnerAuthority !== "function") fail("native_recovery_owner_approval_required");
  assertOwnerAuthority(); const q = qualify(directory, fixture);
  if (q.complete) fail("native_recovery_already_completed");
  const grant = Object.freeze({}); grants.set(grant, { directory, digest: q.review.digest, identity: q.review.directoryIdentity,
    receiptIdentity: q.review.identity, keyIdentity: q.review.keyIdentity,
    at: performance.now(), wall: Date.now(), lifetime: q.review.payload.binding.fixture ? 600000 : 60000,
    assertOwnerAuthority, fixture: fixture && structuredClone(fixture), id: randomUUID(), done: false }); return grant;
}
export function reconcileNativeArtifacts(grant) {
  const g = grants.get(grant); if (!g) fail("native_recovery_approval_unproven");
  if (g.done) return Object.freeze({ completed: true, replay: true, deleted: 0 });
  const authority = () => {
    g.assertOwnerAuthority();
    if (performance.now() - g.at < 0 || performance.now() - g.at >= g.lifetime || Date.now() < g.wall || Date.now() - g.wall >= g.lifetime) fail("native_recovery_approval_expired");
  };
  authority(); const q = qualify(g.directory, g.fixture);
  if (q.complete || q.review.digest !== g.digest || q.review.directoryIdentity !== g.identity
      || q.review.identity !== g.receiptIdentity || q.review.keyIdentity !== g.keyIdentity) fail("native_recovery_approval_changed");
  const controller = acquireReconciliationController(q, g);
  try {
  const barrierPath = path.join(q.state, recoveryLockFilename); let record = q.previous;
  authority();
  if (!record) {
    const fd = openSync(barrierPath, "wx", 0o600); try { writeFileSync(fd, bytes({ approval: g.id, reviewDigest: g.digest })); fsyncSync(fd); } finally { closeSync(fd); }
    record = { version: 1, reviewDigest: g.digest, phase: "prepared", barrier: nativeArtifactSnapshot(barrierPath) };
    if (q.review.payload.binding.fixture) {
      const p = q.review.payload;
      record.fixture = { rootDigest: nativeDigest(g.fixture.root), plan: p.fixturePlan, planDigest: p.fixturePlanDigest,
        removed: p.stage === "cleaned" ? p.fixturePlan.length : 0, pending: null };
    }
    journal(g.directory, q.key, record);
  } else matches(q.state, record.barrier);
  const check = () => {
    authority();
    if (nativeArtifactSnapshot(controller.file).digest !== controller.artifact.digest || physicalIdentity(controller.file, false) !== controller.artifact.record.payload.self) fail("native_recovery_controller_unproven");
    if (physicalIdentity(q.state) !== q.stateIdentity || physicalIdentity(g.directory) !== g.identity) fail("native_recovery_parent_changed");
    matches(q.state, record.barrier); matches(q.state, q.review.payload.binding.spent);
    const current = readDurableNativeReview(g.directory);
    if (current.digest !== g.digest || current.identity !== g.receiptIdentity || current.keyIdentity !== g.keyIdentity) fail("native_recovery_review_changed");
    ownerGone(q.review.payload.binding.writer.record.ownerProcess, "owner");
    ownerGone({ pid: q.review.payload.job.rootPid, creationTime: q.review.payload.job.rootCreationTime }, "root");
    ownerGone({ pid: q.review.payload.job.launcherPid, creationTime: q.review.payload.job.launcherCreationTime }, "launcher");
    if (q.review.payload.binding.fixture) verifyFixtureRecovery({ ...q, previous: record }, g.fixture);
  };
  const step = phase => { record = { ...record, phase }; journal(g.directory, q.key, record); };
  const b = q.review.payload.binding;
  // Intent is durable before each unlink. An interrupted invocation can only
  // resume from this exact signed pair and a fresh, explicit approval.
  check();
  if (record.fixture && record.fixture.removed < record.fixture.plan.length) {
    for (let index = record.fixture.removed; index < record.fixture.plan.length; index++) {
      check(); record.fixture.pending = index; step("fixture_remove_intent"); check();
      const inventory = assertB26Remaining(g.fixture.root, record.fixture.plan, index, index), item = record.fixture.plan[index], file = inventory.paths.get(item.pathDigest);
      if (file) {
        if (physicalIdentity(file, item.kind === "directory") !== item.identity) fail("native_recovery_fixture_binding_changed");
        if (item.kind === "directory") rmdirSync(file); else unlinkSync(file);
        if (b26Exists(file)) fail("native_recovery_fixture_delete_unproven");
      }
      record.fixture.removed = index + 1; record.fixture.pending = null; step("fixture_removed_entry");
    }
    step("fixture_removed"); check();
  }
  if (!["lease_removed", "writer_remove_intent", "writer_removed", "complete"].includes(record.phase)) {
    matches(q.state, b.writer, q.review.payload.leaseWriterReleaseIntent === true); step("lease_remove_intent"); check();
    if (matches(q.state, b.lease, true)) unlinkSync(path.join(q.state, b.lease.name));
    step("lease_removed");
  }
  if (!["writer_removed", "complete"].includes(record.phase)) {
    if (existsSync(path.join(q.state, b.lease.name))) fail("native_recovery_foreign_or_changed_artifact");
    step("writer_remove_intent"); check();
    if (matches(q.state, b.writer, true)) unlinkSync(path.join(q.state, b.writer.name));
    step("writer_removed");
  }
  check();
  if (existsSync(path.join(q.state, b.writer.name)) || existsSync(path.join(q.state, b.lease.name))) fail("native_recovery_readback_failed");
  step("complete"); matches(q.state, record.barrier); unlinkSync(barrierPath);
  g.done = true; return Object.freeze({ completed: true, replay: false, deleted: 2, spentRetained: true,
    ...(record.fixture ? { fixtureDeletedEntries: record.fixture.plan.length, executionAuthorized: false } : {}) });
  } finally {
    if (b26Exists(controller.file) && nativeArtifactSnapshot(controller.file).digest === controller.artifact.digest
        && physicalIdentity(controller.file, false) === controller.artifact.record.payload.self) unlinkSync(controller.file);
  }
}
