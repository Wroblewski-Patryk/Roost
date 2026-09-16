// Deliberately no CLI, API route, config flag or automatic entrypoint. The local
// owner-authorized controller calls this once; ordinary Worker dispatch stays shut.
import path from "node:path";
import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { createHermesCodingFixture, createHermesB17CodingFixture, createHermesB21CodingFixture } from "../fixtures/hermes-coding-smoke.mjs";
import { acquireWriterLock, assertWriterLock, writerStateDirectory } from "./agent-host-writer-lock.mjs";
import { inspectHermesProfile } from "./agent-host-hermes-profile.mjs";
import { prepareProviderInput, abandonProviderNativeBoundary } from "./agent-host-provider-input.mjs";
import { hermesStartupEnvironment } from "./agent-host-hermes-startup.mjs";
import { buildWindowsJobLauncher, isWindowsJobReceipt } from "./agent-host-windows-job.mjs";
import { collectHermesLaunchProofs, qualifyHermesLaunch } from "./agent-host-hermes-launch-admission.mjs";
import { verifyHermesSmokeInstallation, assertHermesSmokeInstallation, assertHermesSmokeInstallationFresh } from "./agent-host-hermes-smoke-installation.mjs";
import { issueHermesSmokeActivation, consumeHermesSmokeActivation, revokeHermesSmokeActivation, hermesSmokeScope,
  issueHermesB14SmokeActivation, consumeHermesB14SmokeActivation, hermesB14SmokeScope,
  issueHermesB17SmokeActivation, consumeHermesB17SmokeActivation, hermesB17SmokeScope,
  issueHermesB21SmokeActivation, consumeHermesB21SmokeActivation, hermesB21SmokeScope } from "./agent-host-hermes-smoke-activation.mjs";
import { prepareHermesB14Audit, assertHermesB14Audit, reserveHermesB14Audit, closeBlockedHermesB14Audit,
  prepareHermesB17Audit, assertHermesB17Audit, reserveHermesB17Audit, closeBlockedHermesB17Audit,
  prepareHermesB21Audit, assertHermesB21Audit, reserveHermesB21Audit, closeBlockedHermesB21Audit } from "./agent-host-hermes-b14-audit.mjs";
import { reconcileHermesGeneratedReceipt } from "./agent-host-hermes-generated-maintenance.mjs";
import { watchHermesInstallation } from "./agent-host-hermes-installation-watch.mjs";
import { bindNativeSpentRecord, verifyCompletedNativeBoundary, releaseReviewedNativeBoundary } from "./agent-host-hermes-native-boundary.mjs";
import { assertNativeReviewCleanup } from "./agent-host-native-review.mjs";
import { runHermesOwnedProcess } from "./agent-host-hermes-quiet.mjs";
const sha = v => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const invoked = new Set();
const b13 = Object.freeze({ scope: hermesSmokeScope, issue: issueHermesSmokeActivation, consume: consumeHermesSmokeActivation });
const b14 = Object.freeze({ scope: hermesB14SmokeScope, issue: issueHermesB14SmokeActivation, consume: consumeHermesB14SmokeActivation,
  prepare: prepareHermesB14Audit, inspect: assertHermesB14Audit, reserve: reserveHermesB14Audit, blocked: closeBlockedHermesB14Audit });
const b17 = Object.freeze({ scope: hermesB17SmokeScope, issue: issueHermesB17SmokeActivation, consume: consumeHermesB17SmokeActivation,
  prepare: prepareHermesB17Audit, inspect: assertHermesB17Audit, reserve: reserveHermesB17Audit, blocked: closeBlockedHermesB17Audit,
  fixture: createHermesB17CodingFixture, split: true, spentName: "hermes-b17-smoke-consumed.json" });
const b21 = Object.freeze({ scope: hermesB21SmokeScope, issue: issueHermesB21SmokeActivation, consume: consumeHermesB21SmokeActivation,
  prepare: prepareHermesB21Audit, inspect: assertHermesB21Audit, reserve: reserveHermesB21Audit, blocked: closeBlockedHermesB21Audit,
  fixture: createHermesB21CodingFixture, split: true, spentName: "hermes-b21-smoke-consumed.json" });
function nativeEvidence(receipt) {
  if (!receipt) return null;
  return { digest: receipt.digest, classification: receipt.classification, violations: receipt.violations,
    preFootprintDigest: receipt.preFootprintDigest, postFootprintDigest: receipt.postFootprintDigest,
    changedPathDigests: receipt.changedPathDigests, jobReceiptDigest: receipt.jobReceiptDigest,
    coverage: receipt.coverage, outsideRootAndTransientEffects: receipt.outsideRootAndTransientEffects };
}
export function finishHermesSmokeBoundary({ envelope, spawnStarted, job, keepWriter }) {
  if (spawnStarted || job) return keepWriter || !isWindowsJobReceipt(job) || job.attempt !== envelope?.identity.executionId;
  if (keepWriter) return true;
  if (envelope) { try { abandonProviderNativeBoundary(envelope); } catch { return true; } }
  return false;
}
// Shared post-attempt cleanup uses the original opaque objects, never PID/JSON.
export async function cleanupHermesSmokeAttempt({ envelope, spawnStarted, job, keepWriter, fixture, writer, reviewCapability }) {
  keepWriter = finishHermesSmokeBoundary({ envelope, spawnStarted, job, keepWriter });
  let cleanupProven = !spawnStarted && !keepWriter;
  if (spawnStarted) try { cleanupProven = assertNativeReviewCleanup(reviewCapability, fixture?.attempt); } catch { cleanupProven = false; keepWriter = true; }
  const result = {};
  try {
    if (fixture && cleanupProven) result.cleanup = fixture.cleanup();
    else if (fixture) { result.status = "BLOCKED"; result.cleanupRequiredAt = fixture.root; }
    if (writer && !keepWriter && !spawnStarted) { await writer.release(); result.writerReleased = true; }
    else if (writer) { result.status = "BLOCKED"; result.writerReconciliationRequired = true; }
  } catch {
    result.status = "BLOCKED"; result.reason = "hermes_smoke_cleanup_unproven";
    if (fixture) result.cleanupRequiredAt = fixture.root;
    if (writer) result.writerReconciliationRequired = true;
  }
  return result;
}
// There is no caller-selected policy, state directory or executable test adapter.
export const runOwnerAuthorizedHermesCodingSmoke = options => runSmoke(options, b13);
export const runOwnerAuthorizedHermesB14CodingSmoke = options => runSmoke(options, b14);
export const runOwnerAuthorizedHermesB17CodingSmoke = options => runSmoke(options, b17);
export const runOwnerAuthorizedHermesB21CodingSmoke = options => runSmoke(options, b21);
async function runSmoke({ provider, installation, assertOwnerAuthority, onProgress = () => {} }, policy) {
  if (invoked.has(policy.scope) || typeof assertOwnerAuthority !== "function") throw new Error("hermes_smoke_owner_authority_required");
  invoked.add(policy.scope); assertOwnerAuthority();
  // Fixed, secret-free notifications only; observers never receive prompt/output
  // or choose authority, executable, policy or retry behavior.
  const progress = phase => { try { onProgress(Object.freeze({ phase })); } catch { /* diagnostics cannot grant authority */ } };
  const consumedFile = path.join(writerStateDirectory, "hermes-b13-smoke-consumed.json");
  const audit = policy.prepare?.(writerStateDirectory) ?? null;
  if (!audit && existsSync(consumedFile)) throw new Error("hermes_smoke_already_reserved_no_retry");
  let fixture, writer, envelope, grant, job, nativeResult, installationWatch, keepWriter = false, reserved = false;
  const began = performance.now();
  const report = { schemaVersion: "roost-hermes-real-coding-smoke-v1", status: "BLOCKED", scope: policy.scope,
    policyQualified: false, activationAuthorized: false, activationWasAuthorized: false, spawnStarted: false, activationReusable: false,
    model: "gpt-5.6-sol", reasoning: "medium", toolsets: ["file", "terminal"],
    physicalModelCalls: null, toolCalls: null, transportRetries: null, inputTokens: null, outputTokens: null, cost: null,
    actualModelResponseIdentity: "not_observable_in_quiet", rawOutputPublished: false, cleanup: null };
  try {
    writer = await acquireWriterLock();
    progress("preflight_started");
    const authority = () => {
      assertOwnerAuthority(); assertWriterLock(writer);
      if (audit) policy.inspect(audit);
      installationWatch?.assertUnchanged();
      if (policy.split && fixture) inspectHermesProfile(provider.profile, fixture.repository);
      if (report.installation && !report.spawnStarted) assertHermesSmokeInstallationFresh(report.installation, provider.executablePath);
    };
    fixture = (policy.fixture ?? createHermesCodingFixture)(); report.baseline = fixture.before;
    if (policy.split) report.preInstallation = reconcileHermesGeneratedReceipt({ installation, writer, assertOwnerAuthority });
    report.installation = await verifyHermesSmokeInstallation(installation);
    progress("installation_verified");
    // Compile the Job capability AFTER the potentially long file-only inventory;
    // its 60-second freshness window must cover admission, not disk scanning.
    const artifact = await buildWindowsJobLauncher(fixture.root);
    if (policy.split) installationWatch = watchHermesInstallation({ installation, writer });
    inspectHermesProfile(provider.profile, fixture.repository);
    const f = fixture.prepare();
    const options = { provider, repositoryPath: fixture.repository, startupEnvironment: hermesStartupEnvironment(provider.profile, process.env, fixture.repository),
      sandbox: "workspace-write", platform: process.platform };
    const consumption = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
      currentCommit: fixture.head, assertAuthority: authority };
    envelope = prepareProviderInput({ ...options, ...consumption,
      nativeBoundaryOptions: { writerLock: writer, expected: { head: fixture.head, branch: f.packet.contract.singleTask.branch, origin: f.claimed.application.repositories[0].url } } });
    options.envelope = envelope;
    const receipt = qualifyHermesLaunch(options, collectHermesLaunchProofs(options, artifact));
    report.policyQualified = true; report.qualificationDigest = receipt.digest;
    progress("policy_qualified");
    grant = policy.issue(options, receipt, authority);
    f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
    // Persistent spent/reserved evidence is NOT a grant. An app/process restart
    // cannot replay either authorization or mint another real smoke attempt.
    if (audit) report.audit = policy.reserve(audit, envelope.identity);
    else writeFileSync(consumedFile, JSON.stringify({ schemaVersion: 1, scope: policy.scope, state: "dispatch_reserved",
      attemptDigest: sha(envelope.identity), at: new Date().toISOString() }) + "\n", { flag: "wx", mode: 0o600 });
    reserved = true;
    assertHermesSmokeInstallation(report.installation, provider.executablePath);
    const handoff = policy.consume(grant, options, consumption);
    bindNativeSpentRecord(handoff.nativeToolReceipt, path.join(writerStateDirectory, policy.spentName ?? (policy === b14 ? "hermes-b14-smoke-consumed.json" : "hermes-b13-smoke-consumed.json")));
    report.activationAuthorized = true; report.activationWasAuthorized = true;
    report.deadline = handoff.budgetReceipt.acceptedDeadline;
    report.startedAt = new Date().toISOString();
    const processBegan = performance.now();
    const result = await runHermesOwnedProcess({ executable: handoff.candidate.command, argv: handoff.candidate.args, cwd: handoff.candidate.cwd,
      environment: handoff.candidate.environment, input: handoff.input, attempt: fixture.attempt, budgetReceipt: handoff.budgetReceipt,
      nativeToolReceipt: handoff.nativeToolReceipt, jobArtifact: handoff.jobArtifact,
      remainingMs: () => Date.parse(report.deadline) - Date.now() - 5000, assertAuthority: authority,
      onAssigned() { report.spawnStarted = true; progress("provider_assigned_once"); } });
    job = result.ownedTreeReceipt; nativeResult = result.nativeToolReceipt;
    report.providerWallTimeMs = Math.ceil(performance.now() - processBegan);
    progress("provider_completed");
    report.exitCode = result.exitCode; report.outcome = result.outcome;
    report.budgetReceiptDigest = result.attemptBudgetReceipt.digest; report.nativeReceiptDigest = result.nativeToolReceipt.digest;
    report.nativeEvidence = nativeEvidence(result.nativeToolReceipt);
    // Process exit is only a candidate; durable independent review follows below.
  } catch (error) {
    progress("attempt_stopped");
    job = error.details?.attemptBudgetReceipt?.ownedTreeReceipt ?? job;
    nativeResult = error.details?.nativeToolReceipt ?? nativeResult;
    report.status = report.spawnStarted ? "FAILED" : "BLOCKED";
    report.reason = /^[a-z][a-z0-9_]{2,100}$/.test(error.message) ? error.message : "hermes_smoke_failed";
    if (audit && !reserved && fixture) try {
      report.audit = policy.blocked(audit, { taskId: fixture.f.claimed.taskId, executionId: fixture.attempt }, report.reason);
      reserved = true;
    } catch { report.reason = "hermes_smoke_spent_state_unproven"; }
    if (error.details?.providerDiagnostic === "authentication_required_reported") {
      report.status = "BLOCKED"; report.reason = "hermes_smoke_authentication_required_reported";
    }
    report.outcome = error.outcome ?? "policy_blocked"; report.exitCode = job?.rootExit ?? null;
    keepWriter = error.leaseLost === true;
    if (error.details?.nativeToolReceipt) report.nativeReceiptDigest = error.details.nativeToolReceipt.digest;
    report.nativeEvidence = nativeEvidence(error.details?.nativeToolReceipt);
    if (error.details?.attemptBudgetReceipt) report.budgetReceiptDigest = error.details.attemptBudgetReceipt.digest;
  } finally {
    revokeHermesSmokeActivation(grant);
    report.activationAuthorized = false;
    if (report.startedAt && report.providerWallTimeMs === undefined) report.providerWallTimeMs = Date.now() - Date.parse(report.startedAt);
    if (installationWatch) report.installationWatch = installationWatch.close();
    // Post-spawn leases stay held until durable review and owned cleanup finish.
    if (job) report.job = { cleanup: job.cleanup, activeProcesses: job.activeProcesses, assignedBeforeResume: job.assignedBeforeResume,
      terminationReason: job.terminationReason, rootExit: job.rootExit, digest: sha(job) };
    if (report.spawnStarted) {
      try {
        const reviewed = await verifyCompletedNativeBoundary(nativeResult, {
          verify: () => fixture.observeUnfixed(),
          installation: async () => {
            if (report.installationWatch?.observedViolation) throw Error("hermes_smoke_installation_boundary_violation");
            // Installation verification happens while the fixture and Writer
            // still exist. No cleanup authority is inferred from exit status.
            if (policy.split) report.postInstallation = reconcileHermesGeneratedReceipt({ installation, writer, assertOwnerAuthority });
            const post = await verifyHermesSmokeInstallation(installation);
            report.postInstallation = { ...report.postInstallation, status: "PASS", manifestDigest: post.manifestDigest, executableDigest: post.executableDigest };
            return report.postInstallation;
          }
        });
        report.nativeReviewReceipt = reviewed.publicReceipt; report.nativeReviewReceiptDigest = reviewed.receiptDigest;
        report.verification = reviewed.verification;
        report.status = reviewed.publicReceipt.verdict === "verified_candidate" ? "CANDIDATE" : "BLOCKED";
        report.reviewRequired = true; report.taskCompletionAllowed = false;
        const cleanup = await cleanupHermesSmokeAttempt({ envelope, spawnStarted: true, job, keepWriter, fixture, reviewCapability: reviewed.capability });
        Object.assign(report, cleanup);
        if (cleanup.cleanup?.remaining === 0) {
          releaseReviewedNativeBoundary(nativeResult, reviewed.capability);
          await writer.release(); report.writerReleased = true;
          if (policy === b21 && report.status === "CANDIDATE") report.status = "DONE"; // Smoke qualification only, never API task/release authority.
        } else report.writerReconciliationRequired = true;
      } catch (error) {
        report.status = "BLOCKED"; report.reason = /^[a-z][a-z0-9_]+$/.test(error.message) ? error.message : "hermes_smoke_review_unproven";
        report.writerReconciliationRequired = true;
        if (fixture && existsSync(fixture.root)) report.cleanupRequiredAt = fixture.root;
      }
    } else Object.assign(report, await cleanupHermesSmokeAttempt({ envelope, spawnStarted: false, job, keepWriter, fixture, writer }));
    if (audit) try { report.audit = policy.inspect(audit); }
    catch { report.status = "BLOCKED"; report.reason = "hermes_smoke_spent_state_unproven"; }
    report.wallTimeMs = Math.ceil(performance.now() - began); report.finishedAt = new Date().toISOString();
    report.authorizationSpent = reserved;
    progress("controller_finished");
  }
  return Object.freeze(report);
}
