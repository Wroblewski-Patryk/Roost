import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { contextualEntityIds, departmentKeysAreValid, organizationalContextsForEntities, organizationalScopeTypes, replaceOrganizationalContext } from "../organizational-context/organizational-context.service";

const organizationalContextSchema = z.object({ ownerDepartmentKey: z.string().nullable().optional(), relatedDepartmentKeys: z.array(z.string()).default([]), applicableDepartmentKeys: z.array(z.string()).default([]), scopes: z.array(z.object({ type: z.enum(organizationalScopeTypes), entityId: z.string().trim().min(1).nullable().optional(), label: z.string().trim().max(160).nullable().optional() })).default([]) }).strict();

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  externalId: z.string().optional(),
  source: z.string().optional(),
  organizationalContext: organizationalContextSchema.optional()
});

const updateProjectSchema = createProjectSchema.partial().omit({
  externalId: true,
  source: true
});

export const projectsRouter = Router();
async function serializeProjects(workspaceId: string, rows: Array<Record<string, any>>) { const contexts = await organizationalContextsForEntities(workspaceId, "project", rows.map((row) => row.id)); return rows.map((row) => ({ ...row, organizationalContext: contexts.get(row.id) })); }

projectsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null; const ids = departmentKey ? await contextualEntityIds(workspaceId, "project", departmentKey, req.query.includeCompanyWide !== "false") : null;
  const projects = await prisma.project.findMany({
    where: { workspaceId, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { createdAt: "desc" }
  });
  res.json({ data: await serializeProjects(workspaceId, projects) });
}));

projectsRouter.get("/:id", asyncHandler(async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!project) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ data: (await serializeProjects(req.auth!.workspaceId, [project]))[0] });
}));

projectsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createProjectSchema.parse(req.body);
  const { organizationalContext, ...projectInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  await ensureDefaultDepartments(req.auth!.workspaceId);
  const project = await prisma.$transaction(async (transaction) => {
    const created = await transaction.project.create({ data: { ...projectInput, workspaceId: req.auth!.workspaceId } });
    if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "project", created.id, organizationalContext);
    return created;
  });
  await createEvent({
    type: "project_created",
    workspaceId: req.auth!.workspaceId,
    projectId: project.id,
    source: project.source,
    payload: { projectId: project.id, name: project.name }
  });
  res.status(201).json({ data: (await serializeProjects(req.auth!.workspaceId, [project]))[0] });
}));

projectsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateProjectSchema.parse(req.body);
  const { organizationalContext, ...projectInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  const existing = await prisma.project.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  await ensureDefaultDepartments(req.auth!.workspaceId);
  const project = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.project.update({ where: { id: existing.id }, data: projectInput });
    if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "project", existing.id, organizationalContext);
    return updated;
  });

  await createEvent({
    type: "project_updated",
    workspaceId: req.auth!.workspaceId,
    projectId: project.id,
    source: project.source,
    payload: { projectId: project.id, changed: Object.keys(input) }
  });

  res.json({ data: (await serializeProjects(req.auth!.workspaceId, [project]))[0] });
}));

projectsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.project.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: { status: "archived" }
  });

  await createEvent({
    type: "project_archived",
    workspaceId: req.auth!.workspaceId,
    projectId: project.id,
    source: project.source,
    payload: { projectId: project.id }
  });

  res.json({ data: project });
}));
