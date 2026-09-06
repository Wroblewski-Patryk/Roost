import { z } from "zod";

// RF-HOST-016: explicit allowlist, never a numeric prefix guess or local default.
// This is admission policy, not provider availability or automatic model routing.
export const modelSelectionSchema = z.object({
  model: z.enum(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"]),
  reasoningEffort: z.enum(["low", "medium", "high", "xhigh", "max", "ultra"])
}).strict().refine((selection) => selection.model !== "gpt-5.6-luna" || selection.reasoningEffort !== "ultra", {
  path: ["reasoningEffort"], message: "unsupported_model_effort"
});

export function codexExecutionArgs(selection, sandbox) {
  const parsed = modelSelectionSchema.safeParse(selection);
  if (!parsed.success) throw new Error("execution_model_policy_invalid");
  const { model, reasoningEffort } = parsed.data;
  return ["exec", "--ephemeral", "--json", "--sandbox", sandbox,
    "--model", model, "--config", 'model_provider="openai"',
    "--config", `model_reasoning_effort="${reasoningEffort}"`, "-"];
}
