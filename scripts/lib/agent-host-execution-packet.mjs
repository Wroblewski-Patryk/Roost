import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeGitRemote } from "./agent-host-workspace-guard.mjs";

const text = z.string().trim().min(1).max(2000);
const texts = z.array(text).min(1).max(30);
const id = z.string().uuid();
const ref = z.object({ id, revision: text }).strict();
const refs = z.array(ref).min(1).max(10);
const optionalSet = (item) => z.object({ items: z.array(item).max(30), noneReason: text.nullable() }).strict()
  .refine((value) => value.items.length ? value.noneReason === null : Boolean(value.noneReason));
const operations = z.enum(["repository_read", "repository_write", "local_test"]);
export const executionContractSchema = z.object({
  version: text,
  objective: z.object({ outcome: text, goalId: id }).strict(),
  scope: z.object({ allowed: texts, forbidden: texts }).strict(),
  assignment: z.object({ agentId: id, role: text, competencies: texts }).strict(),
  context: z.object({ company: refs, product: refs, technical: refs }).strict(),
  procedures: optionalSet(ref),
  skills: optionalSet(z.object({ name: text, version: text }).strict()),
  access: z.object({ tools: z.array(operations).min(1).max(3), permissions: z.array(operations).min(1).max(3),
    sandbox: z.literal("workspace-write"), externalWrites: z.literal(false), restrictions: texts }).strict(),
  dependencies: optionalSet(ref.extend({ resolution: z.literal("satisfied"), evidence: text })),
  decisions: optionalSet(ref),
  budgets: z.object({ maxAttempts: z.number().int().min(1).max(5), maxDurationSeconds: z.number().int().min(60).max(3600), maxOutputTokens: z.number().int().min(128).max(100000) }).strict(),
  acceptance: z.object({ criteria: texts, tests: texts, evidence: texts }).strict(),
  recovery: z.object({ handoff: text, failure: text, escalation: text,
    rollback: z.object({ mode: z.enum(["restore_task_changes", "not_applicable"]), instructions: text }).strict() }).strict()
}).strict();

const packetSchema = z.object({
  schemaVersion: z.literal("roost-execution-packet-v1"), revision: z.string().regex(/^[a-f0-9]{64}$/),
  identity: z.object({ executionId: id, workspaceId: id, taskId: id, applicationId: id, agentId: id }).strict(),
  taskRevision: text, contract: executionContractSchema,
  sources: z.array(z.object({ id, workspaceId: id, applicationId: id.nullable(), recordType: text, title: text,
    description: z.string().nullable(), businessPurpose: z.string().nullable(), desiredState: z.string().nullable(), expectedBehavior: z.string().nullable(), revision: text }).strict()).max(30)
}).strict();

const list = (value) => Array.isArray(value) ? value : [];
export function validateExecutionPacket(packet, claimed, taskContext, applicationContext) {
  const issues = [];
  const add = (field, reason) => issues.push({ field, reason });
  const parsed = packetSchema.safeParse(packet);
  if (!parsed.success) {
    // Never forward Zod messages, input values, unknown property names or raw payloads.
    for (const issue of parsed.error.issues) add(issue.path.join(".") || "packet", issue.code === "invalid_type" && issue.received === "undefined" ? "missing" : "invalid");
  } else {
    const p = parsed.data, c = p.contract, task = taskContext?.task, agent = task?.assignedWorkforceEntity;
    const { revision, ...body } = packet;
    if (createHash("sha256").update(JSON.stringify(body)).digest("hex") !== revision) add("revision", "mismatch");
    for (const [field, expected] of Object.entries({ executionId: claimed?.id, taskId: claimed?.taskId, workspaceId: claimed?.workspaceId, applicationId: claimed?.applicationId, agentId: task?.assignedWorkforceEntityId })) {
      if (p.identity[field] !== expected) add(`identity.${field}`, "mismatch");
    }
    if (taskContext?.schemaVersion !== "task-agent-execution-context-v1") add("taskContext.schemaVersion", "invalid");
    for (const field of ["procedures", "dependencies", "decisions"]) {
      if (!Array.isArray(taskContext?.[field])) add(`taskContext.${field}`, "missing");
    }
    if (task?.id !== p.identity.taskId || task?.workspaceId !== p.identity.workspaceId) add("taskContext.task", "mismatch");
    if (task?.updatedAt !== p.taskRevision) add("taskRevision", "stale");
    if (!["todo", "in_progress"].includes(task?.status)) add("taskContext.task.status", "blocked");
    if (applicationContext?.schemaVersion !== "application-agent-context-v2") add("applicationContext.schemaVersion", "invalid");
    for (const field of ["applicationProcedures", "capabilityProcedures"]) {
      if (!Array.isArray(applicationContext?.operatingModel?.[field])) add(`applicationContext.operatingModel.${field}`, "missing");
    }
    if (applicationContext?.application?.id !== p.identity.applicationId || applicationContext?.application?.workspaceId !== p.identity.workspaceId || applicationContext?.application?.slug !== claimed?.application?.slug) add("applicationContext.application", "mismatch");
    if (!list(applicationContext?.operatingModel?.projects).some((link) => link?.projectId === task?.projectId)) add("taskContext.task.projectId", "mismatch");
    const primaryRepository = (application) => {
      const repositories = list(application?.repositories), primary = repositories.filter((item) => item?.isPrimary === true);
      return primary.length === 1 ? primary[0] : primary.length === 0 && repositories.length === 1 ? repositories[0] : null;
    };
    try {
      if (normalizeGitRemote(primaryRepository(applicationContext?.application)?.url) !== normalizeGitRemote(primaryRepository(claimed?.application)?.url)) add("applicationContext.application.repositories", "mismatch");
    } catch { add("applicationContext.application.repositories", "invalid"); }
    if (c.objective.goalId !== task?.goalId || task?.goal?.id !== c.objective.goalId || task?.goal?.workspaceId !== p.identity.workspaceId) add("contract.objective.goalId", "mismatch");
    if (c.assignment.agentId !== p.identity.agentId || agent?.id !== p.identity.agentId || agent?.workspaceId !== p.identity.workspaceId || agent?.type !== "agent" || agent?.status !== "active") add("contract.assignment.agentId", "mismatch");
    if (c.assignment.role !== agent?.role) add("contract.assignment.role", "mismatch");
    if (c.assignment.competencies.some((name) => !list(agent?.skillIndex).includes(name))) add("contract.assignment.competencies", "unavailable");
    if (c.access.tools.some((name) => !list(agent?.toolIndex).includes(name))) add("contract.access.tools", "unavailable");
    if (c.access.permissions.some((name) => !list(agent?.authorityScope).includes(name)) || c.access.tools.some((name) => !c.access.permissions.includes(name))) add("contract.access.permissions", "unavailable");
    if (c.scope.allowed.some((entry) => c.scope.forbidden.some((other) => other.toLowerCase() === entry.toLowerCase()))) add("contract.scope", "mismatch");
    if (c.access.permissions.includes("repository_write") && c.recovery.rollback.mode !== "restore_task_changes") add("contract.recovery.rollback", "mismatch");
    if (!Number.isInteger(claimed?.attempt) || claimed.attempt < 1 || claimed.attempt > c.budgets.maxAttempts) add("contract.budgets.maxAttempts", "blocked");
    for (const category of ["company", "product", "technical"]) {
      for (const reference of c.context[category]) {
        const source = p.sources.find((item) => item.id === reference.id);
        if (!source || ![source.description, source.businessPurpose, source.desiredState, source.expectedBehavior].some((value) => typeof value === "string" && value.trim())) add(`contract.context.${category}`, "unavailable");
        else if (source.revision !== reference.revision) add(`contract.context.${category}`, "stale");
        else if (source.workspaceId !== p.identity.workspaceId || (category === "company" ? source.applicationId !== null : source.applicationId !== p.identity.applicationId)) add(`contract.context.${category}`, "mismatch");
      }
    }
    const checkRefs = (field, actual, version, accepted = () => true, requireAll = false) => {
      const declared = c[field].items;
      if (requireAll && actual.some((item) => !declared.some((entry) => entry.id === item?.id))) add(`contract.${field}`, "missing");
      for (const reference of declared) {
        const source = actual.find((item) => item?.id === reference.id);
        if (!source) add(`contract.${field}`, "unavailable");
        else if (source.workspaceId !== p.identity.workspaceId) add(`contract.${field}`, "mismatch");
        else if (String(source[version]) !== reference.revision) add(`contract.${field}`, "stale");
        else if (!accepted(source)) add(`contract.${field}`, "blocked");
      }
    };
    checkRefs("procedures", list(taskContext?.procedures), "version", (item) => item.status === "active");
    for (const skill of c.skills.items) if (!list(agent?.skillIndex).includes(`${skill.name}@${skill.version}`)) add("contract.skills", "unavailable");
    checkRefs("dependencies", list(taskContext?.dependencies), "updatedAt", (item) => item.status !== "blocked", true);
    checkRefs("decisions", list(taskContext?.decisions), "updatedAt", (item) => item.status === "approved", true);
    const requiredProcedures = [...list(applicationContext?.operatingModel?.applicationProcedures), ...list(applicationContext?.operatingModel?.capabilityProcedures)];
    if (requiredProcedures.some((link) => !c.procedures.items.some((item) => item.id === link?.procedureId))) add("contract.procedures", "missing");
  }
  if (issues.length) {
    const unique = [...new Map(issues.map((issue) => [`${issue.field}:${issue.reason}`, issue])).values()].slice(0, 100);
    const error = new Error("execution_packet_invalid");
    error.retryable = false;
    error.details = { schemaVersion: "roost-execution-packet-diagnostics-v1", issues: unique };
    error.publicMessage = `Execution packet rejected before process start. Correct: ${unique.map((issue) => `${issue.field} (${issue.reason})`).join(", ")}.`;
    throw error;
  }
  return packet;
}
