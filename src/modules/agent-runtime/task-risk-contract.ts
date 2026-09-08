import { z } from "zod";

export const riskDimensions = ["money", "data", "security", "availability", "legal", "reversibility", "users"] as const;
export const riskLevels = ["low", "medium", "high", "critical"] as const;
export const riskAlgorithm = "roost-native-risk-v1";
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

// Ordinal severity is deliberately conservative, not an estimate of loss.
// Two related impacts add one tier; four or more add two, capped at critical.
// Bounded uncertainty adds one further tier. Unknown uncertainty never passes.
export function computeRisk(entries: RiskEntry[]) {
  const issues: string[] = [];
  if (!entries.length || entries.length > 50) issues.push("group_limit");
  if (new Set(entries.map(e => e.taskId)).size !== entries.length) issues.push("duplicate_task");
  for (const entry of entries) {
    if (entry.contradictions.length) issues.push("contradictory_evidence");
    if (entry.uncertainty.level === "unverifiable") issues.push("uncertainty_unverifiable");
  }
  const cumulativeEscalation = entries.length >= 4 ? 2 : entries.length >= 2 ? 1 : 0;
  const uncertaintyEscalation = entries.some(e => e.uncertainty.level === "bounded") ? 1 : 0;
  const dimensions = Object.fromEntries(riskDimensions.map(name => {
    const maximum = Math.max(...entries.map(e => riskLevels.indexOf(e.dimensions[name].level)));
    return [name, riskLevels[Math.min(3, maximum + cumulativeEscalation + uncertaintyEscalation)]];
  }));
  return { algorithm: riskAlgorithm, status: issues.length ? "needs_decision" : "assessed", level: issues.length ? null : riskLevels[Math.max(...Object.values(dimensions).map(v => riskLevels.indexOf(v!)))],
    dimensions, cumulativeEscalation, uncertaintyEscalation, reasons: [...new Set([...issues, ...(cumulativeEscalation ? ["related_changes_cumulative", "joint_assessment_required"] : []), ...(uncertaintyEscalation ? ["bounded_uncertainty_escalation"] : [])])] };
}
