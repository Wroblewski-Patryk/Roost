import assert from "node:assert/strict";
import test from "node:test";
import { validPacketFixture, sealPacket } from "./fixtures/execution-packet.mjs";
import { validateExecutionPacket } from "./lib/agent-host-execution-packet.mjs";
import { singleTaskIdentity, assertTaskBranch, readCurrentTaskBranch } from "./lib/agent-host-single-task.mjs";

const validate = f => validateExecutionPacket(sealPacket(f.packet), f.claimed, f.taskContext, f.applicationContext);
test("branch admission reads the real checkout and refuses a different task branch", async () => {
  const current = await readCurrentTaskBranch(process.cwd());
  assertTaskBranch(current, current);
  assert.throws(() => assertTaskBranch(current, "codex/task-synthetic-other"), e => e.message === "agent_task_branch_mismatch" && e.retryable === false);
});
test("single scope identity and branch are deterministic across attempts", () => {
  const f = validPacketFixture(); validate(f);
  assert.deepEqual(singleTaskIdentity(f.claimed.taskId), { contractId: f.packet.contract.singleTask.contractId, branch: f.packet.contract.singleTask.branch });
  f.claimed.attempt = 2; f.packet.contract.budgets.maxAttempts = 2; validate(f);
});
for (const [name, change] of Object.entries({
  missing: f => delete f.packet.contract.singleTask,
  application: f => f.packet.contract.singleTask.applicationId = f.claimed.id,
  component: f => f.packet.scopeAuthorities.component.applicationId = f.claimed.id,
  componentRevision: f => f.packet.scopeAuthorities.component.revision = "changed",
  managerWorkspace: f => f.packet.scopeAuthorities.manager.workspaceId = f.claimed.id,
  managerInactive: f => f.packet.scopeAuthorities.manager.status = "inactive",
  managerRevision: f => f.packet.scopeAuthorities.manager.revision = "changed",
  identity: f => f.packet.contract.singleTask.contractId = "other",
  branch: f => f.packet.contract.singleTask.branch = "main",
  listOutcome: f => f.packet.contract.objective.outcome = "Fix login; repair billing",
  compoundEnglish: f => f.packet.contract.singleTask.problems[0].statement = "Fix login and add billing",
  compoundPolish: f => f.packet.contract.singleTask.problems[0].statement = "Napraw logowanie oraz dodaj płatności",
  secondOutcome: f => f.packet.contract.singleTask.problems.push({ ...f.packet.contract.singleTask.problems[0], statement: "Other failure", outcome: "Ship unrelated feature" }),
  secondComponent: f => f.packet.contract.singleTask.problems.push({ ...f.packet.contract.singleTask.problems[0], statement: "Other failure", componentId: f.claimed.id }),
  noMeasurement: f => delete f.packet.contract.singleTask.measurement,
  nonnumericTarget: f => f.packet.contract.singleTask.measurement.target = "works",
  falseException: f => f.packet.contract.singleTask.commonCause = { mechanism: "One cause", inseparability: "Trust me", evidence: f.packet.contract.context.technical[0] },
  bag: f => f.packet.contract.singleTask.problems = Array.from({ length: 4 }, (_, i) => ({ ...f.packet.contract.singleTask.problems[0], statement: `Failure ${i}` }))
})) test(`single scope rejects ${name}`, () => {
  const f = validPacketFixture(); change(f);
  assert.throws(() => validate(f), e => e.message === "execution_packet_invalid" && e.retryable === false && e.details.issues.some(i => i.field.startsWith("contract.singleTask")));
});
test("common-cause exception requires per-symptom links and a current technical source", () => {
  const f = validPacketFixture(), s = f.packet.contract.singleTask;
  s.problems[0].causalLink = "The parser drops the shared required input token";
  s.problems.push({ ...s.problems[0], statement: "The same input is rejected during preview", causalLink: "The preview calls the same defective parser path" });
  assert.throws(() => validate(f));
  s.commonCause = { mechanism: "One parser drops the required input token", inseparability: "Both paths use the same parser; one correction must cover both observations", evidence: { ...f.packet.contract.context.technical[0] } };
  validate(f);
  s.commonCause.evidence.revision = "stale"; assert.throws(() => validate(f));
});
