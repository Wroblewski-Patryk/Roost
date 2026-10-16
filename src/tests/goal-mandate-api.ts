import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";
import { hashApiKey } from "../auth/api-key";
import { agentPrincipalScopes } from "../auth/agent-principal";
import { digest } from "../auth/owner-action-proof";
import { prepareExecutionPacket } from "../modules/agent-runtime/execution-packet";
import { watchReadySources } from "../modules/agent-runtime/ready-source-watch";
import { adoptGoalMandateDraft, createGoalMandateDraft, currentGoalMandate, goalEvidenceDigest,
  previewGoalMandateDraft, proposeGoalMeasurement } from "../modules/goals/goal-mandate";
import { submitReady } from "../modules/agent-runtime/task-execution-readiness";

type Response = { status: number; body: any };
type Request = (path: string, init?: RequestInit) => Promise<Response>;

export function registerGoalMandateTests(deps: { request: Request;
  registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }>;
  runMcpBridgeSmoke: (apiKey: string, options?: any) => Promise<any> }) {
  test("Goal retirement preserves history and blocks linked agent execution", async () => {
    const first = await deps.registerOwner(`retire-goal-${randomUUID()}@example.test`, "Retirement fixture");
    const foreign = await deps.registerOwner(`foreign-retire-${randomUUID()}@example.test`, "Foreign fixture");
    const workspaceId = first.workspace.id;
    const owner = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const human = { Authorization: `Bearer ${first.token}` };
    const otherHuman = { Authorization: `Bearer ${foreign.token}` };
    const data = (response: Response) => { assert.ok(response.status >= 200 && response.status < 300,
      `${response.status} ${JSON.stringify(response.body)}`); return response.body.data; };
    const post = (path: string, body: unknown, headers: Record<string, string> = human) =>
      deps.request(path, { method: "POST", headers, body: JSON.stringify(body) });
    const proofed = async (path: string, body: unknown) => {
      const encoded = JSON.stringify(body);
      const proof = data(await post("/v1/auth/reauth", { method: "POST", path,
        bodyDigest: digest(encoded), password: "very-strong-password" })).proof;
      return deps.request(path, { method: "POST", headers: { ...human, "X-Owner-Action-Proof": proof }, body: encoded });
    };
    const project = await prisma.project.create({ data: { workspaceId, name: "Fictional retirement project" } });
    const goal = await prisma.goal.create({ data: { workspaceId, projectId: project.id, title: "Retire fictional test goal" } });
    const task = await prisma.task.create({ data: { workspaceId, projectId: project.id, goalId: goal.id,
      title: "Preserved external task", source: "clickup", externalId: "fixture-external-task" } });
    const draft = await createGoalMandateDraft(workspaceId, owner.ownerUserId, goal.id, {
      result: "One fictional result", metric: "Verified cases", unit: "cases", targetValue: 1,
      evidenceSource: "Fictional task evidence", accountableUserId: owner.ownerUserId,
      provenance: "Isolated owner fixture" });
    const adoptionPreview = await previewGoalMandateDraft(workspaceId, owner.ownerUserId, goal.id, draft.id);
    const adopted = await adoptGoalMandateDraft(workspaceId, owner.ownerUserId, goal.id, draft.id,
      adoptionPreview.previewId, null, adoptionPreview.impactDigest);
    const historical = await prisma.agentExecution.create({ data: { workspaceId, taskId: task.id,
      requestedByType: "user", requestedById: owner.ownerUserId, status: "failed", attempt: 0,
      metadata: { executionContract: { executionClass: "roost-company-information-v1" },
        readyContextPin: { preparationOnly: true, modelExecutionQualified: false } } } });
    const previewPath = `/v1/goal-mandates/goals/${goal.id}/retirement-preview`;
    const retirePath = `/v1/goal-mandates/goals/${goal.id}/actions/retire`;
    assert.equal((await deps.request(previewPath, { headers: otherHuman })).status, 404);
    assert.equal((await post(retirePath, { requestId: randomUUID(), previewToken: "invalid-token", reason: "Test withdrawal" }, otherHuman)).status, 403);
    const preview = data(await deps.request(previewPath, { headers: human }));
    assert.equal(preview.version.id, adopted.id);
    assert.deepEqual(preview.blockers, []);
    assert.equal(preview.impact.tasks.length, 1);
    assert.equal(preview.impact.executionCount, 1);
    const firstCommand = { requestId: randomUUID(), previewToken: preview.previewToken,
      reason: "This fictional test direction is withdrawn." };
    assert.equal((await post(retirePath, firstCommand)).status, 403);
    await prisma.task.update({ where: { id: task.id }, data: { title: "Changed external task" } });
    assert.equal((await proofed(retirePath, firstCommand)).status, 409);
    assert.equal((await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } })).status, "active");
    const fresh = data(await deps.request(previewPath, { headers: human }));
    const command = { requestId: randomUUID(), previewToken: fresh.previewToken,
      reason: "The test goal has no accepted business outcome." };
    const retired = data(await proofed(retirePath, command));
    assert.equal(retired.status, "archived");
    assert.equal(retired.retiredMandateVersionId, adopted.id);
    assert.equal(data(await proofed(retirePath, command)).replayed, true);
    assert.equal((await proofed(retirePath, { ...command, reason: "Different reason on reused request." })).status, 409);
    assert.equal((await prisma.goalMandateHead.findFirst({ where: { goalId: goal.id } })), null);
    assert.equal((await prisma.goalMandateVersion.findUniqueOrThrow({ where: { id: adopted.id } })).status, "retired");
    assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "todo");
    assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).externalId, "fixture-external-task");
    assert.equal((await prisma.agentExecution.findUniqueOrThrow({ where: { id: historical.id } })).mandateVersionIdAtQueue, adopted.id);
    assert.equal(data(await deps.request(`/v1/goal-mandates/goals/${goal.id}`, { headers: human })).current, null);
    assert.equal(data(await deps.request(`/v1/goal-mandates/goals/${goal.id}`, { headers: human })).versions[0].status, "retired");
    const taskContext = data(await deps.request(`/v1/company-intelligence/tasks/${task.id}/agent-context`, { headers: human }));
    assert.equal(taskContext.task.goalId, goal.id);
    assert.equal(taskContext.task.goal, null);
    assert.equal(taskContext.intent.objective, null);
    assert.equal(taskContext.goalMandate, null);
    const workItems = data(await deps.request("/v1/operations/work-items?limit=50", { headers: human })).workItems;
    assert.equal(workItems.find((item: any) => item.task.id === task.id).hierarchy.goal, null);
    const projectWorkspace = data(await deps.request(`/v1/projects/${project.id}/workspace`, { headers: human }));
    assert.equal(projectWorkspace.delivery.tasks.find((item: any) => item.id === task.id).goal, null);
    assert.equal(data(await deps.request("/v1/goals?archive=exclude", { headers: human })).some((item: any) => item.id === goal.id), false);
    assert.equal(data(await deps.request("/v1/goals?archive=only", { headers: human })).some((item: any) => item.id === goal.id), true);
    assert.equal((await deps.request(`/v1/goals/${goal.id}`, { method: "PATCH", headers: human,
      body: JSON.stringify({ status: "active" }) })).status, 409);
    await assert.rejects(prisma.goal.update({ where: { id: goal.id }, data: { status: "active" } }),
      /goal_retirement_immutable/);
    const alternate = await prisma.goal.create({ data: { workspaceId, title: "Unrelated active goal" } });
    assert.equal((await deps.request(`/v1/tasks/${task.id}`, { method: "PATCH", headers: human,
      body: JSON.stringify({ goalId: alternate.id }) })).status, 409);
    assert.equal((await deps.request(`/v1/operations/work-items/${task.id}`, { method: "PATCH", headers: human,
      body: JSON.stringify({ goalId: alternate.id }) })).status, 409);
    await assert.rejects(prisma.task.update({ where: { id: task.id }, data: { goalId: null } }),
      /goal_retirement_task_link_immutable/);
    await assert.rejects(prisma.task.create({ data: { workspaceId, goalId: goal.id,
      title: "New task must not inherit retired goal" } }), /goal_retired/);
    assert.equal((await post("/v1/tasks", { goalId: goal.id, title: "Rejected new Task" })).status, 409);
    assert.equal((await post("/v1/operations/work-items", { goalId: goal.id,
      title: "Rejected new Operations work item" })).status, 409);
    assert.equal(await prisma.$transaction(tx => currentGoalMandate(tx, workspaceId, goal.id)), null);
    assert.equal((await prisma.$transaction(tx => submitReady(tx, workspaceId, task.id, {},
      { requestedByType: "user", requestedById: owner.ownerUserId })) as any).error, "goal_retired");
    await assert.rejects(prisma.agentExecution.create({ data: { workspaceId, taskId: task.id,
      requestedByType: "user", requestedById: owner.ownerUserId, status: "failed", attempt: 0,
      metadata: { executionContract: { executionClass: "roost-company-information-v1" },
        readyContextPin: { preparationOnly: true, modelExecutionQualified: false } } } }), /goal_retired/);
    await assert.rejects(prisma.task.update({ where: { id: task.id }, data: {
      executionReadiness: { status: "ready" } } }), /goal_retired/);
    const events = await prisma.event.findMany({ where: { workspaceId, resourceType: "Goal", resourceId: goal.id,
      type: "goal_retired" } });
    assert.equal(events.length, 1);
    assert.equal(await prisma.auditLog.count({ where: { workspaceId, action: "goal.retire", resourceId: goal.id } }), 1);
  });

  test("G20 owner goal adoption, verified progress and task-bound agent proposal", async () => {
    const { request, registerOwner } = deps;
    const first = await registerOwner(`goal-${randomUUID()}@example.test`, "Goal fixture");
    const second = await registerOwner(`other-goal-${randomUUID()}@example.test`, "Other goal fixture");
    const workspaceId = first.workspace.id;
    const owner = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const human = { Authorization: `Bearer ${first.token}` };
    const otherHuman = { Authorization: `Bearer ${second.token}` };
    const post = (path: string, body: unknown, headers: Record<string, string> = human) =>
      request(path, { method: "POST", headers, body: JSON.stringify(body) });
    const data = (response: Response) => { assert.ok(response.status >= 200 && response.status < 300,
      `${response.status} ${JSON.stringify(response.body)}`); return response.body.data; };
    const proofedPost = async (path: string, body: unknown) => {
      const encoded = JSON.stringify(body);
      const proof = data(await post("/v1/auth/reauth", { method: "POST", path,
        bodyDigest: digest(encoded), password: "very-strong-password" })).proof;
      return request(path, { method: "POST", headers: { ...human, "X-Owner-Action-Proof": proof }, body: encoded });
    };
    const goal = data(await post("/v1/goals", { title: "Deliver durable fictional service value",
      description: "Isolated fixture only", priority: "normal", status: "active" }));
    const goalId = goal.id as string;
    const metric = data(await post("/v1/company-objects/metric", { name: `Fixture resolution ${randomUUID()}`,
      category: "quality", measurementType: "count", unit: "cases", currentValue: 9, targetValue: 12 }));
    const target = data(await post("/v1/targets", { goalId, metricId: metric.id, title: "Legacy fixture target",
      metric: "legacy count", targetValue: 12, currentValue: 9 }));
    const worker = await prisma.workforceEntity.create({ data: { workspaceId, name: "Goal fixture worker",
      slug: `goal-${randomUUID()}`, type: "agent", source: "system", status: "active" } });
    const otherWorker = await prisma.workforceEntity.create({ data: { workspaceId, name: "Other fixture worker",
      slug: `other-goal-${randomUUID()}`, type: "agent", source: "system", status: "active" } });
    const task = await prisma.task.create({ data: { workspaceId, goalId, title: "Measure verified fictional result",
      assignedWorkforceEntityId: worker.id } });
    const key = `cc_v1_${randomUUID()}`;
    await prisma.apiKey.create({ data: { workspaceId, boundAgentId: worker.id, name: "Goal fixture credential",
      keyHash: hashApiKey(key), keyPrefix: key.slice(0, 10), active: true,
      expiresAt: new Date(Date.now() + 3600000), scopes: agentPrincipalScopes } });
    const otherKey = `cc_v1_${randomUUID()}`;
    await prisma.apiKey.create({ data: { workspaceId, boundAgentId: otherWorker.id, name: "Other goal credential",
      keyHash: hashApiKey(otherKey), keyPrefix: otherKey.slice(0, 10), active: true,
      expiresAt: new Date(Date.now() + 3600000), scopes: agentPrincipalScopes } });
    const agent = { "X-API-Key": key }, unrelatedAgent = { "X-API-Key": otherKey };
    const root = `/v1/goal-mandates/goals/${goalId}`;
    assert.equal(data(await request(root, { headers: human })).current, null);
    assert.equal((await request(root, { headers: agent })).status, 403);
    assert.equal((await request(root, { headers: otherHuman })).status, 404);
    const draft = data(await post(`${root}/drafts`, { result: "Twelve verified fictional resolutions",
      metric: "Verified resolutions", unit: "cases", targetValue: 12,
      evidenceSource: "Verified task or goal evidence in this fixture", accountableUserId: owner.ownerUserId,
      bindingDeadline: null, forecastDate: null, executionSchedule: null, provenance: "Isolated owner fixture" }));
    assert.equal(draft.status, "draft");
    assert.equal(data(await request(`/v1/goal-mandates/tasks/${task.id}`, { headers: agent })).current, null);
    const preview = data(await post(`${root}/drafts/${draft.id}/preview`, {}));
    assert.equal(preview.counts.tasks, 1);
    assert.equal(preview.counts.targets, 1);
    const adoptPath = `${root}/drafts/${draft.id}/adopt`;
    const adoption = { previewId: preview.previewId, expectedCurrentId: null, impactDigest: preview.impactDigest };
    assert.equal((await post(adoptPath, adoption)).status, 403);
    assert.equal((await proofedPost(adoptPath, { ...adoption, previewId: randomUUID() })).status, 409);
    const adopted = data(await proofedPost(adoptPath, adoption));
    assert.equal(adopted.version, 1);
    assert.equal((await proofedPost(adoptPath, adoption)).status, 409);
    assert.equal(data(await request(root, { headers: human })).current.id, adopted.id);
    const initialEconomics = data(await request(root, { headers: human })).economics;
    assert.equal(initialEconomics.observedModelCost, null);
    assert.equal(initialEconomics.observedExecutionElapsedMs, null);
    assert.equal(data(await request(`/v1/goal-mandates/tasks/${task.id}`, { headers: agent })).current.id, adopted.id);
    assert.equal((await request(`/v1/goal-mandates/tasks/${task.id}`, { headers: unrelatedAgent })).status, 404);
    const taskPacket = await prepareExecutionPacket({ id: randomUUID(), workspaceId, taskId: task.id,
      applicationId: null, metadata: { executionContract: { context: { company: [], product: [], technical: [] } } } } as any,
      await prisma.task.findUniqueOrThrow({ where: { id: task.id } }));
    assert.equal(taskPacket.goalMandate?.id, adopted.id);
    await prisma.$transaction(async db => {
      const watched = watchReadySources(db);
      assert.equal((await currentGoalMandate(watched.db, workspaceId, goalId))?.id, adopted.id);
      await watched.persist(task.id);
    });
    const watches = await prisma.$queryRaw<Array<{ source_table: string }>>`SELECT source_table FROM task_ready_source_watches WHERE task_id=${task.id}::uuid`;
    for (const source of ["goal_mandate_heads", "goal_mandate_versions", "workspace_memberships"])
      assert.ok(watches.some(row => row.source_table === source), `missing Ready watch: ${source}`);
    const attributed = await prisma.agentExecution.create({ data: { workspaceId, taskId: task.id,
      applicationId: null, requestedByType: "user", requestedById: owner.ownerUserId,
      status: "failed", attempt: 0,
      metadata: { executionContract: { executionClass: "roost-company-information-v1" },
        readyContextPin: { preparationOnly: true, modelExecutionQualified: false } } } });
    assert.equal(attributed.goalIdAtQueue, goalId);
    assert.equal(attributed.mandateVersionIdAtQueue, adopted.id);
    const attributedEconomics = data(await request(root, { headers: human })).economics;
    assert.equal(attributedEconomics.attemptCount, 1);
    assert.equal(attributedEconomics.observedExecutionElapsedMs, null);
    assert.equal(attributedEconomics.elapsedUnknownCount, 1);
    assert.equal(attributedEconomics.observedModelCost, null);
    assert.equal((await request(`/v1/goals/${goalId}`, { method: "PATCH", headers: human,
      body: JSON.stringify({ title: "Bypass" }) })).status, 409);
    assert.equal((await request(`/v1/goals/${goalId}`, { method: "DELETE", headers: human })).status, 409);
    assert.equal((await request(`/v1/targets/${target.id}`, { method: "PATCH", headers: human,
      body: JSON.stringify({ currentValue: 12 }) })).status, 409);
    assert.equal((await request(`/v1/company-objects/metric/${metric.id}`, { method: "PATCH", headers: human,
      body: JSON.stringify({ currentValue: 12 }) })).status, 409);
    const goalEvidence = await prisma.evidenceRecord.create({ data: { workspaceId, entityType: "goal", entityId: goalId,
      type: "metric", source: "human", reference: "Isolated verified count", description: "Fictional evidence",
      verificationStatus: "verified", verifiedAt: new Date(), observedAt: new Date(Date.now() - 1000) } });
    const measured = data(await post(`${root}/measurements`, { versionId: adopted.id, evidenceId: goalEvidence.id,
      value: 7, note: "Seven verified fictional cases", observedAt: new Date().toISOString() }));
    assert.equal(measured.status, "accepted");
    assert.equal(data(await request(root, { headers: human })).progress.value, 7);
    await prisma.evidenceRecord.update({ where: { id: goalEvidence.id }, data: { description: "Changed source" } });
    const stale = data(await request(root, { headers: human }));
    assert.equal(stale.progress, null);
    assert.equal(stale.progressStatus, "stale_evidence");
    const taskEvidence = await prisma.evidenceRecord.create({ data: { workspaceId, entityType: "task", entityId: task.id,
      type: "metric", source: "human", reference: "Independent task count", verificationStatus: "verified",
      verifiedAt: new Date(), observedAt: new Date(Date.now() - 1000) } });
    const proposePath = `/v1/goal-mandates/tasks/${task.id}/measurements`;
    assert.equal((await post(proposePath, { versionId: adopted.id, evidenceId: taskEvidence.id, value: 8,
      note: "Eight fictional cases", observedAt: new Date().toISOString() }, unrelatedAgent)).status, 404);
    const proposed = data(await post(proposePath, { versionId: adopted.id, evidenceId: taskEvidence.id, value: 8,
      note: "Eight fictional cases", observedAt: new Date().toISOString() }, agent));
    assert.equal(proposed.status, "proposed");
    assert.equal(data(await request(root, { headers: human })).progress, null);
    const accepted = data(await post(`${root}/measurements/${proposed.id}/actions`, { decision: "accept" }));
    assert.equal(accepted.status, "accepted");
    assert.equal(data(await request(root, { headers: human })).progress.value, 8);
    await prisma.goalMeasurement.createMany({ data: Array.from({ length: 101 }, (_, index) => ({
      workspaceId, goalId, versionId: adopted.id, evidenceId: taskEvidence.id,
      evidenceDigest: goalEvidenceDigest(taskEvidence), evidenceRevision: taskEvidence.updatedAt,
      taskId: task.id, value: 9, note: `Later pending fixture ${index}`,
      observedAt: new Date(Date.now() + index + 1000), proposedByType: "agent" as const,
      proposedById: worker.id, status: "proposed" })) });
    const crowded = data(await request(root, { headers: human }));
    assert.equal(crowded.progress.value, 8);
    assert.ok(crowded.measurementRowsOmittedCount > 0);
    let competingProposal: Promise<Response> | undefined;
    await prisma.$transaction(async db => {
      await db.$queryRaw`SELECT id FROM tasks WHERE id=${task.id}::uuid FOR UPDATE`;
      competingProposal = post(proposePath, { versionId: adopted.id, evidenceId: taskEvidence.id,
        value: 9, note: "Concurrent former assignee", observedAt: new Date().toISOString() }, agent);
      await new Promise(resolve => setTimeout(resolve, 250));
      await db.task.update({ where: { id: task.id }, data: { assignedWorkforceEntityId: otherWorker.id } });
    });
    assert.equal((await competingProposal!).status, 409);
    assert.equal((await post(proposePath, { versionId: adopted.id, evidenceId: taskEvidence.id, value: 9,
      note: "Now outside mandate", observedAt: new Date().toISOString() }, agent)).status, 404);
    const manifest = data(await request("/v1/mcp/manifest", { headers: agent }));
    const readTool = manifest.tools?.find((tool: any) => tool.path === "/v1/goal-mandates/tasks/:taskId");
    assert.ok(readTool);
    assert.ok(manifest.tools?.some((tool: any) => tool.path === "/v1/goal-mandates/tasks/:taskId/measurements"));
    await deps.runMcpBridgeSmoke(key, { toolName: readTool.name,
      arguments: { taskId: task.id }, expectError: true, expectedStatus: 404 });
    await assert.rejects(() => prisma.goal.update({ where: { id: goalId }, data: { title: "Database bypass" } }));
    await assert.rejects(() => prisma.target.update({ where: { id: target.id }, data: { currentValue: 12 } }));
    await prisma.task.update({ where: { id: task.id }, data: { goalId: null } });
    const keptAttribution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: attributed.id } });
    assert.equal(keptAttribution.goalIdAtQueue, goalId);
    assert.equal(keptAttribution.mandateVersionIdAtQueue, adopted.id);
    const afterRelink = data(await request(root, { headers: human }));
    assert.equal(afterRelink.progress, null);
    assert.equal(afterRelink.progressStatus, "stale_evidence");
    const foreignEvidence = await prisma.evidenceRecord.create({ data: { workspaceId: second.workspace.id,
      entityType: "goal", entityId: goalId, type: "metric", reference: "Foreign fixture", verificationStatus: "verified" } });
    await assert.rejects(() => prisma.goalMeasurement.create({ data: { workspaceId, goalId, versionId: adopted.id,
      evidenceId: foreignEvidence.id, evidenceDigest: "0".repeat(64), evidenceRevision: foreignEvidence.updatedAt,
      value: 9, note: "Cross workspace", observedAt: new Date(), proposedByType: "user", proposedById: owner.ownerUserId,
      status: "accepted", decidedByUserId: owner.ownerUserId, decidedAt: new Date() } }));
    const accountable = await prisma.user.create({ data: { email: `accountable-${randomUUID()}@example.test`,
      passwordHash: "synthetic-not-a-login" } });
    let accountability = await prisma.workspaceMembership.create({ data: { workspaceId,
      userId: accountable.id, role: "member" } });
    const revisedDraft = data(await post(`${root}/drafts`, { result: "Fifteen verified fictional resolutions",
      metric: "Verified resolutions", unit: "cases", targetValue: 15,
      evidenceSource: "Verified goal evidence", accountableUserId: accountable.id,
      bindingDeadline: null, forecastDate: null, executionSchedule: null, provenance: "Revised fixture" }));
    const revisedPreview = data(await post(`${root}/drafts/${revisedDraft.id}/preview`, {}));
    assert.equal(revisedPreview.expectedCurrentId, adopted.id);
    await prisma.workspaceMembership.delete({ where: { id: accountability.id } });
    assert.equal((await proofedPost(`${root}/drafts/${revisedDraft.id}/adopt`, {
      previewId: revisedPreview.previewId, expectedCurrentId: adopted.id,
      impactDigest: revisedPreview.impactDigest })).status, 409);
    accountability = await prisma.workspaceMembership.create({ data: { workspaceId,
      userId: accountable.id, role: "member" } });
    const currentPreview = data(await post(`${root}/drafts/${revisedDraft.id}/preview`, {}));
    const revised = data(await proofedPost(`${root}/drafts/${revisedDraft.id}/adopt`, {
      previewId: currentPreview.previewId, expectedCurrentId: adopted.id,
      impactDigest: currentPreview.impactDigest }));
    assert.equal(revised.version, 2);
    const revisedView = data(await request(root, { headers: human }));
    assert.equal(revisedView.current.id, revised.id);
    assert.equal(revisedView.versions.find((item: any) => item.id === adopted.id).status, "superseded");
    assert.equal(revisedView.progress, null);
    assert.equal(revisedView.progressStatus, "unknown");
    await prisma.workspaceMembership.delete({ where: { id: accountability.id } });
    assert.equal(data(await request(root, { headers: human })).accountableCurrent, false);
    await prisma.task.update({ where: { id: task.id }, data: { goalId } });
    assert.equal(data(await request(`/v1/goal-mandates/tasks/${task.id}`, { headers: unrelatedAgent })).current, null);
  });

  test("G20 legacy null-workspace targets and accepted measurement sources stay guarded", async () => {
    const first = await deps.registerOwner(`cascade-goal-${randomUUID()}@example.test`, "Cascade fixture");
    const workspaceId = first.workspace.id;
    const owner = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const goal = await prisma.goal.create({ data: { workspaceId, title: "Isolated cascade goal" } });
    const metric = await prisma.metric.create({ data: { workspaceId, name: "Isolated cascade metric",
      category: "quality", measurementType: "count" } });
    const target = await prisma.target.create({ data: { workspaceId, goalId: goal.id,
      metricId: metric.id, title: "Legacy fixture target" } });
    const legacyNullWorkspaceTarget = await prisma.target.create({ data: { goalId: goal.id,
      title: "Legacy target without workspace" } });
    const task = await prisma.task.create({ data: { workspaceId, goalId: goal.id, targetId: target.id,
      title: "Isolated cascade task" } });
    const draft = await createGoalMandateDraft(workspaceId, owner.ownerUserId, goal.id, {
      result: "One verified fictional result", metric: "Verified result", unit: "cases", targetValue: 1,
      evidenceSource: "Exact task evidence", accountableUserId: owner.ownerUserId,
      provenance: "Isolated cascade fixture" });
    const preview = await previewGoalMandateDraft(workspaceId, owner.ownerUserId, goal.id, draft.id);
    const adopted = await adoptGoalMandateDraft(workspaceId, owner.ownerUserId, goal.id, draft.id,
      preview.previewId, null, preview.impactDigest);
    await assert.rejects(prisma.target.update({ where: { id: legacyNullWorkspaceTarget.id },
      data: { title: "Must not change adopted goal target" } }), /goal_target_change_requires_adoption/);
    await assert.rejects(prisma.target.delete({ where: { id: legacyNullWorkspaceTarget.id } }),
      /goal_target_change_requires_adoption/);
    const evidence = await prisma.evidenceRecord.create({ data: { workspaceId, entityType: "task",
      entityId: task.id, type: "metric", source: "human", reference: "Isolated result",
      verificationStatus: "verified", verifiedAt: new Date() } });
    await proposeGoalMeasurement(workspaceId, { type: "user", id: owner.ownerUserId }, goal.id,
      adopted.id, evidence.id, task.id, 1, "One fictional result", new Date());
    await assert.rejects(prisma.evidenceRecord.delete({ where: { id: evidence.id } }));
    await assert.rejects(prisma.task.delete({ where: { id: task.id } }));
    assert.equal(await prisma.goalMandateVersion.count({ where: { workspaceId } }), 1);
    assert.equal(await prisma.goalMeasurement.count({ where: { workspaceId } }), 1);
  });
}
