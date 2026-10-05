// Observational metadata only. These closed sets do not grant authority or
// accept persisted JSON as native evidence. Never publish arbitrary exception
// text, even when it resembles a protocol code.
const phases = new Set(["context", "launch_context", "installation_attestation", "managed_source", "managed_admission", "post_admission", "provider_launch", "native_execution", "terminal_completion"]);
const codes = new Set([
  "agent_terminal_completion_uncertain",
  "managed_admission_blocked", "readonly_boundary_unproven", "trusted_provider_pilot_blocked",
  "agent_provider_input_blocked", "execution_packet_invalid", "agent_runtime_content_blocked",
  "agent_execution_lease_expired", "agent_recovery_lease_expired", "agent_execution_lease_invalid",
  "agent_execution_lease_rejected", "agent_execution_lease_disposed", "agent_execution_lease_refresh_unconfirmed",
  "agent_execution_cancel_requested", "agent_process_tree_stop_failed", "agent_process_tree_stop_timeout",
  "agent_host_platform_not_approved", "agent_native_review_blocked",
  "hermes_stop_recovery_unproven", "hermes_boundary_ambiguous", "hermes_native_boundary_required",
  "hermes_job_source_changed", "hermes_native_boundary_violation", "windows_job_output_rejected",
  "hermes_attempt_budget_invalid", "hermes_attempt_budget_changed", "hermes_attempt_budget_expired",
  "hermes_attempt_budget_unproven", "hermes_attempt_budget_reuse_or_input_changed", "hermes_attempt_process_changed",
  "hermes_budget_startup_unproven", "hermes_output_intent_invalid", "hermes_write_root_invalid",
  "hermes_readonly_authority_invalid", "hermes_startup_environment_invalid", "hermes_startup_tools_not_authorized",
  "hermes_startup_model_policy_invalid", "hermes_startup_layout_unqualified", "hermes_startup_overlay_unreadable",
  "hermes_startup_overlay_present", "hermes_startup_profile_required", "hermes_windows_host_environment_changed",
  "hermes_startup_candidate_invalid", "hermes_startup_retry_policy_mismatch", "hermes_startup_ready_changed",
  "hermes_startup_receipt_expired",
  ...["closed", "invalid", "limit", "utf8_invalid", "sensitive", "interrupted", "process_failed", "empty_result",
    "report_limit", "cancelled", "controller_shutdown", "timeout", "preparation_failed", "lease_lost", "context_stop",
    "controller_closed", "request_invalid", "startup_timeout", "protocol_error", "stdin_error", "pipe_error",
    "output_limit"].map(reason => `hermes_quiet_${reason}`)
]);
const boundaryReasons = new Set([
  "unproven", "tool_source_commit_changed", "tool_source_changed", "tool_source_unavailable", "tool_source_file_invalid",
  "tool_qualification_timeout", "tool_qualification_unavailable", "tool_qualification_output_invalid",
  "repository_observation_timeout", "repository_observation_unavailable", "tcp_observation_timeout", "tcp_observation_unavailable",
  "docker_observation_timeout", "docker_observation_unavailable", "read_paths_invalid", "repository_dirty", "read_file_invalid",
  "read_file_untracked", "read_file_changed", "read_file_budget_exceeded", "read_file_redaction_blocked",
  "repository_changed", "process_changed", "docker_changed", "review_material_mismatch", "review_diff_invalid",
  "review_diff_redaction_blocked", "review_material_redaction_blocked", "startup_binding_invalid", "repository_evidence_mismatch",
  "proof_invalid", "startup_changed", "assertion_unavailable", "binding_changed", "receipt_changed", "consumption_unavailable",
  "collection_unavailable", "seal_unavailable", "qualification_unavailable"
]);
const managedPhases = new Set([
  "first_write", "dispatch_reservation", "retire", "installation", "backend_evidence_request", "backend_evidence_verify",
  "backend_evidence_persist", "decision_request", "decision_verify", "decision_persist", "consume_grant", "consume_bindings",
  "consume_authority", "consume_writer", "consume_runtime", "consume_decision", "consume_startup", "consume_native_boundary",
  "consume_startup_bindings", "consume_transport", "consume_input", "consume_first_write", "consume_dispatch_reserve",
  ...["preconditions", "startup", "native_boundary", "writer", "transport", "source_fields"].map(phase => `source_${phase}`)
]);
const detailCodes = new Set([...codes, ...boundaryReasons]);
const nativeTerminations = new Set(["root_exit", "timeout", "cancel", "lease_lost", "context_stop", "controller_shutdown",
  "controller_closed", "preparation_failed", "request_invalid", "startup_timeout", "protocol_error", "stdin_error", "pipe_error", "output_limit"]);
const own = (object, key) => {
  try { return object != null ? Object.getOwnPropertyDescriptor(object, key)?.value : undefined; }
  catch { return undefined; }
};
const allowed = (value, values, fallback = "other") => typeof value === "string" && values.has(value) ? value : fallback;

export function safeExecutionDiagnostic({ error, executionPhase, leaseFailure, nativeTermination } = {}) {
  const details = own(error, "details"), leaseCode = allowed(own(leaseFailure, "message"), codes, leaseFailure ? "other" : "none");
  const output = {
    phase: allowed(executionPhase, phases), code: allowed(own(error, "message"), codes),
    detail: allowed(own(details, "reason"), detailCodes), leaseCode
  };
  const managedPhase = allowed(own(details, "phase"), managedPhases, null);
  const boundaryReason = allowed(own(details, "boundaryReason"), boundaryReasons, null);
  const termination = allowed(nativeTermination, nativeTerminations, null);
  if (managedPhase) output.managedPhase = managedPhase;
  if (boundaryReason) output.boundaryReason = boundaryReason;
  // The caller supplies this only after authenticating its in-process Job
  // receipt. An error's arbitrary ownedTreeReceipt is never inspected here.
  if (termination) output.nativeTermination = termination;
  if (leaseCode === "agent_execution_lease_expired") {
    const expiry = own(leaseFailure, "details"), numeric = {};
    for (const [key, minimum, maximum] of [
      ["confirmationCount", 0, 1_000_000], ["lastRequestElapsedMs", 0, 180_000],
      ["lastConfirmedRemainingMs", -180_000, 180_000], ["currentMonotonicRemainingMs", -180_000, 180_000]
    ]) {
      const value = own(expiry, key);
      if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= minimum && value <= maximum)
        numeric[key] = value;
    }
    if (Object.keys(numeric).length) output.leaseDiagnostics = Object.freeze(numeric);
  }
  return Object.freeze(output);
}

// leaseLost also marks an unproven native cleanup/boundary, independently of
// the heartbeat lease. Keep recovery blocked without inventing an expiry.
export function leaseRecoveryReason(error) {
  const code = own(error, "message");
  if (code === "agent_execution_lease_expired" || code === "agent_recovery_lease_expired") return "lease_expired";
  if (own(error, "leaseLost") === true) return "process_may_be_running";
  return undefined;
}
