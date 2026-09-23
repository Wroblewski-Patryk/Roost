// Pure/source-bound contract inside the existing trusted-pilot reader. There is
// no runtime issuer, routing, provider invocation or independent receipt registry.
import path from "node:path";
import { z } from "zod";
import contract from "./agent-host-provider-contract.cjs";
import { managedBackendVersion, managedBackendSelectionSchema } from "./agent-host-model-policy.mjs";
import { nativeDigest } from "./agent-host-native-footprint.mjs";
import { inspectOwnerAttestation, ownerAttestationBindingSchema } from "./agent-host-hermes-owner-auth.mjs";

const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
const h = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().uuid();
const filePin = z.object({ identity: h, digest: h }).strict();
const gatesSchema = z.object({ jobVersion: z.literal("roost-windows-job-v2"),
  launcher: z.object({ launcherDigest: h, sourceDigest: h }).strict(), originalOwnership: z.literal(true), durableResume: z.literal(true),
  cleanup: z.literal("owned_job_zero_processes"), recovery: z.literal("original_b28_cleanup_only"),
  outputBudget: z.literal("fixed_22_bytes_zero_model_tokens"), durationDeadline: z.string().datetime(),
  release: z.literal("independent_review_no_release") }).strict();
const contextSchema = z.object({ identityDigest: h, inputSeal: h, revisionsDigest: h, rolesDigest: h,
  assignmentDigest: h, riskDigest: h, riskClass: z.enum(["low", "medium", "high", "critical"]), writerDigest: h,
  scopeDigest: h, budgetDigest: h, turnPolicyDigest: h, reviewRecoveryDigest: h, gates: gatesSchema }).strict();
const runtimeSchema = z.object({ version: z.literal(pin.version), commit: z.literal(pin.commit),
  fixtureRuntimeDigest: h, fixtureConfigurationDigest: h, qualification: z.literal("closed_fixture_only") }).strict();
const baseRecord = {
  schemaVersion: z.literal(managedBackendVersion), id, state: z.enum(["accepted", "revoked"]),
  issuedAt: z.string().datetime(), expiresAt: z.string().datetime(), purpose: z.literal("managed-agent"),
  qualification: z.literal("closed_fixture_only"), installationIdentity: h, profile: filePin,
  runtime: runtimeSchema, selection: managedBackendSelectionSchema, context: contextSchema,
  availability: z.object({ backend: z.enum(["available", "unavailable", "unknown"]),
    model: z.enum(["available", "unavailable", "unknown"]), resources: z.enum(["available", "unavailable", "unknown"]) }).strict()
};
const evidenceSchema = z.object({ ...baseRecord, ownerAttestation: ownerAttestationBindingSchema.optional() }).strict();
const managedModelSchema = z.object({ schemaVersion: z.literal("roost-managed-ollama-model-v1"), id,
  purpose: z.literal("managed-agent"), state: z.enum(["accepted", "revoked"]), qualification: z.literal("closed_fixture_only"),
  issuedAt: z.string().datetime(), expiresAt: z.string().datetime(), installationIdentity: h, profile: filePin,
  endpoint: z.literal("http://127.0.0.1:11434"), selectionDigest: h }).strict();
export const managedBackendBindingSchema = z.object({ schemaVersion: z.literal(managedBackendVersion), evidence: filePin,
  selectionDigest: h, context: contextSchema, runtime: runtimeSchema,
  auth: z.object({ source: z.literal("same_owner_subscription"), policyVersion: z.literal("roost-hermes-same-owner-auth-v2"),
    attestationId: id, attestationDigest: h, status: z.literal("unavailable_not_qualified") }).strict().nullable(),
  managedModel: filePin.nullable(), realIssuerQualified: z.literal(false), privateAnchorQualified: z.literal(false) }).strict();

function fail() { throw Object.assign(Error("managed_backend_contract_blocked"), { protocolAdmission: true, retryable: false,
  outcome: "policy_blocked", publicMessage: "Managed backend changed or lacks required evidence; stop this attempt without fallback.",
  details: { reason: "managed_backend_contract_blocked" } }); }
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const same = (a,b) => nativeDigest(canonical(a)) === nativeDigest(canonical(b));
export const managedSelectionDigest = selection => nativeDigest(managedBackendSelectionSchema.parse(selection));
function current(record) {
  const start = Date.parse(record.issuedAt), end = Date.parse(record.expiresAt), now = Date.now();
  if (record.state !== "accepted" || start > now || end <= now || end <= start || end - start > 86400000) fail();
}
export function managedBackendContext(source, writerDigest) {
  const e = source.envelope, s = managedBackendSelectionSchema.parse(e.contract.modelSelection);
  return contextSchema.parse({ identityDigest: nativeDigest(e.identity), inputSeal: e.seal, revisionsDigest: nativeDigest(e.revisions),
    rolesDigest: nativeDigest({ roles: e.contract.taskRoles, authorities: e.evidence.roles }),
    assignmentDigest: nativeDigest(e.contract.assignment), riskDigest: nativeDigest(e.evidence.risk), riskClass: s.riskClass,
    writerDigest, scopeDigest: nativeDigest({ filesystem: source.filesystemScope, scope: e.contract.scope, access: e.contract.access }),
    budgetDigest: nativeDigest(e.contract.budgets), turnPolicyDigest: nativeDigest(s.attemptPolicy),
    reviewRecoveryDigest: nativeDigest({ acceptance: e.contract.acceptance, recovery: e.contract.recovery, roles: e.contract.taskRoles }),
    gates: source.gates });
}
export function managedBackendRuntime(source) {
  return runtimeSchema.parse({ version: pin.version, commit: pin.commit, fixtureRuntimeDigest: nativeDigest(source.runtime),
    fixtureConfigurationDigest: nativeDigest(source.configuration), qualification: "closed_fixture_only" });
}
export function managedOwnerBinding(profilePath, profileDigest, ownerAttestation) {
  // Reuses the existing nonsecret same-owner attestation format. The legacy
  // source-class name denotes auth provenance, never a codex.exe dependency.
  return { schemaVersion: managedBackendVersion, hermesVersion: pin.version, hermesCommit: pin.commit,
    profilePath, configDigest: profileDigest, authSourceClass: "same-owner-codex-cli", ownerAttestation };
}
export function inspectManagedBackend({ source, writerDigest, profile, profilePath, installationIdentity, read }) {
  try {
    const selection = managedBackendSelectionSchema.parse(source.envelope.contract.modelSelection);
    const directory = path.dirname(profilePath), evidence = read(path.join(directory, "managed-backend-evidence.json"));
    const record = evidenceSchema.parse(JSON.parse(evidence.body)), context = managedBackendContext(source, writerDigest), runtime = managedBackendRuntime(source);
    current(record);
    if (record.installationIdentity !== installationIdentity || !same(record.profile, { identity: profile.identity, digest: profile.digest })
      || !same(record.selection, selection) || !same(record.context, context) || !same(record.runtime, runtime)
      || Object.values(record.availability).some(v => v !== "available")) fail();
    let auth = null, managedModel = null;
    if (selection.backend === "codex_responses") {
      const a = inspectOwnerAttestation(managedOwnerBinding(profilePath, profile.digest, record.ownerAttestation));
      auth = { source: "same_owner_subscription", policyVersion: a.policyVersion, attestationId: a.attestationId,
        attestationDigest: a.attestationDigest, status: a.status };
    } else {
      if (record.ownerAttestation !== undefined) fail();
      const receipt = read(path.join(directory, "managed-ollama-admission.json"));
      const model = managedModelSchema.parse(JSON.parse(receipt.body)); current(model);
      if (model.installationIdentity !== installationIdentity || !same(model.profile, record.profile)
        || model.endpoint !== selection.endpoint || model.selectionDigest !== managedSelectionDigest(selection)) fail();
      managedModel = { identity: receipt.identity, digest: receipt.digest };
    }
    return managedBackendBindingSchema.parse({ schemaVersion: managedBackendVersion,
      evidence: { identity: evidence.identity, digest: evidence.digest }, selectionDigest: managedSelectionDigest(selection), context, runtime,
      auth, managedModel, realIssuerQualified: false, privateAnchorQualified: false });
  } catch { fail(); }
}
