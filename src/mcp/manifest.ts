import { adapterManifest, effectiveCapabilities, type Capability, type ManifestRoute } from "../auth/capabilities";

type McpTool = {
  name: string;
  title: string;
  description: string;
  method: string;
  path: string;
  capability: Capability;
  riskLevel: "read" | "write" | "destructive";
  requiresApproval: boolean;
  inputSchema: {
    type: "object";
    additionalProperties: boolean;
    properties: Record<string, unknown>;
    required: string[];
  };
};

function toolNameForRoute(route: ManifestRoute) {
  const normalizedPath = route.path
    .replace(/^\/v1\/?/, "")
    .replace(/:([A-Za-z0-9_]+)/g, "by_$1")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `companycore_${route.method.toLowerCase()}_${normalizedPath || "root"}`;
}

function titleForRoute(route: ManifestRoute) {
  return `${route.method} ${route.path}`;
}

function riskForRoute(route: ManifestRoute): McpTool["riskLevel"] {
  if (route.method === "GET") {
    return "read";
  }

  if (route.method === "DELETE") {
    return "destructive";
  }

  return "write";
}

function inputSchemaForRoute(route: ManifestRoute): McpTool["inputSchema"] {
  const pathParameters = Array.from(route.path.matchAll(/:([A-Za-z0-9_]+)/g)).map((match) => match[1]!);
  const properties: Record<string, unknown> = {};

  for (const parameter of pathParameters) {
    properties[parameter] = {
      type: "string",
      description: `Path parameter ${parameter}.`
    };
  }

  if (route.method === "GET") {
    properties.query = {
      type: "object",
      description: "Optional query parameters supported by the HTTP route.",
      additionalProperties: true
    };
  } else {
    properties.body = {
      type: "object",
      description: "JSON request body accepted by the HTTP route.",
      additionalProperties: true
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: pathParameters
  };
}

function routeDescription(route: ManifestRoute) {
  if (route.capability === "company-os:read") {
    return "Read Company OS processes, pipelines, runs, approvals, audit evidence, governance, and knowledge records.";
  }

  if (route.capability === "company-os:definition:write") {
    return "Create, update, or archive approved low-risk Company OS definition records through audited workspace-scoped API access.";
  }

  if (route.capability === "company-os:workflow-definition:write") {
    return "Create and preview workflow definition drafts without activating production behavior.";
  }

  if (route.capability === "company-os:workflow-definition:activate") {
    return "Activate, archive, or roll back versioned Company OS workflow definitions through supervised commands.";
  }

  if (route.capability.startsWith("company-os:approval:")) {
    return "Operate Company OS approval lifecycle commands through audited workspace-scoped API access.";
  }

  if (route.capability.startsWith("company-os:pipeline-run:") || route.capability.startsWith("company-os:stage-run:")) {
    return "Operate Company OS pipeline and stage lifecycle commands through audited workspace-scoped API access.";
  }

  if (route.capability === "company-os:automation:execute") {
    return "Evaluate Company OS automation rules against a normalized event through audited workspace-scoped API access.";
  }

  if (route.capability.startsWith("google-drive:")) {
    return "Use the CompanyCore Google Drive adapter through audited workspace-scoped API access.";
  }

  if (route.capability === "relationships:read") {
    return "Read the workspace relationship graph with direct, inferred, provider-derived, review, and unsupported relationship context.";
  }

  if (route.capability === "operating-graph:read") {
    return "Read one selected department operating graph with goals, targets, metrics, workflows, tasks, knowledge, sources, evidence, and readiness gaps.";
  }

  if (route.capability.startsWith("integration-settings:")) {
    return "Inspect or operate workspace integration settings through controlled lifecycle actions.";
  }

  if (route.capability.startsWith("agent-events:")) {
    return "Read or acknowledge provider-neutral operational events for agents.";
  }

  return "Call a workspace-scoped CompanyCore API route through the MCP bridge.";
}

export function createMcpManifest(scopes: string[] | undefined) {
  const allowedCapabilities = new Set(effectiveCapabilities(scopes));
  const routes = Object.values(adapterManifest.routes).flat() as ManifestRoute[];
  const tools = routes
    .filter((route) => allowedCapabilities.has(route.capability))
    .map((route): McpTool => {
      const riskLevel = riskForRoute(route);
      return {
        name: toolNameForRoute(route),
        title: titleForRoute(route),
        description: routeDescription(route),
        method: route.method,
        path: route.path,
        capability: route.capability,
        riskLevel,
        requiresApproval: riskLevel === "destructive"
          || route.capability === "company-os:approval:decide"
          || route.capability === "company-os:automation:execute"
          || route.capability === "company-os:workflow-definition:activate"
          || route.capability.startsWith("company-os:stage-run:")
          || route.capability.startsWith("company-os:pipeline-run:"),
        inputSchema: inputSchemaForRoute(route)
      };
    });

  return {
    schemaVersion: "2026-05-09",
    service: "companycore",
    purpose: "Expose CompanyCore as an MCP-friendly tool catalog while preserving HTTP API auth, workspace scoping, policies, approvals, events, and audit logs.",
    transport: {
      preferred: "stdio-or-http-bridge",
      upstreamProtocol: "Model Context Protocol",
      backendAccess: "CompanyCore HTTP API"
    },
    auth: {
      type: "api_key",
      header: adapterManifest.auth.serviceHeader,
      workspaceScoped: true,
      capabilityScoped: true
    },
    guardrails: [
      "MCP tools must call CompanyCore HTTP routes instead of reading PostgreSQL directly.",
      "MCP tools must use the same workspace-scoped API key capability model as other service clients.",
      "Write tools must preserve CompanyCore validation, event, approval, and audit behavior.",
      "Destructive or risky tools must be wrapped as lifecycle actions and require explicit approval before autonomous use.",
      "MCP responses must not expose raw provider tokens, API keys, password hashes, stack traces, or provider secret material."
    ],
    tools
  };
}
