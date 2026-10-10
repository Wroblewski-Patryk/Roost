import { createHash } from "node:crypto";
import type { CompanyRecord, CompanySourceReview, Prisma } from "@prisma/client";

export function companySourceDigest(record: CompanyRecord) {
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata as Record<string, unknown> : {};
  const body = {
    id: record.id, workspaceId: record.workspaceId, applicationId: record.applicationId,
    recordType: record.recordType, title: record.title, description: record.description,
    businessPurpose: record.businessPurpose, desiredState: record.desiredState,
    expectedBehavior: record.expectedBehavior, status: record.status,
    verificationState: record.verificationState, source: record.source,
    sourceKind: metadata.sourceKind ?? null, sourceSystem: metadata.sourceSystem ?? null,
    sourceId: metadata.sourceId ?? null, filePath: metadata.filePath ?? null,
    revision: record.updatedAt.toISOString()
  };
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

const forbiddenOrigin = /(?:^|[\s_-])(bootstrap|certification|synthetic|fixture|test|superseded|unverified|legacy_assumption|runtime_redaction)(?:$|[\s_-])/i;
export function companySourceEligible(record: CompanyRecord, review: CompanySourceReview | undefined, taskId: string, applicationId: string | null, now = new Date()) {
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata as Record<string, unknown> : {};
  if (!review || review.action !== "approve" || review.taskId !== taskId || review.recordId !== record.id || review.workspaceId !== record.workspaceId
    || review.environment !== (process.env.NODE_ENV === "test" ? "isolated_test" : "production")
    || !["active", "approved", "accepted"].includes(record.status) || ["failed", "waived"].includes(record.verificationState)
    || record.applicationId !== applicationId && record.applicationId !== null
    || forbiddenOrigin.test(record.source) || forbiddenOrigin.test(String(metadata.sourceKind ?? ""))
    || record.updatedAt.getTime() !== review.recordRevision.getTime() || companySourceDigest(record) !== review.contentDigest
    || review.validFrom > now || review.validUntil <= now) return false;
  return true;
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
