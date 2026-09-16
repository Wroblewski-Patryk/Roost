import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync } from "node:fs";
import { renderHermesStartupProfile, hermesStartupProfileBinding } from "./lib/agent-host-hermes-profile.mjs";
import { createOwnerAttestation, rebindOwnerAttestation } from "./lib/agent-host-hermes-owner-auth.mjs";
import { hermesStartupEnvironment, createHermesStartupCandidate, sealHermesStartup, assertHermesStartup,
  hermesStartupReceiptSchema, hermesStartupBlockers, hermesStartupMaxAgeMs } from "./lib/agent-host-hermes-startup.mjs";
import { prepareProviderInput, assertProviderStartup } from "./lib/agent-host-provider-input.mjs";
import { projectProviderLaunch, prepareProviderLaunch, hermesContract } from "./lib/agent-host-provider-launch.mjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");

function fixture(t, packetChange = () => {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "roost-hermes-startup-test-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("roost-hermes-startup-test-"));
    rmSync(root, { recursive: true, force: true });
  });
  const home = path.join(root, "profile"), repositoryPath = path.join(root, "app"), install = path.join(root, "runtime");
  for (const dir of [home, repositoryPath, path.join(install, "venv", "Scripts")]) mkdirSync(dir, { recursive: true });
  const profile = hermesStartupProfileBinding(path.join(home, "config.yaml"));
  writeFileSync(profile.profilePath, renderHermesStartupProfile());
  const owner = createOwnerAttestation(profile); profile.ownerAttestation = owner.binding;
  writeFileSync(path.join(home, "owner-attestation.json"), owner.bytes);
  const provider = { kind: "hermes_codex", enabled: true, version: pin.version, commit: pin.commit, officialSource: pin.officialSource,
    executablePath: path.join(install, "venv", "Scripts", "hermes.exe"), profile, policy: structuredClone(contract.registry.hermesPolicy) };
  const f = validPacketFixture(); packetChange(f); pinReadyFixture(f);
  const startupEnvironment = hermesStartupEnvironment(profile, { SYSTEMROOT: process.env.SystemRoot ?? "C:\\Windows", PATH: "C:\\Windows\\System32" });
  const consumption = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
    currentCommit: "a".repeat(40), assertAuthority() {}, provider, repositoryPath, startupEnvironment };
  const envelope = prepareProviderInput(consumption);
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  const options = { provider, envelope, repositoryPath, startupEnvironment, sandbox: "workspace-write", platform: "win32" };
  const checked = assertProviderStartup(options);
  return { root, home, install, provider, f, envelope, consumption, options, checked };
}

test("qualified policy is Ready/input bound, secret-free, and reaches only the pre-spawn boundary", t => {
  const f = fixture(t), { receipt, candidate } = f.checked;
  assert.deepEqual(candidate.args, ["chat", "--cli", "--oneshot", "--quiet", "--query-file", "-", "--provider", "openai-codex",
    "--model", "gpt-5.6-sol", "--reasoning", "medium", "--toolsets", "file,terminal"]);
  assert.deepEqual(receipt.expandedTools, ["read_file", "write_file", "patch", "search_files", "terminal", "process_manage"]);
  assert.deepEqual(receipt.acceptedSideEffects, { bundledSkillsLocalSync: true, localBannerPrefetch: true, networkUpdateCheck: false });
  assert.equal(receipt.inputSeal, f.envelope.seal); assert.equal(receipt.readyRevision, f.envelope.revisions.ready);
  for (const sensitive of [f.root, "Repair the synthetic fixture", "SYSTEMROOT", "C:\\Windows", "config.yaml", "@", "access_token", "rawOutput"])
    assert.equal(JSON.stringify(receipt).includes(sensitive), false);
  assert.equal(hermesStartupReceiptSchema.safeParse(receipt).success, true);
  const blockers = hermesStartupBlockers(hermesContract.blockers, receipt, f.checked.options);
  assert.equal(blockers.includes("hermes_sealed_config_enforcement_unproven"), false);
  assert.ok(blockers.includes("hermes_public_launch_contract_unqualified"));
  if (process.platform === "win32") {
    const plan = projectProviderLaunch(f.options);
    assert.equal(plan.command, null); assert.equal(plan.args, null);
    assert.equal(plan.requiredConfig.configReceipt.digest, receipt.digest);
    assert.throws(() => prepareProviderLaunch(f.options, f.consumption), /hermes_public_launch_contract_unqualified/);
    assert.throws(() => prepareProviderLaunch(f.options, f.consumption), /agent_provider_input_blocked/);
  }
  for (const gate of ["implementationReady", "executionSupported", "pilotReady", "liveAdmissionAllowed", "pilotExecutionAuthorized", "pilotExecutionStarted"])
    assert.equal(hermesContract[gate], false);
});

test("local_test must be explicit; coding without it gets only file", t => {
  const f = fixture(t, f => { f.packet.contract.access.tools = ["repository_read", "repository_write"]; f.packet.contract.access.permissions = ["repository_read", "repository_write"]; });
  assert.deepEqual(f.checked.receipt.toolsets, ["file"]);
  const candidate = structuredClone(f.checked.candidate); candidate.args[candidate.args.length - 1] = "file,terminal";
  assert.throws(() => sealHermesStartup({ ...f.checked.options, candidate }), /hermes_startup_candidate_invalid/);
});
test("file toolset cannot expand a read-only task into write authority", t => {
  assert.throws(() => fixture(t, f => { f.packet.contract.access.tools = ["repository_read"]; f.packet.contract.access.permissions = ["repository_read"]; }), /hermes_startup_tools_not_authorized/);
});

for (const toolset of ["", "terminal", "file,browser", "file,web", "skills", "memory", "mcp-x", "plugin-x", "delegation", "cronjob", "kanban", "all", "*", "unknown", "file,file"]) {
  test(`pre-seal tool selection ${toolset || "empty"} is rejected`, t => {
    const f = fixture(t), candidate = structuredClone(f.checked.candidate); candidate.args[candidate.args.length - 1] = toolset;
    assert.throws(() => sealHermesStartup({ ...f.checked.options, candidate }), /hermes_startup_candidate_invalid/);
  });
}
for (const [name, edit] of Object.entries({
  auto: c => c.args[c.args.indexOf("--model") + 1] = "auto",
  alias: c => c.args[c.args.indexOf("--model") + 1] = "fast",
  moa: c => c.args[c.args.indexOf("--model") + 1] = "moa:fast",
  custom: c => c.args[c.args.indexOf("--provider") + 1] = "custom",
  baseUrl: c => c.args.push("--base-url", "https://example.invalid"),
  reasoning: c => c.args[c.args.indexOf("--reasoning") + 1] = "invalid",
  effortDrift: c => c.args[c.args.indexOf("--reasoning") + 1] = "high",
  modelDrift: c => c.args[c.args.indexOf("--model") + 1] = "gpt-6-astra",
  worktree: c => c.args.push("--worktree"), yolo: c => c.args.push("--yolo"),
  noSafeMode: c => delete c.environment.HERMES_SAFE_MODE,
  unsafeMode: c => c.environment.HERMES_SAFE_MODE = "0",
  configBypass: c => c.environment.HERMES_IGNORE_USER_CONFIG = "1",
  goalMode: c => c.environment.HERMES_KANBAN_GOAL_MODE = "1",
  providerEnv: c => c.environment.HERMES_INFERENCE_PROVIDER = "auto",
  secretEnv: c => c.environment.OPENAI_API_KEY = "synthetic-private-value",
  sideEffects: c => c.acceptedSideEffects.networkUpdateCheck = true,
  denyAcceptedEffect: c => c.acceptedSideEffects.bundledSkillsLocalSync = false,
  cwd: c => c.cwd = path.dirname(c.cwd), shell: c => c.shell = true,
  executable: c => c.command += ".cmd", promptArg: c => c.args.push("--query", "synthetic-private-value")
})) test(`candidate ${name} is rejected before sealing and on Ready drift`, t => {
  const f = fixture(t), candidate = structuredClone(f.checked.candidate); edit(candidate);
  assert.throws(() => sealHermesStartup({ ...f.checked.options, candidate }), e => {
    assert.equal(JSON.stringify(e).includes("synthetic-private-value"), false); return e.protocolAdmission;
  });
  assert.throws(() => assertProviderStartup({ ...f.options, startupCandidate: candidate }), /hermes_startup_ready_changed/);
});

for (const [name, edit] of Object.entries({
  fallback: c => c.fallback_providers = [{ provider: "other", model: "other" }],
  legacyFallback: c => c.fallback_model = [{ provider: "other", model: "other" }],
  worktree: c => c.worktree = true, updates: c => c.updates.check = true,
  alias: c => c.model_aliases = { fast: "other" }, custom: c => c.custom_providers = [{ name: "extra" }],
  smart: c => c.smart_model_routing.enabled = true, auxiliary: c => c.auxiliary.background_review.enabled = true,
  memory: c => c.memory.memory_enabled = true, mcp: c => c.mcp_servers = { extra: {} },
  plugin: c => c.plugins.enabled.push("extra"), telemetry: c => c.telemetry.shared_metrics.send = true
})) test(`profile ${name} drift blocks the existing Ready/input`, t => {
  const f = fixture(t), config = JSON.parse(renderHermesStartupProfile()); edit(config);
  writeFileSync(f.provider.profile.profilePath, JSON.stringify(config, null, 2) + "\n");
  assert.throws(() => assertProviderStartup(f.options), /hermes_profile_config_invalid/);
});

test("profile identity, attestation, provider and input drift reject prior proof", t => {
  const f = fixture(t), file = f.provider.profile.profilePath;
  renameSync(file, file + ".previous"); writeFileSync(file, renderHermesStartupProfile());
  assert.throws(() => assertProviderStartup(f.options), /hermes_profile_changed/);
  assert.deepEqual(hermesStartupBlockers(hermesContract.blockers, f.checked.receipt, f.checked.options), hermesContract.blockers);
  assert.deepEqual(hermesStartupBlockers(hermesContract.blockers, structuredClone(f.checked.receipt), f.checked.options), hermesContract.blockers);
  const other = fixture(t); other.provider.profile.ownerAttestation.digest = "a".repeat(64);
  assert.throws(() => assertProviderStartup(other.options), /hermes_profile_changed/);
  const changed = fixture(t); changed.provider.commit = "b".repeat(40);
  assert.throws(() => assertProviderStartup(changed.options), /hermes_startup_ready_changed/);
  assert.throws(() => assertProviderStartup({ ...f.options, envelope: structuredClone(f.envelope) }), /hermes_profile_ready_changed/);
});
test("receipt expiry uses the Ready-time deadline, never a sliding renewal", t => {
  const f = fixture(t), time = Date.parse(f.checked.receipt.issuedAt);
  const clock = t.mock.method(Date, "now", () => time + hermesStartupMaxAgeMs);
  assert.throws(() => assertProviderStartup(f.options), /hermes_startup_receipt_expired/);
  assert.deepEqual(hermesStartupBlockers(hermesContract.blockers, f.checked.receipt, f.checked.options), hermesContract.blockers);
  clock.mock.restore();
});
test("environment values and source-sidecar appearance after Ready are blocked without reading their content", t => {
  const f = fixture(t);
  assert.throws(() => assertProviderStartup({ ...f.options, startupEnvironment: { ...f.options.startupEnvironment, PATH: "C:\\Other" } }), /hermes_startup_ready_changed/);
  for (const file of [path.join(f.home, ".env"), path.join(f.home, ".op.env"), path.join(f.install, ".env")]) {
    writeFileSync(file, "synthetic-private-value");
    assert.throws(() => assertProviderStartup(f.options), e => e.message === "hermes_startup_overlay_present" && !JSON.stringify(e).includes(file));
    rmSync(file);
  }
});
test("environment construction never reads credential or dispatcher values", () => {
  const source = { SYSTEMROOT: process.env.SystemRoot ?? "C:\\Windows", Path: "C:\\Windows\\System32" };
  for (const key of ["CODEX_HOME", "OPENAI_API_KEY", "HERMES_KANBAN_GOAL_MODE", "PYTHONPATH", "HTTP_PROXY"])
    Object.defineProperty(source, key, { enumerable: true, get() { throw Error("must not read"); } });
  const env = hermesStartupEnvironment({ profilePath: "C:\\Fictional\\profile\\config.yaml" }, source);
  assert.equal(env.HERMES_SAFE_MODE, "1"); assert.equal(env.PATH, source.Path); assert.equal(Object.hasOwn(env, "CODEX_HOME"), false);
});
test("owner-authorized profile rebinding preserves original confirmation and expiry", t => {
  const f = fixture(t), original = JSON.parse(readFileSync(path.join(f.home, "owner-attestation.json"), "utf8"));
  const next = { ...f.provider.profile, configDigest: "b".repeat(64) };
  const rebound = rebindOwnerAttestation(f.provider.profile, next), record = JSON.parse(rebound.bytes);
  for (const key of ["id", "confirmedAt", "expiresAt", "state"]) assert.equal(record[key], original[key]);
  assert.notEqual(record.profileBindingDigest, original.profileBindingDigest);
});
test("unknown or sensitive serialized receipt fields never validate or discharge a blocker", t => {
  const f = fixture(t);
  for (const extra of [{ prompt: "synthetic-private-value" }, { privatePath: f.root }, { account: "person@example.invalid" }, { rawOutput: "data" }]) {
    const forged = { ...f.checked.receipt, ...extra };
    assert.equal(hermesStartupReceiptSchema.safeParse(forged).success, false);
    assert.deepEqual(hermesStartupBlockers(hermesContract.blockers, forged, f.checked.options), hermesContract.blockers);
  }
  assert.throws(() => { f.checked.receipt.acceptedSideEffects.networkUpdateCheck = true; }, TypeError);
});
