import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { AuthContext } from '../../auth/api-key.middleware';
import { freshWorkerOwner } from './worker-credential.service';
import { issuerMaterial } from './bootstrap-issuer-contract';

const inputSchema = z.object({
  installationId: z.string().uuid(),
  material: issuerMaterial
}).strict();

/** Install the public anchor once. Private signing material never enters this API. */
export async function provisionBootstrapInstallation(client: PrismaClient, auth: AuthContext, input: unknown, now = new Date()) {
  const value = inputSchema.parse(input);
  if (!freshWorkerOwner(auth, now)) throw new Error('bootstrap_installation_owner_required');
  return client.$transaction(async tx => {
    await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
    const workspace = await tx.workspace.findUnique({ where: { id: auth.workspaceId }, select: { ownerUserId: true } });
    const member = await tx.workspaceMembership.findFirst({ where: { workspaceId: auth.workspaceId, userId: auth.userId!, role: 'owner' } });
    if (workspace?.ownerUserId !== auth.userId || !member) throw new Error('bootstrap_installation_owner_required');
    const existing = await tx.trustedProviderTicketKey.findUnique({ where: { workspaceId: auth.workspaceId } });
    if (existing) {
      if (existing.installationId !== value.installationId || existing.keyId !== value.material.keyId
        || existing.publicKeyDigest !== value.material.publicKeyDigest || existing.epoch !== 1)
        throw new Error('bootstrap_installation_conflict');
      return { installationId: existing.installationId, keyId: existing.keyId, epoch: existing.epoch,
        publicKeyDigest: existing.publicKeyDigest, replayed: true };
    }
    const anchor = await tx.trustedProviderTicketKey.create({ data: { workspaceId: auth.workspaceId,
      installationId: value.installationId, keyId: value.material.keyId, epoch: 1,
      publicKeyDigest: value.material.publicKeyDigest } });
    await tx.event.create({ data: { workspaceId: auth.workspaceId, type: 'bootstrap_installation_anchor_created',
      source: 'roost_api', actorType: 'user', actorId: auth.userId, resourceType: 'workspace',
      resourceId: auth.workspaceId, payload: { installationId: anchor.installationId, keyId: anchor.keyId,
        epoch: anchor.epoch, publicKeyDigest: anchor.publicKeyDigest } } });
    return { installationId: anchor.installationId, keyId: anchor.keyId, epoch: anchor.epoch,
      publicKeyDigest: anchor.publicKeyDigest, replayed: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
}
