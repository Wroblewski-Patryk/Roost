// Explicit diagnostic only: node scripts/qualify-hermes-desktop.mjs MANIFEST DESKTOP_ROOT
// No profile/config/auth reads, install repair, model invocation or receipt persistence.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import contract from "./lib/agent-host-provider-contract.cjs";
import { buildWindowsJobLauncher, startWindowsJob } from "./lib/agent-host-windows-job.mjs";
import { compareSnapshots, diagnosticEnvironment, fingerprint, physical, publicIdentities,
  sanitizeIdentity, sharingDecision, snapshotViews } from "./lib/hermes-backend-qualification.mjs";

const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
const initHash = "90dae281ccb75b9419879cb824cae644bfd49c1d2ad5baf5ba0dd8a33bf56c11";
let directory, parent, roots, before, receipt, phase = "preflight";
const report = { schemaVersion: "roost-hermes-desktop-qualification-v1", result: "blocked",
  probe: null, comparison: [], snapshot: [], cleanup: false, reason: null,
  decision: sharingDecision({}) };
try {
  if (process.platform !== "win32" || process.argv.length !== 4) throw Error();
  phase = "manifest_path";
  const manifestPath = await physical(path.resolve(process.argv[2]));
  if ((await fs.stat(manifestPath)).size > 12 * 1024 * 1024) throw Error();
  phase = "manifest_parse";
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  phase = "manifest_pin";
  if (manifest.commit !== pin.commit || manifest.version !== pin.version || manifest.roots?.length !== 2
      || manifest.roots[0].kind !== "checkout" || manifest.roots[1].kind !== "pythonBase") throw Error();
  phase = "root_identity";
  roots = { managed: await physical(manifest.roots[0].path), desktop: await physical(path.resolve(process.argv[3])),
    pythonBase: await physical(manifest.roots[1].path) };
  phase = "executable_binding";
  if (manifest.executable !== path.join(roots.managed, "venv/Scripts/hermes.exe")) throw Error();
  phase = "snapshot";
  before = await snapshotViews(roots);
  phase = "manifest_hashes";
  for (const [view, names, inventory] of [["managed", ["hermes_cli/__init__.py", "hermes_cli/main.py", "pyproject.toml", "venv/Scripts/python.exe", "venv/Scripts/hermes.exe", "venv/pyvenv.cfg"], manifest.roots[0].files],
    ["pythonBase", ["python.exe", "python313.dll", "python3.dll"], manifest.roots[1].files]]) {
    for (const name of names) {
      const actual = before.find(f => f.view === view && f.name === name), expected = inventory?.find(f => f.path === name);
      if (!expected || actual?.state !== "EXISTS" || actual.sha256 !== expected.sha256
          || actual.canonical.toLowerCase() !== path.join(roots[view], name).toLowerCase()) throw Error();
    }
  }
  if (before.find(f => f.view === "managed" && f.name === "hermes_cli/__init__.py").sha256 !== initHash) throw Error();
  const cfg = await fs.readFile(path.join(roots.managed, "venv/pyvenv.cfg"), "utf8");
  if (!/^include-system-site-packages = false\s*$/m.test(cfg)
      || !cfg.split(/\r?\n/).some(l => l.toLowerCase() === `home = ${roots.pythonBase}`.toLowerCase())) throw Error();
  phase = "fixture";
  parent = await fs.realpath(os.tmpdir()); directory = await fs.mkdtemp(path.join(parent, "roost-backend-identity-"));
  const home = path.join(directory, "home"); await fs.mkdir(home);
  phase = "job_build";
  const launcher = await buildWindowsJobLauncher(directory);
  // Recheck the selected immutable interpreter immediately before the owned spawn.
  const executable = path.join(roots.managed, "venv/Scripts/python.exe");
  if ((await fingerprint(executable)).sha256 !== before.find(f => f.view === "managed" && f.name === "venv/Scripts/python.exe").sha256) throw Error();
  let stdout = "", stderrBytes = 0;
  phase = "probe";
  const child = await startWindowsJob(launcher, { executable,
    argv: ["-I", "-S", "-B", fileURLToPath(new URL("./hermes_backend_identity_probe.py", import.meta.url))],
    cwd: home, environment: diagnosticEnvironment(home), durationMs: 10000,
    input: JSON.stringify({ sourceRoot: roots.managed, pythonBase: roots.pythonBase, syntheticRoot: home }),
    onData(channel, data) {
      if (channel === "stdout") { if (Buffer.byteLength(stdout) + data.length > 8192) throw Error(); stdout += data.toString("utf8"); }
      else stderrBytes += data.length;
    } });
  receipt = await child.completion;
  if (receipt.rootExit !== 0 || !receipt.cleanup || receipt.activeProcesses !== 0 || stderrBytes) throw Error();
  phase = "result"; report.probe = sanitizeIdentity(stdout);
  if ((await fs.readdir(home)).length) throw Error();
  report.result = report.probe.result === "measured" ? "measured" : "blocked";
} catch {
  report.result = "blocked"; report.reason = `identity_qualification_${phase}_failed_closed`;
} finally {
  if (before) {
    try {
      const after = await snapshotViews(roots); report.comparison = compareSnapshots(before, after);
      report.snapshot = publicIdentities(before);
      if (report.comparison.some(r => ["CHANGED", "MISSING_AFTER"].includes(r.state))) { report.result = "blocked"; report.reason = "installation_sample_changed"; }
    } catch { report.result = "blocked"; report.reason = "installation_readback_failed_closed"; }
  }
  if (directory) {
    try {
      if (path.dirname(directory) !== parent || !/^roost-backend-identity-[\w-]+$/.test(path.basename(directory))
          || await fs.realpath(directory) !== directory) throw Error();
      // No deletion when an owned-tree receipt is missing after a spawn attempt.
      if (phase === "probe" && !receipt?.cleanup) throw Error();
      await fs.rm(directory, { recursive: true }); report.cleanup = !(await fs.stat(directory).catch(e => { if (e.code === "ENOENT") return null; throw e; }));
    } catch { report.result = "blocked"; report.reason = "identity_cleanup_unproven"; }
  } else report.cleanup = true;
  report.decision = sharingDecision({ effectiveImport: report.result === "measured" });
}
console.log(JSON.stringify(report));
if (report.result !== "measured") process.exitCode = 1;
