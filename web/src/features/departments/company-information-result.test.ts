import assert from "node:assert/strict";
import test from "node:test";
import { continuationState, informationCommand, informationResultStatus, informationStartAllowed, usageMeasures, type ContinuationPacket } from "./company-information-result";

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

test("a spent information attempt cannot start again until its current continuation is approved", () => {
  assert.equal(informationStartAllowed("failed", "attempt-1", null), false);
  assert.equal(informationStartAllowed("stopped", "attempt-1", "attempt-0"), false);
  assert.equal(informationStartAllowed("failed", "attempt-1", "attempt-1"), true);
  assert.equal(informationStartAllowed("running", "attempt-1", "attempt-1"), false);
  assert.equal(informationStartAllowed("completed", "attempt-1", "attempt-1", "accept"), false);
  assert.equal(informationStartAllowed("completed", "attempt-1", "attempt-1", "reject"), false);
  assert.equal(informationStartAllowed("completed", "attempt-1", null, "return"), false);
  assert.equal(informationStartAllowed("completed", "attempt-1", "attempt-1", "return"), true);
});

test("continuation approval requires a matching latest attempt and a fresh Ready pin", () => {
  const packet: ContinuationPacket = {
    previousExecution: { id: "attempt-2", status: "failed", attempt: 2, completedAt: null, usage: {}, errorState: null, checkpoint: null, checkpointVersion: null },
    eligible: true, reason: null, readyPinId: "fresh-pin", readyRevision: "a".repeat(64), continuation: null
  };
  assert.equal(continuationState(packet, "attempt-1"), "earlier");
  assert.equal(continuationState(packet, "attempt-2"), "eligible");
  assert.equal(continuationState({ ...packet, readyPinId: null }, "attempt-2"), "blocked");
  assert.equal(continuationState({ ...packet, eligible: false }, "attempt-2"), "blocked");
  assert.equal(continuationState({ ...packet, continuation: { eventId: "approval", previousExecutionId: "attempt-2", approvedAt: "2026-10-11T00:00:00Z", approvedByUserId: "owner" } }, "attempt-2"), "approved");
});

test("empty or unreported usage stays unknown while measured numeric fields remain visible", () => {
  assert.deepEqual(usageMeasures({}), []);
  assert.deepEqual(usageMeasures({ providerUsage: "unknown", tokenIntent: null }), []);
  assert.deepEqual(usageMeasures({ provider: { inputTokens: 42, outputTokens: 0 }, ignored: "42" }), [["provider.inputTokens", 42], ["provider.outputTokens", 0]]);
});
