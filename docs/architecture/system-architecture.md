# System Architecture

CompanyCore is the backend-only operational core for LuckySparrow. It stores
company projects, goals, targets, tasks, CRM context, decisions, notes, AI agent
metadata, agent logs, integration state, and system events. PostgreSQL is the
source of truth, and the HTTP API is the only supported access layer.

## Main Runtime Surfaces

- API or backend: Node.js 22, Express, TypeScript, Prisma.
- Web: none in v1.
- Mobile: none in v1.
- Jobs or workers: none in the current runtime; native integration sync may be
  exposed through authenticated API commands first.
- External services: PostgreSQL, ClickUp API, optional n8n orchestration, future
  Paperclip/Jarvis/future GUI API clients.

## Source Of Truth Rules

- PostgreSQL owns canonical company state.
- Prisma owns the database schema and generated database client.
- External tools must not write directly to PostgreSQL.
- Paperclip, Jarvis, n8n, future GUI, and other agents must use the API.
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

## Module Boundaries

- `src/auth/`: authentication and service API key middleware.
- `src/config/`: runtime configuration.
- `src/db/`: Prisma client boundary.
- `src/health/`: public health endpoint.
- `src/middleware/`: shared Express middleware and error handling.
- `src/modules/*`: domain route modules and business behavior.
- `src/integrations/<provider>/`: provider-specific API clients, mappers, sync
  services, and safe error mapping.

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
- workspace settings reader
- sync service
- safe provider error mapper
- idempotent persistence using `(workspace_id, source, external_id)`
- event emission and observable sync results

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
