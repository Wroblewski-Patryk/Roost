import { createHash } from "node:crypto";
import { z } from "zod";
import { authorityDepartment } from "../decisions/decision-authority-contract";
import { reopenCondition } from "../decisions/decision-governance-contract";
import { interviewQuestion } from "../agent-runtime/task-interview-contract";

export const findingClasses = ["defect", "unfinished_function", "stale_documentation", "missing_assumption", "improvement"] as const;
export const findingStates = ["observed", "deduplication_pending", "verification_pending", "verified", "rejected", "inconclusive", "triage_pending", "converted_to_task", "converted_to_decision", "deferred", "merged"] as const;
export const findingOperations = ["finding_verify", "finding_triage"] as const;
const id = z.string().uuid();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().trim().min(3).max(2000);
const revision = z.string().trim().min(1).max(160);
const key = z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/);
export const findingPrincipal = z.object({ kind: z.enum(["user", "agent"]), id }).strict();
export const findingReference = z.object({
  type: z.enum(["application_evidence", "company_record", "run"]), id, revision
}).strict();
export const findingSource = z.object({
  type: z.enum(["audit", "run", "task", "application", "project", "procedure"]), id, revision
}).strict();
const references = z.array(findingReference).min(1).max(8);
export const findingBody = z.object({
  title: text, classification: z.enum(findingClasses), language: z.enum(["pl", "en"]),
  taskId: id.nullable(), componentId: id, departmentKey: authorityDepartment,
  requesterId: id, recipientId: id,
  scope: text, excluded: text, observed: text, expected: text,
  reproducibility: z.object({ status: z.enum(["reproduced", "intermittent", "not_reproduced"]), steps: z.array(text).min(1).max(8), limitations: text }).strict(),
  sources: z.array(findingSource).min(1).max(8), evidence: references,
  environment: z.object({ key, build: revision, applicationRevision: revision, componentRevision: revision, contextRevision: hash }).strict(),
  impact: text, knownRisk: z.enum(["low", "medium", "high", "critical"]),
  requiredCompetencies: z.array(key).min(1).max(12),
  decisionNeed: z.enum(["none", "product_direction", "money", "legal", "critical_risk", "mandate_change", "material_unknown"]),
  procedureId: id.nullable(), correctionReason: text.optional(), classificationDecisionId: id.optional()
}).strict().superRefine((value, context) => {
  if(Buffer.byteLength(JSON.stringify(value))>55000)context.addIssue({code:"custom",message:"Finding exceeds the evidence budget"});
  for (const field of ["sources", "evidence"] as const) {
    if (new Set(value[field].map(item => `${item.type}:${item.id}`)).size !== value[field].length) context.addIssue({ code: "custom", message: "Duplicate reference" });
  }
  if (new Set(value.requiredCompetencies).size !== value.requiredCompetencies.length) context.addIssue({ code: "custom", message: "Duplicate competency" });
});
export type FindingBody = z.infer<typeof findingBody>;
export const findingCreate = z.object({ requestId: id, observationId: id.optional(), body: findingBody }).strict();
export const findingRevise = z.object({ requestId: id, expectedVersion: hash, body: findingBody }).strict();
export const findingOccurrence = z.object({ requestId: id, expectedVersion: hash, purpose: z.enum(["observation", "fix"]), source: findingSource, evidence: references, explanation: text }).strict();
export const findingVerification = z.object({
  verdict: z.enum(["confirmed", "rejected", "inconclusive"]), method: text,
  environment: revision, evidence: references, observed: text, limitations: text
}).strict();
export const findingTaskDraft = z.object({
  title: text, outcome: text, scope: text, excluded: text,
  projectId: id, executorId: id, procedureId: id,
  acceptanceCriteria: z.array(text).min(1).max(8), requiredTests: z.array(text).min(1).max(8),
  dependencies: z.array(id).max(12),
  context: references
}).strict();
const command = { requestId: id, expectedVersion: hash, reason: text, grantId: id.optional() };
export const findingCommand = z.discriminatedUnion("action", [
  z.object({ ...command, action: z.literal("queue_deduplication") }).strict(),
  z.object({ ...command, action: z.literal("deduplicate") }).strict(),
  z.object({ ...command, action: z.literal("propose_merge"), otherId: id }).strict(),
  z.object({ ...command, action: z.literal("resolve_merge"), candidateId: id, verdict: z.enum(["merge", "distinct"]) }).strict(),
  z.object({ ...command, action: z.literal("verify"), verification: findingVerification }).strict(),
  z.object({ ...command, action: z.literal("challenge"), verification: findingVerification }).strict(),
  z.object({ ...command, action: z.literal("adjudicate"), verification: findingVerification, decisionId: id }).strict(),
  z.object({ ...command, action: z.literal("prepare_adjudication"), principal: findingPrincipal, statement: text, rationale: text, consequences: text }).strict(),
  z.object({ ...command, action: z.literal("queue_triage") }).strict(),
  z.object({ ...command, action: z.literal("prepare_task"), task: findingTaskDraft }).strict(),
  z.object({ ...command, action: z.literal("convert_task") }).strict(),
  z.object({ ...command, action: z.literal("prepare_decision"), statement: text, rationale: text, consequences: text }).strict(),
  z.object({ ...command, action: z.literal("prepare_interview"), questions: z.array(interviewQuestion).min(1).max(3), recommendation: text }).strict(),
  z.object({ ...command, action: z.literal("convert_decision") }).strict(),
  z.object({ ...command, action: z.literal("defer"), category: z.enum(["budget", "infrastructure"]), condition: reopenCondition }).strict(),
  z.object({ ...command, action: z.literal("reopen"), deferralId: id, eventType: z.enum(["resource_available", "configuration_changed", "owner_signal", "deadline"]), referenceRevision: hash.optional() }).strict()
]);
export const findingGrantBinding = z.object({ observationId: id, version: z.number().int().positive(), operation: z.enum(findingOperations) }).strict();

/** Length-delimited UTF-8 fields avoid delimiter collisions and object key ordering. */
export function findingFingerprint(applicationId: string, body: FindingBody) {
  const normalized = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
  const fields = [applicationId, body.componentId, normalized(body.observed), normalized(body.expected),
    normalized(body.environment.key), body.environment.build, body.environment.applicationRevision,
    body.environment.componentRevision, body.environment.contextRevision];
  return createHash("sha256").update("roost-finding-v1:" + fields.map(value => `${Buffer.byteLength(value)}:${value}`).join("")).digest("hex");
}

export function findingRoute(body: Pick<FindingBody, "classification" | "decisionNeed" | "knownRisk">) {
  if (body.classification === "missing_assumption" || body.decisionNeed === "material_unknown") return "interview" as const;
  if (body.knownRisk === "critical" || body.decisionNeed !== "none") return "decision" as const;
  return "task" as const;
}

export function findingTransition(state: typeof findingStates[number], action: string) {
  const transitions: Partial<Record<typeof findingStates[number], Record<string, string>>> = {
    observed: { queue_deduplication: "deduplication_pending" },
    deduplication_pending: { deduplicate: "verification_pending" },
    verification_pending: { confirmed: "verified", rejected: "rejected", inconclusive: "inconclusive" },
    verified: { queue_triage: "triage_pending", challenge: "inconclusive" },
    triage_pending: { convert_task: "converted_to_task", convert_decision: "converted_to_decision", defer: "deferred", challenge: "inconclusive" },
    converted_to_task: { challenge: "inconclusive" }, converted_to_decision: { challenge: "inconclusive" },
    deferred: { reopen: "triage_pending" }, inconclusive: { adjudicate_confirmed: "verified", adjudicate_rejected: "rejected", adjudicate_inconclusive: "inconclusive" }
  };
  return transitions[state]?.[action] ?? null;
}

export const findingGrant = z.object({ requestId: id, expectedVersion: hash, operation: z.enum(findingOperations), principal: findingPrincipal,
  credentialId: id.nullable(), validUntil: z.string().datetime(), reason: text.max(1000) }).strict();
