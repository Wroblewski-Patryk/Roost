import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";

const capabilities = [
  "connection:read",
  "projects:read",
  "projects:write",
  "goals:read",
  "goals:write",
  "targets:read",
  "targets:write",
  "tasks:read",
  "tasks:write",
  "tasks:sync:clickup",
  "clients:read",
  "clients:write",
  "deals:read",
  "deals:write",
  "interactions:read",
  "interactions:write",
  "notes:read",
  "notes:write",
  "decisions:read",
  "decisions:write",
  "agents:read",
  "agents:write",
  "agent-logs:read",
  "agent-logs:write",
  "events:read",
  "integration-settings:clickup:read"
] as const;

const adapterManifest = {
  basePath: "/v1",
  auth: {
    serviceHeader: "X-API-Key",
    ownerHeader: "Authorization: Bearer <token>"
  },
  routes: {
    connection: [
      { method: "GET", path: "/v1/connection", capability: "connection:read" }
    ],
    projects: [
      { method: "GET", path: "/v1/projects", capability: "projects:read" },
      { method: "POST", path: "/v1/projects", capability: "projects:write" }
    ],
    goals: [
      { method: "GET", path: "/v1/goals", capability: "goals:read" },
      { method: "POST", path: "/v1/goals", capability: "goals:write" }
    ],
    targets: [
      { method: "GET", path: "/v1/targets", capability: "targets:read" },
      { method: "POST", path: "/v1/targets", capability: "targets:write" }
    ],
    tasks: [
      { method: "GET", path: "/v1/tasks", capability: "tasks:read" },
      { method: "POST", path: "/v1/tasks", capability: "tasks:write" },
      { method: "PATCH", path: "/v1/tasks/:id", capability: "tasks:write" },
      { method: "POST", path: "/v1/tasks/sync/clickup/native", capability: "tasks:sync:clickup" }
    ],
    clients: [
      { method: "GET", path: "/v1/clients", capability: "clients:read" },
      { method: "POST", path: "/v1/clients", capability: "clients:write" }
    ],
    deals: [
      { method: "GET", path: "/v1/deals", capability: "deals:read" },
      { method: "POST", path: "/v1/deals", capability: "deals:write" }
    ],
    interactions: [
      { method: "GET", path: "/v1/interactions", capability: "interactions:read" },
      { method: "POST", path: "/v1/interactions", capability: "interactions:write" }
    ],
    notes: [
      { method: "GET", path: "/v1/notes", capability: "notes:read" },
      { method: "POST", path: "/v1/notes", capability: "notes:write" }
    ],
    decisions: [
      { method: "GET", path: "/v1/decisions", capability: "decisions:read" },
      { method: "POST", path: "/v1/decisions", capability: "decisions:write" }
    ],
    agents: [
      { method: "GET", path: "/v1/agents", capability: "agents:read" },
      { method: "POST", path: "/v1/agents", capability: "agents:write" }
    ],
    agentLogs: [
      { method: "GET", path: "/v1/agent-logs", capability: "agent-logs:read" },
      { method: "POST", path: "/v1/agent-logs", capability: "agent-logs:write" }
    ],
    events: [
      { method: "GET", path: "/v1/events", capability: "events:read" }
    ],
    integrationSettings: [
      { method: "GET", path: "/v1/integration-settings/clickup", capability: "integration-settings:clickup:read" }
    ]
  },
  writeRules: [
    "Do not send workspaceId in write payloads.",
    "Use CompanyCore IDs returned by this API when linking records.",
    "Store raw API keys only in the adapter secret store.",
    "Treat 401, 403, and 422 responses as fail-closed startup errors."
  ]
} as const;

export const connectionRouter = Router();

connectionRouter.get("/", asyncHandler(async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.auth!.workspaceId },
    select: {
      id: true,
      name: true,
      ownerUserId: true
    }
  });

  if (!workspace) {
    return res.status(422).json({ error: "workspace_required" });
  }

  const clickUp = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: workspace.id,
        provider: "clickup"
      }
    },
    select: {
      active: true,
      secretCiphertext: true,
      config: true,
      updatedAt: true
    }
  });

  res.json({
    data: {
      service: "companycore",
      apiVersion: "v1",
      status: "ok",
      auth: {
        type: req.auth!.authType,
        userId: req.auth!.userId,
        apiKeyId: req.auth!.apiKeyId,
        workspaceId: workspace.id
      },
      workspace: {
        id: workspace.id,
        name: workspace.name
      },
      capabilities,
      adapterManifest,
      integrations: {
        clickup: {
          configured: Boolean(clickUp?.secretCiphertext),
          active: Boolean(clickUp?.active),
          config: clickUp?.config ?? {},
          updatedAt: clickUp?.updatedAt ?? null
        }
      }
    }
  });
}));
