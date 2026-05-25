# MCP Tool Discovery And Refresh Contract

Last updated: 2026-05-16

## Purpose

This document defines how CompanyCore MCP tools are discovered, refreshed, and
versioned. It answers the runtime question: when CompanyCore adds, removes, or
changes an MCP-visible function, how does an agent runtime learn about that
change?

CompanyCore uses MCP as the agent-facing tool interface above the HTTP API.
The HTTP API remains the source-of-truth boundary for workspace scoping,
capabilities, validation, approval, events, audit, and provider adapters.

## Approved Architecture

The approved path is:

```text
Agent runtime -> CompanyCore MCP bridge -> CompanyCore HTTP API -> PostgreSQL
```

The MCP bridge is a thin adapter. It must not read PostgreSQL directly, load
provider secrets, or reimplement CompanyCore business rules.

## Discovery Model

CompanyCore exposes its route-derived MCP tool catalog through:

```http
GET /v1/mcp/manifest
```

The stdio MCP bridge reads that manifest and exposes the resulting tools over
standard MCP methods:

```text
initialize
tools/list
tools/call
```

The MCP server must return only tools allowed by the authenticated service
key's effective capabilities. A tool may be absent from `tools/list` because
the backend route does not exist, because the route is not in the manifest, or
because the runtime key lacks the route capability.

Tool order should remain deterministic when the underlying tool set has not
changed. Deterministic order makes client caching and model prompt caching
safer.

## Refresh Semantics

MCP clients discover tools by calling `tools/list`. A client may cache that
list for the lifetime of an MCP session or process. Therefore, a newly added
CompanyCore function is not guaranteed to be visible inside an already-running
agent session unless the client refreshes its tool registry.

The current CompanyCore stdio bridge declares:

```json
{
  "capabilities": {
    "tools": {
      "listChanged": false
    }
  }
}
```

Current runtime implication:

- the bridge loads `/v1/mcp/manifest` lazily;
- the bridge caches the manifest in the bridge process;
- after adding, removing, renaming, or changing an MCP tool contract, operators
  must restart the bridge process or reconnect the agent runtime before they
  expect `tools/list` to show the new catalog;
- if the outer agent host also caches MCP tools, start a new agent session or
  use that host's MCP refresh/reload command after the bridge restart.

Future dynamic refresh is allowed, but only when implemented deliberately. A
future bridge may declare `tools.listChanged: true` and emit the MCP
`notifications/tools/list_changed` notification after its manifest changes.
Clients that receive that notification should call `tools/list` again and
update the agent-visible tool registry.

## Tool Contract Evolution

Treat MCP tools as a public API for agents:

- adding a new tool is the safest change when the service key has the matching
  capability;
- removing or renaming a tool is a breaking change for existing prompts,
  automations, and runtime configs;
- changing required input fields is a breaking change unless the old shape
  remains accepted;
- prefer additive input fields, backwards-compatible defaults, or a new
  versioned tool name for incompatible behavior;
- do not expose write or destructive behavior until the HTTP route capability,
  approval requirement, audit/event evidence, and failure mode are explicit.

Tool descriptions are part of the operational contract because agent runtimes
use names, descriptions, schemas, and annotations to decide which tool to call.
Descriptions should state the domain purpose, important blocked actions, and
whether a tool is read-only, write-capable, or supervised.

## Required Change Checklist

When adding or changing an MCP-visible function:

1. Add or update the CompanyCore HTTP route and capability first.
2. Ensure `/v1/mcp/manifest` exposes the route only for authorized scopes.
3. Keep the tool `inputSchema` strict enough for path params and top-level
   `query` or `body` shape.
4. Mark risky lifecycle tools with `requiresApproval`.
5. Run the MCP smoke path or a narrower `tools/list` check with a scoped key.
6. Restart or reconnect the bridge and agent runtime unless dynamic
   `listChanged` support has been implemented and verified.
7. Document any breaking tool contract change in architecture, API, operations,
   and runtime setup docs before handing the tool to agents.

## Failure And Recovery

If an expected tool is missing:

- confirm the service key includes `mcp:read`;
- confirm the service key includes the route capability;
- call `GET /v1/mcp/manifest` directly with that key;
- restart the stdio bridge so its cached manifest is reloaded;
- reconnect or refresh the agent host so it calls `tools/list` again;
- only then treat the issue as a manifest or route registration defect.

If an agent calls a removed or renamed tool, the bridge should return an
unknown-tool protocol error. For business validation failures inside an
existing tool, the bridge should return a tool result with `isError: true` so
the model can read the error and recover.

## References

- MCP tools specification:
  `https://modelcontextprotocol.io/specification/draft/server/tools`
- MCP architecture overview:
  `https://modelcontextprotocol.io/docs/learn/architecture`
- MCP schema reference:
  `https://modelcontextprotocol.io/specification/2025-06-18/schema`
