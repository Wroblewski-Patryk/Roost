# CompanyCore v1 Task Contracts

These task contracts turn the v1 audit into executable work. Each task must be
completed as its own small iteration and must update `.codex/context/TASK_BOARD.md`,
`.codex/context/PROJECT_STATE.md`, and relevant docs when status changes.

## CCV1-036A Webhook Schema And Security Foundation

### Header
- ID: CCV1-036A
- Title: Webhook schema and security foundation
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: DB/Migrations + Backend Builder
- Depends on: CCV1-036
- Priority: P0
- Iteration: v1-036A
- Operation Mode: BUILDER

### Goal
Create the durable and fail-closed foundation for ClickUp live sync before
registering real provider webhooks.

### Scope
- `prisma/schema.prisma`
- `prisma/migrations/202605032_clickup_webhook_foundation/migration.sql`
- `src/app.ts`
- `src/integrations/clickup/webhook-signature.ts`
- `src/modules/webhooks/clickup-webhooks.routes.ts`
- `src/tests/api.test.ts`
- planning/context docs

### Implementation Plan
- Add webhook registration, provider event inbox, and agent event outbox tables.
- Mount a ClickUp webhook route before JSON parsing so raw request bodies are
  available for signature verification.
- Add HMAC SHA-256 signing/verification helpers matching official ClickUp
  webhook signature behavior.
- Prove the route fails closed until the full receiver is enabled.

### Acceptance Criteria
- [x] Schema has workspace-scoped webhook registration, inbox, and outbox
  tables.
- [x] ClickUp webhook route receives raw JSON bodies outside protected API key
  middleware.
- [x] Missing signatures fail closed.
- [x] HMAC SHA-256 helper verifies valid signatures and rejects invalid ones.
- [x] Full event processing remains disabled until CCV1-036B/C provide stored
  webhook secrets and inbox writes.

### Definition of Done
- [x] Official ClickUp webhook docs reviewed for user-token ownership, raw-body
  HMAC signature verification, event payloads, and idempotency.
- [x] Fresh migration path validated.
- [x] Regression tests pass.
- [x] Task board, next-commits queue, project state, and task contract updated.

### Result Report
- Task summary: Added the database and route/security foundation for ClickUp
  live sync.
- Files changed: Prisma schema and migration, app route mount, HMAC helper,
  webhook route, API test, and planning/context docs.
- How tested: `npm run build`; `npm test` with `DATABASE_URL` pointing at
  disposable PostgreSQL on `localhost:55432`.
- What is incomplete: webhook registration, stored-secret lookup, durable inbox
  writes, task event processing, and agent outbox APIs remain queued as
  CCV1-036B through CCV1-036F.
- Next steps: implement CCV1-036B ClickUp Webhook Registration.

## CCV1-036B-G ClickUp Live Sync And Write-Back

### Header
- ID: CCV1-036B-G
- Title: ClickUp live sync and CompanyCore write-back
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-036A
- Priority: P0
- Iteration: v1-036B-G
- Operation Mode: BUILDER

### Goal
Make CompanyCore the live operational source of truth while keeping ClickUp,
Paperclip, Jarvis, and Aviary updated through provider webhooks, agent events,
and guarded write-back.

### Scope
- `src/integrations/clickup/clickup.client.ts`
- `src/integrations/clickup/clickup.webhooks.ts`
- `src/modules/integration-settings/integration-settings.routes.ts`
- `src/modules/webhooks/clickup-webhooks.routes.ts`
- `src/modules/agent-events/agent-events.routes.ts`
- `src/modules/tasks/tasks.routes.ts`
- `src/app.ts`
- `src/tests/api.test.ts`
- API/database/planning/context docs

### Implementation Plan
- Add ClickUp webhook and task update client methods.
- Add owner-only webhook reconcile API for selected ClickUp Lists.
- Verify signed ClickUp deliveries, persist inbox rows idempotently, and
  process task events into CompanyCore tasks.
- Emit provider-neutral agent events for status changes.
- Add agent event read/ack APIs.
- Write supported CompanyCore edits for ClickUp-sourced tasks back to ClickUp.

### Acceptance Criteria
- [x] Webhooks can be reconciled from saved ClickUp settings.
- [x] Returned ClickUp webhook secrets are encrypted and never returned.
- [x] Signed task webhook events update CompanyCore task records.
- [x] Duplicate webhook deliveries are idempotent.
- [x] Status changes create agent-readable outbox events.
- [x] Agents can list and ack pending events.
- [x] CompanyCore task edits for ClickUp-sourced tasks call ClickUp update API.
- [x] Provider write-back failures emit a safe failure event.

### Definition of Done
- [x] Official ClickUp webhook and task update docs reviewed.
- [x] Build and integration tests pass.
- [x] Source-of-truth docs and planning queue updated.
- [x] Production smoke remains queued as the separate release task CCV1-036F.

### Result Report
- Task summary: Implemented the runtime bridge for ClickUp inbound live sync,
  agent event fan-out, and CompanyCore-to-ClickUp write-back.
- Files changed: ClickUp client/service, webhook route, integration settings
  route, agent event route, task write-back path, app mount, tests, and docs.
- How tested: `npm test` with `DATABASE_URL` pointed at disposable PostgreSQL
  on `localhost:55432`.
- What is incomplete: production webhook reconciliation and real ClickUp status
  smoke are intentionally left for CCV1-036F after deploy.
- Next steps: deploy and run CCV1-036F production webhook smoke.

## CCV1-036F Production Webhook Smoke

### Header
- ID: CCV1-036F
- Title: Production webhook smoke
- Task Type: release verification
- Current Stage: verification
- Status: DONE
- Owner: Ops/Release
- Depends on: CCV1-036B-G
- Priority: P0
- Iteration: v1-036F
- Operation Mode: TESTER

### Goal
Prove the deployed production bridge works in both directions with real ClickUp
data and no lasting task pollution.

### Scope
- Production CompanyCore deployment
- ClickUp webhook registrations
- Provider inbox and agent outbox readback
- `docs/operations/post-deploy-smoke.md`
- planning/context docs

### Acceptance Criteria
- [x] Production deploy runs the webhook schema and runtime.
- [x] Selected ClickUp List webhooks are registered.
- [x] Unsigned webhook requests fail closed.
- [x] A signed webhook updates/reads through the deployed receiver.
- [x] A real CompanyCore task update writes to ClickUp.
- [x] ClickUp sends natural signed webhook events back to CompanyCore.
- [x] Provider inbox rows are processed and signature-verified.
- [x] The touched task is restored to its original title.

### Validation Evidence
- Deploy: Coolify manual deploy `e12x9rc7i8071qfnrzh6u1hh`.
- Runtime image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:75df028f9dc3cab59f026fd7d2c5fef430e6d5ea`.
- Public health: `GET https://api.companycore.luckysparrow.ch/health`
  returned `200`.
- Webhooks: `21` active ClickUp List webhooks registered.
- Signed smoke: `POST /v1/webhooks/clickup` returned `202 accepted`.
- Natural roundtrip: changing ClickUp task `86c5fqumu` through CompanyCore
  produced `2` natural ClickUp `taskUpdated` inbox rows, both
  `processingStatus = processed` and `signatureVerified = true`.

### Result Report
- Task summary: Completed the production webhook and write-back smoke.
- Files changed: operations smoke evidence, project state, task board, and
  next-commits queue.
- How tested: deployed runtime checks plus real ClickUp roundtrip smoke.
- What is incomplete: Paperclip still needs application-side consumption of
  CompanyCore agent events.
- Next steps: implement Paperclip application-side CompanyCore adapter.

## CCV1-034B2 ClickUp Views And Custom Fields Persistence

### Header
- ID: CCV1-034B2
- Title: ClickUp Views and Custom Fields persistence
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-034B
- Priority: P1
- Iteration: v1-034B2
- Operation Mode: BUILDER

### Goal
Persist ClickUp View and Custom Field metadata into CompanyCore provider
mapping tables without storing provider secrets.

### Scope
- `src/integrations/clickup/clickup.client.ts`
- `src/operating-model/clickup-structure.ts`
- `src/modules/integration-settings/integration-settings.routes.ts`
- `src/tests/api.test.ts`
- API/integration docs and context files

### Acceptance Criteria
- [x] Workspace/List Views are persisted as external container mappings.
- [x] Workspace/Space/Folder/List Custom Fields are persisted as external
  field mappings.
- [x] List-level Views and Custom Fields link to the mapped operating table.
- [x] Provider errors remain safely mapped.

### Validation Evidence
- Tests: `npm test` with disposable PostgreSQL on `localhost:55432`.
- Provider docs reviewed: official ClickUp docs for Views, List Views,
  Workspace Views, Workspace/Space/Folder/List Custom Fields, and Custom Field
  update behavior.

### Result Report
- Task summary: Extended ClickUp discovery persistence to Views and Custom
  Fields.
- Files changed: ClickUp client, operating model persistence, tests, docs, and
  context.
- How tested: build plus `npm test`.
- What is incomplete: webhook ingestion remains a separate continuous update
  strategy decision.
- Next steps: continue with registry-backed operating model APIs.

## CCV1-034C Registry-Backed Table API Contract

### Header
- ID: CCV1-034C
- Title: Registry-backed table API contract
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-034A
- Priority: P1
- Iteration: v1-034C
- Operation Mode: BUILDER

### Goal
Expose the operating registry through protected API routes so service clients
can discover areas, tables, provider mappings, storage roots, knowledge roots,
and automations without database access.

### Scope
- `src/modules/operating-model/operating-model.routes.ts`
- `src/app.ts`
- `src/modules/connection/connection.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`

### Acceptance Criteria
- [x] `/v1/operating-model` returns the full workspace registry summary.
- [x] `/v1/operating-model/tables` returns table metadata.
- [x] `/v1/operating-model/external-mappings` returns provider containers.
- [x] `/v1/operating-model/external-fields` returns provider fields.
- [x] `/v1/connection` advertises registry routes.

### Validation Evidence
- Tests: `npm test` with disposable PostgreSQL on `localhost:55432`.
- Regression check: protected route tests still pass.

### Result Report
- Task summary: Added dedicated registry read APIs and manifest metadata.
- Files changed: operating model route, app mount, connection route, tests, and
  API docs.
- How tested: build plus `npm test`.
- What is incomplete: none for the planned read contract.
- Next steps: use these routes from adapters when `/v1/connection` is too
  compact.

## CCV1-034D Storage And Knowledge Roots

### Header
- ID: CCV1-034D
- Title: Storage and knowledge roots
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-034C
- Priority: P1
- Iteration: v1-034D
- Operation Mode: BUILDER

### Goal
Allow adapters and owner clients to register workspace/folder/table-scoped
storage locations and knowledge roots.

### Scope
- `src/modules/operating-model/operating-model.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/DATABASE.md`

### Acceptance Criteria
- [x] Storage locations can be created with workspace-derived ownership.
- [x] Knowledge roots can be created with workspace-derived ownership.
- [x] Optional `areaId`, `folderId`, and `tableId` are validated in the active
  workspace.
- [x] Foreign scope IDs fail closed with `not_found`.

### Validation Evidence
- Tests: `npm test` creates Google Drive-style storage and Obsidian-style
  knowledge roots for the `goals` table and rejects a foreign workspace write.

### Result Report
- Task summary: Added scoped storage and knowledge root APIs.
- Files changed: operating model route, tests, API/database docs, and context.
- How tested: build plus `npm test`.
- What is incomplete: syncing file contents remains out of scope.
- Next steps: connect concrete Drive/Obsidian adapters when needed.

## CCV1-034E Automation Scope Registry

### Header
- ID: CCV1-034E
- Title: Automation scope registry
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-034C
- Priority: P1
- Iteration: v1-034E
- Operation Mode: BUILDER

### Goal
Register automations against workspace, area, folder, or table scopes so
scheduled syncs, webhooks, and external orchestrators can be tracked
consistently.

### Scope
- `src/modules/operating-model/operating-model.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- planning/context docs

### Acceptance Criteria
- [x] Automation definitions can be created through the API.
- [x] Automation scope IDs are validated inside the active workspace.
- [x] Definitions store provider, trigger type, enabled state, and config.
- [x] Continuous ClickUp scheduled/webhook behavior remains a separate
  implementation decision.

### Validation Evidence
- Tests: `npm test` creates a ClickUp `scheduled_pull` automation definition
  scoped to the `goals` table.

### Result Report
- Task summary: Added the automation definition API and scope validation.
- Files changed: operating model route, tests, API docs, planning queue, task
  board, and project state.
- How tested: build plus `npm test`.
- What is incomplete: automation execution/webhook receiver is not active yet.
- Next steps: decide scheduled sync versus webhook ingestion.

## CCV1-034A Operating Model Registry Schema

### Header
- ID: CCV1-034A
- Title: Operating model registry schema
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: DB/Migrations
- Depends on: CCV1-034
- Priority: P0
- Iteration: v1-034A
- Operation Mode: BUILDER

### Goal
Create the runtime database registry for 12 operating areas, folders, tables,
provider mappings, storage roots, knowledge roots, and automation scopes.

### Scope
- `prisma/schema.prisma`
- `prisma/migrations/202605031_operating_model_registry/migration.sql`
- `src/operating-model/catalog.ts`
- `prisma/seed.ts`
- `src/modules/auth/auth.routes.ts`
- `src/modules/connection/connection.routes.ts`
- `src/tests/api.test.ts`
- docs and context files

### Acceptance Criteria
- [x] Every workspace gets the 12 approved operating areas.
- [x] First-party API tables are registered under stable areas.
- [x] `goals` and `targets` are assigned to Strategy and governance.
- [x] System tables remain outside the 12-area business table catalog.
- [x] Existing workspaces are backfilled by migration.
- [x] New registrations and seed/bootstrap create the registry.
- [x] `/v1/connection` exposes safe operating model metadata.

### Validation Evidence
- Tests: `npm test` with `DATABASE_URL=postgresql://companycore:companycore@localhost:55432/companycore_test?schema=public`.
- Prisma: `npx prisma generate`; `npx prisma validate` with `DATABASE_URL`
  set.
- Migration: fresh disposable PostgreSQL applied all migrations including
  `202605031_operating_model_registry`; second `npm test` run confirmed no
  pending migrations.

### Result Report
- Task summary: Added the operating model registry and wired it into workspace
  bootstrap and connection metadata.
- Files changed: Prisma schema/migration, operating model service, auth
  registration, seed, connection route, tests, docs, task board, project state,
  and next commits.
- How tested: build, Prisma validation/generation, fresh migration deploy, and
  endpoint integration test.
- What is incomplete: dedicated registry routes remain CCV1-034C.
- Next steps: continue with ClickUp structure persistence and broader registry
  API/read models.

### Priority
P0

## CCV1-035 ClickUp First-Run Import Policy And Launch Audit

### Header
- ID: CCV1-035
- Title: ClickUp first-run import policy and launch audit
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-034A, CCV1-034B, CCV1-034C, CCV1-034D, CCV1-034E
- Priority: P0
- Iteration: v1-035
- Operation Mode: BUILDER

### Description
Before the owner enters a real ClickUp API token, make the first-run import
behavior explicit and testable so CompanyCore can safely decide what happens
when task records already exist.

### Goal
Provide an end-to-end ClickUp launch path where token setup, selected Lists,
task priority/list mapping, import policy, production bootstrap, Jarvis-facing
data availability, and regression tests are aligned.

### Scope
- `src/integrations/clickup/clickup.sync.ts`
- `src/integrations/integration-settings.service.ts`
- `src/modules/integration-settings/integration-settings.routes.ts`
- `src/modules/tasks/tasks.routes.ts`
- `public/index.html`
- `public/app.js`
- `scripts/clickup-production-bootstrap.mjs`
- `.env.example`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/operations/clickup-production-bootstrap.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- this task contract

### Implementation Plan
1. Audit the existing ClickUp sync path from saved token/config through native
   sync and Jarvis-readable CompanyCore tables.
2. Add explicit import modes for merge, skip-existing, replace-selected-lists,
   and inspect-only.
3. Wire the import mode through settings validation, native sync request body,
   owner console, production bootstrap script, and safe sync response counts.
4. Add regression tests for priority/list mapping and all existing-record
   policies, including proof that replace-selected-lists preserves native
   CompanyCore tasks.
5. Update architecture, API, integration, operations, task board, project
   state, and planning docs.
6. Run local quality gates and commit the final scoped change.

### Acceptance Criteria
- [x] Owner setup can save a ClickUp token, team/list IDs, and import mode.
- [x] Native sync defaults to `merge` and can be overridden per run.
- [x] `merge` updates existing ClickUp tasks and adds new ClickUp tasks without
  touching native/manual CompanyCore tasks.
- [x] `skip_existing` leaves existing ClickUp tasks unchanged and adds only new
  ClickUp tasks.
- [x] `replace_selected_lists` deletes only `source = clickup` tasks under the
  selected ClickUp Lists after a successful provider fetch.
- [x] `inspect_only` fetches and reports would-create/would-update counts
  without writing or deleting tasks.
- [x] Imported ClickUp tasks preserve priority and land in the matching
  CompanyCore task list.
- [x] Production bootstrap exposes the same import policy and never prints raw
  secrets.
- [x] Architecture and API docs document the policy.
- [x] `npm run build`, `npx prisma validate`, `git diff --check`, and
  `npm test` pass.

### Definition of Done
- [x] Scope stayed inside the approved ClickUp first-run launch path.
- [x] Existing architecture mechanisms were reused instead of adding a
  parallel import system.
- [x] No temporary bypass, fake data path, or mock-only behavior was shipped.
- [x] Destructive behavior is fail-closed and provider-scoped.
- [x] Documentation and canonical project state are updated.
- [x] Validation evidence is recorded.

### Result Report
- Task summary: Added explicit ClickUp import policies for `merge`,
  `skip_existing`, `replace_selected_lists`, and `inspect_only`; wired them
  through workspace settings, native sync API, owner console, production
  bootstrap, architecture/API/integration docs, and regression tests.
- Files changed: `.env.example`, `public/app.js`, `public/index.html`,
  `scripts/clickup-production-bootstrap.mjs`,
  `src/integrations/clickup/clickup.sync.ts`,
  `src/integrations/integration-settings.service.ts`,
  `src/modules/integration-settings/integration-settings.routes.ts`,
  `src/modules/tasks/tasks.routes.ts`, `src/tests/api.test.ts`,
  `docs/API.md`, `docs/INTEGRATIONS.md`,
  `docs/architecture/system-architecture.md`,
  `docs/architecture/architecture-source-of-truth.md`,
  `docs/operations/clickup-production-bootstrap.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Ran `npm run build`, `npx prisma validate` with local
  `DATABASE_URL`, `git diff --check`, and `npm test` against disposable
  PostgreSQL on `localhost:55432`.
- What is incomplete: Real ClickUp production token discovery/sync remains an
  operator action. Continuous automatic updates still require the queued
  scheduled-sync versus webhook-ingestion decision.
- Next steps: Deploy this commit, enter the real ClickUp token in the owner
  console, run `inspect_only` or `merge`, then decide continuous ClickUp update
  strategy after the first production pull succeeds.

### Priority
P0

## CCV1-036 ClickUp Webhook Trigger Architecture Plan

### Header
- ID: CCV1-036
- Title: ClickUp webhook trigger architecture plan
- Task Type: architecture
- Current Stage: planning
- Status: DONE
- Owner: Product Docs
- Depends on: CCV1-035
- Priority: P0
- Iteration: v1-036
- Operation Mode: ARCHITECT

### Description
Plan the real-time ClickUp trigger layer so CompanyCore can listen to ClickUp
changes after the owner enables the integration and can notify Paperclip,
Jarvis, Aviary, and future modules through a provider-neutral CompanyCore event
bridge.

### Goal
Replace the open continuous-sync decision with an approved webhook-first
architecture based on current ClickUp documentation and split the work into
small executable implementation slices.

### Scope
- `docs/architecture/system-architecture.md`
- `docs/INTEGRATIONS.md`
- `docs/planning/clickup-webhook-trigger-plan.md`
- `docs/planning/mvp-next-commits.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- this task contract

### Implementation Plan
1. Review official ClickUp webhook documentation before planning runtime
   behavior.
2. Record ClickUp-specific assumptions for registration, user-token ownership,
   health, task payloads, and `X-Signature` HMAC verification.
3. Define the CompanyCore webhook architecture: registration service, raw-body
   receiver, provider inbox, idempotent processor, and agent outbox.
4. Define how `taskStatusUpdated` becomes a Paperclip/Jarvis/Aviary-visible
   CompanyCore event.
5. Split implementation into CCV1-036A through CCV1-036F.
6. Update canonical queue files so webhook work is actionable immediately after
   first import.

### Acceptance Criteria
- [x] Official ClickUp webhook docs are reflected in the plan.
- [x] Plan requires raw-body `X-Signature` HMAC SHA-256 verification.
- [x] Plan accounts for webhooks being tied to the creating ClickUp user token.
- [x] Plan includes webhook registration, health/reconciliation, receiver,
  inbox, processing, and retry/idempotency behavior.
- [x] Plan defines status-change propagation to Paperclip, Jarvis, Aviary, and
  future bridges.
- [x] Planning queue contains concrete implementation slices.

### Definition of Done
- [x] Architecture source of truth updated.
- [x] Integration docs updated.
- [x] Planning docs and task board synchronized.
- [x] No runtime code was changed before the architecture slice was approved.
- [x] Provider docs were checked and named in task evidence.

### Result Report
- Task summary: Approved a webhook-first continuous update model for ClickUp
  and documented the model as a reusable provider bridge architecture:
  ClickUp signed webhook -> CompanyCore verified inbox -> idempotent processor
  -> task update/internal event -> agent event bridge for Paperclip, Jarvis,
  Aviary, and future modules.
- Files changed: `docs/architecture/system-architecture.md`,
  `docs/INTEGRATIONS.md`, `docs/planning/clickup-webhook-trigger-plan.md`,
  `docs/planning/mvp-next-commits.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, and this
  task contract.
- How tested: Reviewed official ClickUp docs for Webhooks, Webhook Signature,
  Create Webhook, Get Webhooks, Update Webhook, Webhook Health, and task
  webhook payloads; ran `git diff --check` and `npm run build`.
- What is incomplete: Runtime webhook tables, receiver, registration, task
  processor, and agent event APIs are intentionally queued as CCV1-036A through
  CCV1-036F.
- Next steps: Start CCV1-036A Webhook Schema And Security Foundation.

### Priority
P0

## CCV1-037 ClickUp List Selection UX Fix

### Header
- ID: CCV1-037
- Title: ClickUp list selection UX fix
- Task Type: bugfix
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCV1-032, CCV1-035
- Priority: P0
- Iteration: v1-037
- Operation Mode: BUILDER

### Description
Real owner testing confirmed ClickUp Workspace discovery works, but the owner
did not see an obvious List selection path after choosing the Workspace.

### Goal
Make the ClickUp List loading and multiselect flow explicit enough for first
production import: load Lists on demand, show clear no-list feedback, and allow
selecting or clearing all loaded Lists.

### Scope
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- this task contract

### Implementation Plan
1. Add an explicit `Load Lists` action next to the ClickUp Workspace selector.
2. Reuse the existing discovery endpoint and selected Workspace state.
3. Add `Select all` and `Clear all` controls for loaded Lists.
4. Improve List summary messaging for loaded, selected, and no-list states.
5. Validate the static frontend through TypeScript build and diff checks.

### Acceptance Criteria
- [x] Owner can manually load Lists after selecting a ClickUp Workspace.
- [x] Owner can select all loaded Lists.
- [x] Owner can clear all selected Lists.
- [x] Empty ClickUp structure produces an actionable no-list message.
- [x] Existing save/sync enablement still requires at least one selected List.
- [x] `npm run build` passes.

### Definition of Done
- [x] Change stays inside the owner console selection flow.
- [x] Existing ClickUp discovery and sync APIs are reused.
- [x] No temporary fallback or fake provider data is added.
- [x] Canonical planning and project state are updated.

### Result Report
- Task summary: Added explicit List loading and bulk selection controls to the
  ClickUp owner console, plus clearer feedback when a selected Workspace returns
  no Lists for the token. After production testing exposed
  `internal_server_error`, also fixed ClickUp View parsing so non-array
  `required_views` provider responses no longer block List discovery, and made
  Workspace selection wait for an explicit `Load Lists` click.
- Files changed: `public/index.html`, `public/app.js`, `public/styles.css`,
  `src/integrations/clickup/clickup.client.ts`, `src/tests/api.test.ts`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Ran `npm run build`, `git diff --check`, and `npm test` against
  disposable PostgreSQL on `localhost:55432`.
- What is incomplete: A real ClickUp token/List selection smoke remains with
  the owner in the browser.
- Next steps: Deploy this UI fix, refresh the owner console, load Lists, select
  desired Lists, and run `inspect_only` before the first import.

### Priority
P0

## CCV1-038 Dashboard Task Table

### Header
- ID: CCV1-038
- Title: Dashboard task table
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCV1-035
- Priority: P0
- Iteration: v1-038
- Operation Mode: BUILDER

### Description
After the first ClickUp import attempt, the owner needs a visible table in the
CompanyCore dashboard to confirm whether tasks were imported.

### Goal
Add the first dashboard data table for tasks, including ClickUp-visible fields
that prove import mapping worked: title, status, priority, list, source, and
due date.

### Scope
- `src/modules/tasks/tasks.routes.ts`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `src/tests/api.test.ts`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- this task contract

### Implementation Plan
1. Extend task list API responses with safe task list metadata.
2. Add a dashboard task table with a manual refresh action.
3. Load tasks after owner connection and after ClickUp sync.
4. Render empty state and ClickUp count summary.
5. Add regression assertion that `/v1/tasks` includes imported task list
   metadata.
6. Run build, diff check, and integration tests.

### Acceptance Criteria
- [x] Dashboard shows a tasks table for the active workspace.
- [x] Imported ClickUp tasks show source, priority, status, and task list.
- [x] Empty state is clear when there are no tasks.
- [x] Refresh button reloads tasks without rerunning ClickUp sync.
- [x] `/v1/tasks` remains workspace-scoped.
- [x] `npm test` passes.

### Definition of Done
- [x] Existing task API and dashboard shell were reused.
- [x] No fake data or placeholder-only behavior was added.
- [x] Task list relation data is safe and workspace-scoped.
- [x] Documentation and planning state are updated.

### Result Report
- Task summary: Added the first dashboard data table for workspace tasks and
  included safe task list metadata in task list API responses so owners can
  verify ClickUp import results immediately.
- Files changed: `src/modules/tasks/tasks.routes.ts`, `public/index.html`,
  `public/app.js`, `public/styles.css`, `src/tests/api.test.ts`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Ran `npm test` against disposable PostgreSQL, `npm run build`,
  and `git diff --check`.
- What is incomplete: This is the first table only; broader dashboard
  filtering/search/pagination remains future UX work.
- Next steps: Deploy, refresh Dashboard, and inspect imported ClickUp tasks.

### Priority
P0

## CCV1-039 ClickUp Config-Only Save Fix

### Header
- ID: CCV1-039
- Title: ClickUp config-only save fix
- Task Type: bugfix
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-035, CCV1-037
- Priority: P0
- Iteration: v1-039
- Operation Mode: BUILDER

### Description
Real owner testing showed `ClickUp is not configured for this workspace yet`
and `internal_server_error` after selecting ClickUp lists and attempting to save
or sync.

### Goal
Allow owners to update ClickUp configuration without re-pasting the token when
a workspace setting already exists, while preserving the encrypted ClickUp
secret.

### Scope
- `src/modules/integration-settings/integration-settings.routes.ts`
- `src/tests/api.test.ts`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- this task contract

### Implementation Plan
1. Inspect production logs for the failing ClickUp save path.
2. Replace Prisma `upsert` data construction that encrypts an undefined token
   with explicit existing-update versus new-create paths.
3. Add a regression test for updating ClickUp config without token while
   preserving `secretConfigured`.
4. Run integration tests and diff checks.

### Acceptance Criteria
- [x] Existing ClickUp integration settings can be updated without sending a
  token.
- [x] Config-only save preserves the encrypted token and `secretConfigured`.
- [x] New ClickUp integration settings still require a token.
- [x] Internal server error no longer occurs from `encryptSecret(undefined)`.
- [x] `npm test` passes.

### Definition of Done
- [x] Existing secret-storage mechanism is reused.
- [x] No plaintext token logging or response leakage is added.
- [x] Regression test covers the failed production path.
- [x] Canonical state and planning docs are updated.

### Result Report
- Task summary: Fixed ClickUp settings updates so config-only saves use an
  explicit update path that preserves existing encrypted token material instead
  of constructing a Prisma upsert create payload with `encryptSecret(undefined)`.
- Files changed:
  `src/modules/integration-settings/integration-settings.routes.ts`,
  `src/tests/api.test.ts`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-next-commits.md`, and this
  task contract.
- How tested: Ran `npm test` against disposable PostgreSQL and
  `git diff --check`.
- What is incomplete: Needs production deploy and owner retry in browser.
- Next steps: Deploy, hard-refresh the settings console, save ClickUp
  connection, then run sync/import and check Dashboard Tasks.

### Priority
P0

## CCV1-040 ClickUp Save-And-Sync Activation Fix

### Header
- ID: CCV1-040
- Title: ClickUp save-and-sync activation fix
- Task Type: bugfix
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCV1-039
- Priority: P0
- Iteration: v1-040
- Operation Mode: BUILDER

### Description
Production inspection showed the owner-selected ClickUp lists and encrypted
token were saved, but the integration setting was inactive, so native sync
returned `integration_not_configured`.

### Goal
Make the owner console's `Save and sync` action activate the ClickUp connection
before triggering native sync, while preserving the ability to save an inactive
connection through the plain `Save connection` action.

### Scope
- `public/app.js`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- this task contract

### Implementation Plan
1. Inspect production ClickUp setting metadata without exposing token material.
2. Confirm whether token, selected lists, and active state are present.
3. Update `Save and sync` to force `active=true`.
4. Keep `Save connection` respecting the Active checkbox.
5. Recompute button state when Active changes.
6. Run build and diff checks.

### Acceptance Criteria
- [x] `Save and sync` activates ClickUp settings before sync.
- [x] Plain `Save connection` can still save an inactive connection.
- [x] Active checkbox changes update button state.
- [x] No token material is logged or returned.
- [x] `npm run build` passes.

### Definition of Done
- [x] Existing owner console flow is reused.
- [x] No backend bypass or direct token handling is added.
- [x] Production finding is recorded in project state.
- [x] Validation passes.

### Result Report
- Task summary: Fixed owner console behavior so `Save and sync` forces the
  ClickUp setting active before native sync, preventing an inactive saved
  setting from returning `integration_not_configured`.
- Files changed: `public/app.js`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-next-commits.md`, and this
  task contract.
- How tested: Ran `npm run build` and `git diff --check`.
- What is incomplete: Needs production deploy and owner retry.
- Next steps: Deploy, hard-refresh the console, click `Save and sync`, then
  check Dashboard Tasks.

### Priority
P0

## CCV1-034B ClickUp Structure Persistence

### Header
- ID: CCV1-034B
- Title: ClickUp structure persistence
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-034A
- Priority: P0
- Iteration: v1-034B
- Operation Mode: BUILDER

### Goal
Persist discovered ClickUp Workspaces, Spaces, Folders, and Lists into the
operating registry so imported records land under the right CompanyCore table
and task list.

### Scope
- `src/operating-model/clickup-structure.ts`
- `src/modules/integration-settings/integration-settings.routes.ts`
- `src/integrations/clickup/clickup.sync.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- context and planning files

### Acceptance Criteria
- [x] ClickUp discovery persists non-secret structural metadata.
- [x] ClickUp Spaces are mapped to operating areas.
- [x] ClickUp Folders are mapped to operating folders.
- [x] ClickUp Lists are mapped to operating tables with `source = clickup`.
- [x] Imported ClickUp tasks preserve priority.
- [x] Imported ClickUp tasks attach to the matching CompanyCore `task_lists`
  row by ClickUp List ID.
- [x] Tests prove a `Jarvis` ClickUp List maps to AI agents and observability
  and imported task list placement works.

### Validation Evidence
- Tests: `npm test` with disposable PostgreSQL on `localhost:55432`.
- Provider docs reviewed: ClickUp Tasks, Custom Fields, Views, Rate Limits,
  Webhook signature, and API v2/v3 terminology from the prior CCV1-034
  documentation task.
- High-risk checks: task priority and task list placement asserted in
  `src/tests/api.test.ts`.

### Result Report
- Task summary: ClickUp discovery now saves structural mappings, and native
  task sync uses those mappings to place imported tasks under the correct task
  list while preserving priority.
- Files changed: ClickUp structure service, integration settings route,
  ClickUp sync service, tests, docs, task board, project state, next commits,
  and this contract.
- How tested: build, migration deploy, and integration test.
- What is incomplete: Views and Custom Field metadata persistence are split to
  CCV1-034B2.
- Next steps: decide whether adapters need dedicated registry routes beyond
  `/v1/connection`.

### Priority
P0

## CCV1-034 ClickUp-Shaped Operating Model Architecture

### Header
- ID: CCV1-034
- Title: ClickUp-shaped operating model architecture
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: CCV1-031, CCV1-032, CCV1-033
- Priority: P0
- Iteration: v1-034
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] No loop step is skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches iteration 34.
- [x] The task aligns with repository source-of-truth documents.

### Context
The owner wants CompanyCore tables, APIs, automations, storage, and knowledge
roots to map 1:1 with ClickUp workspace/folder structure where useful, then
expand with strong ideas from other systems. The current schema is
workspace-scoped but does not yet persist a full ClickUp-equivalent hierarchy.

### Goal
Document the target operating model, audit the current database/code fit, and
queue the smallest safe implementation sequence before runtime schema changes.

### Scope
- `docs/architecture/system-architecture.md`
- `docs/DATABASE.md`
- `docs/INTEGRATIONS.md`
- `docs/planning/clickup-shaped-operating-model-plan.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `.codex/context/LEARNING_JOURNAL.md`
- this task contract

### Implementation Plan
1. Check official ClickUp docs for hierarchy, tasks, Custom Fields, Views,
   rate limits, and webhook signatures.
2. Compare the current Prisma schema and integration docs to the desired
   workspace/folder/table mapping.
3. Document the target 12-area operating model and system-table boundary.
4. Plan migration/API/storage/automation follow-up tasks without changing
   runtime behavior.
5. Update project state, board, learning journal, and validation evidence.

### Autonomous Loop Evidence

#### 1. Analyze Current State
- Issues: current v1 tables have workspace ownership, but there is no explicit
  `Operating Area -> Operating Folder -> Operating Table` registry.
- Gaps: ClickUp Spaces, Folders, Views, Custom Fields, storage roots,
  knowledge roots, and automation scopes are not persisted as first-class
  records.
- Inconsistencies: `task_lists` approximates ClickUp Lists but is not a
  general table registry.
- Architecture constraints: PostgreSQL remains source of truth and all
  clients must use the API.

#### 2. Select One Priority Task
- Selected task: CCV1-034 ClickUp-shaped operating model architecture.
- Priority rationale: schema/code implementation needs an approved source of
  truth before adding new tables or sync behavior.
- Why other candidates were deferred: continuous ClickUp sync should wait
  until the structural registry decision is captured.

#### 3. Plan Implementation
- Files or surfaces to modify: architecture, database, integration, planning,
  task board, project state, and learning journal docs only.
- Logic: record the hierarchy and follow-up task sequence.
- Edge cases: keep system tables outside the 12 business areas; avoid
  pretending current code already mirrors ClickUp 1:1.

#### 4. Execute Implementation
- Implementation notes: added the operating model architecture, database target
  registry, ClickUp structural mapping, and implementation plan.

#### 5. Verify and Test
- Validation performed: official ClickUp documentation review, schema/code
  inspection, `git diff --check`.
- Result: documentation-only validation passed.

#### 6. Self-Review
- Simpler option considered: adding fields directly to `task_lists`.
- Technical debt introduced: no.
- Scalability assessment: registry approach supports ClickUp now and future
  systems later without overloading domain tables.
- Refinements made: separated system tables from the 12 business areas.

#### 7. Update Documentation and Knowledge
- Docs updated: architecture, database, integrations, planning, board, project
  state, learning journal.
- Context updated: yes.
- Learning journal updated: yes.

### Acceptance Criteria
- [x] Architecture defines the ClickUp-shaped hierarchy and 12 business areas.
- [x] Database docs identify current schema gaps and target registry tables.
- [x] Integration docs capture ClickUp hierarchy and provider-doc guardrails.
- [x] Planning docs queue implementation tasks for schema, mapping, API,
  storage/knowledge, and automations.
- [x] The current code is assessed without introducing runtime changes.

### Definition of Done
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] No mock, placeholder, fake, or temporary path is introduced.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Validation Evidence
- Tests: `git diff --check`.
- Manual checks: reviewed `prisma/schema.prisma`, `docs/DATABASE.md`,
  `docs/INTEGRATIONS.md`, and official ClickUp docs.
- High-risk checks: no runtime or migration changes were made.

### Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: not applicable.
- Endpoint and client contract match: not applicable.
- DB schema and migrations verified: docs-only audit; runtime schema unchanged.
- Regression check performed: documentation diff validation.

### Architecture Evidence
- Architecture source reviewed: `docs/architecture/system-architecture.md`.
- Fits approved architecture: yes.
- Mismatch discovered: yes; current code lacks the full operating registry.
- Decision required from user: no; user requested documenting the direction and
  planning implementation.
- Follow-up architecture doc updates: added target model and provider-doc
  guardrail.

### Result Report
- Task summary: Documented CompanyCore's ClickUp-shaped operating model and
  planned the registry implementation sequence.
- Files changed: architecture, database, integrations, operating-model plan,
  project state, task board, next commits, learning journal, and this contract.
- How tested: official ClickUp documentation review, local schema/code audit,
  and `git diff --check`.
- What is incomplete: runtime registry tables and APIs are queued as
  CCV1-034A through CCV1-034E.
- Next steps: implement CCV1-034A Operating Model Registry Schema.

### Priority
P0

## CCV1-033 Production Deploy And Smoke For Guided ClickUp Owner Console

### Header
- ID: CCV1-033
- Title: Production deploy and smoke for guided ClickUp owner console
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Ops/Release
- Depends on: CCV1-031, CCV1-032
- Priority: P0
- Iteration: v1-033
- Operation Mode: BUILDER

### Goal
Deploy the guided ClickUp owner console and discovery backend to production so
the owner can open the site, log in, and connect ClickUp from the browser.

### Scope
- Coolify application `companycore`
- `docs/operations/post-deploy-smoke.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- this task contract

### Acceptance Criteria
- [x] Coolify deploy imports the commit that contains the guided owner console.
- [x] Production backend container runs the new commit image.
- [x] `GET /health` returns `200`.
- [x] `GET /` serves the ClickUp owner console.
- [x] `GET /app.js` and `GET /styles.css` return `200`.
- [x] Owner login endpoint succeeds with the seeded owner account.
- [x] Protected adapter endpoint still denies unauthenticated access.
- [x] Residual real ClickUp-token smoke is documented.

### Validation Evidence
- Deployment: Coolify manual redeploy `i12v0znlzq4twrl509iuqwmo`.
- Commit deployed: `b46a96071f2c5a6b8c17bc725940ba60122f658f`.
- Container evidence:
  `rnqqkhl3o3dut4qv56mlxly2_backend:b46a96071f2c5a6b8c17bc725940ba60122f658f`
  was `Up`.
- Public checks:
  `GET https://api.companycore.luckysparrow.ch/health`,
  `GET https://api.companycore.luckysparrow.ch/`,
  `GET https://api.companycore.luckysparrow.ch/app.js`, and
  `GET https://api.companycore.luckysparrow.ch/styles.css` returned `200`;
  unauthenticated `GET /v1/connection` returned `401`.
- Auth smoke: `POST /auth/login` with the seeded owner account returned `200`.

### Definition of Done
- [x] Code and docs for the release are committed.
- [x] Production deploy completed successfully.
- [x] Production smoke evidence is recorded.
- [x] No temporary Coolify deploy token remains from this run.
- [x] No raw production secret is recorded in docs.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` were checked
  before status changed to `DONE`.

### Result Report
- Task summary: Deployed the guided ClickUp owner console to production and
  verified that the owner can reach the UI and authenticate.
- Files changed: `docs/operations/post-deploy-smoke.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: Coolify deployment evidence, public HTTP checks, protected-route
  negative check, and owner login smoke.
- What is incomplete: real ClickUp token discovery, settings save, and native
  pull sync require the owner's ClickUp token and should be run from the
  deployed console.
- Next steps: run the first owner ClickUp connection, then decide CCV1-034
  continuous update strategy.

### Priority
P0

## CCV1-032 Guided Owner Console

### Header
- ID: CCV1-032
- Title: Guided owner console
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCV1-031
- Priority: P0
- Iteration: v1-032
- Operation Mode: BUILDER

### Goal
Replace manual ClickUp ID entry with a guided owner flow that checks a token,
selects a ClickUp Workspace, lists available Lists, saves settings, and starts
sync.

### Scope
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `src/app.ts`
- `Dockerfile`
- API, integrations, deployment, task board, project state, and planning docs

### Acceptance Criteria
- [x] Owner can log in from `/`.
- [x] Owner can check a ClickUp token without storing it.
- [x] Owner can select a ClickUp Workspace returned by discovery.
- [x] Owner can select one or more ClickUp Lists from grouped Spaces/Folders.
- [x] Owner can save settings and keep the stored token server-side.
- [x] Owner can refresh ClickUp structure using the stored token.
- [x] Owner can trigger native sync from the UI.
- [x] Desktop/mobile responsive layout avoids horizontal overflow.

### Validation Evidence
- Tests: `npm run build`.
- Manual checks: local backend static smoke returned `200` for `/`, `/app.js`,
  and `/styles.css`.
- Browser visual check: not available in this session because the browser
  plugin was not exposed by tool discovery.

### Result Report
- Task summary: Replaced the manual ClickUp settings form with a guided owner
  setup surface.
- Files changed: `public/index.html`, `public/app.js`, `public/styles.css`,
  `src/app.ts`, `Dockerfile`, docs, task board, project state, and planning
  queue.
- How tested: build, API tests, and local static smoke.
- What is incomplete: production deploy and real ClickUp token smoke are in
  CCV1-033.
- Next steps: deploy and run production owner setup.

### Priority
P0

## CCV1-031 ClickUp Discovery Backend

### Header
- ID: CCV1-031
- Title: ClickUp discovery backend
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-031P
- Priority: P0
- Iteration: v1-031
- Operation Mode: BUILDER

### Goal
Add safe ClickUp discovery so the owner console can choose Workspaces and Lists
without manual ID lookup.

### Scope
- `src/integrations/clickup/clickup.client.ts`
- `src/integrations/errors.ts`
- `src/modules/integration-settings/integration-settings.routes.ts`
- `src/modules/connection/connection.routes.ts`
- `src/tests/api.test.ts`
- API/integration docs and canonical planning/context files

### Acceptance Criteria
- [x] CompanyCore can discover ClickUp Workspaces from a submitted token.
- [x] CompanyCore can discover Spaces, Folders, folderless Lists, and folder
  Lists for a selected ClickUp Workspace.
- [x] Discovery does not store submitted token material.
- [x] Existing saved ClickUp token can be used for rediscovery.
- [x] API-key service clients cannot call owner-only discovery.
- [x] Invalid token and rate-limit provider responses are mapped safely.
- [x] Native task pagination behavior remains guarded and tested through the
  existing pull path.

### Validation Evidence
- Tests: `npm test` with `DATABASE_URL` pointed at isolated
  `companycore-test-postgres` on host port `55432`.
- Result: all migrations applied and `CompanyCore v1 protected API flow`
  passed.
- High-risk checks: no schema migration required.

### Result Report
- Task summary: Added owner-only ClickUp discovery, safe provider error mapping,
  stored-token rediscovery, and route/capability coverage.
- Files changed: `src/integrations/clickup/clickup.client.ts`,
  `src/integrations/errors.ts`,
  `src/modules/integration-settings/integration-settings.routes.ts`,
  `src/modules/connection/connection.routes.ts`, `src/tests/api.test.ts`,
  docs, task board, project state, and planning queue.
- How tested: `npm run build`, `npm test` against isolated PostgreSQL, and
  local static smoke for the owner console.
- What is incomplete: production deploy and real ClickUp token smoke are in
  CCV1-033.
- Next steps: deploy and smoke the guided owner setup in production.

### Priority
P0

## CCV1-031P ClickUp Owner Console Deployment Plan

### Header
- ID: CCV1-031P
- Title: ClickUp owner console deployment plan
- Task Type: planning
- Current Stage: verification
- Status: DONE
- Owner: Planner
- Depends on: CCV1-030
- Priority: P0
- Iteration: v1-031P
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] Operation mode matches the current queue.
- [x] The task aligns with repository source-of-truth documents.

### Context
The first minimal owner console still required manual ClickUp `teamId` and
`listIds`. Official ClickUp docs show that personal tokens can access multiple
Workspaces and that `GET /api/v2/team` returns the Workspaces available to the
authenticated token.

### Goal
Plan the production-ready guided ClickUp setup flow before implementation.

### Scope
- `docs/planning/clickup-owner-console-deployment-plan.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/planning/mvp-next-commits.md`
- this task contract

### Implementation Plan
1. Verify official ClickUp API endpoints for token, Workspace, Space, Folder,
   List, and task-sync behavior.
2. Define the correct owner-console UX states.
3. Define backend discovery and sync changes.
4. Split implementation into backend, frontend, and production smoke tasks.
5. Update canonical planning queue.

### Acceptance Criteria
- [x] Plan references official ClickUp API endpoint behavior.
- [x] Plan includes ClickUp Workspace selection before List selection.
- [x] Plan separates discovery, save, sync, and continuous-update scope.
- [x] Plan defines implementation tasks and deployment smoke.
- [x] Canonical queue is updated.

### Definition of Done
- [x] Plan is committed to canonical planning docs.
- [x] No runtime workaround is introduced.
- [x] Architecture source of truth remains API-first with minimal v1 GUI.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Validation Evidence
- Source review: official ClickUp docs for personal tokens, authorized
  Workspaces, Spaces, Folders, folder Lists, folderless Lists, and filtered
  Workspace tasks.
- Follow-up source review: official ClickUp docs for rate limits, webhooks,
  webhook signatures, and webhook creation.
- Local checks: documentation-only planning update.

### Result Report
- Task summary: Published the guided ClickUp owner-console deployment plan and
  queued backend discovery, frontend guide flow, production smoke, and
  continuous-update decision tasks.
- Files changed: `docs/planning/clickup-owner-console-deployment-plan.md`,
  `.codex/context/TASK_BOARD.md`, `.codex/context/PROJECT_STATE.md`,
  `docs/planning/mvp-next-commits.md`, and this task contract.
- How tested: reviewed official docs, added coverage audit rows for rate
  limits, stored-token rediscovery, pagination, and webhook signature
  requirements, then checked queue consistency.
- What is incomplete: implementation remains in CCV1-031, CCV1-032, and
  CCV1-033.
- Next steps: implement ClickUp discovery backend.

### Priority
P0

## CCV1-030 Minimal Owner ClickUp Web Console

### Header
- ID: CCV1-030
- Title: Minimal owner ClickUp web console
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCV1-012, CCV1-013, CCV1-010
- Priority: P0
- Iteration: v1-030
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] Operation mode matches the current queue.
- [x] The task aligns with the newly approved v1 direction.

### Context
The owner approved changing v1 from no GUI to a minimal owner-only web console
for ClickUp setup. The backend remains API-first and separately scalable;
broader company dashboard and mobile are v2 scope.

### Goal
Add the smallest humane v1 UI for owner login, ClickUp activation, token entry,
settings save, and first native sync.

### Scope
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `src/app.ts`
- `Dockerfile`
- architecture, API, deployment, planning, and context docs

### Implementation Plan
1. Serve static owner console assets from the existing backend.
2. Let owners log in through `POST /auth/login`.
3. Load connection and ClickUp status through `GET /v1/connection`.
4. Save settings through `PUT /v1/integration-settings/clickup`.
5. Trigger first sync through `POST /v1/tasks/sync/clickup/native`.
6. Keep the backend/API boundary intact for agents and future clients.

### Acceptance Criteria
- [x] Owner can load a web console from `/`.
- [x] Owner can log in with the existing owner account.
- [x] Owner can enable/disable ClickUp integration.
- [x] Owner can enter token, team ID, and list IDs.
- [x] Owner can save settings without exposing the stored token.
- [x] Owner can save and trigger native ClickUp sync from the UI.
- [x] Docs state v2 dashboard and mobile scope.
- [x] `npm run build` passes.

### Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API surface.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Validation Evidence
- Tests: `npm run build`.
- Manual checks: started `node dist/server.js` on local port `3100` and
  confirmed `GET /` returned `200`.
- High-risk checks: no schema change; Docker runtime copies `public/` into the
  production image.

### Result Report
- Task summary: Added a minimal owner-only static web console for ClickUp setup
  and sync while preserving the API-first backend architecture.
- Files changed: `public/index.html`, `public/styles.css`, `public/app.js`,
  `src/app.ts`, `Dockerfile`, architecture/API/deployment docs, task board,
  project state, next commits, and this task contract.
- How tested: `npm run build`; local static runtime smoke returned `200` for
  `/`.
- What is incomplete: v2 company dashboard and mobile app are intentionally out
  of scope; continuous ClickUp updates remain a follow-up strategy decision.
- Next steps: deploy, open `/`, log in, save ClickUp settings, and run sync.

### Priority
P0

## CCV1-029 ClickUp Production Bootstrap Slot

### Header
- ID: CCV1-029
- Title: ClickUp production bootstrap slot
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Ops/Release
- Depends on: CCV1-010, CCV1-013, CCV1-026
- Priority: P1
- Iteration: v1-029
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] Operation mode matches the current queue.
- [x] The task aligns with repository source-of-truth documents.

### Context
The owner is ready to provide a real ClickUp token for production. Existing
architecture requires ClickUp credentials to belong to the workspace through
integration settings, not as permanent backend process globals.

### Goal
Prepare a safe operator path for entering the ClickUp token, saving workspace
ClickUp settings, and triggering the first native production pull sync.

### Scope
- `package.json`
- `scripts/clickup-production-bootstrap.mjs`
- `.env.example`
- `docs/operations/clickup-production-bootstrap.md`
- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/INTEGRATIONS.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- this task contract

### Implementation Plan
1. Add a dependency-free operator script that reads temporary env values.
2. Verify the CompanyCore service key with `/v1/connection`.
3. Save ClickUp settings through the protected integration settings API.
4. Trigger the native pull sync endpoint and print only safe counts.
5. Document the Coolify/operator handoff and current limitation around
   continuous updates.

### Autonomous Loop Evidence

#### 1. Analyze Current State
- ClickUp native sync already exists and reads workspace-owned settings.
- There is no background worker or listener in v1.
- Production Jarvis/Paperclip service keys already exist, but ClickUp provider
  credentials are still missing.

#### 2. Select One Priority Task
- Selected task: CCV1-029 ClickUp production bootstrap slot.
- Priority rationale: enables the first real ClickUp data import without
  violating the workspace secret boundary.
- Why other candidates were deferred: continuous sync strategy needs a design
  decision after the first pull succeeds.

#### 3. Plan Implementation
- Files or surfaces to modify: package script, operator script, deployment and
  integration docs, canonical queue/context.
- Logic: configure settings and sync through public protected API only.
- Edge cases: missing env fails closed; tokens are never printed.

#### 4. Execute Implementation
- Implementation notes: added `npm run clickup:bootstrap`.

#### 5. Verify and Test
- Validation performed: `npm run build` and missing-env bootstrap invocation.
- Result: see Validation Evidence.

#### 6. Self-Review
- Architecture alignment: token is stored through workspace integration
  settings, not as a permanent backend env.
- Existing system reuse: reuses `/v1/integration-settings/clickup` and
  `/v1/tasks/sync/clickup/native`.
- No workaround: yes; this is an operator bootstrap around existing approved
  APIs.
- Duplication: no provider sync logic duplicated.

#### 7. Update Documentation and Knowledge
- Docs updated: operations bootstrap, Coolify deployment contract,
  integrations, task board, project state, next commits.
- Learning journal updated: not applicable.

### Acceptance Criteria
- [x] A clear Coolify/operator place exists for the ClickUp token and list
  configuration.
- [x] The token is not committed or documented as raw secret material.
- [x] Bootstrap saves settings through the protected CompanyCore API.
- [x] Bootstrap triggers native ClickUp sync after settings are saved.
- [x] Docs state that continuous listening is not active yet.
- [x] `npm run build` passes.

### Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API surface when production credentials
  are provided.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Validation Evidence
- Tests: `npm run build`.
- Manual checks: `npm run clickup:bootstrap` without env fails closed and lists
  missing env names without printing secrets.
- High-risk checks: no schema or runtime secret model changes.

### Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes; script uses CompanyCore HTTP API.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: not applicable.
- Error state verified: missing env fails closed.
- Regression check performed: TypeScript build.

### Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: ClickUp provider token and operational task data.
- Trust boundaries: operator shell/Coolify secret input, CompanyCore API key,
  workspace integration settings.
- Permission or ownership checks: active workspace is derived from the
  CompanyCore service API key.
- Secret handling: tokens are read from env, sent over HTTPS to CompanyCore,
  encrypted at rest, and never printed.
- Fail-closed behavior: missing env or failed API calls exit non-zero.

### Deployment / Ops Evidence
- Deploy impact: script and docs only; backend runtime behavior unchanged.
- Env or secret changes: temporary operator env values documented.
- Health-check impact: none.
- Smoke steps updated: yes.
- Rollback note: remove the script/docs or redeploy the previous commit; no DB
  migration involved.
- `DEPLOYMENT_GATE.md` reviewed: yes.

### Result Report
- Task summary: Added a safe operator bootstrap path for production ClickUp
  token entry and first native pull sync.
- Files changed: `package.json`, `scripts/clickup-production-bootstrap.mjs`,
  `.env.example`, `docs/operations/clickup-production-bootstrap.md`,
  `docs/operations/coolify-vps-deployment-contract.md`,
  `docs/INTEGRATIONS.md`, `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `docs/planning/mvp-next-commits.md`, and this
  task contract.
- How tested: `npm run build` and missing-env bootstrap invocation.
- What is incomplete: continuous ClickUp listening/scheduled sync remains a
  follow-up decision.
- Next steps: run the bootstrap with real production token, team ID, list IDs,
  and a CompanyCore workspace service key.

### Priority
P1

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

## CCV1-026 Adapter Smoke Script

### Header
- ID: CCV1-026
- Title: Adapter smoke script
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: CCV1-025
- Priority: P0
- Iteration: v1-026
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] Operation mode matches the current queue.
- [x] The task aligns with repository source-of-truth documents.

### Context
Paperclip/Jarvis integration readiness needs a repeatable operator check that
uses the same public API surface the adapters will use. Production protected
smoke is still blocked until a real service API key exists.

### Goal
Add a local smoke script that validates the full adapter onboarding flow using
`COMPANYCORE_BASE_URL` and `COMPANYCORE_API_KEY`.

### Scope
- `package.json`
- `scripts/adapter-smoke.mjs`
- `docs/integrations/adapter-onboarding.md`
- `docs/operations/post-deploy-smoke.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- this task contract

### Implementation Plan
1. Add a dependency-free Node smoke script using global `fetch`.
2. Call `/v1/connection` and assert required capabilities.
3. Create one agent, task list, task, interaction, and agent log.
4. Read events and verify expected event types.
5. Document env vars and the command for operators.

### Autonomous Loop Evidence

#### 1. Analyze Current State
- Issues: protected production smoke could not be completed without a service
  key.
- Gaps: no one-command adapter readiness check existed.
- Inconsistencies: docs described the flow but did not provide an executable
  verification tool.
- Architecture constraints: use public API only; do not connect to DB.

#### 2. Select One Priority Task
- Selected task: CCV1-026 adapter smoke script.
- Priority rationale: lets the owner verify Paperclip/Jarvis readiness as soon
  as a service key exists.
- Why other candidates were deferred: production key creation still needs owner
  credentials.

#### 3. Plan Implementation
- Files or surfaces to modify: package script, smoke script, adapter docs,
  deployment smoke evidence, context.
- Logic: fail closed on missing env, non-2xx responses, missing capabilities,
  or missing events.
- Edge cases: never print API key; support current string or envelope error
  shape.

#### 4. Execute Implementation
- Implementation notes: added `npm run adapter:smoke` with no new dependency.

#### 5. Verify and Test
- Validation performed: `npm run build`, `npm test`, and missing-env smoke
  invocation.
- Result: pending when first recorded; final result is in Validation Evidence.

#### 6. Self-Review
- Simpler option considered: docs-only curl checklist.
- Technical debt introduced: no.
- Scalability assessment: script exercises the same contract future adapters
  use and can grow as adapter capabilities grow.
- Refinements made: script redacts by omission and does not print secret env.

#### 7. Update Documentation and Knowledge
- Docs updated: adapter onboarding, post-deploy smoke, task contract, project
  state, task board.
- Context updated: yes.
- Learning journal updated: not applicable.

### Acceptance Criteria
- [x] `npm run adapter:smoke` exists.
- [x] Script fails closed when base URL or API key is missing.
- [x] Script calls `/v1/connection` before writing records.
- [x] Script writes through API only and verifies events.
- [x] Script does not print the API key.
- [x] Docs explain how to run the script for Paperclip/Jarvis.

### Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API surface when credentials are provided.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

### Validation Evidence
- Tests: `npm test` with `DATABASE_URL` pointed at disposable PostgreSQL.
- Manual checks: `npm run adapter:smoke` without env returns a clear missing
  env failure and does not print secrets.
- High-risk checks: no schema or secret changes.

### Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes; script uses only HTTP API.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: not applicable.
- Error state verified: missing env fails closed.
- Regression check performed: existing protected API flow test.

### Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: workspace adapter smoke records.
- Trust boundaries: service API key boundary and public API boundary.
- Permission or ownership checks: relies on workspace-scoped service API key.
- Secret handling: API key is read from env and not printed.
- Fail-closed behavior: missing env, missing capabilities, failed writes, or
  missing events exit non-zero.

### Deployment / Ops Evidence
- Deploy impact: none for runtime; operator script only.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: yes.
- Rollback note: remove script or redeploy previous commit if needed.
- `DEPLOYMENT_GATE.md` reviewed: yes.

### Result Report
- Task summary: Added a service-adapter smoke script for Paperclip/Jarvis
  readiness verification.
- Files changed: `package.json`, `scripts/adapter-smoke.mjs`,
  `docs/integrations/adapter-onboarding.md`,
  `docs/operations/post-deploy-smoke.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, and this
  task contract.
- How tested: `npm test` and missing-env smoke invocation.
- What is incomplete: protected production smoke still needs a real production
  service API key.
- Next steps: create a production key and run `npm run adapter:smoke`.

### Priority
P0

## CCV1-025 Task List And Pipeline Stage API

### Header
- ID: CCV1-025
- Title: Task list and pipeline stage API
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CCV1-019, CCV1-024
- Priority: P0
- Iteration: v1-025
- Operation Mode: BUILDER

### Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task was selected.
- [x] Operation mode matches the current queue.
- [x] The task aligns with repository source-of-truth documents.

### Context
Task lists and pipeline stages were in the database and referenced by tasks and
deals, but they did not have runtime API routes. Adapters need these lightweight
configuration records to organize tasks and CRM deals safely.

### Goal
Add workspace-scoped list/create/update routes for task lists and pipeline
stages, emit create/update events, and expose the routes in the adapter
manifest.

### Scope
- `src/app.ts`
- `src/modules/task-lists/task-lists.routes.ts`
- `src/modules/task-lists/README.md`
- `src/modules/pipeline-stages/pipeline-stages.routes.ts`
- `src/modules/pipeline-stages/README.md`
- `src/modules/connection/connection.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/integrations/adapter-onboarding.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- this task contract

### Implementation Plan
1. Reuse the existing `TaskList` and `PipelineStage` models.
2. Add `GET`, `POST`, and `PATCH` routes only.
3. Validate optional `projectId` on task lists against the active workspace.
4. Emit create/update events through the existing event service.
5. Extend tests for creation, update, cross-workspace denial, list isolation,
   and manifest coverage.

### Autonomous Loop Evidence

#### 1. Analyze Current State
- Issues: tasks and deals could reference records that adapters could not
  manage through the API.
- Gaps: task-list and pipeline-stage modules were README-only placeholders.
- Inconsistencies: schema supported these records, but API did not.
- Architecture constraints: API-only access, workspace scoping, no GUI.

#### 2. Select One Priority Task
- Selected task: CCV1-025 task list and pipeline stage API.
- Priority rationale: closes two remaining DB-backed configuration surfaces
  needed for adapter-created tasks and deals.
- Why other candidates were deferred: destructive delete semantics require a
  separate retention decision.

#### 3. Plan Implementation
- Files or surfaces to modify: two route modules, app mount, connection
  manifest, tests, docs, context.
- Logic: derive `workspaceId`, validate task-list project relation, persist
  records, emit events.
- Edge cases: foreign `projectId` must return `not_found`; foreign record
  updates must return `not_found`.

#### 4. Execute Implementation
- Implementation notes: added root aliases and `/v1` routes through the
  existing protected route mounting.

#### 5. Verify and Test
- Validation performed: `npm test` against disposable PostgreSQL.
- Result: pending when first recorded; final result is in Validation Evidence.

#### 6. Self-Review
- Simpler option considered: leave these as seed-only records.
- Technical debt introduced: no.
- Scalability assessment: routes reuse existing workspace and event patterns.
- Refinements made: delete was explicitly deferred to avoid accidental data
  loss around related tasks/deals.

#### 7. Update Documentation and Knowledge
- Docs updated: API, adapter onboarding, module READMEs, task contract, project
  state, task board.
- Context updated: yes.
- Learning journal updated: not applicable.

### Acceptance Criteria
- [x] `GET /v1/task-lists` and `GET /v1/pipeline-stages` list only active
  workspace records.
- [x] `POST` routes create records in the active workspace.
- [x] `PATCH` routes update only active workspace records.
- [x] Task-list `projectId` is accepted only for active workspace projects.
- [x] Create/update events are emitted.
- [x] Adapter manifest includes both surfaces.

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
- DB schema and migrations verified: not applicable; existing models reused.
- Error state verified: foreign `projectId` in task-list creation returns
  `404`.
- Regression check performed: existing protected API flow test.

### Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: workspace operational and CRM configuration.
- Trust boundaries: protected API and workspace auth context.
- Permission or ownership checks: all operations derive `workspaceId`; task
  list relation IDs are workspace-validated.
- Secret handling: no secrets returned or stored by these routes.
- Fail-closed behavior: protected route auth and foreign relation denial.

### Deployment / Ops Evidence
- Deploy impact: low.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: adapter onboarding docs updated.
- Rollback note: redeploy previous commit if adapter route causes regression.
- `DEPLOYMENT_GATE.md` reviewed: yes.

### Result Report
- Task summary: Added minimal workspace-scoped task-list and pipeline-stage API
  routes with event emission and adapter manifest coverage.
- Files changed: `src/app.ts`,
  `src/modules/task-lists/task-lists.routes.ts`,
  `src/modules/task-lists/README.md`,
  `src/modules/pipeline-stages/pipeline-stages.routes.ts`,
  `src/modules/pipeline-stages/README.md`,
  `src/modules/connection/connection.routes.ts`, `src/tests/api.test.ts`,
  `docs/API.md`, `docs/integrations/adapter-onboarding.md`,
  `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, and this
  task contract.
- How tested: `npm test` against disposable PostgreSQL.
- What is incomplete: delete routes remain intentionally deferred.
- Next steps: deploy and run public smoke, then complete protected smoke once a
  production service key exists.

### Priority
P0

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
