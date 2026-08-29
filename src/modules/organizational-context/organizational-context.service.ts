import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { isCanonicalDepartmentKey } from "../../operating-model/department-registry";

export const organizationalEntityTypes = [
  "goal", "task", "task_list", "procedure", "project", "requirement", "feature",
  "decision", "risk", "metric", "resource", "policy", "process", "application",
  "client", "workforce", "company_record", "evidence"
] as const;

export const organizationalScopeTypes = [
  "company", "department", "project", "product", "service", "client", "team",
  "role", "human", "agent", "feature", "component"
] as const;

export type OrganizationalScopeInput = {
  type: typeof organizationalScopeTypes[number];
  entityId?: string | null;
  label?: string | null;
};

export type OrganizationalContextInput = {
  ownerDepartmentKey?: string | null;
  relatedDepartmentKeys?: string[];
  applicableDepartmentKeys?: string[];
  scopes?: OrganizationalScopeInput[];
};

export function canonicalOrganizationalEntityType(entityType: string) {
  return entityType === "requirement" ? "company_record" : entityType;
}

export function departmentKeysAreValid(input: OrganizationalContextInput) {
  return [
    ...(input.ownerDepartmentKey ? [input.ownerDepartmentKey] : []),
    ...(input.relatedDepartmentKeys ?? []),
    ...(input.applicableDepartmentKeys ?? [])
  ].every(isCanonicalDepartmentKey);
}

async function resolveDepartments(transaction: Prisma.TransactionClient, workspaceId: string, keys: string[]) {
  const departments = await transaction.workspaceDepartment.findMany({
    where: { workspaceId, key: { in: [...new Set(keys)] } }
  });
  return new Map(departments.map((department) => [department.key, department]));
}

export async function replaceOrganizationalContext(
  transaction: Prisma.TransactionClient,
  workspaceId: string,
  entityType: string,
  entityId: string,
  input: OrganizationalContextInput
) {
  entityType = canonicalOrganizationalEntityType(entityType);
  const keys = [
    ...(input.ownerDepartmentKey ? [input.ownerDepartmentKey] : []),
    ...(input.relatedDepartmentKeys ?? []),
    ...(input.applicableDepartmentKeys ?? [])
  ];
  const departments = await resolveDepartments(transaction, workspaceId, keys);
  if (departments.size !== new Set(keys).size) {
    throw new Error("invalid_department_key");
  }

  await transaction.organizationalDepartmentRelation.deleteMany({ where: { workspaceId, entityType, entityId } });
  await transaction.organizationalScope.deleteMany({ where: { workspaceId, entityType, entityId } });
  await transaction.entityOwnership.deleteMany({ where: { workspaceId, entityType, entityId } });

  const relations = [
    ...(input.ownerDepartmentKey ? [{ key: input.ownerDepartmentKey, relationshipRole: "owner" as const }] : []),
    ...(input.relatedDepartmentKeys ?? []).filter((key) => key !== input.ownerDepartmentKey).map((key) => ({ key, relationshipRole: "related" as const })),
    ...(input.applicableDepartmentKeys ?? []).filter((key) => key !== input.ownerDepartmentKey).map((key) => ({ key, relationshipRole: "applicable" as const }))
  ];
  if (relations.length) {
    await transaction.organizationalDepartmentRelation.createMany({
      data: relations.map(({ key, relationshipRole }) => ({
        workspaceId,
        entityType,
        entityId,
        departmentId: departments.get(key)!.id,
        relationshipRole
      })),
      skipDuplicates: true
    });
  }
  const ownerDepartment = input.ownerDepartmentKey ? departments.get(input.ownerDepartmentKey) : null;
  if (ownerDepartment) {
    await transaction.entityOwnership.create({
      data: {
        workspaceId,
        entityType,
        entityId,
        ownerType: "department",
        ownerId: ownerDepartment.id,
        responsibilityType: "accountable"
      }
    });
  }
  if (input.scopes?.length) {
    await transaction.organizationalScope.createMany({
      data: input.scopes.map((scope) => ({
        workspaceId,
        entityType,
        entityId,
        scopeType: scope.type,
        scopeEntityId: scope.entityId || null,
        label: scope.label || null
      })),
      skipDuplicates: true
    });
  }
}

export async function organizationalContextsForEntities(workspaceId: string, entityType: string, entityIds: string[]) {
  entityType = canonicalOrganizationalEntityType(entityType);
  const [relations, scopes, ownerships] = await Promise.all([
    prisma.organizationalDepartmentRelation.findMany({
      where: { workspaceId, entityType, entityId: { in: entityIds } },
      include: { department: true }
    }),
    prisma.organizationalScope.findMany({ where: { workspaceId, entityType, entityId: { in: entityIds } } }),
    prisma.entityOwnership.findMany({ where: { workspaceId, entityType, entityId: { in: entityIds } } })
  ]);
  return new Map(entityIds.map((entityId) => {
    const entityRelations = relations.filter((relation) => relation.entityId === entityId);
    return [entityId, {
      ownerDepartment: entityRelations.find((relation) => relation.relationshipRole === "owner")?.department ?? null,
      relatedDepartments: entityRelations.filter((relation) => relation.relationshipRole === "related").map((relation) => relation.department),
      applicableDepartments: entityRelations.filter((relation) => relation.relationshipRole === "applicable").map((relation) => relation.department),
      scopes: scopes.filter((scope) => scope.entityId === entityId).map((scope) => ({ type: scope.scopeType, entityId: scope.scopeEntityId, label: scope.label })),
      ownerships: ownerships.filter((ownership) => ownership.entityId === entityId).map((ownership) => ({
        ownerType: ownership.ownerType,
        ownerId: ownership.ownerId,
        responsibilityType: ownership.responsibilityType
      }))
    }];
  }));
}

export async function entityExists(workspaceId: string, entityType: string, entityId: string) {
  switch (entityType) {
    case "goal": return Boolean(await prisma.goal.findFirst({ where: { id: entityId, workspaceId } }));
    case "task": return Boolean(await prisma.task.findFirst({ where: { id: entityId, workspaceId } }));
    case "task_list": return Boolean(await prisma.taskList.findFirst({ where: { id: entityId, workspaceId } }));
    case "procedure": return Boolean(await prisma.procedure.findFirst({ where: { id: entityId, workspaceId } }));
    case "project": return Boolean(await prisma.project.findFirst({ where: { id: entityId, workspaceId } }));
    case "decision": return Boolean(await prisma.decision.findFirst({ where: { id: entityId, workspaceId } }));
    case "risk": return Boolean(await prisma.risk.findFirst({ where: { id: entityId, workspaceId } }));
    case "metric": return Boolean(await prisma.metric.findFirst({ where: { id: entityId, workspaceId } }));
    case "resource": return Boolean(await prisma.resource.findFirst({ where: { id: entityId, workspaceId } }));
    case "policy": return Boolean(await prisma.policy.findFirst({ where: { id: entityId, workspaceId } }));
    case "process": return Boolean(await prisma.process.findFirst({ where: { id: entityId, workspaceId } }));
    case "application": return Boolean(await prisma.application.findFirst({ where: { id: entityId, workspaceId } }));
    case "feature": return Boolean(await prisma.applicationFeature.findFirst({ where: { id: entityId, application: { workspaceId } } }));
    case "requirement": return Boolean(await prisma.companyRecord.findFirst({ where: { id: entityId, workspaceId, recordType: "requirement" } }));
    case "company_record": return Boolean(await prisma.companyRecord.findFirst({ where: { id: entityId, workspaceId } }));
    case "client": return Boolean(await prisma.client.findFirst({ where: { id: entityId, workspaceId } }));
    case "workforce": return Boolean(await prisma.workforceEntity.findFirst({ where: { id: entityId, workspaceId } }));
    case "evidence": return Boolean(await prisma.evidenceRecord.findFirst({ where: { id: entityId, workspaceId } }));
    default: return false;
  }
}

export async function contextualEntityIds(workspaceId: string, entityType: string, departmentKey: string, includeCompanyWide = true) {
  entityType = canonicalOrganizationalEntityType(entityType);
  const department = await prisma.workspaceDepartment.findFirst({ where: { workspaceId, key: departmentKey } });
  if (!department) return [];
  const [relations, companyScopes] = await Promise.all([
    prisma.organizationalDepartmentRelation.findMany({
      where: { workspaceId, entityType, departmentId: department.id },
      select: { entityId: true }
    }),
    includeCompanyWide ? prisma.organizationalScope.findMany({
      where: { workspaceId, entityType, scopeType: "company" },
      select: { entityId: true }
    }) : Promise.resolve([])
  ]);
  return [...new Set([...relations, ...companyScopes].map((item) => item.entityId))];
}
