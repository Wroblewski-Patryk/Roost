import assert from "node:assert/strict";
import test from "node:test";
import { createExecutionDuration } from "./lib/agent-host-execution-duration.mjs";

const epoch = 1_800_000_000_000;
function harness({ elapsed = 0, seconds = 60, startedAt = new Date(epoch - elapsed).toISOString() } = {}) {
  let monotonic = 0, wall = epoch, id = 0;
  const timers = new Map(), failures = [];
  const duration = createExecutionDuration({ startedAt, maxDurationSeconds: seconds,
    now: () => monotonic, wallNow: () => wall, onExpired: (error) => failures.push(error),
    setTimer: (callback, ms) => { timers.set(++id, { callback, ms }); return id; }, clearTimer: (key) => timers.delete(key) });
  return { duration, timers, failures, time(ms, wallMs = ms) { monotonic = ms; wall = epoch + wallMs; },
    fire() { for (const timer of [...timers.values()]) timer.callback(); } };
}

test("duration uses remaining execution time and reserves five seconds for tree termination", () => {
  const h = harness({ elapsed: 20_000 });
  assert.equal([...h.timers.values()][0].ms, 35_000);
  h.time(34_999); h.duration.assertWithinBudget();
  h.time(35_000); assert.throws(() => h.duration.assertWithinBudget(), /duration_exceeded/);
  assert.equal(h.failures[0].retryable, false); assert.equal(h.timers.size, 0);
});
test("pre-spawn recovery does not reset consumed time", () => {
  const first = harness({ elapsed: 30_000 }), resumed = harness({ elapsed: 54_000 });
  assert.equal([...first.timers.values()][0].ms, 25_000);
  assert.equal([...resumed.timers.values()][0].ms, 1_000);
  first.duration.stop(); resumed.duration.stop();
});
test("already exhausted execution fails immediately without arming a timer", () => {
  const h = harness({ elapsed: 60_000 });
  assert.throws(() => h.duration.assertWithinBudget(), /duration_exceeded/);
  assert.equal(h.failures.length, 1); assert.equal(h.timers.size, 0);
});
for (const startedAt of [undefined, "SYNTHETIC_SECRET_INVALID_TIME", new Date(epoch + 1000).toISOString()]) {
  test(`missing, invalid or future start fails closed: ${String(startedAt)}`, () => {
    const failures = [];
    const duration = createExecutionDuration({ startedAt, maxDurationSeconds: 60, wallNow: () => epoch, onExpired: (e) => failures.push(e) });
    assert.throws(() => duration.assertWithinBudget(), /duration_context_invalid/);
    assert.equal(JSON.stringify(failures).includes("SYNTHETIC_SECRET"), false);
    assert.equal(failures[0].retryable, false);
  });
}
test("invalid duration cannot become an unlimited run", () => {
  for (const seconds of [undefined, NaN, 0, 59, 3601, Infinity]) {
    const duration = createExecutionDuration({ startedAt: new Date(epoch).toISOString(), maxDurationSeconds: seconds, wallNow: () => epoch, onExpired: () => {} });
    assert.throws(() => duration.assertWithinBudget(), /duration_context_invalid/);
  }
});
test("timer interrupts a hung operation without depending on heartbeat or output", async () => {
  const h = harness();
  const waiting = h.duration.wait(new Promise(() => {}));
  h.fire();
  await assert.rejects(waiting, /duration_exceeded/);
  h.fire(); assert.equal(h.failures.length, 1);
});
test("late operation result cannot bypass expiry even if timer delivery is delayed", async () => {
  const h = harness(); let resolve;
  const waiting = h.duration.wait(new Promise((done) => { resolve = done; }));
  h.time(55_000); resolve("success");
  await assert.rejects(waiting, /duration_exceeded/);
});
test("wall clock rollback cannot extend the monotonic deadline; forward movement is conservative", () => {
  const h = harness(); h.time(55_000, -100_000);
  assert.throws(() => h.duration.assertWithinBudget(), /duration_exceeded/);
  const forward = harness(); forward.time(1, 60_000);
  assert.throws(() => forward.duration.assertWithinBudget(), /duration_exceeded/);
});
test("successful completion and cleanup dispose timer without later expiry", async () => {
  const h = harness(); assert.equal(await h.duration.wait(Promise.resolve("done")), "done");
  const callback = [...h.timers.values()][0].callback;
  h.duration.stop(); callback();
  assert.equal(h.timers.size, 0); assert.equal(h.failures.length, 0);
  assert.throws(() => h.duration.assertWithinBudget(), /duration_disposed/);
});
