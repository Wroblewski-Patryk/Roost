import { Prisma, type PrismaClient } from "@prisma/client";
import { workerCredentialTransaction } from "./worker-credential-store";
import { WorkerCredentialError } from "./worker-credential.service";
import type { WorkerHandoff, WorkerHandoffStore } from "./worker-handoff.service";

const columns = { requestId: "id", workspaceId: "workspace_id", installationId: "installation_id", hostId: "host_id",
  hostFingerprint: "host_fingerprint", deviceSecretHash: "device_secret_hash", challengeHash: "challenge_hash",
  requestDigest: "request_digest", userCodeHash: "user_code_hash", origin: "origin", certificateFingerprint: "certificate_fingerprint",
  replacesRequestId: "replaces_request_id", creatorUserId: "creator_user_id", state: "state", badAttempts: "bad_attempts",
  polls: "polls", nextPollAt: "next_poll_at", ownerId: "owner_user_id", ownerAuthTime: "owner_auth_time", command: "approval_command",
  credentialId: "credential_id", responseDigest: "response_digest", spentAt: "spent_at", ackDeadline: "ack_deadline",
  acknowledgedAt: "acknowledged_at", createdAt: "created_at", expiresAt: "expires_at" } as const;
const projection = Prisma.raw(Object.entries(columns).map(([key, column]) => `${column} AS "${key}"`).join(","));
function decode(row: any): WorkerHandoff { return { ...row, ownerAuthTime: row.ownerAuthTime === null ? null : Number(row.ownerAuthTime) }; }

// Explicitly injected by qualification only; application composition stays closed.
export function createPrismaWorkerHandoffStore(client: PrismaClient): WorkerHandoffStore {
  return {
    async readHandoff(id) {
      const rows = await client.$queryRaw<any[]>(Prisma.sql`SELECT ${projection} FROM worker_credential_handoffs WHERE id=${id}::uuid`);
      return rows[0] ? decode(rows[0]) : null;
    },
    async transaction(work) {
    try {
      // The existing global Ready fence serializes transitions; conflicts never
      // retry callbacks or synthetic secret generation.
      return await client.$transaction(async db => {
        await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
        return work({ ...workerCredentialTransaction(db),
          async handoff(id) { const rows = await db.$queryRaw<any[]>(Prisma.sql`SELECT ${projection} FROM worker_credential_handoffs WHERE id=${id}::uuid`); return rows[0] ? decode(rows[0]) : null; },
          async recentHandoffs(workspace, host, since) { return (await db.$queryRaw<any[]>(Prisma.sql`SELECT ${projection} FROM worker_credential_handoffs WHERE workspace_id=${workspace}::uuid AND host_id=${host}::uuid AND created_at>=${since}`)).map(decode); },
          async saveHandoff(row) {
            const entries = Object.entries(columns) as [keyof WorkerHandoff, string][];
            const values = entries.map(([key, column]) => {
              const value = row[key];
              if (key === "command") return Prisma.sql`${value === null ? null : JSON.stringify(value)}::jsonb`;
              if (column === "id" || column.endsWith("_id")) return Prisma.sql`${value}::uuid`;
              return Prisma.sql`${value}`;
            });
            const exists = await db.$queryRaw<any[]>`SELECT id FROM worker_credential_handoffs WHERE id=${row.requestId}::uuid`;
            if (exists.length) await db.$executeRaw(Prisma.sql`UPDATE worker_credential_handoffs SET ${Prisma.join(entries.slice(1).map((e, i) => Prisma.sql`${Prisma.raw(e[1])}=${values[i+1]}`))} WHERE id=${row.requestId}::uuid`);
            else await db.$executeRaw(Prisma.sql`INSERT INTO worker_credential_handoffs (${Prisma.raw(entries.map(e => e[1]).join(","))}) VALUES (${Prisma.join(values)})`);
          },
          credential: id => db.apiKey.findUnique({ where: { id } }),
          activate: (key, at) => db.apiKey.update({ where: { id: key.id }, data: { active: true, updatedAt: at } }),
          async handoffAudit(row, event) { await db.event.create({ data: { workspaceId: row.workspaceId, type: `api_key.worker_handoff_${event}`,
            source: "roost_api", actorType: row.ownerId ? "user" : "system", actorId: row.ownerId, resourceType: "worker_handoff", resourceId: row.requestId,
            payload: { requestId: row.requestId, state: row.state, credentialId: row.credentialId, deliverySpent: !!row.spentAt, launchAuthority: false } } }); }
        });
      }, { isolationLevel: "Serializable", timeout: 20000, maxWait: 10000 });
    } catch (e) {
      if ((e as any)?.name === "ZodError") throw e;
      if (e instanceof WorkerCredentialError) throw e;
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2034" || e.code === "P2002" || e.code === "P2010" && ["40001", "40P01"].includes(String(e.meta?.code))))
        throw new WorkerCredentialError("worker_handoff_conflict", 409);
      throw new WorkerCredentialError("worker_handoff_unavailable", 503);
    }
  } };
}
