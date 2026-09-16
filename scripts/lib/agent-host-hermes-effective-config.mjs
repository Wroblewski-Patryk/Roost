import { z } from "zod";
import { renderHermesProfile, hermesProfileDigest } from "./agent-host-hermes-profile.mjs";

export const effectiveConfigVersion = "roost-hermes-effective-config-v1";
export const effectiveConfigPolicyVersion = "roost-hermes-effective-config-policy-v1";
const checks = { selectedProfile: z.boolean(), version: z.boolean(), configUnchanged: z.boolean(), noBackgroundThreads: z.boolean() };
function leaves(value, prefix = "") {
  for (const [key, item] of Object.entries(value)) {
    const name = prefix + key;
    if (item && typeof item === "object" && !Array.isArray(item) && Object.keys(item).length) leaves(item, name + ".");
    else checks[name] = z.boolean();
  }
}
leaves(JSON.parse(renderHermesProfile()));
// This pin has only a partial loader proof. There is deliberately no qualified
// receipt shape/factory: even all-true config leaves cannot authorize consumers.
export const effectiveConfigProbeSchema = z.object({
  schemaVersion: z.literal(effectiveConfigVersion), hermesVersion: z.literal("0.21.2"),
  hermesCommit: z.literal("939e45c91d751fadd94dcd1b873ac3cb44846213"), configDigest: z.literal(hermesProfileDigest),
  mechanism: z.literal("exact_pin_official_loader"), result: z.literal("blocked"),
  checks: z.object(checks).strict(),
  audit: z.object(Object.fromEntries(["network", "process", "credential", "outsideRead", "outsideWrite", "syntheticWrites", "localMetadata"]
    .map(key => [key, z.number().int().min(0).max(10000)]))).strict(),
  blockers: z.tuple([z.literal("startup_consumers_unqualified"), z.literal("credential_rotation_unqualified"), z.literal("native_tool_surface_unqualified")])
}).strict();

export function sanitizeEffectiveConfigProbe(input) {
  const result = effectiveConfigProbeSchema.safeParse(input);
  if (!result.success) throw new Error("effective_config_probe_invalid");
  return result.data;
}
