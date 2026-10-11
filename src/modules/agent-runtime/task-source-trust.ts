import { createHash } from "node:crypto";
import type { Prisma, TaskSourceReview } from "@prisma/client";

export const taskSourceTypes = [
  "procedure", "policy", "decision", "evidence", "note", "knowledge_item",
  "application_evidence", "application_architecture", "application_interface",
  "application_capability", "drive_snapshot"
] as const;
export type TaskSourceType = typeof taskSourceTypes[number];
type Db = Prisma.TransactionClient;
type Source = { type: TaskSourceType; content: Record<string, unknown>; revision: Date; applicationId: string | null;
  projectId: string | null; taskId: string | null; origin: string; originKind: string; status: string;
  verification: string; sourceTable: string; originKindValid: boolean };

const forbiddenOrigin = /(?:^|[\s_-])(bootstrap|certification|synthetic|fixture|test|superseded|unverified|legacy_assumption|runtime_redaction)(?:$|[\s_-])/i;
const jsonObject = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const string = (value: unknown) => typeof value === "string" ? value : "";

// Only these explicit fields are ever digest-bound and offered to an agent.
// Never pass a model row or arbitrary metadata through to an ordinary read.
export function projectTaskSource(type: TaskSourceType, row: any, scopeWorkspaceId?: string): Source {
  const metadata = jsonObject(row.metadata);
  const origin = string(row.source) || string(row.sourceProvider) || string(metadata.sourceKind) || "roost_owner_review";
  const originKind = string(metadata.sourceKind);
  const originKindValid = metadata.sourceKind === undefined || typeof metadata.sourceKind === "string";
  const base = { id: row.id, sourceType: type };
  let content: Record<string, unknown>, applicationId: string | null = row.applicationId ?? null;
  let projectId: string | null = row.projectId ?? null, taskId: string | null = row.taskId ?? null;
  let status = string(row.status) || "active", verification = "owner_attested", sourceTable = "";
  switch (type) {
    case "procedure":
      sourceTable = "procedures";
      content = { ...base, title: row.name, name: row.name, purpose: row.purpose, scope: row.scope, version: row.version,
        status: row.status, requiredTools: row.requiredTools, requiredPermissions: row.requiredPermissions,
        expectedResult: row.expectedResult, steps: row.steps.map((step: any) => ({ id: step.id, order: step.stepOrder,
          instruction: step.instruction, type: step.stepType, expectedInput: step.expectedInput,
          expectedOutput: step.expectedOutput, validationRule: step.validationRule, rollbackInstruction: step.rollbackInstruction })) };
      break;
    case "policy":
      sourceTable = "policies";
      content = { ...base, title: row.name, name: row.name, description: row.description, appliesTo: row.appliesTo, ruleType: row.ruleType,
        severity: row.severity, enforcementMode: row.enforcementMode, status: row.status };
      break;
    case "decision":
      sourceTable = "decisions";
      content = { ...base, title: row.title, context: row.context, problem: row.problem, decision: row.decision,
        rationale: row.rationale, alternatives: row.alternatives, consequences: row.consequences,
        outcome: row.outcome, status: row.status, source: row.source, supersedesId: row.supersedesId };
      break;
    case "evidence":
    case "application_evidence":
      sourceTable = type === "evidence" ? "evidence_records" : "application_evidence";
      status = string(row.verificationStatus); verification = status;
      content = { ...base, entityType: row.entityType ?? "application", entityId: row.entityId ?? row.applicationId,
        title: row.reference, reference: row.reference, url: row.url, description: row.description,
        evidenceType: row.type, source: row.source, verificationStatus: row.verificationStatus,
        observedAt: row.observedAt.toISOString(), verifiedAt: row.verifiedAt?.toISOString() ?? null };
      break;
    case "note":
      sourceTable = "notes";
      content = { ...base, title: row.content.slice(0, 160), content: row.content, status: row.status,
        projectId: row.projectId, taskId: row.taskId, source: row.source };
      break;
    case "knowledge_item":
      sourceTable = "knowledge_items";
      content = { ...base, title: row.title, itemType: row.itemType, summary: row.summary,
        sourceProvider: row.sourceProvider, sourceExternalId: row.sourceExternalId, url: row.url, status: row.status };
      break;
    case "application_architecture":
      sourceTable = "application_architecture_components";
      content = { ...base, title: row.name, componentType: row.type, description: row.description,
        version: row.version, status: row.status };
      break;
    case "application_interface":
      sourceTable = "application_interfaces";
      content = { ...base, title: row.name, interfaceType: row.type, key: row.key, reference: row.reference,
        description: row.description, requiresApproval: row.requiresApproval, status: row.status };
      break;
    case "application_capability":
      sourceTable = "application_capabilities";
      status = string(row.lifecycleStatus);
      content = { ...base, title: row.capabilityDefinition?.name ?? row.capabilityDefinitionId,
        definitionId: row.capabilityDefinitionId, definitionKey: row.capabilityDefinition?.key ?? null,
        applicability: row.applicability, targetState: row.targetState, observedState: row.observedState,
        lifecycleStatus: row.lifecycleStatus, targetDescription: row.targetDescription,
        observedSummary: row.observedSummary, rationale: row.rationale };
      break;
    case "drive_snapshot":
      sourceTable = "google_drive_content_snapshots";
      status = string(row.scanStatus);
      content = { ...base, title: row.googleDriveFile.name, sourceRevisionId: row.sourceRevisionId,
        contentKind: row.contentKind, extractedText: row.extractedText, structuredPreview: row.structuredPreview,
        summary: row.summary, scanStatus: row.scanStatus };
      break;
  }
  // Drive rescans update read timestamps even when the provider revision and
  // extracted body are unchanged. Bind that source to its stable snapshot ID
  // plus the digest of its visible content; a material change still revokes it.
  const revisionAt: Date = type === "drive_snapshot" ? row.createdAt : row.updatedAt;
  return { type, content: { ...content, workspaceId: row.workspaceId ?? row.application?.workspaceId ?? scopeWorkspaceId ?? null,
    applicationId, projectId, taskId, origin, originKind,
    sourceStatus: status, verificationState: verification, revision: revisionAt.toISOString(),
    updatedAt: revisionAt.toISOString() }, revision: revisionAt,
    applicationId, projectId, taskId, origin, originKind, status, verification, sourceTable, originKindValid };
}

export function taskSourceDigest(source: Source) {
  return createHash("sha256").update(JSON.stringify(source.content)).digest("hex");
}

export function taskSourceEligible(source: Source, review: TaskSourceReview | undefined, workspaceId: string, taskId: string,
  applicationIds: ReadonlySet<string>, projectId: string | null, now = new Date()) {
  if (!review || review.action !== "approve" || review.workspaceId !== workspaceId || review.taskId !== taskId
    || review.sourceType !== source.type || review.sourceId !== source.content.id
    || review.environment !== (process.env.NODE_ENV === "test" ? "isolated_test" : "production")
    || review.sourceRevision.getTime() !== source.revision.getTime() || review.contentDigest !== taskSourceDigest(source)
    || review.validFrom > now || review.validUntil <= now || forbiddenOrigin.test(source.origin)
    || forbiddenOrigin.test(source.originKind) || !source.originKindValid
    || source.projectId && source.projectId !== projectId || source.taskId && source.taskId !== taskId
    || source.applicationId && !applicationIds.has(source.applicationId)) return false;
  if (["procedure", "policy", "knowledge_item", "application_architecture", "application_interface"].includes(source.type)
    && source.status !== "active") return false;
  if (source.type === "decision" && !["active", "accepted", "approved"].includes(source.status)) return false;
  if (source.type === "note" && source.status !== "active") return false;
  if (source.type === "application_capability" && ["proposed", "deprecated"].includes(source.status)) return false;
  if (["evidence", "application_evidence"].includes(source.type) && source.verification !== "verified") return false;
  if (source.type === "evidence" && source.content.entityType === "task" && source.content.entityId !== taskId) return false;
  if (source.type === "evidence" && source.content.entityType === "application"
    && !applicationIds.has(String(source.content.entityId))) return false;
  if (source.type === "evidence" && !["task", "application"].includes(String(source.content.entityType))) return false;
  if (source.type === "drive_snapshot" && source.status !== "completed") return false;
  return true;
}

export async function taskSourceReviews(db: Db, workspaceId: string, taskId: string) {
  const rows = await db.taskSourceReview.findMany({ where: { workspaceId, taskId }, orderBy: { ordinal: "desc" } });
  const latest = new Map<string, TaskSourceReview>();
  for (const row of rows) {
    const key = `${row.sourceType}:${row.sourceId}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return latest;
}

export function taskSourceProvenance(source: Source, review: TaskSourceReview) {
  return { reviewId: review.id, classification: review.classification, provenance: review.provenance,
    environment: review.environment, originSource: source.origin, originKind: source.originKind,
    sourceStatus: source.status,
    verificationState: source.verification, verificationMethod: review.verificationMethod,
    verificationRef: review.verificationRef, inclusionReason: review.inclusionReason,
    contentDigest: review.contentDigest, sourceRevision: review.sourceRevision.toISOString(),
    validFrom: review.validFrom.toISOString(), validUntil: review.validUntil.toISOString(),
    reviewedAt: review.createdAt.toISOString(), reviewedByUserId: review.actorUserId };
}

export async function taskSourceCandidate(db: Db, workspaceId: string, type: TaskSourceType, sourceId: string) {
  let row: any = null;
  switch (type) {
    case "procedure": row = await db.procedure.findFirst({ where: { workspaceId, id: sourceId }, include: { steps: { orderBy: { stepOrder: "asc" } } } }); break;
    case "policy": row = await db.policy.findFirst({ where: { workspaceId, id: sourceId } }); break;
    case "decision": row = await db.decision.findFirst({ where: { workspaceId, id: sourceId } }); break;
    case "evidence": row = await db.evidenceRecord.findFirst({ where: { workspaceId, id: sourceId } }); break;
    case "note": row = await db.note.findFirst({ where: { workspaceId, id: sourceId } }); break;
    case "knowledge_item": row = await db.knowledgeItem.findFirst({ where: { workspaceId, id: sourceId } }); break;
    case "application_evidence": row = await db.applicationEvidence.findFirst({ where: { workspaceId, id: sourceId } }); break;
    case "application_architecture": row = await db.applicationArchitectureComponent.findFirst({ where: { id: sourceId }, include: { application: { select: { workspaceId: true } } } }); break;
    case "application_interface": row = await db.applicationInterface.findFirst({ where: { id: sourceId }, include: { application: { select: { workspaceId: true } } } }); break;
    case "application_capability": row = await db.applicationCapability.findFirst({ where: { id: sourceId }, include: { application: { select: { workspaceId: true } }, capabilityDefinition: { select: { workspaceId: true, name: true, key: true } } } }); break;
    case "drive_snapshot": row = await db.googleDriveContentSnapshot.findFirst({ where: { workspaceId, id: sourceId }, include: { googleDriveFile: { select: { workspaceId: true, name: true, trashed: true, headRevisionId: true } } } }); break;
  }
  if (!row || row.application?.workspaceId && row.application.workspaceId !== workspaceId) return null;
  if (type === "application_capability" && row.capabilityDefinition.workspaceId !== workspaceId) return null;
  if (type === "drive_snapshot" && (row.googleDriveFile.workspaceId !== workspaceId || row.googleDriveFile.trashed || row.googleDriveFile.headRevisionId !== row.sourceRevisionId)) return null;
  return projectTaskSource(type, row);
}

export async function taskSourceScope(db: Db, workspaceId: string, taskId: string, agentId?: string) {
  const task = await db.task.findFirst({ where: { id: taskId, workspaceId, status: { not: "archived" },
    ...(agentId ? { assignedWorkforceEntityId: agentId } : {}) }, select: { id: true, projectId: true } });
  if (!task) return null;
  const links = task.projectId ? await db.applicationProject.findMany({ where: { projectId: task.projectId, application: { workspaceId } },
    select: { applicationId: true } }) : [];
  return { task, applicationIds: new Set(links.map(link => link.applicationId)) };
}

export async function taskSourcesForAgent(db: Db, workspaceId: string, taskId: string, agentId: string) {
  const scope = await taskSourceScope(db, workspaceId, taskId, agentId);
  if (!scope) return null;
  const reviews = await taskSourceReviews(db, workspaceId, taskId);
  const sources = [];
  for (const review of reviews.values()) {
    if (!taskSourceTypes.includes(review.sourceType as TaskSourceType)) continue;
    const source = await taskSourceCandidate(db, workspaceId, review.sourceType as TaskSourceType, review.sourceId);
    if (source && taskSourceEligible(source, review, workspaceId, taskId, scope.applicationIds, scope.task.projectId))
      sources.push({ content: source.content, provenance: taskSourceProvenance(source, review) });
  }
  return sources.sort((a, b) => string(a.content.title).localeCompare(string(b.content.title)) ||
    string(a.content.id).localeCompare(string(b.content.id)));
}
