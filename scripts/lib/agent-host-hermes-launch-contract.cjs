"use strict";
// Local adapter version, not a claim about the installed Hermes CLI version.
const blockers = Object.freeze([
  "hermes_public_launch_contract_unqualified",
  "hermes_single_turn_enforcement_unproven",
  "hermes_sealed_config_enforcement_unproven",
  "hermes_owner_attestation_required",
  "hermes_native_tools_isolation_unproven",
  "hermes_output_cost_budget_unproven",
  "hermes_stop_recovery_unproven"
]);
module.exports = Object.freeze({
  version: "roost-hermes-supervised-quiet-v1", inputVersion: "roost-provider-input-v1",
  interface: "hermes_chat_oneshot_quiet", modelProvider: "openai-codex",
  implementationReady: false, executionSupported: false, pilotReady: false,
  liveAdmissionAllowed: false, pilotExecutionAuthorized: false, pilotExecutionStarted: false,
  maxQueries: 1, maxAttempts: 1, maxRetries: 0,
  stdoutBytes: 131072, stderrBytes: 32768, lineBytes: 16384, maxEvents: 256,
  blockers
});
