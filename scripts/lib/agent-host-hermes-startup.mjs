import { assertCodingAuthority } from "./agent-host-native-authority.mjs";
import path from "node:path";
import { lstatSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import contract from "./agent-host-provider-contract.cjs";
import { modelSelectionSchema } from "./agent-host-model-policy.mjs";
import { hermesStartupProfileVersion, hermesStartupProfileDigest, hermesBudgetProfileVersion, hermesBudgetProfileDigest, hermesNativeProfileVersion, hermesNativeProfileDigest, inspectHermesProfile, sealHermesProfile, assertHermesProfile } from "./agent-host-hermes-profile.mjs";

import { hermesBudgetArgs } from "./agent-host-hermes-budget.mjs";

export const hermesStartupVersion = "roost-hermes-startup-receipt-v1";
export const hermesStartupPolicy = "roost-hermes-standard-startup-v1";
export const hermesStartupMaxAgeMs = 60000;
export const acceptedHermesStartupEffects = Object.freeze({ bundledSkillsLocalSync: true, localBannerPrefetch: true, networkUpdateCheck: false });
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const serialize = v => JSON.stringify(canonical(v));
const digest = v => createHash("sha256").update(serialize(v)).digest("hex");
const freeze = v => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const seals = new WeakMap(), receipts = new WeakMap();
const fail = reason => { throw Object.assign(new Error(reason), { protocolAdmission: true, retryable: false,
  publicMessage: "Hermes startup policy is blocked before process start.", details: { reason } }); };
const plumbing = ["SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "COMSPEC", "TEMP", "TMP", "USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA"];
const osPath = value => /^[a-z]:\\/i.test(value) ? path.win32 : path;

// Select names before reading values. No CODEX_HOME, token, proxy, Python hook,
// dispatcher or provider variable is read/copied from the parent environment.
export function hermesStartupEnvironment(binding, source = process.env, repositoryPath) {
  const env = {};
  for (const key of plumbing) {
    const names = Object.keys(source).filter(n => n.toUpperCase() === key);
    if (names.length > 1) fail("hermes_startup_environment_invalid");
    if (names.length) {
      const value = source[names[0]];
      if (typeof value !== "string" || value.length > 32768 || /[\x00\r\n]/.test(value)) fail("hermes_startup_environment_invalid");
      env[key] = value;
    }
  }
  if (binding.schemaVersion === hermesNativeProfileVersion && (!repositoryPath || !path.isAbsolute(repositoryPath) || /[;\r\n]/.test(repositoryPath))) fail("hermes_write_root_invalid");
  return { ...env, ...(binding.schemaVersion === hermesNativeProfileVersion ? { HERMES_WRITE_SAFE_ROOT: repositoryPath } : {}), HERMES_HOME: osPath(binding.profilePath).dirname(binding.profilePath), HERMES_SAFE_MODE: "1",
    PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1",
    GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" };
}

// The sealed operations are already checked against composed agent authority.
// File exposes writes: do not grant it to a repository-read-only task. Terminal
// is enabled only for an explicit local_test grant in BOTH packet lists.
export function hermesTaskToolsets(envelope) {
  if (envelope.contract.nativeBoundary) { assertCodingAuthority(envelope); return ["file", "terminal"]; }
  const access = envelope.contract.access;
  const allowed = op => access.tools.includes(op) && access.permissions.includes(op);
  if (!allowed("repository_read") || !allowed("repository_write")) fail("hermes_startup_tools_not_authorized");
  return allowed("local_test") ? ["file", "terminal"] : ["file"];
}
const expansion = { file: ["read_file", "write_file", "patch", "search_files"], terminal: ["terminal", "process_manage"] };
export function hermesStartupArgs(envelope) {
  const selection = modelSelectionSchema.safeParse(envelope.contract.modelSelection);
  if (!selection.success) fail("hermes_startup_model_policy_invalid");
  return ["chat", "--cli", "--oneshot", "--quiet", "--query-file", "-", "--provider", "openai-codex",
    "--model", selection.data.model, "--reasoning", selection.data.reasoningEffort,
    "--toolsets", hermesTaskToolsets(envelope).join(",")];
}
export function createHermesStartupCandidate({ provider, envelope, repositoryPath, environment, budget }) {
  return freeze({ command: provider.executablePath, args: [...hermesStartupArgs(envelope), ...([hermesBudgetProfileVersion, hermesNativeProfileVersion].includes(provider.profile?.schemaVersion) ? hermesBudgetArgs(budget, envelope) : [])], cwd: repositoryPath,
    environment: structuredClone(environment ?? hermesStartupEnvironment(provider.profile, process.env, repositoryPath)),
    acceptedSideEffects: { ...acceptedHermesStartupEffects }, shell: false, windowsHide: true });
}

// Metadata only, never open .env or credential files. The standard attested
// checkout/venv/Scripts launcher owns PROJECT_ROOT. No alternative entrypoint.
function assertNoStartupOverlays(provider, candidate) {
  const p = osPath(provider.executablePath);
  if (p.basename(provider.executablePath).toLowerCase() !== "hermes.exe"
      || p.basename(p.dirname(provider.executablePath)).toLowerCase() !== "scripts"
      || p.basename(p.dirname(p.dirname(provider.executablePath))).toLowerCase() !== "venv") fail("hermes_startup_layout_unqualified");
  const root = p.dirname(p.dirname(p.dirname(provider.executablePath)));
  const home = candidate.environment.HERMES_HOME;
  const absent = [p.join(root, ".env"), p.join(home, ".env"), p.join(home, ".op.env"),
    p.join(p.parse(candidate.cwd).root, "etc", "hermes")];
  for (const file of absent) {
    try { lstatSync(file); }
    catch (error) { if (error.code === "ENOENT") continue; fail("hermes_startup_overlay_unreadable"); }
    fail("hermes_startup_overlay_present");
  }
}
function validate({ provider, envelope, repositoryPath, candidate, budget }) {
  if (provider.kind !== "hermes_codex" || !provider.enabled || provider.version !== pin.version || provider.commit !== pin.commit
      || provider.officialSource !== pin.officialSource || ![hermesStartupProfileVersion, hermesBudgetProfileVersion, hermesNativeProfileVersion].includes(provider.profile?.schemaVersion)
      || provider.profile.configDigest !== (provider.profile.schemaVersion === hermesNativeProfileVersion ? hermesNativeProfileDigest : provider.profile.schemaVersion === hermesBudgetProfileVersion ? hermesBudgetProfileDigest : hermesStartupProfileDigest)
      || serialize(provider.policy) !== serialize(contract.registry.hermesPolicy)
      || Object.keys(provider).some(k => !["kind", "enabled", "version", "commit", "officialSource", "executablePath", "profile", "policy", "attestation"].includes(k))) fail("hermes_startup_profile_required");
  if (provider.profile.schemaVersion === hermesNativeProfileVersion) assertCodingAuthority(envelope);
  const env = candidate?.environment;
  if (!env || Object.keys(env).some(k => ![...plumbing, "HERMES_HOME", "HERMES_SAFE_MODE", "HERMES_WRITE_SAFE_ROOT", "PYTHONNOUSERSITE", "PYTHONDONTWRITEBYTECODE", "PYTHONUTF8", "GIT_TERMINAL_PROMPT", "GIT_OPTIONAL_LOCKS"].includes(k))) fail("hermes_startup_environment_invalid");
  const expectedEnvironment = hermesStartupEnvironment(provider.profile, env, repositoryPath);
  const expected = createHermesStartupCandidate({ provider, envelope, repositoryPath, environment: expectedEnvironment, budget });
  if (serialize(expected) !== serialize(candidate)) fail("hermes_startup_candidate_invalid");
  const profile = inspectHermesProfile(provider.profile, repositoryPath);
  assertNoStartupOverlays(provider, candidate);
  return profile;
}
export function sealHermesStartup(options) {
  validate(options);
  const seal = Object.freeze({});
  seals.set(seal, { envelope: options.envelope, ready: options.envelope.revisions.ready, input: options.envelope.seal,
    profile: sealHermesProfile(options.provider.profile, { repositoryPath: options.repositoryPath, readyRevision: options.envelope.revisions.ready }),
    provider: digest(options.provider), candidate: digest(options.candidate), at: Date.now(), monotonic: performance.now() });
  return seal;
}
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const hermesStartupReceiptSchema = z.object({
  schemaVersion: z.literal(hermesStartupVersion), policyVersion: z.literal(hermesStartupPolicy), qualification: z.literal("source_backed_synthetic_startup_policy"),
  hermesVersion: z.literal(pin.version), hermesCommit: z.literal(pin.commit), profileVersion: z.enum([hermesStartupProfileVersion, hermesBudgetProfileVersion, hermesNativeProfileVersion]), configDigest: z.enum([hermesStartupProfileDigest, hermesBudgetProfileDigest, hermesNativeProfileDigest]),
  authAttestationId: z.string().uuid(), authAttestationDigest: hash, authPolicyVersion: z.literal("roost-hermes-same-owner-auth-v2"),
  readyRevision: hash, inputSeal: hash, provider: z.literal("openai-codex"), modelSelection: modelSelectionSchema,
  toolsets: z.array(z.enum(["file", "terminal"])).min(1).max(2), expandedTools: z.array(z.enum(Object.values(expansion).flat())).min(1).max(6),
  categories: z.array(z.enum(["repository_read", "repository_write", "local_test"])).min(2).max(3),
  fallbackProvidersEmpty: z.literal(true), legacyFallbackEmpty: z.literal(true), worktree: z.literal(false), safeMode: z.literal(true), updateCheck: z.literal(false),
  acceptedSideEffects: z.object({ bundledSkillsLocalSync: z.literal(true), localBannerPrefetch: z.literal(true), networkUpdateCheck: z.literal(false) }).strict(),
  argvDigest: hash, environmentDigest: hash, policyDigest: hash, issuedAt: z.string().datetime(), expiresAt: z.string().datetime(), digest: hash
}).strict();

export function assertHermesStartup(seal, options) {
  const saved = seals.get(seal), now = Date.now();
  if (!saved || saved.envelope !== options.envelope || saved.ready !== options.envelope.revisions.ready || saved.input !== options.envelope.seal
      || saved.provider !== digest(options.provider) || saved.candidate !== digest(options.candidate)) fail("hermes_startup_ready_changed");
  const age = performance.now() - saved.monotonic;
  if (now < saved.at || now - saved.at >= hermesStartupMaxAgeMs || age < 0 || age >= hermesStartupMaxAgeMs) fail("hermes_startup_receipt_expired");
  assertHermesProfile(saved.profile, options.provider.profile, { repositoryPath: options.repositoryPath, readyRevision: options.envelope.revisions.ready });
  const profile = validate(options), toolsets = hermesTaskToolsets(options.envelope);
  const body = { schemaVersion: hermesStartupVersion, policyVersion: hermesStartupPolicy, qualification: "source_backed_synthetic_startup_policy",
    hermesVersion: pin.version, hermesCommit: pin.commit, profileVersion: profile.profileVersion, configDigest: profile.configDigest,
    authAttestationId: profile.auth.attestationId, authAttestationDigest: profile.auth.attestationDigest, authPolicyVersion: profile.auth.policyVersion,
    readyRevision: saved.ready, inputSeal: saved.input, provider: "openai-codex", modelSelection: { ...options.envelope.contract.modelSelection },
    toolsets, expandedTools: toolsets.flatMap(t => expansion[t]), categories: ["repository_read", "repository_write", ...(toolsets.includes("terminal") ? ["local_test"] : [])],
    fallbackProvidersEmpty: true, legacyFallbackEmpty: true, worktree: false, safeMode: true, updateCheck: false,
    acceptedSideEffects: { ...acceptedHermesStartupEffects }, argvDigest: digest(options.candidate.args), environmentDigest: digest(options.candidate.environment),
    policyDigest: digest([hermesStartupPolicy, acceptedHermesStartupEffects, expansion, profile.configDigest]),
    issuedAt: new Date(saved.at).toISOString(), expiresAt: new Date(saved.at + hermesStartupMaxAgeMs).toISOString() };
  const receipt = freeze(hermesStartupReceiptSchema.parse({ ...body, digest: digest(body) }));
  receipts.set(receipt, { seal, options });
  return receipt;
}

// Serialized diagnostic copies are not authority. Recheck private profile/auth,
// overlay absence, candidate and lifetime whenever consuming an opaque proof.
export function hermesStartupBlockers(blockers, receipt, options) {
  const proof = receipts.get(receipt);
  if (!proof || proof.options.envelope !== options.envelope) return [...blockers];
  try {
    if (serialize(assertHermesStartup(proof.seal, options)) !== serialize(receipt)) return [...blockers];
    return blockers.filter(code => code !== "hermes_sealed_config_enforcement_unproven");
  } catch { return [...blockers]; }
}

export function isHermesStartupReceipt(receipt, envelope, budget) {
  const proof = receipts.get(receipt);
  if (!proof || proof.options.envelope !== envelope || (budget && proof.options.budget !== budget)) return false;
  try { return serialize(assertHermesStartup(proof.seal, proof.options)) === serialize(receipt); }
  catch { return false; }
}

export function hermesStartupProcessMatches(receipt, envelope, processOptions) {
  const proof = receipts.get(receipt);
  if (!isHermesStartupReceipt(receipt, envelope)) return false;
  const candidate = proof.options.candidate;
  return serialize([candidate.command, candidate.args, candidate.cwd, candidate.environment])
    === serialize([processOptions.executable, processOptions.argv, processOptions.cwd, processOptions.environment]);
}
export function hermesStartupNativeRootMatches(receipt, envelope, root) {
  const proof = receipts.get(receipt);
  return Boolean(isHermesStartupReceipt(receipt, envelope) && receipt.profileVersion === hermesNativeProfileVersion
    && proof.options.candidate.cwd === root && proof.options.candidate.environment.HERMES_WRITE_SAFE_ROOT === root);
}
