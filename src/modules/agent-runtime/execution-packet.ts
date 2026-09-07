import { createHash } from "node:crypto";
import type { AgentExecution, Task, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// This is an envelope over an explicit execution contract, not inferred task intent.
// Missing/invalid contract fields are deliberately preserved for host diagnostics.
export async function prepareExecutionPacket(execution: AgentExecution, task: Task, db: Prisma.TransactionClient = prisma) {
  const contract = object(execution.metadata).executionContract ?? null;
  const context = object(object(contract).context);
  const ids = [...new Set(["company", "product", "technical"].flatMap((category) => {
    const refs = context[category];
    return Array.isArray(refs) ? refs.slice(0, 10).map((ref) => object(ref).id)
      .filter((id): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) : [];
  }))];
  const sources = await db.companyRecord.findMany({
    where: { workspaceId: execution.workspaceId, id: { in: ids }, status: { not: "archived" }, OR: [{ applicationId: null }, { applicationId: execution.applicationId }] },
    select: { id: true, workspaceId: true, applicationId: true, recordType: true, title: true, description: true, businessPurpose: true, desiredState: true, expectedBehavior: true, updatedAt: true },
    orderBy: { id: "asc" }
  });
  const single = object(object(contract).singleTask), componentRef = object(single.component), managerRef = object(single.accountableManager);
  const validId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
  const scopeApplication = await db.application.findFirst({ where: { id: execution.applicationId, workspaceId: execution.workspaceId }, select: { id: true } });
  const component = scopeApplication && validId(componentRef.id) ? await db.applicationArchitectureComponent.findFirst({ where: { id: componentRef.id, applicationId: scopeApplication.id }, select: { id: true, applicationId: true, status: true, updatedAt: true } }) : null;
  const manager = validId(managerRef.id) ? await db.workforceEntity.findFirst({ where: { id: managerRef.id, workspaceId: execution.workspaceId }, select: { id: true, workspaceId: true, status: true, updatedAt: true } }) : null;
  const body = {
    schemaVersion: "roost-execution-packet-v1",
    identity: { executionId: execution.id, workspaceId: execution.workspaceId, taskId: task.id, applicationId: execution.applicationId, agentId: task.assignedWorkforceEntityId },
    taskRevision: task.updatedAt.toISOString(),
    contract,
    scopeAuthorities: {
      component: component ? { id: component.id, applicationId: component.applicationId, status: component.status, revision: component.updatedAt.toISOString() } : null,
      manager: manager ? { id: manager.id, workspaceId: manager.workspaceId, status: manager.status, revision: manager.updatedAt.toISOString() } : null
    },
    sources: sources.map(({ updatedAt, ...source }) => ({ ...source, revision: updatedAt.toISOString() }))
  };
  return { ...body, revision: createHash("sha256").update(JSON.stringify(body)).digest("hex") };
}
