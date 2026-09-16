// Synthetic adapter only. This factory compiles one fixed harmless source into
// a fresh owned temp directory; there is no arbitrary executable/source option.
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, realpathSync, lstatSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { buildWindowsJobLauncher } from "../lib/agent-host-windows-job.mjs";
import { consumeHermesLaunchAdmission } from "../lib/agent-host-hermes-launch-admission.mjs";
import { runHermesOwnedProcess } from "../lib/agent-host-hermes-quiet.mjs";
const grants = new WeakMap();
const source = fileURLToPath(new URL("windows-job-tree.cs", import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const sourceDigest = "27f637fa875130cbb940a4481c65c562567cfbc87320ffbe6063670f53de8721";
const sourceBytes = () => readFileSync(source, "utf8").replace(/\r\n/g, "\n");
const denied = () => { throw new Error("harmless_fixture_activation_denied"); };

export async function withHermesLaunchFixture(run) {
  const parent = realpathSync.native(os.tmpdir()), root = mkdtempSync(path.join(parent, "roost-admission-fixture-"));
  const executablePath = path.join(root, "venv", "Scripts", "hermes.exe");
  let grant;
  try {
    mkdirSync(path.dirname(executablePath), { recursive: true });
    const snapshot = path.join(root, "fixture.cs"), bytes = sourceBytes();
    if (hash(bytes) !== sourceDigest) denied();
    writeFileSync(snapshot, bytes, { flag: "wx" });
    execFileSync(path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
      ["/nologo", "/target:exe", "/platform:x64", "/optimize+", `/out:${executablePath}`, snapshot],
      { windowsHide: true, timeout: 30000, stdio: "pipe" });
    if (hash(readFileSync(snapshot)) !== sourceDigest || hash(sourceBytes()) !== sourceDigest) denied();
    const jobArtifact = await buildWindowsJobLauncher(root);
    grant = Object.freeze({});
    grants.set(grant, { executablePath, hash: hash(readFileSync(executablePath)), sourceHash: sourceDigest,
      identity: String(lstatSync(executablePath, { bigint: true }).ino), at: performance.now(), wall: Date.now(), used: false });
    return await run({ executablePath, jobArtifact, activation: grant });
  } finally {
    if (grant) grants.delete(grant);
    if (path.dirname(root) !== parent || !path.basename(root).startsWith("roost-admission-fixture-") || realpathSync.native(root) !== root) denied();
    rmSync(root, { recursive: true, force: true });
  }
}
function assertFixture(grant, executablePath, allowUsed = false) {
  const saved = grants.get(grant);
  if (!saved || (!allowUsed && saved.used) || saved.executablePath !== executablePath
      || performance.now() < saved.at || performance.now() - saved.at >= 60000
      || Date.now() < saved.wall || Date.now() - saved.wall >= 60000) denied();
  const stat = lstatSync(executablePath, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || String(stat.ino) !== saved.identity
      || realpathSync.native(executablePath) !== executablePath || hash(readFileSync(executablePath)) !== saved.hash
      || hash(sourceBytes()) !== saved.sourceHash) denied();
}
export async function runQualifiedHermesFixture({ receipt, options, consumption, activation, signal, remainingMs = () => 15000, shutdownRequested, onAssigned }) {
  assertFixture(activation, options.provider.executablePath);
  const handoff = consumeHermesLaunchAdmission(receipt, options, consumption);
  grants.get(activation).used = true;
  const result = await runHermesOwnedProcess({ executable: handoff.candidate.command, argv: handoff.candidate.args,
    cwd: handoff.candidate.cwd, environment: handoff.candidate.environment, input: handoff.input,
    attempt: options.envelope.identity.executionId, remainingMs, signal, shutdownRequested, onAssigned,
    assertAuthority() { consumption.assertAuthority(); assertFixture(activation, handoff.candidate.command, true); },
    budgetReceipt: handoff.budgetReceipt, nativeToolReceipt: handoff.nativeToolReceipt, jobArtifact: handoff.jobArtifact });
  return { ...result, admission: Object.freeze({ policyQualified: true, activationAuthorized: true, spawnStarted: true,
    scope: "harmless_fixture_only", qualificationDigest: receipt.digest }) };
}
