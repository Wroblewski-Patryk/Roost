import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

const createInteractionSchema = z.object({
  clientId: z.string().uuid().optional(),
  type: z.string().min(1),
  summary: z.string().optional(),
  occurredAt: z.coerce.date().optional(),
  externalId: z.string().min(1).optional(),
  source: z.string().min(1).optional()
}).strict();

export const interactionsRouter = Router();

interactionsRouter.get("/", asyncHandler(async (req, res) => {
  const interactions = await prisma.interaction.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: { occurredAt: "desc" }
  });

  res.json({ data: interactions });
}));

interactionsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createInteractionSchema.parse(req.body);

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, workspaceId: req.auth!.workspaceId }
    });

    if (!client) {
      return res.status(404).json({ error: "not_found" });
    }
  }

  const interaction = await prisma.interaction.create({
    data: {
      ...input,
      workspaceId: req.auth!.workspaceId
    }
  });

  await createEvent({
    type: "interaction_created",
    workspaceId: req.auth!.workspaceId,
    source: interaction.source,
    payload: {
      interactionId: interaction.id,
      clientId: interaction.clientId,
      type: interaction.type,
      occurredAt: interaction.occurredAt
    }
  });

  res.status(201).json({ data: interaction });
}));
