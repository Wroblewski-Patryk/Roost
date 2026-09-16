import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdtemp, rm, realpath } from "node:fs/promises";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const windowsJobVersion = "roost-windows-job-v1";
const source = fileURLToPath(new URL("../roost-windows-job.cs", import.meta.url));
const exec = promisify(execFile), builds = new WeakMap(), receipts = new WeakMap();
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const fail = () => Object.assign(new Error("hermes_stop_recovery_unproven"), { leaseLost: true, retryable: false });
const uuid = z.string().uuid(), integer = z.number().int().nonnegative();
const base = { version: z.literal(windowsJobVersion), attempt: uuid };
const ownership = { job: uuid, assignedBeforeResume: z.boolean(), killOnClose: z.literal(true), breakaway: z.literal(false),
  controllerInJob: z.boolean(), inheritedJob: z.boolean(), rootPid: integer,
  rootCreationTime: z.string().regex(/^\d{16,20}$/).nullable(), launcherPid: integer.positive(), launcherCreationTime: z.string().regex(/^\d{16,20}$/) };
const eventSchema = z.discriminatedUnion("type", [
  z.object({ ...base, ...ownership, type: z.literal("assigned"), rootPid: integer.positive() }).strict(),
  z.object({ ...base, type: z.literal("data"), channel: z.enum(["stdout", "stderr"]), data: z.string().max(5464) }).strict(),
  z.object({ ...base, ...ownership, type: z.literal("receipt"), killOnClose: z.boolean(), resumed: z.boolean(), rootExit: integer.nullable(),
    activeProcesses: integer, jobClosed: z.boolean(), cleanup: z.boolean(), cleanupMs: integer, stdoutBytes: integer, stderrBytes: integer,
    terminationReason: z.enum(["root_exit", "timeout", "cancel", "lease_lost", "context_stop", "controller_shutdown", "controller_closed",
      "preparation_failed", "request_invalid", "startup_timeout", "protocol_error", "stdin_error", "pipe_error", "output_limit"]) }).strict()
]);

// Only this process's observed, hash-bound native receipts count. Persisted JSON,
// API metadata and configuration cannot restore qualification after a restart.
export function isWindowsJobReceipt(receipt) {
  const proof = receipts.get(receipt);
  return !!proof && performance.now() - proof.at >= 0 && performance.now() - proof.at < 60000 && receipt.cleanup === true && receipt.activeProcesses === 0;
}
export function hermesOwnedTreeBlockers(blockers, receipt) {
  return isWindowsJobReceipt(receipt) ? blockers.filter(x => x !== "hermes_stop_recovery_unproven") : [...blockers];
}

// Build only into a caller-owned temporary directory; no machine install/cache.
export async function buildWindowsJobLauncher(directory, { testFaults = false } = {}) {
  if (process.platform !== "win32" || process.arch !== "x64") throw fail();
  const executable = path.join(directory, testFaults ? "roost-job-test.exe" : "roost-job.exe");
  const compiler = path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
  try {
    const args = ["/nologo", "/target:exe", "/platform:x64", "/optimize+", "/reference:System.Web.Extensions.dll", `/out:${executable}`];
    if (testFaults) args.push("/define:TEST_FAULTS");
    args.push(source);
    await exec(compiler, args, { windowsHide: true, timeout: 30000, maxBuffer: 65536 });
    const artifact = Object.freeze({ executable, sha256: digest(await readFile(executable)), sourceSha256: digest(await readFile(source)) });
    builds.set(artifact, { testFaults, at: Date.now(), monotonic: performance.now(),
      identity: String(lstatSync(executable, { bigint: true }).ino), physicalPath: realpathSync.native(executable) }); return artifact;
  } catch { throw Object.assign(new Error("windows_job_build_failed"), { retryable: false }); }
}

// Pre-spawn capability, NOT a receipt for the cleanup of a future process.
// JSON, fault-injected builds, stale or replaced binaries cannot qualify.
export function assertWindowsJobCapability(artifact) {
  try {
    const saved = builds.get(artifact), age = saved && performance.now() - saved.monotonic;
    if (!saved || saved.testFaults || age < 0 || age >= 60000 || Date.now() < saved.at || Date.now() - saved.at >= 60000) throw fail();
    const stat = lstatSync(artifact.executable, { bigint: true });
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || String(stat.ino) !== saved.identity
        || realpathSync.native(artifact.executable) !== saved.physicalPath
        || digest(readFileSync(artifact.executable)) !== artifact.sha256 || digest(readFileSync(source)) !== artifact.sourceSha256) throw fail();
    return Object.freeze({ launcherDigest: artifact.sha256, sourceDigest: artifact.sourceSha256 });
  } catch { throw fail(); }
}

export async function temporaryWindowsJobLauncher(run) {
  let parent, directory;
  try { parent = await realpath(os.tmpdir()); directory = await mkdtemp(path.join(parent, "roost-owned-job-")); }
  catch { throw fail(); }
  try { return await run(await buildWindowsJobLauncher(directory)); }
  finally {
    if (path.dirname(directory) !== parent || !path.basename(directory).startsWith("roost-owned-job-")) throw fail();
    if (await realpath(directory).catch(() => null) !== directory) throw fail();
    await rm(directory, { recursive: true, force: true }).catch(() => { throw fail(); });
  }
}

// One raw native attempt. Output callbacks are in-memory consumers, never logs.
export async function startWindowsJob(artifact, options) {
  const build = builds.get(artifact);
  try { if (!build || digest(await readFile(artifact.executable)) !== artifact.sha256) throw fail(); }
  catch { throw fail(); }
  const { executable, argv, cwd, environment, input, durationMs, attempt = randomUUID(), onData = () => {}, onAssigned = () => {}, fault = "" } = options;
  let executableDigest = null;
  try { executableDigest = digest(readFileSync(executable)); }
  catch (error) { if (error.code !== "ENOENT") throw fail(); }
  const request = { version: windowsJobVersion, attempt, executable, argv, cwd, environment,
    input: Buffer.from(input).toString("base64"), durationMs, stopMs: 3000, ...(build.testFaults ? { fault } : {}) };
  const encoded = JSON.stringify(request) + "\n";
  if (Buffer.byteLength(encoded) > 262144 || !uuid.safeParse(attempt).success || !Number.isInteger(durationMs) || durationMs < 1 || durationMs > 3600000) throw fail();
  const child = spawn(artifact.executable, [], { windowsHide: true, shell: false, stdio: ["pipe", "pipe", "pipe"] });
  let assigned, receipt, problem, pending = Buffer.alloc(0), bytes = 0, wireEvents = 0, stopped = false;
  let stdoutBytes = 0, stderrBytes = 0, stopTimer;
  const timers = [];
  const stop = (reason = "cancel") => {
    if (stopped || child.exitCode !== null) return;
    stopped = true;
    child.stdin.end(JSON.stringify({ version: windowsJobVersion, attempt, stop: reason }) + "\n");
    // Kill only our launcher handle; kernel KILL_ON_JOB_CLOSE owns all descendants.
    // Missing native accounting still fails closed and retains the writer lock.
    stopTimer = setTimeout(() => { problem ??= fail(); child.kill(); }, 4000);
  };
  const rejectProtocol = () => { problem ??= fail(); stop("preparation_failed"); };
  const completion = new Promise((resolve, reject) => {
    child.on("error", rejectProtocol); child.stdin.on("error", rejectProtocol);
    child.stderr.on("data", rejectProtocol); child.stderr.on("error", rejectProtocol);
    child.stdout.on("error", rejectProtocol);
    child.stdout.on("data", chunk => {
      if (problem) return;
      try {
        bytes += chunk.length; if (bytes > 350000) throw fail();
        pending = Buffer.concat([pending, chunk]);
        for (let n; (n = pending.indexOf(10)) >= 0;) {
          if (n > 8192 || ++wireEvents > 4096) throw fail();
          const raw = pending.subarray(0, n); pending = pending.subarray(n + 1);
          const event = eventSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)));
          if (event.attempt !== attempt || receipt) throw fail();
          if (event.type === "assigned") {
            if (assigned || !executableDigest || !event.assignedBeforeResume || !event.rootCreationTime || event.launcherPid !== child.pid) throw fail(); assigned = event; onAssigned(event);
          } else if (event.type === "data") {
            if (!assigned || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(event.data)) throw fail();
            const data = Buffer.from(event.data, "base64");
            if (event.channel === "stdout") stdoutBytes += data.length; else stderrBytes += data.length;
            if (stdoutBytes > 131072 || stderrBytes > 32768) throw fail();
            onData(event.channel, data);
          } else {
            if (assigned && (event.job !== assigned.job || !event.assignedBeforeResume || !event.killOnClose)) throw fail();
            if (assigned && ["rootPid", "rootCreationTime", "launcherPid", "launcherCreationTime"].some(k => event[k] !== assigned[k])) throw fail();
            if (event.stdoutBytes !== stdoutBytes || event.stderrBytes !== stderrBytes) throw fail();
            receipt = event;
          }
        }
        if (pending.length > 8192) throw fail();
      } catch { rejectProtocol(); }
    });
    child.on("close", code => {
      for (const t of timers) clearTimeout(t); clearTimeout(stopTimer);
      if (problem || code !== 0 || pending.length || !receipt?.cleanup || !receipt.jobClosed || receipt.activeProcesses !== 0 || receipt.cleanupMs > 3000) { reject(fail()); return; }
      const result = Object.freeze({ ...receipt, launcherSha256: artifact.sha256, sourceSha256: artifact.sourceSha256,
        executableDigest });
      if (assigned && receipt.resumed && !build.testFaults) receipts.set(result, { at: performance.now() });
      resolve(result);
    });
    child.stdin.write(encoded);
    timers.push(setTimeout(() => { if (!assigned) { problem ??= fail(); stop("preparation_failed"); } }, 3000));
    timers.push(setTimeout(() => stop("timeout"), durationMs + 3000));
  });
  void completion.catch(() => {});
  return Object.freeze({ completion, stop, closeController: () => child.stdin.end(),
    // Private test/lifecycle owner has the actual launched ChildProcess handle.
    launcher: child });
}
