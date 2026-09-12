// This validates the existing CLI event stream; it does not retry or schedule work.
// Codex owns bounded HTTP/SSE retries within one process and logical turn.
/** @typedef {{ transportRetryCount: null, partialUsageAccounting: 'unknown' }} TransportObservation */
export function transportObservation() {
  // exec JSONL exposes no authoritative transport retry counter. A diagnostic
  // string, final usage or absence of errors cannot establish zero retries.
  return { transportRetryCount: null, partialUsageAccounting: "unknown" };
}

export function createDirectTurnGuard() {
  let starts = 0, completions = 0, failure;
  function fail(reason, code = "codex_turn_invalid") {
    failure ??= Object.assign(new Error(code), { providerFailure: true, retryable: false,
      publicMessage: "Direct Codex did not deliver one complete turn. Reconcile this attempt; no automatic retry or fallback is permitted.",
      details: { reason, ...transportObservation() } });
    throw failure;
  }
  return {
    observe(event) {
      if (failure) throw failure;
      if (event.type === "turn.failed") fail("terminal_failure", "codex_turn_failed");
      if (event.type === "turn.started" && (++starts !== 1 || completions)) fail("multiple_turns");
      if (event.type === "turn.completed" && (++completions !== 1 || starts !== 1)) fail("invalid_completion");
      // Nonterminal error/reconnection diagnostics grant no authority, usage,
      // new attempt, deadline extension or application-level retry.
    },
    complete(exitCode, hasFinalResponse) {
      if (failure) throw failure;
      if (exitCode !== 0) fail("process_exit", "codex_process_failed");
      if (starts !== 1 || completions !== 1 || !hasFinalResponse) fail("incomplete_result");
      return { ...transportObservation(), usageAccounting: "reported_final_only" };
    }
  };
}
