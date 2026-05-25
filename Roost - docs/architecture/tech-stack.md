# Tech Stack

This document records approved technology choices for CompanyCore v1. Do not
replace these choices without an explicit architecture decision.

## Runtime Stack

- Backend: Node.js 22, Express 4, TypeScript.
- Frontend: backend-served owner console. The current production surface is
  still the static HTML/CSS/JavaScript console, and UXA-009 adds an explicit
  React + Vite + Tailwind CSS + DaisyUI build foundation under
  `web/` -> `public/react/` for incremental component migration.
  The accepted web surface now includes auth, settings, API-key management,
  ClickUp setup, Google Drive setup, operating areas, relationships, data
  operations, typed business editors, and a framework-backed
  `/react-dashboard` foundation route.
- Mobile: none in v1; v2 mobile should follow the web product experience.
- Database: PostgreSQL 16 with Prisma.
- Cache or queue: none in v1.
- Jobs or workers: no separate worker tier in v1; the backend includes the
  lightweight in-process ClickUp maintenance scheduler.
- External integrations: native ClickUp adapter is live; Google Drive v2
  OAuth, selected-root import, and department scoping are production-proven for
  the numbered company roots. Remaining Drive proof work is limited to future
  content quality, Docs/Sheets write, and changes reconciliation samples.
  n8n remains optional for orchestration.
- Auth: owner-user auth plus workspace-scoped service API keys.

## Backend Libraries

- `express`: HTTP routing.
- `@prisma/client` and `prisma`: database schema/client.
- `zod`: request validation.
- `cors`: CORS middleware.
- `dotenv`: local env loading.

Auth, password hashing, tests, and secret encryption are implemented in the
runtime slices that introduced those capabilities. Record future library
changes here only when a scoped task changes the stack.

## Developer Tooling

- Package manager: npm with `package-lock.json`.
- Typecheck/build: `npm run build`.
- Frontend build: `npm run build:web` produces the React foundation assets
  under ignored generated output `public/react/`.
- Development server: `npm run dev`.
- Prisma generate: `npm run prisma:generate`.
- Prisma schema push: available for local experimentation only; production uses
  migrations through `npm run prisma:migrate:deploy`.
- Lint: not configured yet.
- Unit/integration tests: `npm test` builds TypeScript, applies Prisma
  migrations, and runs Node test files under `dist/tests/**/*.test.js` against
  the configured PostgreSQL database.
- Browser automation: applicable for v1 owner-console smoke when UI changes
  are made.

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

Current runtime:

- `DATABASE_URL`
- `SERVICE_PASSWORD_POSTGRES`
- `SERVICE_PASSWORD_API_KEY` or `SEED_API_KEY`
- `AUTH_TOKEN_SECRET`
- `API_KEY_HASH_SECRET`
- `INTEGRATION_SECRET_KEY`
- `PORT` optional, default `3000`

Workspace-owned ClickUp and Google Drive token/config material is stored in
database-backed integration settings, not as global process-only configuration.

## Non-Goals For v1

- Mobile app.
- Billing.
- Invitations.
- Advanced RBAC.
- Workflow engine.
- Queue or worker infrastructure unless a later approved task proves it is
  required.
- Obsidian sync.
- Full CRM product suite beyond the accepted typed business editor workbenches.
