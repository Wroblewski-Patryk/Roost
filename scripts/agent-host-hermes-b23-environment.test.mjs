import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, symlinkSync, unlinkSync, renameSync, realpathSync, existsSync, readdirSync } from "node:fs";
import { deriveWindowsSystemEnvironment, inspectWindowsSystemEnvironment, assertWindowsStartupPaths } from "./lib/agent-host-windows-environment.mjs";
import { hermesStartupEnvironment, hermesStartupReceiptSchema, sealHermesStartup, assertHermesStartup,
  hermesStartupProcessMatches } from "./lib/agent-host-hermes-startup.mjs";
import { assertProviderStartup } from "./lib/agent-host-provider-input.mjs";
import { budgetFixture } from "./fixtures/hermes-budget.mjs";
import { createHermesCodingFixture } from "./fixtures/hermes-coding-smoke.mjs";
import { createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";
import { buildWindowsJobLauncher, startWindowsJob, isWindowsJobReceipt } from "./lib/agent-host-windows-job.mjs";

const windows = { skip: process.platform !== "win32", timeout: 60000 };
const derive = source => deriveWindowsSystemEnvironment(source, "win32");
const sha = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function owned(t) {
  const attempt = randomUUID(), proof = createNativeOwnedTemp(realpathSync.native(os.tmpdir()), attempt);
  const root = inspectNativeOwnedTemp(proof, attempt).root;
  t.after(() => { cleanupNativeOwnedTemp(proof, attempt); assert.equal(existsSync(root), false); });
  return root;
}

for (const [root, parentDrive, expected] of [
  ["C:\\Windows", "C:", "C:"], ["c:\\windows", "c:", "C:"],
  ["D:\\Windows", undefined, "D:"], ["z:\\System", "Z:", "Z:"]
]) test("B23 derives canonical drive: " + root, () => {
  const source = { SystemRoot: root, ...(parentDrive ? { SystemDrive: parentDrive } : {}) };
  assert.deepEqual(derive(source), { SYSTEMROOT: expected + root.slice(2), SYSTEMDRIVE: expected });
});

for (const root of [undefined, "", "Windows", "C:Windows", "\\Windows", "C:\\", "C:/Windows", "\\\\server\\share\\Windows",
  "\\\\?\\C:\\Windows", "\\\\.\\C:\\Windows", "C:\\Windows\\..\\Other", "C:\\Windows\\", "C:\\Windows.",
  "C:\\Windows ", "C:\\Windows:stream", "C:\\Windows\nX", "C:\\%Unknown%", "C:\\NUL", "C:\\Windows\\\\System32"])
  test("B23 rejects invalid SYSTEMROOT case " + JSON.stringify(root), () => {
    assert.throws(() => derive(root === undefined ? {} : { SYSTEMROOT: root }), /systemroot_invalid/);
  });

for (const value of [undefined, null, "D:", "C", "C:\\", "C:\\Windows", " C:", "C: ", "C:;D:", "%SystemDrive%", "C:\n", "C:\0", 1])
  test("B23 rejects parent drive mismatch or injection " + JSON.stringify(value), () => {
    assert.throws(() => derive({ SYSTEMROOT: "C:\\Windows", SYSTEMDRIVE: value }), /systemdrive_invalid/);
  });

test("B23 duplicates fail even with equal values; unrelated environment is never read", () => {
  assert.throws(() => derive({ SYSTEMROOT: "C:\\Windows", SystemRoot: "C:\\Windows" }), /ambiguous/);
  assert.throws(() => derive({ SYSTEMROOT: "C:\\Windows", SYSTEMDRIVE: "C:", SystemDrive: "C:" }), /ambiguous/);
  const source = { SYSTEMROOT: "C:\\Windows" };
  Object.defineProperty(source, "SYNTHETIC_SECRET", { enumerable: true, get() { throw Error("must not read"); } });
  assert.equal(derive(source).SYSTEMDRIVE, "C:");
});

test("B23 non-Windows routing never reads or emits a Windows drive", () => {
  const source = new Proxy({}, { ownKeys() { throw Error("Windows env read on non-Windows"); } });
  for (const platform of ["linux", "darwin"]) {
    assert.deepEqual(deriveWindowsSystemEnvironment(source, platform), {});
    assert.doesNotThrow(() => assertWindowsStartupPaths(["/tmp/%literal%"], platform));
  }
});

for (const name of ["SystemDrive", "SystemRoot", "APPDATA", "Unknown_Runtime_Path"])
  test("B23 refuses unresolved token " + name + " without substitution", () => {
    assert.throws(() => assertWindowsStartupPaths(["D:\\Synthetic\\%" + name + "%\\repo"], "win32"), /path_token_unresolved/);
  });

test("B23 resolves a simulated drive token outside repository without filesystem writes", () => {
  const env = derive({ SYSTEMROOT: "D:\\Windows" }), repository = "D:\\Synthetic\\Repository";
  const literal = "%SystemDrive%\\ProgramData\\SyntheticCache";
  const expanded = literal.replace(/%SystemDrive%/i, env.SYSTEMDRIVE);
  assert.equal(path.win32.isAbsolute(expanded), true);
  assert.equal(path.win32.relative(repository, expanded).startsWith("..\\"), true);
  assert.throws(() => assertWindowsStartupPaths([literal], "win32"), /path_token_unresolved/);
});

test("B23 physical SYSTEMROOT inspection refuses junctions and missing paths", windows, t => {
  const root = owned(t), target = path.join(root, "system"), link = path.join(root, "alias"); mkdirSync(target);
  symlinkSync(target, link, "junction");
  try { assert.throws(() => inspectWindowsSystemEnvironment({ SYSTEMROOT: link }), /systemroot_unproven/); }
  finally { unlinkSync(link); }
  assert.throws(() => inspectWindowsSystemEnvironment({ SYSTEMROOT: path.join(root, "missing") }), /systemroot_unproven/);
});

test("B23 receipt v2 binds derived drive without disclosing raw system or private paths", windows, t => {
  const f = budgetFixture(t), { receipt, candidate } = f.checked;
  assert.equal(receipt.schemaVersion, "roost-hermes-startup-receipt-v2");
  assert.equal(receipt.policyVersion, "roost-hermes-standard-startup-v2");
  assert.equal(receipt.windowsEnvironment.category, "derived_verified_systemroot");
  assert.equal(receipt.windowsEnvironment.systemDriveDigest, sha(candidate.environment.SYSTEMDRIVE));
  assert.equal(receipt.windowsEnvironment.rootIdentityDigest, inspectWindowsSystemEnvironment().rootIdentity);
  assert.equal(receipt.readyRevision, f.envelope.revisions.ready); assert.equal(receipt.inputSeal, f.envelope.seal);
  for (const value of [f.root, candidate.environment.SYSTEMROOT, candidate.environment.SYSTEMDRIVE]) assert.ok(!JSON.stringify(receipt).includes(value));
  assert.equal(hermesStartupReceiptSchema.safeParse({ ...receipt, windowsEnvironment: { ...receipt.windowsEnvironment, rawPath: f.root } }).success, false);
  assert.equal(hermesStartupReceiptSchema.safeParse({ ...receipt, schemaVersion: "roost-hermes-startup-receipt-v1" }).success, false);
});

test("B23 pre-seal overrides cannot choose another host root or delete/replace the drive", windows, t => {
  const f = budgetFixture(t), other = owned(t); mkdirSync(path.join(other, "system"));
  for (const change of [c => { c.environment.SYSTEMDRIVE = "Z:"; }, c => { delete c.environment.SYSTEMDRIVE; },
    c => { c.environment.SYSTEMROOT = path.join(other, "system"); c.environment.SYSTEMDRIVE = other.slice(0, 2).toUpperCase(); }]) {
    const candidate = structuredClone(f.checked.candidate); change(candidate);
    assert.throws(() => sealHermesStartup({ ...f.checked.options, candidate }), e => e.protocolAdmission === true);
  }
  const provider = { ...f.provider, SystemDrive: "Z:" };
  assert.throws(() => sealHermesStartup({ ...f.checked.options, provider }), /profile_required/);
  assert.throws(() => budgetFixture(t, f => { f.packet.contract.SYSTEMDRIVE = "Z:"; }));
});

test("B23 Ready seal and native process comparison reject drive drift", windows, t => {
  const f = budgetFixture(t), candidate = structuredClone(f.checked.candidate); candidate.environment.SYSTEMDRIVE = "Z:";
  assert.throws(() => assertProviderStartup({ ...f.options, startupCandidate: candidate }), /ready_changed/);
  assert.equal(hermesStartupProcessMatches(f.checked.receipt, f.envelope, { executable: candidate.command, argv: candidate.args,
    cwd: candidate.cwd, environment: candidate.environment }), false);
  const seal = sealHermesStartup(f.checked.options), previous = process.env.SystemDrive;
  try {
    process.env.SystemDrive = "invalid";
    assert.throws(() => assertHermesStartup(seal, f.checked.options), /systemdrive_invalid/);
    assert.throws(() => assertProviderStartup(f.options), /systemdrive_invalid/);
  } finally { if (previous === undefined) delete process.env.SystemDrive; else process.env.SystemDrive = previous; }
});

test("B23 physical root replacement after Ready cannot reuse the prior proof", windows, t => {
  const root = owned(t), system = path.join(root, "system"); mkdirSync(system);
  const oldRoot = process.env.SystemRoot, oldDrive = process.env.SystemDrive;
  try {
    process.env.SystemRoot = system; process.env.SystemDrive = system.slice(0, 2);
    const f = budgetFixture(t);
    renameSync(system, system + ".previous"); mkdirSync(system);
    assert.throws(() => assertProviderStartup(f.options), /host_environment_changed/);
  } finally {
    process.env.SystemRoot = oldRoot;
    if (oldDrive === undefined) delete process.env.SystemDrive; else process.env.SystemDrive = oldDrive;
  }
});

test("B23 critical env/profile/executable/workspace paths reject literal tokens", windows, t => {
  const f = budgetFixture(t);
  for (const key of ["PATH", "TEMP", "TMP", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "COMSPEC", "WINDIR", "HERMES_HOME"] ) {
    const candidate = structuredClone(f.checked.candidate); candidate.environment[key] = "%Unknown%\\synthetic";
    assert.throws(() => sealHermesStartup({ ...f.checked.options, candidate }), /path_token_unresolved/);
  }
  for (const key of ["command", "cwd"]) {
    const candidate = structuredClone(f.checked.candidate); candidate[key] = path.join(f.root, "%SystemDrive%", "synthetic");
    assert.throws(() => sealHermesStartup({ ...f.checked.options, candidate }), /path_token_unresolved/);
  }
  assert.throws(() => hermesStartupEnvironment({ ...f.provider.profile, profilePath: path.join(f.root, "%PROFILE%", "config.yaml") }, process.env, f.options.repositoryPath), /path_token_unresolved/);
  assert.throws(() => hermesStartupEnvironment(f.provider.profile, process.env, path.join(f.root, "%ROOT%")), /path_token_unresolved/);
});

test("B23 token rules leave task text untouched and do not treat it as environment input", windows, t => {
  const prompt = "Keep the literal %SystemDrive% token in this synthetic example.";
  const f = budgetFixture(t, f => { f.claimed.prompt = prompt; });
  assert.ok(JSON.stringify(f.envelope).includes(prompt));
  assert.equal(f.checked.candidate.environment.SYSTEMDRIVE, inspectWindowsSystemEnvironment().environment.SYSTEMDRIVE);
});

test("B23 genuine harmless Job observes sealed SystemDrive and canonical owned repository", windows, async t => {
  const directory = owned(t), f = createHermesCodingFixture(); t.after(() => { f.cleanup(); assert.equal(existsSync(f.root), false); });
  const environment = hermesStartupEnvironment({ profilePath: path.join(directory, "profile", "config.yaml") }, process.env, f.repository);
  const before = readdirSync(f.repository).sort(), artifact = await buildWindowsJobLauncher(directory);
  let output = "";
  const code = "const p=require('node:path');const fs=require('node:fs');const x='%SystemDrive%/ProgramData/SyntheticCache'.replace(/%SystemDrive%/i,process.env.SystemDrive);const r=p.win32.relative(process.cwd(),x);console.log(JSON.stringify({drive:process.env.SystemDrive,cwd:fs.realpathSync.native(process.cwd()),absolute:p.win32.isAbsolute(x),outside:r.startsWith('..')||p.win32.isAbsolute(r)}));";
  const job = await startWindowsJob(artifact, { executable: process.execPath, argv: ["-e", code], cwd: f.repository,
    environment, input: "", attempt: randomUUID(), durationMs: 10000, onData(channel, bytes) { if (channel === "stdout") output += bytes.toString("utf8"); } });
  const receipt = await job.completion, result = JSON.parse(output);
  assert.equal(result.drive, environment.SYSTEMDRIVE); assert.equal(result.cwd, f.repository);
  assert.equal(result.absolute, true); assert.equal(result.outside, true);
  assert.equal(isWindowsJobReceipt(receipt), true); assert.equal(receipt.rootExit, 0);
  assert.equal(receipt.activeProcesses, 0); assert.equal(receipt.jobClosed, true); assert.equal(receipt.assignedBeforeResume, true);
  assert.deepEqual(readdirSync(f.repository).sort(), before);
});
