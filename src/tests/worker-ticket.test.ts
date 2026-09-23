import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import childProcess from "node:child_process";
import express from "express";
import { hashApiKey } from "../auth/api-key";
import { createAuthToken } from "../auth/token";
import { createAuthContextMiddleware, type AuthContext } from "../auth/api-key.middleware";
import { workerTicketPrincipal, workerClaimTokenDigest, type WorkerTicketBinding } from "../auth/worker-ticket-principal";
import { createOwnerTicketService, OwnerTicketError, ticketHash, type OwnerTicketStore, type OwnerTicketTx } from "../modules/agent-runtime/owner-ticket";
import { ownerTicketHandler } from "../modules/agent-runtime/owner-ticket-http";
import { ownerTicketFixture } from "./owner-ticket-fixture";
import { executionProviderRegistry } from "../modules/agent-runtime/execution-provider";
import { createPrismaOwnerTicketStore } from "../modules/agent-runtime/owner-ticket-store";
import { inspectReady } from "../modules/agent-runtime/task-execution-readiness";

async function fixture() {
  const f = await ownerTicketFixture(), rawKey = randomUUID(), leaseToken = randomUUID();
  const credential = { id: randomUUID(), workspaceId: f.auth.workspaceId, active: true, revokedAt: null as Date | null,
    boundAgentId: null as string | null, key: null, keyHash: hashApiKey(rawKey), credentialVersion: 1,
    workerHostId: randomUUID(), workerInstallationId: f.c.acceptance.installationId, workerBindingEpoch: 1,
    expiresAt: new Date("2099-01-01T00:00:00Z"), scopes: ["agent-runtime:claim"] };
  const identity = workerTicketPrincipal(credential)!;
  const binding: WorkerTicketBinding = { ...identity, leaseTokenDigest: workerClaimTokenDigest(leaseToken),
    claimSessionId: randomUUID(), expiresAt: f.c.acceptance.expiresAt };
  f.c.workerBinding = binding;
  f.c.contextDigest = await ticketHash({ previous: f.c.contextDigest, workerBinding: binding });
  f.input.contextDigest = f.c.contextDigest;
  const worker: AuthContext = { authType: "api_key", workspaceId: f.auth.workspaceId, apiKeyId: credential.id, workerTicketIdentity: structuredClone(identity) };
  let claimLost = false;
  const extend = (tx: OwnerTicketTx, readOnly = false): OwnerTicketTx => ({ ...tx,
    current: async (...args) => { if (claimLost) throw new OwnerTicketError("owner_ticket_claim_changed"); return tx.current(...args); },
    worker: async (auth, row, now) => {
      const current = workerTicketPrincipal(credential, now), b = row.workerBinding;
      if (!b || !current || auth.apiKeyId !== credential.id) return false;
      const { leaseTokenDigest, claimSessionId, expiresAt, ...expected } = b;
      return await ticketHash(current) === await ticketHash(expected) && await ticketHash(current) === await ticketHash(auth.workerTicketIdentity);
    },
    ...(readOnly ? Object.fromEntries(["insert", "transition", "spendAttempt", "audit", "rotate"].map(key => [key, () => { throw Error("read-only status attempted a mutation"); }])) : {})
  });
  const store: OwnerTicketStore = {
    transaction: work => f.store.transaction(tx => work(extend(tx))),
    read: work => f.store.transaction(tx => work(extend(tx, true)))
  };
  const service = createOwnerTicketService(store, f.options);
  const issued = await service.issue(f.auth, f.input);
  const consume = { ...f.consume(issued.ticket), worker: { hostId: identity.hostId, installationId: identity.installationId, leaseToken } };
  const { ticket, ...rest } = consume;
  const status = { ...rest, ticketId: ticket.payload.ticketId };
  const ownerStatus = () => { const { worker, ...input } = status; return input; };
  return { ...f, service, store, credential, worker, consume, status, ownerStatus, rawKey, issued, loseClaim: () => { claimLost = true; } };
}

test("assigned Worker consume and owner/Worker status are bounded, nonrenewable and effect-free", async t => {
  for (const method of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"] as const)
    t.mock.method(childProcess, method, () => { throw Error("target process forbidden"); });
  const registry = structuredClone(executionProviderRegistry), f = await fixture();
  const before = f.state();
  for (let i = 0; i < 5; i++) assert.equal((await f.service.status(f.worker, f.status)).reason, "current_unconsumed");
  assert.deepEqual(f.state(), before);
  const result = await f.service.consume(f.worker, f.consume); assert.ok("consumeAck" in result);
  const consumeId = result.consumeAck.payload.consumeId, spent = f.state();
  for (let i = 0; i < 5; i++) {
    const status = await f.service.status(f.worker, { ...f.status, consumeId });
    assert.deepEqual(Object.keys(status).sort(), ["qualification", "realIssuerQualified", "transportQualified", "launchAuthority", "state", "reason", "consumeId", "renewable"].sort());
    assert.equal(status.reason, "spent_reconcile_only"); assert.equal(status.consumeId, consumeId);
    assert.equal(status.launchAuthority, false); assert.equal(status.renewable, false);
    assert.deepEqual(await f.service.status(f.auth, f.ownerStatus()), status);
  }
  assert.deepEqual(f.state(), spent); assert.deepEqual(executionProviderRegistry, registry);
  assert.equal("launchReceipt" in result, false);
  assert.doesNotMatch(JSON.stringify(f.state()), new RegExp(f.consume.worker.leaseToken + "|" + f.rawKey + "|PRIVATE KEY"));
});

const identityChanges: Record<string, (f: Awaited<ReturnType<typeof fixture>>) => void> = {
  workspace: f => { f.worker.workspaceId = randomUUID(); }, credential: f => { f.worker.apiKeyId = randomUUID(); },
  installation: f => { f.worker.workerTicketIdentity!.installationId = randomUUID(); }, host: f => { f.worker.workerTicketIdentity!.hostId = randomUUID(); },
  fingerprint: f => { f.worker.workerTicketIdentity!.credentialFingerprint = "0".repeat(64); },
  version: f => { f.credential.credentialVersion++; }, epoch: f => { f.credential.workerBindingEpoch++; },
  inactive: f => { f.credential.active = false; }, revoked: f => { f.credential.revokedAt = new Date(); },
  credentialExpired: f => { f.credential.expiresAt = new Date("2000-01-01T00:00:00Z"); },
  agent: f => { f.worker.agentId = randomUUID(); }, userAlias: f => { f.worker.userId = f.auth.userId; },
  unboundKey: f => { delete f.worker.workerTicketIdentity; }, oldHostBinding: f => { f.credential.workerHostId = randomUUID(); }
};
for (const [name, change] of Object.entries(identityChanges)) test(`Worker consume/status deny ${name} without writes`, async () => {
  const f = await fixture(), before = f.state(); change(f);
  await assert.rejects(f.service.consume(f.worker, f.consume));
  await assert.rejects(f.service.status(f.worker, f.status));
  assert.deepEqual(f.state(), before);
});
for (const field of ["taskId", "executionId", "attempt", "claimDigest", "challenge", "ticketDigest", "hostId", "installationId", "leaseToken"]) test(`Worker proof rejects wrong ${field}`, async () => {
  const f = await fixture(), consume: any = structuredClone(f.consume), status: any = structuredClone(f.status), before = f.state();
  if (["hostId", "installationId", "leaseToken"].includes(field)) consume.worker[field] = status.worker[field] = randomUUID();
  else consume[field] = status[field] = field === "attempt" ? 2 : field.endsWith("Id") ? randomUUID() : "0".repeat(64);
  await assert.rejects(f.service.consume(f.worker, consume)); await assert.rejects(f.service.status(f.worker, status));
  assert.deepEqual(f.state(), before);
});
for (const field of ["Ready", "Writer", "input", "claimSession", "claimToken", "controllerRecovery", "direct_codex", "codex_app_server", "hermes_manual"]) test(`current ${field} drift blocks consume and status authority`, async () => {
  const f = await fixture(), before = f.state();
  if (["direct_codex", "codex_app_server", "hermes_manual"].includes(field)) f.c.acceptance.provider.kind = field;
  else if (field === "Writer") f.c.acceptance.scope.writerDigest = "0".repeat(64);
  else if (field === "input") f.c.acceptance.scope.inputSeal = "0".repeat(64);
  else if (field === "claimSession") f.c.workerBinding!.claimSessionId = randomUUID();
  else if (field === "claimToken") f.c.workerBinding!.leaseTokenDigest = "0".repeat(64);
  else if (field === "controllerRecovery") f.loseClaim();
  else f.c.contextDigest = "0".repeat(64);
  await assert.rejects(f.service.consume(f.worker, f.consume));
  const status = await f.service.status(f.worker, f.status);
  assert.match(status.reason, /changed|unavailable/); assert.equal(status.launchAuthority, false);
  assert.deepEqual(f.state(), before);
});
test("Worker cannot issue/revoke/rotate and owner cannot impersonate Worker", async () => {
  const f = await fixture(), before = f.state();
  await assert.rejects(f.service.issue(f.worker, f.input), /forbidden/);
  await assert.rejects(f.service.revoke(f.worker, { ticketId: f.status.ticketId, expectedVersion: 1 }), /forbidden/);
  await assert.rejects(f.service.rotate(f.worker, { expectedEpoch: 1, nextKeyId: "next", nextPublicKeyDigest: "0".repeat(64) }), /forbidden/);
  await assert.rejects(f.service.consume(f.auth, f.consume), /forbidden/);
  await assert.rejects(f.service.status(f.auth, f.status), /forbidden/);
  assert.deepEqual(f.state(), before);
});
test("owner and assigned Worker race commits once; foreign Worker cannot adopt consume ID", async () => {
  const f = await fixture(), other = { ...f.worker, apiKeyId: randomUUID() }, { worker, ...ownerInput } = f.consume;
  const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => f.service.consume(i % 2 ? f.worker : f.auth, i % 2 ? f.consume : ownerInput)));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  for (const r of results) if (r.status === "rejected") assert.match(r.reason.message, /owner_ticket_replayed/);
  const original = f.state().tickets[0].consumeId;
  assert.equal(f.state().audit.length, 2); assert.equal(f.state().journal.length, 2); assert.equal(f.state().spent.length, 1);
  await assert.rejects(f.service.consume(other, f.consume), /forbidden/);
  await assert.rejects(f.service.status(other, { ...f.status, consumeId: original }), /forbidden/);
  await assert.rejects(f.service.status(f.worker, { ...f.status, consumeId: randomUUID() }), /binding_invalid/);
  await assert.rejects(f.service.consume(f.worker, JSON.parse(JSON.stringify(f.consume))), /replayed/);
  assert.equal((await f.service.status(f.worker, f.status)).consumeId, original);
});
for (const stage of ["audit", "spend", "commit"] as const) test(`Worker consume ${stage} failure rolls back complete state`, async () => {
  const f = await fixture(), before = f.state(); f.faults[stage] = true;
  await assert.rejects(f.service.consume(f.worker, f.consume)); assert.deepEqual(f.state(), before);
});
for (const change of ["revocation", "rotation", "expiry", "claimLoss", "decision", "missingSigner"]) test(`status after ${change} cannot resurrect spent authority`, async () => {
  const f = await fixture();
  if (change === "revocation") await f.service.revoke(f.auth, { ticketId: f.status.ticketId, expectedVersion: 1 });
  else {
    await f.service.consume(f.worker, f.consume);
    if (change === "rotation") await f.service.rotate(f.auth, { expectedEpoch: 1, nextKeyId: "next", nextPublicKeyDigest: "0".repeat(64) });
    if (change === "expiry") f.advance(60000);
    if (change === "claimLoss") f.loseClaim();
    if (change === "decision") f.c.acceptance.revision++;
  }
  const service = change === "missingSigner" ? createOwnerTicketService(f.store, { ...f.options, signer: undefined }) : f.service;
  const before = f.state();
  for (let i = 0; i < 3; i++) {
    const result = await service.status(f.worker, f.status);
    assert.notEqual(result.reason, "current_unconsumed"); assert.equal(result.launchAuthority, false); assert.equal(result.consumeId, before.tickets[0].consumeId);
  }
  assert.deepEqual(f.state(), before);
});

test("real auth middleware derives Worker identity; HTTP output does not leak proofs", async t => {
  const f = await fixture();
  let credentialWrites = 0;
  const middleware = createAuthContextMiddleware({
    apiKey: { findFirst: async (args: any) => args.where.OR[0].keyHash === f.credential.keyHash ? f.credential : null, update: async () => { credentialWrites++; return f.credential; } },
    workspaceMembership: { findUnique: async () => ({ workspaceId: f.auth.workspaceId, userId: f.auth.userId, role: "owner" }) }
  } as any);
  const app = express(); app.use(express.json()); app.use(middleware);
  for (const action of ["issue", "consume", "status", "revoke", "rotate"] as const) app.post(`/v1/agent-runtime/owner-tickets/${action}`, ownerTicketHandler(action, f.service));
  app.post("/uncomposed", ownerTicketHandler("consume"));
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(r => server.once("listening", r));
  t.after(() => new Promise<void>(r => server.close(() => r())));
  const post = async (action: string, body: any, headers: Record<string, string> = { "X-API-Key": f.rawKey }) => {
    const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}${action === "uncomposed" ? "/uncomposed" : "/v1/agent-runtime/owner-tickets/" + action}`, {
      method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    const text = await response.text(); assert.ok(!text.includes(f.rawKey)); assert.ok(!text.includes(f.consume.worker.leaseToken));
    return { status: response.status, body: JSON.parse(text), cache: response.headers.get("cache-control") };
  };
  assert.equal((await post("status", f.status)).status, 200);
  assert.equal((await post("status/", f.status)).status, 200); assert.equal(credentialWrites, 0);
  const consumed = await post("consume", f.consume); assert.equal(consumed.status, 200); assert.equal(consumed.cache, "no-store");
  assert.equal((await post("status", f.status)).body.data.consumeId, consumed.body.data.consumeAck.payload.consumeId);
  const ownerHeaders = { Authorization: `Bearer ${createAuthToken({ workspaceId: f.auth.workspaceId, userId: f.auth.userId! })}` };
  assert.equal((await post("status", f.ownerStatus(), ownerHeaders)).status, 200);
  for (const action of ["issue", "revoke", "rotate"]) assert.equal((await post(action, {})).status, 403);
  assert.equal((await post("consume", f.consume, ownerHeaders)).status, 403);
  assert.equal(credentialWrites, 0); // Ticket success/denial has no out-of-transaction usage write.
  assert.equal((await post("uncomposed", f.consume)).status, 503);
  f.credential.active = false; assert.equal((await post("status", f.status)).status, 403);
});

test("Prisma status uses read-only Serializable transaction without locks or audit writes", async () => {
  const f = await fixture(), writes: string[] = [], reads: string[] = [], row = f.state().tickets[0];
  const db = {
    $executeRaw: async (strings: TemplateStringsArray) => { writes.push(strings.join("?")); return 1; },
    $queryRaw: async (strings: TemplateStringsArray) => { reads.push(strings.join("?")); return [{ binding: row.workerBinding }]; },
    apiKey: { findUnique: async () => f.credential }, agentHost: { findFirst: async () => ({ id: f.credential.workerHostId }) },
    trustedProviderTicket: { findFirst: async () => { const { workerBinding, ...base } = row; return base; } },
    trustedProviderTicketKey: { findUnique: async () => f.state().key },
    workspace: { findUnique: async () => ({ ownerUserId: f.auth.userId }) }, workspaceMembership: { findFirst: async () => ({ role: "owner" }) }
  };
  const store = createPrismaOwnerTicketStore({ $transaction: async (work: any, options: any) => {
    assert.equal(options.isolationLevel, "Serializable"); return work(db);
  } } as any);
  const service = createOwnerTicketService(store, f.options);
  const result = await service.status(f.worker, f.status);
  assert.equal(result.reason, "context_unavailable"); // No physical evidence adapter is installed.
  assert.equal(result.launchAuthority, false);
  assert.deepEqual(writes, ["SET TRANSACTION READ ONLY"]);
  assert.ok(reads.every(sql => !sql.includes("FOR UPDATE")));
  f.credential.credentialVersion++;
  await assert.rejects(service.status(f.worker, f.status), /forbidden/);
});

test("read-only Ready inspection reports invalidation without persisting a new pin/Event", async () => {
  const w = randomUUID(), taskId = randomUUID();
  const pin = { schemaVersion: "roost-ready-context-v1", status: "ready", pinId: randomUUID(), revision: "a".repeat(64),
    submissionId: randomUUID(), sourceWatchVersion: "1", validation: { validator: "execution-packet-v1", revision: "a".repeat(64) }, riskAssessmentId: randomUUID() };
  const db = {
    task: { findFirst: async () => ({ id: taskId, workspaceId: w, executionReadiness: pin }), update: () => { throw Error("pin mutation forbidden"); } },
    event: { create: () => { throw Error("audit mutation forbidden"); } },
    taskReviewDecision: { findFirst: async () => null }, taskReviewAction: { findUnique: async () => null },
    $executeRaw: () => { throw Error("SQL mutation forbidden"); },
    $queryRaw: async (sql: TemplateStringsArray) => {
      const text = sql.join("?");
      if (text.includes("task_interview_pending")) return [{ pending: false, present: false, version: "1", value: false }];
      return [{ value: { seal: null }, id: null, current_id: null }];
    }
  };
  const result = await inspectReady(db as any, w, taskId, undefined, true);
  assert.equal(result.error, "task_ready_revalidation_required"); assert.equal(result.readiness.status, "needs_revalidation");
  assert.equal(pin.status, "ready");
});

test("invalid binding at expiry cannot create terminal/audit effects", async () => {
  const f = await fixture(); f.advance(60000); const before = f.state();
  await assert.rejects(f.service.consume(f.worker, { ...f.consume, ticketDigest: "0".repeat(64) }), /binding_invalid/);
  assert.deepEqual(f.state(), before);
});
