import { ApplicationStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { buildApplicationGraph } from "./application-graph";
import { calculateApplicationReadiness } from "./readiness";

export const procedureInclude = {
  process: true,
  qualityStandard: true,
  steps: { orderBy: { stepOrder: "asc" as const } }
};

export const projectInclude = {
  taskLists: { include: { tasks: { orderBy: [{ status: "asc" as const }, { updatedAt: "desc" as const }] } }, orderBy: { name: "asc" as const } },
  tasks: { where: { taskListId: null }, orderBy: [{ status: "asc" as const }, { updatedAt: "desc" as const }] }
};

export const capabilityInclude = {
  capabilityDefinition: {
    include: {
      domain: true,
      readinessDimension: true,
      features: true,
      procedures: { include: { procedure: { include: procedureInclude } }, orderBy: { createdAt: "asc" as const } }
    }
  },
  dimensions: { orderBy: { key: "asc" as const } },
  evidence: { orderBy: { observedAt: "desc" as const } },
  interfaces: { orderBy: { name: "asc" as const } },
  features: { include: { featureDefinition: true, evidence: true, interfaces: true } },
  dependenciesFrom: { include: { toCapability: { include: { capabilityDefinition: true } } } },
  dependenciesTo: { include: { fromCapability: { include: { capabilityDefinition: true } } } }
};

export async function loadCapabilities(applicationId: string) {
  return prisma.applicationCapability.findMany({
    where: { applicationId },
    include: capabilityInclude,
    orderBy: [{ capabilityDefinition: { domain: { position: "asc" } } }, { priority: "desc" }]
  });
}

export function readinessInput(capabilities: Awaited<ReturnType<typeof loadCapabilities>>) {
  return capabilities.map((capability) => ({
    id: capability.id,
    applicability: capability.applicability,
    observedState: capability.observedState,
    dimensionKey: capability.capabilityDefinition.readinessDimension?.key ?? capability.capabilityDefinition.domain.key,
    dimensionName: capability.capabilityDefinition.readinessDimension?.name ?? capability.capabilityDefinition.domain.name,
    dimensionWeight: capability.capabilityDefinition.readinessDimension?.weight ?? 100,
    dimensions: capability.dimensions.map((dimension) => ({ applicability: dimension.applicability, observedState: dimension.observedState })),
    evidence: capability.evidence.map((evidence) => ({ verificationStatus: evidence.verificationStatus })),
    blockedBy: capability.dependenciesFrom.map((dependency) => ({
      id: dependency.toCapability.id,
      observedState: dependency.toCapability.observedState,
      required: dependency.required
    }))
  }));
}

export function gapsFor(capabilities: Awaited<ReturnType<typeof loadCapabilities>>) {
  return capabilities
    .filter((capability) => capability.applicability !== "not_applicable" && !["complete", "verified"].includes(capability.observedState))
    .map((capability) => {
      const blockedBy = capability.dependenciesFrom
        .filter((dependency) => dependency.required && !["complete", "verified"].includes(dependency.toCapability.observedState))
        .map((dependency) => ({
          id: dependency.toCapability.id,
          key: dependency.toCapability.capabilityDefinition.key,
          name: dependency.toCapability.capabilityDefinition.name,
          observedState: dependency.toCapability.observedState
        }));
      return {
        id: capability.id,
        capabilityDefinitionId: capability.capabilityDefinitionId,
        key: capability.capabilityDefinition.key,
        name: capability.capabilityDefinition.name,
        domain: capability.capabilityDefinition.domain,
        applicability: capability.applicability,
        targetState: capability.targetState,
        observedState: capability.observedState,
        priority: capability.priority,
        evidenceCount: capability.evidence.length,
        verifiedEvidenceCount: capability.evidence.filter((evidence) => evidence.verificationStatus === "verified").length,
        blocked: blockedBy.length > 0,
        blockedBy,
        severity: (blockedBy.length ? "blocker" : capability.applicability === "required" ? "critical" : capability.applicability === "recommended" ? "high" : "medium") as "blocker" | "critical" | "high" | "medium"
      };
    })
    .sort((left, right) => {
      const order = { blocker: 0, critical: 1, high: 2, medium: 3 };
      return order[left.severity] - order[right.severity] || right.priority - left.priority;
    });
}

export async function loadApplicationGraphPacket(workspaceId: string, applicationId: string) {
  const [workspace, application, architecture, procedures, projects, records] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true } }),
    prisma.application.findFirst({ where: { id: applicationId, workspaceId, status: { not: ApplicationStatus.archived } } }),
    prisma.applicationArchitectureComponent.findMany({ where: { application: { id: applicationId, workspaceId } }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.applicationProcedure.findMany({ where: { application: { id: applicationId, workspaceId } }, include: { procedure: { include: procedureInclude } }, orderBy: { createdAt: "asc" } }),
    prisma.applicationProject.findMany({ where: { application: { id: applicationId, workspaceId } }, include: { project: { include: projectInclude } }, orderBy: { createdAt: "asc" } }),
    prisma.companyRecord.findMany({ where: { workspaceId, applicationId, status: { not: "archived" } }, orderBy: [{ recordType: "asc" }, { priority: "asc" }, { updatedAt: "desc" }] })
  ]);
  if (!workspace || !application) return null;
  const capabilities = await loadCapabilities(application.id);
  const readiness = calculateApplicationReadiness(readinessInput(capabilities));
  const evidenceCounts = await prisma.evidenceRecord.groupBy({ by: ["entityId"], where: { workspaceId, entityId: { in: records.map((record) => record.id) } }, _count: true });
  const evidenceById = new Map(evidenceCounts.map((entry) => [entry.entityId, entry._count]));
  const recordIds = records.map((record) => record.id);
  const relationships = await prisma.dependency.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ fromEntityType: "application", fromEntityId: application.id }, { toEntityType: "application", toEntityId: application.id }, { fromEntityId: { in: recordIds } }, { toEntityId: { in: recordIds } }] } });
  return buildApplicationGraph({ workspace, application, capabilities, architecture, procedures, projects, records: records.map((record) => ({ ...record, evidenceCount: evidenceById.get(record.id) ?? 0 })), relationships, readiness });
}
