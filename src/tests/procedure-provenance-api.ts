import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";

type Harness = {
  request: (path: string, init?: RequestInit) => Promise<{ status: number; body: unknown }>;
  registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }>;
};

export function registerProcedureProvenanceApiTests({ request, registerOwner }: Harness) {
  test("Outcome 0 procedure provenance is owner-scoped and does not infer origin from status", async () => {
    const owner = await registerOwner(`provenance-${randomUUID()}@example.test`, "Procedure provenance fixture");
    const foreign = await registerOwner(`provenance-foreign-${randomUUID()}@example.test`, "Foreign procedure fixture");
    const workspaceId = owner.workspace.id;
    const headers = { Authorization: `Bearer ${owner.token}` };
    const procedure = await prisma.procedure.create({ data: { workspaceId,
      name: `Synthetic provenance ${randomUUID()}`, purpose: "Review recorded purpose", scope: "Synthetic owner review",
      status: "active", expectedResult: "A sourced decision" } });
    const path = `/v1/process-core/procedures/${procedure.id}/provenance`;
    assert.equal((await request(path)).status, 401);
    assert.equal((await request(path, { headers: { Authorization: `Bearer ${foreign.token}` } })).status, 404);
    const first = await request(path, { headers });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    const unknown = (first.body as any).data;
    assert.equal(unknown.origin.state, "unknown", "active status and purpose cannot establish origin");
    assert.equal(unknown.procedure.purpose, "Review recorded purpose");
    assert.equal(unknown.procedure.scope, "Synthetic owner review");
    assert.deepEqual(unknown.tasks, { current: [], history: [] });

    const membership = await prisma.workspaceMembership.findFirstOrThrow({ where: { workspaceId, role: "owner" } });
    await prisma.workspaceMembership.update({ where: { id: membership.id }, data: { role: "admin" } });
    assert.equal((await request(path, { headers })).status, 403);
    await prisma.workspaceMembership.update({ where: { id: membership.id }, data: { role: "owner" } });

    const pipeline = await prisma.pipeline.create({ data: { workspaceId, name: `Synthetic pipeline ${randomUUID()}`,
      purpose: "Configured relation", status: "active" } });
    const stage = await prisma.pipelineStage.create({ data: { workspaceId, pipelineId: pipeline.id,
      procedureId: procedure.id, name: "Review stage", status: "active" } });
    const policy = await prisma.policy.create({ data: { workspaceId, procedureId: procedure.id,
      name: "Synthetic review policy", appliesTo: "task", ruleType: "review", status: "active" } });
    await prisma.auditLog.create({ data: { workspaceId, actorType: "user", actorId: membership.userId,
      action: "procedure.create_draft", resourceType: "Procedure", resourceId: procedure.id,
      correlationId: `procedure-provenance:${randomUUID()}`, inputPayload: { name: procedure.name } } });
    const response = await request(path, { headers });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const recorded = (response.body as any).data;
    assert.equal(recorded.origin.state, "recorded");
    assert.equal(recorded.origin.action, "procedure.create_draft");
    assert.deepEqual(recorded.configuration.stages.map((item: any) => item.id), [stage.id]);
    assert.deepEqual(recorded.configuration.policies.map((item: any) => item.id), [policy.id]);
    assert.equal(recorded.lifecycle.length, 1);
    assert.equal((await prisma.procedure.findUniqueOrThrow({ where: { id: procedure.id } })).status, "active");
  });
}
