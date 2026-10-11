import { createHash } from "node:crypto";
import { z } from "zod";

export const taskProposalCategories = ["defect", "unfinished_function", "stale_documentation", "missing_assumption", "improvement"] as const;
export const taskProposalPriorityBands = [
  "security_data_incident_outage", "blocked_core_flow", "wrong_result_action",
  "incomplete_flow_regression", "stability_debt", "approved_missing_feature", "cosmetic_optimization"
] as const;

const taskPriorityByBand: Record<(typeof taskProposalPriorityBands)[number], "critical" | "high" | "normal" | "low"> = {
  security_data_incident_outage: "critical",
  blocked_core_flow: "high",
  wrong_result_action: "high",
  incomplete_flow_regression: "high",
  stability_debt: "normal",
  approved_missing_feature: "normal",
  cosmetic_optimization: "low"
};
export function taskPriorityForProposalBand(band: string) {
  return taskPriorityByBand[z.enum(taskProposalPriorityBands).parse(band)];
}

const id = z.string().uuid();
const revision = z.string().datetime();
const safeText = (max: number) => z.string().trim().min(3).max(max).refine(value =>
  !/\b(?:Bearer\s+\S+|-----BEGIN .*PRIVATE KEY|(?:password|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*\S+)/i.test(value), "Credential-like text is not allowed");
const title = safeText(240);
const explanation = safeText(2000);

export const issueTaskProposalMandateSchema = z.object({
  requestId: id, credentialId: id, sourceRecordId: id, expectedSourceRevision: revision,
  validUntil: revision, reason: safeText(1000)
}).strict();
export const revokeTaskProposalMandateSchema = z.object({ requestId: id, reason: safeText(1000) }).strict();
export const createTaskProposalSchema = z.object({
  requestId: id, mandateId: id, sourceRecordId: id, expectedSourceRevision: revision,
  title, outcome: explanation, category: z.enum(taskProposalCategories),
  priorityBand: z.enum(taskProposalPriorityBands), priorityRationale: explanation
}).strict();
export const decideTaskProposalSchema = z.object({
  requestId: id, expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
  action: z.enum(["accept", "reject"]), reason: explanation,
  title: title.optional(), outcome: explanation.optional(),
  category: z.enum(taskProposalCategories).optional(),
  priorityBand: z.enum(taskProposalPriorityBands).optional(),
  priorityRationale: explanation.optional()
}).strict();

export type CreateTaskProposal = z.infer<typeof createTaskProposalSchema>;

export function taskProposalFingerprint(sourceRecordId: string, sourceReviewId: string,
  category: string, titleValue: string, outcome: string) {
  const normalized = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
  const parts = ["roost-company-task-proposal-v2", sourceRecordId.toLowerCase(), sourceReviewId.toLowerCase(),
    category, normalized(titleValue), normalized(outcome)];
  return createHash("sha256").update(parts.map(value => `${Buffer.byteLength(value, "utf8")}:${value}`).join("")).digest("hex");
}
