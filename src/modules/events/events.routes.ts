import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";

export const eventsRouter = Router();

eventsRouter.get("/", asyncHandler(async (_req, res) => {
  const events = await prisma.event.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: events });
}));
