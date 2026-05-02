import { Prisma, TaskStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
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

export const tasksRouter = Router();

tasksRouter.get("/", asyncHandler(async (_req, res) => {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: tasks });
}));

tasksRouter.post("/", asyncHandler(async (req, res) => {
  const input = createTaskSchema.parse(req.body);
  const task = await prisma.task.create({ data: input });
  await createEvent({
    type: "task_created",
    projectId: task.projectId,
    taskId: task.id,
    source: task.source,
    payload: { taskId: task.id, title: task.title }
  });
  res.status(201).json({ data: task });
}));

tasksRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateTaskSchema.parse(req.body);
  const task = await prisma.task.update({
    where: { id: String(req.params.id) },
    data: input
  });
  await createEvent({
    type: "task_updated",
    projectId: task.projectId,
    taskId: task.id,
    source: task.source,
    payload: { taskId: task.id, changed: Object.keys(input) }
  });
  res.json({ data: task });
}));

tasksRouter.post("/sync/clickup", asyncHandler(async (req, res) => {
  const input = clickUpSyncSchema.parse(req.body);
  const data: Prisma.TaskUncheckedCreateInput = {
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
      source_externalId: {
        source: "clickup",
        externalId: input.externalId
      }
    },
    update: data,
    create: data
  });

  await createEvent({
    type: "task_synced_from_clickup",
    projectId: task.projectId,
    taskId: task.id,
    source: "clickup",
    payload: {
      taskId: task.id,
      externalId: input.externalId,
      raw: (input.raw ?? null) as Prisma.InputJsonValue | null
    }
  });

  res.json({ data: task });
}));
