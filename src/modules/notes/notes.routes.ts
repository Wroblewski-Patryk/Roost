import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

const createNoteSchema = z.object({
  content: z.string().min(1),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  externalId: z.string().optional(),
  source: z.string().optional()
});

export const notesRouter = Router();

notesRouter.get("/", asyncHandler(async (_req, res) => {
  const notes = await prisma.note.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: notes });
}));

notesRouter.post("/", asyncHandler(async (req, res) => {
  const input = createNoteSchema.parse(req.body);
  const note = await prisma.note.create({ data: input });
  await createEvent({
    type: "note_created",
    source: note.source,
    projectId: note.projectId,
    taskId: note.taskId,
    payload: {
      noteId: note.id,
      projectId: note.projectId,
      taskId: note.taskId,
      clientId: note.clientId,
      dealId: note.dealId
    }
  });
  res.status(201).json({ data: note });
}));
