import { randomUUID, createHash } from "node:crypto";
import { currentNativeProcessIdentity, observeWindowsProcessIdentity } from "./agent-host-process-identity.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";
import { lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { readFileSync, lstatSync, existsSync, openSync, closeSync, ftruncateSync, writeSync, fsyncSync, fstatSync } from "node:fs";
import { qualifyReleaseWriterReclaim } from "./agent-host-release-writer-recovery.mjs";
import { nativeDigest, physicalIdentity } from "./agent-host-native-footprint.mjs";

const liveWriters = new WeakMap();
export function writerRecoveryEvidence(lock) {
  const checked = assertWriterLock(lock), saved = liveWriters.get(lock), bytes = readFileSync(saved.file);
  const s = lstatSync(saved.file, { bigint: true });
  const raw = JSON.parse(bytes), process = raw.ownerProcess;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw.createdAt ?? "")
      || process && (process.pid !== raw.ownerPid || !/^\d{16,20}$/.test(process.creationTime ?? "")
        || !/^[a-f0-9]{64}$/.test(process.executablePathDigest ?? "") || !/^[a-f0-9]{64}$/.test(process.executableDigest ?? ""))) throw Error("agent_host_writer_identity_unproven");
  const record = { ownerPid: raw.ownerPid, ownerNonce: raw.ownerNonce, createdAt: raw.createdAt,
    ownerProcess: process ? { pid: process.pid, creationTime: process.creationTime, executablePathDigest: process.executablePathDigest, executableDigest: process.executableDigest } : null };
  return { directory: checked.directory, name: writerLockFilename, identity: `${s.dev}:${s.ino}`, digest: createHash("sha256").update(bytes).digest("hex"), record };
}
export function assertWriterLock(lock) {
  const saved = liveWriters.get(lock);
  try {
    if (!saved || saved.released) throw new Error();
    if (existsSync(path.join(path.dirname(saved.file), recoveryLockFilename))) throw new Error("agent_host_writer_reconciliation_pending");
    const stat = lstatSync(saved.file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 65536) throw new Error();
    const current = JSON.parse(readFileSync(saved.file, "utf8"));
    if (current.ownerNonce !== saved.nonce || current.ownerPid !== process.pid) throw new Error("agent_host_writer_lock_owner_changed");
    return { reference: saved.nonce, directory: path.dirname(saved.file) };
  } catch (e) {
    throw new Error(e.message === "agent_host_writer_lock_owner_changed" ? e.message : "agent_host_writer_lock_unproven");
  }
}

// Shared by every normal host process on the approved laptop, not by application or key.
export const writerStateDirectory = "C:\\ProgramData\\Roost";
export const writerLockFilename = "agent-host-writer.lock";
export const recoveryLockFilename = "agent-host-recovery.lock";

function ownerIsGone(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return false; } catch (error) { return error.code === "ESRCH"; }
}

async function reclaimBeforeSpawn(directory, candidate) {
  const gatePath = path.join(directory, recoveryLockFilename);
  let gate;
  try { gate = await open(gatePath, "wx", 0o600); } catch { throw new Error("agent_host_writer_locked"); }
  try {
    const lockPath = path.join(directory, writerLockFilename);
    const current = JSON.parse(await readFile(lockPath, "utf8"));
    const expected = localCheckpoint(candidate);
    if (candidate?.contextInvalidatedAt || !candidate?.leaseExpiresAt || Date.parse(candidate.leaseExpiresAt) <= Date.now() || !["claimed", "branch_intent", "branch_ready", "prepared"].includes(expected.stage)
      || current.ownerNonce !== expected.sessionId || JSON.stringify(current.checkpoint) !== JSON.stringify(expected)
      || !ownerIsGone(current.ownerPid)) throw new Error("agent_host_writer_locked");
    // A dead PID alone is never sufficient. A matching durable pre-spawn barrier
    // proves this host never launched a writer, including across an OS restart.
    const latest = JSON.parse(await readFile(lockPath, "utf8"));
    if (JSON.stringify(latest) !== JSON.stringify(current)) throw new Error("agent_host_writer_locked");
    await unlink(lockPath);
  } finally { await gate.close(); await unlink(gatePath); }
}

function reconciledReadOnlySpawn(item, checkpoint, writerBytes) {
  const error = item?.errorState, details = error?.details;
  const contract = item?.metadata?.executionContract, pin = item?.metadata?.readyContextPin;
  const hash = value => /^[a-f0-9]{64}$/.test(value ?? "");
  return item?.status === "failed" && item.leaseToken === null && item.contextInvalidatedAt === null
    && error?.code === "agent_readonly_spawn_reconciled" && error.retryable === false
    && details?.schemaVersion === "roost-readonly-spawn-reconciliation-v1"
    && details.checkpointStage === "spawn_intent" && details.checkpointSessionId === checkpoint.sessionId
    && details.checkpointVersion === item.checkpointVersion
    && details.writerLockDigest === createHash("sha256").update(writerBytes).digest("hex")
    && hash(details.repositoryDigest) && hash(details.attestationDigest)
    && /^[a-f0-9]{40}$/.test(details.baselineCommit ?? "")
    && typeof details.baselineBranch === "string" && details.baselineBranch.length > 0 && details.baselineBranch.length <= 240
    && Number.isFinite(Date.parse(details.observedAt)) && Date.parse(details.observedAt) <= Date.parse(item.completedAt)
    && hash(checkpoint.packetRevision) && hash(checkpoint.contextRevision) && hash(checkpoint.workspaceDigest)
    && checkpoint.branch === undefined && checkpoint.headCommit === undefined
    && contract?.nativeBoundary?.profile === "inspect-readonly"
    && ["auditor", "verifier", "code-reviewer"].includes(contract.nativeBoundary.inspectReadOnly?.kind)
    && contract?.access?.sandbox === "read-only"
    && contract.access.tools?.length === 1 && contract.access.tools[0] === "repository_read"
    && contract.access.permissions?.length === 1 && contract.access.permissions[0] === "repository_read"
    && contract.singleTask?.branch === details.baselineBranch
    && hash(pin?.revision) && pin.riskAdmissionCommit === details.baselineCommit
    && item.summary === null && item.codexThreadId === null && item.finalResponse === null
    && Array.isArray(item.changedFiles) && item.changedFiles.length === 0
    && (item.verification === null || item.verification && typeof item.verification === "object"
      && !Array.isArray(item.verification) && Object.keys(item.verification).length === 0)
    && item.metadata.resultRevision == null;
}

function reconciledUnsignedCodingSpawn(item, checkpoint, writerBytes) {
  const error = item?.errorState, d = error?.details, contract = item?.metadata?.executionContract;
  const pin = item?.metadata?.readyContextPin, hash = value => /^[a-f0-9]{64}$/.test(value ?? "");
  const empty = value => value === null || value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0;
  const unsigned = d?.unsignedLaunch;
  return item?.status === "failed" && item.leaseToken === null && item.contextInvalidatedAt === null
    && item.attempt === 1 && error?.code === "agent_coding_unsigned_spawn_reconciled" && error.retryable === false
    && d?.schemaVersion === "roost-coding-unsigned-spawn-reconciliation-v1"
    && d.checkpointStage === "spawn_intent" && d.checkpointSessionId === checkpoint.sessionId
    && d.checkpointVersion === item.checkpointVersion
    && d.writerLockDigest === createHash("sha256").update(writerBytes).digest("hex")
    && hash(d.repositoryDigest) && hash(d.attestationDigest) && hash(d.readyRevision) && d.readyRevision === pin?.revision
    && /^[a-f0-9]{40}$/.test(d.baselineCommit ?? "") && d.baselineCommit === checkpoint.headCommit
    && pin?.riskAdmissionCommit === d.baselineCommit && d.baselineBranch === checkpoint.branch
    && contract?.singleTask?.branch === `codex/task-${item.taskId}` && contract.singleTask.branch === d.baselineBranch
    && contract?.nativeBoundary?.profile === "coding-local"
    && contract?.modelSelection?.schemaVersion === "roost-managed-hermes-backend-v1"
    && contract.modelSelection.backend === "codex_responses"
    && hash(checkpoint.packetRevision) && hash(checkpoint.contextRevision) && hash(checkpoint.workspaceDigest)
    && Number.isFinite(Date.parse(d.observedAt)) && Date.parse(d.observedAt) <= Date.parse(item.completedAt)
    && d.nativeProcessesAbsent === true && d.ownerProcessAbsent === true && d.workingTreeClean === true
    && d.applicationLease?.state === "released" && d.applicationLease.absent === true
    && unsigned?.schemaVersion === "roost-coding-unsigned-spawn-observation-v1"
    && ["nativeReviewAbsent", "managedBackendEvidenceAbsent", "managedDecisionAbsent", "managedSpentReservationAbsent", "archivedAdmissionAbsent"].every(key => unsigned[key] === true)
    && item.summary === null && item.codexThreadId === null && item.finalResponse === null
    && Array.isArray(item.changedFiles) && item.changedFiles.length === 0
    && empty(item.verification) && empty(item.usage) && item.metadata.resultRevision == null;
}

async function assertUnsignedCodingArtifactsAbsent(directory, checkpoint) {
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  if (!uuid.test(checkpoint.executionId ?? "") || !uuid.test(checkpoint.applicationId ?? "")) throw Error("agent_host_writer_locked");
  const anchor = path.join(directory, "trusted-provider-pilot"), spent = path.join(anchor, "spent");
  for (const parent of [anchor, spent]) {
    const stat = await lstat(parent).catch(e => { if (e.code === "ENOENT") return null; throw e; });
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw Error("agent_host_writer_locked");
  }
  for (const file of [path.join(directory, `native-review-${checkpoint.executionId}`),
    path.join(directory, `managed-spent-${checkpoint.executionId}.json`),
    path.join(directory, `application-${nativeDigest(checkpoint.applicationId)}.lease`),
    path.join(anchor, "managed-backend-evidence.json"), path.join(anchor, "trusted-provider-pilot.json"),
    path.join(spent, checkpoint.executionId)]) {
    if (await lstat(file).catch(e => { if (e.code === "ENOENT") return null; throw e; })) throw Error("agent_host_writer_locked");
  }
}

// Only the live in-process Writer capability may publish this durable release
// barrier. Torn writes deliberately fail closed, like ordinary checkpoints.
export function persistReleaseWriterCheckpoint(lock, checkpoint) {
  const checked = assertWriterLock(lock), saved = liveWriters.get(lock), stat = lstatSync(saved.file, { bigint: true });
  const current = JSON.parse(readFileSync(saved.file, "utf8"));
  current.releaseCheckpoint = guardHostContent(checkpoint).value;
  const bytes = Buffer.from(JSON.stringify(current) + "\n");
  if (bytes.length > 65536) throw Error("agent_host_release_checkpoint_limit");
  const fd = openSync(saved.file, "r+");
  try {
    const opened = fstatSync(fd, { bigint: true });
    // Windows libuv reports path lstat.dev=0 but the handle's real volume ID.
    if (stat.dev !== 0n && opened.dev !== stat.dev || opened.ino !== stat.ino || opened.nlink !== 1n) throw Error("agent_host_writer_lock_owner_changed");
    ftruncateSync(fd, 0); let offset = 0; while (offset < bytes.length) offset += writeSync(fd, bytes, offset); fsyncSync(fd);
  } finally { closeSync(fd); }
  return createHash("sha256").update(bytes).digest("hex");
}
export function clearWriterReleaseRecoveryRestriction(lock) {
  assertWriterLock(lock); const saved = liveWriters.get(lock); saved.releaseRecovery = null;
}

async function reclaimTerminalBeforeSpawn(directory, candidates) {
  const lockPath = path.join(directory, writerLockFilename);
  const prior = await lstat(lockPath).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (!prior) return;
  const gatePath = path.join(directory, recoveryLockFilename);
  let gate;
  try { gate = await open(gatePath, "wx", 0o600); } catch { throw new Error("agent_host_writer_locked"); }
  try {
    const stat = await lstat(lockPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 65536) throw new Error("agent_host_writer_locked");
    const bytes = await readFile(lockPath, "utf8"), current = JSON.parse(bytes);
    const checkpoint = current.checkpoint;
    if (!Array.isArray(candidates)
      || !current.ownerProcess || current.ownerProcess.pid !== current.ownerPid
      || !/^[a-f0-9]{64}$/.test(current.ownerProcess.executableDigest ?? "")
      || !/^[a-f0-9]{64}$/.test(current.ownerProcess.executablePathDigest ?? "")
      || !/^\d{16,20}$/.test(current.ownerProcess.creationTime ?? "")) throw new Error("agent_host_writer_locked");
    const candidate = candidates.find(item => item?.id === checkpoint.executionId && item?.agentHostId
      && ["failed", "cancelled"].includes(item.status) && item.leaseExpiresAt === null
      && Number.isInteger(item.checkpointVersion) && item.checkpointVersion >= 1
      && Number.isFinite(Date.parse(item.completedAt))
      && JSON.stringify(localCheckpoint(item)) === JSON.stringify(checkpoint)
      && (["claimed", "branch_intent", "branch_ready", "prepared"].includes(checkpoint?.stage)
        || checkpoint?.stage === "spawn_intent" && reconciledReadOnlySpawn(item, checkpoint, bytes)
        || checkpoint?.stage === "spawn_intent" && reconciledUnsignedCodingSpawn(item, checkpoint, bytes)
        || checkpoint?.stage === "spawn_intent" && item?.errorState?.code === "agent_readonly_terminal_reconciled"
          && ["code_reviewer_unproven", "managed_admission_blocked", "readonly_boundary_unproven"].includes(item.errorState?.details?.priorCode)
          && item.errorState?.details?.checkpointStage === "spawn_intent"
          && item.errorState?.details?.checkpointSessionId === checkpoint.sessionId
          && item.errorState?.details?.writerLockDigest === createHash("sha256").update(bytes).digest("hex")
          && item.errorState?.details?.nativeProcessesAbsent === true
          && item.errorState?.details?.pilotBaselineUnchanged === true
          && item.codexThreadId === null && item.finalResponse === null
          && Array.isArray(item.changedFiles) && item.changedFiles.length === 0
        || checkpoint?.stage === "spawn_intent" && item?.errorState?.code === "managed_admission_blocked"
          && (item.errorState?.details?.phase === "backend_evidence_persist"
            || item.errorState?.details?.phase === "backend_evidence_request"
              && item.errorState?.details?.reason === "roost_http_409" && item.errorState?.details?.status === 409)
          && item.codexThreadId === null && item.finalResponse === null
          && Array.isArray(item.changedFiles) && item.changedFiles.length === 0));
    if (!candidate || observeWindowsProcessIdentity(current.ownerPid) !== null) throw new Error("agent_host_writer_locked");
    if (candidate.errorState?.code === "agent_coding_unsigned_spawn_reconciled")
      await assertUnsignedCodingArtifactsAbsent(directory, checkpoint);
    let retainedLease = null;
    if (checkpoint?.stage === "spawn_intent" && ["agent_readonly_terminal_reconciled", "agent_readonly_spawn_reconciled"].includes(candidate.errorState?.code)) {
      // A failed read-only boundary can retain its application reservation.
      // Only the normal terminal reconciliation receipt may retire that exact
      // lease; generic failures and coding checkpoints grant no lease cleanup.
      const attestation = candidate.errorState.details.applicationLease;
      const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
      if (!uuid.test(checkpoint.applicationId ?? "") || !uuid.test(checkpoint.executionId ?? "")
        || !(attestation?.state === "retained" && /^[a-f0-9]{64}$/.test(attestation.digest ?? "")
          || attestation?.state === "released" && attestation.absent === true)) throw new Error("agent_host_writer_locked");
      const application = nativeDigest(checkpoint.applicationId);
      const file = path.join(directory, `application-${application}.lease`);
      const leaseStat = await lstat(file, { bigint: true }).catch(error => { if (error.code === "ENOENT") return null; throw error; });
      if (leaseStat) {
        if (attestation.state !== "retained" || !leaseStat.isFile() || leaseStat.isSymbolicLink()
          || leaseStat.nlink !== 1n || leaseStat.size > 2048n) throw new Error("agent_host_writer_locked");
        let identity; try { identity = physicalIdentity(file, false); } catch { throw new Error("agent_host_writer_locked"); }
        const leaseBytes = await readFile(file); let record;
        try { record = JSON.parse(leaseBytes); } catch { throw new Error("agent_host_writer_locked"); }
        if (createHash("sha256").update(leaseBytes).digest("hex") !== attestation.digest
          || !record || typeof record !== "object" || Array.isArray(record)
          || Object.keys(record).sort().join() !== "application,attempt,nonce,version,writer"
          || record.version !== 1 || !uuid.test(record.nonce ?? "") || record.attempt !== checkpoint.executionId
          || record.application !== application || record.writer !== current.ownerNonce) throw new Error("agent_host_writer_locked");
        retainedLease = { file, bytes: leaseBytes, identity };
      }
      // An absent retained lease can be the uncertain outcome of the previous
      // exact unlink. The same terminal receipt still binds the retained Writer.
      const latestLease = await lstat(file).catch(error => { if (error.code === "ENOENT") return null; throw error; });
      if (!retainedLease && latestLease) throw new Error("agent_host_writer_locked");
    }
    if (await readFile(lockPath, "utf8") !== bytes) throw new Error("agent_host_writer_locked");
    if (retainedLease) {
      let identity; try { identity = physicalIdentity(retainedLease.file, false); } catch { throw new Error("agent_host_writer_locked"); }
      if (identity !== retainedLease.identity || !(await readFile(retainedLease.file)).equals(retainedLease.bytes)) throw new Error("agent_host_writer_locked");
      await unlink(retainedLease.file);
      if (await readFile(lockPath, "utf8") !== bytes) throw new Error("agent_host_writer_locked");
    }
    await unlink(lockPath);
  } finally { await gate.close(); await unlink(gatePath); }
}

export function localCheckpoint(execution) {
  const checkpoint = execution?.checkpoint;
  return { schemaVersion: checkpoint?.schemaVersion, executionId: execution?.id, workspaceId: execution?.workspaceId,
    applicationId: execution?.applicationId, taskId: execution?.taskId, attempt: execution?.attempt,
    checkpointVersion: execution?.checkpointVersion, stage: checkpoint?.stage, sessionId: checkpoint?.sessionId,
    packetRevision: checkpoint?.packetRevision, workspaceDigest: checkpoint?.workspaceDigest, contextRevision: checkpoint?.contextRevision,
    ...(checkpoint?.branch ? { branch: checkpoint.branch } : {}), ...(checkpoint?.headCommit ? { headCommit: checkpoint.headCommit } : {}) };
}

async function reclaimSealedRelease(directory, candidate) {
  const gatePath = path.join(directory, recoveryLockFilename), lockPath = path.join(directory, writerLockFilename);
  const prior = await lstat(lockPath).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (!prior) return null; // First release-only Worker; wx below still fences a racing owner.
  let gate;
  try { gate = await open(gatePath, "wx", 0o600); } catch { throw Error("agent_host_writer_locked"); }
  try {
    const stat = await lstat(lockPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 65536) throw Error("agent_host_writer_locked");
    const bytes = await readFile(lockPath, "utf8"), current = JSON.parse(bytes);
    const recovered = qualifyReleaseWriterReclaim(current, candidate, directory);
    const latest = await lstat(lockPath);
    if (latest.dev !== stat.dev || latest.ino !== stat.ino || await readFile(lockPath, "utf8") !== bytes) throw Error("agent_host_writer_locked");
    if (recovered.preflightQuiescence) {
      const archivePath = path.join(directory, `release-writer-reclaimed-${recovered.priorContextNonce}.json`);
      let archive;
      try { archive = await open(archivePath, "wx", 0o600); }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        const before = await lstat(archivePath);
        if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > 65536) throw Error("agent_host_writer_locked");
        const preserved = JSON.parse(await readFile(archivePath, "utf8"));
        const stable = recovery => { const copy = structuredClone(recovery); delete copy.preflightQuiescence?.observedAt; return copy; };
        const after = await lstat(archivePath);
        if (Object.keys(preserved).length !== 2 || JSON.stringify(preserved.originalWriter) !== JSON.stringify(current)
          || JSON.stringify(stable(preserved.recovery)) !== JSON.stringify(stable(recovered))
          || after.dev !== before.dev || after.ino !== before.ino || !after.isFile() || after.isSymbolicLink() || after.nlink !== 1) throw Error("agent_host_writer_locked");
      }
      if (archive) {
        try { await archive.writeFile(JSON.stringify({ originalWriter: current, recovery: recovered }) + "\n"); await archive.sync(); }
        finally { await archive.close(); }
      }
      const retained = await lstat(lockPath);
      if (retained.dev !== stat.dev || retained.ino !== stat.ino || !retained.isFile() || retained.isSymbolicLink()
        || retained.nlink !== 1 || await readFile(lockPath, "utf8") !== bytes) throw Error("agent_host_writer_locked");
    }
    await unlink(lockPath); return recovered;
  } catch { throw Error("agent_host_writer_locked"); }
  finally { await gate.close(); await unlink(gatePath); }
}

export async function acquireWriterLock(directory = writerStateDirectory, { recoveryCandidate, terminalCandidates, releaseRecoveryCandidate } = {}) {
  await mkdir(directory, { recursive: false }).catch((error) => { if (error.code !== "EEXIST") throw error; });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("agent_host_state_directory_invalid");
  const lockPath = path.join(directory, writerLockFilename);
  if (await lstat(path.join(directory, recoveryLockFilename)).catch((error) => { if (error.code !== "ENOENT") throw error; return null; })) throw new Error("agent_host_writer_locked");
  let releaseRecovery = null;
  if (releaseRecoveryCandidate) releaseRecovery = await reclaimSealedRelease(directory, releaseRecoveryCandidate);
  else if (recoveryCandidate) await reclaimBeforeSpawn(directory, recoveryCandidate);
  else if (terminalCandidates) await reclaimTerminalBeforeSpawn(directory, terminalCandidates);
  const ownerNonce = randomUUID();
  let file;
  try {
    file = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("agent_host_writer_locked");
    throw error;
  }
  const record = { ownerPid: process.pid, ownerNonce, createdAt: new Date().toISOString() };
  // Older records deliberately remain unreadable as full recovery chains.
  // Obtain identity before publishing this NEW lock; never backfill a legacy lock.
  try { if (process.platform === "win32") record.ownerProcess = currentNativeProcessIdentity(); }
  catch (error) { await file.close(); await unlink(lockPath); throw error; }
  try {
    await file.writeFile(JSON.stringify(record) + "\n");
    await file.sync();
  } finally {
    await file.close();
  }
  // Close the race with a recovery barrier established while this lock was
  // being created. A reconciler also rechecks the exact lock under its barrier.
  if (await lstat(path.join(directory, recoveryLockFilename)).catch(e => { if (e.code !== "ENOENT") throw e; return null; })) {
    const current = JSON.parse(await readFile(lockPath, "utf8"));
    if (current.ownerNonce === ownerNonce) await unlink(lockPath);
    throw new Error("agent_host_writer_locked");
  }
  // Never reclaim by PID/age: an orphaned Codex process may still be writing.
  let released = false;
  const proof = { file: lockPath, nonce: ownerNonce, released: false, releaseRecovery };
  const lock = {
    sessionId: ownerNonce,
    get releaseRecovery() { return proof.releaseRecovery; },
    async checkpoint(execution) {
      const current = JSON.parse(await readFile(lockPath, "utf8"));
      if (current.ownerNonce !== ownerNonce) throw new Error("agent_host_writer_lock_owner_changed");
      if (proof.releaseRecovery || current.releaseCheckpoint && current.releaseCheckpoint.phase !== "all_local_children_closed") throw Error("agent_host_release_reconciliation_pending");
      // Starting a new managed attempt invalidates an older release barrier.
      delete record.releaseCheckpoint;
      record.checkpoint = guardHostContent(localCheckpoint(execution)).value;
      const handle = await open(lockPath, "r+");
      try {
        // Truncation makes torn writes unreadable, never a valid earlier stage.
        await handle.truncate(0);
        await handle.writeFile(JSON.stringify(record) + "\n");
        await handle.sync();
      } finally { await handle.close(); }
    },
    async release() {
      if (released) return;
      const current = JSON.parse(await readFile(lockPath, "utf8"));
      if (current.ownerNonce !== ownerNonce) throw new Error("agent_host_writer_lock_owner_changed");
      if (proof.releaseRecovery || current.releaseCheckpoint && current.releaseCheckpoint.phase !== "all_local_children_closed") throw Error("agent_host_release_reconciliation_pending");
      await unlink(lockPath);
      released = true;
      proof.released = true;
    }
  };
  liveWriters.set(lock, proof);
  return lock;
}
