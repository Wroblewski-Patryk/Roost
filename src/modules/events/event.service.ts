import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

type CreateEventInput = {
  type: string;
  source?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  payload?: Prisma.InputJsonValue;
};

export async function createEvent(input: CreateEventInput) {
  return prisma.event.create({
    data: {
      type: input.type,
      source: input.source ?? "companycore",
      projectId: input.projectId,
      taskId: input.taskId,
      payload: input.payload
    }
  });
}
