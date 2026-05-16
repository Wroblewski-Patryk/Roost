import type { Request } from "express";

export const capabilities = [
  "connection:read",
  "company-os:read",
  "company-os:definition:write",
  "company-os:workflow-definition:write",
  "company-os:workflow-definition:activate",
  "company-os:approval:request",
  "company-os:approval:decide",
  "company-os:pipeline-run:write",
  "company-os:stage-run:write",
  "company-os:automation:execute",
  "mcp:read",
  "relationships:read",
  "operating-graph:read",
  "operating-model:read",
  "operating-model:write",
  "operating-model:mappings:write",
  "projects:read",
  "projects:write",
  "goals:read",
  "goals:write",
  "targets:read",
  "targets:write",
  "task-lists:read",
  "task-lists:write",
  "tasks:read",
  "tasks:write",
  "tasks:sync:clickup",
  "tasks:clickup:custom-fields:write",
  "clients:read",
  "clients:write",
  "pipeline-stages:read",
  "pipeline-stages:write",
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
  "agent-events:read",
  "agent-events:ack",
  "events:read",
  "integration-settings:clickup:read",
  "integration-settings:clickup:write",
  "integration-settings:clickup:discover",
  "integration-settings:clickup:webhooks:write",
  "integration-settings:clickup:events:read",
  "integration-settings:clickup:events:retry",
  "integration-settings:clickup:maintenance:run",
  "integration-settings:google-drive:read",
  "integration-settings:google-drive:write",
  "integration-settings:google-drive:import",
  "integration-settings:google-drive:changes:reconcile",
  "integration-settings:google-drive:oauth",
  "google-drive:files:read",
  "google-drive:files:write",
  "google-drive:files:scope:write",
  "google-drive:docs:write",
  "google-drive:sheets:write"
] as const;

export type Capability = typeof capabilities[number];

export type ManifestRoute = {
  method: string;
  path: string;
  capability: Capability;
};

export const adapterManifest = {
  basePath: "/v1",
  auth: {
    serviceHeader: "X-API-Key",
    ownerHeader: "Authorization: Bearer <token>"
  },
  schemaVersion: "2026-05-06",
  routes: {
    connection: [
      { method: "GET", path: "/v1/connection", capability: "connection:read" }
    ],
    companyOs: [
      { method: "GET", path: "/v1/company-os", capability: "company-os:read" },
      { method: "GET", path: "/v1/company-os/workflow-definitions/drafts", capability: "company-os:workflow-definition:write" },
      { method: "GET", path: "/v1/company-os/workflow-definitions/drafts/:id", capability: "company-os:workflow-definition:write" },
      { method: "POST", path: "/v1/company-os/workflow-definitions/drafts", capability: "company-os:workflow-definition:write" },
      { method: "PATCH", path: "/v1/company-os/workflow-definitions/drafts/:id", capability: "company-os:workflow-definition:write" },
      { method: "POST", path: "/v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact", capability: "company-os:workflow-definition:write" },
      { method: "POST", path: "/v1/company-os/workflow-definitions/drafts/:id/actions/activate", capability: "company-os:workflow-definition:activate" },
      { method: "POST", path: "/v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive", capability: "company-os:workflow-definition:activate" },
      { method: "POST", path: "/v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft", capability: "company-os:workflow-definition:write" },
      { method: "GET", path: "/v1/company-os/:collection", capability: "company-os:read" },
      { method: "GET", path: "/v1/company-os/:collection/:id", capability: "company-os:read" },
      { method: "POST", path: "/v1/company-os/standards", capability: "company-os:definition:write" },
      { method: "PATCH", path: "/v1/company-os/standards/:id", capability: "company-os:definition:write" },
      { method: "DELETE", path: "/v1/company-os/standards/:id", capability: "company-os:definition:write" },
      { method: "POST", path: "/v1/company-os/approvals/request", capability: "company-os:approval:request" },
      { method: "POST", path: "/v1/company-os/approvals/:id/decision", capability: "company-os:approval:decide" },
      { method: "POST", path: "/v1/company-os/pipeline-runs/:id/actions/start-stage", capability: "company-os:pipeline-run:write" },
      { method: "POST", path: "/v1/company-os/stage-runs/:id/actions/block", capability: "company-os:stage-run:write" },
      { method: "POST", path: "/v1/company-os/stage-runs/:id/actions/validate", capability: "company-os:stage-run:write" },
      { method: "POST", path: "/v1/company-os/stage-runs/:id/actions/complete", capability: "company-os:stage-run:write" },
      { method: "POST", path: "/v1/company-os/events/:id/actions/evaluate-automation-rules", capability: "company-os:automation:execute" }
    ],
    mcp: [
      { method: "GET", path: "/v1/mcp/manifest", capability: "mcp:read" }
    ],
    relationships: [
      { method: "GET", path: "/v1/relationships/graph", capability: "relationships:read" }
    ],
    operatingGraph: [
      { method: "GET", path: "/v1/operating-graph/areas/:areaKey", capability: "operating-graph:read" }
    ],
    operatingModel: [
      { method: "GET", path: "/v1/connection", capability: "operating-model:read" },
      { method: "GET", path: "/v1/operating-model", capability: "operating-model:read" },
      { method: "GET", path: "/v1/operating-model/areas", capability: "operating-model:read" },
      { method: "POST", path: "/v1/operating-model/areas", capability: "operating-model:write" },
      { method: "PATCH", path: "/v1/operating-model/areas/:id", capability: "operating-model:write" },
      { method: "DELETE", path: "/v1/operating-model/areas/:id", capability: "operating-model:write" },
      { method: "GET", path: "/v1/operating-model/tables", capability: "operating-model:read" },
      { method: "GET", path: "/v1/operating-model/folders", capability: "operating-model:read" },
      { method: "GET", path: "/v1/operating-model/folders/:id", capability: "operating-model:read" },
      { method: "POST", path: "/v1/operating-model/folders", capability: "operating-model:write" },
      { method: "PATCH", path: "/v1/operating-model/folders/:id", capability: "operating-model:write" },
      { method: "DELETE", path: "/v1/operating-model/folders/:id", capability: "operating-model:write" },
      { method: "GET", path: "/v1/operating-model/external-mappings", capability: "operating-model:read" },
      { method: "PATCH", path: "/v1/operating-model/external-mappings/:id/scope", capability: "operating-model:mappings:write" },
      { method: "GET", path: "/v1/operating-model/external-fields", capability: "operating-model:read" },
      { method: "GET", path: "/v1/operating-model/storage-locations", capability: "operating-model:read" },
      { method: "GET", path: "/v1/operating-model/storage-locations/:id", capability: "operating-model:read" },
      { method: "POST", path: "/v1/operating-model/storage-locations", capability: "operating-model:write" },
      { method: "PATCH", path: "/v1/operating-model/storage-locations/:id", capability: "operating-model:write" },
      { method: "DELETE", path: "/v1/operating-model/storage-locations/:id", capability: "operating-model:write" },
      { method: "GET", path: "/v1/operating-model/knowledge-roots", capability: "operating-model:read" },
      { method: "GET", path: "/v1/operating-model/knowledge-roots/:id", capability: "operating-model:read" },
      { method: "POST", path: "/v1/operating-model/knowledge-roots", capability: "operating-model:write" },
      { method: "PATCH", path: "/v1/operating-model/knowledge-roots/:id", capability: "operating-model:write" },
      { method: "DELETE", path: "/v1/operating-model/knowledge-roots/:id", capability: "operating-model:write" },
      { method: "GET", path: "/v1/operating-model/automation-definitions", capability: "operating-model:read" },
      { method: "GET", path: "/v1/operating-model/automation-definitions/:id", capability: "operating-model:read" },
      { method: "POST", path: "/v1/operating-model/automation-definitions", capability: "operating-model:write" },
      { method: "PATCH", path: "/v1/operating-model/automation-definitions/:id", capability: "operating-model:write" },
      { method: "DELETE", path: "/v1/operating-model/automation-definitions/:id", capability: "operating-model:write" }
    ],
    projects: [
      { method: "GET", path: "/v1/projects", capability: "projects:read" },
      { method: "GET", path: "/v1/projects/:id", capability: "projects:read" },
      { method: "POST", path: "/v1/projects", capability: "projects:write" },
      { method: "PATCH", path: "/v1/projects/:id", capability: "projects:write" },
      { method: "DELETE", path: "/v1/projects/:id", capability: "projects:write" }
    ],
    goals: [
      { method: "GET", path: "/v1/goals", capability: "goals:read" },
      { method: "GET", path: "/v1/goals/:id", capability: "goals:read" },
      { method: "POST", path: "/v1/goals", capability: "goals:write" },
      { method: "PATCH", path: "/v1/goals/:id", capability: "goals:write" },
      { method: "DELETE", path: "/v1/goals/:id", capability: "goals:write" }
    ],
    targets: [
      { method: "GET", path: "/v1/targets", capability: "targets:read" },
      { method: "GET", path: "/v1/targets/:id", capability: "targets:read" },
      { method: "POST", path: "/v1/targets", capability: "targets:write" },
      { method: "PATCH", path: "/v1/targets/:id", capability: "targets:write" },
      { method: "DELETE", path: "/v1/targets/:id", capability: "targets:write" }
    ],
    taskLists: [
      { method: "GET", path: "/v1/task-lists", capability: "task-lists:read" },
      { method: "GET", path: "/v1/task-lists/:id", capability: "task-lists:read" },
      { method: "POST", path: "/v1/task-lists", capability: "task-lists:write" },
      { method: "PATCH", path: "/v1/task-lists/:id", capability: "task-lists:write" },
      { method: "DELETE", path: "/v1/task-lists/:id", capability: "task-lists:write" }
    ],
    tasks: [
      { method: "GET", path: "/v1/tasks", capability: "tasks:read" },
      { method: "GET", path: "/v1/tasks/:id", capability: "tasks:read" },
      { method: "POST", path: "/v1/tasks", capability: "tasks:write" },
      { method: "PATCH", path: "/v1/tasks/:id", capability: "tasks:write" },
      { method: "DELETE", path: "/v1/tasks/:id", capability: "tasks:write" },
      { method: "POST", path: "/v1/tasks/:id/clickup/custom-fields/:fieldId", capability: "tasks:clickup:custom-fields:write" },
      { method: "POST", path: "/v1/tasks/sync/clickup/native", capability: "tasks:sync:clickup" }
    ],
    clients: [
      { method: "GET", path: "/v1/clients", capability: "clients:read" },
      { method: "GET", path: "/v1/clients/:id", capability: "clients:read" },
      { method: "POST", path: "/v1/clients", capability: "clients:write" },
      { method: "PATCH", path: "/v1/clients/:id", capability: "clients:write" },
      { method: "DELETE", path: "/v1/clients/:id", capability: "clients:write" }
    ],
    pipelineStages: [
      { method: "GET", path: "/v1/pipeline-stages", capability: "pipeline-stages:read" },
      { method: "GET", path: "/v1/pipeline-stages/:id", capability: "pipeline-stages:read" },
      { method: "POST", path: "/v1/pipeline-stages", capability: "pipeline-stages:write" },
      { method: "PATCH", path: "/v1/pipeline-stages/:id", capability: "pipeline-stages:write" },
      { method: "DELETE", path: "/v1/pipeline-stages/:id", capability: "pipeline-stages:write" }
    ],
    deals: [
      { method: "GET", path: "/v1/deals", capability: "deals:read" },
      { method: "GET", path: "/v1/deals/:id", capability: "deals:read" },
      { method: "POST", path: "/v1/deals", capability: "deals:write" },
      { method: "PATCH", path: "/v1/deals/:id", capability: "deals:write" },
      { method: "DELETE", path: "/v1/deals/:id", capability: "deals:write" }
    ],
    interactions: [
      { method: "GET", path: "/v1/interactions", capability: "interactions:read" },
      { method: "GET", path: "/v1/interactions/:id", capability: "interactions:read" },
      { method: "POST", path: "/v1/interactions", capability: "interactions:write" },
      { method: "PATCH", path: "/v1/interactions/:id", capability: "interactions:write" },
      { method: "DELETE", path: "/v1/interactions/:id", capability: "interactions:write" }
    ],
    notes: [
      { method: "GET", path: "/v1/notes", capability: "notes:read" },
      { method: "GET", path: "/v1/notes/:id", capability: "notes:read" },
      { method: "POST", path: "/v1/notes", capability: "notes:write" },
      { method: "PATCH", path: "/v1/notes/:id", capability: "notes:write" },
      { method: "DELETE", path: "/v1/notes/:id", capability: "notes:write" }
    ],
    decisions: [
      { method: "GET", path: "/v1/decisions", capability: "decisions:read" },
      { method: "GET", path: "/v1/decisions/:id", capability: "decisions:read" },
      { method: "POST", path: "/v1/decisions", capability: "decisions:write" },
      { method: "PATCH", path: "/v1/decisions/:id", capability: "decisions:write" },
      { method: "DELETE", path: "/v1/decisions/:id", capability: "decisions:write" }
    ],
    agents: [
      { method: "GET", path: "/v1/agents", capability: "agents:read" },
      { method: "GET", path: "/v1/agents/:id", capability: "agents:read" },
      { method: "POST", path: "/v1/agents", capability: "agents:write" },
      { method: "PATCH", path: "/v1/agents/:id", capability: "agents:write" },
      { method: "DELETE", path: "/v1/agents/:id", capability: "agents:write" }
    ],
    agentLogs: [
      { method: "GET", path: "/v1/agent-logs", capability: "agent-logs:read" },
      { method: "GET", path: "/v1/agent-logs/:id", capability: "agent-logs:read" },
      { method: "POST", path: "/v1/agent-logs", capability: "agent-logs:write" }
    ],
    agentEvents: [
      { method: "GET", path: "/v1/agent-events", capability: "agent-events:read" },
      { method: "POST", path: "/v1/agent-events/:id/ack", capability: "agent-events:ack" }
    ],
    events: [
      { method: "GET", path: "/v1/events", capability: "events:read" }
    ],
    integrationSettings: [
      { method: "GET", path: "/v1/integration-settings/clickup", capability: "integration-settings:clickup:read" },
      { method: "PUT", path: "/v1/integration-settings/clickup", capability: "integration-settings:clickup:write" },
      { method: "POST", path: "/v1/integration-settings/clickup/discover", capability: "integration-settings:clickup:discover" },
      { method: "GET", path: "/v1/integration-settings/clickup/webhooks", capability: "integration-settings:clickup:read" },
      { method: "POST", path: "/v1/integration-settings/clickup/webhooks/reconcile", capability: "integration-settings:clickup:webhooks:write" },
      { method: "DELETE", path: "/v1/integration-settings/clickup/webhooks/:id", capability: "integration-settings:clickup:webhooks:write" },
      { method: "GET", path: "/v1/integration-settings/clickup/events", capability: "integration-settings:clickup:events:read" },
      { method: "POST", path: "/v1/integration-settings/clickup/events/retry-failed", capability: "integration-settings:clickup:events:retry" },
      { method: "POST", path: "/v1/integration-settings/clickup/maintenance/run", capability: "integration-settings:clickup:maintenance:run" },
      { method: "GET", path: "/v1/integration-settings/google_drive", capability: "integration-settings:google-drive:read" },
      { method: "PUT", path: "/v1/integration-settings/google_drive", capability: "integration-settings:google-drive:write" },
      { method: "POST", path: "/v1/integration-settings/google_drive/import", capability: "integration-settings:google-drive:import" },
      { method: "GET", path: "/v1/integration-settings/google_drive/folders/discover", capability: "integration-settings:google-drive:read" },
      { method: "POST", path: "/v1/integration-settings/google_drive/changes/reconcile", capability: "integration-settings:google-drive:changes:reconcile" },
      { method: "POST", path: "/v1/integration-settings/google_drive/oauth/authorize-url", capability: "integration-settings:google-drive:oauth" },
      { method: "POST", path: "/v1/integration-settings/google_drive/oauth/exchange", capability: "integration-settings:google-drive:oauth" }
    ],
    googleDrive: [
      { method: "GET", path: "/v1/google-drive/files", capability: "google-drive:files:read" },
      { method: "GET", path: "/v1/google-drive/files/:id/content", capability: "google-drive:files:read" },
      { method: "PATCH", path: "/v1/google-drive/files/:id/description", capability: "google-drive:files:write" },
      { method: "PATCH", path: "/v1/google-drive/files/:id/scope", capability: "google-drive:files:scope:write" },
      { method: "POST", path: "/v1/google-drive/docs", capability: "google-drive:docs:write" },
      { method: "PATCH", path: "/v1/google-drive/docs/:id", capability: "google-drive:docs:write" },
      { method: "POST", path: "/v1/google-drive/sheets", capability: "google-drive:sheets:write" },
      { method: "PUT", path: "/v1/google-drive/sheets/:id/values", capability: "google-drive:sheets:write" }
    ]
  },
  writeRules: [
    "Do not send workspaceId in write payloads.",
    "Use CompanyCore IDs returned by this API when linking records.",
    "Treat DELETE routes for business records as archive/deactivate lifecycle operations, not physical deletion.",
    "Use provider lifecycle routes such as retry, reconcile, refresh, scope, and ack instead of raw provider table writes.",
    "Store raw API keys only in the adapter secret store.",
    "Treat 401, 403, and 422 responses as fail-closed startup errors."
  ],
  schemas: {
    agent: {
      create: {
        required: ["name"],
        optional: ["role", "source", "status", "metadata"]
      },
      update: {
        optional: ["name", "role", "source", "status", "metadata"]
      }
    },
    note: {
      create: {
        required: ["content"],
        optional: ["projectId", "taskId", "clientId", "dealId", "status", "externalId", "source"]
      },
      update: {
        optional: ["content", "projectId", "taskId", "clientId", "dealId", "status"]
      }
    },
    decision: {
      create: {
        required: ["title", "rationale"],
        optional: ["projectId", "taskId", "status", "outcome", "source"]
      },
      update: {
        optional: ["title", "rationale", "projectId", "taskId", "status", "outcome"]
      }
    },
    agentLog: {
      create: {
        required: ["message"],
        optional: ["agentId", "level", "metadata"]
      }
    },
    agentEventAck: {
      create: {
        required: [],
        optional: ["targetAgent"]
      }
    }
  },
  errors: {
    "400": "Fix payload validation before retrying.",
    "401": "Stop write mode because credentials are missing or invalid.",
    "403": "Stop the attempted action because the key lacks permission.",
    "404": "Treat the record as missing or not visible to this workspace.",
    "409": "Resolve the relation or state conflict before retrying.",
    "422": "Stop startup or write flow because workspace or integration context is invalid."
  }
} as const;

export const broadCompatibilityScopes = new Set(["*", "companycore:*"]);

const manifestRoutes = Object.values(adapterManifest.routes).flat() as ManifestRoute[];

function routePattern(path: string) {
  const escaped = path
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:[^/]+/g, "[^/]+");
  return new RegExp(`^${escaped}/?$`);
}

function normalizedRequestPaths(req: Request) {
  const path = req.path.replace(/\/+$/, "") || "/";
  if (path.startsWith("/v1/") || path === "/v1") {
    return [path];
  }
  return [`/v1${path === "/" ? "" : path}`, path];
}

export function scopesAreBroad(scopes: string[]) {
  return scopes.length === 0
    || scopes.some((scope) => broadCompatibilityScopes.has(scope) || scope.startsWith("adapter:"));
}

export function effectiveCapabilities(scopes: string[] | undefined) {
  const normalized = scopes ?? [];
  if (scopesAreBroad(normalized)) {
    return [...capabilities];
  }
  return capabilities.filter((capability) => normalized.includes(capability));
}

export function hasCapability(scopes: string[] | undefined, capability: Capability) {
  return effectiveCapabilities(scopes).includes(capability);
}

export function capabilityForRequest(req: Request) {
  const paths = normalizedRequestPaths(req);
  const method = req.method.toUpperCase();

  return manifestRoutes.find((route) => (
    route.method === method
    && paths.some((path) => routePattern(route.path).test(path))
  ))?.capability ?? null;
}
