// Harmless child-process fixture for restart recovery. No provider or network.
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { acquireWriterLock } from "../lib/agent-host-writer-lock.mjs";
import { acquireApplicationLease } from "../lib/agent-host-application-lease.mjs";
import { physicalIdentity, nativeDigest } from "../lib/agent-host-native-footprint.mjs";
import { createNativeReview, captureNativeReview, completeNativeReview, nativeReviewLocation } from "../lib/agent-host-native-review.mjs";
import { buildWindowsJobLauncher, startWindowsJob } from "../lib/agent-host-windows-job.mjs";
const root = process.argv[2]; physicalIdentity(root);
const state = path.join(root, "state"), workspace = path.join(root, "workspace");
mkdirSync(state); mkdirSync(workspace);
const writerLock = await acquireWriterLock(state), identity = { executionId: randomUUID(), workspaceId: randomUUID(), taskId: randomUUID(), applicationId: randomUUID(), attempt: 1 };
const applicationLease = acquireApplicationLease({ writerLock, applicationId: identity.applicationId, attempt: identity.executionId, runtime: { required: false, ports: [] } });
const spentPath = path.join(state, "synthetic-spent.json");
writeFileSync(spentPath, JSON.stringify({ state: "dispatch_reserved", attemptDigest: nativeDigest(identity) }), { flag: "wx" });
const review = createNativeReview({ writerLock, applicationLease, envelope: { identity, revisions: { ready: "a".repeat(64) } },
  rootIdentity: physicalIdentity(workspace), preFootprintDigest: "b".repeat(64), spentPath });
const artifact = await buildWindowsJobLauncher(root);
const handle = await startWindowsJob(artifact, { executable: process.execPath, argv: ["-e", "process.exit(0)"], cwd: workspace,
  environment: { SYSTEMROOT: process.env.SystemRoot }, input: "", attempt: identity.executionId, durationMs: 10000 });
const job = await handle.completion;
captureNativeReview(review, { ownedTreeReceipt: job, postFootprintDigest: "c".repeat(64), violations: [],
  comparison: { changes: [], changedDigests: [], categoryCounts: { content: 0, protected: 0 }, scopeReviewRequired: false } });
await completeNativeReview(review, { verify: () => ({ before: { exit: 1 }, after: { exit: 0, passed: true }, minimalChange: true, testUnchanged: true, baselineCommitUnchanged: true }) });
process.stdout.write(JSON.stringify({ review: path.basename(nativeReviewLocation(review)) }) + "\n");
// Deliberately leave the fixture-owned pair for the parent reconciler. All Job
// children are already stopped; process exit makes the original owner absent.
