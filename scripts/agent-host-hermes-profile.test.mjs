import test from "node:test";
import { createHash } from "node:crypto";
import { createOwnerAttestation } from "./lib/agent-host-hermes-owner-auth.mjs";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, linkSync, symlinkSync, rmSync } from "node:fs";
import { renderHermesProfile, hermesProfileBinding, inspectHermesProfile, sealHermesProfile,
  assertHermesProfile, observeHermesSameOwner, hermesAuthSourceClass, hermesProfileAuthBlockers } from "./lib/agent-host-hermes-profile.mjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput, assertProviderProfile } from "./lib/agent-host-provider-input.mjs";
import { prepareProviderLaunch, projectProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";
const readyRevision = "a".repeat(64);
const metadata = () => ({ authSourceClass: hermesAuthSourceClass, status: "logged-in" });
const sha = value => createHash("sha256").update(value).digest("hex");
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "roost-hermes-profile-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repositoryPath = path.join(root, "app"), home = path.join(root, "profile");
  mkdirSync(repositoryPath); mkdirSync(home);
  const file = path.join(home, "config.yaml"); writeFileSync(file, renderHermesProfile());
  const binding = hermesProfileBinding(file), attestation = createOwnerAttestation(binding);
  const attestationFile = path.join(home, "owner-attestation.json"); writeFileSync(attestationFile, attestation.bytes);
  binding.ownerAttestation = attestation.binding;
  const authReceipt = observeHermesSameOwner(metadata);
  const options = { repositoryPath, readyRevision, authReceipt };
  const snapshot = sealHermesProfile(binding, options);
  return { root, home, file, binding, snapshot, options, repositoryPath, authReceipt, attestation, attestationFile };
}
test("approved synthetic profile and nonsecret same-owner observation reach only the pre-spawn profile boundary", t => {
  const f = fixture(t), result = assertHermesProfile(f.snapshot, f.binding, f.options);
  assert.equal(result.auth.authSourceClass, hermesAuthSourceClass);
  assert.equal(result.auth.ownerInteractionRequired, false);
  assert.equal(Object.hasOwn(result.auth, "identityFingerprint"), false);
  assert.equal(result.auth.status, "logged-in");
  assert.equal(JSON.stringify(result).includes(f.root), false);
  assert.equal(Object.hasOwn(result, "command"), false);
  assert.equal(inspectHermesProfile(f.binding, f.repositoryPath).auth.status, "unavailable_not_qualified");
});
test("public provider audit cannot trust asserted account identity or owner-interaction bypass", () => {
  const report = contract.projectProvider({ kind: "hermes_codex", authSource: {
    authSourceClass: "other-owner", identityFingerprint: "synthetic-private-secret", ownerInteractionRequired: false } });
  assert.deepEqual(report.authSource, { contractVersion: "roost-hermes-same-owner-auth-v2",
    authSourceClass: hermesAuthSourceClass, status: "not_observed", attestationId: null, attestationDigest: null, ownerInteractionRequired: true });
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
  foreignSource: m => m.authSourceClass = "other-owner", loggedOut: m => m.status = "logged-out",
  relogin: m => m.status = "relogin-required", unknown: m => m.status = "unknown",
  token: m => m.token = "synthetic-private-secret", rawOutput: m => m.stdout = "person@example.invalid sk-fixture-secret",
  identity: m => m.identityFingerprint = "b".repeat(64), rotation: m => m.rotationRequested = true,
  fallback: m => m.fallbackRequested = true, account: m => m.accountCount = 2
})) test(`auth observation rejects ${name} without echoing input`, () => {
  const value = metadata(); edit(value);
  assert.throws(() => observeHermesSameOwner(() => value), e => {
    assert.equal(JSON.stringify(e).includes("synthetic-private-secret"), false);
    assert.equal(JSON.stringify(e).includes("example.invalid"), false); return e.protocolAdmission;
  });
});

test("attestation-only approval needs no stable account ID and never downgrades an observed status", t => {
  const f = fixture(t), options = { ...f.options, authReceipt: undefined };
  const snapshot = sealHermesProfile(f.binding, options);
  assert.equal(assertHermesProfile(snapshot, f.binding, options).auth.ownerInteractionRequired, false);
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, options), /hermes_auth_attestation_changed/);
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, { ...f.options, authReceipt: {} }), /hermes_auth_observation_invalid/);
  assert.throws(() => observeHermesSameOwner(() => { throw Error("synthetic-private-secret"); }), /hermes_auth_observation_invalid/);
});

for (const [name, edit] of Object.entries({
  revoked: r => r.state = "revoked", expired: r => r.expiresAt = r.confirmedAt,
  future: r => r.confirmedAt = "2099-01-01T00:00:00.000Z", excessiveLifetime: r => r.expiresAt = "2099-01-01T00:00:00.000Z",
  profile: r => r.profileBindingDigest = "d".repeat(64), source: r => r.authSourceClass = "other-owner",
  policy: r => r.policyVersion = "unknown", pii: r => r.email = "person@example.invalid"
})) test(`owner attestation ${name} blocks even with updated declared digest`, t => {
  const f = fixture(t), record = JSON.parse(f.attestation.bytes); edit(record);
  const bytes = JSON.stringify(record, null, 2) + "\n"; writeFileSync(f.attestationFile, bytes);
  f.binding.ownerAttestation.digest = sha(bytes);
  assert.throws(() => sealHermesProfile(f.binding, f.options), e => {
    assert.equal(JSON.stringify(e).includes("example.invalid"), false); return e.protocolAdmission;
  });
});

test("missing, replaced and changed attestation cannot borrow Ready or cached receipt", t => {
  const f = fixture(t), receipt = assertHermesProfile(f.snapshot, f.binding, f.options);
  const blockers = ["hermes_owner_attestation_required", "hermes_public_launch_contract_unqualified"];
  assert.deepEqual(hermesProfileAuthBlockers(blockers, receipt, f.binding, f.options), [blockers[1]]);
  assert.deepEqual(hermesProfileAuthBlockers(blockers, { ...receipt }, f.binding, f.options), blockers);
  assert.deepEqual(hermesProfileAuthBlockers(blockers, receipt, f.binding, { ...f.options, readyRevision: "d".repeat(64) }), blockers);
  writeFileSync(f.attestationFile, f.attestation.bytes + " ");
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, f.options), /hermes_owner_attestation_changed/);
  assert.deepEqual(hermesProfileAuthBlockers(blockers, receipt, f.binding, f.options), blockers);
  rmSync(f.attestationFile);
  assert.throws(() => sealHermesProfile(f.binding, f.options), /hermes_owner_attestation_unreadable/);
  delete f.binding.ownerAttestation;
  assert.throws(() => sealHermesProfile(f.binding, f.options), /hermes_owner_attestation_required/);
});

test("Worker binds actual private owner attestation to Ready and retains unconditional no-spawn gate", t => {
  const f = fixture(t), packet = validPacketFixture(); pinReadyFixture(packet);
  const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
  const provider = { kind: "hermes_codex", enabled: true, officialSource: pin.officialSource,
    version: pin.version, commit: pin.commit, executablePath: "C:\\Fictional\\hermes.exe",
    policy: structuredClone(contract.registry.hermesPolicy), profile: f.binding };
  const consumption = { fresh: { taskContext: packet.taskContext, applicationContext: packet.applicationContext },
    claimed: packet.claimed, currentCommit: "a".repeat(40), assertAuthority() {}, provider, repositoryPath: f.repositoryPath };
  const envelope = prepareProviderInput(consumption);
  assert.equal(JSON.stringify(envelope).includes(f.root), false);
  assert.equal(JSON.stringify(envelope).includes(f.binding.ownerAttestation.id), false);
  assert.equal(assertProviderProfile(envelope, provider, f.repositoryPath).auth.ownerInteractionRequired, false);
  packet.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  if (process.platform === "win32") {
    const ownerAuthReceipt = assertProviderProfile(envelope, provider, f.repositoryPath);
    const projection = projectProviderLaunch({ provider, envelope, repositoryPath: f.repositoryPath,
      sandbox: "workspace-write", platform: "win32", ownerAuthReceipt });
    assert.equal(projection.blockers.includes("hermes_owner_attestation_required"), false);
    assert.equal(projection.blockers.includes("hermes_public_launch_contract_unqualified"), true);
    assert.equal(projection.command, null);
    assert.throws(() => prepareProviderLaunch({ provider, envelope, repositoryPath: f.repositoryPath,
      sandbox: "workspace-write", platform: "win32", authReceipt: {} }, consumption), /hermes_public_launch_contract_unqualified/);
    assert.throws(() => prepareProviderLaunch({ provider, envelope, repositoryPath: f.repositoryPath,
      sandbox: "workspace-write", platform: "win32" }, consumption), /agent_provider_input_blocked/);
  }
  const approvedEnvelope = prepareProviderInput(consumption);
  writeFileSync(f.file, "{}");
  assert.throws(() => assertProviderProfile(approvedEnvelope, provider, f.repositoryPath), /hermes_profile_config_invalid/);
});

test("expiry after Ready and renewal require fresh admission", t => {
  const f = fixture(t), expires = Date.parse(JSON.parse(f.attestation.bytes).expiresAt);
  const audit = assertHermesProfile(f.snapshot, f.binding, f.options);
  const clock = t.mock.method(Date, "now", () => expires + 1);
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, f.options), /hermes_owner_attestation_expired/);
  assert.deepEqual(hermesProfileAuthBlockers(["hermes_owner_attestation_required"], audit, f.binding, f.options), ["hermes_owner_attestation_required"]);
  clock.mock.restore();
  const renewed = createOwnerAttestation(f.binding);
  writeFileSync(f.attestationFile, renewed.bytes); f.binding.ownerAttestation = renewed.binding;
  assert.throws(() => assertHermesProfile(f.snapshot, f.binding, f.options), /hermes_profile_changed/);
});

test("attestation hardlink and reparse entries cannot qualify", t => {
  const f = fixture(t), extra = path.join(f.root, "extra.json");
  linkSync(f.attestationFile, extra);
  assert.throws(() => sealHermesProfile(f.binding, f.options), /hermes_owner_attestation_invalid/);
  rmSync(extra); renameSync(f.attestationFile, extra);
  const target = path.join(f.root, "junction-target"); mkdirSync(target);
  symlinkSync(target, f.attestationFile, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => sealHermesProfile(f.binding, f.options), /hermes_owner_attestation_invalid/);
});
