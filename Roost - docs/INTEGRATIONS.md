# Integrations

## Service Adapter Onboarding

Paperclip, Jarvis, Jarvan, Aviary, n8n, and future service clients should start
from `docs/integrations/adapter-onboarding.md`.

The required first call for adapters is:

```http
GET /v1/connection
```

This validates the workspace API key, returns safe capability metadata, exposes
the machine-readable `adapterManifest.routes` map for canonical v1 paths, and
shows whether ClickUp is configured without exposing secret material.

Adapters that need a durable identity should create or reuse a workspace-scoped
agent record through `POST /v1/agents`, then attach `agentId` to
`POST /v1/agent-logs`.

CRM-style adapters such as Paperclip should write lead/customer timeline
activity through `POST /v1/interactions` instead of hiding it in notes or
agent logs.

## ClickUp To Company Core

v1 primary integration path:

```text
ClickUp API -> CompanyCore ClickUp adapter -> CompanyCore DB -> event
```

CompanyCore owns ClickUp as the first native integration adapter. This is the
reference pattern for future first-class integrations: keep credentials in
workspace-owned integration settings, isolate provider-specific code under
`src/integrations/<provider>/`, normalize external records into internal
models, and persist through the backend's existing workspace-scoped service
boundaries.

Company Core is responsible for:

- calling the ClickUp API through a dedicated adapter
- checking current official ClickUp documentation before adding or changing
  API mapping behavior
- reading ClickUp credentials/configuration from the active workspace's
  integration settings
- mapping ClickUp tasks into CompanyCore task fields
- upserting the task by `(workspace_id, source = clickup, external_id)`
- storing `source = clickup`
- preserving optional raw payload context
- emitting `task_synced_from_clickup`
- returning safe, non-secret error messages when ClickUp is unavailable or
  returns invalid data

n8n may still be used for optional orchestration when a workflow is better kept
outside the backend, but n8n is not the required primary ClickUp path in v1.

## Google Drive To Company Core

v2 primary integration path:

```text
Google Drive/Docs/Sheets APIs -> CompanyCore Google Drive adapter
  -> CompanyCore DB -> event/outbox
```

Google Drive is the second native integration adapter. It must reuse the same
workspace-owned settings, encrypted secret storage, safe provider client,
mapper, sync service, provider event inbox, agent outbox, and safe error
mapping pattern established for ClickUp.

CompanyCore is responsible for:

- checking current official Google Workspace documentation before adding or
  changing Drive, Docs, or Sheets API behavior
- storing Google OAuth refresh-token material as encrypted workspace
  integration secret material
- storing the Google OAuth web client ID and client secret as encrypted
  workspace integration secret material when owners configure Drive from the
  web console; process-level `GOOGLE_OAUTH_CLIENT_ID` and
  `GOOGLE_OAUTH_CLIENT_SECRET` remain fallback/runtime bootstrap options
- storing selected root folders, shared drives, sync policy, operating scope
  mappings, and Drive changes page tokens as non-secret setting config
- discovering Drive folders/files through paginated `files.list`
- mapping Drive folders into operating areas/folders/tables, storage
  locations, and knowledge roots
- upserting Drive folders/files by `(workspace_id, provider = google_drive,
  external_id)`
- extracting searchable content snapshots from Google Docs and Sheets
- creating and editing Google Docs/Sheets only through CompanyCore APIs
- refreshing local metadata/content snapshots after successful provider writes
- reconciling external edits through Drive `changes.list` first and
  `changes.watch` channels after the polling path is proven
- emitting provider-neutral file/content events for Jarvis, Paperclip, Aviary,
  and future GUI modules

Jarvis, Paperclip, Aviary, and future agents must read Google Drive metadata
and content through CompanyCore APIs. They must not receive raw Google OAuth
tokens or write directly to PostgreSQL. Structured extraction from Sheets or
Docs into CompanyCore business tables is allowed only when an explicit table
mapping exists and the write is auditable through CompanyCore events.

Official Google docs that shape the v2 contract:

- Drive `files.list` returns files with pagination through `nextPageToken` and
  supports query filtering with `q`, `spaces`, and all-drive flags.
- Drive `File` metadata includes `mimeType`, `parents`, `driveId`,
  `webViewLink`, `headRevisionId`, timestamps, owners, and trashed state.
- Drive folders/files have one direct parent in v3 metadata.
- Drive `files.create` creates metadata-only or upload-backed files and uses
  Google Workspace MIME types for Docs editors files.
- Drive `changes.list` returns user/shared-drive changes with
  `nextPageToken` and `newStartPageToken`; `changes.watch` subscribes to change
  notifications for later push-based freshness.
- Docs `documents.get` retrieves the latest document version; Docs
  `documents.batchUpdate` applies atomic document updates and supports write
  control.
- Sheets values APIs read and write ranges through `get`, `batchGet`,
  `update`, and `batchUpdate`; Sheets `spreadsheets.create` creates a new
  spreadsheet.

Initial import policy mirrors the ClickUp discipline:

- `merge`: default; upsert provider-owned folder/file rows and refresh changed
  snapshots.
- `skip_existing`: add only new Drive rows and leave existing provider-owned
  rows untouched.
- `replace_selected_folders`: after a successful provider fetch, replace only
  provider-owned Drive rows inside selected folders.
- `inspect_only`: fetch and report would-create/would-update counts without
  writing.

Implemented foundation:

- `PUT /v1/integration-settings/google_drive` stores encrypted OAuth client
  credentials, encrypted OAuth token material, and non-secret Drive
  configuration.
- `GET /v1/integration-settings/google_drive` returns safe setting metadata
  with `secretConfigured`, `oauthClientConfigured`, and
  `oauthTokenConfigured`, never OAuth tokens or client secrets.
- `GET /v1/connection` exposes safe Google Drive configuration state to
  Jarvis, Paperclip, Aviary, and future adapters.
- `src/integrations/google-drive/google-drive.client.ts` contains the safe
  client boundary for Drive file listing, Drive file creation, Drive changes,
  Docs get/batchUpdate, and Sheets create/read/write methods.
- `POST /v1/integration-settings/google_drive/import` imports selected Drive
  root folders plus nested folder/file hierarchy into `google_drive_files`
  using `merge`, `skip_existing`, `replace_selected_folders`, or
  `inspect_only`.
- Google Drive import emits `google_drive_import_succeeded` events with safe
  counts and selected folder IDs.
- `/v1/google-drive/files` lists imported Drive files with their latest content
  snapshot for Jarvis, Paperclip, Aviary, and future GUI clients.
- `/v1/google-drive/files/:id/content` refreshes a local content snapshot from
  Google Docs or Sheets through CompanyCore.
- `/v1/google-drive/files/:id/description` updates the CompanyCore-owned
  description note that tells agents and operators what a Drive item contains.
- `/v1/google-drive/docs` and `/v1/google-drive/sheets` create Google Docs and
  Sheets, optionally under a supplied Drive `parentId`, persist metadata,
  extract searchable content, and emit safe events. Google Sheets are created
  through Drive `files.create` with MIME type
  `application/vnd.google-apps.spreadsheet` so folder placement is controlled
  by CompanyCore before values are written through the Sheets API.
- `/v1/google-drive/docs/:id` and `/v1/google-drive/sheets/:id/values` write to
  Google first, then refresh CompanyCore metadata/content snapshots only after
  the provider write succeeds.
- `POST /v1/integration-settings/google_drive/changes/reconcile` consumes
  Drive `changes.list`, records provider deliveries in the provider event
  inbox, refreshes changed file metadata/content snapshots, marks removed files
  safely, updates the stored changes page token, and emits provider-neutral
  agent outbox events. If no stored changes page token exists yet, the route
  initializes a safe baseline through Drive `changes/startPageToken`, stores it,
  emits reconciliation evidence, and returns zero processed changes instead of
  failing the first reconcile attempt.
- `POST /v1/integration-settings/google_drive/oauth/authorize-url` generates a
  Google OAuth consent URL for owners using `access_type=offline`,
  `include_granted_scopes=true`, and the approved Drive/Docs/Sheets scopes.
- `POST /v1/integration-settings/google_drive/oauth/exchange` exchanges an
  authorization code through Google's token endpoint and stores encrypted
  OAuth material in the workspace setting.
- Runtime Google Drive calls refresh expired access tokens with the stored
  refresh token before calling Drive, Docs, or Sheets APIs.

Implemented first native slice:

```http
POST /tasks/sync/clickup/native
```

The endpoint performs pull-only task sync from configured ClickUp lists. It uses
ClickUp's `GET /api/v2/team/{team_Id}/task` endpoint with `list_ids[]` filters,
`include_closed=true`, `subtasks=true`, and
`include_markdown_description=true`. v1 does not write changes back to ClickUp.
Production operators can configure the workspace token and trigger the first
pull through `npm run clickup:bootstrap`; see
`docs/operations/clickup-production-bootstrap.md`.

The task import policy is explicit per workspace and per sync run:

- `merge` is the default. Native CompanyCore records stay untouched; ClickUp
  tasks are upserted by `(workspace_id, source = clickup, external_id)`.
- `skip_existing` leaves existing ClickUp tasks unchanged and adds only new
  ClickUp tasks.
- `replace_selected_lists` deletes only existing `source = clickup` tasks under
  the selected ClickUp Lists after a successful provider fetch, then inserts
  the fetched tasks fresh. Native/manual CompanyCore tasks are not deleted.
- `inspect_only` performs a no-write provider fetch and reports the number of
  tasks that would be created or updated.

The owner web console discovers available ClickUp Workspaces and Lists before
settings are saved:

```http
POST /v1/integration-settings/clickup/discover
```

Discovery calls ClickUp's authorized Workspaces, Spaces, Folders, folder Lists,
and folderless Lists endpoints. A submitted discovery token is never stored;
the save route remains the only path that encrypts token material. Existing
connections can rediscover structure with the stored encrypted token without
returning the token to the browser. Discovery with a selected ClickUp
Workspace persists non-secret structural metadata into the operating registry,
so later sync can place ClickUp tasks under the matching CompanyCore task list
and operating table.

Setting a ClickUp token does not automatically start continuous listening.
Continuous updates require an approved scheduled sync, webhook receiver, or
external orchestration task.

## ClickUp Structural Mapping

The long-term ClickUp adapter should preserve ClickUp structure instead of only
syncing flat tasks. The required structural mapping is:

| ClickUp API concept | CompanyCore target concept |
| --- | --- |
| Team in API v2 / Workspace in current UI | `workspace` external mapping |
| Space | `operating_area` external mapping |
| Folder | `operating_folder` external mapping |
| List | `operating_table` external mapping |
| Task | first-party business record, usually `task`, with provider mapping |
| Custom Field definition | `external_field_mapping` |
| Custom Field value | typed field value or raw mapped provider value |
| View | saved view metadata scoped to workspace, area, folder, or table |
| Webhook | workspace/folder/table-scoped provider trigger |

Implemented now:

- 12 CompanyCore operating areas are created per workspace.
- First-party API tables such as `goals`, `targets`, `task_lists`, and `tasks`
  are registered under stable operating areas.
- ClickUp discovery upserts Space/Folder/List container mappings.
- ClickUp Lists become operating tables with `source = clickup` and
  `external_id = <list id>`.
- ClickUp List Custom Fields are persisted as `external_field_mappings` and
  linked to the mapped operating table when the field belongs to a List.
- ClickUp Workspace and List Views are persisted as view container mappings.
- Native ClickUp task sync preserves task priority and attaches imported tasks
  to a matching `task_lists` row by ClickUp List ID.
- Native ClickUp task sync reports `deletedCount`, `wouldCreateCount`, and
  `wouldUpdateCount` so first-run decisions are auditable before data is
  changed.

Official ClickUp docs that affected this contract:

- API v2 uses `Team` where the current product says Workspace.
- A Team/Workspace contains Spaces, Folders, Lists, and tasks.
- Tasks include name, description or Markdown description, assignees, status,
  priority, dates, tags, Custom Fields, estimates, points, parent/subtask, and
  dependency metadata.
- Updating task Custom Fields requires the Set Custom Field Value endpoint;
  the normal Update Task endpoint does not update those values.
- Views can be attached to the Workspace, Space, Folder, or List level.
- Rate limits are per token and must be handled as provider backpressure.
- ClickUp webhooks use an `X-Signature` HMAC signature that must be verified
  before processing webhook events.
- ClickUp webhook registrations are created with the user's token and stop
  triggering when the creating user loses access to the relevant hierarchy.
- ClickUp webhook health depends on CompanyCore returning successful HTTP
  responses quickly; inactive webhooks must be reactivated through the webhook
  update endpoint.

Future write-back and broad sync must include explicit tests for these mapping
rules before release. Webhook ingestion is now the approved next integration
slice.

## ClickUp Webhook Trigger Plan

ClickUp webhook ingestion is the canonical real-time trigger model for
CompanyCore. The implementation must follow the current ClickUp docs:

- Register webhooks with `POST /api/v2/team/{team_id}/webhook`.
- Store the returned webhook ID and secret in workspace-scoped encrypted
  integration data.
- Use selected List IDs as the default webhook location scope. Use a wildcard
  event subscription only during controlled testing; production should begin
  with task events such as `taskCreated`, `taskUpdated`, `taskDeleted`, and
  `taskStatusUpdated`.
- Verify every incoming webhook using the `X-Signature` header and HMAC
  SHA-256 over the exact raw request body before trusting any payload fields.
- Treat `taskStatusUpdated` as a first-class business trigger because it can
  tell Paperclip, Jarvis, Aviary, or future agents that a record crossed a
  workflow boundary.
- Track webhook health and support reactivation because ClickUp webhooks are
  tied to the user token that created them.

Runtime layers:

- `webhook registration service`: lists existing ClickUp webhooks for the
  configured Workspace, creates missing selected-List webhooks, updates stale
  event/endpoint scopes, and disables old CompanyCore-owned webhooks safely.
- `webhook receiver`: public route under the API domain, raw-body capture,
  `X-Signature` verification, stable error responses, and quick `2xx`
  acknowledgement after durable inbox write.
- `provider event inbox`: database table for raw safe webhook metadata,
  webhook ID, event name, task ID, history item IDs, signature status, received
  timestamp, processing status, retry count, and idempotency key.
- `event processor`: maps ClickUp webhook payloads into CompanyCore task
  changes, fetches the full task from ClickUp when the payload is only a delta,
  and emits internal events.
- `agent event bridge`: durable outbox or event API surface that lets
  Paperclip, Jarvis, Aviary, and future modules consume CompanyCore events
  without each agent implementing ClickUp-specific webhook logic.

Idempotency:

- Prefer ClickUp `history_items[].id` plus `webhook_id` and event name as the
  idempotency key when present.
- Fall back to `webhook_id:event:task_id:received_payload_hash` only when
  history item IDs are absent.
- Reprocessing the same webhook must not duplicate tasks, task events, agent
  signals, or automation runs.

Agent bridge behavior:

- `taskStatusUpdated` should update the local task status, emit
  `task_status_updated_from_clickup`, and enqueue an agent-visible event with
  before/after status, task ID, external ClickUp task ID, list/table scope, and
  actor metadata when available.
- Paperclip can subscribe to status-change events to start or continue
  workflow work.
- Jarvis can use the same event stream to refresh context and answer with
  current task state.
- Aviary can use the same event stream for notification or orchestration
  surfaces.
- Agents should read CompanyCore events/outbox through CompanyCore APIs; they
  should not receive raw ClickUp tokens or verify ClickUp signatures
  themselves.

Delivery slices:

1. Add schema for webhook registrations, provider webhook inbox, and agent
   event outbox.
2. Add raw-body webhook receiver and signature verification tests.
3. Add ClickUp webhook registration/reconciliation service and owner API.
4. Add task event processor for `taskCreated`, `taskUpdated`, `taskDeleted`,
   and `taskStatusUpdated`.
5. Add agent event bridge endpoints and Paperclip/Jarvis/Aviary consumption
   contract.
6. Deploy behind the existing API domain, create webhooks for selected Lists,
   and run a real ClickUp status-change smoke.

## Adapter Contract

Every first-class integration adapter must use the same runtime layers:

- `settings reader`: loads active workspace-owned provider settings and
  decrypts secrets inside the backend process
- `provider client`: owns external HTTP calls, timeouts, provider
  authentication, and provider response normalization boundaries
- `mapper`: converts provider records into CompanyCore input shapes without DB
  writes
- `sync service`: owns idempotency, persistence, event emission, and result
  summaries
- `safe error mapper`: converts provider/network/backend failures into stable
  CompanyCore error codes without leaking raw payloads or tokens

Provider clients must not read environment-level provider tokens directly. They
receive credentials from the settings reader for the active workspace.

## Idempotency

External records must be upserted by workspace, source, and external ID:

```text
(workspace_id, source, external_id)
```

For ClickUp, `source` is `clickup` and `external_id` is the ClickUp task ID.
Sync must not use a provider ID alone because two workspaces can connect to
different ClickUp accounts with overlapping IDs.

## Sync Signals

Native sync should emit or record the following safe signals:

- `sync_started`: provider, workspace ID, requested scope, import mode,
  correlation ID
- `sync_succeeded`: provider, workspace ID, import mode, item counts,
  created/updated/skipped/deleted counts, and inspect-only would-write counts
- `sync_failed`: provider, workspace ID, safe error code, correlation ID
- `task_synced_from_clickup`: per meaningful task upsert, linked to the task

Logs and events must not include provider tokens, raw API keys, passwords, auth
tokens, or full raw provider payloads. Store only safe counts, IDs, and
redacted diagnostics.

## Provider Failure Behavior

Integration failures must fail closed:

- missing workspace settings returns `integration_not_configured`
- provider auth/network/5xx failures return `integration_unavailable`
- malformed provider data returns `sync_failed` or a more specific safe code
- partial sync must preserve existing CompanyCore records unless a validated
  upsert succeeds
- failed sync must not mark tasks as deleted, archived, or completed
- provider errors must not expose raw provider response bodies to clients

## Legacy Or External Payload Sync

`POST /tasks/sync/clickup` remains useful for manually shaped payloads, tests,
or external orchestration. It should use the same normalization and upsert
rules as the native adapter so ClickUp data behaves consistently regardless of
trigger source.

## Workspace-Owned Settings

Integration settings belong to a workspace. v1 should support ClickUp settings
first, with a structure that future integrations can reuse:

- provider name, for example `clickup`
- workspace owner or active workspace reference
- secret token material stored through the approved secret-storage mechanism
- non-secret sync configuration such as team, space, folder, or list IDs
- sync status and last successful sync timestamp when needed

Implemented v1 configuration endpoints:

```http
GET /integration-settings/clickup
PUT /integration-settings/clickup
```

Secrets are encrypted at rest with the application integration secret key and
are not returned in API responses or written to logs. Native adapters should
read provider settings through `src/integrations/integration-settings.service.ts`
instead of querying the table directly.

## ClickUp Smoke Signals

The first native ClickUp implementation must be smoke-tested by verifying:

- owner can configure ClickUp settings and the response redacts the token
- missing settings return `integration_not_configured`
- provider failure returns a safe integration error
- selected ClickUp list sync creates or updates tasks idempotently
- `task_synced_from_clickup` appears in `GET /events`
- logs/events include provider, workspace, counts, and safe error codes only

## Paperclip

Paperclip should use Company Core as operational memory through the API:

- read projects, goals, targets, and tasks before planning work
- write notes and decisions when durable context appears
- read events for recent operational changes

Paperclip should not write directly to Postgres.

## Jarvis

Jarvis can use the same API for daily operations, summaries, and task updates.
Any writes should include a meaningful `source`, such as `jarvis`.
