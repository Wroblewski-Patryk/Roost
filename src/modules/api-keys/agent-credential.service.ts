import { z } from "zod";
import { prisma } from "../../db/prisma";
import { generateApiKey, hashApiKey, apiKeyPrefix } from "../../auth/api-key";
import { agentPrincipalScopes } from "../../auth/agent-principal";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { readyTransaction } from "../agent-runtime/task-execution-readiness";

export const createAgentCredentialSchema = z.object({ requestId: z.string().uuid(), agentId: z.string().uuid(), name: z.string().trim().min(1).max(120), expiresAt: z.string().datetime() }).strict();
export const changeAgentCredentialSchema = z.object({ requestId: z.string().uuid(), expectedVersion: z.number().int().positive(), expiresAt: z.string().datetime().optional() }).strict();
export function safeCredential(k: any) {
  return { id: k.id, name: k.name, agentId: k.boundAgentId, agentName: k.boundAgent?.name, agentStatus: k.boundAgent?.status,
    keyPrefix: k.keyPrefix, scopes: k.scopes, active: k.active, revokedAt: k.revokedAt, expiresAt: k.expiresAt, version: k.credentialVersion,
    lastUsedAt: k.lastUsedAt, createdAt: k.createdAt };
}

export async function agentCredentialCommand(workspaceId: string, actorUserId: string, action: "create" | "rotate" | "revoke", keyId: string | null, body: unknown) {
  const input = action === "create" ? createAgentCredentialSchema.parse(body) : changeAgentCredentialSchema.parse(body);
  if (action === "revoke" && input.expiresAt) return { error: "credential_invalid_expiry" };
  const requestHash = reviewDigest({ input, action, keyId, actorUserId });
  return readyTransaction(async tx => {
    await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
    if (!await tx.workspaceMembership.findFirst({ where: { workspaceId, userId: actorUserId, role: { in: ["owner", "admin"] } } })) return { error: "credential_forbidden" };
    const previous = await tx.agentCredentialOperation.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: input.requestId } }, include: { key: { include: { boundAgent: true } } } });
    // Secret delivery is one-time. Durable retries reveal metadata only; rotate to recover a lost response.
    if (previous) return previous.requestHash === requestHash ? { ...safeCredential(previous.key), key: null, replayed: true } : { error: "credential_request_conflict" };
    const existing = keyId ? await tx.apiKey.findFirst({ where: { id: keyId, workspaceId, boundAgentId: { not: null } }, include: { boundAgent: true } }) : null;
    if (action !== "create" && !existing) return { error: "credential_not_found" };
    if (existing && "expectedVersion" in input && existing.credentialVersion !== input.expectedVersion) return { error: "credential_stale" };
    const agentId = "agentId" in input ? input.agentId : existing!.boundAgentId!;
    const agent = await tx.workforceEntity.findFirst({ where: { id: agentId, workspaceId, type: "agent", source: { not: "user" }, status: "active" } });
    if (action !== "revoke" && !agent) return { error: "credential_agent_inactive" };
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (action !== "revoke" && (!expiresAt || expiresAt <= new Date() || expiresAt.getTime() > Date.now() + 366 * 86400000)) return { error: "credential_invalid_expiry" };
    if (action === "create" && await tx.apiKey.findFirst({ where: { workspaceId, boundAgentId: agentId, active: true, revokedAt: null } })) return { error: "credential_already_bound" };
    if (action === "rotate" && (!existing!.active || existing!.revokedAt)) return { error: "credential_revoked" };
    let record = existing;
    if (existing && !existing.revokedAt) record = await tx.apiKey.update({ where: { id: existing.id }, data: { active: false, revokedAt: new Date(), credentialVersion: { increment: 1 } }, include: { boundAgent: true } });
    const rawKey = action === "revoke" ? null : generateApiKey();
    if (rawKey) record = await tx.apiKey.create({ data: { workspaceId, boundAgentId: agentId, name: "name" in input ? input.name : existing!.name,
      keyHash: hashApiKey(rawKey), keyPrefix: apiKeyPrefix(rawKey), scopes: agentPrincipalScopes, expiresAt }, include: { boundAgent: true } });
    const snapshot = { ...safeCredential(record), previousKeyId: existing?.id ?? null };
    await tx.agentCredentialOperation.create({ data: { workspaceId, requestId: input.requestId, requestHash, keyId: record!.id, actorUserId, action, snapshot: JSON.parse(JSON.stringify(snapshot)) } });
    await tx.event.create({ data: { workspaceId, type: `api_key.agent_${action}`, actorType: "user", actorId: actorUserId, source: "roost_api", resourceType: "api_key", resourceId: record!.id,
      payload: { agentId, credentialId: record!.id, credentialPrefix: record!.keyPrefix, previousCredentialId: existing?.id ?? null, requestId: input.requestId } } });
    return { ...safeCredential(record), key: rawKey, replayed: false };
  });
}

export async function agentCredentialCatalog(workspaceId: string) {
  const [keys, agents] = await Promise.all([
    prisma.apiKey.findMany({ where: { workspaceId, boundAgentId: { not: null } }, include: { boundAgent: true }, orderBy: { createdAt: "desc" }, take: 501 }),
    prisma.workforceEntity.findMany({ where: { workspaceId, type: "agent", source: { not: "user" } }, select: { id: true, name: true, status: true }, orderBy: { name: "asc" }, take: 501 })
  ]);
  return { credentials: keys.slice(0, 500).map(safeCredential), agents: agents.slice(0, 500), truncated: keys.length > 500 || agents.length > 500 };
}
