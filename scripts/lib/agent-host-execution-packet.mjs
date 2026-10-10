import { typedOperationSchema, nativeBoundaryContractSchema } from "./agent-host-native-authority.mjs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeGitRemote } from "./agent-host-workspace-guard.mjs";
import { nativeRelative } from "./agent-host-native-footprint.mjs";
import { taskModelSelectionSchema } from "./agent-host-model-policy.mjs";
import releaseInspectionContract from './agent-host-release-inspection-contract.cjs';
export { codexEditorModels } from "./agent-host-model-policy.mjs";
import { singleTaskSchema, singleTaskIssues } from "./agent-host-single-task.mjs";
import { taskRolesSchema, roleAuthoritiesSchema, taskRoleIssues } from "./agent-host-task-roles.mjs";

const text = z.string().trim().min(1).max(2000);
const texts = z.array(text).min(1).max(30);
const id = z.string().uuid();
const ref = z.object({ id, revision: text }).strict();
const refs = z.array(ref).min(1).max(10);
const optionalSet = (item) => z.object({ items: z.array(item).max(30), noneReason: text.nullable() }).strict()
  .refine((value) => value.items.length ? value.noneReason === null : Boolean(value.noneReason));
const operations = typedOperationSchema;
export const readFragmentSchema = z.object({ path: z.string().min(1).max(512),
  startLine: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), endLine: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }).strict()
  .refine(value => value.endLine >= value.startLine && value.endLine - value.startLine < 200);
const readSelections = (boundary, context) => {
  if (boundary.releaseInspection && boundary.inspectReadOnly.kind !== 'auditor')
    context.addIssue({ code: 'custom', path: ['releaseInspection'], message: 'release_inspection_requires_readonly_auditor' });
  const paths = boundary.readPaths, fragments = boundary.readFragments ?? [];
  if (paths.length + fragments.length < 1 || paths.length + fragments.length > 32)
    context.addIssue({ code: 'custom', path: ['readPaths'], message: 'invalid_read_selection_count' });
  const canonical = value => nativeRelative(value).toLowerCase();
  try {
    const whole = paths.map(canonical);
    if (new Set(whole).size !== whole.length) throw new Error();
    for (const [index, fragment] of fragments.entries()) {
      const name = canonical(fragment.path);
      if (whole.includes(name) || fragments.slice(0, index).some(other => canonical(other.path) === name
        && fragment.startLine <= other.endLine && other.startLine <= fragment.endLine)) throw new Error();
    }
  } catch { context.addIssue({ code: 'custom', path: ['readPaths'], message: 'invalid_read_selection' }); }
};
const readonlyBoundary = z.object({ profile: z.literal('inspect-readonly'),
  releaseInspection: releaseInspectionContract.releaseInspectionSchema.optional(),
  readPaths: z.array(z.string().min(1).max(512)).max(32),
  readFragments: z.array(readFragmentSchema).max(32).optional(),
  runtime: z.object({ required: z.literal(false), ports: z.tuple([]) }).strict(),
  inspectReadOnly: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('auditor') }).strict(),
    z.object({ kind: z.literal('verifier'), verifiedExecutionId: id,
      verifiedEvidenceDigest: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
    z.object({ kind: z.literal('code-reviewer'), verifiedTaskId: id, verifiedExecutionId: id,
      verifiedEvidenceDigest: z.string().regex(/^[a-f0-9]{64}$/),
      baselineCommit: z.string().regex(/^[a-f0-9]{40}$/), reviewedCommit: z.string().regex(/^[a-f0-9]{40}$/),
      priorAudit: z.object({ executionId: id, receiptDigest: z.string().regex(/^[a-f0-9]{64}$/) }).strict().optional() }).strict()
  ]) }).strict();
export const executionContractSchema = z.object({
  executionClass: z.literal("roost-fixed-effect-v1").optional(),
  version: text,
  nativeBoundary: z.union([nativeBoundaryContractSchema, readonlyBoundary.superRefine(readSelections)]).optional(),
  singleTask: singleTaskSchema,
  taskRoles: taskRolesSchema,
  objective: z.object({ outcome: text, goalId: id }).strict(),
  scope: z.object({ allowed: texts, forbidden: texts }).strict(),
  assignment: z.object({ agentId: id, role: text, competencies: texts }).strict(),
  modelSelection: taskModelSelectionSchema,
  context: z.object({ company: refs, product: refs, technical: refs }).strict(),
  procedures: optionalSet(ref),
  skills: optionalSet(z.object({ name: text, version: text }).strict()),
  access: z.object({ tools: z.array(operations).min(1).max(6), permissions: z.array(operations).min(1).max(6),
    sandbox: z.enum(["workspace-write", "read-only"]), externalWrites: z.literal(false), restrictions: texts }).strict(),
  dependencies: optionalSet(ref.extend({ resolution: z.literal("satisfied"), evidence: text })),
  decisions: optionalSet(ref),
  budgets: z.object({ maxAttempts: z.number().int().min(1).max(5), maxDurationSeconds: z.number().int().min(60).max(3600), maxOutputTokens: z.number().int().min(128).max(100000) }).strict(),
  acceptance: z.object({ criteria: texts, tests: texts, evidence: texts }).strict(),
  recovery: z.object({ handoff: text, failure: text, escalation: text,
    rollback: z.object({ mode: z.enum(["restore_task_changes", "not_applicable"]), instructions: text }).strict() }).strict()
}).strict();

// Editor migration may retain validated legacy fields, but admission never uses this schema.
export const executionEditorContractSchema = executionContractSchema.extend({
  singleTask: singleTaskSchema.extend({ measurement: singleTaskSchema.shape.measurement.extend({ metric: z.string().max(2000), unit: z.string().max(2000), method: z.string().max(2000) }) }).optional(),
  taskRoles: taskRolesSchema.optional()
});

// Preparation is a separate task class, not a repository contract with missing
// fields. It grants no tools and cannot activate a model/runtime in G6a.
export const companyInformationClass = "roost-company-information-v1";
export const companyInformationRuntimeClass = "roost-company-information-runtime-v1";
export const companyInformationContractSchema = executionContractSchema.omit({ nativeBoundary: true }).extend({
  executionClass: z.literal(companyInformationClass),
  singleTask: singleTaskSchema.extend({ applicationId: z.literal(null), component: z.literal(null), branch: z.literal(null),
    problems: z.array(z.object({ statement: text, componentId: z.literal(null), outcome: text, causalLink: z.literal(null) }).strict()).min(1).max(1),
    commonCause: z.literal(null) }),
  context: z.object({ company: refs, product: z.tuple([]), technical: z.tuple([]) }).strict(),
  access: z.object({ tools: z.tuple([]), permissions: z.tuple([]), sandbox: z.literal("read-only"), externalWrites: z.literal(false), restrictions: texts }).strict(),
  recovery: executionContractSchema.shape.recovery.extend({ rollback: z.object({ mode: z.literal("not_applicable"), instructions: text }).strict() })
}).strict();

export const companyInformationRuntimeContractSchema = companyInformationContractSchema.extend({
  executionClass: z.literal(companyInformationRuntimeClass),
  budgets: companyInformationContractSchema.shape.budgets.extend({ maxAttempts: z.literal(1), maxDurationSeconds: z.number().int().min(60).max(1800) })
}).strict();
export const companyInformationRuntimeModelAllowed = model => model?.schemaVersion === "roost-managed-hermes-backend-v1"
  && model.backend === "codex_responses" && model.riskClass === "low" && model.attemptPolicy?.maxTurns === 1 && model.attemptPolicy?.apiMaxRetries === 0;

const packetSchema = z.object({
  schemaVersion: z.literal("roost-execution-packet-v1"), revision: z.string().regex(/^[a-f0-9]{64}$/),
  identity: z.object({ executionId: id, workspaceId: id, taskId: id, applicationId: id, agentId: id }).strict(),
  taskRevision: text, contract: executionContractSchema,
  procedureComposition: z.record(z.unknown()),
  roleAuthorities: roleAuthoritiesSchema,
  scopeAuthorities: z.object({
    component: z.object({ id, applicationId: id, status: text, revision: text }).strict().nullable(),
    manager: z.object({ id, workspaceId: id, status: text, revision: text }).strict().nullable()
  }).strict(),
  sources: z.array(z.object({ id, workspaceId: id, applicationId: id.nullable(), recordType: text, title: text,
    description: z.string().nullable(), businessPurpose: z.string().nullable(), desiredState: z.string().nullable(), expectedBehavior: z.string().nullable(), revision: text }).strict()).max(30)
}).strict();

const companyPacketSchema = packetSchema.extend({
  contract: companyInformationContractSchema,
  identity: packetSchema.shape.identity.extend({ applicationId: z.literal(null) }),
  scopeAuthorities: packetSchema.shape.scopeAuthorities.extend({ component: z.literal(null) })
});
const companyRuntimePacketSchema = companyPacketSchema.extend({ contract: companyInformationRuntimeContractSchema });

const list = (value) => Array.isArray(value) ? value : [];
export function validateExecutionPacket(packet, claimed, taskContext, applicationContext, options = {}) {
  const issues = [];
  const add = (field, reason) => issues.push({ field, reason });
  const runtime = packet?.contract?.executionClass === companyInformationRuntimeClass;
  const company = packet?.contract?.executionClass === companyInformationClass || runtime;
  const parsed = (runtime ? companyRuntimePacketSchema : company ? companyPacketSchema : packetSchema).safeParse(packet);
  if (!parsed.success) {
    // Never forward Zod messages, input values, unknown property names or raw payloads.
    for (const issue of parsed.error.issues) {
      const missing = issue.code === "invalid_type" && issue.received === "undefined"
        || issue.code === "invalid_union" && issue.path.reduce((value, key) => value?.[key], packet) === undefined;
      add(issue.path.join(".") || "packet", missing ? "missing" : "invalid");
    }
  } else {
    const p = parsed.data, c = p.contract, task = taskContext?.task, agent = task?.assignedWorkforceEntity;
    if ([...c.access.tools, ...c.access.permissions].some(op => ["local_commit", "remote_push", "deployment"].includes(op)))
      add("contract.access", "separate_finalization_or_release_stage_required");
    const inspect = c.nativeBoundary?.profile === "inspect-readonly";
    if (inspect && (c.access.sandbox !== "read-only" || c.access.tools.length !== 1 || c.access.tools[0] !== "repository_read"
      || c.access.permissions.length !== 1 || c.access.permissions[0] !== "repository_read")) add("contract.access", "readonly_authority_required");
    if (inspect) for (const entry of c.nativeBoundary.readPaths) {
      try { nativeRelative(entry); } catch { add("contract.nativeBoundary.readPaths", "invalid"); }
    }
    if (!company && !inspect && c.access.sandbox !== "workspace-write") add("contract.access.sandbox", "coding_sandbox_required");
    const composition=p.procedureComposition;
    if (company) {
      if (runtime && !companyInformationRuntimeModelAllowed(c.modelSelection)) add("contract.modelSelection", "company_runtime_policy_invalid");
      if (claimed?.applicationId !== null || claimed?.application != null || claimed?.baseBranch != null || Object.keys(applicationContext ?? {}).length) add("identity.applicationId", "company_scope_required");
      if (!runtime && claimed?.status !== undefined && claimed.status !== "queued" || runtime && claimed?.status !== undefined && !["queued", "claimed", "running"].includes(claimed.status)) add("identity.executionId", "company_stage_invalid");
      if (claimed?.status === "queued" && (claimed.attempt !== 0 || claimed.agentHostId != null || claimed.leaseToken != null || claimed.leaseExpiresAt != null || claimed.startedAt != null || claimed.metadata?.readyContextPin?.preparationOnly !== !runtime || claimed.metadata?.readyContextPin?.modelExecutionQualified !== runtime)) add("identity.executionId", "company_stage_invalid");
      if (runtime && ["claimed", "running"].includes(claimed?.status) && (claimed.attempt !== 1 || !claimed.agentHostId || !claimed.leaseToken || !Number.isFinite(Date.parse(claimed.startedAt)) || Date.parse(claimed.leaseExpiresAt) <= Date.now())) add("identity.executionId", "company_lease_invalid");
      if (composition.algorithm !== (runtime ? companyInformationRuntimeClass : "roost-company-information-preparation-v1") || composition.preparationOnly !== !runtime || composition.modelExecutionQualified !== runtime) add("procedureComposition", "company_stage_invalid");
      const selected = c.context.company.map(item => item.id);
      if (p.sources.length !== selected.length || new Set(selected).size !== selected.length || p.sources.some(item => !selected.includes(item.id))) add("sources", "exact_selection_required");
    }
    if(!company && !options.allowUncomposed && (composition.algorithm!=="roost-procedure-composition-v1" || composition.status!=="composed" || !/^[a-f0-9]{64}$/.test(composition.seal??"") || composition.operation!=="runtime_execute" || composition.applicationId!==claimed?.applicationId || !Array.isArray(composition.missing) || composition.missing.length || !Array.isArray(composition.conflicts) || composition.conflicts.length)) add("procedureComposition","missing_or_conflicting");
    if((!options.allowUncomposed || composition.status==="composed") && c.access.tools.some(tool=>!composition.fields?.tools?.includes(tool)))add("procedureComposition.tools","outside_composed_authority");
    issues.push(...singleTaskIssues(c, p, claimed));
    issues.push(...taskRoleIssues(c, p, claimed));
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
    if (!company) {
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
    }
    if (c.objective.goalId !== task?.goalId || task?.goal?.id !== c.objective.goalId || task?.goal?.workspaceId !== p.identity.workspaceId) add("contract.objective.goalId", "mismatch");
    if (c.assignment.agentId !== p.identity.agentId || agent?.id !== p.identity.agentId || agent?.workspaceId !== p.identity.workspaceId || agent?.type !== "agent" || agent?.status !== "active") add("contract.assignment.agentId", "mismatch");
    if (c.assignment.role !== agent?.role) add("contract.assignment.role", "mismatch");
    if (c.assignment.competencies.some((name) => !list(agent?.skillIndex).includes(name))) add("contract.assignment.competencies", "unavailable");
    if (c.access.tools.some((name) => !list(agent?.toolIndex).includes(name))) add("contract.access.tools", "unavailable");
    if (c.access.permissions.some((name) => !list(agent?.authorityScope).includes(name)) || c.access.tools.some((name) => !c.access.permissions.includes(name))) add("contract.access.permissions", "unavailable");
    if (c.scope.allowed.some((entry) => c.scope.forbidden.some((other) => other.toLowerCase() === entry.toLowerCase()))) add("contract.scope", "mismatch");
    if (c.access.permissions.includes("repository_write") && c.recovery.rollback.mode !== "restore_task_changes") add("contract.recovery.rollback", "mismatch");
    const preparing = company && claimed?.status === "queued" && claimed?.attempt === 0 && claimed?.metadata?.readyContextPin?.preparationOnly === !runtime;
    if (!Number.isInteger(claimed?.attempt) || claimed.attempt < 1 && !preparing || claimed.attempt > c.budgets.maxAttempts) add("contract.budgets.maxAttempts", "blocked");
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
    checkRefs("decisions", list(taskContext?.decisions), "updatedAt", (item) => item.status === "approved" || item.status === "accepted" && item.source === "roost_decision", true);
    const requiredProcedures = [...list(applicationContext?.operatingModel?.applicationProcedures), ...list(applicationContext?.operatingModel?.capabilityProcedures)]
      .filter(link => link?.required !== false);
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
