import cors from "cors";
import express, { Router } from "express";
import { requireApiKey } from "./auth/api-key.middleware";
import { errorHandler } from "./middleware/error-handler";
import { agentLogsRouter } from "./modules/agent-logs/agent-logs.routes";
import { agentsRouter } from "./modules/agents/agents.routes";
import { apiKeysRouter } from "./modules/api-keys/api-keys.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { clientsRouter } from "./modules/clients/clients.routes";
import { connectionRouter } from "./modules/connection/connection.routes";
import { dealsRouter } from "./modules/deals/deals.routes";
import { decisionsRouter } from "./modules/decisions/decisions.routes";
import { eventsRouter } from "./modules/events/events.routes";
import { goalsRouter } from "./modules/goals/goals.routes";
import { integrationSettingsRouter } from "./modules/integration-settings/integration-settings.routes";
import { notesRouter } from "./modules/notes/notes.routes";
import { projectsRouter } from "./modules/projects/projects.routes";
import { targetsRouter } from "./modules/targets/targets.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";
import { healthRouter } from "./health/health.routes";

function mountProtectedRoutes(router: Router) {
  router.use("/projects", projectsRouter);
  router.use("/connection", connectionRouter);
  router.use("/goals", goalsRouter);
  router.use("/targets", targetsRouter);
  router.use("/tasks", tasksRouter);
  router.use("/clients", clientsRouter);
  router.use("/deals", dealsRouter);
  router.use("/notes", notesRouter);
  router.use("/decisions", decisionsRouter);
  router.use("/agents", agentsRouter);
  router.use("/agent-logs", agentLogsRouter);
  router.use("/api-keys", apiKeysRouter);
  router.use("/integration-settings", integrationSettingsRouter);
  router.use("/events", eventsRouter);
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);
  app.use("/v1/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/v1/auth", authRouter);

  app.use(requireApiKey);
  mountProtectedRoutes(app);

  const v1Router = Router();
  mountProtectedRoutes(v1Router);
  app.use("/v1", v1Router);

  app.use(errorHandler);

  return app;
}
