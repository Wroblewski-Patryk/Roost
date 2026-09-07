import assert from "node:assert/strict";
import test from "node:test";
import { contextStopError } from "./lib/agent-host-context-stop.mjs";
import { createExecutionLease } from "./lib/agent-host-execution-lease.mjs";
import { classifyRecovery } from "./lib/agent-host-recovery.mjs";

test("context invalidation is terminal, distinct, and stops once despite duplicate and late renewals", async () => {
  let stopped = 0, resolveRenewal;
  let renew = async () => ({ leaseExpiresAt: new Date(Date.now() + 90_000).toISOString() });
  const lease = createExecutionLease({ renew: () => renew(), onLost: () => stopped++, setTimer: () => 1, clearTimer: () => {} });
  await lease.refresh(); lease.assertValid();
  renew = () => new Promise(resolve => { resolveRenewal = resolve; });
  const late = lease.refresh();
  lease.reject(contextStopError()); lease.reject(contextStopError());
  resolveRenewal({ leaseExpiresAt: new Date(Date.now() + 90_000).toISOString() });
  await late;
  await lease.refresh();
  assert.equal(stopped, 1);
  assert.equal(lease.failure.contextStop, true); assert.equal(lease.failure.retryable, false);
  assert.throws(() => lease.assertValid(), /agent_execution_context_invalidated/);
  lease.stop();
});

test("heartbeat context refusal stops work even without runner output", async () => {
  let stopped = 0;
  const lease = createExecutionLease({ renew: async () => { throw contextStopError(); }, onLost: () => stopped++, setTimer: () => 1, clearTimer: () => {} });
  await lease.refresh();
  assert.equal(stopped, 1); assert.equal(lease.failure.contextStop, true);
  lease.stop();
});

for (const stage of ["claimed", "prepared", "running", "effect_possible"]) {
  test(`context-fenced ${stage} cannot recover even with a valid renewed-looking lease`, () => {
    const execution = { contextInvalidatedAt: new Date().toISOString(), leaseExpiresAt: new Date(Date.now() + 90_000).toISOString(), checkpointVersion: 1,
      checkpoint: { schemaVersion: "roost-recovery-v1", stage, packetRevision: null, workspaceDigest: null } };
    assert.throws(() => classifyRecovery(execution, true), error => error.recoveryReason === "context_changed");
  });
}
