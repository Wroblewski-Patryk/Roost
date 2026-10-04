import path from "node:path";
import { writeFileSync, readFileSync, mkdirSync, renameSync, lstatSync, existsSync, readdirSync, openSync, fsyncSync, closeSync } from "node:fs";
import { createPublicKey, verify } from "node:crypto";
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
import { bindNativeSpentRecord } from "./agent-host-hermes-native-boundary.mjs";
import { nativeArtifactSnapshot } from "./agent-host-native-review.mjs";
import { existingCommitVerificationSchema } from "./agent-host-native-authority.mjs";

export const managedAdmissionVersion = "roost-managed-admission-v1";
const signed = schema => z.object({ payload: schema, signature: z.string().regex(/^[a-f0-9]{128}$/) }).strict();
const authorityShape = z.object({ decisionId: z.string().uuid(), baselineCommit: z.string().regex(/^[a-f0-9]{40}$/),
    branch: z.string().min(1).max(200), operations: z.object({ localCommit: z.boolean() }).strict(),
    continuation: z.object({ reviewId: z.string().uuid(), previousExecutionId: z.string().uuid(),
      previousCommit: z.string().regex(/^[a-f0-9]{40}$/) }).strict().optional(),
    operation: z.literal("verify_existing_local_commit").optional(),
    existingCommitVerification: existingCommitVerificationSchema.extend({closureDigest:z.string().regex(/^[a-f0-9]{64}$/)}).optional()
}).strict();
const validAuthority = value => value.existingCommitVerification
  ? !value.continuation && value.operation === "verify_existing_local_commit" && value.operations.localCommit === false
  : value.operation === undefined && value.operations.localCommit === true;
const response = (phase, schema) => z.object({ schemaVersion: z.literal(managedAdmissionVersion), phase: z.literal(phase), signed: signed(schema),
  ...(phase === "decision" ? { firstWrite: authorityShape.refine(validAuthority).optional() } : {}) }).strict();
const same = (a, b) => trustedPilotBytes(a).equals(trustedPilotBytes(b));
const grants = new WeakMap();
const firstWriteSchema = authorityShape.extend({ schemaVersion: z.literal("roost-first-write-admission-v1"),
  executionId: z.string().uuid(), workspaceId: z.string().uuid(), taskId: z.string().uuid(), applicationId: z.string().uuid(),
  installationId: z.string().uuid(), issuedAt: z.string().datetime(), expiresAt: z.string().datetime(),
}).strict().refine(validAuthority);
function fail(phase, status, reason, boundaryReason) { throw Object.assign(new Error("managed_admission_blocked"), { protocolAdmission: true, retryable: false,
  outcome: "policy_blocked", publicMessage: "Managed launch evidence is missing, changed or not signed for this attempt.",
  ...(phase ? { details: { phase, ...(Number.isInteger(status) ? { status } : {}),
    ...(/^[a-z][a-z0-9_]{2,80}$/.test(reason ?? "") ? { reason } : {}),
    ...(/^[a-z][a-z0-9_]{2,80}$/.test(boundaryReason ?? "") ? { boundaryReason } : {}) } } : {}) }); }
function authenticate(value, publicKey) {
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== "ed25519" || !verify(null, trustedPilotBytes(value.payload), key, Buffer.from(value.signature, "hex"))) fail();
  return value.payload;
}
// Wait only for an already authenticated, exact receipt. A slightly advanced
// server clock does not admit a future grant: the existing readers still require
// it to be current locally. Poll authority so lease, stop and duration fences
// remain effective during the bounded wait; monotonic time caps clock changes.
async function awaitCurrentIssuance(issuedAt, expiresAt, assertAuthority) {
  const start = Date.parse(issuedAt), end = Date.parse(expiresAt), now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 300000
      || end <= now || start - now > 5000) fail();
  const began = performance.now();
  for (;;) {
    assertAuthority();
    const remaining = 5000 - (performance.now() - began);
    if (remaining <= 0) fail();
    const current = Date.now();
    if (end <= current) fail();
    if (start <= current) return;
    await new Promise(resolve => setTimeout(resolve, Math.min(50, start - current, remaining)));
  }
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
      schemaVersion: managedAdmissionVersion, phase: "first_write", leaseToken: claimed.leaseToken, executionId: claimed.id,
      ...(contract.nativeBoundary.existingCommitVerification ? {existingCommitVerification:contract.nativeBoundary.existingCommitVerification} : {}) }) }));
    assertAuthority();
    const result = authenticate(reply.signed, installed.authorityPublicKey);
    if (result.executionId !== claimed.id || result.workspaceId !== claimed.workspaceId
        || result.taskId !== claimed.taskId || result.applicationId !== claimed.applicationId
        || result.installationId !== installed.installation.id || result.baselineCommit !== baselineCommit
        || result.branch !== contract.singleTask.branch
        || result.continuation && result.continuation.previousCommit !== baselineCommit
        || Boolean(result.existingCommitVerification) !== Boolean(contract.nativeBoundary.existingCommitVerification)
        || result.existingCommitVerification && (!same(existingCommitVerificationSchema.parse(Object.fromEntries(Object.entries(result.existingCommitVerification).filter(([key])=>key!=="closureDigest"))),contract.nativeBoundary.existingCommitVerification)
          || result.existingCommitVerification.previousCommit !== baselineCommit)) fail();
    await awaitCurrentIssuance(result.issuedAt, result.expiresAt, assertAuthority);
    return Object.freeze(result);
  } catch (error) { fail("first_write", error?.status, error?.message); }
}

function admissionFile(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size < 1 || stat.size > 16384) fail();
  return nativeArtifactSnapshot(file);
}
function admissionAnchor(directory) {
  physicalIdentity(directory);
  const anchor = admissionFile(path.join(directory, "installation.json")).record;
  if (anchor.decisionFile !== "trusted-provider-pilot.json") fail();
  return anchor;
}
function verifyAdmissionPair(evidence, decision, anchor, executionId, evidenceDigest) {
  const backend = signed(nativeEvidenceSchema).parse(evidence.record);
  const accepted = signed(trustedPilotDecisionSchema).parse(decision.record);
  authenticate(backend, anchor.authorityPublicKey);
  authenticate(accepted, anchor.authorityPublicKey);
  if (evidence.digest !== evidenceDigest || accepted.payload.scope.executionId !== executionId
      || accepted.payload.provider.managedBackend?.evidence?.digest !== evidenceDigest
      || accepted.payload.installationId !== anchor.installationId
      || accepted.payload.scope.workspaceId !== anchor.workspaceId
      || accepted.payload.state !== "accepted" || backend.payload.state !== "accepted") fail();
  return { backend: backend.payload, decision: accepted.payload };
}

// This record grants no launch authority. It reserves the already signed,
// exact managed dispatch before native review captures its immutable snapshot.
// Never backfill it into a historical review or overwrite a spent reservation.
export function reserveManagedDispatch({ writerLock, identity, evidenceDigest }) {
  try {
    const fields = ["executionId", "workspaceId", "taskId", "applicationId", "attempt"];
    if (!identity || Object.keys(identity).length !== fields.length
        || !fields.slice(0, 4).every(k => /^[a-f0-9-]{36}$/.test(identity[k] ?? ""))
        || identity.attempt !== 1 || !/^[a-f0-9]{64}$/.test(evidenceDigest ?? "")) fail();
    const writer = writerRecoveryEvidence(writerLock), directory = path.join(writer.directory, "trusted-provider-pilot");
    const anchor = admissionAnchor(directory);
    const pair = verifyAdmissionPair(admissionFile(path.join(directory, "managed-backend-evidence.json")),
      admissionFile(path.join(directory, anchor.decisionFile)), anchor, identity.executionId, evidenceDigest);
    if (fields.slice(0, 4).some(k => pair.decision.scope[k] !== identity[k])
        || pair.backend.context.identityDigest !== nativeDigest(identity)
        || pair.decision.scope.writerDigest !== nativeDigest(writer)
        || pair.backend.context.writerDigest !== nativeDigest(writer)
        || Date.parse(pair.decision.decidedAt) > Date.now() || Date.parse(pair.decision.expiresAt) <= Date.now()
        || Date.parse(pair.backend.issuedAt) > Date.now() || Date.parse(pair.backend.expiresAt) <= Date.now()) fail();
    const record = { state: "dispatch_reserved", scope: "managed_hermes_native",
      attemptDigest: nativeDigest(identity), decisionId: pair.decision.decisionId, evidenceDigest };
    const file = path.join(writer.directory, `managed-spent-${identity.executionId}.json`);
    const bytes = Buffer.from(JSON.stringify(record) + "\n"), fd = openSync(file, "wx", 0o600);
    try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    if (!readFileSync(file).equals(bytes)) fail();
    physicalIdentity(file, false);
    return file;
  } catch (error) { fail("dispatch_reservation", undefined, error?.message); }
}

// Call after lease release or separately authorized exact terminal reconciliation.
// Read both authoritative locations before retrying: a rename may have succeeded
// even when the original invocation did not return. Preserve the signed bytes.
export function retireManagedAdmissionArtifacts({ directory, executionId, evidenceDigest }) {
  try {
    if (!/^[a-f0-9-]{36}$/.test(executionId ?? "") || !/^[a-f0-9]{64}$/.test(evidenceDigest ?? "")) fail();
    const parentIdentity = physicalIdentity(directory), anchor = admissionAnchor(directory);
    const installationPath = path.join(directory, "installation.json"), installation = admissionFile(installationPath);
    const spent = path.join(directory, "spent");
    const target = path.join(spent, executionId);
    if (existsSync(spent)) physicalIdentity(spent);
    const names = ["managed-backend-evidence.json", anchor.decisionFile];
    if (existsSync(target)) {
      physicalIdentity(target);
      if (readdirSync(target).some(name => !names.includes(name))) fail();
    }
    const entries = names.map(name => {
      const active = path.join(directory, name), archived = path.join(target, name);
      const a = existsSync(active), b = existsSync(archived);
      if (a === b) fail(); // missing or duplicate: never guess ownership
      return { active, archived, source: a ? active : archived, artifact: admissionFile(a ? active : archived) };
    });
    verifyAdmissionPair(entries[0].artifact, entries[1].artifact, anchor, executionId, evidenceDigest);
    if (!existsSync(spent)) mkdirSync(spent, { mode: 0o700 });
    const spentIdentity = physicalIdentity(spent);
    if (!existsSync(target)) mkdirSync(target, { mode: 0o700 });
    const targetIdentity = physicalIdentity(target);
    for (const entry of entries) {
      if (physicalIdentity(directory) !== parentIdentity || physicalIdentity(spent) !== spentIdentity
          || physicalIdentity(target) !== targetIdentity) fail();
      const currentInstallation = admissionFile(installationPath);
      if (currentInstallation.identity !== installation.identity || currentInstallation.digest !== installation.digest) fail();
      const now = admissionFile(entry.source);
      if (now.identity !== entry.artifact.identity || now.digest !== entry.artifact.digest) fail();
      if (entry.source === entry.active) {
        if (existsSync(entry.archived)) fail();
        renameSync(entry.active, entry.archived);
      }
      const archived = admissionFile(entry.archived);
      if (existsSync(entry.active) || archived.identity !== entry.artifact.identity || archived.digest !== entry.artifact.digest) fail();
    }
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
        ...(inspect ? { readPaths: envelope.contract.nativeBoundary.readPaths,
          ...(envelope.contract.nativeBoundary.readFragments ? { readFragments: envelope.contract.nativeBoundary.readFragments } : {}) } : {}) },
      gates: { jobVersion: "roost-windows-job-v2", launcher: { sourceDigest: windowsJobSourceDigest() },
        originalOwnership: true, durableResume: true, cleanup: "owned_job_zero_processes", recovery: "original_b28_cleanup_only",
        outputBudget: "worker_deadline_output_intent", durationDeadline: startup.budgetReceipt.acceptedDeadline,
        release: "independent_review_no_release" } };
    return { source, writerDigest, startup, native };
  } catch (error) { fail(`source_${phase}`, error?.status, error?.message,
    error?.protocolAdmission ? error.details?.reason : undefined); }
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
      executionId: source.claimed.id, source: expected,
      ...(source.envelope.contract.nativeBoundary?.existingCommitVerification ? {existingCommitVerification:source.envelope.contract.nativeBoundary.existingCommitVerification} : {}) }) }));
    phase = "backend_evidence_verify";
    assertAuthority();
    const evidence = authenticate(evidenceReply.signed, installed.authorityPublicKey);
    if (evidence.state !== "accepted" || Date.parse(evidence.expiresAt) - Date.parse(evidence.issuedAt) > 300000
      || !same({ selection: evidence.selection, context: evidence.context, runtime: evidence.runtime,
        installationIdentity: evidence.installationIdentity, profile: evidence.profile, availability: evidence.availability,
        ownerAttestation: evidence.ownerAttestation }, expected)) fail();
    await awaitCurrentIssuance(evidence.issuedAt, evidence.expiresAt, assertAuthority);
    phase = "backend_evidence_persist";
    persist(path.join(installed.directory, "managed-backend-evidence.json"), evidenceReply.signed);
    const proposal = proposeTrustedPilotDecision(configurationPath, source, writerDigest);
    phase = "decision_request";
    await refreshLease();
    assertAuthority();
    const decisionReply = response("decision", trustedPilotDecisionSchema).parse(await api(route, { method: "POST", body: JSON.stringify({
      schemaVersion: managedAdmissionVersion, phase: "decision", leaseToken: source.claimed.leaseToken,
      executionId: source.claimed.id, provider: proposal.provider, scope: proposal.scope,
      installation: proposal.installation, evidenceDigest: proposal.evidenceDigest,
      ...(source.envelope.contract.nativeBoundary?.existingCommitVerification ? {existingCommitVerification:source.envelope.contract.nativeBoundary.existingCommitVerification} : {}) }) }));
    phase = "decision_verify";
    assertAuthority();
    const decision = authenticate(decisionReply.signed, installed.authorityPublicKey);
    if (decision.qualification !== "signed_native_v1" || decision.state !== "accepted"
      || Date.parse(decision.expiresAt) - Date.parse(decision.decidedAt) > 300000
      || !same(decision.provider, proposal.provider) || !same(decision.scope, proposal.scope)
      || decision.installationId !== proposal.installation.id
      || decision.installationIdentity !== proposal.installation.identity
      || decision.configurationIdentity !== proposal.installation.configurationIdentity) fail();
    const requiresFirstWrite = source.envelope.contract.nativeBoundary?.profile === "coding-local";
    if (!requiresFirstWrite ? decisionReply.firstWrite !== undefined || firstWrite !== undefined
      : !decisionReply.firstWrite || !firstWrite || decisionReply.firstWrite.decisionId !== firstWrite.decisionId
        || decisionReply.firstWrite.baselineCommit !== firstWrite.baselineCommit
        || decisionReply.firstWrite.branch !== firstWrite.branch
        || !same(decisionReply.firstWrite.operations,firstWrite.operations)
        || !same(decisionReply.firstWrite.continuation??null,firstWrite.continuation??null)
        || !same(decisionReply.firstWrite.existingCommitVerification??null,firstWrite.existingCommitVerification??null)
        || decisionReply.firstWrite.operation!==firstWrite.operation) fail();
    if (requiresFirstWrite && decisionReply.firstWrite.baselineCommit !== source.envelope.evidence.risk.value.commit) fail();
    await awaitCurrentIssuance(decision.decidedAt, decision.expiresAt, assertAuthority);
    phase = "decision_persist";
    persist(installed.decisionFile, decisionReply.signed);
    const acceptance = inspectTrustedPilotDecision(configurationPath, source, writerDigest);
    if (!same(acceptance.provider, proposal.provider) || !same(acceptance.scope, proposal.scope)) fail();
    await refreshLease();
    assertAuthority();
    const grant = Object.freeze({});
    grants.set(grant, { source, writerDigest, acceptance, firstWrite: decisionReply.firstWrite, used: false });
    return grant;
  } catch (error) { fail(phase, error?.status, error?.message); }
}

export function consumeManagedAdmission(grant, options, consumption) {
  const saved = grants.get(grant);
  if (!saved || saved.used) fail("consume_grant");
  saved.used = true;
  let phase = "consume_bindings";
  try {
    const { source, writerDigest, acceptance } = saved;
    const inspect = source.envelope.contract.nativeBoundary?.profile === "inspect-readonly";
    if (options.envelope !== source.envelope || options.provider?.kind !== "hermes_codex"
      || options.provider !== source.provider || options.repositoryPath !== source.repositoryPath
      || options.writerLock !== source.writerLock || consumption.claimed !== source.claimed
      || options.sandbox !== (inspect ? "read-only" : "workspace-write")) fail();
    phase = "consume_authority";
    consumption.assertAuthority();
    phase = "consume_writer";
    const freshWriterDigest = nativeDigest(writerRecoveryEvidence(source.writerLock));
    if (freshWriterDigest !== writerDigest || windowsJobSourceDigest() !== source.gates.launcher.sourceDigest) fail();
    phase = "consume_runtime";
    if (!same(fixtureRuntimeBinding(options.provider.executablePath), source.runtime.executable)
      || !same(fixtureRuntimeBinding(process.execPath), source.runtime.node)) fail();
    const configurationPath = path.join(writerRecoveryEvidence(source.writerLock).directory,
      "trusted-provider-pilot", "installation.json");
    phase = "consume_decision";
    const current = inspectTrustedPilotDecision(configurationPath, source, writerDigest);
    if (!same(current, acceptance)) fail();
    phase = "consume_startup";
    const startup = assertProviderStartup(options);
    phase = "consume_native_boundary";
    const native = inspect ? assertProviderReadOnlyBoundary(options.envelope) : assertProviderNativeBoundary(options.envelope);
    phase = "consume_startup_bindings";
    if (startup.receipt.digest !== source.configuration.startupDigest
      || startup.budgetReceipt.digest !== source.configuration.budgetDigest
      || native.digest !== source.configuration.nativeBoundaryDigest) fail();
    phase = "consume_transport";
    const transport = providerInputTransport("hermes_codex", options.envelope);
    if (nativeDigest(transport.input) !== source.configuration.inputDigest) fail();
    phase = "consume_input";
    consumeProviderInput(options.envelope, consumption);
    const assertLaunchAuthority = () => {
      consumption.assertAuthority();
      if (nativeDigest(writerRecoveryEvidence(source.writerLock)) !== writerDigest
        || windowsJobSourceDigest() !== source.gates.launcher.sourceDigest
        || !same(fixtureRuntimeBinding(options.provider.executablePath), source.runtime.executable)
        || !same(fixtureRuntimeBinding(process.execPath), source.runtime.node)
        || !same(inspectTrustedPilotDecision(configurationPath, source, writerDigest), acceptance)) fail();
    };
    phase = "consume_first_write";
    if (source.envelope.contract.nativeBoundary?.profile === "coding-local"
        && (!saved.firstWrite || saved.firstWrite.baselineCommit !== consumption.currentCommit)) fail();
    phase = "consume_dispatch_reserve";
    if (!inspect) bindNativeSpentRecord(native, reserveManagedDispatch({ writerLock: source.writerLock,
      identity: source.envelope.identity, evidenceDigest: current.provider.managedBackend.evidence.digest }));
    return Object.freeze({ version: "roost-managed-hermes-launch-v1", kind: "hermes_codex",
      command: startup.candidate.command, args: startup.candidate.args, cwd: startup.candidate.cwd,
      candidateEnvironment: startup.candidate.environment, input: transport.input,
      budgetReceipt: startup.budgetReceipt, ...(inspect ? { readOnlyToolReceipt: native } : { nativeToolReceipt: native }),
      expectedJobSourceDigest: source.gates.launcher.sourceDigest,
      managedBackend: current.provider.managedBackend, trustedPilot: current, assertLaunchAuthority });
  } catch (error) {
    // Publish only a named boundary and an existing protocol code, never raw
    // exception text, paths, envelopes or command output.
    fail(phase, undefined, error?.protocolAdmission && error.message !== "managed_admission_blocked" ? error.message : undefined,
      error?.protocolAdmission ? error.details?.reason : undefined);
  }
}
