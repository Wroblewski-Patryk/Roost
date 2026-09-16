import { nativeToolBlockers } from "./agent-host-hermes-native-boundary.mjs";
import path from "node:path";
import { z } from "zod";
import contract from "./agent-host-provider-contract.cjs";
import hermesContract from "./agent-host-hermes-launch-contract.cjs";
import { modelSelectionSchema, codexExecutionArgs } from "./agent-host-model-policy.mjs";
import { providerInputTransport, consumeProviderInput, assertProviderProfile, assertProviderStartup, assertProviderNativeBoundary } from "./agent-host-provider-input.mjs";
import { hermesProfileBindingSchema, hermesProfileAuthBlockers, hermesStartupProfileVersion, hermesBudgetProfileVersion, hermesNativeProfileVersion } from "./agent-host-hermes-profile.mjs";
import { hermesStartupArgs, hermesStartupBlockers } from "./agent-host-hermes-startup.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";
import { hermesOwnedTreeBlockers } from "./agent-host-windows-job.mjs";

import { hermesBudgetBlocker, hermesBudgetBlockers } from "./agent-host-hermes-budget.mjs";

export { hermesContract };
const hermes = contract.registry.providers.find(p => p.kind === "hermes_codex");
const configSchema = z.object({
  kind: z.literal("hermes_codex"), enabled: z.boolean(),
  officialSource: z.literal(hermes.officialSource), version: z.literal(hermes.version),
  commit: z.literal(hermes.commit), executablePath: z.string().min(1).max(1024),
  policy: z.object(Object.fromEntries(Object.keys(contract.registry.hermesPolicy).map(k => [k, z.unknown()]))).strict(),
  attestation: z.unknown().optional(), profile: hermesProfileBindingSchema.optional()
}).strict();
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
function fail(code) {
  throw Object.assign(new Error(code), { protocolAdmission: true, retryable: false,
    publicMessage: "Provider launch is not admitted. Inspect the fixed capability blockers.",
    details: { contractVersion: hermesContract.version, reason: code } });
}
function windowsPath(value, executable = false) {
  if (typeof value !== "string" || !/^[a-z]:\\/i.test(value) || path.win32.normalize(value) !== value
      || /[\x00-\x1f<>"|?*]/.test(value) || value.slice(2).includes(":")
      || value.split("\\").some(part => /[. ]$/.test(part))
      || value === path.win32.parse(value).root || (executable && !/\.exe$/i.test(value))) return false;
  return true;
}

// Worker-only projection. repositoryPath comes AFTER existing mapping/origin/
// physical-directory checks, never from provider config or model input. This
// legacy projection reads no files. A v2 startup or opaque owner-auth receipt
// requires fresh private-file checks; neither proves executable identity.
export function projectProviderLaunch({ provider, envelope, repositoryPath, codexCommand, sandbox,
  secrets = [], platform = process.platform, ownedTreeReceipt, ownerAuthReceipt, startupEnvironment, startupCandidate }) {
  const kind = contract.providerKind(provider);
  if (kind === "unknown") fail("execution_provider_unknown");
  const transport = providerInputTransport(kind, envelope);
  guardHostContent(envelope, "required", secrets);
  const selection = modelSelectionSchema.safeParse(transport.modelSelection);
  if (!selection.success) fail("execution_model_policy_invalid");
  if (kind === "direct_codex") return freeze({ version: "roost-direct-cli-launch-v1", kind,
    command: codexCommand, args: codexExecutionArgs(selection.data, sandbox),
    cwd: repositoryPath, input: transport.input, modelSelection: selection.data, shell: false, windowsHide: true });
  if (platform !== "win32") fail("hermes_windows_required");
  if (!configSchema.safeParse(provider).success) fail("hermes_launch_config_invalid");
  if (!provider.enabled) fail("hermes_disabled");
  if (!windowsPath(provider.executablePath, true)) fail("hermes_executable_invalid");
  if (!windowsPath(repositoryPath) || sandbox !== "workspace-write") fail("hermes_workspace_invalid");
  if (!same(provider.policy, contract.registry.hermesPolicy)) fail("hermes_launch_policy_invalid");
  if (envelope.identity.attempt !== 1 || envelope.contract.budgets.maxAttempts !== 1) fail("hermes_single_attempt_required");
  let blockers = hermesProfileAuthBlockers(hermesOwnedTreeBlockers(hermesContract.blockers, ownedTreeReceipt),
    ownerAuthReceipt, provider.profile, { repositoryPath, readyRevision: envelope.revisions.ready });
  const startup = [hermesStartupProfileVersion, hermesBudgetProfileVersion, hermesNativeProfileVersion].includes(provider.profile?.schemaVersion)
    ? assertProviderStartup({ envelope, provider, repositoryPath, startupEnvironment, startupCandidate }) : undefined;
  if (startup) blockers = hermesStartupBlockers(blockers, startup.receipt, startup.options);
  const acceptedResidualBlockers = startup?.budgetReceipt ? ["hermes_single_turn_enforcement_unproven", "hermes_output_cost_budget_unproven"] : [];
  if (startup?.budgetReceipt) {
    // B9 owner policy supersedes these two historical requirements locally;
    // it does not prove physical call/token/cost caps or change global gates.
    blockers = hermesBudgetBlockers([...blockers.filter(code => !acceptedResidualBlockers.includes(code)), hermesBudgetBlocker], startup.budgetReceipt);
  }
  const nativeReceipt = provider.profile?.schemaVersion === hermesNativeProfileVersion ? assertProviderNativeBoundary(envelope) : null;
  if (nativeReceipt) blockers = nativeToolBlockers(blockers, nativeReceipt, envelope);
  // Only documented flags. No invented --reasoning-effort/--ephemeral/--no-*
  // switches. This is a blocked candidate, NEVER a runnable descriptor.
  return freeze({ version: hermesContract.version, kind, command: null, args: null,
    candidateExecutable: provider.executablePath,
    candidateArgs: startup?.candidate.args ?? hermesStartupArgs(envelope),
    candidateEnvironment: startup?.candidate.environment ?? null,
    cwd: repositoryPath, input: transport.input, modelSelection: selection.data,
    requiredConfig: { reasoningEffortKey: "agent.reasoning_effort", reasoningEffort: selection.data.reasoningEffort,
      workerOwnedMcpOnly: true, configReceipt: startup?.receipt ?? null, environmentReceipt: startup?.receipt.environmentDigest ?? null },
    budgetReceipt: startup?.budgetReceipt ?? null, nativeToolReceipt: nativeReceipt, acceptedResidualBlockers,
    limits: { ...envelope.contract.budgets, ...hermesContract, blockers }, shell: false, windowsHide: true,
    blockers });
}

// The same one-use seal and final authority/context checks serve both providers.
// Even if an outer admission is accidentally weakened, Hermes cannot reach
// spawn or fall through to Codex. Failed admission burns the local envelope.
export function prepareProviderLaunch(options, consumption) {
  const plan = projectProviderLaunch(options);
  consumeProviderInput(options.envelope, consumption);
  if (plan.kind === "hermes_codex") {
    // Production reads the owner-confirmed private attestation again. No caller
    // auth/status override is accepted; all other admission blockers remain.
    assertProviderProfile(options.envelope, options.provider, options.repositoryPath);
    if ([hermesStartupProfileVersion, hermesBudgetProfileVersion, hermesNativeProfileVersion].includes(options.provider.profile?.schemaVersion)) assertProviderStartup(options);
    fail("hermes_public_launch_contract_unqualified");
  }
  return plan;
}
