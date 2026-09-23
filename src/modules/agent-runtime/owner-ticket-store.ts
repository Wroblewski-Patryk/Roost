import { Prisma, type PrismaClient, type AgentExecution } from "@prisma/client";
import { createHash } from "node:crypto";
import type { AuthContext } from "../../auth/api-key.middleware";
import { inspectReady, lockReadyTask } from "./task-execution-readiness";
import { OwnerTicketError, ticketBlocked, ticketHash, type OwnerTicketStore, type OwnerTicketTx, type TicketContext, type TicketRow } from "./owner-ticket";

type Db = Prisma.TransactionClient;
const fixed = require("../../../scripts/lib/agent-host-fixed-program.cjs");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
// Same bytes as prepareFixedExecution.runtime.claimDigest, not a new authority.
export function ownerTicketClaimDigest(execution: Pick<AgentExecution, "id" | "attempt" | "leaseToken" | "startedAt">, inputSeal: string, readyRevision: string) {
  if (!execution.leaseToken || !execution.startedAt) ticketBlocked();
  return sha(JSON.stringify({ input: inputSeal, ready: readyRevision, claim: { id: execution.id, attempt: execution.attempt,
    lease: sha(execution.leaseToken), startedAt: execution.startedAt.toISOString() }, program: fixed.declaration }));
}
// Physical Writer/input/profile/Job evidence has no authenticated API source yet.
// Never substitute execution.metadata or a request boolean for this dependency.
export type OwnerTicketEvidence = (db: Db, execution: AgentExecution, ready: any, decision: any) => Promise<{
  acceptance: any; challenge: string; writerDigest: string; inputSeal: string;
  readyPinId: string; readyRevision: string; claimDigest: string; contractDigest: string;
}>;

export function createPrismaOwnerTicketStore(client: PrismaClient, evidence?: OwnerTicketEvidence): OwnerTicketStore {
  return { async transaction<T>(work: (tx: OwnerTicketTx) => Promise<T>): Promise<T> {
    // No automatic transaction retries: a signature or uncertain consumption is
    // never an invitation to issue/dispatch again.
    try {
      return await client.$transaction(async db => {
        // Same ordering as Ready/decision commands. Every source edit takes this
        // fence; Serializable rejects concurrent source or membership changes.
        const n = await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
        if (n !== 1) ticketBlocked();
        let ownerActor: string | undefined;
        const tx: OwnerTicketTx = {
          async primaryOwner(auth: AuthContext) {
            const member = await db.workspaceMembership.findFirst({ where: { workspaceId: auth.workspaceId, userId: auth.userId, role: "owner" } });
            const workspace = await db.workspace.findUnique({ where: { id: auth.workspaceId }, select: { ownerUserId: true } });
            const allowed = !!member && workspace?.ownerUserId === auth.userId;
            if (allowed) ownerActor = auth.userId;
            return allowed;
          },
          key: workspaceId => db.trustedProviderTicketKey.findUnique({ where: { workspaceId } }),
          async current(workspaceId, executionId, decisionId, revision, now): Promise<TicketContext> {
            if (!evidence) throw new OwnerTicketError("owner_ticket_evidence_unavailable", 503);
            const execution = await db.agentExecution.findFirst({ where: { id: executionId, workspaceId }, include: { agentHost: true } });
            if (!execution || execution.status !== "claimed" || execution.attempt !== 1 || !execution.agentHostId
              || execution.agentHost?.status === "disabled" || !execution.leaseToken || !execution.leaseExpiresAt || execution.leaseExpiresAt <= now
              || execution.cancelRequestedAt || execution.contextInvalidatedAt || (execution.errorState as any)?.retryable === false) ticketBlocked();
            await lockReadyTask(db, workspaceId, execution.taskId);
            const ready = await inspectReady(db, workspaceId, execution.taskId, execution);
            if (ready.error || !ready.pin) ticketBlocked();
            const contract = ready.pin.contract as any;
            if (contract.executionClass !== fixed.program || contract.budgets?.maxAttempts !== 1
              || contract.access?.externalWrites !== false || contract.access?.sandbox !== "workspace-write") ticketBlocked();
            const decisions = await db.$queryRaw<any[]>`SELECT r.version,r.body,a.actor_user_id,a.actor_agent_id,a.created_at,d.status,
              decision_state(d.id) AS state FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id
              JOIN decision_acceptances a ON a.decision_id=d.id WHERE d.id=${decisionId}::uuid AND d.workspace_id=${workspaceId}::uuid
              AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)`;
            const decision = decisions[0];
            const primary = await db.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } });
            if (!decision || decision.version !== revision || decision.state !== "accepted" || decision.status !== "accepted"
              || decision.actor_agent_id || decision.actor_user_id !== primary?.ownerUserId
              || !decision.body.scope?.some((s: any) => s.type === "task" && s.id === execution.taskId)) ticketBlocked("owner_ticket_decision_changed");
            const e = await evidence(db, execution, ready, decision);
            const claimDigest = ownerTicketClaimDigest(execution, e.inputSeal, ready.pin.revision);
            const contractDigest = await ticketHash(ready.pin.contract);
            if (e.readyPinId !== ready.pin.pinId || e.readyRevision !== ready.pin.revision || e.claimDigest !== claimDigest
              || e.contractDigest !== contractDigest || e.inputSeal !== e.acceptance.scope.inputSeal
              || e.writerDigest !== e.acceptance.scope.writerDigest || e.acceptance.scope.taskId !== execution.taskId
              || e.acceptance.scope.applicationId !== execution.applicationId
              || await ticketHash(e.acceptance.provider.modelSelection) !== await ticketHash((ready.pin.contract as any).modelSelection)
              || Date.parse(e.acceptance.decidedAt) < new Date(decision.created_at).getTime()) ticketBlocked();
            return { acceptance: e.acceptance, challenge: e.challenge, claimDigest,
              contextDigest: await ticketHash({ readyPinId: e.readyPinId, readyRevision: e.readyRevision, contractDigest,
                writerDigest: e.writerDigest, inputSeal: e.inputSeal, claimDigest, challenge: e.challenge,
                hostId: execution.agentHostId, checkpoint: execution.checkpoint }) };
          },
          async find(workspaceId, ticketId) {
            await db.$queryRaw`SELECT id FROM trusted_provider_tickets WHERE id=${ticketId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
            return await db.trustedProviderTicket.findFirst({ where: { id: ticketId, workspaceId } }) as TicketRow | null;
          },
          async insert(row) { await db.trustedProviderTicket.create({ data: row }); },
          async transition(row, state, now, consumeId) {
            return (await db.trustedProviderTicket.updateMany({ where: { id: row.id, workspaceId: row.workspaceId, version: row.version, state: "issued" },
              data: { state, version: { increment: 1 }, ...(state === "consumed" ? { consumedAt: now, consumeId } : {}), ...(state === "revoked" ? { revokedAt: now } : {}) } })).count === 1;
          },
          async spendAttempt(row) {
            const changed = await db.agentExecution.updateMany({ where: { id: row.executionId, workspaceId: row.workspaceId, attempt: row.attempt, status: "claimed" },
              data: { errorState: { code: "owner_ticket_consumed", retryable: false, message: "Ticket spent. Reconcile this attempt; no automatic restart or renewal." } } });
            if (changed.count !== 1) ticketBlocked();
          },
          async audit(row, state, now) {
            await db.event.create({ data: { workspaceId: row.workspaceId, taskId: row.taskId, type: `owner_ticket_${state}`, source: "roost",
              actorType: "user", actorId: ownerActor, resourceType: "trusted_provider_ticket", resourceId: row.id,
              payload: { ticketId: row.id, executionId: row.executionId, decisionId: row.decisionId, state, at: now.toISOString() } } });
          },
          async rotate(workspaceId, epoch, keyId, digest, now) {
            const old = await db.trustedProviderTicketKey.findUnique({ where: { workspaceId } });
            if (!old || old.keyId === keyId || old.publicKeyDigest === digest) return false;
            const changed = await db.trustedProviderTicketKey.updateMany({ where: { workspaceId, epoch }, data: { keyId, publicKeyDigest: digest, epoch: { increment: 1 } } });
            if (!changed.count) return false;
            // SQL trigger revokes outstanding rows + appends their journals.
            await db.event.create({ data: { workspaceId, type: "owner_ticket_key_rotated", source: "roost", actorType: "user", actorId: ownerActor, resourceType: "workspace", resourceId: workspaceId,
              payload: { previousEpoch: epoch, epoch: epoch + 1, keyId, at: now.toISOString() } } });
            return true;
          }
        };
        return work(tx);
      }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 20000 });
    } catch (error) {
      if (error instanceof OwnerTicketError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ticketBlocked("owner_ticket_replayed");
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)))) {
        // Deterministic denial, never rerun the transaction/signature callback.
        ticketBlocked("owner_ticket_replayed");
      }
      // Signer/DB errors are deliberately redacted, never returned or logged here.
      throw new OwnerTicketError("owner_ticket_unavailable", 503);
    }
  } };
}
