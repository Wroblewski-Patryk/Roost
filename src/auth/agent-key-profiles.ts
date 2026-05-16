import type { Capability } from "./capabilities";

export type AgentKeyProfile = {
  id: string;
  label: string;
  description: string;
  recommendedFor: string[];
  riskLevel: "low" | "medium" | "high";
  scopes: Capability[];
};

const mcpBaseScopes = [
  "connection:read",
  "mcp:read"
] satisfies Capability[];

export const agentKeyProfiles = [
  {
    id: "mcp_company_os_reader",
    label: "MCP Company OS Reader",
    description: "Read-only MCP access for Company OS dashboards, process maps, pipeline definitions, approvals, audit evidence, and governance records.",
    recommendedFor: ["CEO Agent", "Project Manager Agent", "Documentation Agent", "Human Owner"],
    riskLevel: "low",
    scopes: [
      ...mcpBaseScopes,
      "company-os:read",
      "intake:read",
      "commercial-exceptions:read",
      "finance:read",
      "relationships:read",
      "sales:read",
      "operations:read",
      "strategy:read",
      "operating-model:read",
      "events:read"
    ]
  },
  {
    id: "mcp_knowledge_reader",
    label: "MCP Knowledge Reader",
    description: "Read-only MCP access to company context, notes, decisions, Drive file metadata/content, and Company OS knowledge links.",
    recommendedFor: ["Documentation Agent", "Research Agent", "Jarvis", "Aviary"],
    riskLevel: "low",
    scopes: [
      ...mcpBaseScopes,
      "company-os:read",
      "intake:read",
      "commercial-exceptions:read",
      "finance:read",
      "relationships:read",
      "sales:read",
      "operations:read",
      "strategy:read",
      "operating-model:read",
      "notes:read",
      "decisions:read",
      "google-drive:files:read",
      "events:read"
    ]
  },
  {
    id: "mcp_memory_writer",
    label: "MCP Memory Writer",
    description: "MCP access for agents that can read company context and write notes, decisions, and agent logs.",
    recommendedFor: ["Documentation Agent", "Project Manager Agent", "Jarvis"],
    riskLevel: "medium",
    scopes: [
      ...mcpBaseScopes,
      "company-os:read",
      "intake:read",
      "commercial-exceptions:read",
      "finance:read",
      "relationships:read",
      "sales:read",
      "operations:read",
      "strategy:read",
      "operating-model:read",
      "projects:read",
      "tasks:read",
      "clients:read",
      "notes:read",
      "notes:write",
      "decisions:read",
      "decisions:write",
      "agent-logs:read",
      "agent-logs:write",
      "events:read"
    ]
  },
  {
    id: "mcp_event_worker",
    label: "MCP Event Worker",
    description: "MCP access for agents that consume assigned events, report execution logs, and close their own event queue items.",
    recommendedFor: ["Paperclip", "Agent Task Execution Agent", "Operations Agent"],
    riskLevel: "medium",
    scopes: [
      ...mcpBaseScopes,
      "company-os:read",
      "intake:read",
      "commercial-exceptions:read",
      "finance:read",
      "relationships:read",
      "sales:read",
      "operations:read",
      "strategy:read",
      "tasks:read",
      "agent-logs:read",
      "agent-logs:write",
      "agent-events:read",
      "agent-events:ack",
      "intake:write",
      "events:read"
    ]
  },
  {
    id: "mcp_operator",
    label: "MCP Operator",
    description: "Broad MCP access for controlled operational agents that can create and update business records, write memory, and operate safe integration lifecycle actions.",
    recommendedFor: ["Project Manager Agent", "Operations Agent", "Human-supervised Operator Agent"],
    riskLevel: "high",
    scopes: [
      ...mcpBaseScopes,
      "company-os:read",
      "intake:read",
      "intake:write",
      "commercial-exceptions:read",
      "finance:read",
      "relationships:read",
      "sales:read",
      "operations:read",
      "strategy:read",
      "company-os:workflow-definition:write",
      "company-os:workflow-definition:activate",
      "company-os:approval:request",
      "company-os:pipeline-run:write",
      "company-os:stage-run:write",
      "company-os:automation:execute",
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
      "agent-logs:read",
      "agent-logs:write",
      "agent-events:read",
      "agent-events:ack",
      "events:read",
      "integration-settings:clickup:read",
      "integration-settings:clickup:events:read",
      "integration-settings:clickup:events:retry",
      "integration-settings:clickup:maintenance:run",
      "integration-settings:google-drive:read",
      "integration-settings:google-drive:import",
      "integration-settings:google-drive:changes:reconcile",
      "google-drive:files:read",
      "google-drive:files:write",
      "google-drive:files:scope:write",
      "google-drive:docs:write",
      "google-drive:sheets:write"
    ]
  }
] satisfies AgentKeyProfile[];

export function findAgentKeyProfile(profileId: string | undefined) {
  if (!profileId) {
    return null;
  }
  return agentKeyProfiles.find((profile) => profile.id === profileId) ?? null;
}
