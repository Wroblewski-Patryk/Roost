import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, linkSync, symlinkSync, rmSync } from "node:fs";
import { renderHermesProfile, hermesProfileBinding, inspectHermesProfile, sealHermesProfile,
  assertHermesProfile, observeHermesSameOwner, hermesAuthSourceClass } from "./lib/agent-host-hermes-profile.mjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput, assertProviderProfile } from "./lib/agent-host-provider-input.mjs";
import { prepareProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";
const readyRevision = "a".repeat(64);
const metadata = () => ({ sourceClass: hermesAuthSourceClass, provider: "openai-codex",
  provenance: "nonsecret_identity_metadata", identityFingerprint: "b".repeat(64), approvedIdentityFingerprint: "b".repeat(64),
  accountCount: 1, interactionRequired: false, accountChanged: false, rotationRequested: false, fallbackRequested: false });
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "roost-hermes-profile-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repositoryPath = path.join(root, "app"), home = path.join(root, "profile");
  mkdirSync(repositoryPath); mkdirSync(home);
  const file = path.join(home, "config.yaml"); writeFileSync(file, renderHermesProfile());
  const binding = hermesProfileBinding(file), authReceipt = observeHermesSameOwner(metadata);
  const options = { repositoryPath, readyRevision, authReceipt };
  const snapshot = sealHermesProfile(binding, options);
  return { root, home, file, binding, snapshot, options, repositoryPath, authReceipt };
}
test("approved synthetic profile and nonsecret same-owner observation reach only the pre-spawn profile boundary", t => {
  const f = fixture(t), result = assertHermesProfile(f.snapshot, f.binding, f.options);
  assert.equal(result.authSourceClass, hermesAuthSourceClass);
  assert.equal(result.ownerInteractionRequired, false);
  assert.equal(result.identityFingerprint, metadata().identityFingerprint);
  assert.equal(JSON.stringify(result).includes(f.root), false);
  assert.equal(Object.hasOwn(result, "command"), false);
  assert.equal(inspectHermesProfile(f.binding, f.repositoryPath).ownerInteractionRequired, true);
});
test("public provider audit cannot trust asserted account identity or owner-interaction bypass", () => {
  const report = contract.projectProvider({ kind: "hermes_codex", authSource: {
    authSourceClass: "other-owner", identityFingerprint: "synthetic-private-secret", ownerInteractionRequired: false } });
  assert.deepEqual(report.authSource, { contractVersion: "roost-hermes-same-owner-auth-v1",
    authSourceClass: hermesAuthSourceClass, identityFingerprint: null, ownerInteractionRequired: true });
  assert.equal(JSON.stringify(report).includes("synthetic-private-secret"), false);
  assert.equal(report.executionSupported, false);
});
for (const [name, edit] of Object.entries({
  digest: b => b.configDigest = "d".repeat(64), version: b => b.hermesVersion = "0.21.3",
  pin: b => b.hermesCommit = "d".repeat(40), source: b => b.authSourceClass = "other-owner",
  profileVersion: b => b.schemaVersion = "unknown", unknown: b => b.apiKey = "synthetic-private-secret",
  relative: b => b.profilePath = "config.yaml"
})) test(`binding drift ${name} is denied without echoing values`, t => {
  const f = fixture(t); edit(f.binding);
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, f.options), e => {
    assert.equal(JSON.stringify(e).includes(f.root), false);
    assert.equal(JSON.stringify(e).includes("synthetic-private-secret"), false); return e.protocolAdmission;
  });
});
for (const [name, change] of Object.entries({
  fallback: c => c.fallback_providers.push({ provider: "other", model: "other" }),
  accountRotation: c => c.credential_pool_strategies = { "openai-codex": "round_robin" },
  cron: c => c.cron = { enabled: true }, gateway: c => c.gateway = {},
  delegation: c => c.delegation = {}, plugins: c => c.plugins.enabled.push("extra"),
  mcp: c => c.mcp_servers.extra = {}, memory: c => c.memory.memory_enabled = true,
  background: c => c.auxiliary.background_review.enabled = true,
  tools: c => c.platform_toolsets.cli.push("terminal"), update: c => c.updates.check = true,
  telemetry: c => c.telemetry.shared_metrics.send = true,
  secret: c => c.token = "synthetic-private-secret"
})) test(`config drift ${name} after Ready is denied`, t => {
  const f = fixture(t), c = JSON.parse(renderHermesProfile()); change(c);
  writeFileSync(f.file, JSON.stringify(c, null, 2) + "\n");
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, f.options), /hermes_profile_config_invalid/);
});
test("duplicate keys, malformed bytes and missing config cannot qualify", t => {
  const f = fixture(t);
  for (const text of ['{"model":"", "model":"other"}', "!!python/object:secret", "\uFEFF" + renderHermesProfile()]) {
    writeFileSync(f.file, text);
    assert.throws(() => inspectHermesProfile(f.binding, f.repositoryPath), /hermes_profile_config_invalid/);
  }
  rmSync(f.file); assert.throws(() => inspectHermesProfile(f.binding, f.repositoryPath), /hermes_profile_unreadable/);
});
test("profile relocation, identical replacement, Ready drift and forged snapshot are denied", t => {
  const f = fixture(t), other = path.join(f.root, "other"); mkdirSync(other);
  const file = path.join(other, "config.yaml"); writeFileSync(file, renderHermesProfile());
  assert.throws(() => assertHermesProfile(f.snapshot, hermesProfileBinding(file), f.options), /hermes_profile_changed/);
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, { ...f.options, readyRevision: "c".repeat(64) }), /hermes_profile_ready_changed/);
  assert.throws(() => assertHermesProfile({}, f.binding, f.options), /hermes_profile_ready_changed/);
  renameSync(f.file, f.file + ".old"); writeFileSync(f.file, renderHermesProfile());
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, f.options), /hermes_profile_changed/);
});
test("repository profile, hardlink and parent junction/symlink are rejected", t => {
  const f = fixture(t), inside = path.join(f.repositoryPath, "config.yaml"); writeFileSync(inside, renderHermesProfile());
  assert.throws(() => inspectHermesProfile(hermesProfileBinding(inside), f.repositoryPath), /hermes_profile_path_invalid/);
  linkSync(f.file, path.join(f.root, "linked.yaml"));
  assert.throws(() => inspectHermesProfile(f.binding, f.repositoryPath), /hermes_profile_config_invalid/);
  rmSync(path.join(f.root, "linked.yaml"));
  const alias = path.join(f.root, "alias"); symlinkSync(f.home, alias, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => inspectHermesProfile(hermesProfileBinding(path.join(alias, "config.yaml")), f.repositoryPath), /hermes_profile_path_invalid/);
});
for (const [name, edit] of Object.entries({
  provider: m => m.provider = "auto", foreignSource: m => m.sourceClass = "other-owner",
  secondAccount: m => m.accountCount = 2, changedAccount: m => m.accountChanged = true,
  rotation: m => m.rotationRequested = true, fallback: m => m.fallbackRequested = true,
  relogin: m => m.interactionRequired = true, otherIdentity: m => m.identityFingerprint = "c".repeat(64),
  token: m => m.token = "synthetic-private-secret", decodedToken: m => m.provenance = "decoded_token"
})) test(`auth policy rejects ${name} without storing or returning secret data`, () => {
  const value = metadata(); edit(value);
  assert.throws(() => observeHermesSameOwner(() => value), e => {
    assert.equal(JSON.stringify(e).includes("synthetic-private-secret"), false); return e.message === "hermes_auth_policy_denied";
  });
});
test("no real identity adapter means owner action; copied receipts and identity change after Ready are denied", t => {
  const f = fixture(t), pending = sealHermesProfile(f.binding, { ...f.options, authReceipt: undefined });
  assert.throws(() => assertHermesProfile(pending, f.binding, { ...f.options, authReceipt: undefined }), /hermes_owner_interaction_required/);
  assert.throws(() => assertHermesProfile(pending, f.binding, f.options), /hermes_auth_identity_changed/);
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, { ...f.options, authReceipt: {} }), /hermes_auth_observation_invalid/);
  const changed = observeHermesSameOwner(() => ({ ...metadata(), identityFingerprint: "c".repeat(64), approvedIdentityFingerprint: "c".repeat(64) }));
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, { ...f.options, authReceipt: changed }), /hermes_auth_identity_changed/);
  assert.throws(() => observeHermesSameOwner(() => { throw Error("synthetic-private-secret"); }), /hermes_auth_observation_invalid/);
});
test("Worker binds profile to its sealed input, and production preparation cannot accept a synthetic auth override", t => {
  const f = fixture(t), packet = validPacketFixture(); pinReadyFixture(packet);
  const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
  const provider = { kind: "hermes_codex", enabled: true, officialSource: pin.officialSource,
    version: pin.version, commit: pin.commit, executablePath: "C:\\Fictional\\hermes.exe",
    policy: structuredClone(contract.registry.hermesPolicy), profile: f.binding };
  const consumption = { fresh: { taskContext: packet.taskContext, applicationContext: packet.applicationContext },
    claimed: packet.claimed, currentCommit: "a".repeat(40), assertAuthority() {}, provider, repositoryPath: f.repositoryPath };
  const envelope = prepareProviderInput(consumption);
  assert.equal(JSON.stringify(envelope).includes(f.root), false);
  assert.throws(() => assertProviderProfile(envelope, provider, f.repositoryPath, f.authReceipt), /hermes_auth_identity_changed/);
  packet.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  // Windows-only launch projection; the profile layer itself is portable for fixtures.
  if (process.platform === "win32") {
    assert.throws(() => prepareProviderLaunch({ provider, envelope, repositoryPath: f.repositoryPath,
      sandbox: "workspace-write", platform: "win32", authReceipt: f.authReceipt }, consumption), /hermes_owner_interaction_required/);
    assert.throws(() => prepareProviderLaunch({ provider, envelope, repositoryPath: f.repositoryPath,
      sandbox: "workspace-write", platform: "win32" }, consumption), /agent_provider_input_blocked/);
  }
  const approvedEnvelope = prepareProviderInput({ ...consumption, hermesAuthReceipt: f.authReceipt });
  assert.equal(assertProviderProfile(approvedEnvelope, provider, f.repositoryPath, f.authReceipt).ownerInteractionRequired, false);
  writeFileSync(f.file, "{}");
  assert.throws(() => assertProviderProfile(approvedEnvelope, provider, f.repositoryPath, f.authReceipt), /hermes_profile_config_invalid/);
});
