import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { ApiKey } from "@prisma/client";
import type { AuthContext } from "../auth/api-key.middleware";
import { hashApiKey } from "../auth/api-key";
import { workerTicketFingerprint } from "../auth/worker-ticket-principal";
import { createWorkerHandoffService, type HandoffDependencies, type HandoffState, type WorkerHandoff, type WorkerHandoffStore, type WorkerHandoffTx } from "../modules/api-keys/worker-handoff.service";
import { handoffAckProof, handoffCode, handoffHash, handoffPolicy, type HandoffRequest, type SyntheticHandoffTransport } from "../modules/api-keys/worker-handoff-contract";
import { safeWorkerCredential, type SyntheticWorkerDelivery, type WorkerCredentialOperation } from "../modules/api-keys/worker-credential.service";

type Model = {
  owner: string; workspaceId: string; installationId: string; hostId: string; now: Date;
  rows: WorkerHandoff[]; keys: ApiKey[]; operations: WorkerCredentialOperation[]; events: unknown[]; audits: unknown[];
  tickets: Array<{ hostId: string; state: string }>; claims: Array<{ hostId: string; blocked: boolean }>;
};

export function fixture() {
  const model: Model = { owner: randomUUID(), workspaceId: randomUUID(), installationId: randomUUID(), hostId: randomUUID(), now: new Date("2026-09-23T12:00:00.000Z"),
    rows: [], keys: [], operations: [], events: [], audits: [], tickets: [{ hostId: "unused", state: "issued" }], claims: [{ hostId: "unused", blocked: false }] };
  let tail = Promise.resolve();
  const clone = <T>(value: T): T => structuredClone(value);
  const copy = () => clone(model);
  const restore = (draft: Model) => { model.rows = draft.rows; model.keys = draft.keys; model.operations = draft.operations; model.events = draft.events; model.audits = draft.audits; model.tickets = draft.tickets; model.claims = draft.claims; };
  const store: WorkerHandoffStore = { transaction: async work => {
    const previous = tail; let unlock!: () => void; tail = new Promise<void>(resolve => { unlock = resolve; }); await previous;
    const draft = copy();
    const find = (id: string) => draft.rows.find(row => row.requestId === id) ?? null;
    const tx: WorkerHandoffTx = {
      primaryOwner: async auth => auth.userId === draft.owner && auth.workspaceId === draft.workspaceId && auth.workspaceRole === "owner" && !auth.agentId && !auth.apiKeyId,
      decision: async (input, actorId) => {
        const row = find(input.requestId) ?? draft.rows.find(candidate => candidate.command?.decisionId === input.decisionId);
        return actorId === draft.owner && !!input.explicitAcceptance && !!input.intent.handoff && (!row || row.workspaceId === input.intent.workspaceId);
      },
      host: async intent => intent.workspaceId === draft.workspaceId && intent.installationId === draft.installationId && intent.hostId === draft.hostId,
      previous: async () => null,
      latest: async (workspaceId, hostId) => draft.keys.filter(key => key.workspaceId === workspaceId && key.workerHostId === hostId).sort((a, b) => (b.workerBindingEpoch ?? 0) - (a.workerBindingEpoch ?? 0))[0] ?? null,
      revoke: async key => { const target = draft.keys.find(item => item.id === key.id)!; target.active = false; target.revokedAt = new Date(model.now); target.credentialVersion++; return clone(target); },
      insert: async key => { draft.keys.push(clone(key)); },
      invalidate: async key => { for (const ticket of draft.tickets.filter(item => item.hostId === key.workerHostId && item.state === "issued")) ticket.state = "revoked"; for (const claim of draft.claims.filter(item => item.hostId === key.workerHostId)) claim.blocked = true; },
      record: async (input, actorId, requestHash, key) => { draft.operations.push({ requestHash, keyId: key.id, snapshot: safeWorkerCredential(key) }); draft.events.push({ actorId, action: input.intent.action, keyId: key.id }); },
      handoff: async id => { const row = find(id); return row ? clone(row) : null; },
      recentHandoffs: async (workspaceId, hostId, since) => draft.rows.filter(row => row.workspaceId === workspaceId && row.hostId === hostId && row.createdAt >= since),
      saveHandoff: async row => { const index = draft.rows.findIndex(item => item.requestId === row.requestId); if (index === -1) draft.rows.push(clone(row)); else draft.rows[index] = clone(row); },
      credential: async id => clone(draft.keys.find(key => key.id === id) ?? null),
      activate: async key => { const target = draft.keys.find(item => item.id === key.id)!; target.active = true; target.updatedAt = new Date(model.now); return clone(target); },
      handoffAudit: async (row, event) => { draft.audits.push({ requestId: row.requestId, event, state: row.state }); }
    };
    try { const result = await work(tx); restore(draft); return result; } finally { unlock(); }
  } };
  const buffers: Buffer[] = [], delivered: number[] = [];
  const delivery: SyntheticWorkerDelivery = { qualification: "synthetic_memory_only",
    generate: async () => { const buffer = randomBytes(48); buffers.push(buffer); return buffer; },
    hash: async value => hashApiKey(value.toString()),
    deliver: async value => { delivered.push(1); return value.toString(); } };
  let transport: SyntheticHandoffTransport = { qualification: "synthetic_memory_only", requestedOrigin: "https://worker.example.test:9443", connectedOrigin: "https://worker.example.test:9443", certificateFingerprint: "a".repeat(64), tlsValidated: true, redirected: false, proxyOrigin: null };
  const dependencies: HandoffDependencies = { delivery, transport: async () => transport };
  const service = createWorkerHandoffService(store, dependencies, () => model.now);
  const ownerAuth: AuthContext = { authType: "user", userId: model.owner, workspaceId: model.workspaceId, workspaceRole: "owner", authenticatedAt: Math.floor(model.now.getTime() / 1000) };
  const workerAuth: AuthContext = { authType: "api_key", apiKeyId: randomUUID(), workspaceId: model.workspaceId, authenticatedAt: Math.floor(model.now.getTime() / 1000) };
  const requestBase = (): any => {
    const deviceSecret = randomBytes(48), challenge = randomBytes(48);
    return { requestId: randomUUID(), workspaceId: model.workspaceId, installationId: model.installationId, hostId: model.hostId,
      hostFingerprint: "b".repeat(64), deviceSecret, challenge, origin: transport.requestedOrigin, certificateFingerprint: transport.certificateFingerprint,
      deviceSecretHash: handoffHash("device", deviceSecret), challengeHash: handoffHash("challenge", challenge), replacesRequestId: null };
  };
  const proof = (request: any) => ({ requestId: request.requestId, workspaceId: request.workspaceId, installationId: request.installationId, hostId: request.hostId,
    hostFingerprint: request.hostFingerprint, deviceSecret: Buffer.from(request.deviceSecret), challenge: Buffer.from(request.challenge) });
  return { model, store, service, ownerAuth, workerAuth, requestBase, proof, wipe: (request: any) => { request.deviceSecret?.fill(0); request.challenge?.fill(0); }, wire: (request: any) => { const { deviceSecret, challenge, ...body } = request; return body; }, transport: (value: SyntheticHandoffTransport) => { transport = value; }, buffers, delivered };
}

export function intent(f: ReturnType<typeof fixture>, request: HandoffRequest & { userCode?: string }, action: "enroll" | "rotate" = "enroll") {
  const old = f.model.keys.filter(key => key.workspaceId === f.model.workspaceId && key.workerHostId === f.model.hostId).sort((a, b) => (b.workerBindingEpoch ?? 0) - (a.workerBindingEpoch ?? 0))[0];
  return { schemaVersion: "worker-credential-lifecycle-v1" as const, action, workspaceId: f.model.workspaceId, installationId: f.model.installationId, hostId: f.model.hostId,
    expectedCredentialId: old?.id ?? null, expectedVersion: old?.credentialVersion ?? 0, expectedEpoch: old?.workerBindingEpoch ?? 0, expectedFingerprint: old ? workerTicketFingerprint(old.keyHash!) : null,
    expiresAt: new Date(f.model.now.getTime() + 3600000).toISOString(), validUntil: new Date(f.model.now.getTime() + 90000).toISOString(),
    handoff: { requestId: request.requestId, requestDigest: (request as any).requestDigest ?? f.model.rows.find(row => row.requestId === request.requestId)?.requestDigest ?? handoffHash("code", request.requestId), hostFingerprint: request.hostFingerprint, origin: request.origin,
      certificateFingerprint: request.certificateFingerprint, replacesRequestId: request.replacesRequestId } };
}

export async function approve(f: ReturnType<typeof fixture>, request: any, action: "enroll" | "rotate" = "enroll") {
  const command = { requestId: randomUUID(), decisionId: randomUUID(), decisionRevision: 1, explicitAcceptance: true, intent: intent(f, request, action) };
  const approved = await f.service("approve", f.ownerAuth, { requestId: request.requestId, userCode: request.userCode, command });
  return { command, approved };
}
