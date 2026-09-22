import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { qualifyNativeReconciliation, issueNativeReconciliationApproval, reconcileNativeArtifacts } from "./lib/agent-host-native-reconciliation.mjs";
import fixed from "./lib/agent-host-fixed-program.cjs";
import providers from "./lib/agent-host-provider-contract.cjs";
import { inspectExecutionProvider } from "./lib/agent-host-execution-provider.mjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput } from "./lib/agent-host-provider-input.mjs";
import { prepareProviderLaunch, projectProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import { prepareFixedHostContainment } from "./lib/agent-host-containment.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { prepareFixedExecution, runFixedExecution, fixedProgramSource, abandonFixedExecution } from "./lib/agent-host-fixed-execution.mjs";

const windows = { skip: process.platform !== "win32", timeout: 60000 };
async function setup(t) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), "roost-fixed-test-")), state = path.join(root, "state"), repositoryPath = path.join(root, "repository");
  fs.mkdirSync(repositoryPath);
  const writerLock = await acquireWriterLock(state);
  t.after(async () => { await writerLock.release(); assert.equal(fs.realpathSync.native(root), root); fs.rmSync(root, { recursive: true }); assert.equal(fs.existsSync(root), false); });
  const f = validPacketFixture(); f.packet.contract.executionClass = fixed.program; f.packet.contract.budgets.maxAttempts = 1; pinReadyFixture(f);
  const consumption = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed, currentCommit: "a".repeat(40), assertAuthority() {} };
  const envelope = prepareProviderInput(consumption), options = { provider: fixed.declaration, envelope, repositoryPath, sandbox: "workspace-write" };
  const grant = await prepareFixedExecution({ envelope, writerLock, repositoryPath, claimed: f.claimed, assertAuthority() {}, deadline: new Date(Date.now() + 55000).toISOString() });
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  Object.assign(options, { fixedGrant: grant, writerLock });
  options.containmentReceipt = prepareFixedHostContainment(options, consumption);
  return { root, state, writerLock, f, consumption, envelope, options, grant, directory: path.join(state, "native-review-" + f.claimed.id) };
}
test("closed declaration never admits model providers, arbitrary paths, args or forged hashes", async () => {
  fixedProgramSource();
  assert.equal(providers.providerAdmissionReason(fixed.declaration), null);
  for (const kind of ["hermes_codex", "direct_codex", "unknown"]) assert.ok(providers.providerAdmissionReason({ ...fixed.declaration, kind }));
  for (const extra of [{ command: "cmd.exe" }, { args: [] }, { executablePath: "C:\\Fictional\\other.exe" }, { sourceDigest: "0".repeat(64) }, { program: "other" }]) {
    const result = await inspectExecutionProvider({ executionProvider: { ...fixed.declaration, ...extra } });
    assert.ok(providers.providerAdmissionReason(result));
  }
});
test("public launch consumes exact opaque authority and runs only the fixed disk effect after durable ack", windows, async t => {
  const x = await setup(t);
  assert.equal(projectProviderLaunch(x.options).command, null);
  const launch = prepareProviderLaunch({ ...x.options, fixedGrant: x.grant }, x.consumption);
  const result = await runFixedExecution(launch.grant, { remainingMs: () => 30000 });
  assert.equal(result.finalResponse, fixed.output.trim());
  assert.equal(result.verification.resumed, true); assert.equal(result.verification.effectBytes, Buffer.byteLength(fixed.output));
  assert.equal(result.verification.containment.bindingDigest, x.options.containmentReceipt.bindingDigest);
  assert.equal(result.verification.containment.realProviderAdmitted, false);
  assert.equal(result.verification.review.verdict, "verified_candidate"); assert.equal(result.verification.cleanup.fixtureAbsent, true);
  assert.equal(result.verification.cleanup.applicationLeaseReleased, true); assert.equal(result.verification.job.activeProcesses, 0);
  const resume = JSON.parse(fs.readFileSync(path.join(x.directory, "resume-authorized.json"))).payload;
  assert.equal(result.verification.job.resumeReceipt, (await import("./lib/agent-host-fixture-ownership.mjs")).readFixtureEvidence(x.directory, "resume-authorized.json").digest);
  assert.equal(resume.runtime.suppliedHandles, 1);
  assert.throws(() => prepareProviderLaunch({ ...x.options, fixedGrant: x.grant }, x.consumption));
  await assert.rejects(runFixedExecution(launch.grant, { remainingMs: () => 30000 }));
});
test("expired preparation cannot spawn or renew its authority", windows, async t => {
  const x=await setup(t),now=Date.now;Date.now=()=>now()+60000;
  try { assert.throws(()=>prepareProviderLaunch({...x.options,fixedGrant:x.grant},x.consumption)); }
  finally { Date.now=now; }
  abandonFixedExecution(x.grant);
  assert.equal(fs.existsSync(path.join(x.directory,"resume-authorized.json")),false);
});
test("failed durable receipt publication yields no process effect and normal terminal review/cleanup", windows, async t => {
  const x = await setup(t), launch = prepareProviderLaunch({ ...x.options, fixedGrant: x.grant }, x.consumption), original = fs.openSync;
  fs.openSync = (file, ...args) => { if (path.basename(String(file)) === "resume-authorized.json") throw Error("synthetic_publication_crash"); return original(file, ...args); }; syncBuiltinESMExports();
  try {
    await assert.rejects(runFixedExecution(launch.grant, { remainingMs: () => 30000 }), error => {
      const e = error.details.syntheticEvidence; assert.equal(e.resumed, false); assert.equal(e.effectBytes, 0);
      assert.equal(e.cleanup.fixtureAbsent, true); assert.equal(e.job.activeProcesses, 0); assert.equal(e.review.verdict, "process_failed"); return true;
    });
  } finally { fs.openSync = original; syncBuiltinESMExports(); }
  assert.equal(fs.existsSync(path.join(x.directory, "resume-authorized.json")), false);
});
test("binary/runtime drift refuses public launch without a process; preparation can be abandoned only once", windows, async t => {
  const x = await setup(t), binary = path.join(x.directory, "build", "roost-fixed-effect.exe"), bytes = fs.readFileSync(binary);
  fs.appendFileSync(binary, "changed");
  assert.throws(() => prepareProviderLaunch({ ...x.options, fixedGrant: x.grant }, x.consumption));
  fs.writeFileSync(binary, bytes);
  abandonFixedExecution(x.grant); assert.throws(() => abandonFixedExecution(x.grant));
  assert.equal(fs.existsSync(path.join(x.directory, "resume-authorized.json")), false);
});
test("fixed process crash after terminal review permits original cleanup only", windows, async t => {
  const parent=fs.realpathSync.native(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,"roost-fixed-recovery-"));
  t.after(()=>{assert.equal(fs.realpathSync.native(root),root);assert.equal(path.dirname(root),parent);fs.rmSync(root,{recursive:true});});
  const child=spawnSync(process.execPath,[fileURLToPath(new URL("./fixtures/fixed-cleanup-child.mjs",import.meta.url)),root],{windowsHide:true,encoding:"utf8",timeout:30000});
  assert.equal(child.status,41,child.stderr);
  const directory=path.join(root,"state",fs.readdirSync(path.join(root,"state")).find(n=>n.startsWith("native-review-")));
  const fixture=JSON.parse(fs.readFileSync(path.join(directory,"fixed-location.json"))),original=fs.readFileSync(path.join(directory,"fixture-created.json"));
  const qualification=qualifyNativeReconciliation(directory,fixture);assert.equal(qualification.eligible,true,JSON.stringify(qualification));
  const grant=issueNativeReconciliationApproval({directory,fixture,assertOwnerAuthority(){}});
  await assert.rejects(runFixedExecution(grant,{remainingMs:()=>30000}));
  assert.equal(reconcileNativeArtifacts(grant).completed,true);assert.equal(fs.existsSync(fixture.root),false);
  assert.equal(fs.existsSync(path.join(root,"state","agent-host-writer.lock")),false);
  assert.equal(reconcileNativeArtifacts(grant).replay,true);assert.deepEqual(fs.readFileSync(path.join(directory,"fixture-created.json")),original);
});
