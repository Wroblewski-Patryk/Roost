import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as pause } from "node:timers/promises";
import { readFileSync } from "node:fs";
import { retryContextRead } from "../modules/agent-runtime/context-read-retry";

test("an aborted read gives competing work time to finish before its fresh snapshot", async () => {
  let busy = true;
  let attempts = 0;
  const competing = pause(50).then(() => { busy = false; });
  const result = await retryContextRead(async () => {
    attempts++;
    return busy ? { error: "task_ready_context_conflict" } : { selected: "current" };
  });
  await competing;
  assert.deepEqual(result, { selected: "current" });
  assert.equal(attempts, 2);
});

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

test("transaction codes alone do not prove rollback and never trigger a read retry", async () => {
  for (const value of [{ error: "P2034" }, { error: "40001" }, { error: "40P01" }, { error: "task_ready_context_conflict_unknown" }]) {
    let attempts = 0;
    assert.equal(await retryContextRead(async () => { attempts++; return value; }), value);
    assert.equal(attempts, 1);
  }
});

test("active execution context GET uses the same bounded aborted-read wrapper as Ready", () => {
  const source = readFileSync("src/modules/company-intelligence/company-intelligence.routes.ts", "utf8");
  const route = source.slice(source.indexOf('companyIntelligenceRouter.get("/tasks/:id/agent-context"'));
  assert.match(source, /import \{ retryContextRead \} from "\.\.\/agent-runtime\/context-read-retry"/);
  assert.match(route, /if \(execution && \["queued", "claimed", "running"\]\.includes\(execution\.status\)\)/);
  assert.match(route, /retryContextRead\(\(\) => readyTransaction\(tx => inspectReady\(tx, workspaceId, taskId, execution\)\)\)/);
  assert.match(route, /where: \{ id: executionId, taskId, workspaceId \}/);
  assert.match(route, /if \("error" in ready && ready\.error\) return res\.status\(409\)\.json\(\{ error: ready\.error \}\)/);
  assert.match(route, /const context = await loadTaskAgentContext\(workspaceId, taskId, execution\)/);
  assert.equal((route.match(/retryContextRead\(/g) ?? []).length, 1);
  assert.ok(!/\.post\(|submitReady\(|updateMany\(|\.update\(/.test(route));
});
