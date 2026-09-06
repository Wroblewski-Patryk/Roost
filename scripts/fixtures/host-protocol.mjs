import { protocol } from "../lib/agent-host-protocol.mjs";

export function compatibleHostFixture() {
  return { id: "host", name: "synthetic host", runtime: { executionEnabled: true,
    protocol: structuredClone(protocol), compatibility: { compatible: true, reason: null, missingCapabilities: [] } } };
}
