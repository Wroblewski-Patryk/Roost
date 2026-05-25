# WEBFOUND-012 - AI-Ready Smoke Pack

## Task Type

Verification automation / AI readiness.

## Current Stage

Verification complete.

## Deliverable For This Stage

Add a repeatable local smoke command that proves the web and MCP foundation is usable by AI clients through real HTTP and MCP bridge behavior.

## Goal

Prove that a disposable workspace can issue scoped agent credentials, expose a capability-scoped MCP manifest, read the relationship graph, and fail closed for risky MCP tools without requiring hidden manual setup.

## Scope

- `scripts/companycore-ai-ready-smoke.mjs`
- `package.json`
- `docs/planning/web-and-mcp-foundation-task-plan.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/*` files touched by WEBFOUND queue state and evidence
- `docs/planning/mvp-next-commits.md`

## Implementation Plan

1. Create a Node smoke script that targets `COMPANYCORE_BASE_URL`.
2. Register a disposable owner and workspace through the public auth API.
3. Create MCP reader and operator profile keys through the owner API.
4. Verify reader key access to `/v1/mcp/manifest` and `/v1/relationships/graph`.
5. Verify the stdio MCP bridge can call the relationship graph tool with the reader key.
6. Verify the stdio MCP bridge blocks a `requiresApproval` operator tool in default `read_only` mode.
7. Add an npm script for repeatable execution.
8. Run build, tests, and the smoke on a disposable local database.
9. Update planning, requirements, risk, confidence, system health, and project state evidence.

## Acceptance Criteria

- The smoke uses real HTTP/API calls and the existing stdio MCP bridge.
- The smoke creates scoped reader and operator keys from real API key profiles.
- The reader key can see MCP manifest tools and read the relationship graph.
- The relationship graph is validated through both HTTP and MCP bridge paths.
- A risky `requiresApproval` MCP tool remains fail-closed by default with `mcp_tool_requires_supervision`.
- The command is repeatable against a disposable local database.

## Definition of Done

- `node --check scripts/companycore-ai-ready-smoke.mjs` passes.
- `npm run build` passes.
- `npm test` passes against disposable PostgreSQL.
- `npm run ai-ready:smoke` passes against a disposable local server.
- WEBFOUND queue and project source-of-truth files record the result and next task.

## Result Report

Implemented `scripts/companycore-ai-ready-smoke.mjs` and `npm run ai-ready:smoke`.
The smoke registers a disposable owner/workspace, creates `mcp_company_os_reader`
and `mcp_operator` profile keys, verifies reader manifest and relationship graph
access through real HTTP, verifies the relationship graph through the existing
stdio MCP bridge, and verifies the operator stage-complete tool remains blocked
by default with `mcp_tool_requires_supervision`.

Validation:

- `node --check scripts/companycore-ai-ready-smoke.mjs`: passed.
- `npm test`: passed against disposable PostgreSQL on `localhost:55462`.
- `npm run ai-ready:smoke`: passed against `http://127.0.0.1:3112`.

Smoke summary:

- manifest tools visible to reader: `21`
- relationship graph: `62` nodes, `61` edges, `0` review items, `3`
  unsupported families
- MCP bridge graph tool: `companycore_get_relationships_graph`, HTTP `200`
- guarded MCP tool: `companycore_post_company_os_stage_runs_by_id_actions_complete`
  returned `mcp_tool_requires_supervision`
