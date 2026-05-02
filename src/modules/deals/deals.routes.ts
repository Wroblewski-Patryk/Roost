import { DealStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";

const createDealSchema = z.object({
  clientId: z.string().uuid().optional(),
  pipelineStageId: z.string().uuid().optional(),
  title: z.string().min(1),
  value: z.coerce.number().optional(),
  currency: z.string().optional(),
  status: z.nativeEnum(DealStatus).optional(),
  externalId: z.string().optional(),
  source: z.string().optional()
});

export const dealsRouter = Router();

dealsRouter.get("/", asyncHandler(async (_req, res) => {
  const deals = await prisma.deal.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: deals });
}));

dealsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createDealSchema.parse(req.body);
  const deal = await prisma.deal.create({ data: input });
  res.status(201).json({ data: deal });
}));
