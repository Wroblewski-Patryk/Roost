import { readFile } from "node:fs/promises";

// One wire-contract declaration shared with the API, not a second runner version.
export const protocol = JSON.parse(await readFile(new URL("../../src/modules/agent-runtime/host-protocol.json", import.meta.url), "utf8"));
export const protocolHeaders = { "X-Roost-Host-Protocol": String(protocol.version), "X-Roost-Host-Capabilities": protocol.requiredHostCapabilities.join(",") };

export function apiProtocolReason(runtime) {
  const remote = runtime?.protocol;
  if (!remote || remote.version === undefined) return "api_protocol_missing";
  if (remote.version !== protocol.version) return "api_protocol_mismatch";
  if (!Array.isArray(remote.apiCapabilities) || protocol.apiCapabilities.some((value) => !remote.apiCapabilities.includes(value))) return "api_capabilities_missing";
  if (!Array.isArray(remote.requiredHostCapabilities) || protocol.requiredHostCapabilities.some((value) => !remote.requiredHostCapabilities.includes(value))) return "api_contract_invalid";
  return null;
}

export function apiCompatibility(runtime, capabilities = protocol.requiredHostCapabilities) {
  const reason = apiProtocolReason(runtime);
  if (reason) return reason;
  const remote = runtime.protocol;
  if (remote.requiredHostCapabilities.some((value) => !capabilities.includes(value))) return "host_capabilities_missing";
  if (runtime.compatibility?.compatible !== true || runtime.compatibility?.reason !== null) return "host_admission_rejected";
  if (runtime.executionEnabled !== true) return runtime.executionEnabled === false ? "runtime_disabled" : "runtime_state_missing";
  return null;
}

export function protocolAdmissionError(reason) {
  return Object.assign(new Error("agent_host_protocol_blocked"), { protocolAdmission: true, retryable: false,
    publicMessage: "Host/API compatibility could not be confirmed. No model was started; reconcile this execution before restarting the host.", details: { reason } });
}
