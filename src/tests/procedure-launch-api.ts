import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";

type Harness = {
  request: (path: string, init?: RequestInit) => Promise<{ status: number; body: unknown }>;
  registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }>;
};

export function registerProcedureLaunchApiTests({ request, registerOwner }: Harness) {
  test("RF-CTX-029 native procedure launch is scoped, atomic, idempotent and traceable", async () => {
    const owner = await registerOwner(`procedure-launch-${randomUUID()}@example.test`, "Procedure launch fixture");
    const foreign = await registerOwner(`procedure-foreign-${randomUUID()}@example.test`, "Foreign launch fixture");
    const workspaceId = owner.workspace.id;
    const headers = { Authorization: `Bearer ${owner.token}` };
    const foreignHeaders = { Authorization: `Bearer ${foreign.token}` };
    const member = await prisma.workspaceMembership.findFirstOrThrow({ where: { workspaceId, role: "owner" } });
    const escalation = await prisma.companyRole.create({ data: { workspaceId, name: `Escalation ${randomUUID()}`, type: "human" } });
    const role = await prisma.companyRole.create({ data: { workspaceId, name: `Responsible ${randomUUID()}`, type: "human", escalationTargetId: escalation.id } });
    const project = await prisma.project.create({ data: { workspaceId, name: `Exact scope ${randomUUID()}`, status: "active" } });
    const procedure = await prisma.procedure.create({ data: { workspaceId, name: `Native manual ${randomUUID()}`,
      purpose: "Prepare a fictional scoped result", scope: "One selected project", expectedResult: "Reviewed project packet",
      status: "active", ownerRoleId: role.id, requiredTools: ["companycore"], steps: { create: [
        { stepOrder: 1, instruction: "Collect the input", stepType: "manual", expectedInput: { brief: "Owner supplied brief", context: "Business context" },
          expectedOutput: { packet: "Prepared packet" }, validationRule: { success: "Packet exists", maxAttempts: 2 }, rollbackInstruction: "Escalate to responsible role" },
        { stepOrder: 2, instruction: "Review the packet", stepType: "human_review", expectedOutput: { review: "Recorded review" },
          validationRule: { success: "Review recorded", maxAttempts: 1 }, rollbackInstruction: "Return for correction" }
      ] } } });
    await prisma.organizationalScope.create({ data: { workspaceId, entityType: "procedure", entityId: procedure.id, scopeType: "company" } });
    await prisma.auditLog.create({ data: { workspaceId, actorType: "user", actorId: member.userId,
      action: "procedure.create_draft", resourceType: "Procedure", resourceId: procedure.id,
      correlationId: randomUUID(), inputPayload: { name: procedure.name } } });
    const base = `/v1/process-core/procedures/${procedure.id}`;
    const input = { projectId: project.id, inputs: { context: "Fictional context", brief: "Synthetic brief" } };
    const preview = () => request(`${base}/launch-preview`, { method: "POST", headers, body: JSON.stringify(input) });
    assert.equal((await request(`${base}/launch-preview`, { method: "POST", body: JSON.stringify(input) })).status, 401);
    assert.equal((await request(`${base}/launch-preview`, { method: "POST", headers: foreignHeaders, body: JSON.stringify(input) })).status, 404);
    await prisma.workspaceMembership.update({ where: { id: member.id }, data: { role: "admin" } });
    assert.equal((await preview()).status, 403);
    await prisma.workspaceMembership.update({ where: { id: member.id }, data: { role: "owner" } });
    const otherProject = await prisma.project.create({ data: { workspaceId, name: `Other scope ${randomUUID()}`, status: "active" } });
    await prisma.organizationalScope.updateMany({ where: { workspaceId, entityType: "procedure", entityId: procedure.id },
      data: { scopeType: "project", scopeEntityId: otherProject.id } });
    const outOfScope = await preview();
    assert.ok(((outOfScope.body as any).data.blockers as string[]).includes("procedure_scope_mismatch"));
    assert.equal((outOfScope.body as any).data.previewToken, null, "blocked preview has no launch authority");
    const department = await prisma.workspaceDepartment.create({ data: { workspaceId,
      key: `test-${randomUUID()}`, name: "Related department" } });
    await prisma.organizationalDepartmentRelation.create({ data: { workspaceId, entityType: "project",
      entityId: project.id, departmentId: department.id, relationshipRole: "related" } });
    await prisma.organizationalScope.updateMany({ where: { workspaceId, entityType: "procedure", entityId: procedure.id },
      data: { scopeType: "department", scopeEntityId: department.key } });
    assert.ok((((await preview()).body as any).data.blockers as string[]).includes("procedure_scope_mismatch"),
      "a merely related department does not establish applicability");
    await prisma.organizationalDepartmentRelation.create({ data: { workspaceId, entityType: "project",
      entityId: project.id, departmentId: department.id, relationshipRole: "applicable" } });
    assert.deepEqual(((await preview()).body as any).data.blockers, [], "applicable department allows launch");
    await prisma.organizationalScope.updateMany({ where: { workspaceId, entityType: "procedure", entityId: procedure.id },
      data: { scopeType: "company", scopeEntityId: null } });
    const firstResponse = await preview();
    assert.equal(firstResponse.status, 200, JSON.stringify(firstResponse.body));
    const first = (firstResponse.body as any).data;
    assert.deepEqual(first.blockers, []);
    assert.equal(first.effects.roostNativeTasks, 2);
    assert.equal(first.effects.externalWrites, 0);
    assert.equal(first.ownerRole.name, role.name);
    assert.equal(first.project.id, project.id);
    assert.equal(first.steps[0].expectedInput.brief, "Owner supplied brief");
    const command = (view: any, requestId = randomUUID()) => request(`${base}/actions/launch`, { method: "POST", headers,
      body: JSON.stringify({ ...input, requestId, previewToken: view.previewToken }) });
    await prisma.procedure.update({ where: { id: procedure.id }, data: { expectedResult: "Revised fictional packet" } });
    assert.equal((await command(first)).status, 409, "changed source makes preview stale");
    assert.equal(await prisma.procedureRun.count({ where: { workspaceId, procedureId: procedure.id } }), 0);
    const currentResponse = await preview();
    assert.equal(currentResponse.status, 200);
    const current = (currentResponse.body as any).data;
    const requestId = randomUUID();
    const created = await command(current, requestId);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const run = (created.body as any).data.run;
    assert.equal(run.procedureVersion, procedure.version);
    assert.equal(run.projectId, project.id);
    assert.equal(run.status, "tasks_open");
    assert.equal(run.steps.length, 2);
    const reorderedReplay = await request(`${base}/actions/launch`, { method: "POST", headers,
      body: JSON.stringify({ projectId: project.id, inputs: { brief: "Synthetic brief", context: "Fictional context" }, requestId, previewToken: current.previewToken }) });
    assert.equal(reorderedReplay.status, 200, "same request replays despite jsonb key order");
    assert.equal((await command(current)).status, 409, "new request cannot duplicate a scope");
    assert.ok(((await preview()).body as any).data.blockers.includes("already_launched_for_scope"));
    assert.equal(await prisma.procedureRun.count({ where: { workspaceId, procedureId: procedure.id } }), 1);
    assert.equal(await prisma.procedureRunStep.count({ where: { runId: run.id } }), 2);
    const tasks = await prisma.task.findMany({ where: { id: { in: run.steps.map((step: any) => step.task.id) } } });
    assert.equal(tasks.length, 2);
    for (const task of tasks) {
      assert.equal(task.workspaceId, workspaceId);
      assert.equal(task.projectId, project.id);
      assert.equal(task.ownerUserId, member.userId);
      assert.equal(task.source, "companycore");
      assert.equal(task.externalId, null);
      assert.equal(task.taskListId, null);
      assert.equal((task.executionReadiness as any).status, "draft");
      assert.doesNotMatch(task.description || "", /Fictional context|Synthetic brief/,
        "workspace-readable Task descriptions must not expose owner-only input values");
      if (task.title.includes("Collect the input")) assert.match(task.description || "", /Step input fields: brief, context/);
    }
    assert.equal(await prisma.auditLog.count({ where: { workspaceId, action: "procedure.launch", resourceId: run.id } }), 1);
    assert.equal(await prisma.event.count({ where: { workspaceId, type: "procedure_launched", resourceId: run.id } }), 1);
    assert.equal((await request(`/v1/process-core/procedure-runs/${run.id}`, { headers: foreignHeaders })).status, 404);
    await prisma.task.update({ where: { id: tasks[0].id }, data: { status: "blocked" } });
    assert.equal(((await request(`/v1/process-core/procedure-runs/${run.id}`, { headers })).body as any).data.status, "exception");
    await prisma.task.updateMany({ where: { id: { in: tasks.map(task => task.id) } }, data: { status: "done" } });
    const done = (await request(`/v1/process-core/procedure-runs/${run.id}`, { headers })).body as any;
    assert.equal(done.data.status, "tasks_done_evidence_pending", "Task done does not prove output");
    assert.deepEqual(done.data.steps[0].outputEvidence, []);
    const outcomePath = (stepId: string) => `/v1/process-core/procedure-runs/${run.id}/steps/${stepId}/outcomes`;
    const firstOutcomeRequestId = randomUUID();
    const outcomeBody = { requestId: firstOutcomeRequestId, decision: "accept", evidence: { summary: "Owner checked the fictional packet", references: ["fixture://packet"] } };
    assert.equal((await request(outcomePath(run.steps[0].id), { method: "POST", headers: foreignHeaders, body: JSON.stringify(outcomeBody) })).status, 404);
    const firstOutcome = await request(outcomePath(run.steps[0].id), { method: "POST", headers, body: JSON.stringify(outcomeBody) });
    assert.equal(firstOutcome.status, 201, JSON.stringify(firstOutcome.body));
    assert.equal((await request(outcomePath(run.steps[0].id), { method: "POST", headers, body: JSON.stringify(outcomeBody) })).status, 200);
    const parallelBody = { requestId: randomUUID(), decision: "accept", evidence: { summary: "Concurrent owner review was recorded", references: [] } };
    const parallel = await Promise.all([request(outcomePath(run.steps[0].id), { method: "POST", headers, body: JSON.stringify(parallelBody) }),
      request(outcomePath(run.steps[0].id), { method: "POST", headers, body: JSON.stringify(parallelBody) })]);
    assert.deepEqual(parallel.map(response => response.status).sort(), [200, 201], "simultaneous identical decisions replay the winner");
    assert.equal(await prisma.procedureRunStepOutcome.count({ where: { workspaceId, requestId: parallelBody.requestId } }), 1);
    assert.equal((await request(outcomePath(run.steps[1].id), { method: "POST", headers, body: JSON.stringify(outcomeBody) })).status, 409);
    const secondOutcome = await request(outcomePath(run.steps[1].id), { method: "POST", headers,
      body: JSON.stringify({ requestId: randomUUID(), decision: "accept", evidence: { summary: "Owner accepted the separate review", references: [] } }) });
    assert.equal(secondOutcome.status, 201, JSON.stringify(secondOutcome.body));
    const accepted = (await request(`/v1/process-core/procedure-runs/${run.id}`, { headers })).body as any;
    assert.equal(accepted.data.status, "owner_accepted");
    assert.equal(accepted.data.steps[0].outputEvidence[0].evidence.summary, "Concurrent owner review was recorded");
    assert.ok(accepted.data.steps[0].outcomeHistory.some((item: any) => item.evidence.summary === "Owner checked the fictional packet"));
    const exception = await request(outcomePath(run.steps[0].id), { method: "POST", headers,
      body: JSON.stringify({ requestId: randomUUID(), decision: "exception", evidence: { summary: "Fictional packet needs another review", references: [] }, reason: "The reviewed packet was superseded" }) });
    assert.equal(exception.status, 201, JSON.stringify(exception.body));
    assert.equal(((await request(`/v1/process-core/procedure-runs/${run.id}`, { headers })).body as any).data.status, "exception");
    await prisma.procedure.update({ where: { id: procedure.id }, data: { status: "retired" } });
    const successor = await prisma.procedure.create({ data: { workspaceId, familyId: procedure.familyId,
      name: procedure.name, version: 2, purpose: procedure.purpose, scope: procedure.scope,
      expectedResult: procedure.expectedResult, ownerRoleId: role.id, status: "active",
      steps: { create: { stepOrder: 1, instruction: "Review successor packet", stepType: "manual",
        expectedOutput: { packet: "Reviewed" }, validationRule: { success: "Reviewed", maxAttempts: 1 },
        rollbackInstruction: "Return to owner" } } } });
    await prisma.organizationalScope.create({ data: { workspaceId, entityType: "procedure", entityId: successor.id, scopeType: "company" } });
    await prisma.auditLog.create({ data: { workspaceId, actorType: "user", actorId: member.userId,
      action: "procedure.propose_revision", resourceType: "Procedure", resourceId: successor.id,
      correlationId: randomUUID(), inputPayload: { sourceProcedureId: procedure.id } } });
    const successorPreview = await request(`/v1/process-core/procedures/${successor.id}/launch-preview`, { method: "POST", headers,
      body: JSON.stringify({ projectId: project.id, inputs: {} }) });
    assert.ok(((successorPreview.body as any).data.blockers as string[]).includes("already_launched_for_scope"),
      "a new version cannot duplicate its family's run in the same scope");
    const pinned = (await request(`${base}/runs`, { headers })).body as any;
    assert.equal(pinned.data[0].procedureVersion, procedure.version);
    assert.equal(pinned.data[0].steps.length, 2);
  });
}
