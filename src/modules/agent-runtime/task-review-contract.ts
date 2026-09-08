import { createHash } from "node:crypto";
import { z } from "zod";

const text = z.string().trim().min(3).max(2000).refine(value => !/\b(?:Bearer\s+\S+|-----BEGIN .*PRIVATE KEY|(?:password|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*\S+)/i.test(value), "Remove credentials from review evidence");
const lines = z.array(text).min(1).max(12);
export const correctionSchema = z.object({ scope: lines, excluded: lines, outcome: text, competencies: z.array(z.string().trim().min(1).max(120)).min(1).max(30) }).strict();
const evidence = z.array(z.object({ kind: z.enum(["test", "artifact"]), reference: text, result: text }).strict()).min(1).max(12);
const precondition = { grantId: z.string().uuid().optional(), requestId: z.string().uuid(), expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), executionId: z.string().uuid(), materialVersion: z.string().regex(/^[a-f0-9]{64}$/) };
export const reviewDecisionSchema = z.discriminatedUnion("decision", [
  z.object({ ...precondition, decision: z.literal("approve"), summary: text, evidence }).strict(),
  z.object({ ...precondition, decision: z.literal("reject"), summary: text, evidence, reproduction: lines, expected: text, observed: text, correction: correctionSchema }).strict()
]);
export const reviewActionSchema = z.discriminatedUnion("action", [
  z.object({ grantId: precondition.grantId, requestId: precondition.requestId, expectedVersion: precondition.expectedVersion, reviewId: z.string().uuid(), action: z.literal("return_to_executor"), scope: lines }).strict(),
  z.object({ grantId: precondition.grantId, requestId: precondition.requestId, expectedVersion: precondition.expectedVersion, reviewId: z.string().uuid(), action: z.literal("create_specialist_task"), scope: lines, specialist: z.object({ id: z.string().uuid(), revision: z.string().min(1).max(100) }).strict() }).strict()
]);
export const object = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
export const wire = (value: unknown): any => JSON.parse(JSON.stringify(value));
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const reviewDigest = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(wire(value)))).digest("hex");

export function correctionDraft(original: any, taskId: string, executor: any, correction: z.infer<typeof correctionSchema>) {
  const contract = structuredClone(original);
  contract.objective.outcome = correction.outcome;
  contract.scope = { allowed: correction.scope, forbidden: correction.excluded };
  contract.assignment = { agentId: executor.id, role: executor.role, competencies: correction.competencies };
  contract.taskRoles.executor = { id: executor.id, revision: executor.updatedAt.toISOString() };
  contract.singleTask = { ...contract.singleTask, contractId: `roost-task:${taskId}`, branch: `codex/task-${taskId}`,
    measurement: { metric: "", comparison: "eq", target: 0, unit: "", method: "" },
    problems: [{ statement: correction.outcome, componentId: contract.singleTask.component.id, outcome: correction.outcome, causalLink: null }], commonCause: null };
  return contract;
}
