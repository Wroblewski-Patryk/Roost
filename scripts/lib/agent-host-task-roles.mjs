import { z } from "zod";

const id = z.string().uuid(), text = z.string().trim().min(1).max(2000);
const reference = z.object({ id, revision: text }).strict();
export const taskRoleNames = ["requester", "accountableManager", "executor", "verifier", "releaser"];
export const taskRolesSchema = z.object({ schemaVersion: z.literal("roost-task-roles-v1"), ...Object.fromEntries(taskRoleNames.map(name => [name, reference])) }).strict();
export const roleProvenanceSchema = z.object({ schemaVersion: z.literal("roost-role-provenance-v1"), requesterUserId: id, originatingSubmissionId: id,
  authors: z.array(z.object({ kind: z.enum(["user", "agent"]), id }).strict()).min(1).max(1000) }).strict();
const member = z.object({ id, userId: id, workspaceId: id, role: text, revision: text }).strict();
const workforce = z.object({ id, workspaceId: id, type: text, status: text, revision: text, role: z.string().nullable(),
  competencies: z.array(z.string()), authorityScope: z.array(z.string()), principal: z.object({ kind: z.enum(["user", "agent"]), id }).strict().nullable(), membership: member.nullable() }).strict();
export const roleAuthoritiesSchema = z.object({ requester: member.nullable(), accountableManager: workforce.nullable(), executor: workforce.nullable(), verifier: workforce.nullable(), releaser: workforce.nullable(),
  authorUserId: id.nullable(), authorMembership: member.nullable(), provenance: roleProvenanceSchema.nullable(),
  verifierQualification: z.object({ id, taskId: id, executorId: id, executorRevision: text,
    verifierId: id, verifierRevision: text, competency: z.literal("application audit"),
    checklistDecisionId: id, procedureId: id, procedureVersion: z.number().int().positive(),
    contractSnapshot: z.record(z.string(), z.unknown()), validUntil: z.string().datetime() }).strict().nullable().optional() }).strict();
const same = (a, b) => a && b && a.kind === b.kind && a.id === b.id;
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value)
    .filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => [key, canonical(entry)])) : value;
export function taskRoleIssues(contract, packet, claimed) {
  const roles = contract.taskRoles, authorities = packet.roleAuthorities, issues = [];
  const add = (name, reason) => issues.push({ field: `contract.taskRoles.${name}`, reason });
  const validMember = m => m && m.workspaceId === claimed.workspaceId && ["owner", "admin", "member"].includes(m.role);
  const provenance = authorities.provenance;
  const qualification = authorities.verifierQualification;
  const checklist = contract.procedures?.items?.length === 1 && contract.procedures.items[0].id === qualification?.procedureId
    && contract.procedures.items[0].revision === String(qualification?.procedureVersion);
  const qualifiedVerifier = contract.executionClass === "roost-company-information-runtime-v1"
    && qualification && contract.singleTask?.contractId === `roost-task:${qualification.taskId}`
    && (!claimed.taskId || claimed.taskId === qualification.taskId)
    && qualification.executorId === roles.executor?.id
    && qualification.executorRevision === roles.executor?.revision
    && qualification.verifierId === roles.verifier?.id
    && qualification.verifierRevision === roles.verifier?.revision
    && Number.isFinite(Date.parse(qualification.validUntil)) && Date.parse(qualification.validUntil) > Date.now()
    && checklist && JSON.stringify(canonical(contract)) === JSON.stringify(canonical(qualification.contractSnapshot))
    && authorities.verifier?.competencies.includes(qualification.competency);
  if (!validMember(authorities.authorMembership) || authorities.authorMembership.userId !== authorities.authorUserId) add("requester", "author_membership_required");
  if (!provenance || roles.requester.id !== provenance.requesterUserId || !authorities.authorUserId ||
    !provenance.authors.some(p => same(p, { kind: "user", id: authorities.authorUserId })) ||
    !provenance.authors.some(p => same(p, { kind: "agent", id: roles.executor.id }))) add("requester", "provenance_required");
  if (!validMember(authorities.requester) || authorities.requester.userId !== roles.requester.id) add("requester", "membership_required");
  else if (authorities.requester.revision !== roles.requester.revision) add("requester", "stale");
  for (const name of taskRoleNames.slice(1)) {
    const current = authorities[name];
    if (!current || current.id !== roles[name].id || current.workspaceId !== claimed.workspaceId || current.status !== "active" ||
      !current.principal || !current.role?.trim() || !["human", "agent"].includes(current.type) ||
      current.type === "human" && (!validMember(current.membership) || current.principal.kind !== "user" || current.membership.userId !== current.principal.id) ||
      current.type === "agent" && (current.principal.kind !== "agent" || current.principal.id !== current.id)) { add(name, "identity_or_role_required"); continue; }
    if (current.revision !== roles[name].revision) add(name, "stale");
    const mandate = { accountableManager: "task_accountability", verifier: "task_verification", releaser: "release_authorization" }[name];
    if (mandate && !current.authorityScope.includes(mandate)) add(name, "authority_required");
    if (["executor", "verifier"].includes(name) && contract.assignment.competencies.some(skill => !current.competencies.includes(skill))
      && !(name === "verifier" && qualifiedVerifier)) add(name, "competencies_required");
  }
  if (roles.accountableManager.id !== contract.singleTask.accountableManager.id || roles.accountableManager.revision !== contract.singleTask.accountableManager.revision) add("accountableManager", "scope_mismatch");
  if (roles.executor.id !== contract.assignment.agentId || authorities.executor?.type !== "agent") add("executor", "assignment_mismatch");
  const authors = provenance?.authors ?? [];
  if (authorities.verifier?.principal && (authors.some(p => same(p, authorities.verifier.principal)) || same(authorities.verifier.principal, authorities.executor?.principal))) add("verifier", "self_review");
  if (authorities.releaser?.principal && (authors.some(p => same(p, authorities.releaser.principal)) || same(authorities.releaser.principal, authorities.executor?.principal))) add("releaser", "self_release");
  return issues;
}
