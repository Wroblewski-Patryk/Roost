import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { isCanonicalDepartmentKey, resolveDepartmentEntry } from "../../operating-model/department-registry";

export const organizationalEntityTypes = [
  "goal", "task", "task_list", "procedure", "project", "requirement", "feature",
  "decision", "risk", "metric", "resource", "policy", "process", "application",
  "client", "workforce", "agent", "role", "company_record", "evidence", "file"
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
    case "agent": return Boolean(await prisma.agent.findFirst({ where: { id: entityId, workspaceId } }));
    case "role": return Boolean(await prisma.companyRole.findFirst({ where: { id: entityId, workspaceId } }));
    case "evidence": return Boolean(await prisma.evidenceRecord.findFirst({ where: { id: entityId, workspaceId } }));
    case "file": return Boolean(await prisma.googleDriveFile.findFirst({ where: { id: entityId, workspaceId } }));
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
  const inferredIds: string[] = [];

  if (entityType === "task" || entityType === "task_list") {
    const taskLists = await prisma.taskList.findMany({
      where: { workspaceId },
      select: { id: true, source: true, externalId: true }
    });
    const identities = taskLists.map((taskList) => ({
      taskList,
      provider: taskList.source === "clickup" ? "clickup" : taskList.source || "companycore",
      entityType: taskList.source === "clickup" ? "list" : "task_list",
      externalId: taskList.externalId || taskList.id
    }));
    const mappings = identities.length ? await prisma.externalContainerMapping.findMany({
      where: {
        workspaceId,
        OR: identities.map((identity) => ({
          provider: identity.provider,
          entityType: identity.entityType,
          externalId: identity.externalId
        }))
      },
      include: { area: true }
    }) : [];
    const mappingByIdentity = new Map(mappings.map((mapping) => [`${mapping.provider}:${mapping.entityType}:${mapping.externalId}`, mapping]));
    const contextualTaskListIds = identities.flatMap((identity) => {
      const mapping = mappingByIdentity.get(`${identity.provider}:${identity.entityType}:${identity.externalId}`);
      if (!mapping) return [];
      const raw = mapping.raw && typeof mapping.raw === "object" && !Array.isArray(mapping.raw) ? mapping.raw as Record<string, unknown> : {};
      const manualKey = typeof raw.manualDepartmentKey === "string" ? raw.manualDepartmentKey : null;
      const resolved = resolveDepartmentEntry(manualKey || mapping.area?.key || "");
      return resolved?.canonicalKey === departmentKey ? [identity.taskList.id] : [];
    });
    if (entityType === "task_list") {
      inferredIds.push(...contextualTaskListIds);
    } else if (contextualTaskListIds.length) {
      const tasks = await prisma.task.findMany({
        where: { workspaceId, taskListId: { in: contextualTaskListIds } },
        select: { id: true }
      });
      inferredIds.push(...tasks.map((task) => task.id));
    }
  }

  if (entityType === "file") {
    const files = await prisma.googleDriveFile.findMany({
      where: { workspaceId, trashed: false },
      select: { id: true, rawMetadata: true, operatingArea: { select: { key: true } } }
    });
    inferredIds.push(...files.flatMap((file) => {
      const metadata = file.rawMetadata && typeof file.rawMetadata === "object" && !Array.isArray(file.rawMetadata) ? file.rawMetadata as Record<string, unknown> : {};
      const explicitKey = typeof metadata.companycoreDepartmentKey === "string" && isCanonicalDepartmentKey(metadata.companycoreDepartmentKey)
        ? metadata.companycoreDepartmentKey
        : null;
      const resolved = explicitKey ? resolveDepartmentEntry(explicitKey) : resolveDepartmentEntry(file.operatingArea?.key || "");
      return resolved?.canonicalKey === departmentKey ? [file.id] : [];
    }));
  }

  return [...new Set([...relations, ...companyScopes].map((item) => item.entityId).concat(inferredIds))];
}
