# PROJECT_STATE

Last updated: 2026-05-02

## Product Snapshot
- Name: LuckySparrow Company Core
- Goal: Central backend for company projects, goals, tasks, CRM, notes,
  decisions, agents, and system events.
- Commercial model: Internal operational infrastructure.
- Current phase: v1 foundation.

## Product Decisions (Confirmed)
- 2026-05-03: v1 includes a minimal owner-only web console for production
  ClickUp connection setup. A broader company operations dashboard and mobile
  app are v2 scope; mobile should follow the web product shape.
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
- Frontend: minimal static owner console served by the backend for v1
  integration setup only.
- Mobile: None in v1; planned from v2 based on the web product experience.
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
- Main active objective: complete protected production smoke and prepare the
  next v1 database/API coverage slice.
- Top blockers: production owner/API key plus ClickUp settings are needed for
  protected smoke; GitHub repository webhook setup needs an authenticated
  GitHub session or token with webhook administration permissions.
- Success criteria for this phase: canonical docs, workspace/auth model,
  task board, planning queue, deployment domains, migration strategy, event
  coverage, API/error contracts, regression guardrails, tests, observability,
  and deployment smoke evidence are aligned.

## Autonomous Iteration State
- Current iteration: CCV1-026 adapter smoke script.
- Current operation mode: BUILDER
- Last completed iteration: CCV1-026 adapter smoke script.
- Last completed task: added `npm run adapter:smoke` so a production workspace
  service key can verify the full Paperclip/Jarvis onboarding path before the
  adapters are wired.
- Next required mode: BUILDER for adapter production smoke once credentials are
  available.

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
- 2026-05-02: Reproduced the production startup failure in local Docker. Fixed
  runtime seed imports so `prisma/seed.ts` does not depend on uncopied `src/`
  files, and fixed the runtime image to copy the generated Prisma Client from
  the build stage. Local `docker compose up --build -d` now applies migrations,
  runs seed, starts the API, and returns `ok` for `/health` and `/v1/health`.
- 2026-05-02: Recovered production Coolify deployment. Root cause was Prisma
  `P3005` because production already had the foundation schema but no
  `_prisma_migrations` baseline. Added a one-time baseline row for
  `202605021_v1_foundation`, forced redeploy `r4hgrbmh5obfvz9v61mlbgyc` to
  commit `3f64a72`, confirmed backend logs show no pending migrations, seed
  success, and `companycore listening on port 3000`, then verified public
  `/health`, `/v1/health`, and unauthenticated `/v1/projects` negative smoke.
- 2026-05-02: Completed CCV1-019 by adding workspace ownership to projects,
  goals, targets, task lists, clients, pipeline stages, deals, interactions,
  notes, agents, and events. Protected routes for projects, goals, targets,
  clients, deals, notes, events, decisions, agent logs, and tasks now filter by
  the active workspace and reject foreign relation IDs with `not_found`.
- 2026-05-02: Deployed CCV1-019 to production with manual Coolify redeploy
  `zibcl0a0rih1vmhig3vkf4ce` at commit `1d6f21a`. Backend logs confirmed
  migration `202605028_workspace_core_records`, seed success, and server start;
  public `/health`, `/v1/health`, and unauthenticated `/v1/projects` smoke
  passed. Coolify `Auto Deploy` is enabled, but no GitHub webhook deployment
  fired after push because GitHub repository settings were not authenticated in
  the browser session.
- 2026-05-02: Completed CCV1-021 by adding `/v1/connection` and `/connection`
  so service adapters can verify API key auth, workspace identity,
  capabilities, and safe ClickUp configuration status before syncing or writing
  operational records.
- 2026-05-02: Completed CCV1-022 by expanding the connection handshake with a
  safe adapter manifest that lists canonical v1 routes, methods, capabilities,
  auth headers, and write rules for service clients.
- 2026-05-02: Completed CCV1-023 by adding workspace-scoped agents API routes,
  `agent_created` event emission, manifest capabilities for agents, and tests
  for same-workspace creation plus cross-workspace log denial.
- 2026-05-02: Deployed CCV1-022 and CCV1-023 to production. Coolify manual
  redeploy for `c564d0a` finished successfully. The `ebc660b` deployment was
  initially queued behind other server deployments, then force-started from the
  CompanyCore deployment detail page and finished successfully. Public
  `/v1/health` returned `200`; unauthenticated `/v1/agents` and
  `/v1/connection` returned `401` as expected.
- 2026-05-03: Completed CCV1-024 by adding workspace-scoped interactions API
  routes, `interaction_created` event emission, adapter manifest capabilities
  for interactions, and tests for same-workspace creation plus cross-workspace
  client relation denial.
- 2026-05-03: Completed CCV1-025 by adding workspace-scoped task list and
  pipeline stage API routes, create/update events, adapter manifest
  capabilities, and tests for same-workspace creation/update plus
  cross-workspace relation isolation.
- 2026-05-03: Completed CCV1-026 by adding an adapter smoke script that checks
  `/v1/connection`, creates an agent, task list, task, interaction, and agent
  log, then verifies expected events without printing the service API key.
- 2026-05-03: Completed protected production adapter smoke through VPS/Coolify
  access. A fresh hash-only service key for `Paperclip/Jarvis production
  adapter` was created in production DB for workspace `LuckySparrow`; key
  prefix `cc_v1_LxSo`, key id `d64ab750-b6e7-4806-96b3-8e64eadeb37d`.
  `npm run adapter:smoke` succeeded against
  `https://api.companycore.luckysparrow.ch`, creating agent, task list, task,
  interaction, agent log, and expected events. The raw key was not recorded in
  docs because raw service keys are one-time secret material.
- 2026-05-03: Wired CompanyCore environment variables into production
  Paperclip and Jarvis containers on the VPS. Paperclip has
  `COMPANYCORE_BASE_URL`, `COMPANYCORE_ADAPTER_SOURCE=paperclip`, and a
  dedicated service key with prefix `cc_v1_qUZK`. Jarvis has
  `COMPANYCORE_BASE_URL`, `COMPANYCORE_ADAPTER_SOURCE=jarvis`, and a dedicated
  service key with prefix `cc_v1_GaF4`. Both containers were recreated and both
  dedicated keys passed `npm run adapter:smoke`.
- 2026-05-03: Seeded production CompanyCore with Jarvis/Paperclip smoke
  records through the official API: a project, task list, two tasks, one
  decision, one note, and one agent. Prepared Jarvis application-side chat
  context code that reads CompanyCore via `COMPANYCORE_BASE_URL` and
  `COMPANYCORE_API_KEY`; production chat still answered that it has no
  CompanyCore access, so deployment of the prepared Jarvis runtime change is
  tracked as CCV1-028.
- 2026-05-03: Extended the prepared Jarvis runtime change for CCV1-028 with a
  native CompanyCore Data Source connector. The connector registers as
  `companycore`, verifies `/v1/connection`, syncs CompanyCore projects, task
  lists, tasks, clients, deals, interactions, notes, decisions, agents, and
  events into the Jarvis knowledge pipeline, and was locally validated with
  targeted connector/context tests.
- 2026-05-03: Completed CCV1-028 by deploying the Jarvis CompanyCore connector
  and chat context injector to production `jarvis.luckysparrow.ch`.
  `GET /v1/connectors/companycore` returned `connected=true`, manual sync
  indexed 38 CompanyCore chunks, and a production chat smoke answered from the
  seeded CompanyCore Paperclip project, including the decision, two tasks, and
  `Jarvis production chat adapter` agent.
- 2026-05-03: Added `docs/operations/jarvis-companycore-update-runbook.md`
  with the repeatable OpenJarvis update, deploy, connector smoke, and chat
  smoke procedure for the CompanyCore Data Source integration.
- 2026-05-03: Completed CCV1-029 by adding an operator-only ClickUp production
  bootstrap script and deployment doc. Operators can provide temporary
  `CLICKUP_API_TOKEN`, `CLICKUP_TEAM_ID`, and `CLICKUP_LIST_IDS` values to save
  encrypted workspace ClickUp settings through the protected API and trigger
  the first native pull sync. Continuous listening is not active yet; it
  requires an approved scheduled sync, webhook receiver, or external
  orchestration follow-up.
- 2026-05-03: Completed CCV1-031P by checking official ClickUp API docs and
  publishing the guided owner-console deployment plan. ClickUp personal tokens
  can access multiple Workspaces available to the user, so v1 owner setup must
  discover `GET /api/v2/team`, let the owner select the ClickUp Workspace, then
  discover Spaces/Folders/Lists before saving selected `listIds`.
- 2026-05-03: Audited the ClickUp owner-console plan against additional
  official ClickUp docs. Added required handling for token rate limits, stored
  token rediscovery, explicit pagination validation, and future webhook
  signature/idempotency requirements.
- 2026-05-03: Completed CCV1-031 and CCV1-032 locally by adding owner-only
  ClickUp discovery through CompanyCore, safe invalid-token and rate-limit
  error mapping, stored-token rediscovery, manifest capabilities, guided web
  console Workspace/List selection, and tests covering discovery, rate limits,
  stored-token rediscovery, protected route denial, and native sync.

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
