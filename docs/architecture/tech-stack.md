# Tech Stack

This document records approved technology choices for CompanyCore v1. Do not
replace these choices without an explicit architecture decision.

## Runtime Stack

- Backend: Node.js 22, Express 4, TypeScript.
- Frontend: none in v1.
- Mobile: none in v1.
- Database: PostgreSQL 16 with Prisma.
- Cache or queue: none in v1.
- Jobs or workers: none in current runtime; first sync flows should be exposed
  through authenticated backend API commands before introducing workers.
- External integrations: native ClickUp adapter first; n8n optional for
  orchestration, not the required primary path.
- Auth: planned owner-user auth plus workspace-scoped service API keys.

## Backend Libraries

- `express`: HTTP routing.
- `@prisma/client` and `prisma`: database schema/client.
- `zod`: request validation.
- `cors`: CORS middleware.
- `dotenv`: local env loading.

Future auth, token, password-hashing, test, and secret-encryption libraries
should be selected during the relevant scoped task, then recorded here.

## Developer Tooling

- Package manager: npm with `package-lock.json`.
- Typecheck/build: `npm run build`.
- Development server: `npm run dev`.
- Prisma generate: `npm run prisma:generate`.
- Prisma schema push: currently available for local foundation use; production
  should move to migrations through CCV1-003.
- Lint: not configured yet.
- Unit/integration tests: not configured yet; CCV1-006 must add and document
  the test command.
- Browser automation: not applicable in v1 because there is no GUI.

## Deployment Tooling

- Container runtime: Docker.
- Compose files:
  - `docker-compose.yml` for local Docker.
  - `docker-compose.coolify.yml` for Coolify deployment.
- Platform: Coolify-compatible VPS deployment.
- Runtime services:
  - `backend`
  - `postgres`
- Persistent storage: Docker volume `companycore_postgres`.
- Health/readiness: `GET /health`.
- CI: not configured yet.
- Monitoring/error tracking: not configured yet; v1 minimum is structured logs,
  health checks, event readback, and documented smoke checks.

## Required Configuration

Current foundation:

- `DATABASE_URL`
- `SEED_API_KEY`
- `PORT` optional, default `3000`

Planned v1 additions:

- app auth/session/JWT secret, depending on CCV1-012 decisions
- secret encryption key for workspace integration settings, depending on
  CCV1-013 decisions
- workspace-owned ClickUp token/config stored in database-backed integration
  settings, not as global process-only configuration

## Non-Goals For v1

- GUI.
- Mobile app.
- Billing.
- Invitations.
- Advanced RBAC.
- Workflow engine.
- Queue or worker infrastructure unless a later approved task proves it is
  required.
- Google Drive sync.
- Obsidian sync.
- Full CRM UI.
