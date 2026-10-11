import assert from "node:assert/strict";
import test from "node:test";
import {
  createTaskProposalSchema, decideTaskProposalSchema, issueTaskProposalMandateSchema,
  taskPriorityForProposalBand, taskProposalFingerprint
} from "../modules/agent-runtime/task-proposal-contract";

const id = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const revision = "2026-10-11T14:00:00.000Z";
const create = {
  requestId: id, mandateId: otherId, sourceRecordId: id, expectedSourceRevision: revision,
  title: "Repair the broken review", outcome: "Owner can inspect the governed result",
  category: "defect", priorityBand: "blocked_core_flow", priorityRationale: "The main review is blocked"
};

test("fingerprint deduplicates wording variants under one approved source review", () => {
  const canonical = taskProposalFingerprint(id, otherId, "defect", "Repair the broken review", "Owner can inspect the governed result");
  assert.equal(canonical, taskProposalFingerprint(id, otherId, "defect", "  REPAIR  THE   BROKEN REVIEW ", "owner can inspect the governed result"));
  assert.equal(taskProposalFingerprint(id, otherId, "defect", "ＡＢＣ", "same outcome"),
    taskProposalFingerprint(id, otherId, "defect", "abc", "same outcome"));
  assert.match(canonical, /^[a-f0-9]{64}$/);
});

test("fingerprint separates a newly approved source review and distinct proposals", () => {
  const base = taskProposalFingerprint(id, id, "defect", "Observed issue", "Expected result");
  assert.notEqual(base, taskProposalFingerprint(otherId, id, "defect", "Observed issue", "Expected result"));
  assert.notEqual(base, taskProposalFingerprint(id, otherId, "defect", "Observed issue", "Expected result"));
  assert.notEqual(base, taskProposalFingerprint(id, id, "improvement", "Observed issue", "Expected result"));
  assert.notEqual(base, taskProposalFingerprint(id, id, "defect", "Observed issue", "Different result"));
});

test("company proposal bands map to priorities supported by the ordinary Task editor", () => {
  assert.deepEqual([
    "security_data_incident_outage", "blocked_core_flow", "wrong_result_action",
    "incomplete_flow_regression", "stability_debt", "approved_missing_feature", "cosmetic_optimization"
  ].map(taskPriorityForProposalBand),
  ["critical", "high", "high", "high", "normal", "normal", "low"]);
});

test("proposal input accepts only the bounded company source and priority vocabulary", () => {
  assert.equal(createTaskProposalSchema.safeParse(create).success, true);
  assert.equal(createTaskProposalSchema.safeParse({ ...create, applicationId: otherId }).success, false);
  assert.equal(createTaskProposalSchema.safeParse({ ...create, priorityBand: "urgent" }).success, false);
  assert.equal(createTaskProposalSchema.safeParse({ ...create, outcome: "password=fixture-secret" }).success, false);
  assert.equal(createTaskProposalSchema.safeParse({ ...create, expectedSourceRevision: "yesterday" }).success, false);
});

test("mandate and decision contracts reject client-chosen agent, owner and execution fields", () => {
  const mandate = { requestId: id, credentialId: otherId, sourceRecordId: id,
    expectedSourceRevision: revision, validUntil: "2026-10-11T15:00:00.000Z", reason: "One bounded company proposal" };
  assert.equal(issueTaskProposalMandateSchema.safeParse(mandate).success, true);
  assert.equal(issueTaskProposalMandateSchema.safeParse({ ...mandate, agentId: id }).success, false);
  const decision = { requestId: id, expectedVersion: "a".repeat(64), action: "accept", reason: "Sourced company work" };
  assert.equal(decideTaskProposalSchema.safeParse(decision).success, true);
  assert.equal(decideTaskProposalSchema.safeParse({ ...decision, assignedWorkforceEntityId: id }).success, false);
  assert.equal(decideTaskProposalSchema.safeParse({ ...decision, ready: true }).success, false);
});
