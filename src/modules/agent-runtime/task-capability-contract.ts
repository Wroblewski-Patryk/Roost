import { clarificationBinding } from "./task-clarification-contract";
import { handoffRoles } from "./task-handoff-contract";
import { z } from "zod";
export const capabilityOperation = z.enum(["review_decision", "return_to_executor", "create_specialist_task", "handoff_create", "handoff_accept", "handoff_reject", "clarification_send", "clarification_reply", "interview_prepare", "decision_supersede"]);
export const capabilityReason = z.string().trim().min(3).max(1000).refine(value => !/(?:cc_v1_[A-Za-z0-9_-]{24,}|Bearer\s+\S+|-----BEGIN .*PRIVATE KEY|(?:password|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*\S+)/i.test(value), "Remove credentials from mandate");
export const issueCapabilitySchema = z.object({ requestId: z.string().uuid(), expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), credentialId: z.string().uuid(),
  decision:z.object({decisionId:z.string().uuid(),previewId:z.string().uuid()}).strict().optional(),
  interview:z.object({unknownKey:z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),decisionClass:z.enum(["product_direction","money","legal","critical_risk","mandate","task_scope"]),principalId:z.string().uuid()}).strict().optional(),
  clarification:clarificationBinding.optional(),clarificationContextVersion:z.string().regex(/^[a-f0-9]{64}$/).optional(),
  handoff: z.object({role:z.enum(handoffRoles),recipientRole:z.enum(handoffRoles).optional(),recipient:z.object({kind:z.enum(["user","agent"]),id:z.string().uuid()}).strict().optional(),handoffId:z.string().uuid().optional()}).strict().optional(), operation: capabilityOperation,
  validFrom: z.string().datetime(), validUntil: z.string().datetime(), reason: capabilityReason }).strict();
export const revokeCapabilitySchema = z.object({ requestId: z.string().uuid(), reason: capabilityReason }).strict();
export function capabilityWindow(from: Date, until: Date, credentialExpiry: Date, now = new Date()) {
  return from.getTime() >= now.getTime() - 60000 && from < until && until > now && until.getTime() <= now.getTime() + 3600000 && until <= credentialExpiry;
}
