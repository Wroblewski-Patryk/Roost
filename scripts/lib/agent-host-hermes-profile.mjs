import { nativeToolPolicy, nativeRiskReference } from "./agent-host-native-authority.mjs";
import { createHash } from "node:crypto";
import { lstatSync, realpathSync, openSync, fstatSync, readFileSync, closeSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import contract from "./agent-host-provider-contract.cjs";
import { ownerAttestationBindingSchema, inspectOwnerAttestation } from "./agent-host-hermes-owner-auth.mjs";
export { observeHermesSameOwner } from "./agent-host-hermes-owner-auth.mjs";

export const hermesProfileVersion = "roost-hermes-profile-v1";
export const hermesAuthSourceClass = "same-owner-codex-cli";
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
export const hermesAuthSourceVersion = pin.authSourcePolicy.contractVersion;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const snapshots = new WeakMap(), admitted = new WeakMap();
// JSON is a YAML subset. These are public 0.21.2 keys, not invented no-* flags.
// No default model/provider: only the Worker packet may select them.
const config = {
  model: "", providers: {}, fallback_providers: [], toolsets: [], platform_toolsets: { cli: [] },
  compression: { enabled: false }, checkpoints: { enabled: false },
  smart_model_routing: { enabled: false },
  memory: { memory_enabled: false, user_profile_enabled: false },
  skills: { external_dirs: [], project_discovery: false, inline_shell: false, write_approval: true },
  auxiliary: { transient_retries: 0, title_generation: { enabled: false }, background_review: { enabled: false } },
  curator: { enabled: false }, plugins: { enabled: [], disabled: [] }, hooks: {}, hooks_auto_accept: false,
  mcp_servers: {}, mcp: { auto_reload_on_config_change: false },
  model_catalog: { enabled: false }, telemetry: { shared_metrics: { enabled: false, send: false } },
  updates: { check: false }, onboarding: { profile_build: "off" }
};
const profileBytes = JSON.stringify(config, null, 2) + "\n";
export const hermesProfileDigest = sha(profileBytes);
export const renderHermesProfile = () => profileBytes;
// B3/B5 bytes remain immutable historical evidence. B7 is a new exact profile.
export const hermesStartupProfileVersion = "roost-hermes-profile-v2";
const startupProfileBytes = JSON.stringify({ ...config, fallback_model: [], custom_providers: [], model_aliases: {}, worktree: false }, null, 2) + "\n";
export const hermesStartupProfileDigest = sha(startupProfileBytes);
export const renderHermesStartupProfile = () => startupProfileBytes;
export const hermesBudgetProfileVersion = "roost-hermes-profile-v3";
const budgetProfileBytes = JSON.stringify({ ...JSON.parse(startupProfileBytes), agent: { max_turns: 24, api_max_retries: 2 } }, null, 2) + "\n";
export const hermesBudgetProfileDigest = sha(budgetProfileBytes);
export const renderHermesBudgetProfile = () => budgetProfileBytes;
export const hermesBudgetProfileBinding = profilePath => ({ ...hermesStartupProfileBinding(profilePath), schemaVersion: hermesBudgetProfileVersion, configDigest: hermesBudgetProfileDigest });
export const hermesLegacyNativeProfileVersion = "roost-hermes-profile-v4";
const legacyNativeProfileBytes = JSON.stringify({ ...JSON.parse(budgetProfileBytes),
  lsp: { enabled: false, install_strategy: "off" },
  terminal: { auto_source_bashrc: false, shell_init_files: [] },
  approvals: { mode: "manual", single_query_mode: "deny", unattended_mode: "deny", cron_mode: "deny",
    deny: ["git clone*", "git worktree*", "git init*", "git reset*", "git clean*", "git checkout*", "git restore*", "git commit*", "git push*", "docker*", "podman*"] },
  command_allowlist: [] }, null, 2) + "\n";
export const hermesLegacyNativeProfileDigest = sha(legacyNativeProfileBytes);
export const hermesNativeProfileVersion = "roost-hermes-profile-v5";
const nativeProfileBytes = JSON.stringify({ ...JSON.parse(legacyNativeProfileBytes), security: { allow_lazy_installs: false } }, null, 2) + "\n";
export const hermesNativeProfileDigest = sha(nativeProfileBytes);
export const renderHermesNativeProfile = () => nativeProfileBytes;
export const hermesNativeProfileBinding = profilePath => ({ ...hermesBudgetProfileBinding(profilePath),
  schemaVersion: hermesNativeProfileVersion, configDigest: hermesNativeProfileDigest,
  nativeToolsRisk: { policyVersion: nativeToolPolicy, decisionReference: nativeRiskReference } });
const legacyBindingSchema = z.object({
  schemaVersion: z.literal(hermesProfileVersion), hermesVersion: z.literal(pin.version),
  hermesCommit: z.literal(pin.commit), profilePath: z.string().min(1).max(1024),
  configDigest: z.literal(hermesProfileDigest), authSourceClass: z.literal(hermesAuthSourceClass),
  ownerAttestation: ownerAttestationBindingSchema.optional()
}).strict();
export const hermesProfileBindingSchema = z.discriminatedUnion("schemaVersion", [legacyBindingSchema,
  legacyBindingSchema.extend({ schemaVersion: z.literal(hermesStartupProfileVersion), configDigest: z.literal(hermesStartupProfileDigest) }).strict(),
  legacyBindingSchema.extend({ schemaVersion: z.literal(hermesBudgetProfileVersion), configDigest: z.literal(hermesBudgetProfileDigest) }).strict(),
  legacyBindingSchema.extend({ schemaVersion: z.literal(hermesLegacyNativeProfileVersion), configDigest: z.literal(hermesLegacyNativeProfileDigest),
    nativeToolsRisk: z.object({ policyVersion: z.literal(nativeToolPolicy), decisionReference: z.literal(nativeRiskReference) }).strict() }).strict(),
  legacyBindingSchema.extend({ schemaVersion: z.literal(hermesNativeProfileVersion), configDigest: z.literal(hermesNativeProfileDigest),
    nativeToolsRisk: z.object({ policyVersion: z.literal(nativeToolPolicy), decisionReference: z.literal(nativeRiskReference) }).strict() }).strict()]);
const failure = reason => Object.assign(new Error(reason), { protocolAdmission: true, retryable: false,
  publicMessage: "Hermes profile/auth admission is blocked. No model was started.", details: { reason } });
const fail = reason => { throw failure(reason); };
const within = (parent, child) => { const relative = path.relative(parent, child); return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative)); };
function bindingKey(binding) {
  return JSON.stringify([binding.schemaVersion, binding.hermesVersion, binding.hermesCommit,
    binding.profilePath, binding.configDigest, binding.authSourceClass, binding.ownerAttestation ?? null, binding.nativeToolsRisk ?? null]);
}
export function hermesProfileBinding(profilePath) {
  return { schemaVersion: hermesProfileVersion, hermesVersion: pin.version, hermesCommit: pin.commit,
    profilePath, configDigest: hermesProfileDigest, authSourceClass: hermesAuthSourceClass };
}
export function hermesStartupProfileBinding(profilePath) {
  return { ...hermesProfileBinding(profilePath), schemaVersion: hermesStartupProfileVersion, configDigest: hermesStartupProfileDigest };
}
function readProfile(input, repositoryPath) {
  const parsed = hermesProfileBindingSchema.safeParse(input);
  if (!parsed.success) fail("hermes_profile_binding_invalid");
  const binding = parsed.data, file = binding.profilePath;
  const expectedBytes = binding.schemaVersion === hermesNativeProfileVersion ? nativeProfileBytes : binding.schemaVersion === hermesLegacyNativeProfileVersion ? legacyNativeProfileBytes : binding.schemaVersion === hermesBudgetProfileVersion ? budgetProfileBytes : binding.schemaVersion === hermesStartupProfileVersion ? startupProfileBytes : profileBytes;
  if (!path.isAbsolute(file) || path.normalize(file) !== file || path.basename(file) !== "config.yaml"
      || /[\x00-\x1f]/.test(file) || (process.platform === "win32" && (!/^[a-z]:\\/i.test(file)
        || file.slice(2).includes(":") || file.split("\\").some(part => /[. ]$/.test(part))))) fail("hermes_profile_path_invalid");
  if (!repositoryPath || !path.isAbsolute(repositoryPath) || within(path.resolve(repositoryPath), file)) fail("hermes_profile_path_invalid");
  let fd;
  try {
    // Reject junctions/symlinks in every component, not just the leaf.
    for (let current = file;; current = path.dirname(current)) {
      if (lstatSync(current).isSymbolicLink()) fail("hermes_profile_path_invalid");
      if (current === path.dirname(current)) break;
    }
    if (realpathSync.native(file).toLowerCase() !== file.toLowerCase()) fail("hermes_profile_path_invalid");
    const before = lstatSync(file, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size !== BigInt(Buffer.byteLength(expectedBytes))) fail("hermes_profile_config_invalid");
    fd = openSync(file, "r");
    const opened = fstatSync(fd, { bigint: true });
    // Windows lstat reports dev=0 while fstat reports the volume serial; compare
    // exact BigInt file IDs and canonical volume path, not those unlike fields.
    if (opened.ino !== before.ino || (process.platform !== "win32" && opened.dev !== before.dev) || opened.size !== before.size) fail("hermes_profile_changed");
    const bytes = readFileSync(fd), after = lstatSync(file, { bigint: true });
    if (after.ino !== opened.ino || after.dev !== before.dev || after.size !== opened.size
        || after.mtimeNs !== opened.mtimeNs || after.isSymbolicLink()) fail("hermes_profile_changed");
    // Exact reviewed bytes also reject duplicate keys, extra keys and YAML tags.
    if (!bytes.equals(Buffer.from(expectedBytes)) || sha(bytes) !== binding.configDigest) fail("hermes_profile_config_invalid");
    return binding;
  } catch (error) {
    if (error.protocolAdmission) throw error;
    throw failure("hermes_profile_unreadable");
  } finally { if (fd !== undefined) closeSync(fd); }
}

function audit(binding, authReceipt) {
  return Object.freeze({ profileVersion: binding.schemaVersion, hermesVersion: binding.hermesVersion,
    hermesCommit: binding.hermesCommit, configDigest: binding.configDigest,
    auth: inspectOwnerAttestation(binding, authReceipt) });
}
export function inspectHermesProfile(binding, repositoryPath) {
  return audit(readProfile(binding, repositoryPath));
}
export function sealHermesProfile(binding, { repositoryPath, readyRevision, authReceipt }) {
  if (!hash.safeParse(readyRevision).success) fail("hermes_profile_ready_invalid");
  const checked = readProfile(binding, repositoryPath), receipt = Object.freeze({});
  const stat = lstatSync(checked.profilePath, { bigint: true });
  snapshots.set(receipt, { binding: bindingKey(checked), repositoryPath, readyRevision,
    fileIdentity: `${stat.dev}:${stat.ino}`, auth: JSON.stringify(inspectOwnerAttestation(checked, authReceipt)) });
  return receipt;
}
export function assertHermesProfile(snapshot, binding, { repositoryPath, readyRevision, authReceipt }) {
  const original = snapshots.get(snapshot);
  if (!original || original.repositoryPath !== repositoryPath || original.readyRevision !== readyRevision) fail("hermes_profile_ready_changed");
  const checked = readProfile(binding, repositoryPath);
  if (bindingKey(checked) !== original.binding) fail("hermes_profile_changed");
  const stat = lstatSync(checked.profilePath, { bigint: true });
  if (`${stat.dev}:${stat.ino}` !== original.fileIdentity) fail("hermes_profile_changed");
  const result = audit(checked, authReceipt);
  if (JSON.stringify(result.auth) !== original.auth) fail("hermes_auth_attestation_changed");
  admitted.set(result, { snapshot, binding: structuredClone(checked), repositoryPath, readyRevision, authReceipt, at: performance.now() });
  return result;
}

// Only a locally observed, Ready-bound receipt can discharge the auth blocker.
// Re-read on use: revocation/expiry/change cannot borrow a cached qualification.
export function hermesProfileAuthBlockers(blockers, receipt, binding, { repositoryPath, readyRevision }) {
  const proof = admitted.get(receipt), age = proof && performance.now() - proof.at;
  if (!proof || age < 0 || age >= 60000 || proof.repositoryPath !== repositoryPath
      || proof.readyRevision !== readyRevision || !hermesProfileBindingSchema.safeParse(binding).success
      || bindingKey(proof.binding) !== bindingKey(binding)) return [...blockers];
  try {
    assertHermesProfile(proof.snapshot, binding, proof);
    return blockers.filter(code => code !== "hermes_owner_attestation_required");
  } catch { return [...blockers]; }
}
