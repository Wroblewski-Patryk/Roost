import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHmac } from "node:crypto";
import { realpathSync, readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp, nativeDigest } from "./lib/agent-host-native-footprint.mjs";
import { recoveryIdentityFields, serializeRecoveryIdentity, parseRecoveryIdentity, legacyRecoveryIdentityDigest,
  bridgeRecoveryIdentity, legacyInputIdentityVersion, legacyReviewIdentityVersion } from "./lib/agent-host-recovery-identity.mjs";
import { beginRecoverySupplement, captureRecoveryVerification, finalizeRecoverySupplement, readRecoverySupplement,
  recoverySupplementLocation, projectRecoverySupplement, recoverySupplementMaxAgeMs } from "./lib/agent-host-recovery-supplement.mjs";

const h = "a".repeat(64), artifact = { identityDigest: h, digest: h };
const identity = () => Object.fromEntries(recoveryIdentityFields.map(k => [k, k === "attempt" ? 1 : randomUUID()]));
function* permutations(xs) { if (!xs.length) yield []; else for (const x of xs) for (const p of permutations(xs.filter(v => v !== x))) yield [x, ...p]; }
test("B24 all 120 field orders have one canonical identity and both explicit legacy bridges", () => {
  const value = identity(), canonical = serializeRecoveryIdentity(value);
  for (const order of permutations(recoveryIdentityFields)) {
    const candidate = Object.fromEntries(order.map(k => [k, value[k]]));
    assert.equal(serializeRecoveryIdentity(parseRecoveryIdentity(JSON.stringify(candidate))), canonical);
    for (const version of [legacyInputIdentityVersion, legacyReviewIdentityVersion]) {
      const digest = legacyRecoveryIdentityDigest(value, version), bridge = bridgeRecoveryIdentity(candidate, digest);
      assert.equal(bridge.legacySerializerVersion, version); assert.equal(bridge.equalFields, 5);
      assert.throws(() => bridgeRecoveryIdentity({ ...candidate, attempt: 2 }, digest));
    }
  }
});
test("B24 UUID normalization preserves historical case in the legacy bridge", () => {
  const value = identity(), upper = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typeof v === "string" ? v.toUpperCase() : v]));
  assert.equal(serializeRecoveryIdentity(value), serializeRecoveryIdentity(upper));
  assert.notEqual(legacyRecoveryIdentityDigest(value, legacyInputIdentityVersion), legacyRecoveryIdentityDigest(upper, legacyInputIdentityVersion));
  assert.throws(() => bridgeRecoveryIdentity(value, h, "unknown"));
  assert.throws(() => bridgeRecoveryIdentity(value, legacyRecoveryIdentityDigest(value, legacyReviewIdentityVersion), legacyInputIdentityVersion));
});
for (const [name, mutate] of [
  ["missing", x => { delete x.taskId; }], ["unknown", x => { x.extra = true; }],
  ["zero", x => { x.attempt = 0; }], ["fraction", x => { x.attempt = 1.1; }],
  ["unsafe integer", x => { x.attempt = Number.MAX_SAFE_INTEGER + 1; }], ["numeric string", x => { x.attempt = "1"; }],
  ["invalid UUID", x => { x.taskId = "synthetic"; }], ["symbol", x => { x[Symbol()] = 1; }],
  ["prototype", x => { Object.setPrototypeOf(x, { injected: true }); }],
  ["accessor", x => { Object.defineProperty(x, "taskId", { get() { throw Error("getter must not run"); } }); }]
]) test("B24 identity denies " + name, () => { const value = identity(); mutate(value); assert.throws(() => serializeRecoveryIdentity(value), /native_recovery_identity_invalid/); });
test("B24 JSON duplicate keys including escaped names cannot be collapsed", () => {
  const value = identity(), raw = JSON.stringify(value);
  for (const key of ['"taskId"', '"task\\u0049d"']) assert.throws(() => parseRecoveryIdentity(raw.slice(0, -1) + "," + key + ":" + JSON.stringify(value.taskId) + "}"));
});

function fixture(t, callbacks = {}) {
  const attempt = randomUUID(), proof = createNativeOwnedTemp(realpathSync.native(os.tmpdir()), attempt), state = inspectNativeOwnedTemp(proof, attempt).root;
  t.after(() => { cleanupNativeOwnedTemp(proof, attempt); assert.equal(existsSync(state), false); });
  const value = identity(), binding = {
    originalReview: artifact, originalReviewDirectory: h, originalKeyIdentity: h, originalPayloadDigest: h, originalBindingDigest: h,
    identityBridge: bridgeRecoveryIdentity(value, legacyRecoveryIdentityDigest(value, legacyInputIdentityVersion)),
    tupleFieldDigests: Object.fromEntries(recoveryIdentityFields.map(k => [k, nativeDigest(value[k])])),
    ready: h, repositoryIdentity: h, preFootprintDigest: h, postFootprintDigest: h, jobDigest: h,
    writer: artifact, lease: artifact, spent: artifact, originalInstallationDigest: h,
    originalOutcome: "acceptance_failed", originalVerification: "REFUSED", authorization: "spent",
    laterPolicy: { startup: "roost-hermes-standard-startup-v2", windows: "roost-windows-system-environment-v1" }
  };
  const before = Object.fromEntries(["originalArtifactsDigest", "repositoryIdentity", "footprintDigest", "fixtureRootIdentity", "fixtureParentIdentity",
    "markerIdentity", "markerDigest", "scopeMarkerIdentity", "scopeMarkerDigest", "fixtureInventoryDigest", "installationSnapshotDigest", "manifestDigest", "generatedReceiptDigest"].map(k => [k, h]));
  Object.assign(before, { immutableFiles: 2, generatedFiles: 0, protectedChanges: 0, extraEntries: 8,
    originalFixtureOwnershipPresent: false, boundaryCoverage: "bounded_root_and_fixture_only" });
  const args = { state, binding, before, assertOwnerAuthority() {}, assertUnchanged() {}, ...callbacks };
  const handle = beginRecoverySupplement(args), directory = recoverySupplementLocation(handle);
  const verification = { status: "later_independent_test_passed", laterObservedAt: new Date().toISOString(), expectedFixVerified: true,
    baselineCommitUnchanged: true, testUnchanged: true, nodeExit: 0, testsPassed: 1, testsFailed: 0,
    testDigest: h, implementationDigest: h, baselineCommitDigest: h, diffDigest: h, outputDigest: h, nodeExecutableDigest: h,
    extraEntriesUnacceptable: true, attribution: "unknown", unknownAttributionCount: 8, originalVerificationUnchanged: true, taskCompletionAllowed: false };
  return { args, handle, directory, verification, before, value };
}
test("B24 three append-only HMAC stages preserve REFUSED and expose no authority or private tuple", t => {
  const f = fixture(t), prepared = readFileSync(path.join(f.directory, "01-prepared.json"));
  assert.equal(readRecoverySupplement(f.directory).payload.stage, "prepared");
  captureRecoveryVerification(f.handle, f.verification);
  assert.equal(readRecoverySupplement(f.directory).payload.stage, "verification_captured");
  const final = finalizeRecoverySupplement(f.handle, f.before), projection = projectRecoverySupplement(final);
  assert.equal(final.events.length, 3); assert.equal(projection.stage, "finalized");
  assert.equal(projection.originalVerification, "REFUSED"); assert.equal(projection.originalOutcome, "acceptance_failed");
  for (const key of ["deletionAuthorized", "executionAuthorized", "taskCompletionAllowed"]) assert.equal(projection[key], false);
  for (const secret of [f.directory, f.value.executionId, "return a", "add.cjs"]) assert.ok(!JSON.stringify(final).includes(secret));
  assert.ok(readFileSync(path.join(f.directory, "01-prepared.json")).equals(prepared));
  assert.throws(() => beginRecoverySupplement(f.args), /already_exists/);
  assert.throws(() => captureRecoveryVerification(f.handle, f.verification), /replay_denied/);
  assert.throws(() => finalizeRecoverySupplement(f.handle, f.before), /replay_denied/);
  assert.throws(() => finalizeRecoverySupplement({}, f.before), /replay_denied/);
});
test("B24 expiry rejects appends and does not erase prior evidence", t => {
  const f = fixture(t), now = Date.now(); t.mock.method(Date, "now", () => now + recoverySupplementMaxAgeMs + 1);
  assert.throws(() => captureRecoveryVerification(f.handle, f.verification), /preparation_expired/);
  assert.equal(readRecoverySupplement(f.directory).payload.stage, "prepared");
});
test("B24 owner withdrawal and observation drift stop the chain", t => {
  let denied = false; const f = fixture(t, { assertOwnerAuthority() { if (denied) throw Error("authority withdrawn"); } });
  denied = true; assert.throws(() => captureRecoveryVerification(f.handle, f.verification), /withdrawn/); denied = false;
  captureRecoveryVerification(f.handle, f.verification);
  assert.throws(() => finalizeRecoverySupplement(f.handle, { ...f.before, extraEntries: 9 }), /observation_drift/);
  assert.equal(readRecoverySupplement(f.directory).payload.stage, "verification_captured");
});
test("B24 rechecks external artifacts immediately before every append", t => {
  let drift = false; const f = fixture(t, { assertUnchanged() { if (drift) throw Error("synthetic artifact drift"); } });
  drift = true; assert.throws(() => captureRecoveryVerification(f.handle, f.verification), /artifact drift/);
  assert.equal(readRecoverySupplement(f.directory).events.length, 1);
});
for (const attack of ["body", "key", "replacement", "missing-stage", "extra-field", "cross-attempt", "reordered", "unknown-attribution"]) test("B24 journal rejects " + attack, t => {
  const f = fixture(t); captureRecoveryVerification(f.handle, f.verification); finalizeRecoverySupplement(f.handle, f.before);
  const file = path.join(f.directory, "02-verification-captured.json"), raw = readFileSync(file), record = JSON.parse(raw);
  if (attack === "key") writeFileSync(path.join(f.directory, "integrity.key"), Buffer.alloc(32));
  else if (attack === "replacement") { renameSync(file, file + ".old"); writeFileSync(file, raw); unlinkSync(file + ".old"); }
  else if (attack === "missing-stage") unlinkSync(file);
  else {
    if (attack === "body") record.payload.verification.outputDigest = "b".repeat(64);
    if (attack === "extra-field") record.payload.privatePath = "synthetic-private-canary";
    if (attack === "cross-attempt") record.payload.binding.tupleFieldDigests.attempt = "b".repeat(64);
    if (attack === "reordered") record.payload.index = 2;
    if (attack === "unknown-attribution") record.payload.verification.unknownAttributionCount = 0;
    if (attack !== "body") record.signature = createHmac("sha256", readFileSync(path.join(f.directory, "integrity.key"))).update(JSON.stringify(record.payload) + "\n").digest("hex");
    writeFileSync(file, JSON.stringify(record) + "\n");
  }
  assert.throws(() => readRecoverySupplement(f.directory));
});
test("B24 strict evidence schema refuses a private path before publication", t => {
  const f = fixture(t); assert.throws(() => captureRecoveryVerification(f.handle, { ...f.verification, path: "synthetic-private-canary" }));
  assert.equal(readRecoverySupplement(f.directory).payload.stage, "prepared");
});
