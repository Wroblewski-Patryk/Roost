import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";

type Harness = {
  request: (path: string, init?: RequestInit) => Promise<{ status: number; body: unknown }>;
  registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }>;
};

export function registerProcedureLaunchApiTests({ request, registerOwner }: Harness) {
  test("RF-CTX-029 owner can review an exact project draft with a terminal owner decision", async () => {
    const owner = await registerOwner(`procedure-editor-${randomUUID()}@example.test`, "Procedure editor fixture");
    const foreign = await registerOwner(`procedure-editor-foreign-${randomUUID()}@example.test`, "Foreign editor fixture");
    const workspaceId = owner.workspace.id;
    const headers = { Authorization: `Bearer ${owner.token}` };
    const foreignHeaders = { Authorization: `Bearer ${foreign.token}` };
    const member = await prisma.workspaceMembership.findFirstOrThrow({ where: { workspaceId, role: "owner" } });
    const terminal = await prisma.companyRole.create({ data: { workspaceId, name: `Final owner ${randomUUID()}`, type: "human",
      permissions: ["workspace:admin", "approval:decide"] } });
    const ordinary = await prisma.companyRole.create({ data: { workspaceId, name: `Ordinary human ${randomUUID()}`, type: "human" } });
    const agent = await prisma.companyRole.create({ data: { workspaceId, name: `Agent owner claim ${randomUUID()}`, type: "agent",
      permissions: ["workspace:admin", "approval:decide"] } });
    const project = await prisma.project.create({ data: { workspaceId, name: `Fictional application ${randomUUID()}`, status: "active" } });
    const foreignProject = await prisma.project.create({ data: { workspaceId: foreign.workspace.id, name: "Foreign application", status: "active" } });
    const definition = (roleId: string, projectId: string) => ({ name: `Human review ${randomUUID()}`, purpose: "Inspect one fictional application",
      scope: "One exact fictional project", expectedResult: "Owner-reviewed finding", ownerRoleId: roleId,
      organizationalContext: { ownerDepartmentKey: "04-operacje", relatedDepartmentKeys: [], applicableDepartmentKeys: [],
        scopes: [{ type: "project", entityId: projectId }] }, steps: [
        { instruction: "Review the fictional baseline", stepType: "manual", expectedInput: { brief: {} },
          expectedOutput: { description: "Recorded finding" }, validationRule: { success: "Evidence is attached", maxAttempts: 1 },
          rollbackInstruction: "Stop and ask the owner for a decision" },
        { instruction: "Record the owner decision", stepType: "manual", expectedOutput: { description: "Owner decision note" },
          validationRule: { success: "A decision is recorded", maxAttempts: 1 }, rollbackInstruction: "Stop without approval" }
      ] });
    const path = "/v1/process-core/procedures";
    assert.equal((await request(path, { method: "POST", headers, body: JSON.stringify(definition(terminal.id, foreignProject.id)) })).status, 404,
      "a foreign project cannot become procedure applicability");
    const created = await request(path, { method: "POST", headers, body: JSON.stringify(definition(terminal.id, project.id)) });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const draft = (created.body as any).data;
    assert.deepEqual(draft.organizationalContext.scopes.map((scope: any) => [scope.type, scope.entityId]), [["project", project.id]]);
    assert.equal(draft.ownerRoleId, terminal.id);
    const detail = `/v1/process-core/procedures/${draft.id}`;
    const preview = () => request(`${detail}/launch-preview`, { method: "POST", headers,
      body: JSON.stringify({ projectId: project.id, inputs: { brief: "Fictional source" } }) });
    const before = (await preview()).body as any;
    assert.ok(before.data.blockers.includes("procedure_not_active"));
    assert.ok(!before.data.blockers.includes("escalation_role_missing"));
    assert.equal(before.data.ownerRole.terminalOwnerDecision, true);
    assert.equal(before.data.previewToken, null);
    assert.equal((await request(`/v1/organizational-context/procedure/${draft.id}`, { method: "PATCH", headers,
      body: JSON.stringify({ scopes: [{ type: "company" }] }) })).status, 409, "active scope changes require the versioned procedure route");
    assert.equal((await request(`${detail}/actions/activate`, { method: "POST", headers, body: "{}" })).status, 409);
    assert.equal((await request(`${detail}/actions/activate`, { method: "POST", headers,
      body: JSON.stringify({ expectedVersion: draft.version, expectedUpdatedAt: new Date(0).toISOString() }) })).status, 409);
    await prisma.workspaceMembership.update({ where: { id: member.id }, data: { role: "admin" } });
    assert.equal((await request(`${detail}/actions/activate`, { method: "POST", headers,
      body: JSON.stringify({ expectedVersion: draft.version, expectedUpdatedAt: draft.updatedAt }) })).status, 403);
    await prisma.workspaceMembership.update({ where: { id: member.id }, data: { role: "owner" } });
    assert.equal((await request(`${detail}/actions/activate`, { method: "POST", headers: foreignHeaders,
      body: JSON.stringify({ expectedVersion: draft.version, expectedUpdatedAt: draft.updatedAt }) })).status, 404);
    const activated = await request(`${detail}/actions/activate`, { method: "POST", headers,
      body: JSON.stringify({ expectedVersion: draft.version, expectedUpdatedAt: draft.updatedAt }) });
    assert.equal(activated.status, 200, JSON.stringify(activated.body));
    const ready = (await preview()).body as any;
    assert.deepEqual(ready.data.blockers, []);
    assert.equal(ready.data.ownerRole.terminalOwnerDecision, true);
    assert.equal(ready.data.effects.roostNativeTasks, 2);
    assert.equal(ready.data.effects.externalWrites, 0);
    assert.equal(ready.data.steps[0].taskTitle, `${draft.name} · 1. Review the fictional baseline`);
    assert.equal(ready.data.steps[1].taskTitle, `${draft.name} · 2. Record the owner decision`);
    const revised = await request(detail, { method: "PATCH", headers,
      body: JSON.stringify({ purpose: "A separately reviewed fictional revision" }) });
    assert.equal(revised.status, 200, JSON.stringify(revised.body));
    assert.equal((revised.body as any).data.version, 2);
    assert.equal((revised.body as any).data.status, "draft");
    const pinnedActive = await prisma.procedure.findUniqueOrThrow({ where: { id: draft.id }, include: { steps: true } });
    assert.equal(pinnedActive.status, "active");
    assert.equal(pinnedActive.purpose, draft.purpose, "editing an active version creates a separate draft");
    assert.equal(pinnedActive.steps[0].instruction, "Review the fictional baseline");
    assert.equal((await request(`${detail}/actions/activate`, { method: "POST", headers,
      body: JSON.stringify({ expectedVersion: draft.version, expectedUpdatedAt: draft.updatedAt }) })).status, 409,
      "activation of the same reviewed draft is not replayed");
    for (const role of [ordinary, agent]) {
      const result = await request(path, { method: "POST", headers, body: JSON.stringify(definition(role.id, project.id)) });
      assert.equal(result.status, 201);
      const invalid = (result.body as any).data;
      const denied = await request(`${path}/${invalid.id}/actions/activate`, { method: "POST", headers,
        body: JSON.stringify({ expectedVersion: invalid.version, expectedUpdatedAt: invalid.updatedAt }) });
      assert.equal(denied.status, 409);
      assert.ok((denied.body as any).errorDetails.details.blockers.includes(role.id === ordinary.id ? "escalation_role_missing" : "human_owner_role_missing"));
    }
    const scopeBypass = await request(path, { method: "POST", headers, body: JSON.stringify(definition(terminal.id, project.id)) });
    assert.equal(scopeBypass.status, 201);
    const bypassDraft = (scopeBypass.body as any).data;
    await prisma.workspaceMembership.update({ where: { id: member.id }, data: { role: "admin" } });
    const changedScope = await request(`${path}/${bypassDraft.id}`, { method: "PATCH", headers,
      body: JSON.stringify({ organizationalContext: { ownerDepartmentKey: "04-operacje", relatedDepartmentKeys: [],
        applicableDepartmentKeys: [], scopes: [{ type: "company" }] } }) });
    assert.equal(changedScope.status, 200);
    assert.equal((await request(`${path}/${bypassDraft.id}/actions/activate`, { method: "POST", headers,
      body: JSON.stringify({ expectedVersion: bypassDraft.version, expectedUpdatedAt: (changedScope.body as any).data.updatedAt }) })).status, 403,
      "changing a draft to company scope never bypasses owner activation");
    await prisma.workspaceMembership.update({ where: { id: member.id }, data: { role: "owner" } });
    assert.equal(await prisma.procedureRun.count({ where: { workspaceId } }), 0);
    assert.equal(await prisma.task.count({ where: { workspaceId, projectId: project.id } }), 0);
  });

  test("RF-CTX-029 concurrent family activation keeps one active version and complete evidence", async () => {
    const owner = await registerOwner(`procedure-activation-race-${randomUUID()}@example.test`, "Activation race fixture");
    const workspaceId = owner.workspace.id;
    const headers = { Authorization: `Bearer ${owner.token}` };
    const name = `Fictional family ${randomUUID()}`;
    const definition = { workspaceId, name, purpose: "One reviewable fictional action", expectedResult: "One finding",
      steps: { create: { stepOrder: 1, instruction: "Inspect the fictional record", stepType: "manual" as const } } };
    const first = await prisma.procedure.create({ data: definition });
    const second = await prisma.procedure.create({ data: { ...definition, familyId: first.familyId, version: 2 } });
    const activate = (procedure: typeof first) => request(`/v1/process-core/procedures/${procedure.id}/actions/activate`, {
      method: "POST", headers, body: JSON.stringify({ expectedVersion: procedure.version, expectedUpdatedAt: procedure.updatedAt.toISOString() }) });
    const results = await Promise.all([activate(first), activate(second)]);
    assert.ok(results.every(result => [200, 409].includes(result.status)), JSON.stringify(results));
    assert.equal(await prisma.procedure.count({ where: { workspaceId, familyId: first.familyId, status: "active" } }), 1);
    assert.equal(await prisma.auditLog.count({ where: { workspaceId, action: "procedure.activate", resourceId: { in: [first.id, second.id] } } }),
      results.filter(result => result.status === 200).length);
    assert.equal(await prisma.event.count({ where: { workspaceId, type: "procedure_activated", resourceId: { in: [first.id, second.id] } } }),
      results.filter(result => result.status === 200).length);
  });

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
    const todayProcedureRows = async () => {
      const response = await request("/v1/dashboard/attention", { headers });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      return (response.body as any).data;
    };
    assert.equal((await todayProcedureRows()).items.some((item: any) => item.kind === "procedure_result" && run.steps.some((step: any) => step.id === item.id)), false,
      "todo procedure Tasks are not pending owner outcome reviews");
    const tasks = await prisma.task.findMany({ where: { id: { in: run.steps.map((step: any) => step.task.id) } } });
    assert.equal(tasks.length, 2);
    for (const step of run.steps) {
      const taskRead = await request(`/v1/tasks/${step.task.id}`, { headers });
      assert.equal(taskRead.status, 200);
      assert.deepEqual((taskRead.body as any).data.procedureRunStep, {
        id: step.id, stepOrder: step.order, stepType: step.executor,
        run: { id: run.id, procedureId: procedure.id, procedureVersion: procedure.version, procedureName: procedure.name }
      }, "owner Task read identifies its exact pinned manual/human review step");
      assert.equal((await request(`/v1/tasks/${step.task.id}`, { headers: foreignHeaders })).status, 404);
    }
    const exactBoard = await request(`/v1/operations/work-items?taskId=${run.steps[0].task.id}&limit=1`, { headers });
    assert.equal(exactBoard.status, 200);
    assert.deepEqual((exactBoard.body as any).data.workItems.map((item: any) => item.task.id), [run.steps[0].task.id],
      "status editor can load an exact procedure Task beyond the normal board window");
    const foreignBoard = await request(`/v1/operations/work-items?taskId=${run.steps[0].task.id}&limit=1`, { headers: foreignHeaders });
    assert.equal(foreignBoard.status, 200);
    assert.equal((foreignBoard.body as any).data.workItems.length, 0);
    await prisma.workspaceMembership.update({ where: { id: member.id }, data: { role: "admin" } });
    assert.equal((await request("/v1/dashboard/attention", { headers })).status, 403, "Today remains owner-only");
    const nonOwnerTask = await request(`/v1/tasks/${run.steps[0].task.id}`, { headers });
    assert.equal(nonOwnerTask.status, 200);
    assert.equal((nonOwnerTask.body as any).data.procedureRunStep, null, "non-owner Task view omits owner-only run navigation");
    await prisma.workspaceMembership.update({ where: { id: member.id }, data: { role: "owner" } });
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
    assert.equal(((await request("/v1/dashboard/attention", { headers: foreignHeaders })).body as any).data.items
      .some((item: any) => item.kind === "procedure_result" && run.steps.some((step: any) => step.id === item.id)), false);
    await prisma.task.update({ where: { id: tasks[0].id }, data: { status: "blocked" } });
    assert.equal(((await request(`/v1/process-core/procedure-runs/${run.id}`, { headers })).body as any).data.status, "exception");
    assert.equal((await todayProcedureRows()).items.some((item: any) => item.id === run.steps[0].id), false,
      "blocked Task is not presented as a completed outcome");
    await prisma.task.updateMany({ where: { id: { in: tasks.map(task => task.id) } }, data: { status: "done" } });
    const done = (await request(`/v1/process-core/procedure-runs/${run.id}`, { headers })).body as any;
    assert.equal(done.data.status, "tasks_done_evidence_pending", "Task done does not prove output");
    assert.deepEqual(done.data.steps[0].outputEvidence, []);
    const pendingToday = await todayProcedureRows();
    const pendingRows = pendingToday.items.filter((item: any) => item.kind === "procedure_result" && run.steps.some((step: any) => step.id === item.id));
    assert.equal(pendingRows.length, 2, "each completed unassessed step has one current entry");
    assert.equal(pendingToday.totalCount, pendingToday.items.length);
    assert.equal((await request("/v1/dashboard/command", { headers })).status, 200);
    for (const step of run.steps) {
      const item = pendingRows.find((row: any) => row.id === step.id);
      assert.deepEqual({ kind: item?.kind, reason: item?.reason, status: item?.status, responsible: item?.responsible, related: item?.related },
        { kind: "procedure_result", reason: "procedure_outcome_pending", status: "owner_review", responsible: "Test Owner", related: project.name });
      assert.equal(item.target, `/areas?area=04-operacje&view=procedures&procedureId=${procedure.id}&runId=${run.id}&stepId=${step.id}&from=attention`);
    }
    const outcomePath = (stepId: string) => `/v1/process-core/procedure-runs/${run.id}/steps/${stepId}/outcomes`;
    const firstOutcomeRequestId = randomUUID();
    const outcomeBody = { requestId: firstOutcomeRequestId, decision: "accept", evidence: { summary: "Owner checked the fictional packet", references: ["fixture://packet"] } };
    assert.equal((await request(outcomePath(run.steps[0].id), { method: "POST", headers: foreignHeaders, body: JSON.stringify(outcomeBody) })).status, 404);
    const firstOutcome = await request(outcomePath(run.steps[0].id), { method: "POST", headers, body: JSON.stringify(outcomeBody) });
    assert.equal(firstOutcome.status, 201, JSON.stringify(firstOutcome.body));
    assert.deepEqual((await todayProcedureRows()).items.filter((item: any) => item.kind === "procedure_result" && run.steps.some((step: any) => step.id === item.id))
      .map((item: any) => item.id), [run.steps[1].id], "accepted step leaves Today while its sibling still waits");
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
    assert.equal((await todayProcedureRows()).items.some((item: any) => item.kind === "procedure_result" && run.steps.some((step: any) => step.id === item.id)), false);
    assert.equal(accepted.data.steps[0].outputEvidence[0].evidence.summary, "Concurrent owner review was recorded");
    assert.ok(accepted.data.steps[0].outcomeHistory.some((item: any) => item.evidence.summary === "Owner checked the fictional packet"));
    const exception = await request(outcomePath(run.steps[0].id), { method: "POST", headers,
      body: JSON.stringify({ requestId: randomUUID(), decision: "exception", evidence: { summary: "Fictional packet needs another review", references: [] }, reason: "The reviewed packet was superseded" }) });
    assert.equal(exception.status, 201, JSON.stringify(exception.body));
    assert.equal(((await request(`/v1/process-core/procedure-runs/${run.id}`, { headers })).body as any).data.status, "exception");
    assert.equal((await todayProcedureRows()).items.some((item: any) => item.id === run.steps[0].id), false,
      "exception history does not reopen a pending assessment card");
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

  test("Today pages completed procedure assessments without duplicates and removes an accepted step", async () => {
    const owner = await registerOwner(`procedure-today-${randomUUID()}@example.test`, "Procedure Today fixture");
    const workspaceId = owner.workspace.id;
    const headers = { Authorization: `Bearer ${owner.token}` };
    const membership = await prisma.workspaceMembership.findFirstOrThrow({ where: { workspaceId, role: "owner" } });
    const project = await prisma.project.create({ data: { workspaceId, name: "Fictional review project", status: "active" } });
    const procedure = await prisma.procedure.create({ data: { workspaceId, name: "Fictional manual review", purpose: "Review test outcomes", status: "active" } });
    const run = await prisma.procedureRun.create({ data: { workspaceId, procedureId: procedure.id, projectId: project.id,
      requestId: randomUUID(), launchedByUserId: membership.userId, previewDigest: "a".repeat(64),
      procedureFamilyId: procedure.familyId, procedureVersion: procedure.version, procedureName: procedure.name,
      procedureUpdatedAt: procedure.updatedAt, projectName: project.name, ownerRoleName: "Workspace owner", inputSnapshot: {} } });
    const stepIds: string[] = [];
    for (let order = 1; order <= 27; order++) {
      const definition = await prisma.procedureStep.create({ data: { procedureId: procedure.id, stepOrder: order,
        instruction: `Inspect fictional result ${order}`, stepType: "manual", expectedOutput: {}, validationRule: {} } });
      const task = await prisma.task.create({ data: { workspaceId, projectId: project.id, ownerUserId: membership.userId,
        title: `Fictional result ${order}`, status: "done", source: "companycore" } });
      const step = await prisma.procedureRunStep.create({ data: { runId: run.id, procedureStepId: definition.id,
        taskId: task.id, stepOrder: order, instruction: definition.instruction, stepType: "manual",
        expectedInput: {}, expectedOutput: {}, validationRule: {} } });
      stepIds.push(step.id);
    }
    const firstResponse = await request("/v1/dashboard/attention", { headers });
    assert.equal(firstResponse.status, 200, JSON.stringify(firstResponse.body));
    const first = (firstResponse.body as any).data;
    assert.equal(first.totalCount, 27);
    assert.equal(first.items.length, 25);
    assert.equal(first.hasMore, true);
    assert.equal(first.nextOffset, 25);
    const secondResponse = await request(`/v1/dashboard/attention?offset=${first.nextOffset}`, { headers });
    assert.equal(secondResponse.status, 200, JSON.stringify(secondResponse.body));
    const second = (secondResponse.body as any).data;
    assert.equal(second.totalCount, 27);
    assert.equal(second.items.length, 2);
    assert.equal(second.hasMore, false);
    assert.deepEqual(new Set([...first.items, ...second.items].map((item: any) => item.id)), new Set(stepIds));
    assert.ok([...first.items, ...second.items].every((item: any) => item.kind === "procedure_result"));
    const acceptedStepId = first.items[0].id;
    const accepted = await request(`/v1/process-core/procedure-runs/${run.id}/steps/${acceptedStepId}/outcomes`, {
      method: "POST", headers, body: JSON.stringify({ requestId: randomUUID(), decision: "accept",
        evidence: { summary: "Fictional result inspected by owner", references: [] } })
    });
    assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
    const after = (await request("/v1/dashboard/attention", { headers })).body as any;
    assert.equal(after.data.totalCount, 26);
    assert.equal(after.data.items.some((item: any) => item.id === acceptedStepId), false);
    const history = (await request(`/v1/process-core/procedure-runs/${run.id}`, { headers })).body as any;
    assert.ok(history.data.steps.find((step: any) => step.id === acceptedStepId)?.outcomeHistory.some((item: any) => item.decision === "accept"));
  });
}
