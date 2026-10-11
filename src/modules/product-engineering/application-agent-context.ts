import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { gapsFor, loadCapabilities, procedureInclude, projectInclude, readinessInput } from "./application-graph-projection.service";
import { calculateApplicationReadiness } from "./readiness";
import { companySourceApprovedContent, companySourceEligible, companySourceProvenance, companySourceReviews } from "../agent-runtime/company-source-trust";
import { projectTaskSource, taskSourceEligible, taskSourceProvenance, taskSourceReviews, type TaskSourceType } from "../agent-runtime/task-source-trust";
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
    if (selectedIds.size >= 8) break;
    const chain: string[] = [];
    let current: T | undefined = candidate;
    while (current && !selectedIds.has(current.id)) {
      chain.push(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    if (selectedIds.size + chain.length > 8) continue;
    chain.reverse().forEach((id) => selectedIds.add(id));
  }
  // Keep the selected records inside the Worker's sealed 128 KiB input cap.
  // The full graph remains available in Roost; execution gets a ranked slice.
  const descriptionBudget = 4_000;
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


export async function loadApplicationAgentContext(workspaceId: string, applicationId: string, executionProfile = false, contextQuery = "", db: Prisma.TransactionClient = prisma, targetComponentId?: string, taskId?: string) {
  const application = await db.application.findFirst({
    where: { id: applicationId, workspaceId: workspaceId },
    include: {
      repositories: true,
      technologies: { include: { technologyDefinition: true } },
      architecture: { include: { technologyDefinition: true } },
      interfaces: true,
      offerings: true,
      procedures: { include: { procedure: { include: procedureInclude } }, orderBy: { createdAt: "asc" } },
      // Watch only the project membership delivered to the execution. Loading
      // unused sibling tasks here would invalidate another task on claim.
      projects: { include: { project: executionProfile ? true : { include: projectInclude } }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!application) return null;
  const otherReviews = taskId ? await taskSourceReviews(db, workspaceId, taskId) : null;
  const taskScope = taskId ? await db.task.findFirst({ where: { id: taskId, workspaceId }, select: { projectId: true } }) : null;
  const taskProjectId = taskScope?.projectId ?? null;
  const scopedApplications = new Set(taskProjectId && application.projects.some(link => link.projectId === taskProjectId) ? [application.id] : []);
  const approved = <T extends { id: string }>(type: TaskSourceType, rows: T[]) => !otherReviews ? rows : rows.filter(row => {
    if (type === "application_capability" && (row as any).capabilityDefinition?.workspaceId !== workspaceId) return false;
    const source = projectTaskSource(type, row, workspaceId);
    return taskSourceEligible(source, otherReviews.get(`${type}:${row.id}`), workspaceId, taskId!, scopedApplications, taskProjectId);
  });
  const allCapabilities = await loadCapabilities(application.id, db);
  const eligibleCapabilities = approved("application_capability", allCapabilities);
  const eligibleCapabilityIds = new Set(eligibleCapabilities.map(item => item.id));
  const capabilities = eligibleCapabilities.map(item => ({ ...item,
    evidence: approved("application_evidence", item.evidence),
    dependenciesFrom: item.dependenciesFrom.filter(link => !taskId || eligibleCapabilityIds.has(link.toCapabilityId)) }));
  const [candidateRecords, genericEvidence, entityRelations] = await Promise.all([
    db.companyRecord.findMany({ where: { workspaceId: workspaceId, applicationId: application.id, status: { not: "archived" } }, orderBy: [{ recordType: "asc" }, { priority: "asc" }] }),
    db.evidenceRecord.findMany({ where: { workspaceId: workspaceId, OR: [{ entityType: "application", entityId: application.id }, { entityId: { in: await db.companyRecord.findMany({ where: { workspaceId: workspaceId, applicationId: application.id }, select: { id: true } }).then((items) => items.map((item) => item.id)) } }] } }),
    db.dependency.findMany({ where: { workspaceId: workspaceId, status: { not: "archived" }, OR: [{ fromEntityType: "application", fromEntityId: application.id }, { toEntityType: "application", toEntityId: application.id }] } })
  ]);
  const reviews = taskId ? await companySourceReviews(db, workspaceId, taskId, candidateRecords.map(record => record.id)) : null;
  const records = reviews ? candidateRecords.filter(record => companySourceEligible(record, reviews.get(record.id), taskId!, application.id)) : candidateRecords;
  // Derived graph prose and relationship metadata have no independent source
  // review. Keep those views for humans; the Worker receives source projections.
  const gaps = taskId && executionProfile ? [] : gapsFor(capabilities);
  const readiness = taskId && executionProfile ? null : calculateApplicationReadiness(readinessInput(capabilities));
  const executionContext = executionProfile && !taskId
    ? executionRecordSelection(records, contextQuery.slice(0, 4000))
    : null;
  const approvedSelection = taskId && executionProfile ? records.slice().sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)).slice(0, 8) : null;
  const executionApplication = executionProfile ? {
    id: application.id, workspaceId: application.workspaceId, name: application.name,
    slug: application.slug, status: application.status, repositories: taskId
      ? application.repositories.filter(repository => repository.isPrimary || application.repositories.length === 1)
        .map(repository => ({ id: repository.id, url: repository.url, isPrimary: repository.isPrimary }))
      : application.repositories,
    updatedAt: application.updatedAt
  } : application;
  // A task-scoped execution receives its pinned component, rather than every
  // historical architecture import (which may contain unrelated sensitive data).
  const architectureSource = executionProfile && targetComponentId
    ? application.architecture.filter(component => component.id === targetComponentId)
    : application.architecture;
  const executionArchitecture = executionProfile ? approved("application_architecture", architectureSource).map((component) => {
    const source = projectTaskSource("application_architecture", component, workspaceId);
    return { ...source.content, type: source.content.componentType, name: source.content.title,
      provenance: otherReviews ? taskSourceProvenance(source, otherReviews.get(`application_architecture:${component.id}`)!) : null };
  }) : application.architecture;
  // The task compiler provides the selected task and its pinned requirements.
  // Project membership is useful context, but embedding every task in a linked
  // project can exhaust the Worker's sealed input before the bounded task and
  // repository evidence are added. Keep the project identity and status.
  const executionProjects = executionProfile ? application.projects.filter(link => !taskId || link.projectId === taskProjectId).map((link) => ({
    applicationId: link.applicationId,
    projectId: link.projectId,
    relationType: link.relationType,
      project: taskId ? { id: link.project.id } : {
        id: link.project.id, name: link.project.name, status: link.project.status
      }
  })) : application.projects;
  return {
      schemaVersion: "application-agent-context-v2",
      generatedAt: new Date().toISOString(),
      application: executionApplication,
      lifecycle: { innovation: application.innovationStage, product: application.productStage, status: application.status },
      targetCapabilities: capabilities.filter((item) => item.applicability !== "not_applicable").map((item) => {
        const source = taskId ? projectTaskSource("application_capability", item, workspaceId) : null;
        return { id: item.id,
          definition: source ? { id: source.content.definitionId, key: source.content.definitionKey, name: source.content.title } : item.capabilityDefinition,
          applicability: source ? source.content.applicability : item.applicability,
          targetState: source ? source.content.targetState : item.targetState,
          ...(source && otherReviews ? { provenance: taskSourceProvenance(source, otherReviews.get(`application_capability:${item.id}`)!) } : {}) };
      }),
      observedCapabilities: capabilities.map((item) => {
        const source = taskId ? projectTaskSource("application_capability", item, workspaceId) : null;
        return { id: item.id, definitionKey: source ? source.content.definitionKey : item.capabilityDefinition.key,
          observedState: source ? source.content.observedState : item.observedState,
          observedSummary: source ? source.content.observedSummary : item.observedSummary,
          evidence: taskId ? item.evidence.map(row => {
            const evidenceSource = projectTaskSource("application_evidence", row, workspaceId);
            return { ...evidenceSource.content, provenance: taskSourceProvenance(evidenceSource, otherReviews!.get(`application_evidence:${row.id}`)!) };
          }) : item.evidence,
          ...(source && otherReviews ? { provenance: taskSourceProvenance(source, otherReviews.get(`application_capability:${item.id}`)!) } : {}) };
      }),
      gaps,
      blockers: gaps.filter((gap) => gap.blocked),
      dependencies: taskId && executionProfile ? [] : capabilities.flatMap((item) => item.dependenciesFrom),
      companyRecords: approvedSelection ? approvedSelection.map(record => ({ ...companySourceApprovedContent(record), provenance: companySourceProvenance(reviews!.get(record.id)!, record) })) : executionContext?.records ?? records,
      documentationIndex: approvedSelection ? approvedSelection.flatMap(record => {
        const content = companySourceApprovedContent(record);
        return content.recordType === "architecture_document" && typeof content.filePath === "string" ? [{ id: content.id, title: content.title, filePath: content.filePath, sourceSystem: content.sourceSystem, sourceKind: content.sourceKind }] : [];
      }) : executionContext?.documentationIndex ?? undefined,
      contextSelection: approvedSelection ? { profile: "execution", totalRecordCount: records.length, selectedRecordCount: approvedSelection.length, omittedRecordCount: records.length - approvedSelection.length, approvalBound: true } : executionContext?.selection ?? { profile: "complete", totalRecordCount: records.length, selectedRecordCount: records.length, omittedRecordCount: 0 },
      genericEvidence: taskId && executionProfile ? approved("evidence", genericEvidence.filter(item => item.entityType === "application" && item.entityId === application.id)).map(row => {
        const source = projectTaskSource("evidence", row, workspaceId);
        return { ...source.content, provenance: taskSourceProvenance(source, otherReviews!.get(`evidence:${row.id}`)!) };
      }) : genericEvidence,
      entityRelations: taskId && executionProfile ? [] : entityRelations,
      operatingModel: {
        applicationProcedures: taskId && executionProfile ? application.procedures.filter(link => approved("procedure", [link.procedure]).length)
          .map(link => { const source = projectTaskSource("procedure", link.procedure, workspaceId);
            return { procedureId: link.procedureId, procedure: { ...source.content,
              provenance: taskSourceProvenance(source, otherReviews!.get(`procedure:${link.procedureId}`)!) } }; }) : application.procedures,
        capabilityProcedures: taskId && executionProfile ? [] : capabilities.flatMap((item) => item.capabilityDefinition.procedures.map((link) => ({
          capabilityId: item.id,
          capabilityKey: item.capabilityDefinition.key,
          ...link
        }))),
        projects: executionProjects
      },
      architecture: executionArchitecture,
      technologies: taskId && executionProfile ? [] : application.technologies,
      interfaces: taskId && executionProfile ? approved("application_interface", application.interfaces).map(row => {
        const source = projectTaskSource("application_interface", row, workspaceId);
        return { ...source.content, provenance: taskSourceProvenance(source, otherReviews!.get(`application_interface:${row.id}`)!) };
      }) : application.interfaces,
      evidenceSummary: taskId && executionProfile ? null : {
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
