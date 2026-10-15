import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";
import { loadApplicationAgentContext } from "../modules/product-engineering/application-agent-context";

type Response = { status: number; body: unknown };
type Harness = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
  registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }>;
};

export function registerProcedureArchiveApiTests({ request, registerOwner }: Harness) {
  test("Outcome 0 procedure archive guarded HTTP and native PostgreSQL", async () => {
    const owner = await registerOwner(`procedure-archive-${randomUUID()}@example.test`, "Procedure archive fixture");
    const workspaceId = owner.workspace.id;
    const headers = { Authorization: `Bearer ${owner.token}` };
    const procedure = await prisma.procedure.create({ data: { workspaceId, name: `Synthetic archive ${randomUUID()}`,
      purpose: "Retire a safe version with history", status: "active", expectedResult: "Preserved history",
      steps: { create: { stepOrder: 1, instruction: "Preserve the version" } } } });
    const path = `/v1/process-core/procedures/${procedure.id}`;
    const preview = async () => {
      const response = await request(`${path}/archive-preview`, { headers });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      return (response.body as any).data;
    };
    const command = (view: any, requestId = randomUUID(), reason = "Retire this synthetic procedure version", alternate = false) =>
      request(alternate ? `/v1/company-os/workflow-definitions/procedure/${procedure.id}/actions/archive` : `${path}/actions/archive`,
        { method: "POST", headers, body: JSON.stringify({ requestId, previewToken: view.previewToken, reason }) });

    const first = await preview();
    assert.equal(first.procedure.status, "active");
    assert.equal(first.impact.steps, 1);
    assert.deepEqual(first.blockers, []);
    assert.match(first.digest, /^[a-f0-9]{64}$/);
    const membership = await prisma.workspaceMembership.findFirstOrThrow({ where: { workspaceId, role: "owner" } });
    await prisma.workspaceMembership.update({ where: { id: membership.id }, data: { role: "admin" } });
    assert.equal((await command(first)).status, 403, "a demoted owner cannot reuse a prior preview");
    await prisma.workspaceMembership.update({ where: { id: membership.id }, data: { role: "owner" } });
    assert.equal((await request(`${path}/actions/archive`, { method: "POST", headers, body: "{}" })).status, 400);
    assert.equal((await request(`${path}/archive-preview`)).status, 401);
    const foreign = await registerOwner(`procedure-foreign-${randomUUID()}@example.test`, "Foreign archive fixture");
    assert.equal((await request(`${path}/archive-preview`, { headers: { Authorization: `Bearer ${foreign.token}` } })).status, 404);
    assert.equal((await request(`${path}/actions/archive`, { method: "POST", headers: { Authorization: `Bearer ${foreign.token}` },
      body: JSON.stringify({ requestId: randomUUID(), previewToken: first.previewToken, reason: "Foreign owner attempt" }) })).status, 409);

    const pipeline = await prisma.pipeline.create({ data: { workspaceId, name: `Archive pipeline ${randomUUID()}`, purpose: "Synthetic run", status: "active" } });
    const stage = await prisma.pipelineStage.create({ data: { workspaceId, pipelineId: pipeline.id, name: "Bound stage", procedureId: procedure.id, status: "active" } });
    const blockedStage = await preview();
    assert.ok(blockedStage.blockers.includes("active_pipeline_stage"));
    assert.deepEqual(blockedStage.impact.pipelineStages.map((item: any) => item.id), [stage.id]);
    assert.equal((await command(first)).status, 409, "same-count dependency addition stales the preview");
    assert.equal((await command(blockedStage)).status, 409);
    await prisma.pipelineStage.update({ where: { id: stage.id }, data: { status: "retired" } });
    const pipelineRun = await prisma.pipelineRun.create({ data: { workspaceId, pipelineId: pipeline.id, initiatedByType: "user",
      status: "pending", correlationId: randomUUID() } });
    const blockedRun = await preview();
    assert.ok(blockedRun.blockers.includes("active_pipeline_run"), "future stage of pending pipeline run is an active dependency");
    assert.equal((await command(blockedRun)).status, 409);
    await prisma.pipelineRun.update({ where: { id: pipelineRun.id }, data: { status: "completed" } });
    const stageRun = await prisma.stageRun.create({ data: { workspaceId, pipelineRunId: pipelineRun.id,
      pipelineStageId: stage.id, status: "pending" } });
    assert.ok((await preview()).blockers.includes("active_stage_run"));
    await prisma.stageRun.update({ where: { id: stageRun.id }, data: { status: "completed" } });

    const policy = await prisma.policy.create({ data: { workspaceId, name: `Archive policy ${randomUUID()}`,
      appliesTo: "task", ruleType: "archive-fixture", procedureId: procedure.id, status: "active" } });
    assert.ok((await preview()).blockers.includes("active_policy"));
    await prisma.policy.update({ where: { id: policy.id }, data: { status: "retired" } });
    const application = await prisma.application.create({ data: { workspaceId,
      name: `Archive application ${randomUUID()}`, slug: `archive-${randomUUID()}`,
      status: "archived" } });
    await prisma.applicationProcedure.create({ data: { applicationId: application.id, procedureId: procedure.id, required: true } });
    assert.ok((await preview()).blockers.includes("required_application_link"), "required links block even on inactive parents");
    await prisma.applicationProcedure.delete({ where: { applicationId_procedureId: { applicationId: application.id, procedureId: procedure.id } } });

    const historical = await preview();
    assert.deepEqual(historical.blockers, []);
    assert.equal(historical.impact.pipelineStages.length, 1);
    assert.equal(historical.impact.pipelineRuns.length, 0);
    const admissionTriggerOrder = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT tgname AS name FROM pg_trigger WHERE tgrelid='task_admission_scopes'::regclass
        AND tgname IN ('task_admission_insert','zz_procedure_archive_admission_binding') ORDER BY tgname`;
    assert.deepEqual(admissionTriggerOrder.map((row) => row.name),
      ["task_admission_insert", "zz_procedure_archive_admission_binding"], "admission must acquire the global fence first");
    const requestId = randomUUID();
    let releaseFence!: () => void;
    let fenceHeld!: () => void;
    const fenceRelease = new Promise<void>((resolve) => { releaseFence = resolve; });
    const held = new Promise<void>((resolve) => { fenceHeld = resolve; });
    const admissionLock = prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM ready_source_fence WHERE id=1 FOR UPDATE`;
      fenceHeld();
      await fenceRelease;
      await db.$queryRaw`SELECT id FROM procedures WHERE id=${procedure.id}::uuid FOR SHARE`;
    }, { timeout: 10000 });
    await held;
    let archiveSettled = false;
    const archiving = command(historical, requestId);
    void archiving.then(() => { archiveSettled = true; }, () => { archiveSettled = true; });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(archiveSettled, false, "archive waits behind the admission fence before locking the procedure");
    releaseFence();
    await admissionLock;
    const archived = await archiving;
    assert.equal(archived.status, 200, JSON.stringify(archived.body));
    assert.equal((archived.body as any).data.procedure.status, "archived");
    assert.equal((archived.body as any).data.replayed, false);
    assert.equal((await command(historical, requestId)).status, 200, "exact request replays");
    assert.equal((await command(historical, requestId, "Changed reason")).status, 409);
    assert.equal((await command(historical, randomUUID(), undefined, true)).status, 409, "alternate route cannot bypass stale preview");
    assert.equal((await request(path, { headers })).status, 200, "historical version stays readable");
    const currentList = await request("/v1/process-core/procedures", { headers });
    assert.ok(!(currentList.body as any).data.some((item: any) => item.id === procedure.id), "ordinary list excludes archived");
    const historyList = await request("/v1/process-core/procedures?includeArchived=true", { headers });
    assert.ok((historyList.body as any).data.some((item: any) => item.id === procedure.id), "explicit history retains archived");
    assert.equal(await prisma.auditLog.count({ where: { id: requestId, action: "procedure.archive" } }), 1);
    assert.equal(await prisma.event.count({ where: { correlationId: `procedure-archive:${requestId}` } }), 1);
    assert.equal(await prisma.pipelineStage.count({ where: { id: stage.id, procedureId: procedure.id } }), 1);
    await assert.rejects(prisma.pipelineStage.update({ where: { id: stage.id }, data: { status: "active" } }),
      /procedure_archive_inactive_binding/);
    await assert.rejects(prisma.policy.update({ where: { id: policy.id }, data: { status: "active" } }),
      /procedure_archive_inactive_binding/);
    await assert.rejects(prisma.applicationProcedure.create({ data: { applicationId: application.id,
      procedureId: procedure.id, required: true } }), /procedure_archive_inactive_binding/);
    await prisma.applicationProcedure.create({ data: { applicationId: application.id, procedureId: procedure.id, required: false } });
    const agentContext = await loadApplicationAgentContext(workspaceId, application.id);
    assert.equal(agentContext?.operatingModel.applicationProcedures.length, 0, "ordinary agent context excludes an optional archived link");
    const deniedStageStart = await request(`/v1/company-os/pipeline-runs/${pipelineRun.id}/actions/start-stage`,
      { method: "POST", headers, body: JSON.stringify({ pipelineStageId: stage.id }) });
    assert.equal(deniedStageStart.status, 409);
    assert.equal((deniedStageStart.body as any).error, "inactive_procedure");
    assert.equal((await preview()).blockers.includes("already_archived"), true);

    const protectedProcedure = await prisma.procedure.create({ data: { workspaceId,
      name: `Protected checklist ${randomUUID()}`, purpose: "Historical protected version", scope: "roost-reference-site-checklist-v1",
      status: "draft", steps: { create: { stepOrder: 1, instruction: "Protected review" } } } });
    const protectedPath = `/v1/process-core/procedures/${protectedProcedure.id}`;
    const protectedView = await request(`${protectedPath}/archive-preview`, { headers });
    assert.equal(protectedView.status, 200);
    assert.ok((protectedView.body as any).data.blockers.includes("protected_checklist"));
    const protectedBody = { requestId: randomUUID(), previewToken: (protectedView.body as any).data.previewToken,
      reason: "Archive protected checklist" };
    assert.equal((await request(`${protectedPath}/actions/archive`, { method: "POST", headers, body: JSON.stringify(protectedBody) })).status, 409);
    assert.equal((await request(`/v1/company-os/workflow-definitions/procedure/${protectedProcedure.id}/actions/archive`,
      { method: "POST", headers, body: JSON.stringify(protectedBody) })).status, 409);
    assert.equal((await prisma.procedure.findUniqueOrThrow({ where: { id: protectedProcedure.id } })).status, "draft");
  });
}
