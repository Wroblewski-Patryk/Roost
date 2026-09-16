import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, realpathSync } from "node:fs";
import { createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp, physicalIdentity, nativeDigest } from "./lib/agent-host-native-footprint.mjs";
import { prepareSyntheticB17Exception, executeLegacyB17Exception } from "./lib/agent-host-b17-legacy-exception.mjs";
import { assertHermesB20RecoveryComplete, prepareHermesB21Audit, assertHermesB21Audit, reserveHermesB21Audit, closeBlockedHermesB21Audit, reserveHermesB17Audit } from "./lib/agent-host-hermes-b14-audit.mjs";
import { issueHermesB21SmokeActivation, consumeHermesB21SmokeActivation, hermesB21SmokeScope,
  issueHermesB17SmokeActivation, consumeHermesB17SmokeActivation, issueHermesB14SmokeActivation, issueHermesSmokeActivation, revokeHermesSmokeActivation } from "./lib/agent-host-hermes-smoke-activation.mjs";
import { collectHermesLaunchProofs, qualifyHermesLaunch } from "./lib/agent-host-hermes-launch-admission.mjs";
import { withHermesLaunchFixture } from "./fixtures/hermes-launch.mjs";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { createHermesB21CodingFixture } from "./fixtures/hermes-coding-smoke.mjs";
const windows = { skip: process.platform !== "win32" };
function state(t) {
  const attempt = randomUUID(), ownership = createNativeOwnedTemp(realpathSync.native(os.tmpdir()), attempt), directory = inspectNativeOwnedTemp(ownership, attempt).root;
  t.after(() => assert.equal(cleanupNativeOwnedTemp(ownership, attempt).remaining, 0));
  const application = nativeDigest("synthetic"), writer = "agent-host-writer.lock", lease = `application-${application}.lease`;
  writeFileSync(path.join(directory, writer), JSON.stringify({ ownerNonce: "synthetic" }));
  writeFileSync(path.join(directory, lease), JSON.stringify({ writer: "synthetic", application }));
  const names = ["b13", "b14", "b17"].map(n => `hermes-${n}-smoke-consumed.json`);
  for (const name of names) writeFileSync(path.join(directory, name), JSON.stringify({ scope: name, spent: true }));
  const item = name => ({ name, identity: physicalIdentity(path.join(directory, name), false), digest: createHash("sha256").update(readFileSync(path.join(directory, name))).digest("hex") });
  const binding = { policy: "roost-b17-legacy-exception-v1", ownerDecision: "ADR-004-v12-B20-exact-legacy-pair", stateIdentity: physicalIdentity(directory),
    writer: item(writer), lease: item(lease), spent: names.map(item), historicalJobDigest: "a".repeat(64), historicalRootDigest: "b".repeat(64) };
  const grant = prepareSyntheticB17Exception({ stateDirectory: directory, ownership, attempt, binding, assertOwnerAuthority() {},
    processCheck: () => ({ ownerAbsent: true, ownerChildren: 0, matchingExecutables: 0, jobLaunchers: 0, historicalBinding: "unavailable_owner_exception" }) });
  const result = executeLegacyB17Exception(grant); writeFileSync(path.join(directory, "b20-legacy-recovery", "final-readback.json"), JSON.stringify(result));
  return { directory, binding, item };
}
test("B21 audit requires complete B20, preserves all old records and reserves only once", windows, t => {
  const x = state(t); assert.equal(assertHermesB20RecoveryComplete(x.directory).status, "PASS");
  const a = prepareHermesB21Audit(x.directory), concurrent = prepareHermesB21Audit(x.directory);
  assert.throws(() => reserveHermesB21Audit(structuredClone(a), {})); assert.throws(() => reserveHermesB17Audit(a, {}));
  const receipt = reserveHermesB21Audit(a, { executionId: randomUUID() }); assert.equal(receipt.b21SpentRecordRetained, true); assert.equal(receipt.b20RecoveryPreserved, true);
  for (const saved of x.binding.spent) assert.deepEqual(x.item(saved.name), saved);
  assert.throws(() => reserveHermesB21Audit(a, {})); assert.throws(() => reserveHermesB21Audit(concurrent, {})); assert.throws(() => prepareHermesB21Audit(x.directory));
  writeFileSync(path.join(x.directory, "b20-legacy-recovery", "08-complete.json"), "changed"); assert.throws(() => assertHermesB21Audit(a));
});
test("B21 preflight failure is terminal and changed B20/barrier/foreign lease blocks admission", windows, t => {
  const x = state(t), a = prepareHermesB21Audit(x.directory); closeBlockedHermesB21Audit(a, { executionId: randomUUID() }, "synthetic_preflight_failure");
  assert.throws(() => reserveHermesB21Audit(a, {})); assert.throws(() => prepareHermesB21Audit(x.directory));
  for (const name of ["agent-host-recovery.lock", "application-foreign.lease", "agent-host-writer.lock"]) {
    const y = state(t); writeFileSync(path.join(y.directory, name), "{}"); assert.throws(() => prepareHermesB21Audit(y.directory));
  }
  const y = state(t); writeFileSync(path.join(y.directory, "b20-legacy-recovery", "final-readback.json"), "{}"); assert.throws(() => prepareHermesB21Audit(y.directory));
});
test("B21 grants bind exact task/model and reject old scopes, JSON, revocation and replay", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await nativeFixture(t, { executablePath: fixture.executablePath, edit(f) { f.packet.contract.budgets.maxDurationSeconds = 300; f.packet.contract.nativeBoundary.writePaths = ["add.cjs"]; } });
    const receipt = qualifyHermesLaunch(x.projection, collectHermesLaunchProofs(x.projection, fixture.jobArtifact));
    x.f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: x.envelope.revisions.packet, contextRevision: x.envelope.revisions.context };
    for (const issue of [issueHermesSmokeActivation, issueHermesB14SmokeActivation, issueHermesB17SmokeActivation])
      assert.throws(() => consumeHermesB21SmokeActivation(issue(x.projection, receipt, () => {}), x.projection, x.options));
    const cross = issueHermesB21SmokeActivation(x.projection, receipt, () => {}); assert.throws(() => consumeHermesB17SmokeActivation(cross, x.projection, x.options));
    assert.throws(() => consumeHermesB21SmokeActivation(cross, x.projection, x.options));
    const revoked = issueHermesB21SmokeActivation(x.projection, receipt, () => {}); revokeHermesSmokeActivation(revoked); assert.throws(() => consumeHermesB21SmokeActivation(revoked, x.projection, x.options));
    const changed = issueHermesB21SmokeActivation(x.projection, receipt, () => {}), altered = structuredClone(x.projection.envelope); altered.contract.modelSelection.reasoningEffort = "high";
    assert.throws(() => consumeHermesB21SmokeActivation(changed, { ...x.projection, envelope: altered }, x.options));
    const grant = issueHermesB21SmokeActivation(x.projection, receipt, () => {}); assert.throws(() => consumeHermesB21SmokeActivation(structuredClone(grant), x.projection, x.options));
    assert.equal(consumeHermesB21SmokeActivation(grant, x.projection, x.options).activation.scope, hermesB21SmokeScope);
    assert.throws(() => consumeHermesB21SmokeActivation(grant, x.projection, x.options));
  });
});
test("B21 fixture: baseline FAIL, exact existing test PASS, extra safe file refuses exact acceptance before execution", windows, () => {
  const f = createHermesB21CodingFixture();
  try {
    assert.equal(f.before.exit, 1); assert.equal(JSON.parse(readFileSync(path.join(f.root, ".roost-smoke-scope"))).scope, hermesB21SmokeScope);
    const file = path.join(f.repository, "add.cjs"); writeFileSync(file, readFileSync(file, "utf8").replace("a - b", "a + b"));
    const result = f.verify(); assert.equal(result.after.exit, 0); assert.equal(result.minimalChange, true); assert.equal(result.testUnchanged, true);
    writeFileSync(path.join(f.repository, "extra.test.cjs"), "throw Error('must never execute');"); assert.throws(() => f.verify(), /smoke_unexpected_diff/);
  } finally { assert.equal(f.cleanup().remaining, 0); assert.equal(existsSync(f.root), false); }
});
