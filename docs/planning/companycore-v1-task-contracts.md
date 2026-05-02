# CompanyCore v1 Task Contracts

These task contracts turn the v1 audit into executable work. Each task must be
completed as its own small iteration and must update `.codex/context/TASK_BOARD.md`,
`.codex/context/PROJECT_STATE.md`, and relevant docs when status changes.

## v1 Architecture Addendum: Workspace Ownership

CompanyCore v1 must include a workspace ownership boundary. Registration creates
an owner user and workspace atomically. Business data, API keys, integration
settings, and integration sync state must resolve to a workspace before writes
are accepted. This is not full enterprise multi-tenancy: no invitations,
billing, advanced RBAC, or organization admin UI are planned for v1.

## v1 Regression Guardrails

Every runtime task must preserve these rules:

- protected routes resolve `workspaceId`
- cross-workspace access fails closed
- integration secrets are not logged or returned
- external sync is idempotent per `(workspace_id, source, external_id)`
- schema changes use migrations
- significant state changes emit events
- API errors use stable, safe response codes
- tests include allowed and denied paths

## CCV1-001 Canonical Architecture And Deployment Docs Alignment

### Header
- ID: CCV1-001
- Title: Canonical architecture and deployment docs alignment
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: Audit findings from 2026-05-02
- Priority: P0
- Iteration: v1-001
- Operation Mode: BUILDER

### Goal
Make the canonical architecture and operations documents reflect the actual
CompanyCore v1 backend-only architecture.

### Scope
- `docs/architecture/system-architecture.md`
- `docs/architecture/tech-stack.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/operations/coolify-vps-deployment-contract.md`
- `.codex/context/PROJECT_STATE.md`

### Implementation Plan
1. Compare current short-form docs in `docs/*.md` with canonical architecture
   and operations docs.
2. Replace active template placeholders with CompanyCore-specific truth.
3. Keep the approved v1 boundary: no GUI, API as access layer, PostgreSQL as
   source of truth, native ClickUp adapter as the first integration pattern,
   and n8n as optional orchestration.
4. Record deployment topology, private Postgres, public API, and required
   secrets.

### Acceptance Criteria
- [x] Canonical architecture docs no longer describe placeholder systems.
- [x] Docs clearly state that CompanyCore v1 has no GUI.
- [x] Docs clearly state the
  `ClickUp API -> CompanyCore adapter -> DB -> event` flow.
- [x] Deployment contract lists backend, Postgres, volume, health check, and
  required secrets.

### Definition of Done
- [x] Docs are updated in English.
- [x] No runtime code changes are included.
- [x] Planning and project state remain synchronized.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Result Report
- Task summary: Replaced canonical architecture and deployment placeholders
  with CompanyCore-specific backend-only architecture, workspace ownership,
  native ClickUp adapter direction, tech stack, and Coolify deployment contract.
- Files changed: `docs/architecture/system-architecture.md`,
  `docs/architecture/tech-stack.md`,
  `docs/architecture/architecture-source-of-truth.md`,
  `docs/operations/coolify-vps-deployment-contract.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Searched canonical docs for old template placeholder language,
  reviewed docs for the required architecture statements, and ran
  `git diff --check`.
- What is incomplete: Runtime implementation is unchanged; CCV1-011 must still
  finalize detailed workspace/auth schema and auth-context contract.
- Next steps: Start CCV1-011.

## CCV1-002 Real Planning Queue And Task Contracts

### Header
- ID: CCV1-002
- Title: Real planning queue and task contracts
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Planner
- Depends on: Audit findings from 2026-05-02
- Priority: P0
- Iteration: v1-002
- Operation Mode: BUILDER

### Goal
Replace template planning placeholders with a real, dependency-aware
CompanyCore v1 execution queue.

### Scope
- `docs/planning/mvp-next-commits.md`
- `docs/planning/mvp-execution-plan.md`
- `docs/planning/open-decisions.md`
- `docs/planning/companycore-v1-task-contracts.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`

### Implementation Plan
1. Convert audit findings into `NOW`, `NEXT`, and `PIPELINE` work.
2. Add task contracts for each planned v1 slice.
3. Record open decisions that block route, auth, and migration details.
4. Synchronize task board and project state.

### Acceptance Criteria
- [x] No placeholder `PRJ-001` planning rows remain in active planning files.
- [x] Every queued v1 task has title, description, files likely affected,
  acceptance criteria, and priority.
- [x] Open decisions are explicit and assigned to future tasks.
- [x] Current project state points to the next executable slice.

### Definition of Done
- [x] Planning docs are updated in English.
- [x] No runtime implementation is included.
- [x] `npm run build` is optional because this is docs-only; run it only if
  code is touched.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Result Report
- Task summary: Replaced placeholder planning with the CCV1 execution queue,
  task contracts, open decisions, task board updates, and project-state handoff.
- Files changed: `docs/planning/mvp-next-commits.md`,
  `docs/planning/mvp-execution-plan.md`,
  `docs/planning/open-decisions.md`,
  `docs/planning/companycore-v1-task-contracts.md`,
  `.codex/context/TASK_BOARD.md`, `.codex/context/PROJECT_STATE.md`, and
  `docs/NEXT_STEPS.md`.
- How tested: Searched active planning/context files for old placeholder task
  markers and reviewed the git diff. No runtime code changed.
- What is incomplete: Canonical architecture and operations docs still need
  CCV1-001.
- Next steps: Start CCV1-001.

## CCV1-003 Prisma Migration Baseline And Deployment Entrypoint

### Header
- ID: CCV1-003
- Title: Prisma migration baseline and deployment entrypoint
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: DB/Migrations
- Depends on: CCV1-001
- Priority: P0
- Iteration: v1-003
- Operation Mode: ARCHITECT

### Description
Replace production reliance on `prisma db push` with a controlled Prisma
migration baseline and deployment command.

### Files Likely Affected
- `prisma/migrations/*`
- `Dockerfile`
- `package.json`
- `docker-compose.yml`
- `docker-compose.coolify.yml`
- workspace/auth schema changes from CCV1-011 and CCV1-012 when implemented
- `docs/DEPLOYMENT.md`
- `docs/operations/coolify-vps-deployment-contract.md`

### Acceptance Criteria
- [x] A baseline migration represents the current Prisma schema.
- [x] Workspace/auth/integration settings schema changes are represented by
  explicit migrations when those tasks are implemented.
- [x] Production startup no longer depends on uncontrolled `prisma db push`.
- [x] Local development still has a documented schema setup path.
- [x] Deployment docs describe migration command, rollback trigger, and backup
  expectation.

### Result Report
- Task summary: Added a baseline Prisma migration for the existing v1 schema,
  added migration scripts, switched the Docker runtime startup to
  `prisma migrate deploy`, and updated deployment/rollback docs.
- Files changed: `prisma/migrations/202605021_v1_foundation/migration.sql`,
  `package.json`, `Dockerfile`, `docs/DEPLOYMENT.md`,
  `docs/operations/coolify-vps-deployment-contract.md`,
  `docs/operations/rollback-and-recovery.md`,
  `docs/planning/open-decisions.md`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-next-commits.md`, and
  this task contract.
- How tested: Ran Prisma validation, TypeScript build, and `git diff --check`.
- What is incomplete: Existing deployed databases that were initialized with
  `db push` may need migration reconciliation before applying this in
  production.
- Next steps: Continue CCV1-012 registration, login, and workspace bootstrap.

### Priority
P0

## CCV1-004 Complete Required v1 Event Emission

### Header
- ID: CCV1-004
- Title: Complete required v1 event emission
- Task Type: feature
- Current Stage: planning
- Status: READY
- Owner: Backend Builder
- Depends on: Existing event service
- Priority: P0
- Iteration: v1-004
- Operation Mode: BUILDER

### Description
Add missing event writes for client, deal, and note creation while reusing the
existing event service.

### Files Likely Affected
- `src/modules/clients/clients.routes.ts`
- `src/modules/deals/deals.routes.ts`
- `src/modules/notes/notes.routes.ts`
- `src/modules/events/event.service.ts` if payload typing needs refinement
- `docs/API.md`
- `docs/NEXT_STEPS.md`

### Acceptance Criteria
- [ ] `POST /clients` emits `client_created`.
- [ ] `POST /deals` emits `deal_created`.
- [ ] `POST /notes` emits `note_created`.
- [ ] Event payloads include useful entity identifiers.
- [ ] `npm run build` passes.

### Priority
P0

## CCV1-005 Deployment Domain Documentation And Smoke Checklist

### Header
- ID: CCV1-005
- Title: Deployment domain documentation and smoke checklist
- Task Type: release
- Current Stage: planning
- Status: READY
- Owner: Ops/Release
- Depends on: CCV1-001
- Priority: P0
- Iteration: v1-005
- Operation Mode: TESTER

### Description
Record the deployed public domains and define the production smoke path for
CompanyCore v1.

### Files Likely Affected
- `.codex/context/PROJECT_STATE.md`
- `docs/DEPLOYMENT.md`
- `docs/operations/post-deploy-smoke.md`
- `docs/operations/coolify-vps-deployment-contract.md`

### Acceptance Criteria
- [ ] `companycore.luckysparrow.ch` is recorded as the project domain.
- [ ] `api.companycore.luckysparrow.ch` is recorded as the API domain.
- [ ] Smoke checks cover public health, protected API, ClickUp sync payload,
  and event readback.
- [ ] Rollback notes reference preserving the Postgres volume.

### Priority
P0

## CCV1-006 Endpoint Test Foundation

### Header
- ID: CCV1-006
- Title: Endpoint test foundation
- Task Type: feature
- Current Stage: planning
- Status: BACKLOG
- Owner: QA/Test
- Depends on: CCV1-003
- Priority: P1
- Iteration: v1-006
- Operation Mode: ARCHITECT

### Description
Add minimal endpoint tests for the deployed API contract without expanding
product scope.

### Files Likely Affected
- `package.json`
- `tests/*` or `src/**/*.test.ts`
- test database setup files if needed
- `docs/engineering/testing.md`

### Acceptance Criteria
- [ ] Tests cover public `GET /health`.
- [ ] Tests cover owner registration/login and workspace bootstrap.
- [ ] Tests cover missing/invalid/valid workspace-scoped `X-API-Key`.
- [ ] Tests cover standard API error responses from CCV1-014.
- [ ] Tests cover create/list project and create/update task inside one
  workspace.
- [ ] Tests cover cross-workspace access denial.
- [ ] Tests cover ClickUp native sync upsert and event emission.
- [ ] Test command is documented in project state.

### Priority
P1

## CCV1-007 API Key Hardening Plan And Implementation

### Header
- ID: CCV1-007
- Title: API key hardening plan and implementation
- Task Type: feature
- Current Stage: planning
- Status: BLOCKED
- Owner: Security
- Depends on: CCV1-011, CCV1-012, CCV1-003
- Priority: P1
- Iteration: v1-007
- Operation Mode: BUILDER

### Description
Harden API key storage and optional scopes while preserving the `X-API-Key`
client contract for workspace-scoped agents and service clients.

### Files Likely Affected
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/seed.ts`
- `src/auth/api-key.middleware.ts`
- `docs/security/security-baseline.md`
- `docs/API.md`

### Acceptance Criteria
- [ ] API keys belong to a workspace.
- [ ] API keys are no longer stored only as plaintext in production paths, or a
  documented transition migration exists.
- [ ] Auth still accepts `X-API-Key` for agent/service clients.
- [ ] Missing, invalid, inactive, and valid key paths fail closed.
- [ ] Wrong-workspace and insufficient-scope paths fail closed.
- [ ] Secret rotation path is documented.

### Priority
P1

## CCV1-008 Missing Module Route Decision And Minimal Route Slice

### Header
- ID: CCV1-008
- Title: Missing module route decision and minimal route slice
- Task Type: feature
- Current Stage: planning
- Status: BLOCKED
- Owner: Backend Builder
- Depends on: DEC-001, DEC-003
- Priority: P1
- Iteration: v1-008
- Operation Mode: BUILDER

### Description
Decide and implement only the missing DB-backed routes that are genuinely
needed for v1 consumers.

### Files Likely Affected
- `src/app.ts`
- `src/modules/task-lists/*`
- `src/modules/pipeline-stages/*`
- `src/modules/interactions/*`
- `src/modules/decisions/*`
- `src/modules/agents/*`
- `src/modules/agent-logs/*`
- `docs/API.md`
- `docs/DATABASE.md`

### Acceptance Criteria
- [ ] User-approved v1 route scope is recorded before implementation.
- [ ] Added routes are protected by API key middleware.
- [ ] Added routes resolve and enforce `workspaceId`.
- [ ] Added routes use Zod validation.
- [ ] API docs describe each added route and payload.
- [ ] `npm run build` passes.

### Priority
P1

## CCV1-009 Production Deployment Verification

### Header
- ID: CCV1-009
- Title: Production deployment verification
- Task Type: release
- Current Stage: planning
- Status: BACKLOG
- Owner: Ops/Release
- Depends on: CCV1-003, CCV1-004, CCV1-005, CCV1-006
- Priority: P1
- Iteration: v1-009
- Operation Mode: ARCHITECT

### Description
Verify the production deployment and record evidence for the v1 operational
flow.

### Files Likely Affected
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/operations/post-deploy-smoke.md`
- `docs/NEXT_STEPS.md`

### Acceptance Criteria
- [ ] `https://api.companycore.luckysparrow.ch/health` returns healthy status.
- [ ] Owner registration/login works or a first-owner bootstrap path is
  documented and verified.
- [ ] Protected API calls work with the configured workspace-scoped production
  API key.
- [ ] Native ClickUp sync creates or updates a task using workspace integration
  settings.
- [ ] `GET /events` shows `task_synced_from_clickup`.
- [ ] Smoke evidence and residual risks are recorded.

### Priority
P1

## CCV1-010 Native ClickUp Integration Contract And First Adapter Slice

### Header
- ID: CCV1-010
- Title: Native ClickUp integration contract and first adapter slice
- Task Type: feature
- Current Stage: planning
- Status: READY
- Owner: Backend Builder
- Depends on: CCV1-001, DEC-005, CCV1-003
- Priority: P0
- Iteration: v1-010
- Operation Mode: BUILDER

### Description
Implement ClickUp as the first native CompanyCore integration adapter so Jarvis
and future AI agents can use CompanyCore directly without requiring separate
n8n workflows.

### Goal
Create the reusable integration pattern for external systems by adding a
minimal, production-shaped ClickUp adapter that can fetch ClickUp task data,
normalize it, persist it through existing CompanyCore models inside the active
workspace, and emit events.

### Scope
- `src/integrations/clickup/*`
- `src/modules/tasks/*`
- `src/modules/events/*`
- `src/config/env.ts`
- `prisma/schema.prisma` and migrations only if integration state tables are
  approved
- `.env.example`
- `docs/INTEGRATIONS.md`
- `docs/API.md`
- `docs/security/security-baseline.md`
- `docs/operations/service-reliability-and-observability.md`

### Implementation Plan
1. Define the smallest approved v1 ClickUp scope from DEC-005 before coding.
2. Read ClickUp configuration from workspace integration settings, with only
   encryption/application secrets coming from environment variables.
3. Build a dedicated ClickUp client/adapter under `src/integrations/clickup`.
4. Normalize ClickUp tasks into the existing `Task` model with `source =
   clickup`, `externalId`, and the active `workspaceId`.
5. Reuse existing task upsert and event creation behavior where possible.
6. Add an authenticated endpoint or service command to trigger sync.
7. Record failure behavior, retry expectations, and observability notes.

### Files Likely Affected
- `src/integrations/clickup/clickup.client.ts`
- `src/integrations/clickup/clickup.mapper.ts`
- `src/integrations/clickup/clickup.sync.ts`
- `src/modules/tasks/tasks.routes.ts`
- `src/config/env.ts`
- workspace integration settings modules from CCV1-013
- `.env.example`
- `docs/INTEGRATIONS.md`
- `docs/API.md`
- `docs/NEXT_STEPS.md`

### Acceptance Criteria
- [ ] CompanyCore can call the ClickUp API using workspace-owned credentials.
- [ ] ClickUp tasks are normalized into CompanyCore tasks inside the active
  workspace.
- [ ] Sync upserts by `(workspace_id, source = clickup, external_id)`.
- [ ] Sync emits `task_synced_from_clickup`.
- [ ] Integration failures return safe API errors and do not corrupt existing
  tasks.
- [ ] ClickUp secrets are not logged, not returned by API responses, and are
  documented in integration/deployment docs.
- [ ] `npm run build` passes.

### Priority
P0

## CCV1-014 API Contract And Error Response Standard

### Header
- ID: CCV1-014
- Title: API contract and error response standard
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-001, CCV1-011
- Priority: P0
- Iteration: v1-014
- Operation Mode: ARCHITECT

### Description
Define a stable API contract and safe error response shape before auth,
workspace, and integration routes expand.

### Goal
Give Paperclip, Jarvis, future GUI clients, and tests a stable contract for
success responses, error codes, auth failures, workspace failures, validation
failures, and integration failures.

### Files Likely Affected
- `docs/API.md`
- `docs/engineering/testing.md`
- `docs/security/security-baseline.md`
- optional `docs/api/openapi.yaml` or equivalent if approved
- `src/middleware/error-handler.ts` during implementation

### Acceptance Criteria
- [x] API docs define standard success envelope or document existing envelope.
- [x] API docs define standard error body.
- [x] Error codes include validation, unauthorized, forbidden, not found,
  workspace required, integration not configured, integration unavailable, and
  sync failed.
- [x] Docs state that raw provider/backend errors are not returned directly.
- [x] Future endpoint tests can assert error codes consistently.

### Result Report
- Task summary: Defined CompanyCore's response envelope, error envelope,
  standard error codes, redaction rules, and test expectations for safe errors.
- Files changed: `docs/API.md`, `docs/engineering/testing.md`,
  `docs/security/security-baseline.md`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-next-commits.md`, and
  this task contract.
- How tested: Reviewed API docs for CCV1-014 acceptance criteria and ran
  `git diff --check`.
- What is incomplete: Runtime `error-handler` still needs implementation in a
  later coding task.
- Next steps: Start CCV1-015 workspace guardrail test matrix.

### Priority
P0

## CCV1-015 Workspace Guardrail Test Matrix

### Header
- ID: CCV1-015
- Title: Workspace guardrail test matrix
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: CCV1-011, CCV1-014
- Priority: P0
- Iteration: v1-015
- Operation Mode: TESTER

### Description
Define the required allowed and denied test cases that every workspace-scoped
runtime route must satisfy.

### Goal
Prevent future routes from accidentally bypassing workspace ownership or
leaking cross-workspace data.

### Files Likely Affected
- `docs/engineering/testing.md`
- `docs/planning/regression-prevention-plan.md`
- `docs/API.md`
- future endpoint tests under `tests/*`

### Acceptance Criteria
- [x] Test matrix covers unauthenticated denied path.
- [x] Test matrix covers valid same-workspace allowed path.
- [x] Test matrix covers cross-workspace read denied path.
- [x] Test matrix covers cross-workspace write denied path.
- [x] Test matrix covers missing/insufficient API key scope where scopes exist.
- [x] Test matrix covers secret redaction for integration settings.
- [x] Test matrix is referenced from CCV1-006.

### Result Report
- Task summary: Expanded workspace guardrail testing into a route-type matrix
  covering list/read/create/update/delete, service API keys, foreign relation
  IDs, integration settings, secret redaction, and native sync behavior.
- Files changed: `docs/engineering/testing.md`,
  `docs/planning/regression-prevention-plan.md`, `docs/API.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Reviewed matrix against CCV1-015 acceptance criteria and ran
  `git diff --check`.
- What is incomplete: Automated tests are still implemented later in CCV1-006.
- Next steps: Start CCV1-012 registration, login, and workspace bootstrap.

### Priority
P0

## CCV1-016 Migration Safety And Seed/Bootstrap Policy

### Header
- ID: CCV1-016
- Title: Migration safety and seed/bootstrap policy
- Task Type: release
- Current Stage: planning
- Status: READY
- Owner: DB/Migrations
- Depends on: CCV1-011, CCV1-003
- Priority: P0
- Iteration: v1-016
- Operation Mode: ARCHITECT

### Description
Define how schema migrations, local seed data, first-owner bootstrap, and
production rollback work without leaving permanent insecure shortcuts.

### Goal
Make database changes predictable and protect production from accidental
`db push`, global admin shortcuts, or irreversible bootstrap mistakes.

### Files Likely Affected
- `docs/DEPLOYMENT.md`
- `docs/DATABASE.md`
- `docs/operations/rollback-and-recovery.md`
- `docs/operations/coolify-vps-deployment-contract.md`
- `prisma/seed.ts` during implementation
- `Dockerfile` during implementation

### Acceptance Criteria
- [ ] Docs define local seed behavior.
- [ ] Docs define production first-owner bootstrap behavior.
- [ ] Docs define how bootstrap is disabled or protected after first owner.
- [ ] Docs define migration apply command and rollback/recovery notes.
- [ ] Docs require migration testing on empty and existing databases.

### Priority
P0

## CCV1-017 Integration Adapter Contract And Observability Minimum

### Header
- ID: CCV1-017
- Title: Integration adapter contract and observability minimum
- Task Type: research
- Current Stage: planning
- Status: READY
- Owner: Backend Builder
- Depends on: CCV1-011, CCV1-013, CCV1-014
- Priority: P0
- Iteration: v1-017
- Operation Mode: BUILDER

### Description
Define the reusable integration adapter structure and minimum logging/event
signals before ClickUp is implemented.

### Goal
Ensure ClickUp becomes a reliable template for future integrations instead of a
one-off route with hidden assumptions.

### Files Likely Affected
- `docs/INTEGRATIONS.md`
- `docs/operations/service-reliability-and-observability.md`
- `docs/planning/auth-workspace-integration-plan.md`
- `src/integrations/README.md` during implementation

### Acceptance Criteria
- [ ] Docs define required adapter layers: client, mapper, sync service,
  workspace settings reader, safe error mapper.
- [ ] Docs define idempotency rule for external records.
- [ ] Docs define sync start/success/failure logs or events.
- [ ] Docs define provider failure behavior.
- [ ] Docs define secret redaction requirements.
- [ ] Docs define smoke signals for ClickUp sync.

### Priority
P0

## CCV1-011 Workspace Ownership And Auth Architecture Contract

### Header
- ID: CCV1-011
- Title: Workspace ownership and auth architecture contract
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: CCV1-001
- Priority: P0
- Iteration: v1-011
- Operation Mode: ARCHITECT

### Description
Define the v1 auth and workspace ownership model before runtime auth and
integration secrets are implemented.

### Goal
Make the workspace boundary explicit: registration creates an owner user and
workspace, business records are workspace-scoped, API keys are workspace-scoped
service credentials, and integration settings belong to the workspace.

### Files Likely Affected
- `docs/architecture/system-architecture.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/security/security-baseline.md`
- `docs/security/secure-development-lifecycle.md`
- `docs/planning/open-decisions.md`
- `.codex/context/PROJECT_STATE.md`

### Acceptance Criteria
- [x] Docs define `users`, `workspaces`, and owner relationship.
- [x] Docs define whether v1 uses direct owner relation or membership rows.
- [x] Docs define which existing models require `workspace_id`.
- [x] Docs define auth context resolution for user sessions and API keys.
- [x] Docs define fail-closed behavior when workspace cannot be resolved.
- [x] Docs define how integration settings belong to workspaces.
- [x] No runtime code changes are included.

### Result Report
- Task summary: Finalized the v1 workspace/auth architecture contract:
  email/password owner auth with hashed password storage, automatic workspace
  creation, `workspace_memberships` with only `owner` active in v1, and
  workspace-scoped service API keys for agents/automations.
- Files changed: `docs/DATABASE.md`, `docs/API.md`,
  `docs/security/security-baseline.md`,
  `docs/security/secure-development-lifecycle.md`,
  `docs/planning/auth-workspace-integration-plan.md`,
  `docs/planning/open-decisions.md`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-next-commits.md`, and
  this task contract.
- How tested: Reviewed docs for CCV1-011 acceptance criteria and ran
  `git diff --check`.
- What is incomplete: Runtime schema/auth implementation remains in CCV1-012,
  CCV1-013, and CCV1-007.
- Next steps: Start CCV1-014 API contract and error response standard.

### Priority
P0

## CCV1-012 Registration, Login, And Workspace Bootstrap

### Header
- ID: CCV1-012
- Title: Registration, login, and workspace bootstrap
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-011, CCV1-003
- Priority: P0
- Iteration: v1-012
- Operation Mode: BUILDER

### Description
Implement owner registration and login so CompanyCore can create a workspace
automatically and authenticate future API or GUI clients.

### Goal
Provide the minimal auth runtime for v1: owner registration creates user and
workspace in one transaction; login returns an authenticated context; protected
business routes can resolve `userId` and `workspaceId`.

### Files Likely Affected
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `src/auth/*`
- `src/modules/auth/*`
- `src/middleware/*`
- `src/app.ts`
- `.env.example`
- `docs/API.md`
- `docs/DATABASE.md`
- `docs/security/security-baseline.md`

### Acceptance Criteria
- [x] `POST /auth/register` or approved equivalent creates owner user and
  workspace atomically.
- [x] Duplicate email/owner registration is handled safely.
- [x] `POST /auth/login` or approved equivalent authenticates the owner.
- [x] Passwords or login secrets are hashed; plaintext credentials are never
  stored.
- [x] Protected routes can resolve `workspaceId`.
- [x] `GET /health` remains public.
- [x] `npm run build` passes.

### Result Report
- Task summary: Added owner registration/login, signed bearer auth tokens,
  password hashing, workspace and owner membership models, workspace-aware API
  key context, and local seed bootstrap for an owner workspace.
- Files changed: `prisma/schema.prisma`,
  `prisma/migrations/202605022_workspace_auth/migration.sql`,
  `prisma/seed.ts`, `.env.example`, `src/app.ts`, `src/config/env.ts`,
  `src/auth/api-key.middleware.ts`, `src/auth/password.ts`,
  `src/auth/token.ts`, `src/modules/auth/auth.routes.ts`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Ran `npx prisma generate`, `npm run build`,
  `npx prisma validate` with a local `DATABASE_URL`, and `git diff --check`.
- What is incomplete: Workspace scoping is available in auth context, but
  existing business routes still need filtering/persistence by workspace in
  later scoped tasks.
- Next steps: Start CCV1-013 workspace-scoped integration settings and secret
  storage.

### Priority
P0

## CCV1-013 Workspace-Scoped Integration Settings And Secret Storage

### Header
- ID: CCV1-013
- Title: Workspace-scoped integration settings and secret storage
- Task Type: feature
- Current Stage: planning
- Status: READY
- Owner: Backend Builder
- Depends on: CCV1-011, CCV1-012, CCV1-003
- Priority: P0
- Iteration: v1-013
- Operation Mode: BUILDER

### Description
Add the storage and API contract for workspace-owned integration settings,
starting with ClickUp credentials and sync configuration.

### Goal
Store integration configuration under the workspace so ClickUp and future
integrations are not global process settings. Secrets must be protected,
non-leaking, and usable by native integration adapters.

### Files Likely Affected
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `src/modules/integration-settings/*`
- `src/integrations/*`
- `src/config/env.ts`
- `.env.example`
- `docs/API.md`
- `docs/DATABASE.md`
- `docs/INTEGRATIONS.md`
- `docs/security/security-baseline.md`

### Acceptance Criteria
- [ ] Workspace can store ClickUp token/config through an authenticated route or
  approved bootstrap path.
- [ ] Integration settings are tied to `workspaceId`.
- [ ] Secret values are encrypted or otherwise protected according to the
  approved v1 security plan.
- [ ] Secret values are never returned in API responses or logs.
- [ ] Cross-workspace access is rejected.
- [ ] ClickUp adapter contract reads settings through this workspace-scoped
  mechanism.
- [ ] `npm run build` passes.

### Priority
P0
