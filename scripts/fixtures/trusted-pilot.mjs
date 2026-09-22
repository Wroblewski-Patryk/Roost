import fs from "node:fs";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { createHash, generateKeyPairSync, sign, randomUUID } from "node:crypto";
import fixed from "../lib/agent-host-fixed-program.cjs";
import contract from "../lib/agent-host-provider-contract.cjs";
import { validPacketFixture, pinReadyFixture } from "./execution-packet.mjs";
import { acquireWriterLock, writerRecoveryEvidence } from "../lib/agent-host-writer-lock.mjs";
import { prepareProviderInput } from "../lib/agent-host-provider-input.mjs";
import { prepareFixedExecution, inspectFixedContainment, abandonFixedExecution } from "../lib/agent-host-fixed-execution.mjs";
import { trustedPilotVersion, trustedPilotAcknowledgement, trustedPilotBytes } from "../lib/agent-host-trusted-pilot.mjs";
import { nativeDigest, physicalIdentity } from "../lib/agent-host-native-footprint.mjs";
const sha = b => createHash("sha256").update(b).digest("hex");
export async function createTrustedPilotFixture(t, kind = "hermes_local") {
  const parent = fs.realpathSync.native(os.tmpdir()), root = fs.mkdtempSync(path.join(parent, "roost-trusted-pilot-"));
  const state = path.join(root, "state"), repositoryPath = path.join(root, "repository"), privateRoot = path.join(state, "trusted-provider-pilot");
  fs.mkdirSync(repositoryPath); fs.mkdirSync(state); fs.mkdirSync(privateRoot);
  const writerLock = await acquireWriterLock(state), f = validPacketFixture();
  f.packet.contract.executionClass = fixed.program;
  if (kind === "hermes_local") f.packet.contract.modelSelection = { provider: kind, model: "gpt-oss:20b", modelFamily: "gpt-oss",
    modelDigest: "sha256:" + "b".repeat(64), reasoningEffort: "low" };
  pinReadyFixture(f);
  const authority = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
    currentCommit: "a".repeat(40), assertAuthority() {} };
  const envelope = prepareProviderInput(authority);
  const grant = await prepareFixedExecution({ envelope, writerLock, repositoryPath, claimed: f.claimed,
    assertAuthority() {}, deadline: new Date(Date.now() + 55000).toISOString() });
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  const source = inspectFixedContainment(grant), writerDigest = nativeDigest(writerRecoveryEvidence(writerLock));
  const configurationPath = path.join(privateRoot, "installation.json"), profilePath = path.join(privateRoot, "trusted-provider-profile.json"),
    decisionPath = path.join(privateRoot, "trusted-provider-pilot.json");
  fs.writeFileSync(configurationPath, "{}\n", { flag: "wx" });
  const version = contract.registry.providers.find(p => p.kind === (kind === "hermes_local" ? "hermes_codex" : kind)).version;
  const profile = { schemaVersion: trustedPilotVersion, purpose: "managed-agent", providerKind: kind, version,
    backend: kind === "hermes_local" ? "ollama_loopback" : "openai", fallback: "none", modelSelection: envelope.contract.modelSelection,
    qualification: "closed_fixture_only" };
  fs.writeFileSync(profilePath, trustedPilotBytes(profile), { flag: "wx" });
  const provider = { kind, version, runtimeDigest: nativeDigest(source.runtime), launcherDigest: nativeDigest(source.runtime.launcher),
    profile: { identity: physicalIdentity(profilePath, false), digest: sha(fs.readFileSync(profilePath)) },
    configurationDigest: nativeDigest(source.configuration), modelSelection: envelope.contract.modelSelection };
  const installationId = randomUUID(), decisionId = randomUUID(), { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const payload = { schemaVersion: trustedPilotVersion, decisionId, revision: 1, state: "accepted", decidedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(), installationId, configurationIdentity: physicalIdentity(configurationPath, false),
    installationIdentity: physicalIdentity(privateRoot), provider,
    scope: { workspaceId: envelope.identity.workspaceId, applicationId: envelope.identity.applicationId, taskId: envelope.identity.taskId,
      executionId: envelope.identity.executionId, checkoutIdentity: physicalIdentity(repositoryPath), inputSeal: envelope.seal,
      accessDigest: nativeDigest(envelope.contract.access), singleTaskDigest: nativeDigest(envelope.contract.singleTask),
      filesystemDigest: nativeDigest(source.filesystemScope), writerDigest },
    mode: "trusted_provider_pilot", residualRiskAccepted: true, systemIsolation: false, arbitraryProviderAdmission: false, fullAutonomy: false,
    acknowledgement: trustedPilotAcknowledgement, qualification: "closed_fixture_only" };
  const anchor = { schemaVersion: trustedPilotVersion, installationId, workspaceId: envelope.identity.workspaceId,
    authorityPublicKey: publicKey.export({ type: "spki", format: "pem" }), decisionFile: "trusted-provider-pilot.json",
    profileFile: "trusted-provider-profile.json", decisionId, revision: 1, decisionDigest: "0".repeat(64) };
  function publish() {
    const record = { payload, signature: sign(null, trustedPilotBytes(payload), privateKey).toString("hex") };
    fs.writeFileSync(decisionPath, trustedPilotBytes(record)); anchor.decisionDigest = sha(fs.readFileSync(decisionPath));
    fs.writeFileSync(configurationPath, trustedPilotBytes(anchor));
  }
  publish();
  const options = { provider: fixed.declaration, fixedGrant: grant, writerLock, envelope, repositoryPath, sandbox: "workspace-write",
    trustedPilot: { configurationPath, provider: structuredClone(provider) } };
  const directory = path.join(state, "native-review-" + f.claimed.id), location = JSON.parse(fs.readFileSync(path.join(directory, "fixed-location.json")));
  t.after(async () => {
    if (fs.existsSync(location.root)) abandonFixedExecution(grant);
    await writerLock.release(); assert.equal(fs.realpathSync.native(root), root); assert.equal(path.dirname(root), parent); fs.rmSync(root, { recursive: true });
  });
  function publishProfile() {
    fs.writeFileSync(profilePath, trustedPilotBytes(profile));
    const pin = { identity: physicalIdentity(profilePath, false), digest: sha(fs.readFileSync(profilePath)) };
    payload.provider.profile = pin; options.trustedPilot.provider.profile = structuredClone(pin); publish();
  }
  return { root, privateRoot, state, f, authority, options, grant, location, directory, payload, anchor, profile, profilePath, decisionPath, configurationPath, publish, publishProfile };
}
