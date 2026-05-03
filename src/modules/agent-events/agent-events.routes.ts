import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";

const ackSchema = z.object({
  targetAgent: z.string().min(1).optional()
}).strict();

export const agentEventsRouter = Router();

agentEventsRouter.get("/", asyncHandler(async (req, res) => {
  const targetAgent = typeof req.query.targetAgent === "string" ? req.query.targetAgent : undefined;
  const events = await prisma.agentEventOutbox.findMany({
    where: {
      workspaceId: req.auth!.workspaceId,
      deliveryStatus: "pending",
      availableAt: { lte: new Date() },
      OR: targetAgent
        ? [{ targetAgent }, { targetAgent: null }]
        : undefined
    },
    orderBy: { availableAt: "asc" },
    take: 100
  });
  res.json({ data: events });
}));

agentEventsRouter.post("/:id/ack", asyncHandler(async (req, res) => {
  const input = ackSchema.parse(req.body ?? {});
  const event = await prisma.agentEventOutbox.findFirst({
    where: {
      id: String(req.params.id),
      workspaceId: req.auth!.workspaceId,
      ...(input.targetAgent ? { OR: [{ targetAgent: input.targetAgent }, { targetAgent: null }] } : {})
    }
  });

  if (!event) {
    return res.status(404).json({ error: "not_found" });
  }

  const updated = await prisma.agentEventOutbox.update({
    where: { id: event.id },
    data: {
      deliveryStatus: "delivered",
      deliveredAt: new Date()
    }
  });
  res.json({ data: updated });
}));
