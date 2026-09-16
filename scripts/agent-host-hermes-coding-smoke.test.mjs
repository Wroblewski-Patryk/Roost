import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { withHermesLaunchFixture, runQualifiedHermesFixture } from "./fixtures/hermes-launch.mjs";
import { createHermesCodingFixture } from "./fixtures/hermes-coding-smoke.mjs";
import { collectHermesLaunchProofs, qualifyHermesLaunch } from "./lib/agent-host-hermes-launch-admission.mjs";
import { prepareProviderInput, abandonProviderNativeBoundary } from "./lib/agent-host-provider-input.mjs";
import { issueHermesSmokeActivation, consumeHermesSmokeActivation, revokeHermesSmokeActivation } from "./lib/agent-host-hermes-smoke-activation.mjs";
import { assertHermesSmokeInstallation } from "./lib/agent-host-hermes-smoke-installation.mjs";
import { inspectNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { hermesStartupEnvironment } from "./lib/agent-host-hermes-startup.mjs";
import { createHermesQuietGuard } from "./lib/agent-host-hermes-quiet.mjs";
import { finishHermesSmokeBoundary } from "./lib/agent-host-hermes-coding-smoke.mjs";
const windows = { skip: process.platform !== "win32" };
const scope = f => { f.packet.contract.budgets.maxDurationSeconds = 300; f.packet.contract.nativeBoundary.writePaths = ["add.cjs"]; };
const consumption = x => {
  x.f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: x.envelope.revisions.packet, contextRevision: x.envelope.revisions.context };
  return x.options;
};

test("reported authentication failure exposes only a fixed hint, never raw diagnostics", () => {
  const guard = createHermesQuietGuard(); guard.write("stderr", Buffer.from("AuthError: credentials missing; run hermes login. synthetic detail"));
  assert.throws(() => guard.complete(1), error => {
    assert.equal(error.details.providerDiagnostic, "authentication_required_reported");
    assert.equal(JSON.stringify(error).includes("synthetic detail"), false); return true;
  });
});

test("completed harmless native attempt releases Writer without repeating pre-spawn abandon; unknown cleanup retains it", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await nativeFixture(t, { executablePath: fixture.executablePath });
    const receipt = qualifyHermesLaunch(x.projection, collectHermesLaunchProofs(x.projection, fixture.jobArtifact));
    const result = await runQualifiedHermesFixture({ receipt, options: x.projection, consumption: consumption(x), activation: fixture.activation });
    assert.equal(finishHermesSmokeBoundary({ envelope: x.envelope, spawnStarted: true, job: { ...result.ownedTreeReceipt }, keepWriter: false }), true);
    assert.equal(finishHermesSmokeBoundary({ envelope: x.envelope, spawnStarted: true, job: result.ownedTreeReceipt, keepWriter: true }), true);
    assert.equal(finishHermesSmokeBoundary({ envelope: x.envelope, spawnStarted: true, job: result.ownedTreeReceipt, keepWriter: false }), false);
    await x.writerLock.release(); assert.equal(existsSync(path.join(x.state, "agent-host-writer.lock")), false);
  });
});

test("smoke grants bind opaque local authority, exact attempt/model/deadline; replay and API claims fail", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await nativeFixture(t, { executablePath: fixture.executablePath, edit: scope });
    const receipt = qualifyHermesLaunch(x.projection, collectHermesLaunchProofs(x.projection, fixture.jobArtifact));
    for (const claim of [true, { ownerConfirmed: true }, null]) assert.throws(() => issueHermesSmokeActivation(x.projection, receipt, claim));
    assert.throws(() => issueHermesSmokeActivation(x.projection, receipt, () => { throw Error("revoked"); }));
    const grant = issueHermesSmokeActivation(x.projection, receipt, () => {});
    for (const fake of [true, {}, structuredClone(grant), { activationAuthorized: true }])
      assert.throws(() => consumeHermesSmokeActivation(fake, x.projection, consumption(x)));
    const handoff = consumeHermesSmokeActivation(grant, x.projection, consumption(x));
    assert.equal(handoff.activation.scope, "one_real_hermes_coding_smoke_only");
    assert.equal(handoff.activation.activationAuthorized, true); assert.equal(handoff.activation.spawnStarted, false);
    assert.throws(() => consumeHermesSmokeActivation(grant, x.projection, consumption(x)));
    assert.throws(() => issueHermesSmokeActivation(x.projection, receipt, () => {}));
    assert.throws(() => assertHermesSmokeInstallation({ ...handoff.activation }, fixture.executablePath));
  });
});

test("expired, revoked, cross-workspace and cross-task grants burn before handoff", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await nativeFixture(t, { executablePath: fixture.executablePath, edit: scope });
    const receipt = qualifyHermesLaunch(x.projection, collectHermesLaunchProofs(x.projection, fixture.jobArtifact));
    for (const mutate of [o => { o.repositoryPath += "-other"; }, o => { o.provider = { ...o.provider, executablePath: o.provider.executablePath + ".other" }; },
      o => { o.envelope = structuredClone(o.envelope); o.envelope.identity.taskId = "00000000-0000-4000-8000-000000000111"; },
      o => { o.envelope = structuredClone(o.envelope); o.envelope.contract.modelSelection.model = "gpt-6-astra"; },
      o => { o.envelope = structuredClone(o.envelope); o.envelope.contract.modelSelection.reasoningEffort = "high"; }]) {
      const grant = issueHermesSmokeActivation(x.projection, receipt, () => {}), changed = { ...x.projection }; mutate(changed);
      assert.throws(() => consumeHermesSmokeActivation(grant, changed, consumption(x)));
      assert.throws(() => consumeHermesSmokeActivation(grant, x.projection, consumption(x)));
    }
    const expired = issueHermesSmokeActivation(x.projection, receipt, () => {}), now = Date.now;
    try { Date.now = () => now() + 60001; assert.throws(() => consumeHermesSmokeActivation(expired, x.projection, consumption(x))); }
    finally { Date.now = now; }
    const revoked = issueHermesSmokeActivation(x.projection, receipt, () => {}); revokeHermesSmokeActivation(revoked);
    assert.throws(() => consumeHermesSmokeActivation(revoked, x.projection, consumption(x)));
  });
});

test("otherwise valid alternate model/reasoning and a 301-second budget cannot get smoke activation", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    for (const change of [f => { f.packet.contract.modelSelection.model = "gpt-6-astra"; },
      f => { f.packet.contract.modelSelection.reasoningEffort = "high"; }, f => { f.packet.contract.budgets.maxDurationSeconds = 301; }]) {
      const x = await nativeFixture(t, { executablePath: fixture.executablePath, edit(f) { scope(f); change(f); } });
      const receipt = qualifyHermesLaunch(x.projection, collectHermesLaunchProofs(x.projection, fixture.jobArtifact));
      assert.throws(() => issueHermesSmokeActivation(x.projection, receipt, () => {}));
    }
  });
});

test("marked repository starts with deterministic FAIL, accepts only minimal fix and independently verifies PASS", windows, async t => {
  const fixture = createHermesCodingFixture(), marker = path.join(fixture.root, ".roost-attempt-owner");
  let removed = false;
  t.after(() => { if (!removed) fixture.cleanup(); });
  assert.equal(fixture.before.failed, true); assert.equal(fixture.before.exit, 1);
  const file = path.join(fixture.repository, "add.cjs"), original = readFileSync(file, "utf8");
  assert.throws(() => fixture.verify(), /smoke_unexpected_diff/);
  writeFileSync(file, original.replace("a - b", "a + b"));
  const verified = fixture.verify(); assert.equal(verified.after.passed, true); assert.deepEqual(verified.changedFiles, ["add.cjs"]);
  const testFile = path.join(fixture.repository, "add.test.cjs"), testBytes = readFileSync(testFile);
  try { writeFileSync(testFile, "throw Error('changed');\n"); assert.throws(() => fixture.verify(), /smoke_unexpected_diff/); }
  finally { writeFileSync(testFile, testBytes); }
  const bytes = readFileSync(marker);
  try { writeFileSync(marker, "unowned"); assert.throws(() => fixture.cleanup()); assert.equal(existsSync(file), true); }
  finally { writeFileSync(marker, bytes); }
  assert.ok(inspectNativeOwnedTemp(fixture.ownership, fixture.attempt).inventory.rows.some(r => r.path === "repository/.git"));
  fixture.cleanup(); removed = true; assert.equal(existsSync(fixture.root), false);
});

test("legacy smoke fixture without original durable ownership cannot enter the native pipeline", windows, async t => {
  const fixture = createHermesCodingFixture(); let envelope, writer;
  t.after(async () => { if (envelope) abandonProviderNativeBoundary(envelope); if (writer) await writer.release(); fixture.cleanup(); });
  const synthetic = await nativeFixture(t);
  const state = path.join(fixture.root, "state"); mkdirSync(state); writer = await acquireWriterLock(state);
  const f = fixture.prepare(), provider = synthetic.provider;
  const env = hermesStartupEnvironment(provider.profile, { SYSTEMROOT: process.env.SystemRoot }, fixture.repository);
  assert.throws(() => prepareProviderInput({ provider, repositoryPath: fixture.repository, startupEnvironment: env,
    fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed, currentCommit: fixture.head,
    assertAuthority() {}, nativeBoundaryOptions: { writerLock: writer, expected: { head: fixture.head, branch: f.packet.contract.singleTask.branch,
      origin: f.claimed.application.repositories[0].url } } }), /native_fixture_original_required/);
});
