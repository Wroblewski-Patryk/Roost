# Google Drive V2 Task Contracts

This file is the execution queue for the approved Google Drive v2 integration.
It follows the repository task contract and must stay synchronized with
`.codex/context/TASK_BOARD.md` and `docs/planning/mvp-next-commits.md`.

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
