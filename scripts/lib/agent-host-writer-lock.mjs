import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";

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
    if (!candidate?.leaseExpiresAt || Date.parse(candidate.leaseExpiresAt) <= Date.now() || !["claimed", "prepared"].includes(expected.stage)
      || current.ownerNonce !== expected.sessionId || JSON.stringify(current.checkpoint) !== JSON.stringify(expected)
      || !ownerIsGone(current.ownerPid)) throw new Error("agent_host_writer_locked");
    // A dead PID alone is never sufficient. A matching durable pre-spawn barrier
    // proves this host never launched a writer, including across an OS restart.
    const latest = JSON.parse(await readFile(lockPath, "utf8"));
    if (JSON.stringify(latest) !== JSON.stringify(current)) throw new Error("agent_host_writer_locked");
    await unlink(lockPath);
  } finally { await gate.close(); await unlink(gatePath); }
}

export function localCheckpoint(execution) {
  const checkpoint = execution?.checkpoint;
  return { schemaVersion: checkpoint?.schemaVersion, executionId: execution?.id, workspaceId: execution?.workspaceId,
    applicationId: execution?.applicationId, taskId: execution?.taskId, attempt: execution?.attempt,
    checkpointVersion: execution?.checkpointVersion, stage: checkpoint?.stage, sessionId: checkpoint?.sessionId,
    packetRevision: checkpoint?.packetRevision, workspaceDigest: checkpoint?.workspaceDigest };
}

export async function acquireWriterLock(directory = writerStateDirectory, { recoveryCandidate } = {}) {
  await mkdir(directory, { recursive: false }).catch((error) => { if (error.code !== "EEXIST") throw error; });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("agent_host_state_directory_invalid");
  const lockPath = path.join(directory, writerLockFilename);
  if (await lstat(path.join(directory, recoveryLockFilename)).catch((error) => { if (error.code !== "ENOENT") throw error; return null; })) throw new Error("agent_host_writer_locked");
  if (recoveryCandidate) await reclaimBeforeSpawn(directory, recoveryCandidate);
  const ownerNonce = randomUUID();
  let file;
  try {
    file = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("agent_host_writer_locked");
    throw error;
  }
  const record = { ownerPid: process.pid, ownerNonce, createdAt: new Date().toISOString() };
  try {
    await file.writeFile(JSON.stringify(record) + "\n");
    await file.sync();
  } finally {
    await file.close();
  }
  // Never reclaim by PID/age: an orphaned Codex process may still be writing.
  let released = false;
  return {
    sessionId: ownerNonce,
    async checkpoint(execution) {
      const current = JSON.parse(await readFile(lockPath, "utf8"));
      if (current.ownerNonce !== ownerNonce) throw new Error("agent_host_writer_lock_owner_changed");
      record.checkpoint = localCheckpoint(execution);
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
    }
  };
}
