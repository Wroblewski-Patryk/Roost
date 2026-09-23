import test from "node:test";
import assert from "node:assert/strict";
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

function fixture() {
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

function intent(f: ReturnType<typeof fixture>, request: HandoffRequest & { userCode?: string }, action: "enroll" | "rotate" = "enroll") {
  const old = f.model.keys.filter(key => key.workspaceId === f.model.workspaceId && key.workerHostId === f.model.hostId).sort((a, b) => (b.workerBindingEpoch ?? 0) - (a.workerBindingEpoch ?? 0))[0];
  return { schemaVersion: "worker-credential-lifecycle-v1" as const, action, workspaceId: f.model.workspaceId, installationId: f.model.installationId, hostId: f.model.hostId,
    expectedCredentialId: old?.id ?? null, expectedVersion: old?.credentialVersion ?? 0, expectedEpoch: old?.workerBindingEpoch ?? 0, expectedFingerprint: old ? workerTicketFingerprint(old.keyHash!) : null,
    expiresAt: new Date(f.model.now.getTime() + 3600000).toISOString(), validUntil: new Date(f.model.now.getTime() + 90000).toISOString(),
    handoff: { requestId: request.requestId, requestDigest: (request as any).requestDigest ?? f.model.rows.find(row => row.requestId === request.requestId)?.requestDigest ?? handoffHash("code", request.requestId), hostFingerprint: request.hostFingerprint, origin: request.origin,
      certificateFingerprint: request.certificateFingerprint, replacesRequestId: request.replacesRequestId } };
}

async function approve(f: ReturnType<typeof fixture>, request: any, action: "enroll" | "rotate" = "enroll") {
  const command = { requestId: randomUUID(), decisionId: randomUUID(), decisionRevision: 1, explicitAcceptance: true, intent: intent(f, request, action) };
  const approved = await f.service("approve", f.ownerAuth, { requestId: request.requestId, userCode: request.userCode, command });
  return { command, approved };
}

test("device request has no credential authority and owner approval is exact", async () => {
  const f = fixture(), request = f.requestBase(), created: any = await f.service("request", undefined, f.wire(request));
  assert.equal(created.state, "requested"); assert.match(created.userCode, /^[A-F0-9]{8}$/); assert.equal(created.qualification, "synthetic_memory_only");
  assert.equal(f.model.rows[0].creatorUserId, null); assert.equal("key" in created, false); assert.equal(f.model.operations.length, 0);
  const valid = { ...request, userCode: created.userCode }, command = { requestId: randomUUID(), decisionId: randomUUID(), decisionRevision: 1, explicitAcceptance: true, intent: intent(f, valid) };
  await assert.rejects(f.service("approve", f.workerAuth, { requestId: request.requestId, userCode: created.userCode, command }), /worker_handoff_forbidden/);
  await assert.rejects(f.service("approve", f.ownerAuth, { requestId: request.requestId, userCode: "00000000", command }), /worker_handoff_approval_invalid/);
  assert.equal(f.model.rows[0].badAttempts, 1); f.wipe(request);
});

test("twenty concurrent polls deliver exactly one raw credential and only ack activates it", async () => {
  const f = fixture(), request = f.requestBase(), created: any = await f.service("request", undefined, f.wire(request)); request.userCode = created.userCode; await approve(f, request);
  const results: any[] = await Promise.all(Array.from({ length: 20 }, () => f.service("poll", undefined, f.proof(request))));
  const delivered = results.filter(result => result.key); assert.equal(delivered.length, 1); assert.equal(f.delivered.length, 1); assert.equal(f.model.keys.length, 1); assert.equal(f.model.keys[0].active, false);
  assert.equal((await f.service("poll", undefined, f.proof(request))).key, undefined);
  const first = delivered[0], keyHash = hashApiKey(first.key), ack = { ...f.proof(request), credentialId: first.credential.id, credentialFingerprint: workerTicketFingerprint(keyHash), responseDigest: first.responseDigest, ackProof: handoffAckProof(keyHash, request.requestId, first.responseDigest) };
  const acknowledged: any = await f.service("ack", undefined, ack); assert.equal(acknowledged.state, "acknowledged"); assert.equal(f.model.keys[0].active, true); assert.equal(acknowledged.key, undefined);
  assert.equal((await f.service("status", undefined, f.proof(request))).state, "acknowledged"); assert.equal(f.model.operations.length, 1);
  assert.ok(f.model.audits.every(value => !JSON.stringify(value).includes(first.key))); assert.ok(f.model.operations.every(value => !JSON.stringify(value).includes(first.key))); first.key = ""; results.forEach(result => { if (result.key) result.key = ""; }); f.wipe(request);
});

test("lost response becomes delivery_unknown and recovery requires a new explicit request", async () => {
  const f = fixture(), request = f.requestBase(), created: any = await f.service("request", undefined, f.wire(request)); request.userCode = created.userCode; await approve(f, request);
  const lost: any = (await f.service("poll", undefined, f.proof(request))); assert.ok(lost.key); const oldId = lost.credential.id; lost.key = "";
  f.model.now = new Date(f.model.now.getTime() + handoffPolicy.ackTtlMs + 1);
  const terminal: any = await f.service("status", undefined, f.proof(request)); assert.equal(terminal.state, "delivery_unknown"); assert.equal(f.model.keys[0].active, false); assert.ok(f.model.keys[0].revokedAt);
  f.model.now = new Date(f.model.now.getTime() + 61000); const recovery = f.requestBase(); recovery.replacesRequestId = request.requestId; const next: any = await f.service("request", undefined, f.wire(recovery)); recovery.userCode = next.userCode;
  await approve(f, recovery); const delivered: any = await f.service("poll", undefined, f.proof(recovery)); assert.ok(delivered.key); assert.notEqual(delivered.credential.id, oldId); delivered.key = ""; assert.equal(f.model.keys.filter(key => key.active).length, 0);
  assert.equal((await f.service("poll", undefined, f.proof(request))).key, undefined); assert.equal(f.model.rows.find(row => row.requestId === request.requestId)!.state, "delivery_unknown"); f.wipe(request); f.wipe(recovery);
});

test("proof, origin, certificate and concurrent recovery drift fail closed", async () => {
  const f = fixture(), request = f.requestBase(), created: any = await f.service("request", undefined, f.wire(request)); request.userCode = created.userCode; await approve(f, request);
  const badDevice = f.proof(request); badDevice.deviceSecret = randomBytes(48);
  await assert.rejects(f.service("poll", undefined, badDevice), /worker_handoff_proof_invalid/);
  const badChallenge = f.proof(request); badChallenge.challenge = randomBytes(48);
  await assert.rejects(f.service("poll", undefined, badChallenge), /worker_handoff_proof_invalid/);
  const drifted = f.requestBase(); f.transport({ qualification: "synthetic_memory_only", requestedOrigin: drifted.origin, connectedOrigin: "https://proxy.example.test:9443", certificateFingerprint: drifted.certificateFingerprint, tlsValidated: true, redirected: false, proxyOrigin: "https://proxy.example.test:9443" });
  await assert.rejects(f.service("request", undefined, f.wire(drifted)), /worker_handoff_transport_invalid/);
  f.transport({ qualification: "synthetic_memory_only", requestedOrigin: drifted.origin, connectedOrigin: drifted.origin, certificateFingerprint: "c".repeat(64), tlsValidated: true, redirected: true, proxyOrigin: null });
  await assert.rejects(f.service("request", undefined, f.wire(drifted)), /worker_handoff_transport_invalid/);
  f.transport({ qualification: "synthetic_memory_only", requestedOrigin: request.origin, connectedOrigin: request.origin, certificateFingerprint: request.certificateFingerprint, tlsValidated: true, redirected: false, proxyOrigin: null });
  f.model.now = new Date(f.model.now.getTime() + handoffPolicy.ackTtlMs + 61000); await f.service("status", undefined, f.proof(request));
  f.model.now = new Date(f.model.now.getTime() + 61000);
  const replacements = [f.requestBase(), f.requestBase()]; replacements.forEach(row => { row.replacesRequestId = request.requestId; });
  const requested: any[] = await Promise.all(replacements.map(row => f.service("request", undefined, f.wire(row))));
  requested.forEach((row, index) => { replacements[index].userCode = row.userCode; });
  await Promise.all(replacements.map(row => approve(f, row)));
  const delivered = await Promise.all(replacements.map(row => f.service("poll", undefined, f.proof(row)).catch(error => error)));
  assert.equal(delivered.filter(row => row && row.key).length, 1); assert.equal(f.model.keys.filter(key => key.active).length, 0); assert.ok(delivered.some(row => row?.code === "worker_handoff_generation_changed")); delivered.forEach(row => { if (row?.key) row.key = ""; }); f.wipe(request); replacements.forEach(row => f.wipe(row));
});

test("wrong transport, device proof, challenge, origin and certificate fail closed; attempts lock", async () => {
  const f = fixture(), request = f.requestBase();
  f.transport({ qualification: "synthetic_memory_only", requestedOrigin: request.origin, connectedOrigin: request.origin, certificateFingerprint: request.certificateFingerprint, tlsValidated: false, redirected: false, proxyOrigin: null });
  await assert.rejects(f.service("request", undefined, f.wire(request)), /worker_handoff_transport_invalid/);
  f.transport({ qualification: "synthetic_memory_only", requestedOrigin: request.origin, connectedOrigin: request.origin, certificateFingerprint: request.certificateFingerprint, tlsValidated: true, redirected: false, proxyOrigin: null });
  const created: any = await f.service("request", undefined, f.wire(request)); request.userCode = created.userCode;
  const command = { requestId: randomUUID(), decisionId: randomUUID(), decisionRevision: 1, explicitAcceptance: true, intent: intent(f, request) };
  for (let i = 0; i < handoffPolicy.maxBadAttempts; i++) await assert.rejects(f.service("approve", f.ownerAuth, { requestId: request.requestId, userCode: "00000000", command }), i === handoffPolicy.maxBadAttempts - 1 ? /worker_handoff_locked/ : /worker_handoff_approval_invalid/);
  assert.equal(f.model.rows[0].state, "locked");
  assert.equal((await f.service("approve", f.ownerAuth, { requestId: request.requestId, userCode: request.userCode, command }) as any).state, "locked"); f.wipe(request);
});

test("missing delivery or non-HTTPS transport is unavailable by default", async () => {
  const f = fixture(), request = f.requestBase();
  const unavailable = createWorkerHandoffService(f.store, undefined, () => f.model.now);
  await assert.rejects(unavailable("request", undefined, f.wire(request)), /worker_handoff_unavailable/);
  f.transport({ ...({ qualification: "synthetic_memory_only", requestedOrigin: "http://worker.example.test", connectedOrigin: "http://worker.example.test", certificateFingerprint: "a".repeat(64), tlsValidated: true, redirected: false, proxyOrigin: null } as SyntheticHandoffTransport) });
  await assert.rejects(f.service("request", undefined, f.wire(request)), /worker_handoff_transport_invalid/); f.wipe(request);
});

test("handoff cannot create task, ticket, provider or launch authority", async () => {
  const f = fixture(), request = f.requestBase(), created: any = await f.service("request", undefined, f.wire(request)); request.userCode = created.userCode; await approve(f, request);
  const result: any = await f.service("poll", undefined, f.proof(request)); assert.equal(result.launchAuthority, false); result.key = ""; assert.equal(f.model.tickets[0].state, "issued"); assert.equal(f.model.claims[0].blocked, false);
  assert.equal(f.model.operations.length, 0); assert.equal(f.model.events.length, 0); f.wipe(request);
});
