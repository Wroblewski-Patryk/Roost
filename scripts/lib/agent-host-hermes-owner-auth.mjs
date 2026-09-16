import { createHash, randomUUID } from "node:crypto";
import { lstatSync, realpathSync, openSync, fstatSync, readFileSync, closeSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

export const ownerAuthPolicyVersion = "roost-hermes-same-owner-auth-v2";
export const ownerAttestationVersion = "roost-hermes-owner-attestation-v1";
export const ownerAttestationMaxAgeMs = 90 * 24 * 60 * 60 * 1000;
const sourceClass = "same-owner-codex-cli", hash = z.string().regex(/^[a-f0-9]{64}$/);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const observations = new WeakMap();
const fail = reason => { throw Object.assign(new Error(reason), { protocolAdmission: true, retryable: false,
  publicMessage: "Owner authentication attestation is not admitted. No model was started.", details: { reason } }); };
export const ownerAttestationBindingSchema = z.object({ id: z.string().uuid(), digest: hash }).strict();
const recordSchema = z.object({ schemaVersion: z.literal(ownerAttestationVersion), policyVersion: z.literal(ownerAuthPolicyVersion),
  id: z.string().uuid(), state: z.enum(["confirmed", "revoked"]), confirmedAt: z.string().datetime(), expiresAt: z.string().datetime(),
  authSourceClass: z.literal(sourceClass), profileBindingDigest: hash,
  statusPolicy: z.literal("owner_attestation_only_no_qualified_cli_status") }).strict();

// This is an integrity binding, not an account fingerprint or a signature.
export function ownerProfileDigest(binding) {
  return sha(JSON.stringify([binding.schemaVersion, binding.hermesVersion, binding.hermesCommit,
    binding.profilePath, binding.configDigest, binding.authSourceClass]));
}
// Explicit provisioning only, never called by Worker, startup or recovery.
export function createOwnerAttestation(binding, confirmedAt = new Date().toISOString()) {
  const time = Date.parse(confirmedAt);
  if (!Number.isFinite(time)) fail("hermes_owner_attestation_invalid");
  const record = recordSchema.parse({ schemaVersion: ownerAttestationVersion, policyVersion: ownerAuthPolicyVersion,
    id: randomUUID(), state: "confirmed", confirmedAt, expiresAt: new Date(time + ownerAttestationMaxAgeMs).toISOString(),
    authSourceClass: sourceClass, profileBindingDigest: ownerProfileDigest(binding),
    statusPolicy: "owner_attestation_only_no_qualified_cli_status" });
  const bytes = JSON.stringify(record, null, 2) + "\n";
  return { bytes, binding: { id: record.id, digest: sha(bytes) } };
}

function readAttestation(binding) {
  if (!ownerAttestationBindingSchema.safeParse(binding.ownerAttestation).success) fail("hermes_owner_attestation_required");
  const file = path.join(path.dirname(binding.profilePath), "owner-attestation.json");
  let fd;
  try {
    for (let current = file;; current = path.dirname(current)) {
      if (lstatSync(current).isSymbolicLink()) fail("hermes_owner_attestation_invalid");
      if (current === path.dirname(current)) break;
    }
    const resolved = realpathSync.native(file);
    if ((process.platform === "win32" ? resolved.toLowerCase() !== file.toLowerCase() : resolved !== file)) fail("hermes_owner_attestation_invalid");
    const before = lstatSync(file, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size > 4096n) fail("hermes_owner_attestation_invalid");
    fd = openSync(file, "r");
    const opened = fstatSync(fd, { bigint: true });
    if (opened.ino !== before.ino || opened.size !== before.size || (process.platform !== "win32" && opened.dev !== before.dev)) fail("hermes_owner_attestation_changed");
    const bytes = readFileSync(fd), after = lstatSync(file, { bigint: true });
    if (after.ino !== before.ino || after.dev !== before.dev || after.nlink !== 1n || after.size !== opened.size || after.mtimeNs !== opened.mtimeNs
        || sha(bytes) !== binding.ownerAttestation.digest) fail("hermes_owner_attestation_changed");
    const parsed = recordSchema.safeParse(JSON.parse(bytes.toString("utf8")));
    if (!parsed.success || !bytes.equals(Buffer.from(JSON.stringify(parsed.data, null, 2) + "\n"))) fail("hermes_owner_attestation_invalid");
    const record = parsed.data, now = Date.now(), start = Date.parse(record.confirmedAt), end = Date.parse(record.expiresAt);
    if (record.id !== binding.ownerAttestation.id || record.profileBindingDigest !== ownerProfileDigest(binding)) fail("hermes_owner_attestation_changed");
    if (record.state !== "confirmed") fail("hermes_owner_attestation_revoked");
    if (start > now || end <= now || end <= start || end - start > ownerAttestationMaxAgeMs) fail("hermes_owner_attestation_expired");
    return record;
  } catch (error) {
    if (error.protocolAdmission) throw error;
    fail("hermes_owner_attestation_unreadable");
  } finally { if (fd !== undefined) closeSync(fd); }
}

// Explicit owner-authorized profile migration only. Preserve identity, confirmation
// and expiry; changing profile bytes must never silently renew the 90-day grant.
export function rebindOwnerAttestation(previousBinding, nextBinding) {
  const record = readAttestation(previousBinding);
  if (previousBinding.profilePath !== nextBinding.profilePath
      || previousBinding.hermesVersion !== nextBinding.hermesVersion
      || previousBinding.hermesCommit !== nextBinding.hermesCommit
      || previousBinding.authSourceClass !== nextBinding.authSourceClass) fail("hermes_owner_attestation_changed");
  const bytes = JSON.stringify({ ...record, profileBindingDigest: ownerProfileDigest(nextBinding) }, null, 2) + "\n";
  return { bytes, binding: { id: record.id, digest: sha(bytes) } };
}

// Trusted in-process seam for a FUTURE qualified status source. No CLI runner is
// enabled: installed help establishes no secret-free output contract. In
// particular, undefined is the explicit B4 owner-attestation-only route, not an
// error/unknown-status fallback. Raw output and account fields are never accepted.
const statusSchema = z.object({ authSourceClass: z.literal(sourceClass),
  status: z.enum(["logged-in", "logged-out", "relogin-required", "unknown"]) }).strict();
export function observeHermesSameOwner(readNonsecretStatus) {
  let result;
  try { result = statusSchema.safeParse(readNonsecretStatus()); }
  catch { fail("hermes_auth_observation_invalid"); }
  if (!result.success) fail("hermes_auth_observation_invalid");
  if (result.data.status !== "logged-in") fail("hermes_auth_status_denied");
  const receipt = Object.freeze({});
  observations.set(receipt, { at: performance.now(), status: result.data.status });
  return receipt;
}
export function inspectOwnerAttestation(binding, observation) {
  const record = readAttestation(binding);
  let status = "unavailable_not_qualified";
  if (observation !== undefined) {
    const proof = observations.get(observation), age = proof && performance.now() - proof.at;
    if (!proof || age < 0 || age >= 60000) fail("hermes_auth_observation_invalid");
    status = proof.status;
  }
  return Object.freeze({ authSourceClass: sourceClass, status, attestationId: record.id,
    attestationDigest: binding.ownerAttestation.digest, policyVersion: ownerAuthPolicyVersion, ownerInteractionRequired: false });
}
