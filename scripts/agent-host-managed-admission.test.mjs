import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { createManagedBackendFixture } from "./fixtures/trusted-pilot.mjs";
import { inspectFixedContainment } from "./lib/agent-host-fixed-execution.mjs";
import { nativeDigest, physicalIdentity } from "./lib/agent-host-native-footprint.mjs";
import { writerRecoveryEvidence } from "./lib/agent-host-writer-lock.mjs";
import { createOwnerAttestation } from "./lib/agent-host-hermes-owner-auth.mjs";
import { managedOwnerBinding, nativeEvidenceSchema } from "./lib/agent-host-managed-backend.mjs";
import { trustedPilotBytes, trustedPilotDecisionSchema } from "./lib/agent-host-trusted-pilot.mjs";
import { requestManagedAdmission, retireManagedAdmissionArtifacts, reserveManagedDispatch } from "./lib/agent-host-managed-admission.mjs";
import { readDurableNativeReview } from "./lib/agent-host-native-review.mjs";
import { qualifyNativeReconciliation, issueNativeReconciliationApproval, reconcileNativeArtifacts } from "./lib/agent-host-native-reconciliation.mjs";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { acquireApplicationLease, releaseApplicationLease } from "./lib/agent-host-application-lease.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
async function signedAdmissionFixture(t) {
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
  let phases = [], renewals = 0, order = [];
  const api = async (_route, options) => {
    const request = JSON.parse(options.body); phases.push(request.phase); order.push(request.phase);
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
  const grant = await requestManagedAdmission({ api, source, writerDigest, assertAuthority() {},
    refreshLease: async () => { renewals += 1; order.push("lease"); } });
  assert.ok(grant);
  assert.equal(renewals, 3);
  assert.deepEqual(order, ["lease", "backend_evidence", "lease", "decision", "lease"]);
  assert.deepEqual(phases, ["backend_evidence", "decision"]);
  assert.ok(fs.statSync(x.decisionPath).size > 0);
  const evidenceDigest = sha(fs.readFileSync(x.evidencePath));
  const executionId = JSON.parse(fs.readFileSync(x.decisionPath, "utf8")).payload.scope.executionId;
  return { ...x, evidenceDigest, executionId };
}
const windows = { skip: process.platform !== "win32", timeout: 60000 };
test("two-phase signed admission binds Worker evidence and accepted decision without a model process", windows, async t => {
  const x = await signedAdmissionFixture(t), { evidenceDigest, executionId } = x;
  assert.throws(() => retireManagedAdmissionArtifacts({ directory: x.privateRoot,
    executionId: "00000000-0000-4000-8000-000000000000", evidenceDigest }), /managed_admission_blocked/);
  assert.ok(fs.existsSync(x.evidencePath));
  const archive = retireManagedAdmissionArtifacts({ directory: x.privateRoot, executionId, evidenceDigest });
  assert.equal(fs.existsSync(x.evidencePath), false);
  assert.equal(fs.existsSync(x.decisionPath), false);
  assert.ok(fs.existsSync(`${archive}/managed-backend-evidence.json`));
  assert.ok(fs.existsSync(`${archive}/trusted-provider-pilot.json`));
  assert.equal(retireManagedAdmissionArtifacts({ directory: x.privateRoot, executionId, evidenceDigest }), archive);
});

test("managed dispatch reserves exact signed identity durably, rejects changed identity and replay", windows, async t => {
  const x = await signedAdmissionFixture(t);
  const options = { writerLock: x.options.writerLock, identity: x.options.envelope.identity, evidenceDigest: x.evidenceDigest };
  assert.throws(() => reserveManagedDispatch({ ...options, identity: { ...options.identity, taskId: "00000000-0000-4000-8000-000000000000" } }), /managed_admission_blocked/);
  const file = reserveManagedDispatch(options), bytes = fs.readFileSync(file);
  assert.deepEqual(JSON.parse(bytes), { state: "dispatch_reserved", scope: "managed_hermes_native",
    attemptDigest: nativeDigest(options.identity), decisionId: x.payload.decisionId, evidenceDigest: x.evidenceDigest });
  assert.throws(() => reserveManagedDispatch(options), /managed_admission_blocked/);
  assert.ok(fs.readFileSync(file).equals(bytes));
});

test("admission retirement recognizes a completed first rename before retry and preserves exact pair", windows, async t => {
  const x = await signedAdmissionFixture(t), options = { directory: x.privateRoot, executionId: x.executionId, evidenceDigest: x.evidenceDigest };
  const originals = [x.evidencePath, x.decisionPath].map(file => {
    const stat = fs.lstatSync(file, { bigint: true });
    return { file, bytes: fs.readFileSync(file), identity: `${stat.dev}:${stat.ino}` };
  });
  const originalRename = fs.renameSync;
  fs.renameSync = (from, to) => { originalRename(from, to); throw Error("synthetic_after_rename_interruption"); };
  syncBuiltinESMExports();
  try { assert.throws(() => retireManagedAdmissionArtifacts(options), /managed_admission_blocked/); }
  finally { fs.renameSync = originalRename; syncBuiltinESMExports(); }
  assert.equal(fs.existsSync(x.evidencePath), false); assert.equal(fs.existsSync(x.decisionPath), true);
  const target = retireManagedAdmissionArtifacts(options);
  for (const original of originals) {
    const archived = path.join(target, path.basename(original.file));
    assert.ok(fs.readFileSync(archived).equals(original.bytes));
    const stat = fs.lstatSync(archived, { bigint: true });
    assert.equal(`${stat.dev}:${stat.ino}`, original.identity);
    assert.equal(fs.existsSync(original.file), false);
  }
  assert.equal(retireManagedAdmissionArtifacts(options), target);
});

for (const fault of ["duplicate", "foreign", "changed"]) test(`admission retirement refuses ${fault} archive without replacing any files`, windows, async t => {
  const x = await signedAdmissionFixture(t), target = path.join(x.privateRoot, "spent", x.executionId);
  fs.mkdirSync(target, { recursive: true });
  const archiveEvidence = path.join(target, "managed-backend-evidence.json");
  if (fault === "duplicate") fs.copyFileSync(x.evidencePath, archiveEvidence);
  if (fault === "foreign") fs.writeFileSync(path.join(target, "foreign.json"), "{}\n");
  if (fault === "changed") { fs.renameSync(x.evidencePath, archiveEvidence); fs.writeFileSync(archiveEvidence, "{}\n"); }
  const tracked = [x.evidencePath, x.decisionPath, ...fs.readdirSync(target).map(name => path.join(target, name))].filter(file => fs.existsSync(file));
  const before = tracked.map(file => fs.readFileSync(file));
  assert.throws(() => retireManagedAdmissionArtifacts({ directory: x.privateRoot, executionId: x.executionId, evidenceDigest: x.evidenceDigest }), /managed_admission_blocked/);
  tracked.forEach((file, index) => assert.ok(fs.readFileSync(file).equals(before[index])));
});

test("failed managed native review reconciles exact stopped Windows Job, retains spent and permits next lease", windows, async t => {
  const x = await signedAdmissionFixture(t), root = path.join(x.root, "managed-recovery");
  fs.mkdirSync(root);
  const template = path.join(root, "template.json");
  fs.writeFileSync(template, JSON.stringify({ backend: JSON.parse(fs.readFileSync(x.evidencePath)).payload,
    decision: JSON.parse(fs.readFileSync(x.decisionPath)).payload }));
  const child = fileURLToPath(new URL("./fixtures/managed-native-recovery-child.mjs", import.meta.url));
  const { stdout } = await promisify(execFile)(process.execPath, [child, root, template], { windowsHide: true, timeout: 30000, maxBuffer: 16384 });
  const recovery = JSON.parse(stdout), review = readDurableNativeReview(recovery.directory);
  assert.equal(review.payload.public.verdict, "acceptance_failed");
  assert.equal(review.payload.binding.spent.record.scope, "managed_hermes_native");
  assert.equal(review.payload.job.activeProcesses, 0); assert.equal(review.payload.job.jobClosed, true);
  const spentBytes = fs.readFileSync(recovery.spentPath);
  assert.equal(qualifyNativeReconciliation(recovery.directory).eligible, true);
  const grant = issueNativeReconciliationApproval({ directory: recovery.directory, assertOwnerAuthority() {} });
  assert.equal(reconcileNativeArtifacts(grant).completed, true);
  assert.ok(fs.readFileSync(recovery.spentPath).equals(spentBytes));
  retireManagedAdmissionArtifacts({ directory: recovery.installation, executionId: recovery.identity.executionId,
    evidenceDigest: recovery.evidenceDigest });
  const writer = await acquireWriterLock(recovery.state);
  const lease = acquireApplicationLease({ writerLock: writer, applicationId: recovery.identity.applicationId,
    attempt: "00000000-0000-4000-8000-000000000001", runtime: { required: false, ports: [] } });
  releaseApplicationLease(lease); await writer.release();
});
