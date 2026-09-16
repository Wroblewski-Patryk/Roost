// Explicit local qualification only. No production startup/import calls this.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { renderHermesProfile, inspectHermesProfile } from "./lib/agent-host-hermes-profile.mjs";
import { sanitizeEffectiveConfigProbe, effectiveConfigPolicyVersion } from "./lib/agent-host-hermes-effective-config.mjs";
import { buildWindowsJobLauncher, startWindowsJob } from "./lib/agent-host-windows-job.mjs";

const exec = promisify(execFile), sha = b => createHash("sha256").update(b).digest("hex");
const pin = "939e45c91d751fadd94dcd1b873ac3cb44846213";
const sourceFiles = ["hermes_cli/__init__.py", "hermes_cli/config.py", "hermes_cli/config_defaults.py",
  "hermes_cli/config_home.py", "hermes_cli/managed_scope.py", "hermes_constants.py", "utils.py",
  "hermes_cli/cli_output.py", "hermes_cli/colors.py", "hermes_cli/default_soul.py", "hermes_cli/secret_prompt.py",
  "hermes_cli/config_providers.py", "hermes_cli/personality.py", "hermes_cli/route_identity.py"];
let directory, stage = "inputs", diagnostic = null;
try {
  if (process.platform !== "win32" || process.argv.length !== 4) throw Error();
  const source = await fs.realpath(process.argv[2]), bindingFile = await fs.realpath(process.argv[3]);
  const output = path.join(path.dirname(bindingFile), "effective-config-qualification.json");
  if (await fs.stat(output).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; })) throw Error();
  const binding = JSON.parse(await fs.readFile(bindingFile, "utf8"));
  const before = inspectHermesProfile(binding, process.cwd()), bytes = await fs.readFile(binding.profilePath);
  const head = (await exec("git", ["-C", source, "rev-parse", "HEAD"], { windowsHide: true })).stdout.trim();
  if (head !== pin || !bytes.equals(Buffer.from(renderHermesProfile()))) throw Error();
  const sourceHashes = {}; stage = "source_hashes";
  for (const name of sourceFiles) {
    const local = (await fs.readFile(path.join(source, name), "utf8")).replaceAll("\r\n", "\n");
    const official = (await exec("git", ["-C", source, "show", `${pin}:${name}`], { windowsHide: true, maxBuffer: 1048576 })).stdout;
    if (local !== official) { stage = "source_hash_mismatch:" + name; throw Error(); }
    sourceHashes[name] = sha(local);
  }
  stage = "fixture";
  const parent = await fs.realpath(os.tmpdir());
  directory = await fs.mkdtemp(path.join(parent, "roost-effective-config-"));
  const home = path.join(directory, "profile"), managed = path.join(directory, "managed");
  await fs.mkdir(home); await fs.mkdir(managed);
  await fs.writeFile(path.join(home, "config.yaml"), bytes, { flag: "wx" });
  const environment = { SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot,
    TEMP: directory, TMP: directory, HOME: directory, USERPROFILE: directory, LOCALAPPDATA: directory,
    APPDATA: directory, CODEX_HOME: path.join(directory, "empty-codex"), HERMES_HOME: home, HERMES_MANAGED_DIR: managed,
    // Public config.py _is_container opt-out: avoid its irrelevant /proc read on Windows.
    HERMES_SKIP_CHMOD: "1",
    PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1", PYTHONNOUSERSITE: "1" };
  stage = "job_build";
  const artifact = await buildWindowsJobLauncher(directory);
  let stdout = "", stderrBytes = 0;
  stage = "probe_process";
  const processHandle = await startWindowsJob(artifact, {
    executable: path.join(source, "venv", "Scripts", "python.exe"),
    argv: ["-I", "-S", "-B", fileURLToPath(new URL("./hermes_effective_config_probe.py", import.meta.url))],
    cwd: directory, environment, durationMs: 15000,
    input: JSON.stringify({ sourceRoot: source, syntheticRoot: directory, configDigest: before.configDigest }),
    onData(channel, chunk) { if (channel === "stdout") stdout += chunk.toString("utf8"); else stderrBytes += chunk.length; }
  });
  const job = await processHandle.completion;
  stage = "job_result";
  diagnostic = { rootExit: job.rootExit, stderrBytes, stdoutBytes: Buffer.byteLength(stdout), cleanup: job.cleanup, activeProcesses: job.activeProcesses };
  if (job.rootExit !== 0 || !job.cleanup || job.activeProcesses !== 0 || Buffer.byteLength(stdout) > 16384) throw Error();
  stage = "probe_validation";
  const parsed = JSON.parse(stdout);
  if (parsed.reason === "probe_failed_closed" && typeof parsed.phase === "string" && ["import", "load", "compare"].includes(parsed.phase)) stage = "loader_denied:" + parsed.phase;
  if (parsed.reason === "probe_failed_closed") diagnostic = {
    denied: ["network", "process", "credential", "outsideRead", "outsideWrite"].includes(parsed.denied) ? parsed.denied : null,
    errorClass: ["ModuleNotFoundError", "ImportError", "RuntimeError", "FileNotFoundError", "PermissionError", "OSError", "ValueError"].includes(parsed.errorClass) ? parsed.errorClass : "other" };
  const result = sanitizeEffectiveConfigProbe(parsed);
  // Stderr is bounded by the Job transport and discarded. Its presence keeps
  // this negative diagnostic unqualified; no raw diagnostic is persisted.
  if (!bytes.equals(await fs.readFile(binding.profilePath)) || JSON.stringify(before) !== JSON.stringify(inspectHermesProfile(binding, process.cwd()))) throw Error();
  // A negative diagnostic receipt is deliberately NOT an admission binding.
  // Do not persist raw output or promote a partial loader check to PASS.
  const receipt = { ...result, sourceHashes, checkedAt: new Date().toISOString(),
    policyVersion: effectiveConfigPolicyVersion, profileVersion: binding.schemaVersion,
    privateProfileUnchanged: true, ownedTreeCleanup: true, stderrDiscardedBytes: stderrBytes, liveAdmissionAllowed: false };
  await fs.writeFile(output, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  if (JSON.stringify(JSON.parse(await fs.readFile(output, "utf8"))) !== JSON.stringify(receipt)) throw Error();
  console.log(JSON.stringify(receipt));
} catch {
  process.exitCode = 1;
  console.log(JSON.stringify({ result: "blocked", reason: "effective_config_probe_failed_closed", stage, diagnostic }));
} finally {
  if (directory) {
    const parent = await fs.realpath(os.tmpdir());
    if (path.dirname(directory) !== parent || !path.basename(directory).startsWith("roost-effective-config-") || await fs.realpath(directory) !== directory) throw Error("fixture_cleanup_path_invalid");
    await fs.rm(directory, { recursive: true, force: true });
  }
}
