import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import childProcess from "node:child_process";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { requireApiKey } from "../auth/api-key.middleware";
import { ownerTicketHandler } from "../modules/agent-runtime/owner-ticket-http";
import { createOwnerTicketService, ticketHash } from "../modules/agent-runtime/owner-ticket";
import { createPrismaOwnerTicketStore, ownerTicketClaimDigest, type OwnerTicketEvidence } from "../modules/agent-runtime/owner-ticket-store";
import { ownerTicketFixture } from "./owner-ticket-fixture";
import { inspectReady, readyTransaction } from "../modules/agent-runtime/task-execution-readiness";
import { createAuthToken } from "../auth/token";
import { hashApiKey, apiKeyPrefix } from "../auth/api-key";
import { executionProviderRegistry } from "../modules/agent-runtime/execution-provider";
import { watchReadySources } from "../modules/agent-runtime/ready-source-watch";
import { workerTicketPrincipal, workerClaimTokenDigest } from "../auth/worker-ticket-principal";
import { runtimeRedactionBoundary } from "../modules/agent-runtime/runtime-redaction-http";

export function registerOwnerTicketDatabaseTests(h: any, workerMode = false) {
  test(`${workerMode ? "worker" : "owner"} ticket native PostgreSQL HTTP qualification`, { skip: !process.env.OWNER_TICKET_TEST_DATABASE, timeout: 240000 }, async t => {
    const owner = await h.registerOwner(`ticket-native-${randomUUID()}@example.test`, "Synthetic ticket qualification");
    const w = owner.workspace.id, auth = { Authorization: `Bearer ${owner.token}` };
    const post = (url: string, body: any, headers = auth) => h.request(url, { method: "POST", headers, body: JSON.stringify(body) });
    const primary = await prisma.workspace.findUniqueOrThrow({ where: { id: w } });
    const synthetic = await ownerTicketFixture();
    await prisma.trustedProviderTicketKey.create({ data: { workspaceId: w, ...synthetic.state().key } });
    const host = await prisma.agentHost.create({ data: { workspaceId: w, name: "Inert fixture host", slug: "ticket-native", platform: "synthetic", status: "online" } });
    const rawWorkerKey = randomUUID(), workerAuth = { "X-API-Key": rawWorkerKey };
    const credentialData = (hostId: string, raw: string, epoch = 1) => ({ workspaceId: w, name: "Synthetic inert Worker credential",
      keyHash: hashApiKey(raw), keyPrefix: apiKeyPrefix(raw), expiresAt: new Date(Date.now() + 600000), scopes: ["agent-runtime:claim"],
      workerHostId: hostId, workerInstallationId: synthetic.state().key.installationId, workerBindingEpoch: epoch });
    const credential = workerMode ? await prisma.apiKey.create({ data: credentialData(host.id, rawWorkerKey) }) : null;
    if (workerMode) for (const method of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"] as const)
      t.mock.method(childProcess, method, () => { throw Error("target process forbidden in native ticket qualification"); });
    let clock = Date.now(), evidenceMutation: ((e: any) => void) | undefined;
    let latestContext: any;
    const evidence: OwnerTicketEvidence = async (_db, execution, ready, decision) => {
      const a = structuredClone(synthetic.c.acceptance);
      a.decisionId = decision.body.fixtureDecisionId ?? selectedDecision;
      a.revision = decision.version; a.decidedAt = new Date(decision.created_at).toISOString();
      a.expiresAt = new Date(clock + 120000).toISOString();
      a.scope.workspaceId = w; a.scope.taskId = execution.taskId; a.scope.executionId = execution.id; a.scope.applicationId = execution.applicationId;
      a.provider.modelSelection = ready.pin.contract.modelSelection;
      a.provider.managedBackend.context.gates.durationDeadline = new Date(clock + 120000).toISOString();
      const result = { acceptance: a, challenge: synthetic.c.challenge, writerDigest: a.scope.writerDigest, inputSeal: a.scope.inputSeal,
        readyPinId: ready.pin.pinId, readyRevision: ready.pin.revision,
        claimDigest: ownerTicketClaimDigest(execution, a.scope.inputSeal, ready.pin.revision), contractDigest: await ticketHash(ready.pin.contract) };
      evidenceMutation?.(result); return result;
    };
    let selectedDecision = "";
    const store = createPrismaOwnerTicketStore(prisma, evidence);
    let fault: string | undefined;
    let bindingMutation: ((binding: any) => void) | undefined;
    // Throw only AFTER the real SQL operation inside the real transaction.
    // No mocked persistence, disabled trigger or automatic retry is involved.
    const faultStore: typeof store = { read: store.read, transaction: work => store.transaction(tx => work(new Proxy(tx, {
      get(target, name: keyof typeof tx) {
        return async (...args: any[]) => {
          if (name === "insert" && bindingMutation) bindingMutation(args[0].workerBinding);
          const result = await (target[name] as Function)(...args);
          if (fault === name) throw Error("synthetic post-write failure");
          return result;
        };
      }
    }))) };
    const service = createOwnerTicketService(faultStore, { ...synthetic.options, now: () => new Date(clock) });
    const registryBefore = structuredClone(executionProviderRegistry);
    const http = express(); http.use(express.json()); http.use(requireApiKey);
    if (workerMode) http.use(runtimeRedactionBoundary);
    for (const action of ["issue", "consume", "revoke", "rotate", "status"] as const) http.post(`/v1/agent-runtime/owner-tickets/${action}`, ownerTicketHandler(action, service));
    const server = http.listen(0, "127.0.0.1"); await new Promise<void>(r => server.once("listening", r));
    t.after(async () => { await new Promise<void>(r => server.close(() => r())); });
    const ticketPost = async (action: string, body: any, headers: Record<string, string> = auth) => {
      const r = await fetch(`http://127.0.0.1:${(server.address() as any).port}/v1/agent-runtime/owner-tickets/${action}`, {
        method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json() as any };
    };
    async function fixture() {
      const app = await prisma.application.create({ data: { workspaceId: w, name: "Ticket fixture", slug: `ticket-${randomUUID()}` } });
      const project = await prisma.project.create({ data: { workspaceId: w, name: "Ticket fixture" } });
      await prisma.applicationProject.create({ data: { applicationId: app.id, projectId: project.id } });
      const task = await prisma.task.create({ data: { workspaceId: w, projectId: project.id, title: "Bounded owner ticket task" } });
      const f = await h.prepareReadyFixture(w, task.id, app.id, auth, false);
      f.input.contract.executionClass = "roost-fixed-effect-v1"; f.input.contract.budgets.maxAttempts = 1;
      f.input.contract.modelSelection = structuredClone(synthetic.c.acceptance.provider.modelSelection);
      const root = `/v1/agent-runtime/tasks/${task.id}`;
      await h.prepareRiskFixture(root + "/risk", f.input, auth);
      const d = { ...f, workspaceId: w, task, app, auth, post, root };
      const proposal = await h.decisionFixtureProposal(d); assert.equal(proposal.response.status, 201, JSON.stringify(proposal.response.body));
      selectedDecision = proposal.id;
      await h.decisionFixtureProof(d);
      const v = (await h.request(`/v1/decisions/${proposal.id}/governance`, { headers: auth })).body.data;
      const accepted = await post(`/v1/decisions/${proposal.id}/governance/actions`, { requestId: randomUUID(), expectedVersion: v.expectedVersion, action: "accept", previewId: v.previews[0].id });
      assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
      const decisionRow = await prisma.decision.findUniqueOrThrow({ where: { id: proposal.id } });
      f.input.contract.decisions = { items: [{ id: proposal.id, revision: decisionRow.updatedAt.toISOString() }], noneReason: null };
      const command = root + "/actions/submit-for-execution";
      const ready = await post(command, await h.submissionInput(command, f.input, auth));
      assert.equal(ready.status, 200, JSON.stringify(ready.body));
      const taskRow = await prisma.task.findUniqueOrThrow({ where: { id: task.id } }), pin = taskRow.executionReadiness as any;
      const execution = await prisma.agentExecution.create({ data: { workspaceId: w, taskId: task.id, applicationId: app.id, agentHostId: host.id,
        requestedByType: "user", requestedById: primary.ownerUserId, status: "claimed", attempt: 1, leaseToken: randomUUID(), leaseExpiresAt: new Date(Date.now() + 600000), startedAt: new Date(),
        checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: randomUUID(), packetRevision: null, workspaceDigest: null },
        metadata: { executionContract: pin.contract, readyContextPin: { pinId: pin.pinId, revision: pin.revision,
          riskAdmissionSeal: pin.riskAdmissionSeal, riskAdmissionCommit: pin.riskAdmissionCommit, compositionSeal: pin.procedureComposition.seal } } } });
      clock = Date.now();
      latestContext = await store.transaction(tx => tx.current(w, execution.id, proposal.id, 1, new Date(clock)));
      const input = { executionId: execution.id, decisionId: proposal.id, decisionRevision: 1, acceptanceDigest: await ticketHash(latestContext.acceptance), contextDigest: latestContext.contextDigest, explicitAcceptance: true };
      return { task, execution, input, f, d, proposal };
    }
    const f = await fixture();
    await t.test("missing and stale native decisions deny issuance", async () => {
      for (const patch of [{ decisionRevision: 2 }, { decisionId: randomUUID() }]) {
        const denied = await ticketPost("issue", { ...f.input, ...patch });
        assert.equal(denied.status, 409); assert.equal(denied.body.error, "owner_ticket_decision_changed");
      }
    });
    for (const stage of ["insert", "audit"]) await t.test(`issue rollback after real ${stage}`, async () => {
      fault = stage;
      try { assert.equal((await ticketPost("issue", f.input)).status, 503); } finally { fault = undefined; }
      assert.equal(await prisma.trustedProviderTicket.count({ where: { executionId: f.execution.id } }), 0);
      assert.equal(await prisma.event.count({ where: { taskId: f.task.id, type: "owner_ticket_issued" } }), 0);
      assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int n FROM trusted_provider_ticket_worker_bindings b LEFT JOIN trusted_provider_tickets t ON t.id=b.ticket_id WHERE t.id IS NULL`)[0].n, 0);
      assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int n FROM trusted_provider_ticket_journal j LEFT JOIN trusted_provider_tickets t ON t.id=j.ticket_id WHERE t.id IS NULL`)[0].n, 0);
    });
    if (workerMode) await t.test("native binding trigger rejects altered snapshots with complete issuance rollback", async () => {
      for (const patch of [{ credentialVersion: 999 }, { bindingEpoch: 999 }, { hostId: randomUUID() }, { installationId: randomUUID() },
        { credentialFingerprint: "0".repeat(64) }, { leaseTokenDigest: "0".repeat(64) }, { claimSessionId: randomUUID() }, { expiresAt: new Date(Date.now() + 1200000).toISOString() }]) {
        bindingMutation = b => Object.assign(b, patch);
        try { assert.equal((await ticketPost("issue", f.input)).status, 503); } finally { bindingMutation = undefined; }
        assert.equal(await prisma.trustedProviderTicket.count({ where: { executionId: f.execution.id } }), 0);
        assert.equal(await prisma.event.count({ where: { taskId: f.task.id, type: "owner_ticket_issued" } }), 0);
      }
    });
    const checkAuthentication = async () => {
      assert.equal((await ticketPost("issue", f.input, {})).status, 401);
      const second = await prisma.user.create({ data: { email: `ticket-secondary-${randomUUID()}@example.test`, passwordHash: "synthetic-not-a-login" } });
      const membership = await prisma.workspaceMembership.create({ data: { workspaceId: w, userId: second.id, role: "owner" } });
      const headers = { Authorization: `Bearer ${createAuthToken({ workspaceId: w, userId: second.id })}` };
      assert.equal((await ticketPost("issue", f.input, headers)).status, 403);
      await prisma.workspaceMembership.update({ where: { id: membership.id }, data: { role: "member" } });
      assert.equal((await ticketPost("issue", f.input, headers)).status, 403);
      const worker = await post("/v1/api-keys", { name: "Inert ticket fixture credential", profileId: "mcp_codex_worker" });
      assert.equal(worker.status, 201);
      assert.equal((await ticketPost("issue", f.input, { "X-API-Key": worker.body.data.key })).status, 403);
      const rawAgentKey = randomUUID();
      await prisma.apiKey.create({ data: { workspaceId: w, name: "Inert agent credential", boundAgentId: f.f.agent.id,
        keyHash: hashApiKey(rawAgentKey), keyPrefix: apiKeyPrefix(rawAgentKey), expiresAt: new Date(Date.now() + 60000),
        scopes: ["connection:read", "tasks:read", "workforce:read", "agent-runtime:read", "agent-runtime:write"] } });
      assert.equal((await ticketPost("issue", f.input, { "X-API-Key": rawAgentKey })).status, 403);
      const defaultIssue = await post("/v1/agent-runtime/owner-tickets/issue", f.input);
      assert.equal(defaultIssue.status, 503); assert.equal(defaultIssue.body.error, "owner_ticket_unavailable");
      assert.throws(() => watchReadySources(prisma).db.$queryRaw, /ready_source_operation_unsupported/);
    };
    const issued = await ticketPost("issue", f.input); assert.equal(issued.status, 201, JSON.stringify(issued.body));
    const ticket = issued.body.data.ticket;
    const row = await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: ticket.payload.ticketId } });
    const input = { ticket, ticketDigest: row.digest, challenge: row.challenge, claimDigest: row.claimDigest, executionId: row.executionId, taskId: row.taskId, attempt: 1 };
    const workerInput = (x: typeof input, execution: typeof f.execution) => ({ ...x, worker: { hostId: host.id, installationId: synthetic.state().key.installationId, leaseToken: execution.leaseToken! } });
    const statusInput = (x: typeof input, execution: typeof f.execution) => { const { ticket, ...rest } = workerInput(x, execution); return { ...rest, ticketId: ticket.payload.ticketId }; };
    const consume = (x = input, execution = f.execution) => ticketPost("consume", workerMode ? workerInput(x, execution) : x, workerMode ? workerAuth : auth);
    const stateSnapshot = async () => ({
      tickets: await prisma.trustedProviderTicket.findMany({ where: { workspaceId: w }, orderBy: { id: "asc" } }),
      credentials: await prisma.apiKey.findMany({ where: { workspaceId: w }, orderBy: { id: "asc" } }),
      executions: await prisma.agentExecution.findMany({ where: { workspaceId: w }, orderBy: { id: "asc" } }),
      tasks: await prisma.task.findMany({ where: { workspaceId: w }, orderBy: { id: "asc" } }),
      events: await prisma.event.count({ where: { workspaceId: w } }),
      incidents: await prisma.companyRecord.count({ where: { workspaceId: w, recordType: "technical_incident" } }),
      journal: await prisma.$queryRaw`SELECT j.* FROM trusted_provider_ticket_journal j JOIN trusted_provider_tickets t ON t.id=j.ticket_id WHERE t.workspace_id=${w}::uuid ORDER BY j.ticket_id,j.version`,
      bindings: await prisma.$queryRaw`SELECT b.* FROM trusted_provider_ticket_worker_bindings b JOIN trusted_provider_tickets t ON t.id=b.ticket_id WHERE t.workspace_id=${w}::uuid ORDER BY b.ticket_id`,
      fence: await prisma.$queryRaw`SELECT * FROM ready_source_fence`
    });
    await t.test("real database current Ready and decision gates", async () => {
      assert.equal((await prisma.decision.findUniqueOrThrow({ where: { id: row.decisionId } })).status, "accepted");
      const ready: any = await readyTransaction(db => inspectReady(db, w, f.task.id, f.execution)); assert.equal(ready.readiness.status, "ready");
      const watches = await prisma.$queryRaw<any[]>`SELECT source_table FROM task_ready_source_watches WHERE task_id=${f.task.id}::uuid`;
      assert.ok(watches.some(r => r.source_table === "task_decision_effects"));
      assert.ok(watches.some(r => r.source_table === "decisions"));
    });
    const journalCount = async (id: string) => (await prisma.$queryRaw<any[]>`SELECT count(*)::int n FROM trusted_provider_ticket_journal WHERE ticket_id=${id}::uuid`)[0].n;
    for (const stage of ["transition", "spendAttempt", "audit"]) await t.test(`consume rollback after real ${stage}`, async () => {
      const credentialBefore = workerMode && await prisma.apiKey.findUniqueOrThrow({ where: { id: credential!.id } });
      fault = stage;
      try { assert.equal((await consume()).status, 503); } finally { fault = undefined; }
      assert.deepEqual(await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: row.id } }), row);
      assert.equal(await journalCount(row.id), 1);
      assert.equal(await prisma.event.count({ where: { resourceId: row.id, type: "owner_ticket_consumed" } }), 0);
      assert.deepEqual((await prisma.agentExecution.findUniqueOrThrow({ where: { id: row.executionId } })).errorState, f.execution.errorState);
      if (workerMode) assert.deepEqual(await prisma.apiKey.findUniqueOrThrow({ where: { id: credential!.id } }), credentialBefore);
    });
    await t.test("binding and physical evidence drift cannot consume", async () => {
      for (const patch of [{ challenge: "0".repeat(64) }, { claimDigest: "0".repeat(64) }, { ticketDigest: "0".repeat(64) },
        { taskId: randomUUID() }, { executionId: randomUUID() }, { ticket: { ...ticket, signature: "0".repeat(128) } }]) {
        assert.equal((await ticketPost("consume", { ...input, ...patch })).status, 409);
      }
      for (const mutate of [(e: any) => { e.writerDigest = "0".repeat(64); }, (e: any) => { e.inputSeal = "0".repeat(64); },
        (e: any) => { e.acceptance.provider.modelSelection.modelSelection.reasoningEffort = "high"; },
        (e: any) => { e.acceptance.provider.managedBackend.context.scopeDigest = "0".repeat(64); },
        (e: any) => { e.acceptance.provider.managedBackend.context.budgetDigest = "0".repeat(64); }]) {
        evidenceMutation = mutate;
        try { assert.equal((await ticketPost("consume", input)).status, 409); } finally { evidenceMutation = undefined; }
      }
      const at = clock; clock--;
      try { assert.equal((await ticketPost("consume", input)).body.error, "owner_ticket_not_yet_valid"); } finally { clock = at; }
      assert.deepEqual(await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: row.id } }), row);
      assert.equal(await journalCount(row.id), 1);
    });
    await t.test("twenty concurrent HTTP consume requests commit once", async () => {
      const results = await Promise.all(Array.from({ length: 20 }, (_, i) => workerMode && i % 2 ? consume() : ticketPost("consume", input)));
      assert.equal(results.filter(r => r.status === 200).length, 1, JSON.stringify(results));
      const success = results.find(r => r.status === 200)!.body.data;
      assert.equal(success.launchAuthority, false); assert.equal(success.transportQualified, false); assert.equal(success.realIssuerQualified, false);
      assert.equal(success.launchReceipt, undefined); assert.ok(success.consumeAck);
      for (const r of results.filter(r => r.status !== 200)) { assert.equal(r.status, 409); assert.equal(r.body.error, "owner_ticket_replayed"); }
      assert.equal(await prisma.trustedProviderTicket.count({ where: { id: row.id, state: "consumed", version: 2 } }), 1);
      assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int n FROM trusted_provider_ticket_journal WHERE ticket_id=${row.id}::uuid`)[0].n, 2);
      assert.equal(await prisma.event.count({ where: { resourceId: row.id, type: "owner_ticket_consumed" } }), 1);
      assert.equal((await prisma.agentExecution.findUniqueOrThrow({ where: { id: row.executionId } })).errorState && ((await prisma.agentExecution.findUniqueOrThrow({ where: { id: row.executionId } })).errorState as any).retryable, false);
      assert.equal((await ticketPost("consume", JSON.parse(JSON.stringify(input)))).status, 409);
      await assert.rejects(prisma.trustedProviderTicket.update({ where: { id: row.id }, data: { state: "issued", version: 1, consumeId: null, consumedAt: null } }));
      await assert.rejects(prisma.trustedProviderTicket.delete({ where: { id: row.id } }));
      await assert.rejects(prisma.$executeRaw`DELETE FROM trusted_provider_ticket_journal WHERE ticket_id=${row.id}::uuid`);
      // Restore only old execution JSON, never the immutable ticket ledger.
      await prisma.agentExecution.update({ where: { id: row.executionId }, data: { errorState: { retryable: true } } });
      assert.equal((await ticketPost("consume", input)).body.error, "owner_ticket_replayed");
      assert.equal((await ticketPost("issue", f.input)).body.error, "owner_ticket_replayed");
    });
    if (workerMode) await t.test("native status is read only after mixed owner Worker consumption", async () => {
      const before = await stateSnapshot();
      const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => ticketPost(i % 2 ? "status/" : "status", statusInput(input, f.execution), workerAuth)));
      for (const r of responses) {
        assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.data.state, "consumed");
        assert.equal(r.body.data.renewable, false); assert.equal(r.body.data.launchAuthority, false);
        assert.equal(r.body.data.consumeId, before.tickets.find(x => x.id === row.id)!.consumeId);
        for (const key of ["ticket", "consumeAck", "signature", "expiresAt", "leaseToken", "launchReceipt"]) assert.equal(r.body.data[key], undefined);
      }
      assert.deepEqual(await stateSnapshot(), before);
    });
    await t.test("native owner authentication and default missing signer fail closed", checkAuthentication);
    async function issuedFixture() {
      const f = await fixture(), issued = await ticketPost("issue", f.input);
      assert.equal(issued.status, 201, JSON.stringify(issued.body));
      const ticket = issued.body.data.ticket, row = await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: ticket.payload.ticketId } });
      return { ...f, row, consume: { ticket, ticketDigest: row.digest, challenge: row.challenge, claimDigest: row.claimDigest, executionId: row.executionId, taskId: row.taskId, attempt: 1 } };
    }
    if (workerMode) {
      await t.test("assigned Worker success records the credential actor and reconciles the same consume ID", async () => {
        const x = await issuedFixture();
        const result = await consume(x.consume, x.execution); assert.equal(result.status, 200, JSON.stringify(result.body));
        const event = await prisma.event.findFirstOrThrow({ where: { resourceId: x.row.id, type: "owner_ticket_consumed" } });
        assert.equal(event.actorId, credential!.id); assert.equal((event.payload as any).principal, "host_credential");
        assert.equal((event.payload as any).hostId, host.id);
        const before = await stateSnapshot();
        const status = await ticketPost("status", statusInput(x.consume, x.execution), workerAuth);
        assert.equal(status.status, 200, JSON.stringify(status.body)); assert.equal(status.body.data.reason, "spent_reconcile_only");
        assert.equal(status.body.data.consumeId, result.body.data.consumeAck.payload.consumeId);
        assert.deepEqual(await stateSnapshot(), before);
      });
      await t.test("native binding and credential constraints retain immutable history", async () => {
        const binding = (await prisma.$queryRaw<any[]>`SELECT binding FROM trusted_provider_ticket_worker_bindings WHERE ticket_id=${row.id}::uuid`)[0].binding;
        assert.deepEqual(binding, { ...workerTicketPrincipal(credential), leaseTokenDigest: workerClaimTokenDigest(f.execution.leaseToken!),
          claimSessionId: (f.execution.checkpoint as any).sessionId, expiresAt: f.execution.leaseExpiresAt!.getTime() < credential!.expiresAt!.getTime() ? f.execution.leaseExpiresAt!.toISOString() : credential!.expiresAt!.toISOString() });
        assert.ok(!JSON.stringify(binding).includes(rawWorkerKey)); assert.ok(!JSON.stringify(binding).includes(f.execution.leaseToken!));
        for (const data of [{ workerHostId: randomUUID() }, { workerInstallationId: randomUUID() }, { workerBindingEpoch: 2 }, { keyHash: hashApiKey(randomUUID()) }, { scopes: [] }])
          await assert.rejects(prisma.apiKey.update({ where: { id: credential!.id }, data }));
        await assert.rejects(prisma.apiKey.delete({ where: { id: credential!.id } }));
        await assert.rejects(prisma.apiKey.create({ data: credentialData(host.id, randomUUID()) }));
        await assert.rejects(prisma.$executeRaw`UPDATE trusted_provider_ticket_worker_bindings SET binding=binding WHERE ticket_id=${row.id}::uuid`);
        await assert.rejects(prisma.$executeRaw`DELETE FROM trusted_provider_ticket_worker_bindings WHERE ticket_id=${row.id}::uuid`);
        await prisma.apiKey.update({ where: { id: credential!.id }, data: { credentialVersion: 999 } });
        assert.equal((await prisma.apiKey.findUniqueOrThrow({ where: { id: credential!.id } })).credentialVersion, credential!.credentialVersion);
      });
      await t.test("wrong Worker and confused principals cannot consume or inspect", async () => {
        const x = await issuedFixture(), wi = workerInput(x.consume, x.execution), si = statusInput(x.consume, x.execution);
        const b = await prisma.agentHost.create({ data: { workspaceId: w, name: "Other inert host", slug: `other-${randomUUID()}`, platform: "synthetic", status: "online" } });
        const raw = randomUUID(); await prisma.apiKey.create({ data: credentialData(b.id, raw) });
        for (const action of ["consume", "status"]) {
          const body = action === "consume" ? wi : si;
          assert.equal((await ticketPost(action, body, { "X-API-Key": raw })).status, 403);
          assert.equal((await ticketPost(action, body, auth)).status, 403);
          for (const patch of [{ hostId: b.id }, { installationId: randomUUID() }, { leaseToken: randomUUID() }])
            assert.equal((await ticketPost(action, { ...body, worker: { ...wi.worker, ...patch } }, workerAuth)).status, 403);
        }
        for (const action of ["issue", "revoke", "rotate"]) assert.equal((await ticketPost(action, {}, workerAuth)).status, 403);
        for (const action of ["consume", "status"]) {
          const unavailable = await h.request(`/v1/agent-runtime/owner-tickets/${action}`, { method: "POST", headers: workerAuth, body: JSON.stringify(action === "consume" ? wi : si) });
          assert.equal(unavailable.status, 503, JSON.stringify(unavailable.body)); assert.equal(unavailable.body.error, "owner_ticket_unavailable");
        }
        assert.equal(await journalCount(x.row.id), 1);
      });
      await t.test("current status and failed evidence observations never mutate Ready or extend deadlines", async () => {
        const x = await issuedFixture(), si = statusInput(x.consume, x.execution);
        const before = await stateSnapshot();
        assert.equal((await ticketPost("status", si, workerAuth)).body.data.reason, "current_unconsumed");
        const malformed = await ticketPost("status", { ...si, diagnostic: { password: "synthetic-blocked-value" } }, workerAuth);
        assert.equal(malformed.status, 409); assert.equal(malformed.body.error, "agent_runtime_content_blocked");
        const badProof = await ticketPost("status", { ...si, worker: { ...si.worker, password: "synthetic-blocked-value" } }, workerAuth);
        assert.equal(badProof.status, 409); assert.equal(badProof.body.error, "agent_runtime_content_blocked");
        evidenceMutation = e => { e.writerDigest = "0".repeat(64); };
        try { assert.equal((await ticketPost("status", si, workerAuth)).body.data.reason, "context_unavailable"); } finally { evidenceMutation = undefined; }
        const at = clock; clock = x.row.expiresAt.getTime();
        try { assert.equal((await ticketPost("status", si, workerAuth)).body.data.reason, "expired"); } finally { clock = at; }
        assert.deepEqual(await stateSnapshot(), before);
      });
      await t.test("claim loss and host reassignment deny consume while status remains observational", async () => {
        for (const data of [{ leaseToken: randomUUID() }, { checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: randomUUID() } }, { agentHostId: null }]) {
          const x = await issuedFixture();
          const concurrent = await Promise.all([prisma.agentExecution.update({ where: { id: x.execution.id }, data }),
            ...Array.from({ length: 4 }, () => ticketPost("status", statusInput(x.consume, x.execution), workerAuth))]);
          for (const r of concurrent.slice(1) as any[]) assert.ok([200, 409].includes(r.status), JSON.stringify(r.body));
          const before = await stateSnapshot();
          const r = await ticketPost("status", statusInput(x.consume, x.execution), workerAuth);
          assert.equal(r.status, 200, JSON.stringify(r.body)); assert.notEqual(r.body.data.reason, "current_unconsumed");
          assert.deepEqual(await stateSnapshot(), before);
          assert.equal((await consume(x.consume, x.execution)).status, 409);
          assert.equal(await journalCount(x.row.id), 1);
        }
      });
      await t.test("consume revoke race with concurrent polling has one durable outcome", async () => {
        const x = await issuedFixture();
        const results = await Promise.all([consume(x.consume, x.execution), ticketPost("revoke", { ticketId: x.row.id, expectedVersion: 1 }),
          ...Array.from({ length: 8 }, () => ticketPost("status", statusInput(x.consume, x.execution), workerAuth))]);
        assert.equal(results.slice(0, 2).filter(r => r.status === 200).length, 1, JSON.stringify(results));
        for (const r of results.slice(2)) assert.ok([200, 409].includes(r.status), JSON.stringify(r.body));
        const terminal = await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: x.row.id } });
        assert.ok(["consumed", "revoked"].includes(terminal.state)); assert.equal(await journalCount(x.row.id), 2);
        assert.equal(await prisma.event.count({ where: { resourceId: x.row.id, type: { in: ["owner_ticket_consumed", "owner_ticket_revoked"] } } }), 1);
      });
    }
    await t.test("native source watches invalidate Ready and owner revocation is durable", async () => {
      const x = await issuedFixture();
      await prisma.companyRecord.update({ where: { id: x.f.sources[0].id }, data: { description: "Changed synthetic source" } });
      const ready = (await prisma.task.findUniqueOrThrow({ where: { id: x.task.id } })).executionReadiness as any;
      assert.notEqual(ready.status, "ready");
      assert.equal((await ticketPost("consume", x.consume)).status, 409);
      assert.equal((await ticketPost("revoke", { ticketId: x.row.id, expectedVersion: 1 })).status, 200);
      assert.equal((await ticketPost("consume", x.consume)).body.error, "owner_ticket_replayed");
      assert.equal(await journalCount(x.row.id), 2);
    });
    await t.test("native accepted decision supersession invalidates outstanding ticket", async () => {
      const x = await issuedFixture();
      const next = await h.decisionFixtureProposal(x.d, { supersedesId: x.proposal.id, decision: "Deliver only validated parser behavior",
        conflicts: [{ kind: "narrows", oldProvision: x.proposal.body.decision, newProvision: "Deliver only validated parser behavior", explanation: "Narrow the accepted fixture scope" }] });
      assert.equal(next.response.status, 201, JSON.stringify(next.response.body));
      await h.decisionFixtureProof(x.d);
      const v = (await h.request(`/v1/decisions/${next.id}/governance`, { headers: auth })).body.data;
      const accepted = await post(`/v1/decisions/${next.id}/governance/actions`, { requestId: randomUUID(), expectedVersion: v.expectedVersion, action: "accept", previewId: v.previews[0].id });
      assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
      assert.equal((await ticketPost("consume", x.consume)).status, 409);
      assert.equal(await journalCount(x.row.id), 1);
    });
    await t.test("expiry commits a terminal row and one audit entry", async () => {
      const x = await issuedFixture(); clock = x.row.expiresAt.getTime();
      assert.equal((await ticketPost("consume", x.consume)).body.error, "owner_ticket_expired");
      assert.equal((await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: x.row.id } })).state, "expired");
      assert.equal(await journalCount(x.row.id), 2);
      assert.equal(await prisma.event.count({ where: { resourceId: x.row.id, type: "owner_ticket_expired" } }), 1);
      assert.equal((await ticketPost("consume", x.consume)).body.error, "owner_ticket_replayed");
    });
    await t.test("key rotation atomically revokes outstanding tickets", async () => {
      const x = await issuedFixture();
      if (workerMode) {
        const results = await Promise.all([consume(x.consume, x.execution), ticketPost("rotate", { expectedEpoch: 1, nextKeyId: "synthetic-2", nextPublicKeyDigest: "0".repeat(64) }),
          ...Array.from({ length: 8 }, () => ticketPost("status", statusInput(x.consume, x.execution), workerAuth))]);
        for (const r of results) assert.ok([200, 409].includes(r.status), JSON.stringify(r.body));
        const rotated = await prisma.trustedProviderTicketKey.findUniqueOrThrow({ where: { workspaceId: w } });
        if (rotated.epoch === 1) assert.equal((await ticketPost("rotate", { expectedEpoch: 1, nextKeyId: "synthetic-2", nextPublicKeyDigest: "0".repeat(64) })).status, 200);
        assert.equal(await journalCount(x.row.id), 2);
        const before = await stateSnapshot();
        assert.ok(["key_changed", "revoked"].includes((await ticketPost("status", statusInput(x.consume, x.execution), workerAuth)).body.data.reason));
        assert.deepEqual(await stateSnapshot(), before);
        return;
      }
      assert.equal((await ticketPost("rotate", { expectedEpoch: 1, nextKeyId: "synthetic-2", nextPublicKeyDigest: "0".repeat(64) })).status, 200);
      assert.equal((await prisma.trustedProviderTicketKey.findUniqueOrThrow({ where: { workspaceId: w } })).epoch, 2);
      assert.equal((await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: x.row.id } })).state, "revoked");
      assert.equal(await journalCount(x.row.id), 2);
      assert.equal((await ticketPost("consume", x.consume)).body.error, "owner_ticket_replayed");
    });
    if (workerMode) await t.test("credential revocation version epoch expiry and stale authenticated snapshots fail closed", async () => {
      const oldIdentity = workerTicketPrincipal(credential)!;
      await prisma.apiKey.update({ where: { id: credential!.id }, data: { active: false, revokedAt: new Date() } });
      const revoked = await prisma.apiKey.findUniqueOrThrow({ where: { id: credential!.id } });
      assert.equal(revoked.credentialVersion, credential!.credentialVersion + 1);
      assert.equal((await ticketPost("status", statusInput(input, f.execution), workerAuth)).status, 403);
      assert.equal((await consume()).status, 403);
      await assert.rejects(prisma.apiKey.update({ where: { id: credential!.id }, data: { active: true, revokedAt: null } }));
      await assert.rejects(prisma.apiKey.create({ data: credentialData(host.id, randomUUID(), 1) }));
      const raw = randomUUID(); const replacement = await prisma.apiKey.create({ data: credentialData(host.id, raw, 2) });
      assert.equal((await ticketPost("status", statusInput(input, f.execution), { "X-API-Key": raw })).status, 403);
      const stale = { workspaceId: w, authType: "api_key" as const, apiKeyId: credential!.id, workerTicketIdentity: oldIdentity };
      assert.equal(await store.read!(async tx => tx.worker!(stale, (await tx.find(w, row.id))!, new Date(clock))), false);
      await prisma.apiKey.update({ where: { id: replacement.id }, data: { active: false } });
      const expiredRaw = randomUUID(); await prisma.apiKey.create({ data: { ...credentialData(host.id, expiredRaw, 3), expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await ticketPost("status", statusInput(input, f.execution), { "X-API-Key": expiredRaw })).status, 403);
    });
    assert.deepEqual(executionProviderRegistry, registryBefore);
    assert.equal(await prisma.agentExecution.count({ where: { workspaceId: w, status: { not: "claimed" } } }), 0);
  });
}
