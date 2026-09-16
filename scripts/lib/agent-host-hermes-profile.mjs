import { createHash } from "node:crypto";
import { lstatSync, realpathSync, openSync, fstatSync, readFileSync, closeSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import contract from "./agent-host-provider-contract.cjs";

export const hermesProfileVersion = "roost-hermes-profile-v1";
export const hermesAuthSourceClass = "same-owner-codex-cli";
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
export const hermesAuthSourceVersion = pin.authSourcePolicy.contractVersion;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const snapshots = new WeakMap(), observations = new WeakMap();
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
export const hermesProfileBindingSchema = z.object({
  schemaVersion: z.literal(hermesProfileVersion), hermesVersion: z.literal(pin.version),
  hermesCommit: z.literal(pin.commit), profilePath: z.string().min(1).max(1024),
  configDigest: z.literal(hermesProfileDigest), authSourceClass: z.literal(hermesAuthSourceClass)
}).strict();
const failure = reason => Object.assign(new Error(reason), { protocolAdmission: true, retryable: false,
  publicMessage: "Hermes profile/auth admission is blocked. No model was started.", details: { reason } });
const fail = reason => { throw failure(reason); };
const within = (parent, child) => { const relative = path.relative(parent, child); return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative)); };
function bindingKey(binding) {
  return JSON.stringify([binding.schemaVersion, binding.hermesVersion, binding.hermesCommit,
    binding.profilePath, binding.configDigest, binding.authSourceClass]);
}
export function hermesProfileBinding(profilePath) {
  return { schemaVersion: hermesProfileVersion, hermesVersion: pin.version, hermesCommit: pin.commit,
    profilePath, configDigest: hermesProfileDigest, authSourceClass: hermesAuthSourceClass };
}
function readProfile(input, repositoryPath) {
  const parsed = hermesProfileBindingSchema.safeParse(input);
  if (!parsed.success) fail("hermes_profile_binding_invalid");
  const binding = parsed.data, file = binding.profilePath;
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
    if (!before.isFile() || before.nlink !== 1n || before.size !== BigInt(Buffer.byteLength(profileBytes))) fail("hermes_profile_config_invalid");
    fd = openSync(file, "r");
    const opened = fstatSync(fd, { bigint: true });
    // Windows lstat reports dev=0 while fstat reports the volume serial; compare
    // exact BigInt file IDs and canonical volume path, not those unlike fields.
    if (opened.ino !== before.ino || (process.platform !== "win32" && opened.dev !== before.dev) || opened.size !== before.size) fail("hermes_profile_changed");
    const bytes = readFileSync(fd), after = lstatSync(file, { bigint: true });
    if (after.ino !== opened.ino || after.dev !== before.dev || after.size !== opened.size
        || after.mtimeNs !== opened.mtimeNs || after.isSymbolicLink()) fail("hermes_profile_changed");
    // Exact reviewed bytes also reject duplicate keys, extra keys and YAML tags.
    if (!bytes.equals(Buffer.from(profileBytes)) || sha(bytes) !== binding.configDigest) fail("hermes_profile_config_invalid");
    return binding;
  } catch (error) {
    if (error.protocolAdmission) throw error;
    throw failure("hermes_profile_unreadable");
  } finally { if (fd !== undefined) closeSync(fd); }
}

// A future trusted Worker identity adapter may supply NONSECRET metadata only.
// There is intentionally no credential-store reader, JWT decoder or login here.
// This factory is not wired to config/API/model data. JSON copies cannot qualify.
const identitySchema = z.object({ sourceClass: z.literal(hermesAuthSourceClass), provider: z.literal("openai-codex"),
  provenance: z.literal("nonsecret_identity_metadata"), identityFingerprint: hash, approvedIdentityFingerprint: hash,
  accountCount: z.literal(1), interactionRequired: z.literal(false), accountChanged: z.literal(false),
  rotationRequested: z.literal(false), fallbackRequested: z.literal(false)
}).strict();
export function observeHermesSameOwner(readNonsecretMetadata) {
  let identity;
  if (readNonsecretMetadata !== undefined) {
    try { identity = identitySchema.safeParse(readNonsecretMetadata()); }
    catch { fail("hermes_auth_observation_invalid"); }
    if (!identity.success || identity.data.identityFingerprint !== identity.data.approvedIdentityFingerprint) fail("hermes_auth_policy_denied");
  }
  const receipt = Object.freeze({});
  observations.set(receipt, { identityFingerprint: identity?.data.identityFingerprint ?? null,
    ownerInteractionRequired: !identity, observedAt: performance.now() });
  return receipt;
}
function authAudit(receipt) {
  if (receipt === undefined) return { identityFingerprint: null, ownerInteractionRequired: true };
  const observation = observations.get(receipt);
  if (!observation || performance.now() - observation.observedAt > 60000) fail("hermes_auth_observation_invalid");
  return { identityFingerprint: observation.identityFingerprint, ownerInteractionRequired: observation.ownerInteractionRequired };
}
function audit(binding, authReceipt) {
  return Object.freeze({ authPolicyVersion: hermesAuthSourceVersion, profileVersion: binding.schemaVersion, hermesVersion: binding.hermesVersion,
    hermesCommit: binding.hermesCommit, configDigest: binding.configDigest,
    authSourceClass: binding.authSourceClass, ...authAudit(authReceipt) });
}
export function inspectHermesProfile(binding, repositoryPath) {
  return audit(readProfile(binding, repositoryPath));
}
export function sealHermesProfile(binding, { repositoryPath, readyRevision, authReceipt }) {
  if (!hash.safeParse(readyRevision).success) fail("hermes_profile_ready_invalid");
  const checked = readProfile(binding, repositoryPath), receipt = Object.freeze({});
  const stat = lstatSync(checked.profilePath, { bigint: true });
  snapshots.set(receipt, { binding: bindingKey(checked), repositoryPath, readyRevision,
    fileIdentity: `${stat.dev}:${stat.ino}`, identityFingerprint: authAudit(authReceipt).identityFingerprint });
  return receipt;
}
export function assertHermesProfile(snapshot, binding, { repositoryPath, readyRevision, authReceipt, requireAuth = true }) {
  const original = snapshots.get(snapshot);
  if (!original || original.repositoryPath !== repositoryPath || original.readyRevision !== readyRevision) fail("hermes_profile_ready_changed");
  const checked = readProfile(binding, repositoryPath);
  if (bindingKey(checked) !== original.binding) fail("hermes_profile_changed");
  const stat = lstatSync(checked.profilePath, { bigint: true });
  if (`${stat.dev}:${stat.ino}` !== original.fileIdentity) fail("hermes_profile_changed");
  const result = audit(checked, authReceipt);
  if (result.identityFingerprint !== original.identityFingerprint) fail("hermes_auth_identity_changed");
  if (requireAuth && result.ownerInteractionRequired) fail("hermes_owner_interaction_required");
  return result;
}
