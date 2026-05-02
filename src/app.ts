import cors from "cors";
import express from "express";
import { requireApiKey } from "./auth/api-key.middleware";
import { errorHandler } from "./middleware/error-handler";
import { clientsRouter } from "./modules/clients/clients.routes";
import { dealsRouter } from "./modules/deals/deals.routes";
import { eventsRouter } from "./modules/events/events.routes";
import { goalsRouter } from "./modules/goals/goals.routes";
import { notesRouter } from "./modules/notes/notes.routes";
import { projectsRouter } from "./modules/projects/projects.routes";
import { targetsRouter } from "./modules/targets/targets.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";
import { healthRouter } from "./health/health.routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);

  app.use(requireApiKey);
  app.use("/projects", projectsRouter);
  app.use("/goals", goalsRouter);
  app.use("/targets", targetsRouter);
  app.use("/tasks", tasksRouter);
  app.use("/clients", clientsRouter);
  app.use("/deals", dealsRouter);
  app.use("/notes", notesRouter);
  app.use("/events", eventsRouter);

  app.use(errorHandler);

  return app;
}
