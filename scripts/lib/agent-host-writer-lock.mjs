import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";

// Shared by every normal host process on the approved laptop, not by application or key.
export const writerStateDirectory = "C:\\ProgramData\\Roost";
export const writerLockFilename = "agent-host-writer.lock";

export async function acquireWriterLock(directory = writerStateDirectory) {
  await mkdir(directory, { recursive: false }).catch((error) => { if (error.code !== "EEXIST") throw error; });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("agent_host_state_directory_invalid");
  const lockPath = path.join(directory, writerLockFilename);
  const ownerNonce = randomUUID();
  let file;
  try {
    file = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("agent_host_writer_locked");
    throw error;
  }
  try {
    await file.writeFile(JSON.stringify({ ownerPid: process.pid, ownerNonce, createdAt: new Date().toISOString() }) + "\n");
    await file.sync();
  } finally {
    await file.close();
  }
  // Never reclaim by PID/age: an orphaned Codex process may still be writing.
  let released = false;
  return {
    async release() {
      if (released) return;
      const current = JSON.parse(await readFile(lockPath, "utf8"));
      if (current.ownerNonce !== ownerNonce) throw new Error("agent_host_writer_lock_owner_changed");
      await unlink(lockPath);
      released = true;
    }
  };
}
