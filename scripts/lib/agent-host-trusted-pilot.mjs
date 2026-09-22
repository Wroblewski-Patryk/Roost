import fs from "node:fs";
import path from "node:path";
import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import contract from "./agent-host-provider-contract.cjs";
import { physicalIdentity, nativeDigest } from "./agent-host-native-footprint.mjs";
import { modelSelectionSchema, localHermesModelSelectionSchema } from "./agent-host-model-policy.mjs";
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
const selectionSchema = z.union([modelSelectionSchema, localHermesModelSelectionSchema]);
const providerSchema = z.object({ kind: z.enum(["direct_codex", "hermes_local"]), version: z.string().min(1).max(80),
  runtimeDigest: h, launcherDigest: h, profile: filePin, configurationDigest: h, modelSelection: selectionSchema }).strict();
const scopeSchema = z.object({ workspaceId: uuid, applicationId: uuid, taskId: uuid, executionId: uuid,
  checkoutIdentity: h, inputSeal: h, accessDigest: h, singleTaskDigest: h, filesystemDigest: h, writerDigest: h }).strict();
export const trustedPilotDecisionSchema = z.object({ schemaVersion: z.literal(trustedPilotVersion), decisionId: uuid,
  revision: z.number().int().positive(), state: z.enum(["accepted", "revoked"]),
  decidedAt: z.string().datetime(), expiresAt: z.string().datetime(), installationId: uuid,
  configurationIdentity: h, installationIdentity: h, provider: providerSchema, scope: scopeSchema,
  mode: z.literal("trusted_provider_pilot"), systemIsolation: z.literal(false), arbitraryProviderAdmission: z.literal(false),
  fullAutonomy: z.literal(false), residualRiskAccepted: z.literal(true),
  acknowledgement: z.literal(trustedPilotAcknowledgement),
  qualification: z.literal("closed_fixture_only")
}).strict();
const anchorSchema = z.object({ schemaVersion: z.literal(trustedPilotVersion), installationId: uuid, workspaceId: uuid,
  authorityPublicKey: z.string().min(32).max(2048), decisionFile: z.literal("trusted-provider-pilot.json"),
  profileFile: z.literal("trusted-provider-profile.json"), decisionId: uuid, revision: z.number().int().positive(), decisionDigest: h }).strict();
const profileSchema = z.object({ schemaVersion: z.literal(trustedPilotVersion), purpose: z.literal("managed-agent"),
  providerKind: z.enum(["direct_codex", "hermes_local"]), version: z.string().min(1).max(80),
  backend: z.enum(["openai", "ollama_loopback"]), fallback: z.literal("none"),
  modelSelection: selectionSchema, qualification: z.literal("closed_fixture_only") }).strict();

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
    if (p.state !== "accepted" || start > now || end <= now || end <= start || end - start > 86400000
      || p.decisionId !== anchor.decisionId || p.revision !== anchor.revision || decision.digest !== anchor.decisionDigest
      || p.configurationIdentity !== config.identity || p.installationIdentity !== installationIdentity
      || p.installationId !== anchor.installationId || p.scope.workspaceId !== anchor.workspaceId) fail();
    const selected = profileSchema.parse(JSON.parse(profile.body)), provider = providerSchema.parse(candidate);
    const kind = selected.providerKind, local = kind === "hermes_local";
    const pinned = contract.registry.providers.find(x => x.kind === (local ? "hermes_codex" : "direct_codex"));
    if (selected.version !== pinned.version || provider.version !== selected.version || provider.kind !== kind
      || selected.backend !== (local ? "ollama_loopback" : "openai")
      || !(local ? localHermesModelSelectionSchema : modelSelectionSchema).safeParse(selected.modelSelection).success
      || !same(selected.modelSelection, source.envelope.contract.modelSelection)
      || !same(provider.modelSelection, selected.modelSelection)) fail();
    const actualProvider = { kind, version: selected.version, runtimeDigest: nativeDigest(source.runtime),
      launcherDigest: nativeDigest(source.runtime.launcher), profile: { identity: profile.identity, digest: profile.digest },
      configurationDigest: nativeDigest(source.configuration), modelSelection: source.envelope.contract.modelSelection };
    const e = source.envelope, scope = { workspaceId: e.identity.workspaceId, applicationId: e.identity.applicationId,
      taskId: e.identity.taskId, executionId: e.identity.executionId, checkoutIdentity: physicalIdentity(source.repositoryPath),
      inputSeal: e.seal, accessDigest: nativeDigest(e.contract.access), singleTaskDigest: nativeDigest(e.contract.singleTask),
      filesystemDigest: nativeDigest(source.filesystemScope), writerDigest };
    if (!same(p.provider, actualProvider) || !same(provider, actualProvider) || !same(p.scope, scope)
      || e.identity.attempt !== 1 || e.contract.budgets.maxAttempts !== 1 || e.contract.access.externalWrites
      || e.contract.access.sandbox !== "workspace-write"
      || [...e.contract.access.tools, ...e.contract.access.permissions].some(x => !["repository_read", "repository_write", "local_test"].includes(x))) fail();
    return { schemaVersion: trustedPilotVersion, decisionId: p.decisionId, revision: p.revision, installationId: p.installationId,
      configuration: { identity: config.identity, digest: config.digest }, decision: { identity: decision.identity, digest: decision.digest },
      profile: actualProvider.profile, provider: actualProvider, scope, expiresAt: p.expiresAt,
      mode: p.mode, residualRiskAccepted: true, systemIsolation: false, arbitraryProviderAdmission: false, fullAutonomy: false,
      qualification: p.qualification };
  } catch { fail(); }
}
