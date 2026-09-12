import assert from "node:assert/strict";
import test from "node:test";
import { hostCompatibility, requestCompatibility, protocol } from "../modules/agent-runtime/host-protocol";
import { projectProvider, sanitizeProviderMetadata, executionProviderRegistry } from "../modules/agent-runtime/execution-provider";
import { createMcpManifest } from "../mcp/manifest";

const host = (executionProvider?: unknown) => ({ capabilities: protocol.requiredHostCapabilities,
  metadata: { protocolVersion: protocol.version, executionMode: "supervised", ...(executionProvider === undefined ? {} : { executionProvider }) } });
test("API preserves legacy direct protocol and rejects Hermes/unknown declarations independently", () => {
  for (const value of [undefined, { kind: "direct_codex" }]) assert.equal(hostCompatibility(host(value)).compatible, true);
  for (const value of [{ kind: "hermes_codex", ready: true, executionSupported: true, blockers: [] }, null, {}, { kind: "future" }]) {
    assert.equal(hostCompatibility(host(value)).compatible, false);
    assert.equal(requestCompatibility(host(value), String(protocol.version), protocol.requiredHostCapabilities.join(",")).compatible, false);
  }
  assert.equal(hostCompatibility({ ...host({ kind: "hermes_codex" }), metadata: { ...host({ kind: "hermes_codex" }).metadata, executionMode: "observe" } }).reason, "observer_mode");
});
test("API provider projection contains only fixed public diagnostics", () => {
  const input = { runnerVersion: "fixture", executionProviderConfig: { token: "SENTINEL" }, executionProvider: {
    kind: "hermes_codex", officialSource: "SENTINEL", executablePath: "SENTINEL", version: "SENTINEL", installedVersion: "SENTINEL",
    ready: true, compatibility: "confirmed", blockers: ["SENTINEL", "hermes_pin_invalid"] } };
  const metadata = sanitizeProviderMetadata(input);
  assert.equal(JSON.stringify(metadata).includes("SENTINEL"), false);
  assert.deepEqual(projectProvider(metadata.executionProvider).blockers, ["hermes_pin_invalid", "hermes_compatibility_unproven"]);
  assert.deepEqual(sanitizeProviderMetadata(metadata), metadata);
  assert.equal(executionProviderRegistry.pilotReady, false);
});


test("Hermes minimum tools are exact existing read-only Roost routes", () => {
  const tools = createMcpManifest(["connection:read", "company-graph:read"]).tools;
  for (const name of executionProviderRegistry.hermesPolicy.minimumTools) {
    const tool = tools.find(tool => tool.name === name);
    assert.ok(tool, name); assert.equal(tool.method, "GET"); assert.equal(tool.riskLevel, "read");
  }
});
