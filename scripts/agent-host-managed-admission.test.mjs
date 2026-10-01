import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";
import childProcess, { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { createManagedBackendFixture, managedSelectionFixture } from "./fixtures/trusted-pilot.mjs";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { inspectFixedContainment } from "./lib/agent-host-fixed-execution.mjs";
import { nativeDigest, physicalIdentity } from "./lib/agent-host-native-footprint.mjs";
import { writerRecoveryEvidence } from "./lib/agent-host-writer-lock.mjs";
import { createOwnerAttestation } from "./lib/agent-host-hermes-owner-auth.mjs";
import { managedOwnerBinding, nativeEvidenceSchema } from "./lib/agent-host-managed-backend.mjs";
import { trustedPilotBytes, trustedPilotDecisionSchema } from "./lib/agent-host-trusted-pilot.mjs";
import { requestManagedAdmission, requestFirstWriteAdmission, buildManagedAdmissionSource, retireManagedAdmissionArtifacts, reserveManagedDispatch } from "./lib/agent-host-managed-admission.mjs";
import { prepareProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import { prepareProviderInput, assertProviderStartup, abandonProviderNativeBoundary } from "./lib/agent-host-provider-input.mjs";
import { collectReadOnlyRepositoryEvidence } from "./lib/agent-host-readonly-boundary.mjs";
import { renderHermesNativeProfile, hermesNativeProfileBinding } from "./lib/agent-host-hermes-profile.mjs";
import { hermesStartupEnvironment, hermesStartupMaxAgeMs } from "./lib/agent-host-hermes-startup.mjs";
import { readDurableNativeReview } from "./lib/agent-host-native-review.mjs";
import { qualifyNativeReconciliation, issueNativeReconciliationApproval, reconcileNativeArtifacts } from "./lib/agent-host-native-reconciliation.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { acquireApplicationLease, releaseApplicationLease } from "./lib/agent-host-application-lease.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
async function signedAdmissionFixture(t, settings = {}) {
  const x = await createManagedBackendFixture(t, "codex_responses");
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  x.profile.qualification = "signed_native_v1";
  fs.writeFileSync(x.profilePath, trustedPilotBytes(x.profile));
  const profileDigest = sha(fs.readFileSync(x.profilePath));
  const owner = createOwnerAttestation(managedOwnerBinding(x.profilePath, profileDigest));
  fs.writeFileSync(x.authPath, owner.bytes);
  fs.writeFileSync(x.configurationPath, trustedPilotBytes({ schemaVersion: "roost-trusted-provider-pilot-v1",
    installationId: x.anchor.installationId, workspaceId: x.anchor.workspaceId,
    authorityPublicKey: publicKey.export({ type: "spki", format: "pem" }),
    decisionFile: "trusted-provider-pilot.json", profileFile: "trusted-provider-profile.json",
    qualification: "signed_native_v1" }));
  fs.unlinkSync(x.evidencePath); fs.unlinkSync(x.decisionPath);
  const source = inspectFixedContainment(x.grant);
  source.qualification = "signed_native_v1";
  source.gates.launcher = { sourceDigest: source.gates.launcher.sourceDigest };
  source.gates.outputBudget = "worker_deadline_output_intent";
  const writerDigest = nativeDigest(writerRecoveryEvidence(x.options.writerLock));
  const signed = payload => ({ payload, signature: sign(null, trustedPilotBytes(payload), privateKey).toString("hex") });
  let phases = [], renewals = 0, order = [];
  const api = async (_route, options) => {
    const request = JSON.parse(options.body); phases.push(request.phase); order.push(request.phase);
    if (request.phase === "backend_evidence") {
      assert.equal(request.source.ownerAttestation.digest, owner.binding.digest);
      const payload = nativeEvidenceSchema.parse({ ...request.source,
        signatureDomain: "roost-managed-backend-evidence-v1", schemaVersion: "roost-managed-hermes-backend-v1",
        id: x.record.id, state: "accepted", issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 120000).toISOString(), purpose: "managed-agent", qualification: "signed_native_v1" });
      settings.mutateBackend?.(payload);
      const record = signed(payload);
      if (settings.invalidSignature) record.signature = "0".repeat(128);
      return { schemaVersion: "roost-managed-admission-v1", phase: request.phase, signed: record };
    }
    assert.equal(request.phase, "decision");
    assert.equal(request.installation.identity, physicalIdentity(x.privateRoot));
    const payload = trustedPilotDecisionSchema.parse({ ...x.payload, provider: request.provider, scope: request.scope,
      decisionId: x.payload.decisionId, revision: 1, state: "accepted", decidedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 120000).toISOString(), installationId: request.installation.id,
      installationIdentity: request.installation.identity, configurationIdentity: request.installation.configurationIdentity,
      qualification: "signed_native_v1" });
    settings.mutateDecision?.(payload);
    return { schemaVersion: "roost-managed-admission-v1", phase: request.phase, signed: signed(payload) };
  };
  if (settings.prepareOnly) return { ...x, source, writerDigest, api, signed, phases };
  const grant = await requestManagedAdmission({ api, source, writerDigest, assertAuthority() {},
    refreshLease: async () => { renewals += 1; order.push("lease"); } });
  assert.ok(grant);
  assert.equal(renewals, 3);
  assert.deepEqual(order, ["lease", "backend_evidence", "lease", "decision", "lease"]);
  assert.deepEqual(phases, ["backend_evidence", "decision"]);
  assert.ok(fs.statSync(x.decisionPath).size > 0);
  const evidenceDigest = sha(fs.readFileSync(x.evidencePath));
  const executionId = JSON.parse(fs.readFileSync(x.decisionPath, "utf8")).payload.scope.executionId;
  return { ...x, evidenceDigest, executionId };
}
const windows = { skip: process.platform !== "win32", timeout: 60000 };

for (const scenario of ["current", "cold_preparation", "expired_startup", "repository_changed_before_signing", "repository_changed_after_signing", "process_changed_before_signing", "docker_changed_before_signing", "tcp_observation_timeout_before_signing", "docker_observation_timeout_before_signing"]) test(`signed managed read-only retry-zero launch: ${scenario}`, windows, async t => {
  const x = await nativeFixture(t, { prepare: false });
  const selection = managedSelectionFixture("codex_responses");
  selection.attemptPolicy = { ...selection.attemptPolicy, maxTurns: 2, apiMaxRetries: 0 };
  const c = x.f.packet.contract;
  c.modelSelection = selection;
  c.nativeBoundary = { profile: "inspect-readonly", readPaths: ["editable.txt"], runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "auditor" } };
  c.access = { ...c.access, tools: ["repository_read"], permissions: ["repository_read"], sandbox: "read-only" };
  x.f.packet.procedureComposition.fields.tools = ["repository_read"];
  pinReadyFixture(x.f);
  x.f.taskContext.readyAdmission.riskAdmission.commit = x.options.currentCommit;
  x.f.claimed.metadata.readyContextPin.riskAdmissionCommit = x.options.currentCommit;
  x.provider.profile = hermesNativeProfileBinding(path.join(x.home, "config.yaml"), { apiMaxRetries: 0 });
  fs.writeFileSync(x.provider.profile.profilePath, renderHermesNativeProfile({ apiMaxRetries: 0 }));
  const owner = createOwnerAttestation(x.provider.profile); x.provider.profile.ownerAttestation = owner.binding;
  fs.writeFileSync(path.join(x.home, "owner-attestation.json"), owner.bytes);
  fs.writeFileSync(x.provider.executablePath, "closed fixture executable, never spawned\n");
  for (const relative of ["toolsets.py", "model_tools.py", "cli.py", "agent/agent_init.py", "agent/coding_context.py", "hermes_cli/oneshot.py"]) {
    const file = path.join(x.install, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, "# closed fixture source\n");
  }
  const originalExec = childProcess.execFileSync;
  let observedProcess = "closed_fixture_listeners\n", observedDocker = "";
  // Only external observation/qualification output is substituted. The real
  // profile, startup, Ready, input, signatures, writer, lease and launch readers run.
  childProcess.execFileSync = (command, args, options) => {
    if (command === "powershell" && args?.includes("Get-NetTCPConnection -State Listen | Sort-Object LocalAddress,LocalPort,OwningProcess | ForEach-Object { '{0}|{1}|{2}' -f $_.LocalAddress,$_.LocalPort,$_.OwningProcess }")) {
      if (observedProcess instanceof Error) throw observedProcess;
      return observedProcess;
    }
    if (command === "docker" && args?.[0] === "ps") {
      if (observedDocker instanceof Error) throw observedDocker;
      return observedDocker;
    }
    if (options?.cwd === x.install && command === "git") return args.includes("rev-parse") ? x.provider.commit : "";
    if (command === path.join(x.install, "venv", "Scripts", "python.exe")) return "[[], []]\n";
    return originalExec(command, args, options);
  };
  syncBuiltinESMExports();
  let envelope; const originalNow = Date.now;
  try {
    const startupEnvironment = hermesStartupEnvironment(x.provider.profile, { SYSTEMROOT: process.env.SystemRoot ?? "C:\\Windows" }, x.repositoryPath);
    const repositoryEvidence = collectReadOnlyRepositoryEvidence({ repositoryPath: x.repositoryPath,
      expected: x.options.nativeBoundaryOptions.expected, paths: c.nativeBoundary.readPaths });
    envelope = prepareProviderInput({ ...x.options, startupEnvironment, repositoryEvidence });
    x.f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
    if (scenario === "cold_preparation") Date.now = () => originalNow() + 208500;
    const sourceOptions = { envelope, claimed: x.f.claimed, writerLock: x.writerLock,
      repositoryPath: x.repositoryPath, provider: x.provider, startupEnvironment, remainingMs: () => 300000 };
    if (scenario.endsWith("_before_signing")) {
      const boundaryReason = scenario.replace("_before_signing", "");
      if (boundaryReason === "repository_changed") fs.writeFileSync(path.join(x.repositoryPath, "editable.txt"), "changed after read-only sealing\n");
      if (boundaryReason === "process_changed") observedProcess = "changed_fixture_listeners\n";
      if (boundaryReason === "docker_changed") observedDocker = "changed_fixture_container\n";
      if (boundaryReason === "tcp_observation_timeout" || boundaryReason === "docker_observation_timeout") {
        const timeout = Object.assign(Error("Synthetic private path and raw output must not escape"), { code: "ETIMEDOUT" });
        if (boundaryReason === "tcp_observation_timeout") observedProcess = timeout;
        else observedDocker = timeout;
      }
      assert.throws(() => buildManagedAdmissionSource(sourceOptions), e => e.details?.phase === "source_native_boundary"
        && e.details?.reason === "readonly_boundary_unproven" && e.details?.boundaryReason === boundaryReason);
      assert.equal(fs.existsSync(path.join(x.state, "trusted-provider-pilot")), false);
      return;
    }
    const prepared = buildManagedAdmissionSource(sourceOptions);
    const directory = path.join(x.state, "trusted-provider-pilot"); fs.mkdirSync(directory);
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const installationId = "00000000-0000-4000-8000-000000000070";
    fs.writeFileSync(path.join(directory, "installation.json"), trustedPilotBytes({ schemaVersion: "roost-trusted-provider-pilot-v1",
      installationId, workspaceId: x.f.claimed.workspaceId, authorityPublicKey: publicKey.export({ type: "spki", format: "pem" }),
      decisionFile: "trusted-provider-pilot.json", profileFile: "trusted-provider-profile.json", qualification: "signed_native_v1" }));
    const profilePath = path.join(directory, "trusted-provider-profile.json");
    fs.writeFileSync(profilePath, trustedPilotBytes({ schemaVersion: "roost-trusted-provider-pilot-v1", purpose: "managed-agent",
      providerKind: "hermes_codex", version: x.provider.version, backend: "codex_responses", fallback: "none",
      modelSelection: selection, qualification: "signed_native_v1" }));
    const managedOwner = createOwnerAttestation(managedOwnerBinding(profilePath, sha(fs.readFileSync(profilePath))));
    fs.writeFileSync(path.join(directory, "owner-attestation.json"), managedOwner.bytes);
    const api = async (_route, options) => {
      const r = JSON.parse(options.body), now = Date.now();
      const common = { state: "accepted", expiresAt: new Date(now + 240000).toISOString() };
      const payload = r.phase === "backend_evidence"
        ? nativeEvidenceSchema.parse({ ...r.source, ...common, issuedAt: new Date(now).toISOString(),
          schemaVersion: "roost-managed-hermes-backend-v1", signatureDomain: "roost-managed-backend-evidence-v1",
          id: "00000000-0000-4000-8000-000000000071", purpose: "managed-agent", qualification: "signed_native_v1" })
        : trustedPilotDecisionSchema.parse({ ...common, schemaVersion: "roost-trusted-provider-pilot-v1",
          decisionId: "00000000-0000-4000-8000-000000000072", revision: 1, decidedAt: new Date(now).toISOString(),
          installationId, installationIdentity: r.installation.identity, configurationIdentity: r.installation.configurationIdentity,
          provider: r.provider, scope: r.scope, mode: "trusted_provider_pilot", systemIsolation: false,
          arbitraryProviderAdmission: false, fullAutonomy: false, residualRiskAccepted: true,
          acknowledgement: "windows_account_authority_not_os_isolation", qualification: "signed_native_v1" });
      return { schemaVersion: "roost-managed-admission-v1", phase: r.phase,
        signed: { payload, signature: sign(null, trustedPilotBytes(payload), privateKey).toString("hex") } };
    };
    const grant = await requestManagedAdmission({ api, ...prepared, assertAuthority() {} });
    const options = { provider: x.provider, envelope, repositoryPath: x.repositoryPath, writerLock: x.writerLock,
      startupEnvironment, sandbox: "read-only", managedAdmission: grant };
    if (scenario === "expired_startup") {
      // Test the local seal directly beyond its exported bound. Do not invent
      // a signed pair that lasts beyond the independent five-minute cap.
      Date.now = () => originalNow() + hermesStartupMaxAgeMs + 1000;
      assert.throws(() => assertProviderStartup(options), /hermes_startup_receipt_expired/);
      Date.now = originalNow;
    } else if (scenario === "repository_changed_after_signing") {
      fs.writeFileSync(path.join(x.repositoryPath, "editable.txt"), "changed after signed admission\n");
      assert.throws(() => prepareProviderLaunch(options, x.options), e => e.details?.phase === "consume_native_boundary"
        && e.details?.reason === "readonly_boundary_unproven" && e.details?.boundaryReason === "repository_changed");
    } else {
      const plan = prepareProviderLaunch(options, x.options);
      assert.equal(plan.version, "roost-managed-hermes-launch-v1");
      assert.equal(plan.budgetReceipt.apiMaxRetries, 0); assert.deepEqual(plan.readOnlyToolReceipt.nativeTools, []);
      assert.equal(plan.readOnlyToolReceipt.readPaths.join(), "editable.txt");
    }
    if (scenario !== "expired_startup") assert.throws(() => prepareProviderLaunch(options, x.options), e => e.details?.phase === "consume_grant");
  } finally {
    Date.now = originalNow;
    observedProcess = "closed_fixture_listeners\n"; observedDocker = "";
    if (envelope) {
      try { abandonProviderNativeBoundary(envelope); }
      catch (error) {
        // Deliberate repository drift also fences normal abort. The enclosing
        // nativeFixture owns and verifies deletion of this disposable test root.
        if (!scenario.includes("_changed_")) throw error;
        assert.equal(error.message, "readonly_boundary_unproven");
      }
    }
    childProcess.execFileSync = originalExec; syncBuiltinESMExports();
  }
});

const future = (payload, field, offset = 100) => {
  payload[field] = new Date(Date.now() + offset).toISOString();
  payload.expiresAt = new Date(Date.now() + offset + 120000).toISOString();
};
test("authenticated near-future backend and decision wait until current without starting a model", windows, async t => {
  const x = await signedAdmissionFixture(t, { prepareOnly: true,
    mutateBackend: p => future(p, "issuedAt"), mutateDecision: p => future(p, "decidedAt") });
  let checks = 0;
  const began = performance.now();
  const grant = await requestManagedAdmission({ ...x, assertAuthority() { checks += 1; } });
  assert.ok(grant); assert.ok(performance.now() - began >= 180); assert.ok(checks >= 8);
  for (const file of [x.evidencePath, x.decisionPath]) {
    const payload = JSON.parse(fs.readFileSync(file)).payload;
    assert.ok(Date.parse(payload.issuedAt ?? payload.decidedAt) <= Date.now());
  }
  assert.deepEqual(x.phases, ["backend_evidence", "decision"]);
});

for (const phase of ["backend", "decision"]) {
  for (const fault of ["far_future", "expired", "reversed_window", "overlong_window", "lease_lost", "authority_lost", "duration_exceeded", "changed_contract"]) {
    test(`${phase} issuance rejects ${fault} before publishing that admission`, windows, async t => {
      const field = phase === "backend" ? "issuedAt" : "decidedAt";
      let waitingAt = null;
      const mutate = p => {
        future(p, field, fault === "far_future" ? 10000 : 100);
        if (fault === "expired") { p[field] = new Date(Date.now() - 2000).toISOString(); p.expiresAt = new Date(Date.now() - 1000).toISOString(); }
        if (fault === "reversed_window") p.expiresAt = new Date(Date.parse(p[field]) - 1).toISOString();
        if (fault === "overlong_window") p.expiresAt = new Date(Date.parse(p[field]) + 300001).toISOString();
        if (fault === "changed_contract") {
          if (phase === "backend") p.selection.modelSelection.model = "gpt-6-astra";
          else p.scope.inputSeal = "0".repeat(64);
        }
        waitingAt = performance.now();
      };
      const x = await signedAdmissionFixture(t, { prepareOnly: true,
        ...(phase === "backend" ? { mutateBackend: mutate } : { mutateDecision: mutate }) });
      await assert.rejects(requestManagedAdmission({ ...x, assertAuthority() {
        if (["lease_lost", "authority_lost", "duration_exceeded"].includes(fault) && waitingAt !== null && performance.now() - waitingAt >= 10)
          throw Error(fault);
      } }), error => error.message === "managed_admission_blocked"
        && error.details.phase === (phase === "backend" ? "backend_evidence_verify" : "decision_verify"));
      assert.equal(fs.existsSync(phase === "backend" ? x.evidencePath : x.decisionPath), false);
      assert.deepEqual(x.phases, phase === "backend" ? ["backend_evidence"] : ["backend_evidence", "decision"]);
    });
  }
}

test("unauthenticated future issuance fails immediately without waiting or persisting", windows, async t => {
  const x = await signedAdmissionFixture(t, { prepareOnly: true, invalidSignature: true,
    mutateBackend: p => future(p, "issuedAt", 4000) });
  const began = performance.now();
  await assert.rejects(requestManagedAdmission({ ...x, assertAuthority() {} }), /managed_admission_blocked/);
  assert.ok(performance.now() - began < 1000); assert.equal(fs.existsSync(x.evidencePath), false);
});

for (const fault of [null, "far_future", "expired", "lease_lost", "wrong_commit"]) {
  test(`first-write authenticated issuance ${fault ?? "waits until current"} preserves the write fence`, windows, async t => {
    const x = await signedAdmissionFixture(t, { prepareOnly: true }), claimed = x.f.claimed;
    const contract = structuredClone(x.options.envelope.contract);
    contract.nativeBoundary = { profile: "coding-local" };
    contract.singleTask.branch = `codex/task-${claimed.taskId}`;
    let waitingAt = null;
    const api = async () => {
      const payload = { schemaVersion: "roost-first-write-admission-v1", executionId: claimed.id,
        workspaceId: claimed.workspaceId, taskId: claimed.taskId, applicationId: claimed.applicationId,
        installationId: x.anchor.installationId, decisionId: x.payload.decisionId,
        baselineCommit: "a".repeat(40), branch: contract.singleTask.branch, operations: { localCommit: true } };
      future(payload, "issuedAt", fault === "far_future" ? 10000 : 100);
      if (fault === "expired") { payload.issuedAt = new Date(Date.now() - 2000).toISOString(); payload.expiresAt = new Date(Date.now() - 1000).toISOString(); }
      if (fault === "wrong_commit") payload.baselineCommit = "b".repeat(40);
      waitingAt = performance.now();
      return { schemaVersion: "roost-managed-admission-v1", phase: "first_write", signed: x.signed(payload) };
    };
    const promise = requestFirstWriteAdmission({ api, claimed, writerLock: x.options.writerLock,
      repositoryPath: x.options.repositoryPath, provider: { kind: "hermes_codex" }, contract,
      baselineCommit: "a".repeat(40), assertAuthority() {
        if (fault === "lease_lost" && waitingAt !== null && performance.now() - waitingAt >= 10) throw Error("lease_lost");
      } });
    if (fault) await assert.rejects(promise, /managed_admission_blocked/);
    else { const grant = await promise; assert.ok(Date.parse(grant.issuedAt) <= Date.now()); }
    assert.equal(fs.existsSync(x.evidencePath), false); assert.equal(fs.existsSync(x.decisionPath), false);
  });
}
test("two-phase signed admission binds Worker evidence and accepted decision without a model process", windows, async t => {
  const x = await signedAdmissionFixture(t), { evidenceDigest, executionId } = x;
  assert.throws(() => retireManagedAdmissionArtifacts({ directory: x.privateRoot,
    executionId: "00000000-0000-4000-8000-000000000000", evidenceDigest }), /managed_admission_blocked/);
  assert.ok(fs.existsSync(x.evidencePath));
  const archive = retireManagedAdmissionArtifacts({ directory: x.privateRoot, executionId, evidenceDigest });
  assert.equal(fs.existsSync(x.evidencePath), false);
  assert.equal(fs.existsSync(x.decisionPath), false);
  assert.ok(fs.existsSync(`${archive}/managed-backend-evidence.json`));
  assert.ok(fs.existsSync(`${archive}/trusted-provider-pilot.json`));
  assert.equal(retireManagedAdmissionArtifacts({ directory: x.privateRoot, executionId, evidenceDigest }), archive);
});

test("managed dispatch reserves exact signed identity durably, rejects changed identity and replay", windows, async t => {
  const x = await signedAdmissionFixture(t);
  const options = { writerLock: x.options.writerLock, identity: x.options.envelope.identity, evidenceDigest: x.evidenceDigest };
  assert.throws(() => reserveManagedDispatch({ ...options, identity: { ...options.identity, taskId: "00000000-0000-4000-8000-000000000000" } }), /managed_admission_blocked/);
  const file = reserveManagedDispatch(options), bytes = fs.readFileSync(file);
  assert.deepEqual(JSON.parse(bytes), { state: "dispatch_reserved", scope: "managed_hermes_native",
    attemptDigest: nativeDigest(options.identity), decisionId: x.payload.decisionId, evidenceDigest: x.evidenceDigest });
  assert.throws(() => reserveManagedDispatch(options), /managed_admission_blocked/);
  assert.ok(fs.readFileSync(file).equals(bytes));
});

test("admission retirement recognizes a completed first rename before retry and preserves exact pair", windows, async t => {
  const x = await signedAdmissionFixture(t), options = { directory: x.privateRoot, executionId: x.executionId, evidenceDigest: x.evidenceDigest };
  const originals = [x.evidencePath, x.decisionPath].map(file => {
    const stat = fs.lstatSync(file, { bigint: true });
    return { file, bytes: fs.readFileSync(file), identity: `${stat.dev}:${stat.ino}` };
  });
  const originalRename = fs.renameSync;
  fs.renameSync = (from, to) => { originalRename(from, to); throw Error("synthetic_after_rename_interruption"); };
  syncBuiltinESMExports();
  try { assert.throws(() => retireManagedAdmissionArtifacts(options), /managed_admission_blocked/); }
  finally { fs.renameSync = originalRename; syncBuiltinESMExports(); }
  assert.equal(fs.existsSync(x.evidencePath), false); assert.equal(fs.existsSync(x.decisionPath), true);
  const target = retireManagedAdmissionArtifacts(options);
  for (const original of originals) {
    const archived = path.join(target, path.basename(original.file));
    assert.ok(fs.readFileSync(archived).equals(original.bytes));
    const stat = fs.lstatSync(archived, { bigint: true });
    assert.equal(`${stat.dev}:${stat.ino}`, original.identity);
    assert.equal(fs.existsSync(original.file), false);
  }
  assert.equal(retireManagedAdmissionArtifacts(options), target);
});

for (const fault of ["duplicate", "foreign", "changed"]) test(`admission retirement refuses ${fault} archive without replacing any files`, windows, async t => {
  const x = await signedAdmissionFixture(t), target = path.join(x.privateRoot, "spent", x.executionId);
  fs.mkdirSync(target, { recursive: true });
  const archiveEvidence = path.join(target, "managed-backend-evidence.json");
  if (fault === "duplicate") fs.copyFileSync(x.evidencePath, archiveEvidence);
  if (fault === "foreign") fs.writeFileSync(path.join(target, "foreign.json"), "{}\n");
  if (fault === "changed") { fs.renameSync(x.evidencePath, archiveEvidence); fs.writeFileSync(archiveEvidence, "{}\n"); }
  const tracked = [x.evidencePath, x.decisionPath, ...fs.readdirSync(target).map(name => path.join(target, name))].filter(file => fs.existsSync(file));
  const before = tracked.map(file => fs.readFileSync(file));
  assert.throws(() => retireManagedAdmissionArtifacts({ directory: x.privateRoot, executionId: x.executionId, evidenceDigest: x.evidenceDigest }), /managed_admission_blocked/);
  tracked.forEach((file, index) => assert.ok(fs.readFileSync(file).equals(before[index])));
});

test("failed managed native review reconciles exact stopped Windows Job, retains spent and permits next lease", windows, async t => {
  const x = await signedAdmissionFixture(t), root = path.join(x.root, "managed-recovery");
  fs.mkdirSync(root);
  const template = path.join(root, "template.json");
  fs.writeFileSync(template, JSON.stringify({ backend: JSON.parse(fs.readFileSync(x.evidencePath)).payload,
    decision: JSON.parse(fs.readFileSync(x.decisionPath)).payload }));
  const child = fileURLToPath(new URL("./fixtures/managed-native-recovery-child.mjs", import.meta.url));
  const { stdout } = await promisify(execFile)(process.execPath, [child, root, template], { windowsHide: true, timeout: 30000, maxBuffer: 16384 });
  const recovery = JSON.parse(stdout), review = readDurableNativeReview(recovery.directory);
  assert.equal(review.payload.public.verdict, "acceptance_failed");
  assert.equal(review.payload.binding.spent.record.scope, "managed_hermes_native");
  assert.equal(review.payload.job.activeProcesses, 0); assert.equal(review.payload.job.jobClosed, true);
  const spentBytes = fs.readFileSync(recovery.spentPath);
  assert.equal(qualifyNativeReconciliation(recovery.directory).eligible, true);
  const grant = issueNativeReconciliationApproval({ directory: recovery.directory, assertOwnerAuthority() {} });
  assert.equal(reconcileNativeArtifacts(grant).completed, true);
  assert.ok(fs.readFileSync(recovery.spentPath).equals(spentBytes));
  retireManagedAdmissionArtifacts({ directory: recovery.installation, executionId: recovery.identity.executionId,
    evidenceDigest: recovery.evidenceDigest });
  const writer = await acquireWriterLock(recovery.state);
  const lease = acquireApplicationLease({ writerLock: writer, applicationId: recovery.identity.applicationId,
    attempt: "00000000-0000-4000-8000-000000000001", runtime: { required: false, ports: [] } });
  releaseApplicationLease(lease); await writer.release();
});
