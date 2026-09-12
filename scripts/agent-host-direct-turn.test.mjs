import test from "node:test";
import assert from "node:assert/strict";
import { createDirectTurnGuard, transportObservation } from "./lib/agent-host-direct-turn.mjs";
import { codexExecutionArgs } from "./lib/agent-host-model-policy.mjs";
import { validPacketFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput, consumeProviderInput } from "./lib/agent-host-provider-input.mjs";
import { createExecutionDuration } from "./lib/agent-host-execution-duration.mjs";
import { createExecutionLease } from "./lib/agent-host-execution-lease.mjs";

test("transport diagnostics cannot renew the attempt, sealed input, lease or deadline", async () => {
  const f = validPacketFixture(); let now = 0, expired = false;
  const duration = createExecutionDuration({ startedAt: f.claimed.startedAt, maxDurationSeconds: 60,
    onExpired() { expired = true; }, now: () => now, wallNow: () => Date.parse(f.claimed.startedAt), setTimer() {}, clearTimer() {} });
  const lease = createExecutionLease({ renew: async () => ({ leaseExpiresAt: new Date(Date.now() + 90000).toISOString() }),
    onLost() {}, now: () => now, setTimer() {}, clearTimer() {} });
  await lease.refresh();
  const options = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
    currentCommit: "a".repeat(40), assertAuthority() { duration.assertWithinBudget(); lease.assertValid(); } };
  const input = prepareProviderInput(options), snapshot = JSON.stringify(input), attempt = f.claimed.attempt;
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: input.revisions.packet, contextRevision: input.revisions.context };
  const transport = consumeProviderInput(input, options), turn = createDirectTurnGuard();
  turn.observe({ type: "turn.started" });
  const initialLease = lease.remainingMs;
  for (now = 10000; now <= 50000; now += 10000) {
    turn.observe({ type: "error", message: "Synthetic HTTP/SSE reconnect diagnostic", retry_count: 0 });
    assert.equal(duration.remainingMs, 55000 - now);
    assert.ok(lease.remainingMs <= initialLease - now);
    assert.equal(JSON.stringify(input), snapshot); assert.equal(transport.input, snapshot);
    assert.equal(f.claimed.attempt, attempt); assert.ok(Object.isFrozen(input));
    assert.deepEqual(transportObservation(), { transportRetryCount: null, partialUsageAccounting: "unknown" });
  }
  now = 55000;
  assert.throws(() => duration.assertWithinBudget(), /duration_exceeded/); assert.ok(expired);
  duration.stop(); lease.stop();
});

test("one successful turn reports only final accounting; no fabricated retry count", () => {
  const turn = createDirectTurnGuard(); turn.observe({ type: "turn.started" });
  turn.observe({ type: "error", message: "Synthetic reconnect" });
  turn.observe({ type: "turn.completed" });
  assert.deepEqual(turn.complete(0, true), { transportRetryCount: null, partialUsageAccounting: "unknown", usageAccounting: "reported_final_only" });
  const args = codexExecutionArgs({ model: "gpt-5.6-luna", reasoningEffort: "low" }, "read-only");
  assert.equal(args.filter(value => value === "exec").length, 1); assert.equal(args.at(-1), "-");
  assert.ok(args.includes('model_provider="openai"'));
  assert.equal(args.some(value => value.includes("model_providers.openai") || /resume|fallback|retry/.test(value)), false);
});

for (const scenario of ["failed", "secondTurn", "secondCompletion", "noStart", "noCompletion", "emptyResult", "nonzeroExit"]) {
  test(`terminal ${scenario} never authorizes retry, fallback or completion`, () => {
    const turn = createDirectTurnGuard();
    assert.throws(() => {
      if (scenario !== "noStart") turn.observe({ type: "turn.started" });
      if (scenario === "failed") turn.observe({ type: "turn.failed", error: { message: "Untrusted provider details" } });
      if (scenario === "secondTurn") turn.observe({ type: "turn.started" });
      if (scenario !== "noCompletion") turn.observe({ type: "turn.completed" });
      if (scenario === "secondCompletion") turn.observe({ type: "turn.completed" });
      turn.complete(scenario === "nonzeroExit" ? 1 : 0, scenario !== "emptyResult");
    }, error => error.providerFailure && error.retryable === false && error.details.transportRetryCount === null);
    assert.throws(() => turn.complete(0, true));
  });
}
