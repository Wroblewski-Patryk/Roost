import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

const createClientSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.string().optional(),
  externalId: z.string().optional(),
  source: z.string().optional()
});

export const clientsRouter = Router();

clientsRouter.get("/", asyncHandler(async (_req, res) => {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: clients });
}));

clientsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createClientSchema.parse(req.body);
  const client = await prisma.client.create({ data: input });
  await createEvent({
    type: "client_created",
    source: client.source,
    payload: {
      clientId: client.id,
      name: client.name,
      companyName: client.companyName
    }
  });
  res.status(201).json({ data: client });
}));
