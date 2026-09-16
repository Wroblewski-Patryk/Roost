import { verifyCompletedNativeBoundary, releaseReviewedNativeBoundary } from "./lib/agent-host-hermes-native-boundary.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, realpathSync, readdirSync } from "node:fs";
import { createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";
import { prepareHermesB14Audit, assertHermesB14Audit, reserveHermesB14Audit, closeBlockedHermesB14Audit } from "./lib/agent-host-hermes-b14-audit.mjs";
import { issueHermesSmokeActivation, consumeHermesSmokeActivation, issueHermesB14SmokeActivation,
  consumeHermesB14SmokeActivation, revokeHermesSmokeActivation, hermesB14SmokeScope } from "./lib/agent-host-hermes-smoke-activation.mjs";
import { collectHermesLaunchProofs, qualifyHermesLaunch } from "./lib/agent-host-hermes-launch-admission.mjs";
import { cleanupHermesSmokeAttempt } from "./lib/agent-host-hermes-coding-smoke.mjs";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { withHermesLaunchFixture, runQualifiedHermesFixture } from "./fixtures/hermes-launch.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { verifyHermesSmokeInstallation } from "./lib/agent-host-hermes-smoke-installation.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";
const windows = { skip: process.platform !== "win32" };
function owned(t, attempt = randomUUID()) {
  const proof = createNativeOwnedTemp(realpathSync.native(os.tmpdir()), attempt);
  const root = inspectNativeOwnedTemp(proof, attempt).root;
  let cleaned = false;
  const cleanup = () => { const receipt = cleanupNativeOwnedTemp(proof, attempt); cleaned = true; return receipt; };
  t.after(() => { if (!cleaned) cleanup(); });
  return { root, attempt, cleanup };
}
function state(t) {
  const fixture = owned(t), directory = path.join(fixture.root, "state"); mkdirSync(directory);
  const prior = path.join(directory, "hermes-b13-smoke-consumed.json");
  const bytes = '{"schemaVersion":1,"scope":"one_real_hermes_coding_smoke_only","state":"dispatch_reserved"}\n';
  writeFileSync(prior, bytes);
  return { directory, prior, bytes, fixture };
}
const consumption = x => {
  x.f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: x.envelope.revisions.packet, contextRevision: x.envelope.revisions.context };
  return x.options;
};
async function admission(t, fixture) {
  const x = await nativeFixture(t, { executablePath: fixture.executablePath, edit(f) {
    f.packet.contract.budgets.maxDurationSeconds = 300; f.packet.contract.nativeBoundary.writePaths = ["add.cjs"];
  } });
  return { ...x, receipt: qualifyHermesLaunch(x.projection, collectHermesLaunchProofs(x.projection, fixture.jobArtifact)) };
}

test("B14 audit preserves B13 bytes, rejects replay/restart/JSON and uses a separate exclusive record", windows, t => {
  const x = state(t), a = prepareHermesB14Audit(x.directory), concurrent = prepareHermesB14Audit(x.directory);
  assert.throws(() => reserveHermesB14Audit(structuredClone(a), { executionId: randomUUID() }));
  assert.deepEqual(reserveHermesB14Audit(a, { executionId: randomUUID() }), { b13RecordPreserved: true, b14SpentRecordRetained: true });
  assert.equal(readFileSync(x.prior, "utf8"), x.bytes);
  const record = JSON.parse(readFileSync(path.join(x.directory, "hermes-b14-smoke-consumed.json")));
  assert.equal(record.scope, hermesB14SmokeScope); assert.equal(record.state, "dispatch_reserved");
  assert.throws(() => reserveHermesB14Audit(a, {})); assert.throws(() => reserveHermesB14Audit(concurrent, {}));
  assert.throws(() => prepareHermesB14Audit(x.directory));
  writeFileSync(x.prior, "changed"); assert.throws(() => assertHermesB14Audit(a));
});

test("B14 refuses an existing Writer and missing B13; preflight failure is terminal without dispatch", windows, async t => {
  const x = state(t), writer = await acquireWriterLock(x.directory);
  try { assert.throws(() => prepareHermesB14Audit(x.directory)); } finally { await writer.release(); }
  const absent = owned(t); assert.throws(() => prepareHermesB14Audit(absent.root));
  const a = prepareHermesB14Audit(x.directory);
  closeBlockedHermesB14Audit(a, { executionId: randomUUID() }, "hermes_smoke_inventory_changed");
  assert.equal(JSON.parse(readFileSync(path.join(x.directory, "hermes-b14-smoke-consumed.json"))).state, "preflight_blocked");
  assert.throws(() => reserveHermesB14Audit(a, {})); assert.throws(() => prepareHermesB14Audit(x.directory));
  assert.equal(readFileSync(x.prior, "utf8"), x.bytes);
});

test("B14 grant is distinct from B13, one-use and revocable; public/config/JSON cannot grant it", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await admission(t, fixture);
    assert.throws(() => issueHermesB14SmokeActivation(x.projection, x.receipt, true));
    const old = issueHermesSmokeActivation(x.projection, x.receipt, () => {});
    assert.throws(() => consumeHermesB14SmokeActivation(old, x.projection, consumption(x)));
    assert.throws(() => consumeHermesSmokeActivation(old, x.projection, consumption(x)));
    const wrong = issueHermesB14SmokeActivation(x.projection, x.receipt, () => {});
    assert.throws(() => consumeHermesSmokeActivation(wrong, x.projection, consumption(x)));
    assert.throws(() => consumeHermesB14SmokeActivation(wrong, x.projection, consumption(x)));
    const revoked = issueHermesB14SmokeActivation(x.projection, x.receipt, () => {}); revokeHermesSmokeActivation(revoked);
    assert.throws(() => consumeHermesB14SmokeActivation(revoked, x.projection, consumption(x)));
    const grant = issueHermesB14SmokeActivation(x.projection, x.receipt, () => {});
    for (const fake of [true, {}, structuredClone(grant), { scope: hermesB14SmokeScope, activationAuthorized: true }])
      assert.throws(() => consumeHermesB14SmokeActivation(fake, x.projection, consumption(x)));
    const handoff = consumeHermesB14SmokeActivation(grant, x.projection, consumption(x));
    assert.equal(handoff.activation.scope, hermesB14SmokeScope); assert.equal(handoff.activation.spawnStarted, false);
    assert.throws(() => consumeHermesB14SmokeActivation(grant, x.projection, consumption(x)));
  });
});

for (const fail of [false, true]) test(`same-attempt genuine ${fail ? "failed" : "successful"} harmless Job releases Writer and owned temp`, windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await nativeFixture(t, { executablePath: fixture.executablePath, edit(f) { if (fail) f.claimed.prompt = "owned budget failure fixture"; } });
    const receipt = qualifyHermesLaunch(x.projection, collectHermesLaunchProofs(x.projection, fixture.jobArtifact));
    let job, nativeResult;
    try {
      const result = await runQualifiedHermesFixture({ receipt, options: x.projection, consumption: consumption(x), activation: fixture.activation });
      assert.equal(fail, false); job = result.ownedTreeReceipt; nativeResult = result.nativeToolReceipt;
    } catch (error) {
      assert.equal(fail, true); assert.equal(error.message, "hermes_quiet_process_failed");
      assert.equal(error.details.nativeToolReceipt.violations.length, 0); job = error.details.attemptBudgetReceipt.ownedTreeReceipt; nativeResult = error.details.nativeToolReceipt;
    }
    assert.equal(job.rootExit, fail ? 2 : 0);
    const temp = owned(t, x.envelope.identity.executionId);
    const blocked = await cleanupHermesSmokeAttempt({ envelope: x.envelope, spawnStarted: true, job: { ...job }, keepWriter: false, fixture: temp, writer: x.writerLock });
    assert.equal(blocked.status, "BLOCKED"); assert.equal(blocked.writerReconciliationRequired, true); assert.equal(existsSync(temp.root), true);
    const unreviewed = await cleanupHermesSmokeAttempt({ envelope: x.envelope, spawnStarted: true, job, keepWriter: false, fixture: temp });
    assert.equal(unreviewed.status, "BLOCKED");
    const reviewed = await verifyCompletedNativeBoundary(nativeResult, { verify() {
      assert.equal(readFileSync(path.join(x.repositoryPath, "editable.txt"), "utf8"), "base\n");
      return { after: { passed: !fail, exit: fail ? 2 : 0 }, testUnchanged: true, baselineCommitUnchanged: true };
    } });
    const done = await cleanupHermesSmokeAttempt({ envelope: x.envelope, spawnStarted: true, job, keepWriter: false, fixture: temp, reviewCapability: reviewed.capability });
    releaseReviewedNativeBoundary(nativeResult, reviewed.capability); await x.writerLock.release(); assert.equal(done.cleanup.remaining, 0); assert.equal(existsSync(temp.root), false);
    assert.equal(existsSync(path.join(x.state, "agent-host-writer.lock")), false);
    assert.equal(readdirSync(x.state).filter(n => n.endsWith(".lease")).length, 0);
  });
});

test("pre-spawn failure releases genuine owned fixture and Writer without a fabricated Job", windows, async t => {
  const x = state(t), writer = await acquireWriterLock(x.directory);
  // Keep Writer state outside the fixture being removed, as in the controller.
  const temp = owned(t);
  const result = await cleanupHermesSmokeAttempt({ spawnStarted: false, keepWriter: false, fixture: temp, writer });
  assert.equal(result.writerReleased, true); assert.equal(result.cleanup.remaining, 0);
  assert.equal(existsSync(path.join(x.directory, "agent-host-writer.lock")), false);
});

test("an extra installed package file fails manifest admission without executing a provider", windows, async t => {
  const temp = owned(t), checkout = path.join(temp.root, "checkout"), python = path.join(temp.root, "python");
  mkdirSync(checkout); mkdirSync(python); writeFileSync(path.join(checkout, "extra.py"), "# synthetic unexpected source\n");
  const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
  const manifestPath = path.join(temp.root, "manifest.json"), attestationPath = path.join(temp.root, "attestation.json");
  const bytes = JSON.stringify({ schemaVersion: 1, version: pin.version, commit: pin.commit, source: pin.officialSource,
    release: pin.release, signature: "unsigned", executable: path.join(checkout, "venv", "Scripts", "hermes.exe"),
    roots: [{ kind: "checkout", path: checkout, files: [] }, { kind: "pythonBase", path: python, files: [] }] });
  writeFileSync(manifestPath, bytes); writeFileSync(attestationPath, JSON.stringify({ manifestPath, manifestSha256: createHash("sha256").update(bytes).digest("hex") }));
  await assert.rejects(verifyHermesSmokeInstallation({ manifestPath, attestationPath }), /hermes_smoke_inventory_changed/);
  assert.equal(readFileSync(path.join(checkout, "extra.py"), "utf8"), "# synthetic unexpected source\n");
});
