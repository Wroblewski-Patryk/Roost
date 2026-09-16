// New original synthetic evidence, never a historical fixture or provider.
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { acquireWriterLock } from "../lib/agent-host-writer-lock.mjs";
import { acquireApplicationLease } from "../lib/agent-host-application-lease.mjs";
import { nativeDigest, physicalIdentity } from "../lib/agent-host-native-footprint.mjs";
import { createDurableNativeFixture, inspectDurableNativeFixture, fixtureFileBinding, fixtureRuntimeBinding, fixtureInstallationBinding } from "../lib/agent-host-fixture-ownership.mjs";
import { createNativeReview, prepareNativeReviewResume, authorizeNativeReviewResume, captureNativeReview, completeNativeReview } from "../lib/agent-host-native-review.mjs";
import { buildWindowsJobLauncher, startWindowsJob, isWindowsJobCleanupReceipt } from "../lib/agent-host-windows-job.mjs";
const parent = process.argv[2]; physicalIdentity(parent);
const state = path.join(parent, "state"), writerLock = await acquireWriterLock(state);
const identity = { executionId: randomUUID(), workspaceId: randomUUID(), taskId: randomUUID(), applicationId: randomUUID(), attempt: 1 }, authorityDigest = nativeDigest("synthetic fixture owner");
const fixtureOwnership = createDurableNativeFixture(parent, { writerLock, identity, authorityDigest, expiresAt: new Date(Date.now() + 3600000).toISOString() });
const { root, directory } = inspectDurableNativeFixture(fixtureOwnership), repository = path.join(root, "repository");
writeFileSync(path.join(root, ".roost-smoke-scope"), "synthetic scope");
const roots = ["checkout", "interpreter"].map(kind => { const location = path.join(parent, kind); mkdirSync(location); writeFileSync(path.join(location, "data.bin"), "synthetic install"); return { kind, path: location, files: [{ path: "data.bin" }] }; });
const manifestPath = path.join(parent, "manifest.json"), attestationPath = path.join(parent, "installation.json"), generatedReceiptPath = path.join(parent, "generated.json");
const manifest = JSON.stringify({ schemaVersion: 2, roots }), generated = JSON.stringify({ roots: [{ files: [] }, { files: [] }] }), sha = b => createHash("sha256").update(b).digest("hex");
writeFileSync(manifestPath, manifest); writeFileSync(generatedReceiptPath, generated);
writeFileSync(attestationPath, JSON.stringify({ manifestPath, manifestSha256: sha(manifest), generatedReceiptPath, generatedReceiptSha256: sha(generated) }));
const installation = { attestationPath, manifestPath }, applicationLease = acquireApplicationLease({ writerLock, applicationId: identity.applicationId, attempt: identity.executionId, runtime: { required: false, ports: [] } });
const spentPath = path.join(state, "synthetic-spent.json");writeFileSync(spentPath, JSON.stringify({ state: "dispatch_reserved", attemptDigest: nativeDigest(identity) }));
const review = createNativeReview({ writerLock, applicationLease, fixtureOwnership, envelope: { identity, revisions: { ready: "a".repeat(64) } },
  rootIdentity: physicalIdentity(repository), preFootprintDigest: "b".repeat(64), spentPath });
const artifact = await buildWindowsJobLauncher(root), output = path.join(repository, "executed.txt");
const runtime = { executable: fixtureRuntimeBinding(process.execPath), node: fixtureRuntimeBinding(process.execPath), launcher: fixtureRuntimeBinding(artifact.executable),
  deadline: new Date(Date.now()+60000).toISOString(), installation: fixtureInstallationBinding(installation),
  installationDigest: nativeDigest("synthetic approved install"), scopeMarker: fixtureFileBinding(path.join(root, ".roost-smoke-scope")) };
prepareNativeReviewResume(review, { runtime, authorityDigest, fixtureOwnership });
const code = `const fs=require('node:fs');if(!fs.existsSync(${JSON.stringify(path.join(directory, "resume-authorized.json"))}))process.exit(42);fs.writeFileSync(${JSON.stringify(output)},'after durable receipt');`;
const handle = await startWindowsJob(artifact, { executable: process.execPath, argv: ["-e", code], cwd: repository, environment: { SYSTEMROOT: process.env.SystemRoot },
  input: "", attempt: identity.executionId, durationMs: 10000, confirmResume(assignment) {
    if (existsSync(output)) throw Error("synthetic provider ran early");
    if (process.argv[3] === "nack") throw Error("synthetic nack before publication");
    return authorizeNativeReviewResume(review, { assignment, authorityDigest, fixtureOwnership, runtime });
  } });
let job;
try { job = await handle.completion; }
catch (error) { if (process.argv[3] !== "nack" || !isWindowsJobCleanupReceipt(error.details?.ownedTreeReceipt)) throw error; job = error.details.ownedTreeReceipt; }
if (process.argv[3] === "nack" ? job.resumed || existsSync(output) : job.rootExit !== 0 || !existsSync(output)) throw Error("synthetic execution evidence missing");
captureNativeReview(review, { ownedTreeReceipt: job, postFootprintDigest: "c".repeat(64), violations: [], comparison: { changes: [], changedDigests: [], categoryCounts: { content: 0, protected: 0 }, scopeReviewRequired: false } });
await completeNativeReview(review, { verify: () => ({ before: { exit: 1 }, after: { exit: job.rootExit, passed: job.rootExit === 0 }, minimalChange: job.rootExit === 0, testUnchanged: true, baselineCommitUnchanged: true }) });
process.stdout.write(JSON.stringify({ root, directory, executable: process.execPath, installation }) + "\n");
// Exit, leaving only these test-owned resources for normal reconciliation.
