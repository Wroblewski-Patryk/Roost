# CompanyCore MCP Bridge

CompanyCore is designed to be consumed by agents through MCP, while the
CompanyCore HTTP API remains the source-of-truth boundary for workspace auth,
capabilities, policies, approvals, events, audit logs, and provider adapters.

## Direction

The target agent path is:

```text
Agent runtime -> CompanyCore MCP bridge -> CompanyCore HTTP API -> PostgreSQL
```

The MCP bridge must stay thin. It must not read PostgreSQL directly, load
provider secrets, or reimplement business rules. It discovers tools from:

```http
GET /v1/mcp/manifest
```

The returned tool catalog is filtered by the workspace service key's effective
capabilities.

## Local Stdio Server

CompanyCore includes a first local stdio bridge:

```bash
npm run mcp:server
```

Required environment:

```bash
COMPANYCORE_BASE_URL=https://api.companycore.luckysparrow.ch
COMPANYCORE_API_KEY=cc_v1_workspace_service_key
```

Optional environment:

```bash
COMPANYCORE_MCP_MANIFEST_PATH=/v1/mcp/manifest
COMPANYCORE_MCP_TIMEOUT_MS=30000
COMPANYCORE_MCP_COMMAND_MODE=read_only
```

## Recommended Key Profiles

Create MCP keys from canonical profiles instead of hand-assembling scopes:

```http
GET /v1/api-keys/profiles
POST /v1/api-keys
```

The owner console API-key screen loads these profiles from the backend and
uses the same `profileId` flow when the selected profile scopes are left
unchanged. Local static presets are retained only as a fallback while signed
out or if profile loading fails.

Example request:

```json
{
  "name": "MCP Company OS reader",
  "profileId": "mcp_company_os_reader"
}
```

Available profiles:

| Profile | Risk | Use |
| --- | --- | --- |
| `mcp_company_os_reader` | low | Read Company OS cockpit, pipelines, approvals, audit evidence, governance, operating model, and events. |
| `mcp_knowledge_reader` | low | Read notes, decisions, Drive files, and knowledge context. |
| `mcp_memory_writer` | medium | Write notes, decisions, and agent logs while reading core context. |
| `mcp_event_worker` | medium | Consume assigned agent events and report execution logs. |
| `mcp_operator` | high | Human-supervised operational agent with broad business write and safe integration lifecycle scopes. |

The server implements the MCP stdio transport with newline-delimited JSON-RPC
messages. It supports:

- `initialize`
- `ping`
- `tools/list`
- `tools/call`

It writes only valid JSON-RPC messages to stdout. Operational logs go to
stderr.

## Tool Mapping

Each CompanyCore MCP tool is generated from the API route manifest:

- tool name: `companycore_<method>_<route>`
- title: HTTP method and route
- description: route-purpose summary
- input schema: path parameters plus `query` for GET routes or `body` for
  write routes
- risk hints: read/write/destructive
- capability: the CompanyCore route capability required by the API

Example tool:

```json
{
  "name": "companycore_get_company_os",
  "title": "GET /v1/company-os",
  "capability": "company-os:read",
  "riskLevel": "read"
}
```

## Safety Rules

- Use least-privilege service keys for MCP clients.
- Give read-only agents `mcp:read`, `connection:read`, and only the read
  capabilities they need, such as `company-os:read`, `tasks:read`, or
  `google-drive:files:read`.
- Keep write capabilities role-specific.
- Treat manifest `requiresApproval` tools as supervised-only. The approved
  design in `docs/operations/approval-aware-mcp-command-flow.md` requires the
  bridge to fail closed by default before forwarding those tools.
- Set `COMPANYCORE_MCP_COMMAND_MODE=supervised_operator` only for a deliberate
  human-supervised session with an intentionally scoped key.
- Require human supervision before exposing destructive lifecycle tools to
  operational agents.
- Treat `isError: true` tool results as model-correctable execution errors.
- Do not pass raw provider tokens, password hashes, or API keys through tool
  results.

## Smoke Check

Check server configuration without exposing the key:

```bash
COMPANYCORE_BASE_URL=http://localhost:3102 \
COMPANYCORE_API_KEY=cc_v1_example \
node scripts/companycore-mcp-server.mjs --print-config
```

With a running CompanyCore API and a scoped key that includes `mcp:read`, test
the full bridge path:

```bash
COMPANYCORE_BASE_URL=http://localhost:3102 \
COMPANYCORE_API_KEY=cc_v1_workspace_service_key \
npm run mcp:smoke
```

The smoke starts the stdio bridge, sends `initialize`, `tools/list`, and one
safe `tools/call` using `companycore_get_company_os` by default. It exits
non-zero if the bridge cannot discover tools or if the safe read call fails.

To call a different safe tool, set:

```bash
COMPANYCORE_MCP_SMOKE_TOOL=companycore_get_connection
COMPANYCORE_MCP_SMOKE_ARGUMENTS='{}'
```

For manual JSON-RPC inspection, test tool discovery directly:

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0.1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' \
  | COMPANYCORE_BASE_URL=http://localhost:3102 \
    COMPANYCORE_API_KEY=cc_v1_workspace_service_key \
    node scripts/companycore-mcp-server.mjs
```

Expected result:

- `initialize` returns server capabilities with `tools`.
- `tools/list` returns only tools allowed by the key's scopes.
- `npm run mcp:smoke` returns a JSON summary with `ok: true`, the called tool,
  the discovered tool count, and the HTTP status returned through the bridge.

## Supervised Operator Smoke

Risky tools marked `requiresApproval` are blocked by default even when the key
has the route capability. The regression suite proves this by calling a stage
completion MCP tool with an `mcp_operator` key and expecting
`mcp_tool_requires_supervision`.

The same regression suite also proves the explicit supervised path by setting:

```bash
COMPANYCORE_MCP_COMMAND_MODE=supervised_operator
```

That smoke forwards the controlled command to the HTTP API and expects the API
to enforce lifecycle validation. Current evidence uses a completed disposable
stage run and verifies `409 invalid_stage_transition`, proving the bridge
forwarded only after the supervised mode was explicitly selected while the API
remained the command authority.

Agent runtime setup snippets for Paperclip, Codex, and future MCP-compatible
runtimes live in `docs/operations/mcp-agent-runtime-setup.md`.
