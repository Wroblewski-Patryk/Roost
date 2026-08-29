import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { createEvent } from "../events/event.service";
import { contextualEntityIds, departmentKeysAreValid, organizationalContextsForEntities, organizationalScopeTypes, replaceOrganizationalContext } from "../organizational-context/organizational-context.service";

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
  return records.map((record) => ({ ...record, evidenceCount: countMap.get(record.id) ?? 0, organizationalContext: contexts.get(record.id) }));
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
