"use strict";
// Shared public contract. Never serialize private configuration or arbitrary input.
const registry = require("../../src/modules/agent-runtime/execution-providers.json");
const blockerCodes = Object.freeze([
  "execution_provider_unknown", "hermes_disabled", "hermes_identity_invalid", "hermes_pin_invalid",
  "hermes_windows_required", "hermes_executable_invalid", "hermes_executable_missing",
  "hermes_mcp_policy_invalid", "hermes_authority_policy_invalid", "hermes_compatibility_unproven",
  "hermes_attestation_missing", "hermes_attestation_invalid", "hermes_integrity_mismatch", "hermes_probe_unsafe",
  "hermes_version_failed", "hermes_version_mismatch", "hermes_version_timeout", "hermes_probe_stop_failed",
  "hermes_native_tools_isolation_unproven", "hermes_output_cost_budget_unproven", "hermes_stop_recovery_unproven"
]);
const record = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
function providerKind(value) {
  if (value === undefined) return "direct_codex"; // Existing installations retain their reference provider.
  return ["direct_codex", "hermes_codex"].includes(record(value).kind) ? value.kind : "unknown";
}
function providerAdmissionReason(value) {
  const kind = providerKind(value);
  return kind === "direct_codex" ? null : kind === "hermes_codex" ? "hermes_compatibility_unproven" : "execution_provider_unknown";
}
function projectProvider(value) {
  const input = record(value), kind = providerKind(value);
  const entry = registry.providers.find(provider => provider.kind === kind);
  const blockers = Array.isArray(input.blockers) ? input.blockers.filter(code => blockerCodes.includes(code)) : [];
  const admission = providerAdmissionReason(value);
  if (admission) blockers.push(admission);
  if (kind === "hermes_codex") blockers.push("hermes_native_tools_isolation_unproven", "hermes_output_cost_budget_unproven", "hermes_stop_recovery_unproven");
  const evidence = record(input.installation);
  const verified = kind === "hermes_codex" && evidence.status === "verified" && evidence.version === entry.version
    && typeof evidence.fingerprint === "string" && /^[a-f0-9]{12}$/.test(evidence.fingerprint) && evidence.signature === "unsigned"
    && typeof evidence.checkedAt === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(evidence.checkedAt)
    && Number.isFinite(Date.parse(evidence.checkedAt));
  const installation = verified ? { status: "verified", version: entry.version, fingerprint: evidence.fingerprint,
    checkedAt: evidence.checkedAt, signature: "unsigned" } : { status: "unverified", version: null, fingerprint: null, checkedAt: null, signature: null };
  return { contractVersion: registry.contractVersion, kind, pinnedVersion: entry?.version ?? null,
    installedVersion: verified ? entry.version : null, installation, compatibility: kind === "direct_codex" ? "reference" : "unproven",
    brokerContractVerified: kind === "hermes_codex" && registry.brokerContract.verified === true,
    executionSupported: kind === "direct_codex", blockers: [...new Set(blockers)] };
}
function sanitizeProviderMetadata(value) {
  const metadata = { ...record(value) };
  // Private configuration has no wire representation; only this fixed projection is accepted.
  delete metadata.executionProviderConfig;
  if (Object.hasOwn(metadata, "executionProvider")) metadata.executionProvider = projectProvider(metadata.executionProvider);
  return metadata;
}
module.exports = { registry, blockerCodes, providerKind, providerAdmissionReason, projectProvider, sanitizeProviderMetadata };
