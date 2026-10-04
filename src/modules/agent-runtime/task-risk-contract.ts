import { z } from "zod";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const riskDimensions = ["money", "data", "security", "availability", "legal", "reversibility", "users"] as const;
export const riskLevels = ["low", "medium", "high", "critical"] as const;
export const riskAlgorithm = "roost-native-risk-v2";
const text = z.string().trim().min(3).max(2000), uuid = z.string().uuid();
const evidence = z.object({ id: uuid, revision: z.string().min(1).max(100) }).strict();
const impact = z.object({ level: z.enum(riskLevels), rationale: text, evidence: z.array(evidence).min(1).max(10) }).strict();
export const riskEntrySchema = z.object({ taskId: uuid,
  dimensions: z.object(Object.fromEntries(riskDimensions.map(name => [name, impact])) as Record<typeof riskDimensions[number], typeof impact>).strict(),
  uncertainty: z.object({ level: z.enum(["none", "bounded", "unverifiable"]), reasons: text, evidence: z.array(evidence).min(1).max(10) }).strict(),
  contradictions: z.array(text).max(20)
}).strict();
export const riskScopeSchema = z.object({ requestId: uuid, expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), applicationId: uuid,
  contract: z.record(z.unknown()), prompt: z.string().max(20000).nullable().optional(), baseBranch: z.string().max(240).nullable().optional(),
  releaseSet: evidence.nullable()
}).strict();
export const riskAssessmentSchema = z.object({ requestId: uuid, expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
  entries: z.array(riskEntrySchema).min(1).max(50), jointRationale: text
}).strict();
export type RiskEntry = z.infer<typeof riskEntrySchema>;

// This is server-side classification of the immutable prepared scope, never an
// assessor's declaration. Keep the actual admission schema as the authority.
const loadESM = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
let readonlyValidation: Promise<any[]> | undefined;
export async function riskScopeIsReadonly(contract: unknown): Promise<boolean> {
  readonlyValidation ??= Promise.all([
    loadESM(pathToFileURL(path.resolve(__dirname, "../../../scripts/lib/agent-host-execution-packet.mjs")).href),
    loadESM(pathToFileURL(path.resolve(__dirname, "../../../scripts/lib/agent-host-native-footprint.mjs")).href)
  ]);
  const [{ executionContractSchema }, { nativeRelative }] = await readonlyValidation;
  const parsed = executionContractSchema.safeParse(contract);
  if (!parsed.success) return false;
  const c = parsed.data;
  if (c.nativeBoundary?.profile !== "inspect-readonly" || c.access.sandbox !== "read-only"
    || c.access.externalWrites !== false || c.access.tools.length !== 1 || c.access.tools[0] !== "repository_read"
    || c.access.permissions.length !== 1 || c.access.permissions[0] !== "repository_read") return false;
  try {
    c.nativeBoundary.readPaths.forEach(nativeRelative);
    (c.nativeBoundary.readFragments ?? []).forEach((fragment: {path:string}) => nativeRelative(fragment.path));
  } catch { return false; }
  return true;
}

// Ordinal severity is deliberately conservative, not an estimate of loss.
// Two related changes add one tier; four or more add two, capped at critical.
// Bounded uncertainty adds one further tier. Unknown uncertainty never passes.
export function computeRisk(entries: RiskEntry[], readonlyTaskIds: ReadonlySet<string> = new Set()) {
  const issues: string[] = [];
  if (!entries.length || entries.length > 50) issues.push("group_limit");
  if (new Set(entries.map(e => e.taskId)).size !== entries.length) issues.push("duplicate_task");
  for (const entry of entries) {
    if (entry.contradictions.length) issues.push("contradictory_evidence");
    if (entry.uncertainty.level === "unverifiable") issues.push("uncertainty_unverifiable");
  }
  // Read-only members still participate in the maximum, evidence and uncertainty
  // checks. Only the count of changes excludes verified non-mutating scopes.
  const readonlyIds = entries.filter(e => readonlyTaskIds.has(e.taskId)).map(e => e.taskId).sort();
  const mutationCount = entries.length - readonlyIds.length;
  const cumulativeEscalation = mutationCount >= 4 ? 2 : mutationCount >= 2 ? 1 : 0;
  const uncertaintyEscalation = entries.some(e => e.uncertainty.level === "bounded") ? 1 : 0;
  const dimensions = Object.fromEntries(riskDimensions.map(name => {
    const maximum = Math.max(...entries.map(e => riskLevels.indexOf(e.dimensions[name].level)));
    return [name, riskLevels[Math.min(3, maximum + cumulativeEscalation + uncertaintyEscalation)]];
  }));
  return { algorithm: riskAlgorithm, status: issues.length ? "needs_decision" : "assessed", level: issues.length ? null : riskLevels[Math.max(...Object.values(dimensions).map(v => riskLevels.indexOf(v!)))],
    dimensions, mutationCount, readonlyTaskIds: readonlyIds, cumulativeEscalation, uncertaintyEscalation, reasons: [...new Set([...issues, ...(cumulativeEscalation ? ["related_changes_cumulative", "joint_assessment_required"] : []), ...(uncertaintyEscalation ? ["bounded_uncertainty_escalation"] : [])])] };
}
