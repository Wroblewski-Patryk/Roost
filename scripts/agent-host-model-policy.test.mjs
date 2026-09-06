import assert from "node:assert/strict";
import test from "node:test";
import { codexExecutionArgs } from "./lib/agent-host-model-policy.mjs";

for (const model of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"]) {
  test(`dispatches explicit model and independent effort for ${model}`, () => {
    for (const effort of ["low", "medium", "high", "xhigh", "max", ...(model === "gpt-5.6-luna" ? [] : ["ultra"])]) {
      assert.deepEqual(codexExecutionArgs({ model, reasoningEffort: effort }, "workspace-write"), [
        "exec", "--ephemeral", "--json", "--sandbox", "workspace-write", "--model", model,
        "--config", 'model_provider="openai"', "--config", `model_reasoning_effort="${effort}"`, "-"
      ]);
    }
  });
}

for (const selection of [undefined, {}, { model: "gpt-5.6-sol" },
  ...["gpt-5.5", "gpt-5.4-mini", "gpt-5.3-codex-spark", "gpt-5.6", "gpt-6-unknown", "gpt-reserve", "gpt-5.6-sol --sandbox danger-full-access"]
    .map((model) => ({ model, reasoningEffort: "medium" })),
  { model: "gpt-5.6-luna", reasoningEffort: "ultra" },
  { model: "gpt-5.6-sol", reasoningEffort: "none" },
  { model: "gpt-5.6-sol", reasoningEffort: "medium", fallbackModel: "gpt-5.5" }
]) test(`rejects unsafe or unspecified selection ${JSON.stringify(selection)}`, () => {
  assert.throws(() => codexExecutionArgs(selection, "workspace-write"), { message: "execution_model_policy_invalid" });
});
