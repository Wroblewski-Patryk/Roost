// Synthetic signed admission and harmless Windows Job, never a provider/model.
import path from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID, generateKeyPairSync, sign, createHash } from "node:crypto";
import { acquireWriterLock, writerRecoveryEvidence } from "../lib/agent-host-writer-lock.mjs";
import { acquireApplicationLease } from "../lib/agent-host-application-lease.mjs";
import { reserveManagedDispatch } from "../lib/agent-host-managed-admission.mjs";
import { trustedPilotBytes } from "../lib/agent-host-trusted-pilot.mjs";
import { physicalIdentity, nativeDigest } from "../lib/agent-host-native-footprint.mjs";
import { createNativeReview, captureNativeReview, completeNativeReview, nativeReviewLocation } from "../lib/agent-host-native-review.mjs";
import { buildWindowsJobLauncher, startWindowsJob } from "../lib/agent-host-windows-job.mjs";

const root = process.argv[2], template = JSON.parse(readFileSync(process.argv[3]));
physicalIdentity(root);
const state = path.join(root, "state"), workspace = path.join(root, "workspace"), installation = path.join(state, "trusted-provider-pilot");
mkdirSync(state); mkdirSync(workspace); mkdirSync(installation);
const writerLock = await acquireWriterLock(state), identity = { executionId: randomUUID(), workspaceId: randomUUID(),
  taskId: randomUUID(), applicationId: randomUUID(), attempt: 1 };
const writerDigest = nativeDigest(writerRecoveryEvidence(writerLock));
const lease = acquireApplicationLease({ writerLock, applicationId: identity.applicationId, attempt: identity.executionId,
  runtime: { required: false, ports: [] } });
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const signed = payload => ({ payload, signature: sign(null, trustedPilotBytes(payload), privateKey).toString("hex") });
const backend = template.backend, decision = template.decision;
backend.context.identityDigest = nativeDigest(identity); backend.context.writerDigest = writerDigest;
backend.installationIdentity = physicalIdentity(installation);
backend.issuedAt = new Date().toISOString(); backend.expiresAt = new Date(Date.now() + 120000).toISOString();
const evidence = Buffer.from(JSON.stringify(signed(backend)) + "\n"), evidenceDigest = createHash("sha256").update(evidence).digest("hex");
decision.scope = { ...decision.scope, ...Object.fromEntries(Object.entries(identity).filter(([key]) => key !== "attempt")),
  writerDigest, checkoutIdentity: physicalIdentity(workspace) };
decision.installationIdentity = physicalIdentity(installation);
decision.decidedAt = new Date().toISOString(); decision.expiresAt = backend.expiresAt;
decision.provider.managedBackend.evidence.digest = evidenceDigest;
writeFileSync(path.join(installation, "installation.json"), JSON.stringify({ installationId: decision.installationId,
  workspaceId: identity.workspaceId, authorityPublicKey: publicKey.export({ type: "spki", format: "pem" }),
  decisionFile: "trusted-provider-pilot.json" }));
writeFileSync(path.join(installation, "managed-backend-evidence.json"), evidence, { flag: "wx" });
writeFileSync(path.join(installation, "trusted-provider-pilot.json"), JSON.stringify(signed(decision)) + "\n", { flag: "wx" });
const spentPath = reserveManagedDispatch({ writerLock, identity, evidenceDigest });
const review = createNativeReview({ writerLock, applicationLease: lease, envelope: { identity, revisions: { ready: "a".repeat(64) } },
  rootIdentity: physicalIdentity(workspace), preFootprintDigest: "b".repeat(64), spentPath });
const launcher = await buildWindowsJobLauncher(root);
const job = await startWindowsJob(launcher, { executable: process.execPath, argv: ["-e", "process.exit(0)"], cwd: workspace,
  environment: { SYSTEMROOT: process.env.SystemRoot }, input: "", attempt: identity.executionId, durationMs: 10000 });
const stopped = await job.completion;
captureNativeReview(review, { ownedTreeReceipt: stopped, postFootprintDigest: "c".repeat(64), violations: [],
  comparison: { changes: [], changedDigests: [], categoryCounts: { content: 0, protected: 0 }, scopeReviewRequired: false } });
await completeNativeReview(review, { verify: () => ({ before: { exit: 0 }, after: { exit: 1, passed: false },
  minimalChange: true, testUnchanged: true, baselineCommitUnchanged: true }) });
process.stdout.write(JSON.stringify({ directory: nativeReviewLocation(review), state, identity, spentPath, installation, evidenceDigest }) + "\n");
// Deliberately leave only synthetic lease/Writer/admission for exact cleanup.
