import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";
import { DEFAULT_DEPARTMENTS } from "../modules/departments/default-departments";

type HttpResult = { status: number; body: unknown };
type Owner = { token: string; workspace: { id: string } };
type Request = (path: string, init?: RequestInit) => Promise<HttpResult>;
type RegisterOwner = (email: string, workspaceName: string) => Promise<Owner>;

export function registerDepartmentCompositionTests({ request, registerOwner }: { request: Request; registerOwner: RegisterOwner }) {
  test("G16b previews and atomically applies one existing department composition on populated data", async () => {
    const owner = await registerOwner(`composition-${randomUUID()}@example.test`, "Composition fixture");
    const other = await registerOwner(`composition-other-${randomUUID()}@example.test`, "Other fixture");
    const workspaceId = owner.workspace.id;
    assert.equal(await prisma.workspaceDepartment.count({ where: { workspaceId } }), 0);
    await prisma.workspaceDepartment.createMany({ data: DEFAULT_DEPARTMENTS.map((item) => ({
      ...item, linkedViews: [...item.linkedViews], workspaceId, isSystem: true
    })) });
    assert.equal(await prisma.departmentViewDefinition.count({ where: { workspaceId } }), 0);
    const auth = { Authorization: `Bearer ${owner.token}` };
    const otherAuth = { Authorization: `Bearer ${other.token}` };
    const read = async () => {
      const response = await request("/v1/departments", { headers: auth });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      return (response.body as any).data;
    };
    const initial = await read();
    assert.equal(initial.departments.length, 13);
    assert.equal(await prisma.departmentViewDefinition.count({ where: { workspaceId } }), 51);
    assert.equal(await prisma.departmentViewAvailability.count({ where: { workspaceId } }), 183);
    const department = initial.departments.find((item: any) => item.key === "09-technologia");
    assert.ok(department);
    assert.ok(!department.linkedViews.includes("strategy.goals"));
    const existingViews = await prisma.departmentViewAvailability.findMany({ where: { workspaceId, departmentId: department.id } });
    const existingViewIds = existingViews.map((item) => item.id).sort();
    const relation = await prisma.organizationalDepartmentRelation.create({ data: {
      workspaceId, entityType: "task", entityId: randomUUID(), departmentId: department.id, relationshipRole: "owner"
    } });
    const ownership = await prisma.entityOwnership.create({ data: {
      workspaceId, entityType: "task", entityId: relation.entityId, ownerType: "department", ownerId: department.id
    } });
    const workforce = await prisma.workforceEntity.create({ data: {
      workspaceId, type: "agent", name: "Synthetic specialist", slug: randomUUID(), department: department.key
    } });
    const mapping = await prisma.externalContainerMapping.create({ data: {
      workspaceId, provider: "fixture-provider", entityType: "folder", externalId: randomUUID(),
      raw: { manualDepartmentKey: department.key, fixture: true }
    } });
    const draft = {
      name: "09 Technology Delivery",
      description: "Focused technology coordination",
      icon: "ph-cpu",
      position: department.position,
      linkedViews: [...department.linkedViews, "strategy.goals"]
    };
    const endpoint = `/v1/departments/${department.id}`;
    const post = (path: string, body: unknown, headers = auth) => request(path, { method: "POST", headers, body: JSON.stringify(body) });
    assert.equal((await post(`${endpoint}/preview`, draft, otherAuth)).status, 404);
    assert.equal((await request(endpoint, { method: "PATCH", headers: auth, body: JSON.stringify(draft) })).status, 409);
    assert.equal((await post(`${endpoint}/preview`, { ...draft, linkedViews: [] })).status, 409);
    assert.equal((await post(`${endpoint}/preview`, { ...draft, linkedViews: [...draft.linkedViews, "finance.budgets"] })).status, 400);
    const preview = await post(`${endpoint}/preview`, draft);
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    const impact = (preview.body as any).data;
    assert.deepEqual(impact.detachedViews, []);
    assert.deepEqual(impact.attachedViews, ["strategy.goals"]);
    assert.equal(impact.preserved.organizationalRelations, 1);
    assert.equal(impact.preserved.entityOwnerships, 1);
    assert.equal(impact.preserved.workforce, 1);
    assert.equal(impact.preserved.providerMappings, 1);
    assert.equal((await post(`${endpoint}/actions/apply`, { confirmationToken: impact.confirmationToken }, otherAuth)).status, 400);
    assert.equal((await post(`${endpoint}/actions/apply`, { confirmationToken: "bad" })).status, 400);
    const applied = await post(`${endpoint}/actions/apply`, { confirmationToken: impact.confirmationToken });
    assert.equal(applied.status, 200, JSON.stringify(applied.body));
    assert.equal((applied.body as any).data.compositionVersion, department.compositionVersion + 1);
    assert.equal((await post(`${endpoint}/actions/apply`, { confirmationToken: impact.confirmationToken })).status, 409);
    const after = await read();
    const changed = after.departments.find((item: any) => item.id === department.id);
    assert.equal(changed.key, department.key);
    assert.equal(changed.name, draft.name);
    assert.equal(changed.href, "/areas?area=09-technologia&view=overview");
    assert.ok(changed.linkedViews.includes("strategy.goals"));
    const attachedViews = await prisma.departmentViewAvailability.findMany({ where: { workspaceId, departmentId: department.id } });
    assert.deepEqual(attachedViews.map((item) => item.id).sort(), existingViewIds);
    assert.equal(await prisma.departmentViewAvailability.count({ where: { workspaceId } }), 183);
    const detachDraft = { ...draft, linkedViews: department.linkedViews };
    const detachPreview = await post(`${endpoint}/preview`, detachDraft);
    assert.equal(detachPreview.status, 200, JSON.stringify(detachPreview.body));
    assert.deepEqual((detachPreview.body as any).data.detachedViews, ["strategy.goals"]);
    assert.equal((await post(`${endpoint}/actions/apply`, { confirmationToken: (detachPreview.body as any).data.confirmationToken })).status, 200);
    const detached = (await read()).departments.find((item: any) => item.id === department.id);
    assert.ok(!detached.linkedViews.includes("strategy.goals"));
    assert.equal((await prisma.departmentViewAvailability.findMany({ where: { workspaceId, departmentId: department.id } })).length, attachedViews.length);
    assert.deepEqual(await prisma.organizationalDepartmentRelation.findUnique({ where: { id: relation.id } }), relation);
    assert.deepEqual(await prisma.entityOwnership.findUnique({ where: { id: ownership.id } }), ownership);
    assert.deepEqual(await prisma.workforceEntity.findUnique({ where: { id: workforce.id } }), workforce);
    assert.deepEqual(await prisma.externalContainerMapping.findUnique({ where: { id: mapping.id } }), mapping);
    assert.equal(await prisma.workspaceDepartment.count({ where: { workspaceId } }), 13);
    assert.equal(await prisma.departmentViewDefinition.count({ where: { workspaceId } }), 51);
    const stale = await post(`${endpoint}/preview`, { ...draft, name: "Next name" });
    assert.equal(stale.status, 200);
    await prisma.workspaceDepartment.update({ where: { id: department.id }, data: { description: "Concurrent edit" } });
    assert.equal((await post(`${endpoint}/actions/apply`, { confirmationToken: (stale.body as any).data.confirmationToken })).status, 409);
    assert.equal((await prisma.workspaceDepartment.findUniqueOrThrow({ where: { id: department.id } })).name, draft.name);
    assert.equal(await prisma.auditLog.count({ where: { workspaceId, resourceId: department.id, action: "department_composition_applied" } }), 2);
  });
}
