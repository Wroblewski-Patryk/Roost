import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";

// Exact PID only, never command lines, environment or a host-wide process dump.
export function observeWindowsProcessIdentity(pid) {
  if (process.platform !== "win32" || !Number.isSafeInteger(pid) || pid < 1) throw Error("native_process_identity_unavailable");
  const source = `$ErrorActionPreference='Stop'; try{$p=Get-Process -Id ${pid} -ErrorAction Stop}catch{if($_.FullyQualifiedErrorId -like 'NoProcessFoundForGivenId*'){'null';exit 0};throw}; @{pid=[int]$p.Id;creationTime=$p.StartTime.ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress`;
  try {
    const value = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(source, "utf16le").toString("base64")],
      { windowsHide: true, timeout: 10000, maxBuffer: 4096, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
    if (value === null) return null;
    if (value.pid !== pid || !/^\d{16,20}$/.test(value.creationTime) || !value.executable) throw Error();
    const executable = realpathSync.native(value.executable);
    return Object.freeze({ pid, creationTime: value.creationTime,
      executablePathDigest: createHash("sha256").update(executable.toLowerCase()).digest("hex"),
      executableDigest: createHash("sha256").update(readFileSync(executable)).digest("hex") });
  } catch { throw Error("native_process_identity_unavailable"); }
}
let self;
// Conservative native negative observation for legacy release preflight only.
// No command lines, credentials, process termination or operator-supplied PIDs.
// Any SSH or qualified-launcher process (including an uninspectable suspended
// root) blocks this proof. The source-pinned launcher owns its sole,
// noninheritable KILL_ON_JOB_CLOSE handle in both native protocol versions.
export function observeReleasePreflightQuiescence() {
  if (process.platform !== "win32") throw Error("native_process_identity_unavailable");
  const source = "$ErrorActionPreference='Stop'; $p=@(Get-CimInstance Win32_Process -Filter \"Name='ssh.exe' OR Name='roost-job.exe' OR Name='roost-job-test.exe'\" -ErrorAction Stop); @{count=$p.Count}|ConvertTo-Json -Compress";
  try {
    const value = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(source, "utf16le").toString("base64")],
      { windowsHide: true, timeout: 10000, maxBuffer: 4096, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
    if (value.count !== 0) throw Error();
    return Object.freeze({ observedAt: new Date().toISOString(), sshProcesses: 0, nativeLaunchers: 0 });
  } catch { throw Error("native_process_identity_unavailable"); }
}
export function currentNativeProcessIdentity() {
  if (!self) self = observeWindowsProcessIdentity(process.pid);
  if (!self || self.pid !== process.pid) throw Error("native_process_identity_unavailable");
  return self;
}

// A reused PID proves absence only with complete native identities and a
// strictly later creation time. Changed executable bytes alone are insufficient.
export function recordedProcessIsAbsent(recorded, observed) {
  const valid = value => value && Number.isInteger(value.pid) && value.pid > 0
    && /^\d{16,20}$/.test(value.creationTime ?? "")
    && /^[a-f0-9]{64}$/.test(value.executablePathDigest ?? "")
    && /^[a-f0-9]{64}$/.test(value.executableDigest ?? "");
  if (!valid(recorded)) return false;
  if (observed === null) return true;
  return Boolean(valid(observed) && observed.pid === recorded.pid
    && BigInt(observed.creationTime) > BigInt(recorded.creationTime));
}
