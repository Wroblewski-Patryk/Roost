import path from "node:path";
import { writeFileSync } from "node:fs";
import { createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import { nativeDigest, physicalIdentity } from "./agent-host-native-footprint.mjs";
import { fixtureRuntimeBinding } from "./agent-host-fixture-ownership.mjs";
import { writerRecoveryEvidence } from "./agent-host-writer-lock.mjs";
import { assertProviderStartup, assertProviderNativeBoundary, providerInputTransport } from "./agent-host-provider-input.mjs";
import { consumeProviderInput } from "./agent-host-provider-input.mjs";
import { nativeEvidenceSchema, managedBackendContext, managedBackendRuntime } from "./agent-host-managed-backend.mjs";
import { trustedPilotBytes, inspectTrustedPilotInstallation, proposeTrustedPilotDecision,
  trustedPilotDecisionSchema, inspectTrustedPilotDecision } from "./agent-host-trusted-pilot.mjs";
import { windowsJobSourceDigest } from "./agent-host-windows-job.mjs";
import { managedBackendVersion } from "./agent-host-model-policy.mjs";

export const managedAdmissionVersion = "roost-managed-admission-v1";
const signed = schema => z.object({ payload: schema, signature: z.string().regex(/^[a-f0-9]{128}$/) }).strict();
const response = (phase, schema) => z.object({ schemaVersion: z.literal(managedAdmissionVersion), phase: z.literal(phase), signed: signed(schema) }).strict();
const same = (a, b) => trustedPilotBytes(a).equals(trustedPilotBytes(b));
const grants = new WeakMap();
function fail() { throw Object.assign(new Error("managed_admission_blocked"), { protocolAdmission: true, retryable: false,
  outcome: "policy_blocked", publicMessage: "Managed launch evidence is missing, changed or not signed for this attempt." }); }
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

// The source is rebuilt only from local sealed startup, native boundary, live
// Writer and installed executable. No response can choose an executable or
// grant the Worker a private signing key.
export function buildManagedAdmissionSource({ envelope, claimed, writerLock, repositoryPath, provider,
  startupEnvironment, remainingMs }) {
  try {
    if (provider?.kind !== "hermes_codex" || provider?.enabled !== true || process.platform !== "win32"
      || envelope.contract.modelSelection?.schemaVersion !== managedBackendVersion
      || envelope.contract.modelSelection.backend !== "codex_responses"
      || envelope.contract.modelSelection.riskClass !== "low"
      || claimed.id !== envelope.identity.executionId || claimed.attempt !== 1 || claimed.checkpoint?.stage !== "spawn_intent"
      || remainingMs() <= 3000) fail();
    const startup = assertProviderStartup({ envelope, provider, repositoryPath, startupEnvironment });
    const native = assertProviderNativeBoundary(envelope);
    const writerDigest = nativeDigest(writerRecoveryEvidence(writerLock));
    const transport = providerInputTransport("hermes_codex", envelope);
    const source = { qualification: "signed_native_v1", envelope, claimed, writerLock, repositoryPath, provider,
      runtime: { executable: fixtureRuntimeBinding(provider.executablePath), node: fixtureRuntimeBinding(process.execPath),
        launcher: { sourceDigest: windowsJobSourceDigest() } },
      configuration: { startupDigest: startup.receipt.digest, budgetDigest: startup.budgetReceipt.digest,
        nativeBoundaryDigest: native.digest, inputDigest: nativeDigest(transport.input),
        argvDigest: startup.receipt.argvDigest, environmentDigest: startup.receipt.environmentDigest },
      filesystemScope: { repositoryIdentity: physicalIdentity(repositoryPath), canonicalRootDigest: native.canonicalRootDigest,
        gitIdentityDigest: native.repositoryIdentityDigest, preFootprintDigest: native.preFootprintDigest,
        oneWriterReference: native.oneWriterReference, applicationLeaseReference: native.applicationLeaseReference,
        writePaths: envelope.contract.nativeBoundary.writePaths },
      gates: { jobVersion: "roost-windows-job-v2", launcher: { sourceDigest: windowsJobSourceDigest() },
        originalOwnership: true, durableResume: true, cleanup: "owned_job_zero_processes", recovery: "original_b28_cleanup_only",
        outputBudget: "worker_deadline_output_intent", durationDeadline: startup.budgetReceipt.acceptedDeadline,
        release: "independent_review_no_release" } };
    return { source, writerDigest, startup, native };
  } catch { fail(); }
}

export async function requestManagedAdmission({ api, source, writerDigest, assertAuthority }) {
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
    const evidenceReply = response("backend_evidence", nativeEvidenceSchema).parse(await api(route, { method: "POST", body: JSON.stringify({
      schemaVersion: managedAdmissionVersion, phase: "backend_evidence", leaseToken: source.claimed.leaseToken,
      executionId: source.claimed.id, source: expected }) }));
    assertAuthority();
    const evidence = authenticate(evidenceReply.signed, installed.authorityPublicKey);
    if (evidence.state !== "accepted" || Date.parse(evidence.expiresAt) - Date.parse(evidence.issuedAt) > 300000
      || !same({ selection: evidence.selection, context: evidence.context, runtime: evidence.runtime,
        installationIdentity: evidence.installationIdentity, profile: evidence.profile, availability: evidence.availability,
        ownerAttestation: evidence.ownerAttestation }, expected)) fail();
    persist(path.join(installed.directory, "managed-backend-evidence.json"), evidenceReply.signed);
    const proposal = proposeTrustedPilotDecision(configurationPath, source, writerDigest);
    const decisionReply = response("decision", trustedPilotDecisionSchema).parse(await api(route, { method: "POST", body: JSON.stringify({
      schemaVersion: managedAdmissionVersion, phase: "decision", leaseToken: source.claimed.leaseToken,
      executionId: source.claimed.id, provider: proposal.provider, scope: proposal.scope,
      installation: proposal.installation, evidenceDigest: proposal.evidenceDigest }) }));
    assertAuthority();
    const decision = authenticate(decisionReply.signed, installed.authorityPublicKey);
    if (decision.qualification !== "signed_native_v1" || decision.state !== "accepted"
      || Date.parse(decision.expiresAt) - Date.parse(decision.decidedAt) > 300000
      || !same(decision.provider, proposal.provider) || !same(decision.scope, proposal.scope)
      || decision.installationId !== proposal.installation.id
      || decision.installationIdentity !== proposal.installation.identity
      || decision.configurationIdentity !== proposal.installation.configurationIdentity) fail();
    persist(installed.decisionFile, decisionReply.signed);
    const acceptance = inspectTrustedPilotDecision(configurationPath, source, writerDigest);
    if (!same(acceptance.provider, proposal.provider) || !same(acceptance.scope, proposal.scope)) fail();
    const grant = Object.freeze({});
    grants.set(grant, { source, writerDigest, acceptance, used: false });
    return grant;
  } catch { fail(); }
}

export function consumeManagedAdmission(grant, options, consumption) {
  const saved = grants.get(grant);
  if (!saved || saved.used) fail();
  saved.used = true;
  try {
    const { source, writerDigest, acceptance } = saved;
    if (options.envelope !== source.envelope || options.provider?.kind !== "hermes_codex"
      || options.provider !== source.provider || options.repositoryPath !== source.repositoryPath
      || options.writerLock !== source.writerLock || consumption.claimed !== source.claimed
      || options.sandbox !== "workspace-write") fail();
    consumption.assertAuthority();
    const freshWriterDigest = nativeDigest(writerRecoveryEvidence(source.writerLock));
    if (freshWriterDigest !== writerDigest || windowsJobSourceDigest() !== source.gates.launcher.sourceDigest) fail();
    if (!same(fixtureRuntimeBinding(options.provider.executablePath), source.runtime.executable)
      || !same(fixtureRuntimeBinding(process.execPath), source.runtime.node)) fail();
    const configurationPath = path.join(writerRecoveryEvidence(source.writerLock).directory,
      "trusted-provider-pilot", "installation.json");
    const current = inspectTrustedPilotDecision(configurationPath, source, writerDigest);
    if (!same(current, acceptance)) fail();
    const startup = assertProviderStartup(options), native = assertProviderNativeBoundary(options.envelope);
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
    return Object.freeze({ version: "roost-managed-hermes-launch-v1", kind: "hermes_codex",
      command: startup.candidate.command, args: startup.candidate.args, cwd: startup.candidate.cwd,
      candidateEnvironment: startup.candidate.environment, input: transport.input,
      budgetReceipt: startup.budgetReceipt, nativeToolReceipt: native,
      expectedJobSourceDigest: source.gates.launcher.sourceDigest,
      managedBackend: current.provider.managedBackend, trustedPilot: current, assertLaunchAuthority });
  } catch { fail(); }
}
