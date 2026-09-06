import assert from "node:assert/strict";
import test from "node:test";
import { validPacketFixture, sealPacket } from "./fixtures/execution-packet.mjs";
import { executionContextRevision, assertFreshExecutionContext, fetchExecutionContext } from "./lib/agent-host-execution-context.mjs";

const revision = (f) => executionContextRevision(f.taskContext, f.applicationContext);
test("only envelope generatedAt and object member order are ignored", () => {
  const f = validPacketFixture(), before = revision(f);
  f.taskContext.generatedAt = "new response"; f.applicationContext.generatedAt = "new response";
  f.taskContext.task = Object.fromEntries(Object.entries(f.taskContext.task).reverse());
  assert.equal(revision(f), before);
  assert.equal(assertFreshExecutionContext(before, f, f.claimed), f);
  f.taskContext.task.generatedAt = "material nested value";
  assert.notEqual(revision(f), before);
});
for (const [name, mutate] of Object.entries({
  task: (f) => { f.taskContext.task.description = "Changed task"; },
  goal: (f) => { f.taskContext.task.goal.description = "Changed goal"; },
  application: (f) => { f.applicationContext.application.description = "Changed app"; },
  policy: (f) => { f.taskContext.policies = [{ instruction: "New approval requirement" }]; },
  evidence: (f) => { f.applicationContext.genericEvidence = [{ verificationStatus: "rejected" }]; },
  model: (f) => { f.packet.contract.modelSelection.model = "gpt-6-astra"; sealPacket(f.packet); }
})) test(`valid but changed ${name} requires replanning`, () => {
  const f = validPacketFixture(), before = revision(f); mutate(f);
  assert.throws(() => assertFreshExecutionContext(before, f, f.claimed), (e) => e.message === "agent_execution_context_changed" && e.retryable === false && e.details.preparedRevision === before && /^[a-f0-9]{64}$/.test(e.details.observedRevision));
});
test("revoked access and malformed fresh packets fail closed without echoing content", () => {
  const f = validPacketFixture(), before = revision(f);
  f.taskContext.task.assignedWorkforceEntity.authorityScope = ["SYNTHETIC_SECRET"];
  assert.throws(() => assertFreshExecutionContext(before, f, f.claimed), (e) => e.message === "agent_execution_context_invalid" && !JSON.stringify(e).includes("SYNTHETIC_SECRET") && e.details.packetIssues.some((issue) => issue.field === "contract.access.permissions"));
  assert.throws(() => assertFreshExecutionContext(before, {}, f.claimed), /context_invalid/);
});
test("fresh retrieval uses existing scoped endpoints and derives application query from fresh task", async () => {
  const f = validPacketFixture(), calls = [];
  f.taskContext.task.title = "Fresh authoritative task";
  const result = await fetchExecutionContext(async (route, options) => { calls.push({ route, options }); return calls.length === 1 ? f.taskContext : f.applicationContext; }, f.claimed);
  assert.equal(result.taskContext, f.taskContext); assert.equal(calls.length, 2);
  assert.ok(calls[0].route.includes(`executionId=${f.claimed.id}`));
  assert.ok(calls[1].options.headers["X-Roost-Agent-Context-Query"].includes("Fresh authoritative task"));
  assert.ok(calls.every((c) => c.options.cache === "no-store" && c.options.headers["Cache-Control"] === "no-cache"));
});
test("refresh failures retain only fixed diagnostics and authority rejection status", async () => {
  const f = validPacketFixture();
  for (const status of [401, 403, 503, undefined]) await assert.rejects(fetchExecutionContext(async () => { throw Object.assign(new Error("SYNTHETIC_SECRET"), { status, body: "SYNTHETIC_SECRET" }); }, f.claimed),
    (e) => e.message === "agent_execution_context_unavailable" && e.retryable === false && !JSON.stringify(e).includes("SYNTHETIC_SECRET") && e.status === ([401, 403].includes(status) ? status : undefined));
});
