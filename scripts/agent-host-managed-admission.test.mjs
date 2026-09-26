import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { createManagedBackendFixture } from "./fixtures/trusted-pilot.mjs";
import { inspectFixedContainment } from "./lib/agent-host-fixed-execution.mjs";
import { nativeDigest, physicalIdentity } from "./lib/agent-host-native-footprint.mjs";
import { writerRecoveryEvidence } from "./lib/agent-host-writer-lock.mjs";
import { createOwnerAttestation } from "./lib/agent-host-hermes-owner-auth.mjs";
import { managedOwnerBinding, nativeEvidenceSchema } from "./lib/agent-host-managed-backend.mjs";
import { trustedPilotBytes, trustedPilotDecisionSchema } from "./lib/agent-host-trusted-pilot.mjs";
import { requestManagedAdmission } from "./lib/agent-host-managed-admission.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
test("two-phase signed admission binds Worker evidence and accepted decision without a model process", {
  skip: process.platform !== "win32", timeout: 60000
}, async t => {
  const x = await createManagedBackendFixture(t, "codex_responses");
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  x.profile.qualification = "signed_native_v1";
  fs.writeFileSync(x.profilePath, trustedPilotBytes(x.profile));
  const profileDigest = sha(fs.readFileSync(x.profilePath));
  const owner = createOwnerAttestation(managedOwnerBinding(x.profilePath, profileDigest));
  fs.writeFileSync(x.authPath, owner.bytes);
  fs.writeFileSync(x.configurationPath, trustedPilotBytes({ schemaVersion: "roost-trusted-provider-pilot-v1",
    installationId: x.anchor.installationId, workspaceId: x.anchor.workspaceId,
    authorityPublicKey: publicKey.export({ type: "spki", format: "pem" }),
    decisionFile: "trusted-provider-pilot.json", profileFile: "trusted-provider-profile.json",
    qualification: "signed_native_v1" }));
  fs.unlinkSync(x.evidencePath); fs.unlinkSync(x.decisionPath);
  const source = inspectFixedContainment(x.grant);
  source.qualification = "signed_native_v1";
  source.gates.launcher = { sourceDigest: source.gates.launcher.sourceDigest };
  source.gates.outputBudget = "worker_deadline_output_intent";
  const writerDigest = nativeDigest(writerRecoveryEvidence(x.options.writerLock));
  const signed = payload => ({ payload, signature: sign(null, trustedPilotBytes(payload), privateKey).toString("hex") });
  let phases = [];
  const api = async (_route, options) => {
    const request = JSON.parse(options.body); phases.push(request.phase);
    if (request.phase === "backend_evidence") {
      assert.equal(request.source.ownerAttestation.digest, owner.binding.digest);
      const payload = nativeEvidenceSchema.parse({ ...request.source,
        signatureDomain: "roost-managed-backend-evidence-v1", schemaVersion: "roost-managed-hermes-backend-v1",
        id: x.record.id, state: "accepted", issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 120000).toISOString(), purpose: "managed-agent", qualification: "signed_native_v1" });
      return { schemaVersion: "roost-managed-admission-v1", phase: request.phase, signed: signed(payload) };
    }
    assert.equal(request.phase, "decision");
    assert.equal(request.installation.identity, physicalIdentity(x.privateRoot));
    const payload = trustedPilotDecisionSchema.parse({ ...x.payload, provider: request.provider, scope: request.scope,
      decisionId: x.payload.decisionId, revision: 1, state: "accepted", decidedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 120000).toISOString(), installationId: request.installation.id,
      installationIdentity: request.installation.identity, configurationIdentity: request.installation.configurationIdentity,
      qualification: "signed_native_v1" });
    return { schemaVersion: "roost-managed-admission-v1", phase: request.phase, signed: signed(payload) };
  };
  const grant = await requestManagedAdmission({ api, source, writerDigest, assertAuthority() {} });
  assert.ok(grant);
  assert.deepEqual(phases, ["backend_evidence", "decision"]);
  assert.ok(fs.statSync(x.decisionPath).size > 0);
});
