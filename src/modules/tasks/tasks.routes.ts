import { Prisma, TaskStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { IntegrationError } from "../../integrations/errors";
import {
  archiveCompanyCoreTaskInClickUp,
  createCompanyCoreTaskInClickUp,
  setCompanyCoreTaskClickUpCustomField,
  writeBackCompanyCoreTaskToClickUp
} from "../../integrations/clickup/clickup.webhooks";
import { clickUpImportModes, syncClickUpTasksForWorkspaceWithOptions } from "../../integrations/clickup/clickup.sync";
import { getIntegrationSettingForWorkspace, type ClickUpIntegrationConfig } from "../../integrations/integration-settings.service";
import { acknowledgeGovernedClickUpIntent, clickUpStatusControlForTasks, governedClickUpListForNewTask, governedClickUpListForTask, requestGovernedClickUpStatus } from "../../integrations/clickup/clickup.status-authority";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { contextualEntityIds, departmentKeysAreValid, organizationalContextsForEntities, organizationalScopeTypes, replaceOrganizationalContext } from "../organizational-context/organizational-context.service";

const organizationalContextSchema = z.object({
  ownerDepartmentKey: z.string().nullable().optional(), relatedDepartmentKeys: z.array(z.string()).default([]), applicableDepartmentKeys: z.array(z.string()).default([]),
  scopes: z.array(z.object({ type: z.enum(organizationalScopeTypes), entityId: z.string().trim().min(1).nullable().optional(), label: z.string().trim().max(160).nullable().optional() })).default([])
}).strict();

const statusSchema = z.nativeEnum(TaskStatus).optional();

const createTaskSchema = z.object({
  projectId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  targetId: z.string().uuid().optional(),
  taskListId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: statusSchema,
  priority: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  externalId: z.string().optional(),
  source: z.string().optional(),
  organizationalContext: organizationalContextSchema.optional()
});

const updateTaskSchema = createTaskSchema.partial().omit({ externalId: true, source: true }).extend({
  description: z.string().nullable().optional(), priority: z.string().nullable().optional(), dueDate: z.coerce.date().nullable().optional()
});

const clickUpCustomFieldSchema = z.object({
  value: z.unknown()
}).strict();

const clickUpSyncSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: statusSchema,
  priority: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  projectId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  targetId: z.string().uuid().optional(),
  taskListId: z.string().uuid().optional(),
  raw: z.record(z.unknown()).optional()
});

const nativeClickUpSyncSchema = z.object({
  importMode: z.enum(clickUpImportModes).optional()
}).strict();

export const tasksRouter = Router();

const taskInclude = { taskList: { select: { id: true, name: true, externalId: true, source: true } }, project: { select: { id: true, name: true } }, goal: { select: { id: true, title: true, status: true } }, target: { select: { id: true, title: true } } };
async function serializeTasks(workspaceId: string, tasks: Array<{ id: string; source: string | null; taskListId: string | null; status: TaskStatus } & Record<string, any>>, ownerHistory = false) { const [contexts, statusControls] = await Promise.all([organizationalContextsForEntities(workspaceId, "task", tasks.map((task) => task.id)), clickUpStatusControlForTasks(workspaceId, tasks)]); return tasks.map((task) => ({ ...task, goal: !ownerHistory && task.goal?.status === "archived" ? null : task.goal, organizationalContext: contexts.get(task.id), clickUpStatusControl: statusControls.get(task.id) ?? null })); }
function apiKeyTaskView(task: Record<string, any>) {
  const { executionReadiness, executionRoleProvenance: _roleProvenance,
    organizationalContext: _organizationalContext, raw: _raw,
    taskList, project, goal, target, ...rest } = task;
  const status = executionReadiness && typeof executionReadiness === "object" && !Array.isArray(executionReadiness) ? executionReadiness.status : undefined;
  return { ...rest, taskList: taskList ? { id: taskList.id } : null,
    project: project ? { id: project.id } : null, goal: goal && goal.status !== "archived" ? { id: goal.id } : null,
    target: target ? { id: target.id } : null,
    executionReadiness: { status: typeof status === "string" ? status : "draft" } };
}

async function visibleTaskRelations(workspaceId: string, input: {
  projectId?: string;
  goalId?: string;
  targetId?: string;
  taskListId?: string;
}) {
  const checks = [
    input.projectId ? prisma.project.findFirst({ where: { id: input.projectId, workspaceId } }) : null,
    input.goalId ? prisma.goal.findFirst({ where: { id: input.goalId, workspaceId } }) : null,
    input.targetId ? prisma.target.findFirst({ where: { id: input.targetId, workspaceId } }) : null,
    input.taskListId ? prisma.taskList.findFirst({ where: { id: input.taskListId, workspaceId } }) : null
  ].filter(Boolean);

  const relations = await Promise.all(checks);
  return relations.every((relation) => Boolean(relation));
}

tasksRouter.get("/", asyncHandler(async (req, res) => {
  const archive = z.enum(["exclude", "only", "all"]).default("exclude").parse(req.query.archive);
  const workspaceId = req.auth!.workspaceId; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null;
  const ids = departmentKey ? await contextualEntityIds(workspaceId, "task", departmentKey, req.query.includeCompanyWide !== "false") : null;
  const tasks = await prisma.task.findMany({
    where: { workspaceId, ...(req.auth!.agentId ? { assignedWorkforceEntityId: req.auth!.agentId } : {}), ...(archive === "all" ? {} : { status: archive === "only" ? "archived" : { not: "archived" as const } }), ...(ids ? { id: { in: ids } } : {}) }, include: taskInclude,
    orderBy: { createdAt: "desc" }
  });
  const data = req.auth!.authType === "api_key" ? tasks.map(apiKeyTaskView) : await serializeTasks(workspaceId, tasks, req.auth!.workspaceRole === "owner");
  res.json({ data });
}));

tasksRouter.get("/:id", asyncHandler(async (req, res) => {
  if (req.auth!.taskScopeId) {
    const scoped = await prisma.task.findFirst({ where: {
      id: String(req.params.id), workspaceId: req.auth!.workspaceId, status: { not: "archived" }
    }, select: {
      id: true, title: true, description: true, status: true,
      assignedWorkforceEntityId: true, createdAt: true, updatedAt: true
    } });
    return scoped ? res.json({ data: scoped }) : res.status(404).json({ error: "not_found" });
  }
  const task = await prisma.task.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId,
      ...(req.auth!.agentId ? { assignedWorkforceEntityId: req.auth!.agentId } : {}) },
    include: taskInclude
  });

  if (!task) {
    return res.status(404).json({ error: "not_found" });
  }

  const data = req.auth!.authType === "api_key" ? apiKeyTaskView(task)
    : (await serializeTasks(req.auth!.workspaceId, [task], req.auth!.workspaceRole === "owner"))[0];
  const goalRetired = req.auth!.authType === "user" && req.auth!.workspaceRole === "owner" && task.goal?.status === "archived"
    && await prisma.goal.count({ where: { id: task.goalId!, workspaceId: req.auth!.workspaceId,
      status: "archived", mandateVersions: { some: { status: "retired" } } } }) > 0;
  res.json({ data: { ...data, goalRetired: Boolean(goalRetired) } });
}));

tasksRouter.post("/", asyncHandler(async (req, res) => {
  const input = createTaskSchema.parse(req.body);
  const { organizationalContext, ...taskInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  if (input.goalId && await prisma.goal.count({ where: { id: input.goalId,
    workspaceId: req.auth!.workspaceId, status: "archived", mandateVersions: { some: { status: "retired" } } } }))
    return res.status(409).json({ error: "goal_retired" });
  if (!await visibleTaskRelations(req.auth!.workspaceId, input)) {
    return res.status(404).json({ error: "not_found" });
  }

  let providerFields: Pick<Prisma.TaskUncheckedCreateInput, "externalId" | "source"> = {
    externalId: input.externalId,
    source: input.source
  };

  const taskList = input.taskListId
    ? await prisma.taskList.findFirst({
      where: {
        id: input.taskListId,
        workspaceId: req.auth!.workspaceId
      }
    })
    : null;

  if (await governedClickUpListForNewTask(req.auth!.workspaceId, taskList?.externalId)) return res.status(422).json({ error: "clickup_governed_list_create_unavailable" });
  if (input.source === "clickup" && input.externalId) {
    const setting = await getIntegrationSettingForWorkspace(req.auth!.workspaceId, "clickup");
    if ((setting?.config as ClickUpIntegrationConfig | undefined)?.governedStatusListId) return res.status(422).json({ error: "clickup_manual_identity_unavailable" });
  }

  if (!input.externalId && taskList?.source === "clickup" && taskList.externalId) {
    try {
      const clickUpTask = await createCompanyCoreTaskInClickUp({
        workspaceId: req.auth!.workspaceId,
        listExternalId: taskList.externalId,
        task: input
      });
      providerFields = {
        externalId: clickUpTask.id,
        source: "clickup"
      };
    } catch (error) {
      if (error instanceof IntegrationError) {
        await createEvent({
          type: "clickup_create_failed",
          workspaceId: req.auth!.workspaceId,
          source: "clickup",
          payload: {
            provider: "clickup",
            listExternalId: taskList.externalId,
            errorCode: error.code
          }
        });
        return res.status(error.status).json({ error: error.code });
      }
      throw error;
    }
  }

  await ensureDefaultDepartments(req.auth!.workspaceId);
  const task = await prisma.$transaction(async (transaction) => { const created = await transaction.task.create({ data: { ...taskInput, ...providerFields, workspaceId: req.auth!.workspaceId }, include: taskInclude }); if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "task", created.id, organizationalContext); return created; });
  await createEvent({
    type: "task_created",
    workspaceId: req.auth!.workspaceId,
    projectId: task.projectId,
    taskId: task.id,
    source: task.source,
    payload: { taskId: task.id, title: task.title }
  });
  res.status(201).json({ data: (await serializeTasks(req.auth!.workspaceId, [task]))[0] });
}));

tasksRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateTaskSchema.parse(req.body);
  const { organizationalContext, ...taskInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  if (!await visibleTaskRelations(req.auth!.workspaceId, input)) {
    return res.status(404).json({ error: "not_found" });
  }

  const existing = await prisma.task.findFirst({
    where: {
      id: String(req.params.id),
      workspaceId: req.auth!.workspaceId
    }
  });
  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }
  if (taskInput.goalId !== undefined && taskInput.goalId !== existing.goalId && existing.goalId &&
    await prisma.goalMandateVersion.count({ where: { workspaceId: req.auth!.workspaceId,
      goalId: existing.goalId, status: "retired" } }))
    return res.status(409).json({ error: "goal_retirement_task_link_immutable" });
  if (taskInput.goalId && taskInput.goalId !== existing.goalId && await prisma.goal.count({ where: {
    id: taskInput.goalId, workspaceId: req.auth!.workspaceId, status: "archived",
    mandateVersions: { some: { status: "retired" } } } }))
    return res.status(409).json({ error: "goal_retired" });

  const governed = await governedClickUpListForTask(existing);
  if (taskInput.taskListId !== undefined) {
    if (governed) return res.status(422).json({ error: "clickup_governed_list_move_unavailable" });
    const destination = await prisma.taskList.findFirst({ where: { id: taskInput.taskListId, workspaceId: req.auth!.workspaceId } });
    if (await governedClickUpListForNewTask(req.auth!.workspaceId, destination?.externalId)) return res.status(422).json({ error: "clickup_governed_list_move_unavailable" });
  }
  if (governed && taskInput.status !== undefined) {
    if (req.auth!.authType !== "user" || !req.auth!.userId) return res.status(403).json({ error: "forbidden" });
    if (Object.keys(taskInput).length !== 1 || organizationalContext) return res.status(422).json({ error: "clickup_status_request_must_be_separate" });
    try {
      await requestGovernedClickUpStatus({ task: existing, requestedStatus: taskInput.status, requesterUserId: req.auth!.userId });
      const current = await prisma.task.findFirstOrThrow({ where: { id: existing.id, workspaceId: req.auth!.workspaceId }, include: taskInclude });
      return res.status(202).json({ data: (await serializeTasks(req.auth!.workspaceId, [current]))[0] });
    } catch (error) {
      if (error instanceof IntegrationError) return res.status(error.status).json({ error: error.code });
      throw error;
    }
  }

  if (existing.source === "clickup" && existing.externalId) {
    try {
      await writeBackCompanyCoreTaskToClickUp({
        workspaceId: req.auth!.workspaceId,
        externalId: existing.externalId,
        changes: {
          title: taskInput.title,
          description: taskInput.description,
          status: taskInput.status,
          priority: taskInput.priority,
          dueDate: taskInput.dueDate,
          taskListId: taskInput.taskListId
        }
      });
    } catch (error) {
      if (error instanceof IntegrationError) {
        await createEvent({
          type: "clickup_writeback_failed",
          workspaceId: req.auth!.workspaceId,
          taskId: existing.id,
          source: "clickup",
          payload: {
            provider: "clickup",
            taskId: existing.id,
            externalId: existing.externalId,
            errorCode: error.code
          }
        });
        return res.status(error.status).json({ error: error.code });
      }
      throw error;
    }
  }

  await ensureDefaultDepartments(req.auth!.workspaceId);
  const task = await prisma.$transaction(async (transaction) => { const updated = await transaction.task.update({ where: { id: existing.id }, data: taskInput, include: taskInclude }); if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "task", existing.id, organizationalContext); return updated; });
  await createEvent({
    type: "task_updated",
    workspaceId: req.auth!.workspaceId,
    projectId: task.projectId,
    taskId: task.id,
    source: task.source,
    payload: { taskId: task.id, changed: Object.keys(input) }
  });
  res.json({ data: (await serializeTasks(req.auth!.workspaceId, [task]))[0] });
}));

tasksRouter.post("/:id/clickup/status-intents/:intentId/close", asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user" || req.auth!.workspaceRole !== "owner") return res.status(403).json({ error: "forbidden" });
  const task = await prisma.task.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId } });
  if (!task || task.source !== "clickup") return res.status(404).json({ error: "not_found" });
  try {
    const intent = await acknowledgeGovernedClickUpIntent({ workspaceId: req.auth!.workspaceId, taskId: task.id, intentId: String(req.params.intentId), actorUserId: req.auth!.userId });
    return res.json({ data: { id: intent.id, state: intent.state } });
  } catch (error) {
    if (error instanceof IntegrationError) return res.status(error.status).json({ error: error.code });
    throw error;
  }
}));

tasksRouter.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.task.findFirst({
    where: {
      id: String(req.params.id),
      workspaceId: req.auth!.workspaceId
    }
  });
  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  if (await governedClickUpListForTask(existing)) return res.status(422).json({ error: "clickup_governed_list_archive_unavailable" });

  if (existing.source === "clickup" && existing.externalId) {
    try {
      await archiveCompanyCoreTaskInClickUp({
        workspaceId: req.auth!.workspaceId,
        externalId: existing.externalId
      });
    } catch (error) {
      if (error instanceof IntegrationError) {
        await createEvent({
          type: "clickup_archive_failed",
          workspaceId: req.auth!.workspaceId,
          taskId: existing.id,
          source: "clickup",
          payload: {
            provider: "clickup",
            taskId: existing.id,
            externalId: existing.externalId,
            errorCode: error.code
          }
        });
        return res.status(error.status).json({ error: error.code });
      }
      throw error;
    }
  }

  const task = await prisma.task.update({
    where: {
      id: existing.id,
      workspaceId: req.auth!.workspaceId
    },
    data: { status: "archived" }
  });

  await createEvent({
    type: "task_archived",
    workspaceId: req.auth!.workspaceId,
    projectId: task.projectId,
    taskId: task.id,
    source: task.source,
    payload: { taskId: task.id, externalId: task.externalId }
  });

  res.json({ data: task });
}));

tasksRouter.post("/:id/clickup/custom-fields/:fieldId", asyncHandler(async (req, res) => {
  const input = clickUpCustomFieldSchema.parse(req.body);
  const task = await prisma.task.findFirst({
    where: {
      id: String(req.params.id),
      workspaceId: req.auth!.workspaceId,
      source: "clickup"
    }
  });
  if (!task?.externalId) {
    return res.status(404).json({ error: "not_found" });
  }

  try {
    await setCompanyCoreTaskClickUpCustomField({
      workspaceId: req.auth!.workspaceId,
      externalTaskId: task.externalId,
      externalFieldId: String(req.params.fieldId),
      value: input.value
    });
  } catch (error) {
    if (error instanceof IntegrationError) {
      await createEvent({
        type: "clickup_custom_field_update_failed",
        workspaceId: req.auth!.workspaceId,
        taskId: task.id,
        source: "clickup",
        payload: {
          provider: "clickup",
          taskId: task.id,
          externalId: task.externalId,
          externalFieldId: String(req.params.fieldId),
          errorCode: error.code
        }
      });
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }

  await createEvent({
    type: "clickup_custom_field_updated",
    workspaceId: req.auth!.workspaceId,
    taskId: task.id,
    source: "clickup",
    payload: {
      provider: "clickup",
      taskId: task.id,
      externalId: task.externalId,
      externalFieldId: String(req.params.fieldId)
    }
  });

  res.json({ data: { taskId: task.id, externalFieldId: String(req.params.fieldId), updated: true } });
}));

tasksRouter.post("/sync/clickup", asyncHandler(async (req, res) => {
  const input = clickUpSyncSchema.parse(req.body);
  if (!await visibleTaskRelations(req.auth!.workspaceId, input)) {
    return res.status(404).json({ error: "not_found" });
  }
  const rawSetting = await getIntegrationSettingForWorkspace(req.auth!.workspaceId, "clickup");
  const governedListId = (rawSetting?.config as ClickUpIntegrationConfig | undefined)?.governedStatusListId;
  if (governedListId) {
    return res.status(422).json({ error: "clickup_governed_list_requires_signed_webhook" });
  }

  const data: Prisma.TaskUncheckedCreateInput = {
    workspaceId: req.auth!.workspaceId,
    title: input.title,
    description: input.description,
    status: input.status ?? "todo",
    priority: input.priority,
    dueDate: input.dueDate,
    projectId: input.projectId,
    goalId: input.goalId,
    targetId: input.targetId,
    taskListId: input.taskListId,
    externalId: input.externalId,
    source: "clickup"
  };

  const task = await prisma.task.upsert({
    where: {
      workspaceId_source_externalId: {
        workspaceId: req.auth!.workspaceId,
        source: "clickup",
        externalId: input.externalId
      }
    },
    update: data,
    create: data
  });

  await createEvent({
    type: "task_synced_from_clickup",
    workspaceId: req.auth!.workspaceId,
    projectId: task.projectId,
    taskId: task.id,
    source: "clickup",
    payload: {
      taskId: task.id,
      externalId: input.externalId,
      workspaceId: req.auth!.workspaceId,
      raw: (input.raw ?? null) as Prisma.InputJsonValue | null
    }
  });

  res.json({ data: task });
}));

tasksRouter.post("/sync/clickup/native", asyncHandler(async (req, res) => {
  try {
    const input = nativeClickUpSyncSchema.parse(req.body ?? {});
    const result = await syncClickUpTasksForWorkspaceWithOptions(req.auth!.workspaceId, input);
    return res.json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({
        error: error.code
      });
    }
    throw error;
  }
}));
