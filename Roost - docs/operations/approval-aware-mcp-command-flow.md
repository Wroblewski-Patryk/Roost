# Approval-Aware MCP Command Flow

Last updated: 2026-05-11

## Purpose

This document defines how CompanyCore MCP tools marked `requiresApproval`
should behave before any unsupervised agent can use risky Company OS commands.

CompanyCore remains the policy, approval, event, and audit boundary. MCP is a
thin bridge over the HTTP API, not a second execution authority.

## Decision

MCP tools with `requiresApproval: true` must fail closed by default in the
stdio bridge.

The bridge may expose those tools in `tools/list` so agents and supervisors can
see that the command exists, but `tools/call` must not forward them unless the
runtime is explicitly configured for supervised command execution.

## Execution Modes

| Mode | Default | Can call `requiresApproval` tools | Intended use |
| --- | --- | --- | --- |
| `read_only` | yes | no | Planning, review, documentation, context, and safe read agents. |
| `supervised_operator` | no | yes, with explicit runtime configuration and a high-scope service key | Human-supervised sessions where the operator watches and approves command use. |
| `autonomous_operator` | no | no, until a later approved design exists | Future scope only; requires stronger approval-token and evidence rules. |

## Bridge Behavior

Default bridge behavior:

1. Load `/v1/mcp/manifest`.
2. Return all tools allowed by the key in `tools/list`, including
   `requiresApproval` metadata.
3. On `tools/call`, if the selected tool has `requiresApproval: true` and the
   bridge is not explicitly in supervised mode, return a structured MCP error
   result instead of forwarding the HTTP request.
4. The error should include:
   - `error: "mcp_tool_requires_supervision"`
   - tool name
   - HTTP method and path
   - capability
   - recovery guidance to use a supervised runtime or request approval through
     the appropriate Company OS workflow.

Supervised mode behavior:

1. The runtime must use a deliberate high-scope key such as `mcp_operator`.
2. The bridge must be explicitly configured for supervised use.
3. The HTTP API still enforces capability, workspace, approval, transition,
   validation, event, and audit rules.
4. The agent or operator must include route-specific approval references such
   as `approvalId` where the HTTP command requires them.

## Tool Categories

| Category | Example | Default bridge behavior |
| --- | --- | --- |
| Safe read | `GET /v1/company-os` | Forward. |
| Approval request | `POST /v1/company-os/approvals/request` | Forward only for profiles that intentionally include `company-os:approval:request`; not part of read-only profiles. |
| Approval decision | `POST /v1/company-os/approvals/:id/decision` | Block by default; supervised only. |
| Stage or pipeline lifecycle write | `POST /v1/company-os/stage-runs/:id/actions/complete` | Block by default; supervised only. |
| Automation evaluator execute | `POST /v1/company-os/events/:id/actions/evaluate-automation-rules` | Block by default; supervised only. |
| Destructive route | `DELETE /v1/...` | Block by default; supervised only unless a future route-specific policy says otherwise. |

## Evidence Requirements

Before a risky MCP tool call:

- The operator or agent must know the route, capability, target resource, and
  reason for the action.
- If the HTTP route requires approval, the request body must include a valid
  `approvalId`.
- If the agent needs approval, it should create or request approval through a
  dedicated approval-request capability instead of attempting the risky action.

After a risky MCP tool call:

- The HTTP response must include the command result.
- CompanyCore must own durable event and audit evidence for Company OS command
  routes.
- The MCP bridge should return structured content including HTTP status, path,
  method, capability, and response body so the runtime can summarize evidence.

## Non-Goals

- Do not move approval policy into the MCP bridge.
- Do not let the MCP bridge read PostgreSQL directly.
- Do not let the MCP bridge read provider secrets directly.
- Do not add arbitrary script execution or provider-specific bypasses.
- Do not claim autonomous risky tool execution is supported until a later
  design explicitly approves it.

## Implementation Evidence

`V2AGENT-004 MCP Requires-Approval Bridge Guard`

Implemented a default fail-closed guard in
`scripts/companycore-mcp-server.mjs` for tools whose manifest entry has
`requiresApproval: true`.

Expected behavior:

- Default `tools/call` returns `isError: true` and structured
  `mcp_tool_requires_supervision` for requires-approval tools.
- Safe read tools still call the HTTP API.
- A supervised override is explicit through
  `COMPANYCORE_MCP_COMMAND_MODE=supervised_operator`.
- Docker API test evidence proves both safe-read pass and risky-tool blocked
  behavior.

`V2AGENT-005 Supervised Operator MCP Smoke Harness`

Implemented a controlled supervised smoke in `src/tests/api.test.ts` through
`scripts/companycore-mcp-smoke.mjs`.

Expected behavior:

- Default mode still blocks the stage-completion MCP tool with
  `mcp_tool_requires_supervision`.
- Supervised mode must be explicitly selected with
  `COMPANYCORE_MCP_COMMAND_MODE=supervised_operator`.
- In supervised mode, the same tool reaches the HTTP API, and the API remains
  responsible for lifecycle validation, approval checks, events, and audit.
- Current regression evidence expects `409 invalid_stage_transition` on a
  completed disposable stage run, proving the bridge forwarded the call only
  under explicit supervision and did not bypass API policy.
