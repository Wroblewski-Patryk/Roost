import { closeSync, existsSync, fsyncSync, openSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const observerCodes = new Set(`ollama_observer_authority_changed ollama_observer_bind_failed
ollama_observer_digest_mismatch ollama_observer_durable_call_marker_required
ollama_observer_inactive ollama_observer_incomplete ollama_observer_memory_floor_unmet
ollama_observer_metadata_limit ollama_observer_metadata_model_mismatch
ollama_observer_model_size_invalid ollama_observer_model_unavailable
ollama_observer_probe_failed ollama_observer_probe_invalid ollama_observer_probe_oversize
ollama_observer_probe_timeout ollama_observer_process_identity_required
ollama_observer_request_denied ollama_observer_request_failed
ollama_observer_request_incomplete ollama_observer_request_invalid
ollama_observer_request_model_mismatch ollama_observer_request_oversize
ollama_observer_response_incomplete ollama_observer_response_invalid
ollama_observer_response_model_mismatch ollama_observer_response_model_missing
ollama_observer_response_oversize ollama_observer_response_type_invalid
ollama_observer_selection_invalid ollama_observer_target_invalid
ollama_observer_upstream_failed ollama_observer_upstream_timeout
ollama_observer_usage_invalid`.split(/\s+/));
const jobCodes = new Set(['hermes_stop_recovery_unproven', 'windows_job_output_rejected']);
const hermesCodes = new Set(`hermes_quiet_cancelled hermes_quiet_closed
hermes_quiet_controller_shutdown hermes_quiet_empty_result hermes_quiet_input_invalid
hermes_quiet_interrupted hermes_quiet_invalid hermes_quiet_limit
hermes_quiet_process_failed hermes_quiet_report_limit hermes_quiet_reuse
hermes_quiet_sensitive hermes_quiet_stdin_failed hermes_quiet_stream_failed
hermes_quiet_timeout hermes_quiet_utf8_invalid`.split(/\s+/));
const workerCodes = new Set(['information_context_changed', 'information_controller_shutdown',
  'agent_execution_duration_exceeded', 'information_lease_lost']);
const runtimeReasons = new Set(`authority_or_context_changed automatic_retry_forbidden
deadline_expired input_limit installation_digest_changed installation_or_lease_missing
local_ollama_identity_changed local_profile_changed model_attempt_policy_invalid
native_configuration_invalid owned_tree_unproven packet_changed
profile_retry_policy_mismatch provider_layout_invalid provider_unqualified
qualification_invalid_or_used qualification_unproven ready_changed
resume_binding_invalid runtime_changed selected_source_missing_or_changed
selection_invalid signature_invalid signed_binding_changed signed_expired_or_future
signed_shape_invalid startup_overlay_present startup_overlay_unreadable
task_scope_invalid trusted_key_invalid working_directory_not_empty
working_directory_overlay working_directory_unreadable`.split(/\s+/));

// Never persist an arbitrary exception message, cause, HTTP body or provider
// output. Only fixed codes from our own runtime may cross into this file.
export function informationFailureDiagnostic(error, { nativeCleanupProven = false,
  modelRequestMarkerPresent = false, nativeLaunchIntentPresent = false } = {}) {
  const observerReason = error?.details?.observerReason;
  const reason = error?.details?.reason;
  const message = error?.message;
  const observerCode = [observerReason, reason, message].find(value => observerCodes.has(value)) ?? null;
  let origin = 'worker', code = 'information_failure_unclassified';
  if (!nativeCleanupProven && (error?.leaseLost === true || jobCodes.has(message))) {
    origin = jobCodes.has(message) ? 'windows_job' : 'worker';
    code = jobCodes.has(message) ? message : 'native_cleanup_unproven';
  } else if (observerCode) {
    origin = 'observer'; code = observerCode;
  } else if (runtimeReasons.has(reason)) {
    origin = 'runtime'; code = reason;
  } else if (jobCodes.has(message)) {
    origin = 'windows_job'; code = message;
  } else if (hermesCodes.has(message)) {
    origin = 'hermes'; code = message;
  } else if (workerCodes.has(message)) {
    code = message;
  }
  const preLaunchReason = !nativeLaunchIntentPresent && error?.protocolAdmission === true && runtimeReasons.has(reason)
    ? reason : null;
  return Object.freeze({ schemaVersion: 'roost-information-failure-diagnostic-v1', origin, code,
    observerCode, preLaunchReason,
    nativeCleanupProven: nativeCleanupProven === true,
    modelRequestMarkerPresent: modelRequestMarkerPresent === true,
    nativeLaunchIntentPresent: nativeLaunchIntentPresent === true,
    providerFailure: error?.providerFailure === true, protocolAdmission: error?.protocolAdmission === true,
    leaseLost: error?.leaseLost === true, durationLimit: error?.durationLimit === true });
}

export function safeObserverFailureCode(value) {
  return observerCodes.has(value) ? value : null;
}

export function writeInformationFailureDiagnostic(writerDirectory, executionId, error, nativeCleanupProven) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(executionId))
    throw Error('information_diagnostic_execution_invalid');
  const marker = path.join(writerDirectory, `information-${executionId}.model-requested`);
  const launchMarker = path.join(writerDirectory, `information-${executionId}.native-launch-intent`);
  const destination = path.join(writerDirectory, `information-${executionId}.failure.json`);
  const record = { executionId, ...informationFailureDiagnostic(error, {
    nativeCleanupProven, modelRequestMarkerPresent: existsSync(marker),
    nativeLaunchIntentPresent: existsSync(launchMarker) }) };
  const descriptor = openSync(destination, 'wx', 0o600);
  try {
    writeFileSync(descriptor, JSON.stringify(record) + '\n');
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  return record;
}
