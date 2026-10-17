import { createHash } from "node:crypto";
import type { CompanyRecord, CompanyRecordInventoryAssessment } from "@prisma/client";

export type InventoryCategory = "business" | "test" | "audit" | "unknown";

// Inventory assessments have their own full-record pin. Changing the older,
// task-bound companySourceDigest would silently change existing approvals.
function stableValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => [key, stableValue(item)]));
  return value;
}

export function companyRecordInventoryDigest(record: CompanyRecord) {
  return createHash("sha256").update(JSON.stringify(stableValue(record))).digest("hex");
}

export function companyRecordInventorySourceReference(record: CompanyRecord) {
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
    ? record.metadata as Record<string, unknown> : {};
  const sourceField = (key: string) => typeof metadata[key] === "string" ? metadata[key] as string : null;
  return {
    source: record.source, recordType: record.recordType, recordKey: record.key,
    applicationId: record.applicationId, sourceKind: sourceField("sourceKind"),
    sourceSystem: sourceField("sourceSystem"), sourceId: sourceField("sourceId"),
    sourceRoot: sourceField("sourceRoot"), sourceRevision: sourceField("sourceRevision"),
    filePath: sourceField("filePath")
  };
}

export function companyRecordInventoryState(record: CompanyRecord, latest: CompanyRecordInventoryAssessment | null) {
  if (!latest) return { status: "unassessed" as const, category: null, lastCategory: null,
    latestAssessmentId: null, assessedAt: null };
  const current = latest.recordRevision.getTime() === record.updatedAt.getTime()
    && latest.recordDigest === companyRecordInventoryDigest(record);
  return { status: current ? "current" as const : "stale" as const,
    category: current ? latest.category as InventoryCategory : null,
    lastCategory: latest.category as InventoryCategory, latestAssessmentId: latest.id,
    assessedAt: latest.createdAt.toISOString() };
}
