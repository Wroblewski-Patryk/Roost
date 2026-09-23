import { z } from "zod";

// RF-HOST-016: explicit allowlist, never a numeric prefix guess or local default.
// This is admission policy, not provider availability or automatic model routing.
export const modelSelectionSchema = z.object({
  model: z.enum(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"]),
  reasoningEffort: z.enum(["low", "medium", "high", "xhigh", "max", "ultra"])
}).strict().refine((selection) => selection.model !== "gpt-5.6-luna" || selection.reasoningEffort !== "ultra", {
  path: ["reasoningEffort"], message: "unsupported_model_effort"
});

// A local selection is explicit task intent, not model/runtime admission. The
// trusted pilot must independently bind a managed installation and exact digest.
// Existing Codex/Hermes-Codex launchers still accept only modelSelectionSchema.
export const localHermesModelSelectionSchema = z.object({
  provider: z.literal("hermes_local"), model: z.string().regex(/^[a-z0-9][a-z0-9._/-]{0,95}:[a-z0-9][a-z0-9._-]{0,63}$/),
  modelFamily: z.enum(["gpt-oss", "devstral"]), modelDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  reasoningEffort: z.enum(["low", "medium", "high"])
}).strict().refine(s => s.model.split(":")[0] === s.modelFamily, { message: "local_model_family_mismatch" });
export const managedBackendVersion = "roost-managed-hermes-backend-v1";
const managedBase = {
  schemaVersion: z.literal(managedBackendVersion), agent: z.literal("managed_hermes"),
  riskClass: z.enum(["low", "medium", "high", "critical"]), fallback: z.literal("none"),
  attemptPolicy: z.object({ maxTurns: z.number().int().min(1).max(24), apiMaxRetries: z.number().int().min(0).max(2),
    unavailable: z.literal("stop_attempt"), restart: z.literal("never") }).strict()
};
// Explicit task input only: no availability discovery or routing algorithm.
export const managedBackendSelectionSchema = z.discriminatedUnion("backend", [
  z.object({ ...managedBase, backend: z.literal("codex_responses"), provider: z.literal("openai-codex"),
    modelSelection: modelSelectionSchema, auth: z.literal("same_owner_subscription") }).strict(),
  z.object({ ...managedBase, backend: z.literal("ollama_loopback"), provider: z.literal("ollama"),
    endpoint: z.literal("http://127.0.0.1:11434"), modelSelection: localHermesModelSelectionSchema,
    config: z.object({ reasoning: z.literal("explicit_model_effort"), remote: z.literal(false) }).strict() }).strict()
]);
export const taskModelSelectionSchema = z.union([modelSelectionSchema, localHermesModelSelectionSchema, managedBackendSelectionSchema]);

// The current Ready editor exposes only qualified Codex choices. Do not infer
// this catalogue by introspecting the broader task-selection union.
const codexShape = modelSelectionSchema.innerType().shape;
export const codexEditorModels = Object.freeze(codexShape.model.options.map(id => Object.freeze({ id,
  efforts: Object.freeze(codexShape.reasoningEffort.options.filter(reasoningEffort => modelSelectionSchema.safeParse({ model: id, reasoningEffort }).success))
})));

export function codexExecutionArgs(selection, sandbox) {
  const parsed = modelSelectionSchema.safeParse(selection);
  if (!parsed.success) throw new Error("execution_model_policy_invalid");
  const { model, reasoningEffort } = parsed.data;
  return ["exec", "--ephemeral", "--json", "--sandbox", sandbox,
    "--model", model, "--config", 'model_provider="openai"',
    "--config", `model_reasoning_effort="${reasoningEffort}"`, "-"];
}
