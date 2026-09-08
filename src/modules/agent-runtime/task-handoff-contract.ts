import { z } from "zod";

export const handoffOperations = ["handoff_create", "handoff_accept", "handoff_reject"] as const;
export const handoffRoles = ["requester", "accountableManager", "executor", "verifier", "releaser"] as const;
export const handoffSections = ["outcome", "context", "decisions", "changes", "tests", "limits", "continuation", "expectedAction"] as const;
const id = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/), text = z.string().trim().min(3).max(2000);
const command = { requestId: id, expectedVersion: hash, grantId: id.optional() };
export const handoffContentSchema = z.object({
  outcome: z.object({ summary: text, currentState: text }).strict(),
  decisions: z.object({ explanation: text }).strict(),
  changes: z.object({ areas: z.array(text).min(1).max(30) }).strict(),
  tests: z.object({ assessment: text }).strict(),
  limits: z.object({ knownLimitations: text, residualRisks: text }).strict(),
  continuation: z.object({ reproduce: text, continue: text, rollback: text }).strict(),
  expectedAction: z.object({ kind: z.enum(["inspect", "review", "continue", "decide"]), instruction: text }).strict()
}).strict();
export const createHandoffSchema = z.object({ ...command,
  sourceVersion: hash, senderRole: z.enum(handoffRoles), recipientRole: z.enum(handoffRoles),
  recipient: z.object({ kind: z.enum(["user", "agent"]), id }).strict(),
  supersedes: id.nullable(), content: handoffContentSchema
}).strict();
export const decideHandoffSchema = z.discriminatedUnion("decision", [
  z.object({ ...command, handoffId: id, handoffVersion: z.number().int().positive(), decision: z.literal("accept") }).strict(),
  z.object({ ...command, handoffId: id, handoffVersion: z.number().int().positive(), decision: z.literal("reject"),
    code: z.enum(["missing_section", "conflicting_section", "insufficient_evidence", "unclear_action"]), reason: text,
    sections: z.array(z.enum(handoffSections)).min(1).max(handoffSections.length)
  }).strict()
]);
