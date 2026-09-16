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
export function currentNativeProcessIdentity() {
  if (!self) self = observeWindowsProcessIdentity(process.pid);
  if (!self || self.pid !== process.pid) throw Error("native_process_identity_unavailable");
  return self;
}
