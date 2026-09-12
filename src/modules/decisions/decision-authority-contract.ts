import { z } from "zod";
import { canonicalDepartmentKeys } from "../../operating-model/department-registry";

export const decisionDomains = ["product_direction", "money", "legal", "critical_risk", "mandate_change", "ordinary_domain"] as const;
export const decisionOperations = ["accept_decision", "supersede_decision", "answer_interview", "accept_interview", "verify_finding", "triage_finding"] as const;
export const mandateRisks = ["low", "medium", "high"] as const;
const id = z.string().uuid();
const text = z.string().trim().min(3).max(2000);
export const authorityEntity = z.object({ type: z.enum(["task", "application", "project", "procedure"]), id }).strict();
export const authorityPrincipal = z.object({ kind: z.enum(["user", "agent"]), id }).strict();
export const authorityDepartment = z.enum(canonicalDepartmentKeys).refine(value => value !== "00-ogolny", "General is not an authority department");
export const decisionAuthorityDeclaration = z.object({
  domain: z.enum(decisionDomains), departmentKey: authorityDepartment,
  requesterId: id.optional(), recipientId: id.optional(),
  entities: z.array(authorityEntity).min(1).max(32)
}).strict().refine(value => new Set(value.entities.map(entity => `${entity.type}:${entity.id}`)).size === value.entities.length, "Duplicate entity");
export const mandateBody = z.object({
  holder: authorityPrincipal, departmentKey: authorityDepartment,
  entities: z.array(authorityEntity).min(1).max(32),
  decisionDomains: z.array(z.literal("ordinary_domain")).length(1),
  operations: z.array(z.enum(decisionOperations)).min(1).max(6),
  exclusions: z.array(authorityEntity).max(32), exclusionReason: text,
  maxRisk: z.enum(mandateRisks), startsAt: z.string().datetime(), endsAt: z.string().datetime().nullable(),
  status: z.enum(["active", "suspended", "revoked"]), sourceDecisionId: id, reason: text
}).strict().superRefine((value, context) => {
  if (value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt)) context.addIssue({ code: "custom", message: "Validity must end after it starts" });
  for (const field of ["entities", "exclusions"] as const) if (new Set(value[field].map(entity => `${entity.type}:${entity.id}`)).size !== value[field].length) context.addIssue({ code: "custom", message: "Duplicate scope" });
  if (new Set(value.operations).size !== value.operations.length) context.addIssue({ code: "custom", message: "Duplicate operation" });
});
export const mandateCommand = z.object({ requestId: id, expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), mandateId: id.nullable(), body: mandateBody }).strict();
export type DecisionAuthorityDeclaration = z.infer<typeof decisionAuthorityDeclaration>;
export type MandateBody = z.infer<typeof mandateBody>;
