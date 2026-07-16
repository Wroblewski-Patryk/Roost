# Architecture Awareness Report

Generated: 2026-07-16T14:26:52.452Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost

## Counts By Type

| Type | Count |
| --- | ---: |
| agent | 47 |
| api_endpoint | 46 |
| component | 7 |
| document | 1489 |
| feature | 173 |
| function | 990 |
| migration | 31 |
| model | 5 |
| module | 67 |
| project | 1 |
| task | 141 |
| test | 82 |

## Counts By Status

| Status | Count |
| --- | ---: |
| blocked | 1 |
| deprecated | 6 |
| implemented | 2679 |
| in_progress | 8 |
| tested | 19 |
| verified | 366 |

## Health Signals

- Raw implementation entities without inferred tests: 1072
- Actionable implementation entities without inferred tests: 1059
- Raw implementation entities without inferred docs: 0
- Actionable implementation entities without inferred docs: 0
- Classified inferred-link noise: 13
- Raw tasks without architecture links: 12
- Actionable tasks without architecture links: 12
- Raw implementation entities without task links: 0
- Actionable implementation entities without task links: 0
- Classified task-linkage noise: 0
- Entities without owner attribution: 0
- Disconnected entities: 0

## Top Actionable Missing Test Links

- api_endpoint: USE /agent-events (src/app.ts#/agent-events)
- api_endpoint: USE /agents (src/app.ts#/agents)
- api_endpoint: USE /api/build-info (src/app.ts#/api/build-info)
- api_endpoint: USE /clients (src/app.ts#/clients)
- api_endpoint: USE /commercial-exceptions (src/app.ts#/commercial-exceptions)
- api_endpoint: USE /company-os (src/app.ts#/company-os)
- api_endpoint: USE /connection (src/app.ts#/connection)
- api_endpoint: USE /deals (src/app.ts#/deals)
- api_endpoint: USE /decisions (src/app.ts#/decisions)
- api_endpoint: USE /departments (src/app.ts#/departments)
- api_endpoint: USE /events (src/app.ts#/events)
- api_endpoint: USE /goals (src/app.ts#/goals)
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
- api_endpoint: USE /ready (src/app.ts#/ready)
- api_endpoint: USE /relationships (src/app.ts#/relationships)
- api_endpoint: USE /targets (src/app.ts#/targets)
- api_endpoint: USE /task-lists (src/app.ts#/task-lists)
- api_endpoint: USE /tasks (src/app.ts#/tasks)
- api_endpoint: USE /v1 (src/app.ts#/v1)
- api_endpoint: USE /v1/health (src/app.ts#/v1/health)
- api_endpoint: USE /v1/ready (src/app.ts#/v1/ready)
- api_endpoint: USE /v1/webhooks/clickup (src/app.ts#/v1/webhooks/clickup)
- api_endpoint: USE /workforce (src/app.ts#/workforce)
- api_endpoint: USE /workspaces (src/app.ts#/workspaces)
- component: cc-notice.tsx (web/src/components/cc-notice.tsx)
- feature: seed.ts (prisma/seed.ts)
- feature: adapter-smoke.mjs (scripts/adapter-smoke.mjs)
- feature: agent-training-smoke.mjs (scripts/agent-training-smoke.mjs)
- feature: aog-deploy-smoke.mjs (scripts/aog-deploy-smoke.mjs)

## Top Actionable Missing Doc Links


## Classified Inferred-Link Noise

- config_only_file: 2
- test_fixture_function: 11

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
- test_fixture_function: function: runChainIntegrity (src/tests/architecture-chain-integrity.test.ts#runChainIntegrity)
- test_fixture_function: function: runGateFixture (src/tests/architecture-health-dashboard-gate.test.ts#runGateFixture)
- test_fixture_function: function: runDashboardFixture (src/tests/architecture-health-dashboard.test.ts#runDashboardFixture)
- test_fixture_function: function: writeJson (src/tests/architecture-health-dashboard.test.ts#writeJson)

## Classified Task-Linkage Noise


## Top Classified Task-Linkage Noise Samples


## Notes

- This is an inferred baseline. CTO/Docs Memory must promote or correct important relations.
- Curated graph coverage input: `C:/Personal/Projekty/Aplikacje/Roost/docs/graphs/architecture-graph.json` (covered paths: 0).
- Override input: `C:/Personal/Projekty/Aplikacje/Roost/docs/architecture/scanner-overrides.json` (entity entries: 245, relation entries: 263).
- Override summary: excluded files 0, entity overrides 236, relation overrides 229, critical entities tagged 0.
- `verified` still requires fresh command/browser/deploy evidence, not only file presence.