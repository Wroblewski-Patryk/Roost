import path from "node:path";
import { z } from "zod";
import contract from "./agent-host-provider-contract.cjs";
import hermesContract from "./agent-host-hermes-launch-contract.cjs";
import { modelSelectionSchema, codexExecutionArgs } from "./agent-host-model-policy.mjs";
import { providerInputTransport, consumeProviderInput } from "./agent-host-provider-input.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";

export { hermesContract };
const hermes = contract.registry.providers.find(p => p.kind === "hermes_codex");
const configSchema = z.object({
  kind: z.literal("hermes_codex"), enabled: z.boolean(),
  officialSource: z.literal(hermes.officialSource), version: z.literal(hermes.version),
  commit: z.literal(hermes.commit), executablePath: z.string().min(1).max(1024),
  policy: z.object(Object.fromEntries(Object.keys(contract.registry.hermesPolicy).map(k => [k, z.unknown()]))).strict(),
  attestation: z.unknown().optional()
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
// pure function neither reads files nor proves executable identity on disk.
export function projectProviderLaunch({ provider, envelope, repositoryPath, codexCommand, sandbox,
  secrets = [], platform = process.platform }) {
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
  // Only documented flags. No invented --reasoning-effort/--ephemeral/--no-*
  // switches. This is a blocked candidate, NEVER a runnable descriptor.
  return freeze({ version: hermesContract.version, kind, command: null, args: null,
    candidateExecutable: provider.executablePath,
    candidateArgs: ["chat", "--oneshot", "--quiet", "--query-file", "-",
      "--provider", "openai-codex", "--model", selection.data.model,
      "--reasoning", selection.data.reasoningEffort],
    cwd: repositoryPath, input: transport.input, modelSelection: selection.data,
    requiredConfig: { reasoningEffortKey: "agent.reasoning_effort", reasoningEffort: selection.data.reasoningEffort,
      workerOwnedMcpOnly: true, configReceipt: null, environmentReceipt: null },
    limits: { ...envelope.contract.budgets, ...hermesContract }, shell: false, windowsHide: true,
    blockers: hermesContract.blockers });
}

// The same one-use seal and final authority/context checks serve both providers.
// Even if an outer admission is accidentally weakened, Hermes cannot reach
// spawn or fall through to Codex. Failed admission burns the local envelope.
export function prepareProviderLaunch(options, consumption) {
  const plan = projectProviderLaunch(options);
  consumeProviderInput(options.envelope, consumption);
  if (plan.kind === "hermes_codex") fail("hermes_public_launch_contract_unqualified");
  return plan;
}
