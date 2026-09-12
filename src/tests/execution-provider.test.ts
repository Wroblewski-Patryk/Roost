import assert from "node:assert/strict";
import test from "node:test";
import { hostCompatibility, requestCompatibility, protocol } from "../modules/agent-runtime/host-protocol";
import { projectProvider, sanitizeProviderMetadata, executionProviderRegistry } from "../modules/agent-runtime/execution-provider";

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
    ready: true, brokerBootstrap: { token: "SENTINEL", endpoint: "SENTINEL" }, compatibility: "confirmed", blockers: ["SENTINEL", "hermes_pin_invalid"] } };
  const metadata = sanitizeProviderMetadata(input);
  assert.equal(JSON.stringify(metadata).includes("SENTINEL"), false);
  assert.ok(projectProvider(metadata.executionProvider).blockers.includes("hermes_pin_invalid"));
  assert.ok(projectProvider(metadata.executionProvider).blockers.includes("hermes_compatibility_unproven"));
  assert.deepEqual(sanitizeProviderMetadata(metadata), metadata);
  assert.equal(executionProviderRegistry.pilotReady, false);
  assert.equal(projectProvider({ kind: "hermes_codex", brokerContractVerified: false }).brokerContractVerified, true);
  assert.equal(projectProvider({ kind: "direct_codex", brokerContractVerified: true }).brokerContractVerified, false);
});

test("Worker installation evidence is diagnostic and cannot grant API admission", () => {
  const report = projectProvider({ kind: "hermes_codex", executionSupported: true, installation: {
    status: "verified", version: "0.21.2", fingerprint: "abcdef123456", checkedAt: "2026-09-12T12:00:00.000Z", signature: "unsigned", privatePath: "SENTINEL" } });
  assert.equal(report.installedVersion, "0.21.2"); assert.equal(report.executionSupported, false);
  assert.equal(hostCompatibility(host(report)).compatible, false);
  assert.equal(requestCompatibility(host(report), String(protocol.version), protocol.requiredHostCapabilities.join(",")).compatible, false);
  assert.equal(JSON.stringify(report).includes("SENTINEL"), false);
  assert.deepEqual(projectProvider(report), report);
  for (const field of ["fingerprint", "checkedAt", "version", "signature"]) {
    const invalid = projectProvider({ ...report, installation: { ...report.installation, [field]: "SENTINEL" } });
    assert.equal(invalid.installedVersion, null); assert.equal(JSON.stringify(invalid).includes("SENTINEL"), false);
  }
});


test("Hermes broker policy is exact and proof never implies live compatibility", () => {
  assert.deepEqual(executionProviderRegistry.hermesPolicy.minimumTools, ["roost_get_execution_packet", "roost_get_application_context"]);
  assert.equal(executionProviderRegistry.brokerContract.verified, true);
  assert.equal(executionProviderRegistry.brokerContract.liveCompatibility, "unproven");
  assert.equal(executionProviderRegistry.brokerContract.nativeToolsIsolation, "unproven");
});
