import { Prisma, TaskStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { IntegrationError } from "../../integrations/errors";
import { clickUpImportModes, syncClickUpTasksForWorkspaceWithOptions } from "../../integrations/clickup/clickup.sync";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

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
  source: z.string().optional()
});

const updateTaskSchema = createTaskSchema.partial().omit({ externalId: true, source: true });

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
  const tasks = await prisma.task.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    include: {
      taskList: {
        select: {
          id: true,
          name: true,
          externalId: true,
          source: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json({ data: tasks });
}));

tasksRouter.post("/", asyncHandler(async (req, res) => {
  const input = createTaskSchema.parse(req.body);
  if (!await visibleTaskRelations(req.auth!.workspaceId, input)) {
    return res.status(404).json({ error: "not_found" });
  }

  const task = await prisma.task.create({
    data: {
      ...input,
      workspaceId: req.auth!.workspaceId
    }
  });
  await createEvent({
    type: "task_created",
    workspaceId: req.auth!.workspaceId,
    projectId: task.projectId,
    taskId: task.id,
    source: task.source,
    payload: { taskId: task.id, title: task.title }
  });
  res.status(201).json({ data: task });
}));

tasksRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateTaskSchema.parse(req.body);
  if (!await visibleTaskRelations(req.auth!.workspaceId, input)) {
    return res.status(404).json({ error: "not_found" });
  }

  const task = await prisma.task.update({
    where: {
      id: String(req.params.id),
      workspaceId: req.auth!.workspaceId
    },
    data: input
  });
  await createEvent({
    type: "task_updated",
    workspaceId: req.auth!.workspaceId,
    projectId: task.projectId,
    taskId: task.id,
    source: task.source,
    payload: { taskId: task.id, changed: Object.keys(input) }
  });
  res.json({ data: task });
}));

tasksRouter.post("/sync/clickup", asyncHandler(async (req, res) => {
  const input = clickUpSyncSchema.parse(req.body);
  if (!await visibleTaskRelations(req.auth!.workspaceId, input)) {
    return res.status(404).json({ error: "not_found" });
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
