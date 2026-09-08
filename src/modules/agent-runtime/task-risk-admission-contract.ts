import { z } from "zod";

export const admissionPolicy = "roost-native-risk-admission-v1";
export const admissionOperations = ["runtime_execute", "review_decision", "return_to_executor", "create_specialist_task"] as const;
export const admissionGates = ["procedure", "extended_review", "mandate", "backup", "restore_plan", "owner_approval"] as const;
const uuid = z.string().uuid(), text = z.string().trim().min(3).max(2000);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const command = { requestId: uuid, expectedVersion: hash };
export const admissionScopeSchema = z.object({ ...command,
  taskType: z.enum(["code_change", "maintenance", "migration", "review"]),
  environment: z.enum(["development", "staging", "production"]),
  targetId: uuid, releaseId: uuid, commit: z.string().regex(/^[a-f0-9]{40}$/),
  destructive: z.boolean(), procedureId: uuid, rationale: text
}).strict();
const common = { ...command, operation: z.enum(admissionOperations), verdict: z.enum(["passed", "failed"]),
  evidence: z.object({ id: uuid, revision: z.string().datetime() }).strict(), rationale: text };
export const admissionEvidenceSchema = z.discriminatedUnion("gate", [
  z.object({ ...common, gate: z.literal("procedure"), validation: text, observedResult: text }).strict(),
  z.object({ ...common, gate: z.literal("extended_review"), security: text, data: text, reversibility: text, tests: text, unresolvedFindings: z.array(text).max(20) }).strict(),
  z.object({ ...common, gate: z.literal("mandate"), decision: text, allowedScope: text, exclusions: text }).strict(),
  z.object({ ...common, gate: z.literal("backup"), artifact: z.object({ digest: hash, bytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), capturedAt: z.string().datetime(), reference: text }).strict(), validation: text, observedResult: text }).strict(),
  z.object({ ...common, gate: z.literal("restore_plan"), restoreProcedure: text, validation: text, expectedResult: text, prerequisites: text }).strict(),
  z.object({ ...common, gate: z.literal("owner_approval"), decision: z.literal("approve_exact_operation"), residualRisk: text }).strict()
]);
