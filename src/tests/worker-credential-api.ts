import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import childProcess from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { prisma } from "../db/prisma";
import { requireApiKey } from "../auth/api-key.middleware";
import { createAuthToken } from "../auth/token";
import { hashApiKey } from "../auth/api-key";
import { workerClaimAllowed, workerTicketFingerprint, workerTicketPrincipal } from "../auth/worker-ticket-principal";
import { createWorkerCredentialService, type SyntheticWorkerDelivery } from "../modules/api-keys/worker-credential.service";
import { createPrismaWorkerCredentialStore } from "../modules/api-keys/worker-credential-store";
import { workerCredentialHandler } from "../modules/api-keys/worker-credential-http";
import { createOwnerTicketService, ticketHash } from "../modules/agent-runtime/owner-ticket";
import { createPrismaOwnerTicketStore, ownerTicketClaimDigest, type OwnerTicketEvidence } from "../modules/agent-runtime/owner-ticket-store";
import { ownerTicketHandler } from "../modules/agent-runtime/owner-ticket-http";
import { ownerTicketFixture } from "./owner-ticket-fixture";
import { runtimeRedactionBoundary } from "../modules/agent-runtime/runtime-redaction-http";
import { executionProviderRegistry } from "../modules/agent-runtime/execution-provider";
import { readyTransaction } from "../modules/agent-runtime/task-execution-readiness";

// Opt-in only in an identity-checked, uniquely owned disposable database. The
// parent harness never resets this database or removes immutable fixture history.
export function registerWorkerCredentialDatabaseTests(h: any) {
  test("worker credential native PostgreSQL HTTP qualification", { skip: !process.env.WORKER_CREDENTIAL_TEST_DATABASE, timeout: 480000 }, async t => {
    const owner = await h.registerOwner(`credential-${randomUUID()}@example.test`, "Synthetic credential qualification");
    const w = owner.workspace.id, primary = await prisma.workspace.findUniqueOrThrow({ where: { id: w } });
    const ownerId = primary.ownerUserId!;
    const ownerHeaders = () => ({ Authorization: `Bearer ${createAuthToken({ workspaceId: w, userId: ownerId })}` });
    const post = (url: string, body: any, headers = ownerHeaders()) => h.request(url, { method: "POST", headers, body: JSON.stringify(body) });
    const synthetic = await ownerTicketFixture(), installationId = synthetic.state().key.installationId;
    await prisma.trustedProviderTicketKey.create({ data: { workspaceId: w, ...synthetic.state().key } });
    const host = await prisma.agentHost.create({ data: { workspaceId: w, name: "Inert credential fixture", slug: "credential-native", platform: "synthetic", status: "online" } });
    const registryBefore = structuredClone(executionProviderRegistry), buffers: Buffer[] = [], secrets: string[] = [], logs: string[] = [];
    for (const method of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"] as const)
      t.mock.method(childProcess, method, () => { throw Error("target process forbidden in credential qualification"); });
    t.mock.method(console, "error", (...args: unknown[]) => { logs.push(args.map(String).join(" ")); });
    let deliveries = 0, fault: string | undefined, missing: string | undefined;
    const delivery: SyntheticWorkerDelivery = { qualification: "synthetic_memory_only",
      generate: async () => { const b = Buffer.from(randomBytes(48).toString("base64url")); buffers.push(b); secrets.push(b.toString()); return b; },
      hash: async b => hashApiKey(b.toString()), deliver: async b => { deliveries++; return b.toString(); } };
    const store = createPrismaWorkerCredentialStore(prisma);
    const faultStore: typeof store = { transaction: work => store.transaction(async tx => {
      const result = await work(new Proxy(tx, { get(target, name: keyof typeof tx) { return async (...args: any[]) => {
        // Corrupt only the final audit input after all service checks and real
        // writes, so PostgreSQL itself must deny and roll back the transition.
        if (name === "record" && fault?.startsWith("native_")) {
          args[0] = structuredClone(args[0]);
          if (fault === "native_owner") args[1] = randomUUID();
          if (fault === "native_revision") args[0].decisionRevision++;
          if (fault === "native_intent") args[0].intent.hostId = randomUUID();
        }
        const result = await (target[name] as Function)(...args);
        if (fault === name) throw Error("synthetic failure after real write");
        return result;
      }; } }));
      if (fault === "commit") throw Error("synthetic failure before commit");
      return result;
    }) };
    let ticketClock = Date.now(), selectedDecision = "";
    const evidence: OwnerTicketEvidence = async (_db, execution, ready, decision) => {
      const a = structuredClone(synthetic.c.acceptance);
      a.decisionId = selectedDecision; a.revision = decision.version; a.decidedAt = new Date(decision.created_at).toISOString();
      a.expiresAt = new Date(ticketClock + 120000).toISOString();
      Object.assign(a.scope, { workspaceId: w, taskId: execution.taskId, executionId: execution.id, applicationId: execution.applicationId });
      a.provider.modelSelection = ready.pin.contract.modelSelection;
      a.provider.managedBackend.context.gates.durationDeadline = new Date(ticketClock + 120000).toISOString();
      return { acceptance: a, challenge: synthetic.c.challenge, writerDigest: a.scope.writerDigest, inputSeal: a.scope.inputSeal,
        readyPinId: ready.pin.pinId, readyRevision: ready.pin.revision,
        claimDigest: ownerTicketClaimDigest(execution, a.scope.inputSeal, ready.pin.revision), contractDigest: await ticketHash(ready.pin.contract) };
    };
    const ticketStore = createPrismaOwnerTicketStore(prisma, evidence);
    const ticketService = createOwnerTicketService(ticketStore, { ...synthetic.options, now: () => new Date(ticketClock) });
    const http = express(); http.use(express.json()); http.use(requireApiKey); http.use(runtimeRedactionBoundary);
    for (const action of ["enroll", "rotate", "revoke"] as const) http.post(`/v1/api-keys/worker-credentials/${action}`, (req, res) => {
      const deps = missing === "all" ? undefined : { ...delivery, ...(missing ? { [missing]: undefined } : {}) };
      return workerCredentialHandler(action, createWorkerCredentialService(faultStore, { delivery: deps as any }))(req, res);
    });
    for (const action of ["issue", "consume", "status"] as const) http.post(`/v1/agent-runtime/owner-tickets/${action}`, ownerTicketHandler(action, ticketService));
    // Probe uses the production claim guard against real rows. Full runtime
    // claim still has the separate foundation/provider activation gates.
    http.post("/v1/agent-runtime/executions/claim", async (req, res) => {
      res.status(await readyTransaction(tx => workerClaimAllowed(tx, req.auth!, req.body.hostId)) ? 200 : 403).json({ launchAuthority: false });
    });
    const server = http.listen(0, "127.0.0.1"); await new Promise<void>(r => server.once("listening", r));
    t.after(async () => { await new Promise<void>(r => server.close(() => r())); assert.equal(server.listening, false); });
    const call = async (path: string, body: any, headers: Record<string, string> = ownerHeaders()) => {
      const r = await fetch(`http://127.0.0.1:${(server.address() as any).port}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json() as any, cache: r.headers.get("cache-control") };
    };
    const lifecycle = (input: any, headers?: Record<string, string>) => call(`/v1/api-keys/worker-credentials/${input.intent.action}`, input, headers);
    const workerHeaders = (key: string) => ({ "X-API-Key": key });
    async function readyFixture() {
      const app = await prisma.application.create({ data: { workspaceId: w, name: "Inert native fixture", slug: randomUUID() } });
      const project = await prisma.project.create({ data: { workspaceId: w, name: "Inert native fixture" } });
      await prisma.applicationProject.create({ data: { applicationId: app.id, projectId: project.id } });
      const task = await prisma.task.create({ data: { workspaceId: w, projectId: project.id, title: "Bounded native credential fixture" } });
      const auth = ownerHeaders(), f = await h.prepareReadyFixture(w, task.id, app.id, auth, false);
      f.input.contract.executionClass = "roost-fixed-effect-v1"; f.input.contract.budgets.maxAttempts = 1;
      f.input.contract.modelSelection = structuredClone(synthetic.c.acceptance.provider.modelSelection);
      const root = `/v1/agent-runtime/tasks/${task.id}`;
      await h.prepareRiskFixture(root + "/risk", f.input, auth);
      return { ...f, workspaceId: w, task, app, auth, post, root };
    }
    const control = await readyFixture();
    async function accepted(f: any, extra: any = {}) {
      await h.refreshCompositionRisk(f.task.id, f.auth);
      const p = await h.decisionFixtureProposal(f, extra); assert.equal(p.response.status, 201, JSON.stringify(p.response.body));
      await h.decisionFixtureProof(f);
      const v = (await h.request(`/v1/decisions/${p.id}/governance`, { headers: f.auth })).body.data;
      const r = await post(`/v1/decisions/${p.id}/governance/actions`, { requestId: randomUUID(), expectedVersion: v.expectedVersion, action: "accept", previewId: v.previews[0].id });
      assert.equal(r.status, 201, JSON.stringify(r.body)); return p.id;
    }
    async function command(action: "enroll" | "rotate" | "revoke", target = host.id, patch: any = {}) {
      const old = await prisma.apiKey.findFirst({ where: { workspaceId: w, workerHostId: target }, orderBy: { workerBindingEpoch: "desc" } });
      const intent = { schemaVersion: "worker-credential-lifecycle-v1", action, workspaceId: w, installationId, hostId: target,
        expectedCredentialId: old?.id ?? null, expectedVersion: old?.credentialVersion ?? 0, expectedEpoch: old?.workerBindingEpoch ?? 0,
        expectedFingerprint: old ? workerTicketFingerprint(old.keyHash!) : null,
        expiresAt: action === "revoke" ? null : new Date(Date.now() + 3600000).toISOString(), validUntil: new Date(Date.now() + 600000).toISOString(), ...patch };
      return { requestId: randomUUID(), decisionId: await accepted(control, { workerCredential: intent }), decisionRevision: 1, explicitAcceptance: true, intent };
    }
    const snapshot = async () => ({
      keys: await prisma.apiKey.findMany({ where: { workspaceId: w }, orderBy: { id: "asc" } }),
      ops: await prisma.agentCredentialOperation.findMany({ where: { workspaceId: w }, orderBy: { id: "asc" } }),
      tickets: await prisma.trustedProviderTicket.findMany({ where: { workspaceId: w }, orderBy: { id: "asc" } }),
      executions: await prisma.agentExecution.findMany({ where: { workspaceId: w }, orderBy: { id: "asc" } }),
      events: await prisma.event.findMany({ where: { workspaceId: w }, orderBy: { id: "asc" } }),
      bindings: await prisma.$queryRaw`SELECT * FROM trusted_provider_ticket_worker_bindings ORDER BY ticket_id`,
      journal: await prisma.$queryRaw`SELECT * FROM trusted_provider_ticket_journal ORDER BY ticket_id,version`,
      fence: await prisma.$queryRaw`SELECT * FROM ready_source_fence`
    });
    let current: any, raw = "";
    const enrollment = await command("enroll");
    await t.test("fresh primary owner and exact accepted native decision are mandatory", async () => {
      for (const role of ["owner", "admin", "member", "viewer"] as const) {
        const user = await prisma.user.create({ data: { email: `denied-${randomUUID()}@example.test`, passwordHash: "synthetic-no-login" } });
        await prisma.workspaceMembership.create({ data: { workspaceId: w, userId: user.id, role } });
        assert.equal((await lifecycle(enrollment, { Authorization: `Bearer ${createAuthToken({ workspaceId: w, userId: user.id })}` })).status, 403);
      }
      for (const age of [null, Math.floor(Date.now() / 1000) - 301, Math.floor(Date.now() / 1000) + 60])
        assert.equal((await lifecycle(enrollment, { Authorization: `Bearer ${createAuthToken({ workspaceId: w, userId: ownerId }, age)}` })).status, 403);
      for (const patch of [{ decisionId: randomUUID() }, { decisionRevision: 2 }, { intent: { ...enrollment.intent, hostId: randomUUID() } }])
        assert.equal((await lifecycle({ ...enrollment, ...patch })).status, 409);
      for (const value of ["all", "generate", "hash", "deliver"]) {
        missing = value; const before = await snapshot();
        try { assert.equal((await lifecycle(enrollment)).status, 503); } finally { missing = undefined; }
        assert.deepEqual(await snapshot(), before);
      }
      const defaultResponse = await post("/v1/api-keys/worker-credentials/enroll", enrollment);
      assert.equal(defaultResponse.status, 503);
    });
    await t.test("twenty native concurrent enrollments commit one generation and disclose once", async () => {
      const results = await Promise.all(Array.from({ length: 20 }, () => lifecycle(enrollment)));
      const disclosed = results.filter(r => r.status === 200 && r.body.data.key);
      assert.equal(disclosed.length, 1, JSON.stringify(results.map(r => ({ status: r.status, error: r.body.error }))));
      assert.ok(results.every(r => r.status === 200 || r.status === 409));
      assert.equal(deliveries, 1); raw = disclosed[0].body.data.key; current = disclosed[0].body.data.credential;
      assert.equal(disclosed[0].cache, "no-store");
      assert.equal(await prisma.apiKey.count({ where: { workspaceId: w, workerHostId: host.id, active: true, revokedAt: null } }), 1);
      assert.equal(await prisma.agentCredentialOperation.count({ where: { workspaceId: w } }), 1);
      const replay = await lifecycle(enrollment); assert.equal(replay.status, 200); assert.equal(replay.body.data.key, null);
      assert.equal((await lifecycle({ ...enrollment, requestId: randomUUID() })).status, 409);
    });
    await t.test("bound native credential has only claim consume status and cannot govern itself", async () => {
      assert.equal((await call("/v1/agent-runtime/executions/claim", { hostId: host.id }, workerHeaders(raw))).status, 200);
      assert.equal((await call("/v1/agent-runtime/executions/claim", { hostId: randomUUID() }, workerHeaders(raw))).status, 403);
      for (const path of ["/v1/api-keys/worker-credentials/rotate", "/v1/agent-runtime/hosts/register", "/v1/agent-runtime/owner-tickets/issue", "/v1/decisions/governance/proposals", "/v1/agent-runtime/providers"])
        assert.equal((await call(path, enrollment, workerHeaders(raw))).status, 403);
      const rawGeneric = randomUUID(); await prisma.apiKey.create({ data: { workspaceId: w, name: "Inert generic key", keyHash: hashApiKey(rawGeneric), scopes: ["*"] } });
      assert.equal((await lifecycle(enrollment, workerHeaders(rawGeneric))).status, 403);
      const rawAgent = randomUUID(); await prisma.apiKey.create({ data: { workspaceId: w, name: "Inert agent key", keyHash: hashApiKey(rawAgent), keyPrefix: "synthetic", boundAgentId: control.agent.id,
        expiresAt: new Date(Date.now() + 60000), scopes: ["connection:read", "tasks:read", "workforce:read", "agent-runtime:read", "agent-runtime:write"] } });
      assert.equal((await lifecycle(enrollment, workerHeaders(rawAgent))).status, 403);
      const row = await prisma.apiKey.findUniqueOrThrow({ where: { id: current.id } });
      for (const patch of [{ credentialVersion: 99 }, { bindingEpoch: 99 }, { credentialFingerprint: "0".repeat(64) }, { installationId: randomUUID() }])
        assert.equal(await workerClaimAllowed(prisma, { workspaceId: w, authType: "api_key", apiKeyId: row.id, workerTicketIdentity: { ...workerTicketPrincipal(row)!, ...patch } }, host.id), false);
    });
    const rotation = await command("rotate");
    async function preparedTicket() {
      const f = await readyFixture(), decisionId = await accepted(f); selectedDecision = decisionId;
      const decision = await prisma.decision.findUniqueOrThrow({ where: { id: decisionId } });
      f.input.contract.decisions = { items: [{ id: decisionId, revision: decision.updatedAt.toISOString() }], noneReason: null };
      const root = f.root + "/actions/submit-for-execution";
      const ready = await post(root, await h.submissionInput(root, f.input, f.auth)); assert.equal(ready.status, 200, JSON.stringify(ready.body));
      const pin = (await prisma.task.findUniqueOrThrow({ where: { id: f.task.id } })).executionReadiness as any;
      const execution = await prisma.agentExecution.create({ data: { workspaceId: w, taskId: f.task.id, applicationId: f.app.id, agentHostId: host.id,
        requestedByType: "user", requestedById: ownerId, status: "claimed", attempt: 1, leaseToken: randomUUID(), leaseExpiresAt: new Date(Date.now() + 600000), startedAt: new Date(),
        checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: randomUUID(), packetRevision: null, workspaceDigest: null },
        metadata: { executionContract: pin.contract, readyContextPin: { pinId: pin.pinId, revision: pin.revision, riskAdmissionSeal: pin.riskAdmissionSeal, riskAdmissionCommit: pin.riskAdmissionCommit, compositionSeal: pin.procedureComposition.seal } } } });
      ticketClock = Date.now(); const context = await ticketStore.transaction(tx => tx.current(w, execution.id, decisionId, 1, new Date(ticketClock)));
      const issued = await call("/v1/agent-runtime/owner-tickets/issue", { executionId: execution.id, decisionId, decisionRevision: 1, acceptanceDigest: await ticketHash(context.acceptance), contextDigest: context.contextDigest, explicitAcceptance: true });
      assert.equal(issued.status, 201, JSON.stringify(issued.body)); const ticket = issued.body.data.ticket;
      const row = await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: ticket.payload.ticketId } });
      const input = { ticket, ticketDigest: row.digest, challenge: row.challenge, claimDigest: row.claimDigest, executionId: row.executionId, taskId: row.taskId, attempt: 1,
        worker: { hostId: host.id, installationId, leaseToken: execution.leaseToken! } };
      const { ticket: omitted, ...rest } = input;
      return { execution, ticket, input, status: { ...rest, ticketId: row.id } };
    }
    const prepared = await preparedTicket();
    const observe = () => call("/v1/agent-runtime/owner-tickets/status", prepared.status, workerHeaders(raw));
    await t.test("prepared native authority remains usable through complete real-write rollback", async () => {
      assert.equal((await observe()).status, 200);
      for (const stage of ["revoke", "invalidate", "insert", "record", "commit", "native_owner", "native_revision", "native_intent"]) {
        const before = await snapshot(), count = deliveries; fault = stage;
        try { const r = await lifecycle(rotation); assert.equal(r.status, 503, stage); } finally { fault = undefined; }
        assert.deepEqual(await snapshot(), before, stage); assert.equal(deliveries, count);
        assert.equal((await observe()).status, 200, stage);
        assert.equal((await call("/v1/agent-runtime/executions/claim", { hostId: host.id }, workerHeaders(raw))).status, 200);
      }
    });
    await t.test("twenty rotations race old use; terminal commit invalidates ticket claim and prepared proof atomically", async () => {
      const oldRaw = raw, old = current;
      const [results, uses] = await Promise.all([
        Promise.all(Array.from({ length: 20 }, (_, i) => lifecycle({ ...rotation, requestId: i ? randomUUID() : rotation.requestId }))),
        Promise.all(Array.from({ length: 20 }, (_, i) => i % 2 ? observe() : call("/v1/agent-runtime/executions/claim", { hostId: host.id }, workerHeaders(oldRaw))))
      ]);
      assert.ok(uses.every(r => [200, 403, 409].includes(r.status)), JSON.stringify(uses.map(r => r.status)));
      const winners = results.filter(r => r.status === 200); assert.equal(winners.length, 1, JSON.stringify(results.map(r => ({ status: r.status, error: r.body.error }))));
      assert.ok(results.filter(r => r.status !== 200).every(r => r.status === 409));
      current = winners[0].body.data.credential; raw = winners[0].body.data.key;
      assert.equal(current.epoch, old.epoch + 1);
      assert.equal(await prisma.apiKey.count({ where: { workspaceId: w, workerHostId: host.id, active: true, revokedAt: null } }), 1);
      assert.equal((await prisma.apiKey.findUniqueOrThrow({ where: { id: old.id } })).active, false);
      assert.equal((await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: prepared.ticket.payload.ticketId } })).state, "revoked");
      const execution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: prepared.execution.id } });
      assert.ok(execution.contextInvalidatedAt && execution.cancelRequestedAt); assert.equal((execution.errorState as any).retryable, false);
      assert.equal(execution.attempt, prepared.execution.attempt); assert.deepEqual(execution.checkpoint, prepared.execution.checkpoint); assert.equal(execution.leaseToken, prepared.execution.leaseToken);
      for (const [path, body] of [["executions/claim", { hostId: host.id }], ["owner-tickets/consume", prepared.input], ["owner-tickets/status", prepared.status]] as const)
        assert.equal((await call(`/v1/agent-runtime/${path}`, body, workerHeaders(oldRaw))).status, 403);
      assert.equal((await call("/v1/agent-runtime/owner-tickets/consume", prepared.input, workerHeaders(raw))).status, 403);
      assert.equal((await call("/v1/agent-runtime/executions/claim", { hostId: host.id }, workerHeaders(raw))).status, 200);
      await assert.rejects(prisma.apiKey.update({ where: { id: old.id }, data: { active: true, revokedAt: null } }));
      await assert.rejects(prisma.apiKey.delete({ where: { id: old.id } }));
    });
    await t.test("real prepared consumption races revocation without restoring spent authority", async () => {
      const revoke = await command("revoke"), p = await preparedTicket(), oldRaw = raw;
      const status = () => call("/v1/agent-runtime/owner-tickets/status", p.status, workerHeaders(oldRaw));
      const before = await snapshot(); fault = "record";
      try { assert.equal((await lifecycle(revoke)).status, 503); } finally { fault = undefined; }
      assert.deepEqual(await snapshot(), before); assert.equal((await status()).status, 200);
      const [revocations, uses] = await Promise.all([
        Promise.all(Array.from({ length: 20 }, () => lifecycle(revoke))),
        Promise.all(Array.from({ length: 20 }, (_, i) => i % 2 ? status() : call("/v1/agent-runtime/owner-tickets/consume", p.input, workerHeaders(oldRaw))))
      ]);
      assert.ok(revocations.some(r => r.status === 200), JSON.stringify(revocations.map(r => r.status)));
      assert.ok(revocations.every(r => [200, 409].includes(r.status)));
      assert.ok(uses.every(r => [200, 403, 409].includes(r.status)), JSON.stringify(uses.map(r => r.status)));
      const row = await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: p.ticket.payload.ticketId } });
      assert.ok(["revoked", "consumed"].includes(row.state));
      assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int n FROM trusted_provider_ticket_journal WHERE ticket_id=${row.id}::uuid`)[0].n, 2);
      const e = await prisma.agentExecution.findUniqueOrThrow({ where: { id: p.execution.id } });
      assert.ok(e.contextInvalidatedAt && e.cancelRequestedAt); assert.equal(e.attempt, 1); assert.equal(e.leaseToken, p.execution.leaseToken);
      assert.deepEqual(e.checkpoint, p.execution.checkpoint);
      for (const [path, body] of [["executions/claim", { hostId: host.id }], ["owner-tickets/consume", p.input], ["owner-tickets/status", p.status]] as const)
        assert.equal((await call(`/v1/agent-runtime/${path}`, body, workerHeaders(oldRaw))).status, 403);
      const replay = await lifecycle(revoke); assert.equal(replay.status, 200); assert.equal(replay.body.data.key, null);
      const next = await lifecycle(await command("enroll")); assert.equal(next.status, 200); raw = next.body.data.key; current = next.body.data.credential;
    });
    await t.test("rotate versus revoke has one terminal winner; revoke replay discloses nothing", async () => {
      const rotate = await command("rotate"), revoke = await command("revoke"), oldRaw = raw;
      const commands = Array.from({ length: 20 }, (_, i) => ({ ...(i % 2 ? rotate : revoke), requestId: randomUUID() }));
      const results = await Promise.all(commands.map(c => lifecycle(c)));
      const winners = results.filter(r => r.status === 200); assert.equal(winners.length, 1);
      assert.ok(results.filter(r => r.status !== 200).every(r => r.status === 409));
      current = winners[0].body.data.credential; raw = winners[0].body.data.key;
      const winningCommand = commands[results.findIndex(r => r.status === 200)];
      const replay = await lifecycle(winningCommand); assert.equal(replay.status, 200); assert.equal(replay.body.data.key, null);
      assert.equal((await call("/v1/agent-runtime/executions/claim", { hostId: host.id }, workerHeaders(oldRaw))).status, 403);
      if (current.active) { const finalRevoke = await command("revoke"); const r = await lifecycle(finalRevoke); assert.equal(r.status, 200); current = r.body.data.credential;
        const replay = await lifecycle(finalRevoke); assert.equal(replay.status, 200); assert.equal(replay.body.data.key, null); }
      else { const finalRevoke = await command("revoke"); assert.equal((await lifecycle(finalRevoke)).status, 409); }
      assert.equal(await prisma.apiKey.count({ where: { workspaceId: w, workerHostId: host.id, active: true, revokedAt: null } }), 0);
    });
    await t.test("native decision expiry and exact generation drift deny without writes", async () => {
      for (const patch of [{ validUntil: new Date(Date.now() - 1000).toISOString() }, { expectedVersion: current.version + 1 },
        { expectedEpoch: current.epoch + 1 }, { expectedFingerprint: "0".repeat(64) }, { expectedCredentialId: randomUUID() }, { installationId: randomUUID() }]) {
        const input = await command("enroll", host.id, patch), before = await snapshot();
        assert.equal((await lifecycle(input)).status, 409); assert.deepEqual(await snapshot(), before);
      }
    });
    await t.test("host reassignment revokes old authority and expired generations cannot authenticate", async () => {
      const foreign = await h.registerOwner(`foreign-${randomUUID()}@example.test`, "Foreign synthetic workspace");
      const moving = await prisma.agentHost.create({ data: { workspaceId: w, name: "Moving inert host", slug: randomUUID(), platform: "synthetic", status: "online" } });
      const input = await command("enroll", moving.id), result = await lifecycle(input); assert.equal(result.status, 200);
      await prisma.agentHost.update({ where: { id: moving.id }, data: { workspaceId: foreign.workspace.id } });
      const moved = await prisma.apiKey.findUniqueOrThrow({ where: { id: result.body.data.credential.id } });
      assert.ok(moved.revokedAt); assert.equal(moved.active, false); assert.equal(moved.workspaceId, w);
      assert.equal((await call("/v1/agent-runtime/executions/claim", { hostId: moving.id }, workerHeaders(result.body.data.key))).status, 403);
      const expiredHost = await prisma.agentHost.create({ data: { workspaceId: w, name: "Expired inert host", slug: randomUUID(), platform: "synthetic", status: "online" } });
      const bytes = await delivery.generate(); const expiredRaw = bytes.toString();
      await prisma.apiKey.create({ data: { workspaceId: w, name: "Historical synthetic expired credential", keyHash: await delivery.hash(bytes), keyPrefix: "worker-v1",
        scopes: ["agent-runtime:claim"], expiresAt: new Date(Date.now() - 1000), workerHostId: expiredHost.id, workerInstallationId: installationId, workerBindingEpoch: 1 } });
      bytes.fill(0);
      for (const path of ["executions/claim", "owner-tickets/consume", "owner-tickets/status"])
        assert.equal((await call(`/v1/agent-runtime/${path}`, { hostId: expiredHost.id }, workerHeaders(expiredRaw))).status, 403);
    });
    await t.test("native host and installation guards cannot transfer or resurrect a credential", async () => {
      const reenroll = await command("enroll"); const r = await lifecycle(reenroll); assert.equal(r.status, 200); raw = r.body.data.key; current = r.body.data.credential;
      await assert.rejects(prisma.apiKey.update({ where: { id: current.id }, data: { workerBindingEpoch: current.epoch + 1 } }));
      await assert.rejects(prisma.apiKey.update({ where: { id: current.id }, data: { workerInstallationId: randomUUID() } }));
      await assert.rejects(prisma.apiKey.update({ where: { id: current.id }, data: { workspaceId: randomUUID() } }));
      await assert.rejects(prisma.agentHost.delete({ where: { id: host.id } }));
      await assert.rejects(prisma.trustedProviderTicketKey.update({ where: { workspaceId: w }, data: { installationId: randomUUID() } }));
      await prisma.agentHost.update({ where: { id: host.id }, data: { status: "disabled" } });
      const k = await prisma.apiKey.findUniqueOrThrow({ where: { id: current.id } }); assert.equal(k.active, false); assert.ok(k.revokedAt);
      for (const path of ["executions/claim", "owner-tickets/consume", "owner-tickets/status"])
        assert.equal((await call(`/v1/agent-runtime/${path}`, {}, workerHeaders(raw))).status, 403);
      assert.equal((await lifecycle(await command("enroll"))).status, 409);
    });
    await t.test("no synthetic raw key persists or leaks outside one successful response; no launch or activation", async () => {
      const tables = await prisma.$queryRaw<Array<{ name: string }>>`SELECT tablename AS name FROM pg_tables WHERE schemaname='public'`;
      for (const { name } of tables) {
        assert.match(name, /^[a-z_][a-z_0-9]*$/);
        const rows = await prisma.$queryRawUnsafe<Array<{ leaked: boolean }>>(`SELECT EXISTS(SELECT 1 FROM "${name}" t WHERE EXISTS(SELECT 1 FROM unnest($1::text[]) s WHERE strpos(to_jsonb(t)::text,s)>0)) AS leaked`, secrets);
        assert.equal(rows[0].leaked, false, `raw key in ${name}`);
      }
      assert.ok(buffers.every(b => b.every(byte => byte === 0)));
      assert.ok(secrets.every(secret => !logs.some(line => line.includes(secret))));
      assert.ok(secrets.every(secret => !JSON.stringify(prepared).includes(secret)));
      assert.deepEqual(executionProviderRegistry, registryBefore);
      const nativeProvider = require("../../scripts/lib/agent-host-provider-contract.cjs");
      for (const kind of ["direct_codex", "codex_app_server", "manual_hermes", "hermes_codex"])
        assert.ok(nativeProvider.providerAdmissionReason({ kind }), kind);
      const launch = require("../../scripts/lib/agent-host-hermes-launch-contract.cjs");
      for (const flag of ["implementationReady", "executionSupported", "pilotReady", "liveAdmissionAllowed", "pilotExecutionAuthorized", "pilotExecutionStarted"])
        assert.equal(launch[flag], false);
      assert.equal((await prisma.agentExecution.findUniqueOrThrow({ where: { id: prepared.execution.id } })).attempt, 1);
    });
  });
}
