import fs from "node:fs";
import path from "node:path";
import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import contract from "./agent-host-provider-contract.cjs";
import { physicalIdentity, nativeDigest } from "./agent-host-native-footprint.mjs";
import { taskModelSelectionSchema, localHermesModelSelectionSchema, managedBackendSelectionSchema } from "./agent-host-model-policy.mjs";
import { managedBackendBindingSchema, inspectManagedBackend, managedOwnerBinding } from "./agent-host-managed-backend.mjs";
import { inspectOwnerAttestation } from "./agent-host-hermes-owner-auth.mjs";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";

export const trustedPilotVersion = "roost-trusted-provider-pilot-v1";
export const trustedPilotAcknowledgement = "windows_account_authority_not_os_isolation";
const h = z.string().regex(/^[a-f0-9]{64}$/), uuid = z.string().uuid();
const sha = b => createHash("sha256").update(b).digest("hex");
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
export const trustedPilotBytes = v => Buffer.from(JSON.stringify(canonical(v)) + "\n");
const same = (a, b) => trustedPilotBytes(a).equals(trustedPilotBytes(b));
const fail = () => { throw Object.assign(Error("trusted_provider_pilot_blocked"), { protocolAdmission: true, retryable: false,
  publicMessage: "Trusted provider pilot acceptance is missing, revoked or does not match this attempt.",
  details: { reason: "trusted_provider_pilot_blocked", schemaVersion: trustedPilotVersion } }); };
const filePin = z.object({ identity: h, digest: h }).strict();
const selectionSchema = taskModelSelectionSchema;
// Both versioned backends use the existing Hermes class. Legacy local fixtures
// remain bounded; direct Codex and App Server have no pilot authority.
const providerSchema = z.object({ kind: z.enum(["hermes_local", "hermes_codex"]), version: z.string().min(1).max(80),
  runtimeDigest: h, launcherDigest: h, profile: filePin, configurationDigest: h, modelSelection: selectionSchema,
  managedBackend: managedBackendBindingSchema.optional() }).strict();
const scopeSchema = z.object({ workspaceId: uuid, applicationId: uuid, taskId: uuid, executionId: uuid,
  checkoutIdentity: h, inputSeal: h, accessDigest: h, singleTaskDigest: h, filesystemDigest: h, writerDigest: h }).strict();
export const trustedPilotDecisionSchema = z.object({ schemaVersion: z.literal(trustedPilotVersion), decisionId: uuid,
  revision: z.number().int().positive(), state: z.enum(["accepted", "revoked"]),
  decidedAt: z.string().datetime(), expiresAt: z.string().datetime(), installationId: uuid,
  configurationIdentity: h, installationIdentity: h, provider: providerSchema, scope: scopeSchema,
  mode: z.literal("trusted_provider_pilot"), systemIsolation: z.literal(false), arbitraryProviderAdmission: z.literal(false),
  fullAutonomy: z.literal(false), residualRiskAccepted: z.literal(true),
  acknowledgement: z.literal(trustedPilotAcknowledgement),
  qualification: z.enum(["closed_fixture_only", "signed_native_v1"])
}).strict();
const anchorBase = { schemaVersion: z.literal(trustedPilotVersion), installationId: uuid, workspaceId: uuid,
  authorityPublicKey: z.string().min(32).max(2048), decisionFile: z.literal("trusted-provider-pilot.json"),
  profileFile: z.literal("trusted-provider-profile.json") };
const anchorSchema = z.union([
  z.object({ ...anchorBase, decisionId: uuid, revision: z.number().int().positive(), decisionDigest: h }).strict(),
  z.object({ ...anchorBase, qualification: z.literal("signed_native_v1") }).strict()
]);
const profileSchema = z.object({ schemaVersion: z.literal(trustedPilotVersion), purpose: z.literal("managed-agent"),
  providerKind: z.enum(["hermes_local", "hermes_codex"]), version: z.string().min(1).max(80),
  backend: z.enum(["codex_responses", "ollama_loopback"]), fallback: z.literal("none"),
  modelSelection: selectionSchema, qualification: z.enum(["closed_fixture_only", "signed_native_v1"]) }).strict();

// Bound reads only: no provider imports, executable invocation, profile discovery,
// environment fallback or private-key loading. The trusted operator provisions
// the public-key anchor outside every checkout. Never select it from task/API data.
function read(file) {
  let fd;
  try {
    const identity = physicalIdentity(file, false), first = fs.lstatSync(file, { bigint: true });
    if (first.size > 65536n) fail();
    fd = fs.openSync(file, "r"); const opened = fs.fstatSync(fd, { bigint: true });
    if (opened.ino !== first.ino || opened.size !== first.size || (first.dev !== 0n && opened.dev !== first.dev)) fail();
    const bytes = Buffer.alloc(Number(first.size) + 1); let used = 0;
    while (used < bytes.length) { const n = fs.readSync(fd, bytes, used, bytes.length - used, used); if (!n) break; used += n; }
    const end = fs.fstatSync(fd, { bigint: true }), after = fs.lstatSync(file, { bigint: true });
    if (used !== Number(first.size) || end.size !== opened.size || end.mtimeNs !== opened.mtimeNs
      || after.ino !== first.ino || after.size !== first.size || after.mtimeNs !== first.mtimeNs
      || physicalIdentity(file, false) !== identity) fail();
    const body = bytes.subarray(0, used); return { identity, digest: sha(body), body };
  } finally { if (fd !== undefined) fs.closeSync(fd); }
}
function outside(root, file) {
  const relative = path.relative(root, file);
  if (!relative || !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(".." + path.sep)) fail();
}

// Worker proposal before the server signs the current attempt. The same pinned
// installation and profile are re-read by inspectTrustedPilotDecision after
// the signed decision is persisted; this does not grant execution authority.
export function proposeTrustedPilotDecision(configurationPath, source, writerDigest) {
  try {
    const writer = assertWriterLock(source.writerLock);
    if (source.qualification !== "signed_native_v1" || configurationPath !== path.join(writer.directory, "trusted-provider-pilot", "installation.json")) fail();
    physicalIdentity(source.repositoryPath); outside(source.repositoryPath, configurationPath);
    const directory = path.dirname(configurationPath), installationIdentity = physicalIdentity(directory);
    const config = read(configurationPath), anchor = anchorSchema.parse(JSON.parse(config.body));
    if (anchor.qualification !== "signed_native_v1") fail();
    const profileFile = path.join(directory, anchor.profileFile);
    outside(source.repositoryPath, profileFile);
    const profile = read(profileFile), selected = profileSchema.parse(JSON.parse(profile.body));
    const pinned = contract.registry.providers.find(x => x.kind === "hermes_codex");
    if (selected.qualification !== "signed_native_v1" || selected.providerKind !== "hermes_codex"
      || selected.version !== pinned.version || selected.backend !== "codex_responses"
      || !same(selected.modelSelection, source.envelope.contract.modelSelection)) fail();
    managedBackendSelectionSchema.parse(selected.modelSelection);
    const provider = { kind: selected.providerKind, version: selected.version,
      runtimeDigest: nativeDigest(source.runtime), launcherDigest: nativeDigest(source.runtime.launcher),
      profile: { identity: profile.identity, digest: profile.digest }, configurationDigest: nativeDigest(source.configuration),
      modelSelection: source.envelope.contract.modelSelection,
      managedBackend: inspectManagedBackend({ source, writerDigest, profile, profilePath: profileFile,
        installationIdentity, read, authorityPublicKey: anchor.authorityPublicKey }) };
    const e = source.envelope, scope = { workspaceId: e.identity.workspaceId, applicationId: e.identity.applicationId,
      taskId: e.identity.taskId, executionId: e.identity.executionId, checkoutIdentity: physicalIdentity(source.repositoryPath),
      inputSeal: e.seal, accessDigest: nativeDigest(e.contract.access), singleTaskDigest: nativeDigest(e.contract.singleTask),
      filesystemDigest: nativeDigest(source.filesystemScope), writerDigest };
    return { installation: { id: anchor.installationId, identity: installationIdentity, configurationIdentity: config.identity },
      provider: providerSchema.parse(provider), scope: scopeSchema.parse(scope), evidenceDigest: provider.managedBackend.evidence.digest };
  } catch { fail(); }
}

export function inspectTrustedPilotInstallation(configurationPath, source) {
  try {
    const writer = assertWriterLock(source.writerLock);
    if (source.qualification !== "signed_native_v1" || configurationPath !== path.join(writer.directory, "trusted-provider-pilot", "installation.json")) fail();
    physicalIdentity(source.repositoryPath); outside(source.repositoryPath, configurationPath);
    const directory = path.dirname(configurationPath), installationIdentity = physicalIdentity(directory);
    const config = read(configurationPath), anchor = anchorSchema.parse(JSON.parse(config.body));
    if (anchor.qualification !== "signed_native_v1" || anchor.workspaceId !== source.envelope.identity.workspaceId) fail();
    const profileFile = path.join(directory, anchor.profileFile); outside(source.repositoryPath, profileFile);
    const profile = read(profileFile), selected = profileSchema.parse(JSON.parse(profile.body));
    if (selected.qualification !== "signed_native_v1" || selected.providerKind !== "hermes_codex"
      || selected.backend !== "codex_responses" || !same(selected.modelSelection, source.envelope.contract.modelSelection)) fail();
    const key = createPublicKey(anchor.authorityPublicKey); if (key.asymmetricKeyType !== "ed25519") fail();
    const ownerFile = read(path.join(directory, "owner-attestation.json"));
    const ownerRecord = JSON.parse(ownerFile.body);
    const ownerAttestation = { id: ownerRecord.id, digest: ownerFile.digest };
    inspectOwnerAttestation(managedOwnerBinding(profileFile, profile.digest, ownerAttestation));
    return { installation: { id: anchor.installationId, identity: installationIdentity, configurationIdentity: config.identity },
      profile: { identity: profile.identity, digest: profile.digest }, authorityPublicKey: anchor.authorityPublicKey,
      ownerAttestation, directory, decisionFile: path.join(directory, anchor.decisionFile) };
  } catch { fail(); }
}

export function inspectManagedHostInstallation(configurationPath) {
  try {
    const directory = path.dirname(configurationPath);
    if (path.basename(configurationPath) !== "installation.json" || path.basename(directory) !== "trusted-provider-pilot") fail();
    physicalIdentity(directory);
    const anchor = anchorSchema.parse(JSON.parse(read(configurationPath).body));
    if (anchor.qualification !== "signed_native_v1") fail();
    const key = createPublicKey(anchor.authorityPublicKey); if (key.asymmetricKeyType !== "ed25519") fail();
    const selected = profileSchema.parse(JSON.parse(read(path.join(directory, anchor.profileFile)).body));
    if (selected.qualification !== "signed_native_v1" || selected.providerKind !== "hermes_codex"
      || selected.backend !== "codex_responses") fail();
    const selection = managedBackendSelectionSchema.parse(selected.modelSelection);
    if (selection.backend !== "codex_responses" || selection.riskClass !== "low") fail();
    const profileFile = path.join(directory, anchor.profileFile), profile = read(profileFile), ownerFile = read(path.join(directory, "owner-attestation.json"));
    const ownerRecord = JSON.parse(ownerFile.body);
    inspectOwnerAttestation(managedOwnerBinding(profileFile, profile.digest, { id: ownerRecord.id, digest: ownerFile.digest }));
    return true;
  } catch { return false; }
}

// This is a decision reader, not a second execution/admission registry. The
// existing host-containment WeakMap alone authenticates and spends launch proof.
export function inspectTrustedPilotDecision(configurationPath, source, writerDigest, candidate) {
  try {
    const writer = assertWriterLock(source.writerLock);
    if (configurationPath !== path.join(writer.directory, "trusted-provider-pilot", "installation.json")) fail();
    physicalIdentity(source.repositoryPath); outside(source.repositoryPath, configurationPath);
    const directory = path.dirname(configurationPath), installationIdentity = physicalIdentity(directory);
    const config = read(configurationPath), anchor = anchorSchema.parse(JSON.parse(config.body));
    const decisionFile = path.join(directory, anchor.decisionFile), profileFile = path.join(directory, anchor.profileFile);
    outside(source.repositoryPath, decisionFile); outside(source.repositoryPath, profileFile);
    const decision = read(decisionFile), profile = read(profileFile);
    const signed = z.object({ payload: trustedPilotDecisionSchema, signature: z.string().regex(/^[a-f0-9]{128}$/) }).strict().parse(JSON.parse(decision.body));
    const p = signed.payload, publicKey = createPublicKey(anchor.authorityPublicKey);
    if (publicKey.asymmetricKeyType !== "ed25519" || !verify(null, trustedPilotBytes(p), publicKey, Buffer.from(signed.signature, "hex"))) fail();
    const now = Date.now(), start = Date.parse(p.decidedAt), end = Date.parse(p.expiresAt);
    if (p.state !== "accepted" || start > now || end <= now || end <= start || end - start > (anchor.qualification === "signed_native_v1" ? 300000 : 86400000)
      || (anchor.qualification === "signed_native_v1" ? p.qualification !== "signed_native_v1"
        : p.decisionId !== anchor.decisionId || p.revision !== anchor.revision || decision.digest !== anchor.decisionDigest)
      || p.configurationIdentity !== config.identity || p.installationIdentity !== installationIdentity
      || p.installationId !== anchor.installationId || p.scope.workspaceId !== anchor.workspaceId) fail();
    const selected = profileSchema.parse(JSON.parse(profile.body));
    const provider = candidate === undefined && source.qualification === "signed_native_v1" ? null : providerSchema.parse(candidate);
    const kind = selected.providerKind, managed = kind === "hermes_codex";
    if (selected.qualification !== (source.qualification ?? "closed_fixture_only")
        || p.qualification !== selected.qualification
        || selected.qualification === "signed_native_v1" && !managed) fail();
    const pinned = contract.registry.providers.find(x => x.kind === "hermes_codex");
    const selection = (managed ? managedBackendSelectionSchema : localHermesModelSelectionSchema).parse(selected.modelSelection);
    if (provider && managed !== Boolean(provider.managedBackend)) fail();
    if (selected.version !== pinned.version || provider && (provider.version !== selected.version || provider.kind !== kind)
      || selected.backend !== (managed ? selection.backend : "ollama_loopback")
      || !same(selected.modelSelection, source.envelope.contract.modelSelection)
      || provider && !same(provider.modelSelection, selected.modelSelection)) fail();
    const actualProvider = { kind, version: selected.version, runtimeDigest: nativeDigest(source.runtime),
      launcherDigest: nativeDigest(source.runtime.launcher), profile: { identity: profile.identity, digest: profile.digest },
      configurationDigest: nativeDigest(source.configuration), modelSelection: source.envelope.contract.modelSelection,
      ...(managed ? { managedBackend: inspectManagedBackend({ source, writerDigest, profile, profilePath: profileFile,
        installationIdentity, read, authorityPublicKey: anchor.authorityPublicKey }) } : {}) };
    const e = source.envelope, scope = { workspaceId: e.identity.workspaceId, applicationId: e.identity.applicationId,
      taskId: e.identity.taskId, executionId: e.identity.executionId, checkoutIdentity: physicalIdentity(source.repositoryPath),
      inputSeal: e.seal, accessDigest: nativeDigest(e.contract.access), singleTaskDigest: nativeDigest(e.contract.singleTask),
      filesystemDigest: nativeDigest(source.filesystemScope), writerDigest };
    if (!same(p.provider, actualProvider) || provider && !same(provider, actualProvider) || !same(p.scope, scope)
      || e.identity.attempt !== 1 || e.contract.budgets.maxAttempts !== 1 || e.contract.access.externalWrites
      || e.contract.access.sandbox !== (e.contract.nativeBoundary?.profile === "inspect-readonly" ? "read-only" : "workspace-write")
      || (e.contract.nativeBoundary?.profile === "inspect-readonly"
        ? e.contract.access.tools.join() !== "repository_read" || e.contract.access.permissions.join() !== "repository_read"
        : [...e.contract.access.tools, ...e.contract.access.permissions].some(x => !["repository_read", "repository_write", "local_test"].includes(x)))) fail();
    return { schemaVersion: trustedPilotVersion, decisionId: p.decisionId, revision: p.revision, installationId: p.installationId,
      configuration: { identity: config.identity, digest: config.digest }, decision: { identity: decision.identity, digest: decision.digest },
      profile: actualProvider.profile, provider: actualProvider, scope, expiresAt: p.expiresAt,
      mode: p.mode, residualRiskAccepted: true, systemIsolation: false, arbitraryProviderAdmission: false, fullAutonomy: false,
      qualification: p.qualification };
  } catch { fail(); }
}
