import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import childProcess from "node:child_process";
import express from "express";
import type { ApiKey } from "@prisma/client";
import { hashApiKey } from "../auth/api-key";
import { createAuthToken, verifyAuthToken } from "../auth/token";
import { createAuthContextMiddleware, type AuthContext } from "../auth/api-key.middleware";
import { workerClaimAllowed, workerTicketPrincipal, workerTicketFingerprint } from "../auth/worker-ticket-principal";
import { createWorkerCredentialService, freshWorkerOwner, safeWorkerCredential, WorkerCredentialError, type WorkerCredentialStore, type WorkerCredentialTx, type SyntheticWorkerDelivery } from "../modules/api-keys/worker-credential.service";
import { workerCredentialCommand, type WorkerCredentialCommand } from "../modules/api-keys/worker-credential-contract";
import { workerCredentialHandler } from "../modules/api-keys/worker-credential-http";
import { createPrismaWorkerCredentialStore } from "../modules/api-keys/worker-credential-store";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";
import { executionProviderRegistry } from "../modules/agent-runtime/execution-provider";

function fixture() {
  const workspaceId = randomUUID(), hostId = randomUUID(), installationId = randomUUID(), ownerId = randomUUID();
  const now = new Date();
  const auth: AuthContext = { authType: "user", workspaceId, userId: ownerId, workspaceRole: "owner", authenticatedAt: Math.floor(now.getTime() / 1000) };
  let state = { ownerId, membership: true, host: { id: hostId, workspaceId, status: "online", installationId }, keys: [] as ApiKey[],
    decisions: [] as { id: string; revision: number; actor: string; state: string; authority: string; intent: any }[],
    operations: [] as any[], events: [] as any[], tickets: [] as any[], claims: [] as any[] };
  let tail = Promise.resolve(), fault = "", generated = 0, delivered = 0;
  const buffers: Buffer[] = [], exposed: string[] = [];
  const fail = (name: string) => { if (fault === name) throw Error("synthetic internal failure with forbidden diagnostic"); };
  const store: WorkerCredentialStore = { transaction(work) {
    const result = tail.then(async () => {
      const draft = structuredClone(state);
      const tx: WorkerCredentialTx = {
        primaryOwner: async a => draft.membership && a.workspaceId === workspaceId && draft.ownerId === a.userId,
        decision: async (input, actor) => draft.decisions.some(d => d.id === input.decisionId && d.revision === input.decisionRevision && d.actor === actor
          && d.state === "accepted" && d.authority === "owner_reserved" && reviewDigest(d.intent) === reviewDigest(input.intent)),
        host: async intent => draft.host.id === intent.hostId && draft.host.workspaceId === intent.workspaceId && draft.host.installationId === intent.installationId && draft.host.status !== "disabled",
        previous: async (w, requestId) => draft.operations.find(o => o.workspaceId === w && o.requestId === requestId) ?? null,
        latest: async (w, h) => draft.keys.filter(k => k.workspaceId === w && k.workerHostId === h).sort((a, b) => b.workerBindingEpoch! - a.workerBindingEpoch!)[0] ?? null,
        revoke: async (key, at) => { const k = draft.keys.find(k => k.id === key.id)!; k.active = false; k.revokedAt = at; k.credentialVersion++; fail("revoke"); return k; },
        insert: async key => {
          assert.equal(draft.keys.filter(k => k.active && !k.revokedAt && k.workerHostId === key.workerHostId).length, 0);
          assert.equal(draft.keys.some(k => k.keyHash === key.keyHash), false);
          draft.keys.push(structuredClone(key)); fail("insert");
        },
        invalidate: async key => {
          for (const t of draft.tickets.filter(t => t.credentialId === key.id && t.state === "issued")) { t.state = "revoked"; t.version++; }
          for (const c of draft.claims.filter(c => c.hostId === key.workerHostId)) { c.blocked = true; c.retryable = false; }
          fail("invalidate");
        },
        record: async (input, actorId, requestHash, key) => {
          assert.equal(draft.operations.some(o => o.decisionId === input.decisionId), false);
          const snapshot = safeWorkerCredential(key);
          draft.operations.push({ workspaceId, requestId: input.requestId, decisionId: input.decisionId, decisionRevision: input.decisionRevision, actorId, requestHash, keyId: key.id, snapshot });
          draft.events.push({ action: input.intent.action, actorId, decisionId: input.decisionId, decisionRevision: input.decisionRevision, snapshot }); fail("record");
        }
      };
      const result = await work(tx); fail("commit"); state = draft; return result;
    });
    tail = result.then(() => {}, () => {}); return result;
  } };
  const delivery: SyntheticWorkerDelivery = { qualification: "synthetic_memory_only",
    generate: async () => { generated++; const b = Buffer.from("synthetic_" + randomUUID() + randomUUID()); buffers.push(b); return b; },
    hash: async b => hashApiKey(b.toString()), deliver: async b => { delivered++; const value = b.toString(); exposed.push(value); return value; } };
  const service = createWorkerCredentialService(store, { delivery, now: () => now });
  function command(action: "enroll" | "rotate" | "revoke" = "enroll", patch: Record<string, unknown> = {}) {
    const current = state.keys.filter(k => k.workerHostId === hostId).sort((a, b) => b.workerBindingEpoch! - a.workerBindingEpoch!)[0];
    const input = workerCredentialCommand.parse({ requestId: randomUUID(), decisionId: randomUUID(), decisionRevision: 1, explicitAcceptance: true,
      intent: { schemaVersion: "worker-credential-lifecycle-v1", action, workspaceId, installationId, hostId,
        expectedCredentialId: current?.id ?? null, expectedEpoch: current?.workerBindingEpoch ?? 0, expectedVersion: current?.credentialVersion ?? 0,
        expectedFingerprint: current ? workerTicketFingerprint(current.keyHash!) : null,
        expiresAt: action === "revoke" ? null : new Date(now.getTime() + 3600000).toISOString(), validUntil: new Date(now.getTime() + 300000).toISOString(), ...patch } });
    state.decisions.push({ id: input.decisionId, revision: 1, actor: ownerId, state: "accepted", authority: "owner_reserved", intent: structuredClone(input.intent) });
    return input;
  }
  const db: any = {
    apiKey: { findUnique: async ({ where }: any) => state.keys.find(k => k.id === where.id) ?? null,
      findFirst: async ({ where }: any) => { const k = state.keys.find(k => k.keyHash === where.OR[0].keyHash); return k ? { ...k, workerHost: state.host.id === k.workerHostId ? state.host : null } : null; },
      update: async () => { throw Error("Worker authentication must not write outside its command"); } },
    workspaceMembership: { findUnique: async ({ where }: any) => state.membership && where.workspaceId_userId.userId === state.ownerId ? { role: "owner" } : null },
    trustedProviderTicketKey: { findUnique: async () => ({ installationId: state.host.installationId }) },
    agentHost: { findFirst: async ({ where }: any) => where.id === state.host.id && where.workspaceId === state.host.workspaceId && state.host.status !== "disabled" ? state.host : null }
  };
  return { workspaceId, hostId, installationId, ownerId, now, auth, store, delivery, service, command, db, buffers, exposed,
    state: () => state, fault: (v: string) => { fault = v; }, counts: () => ({ generated, delivered }) };
}

test("owner lifecycle retains history, one current generation and one synthetic disclosure", async t => {
  for (const method of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"] as const)
    t.mock.method(childProcess, method, () => { throw Error("target process forbidden"); });
  const beforeRegistry = structuredClone(executionProviderRegistry), f = fixture(), enroll = f.command();
  const first = await f.service(f.auth, "enroll", enroll);
  assert.equal(first.credential.epoch, 1); assert.equal(first.launchAuthority, false); assert.equal(first.transportQualified, false); assert.equal(first.realProvisioningQualified, false);
  assert.equal("launchReceipt" in first, false); assert.deepEqual(first.credential.scopes, ["agent-runtime:claim"]);
  const replay = await f.service(f.auth, "enroll", enroll); assert.equal(replay.key, null); assert.equal(replay.replayed, true);
  f.state().tickets.push({ credentialId: first.credential.id, state: "issued", version: 1 }, { credentialId: first.credential.id, state: "consumed", version: 2 });
  f.state().claims.push({ hostId: f.hostId, attempt: 1, checkpoint: "retained", blocked: false, retryable: true });
  const second = await f.service(f.auth, "rotate", f.command("rotate"));
  assert.equal(second.credential.epoch, 2); assert.equal(f.state().keys[0].active, false); assert.ok(f.state().keys[0].revokedAt);
  assert.equal(f.state().tickets[0].state, "revoked"); assert.equal(f.state().tickets[1].state, "consumed");
  assert.deepEqual(f.state().claims[0], { hostId: f.hostId, attempt: 1, checkpoint: "retained", blocked: true, retryable: false });
  const revoke = f.command("revoke"), revoked = await f.service(f.auth, "revoke", revoke);
  assert.equal(revoked.key, null); assert.equal(revoked.credential.active, false);
  const snapshot = structuredClone(f.state()); assert.equal((await f.service(f.auth, "revoke", revoke)).replayed, true); assert.deepEqual(f.state(), snapshot);
  await assert.rejects(f.service(f.auth, "rotate", f.command("rotate")), /revoked/);
  const third = await f.service(f.auth, "enroll", f.command()); assert.equal(third.credential.epoch, 3);
  assert.equal(f.state().keys.filter(k => k.active && !k.revokedAt).length, 1); assert.equal(f.state().keys.length, 3);
  assert.equal(f.state().operations.length, 4); assert.equal(f.state().events.length, 4);
  for (const op of f.state().operations) { assert.equal(op.actorId, f.ownerId); assert.equal(op.decisionRevision, 1); }
  for (const secret of f.exposed) assert.ok(!JSON.stringify(f.state()).includes(secret));
  assert.ok(f.buffers.every(b => b.every(x => x === 0))); assert.deepEqual(f.counts(), { generated: 3, delivered: 3 });
  assert.deepEqual(executionProviderRegistry, beforeRegistry);
});

const actors: Record<string, (f: ReturnType<typeof fixture>) => AuthContext> = {
  nonPrimary: f => ({ ...f.auth, userId: randomUUID() }), admin: f => ({ ...f.auth, workspaceRole: "admin" }),
  ordinaryUser: f => ({ ...f.auth, workspaceRole: "member" }), apiKey: f => ({ ...f.auth, authType: "api_key", apiKeyId: randomUUID() }),
  agent: f => ({ ...f.auth, agentId: randomUUID() }), Worker: f => ({ ...f.auth, authType: "api_key", userId: undefined, workerTicketIdentity: {} as any }),
  oldLogin: f => ({ ...f.auth, authenticatedAt: f.auth.authenticatedAt! - 301 }), legacyLogin: f => ({ ...f.auth, authenticatedAt: undefined }),
  futureLogin: f => ({ ...f.auth, authenticatedAt: f.auth.authenticatedAt! + 10 }), foreignWorkspace: f => ({ ...f.auth, workspaceId: randomUUID() })
};
for (const [name, actor] of Object.entries(actors)) test(`lifecycle denies ${name} before generation or persistence`, async () => {
  const f = fixture(), command = f.command(), before = structuredClone(f.state());
  await assert.rejects(f.service(actor(f), "enroll", command), WorkerCredentialError);
  assert.deepEqual(f.state(), before); assert.deepEqual(f.counts(), { generated: 0, delivered: 0 });
});
const drift: Record<string, (f: ReturnType<typeof fixture>, c: WorkerCredentialCommand) => void> = {
  missingDecision: f => { f.state().decisions.length = 0; }, staleDecision: f => { f.state().decisions[0].revision++; },
  unacceptedDecision: f => { f.state().decisions[0].state = "pending"; }, delegatedDecision: f => { f.state().decisions[0].authority = "delegated"; },
  wrongDecisionActor: f => { f.state().decisions[0].actor = randomUUID(); }, changedPrimaryOwner: f => { f.state().ownerId = randomUUID(); },
  inactiveMembership: f => { f.state().membership = false; }, changedInstallation: f => { f.state().host.installationId = randomUUID(); },
  reassignedHost: f => { f.state().host.workspaceId = randomUUID(); }, disabledHost: f => { f.state().host.status = "disabled"; },
  deletedHost: f => { f.state().host.id = randomUUID(); }, requestHost: (_f, c) => { c.intent.hostId = randomUUID(); },
  requestInstallation: (_f, c) => { c.intent.installationId = randomUUID(); }, missingConfirmation: (_f, c) => { (c as any).explicitAcceptance = false; },
  extraSecret: (_f, c) => { (c as any).secret = "synthetic-input-not-allowed"; }
};
for (const [name, mutate] of Object.entries(drift)) test(`lifecycle blocks ${name}`, async () => {
  const f = fixture(), c = f.command(); mutate(f, c); const before = structuredClone(f.state());
  await assert.rejects(f.service(f.auth, "enroll", c), WorkerCredentialError); assert.deepEqual(f.state(), before); assert.equal(f.counts().generated, 0);
});
for (const missing of ["all", "generate", "hash", "deliver"] as const) test(`missing ${missing} composition is unavailable`, async () => {
  const f = fixture();
  const service = createWorkerCredentialService(f.store, { delivery: missing === "all" ? undefined : { ...f.delivery, [missing]: undefined } as any });
  await assert.rejects(service(f.auth, "enroll", f.command()), /unavailable/); assert.equal(f.counts().generated, 0); assert.equal(f.state().keys.length, 0);
});
for (const stage of ["revoke", "invalidate", "insert", "record", "commit"]) test(`rotation rollback after ${stage} preserves old credential and authority`, async () => {
  const f = fixture(), first = await f.service(f.auth, "enroll", f.command());
  f.state().tickets.push({ credentialId: first.credential.id, state: "issued", version: 1 });
  f.state().claims.push({ hostId: f.hostId, attempt: 1, checkpoint: "retained", blocked: false, retryable: true });
  const rotate = f.command("rotate"), before = structuredClone(f.state()); f.fault(stage);
  await assert.rejects(f.service(f.auth, "rotate", rotate), /unavailable/); assert.deepEqual(f.state(), before);
  assert.equal(f.counts().delivered, 1); assert.ok(f.buffers.every(b => b.every(x => x === 0)));
});
for (const race of ["enrollment", "rotation", "rotate-revoke", "revoke-rotate"]) test(`concurrent ${race} keeps exactly one current generation`, async () => {
  const f = fixture(); if (race !== "enrollment") await f.service(f.auth, "enroll", f.command());
  const commands = Array.from({ length: 20 }, (_, i) => f.command(race === "enrollment" ? "enroll" : race === "rotate-revoke" && i % 2 || race === "revoke-rotate" && !(i % 2) ? "revoke" : "rotate"));
  const outcomes = await Promise.allSettled(commands.map(c => f.service(f.auth, c.intent.action, c)));
  assert.equal(outcomes.filter(r => r.status === "fulfilled").length, 1);
  for (const r of outcomes) if (r.status === "rejected") assert.ok(r.reason instanceof WorkerCredentialError);
  assert.equal(f.state().keys.filter(k => k.active && !k.revokedAt).length, race === "revoke-rotate" ? 0 : 1);
  assert.equal(f.state().operations.length, race === "enrollment" ? 1 : 2);
});
test("workspace token reissue preserves the original authentication age and legacy absence", () => {
  const f = fixture(), old = Math.floor(Date.now() / 1000) - 3600;
  const renewed = verifyAuthToken(createAuthToken({ userId: f.ownerId, workspaceId: randomUUID() }, old))!;
  assert.equal(renewed.authTime, old); assert.equal(freshWorkerOwner({ ...f.auth, authenticatedAt: renewed.authTime }, new Date()), false);
  const legacy = verifyAuthToken(createAuthToken({ userId: f.ownerId, workspaceId: f.workspaceId }, null))!;
  assert.equal(legacy.authTime, undefined); assert.equal(freshWorkerOwner({ ...f.auth, authenticatedAt: legacy.authTime }, new Date()), false);
});
for (const [name, patch] of Object.entries({ version: { expectedVersion: 2 }, epoch: { expectedEpoch: 2 },
  fingerprint: { expectedFingerprint: "0".repeat(64) }, generation: { expectedCredentialId: randomUUID() },
  expiredDecision: { validUntil: "2000-01-01T00:00:00.000Z" }, pastExpiry: { expiresAt: "2000-01-01T00:00:00.000Z" },
  unboundedExpiry: { expiresAt: "2099-01-01T00:00:00.000Z" } })) test(`accepted ${name} mismatch cannot rotate a generation`, async () => {
  const f = fixture(); await f.service(f.auth, "enroll", f.command());
  const command = f.command("rotate", patch), before = structuredClone(f.state());
  await assert.rejects(f.service(f.auth, "rotate", command), WorkerCredentialError); assert.deepEqual(f.state(), before); assert.equal(f.counts().generated, 1);
});
test("active enrollment and reactivation attempts cannot replace an existing generation", async () => {
  const f = fixture(); await f.service(f.auth, "enroll", f.command());
  await assert.rejects(f.service(f.auth, "enroll", f.command()), /already_bound/);
  const revoked = f.command("revoke"); await f.service(f.auth, "revoke", revoked);
  await assert.rejects(f.service(f.auth, "revoke", { ...revoked, requestId: randomUUID() }), /stale/);
  await assert.rejects(f.service(f.auth, "enroll", { ...f.command(), active: true }), /validation_error/);
  assert.equal(f.state().keys.filter(k => k.active).length, 0);
});
test("hash reuse and malformed generator output roll back rotation without disclosure", async () => {
  const f = fixture(); await f.service(f.auth, "enroll", f.command());
  const command = f.command("rotate"), before = structuredClone(f.state());
  for (const delivery of [{ ...f.delivery, hash: async () => before.keys[0].keyHash! }, { ...f.delivery, generate: async () => Buffer.from("short") }]) {
    await assert.rejects(createWorkerCredentialService(f.store, { delivery })(f.auth, "rotate", command), /unavailable/);
    assert.deepEqual(f.state(), before);
  }
});
test("concurrent request replay reveals a synthetic secret once and cannot change payload", async () => {
  const f = fixture(), input = f.command();
  const r = await Promise.all(Array.from({ length: 20 }, () => f.service(f.auth, "enroll", input)));
  assert.equal(r.filter(r => r.key).length, 1); assert.equal(r.filter(r => r.replayed).length, 19);
  assert.equal(f.counts().generated, 1); assert.equal(f.state().operations.length, 1);
  const changed = f.command(); changed.requestId = input.requestId;
  await assert.rejects(f.service(f.auth, "enroll", changed), /request_conflict/);
});
test("failed synthetic disclosure is never replayed and diagnostic exceptions are bounded", async () => {
  const f = fixture(), command = f.command(), logs: any[] = [], prior = console.error; console.error = (...v) => logs.push(v);
  try {
    const service = createWorkerCredentialService(f.store, { delivery: { ...f.delivery, deliver: async secret => { throw Error(secret.toString()); } } });
    await assert.rejects(service(f.auth, "enroll", command), e => e instanceof WorkerCredentialError && e.message === "worker_credential_unavailable");
    assert.equal(f.state().keys.length, 1); assert.equal((await service(f.auth, "enroll", command)).key, null);
    assert.ok(f.buffers.every(b => b.every(x => x === 0))); assert.deepEqual(logs, []);
  } finally { console.error = prior; }
});

test("real HTTP auth restricts lifecycle and bound Worker routes; old credentials lose all three operations", async t => {
  const f = fixture(), app = express(); app.use(express.json()); app.use(createAuthContextMiddleware(f.db));
  for (const action of ["enroll", "rotate", "revoke"] as const) app.post(`/v1/api-keys/worker-credentials/${action}`, workerCredentialHandler(action, f.service));
  for (const action of ["consume", "status"] as const) app.post(`/v1/agent-runtime/owner-tickets/${action}`, (req, res) => res.json({ data: { launchAuthority: false, identity: req.auth!.workerTicketIdentity } }));
  app.post("/v1/agent-runtime/executions/claim", async (req, res) => res.status(await workerClaimAllowed(f.db, req.auth!, req.body.hostId) ? 200 : 403).json({ launchAuthority: false }));
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(r => server.once("listening", r)); t.after(() => new Promise<void>(r => server.close(() => r())));
  const jwt = createAuthToken({ workspaceId: f.workspaceId, userId: f.ownerId }); assert.ok(verifyAuthToken(jwt)!.authTime);
  f.now.setTime(Date.now());
  const post = async (path: string, input: any, headers: Record<string, string>) => {
    const r = await fetch(`http://127.0.0.1:${(server.address() as any).port}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(input) });
    return { status: r.status, cache: r.headers.get("cache-control"), text: await r.text() };
  };
  const lifecycle = "/v1/api-keys/worker-credentials/", human = { Authorization: `Bearer ${jwt}` };
  const first = await post(lifecycle + "enroll", f.command(), human); assert.equal(first.status, 200, first.text); assert.equal(first.cache, "no-store");
  const raw = JSON.parse(first.text).data.key, worker = { "X-API-Key": raw };
  for (const action of ["enroll", "rotate", "revoke"]) assert.equal((await post(lifecycle + action, {}, worker)).status, 403);
  for (const path of ["/v1/agent-runtime/hosts/register", "/v1/agent-runtime/executions/00000000-0000-4000-8000-000000000000/actions/recover", "/v1/agent-runtime/owner-tickets/issue", "/v1/decisions/governance", "/v1/agent-runtime/providers/direct_codex", "/v1/agent-runtime/providers/codex_app_server", "/v1/agent-runtime/providers/hermes_manual"])
    assert.equal((await post(path, {}, worker)).status, 403);
  const allowed = ["/v1/agent-runtime/executions/claim", "/v1/agent-runtime/owner-tickets/consume", "/v1/agent-runtime/owner-tickets/status"];
  for (const path of allowed) { const r = await post(path, { hostId: f.hostId }, worker); assert.equal(r.status, 200, r.text); assert.ok(!r.text.includes(raw)); }
  assert.equal((await post(allowed[0], { hostId: randomUUID() }, worker)).status, 403);
  const rotated = await post(lifecycle + "rotate", f.command("rotate"), human); assert.equal(rotated.status, 200, rotated.text);
  for (const path of allowed) assert.equal((await post(path, { hostId: f.hostId }, worker)).status, 403);
  const next = { "X-API-Key": JSON.parse(rotated.text).data.key };
  assert.equal((await post(allowed[0], { hostId: f.hostId }, next)).status, 200);
  f.state().host.status = "disabled"; for (const path of allowed) assert.equal((await post(path, { hostId: f.hostId }, next)).status, 403);
  (f.delivery as any).generate = undefined;
  for (const action of ["enroll", "rotate", "revoke"] as const) {
    const unavailable = await post(lifecycle + action, f.command(action), human);
    assert.equal(unavailable.status, 503, unavailable.text); assert.ok(!unavailable.text.includes(raw));
  }
});
test("stale claim principal denies credential version epoch fingerprint and installation changes", async () => {
  const f = fixture(); await f.service(f.auth, "enroll", f.command());
  const key = f.state().keys[0], auth: AuthContext = { authType: "api_key", workspaceId: f.workspaceId, apiKeyId: key.id, workerTicketIdentity: workerTicketPrincipal(key)! };
  assert.equal(await workerClaimAllowed(f.db, auth, f.hostId), true);
  for (const patch of [{ credentialVersion: 2 }, { workerBindingEpoch: 2 }, { keyHash: "0".repeat(64) }, { workerInstallationId: randomUUID() },
    { expiresAt: new Date(0) }, { active: false }, { scopes: ["agent-runtime:claim", "agent-runtime:write"] }]) {
    const before = structuredClone(key); Object.assign(key, patch);
    assert.equal(await workerClaimAllowed(f.db, auth, f.hostId), false); Object.assign(key, before);
  }
});
test("Prisma decision projection requires current explicit owner acceptance of the exact intent", async () => {
  const f = fixture(), command = f.command();
  const row: any = { version: command.decisionRevision, body: { workerCredential: command.intent }, actor_user_id: f.ownerId,
    actor_agent_id: null, authority: { status: "owner_reserved" }, created_at: new Date(f.now.getTime() - 1000), state: "accepted" };
  const store = createPrismaWorkerCredentialStore({ $transaction: async (work: any) => work({ $executeRaw: async () => 1, $queryRaw: async () => [row] }) } as any);
  assert.equal(await store.transaction(tx => tx.decision(command, f.ownerId, f.now)), true);
  for (const patch of [{ version: 2 }, { actor_user_id: randomUUID() }, { actor_agent_id: randomUUID() },
    { authority: { status: "delegated" } }, { created_at: new Date(f.now.getTime() + 1000) }, { state: "pending" },
    { body: {} }, { body: { workerCredential: { ...command.intent, hostId: randomUUID() } } }]) {
    const before = structuredClone(row); Object.assign(row, patch);
    assert.equal(await store.transaction(tx => tx.decision(command, f.ownerId, f.now)), false); Object.assign(row, before);
  }
});
test("Prisma lifecycle uses one serializable transaction without retries; unknown errors are redacted", async () => {
  let calls = 0; const statements: string[] = [];
  const store = createPrismaWorkerCredentialStore({ $transaction: async (work: any, options: any) => {
    calls++; assert.equal(options.isolationLevel, "Serializable");
    return work({ $executeRaw: async (s: TemplateStringsArray) => { statements.push(s.join("?")); return 1; } });
  } } as any);
  await store.transaction(async () => true); assert.match(statements[0], /ready_source_fence/);
  await assert.rejects(store.transaction(async () => { throw Error("synthetic secret diagnostic"); }), /worker_credential_unavailable/); assert.equal(calls, 2);
});
