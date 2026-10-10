import assert from "node:assert/strict";
import test from "node:test";
import { informationCommand, informationResultStatus } from "./company-information-result";

test("ambiguous review delivery retains the command identity for exactly the same material and decision", () => {
  const input = { executionId: "execution", materialVersion: "revision-1", decision: "return", summary: "Please cite the source." };
  const first = informationCommand(null, input);
  assert.match(first.requestId, /^[a-f0-9-]{36}$/);
  assert.equal(informationCommand(first, { ...input }), first);
  assert.notEqual(informationCommand(first, { ...input, materialVersion: "revision-2" }).requestId, first.requestId);
  assert.notEqual(informationCommand(first, { ...input, decision: "accept" }).requestId, first.requestId);
});

test("result status never turns an unknown or interrupted status into success", () => {
  assert.equal(informationResultStatus("queued"), "pending");
  assert.equal(informationResultStatus("RUNNING"), "running");
  assert.equal(informationResultStatus("completed"), "completed");
  assert.equal(informationResultStatus("failed"), "failed");
  assert.equal(informationResultStatus("cancelled"), "stopped");
  assert.equal(informationResultStatus("budget_exhausted"), "stopped");
  assert.equal(informationResultStatus("UNTRUSTED_PROVIDER_MESSAGE"), "empty");
});
