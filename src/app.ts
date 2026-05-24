import cors from "cors";
import express, { Router } from "express";
import path from "path";
import { requireApiKey } from "./auth/api-key.middleware";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { createRateLimiter, requestContext, securityHeaders } from "./middleware/security";
import { agentLogsRouter } from "./modules/agent-logs/agent-logs.routes";
import { agentEventsRouter } from "./modules/agent-events/agent-events.routes";
import { agentsRouter } from "./modules/agents/agents.routes";
import { apiKeysRouter } from "./modules/api-keys/api-keys.routes";
import { assetsRouter } from "./modules/assets/assets.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { clientsRouter } from "./modules/clients/clients.routes";
import { companyOsRouter } from "./modules/company-os/company-os.routes";
import { commercialExceptionsRouter } from "./modules/commercial-exceptions/commercial-exceptions.routes";
import { connectionRouter } from "./modules/connection/connection.routes";
import { dealsRouter } from "./modules/deals/deals.routes";
import { departmentsRouter } from "./modules/departments/departments.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { decisionsRouter } from "./modules/decisions/decisions.routes";
import { eventsRouter } from "./modules/events/events.routes";
import { financeRouter } from "./modules/finance/finance.routes";
import { goalsRouter } from "./modules/goals/goals.routes";
import { googleDriveRouter } from "./modules/google-drive/google-drive.routes";
import { intakeRouter } from "./modules/intake/intake.routes";
import { integrationSettingsRouter } from "./modules/integration-settings/integration-settings.routes";
import { mcpRouter } from "./modules/mcp/mcp.routes";
import { notesRouter } from "./modules/notes/notes.routes";
import { operatingGraphRouter } from "./modules/operating-graph/operating-graph.routes";
import { operatingModelRouter } from "./modules/operating-model/operating-model.routes";
import { operationsRouter } from "./modules/operations/operations.routes";
import { pipelineStagesRouter } from "./modules/pipeline-stages/pipeline-stages.routes";
import { projectsRouter } from "./modules/projects/projects.routes";
import { relationshipsRouter } from "./modules/relationships/relationships.routes";
import { salesRouter } from "./modules/sales/sales.routes";
import { strategyRouter } from "./modules/strategy/strategy.routes";
import { targetsRouter } from "./modules/targets/targets.routes";
import { taskListsRouter } from "./modules/task-lists/task-lists.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";
import { clickUpWebhooksRouter } from "./modules/webhooks/clickup-webhooks.routes";
import { healthRouter } from "./health/health.routes";
import { interactionsRouter } from "./modules/interactions/interactions.routes";
import { workspacesRouter } from "./modules/workspaces/workspaces.routes";
import { workforceRouter } from "./modules/workforce/workforce.routes";

function mountProtectedRoutes(router: Router) {
  router.use("/projects", projectsRouter);
  router.use("/assets", assetsRouter);
  router.use("/company-os", companyOsRouter);
  router.use("/commercial-exceptions", commercialExceptionsRouter);
  router.use("/connection", connectionRouter);
  router.use("/dashboard", dashboardRouter);
  router.use("/departments", departmentsRouter);
  router.use("/workspaces", workspacesRouter);
  router.use("/mcp", mcpRouter);
  router.use("/operating-graph", operatingGraphRouter);
  router.use("/operating-model", operatingModelRouter);
  router.use("/operations", operationsRouter);
  router.use("/workforce", workforceRouter);
  router.use("/relationships", relationshipsRouter);
  router.use("/sales", salesRouter);
  router.use("/strategy", strategyRouter);
  router.use("/goals", goalsRouter);
  router.use("/google-drive", googleDriveRouter);
  router.use("/intake", intakeRouter);
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
  router.use("/agent-events", agentEventsRouter);
  router.use("/api-keys", apiKeysRouter);
  router.use("/integration-settings", integrationSettingsRouter);
  router.use("/events", eventsRouter);
  router.use("/finance", financeRouter);
}

function isApiHost(host = "") {
  return host.split(":")[0] === "api.companycore.luckysparrow.ch";
}

const reactAppRoutes = [
  "/operations",
  "/people-agents",
  "/workforce",
  "/dashboard",
  "/areas",
  "/account/settings",
  "/workspace/settings",
  "/auth/login",
  "/auth/register",
  "/react-dashboard"
];

function createCorsMiddleware() {
  if (env.nodeEnv !== "production") {
    return cors();
  }

  const allowedOrigins = new Set(env.corsAllowedOrigins);
  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("cors_origin_not_allowed"));
    }
  });
}

const authRateLimiter = createRateLimiter({
  keyPrefix: "auth",
  max: env.nodeEnv === "test" ? 1000 : 40,
  windowMs: 15 * 60 * 1000,
  skip: (req) => req.method === "OPTIONS"
});

const apiRateLimiter = createRateLimiter({
  keyPrefix: "api",
  max: env.nodeEnv === "test" ? 10000 : 1200,
  windowMs: 15 * 60 * 1000,
  skip: (req) => req.method === "OPTIONS" || req.path === "/health" || req.path === "/v1/health"
});

export function createApp() {
  const app = express();
  const publicRoot = path.join(process.cwd(), "public");
  const staticFiles = express.static(publicRoot);

  app.use(requestContext);
  app.use(securityHeaders);
  app.use(createCorsMiddleware());
  app.use("/v1/webhooks/clickup", express.raw({ type: "application/json", limit: "1mb" }), clickUpWebhooksRouter);
  app.use(express.json({ limit: "1mb" }));
  app.get("/", (req, res, next) => {
    if (!isApiHost(req.headers.host)) {
      res.sendFile(path.join(publicRoot, "react", "index.html"));
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
  app.get(reactAppRoutes, (req, res, next) => {
    if (isApiHost(req.headers.host)) {
      next();
      return;
    }

    res.sendFile(path.join(publicRoot, "react", "index.html"));
  });
  app.use("/health", healthRouter);
  app.use("/v1/health", healthRouter);
  app.use(["/auth", "/v1/auth"], authRateLimiter);
  app.use("/auth", authRouter);
  app.use("/v1/auth", authRouter);

  app.use(apiRateLimiter);
  app.use(requireApiKey);
  mountProtectedRoutes(app);

  const v1Router = Router();
  mountProtectedRoutes(v1Router);
  app.use("/v1", v1Router);

  app.use(errorHandler);

  return app;
}
