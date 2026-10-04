import assert from "node:assert/strict";
import test from "node:test";
import { retryContextRead } from "../modules/agent-runtime/context-read-retry";

test("a governed read retries an explicitly aborted source-fence conflict", async () => {
  let attempts = 0;
  const value = { selected: { decisionId: "current-workspace-decision" } };
  assert.equal(await retryContextRead(async () => ++attempts < 3
    ? { error: "task_ready_context_conflict" } : value), value);
  assert.equal(attempts, 3);
});

test("persistent contention remains an explicit failure after three reads", async () => {
  let attempts = 0;
  const value = { error: "task_ready_context_conflict" };
  assert.equal(await retryContextRead(async () => { attempts++; return value; }), value);
  assert.equal(attempts, 3);
});

test("stale authority, access denial and missing records never trigger a retry", async () => {
  for (const error of ["decision_stale", "decision_forbidden", "decision_not_found", "finding_context_invalid"]) {
    let attempts = 0;
    const value = { error };
    assert.equal(await retryContextRead(async () => { attempts++; return value; }), value);
    assert.equal(attempts, 1);
  }
});

test("uncertain transport errors are propagated without another invocation", async () => {
  let attempts = 0;
  const uncertain = new Error("transport_uncertain");
  await assert.rejects(retryContextRead(async () => { attempts++; throw uncertain; }), error => error === uncertain);
  assert.equal(attempts, 1);
});
