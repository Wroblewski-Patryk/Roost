import { randomUUID, createHash } from "node:crypto";
import { currentNativeProcessIdentity, observeWindowsProcessIdentity } from "./agent-host-process-identity.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";
import { lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { readFileSync, lstatSync, existsSync } from "node:fs";

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
        || checkpoint?.stage === "spawn_intent" && item?.errorState?.code === "agent_readonly_terminal_reconciled"
          && item.errorState?.details?.priorCode === "code_reviewer_unproven"
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
    if (await readFile(lockPath, "utf8") !== bytes) throw new Error("agent_host_writer_locked");
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

export async function acquireWriterLock(directory = writerStateDirectory, { recoveryCandidate, terminalCandidates } = {}) {
  await mkdir(directory, { recursive: false }).catch((error) => { if (error.code !== "EEXIST") throw error; });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("agent_host_state_directory_invalid");
  const lockPath = path.join(directory, writerLockFilename);
  if (await lstat(path.join(directory, recoveryLockFilename)).catch((error) => { if (error.code !== "ENOENT") throw error; return null; })) throw new Error("agent_host_writer_locked");
  if (recoveryCandidate) await reclaimBeforeSpawn(directory, recoveryCandidate);
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
  const proof = { file: lockPath, nonce: ownerNonce, released: false };
  const lock = {
    sessionId: ownerNonce,
    async checkpoint(execution) {
      const current = JSON.parse(await readFile(lockPath, "utf8"));
      if (current.ownerNonce !== ownerNonce) throw new Error("agent_host_writer_lock_owner_changed");
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
      await unlink(lockPath);
      released = true;
      proof.released = true;
    }
  };
  liveWriters.set(lock, proof);
  return lock;
}
