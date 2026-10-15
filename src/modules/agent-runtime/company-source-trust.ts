import { createHash } from "node:crypto";
import type { CompanyRecord, CompanySourceReview, Prisma } from "@prisma/client";
import { referenceSiteMetadataDigest } from "../product-engineering/reference-site-contract";

export function companySourceApprovedContent(record: CompanyRecord) {
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata as Record<string, unknown> : {};
  const sourceField = (key: string) => typeof metadata[key] === "string" ? metadata[key] as string : null;
  return {
    id: record.id, workspaceId: record.workspaceId, applicationId: record.applicationId,
    recordType: record.recordType, title: record.title, description: record.description,
    businessPurpose: record.businessPurpose, desiredState: record.desiredState,
    expectedBehavior: record.expectedBehavior, status: record.status,
    verificationState: record.verificationState, source: record.source,
    sourceKind: sourceField("sourceKind"), sourceSystem: sourceField("sourceSystem"),
    sourceId: sourceField("sourceId"), filePath: sourceField("filePath"),
    ...(record.recordType === "reference_site" ? {
      referenceUrl: sourceField("referenceUrl"), providerVersion: sourceField("providerVersion"),
      referenceSitePackageDigest: referenceSiteMetadataDigest(record.metadata)
    } : {}),
    revision: record.updatedAt.toISOString()
  };
}

export function companySourceDigest(record: CompanyRecord) {
  return createHash("sha256").update(JSON.stringify(companySourceApprovedContent(record))).digest("hex");
}

const forbiddenOrigin = /(?:^|[\s_-])(bootstrap|certification|synthetic|fixture|test|superseded|unverified|legacy_assumption|runtime_redaction)(?:$|[\s_-])/i;
export function companySourceEligible(record: CompanyRecord, review: CompanySourceReview | undefined, taskId: string, applicationId: string | null, now = new Date()) {
  return companySourceEligibility(record, review, taskId, applicationId, now).eligible;
}

// The owner audit and runtime read use the same decision, with reason codes
// retained for a task-bound explanation. No review means missing proof.
export function companySourceEligibility(record: CompanyRecord, review: CompanySourceReview | undefined, taskId: string, applicationId: string | null, now = new Date()) {
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata as Record<string, unknown> : {};
  const reasons: string[] = [];
  if (["sourceKind", "sourceSystem", "sourceId", "filePath"].some(key => metadata[key] != null && typeof metadata[key] !== "string")) reasons.push("invalid_source_metadata");
  if (record.recordType === "reference_site" && !referenceSiteMetadataDigest(record.metadata)) reasons.push("invalid_reference_package");
  if (!review) reasons.push("missing_review");
  else {
    if (review.action !== "approve") reasons.push(review.action === "withdraw" ? "withdrawn" : "not_approved");
    if (review.taskId !== taskId) reasons.push("wrong_task");
    if (review.recordId !== record.id) reasons.push("wrong_record");
    if (review.workspaceId !== record.workspaceId) reasons.push("wrong_workspace");
    if (review.environment !== (process.env.NODE_ENV === "test" ? "isolated_test" : "production")) reasons.push("wrong_environment");
    if (record.updatedAt.getTime() !== review.recordRevision.getTime()) reasons.push("changed_revision");
    if (companySourceDigest(record) !== review.contentDigest) reasons.push("changed_content");
    if (review.validFrom > now) reasons.push("not_yet_valid");
    if (review.validUntil <= now) reasons.push("expired");
  }
  if (!["active", "approved", "accepted"].includes(record.status)) reasons.push("record_inactive");
  if (["failed", "waived"].includes(record.verificationState)) reasons.push("verification_failed");
  if (record.applicationId !== applicationId && record.applicationId !== null) reasons.push("application_scope");
  if (forbiddenOrigin.test(record.source) || forbiddenOrigin.test(String(metadata.sourceKind ?? ""))) reasons.push("forbidden_provenance");
  return { eligible: reasons.length === 0, reasons };
}

export async function companySourceReviews(db: Prisma.TransactionClient, workspaceId: string, taskId: string, recordIds?: string[]) {
  if (recordIds && !recordIds.length) return new Map<string, CompanySourceReview>();
  const rows = await db.companySourceReview.findMany({ where: { workspaceId, taskId, ...(recordIds ? { recordId: { in: recordIds } } : {}) },
    orderBy: { ordinal: "desc" } });
  const latest = new Map<string, CompanySourceReview>();
  for (const row of rows) if (!latest.has(row.recordId)) latest.set(row.recordId, row);
  return latest;
}

export function companySourceProvenance(review: CompanySourceReview, record: CompanyRecord) {
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata as Record<string, unknown> : {};
  return {
    reviewId: review.id, classification: review.classification, provenance: review.provenance,
    environment: review.environment, originSource: record.source,
    originKind: typeof metadata.sourceKind === "string" ? metadata.sourceKind : null,
    originSystem: typeof metadata.sourceSystem === "string" ? metadata.sourceSystem : null,
    sourceStatus: record.status,
    recordVerificationState: record.verificationState, verificationLevel: "owner_attested",
    verificationMethod: review.verificationMethod,
    verificationRef: review.verificationRef, inclusionReason: review.inclusionReason,
    contentDigest: review.contentDigest, validFrom: review.validFrom.toISOString(),
    validUntil: review.validUntil.toISOString(), reviewedAt: review.createdAt.toISOString(),
    reviewedByUserId: review.actorUserId
  };
}
