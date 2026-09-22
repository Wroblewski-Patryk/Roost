import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import cp from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { randomUUID } from "node:crypto";
import fixed from "./lib/agent-host-fixed-program.cjs";
import contract from "./lib/agent-host-provider-contract.cjs";
import { assertProviderInputAvailable } from "./lib/agent-host-provider-input.mjs";
import { prepareProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import { runFixedExecution } from "./lib/agent-host-fixed-execution.mjs";
import { prepareTrustedProviderPilot, prepareFixedHostContainment, assertHostContainmentAttempt } from "./lib/agent-host-containment.mjs";
import { trustedPilotBytes } from "./lib/agent-host-trusted-pilot.mjs";
import { createTrustedPilotFixture as setup } from "./fixtures/trusted-pilot.mjs";

const windows = { skip: process.platform !== "win32", timeout: 60000 };
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

for (const kind of ["hermes_local"]) test(`pinned ${kind} pilot policy reaches only owned fixed fixture and cleanup`, windows, async t => {
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

for (const evidence of ["signed", "staticPin", "diagnostic", "fallback"]) test(`direct Codex ${evidence} cannot obtain pilot authority`, windows, async t => {
  const x = await setup(t, "direct_codex");
  if (evidence === "staticPin") x.payload.provider.codexPin = { schemaVersion: "roost-codex-static-pin-v1", installationDigest: "a".repeat(64) };
  if (evidence === "diagnostic") x.payload.provider.diagnostic = true;
  if (evidence === "fallback") x.profile.fallback = "direct_codex";
  x.publishProfile();
  withoutProcesses(() => assert.throws(() => admit(x)));
  noEffects(x);
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
