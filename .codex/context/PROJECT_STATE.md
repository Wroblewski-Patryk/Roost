# PROJECT_STATE

Last updated: 2026-05-03

## Product Snapshot
- Name: LuckySparrow Company Core
- Goal: Central backend for company projects, goals, tasks, CRM, notes,
  decisions, agents, and system events.
- Commercial model: Internal operational infrastructure.
- Current phase: v2 Google Drive integration planning and implementation.

## Product Decisions (Confirmed)
- 2026-05-03: v1 includes a minimal owner-only web console for production
  ClickUp connection setup. A broader company operations dashboard and mobile
  app are v2 scope; mobile should follow the web product shape.
- 2026-05-03: CompanyCore should evolve toward a ClickUp-shaped operating
  model: `Workspace -> Operating Area -> Operating Folder -> Operating Table
  -> Record`, mapped to ClickUp `Team/Workspace -> Space -> Folder -> List ->
  Task`. Business tables must be assigned to one of 12 approved operating
  areas, while users, memberships, API keys, integration settings, provider
  mappings, and platform metadata remain system tables.
- 2026-05-03: Provider API work must check current official provider
  documentation before mapping or implementation. For ClickUp this includes
  hierarchy terminology, Custom Fields, Views, rate limits, pagination,
  webhook signatures, and permissions.
- 2026-05-03: Google Drive is approved as the next native v2 integration.
  Drive folders/files must map into the same workspace operating model as
  ClickUp so one company area can show ClickUp Lists, Drive folders/files,
  storage locations, knowledge roots, automations, and CompanyCore tables
  consistently. Google Drive uses OAuth-backed workspace integration settings,
  encrypted refresh-token material, paginated Drive file discovery, Docs/Sheets
  read/edit/create APIs, Drive Changes freshness, and CompanyCore API access
  for Jarvis, Paperclip, Aviary, and future GUI clients.
- 2026-05-03: Provider-to-operating-area mappings must be operator-editable in
  the owner console. Automatic classification is only the first pass; manual
  ClickUp List/Folder/Space and Google Drive folder assignments are persisted
  and must be preserved by future synchronization.
- 2026-05-03: ClickUp imports must expose an explicit existing-record policy
  before writing. Approved v1 modes are `merge`, `skip_existing`,
  `replace_selected_lists`, and `inspect_only`; destructive cleanup is limited
  to `source = clickup` records in the selected ClickUp List scope and must not
  delete native/manual CompanyCore records.
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
- Background jobs / workers: lightweight in-process ClickUp maintenance
  scheduler in the backend; no separate worker tier in v1.
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
- Public URLs / ports: backend on `3000`; `companycore.luckysparrow.ch` is the
  web UI domain and `api.companycore.luckysparrow.ch` is the API domain.
- Backup / restore expectation: Postgres volume backups required before
  production use.
- Rollback trigger and method: redeploy previous image/commit and preserve
  Postgres volume.

## Current Focus
- Main active objective: refine the v2 web console as the operator-facing
  control surface for company-area mapping across ClickUp, Google Drive, and
  CompanyCore tables, while keeping deployable work consolidated on `main`.
- Top blockers: no active P0/P1 v2 web console blocker after the dedicated
  operating-areas route. GitHub-to-Coolify deploy no longer requires GitHub
  Actions for CompanyCore; Coolify Auto Deploy is enabled on `main`, received
  commit `63348d6`, and succeeded after the compose file was reloaded.
- Success criteria for this phase: Google Drive folder/file metadata,
  searchable content snapshots, Docs/Sheets create/read/edit flows, Drive
  freshness, agent API access, operating-area dashboard mapping, and manual
  provider scope correction are implemented through the native integration
  pattern.

## Autonomous Iteration State
- Current iteration: V2WEB-008 Dashboard Command Center.
- Current operation mode: BUILDER
- Last completed iteration: V2WEB-007 Dedicated Pipeline View.
- Last completed task: added dashboard command-center signals, live module
  metadata, and recommended next action copy from implemented frontend data.
- Next required mode: BUILDER for the next v2 web console iteration unless an
  architecture decision blocks the queue first.

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
- 2026-05-03: Completed CCV1-033 by manually redeploying CompanyCore in
  Coolify/VPS. Deployment `i12v0znlzq4twrl509iuqwmo` imported commit
  `b46a96071f2c5a6b8c17bc725940ba60122f658f`; the backend container now runs
  image tag `b46a96071f2c5a6b8c17bc725940ba60122f658f`. Public smoke confirmed
  `GET /health`, `/`, `/app.js`, and `/styles.css` return `200`,
  unauthenticated `/v1/connection` returns `401`, and owner login succeeds.
  A real ClickUp token was not available in-session, so first token discovery,
  settings save, and native pull sync remain an operator action through the
  deployed owner console.
- 2026-05-03: Completed CCV1-034 by auditing the current schema and code
  against the desired ClickUp-shaped operating model. Current code correctly
  enforces workspace ownership for v1 records and supports ClickUp discovery,
  but it does not yet persist CompanyCore equivalents for ClickUp Spaces,
  Folders, Lists as a general table registry, Views, Custom Fields, storage
  roots, knowledge roots, or automation scopes. Added the architecture and
  planning contract for the 12-area operating model and queued CCV1-034A
  through CCV1-034E.
- 2026-05-03: Completed CCV1-034A and CCV1-034B by implementing the operating
  model registry runtime slice. Added Prisma models and migration for
  operating areas, folders, tables, external container/field mappings, storage
  locations, knowledge roots, and automation definitions; registration and
  seed paths now create the 12 approved operating areas and first-party table
  assignments. ClickUp discovery persists Workspace/Space/Folder/List mappings
  and ClickUp Lists as operating tables. Native ClickUp task sync now preserves
  priority and attaches imported tasks to a matching `task_lists` row by
  ClickUp List ID. `npm test` passed against a disposable PostgreSQL database
  on `localhost:55432`.
- 2026-05-03: Completed CCV1-034B2, CCV1-034C, CCV1-034D, and CCV1-034E by
  adding dedicated `/v1/operating-model/*` read/write APIs, persisting ClickUp
  Workspace/List Views and Workspace/Space/Folder/List Custom Field metadata,
  and exposing scoped storage locations, knowledge roots, and automation
  definitions. Scope writes validate `areaId`, `folderId`, and `tableId`
  inside the active workspace and fail closed for foreign IDs. `npm test`
  passed against disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Completed CCV1-035 by hardening the first-run ClickUp import
  path. Native sync now supports `merge`, `skip_existing`,
  `replace_selected_lists`, and `inspect_only`; the owner console and
  production bootstrap expose the same policy; sync responses include
  `deletedCount`, `wouldCreateCount`, and `wouldUpdateCount`; and regression
  tests prove priorities/list placement, skip-existing behavior, inspect-only
  no-write behavior, and replace-selected-list deletion limited to ClickUp-owned
  tasks.
- 2026-05-03: Deployed the ClickUp first-run import policy to production.
  Auto-deploy did not immediately update the running image after push, so a
  temporary Coolify API token was used for manual deploy
  `gpos2n2ll9x301v6h3qlit8x` and then deleted. The backend image ran commit
  `0ed8c96896f7c2b754a24f35843a16e1737ba6e0`; logs showed no pending
  migrations and server start; public `/health` and `/v1/health` returned
  `200`; unauthenticated `/v1/connection` returned `401 missing_api_key`; and
  the owner console served the new ClickUp `Import mode` selector with
  `Inspect only`.
- 2026-05-03: Approved ClickUp webhooks as the next continuous update strategy
  instead of scheduled-only sync. Official ClickUp docs were reviewed for
  Create/Get/Update/Delete Webhook endpoints, user-token ownership, webhook
  health behavior, `X-Signature` HMAC SHA-256 verification, and task webhook
  payloads including `taskStatusUpdated`. Added
  `docs/planning/clickup-webhook-trigger-plan.md` and queued CCV1-036A through
  CCV1-036F to implement webhook schema/security, registration, receiver,
  task processing, agent event bridge, and production smoke.
- 2026-05-03: Improved the owner ClickUp List selection flow after real token
  testing reached Workspace discovery but did not make List selection obvious.
  The settings console now has an explicit `Load Lists` action, clearer no-list
  messaging, and `Select all` / `Clear all` controls for multiselect List
  setup before the first import.
- 2026-05-03: Fixed the production ClickUp List load failure found during real
  owner testing. ClickUp returned a non-array `required_views` value from a
  Views endpoint, which caused discovery persistence to throw
  `internal_server_error` before Lists rendered. The ClickUp client now treats
  non-array `views`/`required_views` values as empty arrays, and Workspace
  selection no longer auto-loads Lists before the owner clicks `Load Lists`.
- 2026-05-03: Added the first Dashboard data table for tasks so the owner can
  immediately verify whether ClickUp import created records. `/v1/tasks` now
  includes safe task list metadata, and the Dashboard renders title, status,
  priority, list, source, and due date with a manual refresh action.
- 2026-05-03: Fixed ClickUp settings save after real owner testing showed
  `internal_server_error` and `ClickUp is not configured for this workspace
  yet`. Root cause was the integration settings route building a Prisma upsert
  `create` payload with `encryptSecret(undefined)` when updating an existing
  setting without re-pasting the ClickUp token. The route now uses explicit
  update/create paths and preserves the encrypted secret on config-only saves.
- 2026-05-03: Production ClickUp setting inspection showed the owner-selected
  ClickUp lists and encrypted token were saved, but the integration was
  inactive (`active=false`), causing native sync to return
  `integration_not_configured`. Updated the owner console so `Save and sync`
  forces the ClickUp setting active before syncing and the Active checkbox
  refreshes button state immediately.
- 2026-05-03: Audited the first real ClickUp import through CompanyCore/Jarvis.
  Production CompanyCore contains 224 tasks total, 219 from ClickUp, all
  ClickUp tasks have `externalId` and a mapped task list, 55 ClickUp tasks have
  descriptions, 55 have priorities, and 0 currently have due dates. Missing
  descriptions/priorities appear to be provider data absence rather than import
  loss because the mapper uses `markdown_description`, `description`, then
  `text_content` from ClickUp.
- 2026-05-03: Completed CCV1-036A by adding webhook registration,
  provider-event inbox, and agent-event outbox tables, a raw-body
  `/v1/webhooks/clickup` route mounted before JSON parsing, and ClickUp HMAC
  SHA-256 signature helpers. Official ClickUp docs were checked again for
  webhook ownership, raw-body signatures, idempotency, task events, and
  task update API shape. `npm test` passed against a disposable PostgreSQL
  database on `localhost:55432`.
- 2026-05-03: Completed CCV1-036B through CCV1-036E plus CCV1-036G. The
  backend can reconcile ClickUp List webhooks from selected workspace settings,
  store returned webhook secrets encrypted, verify incoming ClickUp signatures,
  persist provider inbox rows idempotently, fetch full ClickUp task data for
  task events, update CompanyCore task records, emit internal ClickUp events,
  publish provider-neutral agent events for Paperclip/Jarvis/Aviary, and write
  supported CompanyCore edits for ClickUp-sourced tasks back to ClickUp.
  `npm test` passed against disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed the ClickUp live sync bridge to production with Coolify
  manual deploy `e12x9rc7i8071qfnrzh6u1hh` at commit
  `75df028f9dc3cab59f026fd7d2c5fef430e6d5ea`; the temporary deploy token was
  deleted. Production applied migration
  `202605032_clickup_webhook_foundation`, registered 21 active ClickUp List
  webhooks, accepted a signed production webhook smoke for a real ClickUp task,
  processed the provider inbox row, and exposed a pending
  `task_status_updated_from_clickup` agent event readable by Jarvis's
  CompanyCore API key.
- 2026-05-03: Completed the natural production ClickUp roundtrip smoke for
  CCV1-036F. A real ClickUp-sourced task (`86c5fqumu`) was patched through
  CompanyCore, which wrote the change back to ClickUp; ClickUp then delivered
  two natural signed `taskUpdated` webhooks back to CompanyCore, both verified
  and processed. The task title was restored to its original value.
- 2026-05-03: Completed CCV1-041 by comparing CompanyCore against `!template`.
  The autonomous engineering loop document and agent role updates were already
  present. Synced the remaining missing governance references into
  `.codex/context/PROJECT_STATE.md`, added a full CompanyCore docs index to
  `docs/README.md`, and recorded the task in `.codex/context/TASK_BOARD.md`.
- 2026-05-03: Completed CCV1-042 locally by extending the ClickUp API bridge
  beyond pull/import and PATCH write-back. CompanyCore now creates ClickUp
  tasks before local persistence when a task targets a ClickUp-sourced list,
  archives ClickUp-sourced tasks in ClickUp before local archival, writes
  mapped ClickUp Custom Field values, deletes individual ClickUp webhook
  registrations, and reconciles webhook health by comparing local
  registrations with ClickUp's remote webhook list. `npm test` passed against
  disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed CCV1-042 to production with Coolify deployment
  `ff9gg7qsboy073lxpesyusth` at commit
  `c555c4dc3aa45438fd06a81be27e11f050f67693`. The backend image now runs
  `rnqqkhl3o3dut4qv56mlxly2_backend:c555c4dc3aa45438fd06a81be27e11f050f67693`,
  migration deploy reported no pending migrations, and public `/health` plus
  `/v1/health` returned `200`. Jarvis's CompanyCore API key verified protected
  reads for `/v1/connection`, `/v1/tasks` with 224 records,
  `/v1/integration-settings/clickup/webhooks` with 21 registrations, and
  `/v1/agent-events`; the adapter manifest exposes the new Custom Field and
  webhook-delete capabilities.
- 2026-05-03: Completed CCV1-043 locally by adding ClickUp task comment
  bridging. ClickUp `taskCommentPosted` and comment-field webhook payloads now
  create or update CompanyCore notes attached to the mapped task and emit a
  provider-neutral agent event. CompanyCore `POST /v1/notes` against a
  ClickUp-sourced task now creates a ClickUp task comment first and stores the
  returned ClickUp comment ID. Added a unique note external identity migration
  for `(workspace_id, source, external_id)`. `npm test` passed against
  disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed CCV1-043 to production with Coolify deployment
  `q10fr3oviut7kkoxdkdfu0f6` at commit
  `28fc77b88722c5798ab630d0ef9d93e4a0f3dc84`. The backend image now runs
  `rnqqkhl3o3dut4qv56mlxly2_backend:28fc77b88722c5798ab630d0ef9d93e4a0f3dc84`,
  migration `202605033_clickup_note_external_identity` applied successfully,
  public `/health` and `/v1/health` returned `200`, and Jarvis's CompanyCore
  API key verified protected reads for `/v1/connection`, `/v1/notes`, and
  `/v1/agent-events`.
- 2026-05-03: Completed CCV1-044 locally by adding retry observability for the
  ClickUp provider event inbox. Failed webhook processing rows now record
  `last_error_code`, `GET /v1/integration-settings/clickup/events` returns safe
  inbox metadata without raw provider payloads, and owner users can call
  `POST /v1/integration-settings/clickup/events/retry-failed` to replay failed
  rows through the same idempotent task/comment processor. Regression coverage
  creates a failed inbox row, lists it, retries it, verifies the ClickUp task is
  recovered, and confirms `lastErrorCode` is cleared. `npm test` passed against
  disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed CCV1-044 to production by manually rolling over the
  backend container because Coolify's deployment queue was full with unrelated
  services. The deployed image is
  `rnqqkhl3o3dut4qv56mlxly2_backend:90c209e2a8398b7b9117ec51f72d85e97e0e80cb`.
  Startup applied migration `202605034_clickup_event_retry_observability`,
  public `/health` and `/v1/health` returned `200`, and Jarvis's CompanyCore
  API key verified `/v1/connection`,
  `/v1/integration-settings/clickup/events`, and
  `/v1/integration-settings/clickup/events?status=failed` with safe metadata.
- 2026-05-03: Completed CCV1-045 locally by adding
  `POST /v1/integration-settings/clickup/maintenance/run`. The endpoint is
  available to authenticated workspace callers, runs webhook reconciliation,
  failed-event replay, and a non-destructive ClickUp task pull fallback using
  `merge` by default. It allows `merge`, `skip_existing`, and `inspect_only`,
  but intentionally excludes `replace_selected_lists` from always-on
  maintenance. Regression coverage calls the endpoint with a service API key,
  recreates a missing selected-list webhook, syncs a fallback ClickUp task, and
  verifies no failed inbox rows remain. `npm test` passed against disposable
  PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed CCV1-045 to production by manually rolling over the
  backend container because Coolify's unrelated deployment queue remained full.
  The deployed image is
  `rnqqkhl3o3dut4qv56mlxly2_backend:ea1856dace47385ddb69645a697df5b5e3a71206`.
  Startup reported no pending migrations, public `/health` and `/v1/health`
  returned `200`, and Jarvis's CompanyCore API key verified
  `/v1/integration-settings/clickup/maintenance/run` with `inspect_only`:
  21 webhook registrations reconciled, 0 failed events retried, 219 ClickUp
  tasks inspected, and 0 failed inbox rows remained.
- 2026-05-03: Completed CCV1-046 locally by adding an in-process ClickUp
  maintenance scheduler. It starts with the backend when
  `COMPANYCORE_PUBLIC_API_BASE_URL` is configured, clamps cadence to at least 5
  minutes, and always uses `merge` so scheduled freshness never performs a
  destructive import repair.
- 2026-05-03: Deployed CCV1-046 to production by manually rolling over the
  backend container because Coolify's unrelated deployment queue remained full.
  The deployed image is
  `rnqqkhl3o3dut4qv56mlxly2_backend:419dbafb11f1558a185ddd428e67073c3a89f0f6`.
  Startup logs confirmed `clickup maintenance scheduler enabled every 15
  minutes`. Public `/health`, `/v1/health`, Jarvis-key `/v1/connection`, and
  maintenance `inspect_only` smoke passed; the smoke refreshed 21 webhook
  registrations, inspected 219 ClickUp tasks, and left 0 failed provider inbox
  rows.
- 2026-05-03: Completed CCV1-047 by adding and deploying the Paperclip
  application-side CompanyCore adapter on production Paperclip. The adapter
  reads `COMPANYCORE_BASE_URL` and `COMPANYCORE_API_KEY`, polls
  `/v1/agent-events?targetAgent=paperclip`, creates idempotent Paperclip issues
  with `origin_kind = companycore_agent_event`, and acknowledges processed
  events through `POST /v1/agent-events/:id/ack`. Production smoke confirmed
  Paperclip `/api/health` returned `200`, the adapter log reported
  `received=1`, `created=1`, and `acked=1`, Paperclip created issue `LUC-37`
  for CompanyCore event `78569a4e-756a-4950-8aba-10f3736ba50e`, and CompanyCore
  returned 0 pending Paperclip events afterward.
- 2026-05-03: Completed CCV1-048 v1 closure audit and published
  `docs/operations/v1-release-readiness.md`. Production smoke confirmed
  CompanyCore `/health` and `/v1/health` returned `200`, service-key
  `/v1/connection` returned workspace `LuckySparrow` with ClickUp configured,
  ClickUp maintenance `inspect_only` saw 21 webhooks, 219 ClickUp tasks, and 0
  failed inbox rows, Paperclip `/api/health` returned `200`, Paperclip had one
  `companycore_agent_event` issue, and CompanyCore had 0 pending Paperclip
  events. Jarvis public connector smoke requires user Authorization, so the
  next hardening task is an authenticated Jarvis smoke rather than a
  CompanyCore runtime blocker.
- 2026-05-03: Completed CCV1-049 by running authenticated production Jarvis
  CompanyCore smoke with protected bearer access. `GET
  /v1/connectors/companycore` returned `200`, `connected=true`, and
  `auth_type=bridge`; `POST /v1/connectors/companycore/sync` returned
  `status=started`; the CompanyCore connector had indexed chunks; and chat
  answered from CompanyCore project, decision, and task records. Deployed an
  OpenJarvis context relevance improvement so CompanyCore records are ranked
  against the latest question and highlighted before full sections. Stored the
  Paperclip adapter as `integrations/paperclip/companycore-adapter.patch` and
  documented apply/validation/smoke/rollback in
  `docs/operations/paperclip-companycore-adapter-runbook.md`.
- 2026-05-03: Completed CCV1-050 by hardening Jarvis CompanyCore answer
  precision. The OpenJarvis CompanyCore context injector now filters
  smoke/test records out of ordinary business prompts unless the prompt asks
  for smoke or test data. Targeted OpenJarvis tests passed (`5 passed`), the
  production Jarvis container was rebuilt and restarted, and the authenticated
  chat smoke returned project `Paperclip AI onboarding to CompanyCore`, tasks
  `Reuse the same CompanyCore adapter path in Paperclip` and
  `Teach Jarvis to summarize CompanyCore records`, and agent
  `Jarvis production chat adapter`.
- 2026-05-03: Completed CCV1-051 by auditing and cleaning sync data hygiene.
  Production CompanyCore had 219 ClickUp tasks and 0 duplicate task external
  IDs, but repeated syncs had produced redundant `task_synced_from_clickup`
  events and smoke/test records. ClickUp sync now skips unchanged task pulls
  without emitting duplicate task sync events. OpenJarvis CompanyCore connector
  no longer indexes CompanyCore events by default; event indexing is opt-in via
  `COMPANYCORE_SYNC_EVENTS`. Production backups were created under
  `/home/codex/backups/companycore-cleanup-20260503` before cleanup. After
  cleanup, CompanyCore retained 219 ClickUp tasks, 0 duplicate ClickUp task
  external IDs, 0 smoke tasks/agents/projects, and 219 latest ClickUp task sync
  events. A production maintenance run skipped all 219 unchanged tasks and did
  not create new task sync events. Jarvis rebuilt the CompanyCore connector
  index to 259 chunks.
- 2026-05-03: Completed CCV1-052 by promoting the approved CompanyCore runtime
  slice from release candidate to v1 achieved. The final boundary records that
  CompanyCore, ClickUp, Jarvis, and Paperclip are live and smoked end to end;
  GitHub-to-Coolify auto-deploy is an external release automation blocker, not
  a v1 runtime blocker; OpenJarvis has a local unpushed connector hygiene
  commit and Paperclip has a local unpushed adapter commit plus a managed
  CompanyCore patch/runbook for durable handoff.
- 2026-05-03: Completed CCV1-053 by adding
  `docs/operations/v1-source-handoff-package.md`. The package records the
  OpenJarvis `5a426370` and Paperclip `4cfa476f` source commits, affected
  files, expected tests, production smoke checks, and rollback approach. The
  docs index was refreshed to describe the achieved v1 runtime rather than the
  early foundation state.
- 2026-05-03: Completed CCV1-054 by rebuilding and running the production
  CompanyCore backend from final v1 runtime commit `9116026`. The new
  container `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9116026` started
  successfully, reported no pending migrations, ran seed, enabled the ClickUp
  maintenance scheduler, and replaced the previous `manual-ae2c3bf` backend
  while keeping Postgres healthy. Public `/health`, `/v1/health`, web root,
  API metadata, protected `/v1/connection`, and ClickUp maintenance
  `inspect_only` smoke all passed.
- 2026-05-03: Completed CCV1-055 by rerunning full live-system smoke after the
  final runtime rollover. CompanyCore public health, v1 health, web root, API
  metadata, protected connection, and ClickUp maintenance stayed green.
  Paperclip `/api/health` returned `200`, Jarvis `/health` returned `200`,
  Jarvis's authenticated CompanyCore connector returned `connected=true`,
  `auth_type=bridge`, and `chunks=259`, a CompanyCore connector sync could be
  started, and CompanyCore had 0 pending Paperclip agent events. Added a
  learning-journal guardrail for remote smoke scripts that touch secrets.
- 2026-05-03: Completed CCV1-056 by cleaning temporary VPS artifacts created
  during the final CompanyCore runtime rollover. Removed
  `/tmp/companycore-9116026`, `/tmp/companycore-9116026.tar`, and any temporary
  Jarvis smoke files. Verified the running backend still uses
  `rnqqkhl3o3dut4qv56mlxly2_backend:9116026`, Postgres remains healthy, and
  rollback image `rnqqkhl3o3dut4qv56mlxly2_backend:ae2c3bf` is still present.
- 2026-05-03: Completed CCV1-057 by validating the Paperclip source handoff.
  In `C:\Personal\Projekty\Aplikacje\paperclip-companycore-worktree`,
  `npx --yes pnpm@9.15.4 --filter @paperclipai/server typecheck` passed and
  `npm exec --yes pnpm@9.15.4 -- vitest run server/src/__tests__/companycore-adapter.test.ts`
  passed with 3 tests. A safe branch push to
  `origin/codex/companycore-adapter-v1` failed with GitHub `403`, so upstream
  Paperclip source merge is now a permissions blocker, not an implementation
  blocker.
- 2026-05-03: Completed CCV1-058 by validating the OpenJarvis source handoff.
  Created a clean worktree from current `open-jarvis/OpenJarvis` `origin/main`,
  cherry-picked only the CompanyCore connector hygiene change, and ran
  `..\OpenJarvis\.venv\Scripts\python -m pytest tests\connectors\test_companycore.py tests\server\test_companycore_context.py -q`
  with 6 tests passing. A safe branch push to
  `origin/codex/companycore-connector-v1` failed with GitHub `403`, so
  upstream OpenJarvis source merge is now a permissions blocker, not an
  implementation blocker. The temporary clean worktree was removed.
- 2026-05-03: Completed CCV1-059 by auditing GitHub-to-Coolify auto-deploy
  capability after v1 runtime closure. `gh auth status` could not run because
  `gh` is not installed. The GitHub connector lists
  `Wroblewski-Patryk/companycore` with `admin=true`, but the available GitHub
  connector actions include repository contents, branches, refs, blobs, files,
  repository listing, and PR metadata, not webhook administration. Coolify,
  Coolify DB/Redis/realtime/proxy, CompanyCore backend, and CompanyCore
  Postgres containers are healthy. Auto-deploy remains a P2 tooling/permission
  blocker, not a v1 runtime blocker.
- 2026-05-03: Completed CCV1-060 by adding
  `docs/operations/v1-operator-handoff.md`, a single operator-facing v1
  acceptance handoff with production endpoints, accepted runtime scope, current
  backend image/container, latest smoke summary, clean data state, rollback
  pointer, residual non-runtime blockers, and next product decision options.
- 2026-05-03: Deployed the Google Drive v2 runtime hardening commit
  `a52afef4492445c87d1313324dcee8bbe82f3323` to production by manually
  rolling over the CompanyCore backend on the VPS. Coolify redeployed only
  `6731b82cd40866f3a06dc7b719cd7d13c269d5d5`, so production was missing
  the Google Drive deploy-smoke and OAuth refresh hardening commits. The new
  backend container is `backend-rnqqkhl3o3dut4qv56mlxly2-manual-a52afef`,
  running image
  `rnqqkhl3o3dut4qv56mlxly2_backend:a52afef4492445c87d1313324dcee8bbe82f3323`.
  Postgres stayed healthy, `prisma migrate deploy` reported no pending
  migrations, public `/health` and `/v1/health` returned the expected build
  metadata, and the protected Google Drive smoke passed through the Jarvis
  workspace service API key with Google Drive currently unconfigured and
  `importedFileCount=0`.
- 2026-05-03: Completed V2WEB-001 by turning the owner web console into a
  visible CompanyCore database and integration observability surface. The
  dashboard now shows the operator's 12 company areas in folder order, maps
  each area to CompanyCore tables, provider mappings, Drive files, and record
  previews, and exposes database counters. `/settings/drive` now supports
  Google Drive OAuth URL generation, authorization-code exchange, selected
  folder import, changes reconciliation, file refresh, and imported-file
  review. Desktop and mobile Playwright smoke screenshots passed; `node --check
  public/app.js`, `git diff --check`, `npm run build`, and `npm test` passed.
- 2026-05-03: Deployed V2WEB-001 to production with manual VPS backend
  rollover. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-6b4d57a`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:6b4d57a6e98159e64d9f065427e7201238b47ab5`.
  Public `/health`, `/v1/health`, web root, and `/settings/drive` returned
  `200`; protected smoke via the Jarvis/Paperclip workspace service key
  returned workspace `LuckySparrow`, 12 operating areas, 47 capabilities,
  Google Drive unconfigured, and 0 imported Drive files. Postgres remained
  healthy and no migrations were pending.
- 2026-05-03: Completed V2WEB-002 locally by adding manual provider scope
  mapping. Owners can move ClickUp provider mappings between operating areas
  from the dashboard; linked ClickUp operating tables move with List mappings,
  and manual overrides are preserved in future ClickUp structure refreshes.
  Owners can also move Google Drive folders between operating areas; existing
  descendants move with the folder and the folder-to-area rule is persisted for
  future imports. The adapter manifest now exposes
  `operating-model:mappings:write` and `google-drive:files:scope:write`.
  `node --check public/app.js`, `git diff --check`, `npm run build`, and
  `npm test` passed locally.
- 2026-05-03: Added `docs/operations/google-drive-owner-setup.md` so operators
  have a click-by-click Google Cloud and CompanyCore owner UI runbook for
  enabling Drive/Docs/Sheets APIs, OAuth consent, OAuth client credentials,
  redirect URI setup, production env vars, folder ID selection, consent, import,
  refresh, reconcile, and troubleshooting.
- 2026-05-03: Completed V2WEB-005 by adding a dedicated `/tasks-adapter`
  owner-console route for the implemented `/v1/tasks` records. The dashboard
  now links into the Tasks & adapters module instead of owning the task table,
  the route shows total, ClickUp, open, and due-soon task stats, and task table
  cells render provider-controlled values as text instead of HTML. The slice
  intentionally avoided `/tasks` as a web route because `/tasks` is still a
  protected legacy API path covered by integration tests.
- 2026-05-03: Completed V2WEB-006 by adding `/settings/integrations` as a
  taxonomy view for implemented integrations and data paths. The owner console
  now groups ClickUp/tasks, Google Drive/files, pipeline/CRM tables, and API
  capabilities, then summarizes implemented tables, records, provider mappings,
  and Drive files by operating area. Dashboard and sidebar links point to this
  route, and every action opens an existing implemented surface rather than a
  placeholder.
- 2026-05-03: Completed V2WEB-007 by adding `/pipeline` as the first dedicated
  pipeline module. The view reads existing CompanyCore snapshots for clients,
  pipeline stages, deals, and interactions, shows summary cards, renders compact
  record lists with empty states, and is linked from the sidebar, dashboard, and
  integration taxonomy. No new backend behavior or placeholder write flow was
  introduced.
- 2026-05-04: Completed V2WEB-008 by turning the dashboard into a command
  center. The signed-in landing screen now shows data-driven attention items,
  live module metadata for operating areas, tasks, pipeline, Drive, ClickUp,
  and integration taxonomy, plus a recommended next action. Signals are derived
  from existing frontend state only and link to implemented routes.

## Working Agreements
- Keep task board and project state synchronized.
- Keep planning docs synchronized with task board.
- Keep changes small and reversible.
- Validate touched areas before marking done.
- Keep repository artifacts in English.
- Communicate with users in their language.
- Delegate with explicit ownership and avoid overlapping subagent write scope.
- Use the default loop:
  `analyze -> select one task -> plan -> implement -> verify -> self-review -> sync knowledge`.
- Use `docs/governance/autonomous-engineering-loop.md` for process self-audit,
  one-task priority selection, seven-step evidence, and mode rotation.
- Treat deployment docs and smoke checks as part of done-state for runtime
  changes.

## Canonical Context
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/LEARNING_JOURNAL.md`
- `.agents/workflows/general.md`
- `.agents/workflows/documentation-governance.md`
- `.agents/workflows/subagent-orchestration.md`
- `.agents/workflows/user-collaboration.md`
- `.agents/workflows/world-class-delivery.md`

## Canonical Docs
- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/NEXT_STEPS.md`
- `docs/architecture/README.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/tech-stack.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/engineering/local-development.md`
- `docs/engineering/testing.md`
- `docs/governance/working-agreements.md`
- `docs/governance/world-class-product-engineering-standard.md`
- `docs/governance/autonomous-engineering-loop.md`
- `docs/governance/function-coverage-ledger-standard.md`
- `docs/governance/function-coverage-ledger-template.csv`
- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/operations/post-deploy-smoke.md`
- `docs/operations/rollback-and-recovery.md`
- `docs/operations/service-reliability-and-observability.md`
- `docs/operations/paperclip-companycore-adapter-runbook.md`
- `docs/operations/v1-operator-handoff.md`
- `docs/operations/v1-source-handoff-package.md`
- `docs/operations/v1-release-readiness.md`
- `docs/security/secure-development-lifecycle.md`
- `docs/security/security-baseline.md`
- `docs/ux/design-system-contract.md`
- `docs/ux/visual-direction-brief.md`
- `docs/ux/design-memory.md`
- `docs/ux/evidence-driven-ux-review.md`

## Active v1 Plan
- `docs/planning/mvp-next-commits.md`
- `docs/planning/mvp-execution-plan.md`
- `docs/planning/companycore-v1-task-contracts.md`
- `docs/planning/auth-workspace-integration-plan.md`
- `docs/planning/regression-prevention-plan.md`
- `docs/planning/open-decisions.md`
