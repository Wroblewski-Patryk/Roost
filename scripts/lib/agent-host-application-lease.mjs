import path from "node:path";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, lstatSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
import { nativeDigest, physicalIdentity } from "./agent-host-native-footprint.mjs";
import { nativeBoundaryError } from "./agent-host-native-authority.mjs";

const leases = new WeakMap();
const observationSchema = z.array(z.object({ port: z.number().int().min(1).max(65535),
  pid: z.number().int().positive(), createdAt: z.string().datetime() }).strict()).max(32);
// Read only declared listening ports and the identity of their owners; no whole
// machine process/command-line dump. Missing observation fails runtime tasks.
export function observeDeclaredApplication(ports) {
  if (process.platform !== "win32" || ports.some(p => !Number.isInteger(p) || p < 1 || p > 65535) || !ports.length) throw nativeBoundaryError("native_application_observation_required");
  const source = `$ErrorActionPreference='Stop'; $result=@(); foreach($port in @(${ports.join(",")})){ $connections=@(Get-NetTCPConnection -ErrorAction Stop | Where-Object { $_.State -eq 'Listen' -and $_.LocalPort -eq $port }); foreach($item in $connections){ $p=Get-Process -Id $item.OwningProcess -ErrorAction Stop; $result+=@{port=[int]$port;pid=[int]$p.Id;createdAt=$p.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')} } }; ConvertTo-Json -Compress -InputObject @($result)`;
  try {
    const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(source, "utf16le").toString("base64")], {
      windowsHide: true, shell: false, timeout: 10000, maxBuffer: 16384, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return observationSchema.parse(JSON.parse(raw));
  } catch { throw nativeBoundaryError("native_application_observation_required"); }
}
function observe(saved) {
  if (!saved.runtime.required) return [];
  try {
    const result = observationSchema.parse(saved.observer(saved.runtime.ports));
    if (result.some(r => !saved.runtime.ports.includes(r.port))) throw new Error();
    return result;
  } catch { throw nativeBoundaryError("native_application_observation_required"); }
}
export function acquireApplicationLease({ writerLock, applicationId, attempt, runtime, observer = observeDeclaredApplication }) {
  const writer = assertWriterLock(writerLock), directoryIdentity = physicalIdentity(writer.directory);
  const saved = { writerLock, runtime: structuredClone(runtime), observer, applicationId, attempt, nonce: randomUUID(), released: false,
    directoryIdentity, file: path.join(writer.directory, `application-${nativeDigest(applicationId)}.lease`) };
  if (observe(saved).length) throw nativeBoundaryError("native_application_instance_busy");
  // Even an edit-only attempt reserves this application's slot, without asking
  // for runtime process/port data or running the observer.
  const bytes = JSON.stringify({ version: 1, nonce: saved.nonce, attempt, application: nativeDigest(applicationId), writer: writer.reference });
  try { writeFileSync(saved.file, bytes, { flag: "wx", mode: 0o600 }); }
  catch { throw nativeBoundaryError("native_application_lease_busy"); }
  const handle = Object.freeze({}); saved.bytes = bytes; leases.set(handle, saved);
  return handle;
}
export function assertApplicationLease(handle) {
  const saved = leases.get(handle);
  try {
    if (!saved || saved.released || physicalIdentity(path.dirname(saved.file)) !== saved.directoryIdentity) throw new Error();
    assertWriterLock(saved.writerLock); physicalIdentity(saved.file, false);
    if (lstatSync(saved.file).size > 2048 || readFileSync(saved.file, "utf8") !== saved.bytes) throw new Error();
    if (observe(saved).length) throw nativeBoundaryError("native_application_instance_busy");
    return { reference: nativeDigest(saved.nonce), state: saved.runtime.required ? "declared_ports_empty" : "runtime_not_required", processCoverage: saved.runtime.required ? "declared_listening_ports_only" : "not_observed" };
  } catch (e) { if (e.protocolAdmission) throw e; throw nativeBoundaryError("native_application_lease_unproven"); }
}
export function releaseApplicationLease(handle) {
  const saved = leases.get(handle);
  if (!saved || saved.released) throw nativeBoundaryError("native_application_lease_unproven");
  assertApplicationLease(handle); // Never stop or kill a foreign listener.
  unlinkSync(saved.file); saved.released = true;
}
