import cors from "cors";
import express, { Router } from "express";
import path from "path";
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
import { operatingModelRouter } from "./modules/operating-model/operating-model.routes";
import { pipelineStagesRouter } from "./modules/pipeline-stages/pipeline-stages.routes";
import { projectsRouter } from "./modules/projects/projects.routes";
import { targetsRouter } from "./modules/targets/targets.routes";
import { taskListsRouter } from "./modules/task-lists/task-lists.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";
import { clickUpWebhooksRouter } from "./modules/webhooks/clickup-webhooks.routes";
import { healthRouter } from "./health/health.routes";
import { interactionsRouter } from "./modules/interactions/interactions.routes";

function mountProtectedRoutes(router: Router) {
  router.use("/projects", projectsRouter);
  router.use("/connection", connectionRouter);
  router.use("/operating-model", operatingModelRouter);
  router.use("/goals", goalsRouter);
  router.use("/targets", targetsRouter);
  router.use("/task-lists", taskListsRouter);
  router.use("/tasks", tasksRouter);
  router.use("/clients", clientsRouter);
  router.use("/pipeline-stages", pipelineStagesRouter);
  router.use("/deals", dealsRouter);
  router.use("/interactions", interactionsRouter);
  router.use("/notes", notesRouter);
  router.use("/decisions", decisionsRouter);
  router.use("/agents", agentsRouter);
  router.use("/agent-logs", agentLogsRouter);
  router.use("/api-keys", apiKeysRouter);
  router.use("/integration-settings", integrationSettingsRouter);
  router.use("/events", eventsRouter);
}

function isApiHost(host = "") {
  return host.split(":")[0] === "api.companycore.luckysparrow.ch";
}

const webAppRoutes = [
  "/",
  "/auth/login",
  "/auth/register",
  "/dashboard",
  "/settings",
  "/settings/api"
];

export function createApp() {
  const app = express();
  const publicRoot = path.join(process.cwd(), "public");
  const staticFiles = express.static(publicRoot);

  app.use(cors());
  app.use("/v1/webhooks/clickup", express.raw({ type: "application/json", limit: "1mb" }), clickUpWebhooksRouter);
  app.use(express.json({ limit: "1mb" }));
  app.get("/", (req, res, next) => {
    if (!isApiHost(req.headers.host)) {
      next();
      return;
    }

    res.json({
      data: {
        service: "companycore",
        web: "https://companycore.luckysparrow.ch",
        api: "https://api.companycore.luckysparrow.ch",
        health: "/health",
        version: "v1"
      }
    });
  });
  app.use((req, res, next) => {
    if (isApiHost(req.headers.host)) {
      next();
      return;
    }

    staticFiles(req, res, next);
  });
  app.get(webAppRoutes, (req, res, next) => {
    if (isApiHost(req.headers.host)) {
      next();
      return;
    }

    res.sendFile(path.join(publicRoot, "index.html"));
  });

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
