// A terminal authority fence for this attempt, not a transient lease failure.
export function contextStopError() {
  return Object.assign(new Error("agent_execution_context_invalidated"), {
    contextStop: true, leaseLost: true, retryable: false,
    publicMessage: "Accepted context changed. Work stopped; owner review and a new acceptance are required."
  });
}
