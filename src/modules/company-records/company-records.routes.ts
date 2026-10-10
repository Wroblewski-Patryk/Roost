import { Router } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { createEvent } from "../events/event.service";
import { contextualEntityIds, departmentKeysAreValid, organizationalContextsForEntities, organizationalScopeTypes, replaceOrganizationalContext } from "../organizational-context/organizational-context.service";
import { companySourceDigest, companySourceEligible } from "../agent-runtime/company-source-trust";

const contextSchema = z.object({
  ownerDepartmentKey: z.string().nullable().optional(), relatedDepartmentKeys: z.array(z.string()).default([]),
  applicableDepartmentKeys: z.array(z.string()).default([]), scopes: z.array(z.object({
    type: z.enum(organizationalScopeTypes), entityId: z.string().trim().min(1).nullable().optional(), label: z.string().trim().max(160).nullable().optional()
  })).default([])
}).strict();
const functionalStates = ["discovered", "expected", "missing", "implemented", "partially_implemented", "broken", "verified_working", "unknown", "deprecated"] as const;
const verificationStates = ["not_started", "pending", "passed", "failed", "waived"] as const;
const createSchema = z.object({
  recordType: z.string().trim().min(1).max(80), key: z.string().trim().min(1).max(120).optional(), title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(10000).nullable().optional(), businessPurpose: z.string().trim().max(10000).nullable().optional(),
  currentState: z.string().trim().max(10000).nullable().optional(), desiredState: z.string().trim().max(10000).nullable().optional(),
  expectedBehavior: z.string().trim().max(10000).nullable().optional(), rationale: z.string().trim().max(10000).nullable().optional(),
  acceptanceCriteria: z.array(z.union([z.string(), z.record(z.unknown())])).default([]), priority: z.string().trim().min(1).max(40).optional(),
  status: z.string().trim().min(1).max(40).optional(), functionalState: z.enum(functionalStates).optional(), verificationState: z.enum(verificationStates).optional(),
  implementationCoverage: z.number().min(0).max(100).nullable().optional(), source: z.string().trim().min(1).max(80).optional(), dueDate: z.coerce.date().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(), projectId: z.string().uuid().nullable().optional(), applicationId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(), metadata: z.record(z.unknown()).default({}), organizationalContext: contextSchema.optional()
}).strict();
const updateSchema = createSchema.partial().omit({ recordType: true });

export const companyRecordsRouter = Router();

function slug(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "record"; }
async function uniqueKey(workspaceId: string, recordType: string, title: string, requested?: string) {
  const base = slug(requested || title); let key = base; let suffix = 2;
  while (await prisma.companyRecord.findUnique({ where: { workspaceId_recordType_key: { workspaceId, recordType, key } }, select: { id: true } })) key = `${base}-${suffix++}`;
  return key;
}
async function relationValid(workspaceId: string, input: { parentId?: string | null; projectId?: string | null; applicationId?: string | null; clientId?: string | null }, ownId?: string) {
  if (input.parentId && input.parentId === ownId) return "invalid_parent";
  if (input.parentId && !await prisma.companyRecord.findFirst({ where: { id: input.parentId, workspaceId } })) return "parent_not_found";
  if (input.projectId && !await prisma.project.findFirst({ where: { id: input.projectId, workspaceId } })) return "project_not_found";
  if (input.applicationId && !await prisma.application.findFirst({ where: { id: input.applicationId, workspaceId } })) return "application_not_found";
  if (input.clientId && !await prisma.client.findFirst({ where: { id: input.clientId, workspaceId } })) return "client_not_found";
  return null;
}
async function serialize(workspaceId: string, records: Array<Record<string, any>>) {
  const ids = records.map((record) => record.id); const contexts = await organizationalContextsForEntities(workspaceId, "company_record", ids);
  const counts = await prisma.evidenceRecord.groupBy({ by: ["entityId"], where: { workspaceId, entityType: { in: ["company_record", "requirement"] }, entityId: { in: ids } }, _count: true });
  const countMap = new Map(counts.map((entry) => [entry.entityId, entry._count]));
  const suspensionCounts=ids.length?await prisma.$queryRaw<Array<{incident_id:string;count:number}>>`SELECT incident_id,count(*)::int AS count FROM native_capability_suspensions s WHERE workspace_id=${workspaceId}::uuid AND incident_id::text IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)) AND native_suspension_active(s.id) GROUP BY incident_id`:[];
  return records.map((record) => ({ ...record, activeSuspensionCount:suspensionCounts.find(s=>s.incident_id===record.id)?.count??0, evidenceCount: countMap.get(record.id) ?? 0, organizationalContext: contexts.get(record.id) }));
}

companyRecordsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null;
  const ids = departmentKey ? await contextualEntityIds(workspaceId, "company_record", departmentKey, req.query.includeCompanyWide !== "false") : null;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const records = await prisma.companyRecord.findMany({ where: {
    workspaceId, ...(ids ? { id: { in: ids } } : {}), ...(typeof req.query.recordType === "string" ? { recordType: req.query.recordType } : {}),
    ...(typeof req.query.status === "string" ? { status: req.query.status } : {}), ...(typeof req.query.projectId === "string" ? { projectId: req.query.projectId } : {}),
    ...(typeof req.query.applicationId === "string" ? { applicationId: req.query.applicationId } : {}), ...(typeof req.query.clientId === "string" ? { clientId: req.query.clientId } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { key: { contains: q, mode: "insensitive" } }] } : {})
  }, include: { parent: { select: { id: true, key: true, title: true, recordType: true } }, children: { select: { id: true, key: true, title: true, recordType: true, status: true } } }, orderBy: [{ priority: "asc" }, { updatedAt: "desc" }] });
  res.json({ data: await serialize(workspaceId, records) });
}));
companyRecordsRouter.get("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const record = await prisma.companyRecord.findFirst({ where: { id: String(req.params.id), workspaceId }, include: { parent: true, children: true } });
  if (!record) return res.status(404).json({ error: "not_found" }); res.json({ data: (await serialize(workspaceId, [record]))[0] });
}));
const sourceReviewSchema = z.object({
  requestId: z.string().uuid(), taskId: z.string().uuid(), expectedRevision: z.string().datetime(),
  action: z.enum(["approve", "withdraw"]), classification: z.enum(["fact", "observation", "proposal", "inference"]),
  provenance: z.string().trim().min(1).max(500), environment: z.enum(["production", "isolated_test"]),
  verificationMethod: z.string().trim().min(1).max(500), verificationRef: z.string().trim().min(1).max(1000),
  inclusionReason: z.string().trim().min(1).max(1000), validUntil: z.string().datetime()
}).strict();

companyRecordsRouter.get("/:id/context-reviews", asyncHandler(async (req, res) => {
  const auth = req.auth!, workspaceId = auth.workspaceId;
  if (auth.authType !== "user" || !auth.userId || auth.workspaceRole !== "owner") return res.status(403).json({ error: "source_review_owner_required" });
  const [owner, record] = await Promise.all([
    prisma.workspace.findFirst({ where: { id: workspaceId, ownerUserId: auth.userId }, select: { id: true } }),
    prisma.companyRecord.findFirst({ where: { id: String(req.params.id), workspaceId }, select: { id: true } })
  ]);
  if (!owner || !record) return res.status(404).json({ error: "source_review_scope_invalid" });
  const taskId = z.string().uuid().parse(req.query.taskId);
  const reviews = await prisma.companySourceReview.findMany({ where: { workspaceId, taskId, recordId: record.id }, orderBy: { ordinal: "desc" }, take: 100 });
  res.json({ data: reviews });
}));

companyRecordsRouter.get("/:id/source-audit", asyncHandler(async (req, res) => {
  const auth = req.auth!, workspaceId = auth.workspaceId;
  if (auth.authType !== "user" || !auth.userId || auth.workspaceRole !== "owner") return res.status(403).json({ error: "source_audit_owner_required" });
  const [owner, record] = await Promise.all([
    prisma.workspace.findFirst({ where: { id: workspaceId, ownerUserId: auth.userId }, select: { id: true } }),
    prisma.companyRecord.findFirst({ where: { id: String(req.params.id), workspaceId } })
  ]);
  if (!owner || !record) return res.status(404).json({ error: "source_audit_scope_invalid" });
  const page = z.object({ limit: z.coerce.number().int().min(1).max(100).default(100), beforeOrdinal: z.coerce.number().int().positive().optional() }).parse(req.query);
  const reviews = await prisma.companySourceReview.findMany({ where: { workspaceId, recordId: record.id, ...(page.beforeOrdinal ? { ordinal: { lt: page.beforeOrdinal } } : {}) }, orderBy: { ordinal: "desc" }, take: page.limit + 1 });
  const currentPage = reviews.slice(0, page.limit);
  const hasMore = reviews.length > page.limit;
  res.json({ data: { currentRecord: record, currentRevision: record.updatedAt.toISOString(), reviews: currentPage,
    reviewHistoryTruncated: hasMore, nextBeforeOrdinal: hasMore ? currentPage.at(-1)?.ordinal : null, priorBodiesAvailable: false } });
}));

// A source review is an owner assertion for one exact record revision and one
// task. It does not edit or silently certify the underlying company record.
companyRecordsRouter.post("/:id/context-reviews", asyncHandler(async (req, res) => {
  const auth = req.auth!, workspaceId = auth.workspaceId;
  if (auth.authType !== "user" || !auth.userId || auth.workspaceRole !== "owner") return res.status(403).json({ error: "source_review_owner_required" });
  const input = sourceReviewSchema.parse(req.body);
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  if (input.environment !== (process.env.NODE_ENV === "test" ? "isolated_test" : "production")) return res.status(400).json({ error: "source_review_environment_invalid" });
  const result = await prisma.$transaction(async (db) => {
    const prior = await db.companySourceReview.findUnique({ where: { id: input.requestId } });
    if (prior) return prior.workspaceId === workspaceId && prior.recordId === String(req.params.id) && prior.taskId === input.taskId && prior.requestHash === requestHash
      ? { status: 200, review: prior } : { status: 409, error: "source_review_request_conflict" };
    const [owner, task, record] = await Promise.all([
      db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: auth.userId! }, select: { id: true } }),
      db.task.findFirst({ where: { id: input.taskId, workspaceId }, select: { id: true, projectId: true } }),
      db.companyRecord.findFirst({ where: { id: String(req.params.id), workspaceId } })
    ]);
    if (!owner || !task || !record) return { status: 404, error: "source_review_scope_invalid" };
    if (record.applicationId && (!task.projectId || !await db.applicationProject.findFirst({ where: { projectId: task.projectId, applicationId: record.applicationId, application: { workspaceId } }, select: { applicationId: true } })))
      return { status: 400, error: "source_review_application_scope_invalid" };
    if (record.updatedAt.toISOString() !== input.expectedRevision) return { status: 409, error: "source_review_revision_changed" };
    const now = new Date(), validUntil = new Date(input.validUntil);
    if (validUntil <= now || validUntil.getTime() - now.getTime() > 366 * 86400000) return { status: 400, error: "source_review_validity_invalid" };
    const base = { id: input.requestId, workspaceId, taskId: input.taskId, recordId: record.id,
      recordRevision: record.updatedAt, contentDigest: companySourceDigest(record), requestHash, action: input.action,
      classification: input.classification, provenance: input.provenance, environment: input.environment,
      verificationMethod: input.verificationMethod, verificationRef: input.verificationRef,
      inclusionReason: input.inclusionReason, validFrom: now, validUntil, actorUserId: auth.userId! };
    if (input.action === "approve" && !companySourceEligible(record, { ...base, createdAt: now } as any, input.taskId, record.applicationId, now))
      return { status: 400, error: "source_review_record_ineligible" };
    const review = await db.companySourceReview.create({ data: base });
    await db.event.create({ data: { workspaceId, taskId: input.taskId, type: "company_source_reviewed", source: "roost", resourceType: "company_record", resourceId: record.id,
      payload: { reviewId: review.id, action: review.action, recordRevision: review.recordRevision.toISOString(), contentDigest: review.contentDigest, actorUserId: auth.userId } } });
    return { status: 201, review };
  }).catch(async (error) => {
    if ((error as { code?: string })?.code !== "P2002") throw error;
    const prior = await prisma.companySourceReview.findUnique({ where: { id: input.requestId } });
    return prior?.workspaceId === workspaceId && prior.recordId === String(req.params.id) && prior.taskId === input.taskId && prior.requestHash === requestHash
      ? { status: 200, review: prior } : { status: 409, error: "source_review_request_conflict" };
  });
  if ("error" in result) return res.status(result.status).json({ error: result.error });
  res.status(result.status).json({ data: result.review });
}));
companyRecordsRouter.post("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const input = createSchema.parse(req.body); const relationError = await relationValid(workspaceId, input);
  if (relationError) return res.status(404).json({ error: relationError }); if (input.organizationalContext && !departmentKeysAreValid(input.organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  await ensureDefaultDepartments(workspaceId); const { organizationalContext, key: requestedKey, ...data } = input;
  const record = await prisma.$transaction(async (transaction) => { const created = await transaction.companyRecord.create({ data: { ...data, acceptanceCriteria: data.acceptanceCriteria as Prisma.InputJsonValue, metadata: data.metadata as Prisma.InputJsonValue, key: await uniqueKey(workspaceId, input.recordType, input.title, requestedKey), workspaceId } as Prisma.CompanyRecordUncheckedCreateInput }); if (organizationalContext) await replaceOrganizationalContext(transaction, workspaceId, "company_record", created.id, organizationalContext); return created; });
  await createEvent({ type: "company_record_created", workspaceId, projectId: record.projectId, source: record.source, payload: { recordId: record.id, recordType: record.recordType, title: record.title } }); res.status(201).json({ data: (await serialize(workspaceId, [record]))[0] });
}));
companyRecordsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const input = updateSchema.parse(req.body); const existing = await prisma.companyRecord.findFirst({ where: { id: String(req.params.id), workspaceId } });
  if (!existing) return res.status(404).json({ error: "not_found" }); const relationError = await relationValid(workspaceId, input, existing.id); if (relationError) return res.status(404).json({ error: relationError });
  if (input.organizationalContext && !departmentKeysAreValid(input.organizationalContext)) return res.status(400).json({ error: "invalid_department_key" }); const { organizationalContext, key, ...data } = input;
  const record = await prisma.$transaction(async (transaction) => { const updated = await transaction.companyRecord.update({ where: { id: existing.id }, data: { ...data, ...(data.acceptanceCriteria ? { acceptanceCriteria: data.acceptanceCriteria as Prisma.InputJsonValue } : {}), ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}), ...(key ? { key: slug(key) } : {}) } as Prisma.CompanyRecordUncheckedUpdateInput }); if (organizationalContext) await replaceOrganizationalContext(transaction, workspaceId, "company_record", existing.id, organizationalContext); return updated; });
  await createEvent({ type: "company_record_updated", workspaceId, projectId: record.projectId, source: record.source, payload: { recordId: record.id, changed: Object.keys(input) } }); res.json({ data: (await serialize(workspaceId, [record]))[0] });
}));
companyRecordsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const existing = await prisma.companyRecord.findFirst({ where: { id: String(req.params.id), workspaceId } }); if (!existing) return res.status(404).json({ error: "not_found" });
  const record = await prisma.companyRecord.update({ where: { id: existing.id }, data: { status: "archived" } }); await createEvent({ type: "company_record_archived", workspaceId, projectId: record.projectId, source: record.source, payload: { recordId: record.id } }); res.json({ data: (await serialize(workspaceId, [record]))[0] });
}));
