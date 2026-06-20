# Architecture Awareness Report

Generated: 2026-06-20T15:13:24.117Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost

## Counts By Type

| Type | Count |
| --- | ---: |
| agent | 47 |
| api_endpoint | 43 |
| component | 7 |
| document | 1042 |
| feature | 167 |
| function | 945 |
| migration | 31 |
| model | 5 |
| module | 66 |
| project | 1 |
| route | 3 |
| task | 4 |
| test | 1 |

## Counts By Status

| Status | Count |
| --- | ---: |
| blocked | 4 |
| deprecated | 4 |
| implemented | 2341 |
| in_progress | 1 |
| tested | 8 |
| verified | 4 |

## Health Signals

- Raw implementation entities without inferred tests: 1162
- Actionable implementation entities without inferred tests: 1153
- Raw implementation entities without inferred docs: 0
- Actionable implementation entities without inferred docs: 0
- Classified inferred-link noise: 9
- Raw tasks without architecture links: 0
- Actionable tasks without architecture links: 0
- Raw implementation entities without task links: 0
- Actionable implementation entities without task links: 0
- Classified task-linkage noise: 0
- Entities without owner attribution: 0
- Disconnected entities: 0

## Top Actionable Missing Test Links

- api_endpoint: GET / (src/app.ts#/)
- api_endpoint: USE /agent-events (src/app.ts#/agent-events)
- api_endpoint: USE /agent-logs (src/app.ts#/agent-logs)
- api_endpoint: USE /agents (src/app.ts#/agents)
- api_endpoint: USE /api-keys (src/app.ts#/api-keys)
- api_endpoint: USE /assets (src/app.ts#/assets)
- api_endpoint: USE /auth (src/app.ts#/auth)
- api_endpoint: USE /clients (src/app.ts#/clients)
- api_endpoint: USE /commercial-exceptions (src/app.ts#/commercial-exceptions)
- api_endpoint: USE /company-os (src/app.ts#/company-os)
- api_endpoint: USE /connection (src/app.ts#/connection)
- api_endpoint: USE /dashboard (src/app.ts#/dashboard)
- api_endpoint: USE /deals (src/app.ts#/deals)
- api_endpoint: USE /decisions (src/app.ts#/decisions)
- api_endpoint: USE /departments (src/app.ts#/departments)
- api_endpoint: USE /events (src/app.ts#/events)
- api_endpoint: USE /finance (src/app.ts#/finance)
- api_endpoint: USE /goals (src/app.ts#/goals)
- api_endpoint: USE /google-drive (src/app.ts#/google-drive)
- api_endpoint: USE /health (src/app.ts#/health)
- api_endpoint: USE /intake (src/app.ts#/intake)
- api_endpoint: USE /integration-settings (src/app.ts#/integration-settings)
- api_endpoint: USE /interactions (src/app.ts#/interactions)
- api_endpoint: USE /mcp (src/app.ts#/mcp)
- api_endpoint: USE /notes (src/app.ts#/notes)
- api_endpoint: USE /operating-graph (src/app.ts#/operating-graph)
- api_endpoint: USE /operating-model (src/app.ts#/operating-model)
- api_endpoint: USE /operations (src/app.ts#/operations)
- api_endpoint: USE /pipeline-stages (src/app.ts#/pipeline-stages)
- api_endpoint: USE /process-core (src/app.ts#/process-core)
- api_endpoint: USE /projects (src/app.ts#/projects)
- api_endpoint: USE /relationships (src/app.ts#/relationships)
- api_endpoint: USE /sales (src/app.ts#/sales)
- api_endpoint: USE /strategy (src/app.ts#/strategy)
- api_endpoint: USE /targets (src/app.ts#/targets)
- api_endpoint: USE /task-lists (src/app.ts#/task-lists)
- api_endpoint: USE /tasks (src/app.ts#/tasks)
- api_endpoint: USE /v1 (src/app.ts#/v1)
- api_endpoint: USE /v1/auth (src/app.ts#/v1/auth)
- api_endpoint: USE /v1/health (src/app.ts#/v1/health)

## Top Actionable Missing Doc Links


## Classified Inferred-Link Noise

- config_only_file: 2
- test_fixture_function: 7

## Top Classified Noise Samples

- config_only_file: feature: tailwind.config.mjs (tailwind.config.mjs)
- config_only_file: feature: vite.config.mjs (vite.config.mjs)
- test_fixture_function: function: assertSafeTestDatabase (src/tests/api.test.ts#assertSafeTestDatabase)
- test_fixture_function: function: mockClickUpDiscoveryFetch (src/tests/api.test.ts#mockClickUpDiscoveryFetch)
- test_fixture_function: function: registerOwner (src/tests/api.test.ts#registerOwner)
- test_fixture_function: function: request (src/tests/api.test.ts#request)
- test_fixture_function: function: resetDatabase (src/tests/api.test.ts#resetDatabase)
- test_fixture_function: function: runMcpBridgeSmoke (src/tests/api.test.ts#runMcpBridgeSmoke)
- test_fixture_function: function: runNodeScript (src/tests/api.test.ts#runNodeScript)

## Classified Task-Linkage Noise


## Top Classified Task-Linkage Noise Samples


## Notes

- This is an inferred baseline. CTO/Docs Memory must promote or correct important relations.
- Curated graph coverage input: `C:/Personal/Projekty/Aplikacje/Roost/docs/graphs/architecture-graph.json` (covered paths: 0).
- Override input: `C:/Personal/Projekty/Aplikacje/Roost/docs/architecture/scanner-overrides.json` (entity entries: 0, relation entries: 0).
- Override summary: excluded files 0, entity overrides 0, relation overrides 0, critical entities tagged 0.
- `verified` still requires fresh command/browser/deploy evidence, not only file presence.