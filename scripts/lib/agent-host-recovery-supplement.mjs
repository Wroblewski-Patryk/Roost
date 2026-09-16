// Append-only evidence, never an execution/deletion capability or an API route.
import path from "node:path";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, openSync, writeFileSync, fsyncSync, closeSync } from "node:fs";
import { z } from "zod";
import { nativeDigest, physicalIdentity } from "./agent-host-native-footprint.mjs";
import { nativeArtifactSnapshot } from "./agent-host-native-review.mjs";
import { recoveryIdentityVersion, legacyInputIdentityVersion, legacyReviewIdentityVersion } from "./agent-host-recovery-identity.mjs";

export const recoverySupplementVersion = "roost-recovery-supplement-v1";
export const recoverySupplementMaxAgeMs = 300000;
const h = z.string().regex(/^[a-f0-9]{64}$/), count = z.number().int().nonnegative();
const artifact = z.object({ identityDigest: h, digest: h }).strict();
const bridge = z.object({ legacySerializerVersion: z.enum([legacyInputIdentityVersion, legacyReviewIdentityVersion]),
  legacyIdentityDigest: h, canonicalSerializerVersion: z.literal(recoveryIdentityVersion), canonicalIdentityDigest: h,
  equalFields: z.literal(5), fieldEqualityDigest: h }).strict();
export const recoverySupplementBindingSchema = z.object({
  originalReview: artifact, originalReviewDirectory: h, originalKeyIdentity: h, originalPayloadDigest: h,
  originalBindingDigest: h, identityBridge: bridge,
  tupleFieldDigests: z.object({ executionId: h, workspaceId: h, taskId: h, applicationId: h, attempt: h }).strict(),
  ready: h, repositoryIdentity: h, preFootprintDigest: h, postFootprintDigest: h, jobDigest: h,
  writer: artifact, lease: artifact, spent: artifact, originalInstallationDigest: h,
  originalOutcome: z.literal("acceptance_failed"), originalVerification: z.literal("REFUSED"), authorization: z.literal("spent"),
  laterPolicy: z.object({ startup: z.literal("roost-hermes-standard-startup-v2"), windows: z.literal("roost-windows-system-environment-v1") }).strict()
}).strict();
export const recoveryObservationSchema = z.object({
  originalArtifactsDigest: h, repositoryIdentity: h, footprintDigest: h, fixtureRootIdentity: h,
  fixtureParentIdentity: h, markerIdentity: h, markerDigest: h, scopeMarkerIdentity: h, scopeMarkerDigest: h,
  fixtureInventoryDigest: h, installationSnapshotDigest: h, manifestDigest: h, generatedReceiptDigest: h,
  immutableFiles: count, generatedFiles: count, protectedChanges: z.literal(0), extraEntries: count,
  originalFixtureOwnershipPresent: z.boolean(), boundaryCoverage: z.literal("bounded_root_and_fixture_only")
}).strict();
export const recoveryVerificationSchema = z.object({
  status: z.literal("later_independent_test_passed"), laterObservedAt: z.string().datetime(),
  expectedFixVerified: z.literal(true), baselineCommitUnchanged: z.literal(true), testUnchanged: z.literal(true),
  nodeExit: z.literal(0), testsPassed: z.literal(1), testsFailed: z.literal(0), testDigest: h, implementationDigest: h,
  baselineCommitDigest: h, diffDigest: h, outputDigest: h, nodeExecutableDigest: h,
  extraEntriesUnacceptable: z.literal(true), attribution: z.literal("unknown"), unknownAttributionCount: count,
  originalVerificationUnchanged: z.literal(true), taskCompletionAllowed: z.literal(false)
}).strict();
const stages = ["prepared", "verification_captured", "finalized"];
const files = ["01-prepared.json", "02-verification-captured.json", "03-finalized.json"];
const eventSchema = z.object({ version: z.literal(recoverySupplementVersion), scope: z.literal("preserved_attempt_later_verification_only"),
  stage: z.enum(stages), index: z.number().int().min(0).max(2), observedAt: z.string().datetime(), expiresAt: z.string().datetime(),
  directoryIdentity: h, stateIdentity: h, keyIdentity: h, eventIdentity: h, previousDigest: h.nullable(),
  binding: recoverySupplementBindingSchema, before: recoveryObservationSchema,
  verification: recoveryVerificationSchema.nullable(), after: recoveryObservationSchema.nullable(),
  deletionAuthorized: z.literal(false), executionAuthorized: z.literal(false), taskCompletionAllowed: z.literal(false)
}).strict();
const handles = new WeakMap();
const fail = code => { throw Error(code); };
const bytes = value => Buffer.from(JSON.stringify(value) + "\n");
const signature = (key, payload) => createHmac("sha256", key).update(bytes(payload)).digest("hex");
export const recoverySupplementDirectory = (state, reviewDigest) => {
  if (!h.safeParse(reviewDigest).success) fail("native_supplement_reference_invalid");
  return path.join(state, "native-supplement-" + reviewDigest);
};

export function readRecoverySupplement(directory) {
  const directoryIdentity = physicalIdentity(directory), stateIdentity = physicalIdentity(path.dirname(directory));
  const keyFile = path.join(directory, "integrity.key"), keyIdentity = physicalIdentity(keyFile, false), key = readFileSync(keyFile);
  if (key.length !== 32) fail("native_supplement_integrity_unproven");
  const names = readdirSync(directory).sort(), events = [];
  if (names.length < 2 || names.length > 4 || !names.includes("integrity.key")) fail("native_supplement_chain_invalid");
  for (let i = 0; i < names.length - 1; i++) {
    if (names[i] !== files[i]) fail("native_supplement_chain_invalid");
    const item = nativeArtifactSnapshot(path.join(directory, files[i]));
    const record = z.object({ payload: eventSchema, signature: h }).strict().parse(item.record), p = record.payload;
    if (!timingSafeEqual(Buffer.from(record.signature, "hex"), Buffer.from(signature(key, p), "hex"))
        || p.eventIdentity !== physicalIdentity(path.join(directory, files[i]), false)
        || p.keyIdentity !== keyIdentity || p.directoryIdentity !== directoryIdentity || p.stateIdentity !== stateIdentity)
      fail("native_supplement_integrity_unproven");
    const first = events[0]?.payload, previous = events.at(-1);
    if (p.index !== i || p.stage !== stages[i] || p.previousDigest !== (previous?.digest ?? null)
        || p.before.repositoryIdentity !== p.binding.repositoryIdentity || p.before.footprintDigest !== p.binding.postFootprintDigest
        || p.verification && p.verification.unknownAttributionCount !== p.before.extraEntries
        || Date.parse(p.observedAt) > Date.parse(p.expiresAt)
        || first && (p.expiresAt !== first.expiresAt || Date.parse(p.observedAt) < Date.parse(previous.payload.observedAt)
          || nativeDigest(p.binding) !== nativeDigest(first.binding) || nativeDigest(p.before) !== nativeDigest(first.before))
        || i === 0 && (p.verification !== null || p.after !== null || Date.parse(p.expiresAt) - Date.parse(p.observedAt) !== recoverySupplementMaxAgeMs)
        || i === 1 && (!p.verification || p.after !== null)
        || i === 2 && (!p.after || nativeDigest(p.before) !== nativeDigest(p.after)
          || nativeDigest(p.verification) !== nativeDigest(previous.payload.verification))) fail("native_supplement_chain_invalid");
    if (p.verification && (Date.parse(p.verification.laterObservedAt) < Date.parse((first ?? p).observedAt)
        || Date.parse(p.verification.laterObservedAt) > Date.parse(p.observedAt))) fail("native_supplement_time_invalid");
    events.push({ payload: p, digest: item.digest, identity: item.identity });
  }
  if (directory !== recoverySupplementDirectory(path.dirname(directory), events[0].payload.binding.originalReview.digest))
    fail("native_supplement_reference_invalid");
  return { directoryIdentity, keyIdentity, events, payload: events.at(-1).payload, digest: events.at(-1).digest };
}
function append(saved, index, verification = null, after = null) {
  saved.assertOwnerAuthority(); saved.assertUnchanged();
  if (Date.now() < saved.at || Date.now() - saved.at >= recoverySupplementMaxAgeMs
      || performance.now() - saved.monotonic >= recoverySupplementMaxAgeMs) fail("native_supplement_preparation_expired");
  if (physicalIdentity(saved.state) !== saved.stateIdentity || physicalIdentity(saved.directory) !== saved.directoryIdentity
      || physicalIdentity(path.join(saved.directory, "integrity.key"), false) !== saved.keyIdentity
      || !readFileSync(path.join(saved.directory, "integrity.key")).equals(saved.key)) fail("native_supplement_integrity_unproven");
  const previous = index ? readRecoverySupplement(saved.directory) : null;
  if (index !== saved.index + 1 || previous && (previous.events.length !== index || previous.digest !== saved.lastDigest)) fail("native_supplement_replay_denied");
  const target = path.join(saved.directory, files[index]), fd = openSync(target, "wx", 0o600);
  try {
    const payload = eventSchema.parse({ version: recoverySupplementVersion, scope: "preserved_attempt_later_verification_only",
      stage: stages[index], index, observedAt: new Date(index ? Date.now() : saved.at).toISOString(), expiresAt: new Date(saved.at + recoverySupplementMaxAgeMs).toISOString(),
      directoryIdentity: saved.directoryIdentity, stateIdentity: saved.stateIdentity, keyIdentity: saved.keyIdentity,
      eventIdentity: physicalIdentity(target, false), previousDigest: previous?.digest ?? null,
      binding: saved.binding, before: saved.before, verification, after,
      deletionAuthorized: false, executionAuthorized: false, taskCompletionAllowed: false });
    writeFileSync(fd, bytes({ payload, signature: signature(saved.key, payload) })); fsyncSync(fd);
  } finally { closeSync(fd); }
  const readback = readRecoverySupplement(saved.directory); saved.index = index; saved.lastDigest = readback.digest;
  return readback;
}
export function beginRecoverySupplement({ state, binding, before, assertOwnerAuthority, assertUnchanged }) {
  if (typeof assertOwnerAuthority !== "function" || typeof assertUnchanged !== "function") fail("native_supplement_owner_authority_required");
  assertOwnerAuthority(); assertUnchanged();
  binding = recoverySupplementBindingSchema.parse(binding); before = recoveryObservationSchema.parse(before);
  const stateIdentity = physicalIdentity(state), directory = recoverySupplementDirectory(state, binding.originalReview.digest);
  // Exclusive deterministic reservation: restart, duplicate and replay never overwrite.
  try { mkdirSync(directory); } catch { fail("native_supplement_already_exists"); }
  const key = randomBytes(32), keyFile = path.join(directory, "integrity.key"), fd = openSync(keyFile, "wx", 0o600);
  try { writeFileSync(fd, key); fsyncSync(fd); } finally { closeSync(fd); }
  const saved = { state, stateIdentity, directory, directoryIdentity: physicalIdentity(directory), key, keyIdentity: physicalIdentity(keyFile, false),
    binding: structuredClone(binding), before: structuredClone(before), assertOwnerAuthority, assertUnchanged,
    at: Date.now(), monotonic: performance.now(), index: -1 };
  append(saved, 0); const handle = Object.freeze({}); handles.set(handle, saved); return handle;
}
export function captureRecoveryVerification(handle, verification) {
  const saved = handles.get(handle); if (!saved || saved.index !== 0) fail("native_supplement_replay_denied");
  return append(saved, 1, recoveryVerificationSchema.parse(verification));
}
export function finalizeRecoverySupplement(handle, after) {
  const saved = handles.get(handle); if (!saved || saved.index !== 1) fail("native_supplement_replay_denied");
  after = recoveryObservationSchema.parse(after);
  if (nativeDigest(after) !== nativeDigest(saved.before)) fail("native_supplement_observation_drift");
  return append(saved, 2, readRecoverySupplement(saved.directory).payload.verification, after);
}
export function recoverySupplementLocation(handle) {
  const saved = handles.get(handle); if (!saved) fail("native_supplement_unproven"); return saved.directory;
}
export function projectRecoverySupplement(record) {
  const p = record.payload;
  return Object.freeze({ version: recoverySupplementVersion, stage: p.stage, originalReviewDigest: p.binding.originalReview.digest,
    supplementDigest: record.digest, originalOutcome: p.binding.originalOutcome, originalVerification: p.binding.originalVerification,
    laterVerification: p.verification?.status ?? null, expectedFixVerified: p.verification?.expectedFixVerified ?? false,
    extraEntries: p.before.extraEntries, unknownAttributionCount: p.verification?.unknownAttributionCount ?? null,
    protectedChanges: p.before.protectedChanges, deletionAuthorized: false, executionAuthorized: false, taskCompletionAllowed: false });
}
