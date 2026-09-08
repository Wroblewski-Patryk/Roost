import type { Prisma } from "@prisma/client";
import type { AuthContext } from "./api-key.middleware";

// This credential class grants only the native review workflow, never host or release execution.
export const agentPrincipalScopes = ["connection:read", "tasks:read", "workforce:read", "agent-runtime:read", "agent-runtime:write"];
export function agentPrincipalRoute(method: string, path: string) {
  const route = path.replace(/^\/v1(?=\/)/, "");
  return method === "GET" && (route === "/connection" || route === "/tasks" || /^\/tasks\/[a-f0-9-]+$/i.test(route) || route === "/workforce" || /^\/agent-runtime\/tasks\/[a-f0-9-]+\/review$/i.test(route)) ||
    method === "POST" && /^\/agent-runtime\/tasks\/[a-f0-9-]+\/actions\/review(?:-return)?$/i.test(route);
}
export type ReviewActor = string | AuthContext | undefined;
export async function resolveReviewPrincipal(db: Prisma.TransactionClient, workspaceId: string, actor: ReviewActor) {
  const auth = typeof actor === "string" ? { authType: "user", userId: actor } : actor;
  if (auth?.authType === "user" && auth.userId) {
    const member = await db.workspaceMembership.findFirst({ where: { workspaceId, userId: auth.userId, role: { in: ["owner", "admin", "member"] } } });
    return member ? { kind: "user" as const, id: member.userId, credentialId: null, credentialPrefix: null } : null;
  }
  if (!auth || !("agentId" in auth) || !auth.agentId || !auth.apiKeyId || auth.workspaceId !== workspaceId) return null;
  await db.$queryRaw`SELECT id FROM api_keys WHERE id=${auth.apiKeyId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
  const key = await db.apiKey.findFirst({ where: { id: auth.apiKeyId, workspaceId }, include: { boundAgent: true } });
  const worker = key?.boundAgent;
  if (!key?.active || key.revokedAt || !key.expiresAt || key.expiresAt <= new Date() || key.credentialVersion !== auth.credentialVersion ||
    key.boundAgentId !== auth.agentId || worker?.workspaceId !== workspaceId || worker.type !== "agent" || worker.status !== "active" || worker.source === "user" ||
    !Array.isArray(key.scopes) || !key.scopes.includes("agent-runtime:write")) return null;
  return { kind: "agent" as const, id: worker.id, credentialId: key.id, credentialPrefix: key.keyPrefix };
}
