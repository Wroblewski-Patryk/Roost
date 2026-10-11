import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";
import { digest } from "../auth/owner-action-proof";

export function registerTaskProposalTests(helpers: { request: (path: string, init?: RequestInit) => Promise<{ status: number; body: any }>; registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }> }) {
  const { request, registerOwner } = helpers;
  const data = (response: { status: number; body: any }) => {
    assert.ok(response.status >= 200 && response.status < 300, JSON.stringify(response.body));
    return response.body.data;
  };

  test("G13: exact agent mandate yields one deduplicated proposal and owner Draft without execution", async () => {
    const owner = await registerOwner(`proposal-${randomUUID()}@example.test`, "Proposal fixture");
    const workspaceId = owner.workspace.id;
    const human = { Authorization: `Bearer ${owner.token}` };
    const post = (path: string, body: unknown, headers: Record<string, string> = human) => request(path, { method: "POST", headers, body: JSON.stringify(body) });
    const exactOwnerPost = async (path: string, input: unknown) => {
      const body = JSON.stringify(input);
      const proof = data(await post("/v1/auth/reauth", { method: "POST", path, bodyDigest: digest(body), password: "very-strong-password" })).proof;
      return request(path, { method: "POST", headers: { ...human, "X-Owner-Action-Proof": proof }, body });
    };
    const agent = await prisma.workforceEntity.create({ data: { workspaceId, name: "Company proposer fixture", slug: `proposer-${randomUUID()}`, type: "agent", status: "active" } });
    const task = await prisma.task.create({ data: { workspaceId, title: "Inspect approved company context", assignedWorkforceEntityId: agent.id, status: "todo" } });
    const record = await prisma.companyRecord.create({ data: { workspaceId, title: "Approved company fact", key: randomUUID(), recordType: "company_context", source: "manual", status: "active", description: "Fixture business context" } });
    data(await post(`/v1/company-records/${record.id}/context-reviews`, {
      requestId: randomUUID(), taskId: task.id, expectedRevision: record.updatedAt.toISOString(), action: "approve",
      classification: "fact", provenance: "Owner fixture attestation", environment: "isolated_test",
      verificationMethod: "Fixture source inspection", verificationRef: "G13 isolated test",
      inclusionReason: "Exact source for proposal", validUntil: new Date(Date.now() + 60 * 60_000).toISOString()
    }));
    const credential = data(await post("/v1/api-keys/agent-credentials", {
      requestId: randomUUID(), agentId: agent.id, name: "Proposal fixture key",
      expiresAt: new Date(Date.now() + 60 * 60_000).toISOString()
    }));
    const agentAuth = { "X-API-Key": credential.key as string };
    const proposalRoot = `/v1/agent-runtime/tasks/${task.id}/proposals`;
    const mandateRoot = `/v1/agent-runtime/tasks/${task.id}/proposal-mandates`;
    const candidates = data(await request("/v1/agent-runtime/task-proposal-mandate-candidates", { headers: human }));
    assert.ok(candidates.items.some((item: any) => item.taskId === task.id && item.sources.some((source: any) => source.id === record.id)));
    const issue = async () => data(await exactOwnerPost(mandateRoot, { requestId: randomUUID(), credentialId: credential.id,
      sourceRecordId: record.id, expectedSourceRevision: record.updatedAt.toISOString(),
      validUntil: new Date(Date.now() + 20 * 60_000).toISOString(), reason: "One scoped company task proposal" }));
    assert.equal((await post(proposalRoot, { requestId: randomUUID() }, agentAuth)).status, 400);
    assert.equal((await post(mandateRoot, { requestId: randomUUID() }, agentAuth)).status, 403);
    assert.equal((await post(mandateRoot, { requestId: randomUUID() })).status, 403);
    const mandate = (await issue()).record;
    const proposalBody = { requestId: randomUUID(), mandateId: mandate.id, sourceRecordId: record.id,
      expectedSourceRevision: record.updatedAt.toISOString(), title: "Clarify company handoff",
      outcome: "Record one actionable handoff rule", category: "missing_assumption",
      priorityBand: "approved_missing_feature", priorityRationale: "An approved source requires a concrete handoff" };
    const created = data(await post(proposalRoot, proposalBody, agentAuth));
    assert.equal(created.record.status, "pending");
    assert.equal(await prisma.agentExecution.count({ where: { workspaceId } }), 0);
    assert.equal(data(await post(proposalRoot, proposalBody, agentAuth)).replayed, true);
    assert.equal((await post(`/v1/agent-runtime/tasks/${randomUUID()}/proposals`, { ...proposalBody, requestId: randomUUID() }, agentAuth)).status, 409);
    assert.equal((await post(proposalRoot, { ...proposalBody, requestId: randomUUID(), title: "Other task" }, agentAuth)).status, 409);
    const duplicateMandate = (await issue()).record;
    const duplicate = data(await post(proposalRoot, { ...proposalBody, requestId: randomUUID(), mandateId: duplicateMandate.id }, agentAuth));
    assert.equal(duplicate.record.id, created.record.id);
    assert.equal(duplicate.duplicate, true);
    assert.equal(await prisma.taskProposal.count({ where: { workspaceId } }), 1);
    assert.equal(await prisma.taskProposalOccurrence.count({ where: { workspaceId } }), 2);

    const manifest = data(await request("/v1/mcp/manifest", { headers: agentAuth }));
    assert.ok(manifest.tools.some((tool: any) => tool.method === "POST" && tool.path === "/v1/agent-runtime/tasks/:id/proposals"));
    assert.ok(!manifest.tools.some((tool: any) => tool.path.includes("proposal-mandates") || tool.path.includes("task-proposals")));
    assert.equal((await request("/v1/agent-runtime/task-proposals", { headers: agentAuth })).status, 403);
    assert.equal((await post(`/v1/agent-runtime/task-proposals/${created.record.id}/actions/accept`, { requestId: randomUUID() }, agentAuth)).status, 403);
    const broadKey = data(await post("/v1/api-keys", { name: "Broad fixture key", fullAccessConfirmed: true }));
    assert.equal((await post(proposalRoot, { ...proposalBody, requestId: randomUUID() }, { "X-API-Key": broadKey.key })).status, 403);

    const listing = data(await request("/v1/agent-runtime/task-proposals?page=0&status=pending", { headers: human }));
    assert.equal(listing.items.filter((item: any) => item.id === created.record.id).length, 1);
    const detail = data(await request(`/v1/agent-runtime/task-proposals/${created.record.id}`, { headers: human }));
    assert.equal(detail.record.id, created.record.id);
    assert.equal(detail.sourceCurrent, true);
    assert.equal(detail.occurrences.length, 2);
    const acceptPath = `/v1/agent-runtime/task-proposals/${created.record.id}/actions/accept`;
    assert.equal((await post(acceptPath, { requestId: randomUUID(), expectedVersion: "0".repeat(64), reason: "Wrong revision" })).status, 409);
    const lateMandate = (await issue()).record;
    data(await post(proposalRoot, { ...proposalBody, requestId: randomUUID(), mandateId: lateMandate.id,
      priorityBand: "blocked_core_flow", priorityRationale: "Fresh independent priority evidence" }, agentAuth));
    assert.equal((await post(acceptPath, { requestId: randomUUID(), expectedVersion: detail.expectedVersion,
      reason: "A later occurrence must change the review version" })).status, 409);
    const refreshedDetail = data(await request(`/v1/agent-runtime/task-proposals/${created.record.id}`, { headers: human }));
    assert.notEqual(refreshedDetail.expectedVersion, detail.expectedVersion);
    const accepted = data(await post(acceptPath, { requestId: randomUUID(), expectedVersion: refreshedDetail.expectedVersion,
      reason: "Owner reviewed exact source and narrowed the task", title: "Document handoff rule",
      outcome: "Record one checked handoff rule", priorityBand: "blocked_core_flow" }));
    const draft = await prisma.task.findUniqueOrThrow({ where: { id: accepted.taskId } });
    assert.equal(draft.ownerUserId, (await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } })).ownerUserId);
    assert.equal(draft.status, "todo");
    assert.equal(draft.title, "Document handoff rule");
    assert.equal(draft.priority, "high");
    assert.equal(draft.assignedWorkforceEntityId, null);
    assert.equal((draft.executionReadiness as any).status, "draft");
    assert.equal(await prisma.agentExecution.count({ where: { workspaceId } }), 0);
    assert.equal((await post(acceptPath, { requestId: randomUUID(), expectedVersion: refreshedDetail.expectedVersion,
      reason: "Second acceptance must fail" })).status, 409);
    assert.equal(await prisma.taskProposalDecision.count({ where: { workspaceId, proposalId: created.record.id } }), 1);
    assert.equal(data(await request("/v1/agent-runtime/task-proposals?status=pending", { headers: human })).items.some((item: any) => item.id === created.record.id), false);

    const revokedMandate = (await issue()).record;
    const revoked = data(await post(proposalRoot, { ...proposalBody, requestId: randomUUID(), mandateId: revokedMandate.id,
      title: "Review a separate company control" }, agentAuth));
    data(await exactOwnerPost(`${mandateRoot}/${revokedMandate.id}/actions/revoke`, {
      requestId: randomUUID(), reason: "Withdraw this exact proposal authority before acceptance"
    }));
    const revokedDetail = data(await request(`/v1/agent-runtime/task-proposals/${revoked.record.id}`, { headers: human }));
    assert.equal(revokedDetail.sourceCurrent, false);
    assert.equal((await post(`/v1/agent-runtime/task-proposals/${revoked.record.id}/actions/accept`, {
      requestId: randomUUID(), expectedVersion: revokedDetail.expectedVersion,
      reason: "Revoked origin mandate must block acceptance" })).status, 409);
    assert.equal(await prisma.task.count({ where: { workspaceId } }), 2, "Revocation cannot create another Task");

    const firstBasis = (await issue()).record;
    const multi = data(await post(proposalRoot, { ...proposalBody, requestId: randomUUID(), mandateId: firstBasis.id,
      title: "Capture a second reviewed handoff" }, agentAuth));
    const secondBasis = (await issue()).record;
    const additional = data(await post(proposalRoot, { ...proposalBody, requestId: randomUUID(), mandateId: secondBasis.id,
      title: "Capture a second reviewed handoff", priorityRationale: "Independent matching observation" }, agentAuth));
    assert.equal(additional.record.id, multi.record.id);
    data(await exactOwnerPost(`${mandateRoot}/${firstBasis.id}/actions/revoke`, {
      requestId: randomUUID(), reason: "Withdraw origin while retaining separately authorized observation"
    }));
    const multiDetail = data(await request(`/v1/agent-runtime/task-proposals/${multi.record.id}`, { headers: human }));
    assert.equal(multiDetail.sourceCurrent, true);
    assert.equal(multiDetail.acceptanceBasis.mandateId, secondBasis.id);
    const multiAccepted = data(await post(`/v1/agent-runtime/task-proposals/${multi.record.id}/actions/accept`, {
      requestId: randomUUID(), expectedVersion: multiDetail.expectedVersion,
      reason: "Owner selected still-authorized matching occurrence" }));
    assert.ok(multiAccepted.taskId);
    assert.equal(await prisma.task.count({ where: { workspaceId } }), 3);

    const rejectedMandate = (await issue()).record;
    const rejectedProposal = data(await post(proposalRoot, { ...proposalBody, requestId: randomUUID(), mandateId: rejectedMandate.id,
      title: "Propose an unnecessary extra company task" }, agentAuth));
    const rejectDetail = data(await request(`/v1/agent-runtime/task-proposals/${rejectedProposal.record.id}`, { headers: human }));
    const rejectedDecision = data(await post(`/v1/agent-runtime/task-proposals/${rejectedProposal.record.id}/actions/reject`, {
      requestId: randomUUID(), expectedVersion: rejectDetail.expectedVersion,
      reason: "Owner found this task unnecessary for the approved source" }));
    assert.equal(rejectedDecision.taskId, null);
    assert.equal(await prisma.taskProposalDecision.count({ where: { workspaceId, proposalId: rejectedProposal.record.id, action: "reject" } }), 1);

    const staleMandate = (await issue()).record;
    const stale = data(await post(proposalRoot, { ...proposalBody, requestId: randomUUID(), mandateId: staleMandate.id,
      title: "Investigate another company rule" }, agentAuth));
    const staleDetail = data(await request(`/v1/agent-runtime/task-proposals/${stale.record.id}`, { headers: human }));
    const refreshedRecord = await prisma.companyRecord.update({ where: { id: record.id }, data: { description: "Source changed after proposal" } });
    assert.equal((await post(`/v1/agent-runtime/task-proposals/${stale.record.id}/actions/accept`, {
      requestId: randomUUID(), expectedVersion: staleDetail.expectedVersion, reason: "Stale source must block" })).status, 409);
    data(await post(`/v1/company-records/${record.id}/context-reviews`, {
      requestId: randomUUID(), taskId: task.id, expectedRevision: refreshedRecord.updatedAt.toISOString(), action: "approve",
      classification: "fact", provenance: "Owner reviewed refreshed fixture", environment: "isolated_test",
      verificationMethod: "Fixture source inspection", verificationRef: "G13 refreshed review",
      inclusionReason: "Same suggestion on a new approved revision", validUntil: new Date(Date.now() + 60 * 60_000).toISOString()
    }));
    const newMandate = data(await exactOwnerPost(mandateRoot, { requestId: randomUUID(), credentialId: credential.id,
      sourceRecordId: record.id, expectedSourceRevision: refreshedRecord.updatedAt.toISOString(),
      validUntil: new Date(Date.now() + 20 * 60_000).toISOString(), reason: "Fresh approved source revision" })).record;
    const newRevision = data(await post(proposalRoot, { ...proposalBody, requestId: randomUUID(),
      mandateId: newMandate.id, expectedSourceRevision: refreshedRecord.updatedAt.toISOString() }, agentAuth));
    assert.notEqual(newRevision.record.id, created.record.id, "A new approved source review may revive the same task suggestion");
    assert.equal(await prisma.agentExecution.count({ where: { workspaceId } }), 0);
  });
}
