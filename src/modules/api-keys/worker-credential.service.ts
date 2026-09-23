import { randomUUID } from "node:crypto";
import type { ApiKey } from "@prisma/client";
import type { AuthContext } from "../../auth/api-key.middleware";
import { workerTicketFingerprint } from "../../auth/worker-ticket-principal";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { workerCredentialCommand, workerCredentialIntent, workerCredentialScopes, type WorkerCredentialCommand, type WorkerCredentialIntent } from "./worker-credential-contract";

export class WorkerCredentialError extends Error {
  constructor(public code: string, public status = 409) { super(code); }
}
export const denyWorkerCredential = (code = "worker_credential_stale", status = 409): never => { throw new WorkerCredentialError(code, status); };
export function freshWorkerOwner(auth: AuthContext, now: Date) {
  return auth.authType === "user" && !!auth.userId && !auth.agentId && !auth.apiKeyId && auth.workspaceRole === "owner"
    && Number.isInteger(auth.authenticatedAt) && auth.authenticatedAt! <= Math.floor(now.getTime() / 1000)
    && now.getTime() / 1000 - auth.authenticatedAt! <= 300;
}
export function safeWorkerCredential(k: ApiKey) {
  return { id: k.id, workspaceId: k.workspaceId!, installationId: k.workerInstallationId!, hostId: k.workerHostId!,
    version: k.credentialVersion, epoch: k.workerBindingEpoch!, fingerprint: workerTicketFingerprint(k.keyHash!),
    active: k.active, revokedAt: k.revokedAt?.toISOString() ?? null, expiresAt: k.expiresAt!.toISOString(), scopes: workerCredentialScopes };
}
export type WorkerCredentialOperation = { requestHash: string; keyId: string; snapshot: ReturnType<typeof safeWorkerCredential> };
export interface WorkerCredentialTx {
  primaryOwner(auth: AuthContext): Promise<boolean>;
  decision(input: WorkerCredentialCommand, actorId: string, now: Date): Promise<boolean>;
  host(intent: WorkerCredentialIntent): Promise<boolean>;
  previous(workspaceId: string, requestId: string): Promise<WorkerCredentialOperation | null>;
  latest(workspaceId: string, hostId: string): Promise<ApiKey | null>;
  revoke(key: ApiKey, at: Date): Promise<ApiKey>;
  insert(key: ApiKey): Promise<void>;
  invalidate(key: ApiKey, at: Date): Promise<void>;
  record(input: WorkerCredentialCommand, actorId: string, requestHash: string, key: ApiKey, at: Date): Promise<void>;
}
export interface WorkerCredentialStore { transaction<T>(work: (tx: WorkerCredentialTx) => Promise<T>): Promise<T> }
// This slice qualifies synthetic delivery only. No production implementation or
// default generator/hasher/delivery is installed, including for revoke.
export interface SyntheticWorkerDelivery {
  qualification: "synthetic_memory_only";
  generate(): Promise<Buffer>;
  hash(secret: Buffer): Promise<string>;
  deliver(secret: Buffer): Promise<string>;
}
export function createWorkerCredentialService(store: WorkerCredentialStore, options: { delivery?: SyntheticWorkerDelivery; now?: () => Date } = {}) {
  const clock = options.now ?? (() => new Date());
  return async (auth: AuthContext, action: WorkerCredentialIntent["action"], body: unknown) => {
    let secret: Buffer | undefined;
    try {
      const input = workerCredentialCommand.parse(body), at = clock();
      if (!freshWorkerOwner(auth, at)) denyWorkerCredential("worker_credential_forbidden", 403);
      if (input.intent.action !== action || input.intent.workspaceId !== auth.workspaceId) denyWorkerCredential("worker_credential_binding_invalid");
      const requestHash = reviewDigest({ input, actorId: auth.userId });
      const result = await store.transaction(async tx => {
        if (!await tx.primaryOwner(auth)) denyWorkerCredential("worker_credential_forbidden", 403);
        if (!options.delivery || options.delivery.qualification !== "synthetic_memory_only"
          || ![options.delivery.generate, options.delivery.hash, options.delivery.deliver].every(f => typeof f === "function")) denyWorkerCredential("worker_credential_unavailable", 503);
        if (!await tx.decision(input, auth.userId!, at)) denyWorkerCredential("worker_credential_decision_changed");
        const prior = await tx.previous(auth.workspaceId, input.requestId);
        if (prior) {
          if (prior.requestHash !== requestHash) denyWorkerCredential("worker_credential_request_conflict");
          return { credential: prior.snapshot, replayed: true };
        }
        const intent = workerCredentialIntent.parse(input.intent);
        if (Date.parse(intent.validUntil) <= at.getTime()) denyWorkerCredential("worker_credential_decision_expired");
        if (!await tx.host(intent)) denyWorkerCredential("worker_credential_host_changed");
        const old = await tx.latest(auth.workspaceId, intent.hostId);
        if (old ? old.id !== intent.expectedCredentialId || old.credentialVersion !== intent.expectedVersion || old.workerBindingEpoch !== intent.expectedEpoch
          || old.workerInstallationId !== intent.installationId || workerTicketFingerprint(old.keyHash!) !== intent.expectedFingerprint
          : intent.expectedCredentialId !== null) denyWorkerCredential();
        if (action === "enroll" && old && (old.active || !old.revokedAt)) denyWorkerCredential("worker_credential_already_bound");
        if (action === "rotate" && (!old?.active || old.revokedAt) || action === "revoke" && (!old || old.revokedAt)) denyWorkerCredential("worker_credential_revoked");
        const expires = intent.expiresAt && new Date(intent.expiresAt);
        if (action !== "revoke" && (!expires || expires <= at || expires.getTime() > at.getTime() + 30 * 86400000)) denyWorkerCredential("worker_credential_invalid_expiry");
        let key = old;
        if (old && !old.revokedAt) { key = await tx.revoke(old, at); await tx.invalidate(old, at); }
        if (action !== "revoke") {
          secret = await options.delivery!.generate();
          if (!Buffer.isBuffer(secret) || secret.length < 32 || secret.length > 128) denyWorkerCredential("worker_credential_unavailable", 503);
          const hash = await options.delivery!.hash(secret);
          if (!/^[a-f0-9]{64}$/.test(hash) || hash === secret.toString() || hash === old?.keyHash) denyWorkerCredential("worker_credential_unavailable", 503);
          key = { id: randomUUID(), workspaceId: auth.workspaceId, name: "Bound Worker credential", key: null, keyHash: hash, keyPrefix: "worker-v1",
            active: true, revokedAt: null, expiresAt: expires as Date, credentialVersion: 1, workerHostId: intent.hostId, workerInstallationId: intent.installationId,
            workerBindingEpoch: (old?.workerBindingEpoch ?? 0) + 1, scopes: workerCredentialScopes, boundAgentId: null,
            lastUsedAt: null, createdAt: at, updatedAt: at };
          await tx.insert(key);
        }
        await tx.record(input, auth.userId!, requestHash, key!, at);
        return { credential: safeWorkerCredential(key!), replayed: false };
      });
      // Commit precedes the single synthetic disclosure. A lost/failed response
      // cannot retrieve the secret again: durable request replay is metadata only.
      const key = secret && !result.replayed ? await options.delivery!.deliver(secret) : null;
      if (key !== null && (typeof key !== "string" || key.length < 32 || key.length > 256)) denyWorkerCredential("worker_credential_unavailable", 503);
      return { ...result, key, qualification: "synthetic_memory_only", realProvisioningQualified: false, transportQualified: false, launchAuthority: false };
    } catch (error) {
      if (error instanceof WorkerCredentialError) throw error;
      if ((error as any)?.name === "ZodError") throw new WorkerCredentialError("validation_error", 400);
      throw new WorkerCredentialError("worker_credential_unavailable", 503);
    } finally { if (Buffer.isBuffer(secret)) secret.fill(0); }
  };
}
