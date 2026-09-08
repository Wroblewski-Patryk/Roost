import type { Prisma } from "@prisma/client";

const object = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
export type RoleSubmission = { authorId: string; requestId: string };

export async function resolveTaskRoleContext(db: Prisma.TransactionClient, workspaceId: string, task: { executionReadiness: unknown; executionRoleProvenance: unknown }, contract: unknown, submission?: RoleSubmission) {
  const roles = object(object(contract).taskRoles), previous = object(task.executionRoleProvenance), pin = object(task.executionReadiness);
  const authorUserId = submission?.authorId ?? (pin.requestedByType === "user" ? pin.requestedById : null);
  let provenance = Object.keys(previous).length ? previous : null;
  if (submission) {
    const authors = [...(Array.isArray(previous.authors) ? previous.authors : []), { kind: "user", id: submission.authorId }, { kind: "agent", id: object(object(contract).assignment).agentId }];
    provenance = { schemaVersion: "roost-role-provenance-v1", requesterUserId: previous.requesterUserId ?? submission.authorId, originatingSubmissionId: previous.originatingSubmissionId ?? submission.requestId,
      authors: [...new Map(authors.map(p => [`${p.kind}:${p.id}`, p])).values()].sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`)) };
  }
  async function membership(userId: unknown) {
    if (!uuid(userId)) return null;
    const m = await db.workspaceMembership.findFirst({ where: { workspaceId, userId }, select: { id: true, userId: true, workspaceId: true, role: true, updatedAt: true } });
    return m ? { id: m.id, userId: m.userId, workspaceId: m.workspaceId, role: m.role, revision: m.updatedAt.toISOString() } : null;
  }
  const requester = await membership(object(roles.requester).id), authorMembership = await membership(authorUserId);
  async function workforce(name: string) {
    const id = object(roles[name]).id;
    if (!uuid(id)) return null;
    const item = await db.workforceEntity.findFirst({ where: { id, workspaceId }, select: { id: true, workspaceId: true, type: true, status: true, role: true, skillIndex: true, authorityScope: true, source: true, externalId: true, updatedAt: true } });
    if (!item) return null;
    const human = item.type === "human" && item.source === "user" && uuid(item.externalId);
    const principal = human ? { kind: "user", id: item.externalId } : item.type === "agent" && item.source !== "user" ? { kind: "agent", id: item.id } : null;
    return { id: item.id, workspaceId: item.workspaceId, type: item.type, status: item.status, revision: item.updatedAt.toISOString(), role: item.role,
      competencies: strings(item.skillIndex), authorityScope: strings(item.authorityScope), principal, membership: human ? await membership(item.externalId) : null };
  }
  return { requester, authorMembership, accountableManager: await workforce("accountableManager"), executor: await workforce("executor"), verifier: await workforce("verifier"), releaser: await workforce("releaser"), authorUserId, provenance };
}
