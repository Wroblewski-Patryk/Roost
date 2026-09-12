"use strict";
// Shared public contract. Never serialize private configuration or arbitrary input.
const registry = require("../../src/modules/agent-runtime/execution-providers.json");
const blockerCodes = Object.freeze([
  "execution_provider_unknown", "hermes_disabled", "hermes_identity_invalid", "hermes_pin_invalid",
  "hermes_windows_required", "hermes_executable_invalid", "hermes_executable_missing",
  "hermes_mcp_policy_invalid", "hermes_authority_policy_invalid", "hermes_compatibility_unproven"
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
  return { contractVersion: registry.contractVersion, kind, pinnedVersion: entry?.version ?? null,
    installedVersion: null, compatibility: kind === "direct_codex" ? "reference" : "unproven",
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
