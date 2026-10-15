import assert from "node:assert/strict";
import test from "node:test";
import { decisionHistoryReason } from "./decision-list-scope";

test("Decision history follows terminal state and accepted successors, not a pending replacement", () => {
  const reason = (status: string, governanceState: string | null = null, acceptedSuccessor = false) =>
    decisionHistoryReason({ status, governanceState, acceptedSuccessor });
  assert.equal(reason("proposed", "pending"), null);
  assert.equal(reason("proposed", "deferred"), null);
  assert.equal(reason("accepted", "accepted"), null);
  assert.equal(reason("accepted", "accepted", true), "superseded");
  assert.equal(reason("proposed", "withdrawn"), "withdrawn");
  assert.equal(reason("archived"), "archived");
  assert.equal(reason("superseded"), "superseded");
  assert.equal(reason("rejected"), "rejected");
});
