// Exact legacy adoption only. No deletion, process execution, recovery barrier,
// API route, configuration change or general ownership capability is exported.
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, openSync, writeFileSync, fsyncSync, closeSync, existsSync } from "node:fs";
import { z } from "zod";
import { nativeDigest, physicalIdentity } from "./agent-host-native-footprint.mjs";
import { nativeArtifactSnapshot } from "./agent-host-native-review.mjs";
import { recoverySupplementBindingSchema, recoveryObservationSchema, readRecoverySupplement } from "./agent-host-recovery-supplement.mjs";
import { inspectPreservedB21Recovery, readPreservedB21AdoptionEvidence } from "./agent-host-hermes-b24-supplement.mjs";

export const b21AdoptionVersion = "roost-b21-owner-legacy-adoption-v1";
export const b21AdoptionScope = "b25_exact_b21_fixture_legacy_adoption_only";
export const b21AdoptionApprovalMaxAgeMs = 300000;
export const b21AdoptionMaxAgeMs = 24 * 60 * 60 * 1000;
const h = z.string().regex(/^[a-f0-9]{64}$/), fail = code => { throw Error(code); };
const frozenEvidenceSchema = z.object({
  binding: recoverySupplementBindingSchema, observation: recoveryObservationSchema,
  pathDigests: z.object({ state: h, fixture: h, repository: h, marker: h, scopeMarker: h, originalReview: h,
    originalReport: h, manifest: h, installation: h, supplement: h }).strict(),
  supplement: z.object({ digest: h, directoryIdentity: h, keyIdentity: h, eventsDigest: h, verificationDigest: h }).strict(),
  runtime: z.object({ providerExecutableDigest: h, nodeExecutableDigest: h, nodeExecutableIdentity: h,
    installationFilesIdentityDigest: h, approvedPinDigest: h }).strict(),
  processChainDigest: h, processObservation: z.literal("original_processes_absent")
}).strict();
const approvalSchema = z.object({ scope: z.literal(b21AdoptionScope), originalReviewDigest: h, supplementDigest: h,
  frozenEvidenceDigest: h, ownerDecisionDigest: h, missingOriginalOwnershipAccepted: z.literal(true) }).strict();
const payloadSchema = z.object({ version: z.literal(b21AdoptionVersion), scope: z.literal(b21AdoptionScope),
  stage: z.enum(["prepared", "adopted"]), index: z.number().int().min(0).max(1), previousDigest: h.nullable(),
  observedAt: z.string().datetime(), expiresAt: z.string().datetime(), directoryIdentity: h, eventIdentity: h, stateIdentity: h,
  signingKeyIdentity: h, signingContext: z.literal("b25_adoption_separate_from_b24_verification"),
  approval: approvalSchema, frozenEvidence: frozenEvidenceSchema,
  classification: z.literal("owner_approved_legacy_adoption"),
  reason: z.literal("original_opaque_fixture_ownership_receipt_historically_unavailable"),
  originalOwnershipBackfilled: z.literal(false), transferable: z.literal(false), reusable: z.literal(false),
  cleanupAuthorized: z.literal(false), executionAuthorized: z.literal(false), configAuthorized: z.literal(false),
  apiAuthorized: z.literal(false), b26OwnerApprovalRequired: z.literal(true)
}).strict();
const observations = new WeakMap(), grants = new WeakMap(), names = ["01-prepared.json", "02-adopted.json"];
const bytes = value => Buffer.from(JSON.stringify(value) + "\n");
const sign = (key, payload) => createHmac("sha256", key).update(b21AdoptionVersion + "\n").update(bytes(payload)).digest("hex");
export function b21AdoptionDirectory(state, originalReviewDigest) {
  if (!h.safeParse(originalReviewDigest).success) fail("native_b25_reference_invalid");
  return path.join(state, "native-adoption-" + originalReviewDigest);
}
function signingKey(supplementDirectory, expected) {
  const file = path.join(supplementDirectory, "integrity.key");
  if (physicalIdentity(file, false) !== expected) fail("native_b25_signing_key_changed");
  const key = readFileSync(file); if (key.length !== 32) fail("native_b25_signing_key_changed");
  return key;
}
function fresh(s) {
  if (physicalIdentity(s.state) !== s.stateIdentity) fail("native_b25_state_changed");
  const current = frozenEvidenceSchema.parse(readPreservedB21AdoptionEvidence(s.observation, s.supplementDirectory));
  if (nativeDigest(current) !== s.digest) fail("native_b25_frozen_evidence_changed");
  return current;
}
export function observeB21LegacyAdoption(options) {
  // Caller must pin BOTH previously reviewed digests, not select by a path alone.
  const expected = z.object({ originalReviewDigest: h, supplementDigest: h }).strict().parse(options.expected);
  const supplement = readRecoverySupplement(options.supplementDirectory);
  if (supplement.payload.stage !== "finalized" || supplement.digest !== expected.supplementDigest
      || supplement.payload.binding.originalReview.digest !== expected.originalReviewDigest) fail("native_b25_reference_mismatch");
  const observation = inspectPreservedB21Recovery(options);
  const evidence = frozenEvidenceSchema.parse(readPreservedB21AdoptionEvidence(observation, options.supplementDirectory));
  if (evidence.binding.originalReview.digest !== expected.originalReviewDigest || evidence.supplement.digest !== expected.supplementDigest)
    fail("native_b25_reference_mismatch");
  const state = path.dirname(options.reviewDirectory);
  if (path.dirname(options.supplementDirectory) !== state) fail("native_b25_state_changed");
  const s = { observation, supplementDirectory: options.supplementDirectory, evidence, digest: nativeDigest(evidence),
    state, stateIdentity: physicalIdentity(state), at: Date.now(), monotonic: performance.now() };
  const handle = Object.freeze({}); observations.set(handle, s);
  return { observation: handle, review: Object.freeze({ scope: b21AdoptionScope, originalReviewDigest: expected.originalReviewDigest,
    supplementDigest: expected.supplementDigest, frozenEvidenceDigest: s.digest, originalOwnershipMissing: true,
    cleanupAuthorized: false, executionAuthorized: false, b26OwnerApprovalRequired: true }) };
}
function withinApprovalWindow(s) {
  if (Date.now() < s.at || Date.now() - s.at >= b21AdoptionApprovalMaxAgeMs || performance.now() - s.monotonic < 0
      || performance.now() - s.monotonic >= b21AdoptionApprovalMaxAgeMs) fail("native_b25_approval_expired");
}
export function approveB21LegacyAdoption({ observation, approval, assertOwnerAuthority }) {
  const s = observations.get(observation); if (!s) fail("native_b25_observation_unproven");
  if (typeof assertOwnerAuthority !== "function") fail("native_b25_owner_approval_required");
  const checked = approvalSchema.parse(approval);
  if (checked.originalReviewDigest !== s.evidence.binding.originalReview.digest || checked.supplementDigest !== s.evidence.supplement.digest
      || checked.frozenEvidenceDigest !== s.digest) fail("native_b25_owner_approval_mismatch");
  assertOwnerAuthority(Object.freeze({ ...checked })); withinApprovalWindow(s); fresh(s); withinApprovalWindow(s);
  const grant = Object.freeze({}); grants.set(grant, { s, approval: checked, assertOwnerAuthority, attempted: false }); return grant;
}
export function readB21LegacyAdoption(directory, supplementDirectory) {
  const supplement = readRecoverySupplement(supplementDirectory), state = path.dirname(directory), stateIdentity = physicalIdentity(state), directoryIdentity = physicalIdentity(directory);
  const key = signingKey(supplementDirectory, supplement.keyIdentity), entries = readdirSync(directory).sort(), events = [];
  if (path.dirname(supplementDirectory) !== state || entries.length < 1 || entries.length > 2
      || entries.some((name, i) => name !== names[i])) fail("native_b25_journal_invalid");
  for (const [index, name] of entries.entries()) {
    const target = path.join(directory, name), item = nativeArtifactSnapshot(target);
    const record = z.object({ payload: payloadSchema, signature: h }).strict().parse(item.record), p = record.payload;
    if (!timingSafeEqual(Buffer.from(record.signature, "hex"), Buffer.from(sign(key, p), "hex"))
        || p.directoryIdentity !== directoryIdentity || p.stateIdentity !== stateIdentity || p.eventIdentity !== physicalIdentity(target, false)
        || p.signingKeyIdentity !== supplement.keyIdentity) fail("native_b25_integrity_unproven");
    const first = events[0]?.payload;
    if (p.index !== index || p.stage !== ["prepared", "adopted"][index] || p.previousDigest !== (events.at(-1)?.digest ?? null)
        || p.approval.frozenEvidenceDigest !== nativeDigest(p.frozenEvidence)
        || p.approval.originalReviewDigest !== p.frozenEvidence.binding.originalReview.digest
        || p.approval.supplementDigest !== p.frozenEvidence.supplement.digest || p.approval.supplementDigest !== supplement.digest
        || p.frozenEvidence.supplement.directoryIdentity !== supplement.directoryIdentity || p.frozenEvidence.supplement.keyIdentity !== supplement.keyIdentity
        || p.frozenEvidence.supplement.eventsDigest !== nativeDigest(supplement.events.map(e => [e.digest, e.identity]))
        || nativeDigest(p.frozenEvidence.binding) !== nativeDigest(supplement.payload.binding)
        || nativeDigest(p.frozenEvidence.observation) !== nativeDigest(supplement.payload.after)
        || p.frozenEvidence.observation.originalFixtureOwnershipPresent !== false
        || Date.parse(p.observedAt) > Date.parse(p.expiresAt)
        || index === 0 && Date.parse(p.expiresAt) - Date.parse(p.observedAt) !== b21AdoptionMaxAgeMs
        || first && (p.expiresAt !== first.expiresAt || Date.parse(p.observedAt) < Date.parse(first.observedAt)
          || nativeDigest(p.approval) !== nativeDigest(first.approval) || nativeDigest(p.frozenEvidence) !== nativeDigest(first.frozenEvidence))) fail("native_b25_journal_invalid");
    events.push({ payload: p, digest: item.digest, identity: item.identity });
  }
  if (directory !== b21AdoptionDirectory(state, events[0].payload.approval.originalReviewDigest)) fail("native_b25_reference_invalid");
  return { directoryIdentity, digest: events.at(-1).digest, payload: events.at(-1).payload, events };
}
export function publishB21LegacyAdoption(grant) {
  const g = grants.get(grant); if (!g || g.attempted) fail("native_b25_replay_denied");
  g.attempted = true; const s = g.s;
  const check = () => { g.assertOwnerAuthority(Object.freeze({ ...g.approval })); withinApprovalWindow(s); fresh(s); withinApprovalWindow(s); };
  check();
  const directory = b21AdoptionDirectory(s.state, s.evidence.binding.originalReview.digest);
  if (existsSync(directory)) fail("native_b25_already_reserved");
  const key = signingKey(s.supplementDirectory, s.evidence.supplement.keyIdentity);
  try { mkdirSync(directory); } catch { fail("native_b25_already_reserved"); }
  const directoryIdentity = physicalIdentity(directory), issuedAt = Date.now(), expiresAt = new Date(issuedAt + b21AdoptionMaxAgeMs).toISOString();
  let previous = null;
  for (const index of [0, 1]) {
    check();
    if (physicalIdentity(directory) !== directoryIdentity || !key.equals(signingKey(s.supplementDirectory, s.evidence.supplement.keyIdentity))) fail("native_b25_integrity_unproven");
    if (previous && readB21LegacyAdoption(directory, s.supplementDirectory).digest !== previous.digest) fail("native_b25_journal_invalid");
    const target = path.join(directory, names[index]), fd = openSync(target, "wx", 0o600);
    try {
      const payload = payloadSchema.parse({ version: b21AdoptionVersion, scope: b21AdoptionScope, stage: ["prepared", "adopted"][index], index,
        previousDigest: previous?.digest ?? null, observedAt: new Date(index ? Date.now() : issuedAt).toISOString(), expiresAt,
        directoryIdentity, eventIdentity: physicalIdentity(target, false), stateIdentity: s.stateIdentity, signingKeyIdentity: s.evidence.supplement.keyIdentity,
        signingContext: "b25_adoption_separate_from_b24_verification", approval: g.approval, frozenEvidence: s.evidence,
        classification: "owner_approved_legacy_adoption", reason: "original_opaque_fixture_ownership_receipt_historically_unavailable",
        originalOwnershipBackfilled: false, transferable: false, reusable: false, cleanupAuthorized: false,
        executionAuthorized: false, configAuthorized: false, apiAuthorized: false, b26OwnerApprovalRequired: true });
      writeFileSync(fd, bytes({ payload, signature: sign(key, payload) })); fsyncSync(fd);
    } finally { closeSync(fd); }
    previous = readB21LegacyAdoption(directory, s.supplementDirectory);
  }
  check();
  return Object.freeze({ version: b21AdoptionVersion, stage: previous.payload.stage, adoptionDigest: previous.digest,
    frozenEvidenceDigest: s.digest, expiresAt, legacyGapExplicitlyAccepted: true, eligibleForB26Preparation: true,
    cleanupAuthorized: false, executionAuthorized: false, configAuthorized: false, apiAuthorized: false, b26OwnerApprovalRequired: true });
}
export function qualifyB21LegacyAdoption(options, directory) {
  try {
    const record = readB21LegacyAdoption(directory, options.supplementDirectory), p = record.payload;
    if (p.stage !== "adopted" || record.events.length !== 2) fail("native_b25_adoption_incomplete");
    if (Date.now() < Date.parse(p.observedAt) || Date.now() >= Date.parse(p.expiresAt)) fail("native_b25_adoption_expired");
    const { observation } = observeB21LegacyAdoption(options), s = observations.get(observation);
    if (s.digest !== p.approval.frozenEvidenceDigest || directory !== b21AdoptionDirectory(s.state, options.expected.originalReviewDigest)) fail("native_b25_frozen_evidence_changed");
    if (Date.now() < Date.parse(p.observedAt) || Date.now() >= Date.parse(p.expiresAt)
        || readB21LegacyAdoption(directory, options.supplementDirectory).digest !== record.digest) fail("native_b25_adoption_expired_or_changed");
    return { eligibleForB26Preparation: true, adoptionDigest: record.digest, expiresAt: p.expiresAt,
      cleanupAuthorized: false, executionAuthorized: false, configAuthorized: false, apiAuthorized: false,
      b26OwnerApprovalRequired: true, missingEvidence: [] };
  } catch (e) { return { eligibleForB26Preparation: false, cleanupAuthorized: false, executionAuthorized: false,
    configAuthorized: false, apiAuthorized: false, b26OwnerApprovalRequired: true,
    missingEvidence: [/^native_[a-z0-9_]+$/.test(e.message) ? e.message : "native_b25_evidence_unproven"] }; }
}
