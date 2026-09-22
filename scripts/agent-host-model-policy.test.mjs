import assert from "node:assert/strict";
import test from "node:test";
import { codexExecutionArgs, taskModelSelectionSchema, codexEditorModels } from "./lib/agent-host-model-policy.mjs";

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

test("local Hermes intent requires exact family/digest/effort and never dispatches through Codex", () => {
  const local = { provider: "hermes_local", model: "gpt-oss:20b", modelFamily: "gpt-oss", modelDigest: "sha256:" + "b".repeat(64), reasoningEffort: "low" };
  assert.equal(taskModelSelectionSchema.safeParse(local).success, true);
  assert.throws(() => codexExecutionArgs(local, "workspace-write"));
  for (const field of Object.keys(local)) {
    const missing = { ...local }; delete missing[field]; assert.equal(taskModelSelectionSchema.safeParse(missing).success, false);
  }
  for (const patch of [{ model: "gpt-oss" }, { model: "gpt-oss:latest", modelDigest: "latest" }, { modelFamily: "devstral" },
    { provider: "remote" }, { reasoningEffort: "ultra" }, { fallback: "openai" }, { modelDigest: null }])
    assert.equal(taskModelSelectionSchema.safeParse({ ...local, ...patch }).success, false);
});

test("Ready editor retains the exact Codex catalogue when task schema also accepts local intent", () => {
  assert.deepEqual(codexEditorModels.map(x => x.id), ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"]);
  for (const { id, efforts } of codexEditorModels) {
    assert.deepEqual(efforts, ["low", "medium", "high", "xhigh", "max", ...(id === "gpt-5.6-luna" ? [] : ["ultra"])]);
    for (const reasoningEffort of efforts) assert.doesNotThrow(() => codexExecutionArgs({ model: id, reasoningEffort }, "workspace-write"));
  }
});
