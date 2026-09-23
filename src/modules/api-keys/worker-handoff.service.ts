import type { ApiKey } from "@prisma/client";
import type { AuthContext } from "../../auth/api-key.middleware";
import { workerTicketFingerprint } from "../../auth/worker-ticket-principal";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { type WorkerCredentialCommand, workerCredentialIntent } from "./worker-credential-contract";
import { freshWorkerOwner, safeWorkerCredential, workerCredentialCandidate, workerCredentialGenerationMatches,
  WorkerCredentialError, type SyntheticWorkerDelivery, type WorkerCredentialTx } from "./worker-credential.service";
import { handoffRequest, handoffApproval, handoffDeviceProof, handoffAck, handoffCode, handoffHash, handoffAckProof,
  handoffPolicy, equalHandoffDigest, exactHttpsOrigin, type HandoffRequest, type HandoffDeviceProof, type SyntheticHandoffTransport } from "./worker-handoff-contract";

export type HandoffState = "requested" | "approved" | "awaiting_ack" | "acknowledged" | "delivery_unknown" | "revoked" | "expired" | "locked";
export type WorkerHandoff = HandoffRequest & { requestDigest: string; userCodeHash: string; state: HandoffState;
  creatorUserId: string | null; createdAt: Date; expiresAt: Date; badAttempts: number; polls: number; nextPollAt: Date | null;
  ownerId: string | null; ownerAuthTime: number | null; command: WorkerCredentialCommand | null;
  credentialId: string | null; responseDigest: string | null; spentAt: Date | null; ackDeadline: Date | null; acknowledgedAt: Date | null };
export interface WorkerHandoffTx extends WorkerCredentialTx {
  handoff(id: string): Promise<WorkerHandoff | null>;
  recentHandoffs(workspaceId: string, hostId: string, since: Date): Promise<WorkerHandoff[]>;
  saveHandoff(row: WorkerHandoff): Promise<void>;
  credential(id: string): Promise<ApiKey | null>;
  activate(key: ApiKey, at: Date): Promise<ApiKey>;
  handoffAudit(row: WorkerHandoff, event: string): Promise<void>;
}
export interface WorkerHandoffStore { transaction<T>(work: (tx: WorkerHandoffTx) => Promise<T>): Promise<T> }
export type HandoffDependencies = { delivery: SyntheticWorkerDelivery;
  // Trusted adapter output, never JSON/header evidence supplied by the caller.
  transport(): Promise<SyntheticHandoffTransport> };
const failed = (code: string, status = 409) => ({ error: { code: `worker_handoff_${code}`, status } });
const deny = (code: string, status = 409): never => { const e = failed(code, status).error; throw new WorkerCredentialError(e.code, e.status); };
const terminal = (row: WorkerHandoff) => ["acknowledged", "delivery_unknown", "revoked", "expired", "locked"].includes(row.state);
const status = (row: WorkerHandoff) => ({ requestId: row.requestId, state: row.state, deliverySpent: !!row.spentAt,
  qualification: "synthetic_memory_only", transportQualified: false, realProvisioningQualified: false, launchAuthority: false });
const ownerOf = (r: WorkerHandoff): AuthContext => ({ authType: "user", workspaceId: r.workspaceId, userId: r.ownerId!,
  workspaceRole: "owner", authenticatedAt: r.ownerAuthTime! });
const binding = (r: WorkerHandoff) => ({ requestId: r.requestId, requestDigest: r.requestDigest, hostFingerprint: r.hostFingerprint,
  origin: r.origin, certificateFingerprint: r.certificateFingerprint, replacesRequestId: r.replacesRequestId });

export function createWorkerHandoffService(store?: WorkerHandoffStore, dependencies?: HandoffDependencies, clock = () => new Date()) {
  return async (action: "request" | "approve" | "poll" | "ack" | "status", auth: AuthContext | undefined, body: unknown) => {
    let raw: Buffer | undefined;
    const at = clock();
    try {
      if (action === "approve" && (!auth || !freshWorkerOwner(auth, at))) deny("forbidden", 403);
      const delivery = dependencies?.delivery;
      if (!store || !delivery || delivery.qualification !== "synthetic_memory_only" || !dependencies?.transport
        || ![delivery.generate, delivery.hash, delivery.deliver].every(f => typeof f === "function")) deny("unavailable", 503);
      const evidence = await dependencies!.transport();
      function transport(origin: string, pin: string) {
        if (!exactHttpsOrigin.safeParse(origin).success || evidence.qualification !== "synthetic_memory_only" || !evidence.tlsValidated || evidence.redirected
          || evidence.requestedOrigin !== origin || evidence.connectedOrigin !== origin || evidence.certificateFingerprint !== pin
          || evidence.proxyOrigin !== null && evidence.proxyOrigin !== origin) deny("transport_invalid", 403);
      }
      const result: any = await store!.transaction(async tx => {
        async function retire(row: WorkerHandoff, state: HandoffState) {
          if (row.credentialId) { const key = await tx.credential(row.credentialId);
            if (key && !key.revokedAt) { await tx.revoke(key, at); await tx.invalidate(key, at); } }
          row.state = state; await tx.saveHandoff(row); await tx.handoffAudit(row, state);
        }
        async function reconcile(row: WorkerHandoff) {
          if (terminal(row)) return;
          if (row.credentialId && (await tx.credential(row.credentialId))?.revokedAt) { await retire(row, "revoked"); return; }
          if (row.state === "awaiting_ack" && row.ackDeadline! <= at) await retire(row, "delivery_unknown");
          else if (!row.spentAt && row.expiresAt <= at) await retire(row, "expired");
        }
        async function badAttempt(row: WorkerHandoff, code = "proof_invalid") {
          if (!terminal(row)) { row.badAttempts++; if (row.badAttempts >= handoffPolicy.maxBadAttempts) { await retire(row, "locked"); return failed("locked", 429); } else await tx.saveHandoff(row); }
          return failed(code, 403);
        }
        async function currentApproval(row: WorkerHandoff) {
          return !!row.command && !!row.ownerId && freshWorkerOwner(ownerOf(row), at) && await tx.primaryOwner(ownerOf(row))
            && await tx.decision(row.command, row.ownerId, at) && Date.parse(row.command.intent.validUntil) > at.getTime()
            && await tx.host(row.command.intent);
        }
        if (action === "request") {
          const input = handoffRequest.parse(body); transport(input.origin, input.certificateFingerprint);
          // A device request has no credential or owner authority. The host,
          // installation and trusted transport evidence are checked below;
          // only the later approval may introduce a human owner.
          const hostIntent = workerCredentialIntent.parse({ schemaVersion: "worker-credential-lifecycle-v1", action: "enroll",
            workspaceId: input.workspaceId, installationId: input.installationId, hostId: input.hostId,
            expectedCredentialId: null, expectedVersion: 0, expectedEpoch: 0, expectedFingerprint: null,
            expiresAt: new Date(at.getTime() + 3600000).toISOString(), validUntil: new Date(at.getTime() + handoffPolicy.requestTtlMs).toISOString() });
          if (!await tx.host(hostIntent)) return failed("host_changed");
          const existing = await tx.handoff(input.requestId);
          if (existing) return failed("request_used");
          const recent = await tx.recentHandoffs(input.workspaceId, input.hostId, new Date(at.getTime() - 60000));
          if (recent.length >= handoffPolicy.requestsPerMinute) return failed("rate_limited", 429);
          if (input.replacesRequestId) {
            const old = await tx.handoff(input.replacesRequestId);
            if (!old || old.workspaceId !== input.workspaceId || old.hostId !== input.hostId || old.installationId !== input.installationId) return failed("recovery_invalid");
            await reconcile(old);
          }
          const expiresAt = new Date(at.getTime() + handoffPolicy.requestTtlMs);
          const row: WorkerHandoff = { ...input, requestDigest: reviewDigest({ ...input, expiresAt: expiresAt.toISOString() }),
            userCodeHash: handoffHash("code", handoffCode(input.requestId)), creatorUserId: auth?.userId ?? null, createdAt: at, expiresAt, state: "requested", badAttempts: 0, polls: 0, nextPollAt: null,
            ownerId: null, ownerAuthTime: null, command: null, credentialId: null, responseDigest: null, spentAt: null, ackDeadline: null, acknowledgedAt: null };
          await tx.saveHandoff(row); await tx.handoffAudit(row, "requested");
          return { ...status(row), userCode: handoffCode(row.requestId), binding: binding(row), expiresAt: row.expiresAt.toISOString() };
        }
        if (action === "approve") {
          const input = handoffApproval.parse(body), row = await tx.handoff(input.requestId);
          if (!row) return failed("not_found", 404);
          transport(row.origin, row.certificateFingerprint);
          if (auth!.workspaceId !== row.workspaceId || !await tx.primaryOwner(auth!)) return failed("forbidden", 403);
          await reconcile(row);
          if (terminal(row) || row.spentAt) return status(row);
          if (!equalHandoffDigest(handoffHash("code", input.userCode), row.userCodeHash)) return badAttempt(row, "approval_invalid");
          const i = input.command.intent;
          if (i.action === "revoke" || i.workspaceId !== row.workspaceId || i.installationId !== row.installationId || i.hostId !== row.hostId
            || reviewDigest(i.handoff) !== reviewDigest(binding(row)) || !await tx.decision(input.command, auth!.userId!, at)
            || Date.parse(i.validUntil) <= at.getTime()) return badAttempt(row, "approval_invalid");
          if (row.command) return reviewDigest(row.command) === reviewDigest(input.command) ? status(row) : failed("approval_changed");
          row.command = input.command; row.ownerId = auth!.userId!; row.ownerAuthTime = auth!.authenticatedAt!; row.state = "approved";
          await tx.saveHandoff(row); await tx.handoffAudit(row, "approved"); return status(row);
        }
        const proof = (action === "ack" ? handoffAck : handoffDeviceProof).parse(body) as HandoffDeviceProof;
        const row = await tx.handoff(proof.requestId);
        if (!row) return failed("not_found", 404);
        transport(row.origin, row.certificateFingerprint);
        await reconcile(row);
        if (proof.workspaceId !== row.workspaceId || proof.installationId !== row.installationId || proof.hostId !== row.hostId || proof.hostFingerprint !== row.hostFingerprint
          || !equalHandoffDigest(handoffHash("device", proof.deviceSecret), row.deviceSecretHash)
          || !equalHandoffDigest(handoffHash("challenge", proof.challenge), row.challengeHash)) return badAttempt(row);
        if (terminal(row)) return status(row);
        if (action === "status") return status(row);
        if (action === "ack") {
          const ack = handoffAck.parse(body), key = row.credentialId && await tx.credential(row.credentialId);
          if (row.state !== "awaiting_ack" || !key || key.revokedAt || key.active || key.expiresAt! <= at || !await currentApproval(row)) {
            if (row.state === "awaiting_ack") await retire(row, "revoked"); return failed("ack_invalid");
          }
          if (ack.credentialId !== key.id || ack.credentialFingerprint !== workerTicketFingerprint(key.keyHash!) || ack.responseDigest !== row.responseDigest
            || !equalHandoffDigest(ack.ackProof, handoffAckProof(key.keyHash!, row.requestId, row.responseDigest!))) return badAttempt(row, "ack_invalid");
          row.state = "acknowledged"; row.acknowledgedAt = at; await tx.saveHandoff(row);
          const active = await tx.activate(key, at);
          await tx.record(row.command!, row.ownerId!, reviewDigest({ input: row.command, actorId: row.ownerId }), active, at);
          await tx.handoffAudit(row, "acknowledged"); return status(row);
        }
        if (row.spentAt) return status(row);
        if (row.polls >= handoffPolicy.maxPolls) { await retire(row, "locked"); return failed("locked", 429); }
        row.polls++;
        if (row.nextPollAt && row.nextPollAt > at) { await tx.saveHandoff(row); return failed("rate_limited", 429); }
        row.nextPollAt = new Date(at.getTime() + handoffPolicy.pollIntervalMs); await tx.saveHandoff(row);
        if (row.state !== "approved") return status(row);
        if (!await currentApproval(row)) { await retire(row, "revoked"); return failed("approval_changed"); }
        const intent = row.command!.intent, old = await tx.latest(row.workspaceId, row.hostId);
        if (!workerCredentialGenerationMatches(old, intent)) return failed("generation_changed");
        const prior = row.replacesRequestId ? await tx.handoff(row.replacesRequestId) : null;
        if (intent.action === "enroll" && old && (old.active || !old.revokedAt)) return failed("generation_changed");
        if (intent.action === "rotate" && (!old || old.revokedAt || !old.active && !(prior?.credentialId === old.id && prior.state === "awaiting_ack"))) return failed("generation_changed");
        const expiry = Date.parse(intent.expiresAt!);
        if (!(expiry > at.getTime() && expiry <= at.getTime() + handoffPolicy.maximumCredentialTtlMs)) return failed("expiry_invalid");
        if (prior && (prior.credentialId ?? null) !== (old?.id ?? null)) return failed("recovery_invalid");
        if (old && !old.revokedAt) { await tx.revoke(old, at); await tx.invalidate(old, at); }
        if (prior && !["revoked", "delivery_unknown", "expired", "locked"].includes(prior.state)) {
          prior.state = "revoked"; await tx.saveHandoff(prior); await tx.handoffAudit(prior, "recovered");
        }
        raw = await delivery!.generate();
        if (!Buffer.isBuffer(raw) || raw.length < 32 || raw.length > 128) deny("unavailable", 503);
        const hash = await delivery!.hash(raw);
        if (!/^[a-f0-9]{64}$/.test(hash) || hash === raw.toString() || hash === old?.keyHash) deny("unavailable", 503);
        const candidate = workerCredentialCandidate(intent, hash, at, false); await tx.insert(candidate);
        row.credentialId = candidate.id; row.state = "awaiting_ack"; row.spentAt = at;
        row.ackDeadline = new Date(Math.min(at.getTime() + handoffPolicy.ackTtlMs, expiry));
        row.responseDigest = reviewDigest({ requestId: row.requestId, requestDigest: row.requestDigest,
          credential: safeWorkerCredential(candidate), ackDeadline: row.ackDeadline.toISOString() });
        await tx.saveHandoff(row); await tx.handoffAudit(row, "delivered");
        return { ...status(row), credential: safeWorkerCredential(candidate), responseDigest: row.responseDigest, ackDeadline: row.ackDeadline.toISOString() };
      });
      if (result.error) throw new WorkerCredentialError(result.error.code, result.error.status);
      // Only this invocation owns the ephemeral buffer. No read/replay can
      // recover it, including after a failed/lost post-commit delivery.
      if (raw) { const key = await delivery!.deliver(raw);
        if (typeof key !== "string" || key.length < 32 || key.length > 256 || key !== raw.toString()) deny("unavailable", 503);
        return { ...result, key };
      }
      return result;
    } catch (e) {
      if (e instanceof WorkerCredentialError && ["forbidden", "unavailable", "transport_invalid", "host_changed", "request_used", "rate_limited", "recovery_invalid",
        "not_found", "approval_invalid", "approval_changed", "proof_invalid", "ack_invalid", "locked", "generation_changed", "expiry_invalid"]
        .map(code => `worker_handoff_${code}`).includes(e.code)) throw e;
      if ((e as any)?.name === "ZodError") throw new WorkerCredentialError("validation_error", 400);
      throw new WorkerCredentialError("worker_handoff_unavailable", 503);
    } finally {
      if (Buffer.isBuffer(raw)) raw.fill(0);
      for (const k of ["deviceSecret", "challenge"]) { const value = body && Object.getOwnPropertyDescriptor(body, k)?.value;
        if (Buffer.isBuffer(value)) value.fill(0); }
    }
  };
}
