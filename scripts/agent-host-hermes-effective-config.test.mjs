import test from "node:test";
import assert from "node:assert/strict";
import { effectiveConfigProbeSchema, sanitizeEffectiveConfigProbe } from "./lib/agent-host-hermes-effective-config.mjs";
import { hermesProfileDigest, hermesProfileBinding, hermesProfileBindingSchema } from "./lib/agent-host-hermes-profile.mjs";
import { validPacketFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput } from "./lib/agent-host-provider-input.mjs";
import { projectProviderLaunch, hermesContract } from "./lib/agent-host-provider-launch.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";

function diagnostic() {
  return { schemaVersion: "roost-hermes-effective-config-v1", hermesVersion: "0.21.2",
    hermesCommit: "939e45c91d751fadd94dcd1b873ac3cb44846213", configDigest: hermesProfileDigest,
    mechanism: "exact_pin_official_loader", result: "blocked",
    checks: Object.fromEntries(Object.keys(effectiveConfigProbeSchema.shape.checks.shape).map(key => [key, true])),
    audit: { network: 0, process: 0, credential: 0, outsideRead: 0, outsideWrite: 0, syntheticWrites: 0, localMetadata: 0 },
    blockers: ["startup_consumers_unqualified", "credential_rotation_unqualified", "native_tool_surface_unqualified"] };
}
test("even all-true loader data is only a negative diagnostic, never complete qualification", () => {
  const result = sanitizeEffectiveConfigProbe(diagnostic());
  assert.equal(result.result, "blocked");
  assert.equal(result.blockers.length, 3);
});
for (const [name, edit] of Object.entries({
  assertedPass: r => r.result = "qualified", pin: r => r.hermesCommit = "a".repeat(40),
  version: r => r.hermesVersion = "0.21.3", digest: r => r.configDigest = "a".repeat(64),
  mechanism: r => r.mechanism = "asserted", incomplete: r => delete r.checks.selectedProfile,
  unknown: r => r.checks.unknown = true, noBlockers: r => r.blockers = [],
  raw: r => r.raw = "person@example.invalid sk-fixture-secret",
  valueInsteadOfCategory: r => r.checks.model = "person@example.invalid"
})) test(`invalid effective-config diagnostic ${name} fails with a fixed private-data-free error`, () => {
  const r = diagnostic(); edit(r);
  assert.throws(() => sanitizeEffectiveConfigProbe(r), e => e.message === "effective_config_probe_invalid");
});
for (const name of ["fallback", "mcp", "plugins", "delegation", "background", "tools"]) {
  test(`forbidden ${name} cannot be promoted into a config admission receipt`, () => {
    const r = diagnostic(); r[name] = { enabled: true };
    assert.throws(() => sanitizeEffectiveConfigProbe(r), /effective_config_probe_invalid/);
    const binding = hermesProfileBinding("C:\\Fictional\\profile\\config.yaml");
    assert.equal(hermesProfileBindingSchema.safeParse({ ...binding, effectiveConfigReceipt: r }).success, false);
  });
}
test("missing, expired, forged and partial receipts cannot discharge the existing launch blocker", () => {
  const f = validPacketFixture(), envelope = prepareProviderInput({
    fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
    currentCommit: "a".repeat(40), assertAuthority() {} });
  const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
  const provider = { kind: "hermes_codex", enabled: true, officialSource: pin.officialSource,
    version: pin.version, commit: pin.commit, executablePath: "C:\\Fictional\\hermes.exe", policy: structuredClone(contract.registry.hermesPolicy) };
  for (const receipt of [undefined, diagnostic(), { ...diagnostic(), result: "qualified" }, { ...diagnostic(), expiresAt: "2000-01-01T00:00:00Z" }]) {
    const plan = projectProviderLaunch({ provider, envelope, repositoryPath: "C:\\Fictional\\app", sandbox: "workspace-write", platform: "win32", effectiveConfigReceipt: receipt });
    assert.equal(plan.command, null);
    assert.equal(plan.requiredConfig.configReceipt, null);
    assert.ok(plan.blockers.includes("hermes_sealed_config_enforcement_unproven"));
  }
  for (const gate of ["implementationReady", "executionSupported", "pilotReady", "liveAdmissionAllowed", "pilotExecutionAuthorized", "pilotExecutionStarted"]) assert.equal(hermesContract[gate], false);
});
