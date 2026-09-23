import { Prisma, type PrismaClient } from "@prisma/client";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { workerCredentialIntent } from "./worker-credential-contract";
import { safeWorkerCredential, WorkerCredentialError, denyWorkerCredential, type WorkerCredentialStore, type WorkerCredentialTx } from "./worker-credential.service";

export function createPrismaWorkerCredentialStore(client: PrismaClient): WorkerCredentialStore {
  return { async transaction(work) {
    try {
      return await client.$transaction(async db => {
        await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
        const tx: WorkerCredentialTx = {
          async primaryOwner(auth) {
            const w = await db.workspace.findUnique({ where: { id: auth.workspaceId } });
            return w?.ownerUserId === auth.userId && !!await db.workspaceMembership.findFirst({ where: { workspaceId: auth.workspaceId, userId: auth.userId, role: "owner" } });
          },
          async decision(input, actorId, now) {
            const row = (await db.$queryRaw<any[]>`SELECT r.version,r.body,a.actor_user_id,a.actor_agent_id,a.authority,a.created_at,decision_state(d.id) AS state
              FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id JOIN decision_acceptances a ON a.decision_id=d.id
              WHERE d.id=${input.decisionId}::uuid AND d.workspace_id=${input.intent.workspaceId}::uuid AND d.status='accepted'
              AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)`)[0];
            const declaration = workerCredentialIntent.safeParse(row?.body?.workerCredential);
            return !!row && row.version === input.decisionRevision && row.state === "accepted" && row.actor_user_id === actorId && !row.actor_agent_id
              && row.authority?.status === "owner_reserved" && new Date(row.created_at) <= now && declaration.success
              && reviewDigest(declaration.data) === reviewDigest(input.intent);
          },
          async host(intent) {
            const host = await db.agentHost.findFirst({ where: { id: intent.hostId, workspaceId: intent.workspaceId, status: { not: "disabled" } } });
            const key = await db.trustedProviderTicketKey.findUnique({ where: { workspaceId: intent.workspaceId } });
            return !!host && key?.installationId === intent.installationId;
          },
          async previous(workspaceId, requestId) {
            const op = await db.agentCredentialOperation.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId } } });
            if (!op) return null;
            const snapshot = op.snapshot as any;
            if (snapshot.credentialClass !== "worker_host_v1") denyWorkerCredential("worker_credential_request_conflict");
            const { credentialClass, decisionId, decisionRevision, intent, ...safe } = snapshot;
            return { requestHash: op.requestHash, keyId: op.keyId, snapshot: safe };
          },
          latest: (workspaceId, workerHostId) => db.apiKey.findFirst({ where: { workspaceId, workerHostId }, orderBy: { workerBindingEpoch: "desc" } }),
          async revoke(key, at) {
            const updated = await db.apiKey.updateMany({ where: { id: key.id, workspaceId: key.workspaceId, credentialVersion: key.credentialVersion, revokedAt: null },
              data: { active: false, revokedAt: at } });
            if (updated.count !== 1) denyWorkerCredential();
            return db.apiKey.findUniqueOrThrow({ where: { id: key.id } });
          },
          async insert(key) { await db.apiKey.create({ data: { ...key, scopes: key.scopes as Prisma.InputJsonValue } }); },
          async invalidate(key) { await db.$executeRaw`SELECT worker_credential_invalidate(${key.id}::uuid)`; },
          async record(input, actorUserId, requestHash, key) {
            const snapshot = { ...safeWorkerCredential(key), credentialClass: "worker_host_v1", decisionId: input.decisionId, decisionRevision: input.decisionRevision, intent: input.intent };
            await db.agentCredentialOperation.create({ data: { workspaceId: input.intent.workspaceId, requestId: input.requestId, requestHash, keyId: key.id,
              actorUserId, action: input.intent.action === "enroll" ? "create" : input.intent.action, snapshot } });
            await db.event.create({ data: { workspaceId: input.intent.workspaceId, type: `api_key.worker_${input.intent.action}`, source: "roost_api",
              actorType: "user", actorId: actorUserId, resourceType: "api_key", resourceId: key.id, payload: snapshot } });
          }
        };
        return work(tx);
      }, { isolationLevel: "Serializable", timeout: 20000, maxWait: 5000 });
    } catch (error) {
      if (error instanceof WorkerCredentialError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002"
        || error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)))) denyWorkerCredential("worker_credential_conflict");
      throw new WorkerCredentialError("worker_credential_unavailable", 503);
    }
  } };
}
