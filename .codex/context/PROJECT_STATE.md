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
- 2026-05-02: CompanyCore owns the first native integration adapter:
  ClickUp -> CompanyCore -> PostgreSQL -> event. n8n remains optional for
  orchestration only when a workflow is better outside the backend.
- 2026-05-02: v1 must include an ownership boundary: registration creates a
  workspace and an owner user, and integration settings/secrets belong to the
  workspace rather than global process state.

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
- MCP / external tools: ClickUp API is called by a native CompanyCore
  integration adapter; n8n may call API endpoints for optional orchestration.
- Auth / ownership: v1 workspace owner model with user registration, login,
  automatic workspace bootstrap, bearer auth context, workspace-scoped API key
  context, and workspace-scoped integration settings.

## Validation Commands
- Lint: Not configured.
- Typecheck: `npm run build`
- Unit tests: Not configured in v1.
- Integration tests: `npm test` with `DATABASE_URL` pointed at a disposable
  PostgreSQL database.
- E2E / smoke: `GET /health`, register owner/workspace, authenticate, create
  project, create task, configure workspace ClickUp settings, trigger native
  ClickUp sync, verify synced task and event.
- Other high-risk checks: `docker compose up -d --build`

## Deployment Contract
- Primary deploy path: Docker Compose.
- Coolify app/service layout: one backend service plus one Postgres service.
- Dockerfiles / compose paths: `Dockerfile`, `docker-compose.yml`.
- Required secrets: `DATABASE_URL`, `SEED_API_KEY`, `AUTH_TOKEN_SECRET`,
  `INTEGRATION_SECRET_KEY`, optional `PORT`; local seed may use `SEED_OWNER_EMAIL`,
  `SEED_OWNER_PASSWORD`, and `SEED_WORKSPACE_NAME`; ClickUp tokens must be
  stored as workspace integration settings, not hardcoded process globals.
- Public URLs / ports: backend on `3000`; deployed domains to document and
  verify are `companycore.luckysparrow.ch` and
  `api.companycore.luckysparrow.ch`.
- Backup / restore expectation: Postgres volume backups required before
  production use.
- Rollback trigger and method: redeploy previous image/commit and preserve
  Postgres volume.

## Current Focus
- Main active objective: verify production deployment.
- Top blockers: latest commits are not yet verified as deployed to production;
  `/v1/health` returns `401 Unauthorized` on production; production owner/API
  key and ClickUp settings are needed for protected smoke.
- Success criteria for this phase: canonical docs, workspace/auth model,
  task board, planning queue, deployment domains, migration strategy, event
  coverage, API/error contracts, regression guardrails, tests, observability,
  and deployment smoke evidence are aligned.

## Autonomous Iteration State
- Current iteration: CCV1-009 production deployment verification.
- Current operation mode: ARCHITECT
- Last completed iteration: CCV1-008 missing module route decision and minimal
  route slice.
- Last completed task: resolved `/v1/*` namespace without `/api`, preserved
  root aliases, and added workspace-scoped `decisions` and `agent-logs` routes.
- Next required mode: ARCHITECT for CCV1-009 after deploy/credential blockers
  are cleared.

## Recent Progress
- 2026-05-02: Created Company Core backend foundation, Prisma schema, Docker
  runtime, API key auth, minimal endpoints, ClickUp sync, event logging, and
  docs.
- 2026-05-02: Audited repository against CompanyCore v1 expectations. Confirmed
  build passes and identified planning/doc drift, missing event types,
  migration risk, plaintext API key storage, missing deployment domains, and
  incomplete route modules.
- 2026-05-02: Converted audit findings into the CCV1 task queue and task
  contracts under `docs/planning/`.
- 2026-05-02: Revised integration direction by user decision: CompanyCore v1
  should implement native ClickUp integration directly instead of requiring
  n8n workflows as the primary path.
- 2026-05-02: Revised auth/ownership direction by user decision: v1 should
  create a workspace with an owner user during registration, and workspace
  settings should own integration configuration such as ClickUp credentials.
- 2026-05-02: Added regression-prevention plan covering API contracts,
  workspace guardrail tests, migration/bootstrap safety, integration adapter
  contracts, and observability minimums.
- 2026-05-02: Completed CCV1-001 by replacing canonical architecture and
  Coolify deployment placeholders with CompanyCore-specific architecture and
  operations truth.
- 2026-05-02: Completed CCV1-011 by documenting owner email/password auth,
  workspace creation at registration, owner-only membership for v1, and
  workspace-scoped service API keys.
- 2026-05-02: Completed CCV1-014 by documenting stable API response envelopes,
  error response shape, standard error codes, and safe error redaction rules.
- 2026-05-02: Completed CCV1-015 by expanding the workspace guardrail test
  matrix for protected route types, service keys, integration settings, secret
  redaction, and native sync behavior.
- 2026-05-02: Completed CCV1-003 by adding the v1 foundation Prisma migration,
  switching Docker startup to `prisma migrate deploy`, and documenting rollback
  expectations.
- 2026-05-02: Completed CCV1-012 by adding owner registration/login,
  automatic workspace creation, bearer token auth, password hashing,
  workspace-aware API key context, workspace/auth migration, and local seed
  bootstrap.
- 2026-05-02: Completed CCV1-013 by adding workspace-scoped integration
  settings, encrypted token storage, ClickUp configuration routes, integration
  settings service helpers, and source-of-truth docs.
- 2026-05-02: Completed CCV1-017 by documenting the native integration adapter
  contract, idempotency, safe provider errors, observability fields, and
  ClickUp smoke signals.
- 2026-05-02: Completed CCV1-010 by implementing the first native pull-only
  ClickUp task sync adapter, workspace-scoped task ownership, idempotent
  `(workspace_id, source, external_id)` upsert, and safe sync events.
- 2026-05-02: Completed CCV1-004 by adding missing `client_created`,
  `deal_created`, and `note_created` events to create routes.
- 2026-05-02: Completed CCV1-005 by recording production domains, smoke
  checks, required deployment secrets, and rollback notes for preserving the
  PostgreSQL volume.
- 2026-05-02: Completed CCV1-016 by documenting migration review/testing,
  local seed, production first-owner bootstrap, credential rotation, and
  rollback/recovery policy.
- 2026-05-02: Completed CCV1-007 by adding hashed workspace service API key
  storage, transition-compatible lookup, seed hash population, and rotation
  documentation.
- 2026-05-02: Completed CCV1-006 by adding Node integration tests covering
  health, auth, workspace API keys, task scoping, ClickUp settings redaction,
  native ClickUp sync, events, and fresh `prisma migrate deploy`; removed a BOM
  from the foundation migration after the fresh migration test exposed it.
- 2026-05-02: Completed CCV1-008 by resolving DEC-001 and DEC-003, adding
  `/v1/*` route aliases without `/api`, preserving root compatibility aliases,
  and implementing workspace-scoped decisions and agent-log endpoints.
- 2026-05-02: Started CCV1-009 production verification. Public
  `GET https://api.companycore.luckysparrow.ch/health` returned healthy status,
  but `GET /v1/health` returned `401 Unauthorized`, so production is not yet
  verified against the current v1 route build. Protected smoke remains blocked
  pending deployment and production credentials.
- 2026-05-02: Completed CCV1-018 by adding owner-only adapter API key
  management so Jarvan, Aviary, and similar agents can receive workspace
  service credentials without GUI work or direct database access.
- 2026-05-02: Added production seed transition fix so existing legacy plaintext
  `SEED_API_KEY` rows are updated with `key_hash` instead of creating a
  duplicate unique key during redeploy.

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

## Active v1 Plan
- `docs/planning/mvp-next-commits.md`
- `docs/planning/mvp-execution-plan.md`
- `docs/planning/companycore-v1-task-contracts.md`
- `docs/planning/auth-workspace-integration-plan.md`
- `docs/planning/regression-prevention-plan.md`
- `docs/planning/open-decisions.md`
