import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { createEvent } from "../events/event.service";
import {
  contextualEntityIds,
  departmentKeysAreValid,
  organizationalContextsForEntities,
  organizationalScopeTypes,
  replaceOrganizationalContext
} from "../organizational-context/organizational-context.service";

const objectTypes = ["resource", "risk", "metric", "policy"] as const;
type CompanyObjectType = typeof objectTypes[number];
const statuses = ["draft", "active", "paused", "archived", "retired", "deprecated"] as const;

const contextSchema = z.object({
  ownerDepartmentKey: z.string().nullable().optional(),
  relatedDepartmentKeys: z.array(z.string()).default([]),
  applicableDepartmentKeys: z.array(z.string()).default([]),
  scopes: z.array(z.object({
    type: z.enum(organizationalScopeTypes),
    entityId: z.string().trim().min(1).nullable().optional(),
    label: z.string().trim().max(160).nullable().optional()
  })).default([])
}).strict();

const resourceSchema = z.object({
  name: z.string().trim().min(1).max(240), type: z.string().trim().min(1).max(80),
  externalProvider: z.string().trim().max(120).nullable().optional(), externalId: z.string().trim().max(240).nullable().optional(),
  url: z.string().trim().url().max(2000).nullable().optional(), accessLevel: z.string().trim().min(1).max(80).default("workspace"),
  ownerRoleId: z.string().uuid().nullable().optional(), relatedProjectId: z.string().uuid().nullable().optional(), relatedProcessId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}), organizationalContext: contextSchema.optional()
}).strict();
const riskSchema = z.object({
  name: z.string().trim().min(1).max(240), description: z.string().trim().max(10000).nullable().optional(), category: z.string().trim().max(120).nullable().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("medium"), likelihood: z.string().trim().max(120).nullable().optional(), impact: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(statuses).default("active"), processId: z.string().uuid().nullable().optional(), pipelineId: z.string().uuid().nullable().optional(), organizationalContext: contextSchema.optional()
}).strict();
const metricSchema = z.object({
  name: z.string().trim().min(1).max(240), category: z.string().trim().min(1).max(120), description: z.string().trim().max(10000).nullable().optional(),
  measurementType: z.string().trim().min(1).max(120), unit: z.string().trim().max(80).nullable().optional(), targetValue: z.number().finite().nullable().optional(), currentValue: z.number().finite().nullable().optional(),
  calculation: z.record(z.unknown()).default({}), ownerRoleId: z.string().uuid().nullable().optional(), processId: z.string().uuid().nullable().optional(), pipelineId: z.string().uuid().nullable().optional(),
  status: z.enum(statuses).default("active"), organizationalContext: contextSchema.optional()
}).strict();
const policySchema = z.object({
  name: z.string().trim().min(1).max(240), description: z.string().trim().max(10000).nullable().optional(), appliesTo: z.string().trim().min(1).max(240), ruleType: z.string().trim().min(1).max(120),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"), enforcementMode: z.enum(["soft_warning", "block", "require_approval", "log_only"]).default("soft_warning"),
  escalationRoleId: z.string().uuid().nullable().optional(), processId: z.string().uuid().nullable().optional(), procedureId: z.string().uuid().nullable().optional(), status: z.enum(statuses).default("active"),
  organizationalContext: contextSchema.optional()
}).strict();

function schemaFor(type: CompanyObjectType) {
  if (type === "resource") return resourceSchema;
  if (type === "risk") return riskSchema;
  if (type === "metric") return metricSchema;
  return policySchema;
}

function parseType(value: string): CompanyObjectType | null {
  return objectTypes.includes(value as CompanyObjectType) ? value as CompanyObjectType : null;
}

async function listObjects(type: CompanyObjectType, workspaceId: string, ids: string[] | null, q: string) {
  const idFilter = ids ? { id: { in: ids } } : {};
  const search = q ? { name: { contains: q, mode: "insensitive" as const } } : {};
  if (type === "resource") return prisma.resource.findMany({ where: { workspaceId, ...idFilter, ...search }, include: { relatedProject: { select: { id: true, name: true } }, relatedProcess: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" } });
  if (type === "risk") return prisma.risk.findMany({ where: { workspaceId, status: { not: "archived" }, ...idFilter, ...search }, include: { controls: true, process: { select: { id: true, name: true } }, pipeline: { select: { id: true, name: true } } }, orderBy: [{ riskLevel: "desc" }, { updatedAt: "desc" }] });
  if (type === "metric") return prisma.metric.findMany({ where: { workspaceId, status: { not: "archived" }, ...idFilter, ...search }, include: { process: { select: { id: true, name: true } }, pipeline: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" } });
  return prisma.policy.findMany({ where: { workspaceId, status: { not: "archived" }, ...idFilter, ...search }, include: { process: { select: { id: true, name: true } }, procedure: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" } });
}

async function findObject(type: CompanyObjectType, workspaceId: string, id: string) {
  const records = await listObjects(type, workspaceId, [id], "");
  return records[0] ?? null;
}

async function serialize(type: CompanyObjectType, workspaceId: string, records: Array<{ id: string }>) {
  const contexts = await organizationalContextsForEntities(workspaceId, type, records.map((record) => record.id));
  return records.map((record) => ({ ...record, organizationalContext: contexts.get(record.id) }));
}

async function createObject(type: CompanyObjectType, workspaceId: string, input: z.infer<ReturnType<typeof schemaFor>>) {
  const { organizationalContext, ...data } = input;
  return prisma.$transaction(async (transaction) => {
    let created: { id: string };
    if (type === "resource") created = await transaction.resource.create({ data: { ...(data as z.infer<typeof resourceSchema>), metadata: (data as z.infer<typeof resourceSchema>).metadata as Prisma.InputJsonValue, workspaceId } });
    else if (type === "risk") created = await transaction.risk.create({ data: { ...(data as z.infer<typeof riskSchema>), workspaceId } });
    else if (type === "metric") created = await transaction.metric.create({ data: { ...(data as z.infer<typeof metricSchema>), calculation: (data as z.infer<typeof metricSchema>).calculation as Prisma.InputJsonValue, workspaceId } });
    else created = await transaction.policy.create({ data: { ...(data as z.infer<typeof policySchema>), workspaceId } });
    if (organizationalContext) await replaceOrganizationalContext(transaction, workspaceId, type, created.id, organizationalContext);
    return created;
  });
}

async function updateObject(transaction: Prisma.TransactionClient, type: CompanyObjectType, id: string, input: Record<string, unknown>) {
  const { organizationalContext: _context, ...data } = input;
  if (type === "resource") return transaction.resource.update({ where: { id }, data: { ...data, ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}) } });
  if (type === "risk") return transaction.risk.update({ where: { id }, data });
  if (type === "metric") return transaction.metric.update({ where: { id }, data: { ...data, ...(data.calculation ? { calculation: data.calculation as Prisma.InputJsonValue } : {}) } });
  return transaction.policy.update({ where: { id }, data });
}

export const companyObjectsRouter = Router();

companyObjectsRouter.get("/:type", asyncHandler(async (req, res) => {
  const type = parseType(String(req.params.type)); if (!type) return res.status(404).json({ error: "unsupported_company_object_type" });
  const workspaceId = req.auth!.workspaceId; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null;
  const ids = departmentKey ? await contextualEntityIds(workspaceId, type, departmentKey, req.query.includeCompanyWide !== "false") : null;
  const records = await listObjects(type, workspaceId, ids, typeof req.query.q === "string" ? req.query.q.trim() : "");
  res.json({ data: await serialize(type, workspaceId, records) });
}));

companyObjectsRouter.get("/:type/:id", asyncHandler(async (req, res) => {
  const type = parseType(String(req.params.type)); if (!type) return res.status(404).json({ error: "unsupported_company_object_type" });
  const record = await findObject(type, req.auth!.workspaceId, String(req.params.id)); if (!record) return res.status(404).json({ error: "not_found" });
  res.json({ data: (await serialize(type, req.auth!.workspaceId, [record]))[0] });
}));

companyObjectsRouter.post("/:type", asyncHandler(async (req, res) => {
  const type = parseType(String(req.params.type)); if (!type) return res.status(404).json({ error: "unsupported_company_object_type" });
  const input = schemaFor(type).parse(req.body); if (input.organizationalContext && !departmentKeysAreValid(input.organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  const workspaceId = req.auth!.workspaceId; await ensureDefaultDepartments(workspaceId); const created = await createObject(type, workspaceId, input);
  await createEvent({ type: `${type}_created`, workspaceId, source: "companycore", payload: { entityType: type, entityId: created.id } });
  const record = await findObject(type, workspaceId, created.id); res.status(201).json({ data: (await serialize(type, workspaceId, record ? [record] : []))[0] });
}));

companyObjectsRouter.patch("/:type/:id", asyncHandler(async (req, res) => {
  const type = parseType(String(req.params.type)); if (!type) return res.status(404).json({ error: "unsupported_company_object_type" });
  const workspaceId = req.auth!.workspaceId; const existing = await findObject(type, workspaceId, String(req.params.id)); if (!existing) return res.status(404).json({ error: "not_found" });
  const input = schemaFor(type).partial().parse(req.body); if (input.organizationalContext && !departmentKeysAreValid(input.organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  const updated = await prisma.$transaction(async (transaction) => { const record = await updateObject(transaction, type, existing.id, input as Record<string, unknown>); if (input.organizationalContext) await replaceOrganizationalContext(transaction, workspaceId, type, existing.id, input.organizationalContext); return record; });
  await createEvent({ type: `${type}_updated`, workspaceId, source: "companycore", payload: { entityType: type, entityId: updated.id, changed: Object.keys(input) } });
  const record = await findObject(type, workspaceId, updated.id); res.json({ data: (await serialize(type, workspaceId, record ? [record] : []))[0] });
}));

companyObjectsRouter.delete("/:type/:id", asyncHandler(async (req, res) => {
  const type = parseType(String(req.params.type)); if (!type) return res.status(404).json({ error: "unsupported_company_object_type" });
  const workspaceId = req.auth!.workspaceId; const existing = await findObject(type, workspaceId, String(req.params.id)); if (!existing) return res.status(404).json({ error: "not_found" });
  if (type === "resource") await prisma.resource.delete({ where: { id: existing.id } });
  else if (type === "risk") await prisma.risk.update({ where: { id: existing.id }, data: { status: "archived" } });
  else if (type === "metric") await prisma.metric.update({ where: { id: existing.id }, data: { status: "archived" } });
  else await prisma.policy.update({ where: { id: existing.id }, data: { status: "archived" } });
  await createEvent({ type: `${type}_archived`, workspaceId, source: "companycore", payload: { entityType: type, entityId: existing.id } });
  res.json({ data: { id: existing.id, status: "archived" } });
}));
