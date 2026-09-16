// Deliberately no CLI, API route, config flag or automatic entrypoint. The local
// owner-authorized controller calls this once; ordinary Worker dispatch stays shut.
import path from "node:path";
import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { createHermesCodingFixture } from "../fixtures/hermes-coding-smoke.mjs";
import { acquireWriterLock, assertWriterLock, writerStateDirectory } from "./agent-host-writer-lock.mjs";
import { inspectHermesProfile } from "./agent-host-hermes-profile.mjs";
import { prepareProviderInput, abandonProviderNativeBoundary } from "./agent-host-provider-input.mjs";
import { hermesStartupEnvironment } from "./agent-host-hermes-startup.mjs";
import { buildWindowsJobLauncher, isWindowsJobReceipt } from "./agent-host-windows-job.mjs";
import { collectHermesLaunchProofs, qualifyHermesLaunch } from "./agent-host-hermes-launch-admission.mjs";
import { verifyHermesSmokeInstallation, assertHermesSmokeInstallation } from "./agent-host-hermes-smoke-installation.mjs";
import { issueHermesSmokeActivation, consumeHermesSmokeActivation, revokeHermesSmokeActivation, hermesSmokeScope } from "./agent-host-hermes-smoke-activation.mjs";
import { runHermesOwnedProcess } from "./agent-host-hermes-quiet.mjs";
const sha = v => createHash("sha256").update(JSON.stringify(v)).digest("hex");
let invoked = false;
export function finishHermesSmokeBoundary({ envelope, spawnStarted, job, keepWriter }) {
  if (spawnStarted || job) return keepWriter || !isWindowsJobReceipt(job) || job.attempt !== envelope?.identity.executionId;
  if (keepWriter) return true;
  if (envelope) { try { abandonProviderNativeBoundary(envelope); } catch { return true; } }
  return false;
}
export async function runOwnerAuthorizedHermesCodingSmoke({ provider, installation, assertOwnerAuthority }) {
  if (invoked || typeof assertOwnerAuthority !== "function") throw new Error("hermes_smoke_owner_authority_required");
  invoked = true; assertOwnerAuthority();
  const consumedFile = path.join(writerStateDirectory, "hermes-b13-smoke-consumed.json");
  if (existsSync(consumedFile)) throw new Error("hermes_smoke_already_reserved_no_retry");
  let fixture, writer, envelope, grant, job, keepWriter = false, reserved = false;
  const began = performance.now();
  const report = { schemaVersion: "roost-hermes-real-coding-smoke-v1", status: "BLOCKED", scope: hermesSmokeScope,
    policyQualified: false, activationAuthorized: false, spawnStarted: false, activationReusable: false,
    model: "gpt-5.6-sol", reasoning: "medium", toolsets: ["file", "terminal"],
    physicalModelCalls: null, toolCalls: null, transportRetries: null, inputTokens: null, outputTokens: null, cost: null,
    actualModelResponseIdentity: "not_observable_in_quiet", rawOutputPublished: false, cleanup: null };
  try {
    writer = await acquireWriterLock();
    const authority = () => {
      assertOwnerAuthority(); assertWriterLock(writer);
      if (report.installation && !report.spawnStarted) assertHermesSmokeInstallation(report.installation, provider.executablePath);
    };
    fixture = createHermesCodingFixture(); report.baseline = fixture.before;
    const artifact = await buildWindowsJobLauncher(fixture.root);
    report.installation = await verifyHermesSmokeInstallation(installation);
    assertHermesSmokeInstallation(report.installation, provider.executablePath);
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
    grant = issueHermesSmokeActivation(options, receipt, authority);
    f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
    // Persistent spent/reserved evidence is NOT a grant. An app/process restart
    // cannot replay this B13 authorization or mint another real smoke attempt.
    writeFileSync(consumedFile, JSON.stringify({ schemaVersion: 1, scope: hermesSmokeScope, state: "dispatch_reserved",
      attemptDigest: sha(envelope.identity), at: new Date().toISOString() }) + "\n", { flag: "wx", mode: 0o600 });
    reserved = true;
    assertHermesSmokeInstallation(report.installation, provider.executablePath);
    const handoff = consumeHermesSmokeActivation(grant, options, consumption);
    report.activationAuthorized = true;
    report.deadline = handoff.budgetReceipt.acceptedDeadline;
    report.startedAt = new Date().toISOString();
    const result = await runHermesOwnedProcess({ executable: handoff.candidate.command, argv: handoff.candidate.args, cwd: handoff.candidate.cwd,
      environment: handoff.candidate.environment, input: handoff.input, attempt: fixture.attempt, budgetReceipt: handoff.budgetReceipt,
      nativeToolReceipt: handoff.nativeToolReceipt, jobArtifact: handoff.jobArtifact,
      remainingMs: () => Date.parse(report.deadline) - Date.now() - 5000, assertAuthority: authority,
      onAssigned() { report.spawnStarted = true; } });
    job = result.ownedTreeReceipt;
    report.exitCode = result.exitCode; report.outcome = result.outcome;
    report.budgetReceiptDigest = result.attemptBudgetReceipt.digest; report.nativeReceiptDigest = result.nativeToolReceipt.digest;
    if (result.nativeToolReceipt.classification !== "review_required" || result.nativeToolReceipt.violations.length
        || !isWindowsJobReceipt(job) || job.attempt !== fixture.attempt) throw new Error("hermes_smoke_native_review_blocked");
    report.verification = fixture.verify(); report.status = "DONE";
  } catch (error) {
    job = error.details?.attemptBudgetReceipt?.ownedTreeReceipt ?? job;
    report.status = report.spawnStarted ? "FAILED" : "BLOCKED";
    report.reason = /^[a-z][a-z0-9_]{2,100}$/.test(error.message) ? error.message : "hermes_smoke_failed";
    if (error.details?.providerDiagnostic === "authentication_required_reported") {
      report.status = "BLOCKED"; report.reason = "hermes_smoke_authentication_required_reported";
    }
    report.outcome = error.outcome ?? "policy_blocked"; report.exitCode = job?.rootExit ?? null;
    keepWriter = error.leaseLost === true;
    if (error.details?.nativeToolReceipt) report.nativeReceiptDigest = error.details.nativeToolReceipt.digest;
    if (error.details?.attemptBudgetReceipt) report.budgetReceiptDigest = error.details.attemptBudgetReceipt.digest;
  } finally {
    revokeHermesSmokeActivation(grant);
    // A completed native proof already reconciled its application lease. Calling
    // the pre-spawn abandon operation again incorrectly retains the Writer.
    keepWriter = finishHermesSmokeBoundary({ envelope, spawnStarted: report.spawnStarted, job, keepWriter });
    const cleanupProven = !report.spawnStarted && !keepWriter || isWindowsJobReceipt(job) && job.attempt === fixture?.attempt;
    if (job) report.job = { cleanup: job.cleanup, activeProcesses: job.activeProcesses, assignedBeforeResume: job.assignedBeforeResume,
      terminationReason: job.terminationReason, rootExit: job.rootExit, digest: sha(job) };
    try {
      if (fixture && cleanupProven) report.cleanup = fixture.cleanup();
      else if (fixture) { report.status = "BLOCKED"; report.cleanupRequiredAt = fixture.root; }
      if (writer && !keepWriter) await writer.release();
      else if (writer) { report.status = "BLOCKED"; report.writerReconciliationRequired = true; }
    } catch {
      report.status = "BLOCKED"; report.reason = "hermes_smoke_cleanup_unproven";
      if (fixture) report.cleanupRequiredAt = fixture.root;
    }
    report.wallTimeMs = Math.ceil(performance.now() - began); report.finishedAt = new Date().toISOString();
    report.authorizationSpent = reserved;
  }
  return Object.freeze(report);
}
