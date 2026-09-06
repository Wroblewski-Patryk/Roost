import protocol from "./host-protocol.json";

export { protocol };
type HostDeclaration = { metadata: unknown; capabilities: unknown };
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function hostCompatibility(host: HostDeclaration) {
  const metadata = record(host.metadata);
  const capabilities = Array.isArray(host.capabilities) ? host.capabilities : [];
  const missingCapabilities = protocol.requiredHostCapabilities.filter((capability) => !capabilities.includes(capability));
  const reason = metadata.protocolVersion === undefined ? "host_protocol_missing"
    : metadata.protocolVersion !== protocol.version ? "host_protocol_mismatch"
    : metadata.executionMode === "observe" ? "observer_mode"
    : metadata.executionMode !== "supervised" ? "host_mode_missing"
    : missingCapabilities.length ? "host_capabilities_missing" : null;
  return { compatible: reason === null, reason, missingCapabilities };
}

// Persisted metadata alone must not admit a legacy process reusing a host slug.
export function requestCompatibility(host: HostDeclaration, version: unknown, capabilities: unknown) {
  const declared = hostCompatibility(host);
  if (!declared.compatible) return declared;
  const offered = typeof capabilities === "string" ? capabilities.split(",") : [];
  const missingCapabilities = protocol.requiredHostCapabilities.filter((capability) => !offered.includes(capability));
  const reason = version === undefined ? "request_protocol_missing"
    : version !== String(protocol.version) ? "request_protocol_mismatch"
    : missingCapabilities.length ? "request_capabilities_missing" : null;
  return { compatible: reason === null, reason, missingCapabilities };
}
