import { performance } from "node:perf_hooks";

// Leave room for the existing bounded Windows process-tree termination.
export const durationStopMarginMs = 5_000;

export function createExecutionDuration({ startedAt, maxDurationSeconds, onExpired,
  now = () => performance.now(), wallNow = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const started = typeof startedAt === "string" ? Date.parse(startedAt) : NaN;
  const initialWall = wallNow(), initialMonotonic = now();
  const limitMs = maxDurationSeconds * 1000 - durationStopMarginMs;
  let elapsed = initialWall - started;
  let failure, timer, disposed = false;
  const waiters = new Set();

  function expire(code = "agent_execution_duration_exceeded") {
    if (failure || disposed) return;
    failure = Object.assign(new Error(code), { durationLimit: true, retryable: false,
      publicMessage: code === "agent_execution_duration_exceeded"
        ? "Execution time budget exhausted. Work stopped; independently review the plan and approve a new budget before another execution."
        : "Execution start time or duration budget is invalid. Correct the execution context and synchronize the host clock before retrying.",
      details: { maxDurationSeconds: Number.isInteger(maxDurationSeconds) ? maxDurationSeconds : null, stopMarginSeconds: durationStopMarginMs / 1000 } });
    clearTimer(timer);
    for (const reject of waiters) reject(failure);
    waiters.clear();
    onExpired(failure);
  }

  function assertWithinBudget() {
    if (!failure && !disposed) {
      // A clock adjustment cannot buy extra time during this host process.
      elapsed = Math.max(elapsed, wallNow() - started, initialWall - started + now() - initialMonotonic);
      if (elapsed >= limitMs) expire();
    }
    if (failure) throw failure;
    if (disposed) throw new Error("agent_execution_duration_disposed");
  }

  if (!Number.isFinite(started) || !Number.isInteger(maxDurationSeconds) || maxDurationSeconds < 60 || maxDurationSeconds > 3600 || elapsed < 0) {
    expire("agent_execution_duration_context_invalid");
  } else if (elapsed >= limitMs) expire();
  else timer = setTimer(() => expire(), limitMs - elapsed);

  return {
    assertWithinBudget,
    get remainingMs() { assertWithinBudget(); return Math.max(0, limitMs - elapsed); },
    async wait(operation) {
      // Observe rejection even when admission has already failed.
      const result = Promise.resolve(operation);
      void result.catch(() => undefined);
      assertWithinBudget();
      return new Promise((resolve, reject) => {
        waiters.add(reject);
        result.then((value) => {
          waiters.delete(reject);
          try { assertWithinBudget(); resolve(value); } catch (error) { reject(error); }
        }, (error) => { waiters.delete(reject); reject(error); });
      });
    },
    get failure() { return failure; },
    stop() { disposed = true; clearTimer(timer); }
  };
}
