import assert from "node:assert/strict";
import test from "node:test";
import ready from "./lib/agent-host-ready-context.cjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";

const check = f => ready.assertReadyContext(f.taskContext, f.applicationContext, f.claimed);
test("Ready accepts only the validated revision bound to this execution", () => check(validPacketFixture()));
for (const [name, change] of Object.entries({
  missing: f => delete f.taskContext.readyAdmission,
  legacy: f => delete f.claimed.metadata.readyContextPin,
  differentPin: f => f.claimed.metadata.readyContextPin.pinId = "another-acceptance",
  missingProof: f => delete f.taskContext.readyAdmission.validationRevision,
  differentProof: f => f.taskContext.readyAdmission.validationRevision = "0".repeat(64),
  invalidated: f => f.taskContext.readyAdmission.status = "needs_revalidation",
  task: f => f.taskContext.task.description = "SYNTHETIC_SECRET_CHANGED_INTENT",
  goal: f => f.taskContext.task.goal.description = "Changed goal",
  assignment: f => f.taskContext.task.assignedWorkforceEntity.role = "reviewer",
  access: f => f.taskContext.task.assignedWorkforceEntity.authorityScope = [],
  scope: f => f.packet.contract.scope.allowed.push("A new deliverable"),
  source: f => f.packet.sources[0].description = "Changed canonical context",
  procedure: f => f.taskContext.procedures.push({ id: "procedure", version: 2 }),
  dependency: f => f.taskContext.dependencies.push({ id: "dependency", status: "blocked" }),
  application: f => f.applicationContext.application.description = "Changed product",
  prompt: f => f.claimed.prompt = "Changed owner instruction",
  baseBranch: f => f.claimed.baseBranch = "other-branch",
  terminalTask: f => f.taskContext.task.status = "done",
})) test(`Ready rejects ${name} without disclosing context`, () => {
  const f = validPacketFixture(); change(f);
  assert.throws(() => check(f), error => {
    assert.equal(error.message, "agent_ready_context_revalidation_required");
    assert.equal(error.retryable, false);
    assert.equal(JSON.stringify(error).includes("SYNTHETIC_SECRET"), false);
    return true;
  });
});
test("transport, claim bookkeeping and unordered entity collections preserve Ready", () => {
  const f = validPacketFixture(); f.taskContext.task.status = "todo";
  f.applicationContext.operatingModel.projects.push({ projectId: "unrelated", id: "b" });
  f.taskContext.relatedRecords = [{ id: "a", title: "A" }, { id: "b", title: "B" }];
  pinReadyFixture(f);
  const query = ready.readyContextQuery(f.taskContext.task, null);
  f.taskContext.generatedAt = new Date().toISOString(); f.applicationContext.generatedAt = "new transport time";
  f.taskContext.task.updatedAt = new Date().toISOString(); f.taskContext.task.status = "in_progress";
  f.taskContext.task.executionReadiness = { revision: "bookkeeping" };
  f.taskContext.relatedRecords.reverse();
  f.packet.identity.executionId = "new execution envelope"; f.packet.taskRevision = "new transport revision";
  f.packet.revision = "envelope-only";
  check(f);
  assert.equal(ready.readyContextQuery(f.taskContext.task, null), query);
});
test("other entity revisions remain material even when their content is unchanged", () => {
  const f = validPacketFixture(); f.taskContext.task.goal.updatedAt = "new canonical revision";
  assert.throws(() => check(f));
});
