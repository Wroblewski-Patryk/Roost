# Architecture Awareness Report

Generated: 2026-06-03T15:59:03.936Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost

## Counts By Type

| Type | Count |
| --- | ---: |
| agent | 47 |
| api_endpoint | 57 |
| component | 7 |
| document | 881 |
| feature | 198 |
| function | 7257 |
| migration | 31 |
| model | 175 |
| module | 67 |
| project | 1 |
| route | 3 |
| test | 1 |

## Counts By Status

| Status | Count |
| --- | ---: |
| blocked | 4 |
| deprecated | 4 |
| implemented | 8708 |
| in_progress | 1 |
| tested | 8 |

## Health Signals

- Implementation entities without inferred tests: 200
- Implementation entities without inferred docs: 200
- Entities without owner attribution: 0
- Disconnected entities: 0

## Top Missing Test Links

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

## Top Missing Doc Links

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

## Notes

- This is an inferred baseline. CTO/Docs Memory must promote or correct important relations.
- Override input: `C:/Personal/Projekty/Aplikacje/Roost/docs/architecture/scanner-overrides.json` (entity entries: 0, relation entries: 0).
- Override summary: excluded files 0, entity overrides 0, relation overrides 0, critical entities tagged 0.
- `verified` still requires fresh command/browser/deploy evidence, not only file presence.