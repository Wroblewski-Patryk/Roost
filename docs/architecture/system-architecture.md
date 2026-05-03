# System Architecture

CompanyCore is the operational core for LuckySparrow. It stores company
projects, goals, targets, tasks, CRM context, decisions, notes, AI agent
metadata, agent logs, integration state, and system events. PostgreSQL is the
source of truth, and the HTTP API is the supported integration access layer.

## Main Runtime Surfaces

- API or backend: Node.js 22, Express, TypeScript, Prisma.
- Web: minimal owner-only static console in v1 for ClickUp integration setup.
  A broader company operations dashboard is v2 scope.
- Mobile: none in v1; v2 mobile should follow the web product experience.
- Jobs or workers: none in the current runtime; native integration sync may be
  exposed through authenticated API commands first.
- External services: PostgreSQL, ClickUp API, optional n8n orchestration, future
  Paperclip/Jarvis/future GUI API clients.

## Source Of Truth Rules

- PostgreSQL owns canonical company state.
- Prisma owns the database schema and generated database client.
- External tools must not write directly to PostgreSQL.
- Paperclip, Jarvis, n8n, future dashboard clients, and other agents must use
  the API.
- Significant state changes should emit events.
- Schema changes must use migrations before production data becomes valuable.

## Workspace Ownership Boundary

CompanyCore v1 must include a workspace ownership boundary before integration
settings are production-ready.

- Registration creates an owner user and workspace atomically.
- Business records belong to a workspace.
- Service API keys belong to a workspace and are intended for agents and
  automations.
- Integration settings and secrets belong to a workspace.
- Protected requests must resolve `workspaceId` before reads or writes.
- Cross-workspace access must fail closed.

This is not full enterprise multi-tenancy in v1. Invitations, billing,
advanced RBAC, organization administration, and a full CRM UI are out of scope.

## Core Data Areas

- Strategy and delivery: projects, goals, targets, task lists, tasks.
- CRM and sales: clients, deals, pipeline stages, interactions.
- Knowledge: notes, decisions.
- AI operations: agents, agent logs.
- Platform state: events, users, workspaces, workspace-scoped API keys,
  integration settings.

## ClickUp-Shaped Operating Model

CompanyCore should evolve toward a ClickUp-compatible operating model without
becoming a ClickUp clone. The canonical internal hierarchy is:

```text
Workspace -> Operating Area -> Operating Folder -> Operating Table -> Record
```

This maps to ClickUp API v2 terminology as:

```text
ClickUp Team/Workspace -> Space -> Folder -> List -> Task
```

ClickUp API v2 still calls the top-level workspace a `Team`; CompanyCore docs
and UI should use `Workspace` and treat ClickUp `team_id` as an external
workspace identifier. Provider-specific naming must stay in integration
mappers, not leak into core domain names.

Every business table should belong to exactly one of 12 operating areas. Each
area can own several operating folders and several operating tables. System
tables such as users, memberships, API keys, integration settings, provider
mappings, audit/events, and schema metadata remain platform-owned and are not
counted as business-area tables.

The approved 12 operating areas are:

1. Strategy and governance
2. Projects and delivery
3. Tasks and workflow
4. Sales and CRM
5. Marketing and growth
6. Finance and billing
7. People and roles
8. Operations and administration
9. Knowledge and decisions
10. Assets and storage
11. Automations and integrations
12. AI agents and observability

For each workspace, the operating model should make the following resources
addressable through one consistent scope:

- tables and records
- API resources for those tables
- automations that read or write those tables
- storage locations, including local disk, object storage, Google Drive, or
  other providers
- knowledge roots, including Obsidian Markdown branches or Google Drive Docs
- external provider mappings, starting with ClickUp Space, Folder, List, View,
  Custom Field, and Task identifiers

The registry layer should be explicit instead of inferred from table names. A
future schema slice should add records such as `operating_areas`,
`operating_folders`, `operating_tables`, `external_container_mappings`,
`external_field_mappings`, `storage_locations`, `knowledge_roots`, and
`automation_definitions` before broad two-way provider sync is attempted.

Existing v1 domain tables are valid as a foundation, but they are not yet a
complete ClickUp 1:1 structural mirror. The current gap is intentional planning
work, not a reason to overload `projects` or `task_lists` with unrelated
metadata.

## Module Boundaries

- `src/auth/`: authentication and service API key middleware.
- `src/config/`: runtime configuration.
- `src/db/`: Prisma client boundary.
- `src/health/`: public health endpoint.
- `src/middleware/`: shared Express middleware and error handling.
- `src/modules/*`: domain route modules and business behavior.
- `src/integrations/<provider>/`: provider-specific API clients, mappers, sync
  services, and safe error mapping.
- `public/`: minimal static owner console served by the backend for setup
  workflows only.

Route modules should not call external provider APIs directly. They should call
integration services that read workspace-owned settings and normalize provider
data into CompanyCore models.

## Integration Architecture

ClickUp is the first native CompanyCore integration adapter. The v1 target flow
is:

```text
Owner registration -> workspace -> workspace settings -> ClickUp API
  -> CompanyCore integration adapter -> PostgreSQL -> event
```

The ClickUp adapter should establish the pattern for future integrations:

- provider client
- provider mapper
- provider documentation review before mapping or API implementation
- workspace settings reader
- sync service
- safe provider error mapper
- idempotent persistence using `(workspace_id, source, external_id)`
- event emission and observable sync results

Provider adapters must be designed from current vendor documentation and
record the relevant endpoint, hierarchy, pagination, rate-limit, webhook,
signature, field, and permission assumptions in the task evidence. For ClickUp,
mapping must preserve the `Team/Workspace -> Space -> Folder -> List -> Task`
hierarchy, Custom Field metadata and values, View parent scope, per-token rate
limits, and webhook HMAC signature requirements before enabling write-back or
continuous sync.

n8n remains optional orchestration for workflows better kept outside the
backend. It is not the required primary ClickUp path in v1.

## Security Boundaries

- `GET /health` is public.
- Business, auth-context, integration, and event routes are protected except for
  explicitly public auth bootstrap/login/register routes.
- Owner-user auth is for human/API clients.
- Workspace-scoped service API keys are for Paperclip, Jarvis, n8n, and other
  agents.
- API keys and integration tokens must not be stored only as plaintext in
  production paths.
- Integration secrets must not be returned in API responses or logs.
- Raw provider/backend errors must not be exposed directly to clients.

## Deployment Topology

- Hosting target: Coolify-compatible VPS deployment.
- Runtime services: `backend`, `postgres`.
- Public entry point: backend service on port `3000`.
- Production domains to document and verify:
  - `companycore.luckysparrow.ch`
  - `api.companycore.luckysparrow.ch`
- Private infrastructure: PostgreSQL service and persistent Docker volume.
- Health/readiness endpoint: `GET /health`.
- Required persistence: `companycore_postgres` Docker volume.

## Regression Guardrails

Every runtime feature must answer:

- Which workspace owns the data?
- Which auth path allowed the request?
- Which denied path was tested?
- Which event or log proves the change happened?
- Which migration or schema check protects persistence?
- Which smoke step would catch a regression after deploy?
