import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import cp from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { createManagedBackendFixture as setup, managedSelectionFixture } from "./fixtures/trusted-pilot.mjs";
import { managedBackendSelectionSchema } from "./lib/agent-host-model-policy.mjs";
import { prepareTrustedProviderPilot } from "./lib/agent-host-containment.mjs";
import { prepareProviderLaunch, projectProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import { runFixedExecution } from "./lib/agent-host-fixed-execution.mjs";
import { pinReadyFixture } from "./fixtures/execution-packet.mjs";
import providers from "./lib/agent-host-provider-contract.cjs";
import { assertProviderInputAvailable } from "./lib/agent-host-provider-input.mjs";

const windows = { skip: process.platform !== "win32", timeout: 60000 };
const admit = x => x.options.containmentReceipt = prepareTrustedProviderPilot(x.options, x.authority);
function withoutProcesses(fn) {
  const methods = ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync"], originals = new Map(); let starts = 0;
  for (const m of methods) { originals.set(m, cp[m]); cp[m] = () => { starts++; throw Error("unexpected_process"); }; }
  syncBuiltinESMExports(); try { fn(); assert.equal(starts, 0); }
  finally { for (const [m,f] of originals) cp[m] = f; syncBuiltinESMExports(); }
}
function noEffects(x) {
  assert.equal(fs.statSync(path.join(x.location.root, "repository", "synthetic-effect.bin")).size, 0);
  assert.equal(fs.existsSync(path.join(x.directory, "resume-authorized.json")), false);
}
function edit(file, fn) { const v = JSON.parse(fs.readFileSync(file)); fn(v); fs.writeFileSync(file, JSON.stringify(v)); }
for (const backend of ["codex_responses", "ollama_loopback"]) {
  test(`${backend} policy reaches only original fixed Job fixture`, windows, async t => {
    const x = await setup(t, backend), r = admit(x);
    for (const k of ["systemIsolation", "realProviderAdmitted", "arbitraryProviderAdmission", "fullAutonomy"]) assert.equal(r[k], false);
    const b = r.binding.trustedPilot.provider.managedBackend;
    assert.equal(b.realIssuerQualified, false); assert.equal(b.privateAnchorQualified, false);
    assert.equal(fs.existsSync(path.join(x.privateRoot, "codex-runtime-pin.json")), false);
    assert.equal(providers.projectProvider({ kind: "hermes_codex", executionSupported: true }).executionSupported, false);
    const launch = prepareProviderLaunch(x.options, x.authority); assert.equal(launch.command, null);
    const result = await runFixedExecution(launch.grant, { remainingMs: () => 30000 });
    assert.equal(result.verification.effectBytes, 22); assert.equal(result.verification.job.activeProcesses, 0);
    assert.equal(result.verification.cleanup.fixtureAbsent, true);
  });
  const denials = {
    directCodex: x => { x.options.trustedPilot.provider.kind = "direct_codex"; },
    appServer: x => { x.profile.backend = "codex_app_server"; x.publishProfile(); },
    manualProfile: x => { x.profile.purpose = "hermes-manual"; x.publishProfile(); },
    missingEvidence: x => fs.unlinkSync(x.evidencePath),
    runtime: x => { x.record.runtime.fixtureRuntimeDigest = "f".repeat(64); x.publishEvidence(); },
    runtimeVersion: x => { x.record.runtime.version = "0.21.3"; x.publishEvidence(); },
    profile: x => fs.appendFileSync(x.profilePath, "\n"),
    configuration: x => { x.options.trustedPilot.provider.configurationDigest = "f".repeat(64); },
    task: x => { x.payload.scope.taskId = "00000000-0000-4000-8000-000000000099"; x.publish(); },
    ready: x => { x.f.taskContext.readyAdmission.revision = "f".repeat(64); },
    writer: x => { x.options.writerLock = {}; },
    scope: x => { x.options.filesystemScope = {}; },
    budget: x => { x.record.context.budgetDigest = "f".repeat(64); x.publishEvidence(); },
    turns: x => { x.record.context.turnPolicyDigest = "f".repeat(64); x.publishEvidence(); },
    release: x => { x.record.context.gates.release = "automatic"; x.publishEvidence(); },
    job: x => { x.record.context.gates.jobVersion = "roost-windows-job-v1"; x.publishEvidence(); },
    recovery: x => { delete x.record.context.gates.recovery; x.publishEvidence(); },
    roles: x => { x.record.context.rolesDigest = "f".repeat(64); x.publishEvidence(); },
    competencies: x => { x.record.context.assignmentDigest = "f".repeat(64); x.publishEvidence(); },
    risk: x => { x.record.context.riskClass = "critical"; x.publishEvidence(); },
    fallback: x => { x.profile.fallback = "auto"; x.publishProfile(); },
    unavailable: x => { x.record.availability.backend = "unavailable"; x.publishEvidence(); },
    missingModel: x => { x.record.availability.model = "unavailable"; x.publishEvidence(); },
    missingResources: x => { x.record.availability.resources = "unknown"; x.publishEvidence(); },
    revoked: x => { x.record.state = "revoked"; x.publishEvidence(); },
    modelSwitch: x => { x.f.packet.contract.modelSelection.modelSelection.model = backend === "codex_responses" ? "gpt-6-astra" : "gpt-oss:120b"; pinReadyFixture(x.f); },
    backendSwitch: x => { x.f.packet.contract.modelSelection = managedSelectionFixture(backend === "codex_responses" ? "ollama_loopback" : "codex_responses"); pinReadyFixture(x.f); }
  };
  if (backend === "codex_responses") Object.assign(denials, {
    missingAuth: x => fs.unlinkSync(x.authPath), authDrift: x => fs.appendFileSync(x.authPath, "\n"),
    revokedAuth: x => edit(x.authPath, a => { a.state = "revoked"; })
  }); else Object.assign(denials, {
    missingManagedReceipt: x => fs.unlinkSync(x.modelPath),
    manualReceipt: x => edit(x.modelPath, m => { m.purpose = "hermes-manual"; }),
    wrongDigest: x => edit(x.modelPath, m => { m.selectionDigest = "f".repeat(64); }),
    remoteEndpoint: x => edit(x.modelPath, m => { m.endpoint = "https://example.invalid"; }),
    copiedProfileReceipt: x => edit(x.modelPath, m => { m.profile.identity = "f".repeat(64); })
  });
  for (const [name, mutate] of Object.entries(denials)) test(`${backend} refuses ${name} before target`, windows, async t => {
    const x = await setup(t, backend); mutate(x); withoutProcesses(() => assert.throws(() => admit(x))); noEffects(x);
  });
  for (const mode of ["copy", "replay", "tamper", "consumedDrift", "consumedBackendSwitch"])
    test(`${backend} refuses ${mode} after preparation`, windows, async t => {
      const x = await setup(t, backend); admit(x);
      if (mode === "copy") x.options.containmentReceipt = JSON.parse(JSON.stringify(x.options.containmentReceipt));
      if (mode === "tamper") x.options.trustedPilot.provider.managedBackend.context.budgetDigest = "f".repeat(64);
      if (mode === "replay") prepareProviderLaunch(x.options, x.authority);
      if (mode.startsWith("consumed")) {
        prepareProviderLaunch(x.options, x.authority);
        if (mode === "consumedDrift") x.record.availability.resources = "unavailable";
        else x.record.selection = managedSelectionFixture(backend === "codex_responses" ? "ollama_loopback" : "codex_responses");
        x.publishEvidence(); await assert.rejects(runFixedExecution(x.grant, { remainingMs: () => 30000 }));
      } else withoutProcesses(() => assert.throws(() => prepareProviderLaunch(x.options, x.authority)));
      noEffects(x);
    });
  test(`${backend} cannot project a real provider command`, windows, async t => {
    const x = await setup(t, backend);
    withoutProcesses(() => assert.throws(() => projectProviderLaunch({ ...x.options, provider: { kind: "hermes_codex" } }), /managed_backend_real_launch_unqualified/));
    noEffects(x);
  });
  test(`${backend} unavailable attempt stays spent after evidence restoration`, windows, async t => {
    const x = await setup(t, backend), original = fs.readFileSync(x.evidencePath);
    x.record.availability.resources = "unavailable"; x.publishEvidence();
    withoutProcesses(() => assert.throws(() => admit(x)));
    assert.throws(() => assertProviderInputAvailable(x.options.envelope));
    fs.writeFileSync(x.evidencePath, original);
    withoutProcesses(() => assert.throws(() => admit(x))); noEffects(x);
  });
}
const invalid = [
  ["codex_responses", s => { s.backend = "codex_app_server"; }],
  ["codex_responses", s => { s.provider = "direct_codex"; }],
  ["codex_responses", s => { s.backends = ["codex_responses", "ollama_loopback"]; }],
  ["codex_responses", s => { s.modelSelection.model = "gpt-5.5"; }],
  ["codex_responses", s => { s.modelSelection.model = "unknown"; }],
  ["codex_responses", s => { delete s.modelSelection.reasoningEffort; }],
  ["codex_responses", s => { s.modelSelection.reasoningEffort = "none"; }],
  ["ollama_loopback", s => { s.endpoint = "http://localhost:11434"; }],
  ["ollama_loopback", s => { s.endpoint = "http://127.0.0.1.example.invalid:11434"; }],
  ["ollama_loopback", s => { s.modelSelection.modelDigest = "unknown"; }],
  ["ollama_loopback", s => { s.config.remote = true; }],
  ["ollama_loopback", s => { s.fallback = "codex_responses"; }]
];
for (const [index, [backend, mutate]] of invalid.entries()) test(`versioned selection denies invalid case ${index}`, () => {
  const s = managedSelectionFixture(backend); mutate(s); withoutProcesses(() => assert.equal(managedBackendSelectionSchema.safeParse(s).success, false));
});
