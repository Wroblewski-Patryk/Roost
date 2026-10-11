import assert from "node:assert/strict";
import test from "node:test";
import { postAuthDestination, taskWorkPath } from "../auth/task-scope-navigation";
import { scopedReviewCommand, type ScopedReview, type ScopedReviewDraft } from "./task-work-model";

const taskId = "11111111-1111-4111-8111-111111111111";
const review: ScopedReview = {
  task: { id: taskId, title: "Exact task" }, canReview: true, expectedVersion: "ready-v2", materialVersion: "material-v3", informationTask: false,
  approvalCommit: "a".repeat(40), result: { executionId: "22222222-2222-4222-8222-222222222222" }
};
const draft: ScopedReviewDraft = {
  decision: "approve", summary: "Independent check passed", reference: "test receipt 4", testResult: "pass",
  reproduction: "", expected: "", observed: "", scope: "", excluded: "", outcome: "", competencies: ""
};

test("scoped login and invitation land on the exact task instead of a pending workspace route", () => {
  assert.equal(postAuthDestination(taskId, "/areas?area=04-operacje&view=tasks"), taskWorkPath(taskId));
  assert.equal(postAuthDestination(null, "/areas?area=04-operacje&view=tasks"), "/areas?area=04-operacje&view=tasks");
});

test("independent approval carries the exact execution, material, optimistic version and attested commit", () => {
  assert.deepEqual(scopedReviewCommand(review, draft, "33333333-3333-4333-8333-333333333333"), {
    requestId: "33333333-3333-4333-8333-333333333333", expectedVersion: "ready-v2", executionId: review.result?.executionId,
    materialVersion: "material-v3", decision: "approve", summary: "Independent check passed",
    evidence: [{ kind: "test", reference: "test receipt 4", result: "pass", verdict: "pass" }], reviewedCommit: "a".repeat(40)
  });
  assert.throws(() => scopedReviewCommand({ ...review, approvalCommit: null }, draft, "request"), /approval_proof_missing/);
  assert.throws(() => scopedReviewCommand({ ...review, canReview: false }, draft, "request"), /review_unavailable/);
});

test("independent rejection preserves bounded correction evidence without an owner disposition", () => {
  const input = scopedReviewCommand(review, { ...draft, decision: "reject", reproduction: " first step \n\n second step ", expected: "works", observed: "fails",
    scope: " first fix \n second fix ", excluded: " unrelated change ", outcome: "reproduced fix", competencies: "typescript\nsecurity" }, "request");
  assert.deepEqual(input, {
    requestId: "request", expectedVersion: "ready-v2", executionId: review.result?.executionId,
    materialVersion: "material-v3", decision: "reject", summary: "Independent check passed",
    evidence: [{ kind: "test", reference: "test receipt 4", result: "pass" }], reproduction: ["first step", "second step"],
    expected: "works", observed: "fails", correction: { scope: ["first fix", "second fix"], excluded: ["unrelated change"], outcome: "reproduced fix", competencies: ["typescript", "security"] }
  });
  assert.equal("action" in input, false);
  assert.equal("specialist" in input, false);
});
