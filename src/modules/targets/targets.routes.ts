import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

const createTargetSchema = z.object({
  goalId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  metric: z.string().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  dueDate: z.coerce.date().optional(),
  status: z.string().optional(),
  externalId: z.string().optional(),
  source: z.string().optional()
});

export const targetsRouter = Router();

targetsRouter.get("/", asyncHandler(async (_req, res) => {
  const targets = await prisma.target.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: targets });
}));

targetsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createTargetSchema.parse(req.body);
  const target = await prisma.target.create({ data: input });
  await createEvent({
    type: "target_created",
    source: target.source,
    payload: { targetId: target.id, title: target.title, goalId: target.goalId }
  });
  res.status(201).json({ data: target });
}));
