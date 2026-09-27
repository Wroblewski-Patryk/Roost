import { execFile } from "node:child_process";
import { recoveryError } from "./agent-host-recovery.mjs";

export async function createTaskBranch(repositoryPath, branch) {
  if (!/^codex\/task-[a-f0-9-]{36}$/.test(branch)) throw recoveryError("repository_mismatch");
  await new Promise((resolve, reject) => execFile("git", ["-c", "core.hooksPath=NUL", "-c", "core.fsmonitor=false",
    "switch", "--create", branch, "--no-track"], { cwd: repositoryPath, shell: false, windowsHide: true, timeout: 10000,
    maxBuffer: 16384, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1" } },
  error => error ? reject(recoveryError("repository_mismatch")) : resolve()));
}
