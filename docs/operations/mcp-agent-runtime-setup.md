# MCP Agent Runtime Setup

CompanyCore is intended to be the Company OS control plane for human and AI
operators. Agent runtimes should use CompanyCore through the MCP bridge, while
CompanyCore keeps workspace auth, capabilities, approvals, events, audit logs,
and provider adapters behind the HTTP API boundary.

## Runtime Path

```text
Agent runtime -> CompanyCore MCP bridge -> CompanyCore HTTP API -> CompanyCore data and adapters
```

Agents must not connect directly to PostgreSQL, provider APIs, or raw provider
tokens. They should receive one workspace-scoped CompanyCore service key with
the smallest MCP profile that supports their role.

## Profile Selection

| Runtime role | Recommended profile | Why |
| --- | --- | --- |
| Executive or PM read context agent | `mcp_company_os_reader` | Reads Company OS cockpit, process, pipeline, approval, audit, governance, operating model, and event context. |
| Research or documentation agent | `mcp_knowledge_reader` | Reads Company OS context plus notes, decisions, and Drive file metadata/content. |
| Memory-writing assistant | `mcp_memory_writer` | Reads company context and writes notes, decisions, and agent logs. |
| Paperclip task executor | `mcp_event_worker` | Reads tasks and assigned agent events, writes execution logs, and acknowledges work queue items. |
| Human-supervised operator | `mcp_operator` | Broad controlled write access for business records and safe integration lifecycle actions. |

Use `mcp_operator` only for supervised runtimes. Destructive or high-risk tool
exposure should remain behind approvals and explicit lifecycle routes. Tools
marked `requiresApproval` in the MCP manifest are supervised-only by design;
the approved flow is documented in
`docs/operations/approval-aware-mcp-command-flow.md`.

## Create A Key

Owners can create keys in `/settings/api` or through the HTTP API:

```http
GET /v1/api-keys/profiles
POST /v1/api-keys
```

Example:

```json
{
  "name": "Paperclip MCP event worker",
  "profileId": "mcp_event_worker"
}
```

The raw key is shown once. Store it in the target runtime's secret store, not
in repository files or prompt text.

## Local Bridge Command

Every runtime should start the same bridge process:

```bash
COMPANYCORE_BASE_URL=https://api.companycore.luckysparrow.ch \
COMPANYCORE_API_KEY=cc_v1_workspace_service_key \
npm run mcp:server
```

For local development, point the bridge at the local API:

```bash
COMPANYCORE_BASE_URL=http://localhost:3102 \
COMPANYCORE_API_KEY=cc_v1_workspace_service_key \
npm run mcp:server
```

Before handing the key to an agent runtime, run:

```bash
COMPANYCORE_BASE_URL=http://localhost:3102 \
COMPANYCORE_API_KEY=cc_v1_workspace_service_key \
npm run mcp:smoke
```

The smoke verifies `initialize`, `tools/list`, and one safe
`companycore_get_company_os` read call through the bridge.

## Codex MCP Snippet

Use the bridge as a stdio MCP server. Keep the service key in the local secret
store or environment and reference it at process launch.

```toml
[mcp_servers.companycore]
command = "npm"
args = ["run", "mcp:server"]
cwd = "C:\\Personal\\Projekty\\Aplikacje\\companycore"

[mcp_servers.companycore.env]
COMPANYCORE_BASE_URL = "https://api.companycore.luckysparrow.ch"
COMPANYCORE_API_KEY = "cc_v1_workspace_service_key"
```

Recommended profile:

- `mcp_company_os_reader` for planning and review agents.
- `mcp_memory_writer` for agents allowed to write decisions, notes, and logs.
- `mcp_operator` only for human-supervised execution sessions.

## Paperclip MCP Snippet

Paperclip-style task executors should usually use `mcp_event_worker`.

```json
{
  "mcpServers": {
    "companycore": {
      "command": "npm",
      "args": ["run", "mcp:server"],
      "cwd": "C:\\Personal\\Projekty\\Aplikacje\\companycore",
      "env": {
        "COMPANYCORE_BASE_URL": "https://api.companycore.luckysparrow.ch",
        "COMPANYCORE_API_KEY": "cc_v1_workspace_service_key"
      }
    }
  }
}
```

Expected behavior:

- Read assigned events and task context.
- Write agent logs.
- Acknowledge work queue items.
- Request approval through CompanyCore workflows before risky external action.

## Generic MCP Runtime Snippet

Any MCP-compatible runtime needs only a stdio process plus environment:

```json
{
  "name": "companycore",
  "transport": "stdio",
  "command": "npm",
  "args": ["run", "mcp:server"],
  "cwd": "/path/to/companycore",
  "env": {
    "COMPANYCORE_BASE_URL": "https://api.companycore.luckysparrow.ch",
    "COMPANYCORE_API_KEY": "cc_v1_workspace_service_key"
  }
}
```

If the runtime runs outside this repository, call the bridge script directly
from a deployed package or checked-out CompanyCore workspace:

```bash
node scripts/companycore-mcp-server.mjs
```

## Agent Prompt Contract

Give agents an explicit operating contract with the runtime profile:

```text
Use CompanyCore MCP tools as the source of truth for company context.
Do not bypass CompanyCore by calling provider APIs or databases directly.
Before risky write, external communication, deletion, deploy, or financial
action, check policies and request approval if required.
Report plan, status, decision, error, approval need, or next step back through
CompanyCore evidence surfaces when available.
```

## Setup Checklist

- Select the smallest profile that fits the agent role.
- Create the service key from `/settings/api` or `POST /v1/api-keys`.
- Store the raw key in the runtime's secret store.
- Configure the MCP server command and environment.
- Run `npm run mcp:smoke` against the target API.
- Confirm `tools/list` exposes only expected capabilities.
- Confirm tools marked `requiresApproval` are not available to unsupervised
  runtimes as callable actions.
- Record the agent role, profile, owner, and intended workflows in CompanyCore.
- Rotate the key if the runtime owner, host, or permission model changes.

## Failure Handling

| Failure | Likely cause | Recovery |
| --- | --- | --- |
| `COMPANYCORE_API_KEY is required` | Missing runtime secret | Add the key to the runtime environment or secret store. |
| `CompanyCore MCP manifest failed with HTTP 403` | Key lacks `mcp:read` | Recreate key from an MCP profile or add the explicit capability. |
| Tool missing from `tools/list` | Key lacks the route capability | Use a profile with the required capability or create a narrower explicit key. |
| `isError: true` on tool call | CompanyCore route returned an error | Treat it as a recoverable tool error; inspect structured content and adjust the request. |
| Bridge timeout | API unreachable or slow | Check `COMPANYCORE_BASE_URL`, network reachability, and `COMPANYCORE_MCP_TIMEOUT_MS`. |
