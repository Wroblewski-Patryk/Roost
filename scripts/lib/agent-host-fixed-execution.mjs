import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fixed from "./agent-host-fixed-program.cjs";
import { assertProviderInputAvailable } from "./agent-host-provider-input.mjs";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
import { acquireApplicationLease, assertApplicationLease, releaseApplicationLease } from "./agent-host-application-lease.mjs";
import { physicalIdentity, nativeDigest } from "./agent-host-native-footprint.mjs";
import { createDurableNativeFixture, inspectDurableNativeFixture, cleanupDurableNativeFixture, fixtureRuntimeBinding, fixtureFileBinding, fixtureInstallationBinding } from "./agent-host-fixture-ownership.mjs";
import { buildWindowsJobLauncher, assertWindowsJobCapability, startWindowsJob, isWindowsJobCleanupReceipt } from "./agent-host-windows-job.mjs";
import { createNativeReview, prepareNativeReviewResume, authorizeNativeReviewResume, captureNativeReview, completeNativeReview, assertNativeReviewCleanup, recordNativeReviewCleanup } from "./agent-host-native-review.mjs";
import { assertHostContainmentAttempt } from "./agent-host-containment.mjs";

const grants = new WeakMap(), exec = promisify(execFile);
const source = fileURLToPath(new URL("../roost-fixed-effect.cs", import.meta.url));
const sha = value => createHash("sha256").update(value).digest("hex");
const claimDigest = c => nativeDigest({ id: c?.id, attempt: c?.attempt, taskId: c?.taskId, workspaceId: c?.workspaceId,
  applicationId: c?.applicationId, lease: sha(String(c?.leaseToken)), startedAt: c?.startedAt });
// Windows servicing hardlinks are expected for this fixed OS compiler only.
function compilerIdentity(file) {
  physicalIdentity(path.dirname(file));
  const a = fs.lstatSync(file, { bigint: true });
  if (!a.isFile() || a.isSymbolicLink() || fs.realpathSync.native(file).toLowerCase() !== file.toLowerCase() || a.size > 128n * 1024n * 1024n) fail();
  const digest = sha(fs.readFileSync(file)), b = fs.lstatSync(file, { bigint: true });
  const stamp = s => [s.dev, s.ino, s.size, s.mtimeNs, s.ctimeNs, s.nlink].map(String);
  if (nativeDigest(stamp(a)) !== nativeDigest(stamp(b))) fail();
  return { pathDigest: nativeDigest(file), identity: nativeDigest(stamp(b)), digest };
}
const fail = () => { throw Object.assign(Error("synthetic_execution_unproven"), { protocolAdmission: true, retryable: false }); };
export function fixedProgramSource() {
  const bytes = fs.readFileSync(source, "utf8").replace(/\r\n/g, "\n");
  if (sha(bytes) !== fixed.sourceDigest) fail();
  return bytes;
}
export function assertFixedTask(envelope) {
  if (envelope.contract.executionClass !== fixed.program || envelope.identity.attempt !== 1 || envelope.contract.budgets.maxAttempts !== 1) fail();
}
export function createFixedOutputBudget() {
  // There is no model/token stream. The one compiled write is exactly 22 bytes.
  return Object.freeze({ assertWithinBudget() { fixedProgramSource(); }, observeUsage() { fail(); }, failure: null });
}
function save(file, value) {
  const fd = fs.openSync(file, "wx", 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value) + "\n"); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function check(s) {
  s.assertAuthority(); assertWriterLock(s.writerLock); assertApplicationLease(s.lease);
  if (claimDigest(s.claimed) !== s.claimDigest) fail();
  if (Date.now() >= Date.parse(s.deadline) || Date.now() < s.wall || performance.now() - s.at < 0 || performance.now() - s.at >= s.lifetime) fail();
  assertProviderInputAvailableIfPrepared(s);
  inspectDurableNativeFixture(s.ownership); assertWindowsJobCapability(s.artifact); fixedProgramSource();
  if (physicalIdentity(s.repositoryPath) !== s.repositoryIdentity || nativeDigest(fixtureRuntimeBinding(s.executable)) !== nativeDigest(s.executableBinding)
      || nativeDigest(compilerIdentity(s.compiler)) !== nativeDigest(s.compilerBinding)
      || nativeDigest(fixtureInstallationBinding(s.installation)) !== nativeDigest(s.installationBinding)) fail();
}
function assertProviderInputAvailableIfPrepared(s) { if (s.phase === "prepared") assertProviderInputAvailable(s.envelope); }
export async function prepareFixedExecution({ envelope, writerLock, repositoryPath, claimed, assertAuthority, deadline }) {
  assertProviderInputAvailable(envelope); assertFixedTask(envelope); assertAuthority();
  const writer = assertWriterLock(writerLock), wall = Date.now(), lifetime = Math.min(60000, Date.parse(deadline) - wall);
  if (process.platform !== "win32" || !Number.isFinite(lifetime) || lifetime <= 5000 || claimed.id !== envelope.identity.executionId
      || claimed.attempt !== envelope.identity.attempt || claimed.taskId !== envelope.identity.taskId || claimed.workspaceId !== envelope.identity.workspaceId
      || claimed.applicationId !== envelope.identity.applicationId || typeof claimed.leaseToken !== "string" || !claimed.leaseToken || !Number.isFinite(Date.parse(claimed.startedAt))) fail();
  const authorityDigest = nativeDigest({ input: envelope.seal, ready: envelope.revisions.ready, claim: { id: claimed.id, attempt: claimed.attempt,
    lease: sha(claimed.leaseToken), startedAt: claimed.startedAt }, program: fixed.declaration });
  let ownership, lease;
  try {
    ownership = createDurableNativeFixture(fs.realpathSync.native(os.tmpdir()), { writerLock, identity: envelope.identity, authorityDigest, expiresAt: new Date(wall + lifetime).toISOString() });
    const { root, directory } = inspectDurableNativeFixture(ownership), cwd = path.join(root, "repository"), effect = path.join(cwd, "synthetic-effect.bin");
    fs.writeFileSync(path.join(root, ".roost-smoke-scope"), fixed.program, { flag: "wx" });
    fs.writeFileSync(effect, "", { flag: "wx" });
    lease = acquireApplicationLease({ writerLock, applicationId: envelope.identity.applicationId, attempt: envelope.identity.executionId, runtime: { required: false, ports: [] } });
    const spentPath = path.join(writer.directory, "fixed-spent-" + envelope.identity.executionId + ".json");
    save(spentPath, { state: "dispatch_reserved", scope: "fixed_synthetic_only", attemptDigest: nativeDigest(envelope.identity), authorityDigest });
    const sourceRoot = path.join(directory, "source"), buildRoot = path.join(directory, "build"); fs.mkdirSync(sourceRoot); fs.mkdirSync(buildRoot);
    const snapshot = path.join(sourceRoot, "fixed.cs"); fs.writeFileSync(snapshot, fixedProgramSource(), { flag: "wx" });
    const executable = path.join(buildRoot, "roost-fixed-effect.exe"), compiler = path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
    const compilerBinding = compilerIdentity(compiler);
    await exec(compiler, ["/nologo", "/noconfig", "/target:exe", "/platform:x64", "/optimize+", `/out:${executable}`, snapshot], { windowsHide: true, timeout: 30000, maxBuffer: 65536 });
    if (sha(fs.readFileSync(snapshot)) !== fixed.sourceDigest || nativeDigest(compilerIdentity(compiler)) !== nativeDigest(compilerBinding)) fail();
    const artifact = await buildWindowsJobLauncher(buildRoot), executableBinding = fixtureRuntimeBinding(executable);
    const roots = [sourceRoot, buildRoot].map(location => ({ path: location, files: fs.readdirSync(location).sort().map(name => ({ path: name, sha256: sha(fs.readFileSync(path.join(location, name))) })) }));
    const manifestPath = path.join(directory, "fixed-installation.json"), generatedReceiptPath = path.join(directory, "fixed-generated.json"), attestationPath = path.join(directory, "fixed-attestation.json");
    save(manifestPath, { schemaVersion: 2, roots }); save(generatedReceiptPath, { roots: [{ files: [] }, { files: [] }] });
    save(attestationPath, { manifestPath, manifestSha256: sha(fs.readFileSync(manifestPath)), generatedReceiptPath, generatedReceiptSha256: sha(fs.readFileSync(generatedReceiptPath)), program: fixed.declaration, compiler: compilerBinding, executable: executableBinding });
    const installation = { manifestPath, attestationPath }, installationBinding = fixtureInstallationBinding(installation);
    // Private lookup only. Recovery independently checks the original signed chain.
    save(path.join(directory, "fixed-location.json"), { root, executable, installation });
    const effectIdentity = fixtureFileBinding(effect).identity, repositoryIdentity = physicalIdentity(repositoryPath);
    const stable = () => { if (physicalIdentity(repositoryPath) !== repositoryIdentity || fixtureFileBinding(effect).identity !== effectIdentity) fail(); };
    const review = createNativeReview({ writerLock, applicationLease: lease, envelope, fixtureOwnership: ownership, spentPath,
      rootIdentity: physicalIdentity(cwd), preFootprintDigest: nativeDigest({ effect: "empty", input: envelope.seal }), assertWorkspaceStable: stable });
    const s = { envelope, claimed, claimDigest: claimDigest(claimed), writerLock, ownership, lease, root, directory, cwd, effect, effectIdentity, review, authorityDigest, artifact, executable,
      executableBinding, compiler, compilerBinding, installation, installationBinding, repositoryPath, repositoryIdentity, stable, assertAuthority,
      deadline: new Date(wall + lifetime).toISOString(), wall, at: performance.now(), lifetime, phase: "prepared" };
    check(s);
    s.runtime = { executable: executableBinding, node: fixtureRuntimeBinding(process.execPath), launcher: fixtureRuntimeBinding(artifact.executable),
      deadline: s.deadline, installation: installationBinding, installationDigest: nativeDigest({ source: fixed.sourceDigest, compiler: compilerBinding, executable: executableBinding }),
      scopeMarker: fixtureFileBinding(path.join(root, ".roost-smoke-scope")), inputSeal: envelope.seal, claimDigest: authorityDigest, effectIdentity, suppliedHandles: 1 };
    prepareNativeReviewResume(review, { runtime: s.runtime, authorityDigest, fixtureOwnership: ownership });
    const grant = Object.freeze({}); grants.set(grant, s); return grant;
  } catch (error) {
    // No target has been created during preparation. Preserve every spent/evidence record.
    if (ownership) { try { cleanupDurableNativeFixture(ownership); if (lease) releaseApplicationLease(lease); } catch { error.leaseLost = true; } }
    throw error;
  }
}
// Private source for the containment boundary: only a genuine existing grant
// can expose a freshly checked binding. No caller-selected executable or policy.
export function inspectFixedContainment(grant) {
  const s = grants.get(grant);
  if (!s || !["prepared", "spent", "running"].includes(s.phase)) fail();
  check(s);
  return { grant, envelope: s.envelope, claimed: s.claimed, writerLock: s.writerLock,
    repositoryPath: s.repositoryPath, runtime: structuredClone(s.runtime), expiresAt: s.deadline,
    configuration: { argv: [], input: "", environment: { SYSTEMROOT: process.env.SystemRoot }, suppliedHandles: 1 },
    gates: { jobVersion: "roost-windows-job-v2", launcher: assertWindowsJobCapability(s.artifact),
      originalOwnership: true, durableResume: true, cleanup: "owned_job_zero_processes",
      recovery: "original_b28_cleanup_only", outputBudget: "fixed_22_bytes_zero_model_tokens",
      durationDeadline: s.deadline, release: "independent_review_no_release" },
    filesystemScope: { repositoryIdentity: s.repositoryIdentity, cwdIdentity: physicalIdentity(s.cwd),
      outputHandleIdentity: s.effectIdentity, suppliedHandles: 1 } };
}
export function consumeFixedExecution(grant, envelope, claimed, containmentReceipt) {
  const s = grants.get(grant); if (!s || s.phase !== "prepared" || s.envelope !== envelope || claimDigest(claimed) !== s.claimDigest) fail();
  assertHostContainmentAttempt(containmentReceipt, grant);
  check(s); s.containmentReceipt = containmentReceipt; s.phase = "spent"; return grant;
}
export function abandonFixedExecution(grant) {
  const s = grants.get(grant); if (!s || !["prepared", "spent", "refused"].includes(s.phase)) fail();
  s.phase = "abandoned"; cleanupDurableNativeFixture(s.ownership); releaseApplicationLease(s.lease);
}
export async function runFixedExecution(grant, { signal, remainingMs }) {
  const s = grants.get(grant); if (!s || s.phase !== "spent") fail();
  // A refused pre-create check still owns a provably unstarted fixture; retain
  // the existing explicit abandonment path, not process-recovery authority.
  try { assertHostContainmentAttempt(s.containmentReceipt, grant); check(s); }
  catch (error) { s.phase = "refused"; throw error; }
  s.phase = "running";
  let job, handle, timer, error;
  try {
    assertHostContainmentAttempt(s.containmentReceipt, grant);
    check(s); if (signal?.aborted) fail();
    const durationMs = Math.floor(Math.min(5000, remainingMs() - 3000, Date.parse(s.deadline) - Date.now() - 3000)); if (durationMs < 1) fail();
    handle = await startWindowsJob(s.artifact, { executable: s.executable, argv: [], cwd: s.cwd, environment: { SYSTEMROOT: process.env.SystemRoot }, input: "",
      fixedEffect: true, attempt: s.envelope.identity.executionId, durationMs,
      confirmResume(assignment) {
        assertHostContainmentAttempt(s.containmentReceipt, grant);
        check(s); s.stable(); if (signal?.aborted || fs.statSync(s.effect).size !== 0) fail();
        const digest = authorizeNativeReviewResume(s.review, { assignment, runtime: s.runtime, authorityDigest: s.authorityDigest, fixtureOwnership: s.ownership });
        check(s); if (signal?.aborted || fs.statSync(s.effect).size !== 0) fail(); return digest;
      } });
    timer = setInterval(() => { try { check(s); if (signal?.aborted || remainingMs() <= 0) fail(); } catch (e) { error ??= e; handle.stop("preparation_failed"); } }, 25);
    job = await handle.completion;
  } catch (e) { error ??= e; if (isWindowsJobCleanupReceipt(e.details?.ownedTreeReceipt)) job = e.details.ownedTreeReceipt; }
  finally { clearInterval(timer); }
  if (!isWindowsJobCleanupReceipt(job)) { if (handle) { handle.stop(); await handle.completion.catch(() => {}); } throw Object.assign(error ?? Error("synthetic_job_unproven"), { leaseLost: true }); }
  s.phase = "terminal"; s.stable();
  const bytes = fs.readFileSync(s.effect), passed = !error && job.resumed && job.rootExit === 0 && bytes.equals(Buffer.from(fixed.output));
  const noEffect = !job.resumed && bytes.length === 0;
  captureNativeReview(s.review, { ownedTreeReceipt: job, postFootprintDigest: sha(bytes), violations: passed || noEffect ? [] : ["unexpected_synthetic_effect"],
    comparison: { changes: [], changedDigests: [], categoryCounts: {}, scopeReviewRequired: false } });
  const reviewed = await completeNativeReview(s.review, { verify: () => {
    // Reread independently after durable capture; do not approve cached bytes.
    s.stable(); fixedProgramSource(); const observed = fs.readFileSync(s.effect);
    const exact = observed.equals(bytes), expected = observed.equals(Buffer.from(fixed.output));
    return { before: { exit: 0 }, after: { exit: job.rootExit, passed: passed && exact && expected },
      minimalChange: exact && (passed || noEffect), testUnchanged: true, baselineCommitUnchanged: true };
  },
    installation: () => { if (nativeDigest(fixtureInstallationBinding(s.installation)) !== nativeDigest(s.installationBinding)) fail(); return { status: "PASS", manifestDigest: nativeDigest(s.installationBinding) }; } });
  assertNativeReviewCleanup(reviewed.capability, s.envelope.identity.executionId);
  cleanupDurableNativeFixture(s.ownership); recordNativeReviewCleanup(reviewed.capability, s.envelope.identity.executionId); releaseApplicationLease(s.lease);
  const evidence = { program: fixed.program, sourceDigest: fixed.sourceDigest, inputSeal: s.envelope.seal, authoritySpent: true, resumed: job.resumed,
    containment: { schemaVersion: s.containmentReceipt.schemaVersion, evidenceClass: s.containmentReceipt.evidenceClass,
      bindingDigest: s.containmentReceipt.bindingDigest, systemIsolation: false, realProviderAdmitted: false,
      ...(s.containmentReceipt.mode ? { mode: s.containmentReceipt.mode, residualRiskAccepted: true,
        arbitraryProviderAdmission: false, fullAutonomy: false, decisionId: s.containmentReceipt.binding.trustedPilot.decisionId,
        decisionRevision: s.containmentReceipt.binding.trustedPilot.revision } : {}) },
    effectBytes: bytes.length, effectDigest: sha(bytes), expectedEffectDigest: sha(fixed.output), job, review: reviewed.publicReceipt,
    reviewDigest: reviewed.receiptDigest, cleanup: { fixtureAbsent: !fs.existsSync(s.root), applicationLeaseReleased: true, activeProcesses: job.activeProcesses }, systemIsolation: false };
  if (!passed) throw Object.assign(Error("synthetic_attempt_failed"), { retryable: false, details: { syntheticEvidence: evidence } });
  return Object.freeze({ finalResponse: fixed.output.trim(), verification: evidence });
}
