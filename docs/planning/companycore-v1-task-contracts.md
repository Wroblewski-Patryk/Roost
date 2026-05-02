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

## CCV1-024 Workspace-Scoped Interactions API

### Header
- ID: CCV1-024
- Title: Workspace-scoped interactions API
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-019, CCV1-023
- Priority: P0
- Iteration: v1-024
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] Operation mode matches the current queue.
- [x] The task aligns with repository source-of-truth documents.

### Context
CompanyCore stores CRM interactions in the database, but Paperclip/Jarvis-style
clients did not yet have an API surface for writing lead/customer timeline
activity.

### Goal
Add minimal workspace-scoped `GET /v1/interactions` and
`POST /v1/interactions` routes, emit `interaction_created`, and expose the
route in the adapter manifest.

### Scope
- `src/app.ts`
- `src/modules/interactions/interactions.routes.ts`
- `src/modules/connection/connection.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/integrations/adapter-onboarding.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- this task contract

### Implementation Plan
1. Reuse the existing `Interaction` model and workspace auth context.
2. Add list and create routes only; defer update/delete until a real adapter
   lifecycle need exists.
3. Validate optional `clientId` against the active workspace.
4. Emit `interaction_created` through the existing event service.
5. Extend tests for same-workspace creation, cross-workspace relation denial,
   and manifest coverage.

### Autonomous Loop Evidence

#### 1. Analyze Current State
- Issues: interactions existed in DB but had no runtime API.
- Gaps: Paperclip lead/customer timeline activity would otherwise be forced
  into notes or logs.
- Inconsistencies: `interactions` was part of the source-of-truth model but not
  an implemented route module.
- Architecture constraints: API-only access, workspace scoping, no GUI.

#### 2. Select One Priority Task
- Selected task: CCV1-024 workspace-scoped interactions API.
- Priority rationale: closes a direct Paperclip/Jarvis CRM write path.
- Why other candidates were deferred: pipeline stages and task lists are useful
  but less urgent for adapter onboarding than CRM timeline writes.

#### 3. Plan Implementation
- Files or surfaces to modify: interactions route, app mount, connection
  manifest, tests, docs, context.
- Logic: derive `workspaceId` from auth, validate `clientId`, persist
  interaction, emit event.
- Edge cases: foreign `clientId` must return `not_found`.

#### 4. Execute Implementation
- Implementation notes: added `GET/POST /interactions` root aliases and
  `/v1/interactions` through the existing protected route mounting.

#### 5. Verify and Test
- Validation performed: `npm test` against disposable PostgreSQL.
- Result: pending when first recorded; final result is in Validation Evidence.

#### 6. Self-Review
- Simpler option considered: store CRM timeline in notes.
- Technical debt introduced: no.
- Scalability assessment: route uses the existing model and workspace
  guardrails; future lifecycle endpoints can extend the module.
- Refinements made: kept scope to list/create instead of adding premature
  update/delete.

#### 7. Update Documentation and Knowledge
- Docs updated: API, integrations, adapter onboarding, task contract, project
  state, task board.
- Context updated: yes.
- Learning journal updated: not applicable.

### Acceptance Criteria
- [x] `GET /v1/interactions` lists only active workspace interactions.
- [x] `POST /v1/interactions` creates an interaction in the active workspace.
- [x] Optional `clientId` is accepted only for active workspace clients.
- [x] Interaction creation emits `interaction_created`.
- [x] Adapter manifest includes interactions routes and capabilities.
- [x] Docs explain interaction usage for adapters.

### Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API surface.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Validation Evidence
- Tests: `npm test` with `DATABASE_URL` pointed at disposable PostgreSQL.
- Manual checks: endpoint behavior covered by integration test.
- High-risk checks: no schema or secret changes.

### Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: not applicable; existing model reused.
- Error state verified: foreign `clientId` in interaction creation returns
  `404`.
- Regression check performed: existing protected API flow test.

### Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: workspace CRM activity.
- Trust boundaries: protected API and workspace auth context.
- Permission or ownership checks: list/create derive `workspaceId`; optional
  `clientId` is workspace-validated.
- Secret handling: no secrets returned or stored by this route.
- Fail-closed behavior: protected route auth and foreign relation denial.

### Deployment / Ops Evidence
- Deploy impact: low.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: adapter onboarding docs updated.
- Rollback note: redeploy previous commit if adapter route causes regression.
- `DEPLOYMENT_GATE.md` reviewed: yes.

### Result Report
- Task summary: Added minimal workspace-scoped interactions API and adapter
  manifest coverage.
- Files changed: `src/app.ts`,
  `src/modules/interactions/interactions.routes.ts`,
  `src/modules/connection/connection.routes.ts`, `src/tests/api.test.ts`,
  `docs/API.md`, `docs/INTEGRATIONS.md`,
  `docs/integrations/adapter-onboarding.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, and this
  task contract.
- How tested: `npm test` against disposable PostgreSQL.
- What is incomplete: no update/delete interaction lifecycle routes in this
  slice.
- Next steps: add remaining adapter-facing setup routes or run protected
  production smoke once a production service key exists.

### Priority
P0

## CCV1-023 Workspace-Scoped Agents API

### Header
- ID: CCV1-023
- Title: Workspace-scoped agents API
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-019, CCV1-022
- Priority: P0
- Iteration: v1-023
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] Operation mode matches the current queue.
- [x] The task aligns with repository source-of-truth documents.

### Context
CompanyCore already stored agents and agent logs, but only logs had runtime
routes. Paperclip/Jarvis-style clients need a durable agent identity before
writing operational logs.

### Goal
Add minimal workspace-scoped `GET /v1/agents` and `POST /v1/agents` routes,
emit an `agent_created` event, and expose the capability in the adapter
manifest.

### Scope
- `src/app.ts`
- `src/modules/agents/agents.routes.ts`
- `src/modules/agents/README.md`
- `src/modules/connection/connection.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/integrations/adapter-onboarding.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- this task contract

### Implementation Plan
1. Reuse the existing `Agent` model and workspace auth context.
2. Add list and create routes only; defer update/delete until a real adapter
   lifecycle need exists.
3. Emit `agent_created` through the existing event service.
4. Extend tests for same-workspace creation, cross-workspace isolation, and
   log attachment denial.
5. Update adapter docs and connection manifest.

### Autonomous Loop Evidence

#### 1. Analyze Current State
- Issues: logs could reference agents, but adapters could not create/list agent
  identities through the API.
- Gaps: missing runtime route for an existing source-of-truth model.
- Inconsistencies: agent table was documented as future-only while adapters now
  need it.
- Architecture constraints: API-only access, workspace scoping, no GUI.

#### 2. Select One Priority Task
- Selected task: CCV1-023 workspace-scoped agents API.
- Priority rationale: unlocks durable Paperclip/Jarvis identity and log
  attribution.
- Why other candidates were deferred: production protected smoke still needs
  real credentials; update/delete lifecycle can wait.

#### 3. Plan Implementation
- Files or surfaces to modify: agents route, app mount, connection manifest,
  tests, docs, context.
- Logic: derive `workspaceId` from auth, persist agent, emit event.
- Edge cases: foreign `agentId` in logs must remain denied.

#### 4. Execute Implementation
- Implementation notes: added `GET/POST /agents` root aliases and `/v1/agents`
  through the existing protected route mounting.

#### 5. Verify and Test
- Validation performed: `npm test` against disposable PostgreSQL.
- Result: pending when first recorded; final result is in Validation Evidence.

#### 6. Self-Review
- Simpler option considered: keep agent identity only in log metadata.
- Technical debt introduced: no.
- Scalability assessment: route uses existing model and workspace guardrails;
  future lifecycle endpoints can extend this module.
- Refinements made: kept scope to list/create instead of adding premature
  update/delete.

#### 7. Update Documentation and Knowledge
- Docs updated: API, integrations, adapter onboarding, module README, task
  contract, project state, task board.
- Context updated: yes.
- Learning journal updated: not applicable.

### Acceptance Criteria
- [x] `GET /v1/agents` lists only active workspace agents.
- [x] `POST /v1/agents` creates an agent in the active workspace.
- [x] Agent creation emits `agent_created`.
- [x] Agent logs can attach to same-workspace agents and reject foreign agents.
- [x] Adapter manifest includes agents routes and capabilities.
- [x] Docs explain agent identity usage for adapters.

### Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API surface.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Validation Evidence
- Tests: `npm test` with `DATABASE_URL` pointed at disposable PostgreSQL.
- Manual checks: endpoint behavior covered by integration test.
- High-risk checks: no schema or secret changes.

### Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: not applicable; existing model reused.
- Error state verified: foreign `agentId` in log creation returns `404`.
- Regression check performed: existing protected API flow test.

### Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: workspace business metadata and operational memory.
- Trust boundaries: protected API and workspace auth context.
- Permission or ownership checks: list/create derive `workspaceId`; log
  attachment verifies same-workspace agent.
- Secret handling: no secrets returned or stored by this route.
- Fail-closed behavior: protected route auth and foreign relation denial.

### Deployment / Ops Evidence
- Deploy impact: low.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: adapter onboarding docs updated.
- Rollback note: redeploy previous commit if adapter route causes regression.
- `DEPLOYMENT_GATE.md` reviewed: yes.

### Result Report
- Task summary: Added minimal workspace-scoped agents API and adapter manifest
  coverage.
- Files changed: `src/app.ts`, `src/modules/agents/agents.routes.ts`,
  `src/modules/agents/README.md`,
  `src/modules/connection/connection.routes.ts`, `src/tests/api.test.ts`,
  `docs/API.md`, `docs/INTEGRATIONS.md`,
  `docs/integrations/adapter-onboarding.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, and this
  task contract.
- How tested: `npm test` against disposable PostgreSQL.
- What is incomplete: no update/delete agent lifecycle routes in this slice.
- Next steps: issue production API keys for Paperclip/Jarvis and run protected
  production smoke.

### Priority
P0

## CCV1-022 Adapter Manifest For Service Clients

### Header
- ID: CCV1-022
- Title: Adapter manifest for service clients
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-021
- Priority: P0
- Iteration: v1-022
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] Operation mode matches the current queue.
- [x] The task aligns with the adapter source-of-truth contract.

### Context
Paperclip, Jarvis, Jarvan, Aviary, n8n, and similar service clients need the
first handshake to be useful without a GUI. The existing `/v1/connection`
endpoint proves auth and workspace identity, but adapters also benefit from a
small machine-readable route map.

### Goal
Expose canonical v1 routes, methods, capabilities, auth headers, and write
rules through the existing safe connection handshake.

### Scope
- `src/modules/connection/connection.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/integrations/adapter-onboarding.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- this task contract

### Implementation Plan
1. Reuse `/v1/connection`; do not add a parallel discovery system.
2. Add a static safe `adapterManifest` with canonical v1 paths.
3. Cover the manifest in the existing protected API flow test.
4. Document how adapters should read the manifest before writing records.

### Autonomous Loop Evidence

#### 1. Analyze Current State
- Issues: adapters can verify auth, but need a route map to avoid hardcoding
  startup assumptions.
- Gaps: no machine-readable canonical route list in runtime responses.
- Inconsistencies: none found; `/v1/connection` is the approved onboarding
  surface.
- Architecture constraints: API remains the access layer; no GUI and no direct
  database access for adapters.

#### 2. Select One Priority Task
- Selected task: CCV1-022 adapter manifest for service clients.
- Priority rationale: directly improves Paperclip/Jarvis connection readiness.
- Why other candidates were deferred: protected production smoke still needs a
  production workspace key; GitHub webhook setup still needs GitHub auth.

#### 3. Plan Implementation
- Files or surfaces to modify: connection route, endpoint test, API and
  integration docs, canonical context.
- Logic: return safe static metadata under `data.adapterManifest`.
- Edge cases: manifest must not include raw keys, owner tokens, or provider
  secrets.

#### 4. Execute Implementation
- Implementation notes: added route groups for connection, projects, goals,
  targets, tasks, clients, deals, notes, decisions, agent logs, events, and
  ClickUp settings.

#### 5. Verify and Test
- Validation performed: `npm test` against disposable PostgreSQL.
- Result: pending when first recorded; final result is in Validation Evidence.

#### 6. Self-Review
- Simpler option considered: docs-only onboarding.
- Technical debt introduced: no.
- Scalability assessment: future adapters can extend the same manifest without
  introducing a separate discovery service.
- Refinements made: kept the manifest under the existing protected handshake.

#### 7. Update Documentation and Knowledge
- Docs updated: API, integrations, adapter onboarding, task contract, project
  state, task board.
- Context updated: yes.
- Learning journal updated: not applicable.

### Acceptance Criteria
- [x] `GET /v1/connection` includes `adapterManifest`.
- [x] Manifest lists canonical `/v1` paths, HTTP methods, and capabilities for
  adapter-facing v1 routes.
- [x] Manifest documents service auth header and write rules.
- [x] Endpoint test asserts representative manifest content.
- [x] Docs explain how Paperclip/Jarvis-style adapters should use the manifest.

### Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API surface.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Validation Evidence
- Tests: `npm test` with `DATABASE_URL` pointed at disposable PostgreSQL.
- Manual checks: endpoint behavior covered by integration test.
- High-risk checks: manifest contains only static routes and safe auth metadata.

### Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: not applicable.
- Error state verified: existing unauthenticated protected route test remains.
- Regression check performed: existing protected API flow test.

### Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: non-secret API metadata.
- Trust boundaries: protected API handshake with workspace auth context.
- Permission or ownership checks: existing `requireApiKey`/bearer auth path.
- Abuse cases: manifest must not expose secrets or cross-workspace data.
- Secret handling: no raw key, token, password, or provider secret is returned.
- Fail-closed behavior: auth failures remain `401`/`403`.

### Deployment / Ops Evidence
- Deploy impact: low.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: adapter onboarding docs updated.
- Rollback note: redeploy the previous commit if adapters reject the response.
- `DEPLOYMENT_GATE.md` reviewed: yes.

### Result Report
- Task summary: Expanded `/v1/connection` with a safe adapter manifest for
  service clients.
- Files changed: `src/modules/connection/connection.routes.ts`,
  `src/tests/api.test.ts`, `docs/API.md`, `docs/INTEGRATIONS.md`,
  `docs/integrations/adapter-onboarding.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, and this
  task contract.
- How tested: `npm test` against disposable PostgreSQL.
- What is incomplete: protected production smoke still needs real production
  owner/service credentials.
- Next steps: create Paperclip/Jarvis production service API keys and run
  `/v1/connection` against production.

### Priority
P0

## CCV1-018 Owner-Managed Adapter API Keys

### Header
- ID: CCV1-018
- Title: Owner-managed adapter API keys
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Security
- Depends on: CCV1-007, CCV1-006
- Priority: P0
- Iteration: v1-018
- Operation Mode: BUILDER

### Description
Add a safe owner-controlled API key management path so adapters such as Jarvan
and Aviary can be connected without GUI work, seed reruns, or direct database
access.

### Acceptance Criteria
- [x] Owner can create a workspace service API key through `/v1/api-keys`.
- [x] New API keys are stored hashed and not stored as plaintext in the legacy
  `key` column.
- [x] Raw key is returned only once on creation.
- [x] List/update responses redact raw key material.
- [x] Service API keys cannot create more API keys.
- [x] Created key works with `X-API-Key`.
- [x] `npm test` passes.

### Result Report
- Task summary: Added owner-only service API key management for adapter
  onboarding, including generated `cc_v1_*` keys, hash-only storage for new
  keys, redacted list/update responses, activation toggling, and test coverage.
- Files changed: `prisma/schema.prisma`,
  `prisma/migrations/202605027_api_key_management/migration.sql`,
  `prisma/seed.ts`, `src/auth/api-key.ts`, `src/app.ts`,
  `src/modules/api-keys/api-keys.routes.ts`, `src/tests/api.test.ts`,
  `docs/API.md`, `docs/DATABASE.md`, `docs/security/security-baseline.md`,
  `docs/engineering/testing.md`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, and this task contract.
- How tested: Ran `npm test` against disposable PostgreSQL at `localhost:55432`;
  the command applied all 7 migrations from scratch and passed endpoint tests.
- What is incomplete: A richer UI for key rotation remains out of v1 scope.
- Follow-up fix: After first production redeploy returned `503`, updated
  `prisma/seed.ts` to find an existing legacy plaintext seed API key before
  creating a hash-backed row, preventing duplicate key conflicts during
  transition deploys.
- Next steps: Push and let auto-deploy run, then rerun CCV1-009 production
  smoke.

### Priority
P0

## CCV1-021 Adapter Connection Handshake For Paperclip And Jarvis

### Header
- ID: CCV1-021
- Title: Adapter connection handshake for Paperclip and Jarvis
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-018, CCV1-019
- Priority: P0
- Iteration: v1-021
- Operation Mode: BUILDER

### Context
Paperclip, Jarvis, Jarvan, Aviary, and similar adapters need a stable first API
call that proves their key works and tells them what CompanyCore can safely do
for the active workspace.

### Goal
Expose a safe connection handshake that returns API version, workspace identity,
auth type, capabilities, and non-secret integration readiness.

### Scope
- `src/modules/connection/connection.routes.ts`
- `src/app.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/integrations/adapter-onboarding.md`
- `.codex/context/*`

### Implementation Plan
1. Add a protected `/connection` route mounted at root and `/v1`.
2. Return only safe auth, workspace, capability, and integration metadata.
3. Add endpoint coverage using a workspace service API key.
4. Document adapter environment variables and first-call sequence.

### Acceptance Criteria
- [x] `GET /v1/connection` works with `X-API-Key`.
- [x] Response contains service name, API version, workspace identity, auth
  type, capabilities, and ClickUp readiness.
- [x] Response does not include raw API keys or integration tokens.
- [x] Endpoint test covers service-key handshake.
- [x] Adapter onboarding docs explain Paperclip/Jarvis setup.

### Result Report
- Task summary: Added a service-adapter handshake and onboarding doc so
  Paperclip/Jarvis-style clients can connect through CompanyCore safely.
- Files changed: `src/modules/connection/connection.routes.ts`, `src/app.ts`,
  `src/tests/api.test.ts`, `docs/API.md`, `docs/INTEGRATIONS.md`,
  `docs/integrations/adapter-onboarding.md`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, and this task contract.
- How tested: `npm run build` and `npm test` against a disposable PostgreSQL
  database.
- What is incomplete: Production adapter smoke still needs an actual
  production workspace service API key.
- Next steps: Create/obtain Paperclip and Jarvis production API keys, store
  them in those apps, and call `/v1/connection`.

### Priority
P0

## CCV1-019 Database/API Workspace Coverage For Core Records

### Header
- ID: CCV1-019
- Title: Database/API workspace coverage for core records
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-012, CCV1-018
- Priority: P0
- Iteration: v1-019
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] Operation mode matches the current queue.
- [x] The task aligns with the workspace source-of-truth contract.

### Context
Owner auth and workspace-scoped API keys existed, but several business tables
and routes still behaved as global records. That could leak operational data
between workspaces once more owners or adapter keys exist.

### Goal
Make remaining core business records workspace-owned at the database and API
layers, and reject foreign relation IDs before creating dependent records.

### Scope
- `prisma/schema.prisma`
- `prisma/migrations/202605028_workspace_core_records/migration.sql`
- `prisma/seed.ts`
- protected route modules for projects, goals, targets, tasks, clients, deals,
  notes, decisions, agent logs, and events
- ClickUp sync event emission
- endpoint integration tests
- API/database/planning/context docs

### Implementation Plan
1. Add nullable `workspace_id` columns, indexes, and foreign keys for remaining
   core tables so existing production data is preserved.
2. Persist `workspaceId` from auth context on new protected records and events.
3. Filter protected list routes by active workspace.
4. Validate supplied relation IDs against the active workspace.
5. Expand integration tests for cross-workspace visibility and relation denial.
6. Update source-of-truth docs and context.

### Acceptance Criteria
- [x] Core business tables have workspace ownership columns.
- [x] Protected reads for implemented routes filter by active workspace.
- [x] Protected writes persist `workspaceId` from auth context.
- [x] Foreign relation IDs from another workspace return `not_found`.
- [x] Events are workspace-scoped.
- [x] Fresh `prisma migrate deploy` succeeds.
- [x] Endpoint integration tests pass.

### Result Report
- Task summary: Added workspace ownership for remaining core records and closed
  global-list leakage for implemented protected routes.
- Files changed: `prisma/schema.prisma`,
  `prisma/migrations/202605028_workspace_core_records/migration.sql`,
  `prisma/seed.ts`, `src/modules/*`, `src/integrations/clickup/clickup.sync.ts`,
  `src/tests/api.test.ts`, `docs/API.md`, `docs/DATABASE.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: `npx prisma generate`, `npm run build`, and `npm test` against a
  disposable fresh PostgreSQL database.
- What is incomplete: Protected production smoke still needs approved
  production owner/API-key credentials and ClickUp settings.
- Next steps: Complete CCV1-009P protected production smoke when credentials
  are available.

### Priority
P0

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
- Current Stage: verification
- Status: DONE
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
- [x] `POST /clients` emits `client_created`.
- [x] `POST /deals` emits `deal_created`.
- [x] `POST /notes` emits `note_created`.
- [x] Event payloads include useful entity identifiers.
- [x] `npm run build` passes.

### Result Report
- Task summary: Added required event writes for client, deal, and note creation
  using the existing event service.
- Files changed: `src/modules/clients/clients.routes.ts`,
  `src/modules/deals/deals.routes.ts`, `src/modules/notes/notes.routes.ts`,
  `docs/API.md`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-execution-plan.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Ran `npm run build` and `git diff --check`.
- What is incomplete: Automated endpoint assertions remain in CCV1-006.
- Next steps: Start CCV1-005 deployment domain documentation and smoke
  checklist.

### Priority
P0

## CCV1-005 Deployment Domain Documentation And Smoke Checklist

### Header
- ID: CCV1-005
- Title: Deployment domain documentation and smoke checklist
- Task Type: release
- Current Stage: verification
- Status: DONE
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
- [x] `companycore.luckysparrow.ch` is recorded as the project domain.
- [x] `api.companycore.luckysparrow.ch` is recorded as the API domain.
- [x] Smoke checks cover public health, protected API, ClickUp sync payload,
  and event readback.
- [x] Rollback notes reference preserving the Postgres volume.

### Result Report
- Task summary: Recorded production domains, required Coolify secrets, public
  smoke checks, ClickUp sync smoke evidence, and rollback/volume preservation
  expectations.
- Files changed: `docs/DEPLOYMENT.md`,
  `docs/operations/post-deploy-smoke.md`,
  `docs/operations/coolify-vps-deployment-contract.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-execution-plan.md`, `docs/planning/mvp-next-commits.md`,
  and this task contract.
- How tested: Reviewed docs against CCV1-005 acceptance criteria and ran
  `git diff --check`.
- What is incomplete: Actual production smoke execution remains in CCV1-009.
- Next steps: Start CCV1-016 migration safety and seed/bootstrap policy.

### Priority
P0

## CCV1-006 Endpoint Test Foundation

### Header
- ID: CCV1-006
- Title: Endpoint test foundation
- Task Type: feature
- Current Stage: verification
- Status: DONE
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
- [x] Tests cover public `GET /health`.
- [x] Tests cover owner registration/login and workspace bootstrap.
- [x] Tests cover missing/invalid/valid workspace-scoped `X-API-Key`.
- [x] Tests cover standard API error responses from CCV1-014.
- [x] Tests cover create/list project and create/update task inside one
  workspace.
- [x] Tests cover cross-workspace access denial.
- [x] Tests cover ClickUp native sync upsert and event emission.
- [x] Test command is documented in project state.

### Result Report
- Task summary: Added a native Node integration test foundation that starts the
  Express app, uses a disposable PostgreSQL database, applies Prisma migrations,
  exercises owner auth, workspace API keys, task scoping, ClickUp settings,
  native ClickUp sync, and event readback.
- Files changed: `package.json`, `src/tests/api.test.ts`,
  `prisma/migrations/202605021_v1_foundation/migration.sql`,
  `docs/engineering/testing.md`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `.codex/context/LEARNING_JOURNAL.md`,
  `docs/planning/mvp-execution-plan.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Ran `npm test` with
  `DATABASE_URL=postgresql://companycore:companycore@localhost:55432/companycore_test?schema=public`,
  plus `git diff --check`.
- What is incomplete: Production smoke remains in CCV1-009; broader
  route-by-route tests should expand as CCV1-008 adds more surface.
- Next steps: Resolve DEC-001 and DEC-003 before CCV1-008 implementation.

### Priority
P1

## CCV1-007 API Key Hardening Plan And Implementation

### Header
- ID: CCV1-007
- Title: API key hardening plan and implementation
- Task Type: feature
- Current Stage: verification
- Status: DONE
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
- [x] API keys belong to a workspace.
- [x] API keys are no longer stored only as plaintext in production paths, or a
  documented transition migration exists.
- [x] Auth still accepts `X-API-Key` for agent/service clients.
- [x] Missing, invalid, inactive, and valid key paths fail closed.
- [x] Wrong-workspace and insufficient-scope paths fail closed.
- [x] Secret rotation path is documented.

### Result Report
- Task summary: Added hashed API key storage fields, hash/prefix helpers,
  transition-compatible middleware lookup, and seed updates that write key
  hashes for workspace-scoped service keys.
- Files changed: `prisma/schema.prisma`,
  `prisma/migrations/202605025_api_key_hardening/migration.sql`,
  `prisma/seed.ts`, `.env.example`, `src/config/env.ts`,
  `src/auth/api-key.ts`, `src/auth/api-key.middleware.ts`, `docs/API.md`,
  `docs/DATABASE.md`, `docs/security/security-baseline.md`,
  `docs/DEPLOYMENT.md`,
  `docs/operations/coolify-vps-deployment-contract.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-execution-plan.md`, `docs/planning/mvp-next-commits.md`,
  and this task contract.
- How tested: Ran `npx prisma generate`, `npx prisma validate`,
  `npm run build`, and `git diff --check`.
- What is incomplete: Full API key creation/rotation endpoint and automated
  negative-path tests remain future work.
- Next steps: Start CCV1-006 endpoint test foundation.

### Priority
P1

## CCV1-008 Missing Module Route Decision And Minimal Route Slice

### Header
- ID: CCV1-008
- Title: Missing module route decision and minimal route slice
- Task Type: feature
- Current Stage: verification
- Status: DONE
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
- [x] User-approved v1 route scope is recorded before implementation.
- [x] Added routes are protected by API key middleware.
- [x] Added routes resolve and enforce `workspaceId`.
- [x] Added routes use Zod validation.
- [x] API docs describe each added route and payload.
- [x] `npm run build` passes.

### Result Report
- Task summary: Resolved v1 route namespace as `/v1/*` without `/api`, kept
  root aliases for compatibility, and added minimal workspace-scoped
  `decisions` and `agent-logs` routes.
- Files changed: `prisma/schema.prisma`,
  `prisma/migrations/202605026_v1_decisions_agent_logs/migration.sql`,
  `src/app.ts`, `src/modules/decisions/decisions.routes.ts`,
  `src/modules/decisions/README.md`,
  `src/modules/agent-logs/agent-logs.routes.ts`,
  `src/modules/agent-logs/README.md`, `src/tests/api.test.ts`,
  `docs/API.md`, `docs/DATABASE.md`, `docs/planning/open-decisions.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-execution-plan.md`, `docs/planning/mvp-next-commits.md`,
  and this task contract.
- How tested: Ran `npm test` against a disposable PostgreSQL database at
  `localhost:55432`, which built TypeScript, applied all migrations from
  scratch, and passed the endpoint integration test.
- What is incomplete: Deferred modules remain without routes until workflows
  justify them: task lists, pipeline stages, interactions, and agents.
- Next steps: Start CCV1-009 production deployment verification.

### Priority
P1

## CCV1-009 Production Deployment Verification

### Header
- ID: CCV1-009
- Title: Production deployment verification
- Task Type: release
- Current Stage: verification
- Status: BLOCKED
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
- [x] `https://api.companycore.luckysparrow.ch/health` returns healthy status.
- [ ] Owner registration/login works or a first-owner bootstrap path is
  documented and verified.
- [ ] Protected API calls work with the configured workspace-scoped production
  API key.
- [ ] Native ClickUp sync creates or updates a task using workspace integration
  settings.
- [ ] `GET /events` shows `task_synced_from_clickup`.
- [ ] Smoke evidence and residual risks are recorded.

### Result Report
- Task summary: Started production verification and confirmed the public API
  health endpoint works. Verification is blocked because production is not yet
  serving the current v1 route build and production credentials were not
  available for protected smoke checks.
- Files changed: `docs/operations/post-deploy-smoke.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, and this
  task contract.
- How tested: Ran public HTTP checks against
  `https://api.companycore.luckysparrow.ch/health`,
  `https://api.companycore.luckysparrow.ch/v1/health`,
  `https://api.companycore.luckysparrow.ch/v1/projects`,
  `https://api.companycore.luckysparrow.ch/projects`, and
  `https://companycore.luckysparrow.ch`.
- What is incomplete: owner/auth protected smoke, workspace API key smoke,
  ClickUp settings read/write, native ClickUp sync, and event readback require
  deploying the latest commits and providing production credentials.
- Next steps: Deploy current branch, then rerun CCV1-009 with owner token or
  workspace API key and configured ClickUp settings.

### Priority
P1

## CCV1-010 Native ClickUp Integration Contract And First Adapter Slice

### Header
- ID: CCV1-010
- Title: Native ClickUp integration contract and first adapter slice
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-001, DEC-005, CCV1-003, CCV1-013, CCV1-017
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
- [x] CompanyCore can call the ClickUp API using workspace-owned credentials.
- [x] ClickUp tasks are normalized into CompanyCore tasks inside the active
  workspace.
- [x] Sync upserts by `(workspace_id, source = clickup, external_id)`.
- [x] Sync emits `task_synced_from_clickup`.
- [x] Integration failures return safe API errors and do not corrupt existing
  tasks.
- [x] ClickUp secrets are not logged, not returned by API responses, and are
  documented in integration/deployment docs.
- [x] `npm run build` passes.

### Result Report
- Task summary: Implemented the first native ClickUp pull-sync adapter with a
  provider client, mapper, sync service, protected trigger route, task
  workspace ownership, idempotent task upsert, and sync events.
- Files changed: `prisma/schema.prisma`,
  `prisma/migrations/202605024_clickup_task_workspace_scope/migration.sql`,
  `src/integrations/errors.ts`, `src/integrations/clickup/clickup.client.ts`,
  `src/integrations/clickup/clickup.mapper.ts`,
  `src/integrations/clickup/clickup.sync.ts`,
  `src/modules/tasks/tasks.routes.ts`, `docs/API.md`, `docs/DATABASE.md`,
  `docs/INTEGRATIONS.md`, `docs/planning/open-decisions.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-execution-plan.md`, `docs/planning/mvp-next-commits.md`,
  and this task contract.
- How tested: Reviewed official ClickUp API docs for task filtering, ran
  `npx prisma generate`, `npm run build`, `npx prisma validate` with a local
  `DATABASE_URL`, and `git diff --check`.
- What is incomplete: Automated endpoint tests and real ClickUp production
  smoke remain in CCV1-006 and CCV1-009.
- Next steps: Continue with CCV1-004 event coverage or CCV1-007 API key
  hardening, depending on release-risk priority.

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
- Current Stage: verification
- Status: DONE
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
- [x] Docs define local seed behavior.
- [x] Docs define production first-owner bootstrap behavior.
- [x] Docs define how bootstrap is disabled or protected after first owner.
- [x] Docs define migration apply command and rollback/recovery notes.
- [x] Docs require migration testing on empty and existing databases.

### Result Report
- Task summary: Documented migration safety, seed behavior, production
  first-owner bootstrap paths, bootstrap credential rotation, rollback/recovery
  expectations, and empty/existing database validation requirements.
- Files changed: `docs/DEPLOYMENT.md`, `docs/DATABASE.md`,
  `docs/operations/rollback-and-recovery.md`,
  `docs/operations/coolify-vps-deployment-contract.md`,
  `docs/security/secure-development-lifecycle.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-execution-plan.md`, `docs/planning/mvp-next-commits.md`,
  and this task contract.
- How tested: Reviewed docs against CCV1-016 acceptance criteria and ran
  `git diff --check`.
- What is incomplete: Automated migration tests remain in CCV1-006.
- Next steps: Start CCV1-007 API key hardening plan and implementation.

### Priority
P0

## CCV1-017 Integration Adapter Contract And Observability Minimum

### Header
- ID: CCV1-017
- Title: Integration adapter contract and observability minimum
- Task Type: research
- Current Stage: verification
- Status: DONE
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
- [x] Docs define required adapter layers: client, mapper, sync service,
  workspace settings reader, safe error mapper.
- [x] Docs define idempotency rule for external records.
- [x] Docs define sync start/success/failure logs or events.
- [x] Docs define provider failure behavior.
- [x] Docs define secret redaction requirements.
- [x] Docs define smoke signals for ClickUp sync.

### Result Report
- Task summary: Defined the reusable native integration adapter contract,
  idempotency rule, provider failure behavior, secret redaction requirements,
  sync observability fields, and ClickUp smoke signals.
- Files changed: `docs/INTEGRATIONS.md`,
  `docs/operations/service-reliability-and-observability.md`,
  `docs/planning/auth-workspace-integration-plan.md`,
  `docs/planning/regression-prevention-plan.md`,
  `docs/engineering/testing.md`, `src/integrations/README.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Reviewed docs against CCV1-017 acceptance criteria and ran
  `git diff --check`.
- What is incomplete: Runtime ClickUp provider client, mapper, and sync service
  remain in CCV1-010.
- Next steps: Start CCV1-010 native ClickUp integration contract and first
  adapter slice.

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
- Current Stage: verification
- Status: DONE
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
- [x] Workspace can store ClickUp token/config through an authenticated route or
  approved bootstrap path.
- [x] Integration settings are tied to `workspaceId`.
- [x] Secret values are encrypted or otherwise protected according to the
  approved v1 security plan.
- [x] Secret values are never returned in API responses or logs.
- [x] Cross-workspace access is rejected.
- [x] ClickUp adapter contract reads settings through this workspace-scoped
  mechanism.
- [x] `npm run build` passes.

### Result Report
- Task summary: Added workspace-owned integration settings, encrypted provider
  secret storage, ClickUp settings routes, and service helpers for native
  adapters to read decrypted workspace settings inside the backend process.
- Files changed: `prisma/schema.prisma`,
  `prisma/migrations/202605023_integration_settings/migration.sql`,
  `.env.example`, `src/config/env.ts`, `src/app.ts`,
  `src/integrations/secrets.ts`,
  `src/integrations/integration-settings.service.ts`,
  `src/modules/integration-settings/integration-settings.routes.ts`,
  `docs/API.md`, `docs/DATABASE.md`, `docs/INTEGRATIONS.md`,
  `docs/security/security-baseline.md`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-execution-plan.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Ran `npx prisma generate`, `npm run build`,
  `npx prisma validate` with a local `DATABASE_URL`, and `git diff --check`.
- What is incomplete: Native ClickUp API calls and sync behavior remain in
  CCV1-010 after CCV1-017 defines the adapter observability contract.
- Next steps: Start CCV1-017 integration adapter contract and observability
  minimum, then implement CCV1-010 native ClickUp sync.

### Priority
P0
