import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

const createGoalSchema = z.object({
  projectId: z.string().uuid().optional(),
  processId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  externalId: z.string().optional(),
  source: z.string().optional()
});

const updateGoalSchema = createGoalSchema.partial().omit({
  externalId: true,
  source: true
});

export const goalsRouter = Router();

async function projectIsVisible(workspaceId: string, projectId?: string) {
  if (!projectId) {
    return true;
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId }
  });

  return Boolean(project);
}

async function processIsVisible(workspaceId: string, processId?: string | null) {
  if (!processId) {
    return true;
  }

  const process = await prisma.process.findFirst({
    where: { id: processId, workspaceId }
  });

  return Boolean(process);
}

goalsRouter.get("/", asyncHandler(async (req, res) => {
  const goals = await prisma.goal.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: { createdAt: "desc" },
    include: { process: true }
  });
  res.json({ data: goals });
}));

goalsRouter.get("/:id", asyncHandler(async (req, res) => {
  const goal = await prisma.goal.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId },
    include: { process: true }
  });

  if (!goal) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ data: goal });
}));

goalsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createGoalSchema.parse(req.body);
  if (!await projectIsVisible(req.auth!.workspaceId, input.projectId)) {
    return res.status(404).json({ error: "not_found" });
  }
  if (!await processIsVisible(req.auth!.workspaceId, input.processId)) {
    return res.status(404).json({ error: "not_found" });
  }

  const goal = await prisma.goal.create({
    data: {
      ...input,
      workspaceId: req.auth!.workspaceId
    },
    include: { process: true }
  });
  await createEvent({
    type: "goal_created",
    workspaceId: req.auth!.workspaceId,
    projectId: goal.projectId,
    source: goal.source,
    payload: { goalId: goal.id, title: goal.title }
  });
  res.status(201).json({ data: goal });
}));

goalsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateGoalSchema.parse(req.body);
  if (!await projectIsVisible(req.auth!.workspaceId, input.projectId)) {
    return res.status(404).json({ error: "not_found" });
  }
  if (!await processIsVisible(req.auth!.workspaceId, input.processId)) {
    return res.status(404).json({ error: "not_found" });
  }

  const existing = await prisma.goal.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const goal = await prisma.goal.update({
    where: { id: existing.id },
    data: input,
    include: { process: true }
  });

  await createEvent({
    type: "goal_updated",
    workspaceId: req.auth!.workspaceId,
    projectId: goal.projectId,
    source: goal.source,
    payload: { goalId: goal.id, changed: Object.keys(input) }
  });

  res.json({ data: goal });
}));

goalsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.goal.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const goal = await prisma.goal.update({
    where: { id: existing.id },
    data: { status: "archived" },
    include: { process: true }
  });

  await createEvent({
    type: "goal_archived",
    workspaceId: req.auth!.workspaceId,
    projectId: goal.projectId,
    source: goal.source,
    payload: { goalId: goal.id }
  });

  res.json({ data: goal });
}));
