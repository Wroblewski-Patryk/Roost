import { abandonProviderNativeBoundary } from "./lib/agent-host-provider-input.mjs";
import { inspectExecutionProvider, providerAdmissionReason } from "./lib/agent-host-execution-provider.mjs";
import lifecycle from "./lib/agent-host-lifecycle.cjs";
import { spawn } from "node:child_process";
import { guardHostContent, hostTransport, boundedRunnerLines, readHostResponse } from "./lib/agent-host-redaction.mjs";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repositoryForExecution, validateAgentHostWorkspace } from "./lib/agent-host-workspace-guard.mjs";
import { createExecutionLease, terminateWindowsProcessTree } from "./lib/agent-host-execution-lease.mjs";
import { safeExecutionDiagnostic, leaseRecoveryReason } from "./lib/agent-host-recovery-diagnostics.mjs";
import { acquireWriterLock, writerRecoveryEvidence } from "./lib/agent-host-writer-lock.mjs";
import { validateExecutionPacket } from "./lib/agent-host-execution-packet.mjs";
import { assertRecoverySnapshot, classifyRecovery, recoveryError, workspaceDigest } from "./lib/agent-host-recovery.mjs";
import { runObserver } from "./lib/agent-host-observer.mjs";
import { prepareProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import { prepareFixedHostContainment } from "./lib/agent-host-containment.mjs";
import { prepareProviderInput } from "./lib/agent-host-provider-input.mjs";
import { hermesStartupEnvironment } from "./lib/agent-host-hermes-startup.mjs";
import { createDirectTurnGuard } from "./lib/agent-host-direct-turn.mjs";
import { createHermesOutputIntent } from "./lib/agent-host-hermes-budget.mjs";
import { hermesBudgetProfileVersion, hermesNativeProfileVersion } from "./lib/agent-host-hermes-profile.mjs";
import { runHermesOwnedProcess } from "./lib/agent-host-hermes-quiet.mjs";
import { verifyCompletedNativeBoundary, releaseReviewedNativeBoundary } from "./lib/agent-host-hermes-native-boundary.mjs";
import { verifyHermesSmokeInstallation } from "./lib/agent-host-hermes-smoke-installation.mjs";
import { captureReadOnlyReviewBaseline, verifyReadOnlyReview } from "./lib/agent-host-readonly-review.mjs";
import { isWindowsJobCleanupReceipt } from "./lib/agent-host-windows-job.mjs";
import { buildManagedAdmissionSource, requestManagedAdmission, requestFirstWriteAdmission, retireManagedAdmissionArtifacts } from "./lib/agent-host-managed-admission.mjs";
import { managedBackendVersion } from "./lib/agent-host-model-policy.mjs";
import fixed from "./lib/agent-host-fixed-program.cjs";
import { prepareFixedExecution, runFixedExecution, createFixedOutputBudget, assertFixedTask, abandonFixedExecution } from "./lib/agent-host-fixed-execution.mjs";
import { collectWorkspaceEvidence } from "./lib/agent-host-workspace-evidence.mjs";
import { collectReadOnlyRepositoryEvidence } from "./lib/agent-host-readonly-boundary.mjs";
import { verifiedPriorReadOnlyAudit } from "./lib/agent-host-prior-readonly-audit.mjs";
import { prepareCodingTests, runCodingTests } from "./lib/agent-host-coding-tests.mjs";
import { prepareCodingTestReplay, runCodingTestReplay, bindCodingTestReplayVerification } from "./lib/agent-host-coding-test-replay.mjs";
import { prepareTestReplayConfiguration } from "./lib/agent-host-test-replay-config.mjs";
import { finalizeLocalCommit, verifyExistingLocalCommit } from "./lib/agent-host-local-commit.mjs";
import { readCodeReviewerCredential, reviewerApi, validateCodeReviewView, prepareCodeReviewDecision,
  codeReviewerConfigSchema } from "./lib/agent-host-code-reviewer.mjs";
import { createExecutionDuration } from "./lib/agent-host-execution-duration.mjs";
import { createCodexOutputBudget } from "./lib/agent-host-output-budget.mjs";
import { fetchExecutionContext, executionContextRevision, assertFreshExecutionContext } from "./lib/agent-host-execution-context.mjs";
import { protocol, protocolHeaders, apiCompatibility, protocolAdmissionError } from "./lib/agent-host-protocol.mjs";
import readyContext from "./lib/agent-host-ready-context.cjs";
import { contextStopError } from "./lib/agent-host-context-stop.mjs";
import { assertTaskBranch, readCurrentTaskBranch, readCurrentTaskCommit, readCommittedTaskPaths } from "./lib/agent-host-single-task.mjs";
import { createTaskBranch } from "./lib/agent-host-task-branch.mjs";
import { runGovernedReleaseQueueStep, getGovernedReleaseRecoveryCandidate, persistReleaseWorkerDiagnostic } from "./lib/agent-host-release-worker.mjs";

const baseUrl = String(process.env.ROOST_BASE_URL || process.env.COMPANYCORE_BASE_URL || "").replace(/\/+$/, "");
const apiKey = process.env.ROOST_AGENT_API_KEY || process.env.COMPANYCORE_API_KEY;
const configPath = process.env.ROOST_AGENT_HOST_CONFIG;

if (!baseUrl) throw new Error("ROOST_BASE_URL is required.");
if (!apiKey) throw new Error("ROOST_AGENT_API_KEY is required.");
if (!configPath) throw new Error("ROOST_AGENT_HOST_CONFIG must point to the local, secret-free Agent Host JSON configuration.");

let config = JSON.parse(await readFile(path.resolve(configPath), "utf8"));
if (![undefined, "observe", "supervised"].includes(config.executionMode)) throw new Error("agent_host_execution_mode_invalid");
const host = {
  name: String(config.host?.name || os.hostname()),
  slug: String(config.host?.slug || os.hostname().toLowerCase().replace(/[^a-z0-9._-]+/g, "-")),
  platform: `${process.platform}-${process.arch}`,
  capabilities: protocol.requiredHostCapabilities,
  applicationSlugs: Object.keys(config.repositories || {}),
  metadata: {
    runnerVersion: "roost-codex-agent-host-v1",
    executionProvider: await inspectExecutionProvider(config),
    protocolVersion: protocol.version,
    executionMode: "supervised",
    outputTokenBudgetEnforcement: "unavailable",
    hostname: os.hostname(),
    workspacePolicy: "approved_direct_children_only",
    repositories: Object.entries(config.repositories).map(([slug, repository]) => ({ slug, originUrl: repository.originUrl, deploymentUrl: repository.deploymentUrl }))
  }
};
const pollIntervalMs = Math.max(2_000, Number(config.pollIntervalMs || 5_000));
const codexCommand = String(config.codexCommand || "codex");
const sandbox = String(config.sandbox || "workspace-write");
let stopping = false;
let shutdownRequested = false;
if (config.executionMode === "supervised") {
  const stopPath = path.join(path.dirname(path.resolve(configPath)), "stop.request");
  const stopPoll = setInterval(() => {
    void access(stopPath).then(() => { stopping = true; shutdownRequested = true; }, () => {});
  }, 500);
  stopPoll.unref();
}
let protocolHalted = false;
let retainWriterLock = false;
let registeredHost = null;
let providerAdmission = providerAdmissionReason;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function api(route, options = {}) {
  const transport = options.body === undefined ? null : hostTransport(options.body, [apiKey]);
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    ...(transport ? { body: transport.body } : {}),
    signal: options.signal ?? AbortSignal.timeout(10_000),
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json", ...protocolHeaders,
      ...(transport?.redacted ? { "X-Roost-Redaction-Notice": "1" } : {}),
      ...(config.executionMode === "observe" ? { "X-Roost-Host-Capabilities": "heartbeat,observer" } : {}), ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const body = await readHostResponse(response);
  if (!response.ok) {
    if (body.error === "agent_execution_context_invalidated") throw contextStopError();
    if (body.error === "agent_host_protocol_blocked") throw protocolAdmissionError("host_admission_rejected");
    if (["task_ready_pin_required", "task_ready_revalidation_required", "task_ready_context_conflict"].includes(body.error)) throw readyContext.readyAdmissionError();
    const error = new Error(`roost_http_${response.status}`);
    error.status = response.status;
    if (typeof body.error === "string" && /^[a-z][a-z0-9_]{2,80}$/.test(body.error)) error.details = { reason: body.error };
    throw error;
  }
  return body.data;
}

async function refreshAdmission(freshAttestation = false) {
  host.metadata.executionProvider = await inspectExecutionProvider(config, { freshAttestation });
  registeredHost = await api(registeredHost ? `/v1/agent-runtime/hosts/${registeredHost.id}/heartbeat` : "/v1/agent-runtime/hosts/register",
    { method: "POST", body: JSON.stringify(registeredHost ? { metadata: host.metadata, applicationSlugs: host.applicationSlugs, capabilities: host.capabilities } : host) });
  const reason = providerAdmission(host.metadata.executionProvider) || apiCompatibility(registeredHost?.runtime, host.capabilities);
  host.metadata.executionUnavailableReasons = reason ? [reason] : [];
  return reason;
}

async function waitForAdmission(holdForReconciliation = false) {
  let lastReason, lastDiagnostic;
  while (!shutdownRequested) {
    let reason;
    try { reason = await refreshAdmission(); }
    catch (error) {
      if ([401, 403, 404, 409, 422].includes(error.status)) throw error;
      const diagnostic = typeof error?.message === "string" && /^[a-z][a-z0-9_]{2,80}$/.test(error.message)
        ? error.message : Number.isInteger(error?.status) ? `http_${error.status}` : "transport_or_local";
      if (diagnostic !== lastDiagnostic) process.stderr.write(`Agent Host admission diagnostic: ${diagnostic}\n`);
      lastDiagnostic = diagnostic;
      reason = "api_unavailable";
    }
    if (holdForReconciliation) reason = "execution_reconciliation_required";
    host.metadata.executionUnavailableReasons = reason ? [reason] : [];
    if (!reason) return true;
    if (reason !== lastReason) process.stderr.write(`Agent Host online admission blocked: ${reason}\n`);
    lastReason = reason;
    await delay(pollIntervalMs);
  }
  return false;
}

async function assertAdmission(freshAttestation = false) {
  let reason, status;
  try { reason = await refreshAdmission(freshAttestation); }
  catch (error) { reason = "api_unavailable"; status = error.status; }
  if (reason) {
    if (reason === lifecycle.admissionReason) throw lifecycle.lifecycleError();
    const failure = protocolAdmissionError(reason);
    if ([401, 403].includes(status)) failure.status = status;
    throw failure;
  }
}

async function gitStatus(repositoryPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["status", "--short", "--untracked-files=all"], { cwd: repositoryPath, shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.split(/\r?\n/).filter(Boolean)) : reject(new Error(`git_status_failed: ${stderr.trim()}`)));
  });
}

function statusPath(line) {
  const value = line.slice(3).trim();
  const renamed = value.includes(" -> ") ? value.split(" -> ").at(-1) : value;
  return renamed?.replace(/^"|"$/g, "") || value;
}

function safeChildEnvironment() {
  const environment = { ...process.env };
  delete environment.ROOST_AGENT_API_KEY;
  delete environment.COMPANYCORE_API_KEY;
  delete environment.ROOST_BASE_URL;
  delete environment.COMPANYCORE_BASE_URL;
  delete environment.ROOST_AGENT_HOST_CONFIG;
  return environment;
}

function summarizeItem(item) {
  if (!item || typeof item !== "object") return null;
  if (item.type === "command_execution") return { type: "command", message: String(item.command || "Command execution"), payload: { status: item.status, exitCode: item.exit_code } };
  if (item.type === "file_change") return { type: "file_change", message: String(item.path || item.file || "File changed"), payload: { status: item.status } };
  if (item.type === "mcp_tool_call") return { type: "mcp", message: String(item.tool || item.name || "MCP tool call"), payload: { status: item.status } };
  if (item.type === "plan") return { type: "plan", message: String(item.text || "Plan updated"), payload: {} };
  return null;
}

async function confirmContextStop(execution, writerLock) {
  const ack = await api(`/v1/agent-runtime/executions/${execution.id}/actions/context-stopped`, { method: "POST", body: JSON.stringify({ leaseToken: execution.leaseToken }) });
  if (ack?.stopped !== true || !Number.isInteger(ack.checkpointVersion) || !ack.checkpoint) throw new Error("context_stop_ack_invalid");
  await writerLock?.checkpoint({ ...execution, checkpoint: ack.checkpoint, checkpointVersion: ack.checkpointVersion });
}

async function execute(claimed, writerLock, { resumeCheckpoint, onCheckpoint, createOutputBudget = createCodexOutputBudget, readTaskBranch = readCurrentTaskBranch, readTaskCommit = readCurrentTaskCommit, readTaskPaths = readCommittedTaskPaths } = {}) {
  const repository = repositoryForExecution(config, claimed);
  const repositoryPath = path.resolve(String(repository.path));
  let taskContext, applicationContext, contextRevision;
  let codexThreadId = null;
  let finalResponse = "";
  let usage = {};
  const verification = { commands: [] };
  const runnerEvents = [];
  const stderrTail = [];
  let stderrBytes = 0, redactionFailure;
  let child;
  let stopPromise = Promise.resolve();
  let stopError;
  let stopRequested = false;
  let duration;
  let outputBudget;
  let hermesBaseline, hermesReadOnlyBaseline, nativeInput, fixedGrant, readOnlyEvidence, priorAudit, firstWrite, codingTests, codingReplay, replayConfiguration;
  let codeReviewerView, codeReviewerKey;
  let preparedCommit;
  let hermesCollection, hermesAbort, hermesCompletedReceipt;
  let executionPhase = "context";
  function stopWorker() {
    stopping = true;
    retainWriterLock = true;
    if (stopRequested) return;
    stopRequested = true;
    if (hermesCollection) {
      hermesAbort.abort();
      stopPromise = hermesCollection.then(() => {}, error => { if (error.leaseLost) stopError = error; });
      return;
    }
    stopPromise = terminateWindowsProcessTree(child).catch((error) => {
      stopError = error;
      process.stderr.write("Agent Host stopped: process-tree termination could not be confirmed; manual reconciliation required.\n");
      child?.kill();
    });
  }
  const lease = createExecutionLease({
    renew: () => api(`/v1/agent-runtime/executions/${claimed.id}/heartbeat`, { method: "POST", body: JSON.stringify({ leaseToken: claimed.leaseToken, status: "running", codexThreadId }) }),
    onLost: stopWorker
  });

  async function checkpoint(stage, packetRevision, digest) {
    await lease.refresh();
    lease.assertValid();
    const coding = taskContext?.executionPacket?.contract?.nativeBoundary?.profile === "coding-local";
    const next = { schemaVersion: "roost-recovery-v1", stage, sessionId: writerLock.sessionId, packetRevision, workspaceDigest: digest, contextRevision,
      ...(coding ? { branch: taskContext.executionPacket.contract.singleTask.branch, headCommit: preparedCommit } : {}) };
    const expectedVersion = claimed.checkpointVersion;
    // Persist locally first. Any crash between the two stores leaves a mismatch
    // and must stop recovery. The spawn barrier is durable before a child exists.
    await writerLock.checkpoint({ ...claimed, checkpoint: next, checkpointVersion: expectedVersion + 1 }).catch(() => { throw recoveryError("local_state_invalid"); });
    const saved = await api(`/v1/agent-runtime/executions/${claimed.id}/checkpoint`, { method: "POST", body: JSON.stringify({ leaseToken: claimed.leaseToken, expectedVersion, checkpoint: next }) }).catch((error) => { lease.reject(error); if (error.readyAdmission || error.contextStop) throw error; throw recoveryError("checkpoint_mismatch"); });
    if (saved?.checkpointVersion !== expectedVersion + 1) throw recoveryError("checkpoint_mismatch");
    claimed.checkpoint = next;
    claimed.checkpointVersion = saved.checkpointVersion;
    await onCheckpoint?.(stage, claimed);
  }

  try {
    await assertAdmission();
    ({ taskContext, applicationContext } = await fetchExecutionContext(api, claimed));
    guardHostContent({ taskContext, applicationContext }, "required", [apiKey, claimed.leaseToken]);
    await lease.refresh();
    lease.assertValid();
    validateExecutionPacket(taskContext?.executionPacket, claimed, taskContext, applicationContext);
    readyContext.assertReadyContext(taskContext, applicationContext, claimed);
    const practicalHermes = config.executionProvider?.kind === "hermes_codex"
      && [hermesBudgetProfileVersion, hermesNativeProfileVersion].includes(config.executionProvider.profile?.schemaVersion);
    if (config.executionProvider?.kind === "hermes_codex" && (claimed.codexThreadId
      || resumeCheckpoint && !["branch_intent", "branch_ready", "prepared"].includes(resumeCheckpoint.stage))) throw protocolAdmissionError("hermes_attempt_resume_forbidden");
    if (config.executionProvider?.kind === fixed.kind && resumeCheckpoint) throw protocolAdmissionError("synthetic_execution_resume_forbidden");
    outputBudget = (config.executionProvider?.kind === fixed.kind ? createFixedOutputBudget : practicalHermes ? createHermesOutputIntent : createOutputBudget)({ maxOutputTokens: taskContext.executionPacket.contract.budgets.maxOutputTokens, onStopped: stopWorker });
    outputBudget.assertWithinBudget();
    contextRevision = executionContextRevision(taskContext, applicationContext);
    duration = createExecutionDuration({ startedAt: claimed.startedAt,
      maxDurationSeconds: taskContext.executionPacket.contract.budgets.maxDurationSeconds, onExpired: stopWorker });
    duration.assertWithinBudget();
    // No execution-specific subprocess (including git) is started for an invalid packet.
    await duration.wait(validateAgentHostWorkspace(config));
    const taskContract = taskContext.executionPacket.contract;
    const coding = taskContract.nativeBoundary?.profile === "coding-local";
    const inspecting = taskContract.nativeBoundary?.profile === "inspect-readonly";
    let actualBranch = await duration.wait(readTaskBranch(repositoryPath));
    let beforeStatus = await duration.wait(gitStatus(repositoryPath));
    let digest = await duration.wait(workspaceDigest(repositoryPath));
    preparedCommit = await duration.wait(readTaskCommit(repositoryPath));
    const assertProviderAuthority = () => {
      const reason = providerAdmission(host.metadata.executionProvider) || apiCompatibility(registeredHost?.runtime, host.capabilities);
      if (reason === lifecycle.admissionReason) throw lifecycle.lifecycleError();
      if (reason) throw protocolAdmissionError(reason);
      if (stopRequested || stopping) throw contextStopError();
      lease.assertValid(); duration.assertWithinBudget(); outputBudget.assertWithinBudget();
    };
    if (coding) {
      if (beforeStatus.length || preparedCommit !== taskContext.readyAdmission.riskAdmission.commit) throw recoveryError("workspace_changed");
      if (resumeCheckpoint) {
        if (resumeCheckpoint.headCommit !== preparedCommit || resumeCheckpoint.branch !== taskContract.singleTask.branch
            || resumeCheckpoint.packetRevision !== taskContext.executionPacket.revision
            || resumeCheckpoint.contextRevision !== contextRevision) throw recoveryError("checkpoint_mismatch");
        if (resumeCheckpoint.stage === "branch_intent") {
          if (![repository.baseBranch, taskContract.singleTask.branch].includes(actualBranch)) throw recoveryError("repository_mismatch");
          if (actualBranch === repository.baseBranch && digest !== resumeCheckpoint.workspaceDigest) throw recoveryError("workspace_changed");
        } else {
          assertTaskBranch(actualBranch, taskContract.singleTask.branch);
          if (digest !== resumeCheckpoint.workspaceDigest) throw recoveryError("workspace_changed");
        }
      } else if (![repository.baseBranch, taskContract.singleTask.branch].includes(actualBranch)
          || claimed.checkpoint?.stage !== "claimed") throw recoveryError("repository_mismatch");
      firstWrite = await duration.wait(requestFirstWriteAdmission({ api, claimed, writerLock, repositoryPath,
        provider: config.executionProvider, contract: taskContract, baselineCommit: preparedCommit,
        assertAuthority: assertProviderAuthority }));
      if (actualBranch === repository.baseBranch && firstWrite.continuation
          || actualBranch === taskContract.singleTask.branch && (!firstWrite.continuation && !resumeCheckpoint
            || firstWrite.continuation && firstWrite.continuation.previousCommit !== preparedCommit))
        throw recoveryError("repository_mismatch");
      if (actualBranch === repository.baseBranch) {
        if (claimed.checkpoint.stage === "claimed") await duration.wait(checkpoint("branch_intent", taskContext.executionPacket.revision, digest));
        else if (claimed.checkpoint.stage !== "branch_intent") throw recoveryError("checkpoint_mismatch");
        assertProviderAuthority();
        if (await duration.wait(readTaskCommit(repositoryPath)) !== firstWrite.baselineCommit
            || (await duration.wait(gitStatus(repositoryPath))).length) throw recoveryError("workspace_changed");
        await duration.wait(createTaskBranch(repositoryPath, taskContract.singleTask.branch));
        actualBranch = await duration.wait(readTaskBranch(repositoryPath));
        assertTaskBranch(actualBranch, taskContract.singleTask.branch);
        if (await duration.wait(readTaskCommit(repositoryPath)) !== preparedCommit
            || (await duration.wait(gitStatus(repositoryPath))).length) throw recoveryError("workspace_changed");
        digest = await duration.wait(workspaceDigest(repositoryPath));
        await duration.wait(checkpoint("branch_ready", taskContext.executionPacket.revision, digest));
      } else if (claimed.checkpoint.stage === "claimed") {
        // A reviewer-returned correction starts on the same clean task branch.
        // Record both durable boundaries even though no branch switch is needed.
        await duration.wait(checkpoint("branch_intent", taskContext.executionPacket.revision, digest));
        await duration.wait(checkpoint("branch_ready", taskContext.executionPacket.revision, digest));
      } else if (claimed.checkpoint.stage === "branch_intent") {
        // Interrupted after branch switch but before the branch_ready checkpoint.
        // This path is safe only at the exact signed baseline with a clean tree.
        digest = await duration.wait(workspaceDigest(repositoryPath));
        await duration.wait(checkpoint("branch_ready", taskContext.executionPacket.revision, digest));
      }
    } else {
      assertTaskBranch(actualBranch, taskContract.singleTask.branch);
      if (inspecting && beforeStatus.length) throw recoveryError("workspace_changed");
    }
    const inspection = taskContract.nativeBoundary?.inspectReadOnly;
    if (inspecting && inspection.kind === "code-reviewer") {
      if (!codeReviewerConfigSchema.safeParse(config.codeReviewer).success
          || config.codeReviewer.agentId !== taskContext.executionPacket.identity.agentId) throw protocolAdmissionError("code_reviewer_config_invalid");
      codeReviewerKey = await duration.wait(readCodeReviewerCredential(config.codeReviewer));
      codeReviewerView = validateCodeReviewView(await duration.wait(reviewerApi({ baseUrl, config: config.codeReviewer,
        key: codeReviewerKey, route: `/v1/agent-runtime/tasks/${inspection.verifiedTaskId}/review` })),
      inspection, taskContext.executionPacket.identity.agentId);
    }
    if (inspecting) readOnlyEvidence = await duration.wait(collectReadOnlyRepositoryEvidence({ repositoryPath,
      expected: { head: preparedCommit, branch: actualBranch, origin: repository.originUrl },
      paths: taskContract.nativeBoundary.readPaths, secrets: [apiKey, claimed.leaseToken, codeReviewerKey].filter(Boolean),
      reviewMaterial: codeReviewerView, review: inspection.kind === "code-reviewer" ? inspection : null }));
    if (inspection?.kind === "verifier") priorAudit = verifiedPriorReadOnlyAudit(
      await duration.wait(api(`/v1/agent-runtime/executions/${claimed.id}/actions/prior-readonly-audit`, {
        method: "POST", body: JSON.stringify({ leaseToken: claimed.leaseToken }) })),
      { claimed, contract: taskContract, repositoryEvidence: readOnlyEvidence });
    if (coding && config.executionProvider.testReplayPath) {
      if (!firstWrite?.continuation || firstWrite.continuation.previousCommit !== preparedCommit)
        throw protocolAdmissionError("coding_test_replay_continuation_required");
      replayConfiguration = prepareTestReplayConfiguration({ filename: config.executionProvider.testReplayPath,
        repositoryPath, candidateCommit: preparedCommit, branch: actualBranch });
      if (replayConfiguration.config.projectionPaths.some(relative => !taskContract.nativeBoundary.writePaths.includes(relative)))
        throw protocolAdmissionError("coding_test_replay_scope_invalid");
      codingReplay = prepareCodingTestReplay({ ...replayConfiguration.config,
        manifestPath: config.executionProvider.testManifestPath, repositoryPath, originUrl: repository.originUrl,
        acceptanceTests: taskContract.acceptance.tests, writePaths: taskContract.nativeBoundary.writePaths });
    } else if (coding && taskContract.nativeBoundary.writePaths.length) codingTests = prepareCodingTests({
      manifestPath: config.executionProvider.testManifestPath, repositoryPath, originUrl: repository.originUrl,
      acceptanceTests: taskContract.acceptance.tests, writePaths: taskContract.nativeBoundary.writePaths });
    const providerInput = prepareProviderInput({ fresh: { taskContext, applicationContext }, claimed,
      currentCommit: preparedCommit, assertAuthority: assertProviderAuthority, secrets: [apiKey, codeReviewerKey].filter(Boolean),
      provider: config.executionProvider, repositoryPath,
      repositoryEvidence: readOnlyEvidence, priorAudit,
      nativeBoundaryOptions: { writerLock, expected: { head: preparedCommit, branch: taskContext.executionPacket.contract.singleTask.branch, origin: repository.originUrl } },
      startupEnvironment: config.executionProvider?.kind === "hermes_codex" && config.executionProvider.profile
        ? hermesStartupEnvironment(config.executionProvider.profile, process.env, repositoryPath) : undefined });
    nativeInput = providerInput;
    if (config.executionProvider?.kind === "hermes_codex" && !inspecting) {
      hermesBaseline = await duration.wait(collectWorkspaceEvidence({
        repositoryPath, expectedHead: preparedCommit, expectedBranch: taskContext.executionPacket.contract.singleTask.branch,
        inputSeal: providerInput.seal, secrets: [apiKey, claimed.leaseToken, codeReviewerKey].filter(Boolean) }));
      if (!codingTests && !codingReplay) hermesReadOnlyBaseline = await duration.wait(captureReadOnlyReviewBaseline({ repositoryPath,
        contract: taskContext.executionPacket.contract, workspaceEvidence: hermesBaseline }));
    }
    if (resumeCheckpoint) assertRecoverySnapshot(resumeCheckpoint, taskContext.executionPacket.revision, digest, contextRevision);
    if (["claimed", "branch_ready"].includes(claimed.checkpoint?.stage)) await duration.wait(checkpoint("prepared", taskContext.executionPacket.revision, digest));
    else if (claimed.checkpoint?.stage !== "prepared") throw recoveryError("checkpoint_mismatch");
    await duration.wait(checkpoint("spawn_intent", taskContext.executionPacket.revision, digest));
    if (config.executionProvider?.kind === fixed.kind) {
      // Finish mutable Worker checkpoints before original ownership freezes the
      // Writer bytes. API recovery for this one-shot class is always denied.
      assertFixedTask(providerInput);
      fixedGrant = await duration.wait(prepareFixedExecution({ envelope: providerInput, writerLock, repositoryPath, claimed, assertAuthority: assertProviderAuthority,
        deadline: new Date(Date.now() + duration.remainingMs).toISOString() }));
    }
    lease.assertValid();
    await api(`/v1/agent-runtime/executions/${claimed.id}/events`, { method: "POST", body: JSON.stringify({ leaseToken: claimed.leaseToken, type: "runner_started", message: config.executionProvider?.kind === fixed.kind ? "Starting the fixed synthetic program." : config.executionProvider?.kind === "hermes_codex" ? "Preparing managed Hermes." : `Starting Codex in ${claimed.application.slug}.`, payload: { sandbox: inspecting ? "read-only" : sandbox, providerInput: { schemaVersion: providerInput.schemaVersion, seal: providerInput.seal }, requestedModelSelection: config.executionProvider?.kind === fixed.kind ? null : taskContext.executionPacket.contract.modelSelection, baseBranch: repository.baseBranch || claimed.baseBranch || null, preExistingDirtyFiles: beforeStatus.map(statusPath) } }) }).catch((error) => { lease.reject(error); throw lease.failure ?? error; });
    lease.assertValid();
    executionPhase = "launch_context";
    await duration.wait(assertAdmission());
    await duration.wait(validateAgentHostWorkspace(config));
    assertTaskBranch(await duration.wait(readTaskBranch(repositoryPath)), taskContext.executionPacket.contract.singleTask.branch);
    const currentCommit = await duration.wait(readTaskCommit(repositoryPath));
    const fresh = await duration.wait(fetchExecutionContext(api, claimed));
    guardHostContent(fresh, "required", [apiKey, claimed.leaseToken]);
    assertFreshExecutionContext(contextRevision, fresh, claimed);
    readyContext.assertReadyContext(fresh.taskContext, fresh.applicationContext, claimed);
    ({ taskContext, applicationContext } = fresh);
    // Last remote authority read observes the active stop fence after context reads.
    await duration.wait(lease.refresh());
    // No awaited RPC/work remains between this admission check and spawn.
    const launchOptions = { provider: config.executionProvider, envelope: providerInput, fixedGrant, writerLock,
      repositoryPath, codexCommand, sandbox: inspecting ? "read-only" : sandbox, secrets: [apiKey, claimed.leaseToken, codeReviewerKey].filter(Boolean),
      startupEnvironment: config.executionProvider?.kind === "hermes_codex" && config.executionProvider.profile
        ? hermesStartupEnvironment(config.executionProvider.profile, process.env, repositoryPath) : undefined };
    const launchAuthority = { fresh, claimed, currentCommit, assertAuthority: assertProviderAuthority, secrets: [apiKey, codeReviewerKey].filter(Boolean) };
    if (config.executionProvider?.kind === "hermes_codex" && providerInput.contract.modelSelection.schemaVersion === managedBackendVersion) {
      executionPhase = "installation_attestation";
      // Full disk verification can block timers. Enter it with a freshly
      // confirmed lease; its elapsed time still consumes the original budget.
      await duration.wait(lease.refreshConfirmed());
      await duration.wait(assertAdmission(true));
      await duration.wait(lease.refreshConfirmed());
      lease.assertValid();
      executionPhase = "managed_source";
      const prepared = buildManagedAdmissionSource({ envelope: providerInput, claimed, writerLock,
        repositoryPath, provider: config.executionProvider, startupEnvironment: launchOptions.startupEnvironment,
        remainingMs: () => duration.remainingMs });
      // Source construction is synchronous and may delay the periodic heartbeat.
      // A stale local deadline must stop here, before asking Roost to sign.
      await duration.wait(lease.refreshConfirmed());
      lease.assertValid();
      executionPhase = "managed_admission";
      launchOptions.managedAdmission = await duration.wait(requestManagedAdmission({ api, ...prepared,
        firstWrite, assertAuthority: assertProviderAuthority,
        refreshLease: () => duration.wait(lease.refreshConfirmed()) }));
      await duration.wait(api(`/v1/agent-runtime/executions/${claimed.id}/events`, { method: "POST",
        body: JSON.stringify({ leaseToken: claimed.leaseToken, type: "runner_progress",
          message: "Signed managed admission accepted; preparing native Hermes launch." }) }));
      executionPhase = "post_admission";
      await duration.wait(lease.refreshConfirmed());
      lease.assertValid();
      // JIT signing is an awaited remote operation. Reopen every mutable
      // authority check after it, immediately before spending the local proof.
      await duration.wait(assertAdmission());
      await duration.wait(validateAgentHostWorkspace(config));
      assertTaskBranch(await duration.wait(readTaskBranch(repositoryPath)), taskContext.executionPacket.contract.singleTask.branch);
      launchAuthority.currentCommit = await duration.wait(readTaskCommit(repositoryPath));
      launchAuthority.fresh = await duration.wait(fetchExecutionContext(api, claimed));
      guardHostContent(launchAuthority.fresh, "required", [apiKey, claimed.leaseToken]);
      assertFreshExecutionContext(contextRevision, launchAuthority.fresh, claimed);
      readyContext.assertReadyContext(launchAuthority.fresh.taskContext, launchAuthority.fresh.applicationContext, claimed);
      // A periodic heartbeat begun before these awaited checks is not the
      // final launch confirmation. Obtain a new serialized renewal here;
      // its original deadline still cannot be revived by a late response.
      await duration.wait(lease.refreshConfirmed());
    }
    if (config.executionProvider?.kind === fixed.kind)
      launchOptions.containmentReceipt = prepareFixedHostContainment(launchOptions, launchAuthority);
    executionPhase = "provider_launch";
    const launch = prepareProviderLaunch(launchOptions, launchAuthority);
    executionPhase = "native_execution";
    assertProviderAuthority();
    let transportAccounting;
    if (launch.kind === fixed.kind) {
      hermesAbort = new AbortController();
      const pending = hermesCollection = runFixedExecution(launch.grant, { signal: hermesAbort.signal, remainingMs: () => duration.remainingMs });
      void pending.catch(() => undefined);
      const result = await duration.wait(pending);
      finalResponse = result.finalResponse; verification.synthetic = result.verification;
      verification.reviewRequired = true; verification.outcome = "candidate_result";
      usage = { inputTokens: 0, outputTokens: 0, cost: 0, physicalModelCalls: 0 };
      transportAccounting = { interface: fixed.program, outcome: "candidate_result", modelInvoked: false };
    } else if (launch.kind === "hermes_codex") {
      // One stdin write; quiet output is not parsed as tool events or usage.
      hermesAbort = new AbortController();
      const pending = hermesCollection = runHermesOwnedProcess({ executable: launch.command, argv: launch.args,
        cwd: launch.cwd, environment: launch.candidateEnvironment, attempt: claimed.id, input: launch.input, remainingMs: () => duration.remainingMs,
        signal: hermesAbort.signal, budgetReceipt: launch.budgetReceipt, nativeToolReceipt: launch.nativeToolReceipt,
        readOnlyToolReceipt: launch.readOnlyToolReceipt,
        stopReason: () => duration.failure ?? lease.failure,
        secrets: [apiKey, claimed.leaseToken, codeReviewerKey].filter(Boolean), assertAuthority: assertProviderAuthority,
        assertLaunchAuthority: launch.assertLaunchAuthority,
        shutdownRequested: () => shutdownRequested || stopping, expectedJobSourceDigest: launch.expectedJobSourceDigest });
      void pending.then(receipt => { hermesCompletedReceipt = receipt.ownedTreeReceipt; }, () => undefined);
      void pending.catch(() => undefined);
      // Keep the signed spawn-intent Writer bytes stable until native cleanup.
      // Recovery already classifies this stage as process-may-be-running.
      const receipt = await duration.wait(pending);
      hermesCompletedReceipt = receipt.ownedTreeReceipt;
      finalResponse = receipt.finalResponse;
      usage = { inputTokens: null, outputTokens: null, cost: null, physicalModelCalls: null, toolCalls: null, transportRetries: null };
      verification.ownedTreeReceipt = receipt.ownedTreeReceipt;
      verification.attemptBudgetReceipt = receipt.attemptBudgetReceipt;
      verification.nativeToolReceipt = receipt.nativeToolReceipt;
      if (inspecting) verification.readOnlyAudit = receipt.readOnlyAudit;
      verification.managedAdmission = { qualification: launch.trustedPilot.qualification,
        decisionId: launch.trustedPilot.decisionId, revision: launch.trustedPilot.revision,
        evidenceDigest: launch.managedBackend.evidence.digest, jobSourceDigest: launch.expectedJobSourceDigest };
      verification.outcome = "candidate_result";
      verification.reviewRequired = true;
      transportAccounting = { interface: "quiet", outcome: "candidate_result", usageAccounting: "unavailable", internalTurnCount: null,
        transportRetryCount: null, toolEventsAvailable: false, reviewRequired: true };
    } else {
    const turnGuard = createDirectTurnGuard();
    child = spawn(launch.command, launch.args, { cwd: launch.cwd, env: safeChildEnvironment(), shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    const exitPromise = new Promise((resolve, reject) => {
      child.once("error", () => { try { turnGuard.complete(-1, false); } catch (failure) { reject(failure); } });
      child.once("close", resolve);
    });
    // Attach a rejection handler immediately; stdout may finish after a spawn error.
    void exitPromise.catch(() => undefined);
    child.stdin.on("error", () => undefined);
    child.stdin.end(launch.input);

    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > 131072) { redactionFailure = Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true, retryable: false }); stopWorker(); return; }
      stderrTail.push(chunk);
    });

    await duration.wait(checkpoint("running", taskContext.executionPacket.revision, digest));

    const iterator = boundedRunnerLines(child.stdout)[Symbol.asyncIterator]();
    while (true) {
      const { value: line, done } = await duration.wait(iterator.next());
      if (done) break;
      lease.assertValid();
      if (!line.trim()) continue;
      let event;
      if (line.length > 131072) throw Object.assign(new Error("agent_runtime_content_blocked"), { redaction: true });
      try { event = JSON.parse(line); } catch { continue; }
      runnerEvents.push(event);
      turnGuard.observe(event);
      // Observable runner boundaries plus the periodic heartbeat cover quiet
      // work. They do not establish atomicity inside a Codex tool/OS operation.
      if (["item.started", "item.completed", "turn.completed"].includes(event.type)) {
        await duration.wait(lease.refresh());
        lease.assertValid();
      }
      if (event.type === "thread.started") codexThreadId = guardHostContent(event.thread_id || null, "required", [apiKey, claimed.leaseToken]).value;
      if (event.type === "turn.completed") { outputBudget.observeUsage(event.usage); usage = event.usage || {}; }
      if (!lease.failure && claimed.checkpoint.stage === "running" && ["command_execution", "mcp_tool_call"].includes(event.item?.type)) await duration.wait(checkpoint("effect_possible", taskContext.executionPacket.revision, digest));
      const summary = event.type === "item.completed" ? summarizeItem(event.item) : null;
      if (summary && !lease.failure) await api(`/v1/agent-runtime/executions/${claimed.id}/events`, { method: "POST", body: JSON.stringify({ leaseToken: claimed.leaseToken, type: summary.type, message: "Runner progress received." }) }).catch((error) => lease.reject(error));
    }

    const exitCode = await duration.wait(exitPromise);
    if (redactionFailure) throw redactionFailure;
    const diagnostics = guardHostContent({ events: runnerEvents, stderr: Buffer.concat(stderrTail).toString("utf8") }, "diagnostic", [apiKey, claimed.leaseToken]);
    if (diagnostics.redacted) await api(`/v1/agent-runtime/executions/${claimed.id}/events`, { method: "POST", headers: { "X-Roost-Redaction-Notice": "1" }, body: JSON.stringify({ leaseToken: claimed.leaseToken, type: "runtime_redaction", message: "Runner content removed." }) });
    if (diagnostics.redacted) finalResponse = "[REDACTED]";
    for (const event of diagnostics.redacted ? [] : diagnostics.value.events) {
      if (event.type === "item.completed" && event.item?.type === "agent_message") finalResponse = String(event.item.text || "");
      if (event.type === "item.completed" && event.item?.type === "command_execution") verification.commands.push({ command: event.item.command, status: event.item.status, exitCode: event.item.exit_code });
    }
    await stopPromise;
    if (stopError) throw Object.assign(new Error("agent_process_tree_stop_failed"), { leaseLost: true });

    if (lease.failure?.message === "agent_execution_cancel_requested") {
      await api(`/v1/agent-runtime/executions/${claimed.id}/actions/cancelled`, { method: "POST", body: JSON.stringify({ leaseToken: claimed.leaseToken }) });
      return;
    }
    lease.assertValid();
    transportAccounting = turnGuard.complete(exitCode, runnerEvents.some(event =>
      event.type === "item.completed" && event.item?.type === "agent_message" && typeof event.item.text === "string" && event.item.text.trim()));
    }

    let afterStatus = await duration.wait(gitStatus(repositoryPath));
    const resultBranch=await duration.wait(readTaskBranch(repositoryPath));
    assertTaskBranch(resultBranch,taskContext.executionPacket.contract.singleTask.branch);
    let resultCommit=await duration.wait(readTaskCommit(repositoryPath));
    if (inspecting && (afterStatus.length || resultCommit !== preparedCommit || !verification.readOnlyAudit
        || verification.readOnlyAudit.verdict !== "verified")) throw protocolAdmissionError("readonly_result_changed");
    if (inspecting && inspection.kind === "code-reviewer") {
      const freshReview = validateCodeReviewView(await duration.wait(reviewerApi({ baseUrl, config: config.codeReviewer,
        key: codeReviewerKey, route: `/v1/agent-runtime/tasks/${inspection.verifiedTaskId}/review` })),
      inspection, taskContext.executionPacket.identity.agentId);
      if (freshReview.expectedVersion !== codeReviewerView.expectedVersion
          || freshReview.materialVersion !== codeReviewerView.materialVersion) throw protocolAdmissionError("code_review_material_changed");
      const decision = prepareCodeReviewDecision({ finalResponse, view: codeReviewerView, review: inspection,
        config: config.codeReviewer, readOnlyAudit: verification.readOnlyAudit });
      const outcome = await duration.wait(reviewerApi({ baseUrl, config: config.codeReviewer, key: codeReviewerKey,
        route: `/v1/agent-runtime/tasks/${inspection.verifiedTaskId}/actions/review`, method: "POST", body: decision }));
      if (outcome.decision?.executionId !== inspection.verifiedExecutionId
          || outcome.decision?.materialVersion !== codeReviewerView.materialVersion
          || outcome.decision?.decision !== decision.decision || outcome.decision?.actorAgentId !== config.codeReviewer.agentId)
        throw protocolAdmissionError("code_review_decision_unproven");
      verification.codeReviewDecision = { id: outcome.decision.id, decision: outcome.decision.decision,
        executionId: outcome.decision.executionId, materialVersion: outcome.decision.materialVersion,
        reviewedCommit: inspection.reviewedCommit, reviewerAgentId: config.codeReviewer.agentId };
    }
    if (launch.kind === "hermes_codex" && !inspecting) {
      // The supervised implementer may not commit. Review binds the exact dirty
      // bytes through verification, already part of Roost's review fingerprint.
      verification.workspaceEvidence = await duration.wait(collectWorkspaceEvidence({ repositoryPath,
        expectedHead: preparedCommit, expectedBranch: taskContext.executionPacket.contract.singleTask.branch,
        inputSeal: providerInput.seal, baselineSeal: hermesBaseline.seal, secrets: [apiKey, claimed.leaseToken] }));
      const reviewed = await duration.wait(verifyCompletedNativeBoundary(verification.nativeToolReceipt, {
        verify: async () => {
          if (!codingTests && !codingReplay) return verifyReadOnlyReview({ repositoryPath, baseline: hermesReadOnlyBaseline,
            workspaceEvidence: verification.workspaceEvidence });
          const assertTestAuthority = () => { assertProviderAuthority(); replayConfiguration?.assertUnchanged(); };
          if (codingReplay && (verification.workspaceEvidence.status.length || verification.workspaceEvidence.manifest.length))
            throw protocolAdmissionError("coding_test_replay_changed_candidate");
          const tested = codingReplay
            ? bindCodingTestReplayVerification(await runCodingTestReplay(codingReplay, { workspaceSeal: verification.workspaceEvidence.seal,
              remainingMs: () => duration.remainingMs, assertAuthority: assertTestAuthority }))
            : await runCodingTests(codingTests, { phase: "candidate", workspaceSeal: verification.workspaceEvidence.seal,
              remainingMs: () => duration.remainingMs, assertAuthority: assertTestAuthority });
          verification.codingTests = tested;
          const postTest = await collectWorkspaceEvidence({ repositoryPath, expectedHead: preparedCommit,
            expectedBranch: taskContract.singleTask.branch, inputSeal: providerInput.seal,
            baselineSeal: hermesBaseline.seal, secrets: [apiKey, claimed.leaseToken] });
          if (postTest.seal !== verification.workspaceEvidence.seal) throw protocolAdmissionError("coding_tests_changed_workspace");
          return { before: { exit: tested.regressionReplay?.red.exitCode ?? null }, after: { exit: tested.passed ? 0 : 1, passed: tested.passed },
            testUnchanged: true, baselineCommitUnchanged: true, minimalChange: true,
            diffDigest: verification.workspaceEvidence.seal };
        },
        installation: async () => {
          const manifestPath = config.executionProvider.attestation.manifestPath;
          const post = await verifyHermesSmokeInstallation({ manifestPath,
            attestationPath: path.join(path.dirname(manifestPath), "roost-installation-attestation.json") });
          return { status: "PASS", manifestDigest: post.manifestDigest };
        }
      }));
      verification.nativeReviewReceipt = reviewed.publicReceipt;
      verification.nativeReviewReceiptDigest = reviewed.receiptDigest;
      if (reviewed.publicReceipt.verdict !== "verified_candidate") throw Object.assign(
        new Error("agent_native_review_blocked"), { retryable: false, publicMessage: "Native review did not verify the candidate result.",
          details: { nativeReviewReceipt: reviewed.publicReceipt, nativeReviewReceiptDigest: reviewed.receiptDigest,
            ...(verification.codingTests ? { codingTests: verification.codingTests } : {}) } });
      releaseReviewedNativeBoundary(verification.nativeToolReceipt, reviewed.capability);
      if (codingTests || codingReplay) {
        const renewedFirstWrite = await duration.wait(requestFirstWriteAdmission({ api, claimed, writerLock, repositoryPath,
          provider: config.executionProvider, contract: taskContract, baselineCommit: preparedCommit,
          assertAuthority: assertProviderAuthority }));
        if (renewedFirstWrite.decisionId !== firstWrite.decisionId
            || renewedFirstWrite.baselineCommit !== firstWrite.baselineCommit
            || renewedFirstWrite.branch !== firstWrite.branch
            || JSON.stringify(renewedFirstWrite.continuation ?? null) !== JSON.stringify(firstWrite.continuation ?? null)) throw protocolAdmissionError("first_write_changed_before_commit");
        firstWrite = renewedFirstWrite;
        verification.localCommit = (codingReplay ? verifyExistingLocalCommit : finalizeLocalCommit)({ repositoryPath, writerLock, executionId: claimed.id,
          taskId: claimed.taskId, baselineCommit: preparedCommit, branch: resultBranch,
          writePaths: taskContract.nativeBoundary.writePaths, firstWrite,
          nativeReviewReceipt: reviewed.publicReceipt, nativeReviewReceiptDigest: reviewed.receiptDigest,
          candidateTests: verification.codingTests, workspaceEvidence: verification.workspaceEvidence,
          assertAuthority: assertProviderAuthority });
        resultCommit = await duration.wait(readTaskCommit(repositoryPath));
        afterStatus = await duration.wait(gitStatus(repositoryPath));
        if (resultCommit !== verification.localCommit.commit || afterStatus.length) throw protocolAdmissionError("local_commit_result_drift");
      }
      retireManagedAdmissionArtifacts({ directory: path.join(writerRecoveryEvidence(writerLock).directory, "trusted-provider-pilot"),
        executionId: claimed.id, evidenceDigest: launch.managedBackend.evidence.digest });
    }
    if (launch.kind === "hermes_codex" && inspecting) retireManagedAdmissionArtifacts({
      directory: path.join(writerRecoveryEvidence(writerLock).directory, "trusted-provider-pilot"),
      executionId: claimed.id, evidenceDigest: launch.managedBackend.evidence.digest });
    const committedPaths=await duration.wait(readTaskPaths(repositoryPath,currentCommit,resultCommit));
    const changedFiles = [...new Set([...committedPaths,...afterStatus.map(statusPath)])];
    const resultRevision={commit:resultCommit,branch:resultBranch,workingTree:afterStatus.length?"dirty":"clean"};
    const summary = finalResponse.trim();
    await duration.wait(lease.refresh());
    lease.assertValid();
    duration.assertWithinBudget();
    outputBudget.assertWithinBudget();
    // The child has exited. Avoid racing a heartbeat with the terminal API transition.
    lease.stop();
    duration.stop();
    await api(`/v1/agent-runtime/executions/${claimed.id}/actions/complete`, {
      method: "POST",
      body: JSON.stringify({ leaseToken: claimed.leaseToken, summary: summary.slice(0, 10000), finalResponse, codexThreadId, changedFiles, verification, usage, resultRevision, metadata: { repositoryPathLabel: path.basename(repositoryPath), preExistingDirtyFiles: beforeStatus.map(statusPath), transportAccounting } })
    });
  } catch (error) {
    let hermesStopReceipt;
    if (hermesCollection) {
      hermesAbort.abort();
      await hermesCollection.catch(stopped => {
        hermesStopReceipt = stopped.details?.ownedTreeReceipt;
        if (stopped.details?.attemptBudgetReceipt) for (const cause of [error, duration?.failure, lease.failure].filter(Boolean))
          cause.details = { ...cause.details, attemptBudgetReceipt: stopped.details.attemptBudgetReceipt };
      });
    }
    // Report only closed, bounded diagnostic fields after observing cleanup.
    // This append-only observation grants no authority and cannot revive a lease.
    const observedStop = hermesStopReceipt ?? hermesCompletedReceipt ?? error.details?.ownedTreeReceipt;
    const diagnostic = safeExecutionDiagnostic({ error, executionPhase, leaseFailure: lease.failure,
      nativeTermination: isWindowsJobCleanupReceipt(observedStop) ? observedStop.terminationReason : undefined });
    process.stderr.write(`Agent Host safe diagnostic: ${JSON.stringify(diagnostic)}.\n`);
    if ((executionPhase !== "context" || lease.failure) && lease.failure?.message !== "agent_execution_lease_rejected") {
      await api(`/v1/agent-runtime/executions/${claimed.id}/events`, { method: "POST", body: JSON.stringify({
        leaseToken: claimed.leaseToken, type: "runner_progress", level: "warning",
        message: "Native execution stopped; inspect bounded diagnostic fields.", payload: { diagnostic }
      }) }).catch(() => process.stderr.write("Bounded execution diagnostic could not reach Roost; ownership remains retained.\n"));
    }
    if (lease.failure?.message === "agent_execution_cancel_requested"
      && isWindowsJobCleanupReceipt(hermesStopReceipt ?? hermesCompletedReceipt)) {
      await api(`/v1/agent-runtime/executions/${claimed.id}/actions/cancelled`, {
        method: "POST", body: JSON.stringify({ leaseToken: claimed.leaseToken }) });
      retainWriterLock = false;
      return;
    }
    if (error.hostLifecycle) { stopWorker(); lease.stop(); await stopPromise; throw error; }
    if (error.contextStop || lease.failure?.contextStop) {
      stopWorker();
      lease.stop();
      await stopPromise;
      if (!stopError) {
        try {
          // Only after confirmed stop and server acknowledgement may an
          // unaccepted local checkpoint intent be replaced by the durable one.
          await confirmContextStop(claimed, writerLock);
        } catch { process.stderr.write("Context stop acknowledgement could not be confirmed; ownership retained for reconciliation.\n"); }
      }
      throw lease.failure?.contextStop ? lease.failure : error;
    }
    if (error.outputLimit) stopWorker();
    if (error.message === "execution_packet_invalid" && error.details?.issues?.some(issue => ["contract", "contract.budgets", "contract.budgets.maxOutputTokens"].includes(issue.field))) stopWorker();
    if (error.protocolAdmission) { protocolHalted = true; lease.reject(error); stopWorker(); if (lease.failure) throw lease.failure; }
    if (error.contextAdmission || error.readyAdmission) { lease.reject(error); stopWorker(); if (lease.failure) throw lease.failure; }
    // A pending RPC/stream must never turn an expired run into success or a retry.
    if (duration?.failure) throw lease.failure ?? duration.failure;
    if (outputBudget?.failure) throw lease.failure ?? outputBudget.failure;
    throw error;
  } finally {
    duration?.stop();
    lease.stop();
    let hermesCleanupError;
    if (fixedGrant && !hermesCollection) { try { abandonFixedExecution(fixedGrant); } catch { retainWriterLock = true; } }
    if (nativeInput && !hermesCollection) {
      try { abandonProviderNativeBoundary(nativeInput); } catch { retainWriterLock = true; }
    }
    if (hermesCollection) {
      hermesAbort.abort();
      await hermesCollection.catch(error => {
        if (error.leaseLost) { retainWriterLock = true; stopping = true; hermesCleanupError = error; }
      });
    }
    await stopPromise;
    // taskkill may finish before Node delivers the child's exit event. Do not
    // race a successful stop with a second taskkill against the same PID.
    if (!hermesCollection && !stopRequested && child && child.exitCode === null && child.signalCode === null) {
      stopping = true;
      await terminateWindowsProcessTree(child).catch((error) => { retainWriterLock = true; throw error; });
    }
    child?.stdout?.destroy();
    child?.stderr?.destroy();
    if (hermesCleanupError) throw hermesCleanupError;
    if (stopError) throw Object.assign(new Error("agent_process_tree_stop_failed"), { leaseLost: true });
  }
}

async function reportFailure(execution, error, writerLock) {
  if (!execution?.leaseToken || error.leaseLost) return;
  return api(`/v1/agent-runtime/executions/${execution.id}/actions/fail`, {
    method: "POST",
    ...(error.redaction ? { headers: { "X-Roost-Redaction-Notice": "1" } } : {}),
    body: JSON.stringify({ leaseToken: execution.leaseToken, code: String(error.message || "agent_host_failed").split(":")[0], message: String(error.publicMessage || error.message || "Agent Host failed."), retryable: error.retryable ?? true, details: error.details || {} })
  }).then(() => true).catch(async failure => {
    retainWriterLock = true; stopping = true;
    // execute() has already confirmed tree termination in its finally block.
    // A source change racing an ordinary failure still requires the stop ACK.
    if (failure.contextStop) {
      await confirmContextStop(execution, writerLock).catch(() => { process.stderr.write("Context stop acknowledgement could not be confirmed; ownership retained for reconciliation.\n"); });
    } else process.stderr.write("Could not confirm the failure report; recovery required.\n");
    return false;
  });
}

function recoveryReason(error) {
  if (error.contextStop) return "context_changed";
  if (error.recoveryReason) return error.recoveryReason;
  if (error.message === "agent_process_tree_stop_failed") return "process_may_be_running";
  const leaseReason = leaseRecoveryReason(error);
  if (leaseReason) return leaseReason;
  if (error.message === "execution_packet_invalid") return "packet_invalid";
  if (error.readyAdmission) return "context_changed";
  if (/sandbox/.test(error.message)) return "sandbox_invalid";
  if (/writer|ENOENT|JSON/.test(error.message)) return "writer_locked";
  if (/repository|workspace_root|origin/.test(error.message)) return "repository_mismatch";
  return "context_unavailable";
}

async function reportRecovery(execution, reason) {
  if (!execution?.id) return;
  await api(`/v1/agent-runtime/executions/${execution.id}/actions/recovery-blocked`, { method: "POST", body: JSON.stringify({ hostSlug: host.slug, reason }) })
    .catch(() => process.stderr.write("Recovery diagnostic could not reach Roost; local ownership remains retained.\n"));
}

process.on("SIGINT", () => { stopping = true; shutdownRequested = true; });
process.on("SIGTERM", () => { stopping = true; shutdownRequested = true; });

// Process tests inject a private lock, branch reader and synthetic post-turn budget guard.
// The CLI always uses the fixed lock, Git branch reader and fail-closed Codex guard. No
// dependency can be selected by configuration, environment or an API packet.
export async function runHost({ acquireLock = (options) => acquireWriterLock(undefined, options), onCheckpoint, createOutputBudget = createCodexOutputBudget, readTaskBranch = readCurrentTaskBranch, readTaskCommit = readCurrentTaskCommit, readTaskPaths = readCommittedTaskPaths, providerAdmissionForTest = providerAdmissionReason } = {}) {
  // Synthetic process tests can exercise later fences. CLI/config/env/packets
  // cannot select this dependency; production always uses the shared denial.
  providerAdmission = providerAdmissionForTest;
  // Observe never enters recovery, writer locking, claim, or execution code.
  if (config.executionMode === "observe") return runObserver({ config, api, stopped: () => stopping });
  // Managed Hermes admission inspects its private profile against each canonical
  // checkout. Resolve and verify the configured repositories before the first
  // admission heartbeat; otherwise a valid installation remains permanently
  // blocked because the raw config has only directory names, not checked paths.
  if (config.executionProvider?.kind === "hermes_codex" && config.executionProvider.enabled === true
      && config.executionProvider.profile) config = await validateAgentHostWorkspace(config);
  if (!await waitForAdmission()) return;
  let recovery;
  try { recovery = await api(`/v1/agent-runtime/recovery?hostSlug=${encodeURIComponent(host.slug)}`); }
  catch (error) {
    if (!error.protocolAdmission) throw error;
    await waitForAdmission(true);
    return;
  }
  if (!Array.isArray(recovery?.executions)) throw recoveryError("context_unavailable");
  const pending = recovery.executions;
  if (pending.length > 1) {
    for (const execution of pending) await reportRecovery(execution, "multiple_executions");
    throw recoveryError("multiple_executions");
  }
  let writerLock;
  let resumedExecution;
  try {
    if (pending[0] && config.governedRelease) throw recoveryError("multiple_executions");
    const recoveryMode = pending[0] ? classifyRecovery(pending[0], recovery.executionEnabled) : null;
    const releaseRecoveryCandidate = await getGovernedReleaseRecoveryCandidate({config,baseUrl,hostId:registeredHost.id});
    writerLock = await acquireLock({ recoveryCandidate: pending[0], terminalCandidates: recovery.terminalPreSpawn,releaseRecoveryCandidate });
    config = await validateAgentHostWorkspace(config);
    if (pending[0]) {
      if (!await waitForAdmission()) { retainWriterLock = true; return; }
      const resumed = await api(`/v1/agent-runtime/executions/${pending[0].id}/actions/recover`, { method: "POST", body: JSON.stringify({ hostSlug: host.slug, sessionId: writerLock.sessionId, expectedVersion: pending[0].checkpointVersion }) });
      resumedExecution = resumed;
      if (resumed?.id !== pending[0].id || resumed?.attempt !== pending[0].attempt) throw recoveryError("recovery_conflict");
      await writerLock.checkpoint(resumed);
      // A claimed checkpoint proves no execution preparation/effect occurred.
      // Revalidate this same attempt from entry; branch checkpoints instead
      // retain their sealed packet, context, branch and workspace snapshot.
      await execute(resumed, writerLock, { resumeCheckpoint: recoveryMode === "resume_from_checkpoint" ? pending[0].checkpoint : undefined,
        onCheckpoint, createOutputBudget, readTaskBranch, readTaskCommit, readTaskPaths });
    }
    while (!stopping) {
      let execution = null;
      try {
        if (!await waitForAdmission()) break;
        const releaseStep = await runGovernedReleaseQueueStep({ config, baseUrl, hostId: registeredHost.id,
          writerLock, stopped: () => stopping });
        // An uncertain remote effect must survive a normal controller stop too.
        // The next owner first qualifies this sealed Writer and only reconciles.
        if (releaseStep.reconciliationRequired) { stopping = true; retainWriterLock = true;
          if(releaseStep.uncertaintyDiagnostic){process.stderr.write(`Release Worker uncertainty: ${releaseStep.uncertaintyDiagnostic}\n`);
            persistReleaseWorkerDiagnostic(configPath,'uncertainty',releaseStep.uncertaintyDiagnostic);}
        }
        if (releaseStep.handled) { if (!stopping) await delay(1000); continue; }
        if (config.governedRelease) { if (!stopping) await delay(pollIntervalMs); continue; }
        execution = await api("/v1/agent-runtime/executions/claim", { method: "POST", body: JSON.stringify({ hostSlug: host.slug, sessionId: writerLock.sessionId }) });
        if (execution) {
          process.stdout.write("Execution claimed.\n");
          await writerLock.checkpoint(execution).catch(() => { throw recoveryError("local_state_invalid"); });
          await onCheckpoint?.("claimed", execution);
          await execute(execution, writerLock, { onCheckpoint, createOutputBudget, readTaskBranch, readTaskCommit, readTaskPaths });
        }
      } catch (error) {
        if (error.releaseBlocked) { stopping = true; retainWriterLock = true;
          if (error.releaseDiagnostic) {process.stderr.write(`Release Worker blocked: ${error.releaseDiagnostic}\n`);
            persistReleaseWorkerDiagnostic(configPath,'blocked',error.releaseDiagnostic);}
        }
        // A terminal failed review still owns its native lease and signed Writer
        // snapshot. Preserve both until exact reconciliation; another claim must
        // not replace the captured Writer bytes or inherit the application's slot.
        if (error.message === "agent_native_review_blocked") { stopping = true; retainWriterLock = true; }
        if (error.hostLifecycle) { stopping = true; retainWriterLock = true; }
        if (error.protocolAdmission) { protocolHalted = true; stopping = true; retainWriterLock = true; }
        if (error.providerFailure) stopping = true;
        if (error.readyAdmission || error.redaction) { stopping = true; if (execution) retainWriterLock = true; }
        process.stderr.write("Agent Host operation failed; inspect safe execution diagnostics.\n");
        if (error.recoveryReason || error.leaseLost) {
          stopping = true; retainWriterLock = true;
          await reportRecovery(execution, recoveryReason(error));
        } else await reportFailure(execution, error, writerLock);
        if (error.message === "agent_host_recovery_required") stopping = true;
        if (error.status === 401 || error.status === 403 || error.status === 422) break;
      }
      if (!stopping) await delay(execution ? 1_000 : pollIntervalMs);
    }
  } catch (error) {
    if (error.message === "agent_native_review_blocked") { stopping = true; retainWriterLock = true; }
    if (error.hostLifecycle) { stopping = true; retainWriterLock = true; }
    if (error.protocolAdmission) { protocolHalted = true; stopping = true; retainWriterLock = true; }
    if (pending[0]) {
      retainWriterLock = true;
      if ((error.message === "agent_native_review_blocked" || error.hostLifecycle || error.outputLimit || error.durationLimit || error.contextAdmission || error.protocolAdmission || error.readyAdmission) && resumedExecution) await reportFailure(resumedExecution, error, writerLock);
      else await reportRecovery(pending[0], recoveryReason(error));
    }
    throw error;
  } finally {
    if (retainWriterLock) process.stderr.write("Writer lock retained: reconcile the interrupted execution before restarting.\n");
    else await writerLock?.release();
    if (protocolHalted && !shutdownRequested) await waitForAdmission(true);
  }
  process.stdout.write("Roost Agent Host stopped.\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runHost().catch(() => { process.stderr.write("Agent Host stopped after an operation failure.\n"); process.exitCode = 1; });
