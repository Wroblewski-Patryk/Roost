import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";
import { hashApiKey } from "../auth/api-key";
import { agentPrincipalScopes } from "../auth/agent-principal";
import { digest } from "../auth/owner-action-proof";
import { prepareExecutionPacket } from "../modules/agent-runtime/execution-packet";
import { createDirectionDraft, previewDirectionDraft, adoptDirectionDraft } from "../modules/strategy/company-direction";

type Response = { status: number; body: any };
type Request = (path: string, init?: RequestInit) => Promise<Response>;

export function registerCompanyDirectionTests(deps: { request: Request; registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }>;
  prepareReviewFixture: (agentMode?: boolean, autoGrants?: boolean) => Promise<any>;
  decisionFixtureProposal: (fixture: any, extra?: any) => Promise<any>;
  decisionFixtureProof: (fixture: any) => Promise<void>;
  runMcpBridgeSmoke: (apiKey: string, options?: any) => Promise<any> }) {
  test("G19 owner adoption, comparison and task-bound current direction", async () => {
    const { request, registerOwner } = deps;
    const first = await registerOwner(`direction-${randomUUID()}@example.test`, "Direction fixture");
    const second = await registerOwner(`other-direction-${randomUUID()}@example.test`, "Other fixture");
    const workspaceId = first.workspace.id;
    const human = { Authorization: `Bearer ${first.token}` };
    const otherHuman = { Authorization: `Bearer ${second.token}` };
    const root = "/v1/strategy/direction";
    const post = (path: string, body: unknown, headers: Record<string, string> = human) => request(path,
      { method: "POST", headers, body: JSON.stringify(body) });
    const data = (response: Response) => { assert.ok(response.status >= 200 && response.status < 300, JSON.stringify(response.body)); return response.body.data; };
    const provedPost = async (path: string, body: unknown) => {
      const encoded = JSON.stringify(body);
      const proof = data(await post("/v1/auth/reauth", { method: "POST", path, bodyDigest: digest(encoded), password: "very-strong-password" })).proof;
      return request(path, { method: "POST", headers: { ...human, "X-Owner-Action-Proof": proof }, body: encoded });
    };
    const worker = await prisma.workforceEntity.create({ data: { workspaceId, name: "Direction fixture worker", slug: `direction-${randomUUID()}`,
      type: "agent", source: "system", status: "active" } });
    const otherWorker = await prisma.workforceEntity.create({ data: { workspaceId, name: "Other fixture worker", slug: `other-${randomUUID()}`,
      type: "agent", source: "system", status: "active" } });
    const task = await prisma.task.create({ data: { workspaceId, title: "Aligned service task", assignedWorkforceEntityId: worker.id } });
    const decision = await prisma.decision.create({ data: { workspaceId, title: "Conflict tradeoff", context: "Fixture only", status: "proposed" } });
    const key = `cc_v1_${randomUUID()}`;
    await prisma.apiKey.create({ data: { workspaceId, boundAgentId: worker.id, name: "Direction fixture credential", keyHash: hashApiKey(key),
      keyPrefix: key.slice(0, 10), active: true, expiresAt: new Date(Date.now() + 3600000), scopes: agentPrincipalScopes } });
    const otherKey = `cc_v1_${randomUUID()}`;
    const otherCredential = await prisma.apiKey.create({ data: { workspaceId, boundAgentId: otherWorker.id, name: "Other fixture credential", keyHash: hashApiKey(otherKey),
      keyPrefix: otherKey.slice(0, 10), active: true, expiresAt: new Date(Date.now() + 3600000), scopes: agentPrincipalScopes } });
    const agent = { "X-API-Key": key }, unrelatedAgent = { "X-API-Key": otherKey };
    const packetDirection = async () => {
      const currentTask = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      const packet = await prepareExecutionPacket({ id: randomUUID(), workspaceId, taskId: task.id, applicationId: null,
        metadata: { executionContract: { context: { company: [], product: [], technical: [] } } } } as any, currentTask);
      return packet.companyDirection;
    };
    assert.equal(data(await request(root, { headers: human })).current, null);
    assert.equal(await packetDirection(), null);
    assert.equal((await request(root, { headers: agent })).status, 403);
    assert.equal((await request(root, { headers: otherHuman })).status, 200);
    const draft = data(await post(`${root}/drafts`, { text: "Serve with evidence and clear responsibility.", provenance: "Isolated owner fixture" }));
    assert.equal(draft.status, "draft");
    assert.equal(data(await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: agent })).current, null);
    const preview = data(await post(`${root}/drafts/${draft.id}/preview`, {}));
    assert.equal(preview.counts.tasks, 1);
    assert.equal(preview.counts.decisions, 1);
    assert.equal(preview.examples.tasks[0].id, task.id);
    assert.equal((await post(`${root}/drafts/${draft.id}/adopt`, { previewId: preview.previewId, expectedCurrentId: null, impactDigest: preview.impactDigest })).status, 403);
    assert.equal((await provedPost(`${root}/drafts/${draft.id}/adopt`,
      { previewId: randomUUID(), expectedCurrentId: null, impactDigest: preview.impactDigest })).status, 409);
    const adopted = data(await provedPost(`${root}/drafts/${draft.id}/adopt`,
      { previewId: preview.previewId, expectedCurrentId: null, impactDigest: preview.impactDigest }));
    assert.equal(adopted.version, 1);
    await assert.rejects(() => prisma.companyDirectionVersion.update({ where: { id: adopted.id },
      data: { text: "Unauthorized rewrite of accepted history" } }));
    await assert.rejects(() => prisma.companyDirectionVersion.update({ where: { id: adopted.id },
      data: { status: "superseded" } }));
    assert.equal((await packetDirection())?.id, adopted.id);
    const exact = data(await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: agent }));
    assert.equal(exact.current.id, adopted.id);
    assert.equal(exact.current.text, adopted.text);
    await deps.runMcpBridgeSmoke(key, { toolName: "companycore_get_strategy_tasks_by_id_direction", arguments: { id: task.id } });
    await deps.runMcpBridgeSmoke(otherKey, { toolName: "companycore_get_strategy_tasks_by_id_direction", arguments: { id: task.id },
      expectError: true, expectedStatus: 404, expectedResponseError: "direction_task_scope_invalid" });
    assert.equal((await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: unrelatedAgent })).status, 404);
    assert.equal((await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: otherHuman })).status, 403);
    assert.equal((await request(`/v1/strategy/tasks/${randomUUID()}/direction`, { headers: agent })).status, 404);
    const aligned = data(await post(`${root}/comparisons`, { subjectType: "task", subjectId: task.id, outcome: "Accountable delivery",
      evidence: "Fixture work order", assessment: "aligned" }));
    assert.equal(aligned.directionVersionId, adopted.id);
    assert.equal((await post(`${root}/comparisons/${aligned.id}/actions/resolve`, { action: "confirm_aligned", rationale: "Fixture review" })).status, 403);
    assert.equal(data(await provedPost(`${root}/comparisons/${aligned.id}/actions/resolve`,
      { action: "confirm_aligned", rationale: "Fixture review" })).status, "aligned");
    const conflict = data(await post(`${root}/comparisons`, { subjectType: "decision", subjectId: decision.id,
      outcome: "Accept a narrower offer", evidence: "Fixture decision evidence", assessment: "conflict" }));
    assert.equal((await provedPost(`${root}/comparisons/${conflict.id}/actions/resolve`,
      { action: "confirm_aligned", rationale: "Wrong path" })).status, 400);
    assert.equal(data(await provedPost(`${root}/comparisons/${conflict.id}/actions/resolve`,
      { action: "accept_exception", rationale: "Explicit fixture tradeoff" })).status, "exception_accepted");
    const stale = data(await post(`${root}/comparisons`, { subjectType: "task", subjectId: task.id,
      outcome: "A second outcome", evidence: "Fixture", assessment: "aligned" }));
    await prisma.task.update({ where: { id: task.id }, data: { title: "Changed task" } });
    const staleOwnerView = data(await request(root, { headers: human }));
    assert.equal(staleOwnerView.comparisons.find((item: any) => item.id === aligned.id).currentEvidence, false);
    assert.equal((await provedPost(`${root}/comparisons/${stale.id}/actions/resolve`,
      { action: "confirm_aligned", rationale: "Stale" })).status, 409);
    const draft2 = data(await post(`${root}/drafts`, { text: "Current second purpose.", provenance: "Second isolated owner fixture" }));
    assert.equal((await packetDirection())?.id, adopted.id);
    const preview2 = data(await post(`${root}/drafts/${draft2.id}/preview`, {}));
    assert.equal(preview2.expectedCurrentId, adopted.id);
    assert.equal((await provedPost(`${root}/drafts/${draft2.id}/adopt`,
      { previewId: preview2.previewId, expectedCurrentId: null, impactDigest: preview2.impactDigest })).status, 409);
    const adopted2 = data(await provedPost(`${root}/drafts/${draft2.id}/adopt`,
      { previewId: preview2.previewId, expectedCurrentId: adopted.id, impactDigest: preview2.impactDigest }));
    assert.equal(adopted2.version, 2);
    assert.equal((await packetDirection())?.id, adopted2.id);
    const ownerView = data(await request(root, { headers: human }));
    assert.equal(ownerView.current.id, adopted2.id);
    assert.equal(ownerView.versions.find((v: any) => v.id === adopted.id).status, "superseded");
    assert.equal(ownerView.comparisons.find((item: any) => item.id === conflict.id).currentEvidence, false);
    assert.equal(data(await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: agent })).current.id, adopted2.id);
    await prisma.task.update({ where: { id: task.id }, data: { status: "done" } });
    assert.equal((await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: agent })).status, 404);
    await prisma.task.update({ where: { id: task.id }, data: { status: "blocked" } });
    assert.equal((await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: agent })).status, 404);
    await prisma.task.update({ where: { id: task.id }, data: { status: "todo", assignedWorkforceEntityId: otherWorker.id } });
    assert.equal((await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: agent })).status, 404);
    assert.equal(data(await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: unrelatedAgent })).current.id, adopted2.id);
    await prisma.apiKey.update({ where: { id: otherCredential.id }, data: { revokedAt: new Date(), active: false } });
    assert.equal((await request(`/v1/strategy/tasks/${task.id}/direction`, { headers: unrelatedAgent })).status, 403);
    assert.equal((await post(`${root}/drafts`, { text: "Unauthorized", provenance: "Fixture" }, agent)).status, 403);
  });

  test("G19 adopted direction invalidates Ready and signals an active native stop", async () => {
    const f = await deps.prepareReviewFixture(false, false);
    const before = await prisma.task.findUniqueOrThrow({ where: { id: f.task.id } });
    assert.equal((before.executionReadiness as any)?.status, "ready");
    const watched = await prisma.$queryRaw<Array<{ source_table: string }>>`SELECT source_table FROM task_ready_source_watches WHERE task_id=${f.task.id}::uuid`;
    assert.ok(watched.some(row => row.source_table === "company_direction_heads"));
    await prisma.agentExecution.update({ where: { id: f.execution.id }, data: { status: "running", completedAt: null } });
    const owner = await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspaceId }, select: { ownerUserId: true } });
    const draft = await createDirectionDraft(f.workspaceId, owner.ownerUserId, "Use evidence before changing a task.", "Isolated Ready fixture");
    const preview = await previewDirectionDraft(f.workspaceId, owner.ownerUserId, draft.id);
    await adoptDirectionDraft(f.workspaceId, owner.ownerUserId, draft.id, preview.previewId, null, preview.impactDigest);
    const task = await prisma.task.findUniqueOrThrow({ where: { id: f.task.id } });
    assert.equal((task.executionReadiness as any)?.status, "needs_revalidation");
    assert.equal((task.executionReadiness as any)?.reason, "context_changed");
    const execution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: f.execution.id } });
    assert.ok(execution.contextInvalidatedAt);
    assert.equal((execution.contextInvalidation as any)?.reason, "context_changed");
    assert.ok(await prisma.agentExecutionEvent.count({ where: { executionId: f.execution.id, type: "context_stop_requested" } }));
  });

  test("G19 governed decision acceptance requires current owner comparison", async () => {
    const f = await deps.prepareReviewFixture(false, false);
    const owner = await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspaceId }, select: { ownerUserId: true } });
    const draft = await createDirectionDraft(f.workspaceId, owner.ownerUserId, "Deliver narrow validated behavior.", "Isolated decision fixture");
    const preview = await previewDirectionDraft(f.workspaceId, owner.ownerUserId, draft.id);
    await adoptDirectionDraft(f.workspaceId, owner.ownerUserId, draft.id, preview.previewId, null, preview.impactDigest);
    const proposal = await deps.decisionFixtureProposal(f);
    assert.equal(proposal.response.status, 201, JSON.stringify(proposal.response.body));
    await deps.decisionFixtureProof(f);
    const url = `/v1/decisions/${proposal.id}/governance`;
    const get = async () => {
      const response = await deps.request(url, { headers: f.auth });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      return response.body.data;
    };
    const accept = async () => {
      const view = await get();
      return f.post(`${url}/actions`, { requestId: randomUUID(), expectedVersion: view.expectedVersion,
        action: "accept", previewId: view.previews[0].id });
    };
    const denied = await accept();
    assert.equal(denied.status, 409, JSON.stringify(denied.body));
    assert.equal(denied.body.error, "direction_comparison_required");
    const comparePath = "/v1/strategy/direction/comparisons";
    const compare = async () => {
      const compared = await f.post(comparePath, { subjectType: "decision", subjectId: proposal.id,
        outcome: "Deliver narrow parser behavior", evidence: "Isolated decision evidence", assessment: "conflict" });
      assert.equal(compared.status, 201, JSON.stringify(compared.body));
      return compared.body.data;
    };
    const resolve = async (comparisonId: string, action: string) => {
      const resolvePath = `${comparePath}/${comparisonId}/actions/resolve`;
      const body = { action, rationale: "Explicit isolated owner tradeoff" };
      const proof = await f.post("/v1/auth/reauth", { method: "POST", path: resolvePath,
        bodyDigest: digest(JSON.stringify(body)), password: "very-strong-password" });
      assert.equal(proof.status, 200, JSON.stringify(proof.body));
      const resolved = await f.post(resolvePath, body, { ...f.auth, "X-Owner-Action-Proof": proof.body.data.proof });
      assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
      return resolved.body.data;
    };
    const rejected = await compare();
    assert.equal((await resolve(rejected.id, "reject_exception")).status, "exception_rejected");
    assert.equal((await accept()).body.error, "direction_comparison_required");
    const compared = await compare();
    assert.equal((await resolve(compared.id, "accept_exception")).status, "exception_accepted");
    assert.equal((await get()).previews[0].id, compared.subjectGovernancePreviewId);
    const accepted = await accept();
    assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
  });
}
