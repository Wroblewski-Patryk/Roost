import assert from "node:assert/strict";
import test from "node:test";
import { createCodexOutputBudget, createObservedOutputBudget } from "./lib/agent-host-output-budget.mjs";

for (const value of [undefined, null, 0, -1, 127, 100001, 128.5, Infinity, NaN, "SYNTHETIC_SECRET", Number.MAX_SAFE_INTEGER]) {
  test(`invalid output budget fails closed: ${String(value)}`, () => {
    let stops = 0;
    const budget = createCodexOutputBudget({ maxOutputTokens: value, onStopped: () => stops++ });
    assert.throws(() => budget.assertWithinBudget(), { message: "agent_execution_output_budget_invalid" });
    budget.rejectUnsupported();
    assert.equal(stops, 1);
    assert.equal(JSON.stringify(budget.failure).includes("SYNTHETIC_SECRET"), false);
  });
}
for (const value of [128, 1000, 100000]) test(`valid ${value} stays blocked without an enforcing runner`, () => {
  let stops = 0;
  const budget = createCodexOutputBudget({ maxOutputTokens: value, onStopped: () => stops++, enforcement: "supported", allowUnbounded: true });
  assert.throws(() => budget.assertWithinBudget(), { message: "agent_execution_output_budget_unsupported" });
  assert.throws(() => budget.observeUsage({ output_tokens: 0 }), { message: "agent_execution_output_budget_unsupported" });
  assert.equal(stops, 1);
});
test("synthetic usage accumulates across turns, stops once and rejects late success", () => {
  let stops = 0;
  const budget = createObservedOutputBudget({ maxOutputTokens: 128, onStopped: () => stops++ });
  budget.observeUsage({ output_tokens: 60, input_tokens: 999999 });
  budget.observeUsage({ output_tokens: 40, reasoning_output_tokens: 10 });
  budget.assertWithinBudget(); assert.equal(budget.observedOutputTokens, 110);
  assert.throws(() => budget.observeUsage({ output_tokens: 18 }), { message: "agent_execution_output_budget_exceeded" });
  assert.throws(() => budget.assertWithinBudget(), { message: "agent_execution_output_budget_exceeded" });
  assert.throws(() => budget.observeUsage({ output_tokens: 0 }), { message: "agent_execution_output_budget_exceeded" });
  budget.rejectUnsupported(); assert.equal(stops, 1); assert.equal(budget.failure.retryable, false);
});
for (const usage of [{}, { output_tokens: -1 }, { output_tokens: 1.2 }, { output_tokens: "SYNTHETIC_SECRET" }, { output_tokens: Number.MAX_SAFE_INTEGER, reasoning_output_tokens: 1 }]) test("invalid usage cannot buy a new pool", () => {
  let stops = 0;
  const budget = createObservedOutputBudget({ maxOutputTokens: 128, onStopped: () => stops++ });
  budget.observeUsage({ output_tokens: 20 });
  assert.throws(() => budget.observeUsage(usage), { message: "agent_execution_output_budget_invalid" });
  assert.equal(stops, 1); assert.equal(budget.observedOutputTokens, 20);
  assert.equal(JSON.stringify(budget.failure).includes("SYNTHETIC_SECRET"), false);
});
