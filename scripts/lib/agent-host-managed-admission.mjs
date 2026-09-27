import path from "node:path";
import { writeFileSync, readFileSync, mkdirSync, renameSync, lstatSync, existsSync } from "node:fs";
import { createPublicKey, verify, createHash } from "node:crypto";
import { z } from "zod";
import { nativeDigest, physicalIdentity } from "./agent-host-native-footprint.mjs";
import { fixtureRuntimeBinding } from "./agent-host-fixture-ownership.mjs";
import { writerRecoveryEvidence } from "./agent-host-writer-lock.mjs";
import { assertProviderStartup, assertProviderNativeBoundary, assertProviderReadOnlyBoundary, providerInputTransport } from "./agent-host-provider-input.mjs";
import { consumeProviderInput } from "./agent-host-provider-input.mjs";
import { nativeEvidenceSchema, managedBackendContext, managedBackendRuntime } from "./agent-host-managed-backend.mjs";
import { trustedPilotBytes, inspectTrustedPilotInstallation, proposeTrustedPilotDecision,
  trustedPilotDecisionSchema, inspectTrustedPilotDecision } from "./agent-host-trusted-pilot.mjs";
import { windowsJobSourceDigest } from "./agent-host-windows-job.mjs";
import { managedBackendVersion } from "./agent-host-model-policy.mjs";

export const managedAdmissionVersion = "roost-managed-admission-v1";
const signed = schema => z.object({ payload: schema, signature: z.string().regex(/^[a-f0-9]{128}$/) }).strict();
const response = (phase, schema) => z.object({ schemaVersion: z.literal(managedAdmissionVersion), phase: z.literal(phase), signed: signed(schema),
  ...(phase === "decision" ? { firstWrite: z.object({ decisionId: z.string().uuid(), baselineCommit: z.string().regex(/^[a-f0-9]{40}$/),
    branch: z.string().min(1).max(200), operations: z.object({ localCommit: z.literal(true) }).strict() }).strict().optional() } : {}) }).strict();
const same = (a, b) => trustedPilotBytes(a).equals(trustedPilotBytes(b));
const grants = new WeakMap();
const firstWriteSchema = z.object({ schemaVersion: z.literal("roost-first-write-admission-v1"),
  executionId: z.string().uuid(), workspaceId: z.string().uuid(), taskId: z.string().uuid(), applicationId: z.string().uuid(),
  installationId: z.string().uuid(), issuedAt: z.string().datetime(), expiresAt: z.string().datetime(),
  decisionId: z.string().uuid(), baselineCommit: z.string().regex(/^[a-f0-9]{40}$/), branch: z.string().min(1).max(200),
  operations: z.object({ localCommit: z.literal(true) }).strict() }).strict();
function fail(phase, status, reason) { throw Object.assign(new Error("managed_admission_blocked"), { protocolAdmission: true, retryable: false,
  outcome: "policy_blocked", publicMessage: "Managed launch evidence is missing, changed or not signed for this attempt.",
  ...(phase ? { details: { phase, ...(Number.isInteger(status) ? { status } : {}),
    ...(/^[a-z][a-z0-9_]{2,80}$/.test(reason ?? "") ? { reason } : {}) } } : {}) }); }
function authenticate(value, publicKey) {
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== "ed25519" || !verify(null, trustedPilotBytes(value.payload), key, Buffer.from(value.signature, "hex"))) fail();
  return value.payload;
}
function persist(file, value) {
  // A spent or earlier attempt must never be silently overwritten. The reader
  // reopens the exact file with physical identity and digest checks afterward.
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  physicalIdentity(file, false);
}

export async function requestFirstWriteAdmission({ api, claimed, writerLock, repositoryPath, provider, contract,
  baselineCommit, assertAuthority }) {
  try {
    if (contract.nativeBoundary?.profile !== "coding-local" || provider?.kind !== "hermes_codex"
        || !/^[a-f0-9]{40}$/.test(baselineCommit) || contract.singleTask.branch !== `codex/task-${claimed.taskId}`) fail();
    assertAuthority();
    const configurationPath = path.join(writerRecoveryEvidence(writerLock).directory, "trusted-provider-pilot", "installation.json");
    const installed = inspectTrustedPilotInstallation(configurationPath, { qualification: "signed_native_v1", writerLock,
      repositoryPath, envelope: { identity: { workspaceId: claimed.workspaceId }, contract } });
    const route = `/v1/agent-runtime/executions/${claimed.id}/actions/managed-admission`;
    const reply = response("first_write", firstWriteSchema).parse(await api(route, { method: "POST", body: JSON.stringify({
      schemaVersion: managedAdmissionVersion, phase: "first_write", leaseToken: claimed.leaseToken, executionId: claimed.id }) }));
    assertAuthority();
    const result = authenticate(reply.signed, installed.authorityPublicKey);
    const now = Date.now();
    if (result.executionId !== claimed.id || result.workspaceId !== claimed.workspaceId
        || result.taskId !== claimed.taskId || result.applicationId !== claimed.applicationId
        || result.installationId !== installed.installation.id || result.baselineCommit !== baselineCommit
        || result.branch !== contract.singleTask.branch || Date.parse(result.issuedAt) > now
        || Date.parse(result.expiresAt) <= now || Date.parse(result.expiresAt) - Date.parse(result.issuedAt) > 300000) fail();
    return Object.freeze(result);
  } catch (error) { fail("first_write", error?.status, error?.message); }
}

// A signed, spent admission is kept for recovery, but must not occupy the
// one-shot active filenames used by the next execution. Call only after native
// review has verified the candidate and released its application lease.
export function retireManagedAdmissionArtifacts({ directory, executionId, evidenceDigest }) {
  try {
    if (!/^[a-f0-9-]{36}$/.test(executionId ?? "") || !/^[a-f0-9]{64}$/.test(evidenceDigest ?? "")) fail();
    physicalIdentity(directory);
    const installationPath = path.join(directory, "installation.json");
    const validFile = file => {
      const stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size < 1 || stat.size > 16384) fail();
      return stat.size;
    };
    const installationBytes = validFile(installationPath);
    const installation = readFileSync(installationPath);
    if (installation.length !== installationBytes) fail();
    const anchor = JSON.parse(installation);
    if (anchor.decisionFile !== "trusted-provider-pilot.json") fail();
    const evidencePath = path.join(directory, "managed-backend-evidence.json");
    const decisionPath = path.join(directory, anchor.decisionFile);
    const evidenceBytes = validFile(evidencePath), signedDecisionBytes = validFile(decisionPath);
    const bytes = readFileSync(evidencePath), decisionBytes = readFileSync(decisionPath);
    if (bytes.length !== evidenceBytes || decisionBytes.length !== signedDecisionBytes
        || createHash("sha256").update(bytes).digest("hex") !== evidenceDigest) fail();
    const evidence = signed(nativeEvidenceSchema).parse(JSON.parse(bytes));
    const decision = signed(trustedPilotDecisionSchema).parse(JSON.parse(decisionBytes));
    if (decision.payload.scope.executionId !== executionId
        || decision.payload.provider.managedBackend?.evidence?.digest !== evidenceDigest) fail();
    authenticate(evidence, anchor.authorityPublicKey);
    authenticate(decision, anchor.authorityPublicKey);
    const spent = path.join(directory, "spent");
    if (!existsSync(spent)) mkdirSync(spent, { mode: 0o700 });
    physicalIdentity(spent);
    const target = path.join(spent, executionId);
    mkdirSync(target, { mode: 0o700 });
    physicalIdentity(target);
    renameSync(evidencePath, path.join(target, "managed-backend-evidence.json"));
    renameSync(decisionPath, path.join(target, anchor.decisionFile));
    return target;
  } catch (error) { fail("retire", undefined, error?.message); }
}

// The source is rebuilt only from local sealed startup, native boundary, live
// Writer and installed executable. No response can choose an executable or
// grant the Worker a private signing key.
export function buildManagedAdmissionSource({ envelope, claimed, writerLock, repositoryPath, provider,
  startupEnvironment, remainingMs }) {
  let phase = "preconditions";
  try {
    if (provider?.kind !== "hermes_codex" || provider?.enabled !== true || process.platform !== "win32"
      || envelope.contract.modelSelection?.schemaVersion !== managedBackendVersion
      || envelope.contract.modelSelection.backend !== "codex_responses"
      || envelope.contract.modelSelection.riskClass !== "low"
      || claimed.id !== envelope.identity.executionId || claimed.attempt !== 1 || claimed.checkpoint?.stage !== "spawn_intent"
      || remainingMs() <= 3000) fail();
    phase = "startup";
    const startup = assertProviderStartup({ envelope, provider, repositoryPath, startupEnvironment });
    phase = "native_boundary";
    const inspect = envelope.contract.nativeBoundary?.profile === "inspect-readonly";
    const native = inspect ? assertProviderReadOnlyBoundary(envelope) : assertProviderNativeBoundary(envelope);
    phase = "writer";
    const writerDigest = nativeDigest(writerRecoveryEvidence(writerLock));
    phase = "transport";
    const transport = providerInputTransport("hermes_codex", envelope);
    phase = "source_fields";
    const source = { qualification: "signed_native_v1", envelope, claimed, writerLock, repositoryPath, provider,
      runtime: { executable: fixtureRuntimeBinding(provider.executablePath), node: fixtureRuntimeBinding(process.execPath),
        launcher: { sourceDigest: windowsJobSourceDigest() } },
      configuration: { startupDigest: startup.receipt.digest, budgetDigest: startup.budgetReceipt.digest,
        nativeBoundaryDigest: native.digest, inputDigest: nativeDigest(transport.input),
        argvDigest: startup.receipt.argvDigest, environmentDigest: startup.receipt.environmentDigest },
      filesystemScope: { repositoryIdentity: physicalIdentity(repositoryPath), canonicalRootDigest: native.canonicalRootDigest,
        gitIdentityDigest: native.repositoryIdentityDigest, preFootprintDigest: native.preFootprintDigest,
        oneWriterReference: native.oneWriterReference, applicationLeaseReference: native.applicationLeaseReference,
        writePaths: inspect ? [] : envelope.contract.nativeBoundary.writePaths,
        ...(inspect ? { readPaths: envelope.contract.nativeBoundary.readPaths } : {}) },
      gates: { jobVersion: "roost-windows-job-v2", launcher: { sourceDigest: windowsJobSourceDigest() },
        originalOwnership: true, durableResume: true, cleanup: "owned_job_zero_processes", recovery: "original_b28_cleanup_only",
        outputBudget: "worker_deadline_output_intent", durationDeadline: startup.budgetReceipt.acceptedDeadline,
        release: "independent_review_no_release" } };
    return { source, writerDigest, startup, native };
  } catch (error) { fail(`source_${phase}`, error?.status, error?.message); }
}

export async function requestManagedAdmission({ api, source, writerDigest, assertAuthority, refreshLease = async () => {}, firstWrite }) {
  let phase = "installation";
  try {
    assertAuthority();
    const configurationPath = path.join(writerRecoveryEvidence(source.writerLock).directory, "trusted-provider-pilot", "installation.json");
    const installed = inspectTrustedPilotInstallation(configurationPath, source);
    const selection = source.envelope.contract.modelSelection;
    const expected = { selection, context: managedBackendContext(source, writerDigest), runtime: managedBackendRuntime(source),
      installationIdentity: installed.installation.identity, profile: installed.profile,
      availability: { backend: "installed", model: "selected_unverified", resources: "bounded_by_worker" },
      ownerAttestation: installed.ownerAttestation };
    const route = `/v1/agent-runtime/executions/${source.claimed.id}/actions/managed-admission`;
    phase = "backend_evidence_request";
    // Native startup and boundary collection above can occupy most of a short
    // lease. Confirm a fresh server lease before each signed, one-shot RPC.
    await refreshLease();
    assertAuthority();
    const evidenceReply = response("backend_evidence", nativeEvidenceSchema).parse(await api(route, { method: "POST", body: JSON.stringify({
      schemaVersion: managedAdmissionVersion, phase: "backend_evidence", leaseToken: source.claimed.leaseToken,
      executionId: source.claimed.id, source: expected }) }));
    phase = "backend_evidence_verify";
    assertAuthority();
    const evidence = authenticate(evidenceReply.signed, installed.authorityPublicKey);
    if (evidence.state !== "accepted" || Date.parse(evidence.expiresAt) - Date.parse(evidence.issuedAt) > 300000
      || !same({ selection: evidence.selection, context: evidence.context, runtime: evidence.runtime,
        installationIdentity: evidence.installationIdentity, profile: evidence.profile, availability: evidence.availability,
        ownerAttestation: evidence.ownerAttestation }, expected)) fail();
    phase = "backend_evidence_persist";
    persist(path.join(installed.directory, "managed-backend-evidence.json"), evidenceReply.signed);
    const proposal = proposeTrustedPilotDecision(configurationPath, source, writerDigest);
    phase = "decision_request";
    await refreshLease();
    assertAuthority();
    const decisionReply = response("decision", trustedPilotDecisionSchema).parse(await api(route, { method: "POST", body: JSON.stringify({
      schemaVersion: managedAdmissionVersion, phase: "decision", leaseToken: source.claimed.leaseToken,
      executionId: source.claimed.id, provider: proposal.provider, scope: proposal.scope,
      installation: proposal.installation, evidenceDigest: proposal.evidenceDigest }) }));
    phase = "decision_verify";
    assertAuthority();
    const decision = authenticate(decisionReply.signed, installed.authorityPublicKey);
    if (decision.qualification !== "signed_native_v1" || decision.state !== "accepted"
      || Date.parse(decision.expiresAt) - Date.parse(decision.decidedAt) > 300000
      || !same(decision.provider, proposal.provider) || !same(decision.scope, proposal.scope)
      || decision.installationId !== proposal.installation.id
      || decision.installationIdentity !== proposal.installation.identity
      || decision.configurationIdentity !== proposal.installation.configurationIdentity) fail();
    phase = "decision_persist";
    persist(installed.decisionFile, decisionReply.signed);
    const acceptance = inspectTrustedPilotDecision(configurationPath, source, writerDigest);
    if (!same(acceptance.provider, proposal.provider) || !same(acceptance.scope, proposal.scope)) fail();
    const requiresFirstWrite = source.envelope.contract.nativeBoundary?.profile === "coding-local";
    if (!requiresFirstWrite ? decisionReply.firstWrite !== undefined || firstWrite !== undefined
      : !decisionReply.firstWrite || !firstWrite || decisionReply.firstWrite.decisionId !== firstWrite.decisionId
        || decisionReply.firstWrite.baselineCommit !== firstWrite.baselineCommit
        || decisionReply.firstWrite.branch !== firstWrite.branch
        || !decisionReply.firstWrite.operations.localCommit) fail();
    if (requiresFirstWrite && decisionReply.firstWrite.baselineCommit !== source.envelope.evidence.risk.value.commit) fail();
    await refreshLease();
    assertAuthority();
    const grant = Object.freeze({});
    grants.set(grant, { source, writerDigest, acceptance, firstWrite: decisionReply.firstWrite, used: false });
    return grant;
  } catch (error) { fail(phase, error?.status, error?.message); }
}

export function consumeManagedAdmission(grant, options, consumption) {
  const saved = grants.get(grant);
  if (!saved || saved.used) fail();
  saved.used = true;
  try {
    const { source, writerDigest, acceptance } = saved;
    const inspect = source.envelope.contract.nativeBoundary?.profile === "inspect-readonly";
    if (options.envelope !== source.envelope || options.provider?.kind !== "hermes_codex"
      || options.provider !== source.provider || options.repositoryPath !== source.repositoryPath
      || options.writerLock !== source.writerLock || consumption.claimed !== source.claimed
      || options.sandbox !== (inspect ? "read-only" : "workspace-write")) fail();
    consumption.assertAuthority();
    const freshWriterDigest = nativeDigest(writerRecoveryEvidence(source.writerLock));
    if (freshWriterDigest !== writerDigest || windowsJobSourceDigest() !== source.gates.launcher.sourceDigest) fail();
    if (!same(fixtureRuntimeBinding(options.provider.executablePath), source.runtime.executable)
      || !same(fixtureRuntimeBinding(process.execPath), source.runtime.node)) fail();
    const configurationPath = path.join(writerRecoveryEvidence(source.writerLock).directory,
      "trusted-provider-pilot", "installation.json");
    const current = inspectTrustedPilotDecision(configurationPath, source, writerDigest);
    if (!same(current, acceptance)) fail();
    const startup = assertProviderStartup(options), native = inspect ? assertProviderReadOnlyBoundary(options.envelope)
      : assertProviderNativeBoundary(options.envelope);
    if (startup.receipt.digest !== source.configuration.startupDigest
      || startup.budgetReceipt.digest !== source.configuration.budgetDigest
      || native.digest !== source.configuration.nativeBoundaryDigest) fail();
    const transport = providerInputTransport("hermes_codex", options.envelope);
    if (nativeDigest(transport.input) !== source.configuration.inputDigest) fail();
    consumeProviderInput(options.envelope, consumption);
    const assertLaunchAuthority = () => {
      consumption.assertAuthority();
      if (nativeDigest(writerRecoveryEvidence(source.writerLock)) !== writerDigest
        || windowsJobSourceDigest() !== source.gates.launcher.sourceDigest
        || !same(fixtureRuntimeBinding(options.provider.executablePath), source.runtime.executable)
        || !same(fixtureRuntimeBinding(process.execPath), source.runtime.node)
        || !same(inspectTrustedPilotDecision(configurationPath, source, writerDigest), acceptance)) fail();
    };
    if (source.envelope.contract.nativeBoundary?.profile === "coding-local"
        && (!saved.firstWrite || saved.firstWrite.baselineCommit !== consumption.currentCommit)) fail();
    return Object.freeze({ version: "roost-managed-hermes-launch-v1", kind: "hermes_codex",
      command: startup.candidate.command, args: startup.candidate.args, cwd: startup.candidate.cwd,
      candidateEnvironment: startup.candidate.environment, input: transport.input,
      budgetReceipt: startup.budgetReceipt, ...(inspect ? { readOnlyToolReceipt: native } : { nativeToolReceipt: native }),
      expectedJobSourceDigest: source.gates.launcher.sourceDigest,
      managedBackend: current.provider.managedBackend, trustedPilot: current, assertLaunchAuthority });
  } catch { fail(); }
}
