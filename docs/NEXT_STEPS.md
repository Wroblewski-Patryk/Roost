# Next Steps

## 1. What Was Done

- Created `companycore` from the local `!template` foundation.
- Added Node.js, Express, TypeScript, Prisma, PostgreSQL, and Docker Compose.
- Added the target source structure under `src/`.
- Added Prisma models for Company Core v1 entities.
- Added API key middleware with `X-API-Key`.
- Added minimal endpoints for health, projects, goals, targets, tasks, clients,
  deals, notes, events, and ClickUp task sync.
- Added event creation for the required v1 lifecycle events.
- Added docs for architecture, database, API, integrations, deployment, and
  handoff.

## 2. What Works

- `GET /health`
- `GET /projects`, `POST /projects`
- `GET /goals`, `POST /goals`
- `GET /targets`, `POST /targets`
- `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`
- `POST /tasks/sync/clickup`
- `GET /clients`, `POST /clients`
- `GET /deals`, `POST /deals`
- `GET /notes`, `POST /notes`
- `GET /events`
- Docker Compose starts backend and Postgres.
- Seed creates local API key `dev-companycore-key`.

## 3. What Is Not Implemented Yet

- GUI.
- Direct ClickUp API calls.
- Full CRM workflows and pipeline stage API.
- Full decisions, agents, agent logs, interactions, and task-list APIs.
- Role-based auth, users, permissions, key hashing, or audit dashboards.
- Background jobs, queues, webhooks, analytics, and reporting.
- Production-grade migrations. v1 uses `prisma db push` for foundation setup.

## 4. v2 Priorities

- Add proper Prisma migrations and migration policy.
- Hash API keys and add key scopes.
- Add endpoint-level tests with a disposable Postgres database.
- Add full CRUD for task lists, decisions, interactions, agents, and agent logs.
- Add event consumers or webhook delivery for automation.
- Define Paperclip and Jarvis read/write contracts in more detail.
- Add production observability and structured logs.

## 5. How To Extend

- Keep Postgres as the source of truth.
- Keep the API as the only write layer.
- Add routes inside the matching `src/modules/<module>/` folder.
- Emit events for meaningful state changes.
- Add validation schemas before accepting new request payloads.
- Update `docs/API.md` and `docs/DATABASE.md` with every contract change.

## 6. How Not To Break The Architecture

- Do not let n8n, Paperclip, Jarvis, or a GUI write directly to Postgres.
- Do not hide business state in external tools without mirroring canonical data
  into Company Core.
- Do not add direct third-party API calls before deciding whether n8n should own
  that integration.
- Do not introduce broad abstractions before at least two modules genuinely need
  them.
- Do not skip event creation for state changes that automations may care about.
