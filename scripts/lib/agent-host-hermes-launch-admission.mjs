import { createHash } from "node:crypto";
import { assertProviderInputAvailable, assertProviderProfile, assertProviderStartup, assertProviderNativeBoundary,
  providerInputTransport, consumeProviderInput } from "./agent-host-provider-input.mjs";
import { hermesNativeProfileVersion, hermesProfileAuthBlockers } from "./agent-host-hermes-profile.mjs";
import { isHermesStartupReceipt } from "./agent-host-hermes-startup.mjs";
import { assertHermesBudgetUnused, hermesBudgetReceiptMatches } from "./agent-host-hermes-budget.mjs";
import { nativeToolBlocker, nativeToolBlockers } from "./agent-host-hermes-native-boundary.mjs";
import { assertWindowsJobCapability } from "./agent-host-windows-job.mjs";

export const hermesLaunchAdmissionVersion = "roost-hermes-local-launch-admission-v1";
export const acceptedHermesResidualBlockers = Object.freeze([
  "hermes_single_turn_enforcement_unproven", "hermes_output_cost_budget_unproven"
]);
const admissions = new WeakMap();
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = () => { throw Object.assign(new Error("hermes_local_launch_admission_blocked"), {
  protocolAdmission: true, retryable: false, outcome: "policy_blocked",
  publicMessage: "Local launch policy proof is missing, changed, expired or consumed."
}); };
const keys = ["owner", "startup", "budget", "native", "job"];

// Internal proof collection only. Owner confirmation is not an observed OAuth
// session; a compiled Job capability is not future cleanup evidence.
export function collectHermesLaunchProofs(options, job) {
  assertProviderInputAvailable(options.envelope);
  if (options.provider?.profile?.schemaVersion !== hermesNativeProfileVersion) fail();
  const owner = assertProviderProfile(options.envelope, options.provider, options.repositoryPath);
  const startup = assertProviderStartup(options);
  return Object.freeze({ owner, startup: startup.receipt, budget: startup.budgetReceipt,
    native: assertProviderNativeBoundary(options.envelope), job });
}

function check(options, proofs, requireJob = true) {
  try {
    const { envelope, provider, repositoryPath } = options;
    assertProviderInputAvailable(envelope);
    if ((options.platform ?? process.platform) !== "win32" || options.sandbox !== "workspace-write"
        || provider?.profile?.schemaVersion !== hermesNativeProfileVersion
        || !proofs || Object.keys(proofs).length !== keys.length || keys.some(k => !Object.hasOwn(proofs, k) || (!proofs[k] && (k !== "job" || requireJob)))) fail();
    const startup = assertProviderStartup(options);
    if (hermesProfileAuthBlockers(["hermes_owner_attestation_required"], proofs.owner, provider.profile,
      { repositoryPath, readyRevision: envelope.revisions.ready }).length
        || !isHermesStartupReceipt(proofs.startup, envelope) || startup.receipt.digest !== proofs.startup.digest
        || !hermesBudgetReceiptMatches(proofs.budget, envelope, proofs.startup)
        || startup.budgetReceipt.digest !== proofs.budget.digest
        || nativeToolBlockers([nativeToolBlocker], proofs.native, envelope).length
        || proofs.native.startupReceiptDigest !== proofs.startup.digest
        || proofs.native.budgetReceiptDigest !== proofs.budget.digest
        || proofs.native.ownerAttestationDigest !== proofs.startup.authAttestationDigest) fail();
    assertHermesBudgetUnused(proofs.budget);
    const job = proofs.job ? assertWindowsJobCapability(proofs.job) : null;
    const transport = providerInputTransport("hermes_codex", envelope);
    const binding = { identityDigest: hash(envelope.identity), readyRevision: envelope.revisions.ready, inputSeal: envelope.seal,
      stdinDigest: hash(transport.input), startupDigest: proofs.startup.digest, ownerAttestationDigest: proofs.startup.authAttestationDigest,
      budgetDigest: proofs.budget.digest, nativeBoundaryDigest: proofs.native.digest,
      launcherDigest: job?.launcherDigest ?? null, launcherSourceDigest: job?.sourceDigest ?? null };
    return { binding, candidate: startup.candidate, input: transport.input };
  } catch { fail(); }
}

// v4 uses this single policy inventory. Earlier profile projections remain
// historical diagnostics and cannot obtain a qualified aggregate.
export function projectHermesLaunchPolicy(options, job) {
  const proofs = collectHermesLaunchProofs(options, job), checked = check(options, proofs, false);
  return { proofs, candidate: checked.candidate,
    receipt: job ? qualifyHermesLaunch(options, proofs) : null,
    blockers: ["hermes_public_launch_contract_unqualified", ...(!job ? ["hermes_stop_recovery_unproven"] : [])] };
}

export function qualifyHermesLaunch(options, proofs) {
  const checked = check(options, proofs);
  const body = { schemaVersion: hermesLaunchAdmissionVersion, policyQualified: true,
    activationAuthorized: false, spawnStarted: false, scope: "local_source_synthetic_policy",
    ...checked.binding, installedExecutableVerified: false, authSessionObserved: false,
    futureCleanupProven: false, residualRiskPolicy: "ADR-004-v7-native-tools" };
  const receipt = Object.freeze({ ...body, digest: hash(body) });
  admissions.set(receipt, { options: { ...options }, proofs: Object.freeze({ ...proofs }), binding: hash(checked.binding), used: false });
  return receipt;
}

export function assertHermesLaunchAdmission(receipt, options) {
  const saved = admissions.get(receipt);
  if (!saved || saved.used || (options && options.envelope !== saved.options.envelope)) fail();
  const checked = check(options ?? saved.options, saved.proofs);
  if (hash(checked.binding) !== saved.binding) fail();
  return receipt;
}

// Burns the aggregate and input before returning any internal handoff. This is
// qualification consumption, never activation. No API/config boolean is read.
export function consumeHermesLaunchAdmission(receipt, options, consumption) {
  const saved = admissions.get(receipt);
  try {
    assertHermesLaunchAdmission(receipt, options);
    saved.used = true;
    consumeProviderInput(options.envelope, consumption);
    return Object.freeze({ candidate: assertProviderStartup(options).candidate,
      input: providerInputTransport("hermes_codex", options.envelope).input,
      budgetReceipt: saved.proofs.budget, nativeToolReceipt: saved.proofs.native, jobArtifact: saved.proofs.job });
  } catch (error) { if (saved) saved.used = true; throw error; }
}
