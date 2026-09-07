import { executionContractSchema } from "./agent-host-execution-packet.mjs";

const limitSchema = executionContractSchema.shape.budgets.shape.maxOutputTokens;

// Post-turn accounting is containment only: a provider can overshoot before it
// emits usage. This guard is exercised with synthetic runners, never selected
// by the production Codex CLI launcher as a substitute for a hard provider cap.
export function createObservedOutputBudget({ maxOutputTokens, onStopped }) {
  const parsed = limitSchema.safeParse(maxOutputTokens);
  let failure, observedOutputTokens = 0;
  function fail(code) {
    if (failure) return;
    const messages = {
      agent_execution_output_budget_invalid: "Output token budget or usage is invalid. Work stopped; review the accepted contract before another execution.",
      agent_execution_output_budget_exceeded: "Output token budget exhausted. Work stopped; independently review the plan and approve a new budget before another execution.",
      agent_execution_output_budget_unsupported: "This Codex runner cannot guarantee the accepted output token limit. No supervised execution is permitted until an enforcing runner is approved."
    };
    failure = Object.assign(new Error(code), { outputLimit: true, retryable: false,
      publicMessage: messages[code], details: { maxOutputTokens: parsed.success ? parsed.data : null,
        observedOutputTokens, enforcement: code === "agent_execution_output_budget_unsupported" ? "unavailable" : "post_turn_containment" } });
    onStopped(failure);
  }
  if (!parsed.success) fail("agent_execution_output_budget_invalid");
  function assertWithinBudget() { if (failure) throw failure; }
  return {
    assertWithinBudget,
    observeUsage(usage) {
      assertWithinBudget();
      // Count both reported fields conservatively. Do not infer usage from text,
      // tool output, input tokens, account rate limits or elapsed time.
      const output = usage?.output_tokens, reasoning = usage?.reasoning_output_tokens ?? 0;
      if (![output, reasoning].every(value => Number.isSafeInteger(value) && value >= 0)
        || !Number.isSafeInteger(observedOutputTokens + output + reasoning)) fail("agent_execution_output_budget_invalid");
      else {
        observedOutputTokens += output + reasoning;
        if (observedOutputTokens >= parsed.data) fail("agent_execution_output_budget_exceeded");
      }
      assertWithinBudget();
    },
    rejectUnsupported() { fail("agent_execution_output_budget_unsupported"); },
    get failure() { return failure; },
    get observedOutputTokens() { return observedOutputTokens; }
  };
}

// codex-cli 0.153.4 exec/help and the official configuration reference do not
// establish an execution-wide hard output limit. No config/env/packet flag can
// opt out. Keep the CLI closed even after a binary upgrade until revalidated.
export function createCodexOutputBudget(options) {
  const budget = createObservedOutputBudget(options);
  budget.rejectUnsupported();
  return budget;
}
