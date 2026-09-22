import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import cp from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { createHash } from "node:crypto";
import fixed from "./lib/agent-host-fixed-program.cjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { acquireWriterLock, writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import { prepareProviderInput, assertProviderInputAvailable } from "./lib/agent-host-provider-input.mjs";
import { prepareProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import { prepareFixedExecution, abandonFixedExecution, runFixedExecution } from "./lib/agent-host-fixed-execution.mjs";
import { hostContainmentVersion, prepareFixedHostContainment, consumeHostContainment } from "./lib/agent-host-containment.mjs";

const windows = { skip: process.platform !== "win32", timeout: 60000 };
async function setup(t) {
  const parent = fs.realpathSync.native(os.tmpdir()), root = fs.mkdtempSync(path.join(parent, "roost-containment-"));
  const state = path.join(root, "state"), repositoryPath = path.join(root, "repository"); fs.mkdirSync(repositoryPath);
  const writerLock = await acquireWriterLock(state);
  const f = validPacketFixture(); f.packet.contract.executionClass = fixed.program; pinReadyFixture(f);
  const authority = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext },
    claimed: f.claimed, currentCommit: "a".repeat(40), assertAuthority() {} };
  const envelope = prepareProviderInput(authority);
  const grant = await prepareFixedExecution({ envelope, writerLock, repositoryPath, claimed: f.claimed,
    assertAuthority() {}, deadline: new Date(Date.now() + 55000).toISOString() });
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  const options = { provider: fixed.declaration, fixedGrant: grant, writerLock, envelope, repositoryPath, sandbox: "workspace-write" };
  const receipt = options.containmentReceipt = prepareFixedHostContainment(options, authority);
  const directory = path.join(state, "native-review-" + f.claimed.id);
  const location = JSON.parse(fs.readFileSync(path.join(directory, "fixed-location.json")));
  t.after(async () => {
    if (fs.existsSync(location.root)) abandonFixedExecution(grant);
    await writerLock.release();
    assert.equal(fs.realpathSync.native(root), root); assert.equal(path.dirname(root), parent);
    fs.rmSync(root, { recursive: true });
  });
  return { root, state, f, authority, options, receipt, grant, location, directory };
}

const cases = {
  missing: x => { delete x.options.containmentReceipt; },
  serialized: x => { x.options.containmentReceipt = JSON.parse(JSON.stringify(x.receipt)); },
  version: x => { x.options.containmentReceipt = { ...x.receipt, schemaVersion: "other" }; },
  signature: x => { x.options.containmentReceipt = { ...x.receipt, signature: "caller-supplied" }; },
  lifecycleOnly: x => { x.options.containmentReceipt = { version: "roost-windows-job-v1", cleanup: true, activeProcesses: 0 }; },
  runtimeHash: x => { fs.appendFileSync(x.location.executable, "runtime-drift"); },
  profile: x => { x.options.provider = { ...fixed.declaration, profile: "other" }; },
  config: () => { const old = process.env.SystemRoot; process.env.SystemRoot = path.join(old, "synthetic-change"); return () => { process.env.SystemRoot = old; }; },
  workspace: x => { x.options.repositoryPath = x.root; },
  workspaceIdentity: x => { x.f.claimed.workspaceId = "00000000-0000-4000-8000-000000000099"; },
  task: x => { x.f.claimed.taskId = "00000000-0000-4000-8000-000000000099"; },
  attempt: x => { x.f.claimed.attempt = 2; },
  lease: x => { x.f.claimed.leaseToken = "changed-synthetic-lease"; },
  readyToken: x => { x.f.claimed.metadata.readyContextPin.pinId = "changed-pin"; },
  readyRevision: x => { x.f.taskContext.readyAdmission.revision = "f".repeat(64); },
  writerCopy: x => { x.options.writerLock = { ...x.options.writerLock }; },
  writerDrift: x => {
    const file = path.join(x.state, writerLockFilename), bytes = fs.readFileSync(file), record = JSON.parse(bytes);
    fs.writeFileSync(file, JSON.stringify({ ...record, ownerNonce: "changed-writer" }));
    return () => fs.writeFileSync(file, bytes);
  },
  filesystemExpansion: x => { x.options.filesystemScope = { ...x.receipt.binding.filesystemScope, suppliedHandles: 2 }; },
  credentials: x => { x.options.hostControlCapabilities = ["credential_read"]; },
  process: x => { x.options.hostControlCapabilities = ["process_spawn"]; },
  network: x => { x.options.hostControlCapabilities = ["network_connect"]; },
  lifecycle: x => { x.options.hostControlCapabilities = ["docker_desktop_restart"]; },
  unknownCapability: x => { x.options.hostControlCapabilities = ["future_unknown"]; },
  malformedCapabilities: x => { x.options.hostControlCapabilities = null; },
  stale: () => { const now = Date.now; Date.now = () => now() + 61000; return () => { Date.now = now; }; },
  clockRollback: () => { const now = Date.now; Date.now = () => now() - 1000; return () => { Date.now = now; }; },
  tamperedRehashed: x => {
    const copy = structuredClone(x.receipt); copy.binding.runtime.executable.digest = "f".repeat(64);
    copy.bindingDigest = createHash("sha256").update(JSON.stringify(copy.binding)).digest("hex");
    x.options.containmentReceipt = copy;
  },
  consumed: x => { consumeHostContainment(x.receipt, x.options, x.authority); },
  authorityLost: x => { x.authority.assertAuthority = () => { throw Error("PRIVATE_SENTINEL"); }; }
};
for (const [name, mutate] of Object.entries(cases)) test(`containment denies ${name} before any target process/effect`, windows, async t => {
  const x = await setup(t), restore = mutate(x);
  const methods = ["spawn", "execFile", "execFileSync", "spawnSync", "exec", "execSync"], originals = new Map(); let starts = 0;
  for (const method of methods) { originals.set(method, cp[method]); cp[method] = () => { starts++; throw Error("unexpected_process_creation"); }; }
  syncBuiltinESMExports();
  try {
    assert.throws(() => prepareProviderLaunch(x.options, x.authority), error => {
      assert.equal(JSON.stringify(error).includes("PRIVATE_SENTINEL"), false); return true;
    });
    assert.equal(starts, 0);
    assert.equal(fs.statSync(path.join(x.location.root, "repository", "synthetic-effect.bin")).size, 0);
    assert.equal(fs.existsSync(path.join(x.directory, "resume-authorized.json")), false);
  } finally { for (const [method, original] of originals) cp[method] = original; syncBuiltinESMExports(); restore?.(); }
});

test("receipt binds only the existing closed fixture; no renewal or real-provider promotion", windows, async t => {
  const x = await setup(t);
  assert.equal(x.receipt.schemaVersion, hostContainmentVersion);
  assert.equal(x.receipt.systemIsolation, false); assert.equal(x.receipt.realProviderAdmitted, false);
  assert.deepEqual(x.receipt.binding.allowedHostControlCapabilities, []);
  assert.ok(Object.isFrozen(x.receipt.binding.runtime.executable));
  const serialized = JSON.stringify(x.receipt);
  for (const value of [x.root, x.location.root, x.f.claimed.leaseToken]) assert.equal(serialized.includes(value), false);
  assert.throws(() => prepareFixedHostContainment(x.options, x.authority), /host_containment_admission_blocked/);
  // The genuine fixture receipt cannot be promoted into a real provider.
  assert.throws(() => consumeHostContainment(x.receipt, { ...x.options, provider: { kind: "direct_codex" } }, x.authority));
  assert.throws(() => consumeHostContainment(x.receipt, x.options, x.authority));
  await assert.rejects(runFixedExecution(x.grant, { remainingMs: () => 30000 }));
});

test("post-admission configuration drift still cannot create a fixture process", windows, async t => {
  const x = await setup(t), launch = prepareProviderLaunch(x.options, x.authority);
  const old = process.env.SystemRoot; process.env.SystemRoot = path.join(old, "synthetic-change");
  try {
    await assert.rejects(runFixedExecution(launch.grant, { remainingMs: () => 30000 }));
    assert.equal(fs.statSync(path.join(x.location.root, "repository", "synthetic-effect.bin")).size, 0);
    assert.equal(fs.existsSync(path.join(x.directory, "resume-authorized.json")), false);
  } finally { process.env.SystemRoot = old; }
  await assert.rejects(runFixedExecution(launch.grant, { remainingMs: () => 30000 }));
});

test("genuine completed Windows Job proof cannot become containment evidence", windows, async t => {
  const a = await setup(t), launch = prepareProviderLaunch(a.options, a.authority);
  const result = await runFixedExecution(launch.grant, { remainingMs: () => 30000 });
  assert.equal(result.verification.job.activeProcesses, 0);
  assert.equal(result.verification.cleanup.fixtureAbsent, true);
  const b = await setup(t);
  assert.throws(() => prepareProviderLaunch({ ...b.options, containmentReceipt: result.verification.job }, b.authority), /host_containment_admission_blocked/);
  assert.equal(fs.statSync(path.join(b.location.root, "repository", "synthetic-effect.bin")).size, 0);
  assert.equal(fs.existsSync(path.join(b.directory, "resume-authorized.json")), false);
});

test("missing proof burns input; failed final authority revokes a partly consumed handoff", windows, async t => {
  const missing = await setup(t);
  assert.throws(() => prepareProviderLaunch({ ...missing.options, containmentReceipt: undefined }, missing.authority));
  assert.throws(() => assertProviderInputAvailable(missing.options.envelope));
  assert.throws(() => prepareProviderLaunch(missing.options, missing.authority));
  const x = await setup(t);
  // Proof admission uses this callback once; final input admission uses it next.
  let calls = 0;
  x.authority.assertAuthority = () => { if (++calls > 1) throw Error("authority_changed_after_proof"); };
  assert.throws(() => prepareProviderLaunch(x.options, x.authority));
  await assert.rejects(runFixedExecution(x.grant, { remainingMs: () => 30000 }));
  assert.equal(fs.statSync(path.join(x.location.root, "repository", "synthetic-effect.bin")).size, 0);
  assert.equal(fs.existsSync(path.join(x.directory, "resume-authorized.json")), false);
});
