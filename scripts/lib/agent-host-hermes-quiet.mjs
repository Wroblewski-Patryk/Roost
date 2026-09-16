import { consumeNativeToolBoundary, completeNativeToolBoundary } from "./agent-host-hermes-native-boundary.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";
import { terminateWindowsProcessTree } from "./agent-host-execution-lease.mjs";
import contract from "./agent-host-hermes-launch-contract.cjs";
import { startWindowsJob, temporaryWindowsJobLauncher, isWindowsJobReceipt, assertWindowsJobCapability } from "./agent-host-windows-job.mjs";

import { consumeHermesBudgetReceipt, assertHermesBudgetProcess, completeHermesBudgetReceipt, classifyHermesOutcome, hermesBudgetRequiresNativeBoundary } from "./agent-host-hermes-budget.mjs";

// Real native backend; no receipt or cleanup callback can be injected by config.
// Build happens before any target process, rechecking authority afterward.
export async function runHermesOwnedProcess({ executable, argv, cwd, environment, input, attempt,
  remainingMs, secrets = [], assertAuthority, signal, shutdownRequested = () => false, stopReason = () => undefined, budgetReceipt, nativeToolReceipt, jobArtifact, onAssigned = () => {} }) {
  const began = performance.now();
  let observedJob, observedExit, nativeProof, nativeResult;
  if (hermesBudgetRequiresNativeBoundary(budgetReceipt) && !nativeToolReceipt)
    throw Object.assign(failure("hermes_native_boundary_required"), { protocolAdmission: true, outcome: "policy_blocked" });
  const budgetRemaining = budgetReceipt ? consumeHermesBudgetReceipt(budgetReceipt, { attempt, input, executable, argv, cwd, environment }) : null;
  const remaining = () => Math.min(remainingMs(), budgetRemaining ? budgetRemaining() : Infinity);
  const withJob = jobArtifact ? async run => { assertWindowsJobCapability(jobArtifact); return run(jobArtifact); } : temporaryWindowsJobLauncher;
  try { return await withJob(async artifact => {
    let problem, handle;
    const guard = createHermesQuietGuard({ secrets });
    const check = () => {
      try {
        const reason = stopReason(); if (reason) throw reason;
        if (signal?.aborted) throw failure("hermes_quiet_cancelled");
        if (shutdownRequested()) throw failure("hermes_quiet_controller_shutdown");
        assertAuthority();
        if (remaining() <= 0) throw failure("hermes_quiet_timeout");
      } catch (error) {
        problem ??= error;
        handle?.stop(error.durationLimit || error.message === "hermes_quiet_timeout" || error.message === "hermes_attempt_budget_expired" ? "timeout" : error.contextStop ? "context_stop" : error.leaseLost ? "lease_lost" :
          signal?.aborted ? "cancel" : shutdownRequested() ? "controller_shutdown" : "preparation_failed");
      }
    };
    check(); if (problem) throw problem;
    if (budgetReceipt) assertHermesBudgetProcess(budgetReceipt, { executable, argv, cwd, environment });
    if (nativeToolReceipt) nativeProof = consumeNativeToolBoundary(nativeToolReceipt, { cwd, environment, attempt, budgetReceipt });
    check(); if (problem) throw problem;
    // Footprint work can take time: recheck startup/profile expiry after it,
    // even though the budget/native one-use proofs have already been consumed.
    if (budgetReceipt) assertHermesBudgetProcess(budgetReceipt, { executable, argv, cwd, environment });
    if (jobArtifact) assertWindowsJobCapability(jobArtifact);
    // Reserve the existing 3-second launcher assignment window too. The Worker
    // timer includes that window; compute AFTER the bounded footprint recheck
    // so its time cannot extend the original native cleanup deadline.
    const nativeDuration = Math.floor(remaining()) - (budgetReceipt ? 3000 : 0);
    if (nativeDuration < 1) throw failure("hermes_quiet_timeout");
    handle = await startWindowsJob(artifact, { executable, argv, cwd, environment, input, attempt,
      durationMs: nativeDuration, onAssigned, onData: (channel, bytes) => guard.write(channel, bytes) });
    const deadlineTimer = setTimeout(() => { problem ??= failure("hermes_quiet_timeout"); handle.stop("timeout"); }, nativeDuration + (budgetReceipt ? 3000 : 0));
    const timer = setInterval(check, 25), abort = () => check();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      check();
      const receipt = observedJob = await handle.completion;
      observedExit = receipt.rootExit;
      if (!isWindowsJobReceipt(receipt)) throw Object.assign(failure("hermes_stop_recovery_unproven"), { leaseLost: true });
      if (nativeProof) {
        nativeResult = completeNativeToolBoundary(nativeProof, { ownedTreeReceipt: receipt, error: problem });
        if (nativeResult.classification === "boundary_violation") throw Object.assign(failure("hermes_native_boundary_violation"), { boundaryViolation: true, protocolAdmission: true });
      }
      if (problem) throw problem;
      check(); if (problem) throw problem;
      if (receipt.terminationReason !== "root_exit") throw failure(`hermes_quiet_${receipt.terminationReason}`);
      return Object.freeze({ ...guard.complete(receipt.rootExit), ownedTreeReceipt: receipt, nativeToolReceipt: nativeResult,
        ...(budgetReceipt ? { attemptBudgetReceipt: completeHermesBudgetReceipt(budgetReceipt, { ownedTreeReceipt: receipt, exitCode: receipt.rootExit, wallTimeMs: performance.now() - began }) } : {}) });
    } finally {
      clearTimeout(deadlineTimer); clearInterval(timer); signal?.removeEventListener("abort", abort);
      handle.stop("preparation_failed"); await handle.completion;
    }
  }); } catch (error) {
    if (nativeProof && !nativeResult) nativeResult = completeNativeToolBoundary(nativeProof, { ownedTreeReceipt: observedJob, error });
    if (nativeResult) {
      error.details = { ...error.details, nativeToolReceipt: nativeResult };
      if (nativeResult.classification === "boundary_violation") { error.boundaryViolation = true; error.protocolAdmission = true; error.leaseLost = true; }
    }
    error.outcome = classifyHermesOutcome({ error, ownedTreeReceipt: observedJob, exitCode: observedExit });
    if (budgetReceipt) error.details = { ...error.details, attemptBudgetReceipt: completeHermesBudgetReceipt(budgetReceipt,
      { error, ownedTreeReceipt: observedJob, exitCode: observedExit, wallTimeMs: performance.now() - began }) };
    throw error;
  }
}

const usedChildren = new WeakSet();
const failure = code => Object.assign(new Error(code), { providerFailure: true, retryable: false });

// No event/turn/usage inference from plain text. Completion means process exit,
// never correctness, one internal turn, tool absence, or a review decision.
export function createHermesQuietGuard({ secrets = [] } = {}) {
  const channels = Object.fromEntries(["stdout", "stderr"].map(k => [k,
    { bytes: 0, text: "", decoder: new TextDecoder("utf-8", { fatal: true }) }]));
  let closed = false, failed;
  const fail = code => { failed ??= failure(code); throw failed; };
  return Object.freeze({
    write(channel, chunk) {
      if (failed) throw failed;
      if (closed) fail("hermes_quiet_closed");
      const c = Object.hasOwn(channels, channel) ? channels[channel] : null;
      if (!c || !Buffer.isBuffer(chunk)) fail("hermes_quiet_invalid");
      c.bytes += chunk.length;
      if (c.bytes > contract[`${channel}Bytes`]) fail("hermes_quiet_limit");
      try { c.text += c.decoder.decode(chunk, { stream: true }); }
      catch { fail("hermes_quiet_utf8_invalid"); }
    },
    complete(exitCode) {
      if (failed) throw failed;
      if (closed) fail("hermes_quiet_closed");
      closed = true;
      try { for (const c of Object.values(channels)) c.text += c.decoder.decode(); }
      catch { fail("hermes_quiet_utf8_invalid"); }
      try { guardHostContent({ stdout: channels.stdout.text, stderr: channels.stderr.text }, "required", secrets); }
      catch { fail("hermes_quiet_sensitive"); }
      if (exitCode === 130) fail("hermes_quiet_interrupted");
      if (exitCode !== 0) {
        const text = channels.stdout.text + "\n" + channels.stderr.text;
        const hint = /not authenticated|not logged in|credentials? (?:failed|missing|unavailable)|(?:login|log in|relogin|reauthentication) (?:required|again)|hermes (?:auth|login)|AuthError/i.test(text)
          ? "authentication_required_reported" : "unknown";
        failed = Object.assign(failure("hermes_quiet_process_failed"), { details: { providerDiagnostic: hint } });
        throw failed;
      }
      return Object.freeze({ finalResponse: channels.stdout.text, exitCode: 0,
        trust: "untrusted_process_output", outcome: "candidate_result", reviewRequired: true, usage: null,
        toolEventsAvailable: false, internalTurnCount: null, transportRetryCount: null });
    }
  });
}

// The existing native taskkill path cannot attest descendants after root exit,
// atomic ownership or kill-on-controller-death. Never promote its success.
export async function stopUnqualifiedHermesTree(child, { terminate = terminateWindowsProcessTree } = {}) {
  try { await terminate(child); } catch { /* keep the fixed no-proof diagnosis */ }
  throw Object.assign(failure("hermes_stop_recovery_unproven"), { leaseLost: true });
}

// Worker-internal seams below are only for synthetic tests, not provider config.
// This legacy raw-child collector has no job ownership. Production Hermes uses
// runHermesOwnedProcess; arbitrary spawned children still get no stop proof.
export async function collectHermesQuietProcess(child, { input, remainingMs, secrets = [],
  assertAuthority = () => {}, signal, shutdownRequested = () => false,
  stopOwnedTree = stopUnqualifiedHermesTree, pollMs = 50, stopTimeoutMs = 4000 } = {}) {
  if (usedChildren.has(child)) throw failure("hermes_quiet_reuse");
  usedChildren.add(child);
  const invalid = typeof input !== "string" || Buffer.byteLength(input) > 131072
      || !Number.isFinite(remainingMs) || remainingMs <= 0 || remainingMs > 3600000;
  const guard = createHermesQuietGuard({ secrets });
  let result, problem, timer, polling, settled = false;
  const listeners = [];
  const on = (emitter, event, fn) => { emitter.on(event, fn); listeners.push(() => emitter.off(event, fn)); };
  try {
    await new Promise(resolve => {
      const finish = error => { if (settled) return; settled = true; problem = error; resolve(); };
      const check = () => {
        try {
          if (invalid) throw failure("hermes_quiet_input_invalid");
          if (signal?.aborted) throw failure("hermes_quiet_cancelled");
          if (shutdownRequested()) throw failure("hermes_quiet_controller_shutdown");
          assertAuthority();
        } catch (error) { finish(error); }
      };
      for (const channel of ["stdout", "stderr"]) on(child[channel], "data", chunk => {
        if (settled) return;
        try { check(); if (!settled) guard.write(channel, chunk); } catch (error) { finish(error); }
      });
      on(child, "error", () => finish(failure("hermes_quiet_process_failed")));
      for (const channel of ["stdout", "stderr"]) on(child[channel], "error", () => finish(failure("hermes_quiet_stream_failed")));
      on(child.stdin, "error", () => finish(failure("hermes_quiet_stdin_failed")));
      on(child, "close", code => {
        if (settled) return;
        check(); if (settled) return;
        try { result = guard.complete(code); finish(); } catch (error) { finish(error); }
      });
      const abort = () => finish(failure("hermes_quiet_cancelled"));
      signal?.addEventListener("abort", abort, { once: true });
      listeners.push(() => signal?.removeEventListener("abort", abort));
      timer = setTimeout(() => finish(failure("hermes_quiet_timeout")), invalid ? 1 : remainingMs);
      polling = setInterval(check, pollMs);
      check();
      if (!settled) { try { child.stdin.end(input); } catch { finish(failure("hermes_quiet_stdin_failed")); } }
    });
  } finally {
    clearTimeout(timer); clearInterval(polling);
    // Keep error listeners while terminating so late pipe errors cannot escape.
    let stopTimer;
    try {
      const receipt = await Promise.race([Promise.resolve().then(() => stopOwnedTree(child)),
        new Promise((_, reject) => { stopTimer = setTimeout(() => reject(failure("hermes_stop_recovery_unproven")), stopTimeoutMs); })]);
      if (receipt?.scope !== "whole_owned_tree" || receipt?.remaining !== 0 || receipt?.enforced !== true)
        throw failure("hermes_stop_recovery_unproven");
    } catch { problem = Object.assign(failure("hermes_stop_recovery_unproven"), { leaseLost: true }); }
    finally { clearTimeout(stopTimer); listeners.forEach(remove => remove()); }
  }
  if (problem) throw problem;
  return result;
}
