import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

export function recoveryError(reason) {
  return Object.assign(new Error("agent_execution_recovery_blocked"), { recoveryReason: reason, retryable: false });
}

export function classifyRecovery(execution, enabled) {
  if (!enabled) throw recoveryError("runtime_disabled");
  if (execution?.cancelRequestedAt) throw recoveryError("recovery_conflict");
  if (!Number.isFinite(Date.parse(execution?.leaseExpiresAt)) || Date.parse(execution.leaseExpiresAt) <= Date.now()) throw recoveryError("lease_expired");
  const c = execution?.checkpoint;
  if (c?.schemaVersion !== "roost-recovery-v1" || !Number.isInteger(execution.checkpointVersion) || execution.checkpointVersion < 1) throw recoveryError("checkpoint_missing");
  if (c.stage === "claimed" && c.packetRevision === null && c.workspaceDigest === null) return "restart_same_attempt";
  if (c.stage === "prepared" && /^[a-f0-9]{64}$/.test(c.packetRevision) && /^[a-f0-9]{64}$/.test(c.workspaceDigest)) return "resume_from_checkpoint";
  throw recoveryError(c.stage === "effect_possible" ? "effect_may_have_occurred" : "process_may_be_running");
}

function git(directory, args) {
  return new Promise((resolve, reject) => execFile("git", args, { cwd: directory, windowsHide: true, timeout: 10000, maxBuffer: 16 * 1024 * 1024, encoding: "buffer" }, (error, stdout) => error ? reject(recoveryError("workspace_changed")) : resolve(stdout)));
}

export async function workspaceDigest(directory) {
  const hash = createHash("sha256");
  // Separate index/worktree digests catch staging changes as well as content.
  for (const args of [["rev-parse", "HEAD"], ["rev-parse", "--abbrev-ref", "HEAD"], ["diff", "--binary", "--no-ext-diff", "--no-textconv"], ["diff", "--cached", "--binary", "--no-ext-diff", "--no-textconv"]]) {
    const bytes = await git(directory, args); hash.update(String(bytes.length)); hash.update(":"); hash.update(bytes);
  }
  const untracked = (await git(directory, ["ls-files", "--others", "--exclude-standard", "-z"])).toString("utf8").split("\0").filter(Boolean).sort();
  let total = 0;
  for (const relative of untracked) {
    const filename = path.resolve(directory, relative);
    if (!filename.startsWith(path.resolve(directory) + path.sep)) throw recoveryError("workspace_changed");
    const stat = await lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 * 1024 || (total += stat.size) > 64 * 1024 * 1024) throw recoveryError("workspace_changed");
    hash.update(relative); hash.update("\0"); hash.update(await readFile(filename)); hash.update("\0");
  }
  return hash.digest("hex");
}

export function assertRecoverySnapshot(checkpoint, packetRevision, digest) {
  if (checkpoint.stage === "prepared") {
    if (checkpoint.packetRevision !== packetRevision) throw recoveryError("packet_changed");
    if (checkpoint.workspaceDigest !== digest) throw recoveryError("workspace_changed");
  }
}
