# Task Synchronization Report

Generated: 2026-06-01T07:01:05.836Z

## Contract

Every task should identify the feature/module it changes, dependency expectations, affected files, test requirements, docs requirements, and proof links.

## Signals

- Tasks without architecture links: 0
- Implementation entities without task links: 440
- Verified entities without proof evidence: 0

## Tasks Without Architecture Links


## Implementation Without Task Links

- api_endpoint: USE /react (.tmp/web-qa-001/mock-server.cjs#/react)
- api_endpoint: GET /v1/assets/context (.tmp/web-qa-001/mock-server.cjs#/v1/assets/context)
- api_endpoint: POST /v1/auth/login (.tmp/web-qa-001/mock-server.cjs#/v1/auth/login)
- api_endpoint: POST /v1/auth/register (.tmp/web-qa-001/mock-server.cjs#/v1/auth/register)
- api_endpoint: GET /v1/intake/route-proposals (.tmp/web-qa-001/mock-server.cjs#/v1/intake/route-proposals)
- api_endpoint: GET /v1/operations/work-items (.tmp/web-qa-001/mock-server.cjs#/v1/operations/work-items)
- api_endpoint: USE /vendor (.tmp/web-qa-001/mock-server.cjs#/vendor)
- api_endpoint: GET * (.tmp/web-qa-audit/mock-server.cjs#*)
- api_endpoint: USE /react (.tmp/web-qa-audit/mock-server.cjs#/react)
- api_endpoint: GET /v1/assets/context (.tmp/web-qa-audit/mock-server.cjs#/v1/assets/context)
- api_endpoint: POST /v1/auth/login (.tmp/web-qa-audit/mock-server.cjs#/v1/auth/login)
- api_endpoint: POST /v1/auth/register (.tmp/web-qa-audit/mock-server.cjs#/v1/auth/register)
- api_endpoint: GET /v1/intake/route-proposals (.tmp/web-qa-audit/mock-server.cjs#/v1/intake/route-proposals)
- api_endpoint: GET /v1/operations/work-items (.tmp/web-qa-audit/mock-server.cjs#/v1/operations/work-items)
- api_endpoint: USE /vendor (.tmp/web-qa-audit/mock-server.cjs#/vendor)
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
- api_endpoint: USE /v1/webhooks/clickup (src/app.ts#/v1/webhooks/clickup)
- api_endpoint: USE /workforce (src/app.ts#/workforce)
- api_endpoint: USE /workspaces (src/app.ts#/workspaces)
- component: cc-button.tsx (web/src/components/cc-button.tsx)
- component: cc-data-table.tsx (web/src/components/cc-data-table.tsx)
- component: cc-field.tsx (web/src/components/cc-field.tsx)
- component: cc-notice.tsx (web/src/components/cc-notice.tsx)
- component: cc-resource-selector.tsx (web/src/components/cc-resource-selector.tsx)
- component: cc-route-loading.tsx (web/src/components/cc-route-loading.tsx)
- component: cc-text-input.tsx (web/src/components/cc-text-input.tsx)
- feature: mock-server.cjs (.tmp/web-qa-001/mock-server.cjs)
- feature: validate.cjs (.tmp/web-qa-001/validate.cjs)
- feature: audit.cjs (.tmp/web-qa-audit/audit.cjs)
- feature: mock-server.cjs (.tmp/web-qa-audit/mock-server.cjs)
- feature: main.js (docs/.obsidian/plugins/dataview/main.js)
- feature: main.js (docs/.obsidian/plugins/note-toolbar/main.js)
- feature: main.js (docs/.obsidian/plugins/obsidian-excalidraw-plugin/main.js)
- feature: main.js (docs/.obsidian/plugins/obsidian-git/main.js)
- feature: main.js (docs/.obsidian/plugins/obsidian-tasks-plugin/main.js)
- feature: main.js (docs/.obsidian/plugins/omnisearch/main.js)
- feature: main.js (docs/.obsidian/plugins/table-editor-obsidian/main.js)
- feature: main.js (docs/.obsidian/plugins/templater-obsidian/main.js)
- feature: seed.ts (prisma/seed.ts)
- feature: assets-route-CMLeJhyZ.js (public/react/assets/assets-route-CMLeJhyZ.js)
- feature: cc-data-table-BnsGuHlR.js (public/react/assets/cc-data-table-BnsGuHlR.js)
- feature: department-labels-CPPlGh9W.js (public/react/assets/department-labels-CPPlGh9W.js)