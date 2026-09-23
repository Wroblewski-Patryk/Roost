import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
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

export function registerOwnerTicketDatabaseTests(h: any) {
  test("owner ticket native PostgreSQL HTTP qualification", { skip: !process.env.OWNER_TICKET_TEST_DATABASE, timeout: 180000 }, async t => {
    const owner = await h.registerOwner(`ticket-native-${randomUUID()}@example.test`, "Synthetic ticket qualification");
    const w = owner.workspace.id, auth = { Authorization: `Bearer ${owner.token}` };
    const post = (url: string, body: any, headers = auth) => h.request(url, { method: "POST", headers, body: JSON.stringify(body) });
    const primary = await prisma.workspace.findUniqueOrThrow({ where: { id: w } });
    const synthetic = await ownerTicketFixture();
    await prisma.trustedProviderTicketKey.create({ data: { workspaceId: w, ...synthetic.state().key } });
    const host = await prisma.agentHost.create({ data: { workspaceId: w, name: "Inert fixture host", slug: "ticket-native", platform: "synthetic", status: "online" } });
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
    // Throw only AFTER the real SQL operation inside the real transaction.
    // No mocked persistence, disabled trigger or automatic retry is involved.
    const faultStore: typeof store = { transaction: work => store.transaction(tx => work(new Proxy(tx, {
      get(target, name: keyof typeof tx) {
        return async (...args: any[]) => {
          const result = await (target[name] as Function)(...args);
          if (fault === name) throw Error("synthetic post-write failure");
          return result;
        };
      }
    }))) };
    const service = createOwnerTicketService(faultStore, { ...synthetic.options, now: () => new Date(clock) });
    const registryBefore = structuredClone(executionProviderRegistry);
    const http = express(); http.use(express.json()); http.use(requireApiKey);
    for (const action of ["issue", "consume", "revoke", "rotate"] as const) http.post(`/v1/agent-runtime/owner-tickets/${action}`, ownerTicketHandler(action, service));
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
      assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int n FROM trusted_provider_ticket_journal j LEFT JOIN trusted_provider_tickets t ON t.id=j.ticket_id WHERE t.id IS NULL`)[0].n, 0);
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
    await t.test("real database current Ready and decision gates", async () => {
      assert.equal((await prisma.decision.findUniqueOrThrow({ where: { id: row.decisionId } })).status, "accepted");
      const ready: any = await readyTransaction(db => inspectReady(db, w, f.task.id, f.execution)); assert.equal(ready.readiness.status, "ready");
      const watches = await prisma.$queryRaw<any[]>`SELECT source_table FROM task_ready_source_watches WHERE task_id=${f.task.id}::uuid`;
      assert.ok(watches.some(r => r.source_table === "task_decision_effects"));
      assert.ok(watches.some(r => r.source_table === "decisions"));
    });
    const journalCount = async (id: string) => (await prisma.$queryRaw<any[]>`SELECT count(*)::int n FROM trusted_provider_ticket_journal WHERE ticket_id=${id}::uuid`)[0].n;
    for (const stage of ["transition", "spendAttempt", "audit"]) await t.test(`consume rollback after real ${stage}`, async () => {
      fault = stage;
      try { assert.equal((await ticketPost("consume", input)).status, 503); } finally { fault = undefined; }
      assert.deepEqual(await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: row.id } }), row);
      assert.equal(await journalCount(row.id), 1);
      assert.equal(await prisma.event.count({ where: { resourceId: row.id, type: "owner_ticket_consumed" } }), 0);
      assert.deepEqual((await prisma.agentExecution.findUniqueOrThrow({ where: { id: row.executionId } })).errorState, f.execution.errorState);
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
      const results = await Promise.all(Array.from({ length: 20 }, () => ticketPost("consume", input)));
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
    await t.test("native owner authentication and default missing signer fail closed", checkAuthentication);
    async function issuedFixture() {
      const f = await fixture(), issued = await ticketPost("issue", f.input);
      assert.equal(issued.status, 201, JSON.stringify(issued.body));
      const ticket = issued.body.data.ticket, row = await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: ticket.payload.ticketId } });
      return { ...f, row, consume: { ticket, ticketDigest: row.digest, challenge: row.challenge, claimDigest: row.claimDigest, executionId: row.executionId, taskId: row.taskId, attempt: 1 } };
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
      assert.equal((await ticketPost("rotate", { expectedEpoch: 1, nextKeyId: "synthetic-2", nextPublicKeyDigest: "0".repeat(64) })).status, 200);
      assert.equal((await prisma.trustedProviderTicketKey.findUniqueOrThrow({ where: { workspaceId: w } })).epoch, 2);
      assert.equal((await prisma.trustedProviderTicket.findUniqueOrThrow({ where: { id: x.row.id } })).state, "revoked");
      assert.equal(await journalCount(x.row.id), 2);
      assert.equal((await ticketPost("consume", x.consume)).body.error, "owner_ticket_replayed");
    });
    assert.deepEqual(executionProviderRegistry, registryBefore);
    assert.equal(await prisma.agentExecution.count({ where: { workspaceId: w, status: { not: "claimed" } } }), 0);
  });
}
