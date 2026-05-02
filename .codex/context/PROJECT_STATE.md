# PROJECT_STATE

Last updated: 2026-05-02

## Product Snapshot
- Name: LuckySparrow Company Core
- Goal: Central backend for company projects, goals, tasks, CRM, notes,
  decisions, agents, and system events.
- Commercial model: Internal operational infrastructure.
- Current phase: v1 foundation.

## Product Decisions (Confirmed)
- 2026-05-02: No GUI in v1.
- 2026-05-02: PostgreSQL is the source of truth.
- 2026-05-02: API is the only supported access layer.
- 2026-05-02: n8n owns ClickUp integration; Company Core only receives sync
  payloads.

## Technical Baseline
- Backend: Node.js 22, Express, TypeScript.
- Frontend: None.
- Mobile: None.
- Database: PostgreSQL with Prisma.
- Infra: Docker Compose.
- Hosting target: Coolify-compatible Docker Compose.
- Deployment shape: backend + postgres.
- Runtime services: `backend`, `postgres`.
- Background jobs / workers: None in v1.
- Persistent storage: Docker volume `companycore_postgres`.
- Health / readiness checks: `GET /health`.
- Environment files: `.env.example`.
- Observability: minimal system events table.
- MCP / external tools: n8n calls API for ClickUp sync.

## Validation Commands
- Lint: Not configured.
- Typecheck: `npm run build`
- Unit tests: Not configured in v1.
- Integration tests: manual HTTP smoke against Docker Compose.
- E2E / smoke: `GET /health`, create project, create task, sync ClickUp task.
- Other high-risk checks: `docker compose up -d --build`

## Deployment Contract
- Primary deploy path: Docker Compose.
- Coolify app/service layout: one backend service plus one Postgres service.
- Dockerfiles / compose paths: `Dockerfile`, `docker-compose.yml`.
- Required secrets: `DATABASE_URL`, `SEED_API_KEY`, optional `PORT`.
- Public URLs / ports: backend on `3000`.
- Backup / restore expectation: Postgres volume backups required before
  production use.
- Rollback trigger and method: redeploy previous image/commit and preserve
  Postgres volume.

## Current Focus
- Main active objective: v1 foundation handoff.
- Top blockers: none for foundation; production migration strategy deferred.
- Success criteria for this phase: DB, API, Docker, docs, and minimal flow work.

## Autonomous Iteration State
- Current iteration: v1 initialization.
- Current operation mode: BUILDER
- Last completed iteration: template copy and backend foundation.
- Last completed task: smoke-tested project/task/ClickUp flow.
- Next required mode: ARCHITECT for v2 migration/auth/API expansion.

## Recent Progress
- 2026-05-02: Created Company Core backend foundation, Prisma schema, Docker
  runtime, API key auth, minimal endpoints, ClickUp sync, event logging, and
  docs.

## Working Agreements
- Keep task board and project state synchronized.
- Keep planning docs synchronized with task board.
- Keep changes small and reversible.
- Validate touched areas before marking done.
- Keep repository artifacts in English.
- Communicate with users in their language.
- Treat deployment docs and smoke checks as part of done-state for runtime
  changes.

## Canonical Context
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/LEARNING_JOURNAL.md`
- `.agents/workflows/general.md`

## Canonical Docs
- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/NEXT_STEPS.md`
