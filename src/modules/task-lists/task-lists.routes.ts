import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { contextualEntityIds, departmentKeysAreValid, organizationalContextsForEntities, organizationalScopeTypes, replaceOrganizationalContext } from "../organizational-context/organizational-context.service";

const organizationalContextSchema = z.object({ ownerDepartmentKey: z.string().nullable().optional(), relatedDepartmentKeys: z.array(z.string()).default([]), applicableDepartmentKeys: z.array(z.string()).default([]), scopes: z.array(z.object({ type: z.enum(organizationalScopeTypes), entityId: z.string().trim().min(1).nullable().optional(), label: z.string().trim().max(160).nullable().optional() })).default([]) }).strict();

const createTaskListSchema = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().min(1).optional(),
  externalId: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  organizationalContext: organizationalContextSchema.optional()
}).strict();

const updateTaskListSchema = createTaskListSchema.partial().omit({
  externalId: true,
  source: true
});

export const taskListsRouter = Router();
async function serializeTaskLists(workspaceId: string, rows: Array<Record<string, any>>) { const contexts = await organizationalContextsForEntities(workspaceId, "task_list", rows.map((row) => row.id)); return rows.map((row) => ({ ...row, organizationalContext: contexts.get(row.id) })); }

async function projectIsVisible(workspaceId: string, projectId?: string) {
  if (!projectId) {
    return true;
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId }
  });

  return Boolean(project);
}

taskListsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null; const ids = departmentKey ? await contextualEntityIds(workspaceId, "task_list", departmentKey, req.query.includeCompanyWide !== "false") : null;
  const taskLists = await prisma.taskList.findMany({
    where: { workspaceId, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { createdAt: "desc" }
  });

  res.json({ data: await serializeTaskLists(workspaceId, taskLists) });
}));

taskListsRouter.get("/:id", asyncHandler(async (req, res) => {
  const taskList = await prisma.taskList.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!taskList) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ data: (await serializeTaskLists(req.auth!.workspaceId, [taskList]))[0] });
}));

taskListsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createTaskListSchema.parse(req.body);
  const { organizationalContext, ...taskListInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });

  if (!await projectIsVisible(req.auth!.workspaceId, input.projectId)) {
    return res.status(404).json({ error: "not_found" });
  }

  await ensureDefaultDepartments(req.auth!.workspaceId);
  const taskList = await prisma.$transaction(async (transaction) => {
    const created = await transaction.taskList.create({ data: { ...taskListInput, workspaceId: req.auth!.workspaceId } });
    if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "task_list", created.id, organizationalContext);
    return created;
  });

  await createEvent({
    type: "task_list_created",
    workspaceId: req.auth!.workspaceId,
    projectId: taskList.projectId,
    source: taskList.source,
    payload: {
      taskListId: taskList.id,
      projectId: taskList.projectId,
      name: taskList.name
    }
  });

  res.status(201).json({ data: (await serializeTaskLists(req.auth!.workspaceId, [taskList]))[0] });
}));

taskListsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateTaskListSchema.parse(req.body);
  const { organizationalContext, ...taskListInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });

  if (!await projectIsVisible(req.auth!.workspaceId, input.projectId)) {
    return res.status(404).json({ error: "not_found" });
  }

  const existing = await prisma.taskList.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  await ensureDefaultDepartments(req.auth!.workspaceId);
  const taskList = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.taskList.update({ where: { id: existing.id }, data: taskListInput });
    if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "task_list", existing.id, organizationalContext);
    return updated;
  });

  await createEvent({
    type: "task_list_updated",
    workspaceId: req.auth!.workspaceId,
    projectId: taskList.projectId,
    source: taskList.source,
    payload: {
      taskListId: taskList.id,
      changed: Object.keys(input)
    }
  });

  res.json({ data: (await serializeTaskLists(req.auth!.workspaceId, [taskList]))[0] });
}));

taskListsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.taskList.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const taskList = await prisma.taskList.update({
    where: { id: existing.id },
    data: { status: "archived" }
  });

  await createEvent({
    type: "task_list_archived",
    workspaceId: req.auth!.workspaceId,
    projectId: taskList.projectId,
    source: taskList.source,
    payload: { taskListId: taskList.id }
  });

  res.json({ data: taskList });
}));
