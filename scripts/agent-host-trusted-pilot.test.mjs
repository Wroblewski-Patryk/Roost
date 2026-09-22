import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import cp from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { createHash, generateKeyPairSync, sign, randomUUID } from "node:crypto";
import fixed from "./lib/agent-host-fixed-program.cjs";
import contract from "./lib/agent-host-provider-contract.cjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { acquireWriterLock, writerRecoveryEvidence } from "./lib/agent-host-writer-lock.mjs";
import { prepareProviderInput, assertProviderInputAvailable } from "./lib/agent-host-provider-input.mjs";
import { prepareProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import { prepareFixedExecution, inspectFixedContainment, abandonFixedExecution, runFixedExecution } from "./lib/agent-host-fixed-execution.mjs";
import { prepareTrustedProviderPilot, prepareFixedHostContainment, assertHostContainmentAttempt } from "./lib/agent-host-containment.mjs";
import { trustedPilotVersion, trustedPilotAcknowledgement, trustedPilotBytes } from "./lib/agent-host-trusted-pilot.mjs";
import { nativeDigest, physicalIdentity } from "./lib/agent-host-native-footprint.mjs";

const windows = { skip: process.platform !== "win32", timeout: 60000 };
const sha = b => createHash("sha256").update(b).digest("hex");
async function setup(t, kind = "direct_codex") {
  const parent = fs.realpathSync.native(os.tmpdir()), root = fs.mkdtempSync(path.join(parent, "roost-trusted-pilot-"));
  const state = path.join(root, "state"), repositoryPath = path.join(root, "repository"), privateRoot = path.join(state, "trusted-provider-pilot");
  fs.mkdirSync(repositoryPath); fs.mkdirSync(state); fs.mkdirSync(privateRoot);
  const writerLock = await acquireWriterLock(state), f = validPacketFixture();
  f.packet.contract.executionClass = fixed.program;
  if (kind === "hermes_local") f.packet.contract.modelSelection = { provider: kind, model: "gpt-oss:20b", modelFamily: "gpt-oss",
    modelDigest: "sha256:" + "b".repeat(64), reasoningEffort: "low" };
  pinReadyFixture(f);
  const authority = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
    currentCommit: "a".repeat(40), assertAuthority() {} };
  const envelope = prepareProviderInput(authority);
  const grant = await prepareFixedExecution({ envelope, writerLock, repositoryPath, claimed: f.claimed,
    assertAuthority() {}, deadline: new Date(Date.now() + 55000).toISOString() });
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  const source = inspectFixedContainment(grant), writerDigest = nativeDigest(writerRecoveryEvidence(writerLock));
  const configurationPath = path.join(privateRoot, "installation.json"), profilePath = path.join(privateRoot, "trusted-provider-profile.json"),
    decisionPath = path.join(privateRoot, "trusted-provider-pilot.json");
  fs.writeFileSync(configurationPath, "{}\n", { flag: "wx" });
  const version = contract.registry.providers.find(p => p.kind === (kind === "hermes_local" ? "hermes_codex" : kind)).version;
  const profile = { schemaVersion: trustedPilotVersion, purpose: "managed-agent", providerKind: kind, version,
    backend: kind === "hermes_local" ? "ollama_loopback" : "openai", fallback: "none", modelSelection: envelope.contract.modelSelection,
    qualification: "closed_fixture_only" };
  fs.writeFileSync(profilePath, trustedPilotBytes(profile), { flag: "wx" });
  const provider = { kind, version, runtimeDigest: nativeDigest(source.runtime), launcherDigest: nativeDigest(source.runtime.launcher),
    profile: { identity: physicalIdentity(profilePath, false), digest: sha(fs.readFileSync(profilePath)) },
    configurationDigest: nativeDigest(source.configuration), modelSelection: envelope.contract.modelSelection };
  const installationId = randomUUID(), decisionId = randomUUID(), { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const payload = { schemaVersion: trustedPilotVersion, decisionId, revision: 1, state: "accepted", decidedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(), installationId, configurationIdentity: physicalIdentity(configurationPath, false),
    installationIdentity: physicalIdentity(privateRoot), provider,
    scope: { workspaceId: envelope.identity.workspaceId, applicationId: envelope.identity.applicationId, taskId: envelope.identity.taskId,
      executionId: envelope.identity.executionId, checkoutIdentity: physicalIdentity(repositoryPath), inputSeal: envelope.seal,
      accessDigest: nativeDigest(envelope.contract.access), singleTaskDigest: nativeDigest(envelope.contract.singleTask),
      filesystemDigest: nativeDigest(source.filesystemScope), writerDigest },
    mode: "trusted_provider_pilot", residualRiskAccepted: true, systemIsolation: false, arbitraryProviderAdmission: false, fullAutonomy: false,
    acknowledgement: trustedPilotAcknowledgement, qualification: "closed_fixture_only" };
  const anchor = { schemaVersion: trustedPilotVersion, installationId, workspaceId: envelope.identity.workspaceId,
    authorityPublicKey: publicKey.export({ type: "spki", format: "pem" }), decisionFile: "trusted-provider-pilot.json",
    profileFile: "trusted-provider-profile.json", decisionId, revision: 1, decisionDigest: "0".repeat(64) };
  function publish() {
    const record = { payload, signature: sign(null, trustedPilotBytes(payload), privateKey).toString("hex") };
    fs.writeFileSync(decisionPath, trustedPilotBytes(record)); anchor.decisionDigest = sha(fs.readFileSync(decisionPath));
    fs.writeFileSync(configurationPath, trustedPilotBytes(anchor));
  }
  publish();
  const options = { provider: fixed.declaration, fixedGrant: grant, writerLock, envelope, repositoryPath, sandbox: "workspace-write",
    trustedPilot: { configurationPath, provider: structuredClone(provider) } };
  const directory = path.join(state, "native-review-" + f.claimed.id), location = JSON.parse(fs.readFileSync(path.join(directory, "fixed-location.json")));
  t.after(async () => {
    if (fs.existsSync(location.root)) abandonFixedExecution(grant);
    await writerLock.release(); assert.equal(fs.realpathSync.native(root), root); assert.equal(path.dirname(root), parent); fs.rmSync(root, { recursive: true });
  });
  function publishProfile() {
    fs.writeFileSync(profilePath, trustedPilotBytes(profile));
    const pin = { identity: physicalIdentity(profilePath, false), digest: sha(fs.readFileSync(profilePath)) };
    payload.provider.profile = pin; options.trustedPilot.provider.profile = structuredClone(pin); publish();
  }
  return { root, privateRoot, state, f, authority, options, grant, location, directory, payload, anchor, profile, profilePath, decisionPath, configurationPath, publish, publishProfile };
}
function admit(x) { return x.options.containmentReceipt = prepareTrustedProviderPilot(x.options, x.authority); }
function noEffects(x) {
  assert.equal(fs.statSync(path.join(x.location.root, "repository", "synthetic-effect.bin")).size, 0);
  assert.equal(fs.existsSync(path.join(x.directory, "resume-authorized.json")), false);
}
function withoutProcesses(run) {
  const methods = ["spawn", "execFile", "execFileSync", "spawnSync", "exec", "execSync"], originals = new Map(); let starts = 0;
  for (const method of methods) { originals.set(method, cp[method]); cp[method] = () => { starts++; throw Error("unexpected_process_creation"); }; }
  syncBuiltinESMExports();
  try { run(); assert.equal(starts, 0); }
  finally { for (const [method, original] of originals) cp[method] = original; syncBuiltinESMExports(); }
}

for (const kind of ["direct_codex", "hermes_local"]) test(`pinned ${kind} pilot policy reaches only owned fixed fixture and cleanup`, windows, async t => {
  const x = await setup(t, kind), receipt = admit(x);
  assert.equal(receipt.mode, "trusted_provider_pilot"); assert.equal(receipt.residualRiskAccepted, true);
  for (const k of ["systemIsolation", "realProviderAdmitted", "arbitraryProviderAdmission", "fullAutonomy"]) assert.equal(receipt[k], false);
  const serialized = JSON.stringify(receipt); for (const v of [x.root, x.f.claimed.leaseToken]) assert.equal(serialized.includes(v), false);
  assert.throws(() => prepareFixedHostContainment(x.options, x.authority));
  const launch = prepareProviderLaunch(x.options, x.authority);
  assert.equal(launch.kind, fixed.kind); assert.equal(launch.command, null); assert.equal(launch.args, null);
  const result = await runFixedExecution(launch.grant, { remainingMs: () => 30000 });
  assert.equal(result.finalResponse, fixed.output.trim()); assert.equal(result.verification.effectBytes, 22);
  assert.equal(result.verification.job.activeProcesses, 0); assert.equal(result.verification.cleanup.fixtureAbsent, true);
  assert.equal(result.verification.containment.mode, "trusted_provider_pilot");
  assert.equal(result.verification.containment.fullAutonomy, false);
  assert.equal(contract.projectProvider({ kind: kind === "hermes_local" ? "hermes_codex" : kind, executionSupported: true }).executionSupported, false);
});

const denials = {
  missingAcceptance: x => fs.unlinkSync(x.decisionPath),
  unsigned: x => { const r = JSON.parse(fs.readFileSync(x.decisionPath)); r.signature = "0".repeat(128); fs.writeFileSync(x.decisionPath, trustedPilotBytes(r)); },
  copiedAnchor: x => { const p = path.join(x.privateRoot, "copied.json"); fs.copyFileSync(x.configurationPath, p); x.options.trustedPilot.configurationPath = p; },
  runtimeHash: x => { x.options.trustedPilot.provider.runtimeDigest = "f".repeat(64); },
  runtimeBytes: x => fs.appendFileSync(x.location.executable, "drift"),
  launcherHash: x => { x.options.trustedPilot.provider.launcherDigest = "f".repeat(64); },
  version: x => { x.options.trustedPilot.provider.version = "unapproved"; },
  configuration: x => { x.options.trustedPilot.provider.configurationDigest = "f".repeat(64); },
  profile: x => fs.appendFileSync(x.profilePath, "\n"),
  ownerManualProfile: x => { x.profile.purpose = "hermes-manual"; x.publishProfile(); },
  remoteHermes: x => { x.profile.backend = "openai"; x.publishProfile(); },
  fallback: x => { x.profile.fallback = "remote"; x.publishProfile(); },
  unknownProvider: x => { x.options.trustedPilot.provider.kind = "unknown"; },
  missingModel: x => { delete x.options.trustedPilot.provider.modelSelection.model; },
  missingReasoning: x => { delete x.options.trustedPilot.provider.modelSelection.reasoningEffort; },
  modelChanged: x => { x.options.trustedPilot.provider.modelSelection.model = "gpt-oss:120b"; },
  modelDigestChanged: x => { x.options.trustedPilot.provider.modelSelection.modelDigest = "sha256:" + "e".repeat(64); },
  workspace: x => { x.options.repositoryPath = x.privateRoot; },
  workspaceId: x => { x.payload.scope.workspaceId = randomUUID(); x.publish(); },
  installation: x => { x.payload.installationId = randomUUID(); x.publish(); },
  task: x => { x.payload.scope.taskId = randomUUID(); x.publish(); },
  scope: x => { x.payload.scope.accessDigest = "f".repeat(64); x.publish(); },
  filesystem: x => { x.options.filesystemScope = {}; },
  writer: x => { x.options.writerLock = { ...x.options.writerLock }; },
  release: x => { x.options.hostControlCapabilities = ["deployment"]; },
  credential: x => { x.options.hostControlCapabilities = ["credential_read"]; },
  network: x => { x.options.hostControlCapabilities = ["network_connect"]; },
  revoked: x => { x.payload.state = "revoked"; x.publish(); },
  decisionVersion: x => { x.payload.revision++; x.publish(); },
  noRiskAcknowledgement: x => { x.payload.residualRiskAccepted = false; x.publish(); },
  wrongRiskText: x => { x.payload.acknowledgement = "fully_isolated"; x.publish(); },
  expired: x => { x.payload.expiresAt = x.payload.decidedAt; x.publish(); },
  future: x => { x.payload.decidedAt = new Date(Date.now() + 600000).toISOString(); x.publish(); },
  fullIsolation: x => { x.payload.systemIsolation = true; x.publish(); },
  fullAutonomy: x => { x.payload.fullAutonomy = true; x.publish(); },
  arbitraryAdmission: x => { x.payload.arbitraryProviderAdmission = true; x.publish(); },
  realPromotion: x => { x.payload.qualification = "real_provider"; x.publish(); },
  fakeGrant: x => { x.options.fixedGrant = {}; }
};
for (const [name, mutate] of Object.entries(denials)) test(`trusted pilot refuses ${name} before target creation`, windows, async t => {
  const x = await setup(t, "hermes_local"); mutate(x);
  withoutProcesses(() => assert.throws(() => admit(x)));
  noEffects(x);
});

for (const phase of ["prepared", "consumed"]) for (const change of ["revoke", "revision", "anchor", "profile"])
  test(`trusted pilot ${change} invalidates ${phase} attempt`, windows, async t => {
    const x = await setup(t); admit(x);
    if (phase === "consumed") prepareProviderLaunch(x.options, x.authority);
    if (change === "revoke") { x.payload.state = "revoked"; x.publish(); }
    if (change === "revision") { x.payload.revision++; x.anchor.revision++; x.publish(); }
    if (change === "anchor") fs.appendFileSync(x.configurationPath, "\n");
    if (change === "profile") fs.appendFileSync(x.profilePath, "\n");
    if (phase === "prepared") {
      withoutProcesses(() => assert.throws(() => prepareProviderLaunch(x.options, x.authority)));
      assert.throws(() => assertProviderInputAvailable(x.options.envelope));
    } else await assert.rejects(runFixedExecution(x.grant, { remainingMs: () => 30000 }));
    noEffects(x);
  });

test("copied or fabricated pilot receipt cannot enter the existing admission registry", windows, async t => {
  const x = await setup(t); admit(x);
  x.options.containmentReceipt = JSON.parse(JSON.stringify(x.options.containmentReceipt));
  withoutProcesses(() => assert.throws(() => prepareProviderLaunch(x.options, x.authority)));
  noEffects(x); assert.throws(() => assertProviderInputAvailable(x.options.envelope));
});

test("observed revocation permanently spends a consumed receipt even after file restoration", windows, async t => {
  const x = await setup(t), receipt = admit(x); prepareProviderLaunch(x.options, x.authority);
  const before = fs.readFileSync(x.decisionPath), anchor = fs.readFileSync(x.configurationPath);
  x.payload.state = "revoked"; x.publish();
  assert.throws(() => assertHostContainmentAttempt(receipt, x.grant));
  fs.writeFileSync(x.decisionPath, before); fs.writeFileSync(x.configurationPath, anchor);
  assert.throws(() => assertHostContainmentAttempt(receipt, x.grant));
  await assert.rejects(runFixedExecution(x.grant, { remainingMs: () => 30000 })); noEffects(x);
});

test("genuine trusted policy cannot promote its fixed execution source to Codex or Hermes", windows, async t => {
  const x = await setup(t); admit(x);
  x.options.provider = { kind: "direct_codex" };
  withoutProcesses(() => assert.throws(() => prepareProviderLaunch(x.options, x.authority)));
  noEffects(x);
});
