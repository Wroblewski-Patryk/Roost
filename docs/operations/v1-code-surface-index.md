# V1 Code Surface Index

Last updated: 2026-08-14

## Purpose

This index maps the implemented code surface to the Company OS architecture so
future agents can reason from the repository instead of rediscovering the
project from chat history.

Use it with:

- `docs/planning/v1-architecture-control-map.md`
- `docs/operations/v1-function-coverage-ledger.csv`
- `docs/operations/v1-function-coverage-audit.md`
- `docs/architecture/system-architecture.md`

## Runtime Shape

| Surface | Path | Notes |
| --- | --- | --- |
| Backend app composition | `src/app.ts` | Express app, static asset host, React route allowlist, protected `/v1` routes. |
| Server entrypoint | `src/server.ts` | Runtime startup. |
| Database schema | `prisma/schema.prisma` | PostgreSQL source-of-truth schema. |
| Seed data | `prisma/seed.ts` | LuckySparrow baseline data, operating model, Company OS seeds. |
| React app source | `web/src/main.tsx` | React dashboards and workbenches. |
| React route registry | `web/src/app-route-registry.ts` | Canonical active routes, compatibility aliases, navigation metadata, and post-auth normalization. |
| React shared route kit | `web/src/react-route-kit.tsx` | Shared API clients, state hooks, shell, notices, metrics, table primitives. |
| Generated React build | `public/react/` | Active owner-console bundle created by `npm run build:web`; generated output is not route source truth. |
| MCP bridge | `scripts/companycore-mcp-server.mjs` | Thin stdio bridge over `/v1/mcp/manifest`. |
| MCP smoke | `scripts/companycore-mcp-smoke.mjs` | Bridge smoke for initialize, tools/list, and a safe Company OS tool call. |

## Database Model Groups

| Group | Models |
| --- | --- |
| Auth and ownership | `User`, `Workspace`, `WorkspaceMembership`, `ApiKey`, `IntegrationSetting` |
| Operating model | `OperatingArea`, `OperatingFolder`, `OperatingTable`, `ExternalContainerMapping`, `ExternalFieldMapping`, `StorageLocation`, `KnowledgeRoot`, `AutomationDefinition` |
| Company OS definitions | `CompanyRole`, `Process`, `Pipeline`, `PipelineStage`, `Procedure`, `ProcedureStep`, `Resource`, `ToolAdapter`, `IntegrationCapability`, `Standard` |
| Runtime evidence | `PipelineRun`, `StageRun`, `Approval`, `ChecklistTemplate`, `ChecklistItem`, `AcceptanceCriterion`, `AuditLog`, `Event` |
| Governance intelligence | `Policy`, `Metric`, `Risk`, `Control`, `KnowledgeItem`, `DecisionLog`, `AutomationRule`, `Trigger`, `Artifact`, `Dependency`, `BusinessFunction`, `Stakeholder` |
| Business records | `Project`, `Goal`, `Target`, `TaskList`, `Task`, `Client`, `Deal`, `Interaction`, `Note`, `Decision`, `Agent`, `AgentLog` |
| Google Drive | `GoogleDriveFile`, `GoogleDriveContentSnapshot` |
| ClickUp/webhook bridge | `ExternalWebhookRegistration`, `ProviderEventInbox`, `AgentEventOutbox` |

## Protected API Module Index

| Module | Route base | Main behaviors |
| --- | --- | --- |
| connection | `/v1/connection` | Workspace/session context, capabilities, operating model, integration status, MCP manifest. |
| mcp | `/v1/mcp/manifest` | MCP-friendly tool catalog projected from HTTP capabilities. |
| api keys | `/v1/api-keys` | Service key listing, profile listing, creation, activation/rotation status. |
| company os | `/v1/company-os` | Cockpit reads, collection reads/details, approval commands, stage lifecycle commands, automation evaluator. |
| operating model | `/v1/operating-model` | Areas, folders, external mappings, storage locations, knowledge roots, automation definitions. |
| google drive | `/v1/google-drive` | File metadata reads, content reads, scope updates, descriptions, Docs/Sheets create/edit. |
| integration settings | `/v1/integration-settings` | ClickUp discovery/webhooks/events/maintenance, Google Drive OAuth/import/discovery/reconcile, provider settings. |
| clickup webhook | `/v1/webhooks/clickup` | Raw-body signed webhook ingestion. |
| tasks | `/v1/tasks` | Task CRUD/archive, ClickUp custom field writes, ClickUp sync routes. |
| task lists | `/v1/task-lists` | Workspace-scoped task-list CRUD/archive. |
| projects | `/v1/projects` | Workspace-scoped project CRUD/archive. |
| goals | `/v1/goals` | Workspace-scoped goal CRUD/archive. |
| targets | `/v1/targets` | Workspace-scoped target CRUD/archive. |
| clients | `/v1/clients` | Workspace-scoped client CRUD/archive. |
| deals | `/v1/deals` | Workspace-scoped deal CRUD/archive. |
| interactions | `/v1/interactions` | Workspace-scoped interaction CRUD/archive. |
| notes | `/v1/notes` | Workspace-scoped note CRUD/archive and ClickUp comment bridge behavior. |
| decisions | `/v1/decisions` | Lightweight decision CRUD/archive. |
| agents | `/v1/agents` | Agent registry CRUD/archive. |
| agent logs | `/v1/agent-logs` | Agent log read/write. |
| agent events | `/v1/agent-events` | Agent event read and acknowledgement. |
| pipeline stages | `/v1/pipeline-stages` | Shared pipeline stage CRUD/archive. |
| events | `/v1/events` | Workspace-scoped event reads. |
| health | `/health`, `/v1/health` | Public readiness signal. |
| auth | `/auth`, `/v1/auth` | Register, login, and current user context. |

## Web Route Ownership

| Route | Current owner | Status |
| --- | --- | --- |
| `/` | React | Public home. |
| `/auth/login`, `/auth/register` | React | Public owner authentication routes. |
| `/areas?area=00-ogolny&view=overview` | React | Canonical post-login `00 General` dashboard. |
| `/areas?area=00-ogolny&view=product-map` | React | Canonical owner-facing product map. |
| `/areas?area=01-strategia` through `/areas?area=12-zarzadzanie` | React | Active department workbenches; canonical query and view values are defined by the route registry. |
| `/dashboard`, `/react-dashboard`, `/operations`, `/people-agents`, `/workforce` | React | Compatibility aliases normalized to canonical `/areas` routes. |
| `/account/settings`, `/workspace/settings` | React | Authenticated account and workspace settings. |
| Retired private paths such as `/data`, `/relationships`, `/pipeline`, and provider-specific setup routes | None | Not active web routes; protected backend contracts remain available for scoped React rebuilds and API/MCP use. |

## Integration Services

| Provider | Files | Implemented behaviors |
| --- | --- | --- |
| ClickUp | `src/integrations/clickup/*`, `src/modules/integration-settings/*`, `src/modules/webhooks/*`, `src/modules/tasks/*` | Discovery, sync, webhook registration, signed webhook ingestion, provider inbox retry, maintenance, task write-back, custom fields, comments bridge. |
| Google Drive | `src/integrations/google-drive/*`, `src/modules/google-drive/*`, `src/modules/integration-settings/*` | OAuth URL/exchange, folder discovery/import, metadata persistence, content snapshots, Docs/Sheets create/edit, changes reconcile, operating scope updates. |
| MCP | `src/mcp/*`, `src/modules/mcp/*`, `scripts/companycore-mcp-*` | Manifest projection, stdio bridge, profile-scoped tools, smoke harness. |
| Paperclip | `integrations/paperclip/companycore-adapter.patch`, operations docs | Production adapter patch and validated source handoff; upstream merge blocked by external permissions. |
| OpenJarvis | operations docs | Production connector behavior and validated source handoff; upstream merge blocked by external permissions. |

## Validation Surface

| Command | Scope |
| --- | --- |
| `npm run build` | TypeScript server build and Vite React build. |
| `npm test` | Build, migrations, and Node integration test suite against a database. |
| `npm run owner-console:ux-smoke` | Authenticated owner-console screenshots and route checks. |
| `npm run mcp:smoke` | MCP bridge initialize, tools/list, and safe Company OS tool call. |
| `docker compose up -d --build` | Local container build/runtime shape. |
| `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy && npm run seed"` | Container migration and seed gate. |
| `git diff --check` | Whitespace/conflict marker guard. |

## Index Maintenance Rules

- Update this file when a new route, model group, integration surface, or
  canonical UI route owner changes.
- Do not add aspirational rows without code evidence.
- Use the function coverage ledger for confidence/evidence status; use this
  file for code-surface orientation.
