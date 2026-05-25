# Google Drive V2 Task Contracts

This file is the execution queue for the approved Google Drive v2 integration.
It follows the repository task contract and must stay synchronized with
`.codex/context/TASK_BOARD.md` and `docs/planning/mvp-next-commits.md`.

## V2WEB-023 Dashboard Operational Cockpit

- Task Type: frontend/UX
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Iteration: current autonomous web-console follow-up
- Operation Mode: BUILDER
- Deliverable For This Stage: dashboard cockpit that ranks the current
  priority and shows operational readiness lanes.
- Process Self-Audit:
  - All seven autonomous loop steps are represented.
  - Exactly one small UX slice is selected.
  - The task reuses existing dashboard data and navigation routes.
- Goal: Make the first dashboard screen work as an operational center by
  showing the current priority, the next action, what is blocked, and the
  status of the main operational lanes.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/planning/google-drive-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/PROJECT_STATE.md`
- Implementation Plan:
  1. Add a dashboard cockpit panel above the summary cards.
  2. Rank the current priority from existing attention signals.
  3. Render readiness lanes for integrations, relationships, execution, and
     data model health.
  4. Validate desktop and mobile rendered behavior.
- Acceptance Criteria:
  - Dashboard first viewport shows the top current priority and a primary next
    action.
  - Dashboard shows whether integration, relationship, execution, and data
    model lanes are healthy, blocked, or need review.
  - Cockpit links route to the existing module surfaces.
  - Mobile layout remains readable without overlapping text or controls.
- Definition of Done:
  - `npm run build`, `node --check public/app.js`, `git diff --check`, and
    authenticated rendered UI smoke pass or blockers are recorded.
- Result Report:
  - Added the dashboard Operational Cockpit panel with current priority,
    primary and secondary actions, and four operational readiness lanes.
  - Reused existing `dashboardSignals()` and module routes instead of adding a
    new data source.
  - Verified desktop and mobile dashboard render with authenticated local
    Playwright smoke.

## V2WEB-022 Unified API Integration Setup

- Task Type: frontend/backend/integration
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder / Backend Builder
- Priority: P1
- Iteration: current autonomous Drive follow-up
- Operation Mode: BUILDER
- Deliverable For This Stage: one clearer integrations index plus concrete
  Google Drive OAuth client input fields in the owner console.
- Process Self-Audit:
  - All seven autonomous loop steps are represented.
  - Exactly one small product slice is selected.
  - The task reuses `integration_settings` and does not create a parallel
    provider configuration system.
- Goal: Let owners see one list of API integrations and enter Google Drive
  OAuth client credentials where the Drive integration is configured.
- Scope:
  - `src/integrations/integration-settings.service.ts`
  - `src/integrations/google-drive/google-drive.auth.ts`
  - `src/modules/connection/connection.routes.ts`
  - `src/modules/integration-settings/integration-settings.routes.ts`
  - `src/tests/api.test.ts`
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/INTEGRATIONS.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  1. Store Google OAuth client credentials in encrypted workspace integration
     settings and keep env vars as fallback.
  2. Expose only safe Drive setup booleans to the connection/settings payloads.
  3. Add visible OAuth client ID/secret inputs and a save action to
     `/settings/drive`.
  4. Improve `/settings/integrations` as a single API integration list that
     routes owners to ClickUp, Drive, and CompanyCore API setup.
  5. Validate backend behavior, rendered UI, and responsive layout.
- Acceptance Criteria:
  - Owners can save Google OAuth client ID/secret from the web console.
  - Google Drive authorization URL and token refresh use workspace-stored
    OAuth client credentials before falling back to env vars.
  - Safe API responses expose `oauthClientConfigured` and
    `oauthTokenConfigured` without exposing secrets.
  - `/settings/integrations` presents one clear API integration list.
  - `/settings/drive` disables token/import actions until the required earlier
    Drive setup step exists.
- Definition of Done:
  - `npm run build`, `git diff --check`, `npm test`, and rendered UI smoke pass
    or blockers are recorded.
  - No raw OAuth client secret is returned to the browser after save.
- Result Report:
  - Added encrypted workspace storage for Google OAuth client credentials.
  - Added safe Google Drive setup status booleans to settings and connection
    responses.
  - Added owner-facing OAuth client ID/secret inputs and a save action in
    `/settings/drive`.
  - Added a unified API integration setup list in `/settings/integrations`.
  - Verified `npm run build`, `git diff --check`, full `npm test` against a
    disposable Postgres database, and authenticated local Playwright desktop
    and mobile UI smoke.

## V2GD-011 Drive Setup Operator Instructions

- Task Type: frontend/documentation
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder
- Priority: P2
- Iteration: current autonomous Drive follow-up
- Operation Mode: BUILDER
- Deliverable For This Stage: short owner-facing Google Drive API connection
  instructions in the existing `/settings/drive` setup panel.
- Process Self-Audit:
  - All seven autonomous loop steps are represented.
  - Exactly one small task is selected.
  - The task reuses the approved Google Drive setup surface.
- Goal: Help owners connect Google Drive APIs from the same UI surface that
  creates the OAuth URL and imports Drive folders.
- Scope:
  - `public/index.html`
  - `public/styles.css`
  - `docs/planning/google-drive-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  1. Add concise setup instructions above the Drive OAuth fields.
  2. Style the instructions using the existing panel language and spacing.
  3. Validate static markup, build, and rendered `/settings/drive` visibility.
- Acceptance Criteria:
  - `/settings/drive` explains enabling Google Drive, Docs, and Sheets APIs.
  - `/settings/drive` tells owners to configure the OAuth redirect URI and
    backend OAuth env vars before consent/import.
  - The instruction remains readable on desktop and mobile widths.
- Definition of Done:
  - `npm run build`, `git diff --check`, and rendered UI smoke pass or blockers
    are recorded.
  - No new Drive setup system, workaround, or duplicate configuration path is
    introduced.
- Result Report:
  - Added a compact setup checklist to the existing Google Drive setup panel.
  - Added lightweight checklist styles that wrap long environment variable
    names safely.
  - Verified `npm run build`, `git diff --check`, authenticated local
    Playwright render smoke for `/settings/drive` at desktop and mobile widths,
    and production HTML presence after deployment.
  - Deployed runtime commit `17e0e10bd02ff97ef860815e0433931ff6b0d356` to
    production with manual VPS backend rollover because the public health check
    still reported the previous runtime after push.

## V2GD-010 Drive Hierarchy Preview And Descriptions

- Task Type: feature
- Current Stage: done
- Status: DONE
- Owner: Backend Builder / Frontend Builder
- Priority: P1
- Iteration: current autonomous Drive follow-up
- Operation Mode: BUILDER
- Deliverable For This Stage: recursive Drive folder indexing, editable
  CompanyCore Drive descriptions, agent-visible API contract, and owner GUI
  preview controls.
- Process Self-Audit:
  - All seven autonomous loop steps are planned.
  - Exactly one priority task is selected.
  - The task reuses the approved Google Drive adapter and operating model.
- Goal: Let Jarvis, Paperclip, Aviary, and owners inspect imported Drive
  folder/file hierarchy, store a short description of what each item contains,
  and request on-demand content preview through CompanyCore instead of raw
  Google tokens.
- Scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/*`
  - `src/integrations/google-drive/*`
  - `src/modules/google-drive/google-drive.routes.ts`
  - `src/auth/capabilities.ts`
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/tests/api.test.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  1. Add an editable Drive record description field without exposing OAuth
     material.
  2. Make selected-folder import include selected root folders and nested
     folders/files so hierarchy is queryable from `parentExternalId`.
  3. Add a guarded API route for updating Drive file descriptions.
  4. Render imported Drive files as an indented hierarchy with preview and
     description edit controls in `/settings/drive`.
  5. Validate build, migration, API behavior, and rendered UI smoke.
- Acceptance Criteria:
  - Imported selected folders include their nested hierarchy, not only direct
    children.
  - `GET /v1/google-drive/files` returns descriptions and latest snapshots for
    agents.
  - `PATCH /v1/google-drive/files/:id/description` updates only workspace-owned
    Drive rows and is capability-protected.
  - `/settings/drive` shows hierarchy depth, latest description/summary, and
    on-demand preview for Docs, Sheets, images, draw.io/binary metadata.
- Definition of Done:
  - `npm run build`, `git diff --check`, and relevant tests pass or blockers
    are recorded.
  - Documentation and context are updated.
  - No temporary Drive bypass, raw token exposure, or duplicate document system
    is introduced.
- Result Report:
  - Added editable `google_drive_files.description` persistence.
  - Added recursive selected-folder import that stores selected root folders,
    nested folders, and nested files while preserving parent hierarchy.
  - Added `PATCH /v1/google-drive/files/:id/description` with workspace
    ownership and capability enforcement.
  - Added `/settings/drive` hierarchy rendering with per-item description,
    latest snapshot summary, preview, edit, and Google open actions.
  - Verified `npm run build`, `node --check public/app.js`,
    `git diff --check`, and `npm test` against a disposable Postgres database.
  - Deployed commit `7f0e09078f6b9f54db641328ea3d75830c2d2b3d` to production
    with manual VPS backend rollover. Public and protected Google Drive smokes
    passed with Drive still unconfigured until owner OAuth consent/import.

## V2GD-001 Google Drive Architecture And Queue

- Task Type: architecture/planning
- Current Stage: done
- Deliverable For This Stage: approved architecture delta, provider-docs
  evidence, and executable v2 queue.
- Goal: Define how Google Drive, Docs, and Sheets map into the existing
  CompanyCore operating model so implementation can proceed without creating a
  parallel document system.
- Scope:
  - `docs/architecture/system-architecture.md`
  - `docs/INTEGRATIONS.md`
  - `docs/DATABASE.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/google-drive-v2-task-contracts.md`
- Implementation Plan:
  - Review current official Google Drive, Docs, and Sheets API documentation.
  - Record the provider mapping and source-of-truth boundaries.
  - Activate the first executable Google Drive v2 tasks in canonical queues.
  - Keep implementation slices small, testable, and reversible.
- Acceptance Criteria:
  - Google Drive hierarchy is mapped to CompanyCore workspace/area/folder/table
    scope.
  - OAuth, token storage, Drive Changes API, Docs read/edit, and Sheets
    read/edit/create assumptions are explicit.
  - Jarvis/Paperclip/Aviary access goes through CompanyCore APIs.
  - Next implementation tasks are queued.
- Definition of Done:
  - Architecture, integration, database, project state, task board, and next
    commit queue are aligned.
  - Provider documentation evidence is referenced.
  - No runtime code behavior changes are introduced in this planning slice.
- Result Report:
  - Official Google Workspace docs were checked for Drive file discovery,
    Drive metadata, Drive file creation, Drive changes/watch, Docs get/edit,
    and Sheets create/read/write behavior.
  - Google Drive was recorded as the next native adapter using the existing
    workspace settings, encrypted secrets, provider client, sync service,
    event inbox, and agent outbox pattern.
  - V2GD-002 through V2GD-006 were activated as the implementation queue.

## V2GD-002 Google Drive Persistence Foundation

- Task Type: database/backend
- Current Stage: done
- Deliverable For This Stage: Prisma migration and tests for workspace-scoped
  Drive folder/file/content persistence.
- Goal: Add durable Google Drive metadata and content snapshot tables that keep
  file discovery idempotent and searchable.
- Scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/*`
  - `docs/DATABASE.md`
  - targeted tests under `tests/`
- Implementation Plan:
  - Add `google_drive_files` for Drive folders/files with workspace ownership,
    external ID uniqueness, parent metadata, MIME type, links, revision signal,
    trashed state, selected operating scope, and sync status.
  - Add `google_drive_content_snapshots` for extracted text, summaries, sheet
    previews, scan status, source revision, and safe metadata.
  - Add indexes for workspace/folder traversal and provider idempotency.
  - Add tests proving cross-workspace isolation and duplicate prevention.
- Acceptance Criteria:
  - Re-importing the same Drive file updates one row instead of duplicating it.
  - A file can be attached to an operating area/folder/table, storage location,
    or knowledge root inside the same workspace only.
  - Content snapshots can be refreshed without duplicating file metadata.
  - Migration validates on an empty and existing local database.
- Definition of Done:
  - `npm run build` and `npm test` pass with the project PostgreSQL test URL.
  - `git diff --check` passes.
  - Database docs are updated.
- Result Report:
  - Added `google_drive_files` and `google_drive_content_snapshots`.
  - Added idempotency constraints for Drive file metadata and file/revision
    content snapshots.
  - Added workspace/scope indexes for folder traversal and future dashboard
    filtering.
  - Added tests proving same-workspace upsert idempotency, cross-workspace
    external ID separation, and snapshot refresh without duplicates.

## V2GD-003 Google Drive Provider Client And OAuth Settings

- Task Type: backend/integration
- Current Stage: done
- Deliverable For This Stage: workspace-owned Google Drive settings, encrypted
  OAuth token storage contract, and safe provider client.
- Goal: Allow an owner to connect Google Drive through OAuth-backed workspace
  settings without exposing tokens to clients, logs, or agents.
- Scope:
  - `src/integrations/google-drive/*`
  - `src/modules/integration-settings/*`
  - `docs/INTEGRATIONS.md`
  - tests for token redaction and missing/invalid settings
- Implementation Plan:
  - Add provider constant `google_drive`.
  - Store refresh-token material encrypted in `integration_settings`.
  - Store non-secret selected folder/shared-drive config and Drive changes page
    token in settings config.
  - Build a safe HTTP client for Drive, Docs, and Sheets APIs.
- Acceptance Criteria:
  - Missing settings fail closed with `integration_not_configured`.
  - Responses never include refresh/access tokens.
  - Provider errors are mapped to safe integration error codes.
- Definition of Done:
  - Build/tests pass and integration docs are updated.
- Result Report:
  - Added `google_drive` as a supported integration provider.
  - Added encrypted OAuth secret storage and typed non-secret Drive
    configuration for selected folders, shared drives, sync mode, import mode,
    Drive changes token, and operating scope mappings.
  - Added a safe Google Drive/Docs/Sheets client boundary with provider error
    mapping.
  - Added connection manifest/config status entries so agents can discover
    Google Drive capability without seeing OAuth material.
  - Added tests proving settings redaction and backend-only OAuth decrypt
    access.

## V2GD-004 Folder Discovery And File Import

- Task Type: backend/integration
- Current Stage: done
- Deliverable For This Stage: selected folder discovery/import endpoint with
  explicit import policy.
- Goal: Import selected Drive folder/file structure into CompanyCore storage
  and knowledge records with no duplicates.
- Scope:
  - `src/integrations/google-drive/*`
  - `src/modules/operating-model/*`
  - tests for import policy and workspace scoping
- Implementation Plan:
  - Use Drive `files.list` with pagination and selected-folder queries.
  - Persist folders/files by workspace/provider/external ID.
  - Support `merge`, `skip_existing`, `replace_selected_folders`, and
    `inspect_only`.
  - Emit safe sync events and agent outbox signals.
- Acceptance Criteria:
  - Repeated imports are clean and idempotent.
  - Destructive replacement only affects provider-owned Drive rows in selected
    folders.
  - Jarvis can read imported file metadata through CompanyCore API.
- Definition of Done:
  - Build/tests pass, docs updated, no token leakage.
- Result Report:
  - Added `POST /v1/integration-settings/google_drive/import`.
  - Added selected-folder file discovery through Drive `files.list`.
  - Added `merge`, `skip_existing`, `replace_selected_folders`, and
    `inspect_only` import behavior.
  - Added idempotent persistence into `google_drive_files`.
  - Added `google_drive_import_succeeded` events with safe counts.
  - Added tests for inspect-only, initial merge, repeated merge, and imported
    file metadata refresh.

## V2GD-005 Docs And Sheets Read/Create/Edit

- Task Type: backend/integration
- Current Stage: done
- Deliverable For This Stage: API routes for Docs/Sheets create/read/edit and
  post-write local refresh.
- Goal: Let CompanyCore create, read, and edit Google Docs/Sheets while keeping
  database metadata and searchable snapshots current.
- Scope:
  - `src/integrations/google-drive/*`
  - new or existing file/content API modules
  - tests for docs/sheets read/edit behavior with mocked provider responses
- Implementation Plan:
  - Create Docs through Drive `files.create` or Docs-compatible metadata flow.
  - Create Sheets through Sheets `spreadsheets.create`.
  - Read Docs with `documents.get`; read Sheets with spreadsheet/values APIs.
  - Edit Docs with `documents.batchUpdate`; edit Sheets with values update or
    batchUpdate.
  - After successful provider writes, refresh metadata and content snapshots.
- Acceptance Criteria:
  - Provider write failure does not mutate local content snapshots.
  - Successful provider write updates the local snapshot and emits events.
  - Agents can request content through CompanyCore APIs without Google tokens.
- Definition of Done:
  - Build/tests pass and docs are updated.
- Result Report:
  - Added `/v1/google-drive/files` and
    `/v1/google-drive/files/:id/content`.
  - Added Google Docs create/update routes with provider write before local
    refresh.
  - Added Google Sheets create/update values routes with provider write before
    local refresh.
  - Added content extraction snapshots for Docs text and Sheets values.
  - Added safe file/content events for creation, updates, and refreshes.
  - Added tests proving Docs/Sheets provider calls, snapshot refresh, and agent
    file listing behavior.

## V2GD-006 Drive Changes Freshness

- Task Type: backend/integration
- Current Stage: done
- Deliverable For This Stage: Drive changes reconciliation and future webhook
  channel plan.
- Goal: Keep CompanyCore file metadata and content snapshots fresh after
  external Drive edits.
- Scope:
  - `src/integrations/google-drive/*`
  - provider event inbox/outbox reuse
  - docs and tests for idempotent change handling
- Implementation Plan:
  - Store start/new page tokens per workspace setting.
  - Poll Drive `changes.list` non-destructively for selected scopes.
  - Record change deliveries in provider event inbox.
  - Re-fetch changed files and refresh snapshots when relevant.
  - Add `changes.watch` channel registration as a later push trigger using the
    existing webhook registration model.
- Acceptance Criteria:
  - Replaying the same change does not duplicate files or events.
  - Removed/trashed files are marked safely without deleting native data.
  - Agent outbox receives provider-neutral file changed events.
- Definition of Done:
  - Build/tests pass, docs updated, smoke plan created.
- Result Report:
  - Added Drive changes reconciliation through
    `/v1/integration-settings/google_drive/changes/reconcile`.
  - Added provider event inbox records for Drive changes.
  - Added agent outbox events for changed and removed Drive files.
  - Added metadata/content refresh for changed Docs/Sheets.
  - Added safe removed-file handling by marking provider-owned rows as
    `trashed`/`removed` instead of deleting native data.
  - Added changes page token advancement in Google Drive integration config.
  - Added tests for changed file refresh, removed file marking, inbox rows,
    agent outbox rows, and page-token update.

## V2GD-007 Google Drive Deploy Smoke Hardening

- Task Type: ops/release
- Current Stage: done
- Deliverable For This Stage: safer deploy identification and protected Google
  Drive smoke script.
- Goal: Make Google Drive production deploys easier to verify after Coolify
  redeploys.
- Scope:
  - `src/health/health.routes.ts`
  - `src/config/env.ts`
  - `Dockerfile`
  - `.env.example`
  - `package.json`
  - `scripts/google-drive-production-smoke.mjs`
  - `docs/operations/post-deploy-smoke.md`
- Implementation Plan:
  - Add safe build metadata fields to health responses.
  - Add environment names for build commit/image metadata.
  - Add a protected Google Drive smoke script that checks the connection
    manifest and file-list API with a workspace API key.
  - Update post-deploy smoke documentation.
- Acceptance Criteria:
  - Health response remains public and contains no secret material.
  - The smoke script fails closed when `COMPANYCORE_API_KEY` is missing.
  - The smoke script checks Google Drive capabilities and file-list access.
  - Build and test gates pass.
- Definition of Done:
  - `git diff --check`, `npm run build`, and `npm test` pass.
  - Release docs are updated.
- Result Report:
  - Added public health build metadata sourced from safe env vars.
  - Added `npm run google-drive:smoke`.
  - Added Google Drive smoke checklist items to the post-deploy runbook.

## V2GD-008 Google Drive OAuth Runtime Hardening

- Task Type: backend/security
- Current Stage: done
- Deliverable For This Stage: OAuth authorization URL, code exchange, and
  refresh-token runtime flow.
- Goal: Let Google Drive sync run from long-lived encrypted refresh-token
  material instead of requiring a still-valid access token in settings.
- Scope:
  - `src/integrations/google-drive/google-drive.auth.ts`
  - `src/integrations/google-drive/google-drive.content.ts`
  - `src/integrations/google-drive/google-drive.sync.ts`
  - `src/modules/integration-settings/integration-settings.routes.ts`
  - `src/modules/connection/connection.routes.ts`
  - `src/config/env.ts`
  - `.env.example`
  - `src/tests/api.test.ts`
  - `docs/INTEGRATIONS.md`
- Implementation Plan:
  - Use current Google OAuth web-server docs for authorization code exchange
    and refresh-token requests.
  - Add owner-only authorization URL and code exchange routes.
  - Add automatic access-token refresh before Drive/Docs/Sheets provider calls.
  - Keep OAuth material encrypted and never returned in API responses.
  - Add tests for URL generation, owner-only OAuth initiation, refresh-token
    exchange, and provider calls using refreshed tokens.
- Acceptance Criteria:
  - Service API keys cannot create owner consent URLs.
  - Expired access tokens are refreshed before provider calls.
  - Refreshed access-token material is re-encrypted in workspace settings.
  - Build and test gates pass.
- Definition of Done:
  - `git diff --check`, `npm run build`, and `npm test` pass.
  - Integration docs record OAuth runtime behavior.
- Result Report:
  - Added OAuth URL generation with offline access and approved scopes.
  - Added authorization-code exchange route.
  - Added refresh-token flow against Google's token endpoint.
  - Updated sync/content services to use fresh Google Drive clients.
  - Added regression tests for consent URL and token refresh.

## V2GD-009 Google Drive Production Rollover Smoke

- Task Type: ops/release
- Current Stage: done
- Deliverable For This Stage: production runtime rollover and public/protected
  smoke evidence for the Google Drive v2 backend.
- Goal: Ensure production runs the Google Drive deploy-smoke and OAuth runtime
  hardening commits before operators enter Google Drive credentials.
- Scope:
  - Coolify/VPS backend runtime for `companycore`
  - `docs/operations/post-deploy-smoke.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Verify the deployed backend image and public health response.
  - Build the current commit as a new backend image with build metadata.
  - Roll over only the backend container on the existing application network.
  - Preserve the production Postgres container and rollback image.
  - Run public health/web/API smoke and protected Google Drive smoke.
  - Record release evidence without storing raw keys or provider tokens.
- Acceptance Criteria:
  - Production `/health` reports commit
    `a52afef4492445c87d1313324dcee8bbe82f3323`.
  - `prisma migrate deploy` reports no failed migration.
  - Postgres remains healthy.
  - Protected Google Drive smoke passes with an existing workspace service API
    key.
  - Raw API keys are not written to docs or chat.
- Definition of Done:
  - Public health, v1 health, web root, API metadata, protected connection,
    and Google Drive smoke are verified.
  - Deployment evidence is recorded in canonical docs.
- Result Report:
  - Diagnosed that the Coolify redeploy reached only
    `6731b82cd40866f3a06dc7b719cd7d13c269d5d5`, leaving the production health
    response without build metadata.
  - Built and deployed image
    `rnqqkhl3o3dut4qv56mlxly2_backend:a52afef4492445c87d1313324dcee8bbe82f3323`.
  - Started backend container
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-a52afef`.
  - Preserved `postgres-rnqqkhl3o3dut4qv56mlxly2-171327317813`, which remained
    healthy.
  - Verified `GET /health` and `GET /v1/health` return build commit
    `a52afef4492445c87d1313324dcee8bbe82f3323`.
  - Ran protected Google Drive smoke through the Jarvis workspace service API
    key. The smoke passed with `googleDriveConfigured=false`,
    `googleDriveActive=false`, and `importedFileCount=0`, which is expected
    before Google Drive credentials are entered.

## V2WEB-024 Data Operations Index

- Task Type: frontend/ux
- Current Stage: done
- Deliverable For This Stage: reusable data operations index in the owner web
  console.
- Goal: Give operators one clear database-module entry point that explains the
  available CompanyCore tables, record counts, API coverage, source data, and
  the current workbench route for each module.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/ux/design-memory.md`
- Implementation Plan:
  - Reuse the existing static owner-console stack instead of adding Tailwind or
    DaisyUI without an approved frontend architecture change.
  - Add a `/data` route to the authenticated shell and backend SPA route list.
  - Build a database-module catalog from existing module routes, API route
    metadata, operating-model tables, loaded records, and Drive file counts.
  - Add shared workbench panel, filter bar, index row, metric, metadata, and
    empty-state classes that can be reused by future table workbenches.
  - Validate desktop and mobile rendered behavior with an authenticated browser
    smoke.
- Acceptance Criteria:
  - Signed-in owners can open `/data` directly from the sidebar, dashboard, and
    module switcher.
  - The page lists database modules with module group, description, record
    count, route count, API methods, area mapping, and source data.
  - Search and group filters work without reloading the page.
  - `/data` is served as an SPA route by the backend, not treated as a protected
    API path.
  - Desktop and mobile layouts do not overlap key controls or text.
- Definition of Done:
  - `npm run build`, `node --check public/app.js`, `git diff --check`, and
    authenticated Playwright smoke pass.
  - Canonical task, project-state, planning, and UX memory docs are updated.
- Result Report:
  - Added the authenticated `/data` Data Operations view.
  - Added 13 database module rows covering strategy, execution, CRM, knowledge,
    and AI operations tables.
  - Added reusable `workbench-*` CSS component classes for data-heavy index
    screens.
  - Added dashboard and module-switcher entry points for Data Operations.
  - Confirmed the frontend baseline remains static CSS; Tailwind and DaisyUI
    were not added because the project has no Tailwind build pipeline.

## V2WEB-025 Generic Table Record Workbench

- Task Type: frontend/ux
- Current Stage: done
- Deliverable For This Stage: read/inspect table workbench for CompanyCore
  database modules.
- Goal: Let operators open a database module from `/data` and inspect actual
  records without guessing from raw API calls.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/ux/design-memory.md`
- Implementation Plan:
  - Reuse the approved Data Operations index and `workbench-*` patterns.
  - Route every Data module to `/data/:table` and add a backend SPA route for
    `/data/:table`.
  - Render a split workbench with table stats, source/search filters, record
    list, selected-record inspector, field list, and raw JSON details.
  - Keep the slice read/inspect only; defer create/edit/archive controls to a
    later route-level editing task.
  - Validate desktop and mobile behavior with authenticated browser smoke.
- Acceptance Criteria:
  - Signed-in owners can open `/data/notes` and other supported table routes.
  - The workbench shows table label, group, description, operating-area mapping,
    record count, field count, API route count, and source count.
  - Record search and source filters update the list without page reload.
  - Selecting a record updates the inspector with readable field values and raw
    JSON.
  - `/data/:table` is served as an SPA route by the backend.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `npm test`,
    `git diff --check`, and authenticated Playwright smoke pass.
  - Canonical task, project-state, planning, and UX memory docs are updated.
- Result Report:
  - Added `/data/:table` generic record workbench.
  - Data module rows now open table-specific routes.
  - Added reusable record list, selected state, inspector, field-list, and raw
    JSON presentation styles.
  - Added backend SPA route support for `/data/:table`.
  - Validation passed against `/data/notes` with a real note record created
    through the API.

## V2WEB-026 Typed Notes Editor Workbench

- Task Type: frontend/ux
- Current Stage: done
- Deliverable For This Stage: first typed route-level business editor inside
  the Data Operations workbench.
- Goal: Let owners create, edit, and archive CompanyCore notes from
  `/data/notes` without leaving the web console or guessing API payloads.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/operations/agent-runtime-coverage-ledger.csv`
  - `docs/ux/design-memory.md`
- Implementation Plan:
  - Reuse the existing `/data/:table` split record workbench.
  - Add a typed record editor panel only for the `notes` module.
  - Wire create, update, and archive actions to the existing Notes API
    (`POST /v1/notes`, `PATCH /v1/notes/:id`, `DELETE /v1/notes/:id`).
  - Refresh table records after each mutation and keep selected/draft state
    explicit.
  - Validate desktop and mobile rendered behavior with an authenticated browser
    smoke.
- Acceptance Criteria:
  - Signed-in owners can create a note from `/data/notes`.
  - Selecting a note loads its content into an editable textarea.
  - Saving updates the selected note and refreshes the record list/inspector.
  - Archiving a selected note calls the Notes archive API and shows archived
    status in the inspector.
  - The editor is not shown as a generic placeholder on unrelated tables.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `npm test`,
    `git diff --check`, and authenticated Playwright desktop/mobile smoke pass.
  - Canonical task, project-state, planning, coverage-ledger, and UX memory
    docs are updated.
- Result Report:
  - Added a reusable `record-editor` presentation pattern.
  - Added typed note content create/save/archive controls inside `/data/notes`.
  - Added local editor status handling and validation for empty note content.
  - Extended global busy handling to disable textareas during API mutations.
  - Validation passed against a disposable Postgres database and local
    Playwright desktop/mobile smokes that created, edited, and archived real
    Notes API records.
  - Deployed to production at commit
    `614e6b8f20fbfe28e6f8f4bef7234111ceb2c62c`; production health and
    static asset markers confirmed the typed editor code is live.

## V2WEB-027 Typed Projects Editor Workbench

- Task Type: frontend/ux
- Current Stage: done
- Deliverable For This Stage: typed project create/edit/archive editor inside
  the Data Operations workbench.
- Goal: Let owners manage CompanyCore project workstreams from `/data/projects`
  without leaving the operational data center or hand-writing API payloads.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/operations/agent-runtime-coverage-ledger.csv`
  - `docs/ux/design-memory.md`
- Implementation Plan:
  - Reuse the split `/data/:table` workbench and existing `record-editor`
    pattern from the Notes editor.
  - Add a typed editor only for the `projects` module.
  - Wire create, update, and archive actions to the existing Projects API
    (`POST /v1/projects`, `PATCH /v1/projects/:id`,
    `DELETE /v1/projects/:id`).
  - Keep unrelated modules read-only until their typed forms are implemented.
  - Validate desktop and mobile rendered behavior with an authenticated browser
    smoke.
- Acceptance Criteria:
  - Signed-in owners can create a project from `/data/projects`.
  - Selecting a project loads its name, status, and description into typed
    controls.
  - Saving updates the selected project and refreshes the record list and
    inspector.
  - Archiving a selected project calls the Projects archive API and shows
    archived status in the inspector.
  - The editor reuses shared `record-editor` styles and does not introduce a
    page-local visual variant.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `npm test`,
    `git diff --check`, and authenticated Playwright desktop/mobile smoke pass.
  - Canonical task, project-state, planning, coverage-ledger, and UX memory
    docs are updated.
- Result Report:
  - Added typed project name, status, and description controls to
    `/data/projects`.
  - Generalized the typed editor selection so Notes and Projects share the same
    workbench pattern while other modules remain read-only.
  - Added responsive `record-editor-grid` styling for compact typed editors.
  - Validation passed against a disposable Postgres database and local
    Playwright desktop/mobile smokes that created, edited, archived, and
    reloaded real Projects API records.
  - Deployed to production at commit
    `9d50920361aaeeaa494c795e01973d319dd859d9`; production health and
    static asset markers confirmed the typed Projects editor code is live.

## V2WEB-028 Typed Clients Editor Workbench

- Task Type: frontend/ux
- Current Stage: done
- Deliverable For This Stage: typed client create/edit/archive editor inside
  the Data Operations workbench.
- Goal: Let owners manage CompanyCore CRM clients from `/data/clients` without
  leaving the operational data center or hand-writing API payloads.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/operations/agent-runtime-coverage-ledger.csv`
  - `docs/ux/design-memory.md`
- Implementation Plan:
  - Reuse the split `/data/:table` workbench and existing `record-editor`
    typed editor pattern.
  - Add a typed editor only for the `clients` module.
  - Wire create, update, and archive actions to the existing Clients API
    (`POST /v1/clients`, `PATCH /v1/clients/:id`,
    `DELETE /v1/clients/:id`).
  - Add responsive CRM field layout so email and phone remain readable.
  - Validate desktop and mobile rendered behavior with an authenticated browser
    smoke.
- Acceptance Criteria:
  - Signed-in owners can create a client from `/data/clients`.
  - Selecting a client loads name, status, company, email, and phone into typed
    controls.
  - Saving updates the selected client and refreshes the record list and
    inspector.
  - Archiving a selected client calls the Clients archive API and shows
    archived status in the inspector.
  - The editor reuses shared `record-editor` styles and does not introduce a
    page-local visual variant.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `npm test`,
    `git diff --check`, and authenticated Playwright desktop/mobile smoke pass.
  - Canonical task, project-state, planning, coverage-ledger, and UX memory
    docs are updated.
- Result Report:
  - Added typed client name, status, company, email, and phone controls to
    `/data/clients`.
  - Generalized the typed editor selector so Notes, Projects, and Clients share
    the same workbench pattern while other modules remain read-only.
  - Added client-specific grid styling and full-width email handling for
    readable CRM input.
  - Validation passed against a disposable Postgres database and local
    Playwright desktop/mobile smokes that created, edited, archived, and
    reloaded real Clients API records.
  - Deployed to production at commit
    `fd4b2f3f32794a2538b50f76d315bcd3d1d8d135`; production health and static
    asset markers confirmed the typed Clients editor code is live.

## V2WEB-029 Typed Task Lists Editor Workbench

- Task Type: frontend/ux
- Current Stage: done
- Deliverable For This Stage: typed task-list create/edit/archive editor
  inside the Data Operations workbench.
- Goal: Let owners manage operational task lists from `/data/task-lists`
  without leaving the database workbench or hand-writing API payloads.
- Scope:
  - `public/app.js`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/operations/agent-runtime-coverage-ledger.csv`
  - `docs/ux/design-memory.md`
- Implementation Plan:
  - Reuse the split `/data/:table` workbench and existing `record-editor`
    typed editor pattern.
  - Add a typed editor only for the `task-lists` module.
  - Wire create, update, and archive actions to the existing Task Lists API
    (`POST /v1/task-lists`, `PATCH /v1/task-lists/:id`,
    `DELETE /v1/task-lists/:id`).
  - Include project linkage with the existing Projects record index.
  - Preserve task-list draft inputs across background workspace refreshes so
    operator input is not lost during route-level data loading.
  - Validate desktop and mobile rendered behavior with an authenticated browser
    smoke.
- Acceptance Criteria:
  - Signed-in owners can create a task list from `/data/task-lists`.
  - Selecting a task list loads name, status, project, and description into
    typed controls.
  - Saving updates the selected task list and refreshes the record list and
    inspector.
  - Archiving a selected task list calls the Task Lists archive API and shows
    archived status in the inspector.
  - The editor reuses shared `record-editor` styles and preserves draft values
    during background workspace refresh.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `npm test`,
    `git diff --check`, and authenticated Playwright desktop/mobile smoke pass.
  - Canonical task, project-state, planning, coverage-ledger, and UX memory
    docs are updated.
- Result Report:
  - Added typed task-list name, status, project, and description controls to
    `/data/task-lists`.
  - Extended the typed editor selector so Notes, Projects, Clients, and Task
    Lists share the same workbench pattern while other modules remain
    read-only.
  - Added draft preservation for new task lists and fail-soft startup refresh
    handling so a transient workspace reload does not wipe operator input or
    sign the user out unless the error is actually auth-related.
  - Local validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, `npm test` against disposable Postgres on port
    `55462`, and authenticated Playwright desktop/mobile smoke that created,
    edited, archived, and reloaded real Task Lists API records.
  - Deployed to production at commit
    `eaad4fd3a0e12435e0906b73691b5de77a18a1b6`; production health and static
    asset markers confirmed the typed Task Lists editor and draft-preservation
    code are live.

## V2WEB-030 Typed Tasks Editor Workbench

- Task Type: frontend/ux
- Current Stage: done
- Deliverable For This Stage: typed task create/edit/archive editor inside the
  Data Operations workbench.
- Goal: Let owners manage concrete CompanyCore tasks from `/data/tasks`
  without leaving the database workbench or hand-writing API payloads.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/operations/agent-runtime-coverage-ledger.csv`
  - `docs/ux/design-memory.md`
- Implementation Plan:
  - Reuse the split `/data/:table` workbench and existing `record-editor`
    typed editor pattern.
  - Add a typed editor only for the `tasks` module.
  - Wire create, update, and archive actions to the existing Tasks API
    (`POST /v1/tasks`, `PATCH /v1/tasks/:id`, `DELETE /v1/tasks/:id`).
  - Include status, priority, due date, project, task-list, and description
    fields without exposing ClickUp custom-field or sync controls in this
    local business-record editor.
  - Preserve new task draft inputs across background workspace refreshes.
  - Validate desktop and mobile rendered behavior with authenticated browser
    smokes.
- Acceptance Criteria:
  - Signed-in owners can create a task from `/data/tasks`.
  - Selecting a task loads title, status, priority, due date, project,
    task-list, and description into typed controls.
  - Saving updates the selected task and refreshes the record list, inspector,
    and task adapter state.
  - Archiving a selected task calls the Tasks archive API and shows archived
    status in the inspector.
  - The editor reuses shared `record-editor` styles and does not expose
    provider-specific write-back controls as generic local editing.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `npm test`,
    `git diff --check`, and authenticated Playwright desktop/mobile smokes
    pass.
  - Canonical task, project-state, planning, coverage-ledger, and UX memory
    docs are updated.
- Result Report:
  - Added typed task title, status, priority, due date, project, task-list, and
    description controls to `/data/tasks`.
  - Extended the typed editor selector so Notes, Projects, Clients, Task
    Lists, and Tasks share the same workbench pattern while other modules
    remain read-only.
  - Refreshing `tasks` table records now also updates the task adapter state so
    route-to-route UI remains coherent after mutations.
  - Local validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, `npm test` against disposable Postgres on port
    `55463`, and authenticated Playwright desktop/mobile smokes that created,
    edited, archived, and reloaded real Tasks API records.
  - Deployed to production at commit
    `5a1904c336e9fd97e2f4a6842a886253eda56cf5`; production health and static
    asset markers confirmed the typed Tasks editor code is live.

## V2GD-012 Drive Consent Guidance And Folder Picker

- Task Type: integration/ux
- Current Stage: verification
- Deliverable For This Stage: clearer Google OAuth setup guidance and
  checkbox-based Drive folder selection for import.
- Goal: Make Google Drive setup usable when Google blocks unverified/test apps,
  and remove the normal requirement to paste folder IDs before import.
- Scope:
  - `src/modules/integration-settings/integration-settings.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/tests/api.test.ts`
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/operations/agent-runtime-coverage-ledger.csv`
  - `docs/ux/design-memory.md`
- Implementation Plan:
  - Update Drive setup copy to explain Google Cloud OAuth consent, Testing
    mode test users, authorized redirect URI, unverified-app behavior, and the
    post-consent folder selection flow.
  - Add an owner-only folder discovery endpoint that lists Google Drive folders
    with the saved OAuth token and marks already selected folders.
  - Add the discovery route to the machine-readable capabilities manifest.
  - Add a Drive folder picker with checkboxes, selected-count feedback, and a
    save-selection action that persists `selectedFolderIds` and
    `rootFolderIds`.
  - Keep manual folder IDs as an advanced fallback for restricted accounts or
    Drive search limitations.
  - Validate backend behavior, desktop rendering, mobile rendering, and no
    console errors.
- Acceptance Criteria:
  - The setup guide explains why Google can block sign-in for unverified or
    testing apps and tells the owner to add their Google account as a test
    user.
  - After OAuth succeeds, owners can load Drive folders and choose import roots
    with checkboxes.
  - Saving selection persists the folder IDs into the Google Drive integration
    config.
  - Import uses checked folders first and falls back to the advanced folder-ID
    field when no discovered checkbox selection exists.
  - `/v1/connection` exposes the folder discovery route.
- Definition of Done:
  - `npm run build`, `node --check public/app.js`, `npm test`,
    `git diff --check`, and authenticated desktop/mobile Drive setup smokes
    pass.
  - Canonical task, project-state, planning, coverage-ledger, and UX memory
    docs are updated.
- Result Report:
  - Added `GET /v1/integration-settings/google_drive/folders/discover` for
    owner folder discovery via the saved Google Drive OAuth token.
  - Added checkbox-based Drive folder selection, selected-count feedback, and
    `Save selected folders` action in `/settings/drive`.
  - Updated Drive setup instructions for OAuth consent Testing mode, test
    users, authorized redirect URI, and unverified-app behavior, based on
    current Google OAuth verification guidance.
  - Local validation passed: `npm run build`, `node --check public/app.js`,
    `git diff --check`, `npm test` against disposable Postgres on port
    `55464`, and authenticated Playwright desktop/mobile `/settings/drive`
    smoke with no console errors or mobile horizontal overflow.
