import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { apiKeyPrefix, generateApiKey, hashApiKey } from "../../auth/api-key";

type KeyActor = { actorType: "user" | "agent" | "system"; actorId?: string | null; source: string };

export async function createAuditedApiKey(input: KeyActor & { workspaceId: string; name: string; scopes: string[]; profileId: string | null; rejectActiveName?: boolean }) {
  const rawKey = generateApiKey();
  const record = await prisma.$transaction(async (tx) => {
    if (input.rejectActiveName && await tx.apiKey.findFirst({ where: { workspaceId: input.workspaceId, name: input.name, active: true } })) throw new Error("active_key_already_exists");
    const created = await tx.apiKey.create({ data: {
      workspaceId: input.workspaceId, name: input.name, key: null,
      keyHash: hashApiKey(rawKey), keyPrefix: apiKeyPrefix(rawKey), scopes: input.scopes, active: true
    } });
    await tx.event.create({ data: {
      workspaceId: input.workspaceId, type: "api_key.created", source: input.source,
      actorType: input.actorType, actorId: input.actorId, resourceType: "api_key", resourceId: created.id,
      payload: { profileId: input.profileId, scopes: input.scopes, active: true }
    } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { record, rawKey };
}

export async function setAuditedApiKeyActive(input: KeyActor & { workspaceId: string; id: string; active: boolean }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.apiKey.findFirstOrThrow({ where: { id: input.id, workspaceId: input.workspaceId } });
    const updated = await tx.apiKey.update({ where: { id: existing.id }, data: { active: input.active } });
    await tx.event.create({ data: {
      workspaceId: input.workspaceId, type: input.active ? "api_key.activated" : "api_key.revoked", source: input.source,
      actorType: input.actorType, actorId: input.actorId, resourceType: "api_key", resourceId: updated.id, payload: { active: input.active }
    } });
    return updated;
  });
}
