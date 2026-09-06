import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { gapsFor, loadCapabilities, procedureInclude, projectInclude, readinessInput } from "./application-graph-projection.service";
import { calculateApplicationReadiness } from "./readiness";
type AgentContextRecord = {
  id: string;
  parentId: string | null;
  recordType: string;
  key: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  functionalState: string;
  verificationState: string;
  source: string;
  metadata: Prisma.JsonValue;
};

function normalizedTerms(value: string) {
  const ignored = new Set(["the", "and", "for", "with", "from", "this", "that", "task", "status", "created", "updated", "null", "true", "false"]);
  return [...new Set(value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((term) => term.length >= 3 && !ignored.has(term)))].slice(0, 40);
}

function executionRecordSelection<T extends AgentContextRecord>(records: T[], query: string) {
  const terms = normalizedTerms(query);
  const typeWeight: Record<string, number> = {
    application_goal: 100,
    architecture_principle: 90,
    architecture_decision: 85,
    architecture_requirement: 80,
    architecture_layer: 65,
    architecture_component: 60,
    architecture_document: 50,
    architecture_section: 20
  };
  const score = (record: T) => {
    const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata as Record<string, unknown> : {};
    const searchable = `${record.title} ${record.description ?? ""} ${typeof metadata.filePath === "string" ? metadata.filePath : ""}`.toLowerCase().normalize("NFKD");
    const matches = terms.reduce((sum, term) => sum + (searchable.includes(term) ? 18 : 0), 0);
    const legacyBonus = metadata.sourceKind === "legacy_assumption" ? 6 : 0;
    return (typeWeight[record.recordType] ?? 10) + matches + legacyBonus;
  };
  const byId = new Map(records.map((record) => [record.id, record]));
  const selectedIds = new Set<string>();
  for (const candidate of records.slice().sort((left, right) => score(right) - score(left) || left.title.localeCompare(right.title))) {
    if (selectedIds.size >= 72) break;
    const chain: string[] = [];
    let current: T | undefined = candidate;
    while (current && !selectedIds.has(current.id)) {
      chain.push(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    if (selectedIds.size + chain.length > 72) continue;
    chain.reverse().forEach((id) => selectedIds.add(id));
  }
  const descriptionBudget = 60_000;
  let usedDescriptionCharacters = 0;
  const selected = records
    .filter((record) => selectedIds.has(record.id))
    .sort((left, right) => score(right) - score(left) || left.title.localeCompare(right.title))
    .map((record) => {
      const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata as Record<string, unknown> : {};
      const remaining = Math.max(0, descriptionBudget - usedDescriptionCharacters);
      const description = record.description?.slice(0, Math.min(1600, remaining)) || null;
      usedDescriptionCharacters += description?.length ?? 0;
      return {
        id: record.id,
        parentId: record.parentId,
        recordType: record.recordType,
        key: record.key,
        title: record.title,
        description,
        priority: record.priority,
        status: record.status,
        functionalState: record.functionalState,
        verificationState: record.verificationState,
        source: record.source,
        metadata: {
          sourceSystem: metadata.sourceSystem ?? null,
          sourceKind: metadata.sourceKind ?? "canonical_documentation",
          sourceId: metadata.sourceId ?? null,
          filePath: metadata.filePath ?? null,
          headingPath: metadata.headingPath ?? []
        }
      };
    });
  const documentationIndex = records.flatMap((record) => {
    const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata as Record<string, unknown> : {};
    return record.recordType === "architecture_document" && typeof metadata.filePath === "string" ? [{
      id: record.id,
      title: record.title,
      filePath: metadata.filePath,
      sourceSystem: metadata.sourceSystem ?? null,
      sourceKind: metadata.sourceKind ?? "canonical_documentation"
    }] : [];
  });
  return {
    records: selected,
    documentationIndex,
    selection: {
      profile: "execution",
      totalRecordCount: records.length,
      selectedRecordCount: selected.length,
      omittedRecordCount: Math.max(0, records.length - selected.length),
      queryTerms: terms,
      descriptionCharacterBudget: descriptionBudget,
      usedDescriptionCharacters
    }
  };
}


export async function loadApplicationAgentContext(workspaceId: string, applicationId: string, executionProfile = false, contextQuery = "", db: Prisma.TransactionClient = prisma) {
  const application = await db.application.findFirst({
    where: { id: applicationId, workspaceId: workspaceId },
    include: {
      repositories: true,
      technologies: { include: { technologyDefinition: true } },
      architecture: { include: { technologyDefinition: true } },
      interfaces: true,
      offerings: true,
      procedures: { include: { procedure: { include: procedureInclude } }, orderBy: { createdAt: "asc" } },
      projects: { include: { project: { include: projectInclude } }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!application) return null;
  const capabilities = await loadCapabilities(application.id, db);
  const [records, genericEvidence, entityRelations] = await Promise.all([
    db.companyRecord.findMany({ where: { workspaceId: workspaceId, applicationId: application.id, status: { not: "archived" } }, orderBy: [{ recordType: "asc" }, { priority: "asc" }] }),
    db.evidenceRecord.findMany({ where: { workspaceId: workspaceId, OR: [{ entityType: "application", entityId: application.id }, { entityId: { in: await db.companyRecord.findMany({ where: { workspaceId: workspaceId, applicationId: application.id }, select: { id: true } }).then((items) => items.map((item) => item.id)) } }] } }),
    db.dependency.findMany({ where: { workspaceId: workspaceId, status: { not: "archived" }, OR: [{ fromEntityType: "application", fromEntityId: application.id }, { toEntityType: "application", toEntityId: application.id }] } })
  ]);
  const gaps = gapsFor(capabilities);
  const readiness = calculateApplicationReadiness(readinessInput(capabilities));
  const executionContext = executionProfile
    ? executionRecordSelection(records, contextQuery.slice(0, 4000))
    : null;
  const executionApplication = executionProfile ? {
    ...application,
    architecture: undefined,
    technologies: undefined,
    interfaces: undefined,
    offerings: undefined,
    procedures: undefined,
    projects: undefined
  } : application;
  const executionArchitecture = executionProfile ? application.architecture.map((component) => {
    const metadata = component.metadata && typeof component.metadata === "object" && !Array.isArray(component.metadata) ? component.metadata as Record<string, unknown> : {};
    return {
      id: component.id,
      type: component.type,
      name: component.name,
      description: component.description?.slice(0, 1000) ?? null,
      status: component.status,
      technology: component.technologyDefinition ? { id: component.technologyDefinition.id, name: component.technologyDefinition.name } : null,
      metadata: {
        sourceSystem: metadata.sourceSystem ?? null,
        sourceKind: metadata.sourceKind ?? null,
        sourceId: metadata.sourceId ?? null,
        parentSourceId: metadata.parentSourceId ?? null,
        atomType: metadata.atomType ?? null,
        layer: metadata.layer ?? null,
        module: metadata.module ?? null,
        feature: metadata.feature ?? null,
        completionPercent: metadata.completionPercent ?? null,
        verificationStatus: metadata.verificationStatus ?? null,
        riskLevel: metadata.riskLevel ?? null,
        filePath: metadata.filePath ?? null,
        relations: metadata.relations ?? []
      }
    };
  }) : application.architecture;
  return {
      schemaVersion: "application-agent-context-v2",
      generatedAt: new Date().toISOString(),
      application: executionApplication,
      lifecycle: { innovation: application.innovationStage, product: application.productStage, status: application.status },
      targetCapabilities: capabilities.filter((item) => item.applicability !== "not_applicable").map((item) => ({ id: item.id, definition: item.capabilityDefinition, applicability: item.applicability, targetState: item.targetState })),
      observedCapabilities: capabilities.map((item) => ({ id: item.id, definitionKey: item.capabilityDefinition.key, observedState: item.observedState, observedSummary: item.observedSummary, evidence: item.evidence })),
      gaps,
      blockers: gaps.filter((gap) => gap.blocked),
      dependencies: capabilities.flatMap((item) => item.dependenciesFrom),
      companyRecords: executionContext?.records ?? records,
      documentationIndex: executionContext?.documentationIndex ?? undefined,
      contextSelection: executionContext?.selection ?? { profile: "complete", totalRecordCount: records.length, selectedRecordCount: records.length, omittedRecordCount: 0 },
      genericEvidence,
      entityRelations,
      operatingModel: {
        applicationProcedures: application.procedures,
        capabilityProcedures: capabilities.flatMap((item) => item.capabilityDefinition.procedures.map((link) => ({
          capabilityId: item.id,
          capabilityKey: item.capabilityDefinition.key,
          ...link
        }))),
        projects: application.projects
      },
      architecture: executionArchitecture,
      technologies: application.technologies,
      interfaces: application.interfaces,
      evidenceSummary: {
        total: capabilities.reduce((sum, item) => sum + item.evidence.length, 0),
        verified: capabilities.reduce((sum, item) => sum + item.evidence.filter((evidence) => evidence.verificationStatus === "verified").length, 0),
        requiredWithoutEvidence: capabilities.filter((item) => item.applicability === "required" && item.evidence.length === 0).map((item) => item.capabilityDefinition.key)
      },
      readiness,
      authority: {
        sourceOfTruth: "roost",
        declarationIsNotObservation: true,
        evidenceDoesNotAutomaticallyPromoteObservedState: true
      }
  };
}
