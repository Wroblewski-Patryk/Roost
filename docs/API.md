# API

All endpoints except `GET /health`, `POST /auth/register`, and
`POST /auth/login` require one supported auth mechanism:

```text
X-API-Key: dev-companycore-key
```

```text
Authorization: Bearer <owner-auth-token>
```

Base URL in local Docker:

```text
http://localhost:3000
```

The minimal owner console is served from `/`. It is intentionally limited to
owner login, ClickUp settings, and native ClickUp sync in v1. Agents,
automations, future dashboards, and future mobile clients should still use the
HTTP API.

v1 routes are available under `/v1/*` without an `/api` prefix because the API
uses a dedicated API domain in production. Root-level routes remain as v1
compatibility aliases.

## Response Contract

CompanyCore v1 should use stable response envelopes so Paperclip, Jarvis,
future GUI clients, and tests can rely on predictable shapes.

Successful single-resource responses:

```json
{
  "data": {
    "id": "uuid"
  }
}
```

Successful list responses:

```json
{
  "data": []
}
```

Future pagination may add `meta`, but existing clients should not require it
until the endpoint documents pagination explicitly.

Error responses:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed.",
    "details": {}
  }
}
```

Rules:

- `error.code` is stable and testable.
- `error.message` is safe for API clients and operators.
- `error.details` is optional and must not include secrets.
- Raw Prisma, provider, stack trace, token, password, API key, or validation
  internals must not be returned directly.
- Protected endpoints should not reveal whether another workspace's record
  exists.

## Workspace Guardrail Contract

Every protected workspace-scoped endpoint must follow these API rules:

- derive `workspaceId` from auth context or service API key
- ignore or reject client attempts to set `workspaceId` directly unless an
  endpoint explicitly documents a safe bootstrap exception
- list only active workspace records
- reject foreign relation IDs from another workspace
- return `not_found` or `forbidden` for cross-workspace record access without
  leaking whether the record exists
- return `workspace_required` when auth succeeds but no workspace can be
  resolved
- never return integration secret values

Implemented v1 workspace-scoped record surfaces:

- projects, goals, targets, tasks, clients, deals, notes, decisions,
  agent logs, and events derive `workspaceId` from the auth context.
- relation IDs such as `projectId`, `goalId`, `clientId`, `dealId`, and
  `taskId` are accepted only when the related record belongs to the active
  workspace.
- attempts to attach a record to another workspace return `not_found`.

## Standard Error Codes

| HTTP | Code | Use |
| --- | --- | --- |
| 400 | `validation_error` | Request body, params, or query failed validation. |
| 401 | `unauthorized` | No valid user auth or service API key was provided. |
| 403 | `forbidden` | Authenticated caller cannot perform the action. |
| 404 | `not_found` | Record is missing or not visible to the active workspace. |
| 409 | `conflict` | Unique constraint or state conflict. |
| 422 | `workspace_required` | Request cannot resolve an active workspace. |
| 422 | `integration_not_configured` | Workspace lacks required provider settings. |
| 400 | `integration_secret_required` | New provider setting was created without required token material. |
| 401 | `integration_invalid_token` | External provider rejected submitted or stored token material. |
| 429 | `integration_rate_limited` | External provider rate limit was reached. |
| 502 | `integration_unavailable` | External provider is unavailable or returned an unsafe response. |
| 500 | `sync_failed` | Sync failed after request validation and provider call handling. |
| 500 | `internal_server_error` | Unexpected server error with no safe specific code. |

Implementation should map framework/provider/database errors into this contract
instead of exposing raw errors.

## Auth And Workspace

v1 must add owner registration/login before workspace-owned settings are
production-ready. Registration should create an owner user and workspace in one
transaction. Protected business and integration routes should resolve an active
`workspaceId` from either a user auth context or a workspace-scoped service API
key.

Approved v1 auth direction:

- Human owner auth uses email/password with hashed password storage.
- Registration creates the owner user, workspace, and owner membership
  atomically.
- Workspace memberships are included in the data model, but v1 only activates
  the `owner` role.
- Agent/service access uses workspace-scoped hashed API keys.
- Protected routes must accept a valid owner auth context or workspace service
  API key and resolve `workspaceId`.
- Requests without a resolvable workspace fail closed.

Implemented minimum:

```http
POST /auth/register
POST /auth/login
GET /auth/me
```

Planned registration payload:

```json
{
  "email": "owner@example.com",
  "password": "strong-password",
  "name": "Owner Name",
  "workspaceName": "LuckySparrow"
}
```

Safe auth responses may include user and workspace identifiers, but must not
include password hashes, raw API keys, integration tokens, or secret material.

Integration settings such as ClickUp credentials must belong to the active
workspace and must not be returned in API responses.

## Service API Keys

`X-API-Key` remains the service-client auth mechanism for Paperclip, Jarvis,
n8n, and other agents. In v1 it must become workspace-scoped:

- API key resolves exactly one workspace.
- API key material is stored hashed.
- Existing plaintext-key rows are accepted only as a transition path when
  `key_hash` is not populated yet.
- Inactive keys fail closed.
- Service-key scopes are enforced against route capabilities. A scoped key can
  call only routes whose capability appears in its `scopes` array.
- Empty scopes, `*`, `companycore:*`, and legacy `adapter:*` scopes currently
  retain broad compatibility for already deployed Jarvis/Paperclip-style
  agents. New keys should use explicit route capabilities.
- Raw keys are only shown once if an API key creation endpoint is added.

Owner-managed adapter keys:

```http
GET /v1/api-keys
POST /v1/api-keys
PATCH /v1/api-keys/:id
GET /api-keys
POST /api-keys
PATCH /api-keys/:id
```

`POST /v1/api-keys` is owner-only and returns the raw API key exactly once:

```json
{
  "name": "Jarvan adapter",
  "scopes": ["adapter:jarvan"]
}
```

Safe response:

```json
{
  "data": {
    "id": "uuid",
    "name": "Jarvan adapter",
    "keyPrefix": "cc_v1_abcd",
    "key": "cc_v1_generated-secret-shown-once",
    "active": true
  }
}
```

List and update responses never include `key`. `PATCH /v1/api-keys/:id`
currently supports `{ "active": false }` or `{ "active": true }`.

## Integration Settings

Workspace-owned integration settings are configured through protected routes.
The active `workspaceId` is derived from bearer auth or `X-API-Key`; clients do
not send `workspaceId`.

```http
GET /integration-settings/clickup
PUT /integration-settings/clickup
POST /v1/integration-settings/clickup/discover
GET /v1/integration-settings/clickup/webhooks
POST /v1/integration-settings/clickup/webhooks/reconcile
DELETE /v1/integration-settings/clickup/webhooks/:id
GET /v1/integration-settings/clickup/events
POST /v1/integration-settings/clickup/events/retry-failed
POST /v1/integration-settings/clickup/maintenance/run
```

ClickUp configuration payload:

```json
{
  "token": "clickup-api-token",
  "config": {
    "teamId": "clickup-team-id",
    "spaceIds": ["clickup-space-id"],
    "folderIds": ["clickup-folder-id"],
    "listIds": ["clickup-list-id"],
    "syncMode": "two_way",
    "importMode": "merge"
  },
  "active": true
}
```

Safe responses include only metadata and non-secret config:

```json
{
  "data": {
    "provider": "clickup",
    "workspaceId": "uuid",
    "config": {
      "listIds": ["clickup-list-id"],
      "syncMode": "pull",
      "importMode": "merge"
    },
    "active": true,
    "secretConfigured": true
  }
}
```

`token` is encrypted before storage and is never returned. Updating config
without a `token` preserves the existing encrypted secret. Creating a new
setting requires a token.

The owner console uses discovery before saving settings so humans do not need
to manually look up ClickUp IDs. Discovery is owner-auth only and never stores
the submitted token:

```json
{
  "token": "clickup-api-token",
  "teamId": "optional-clickup-workspace-id",
  "useStoredToken": false
}
```

If `teamId` is omitted, discovery returns ClickUp Workspaces available to the
token. If `teamId` is provided, discovery also returns Spaces, Folders,
folderless Lists, and folder Lists for that ClickUp Workspace. If
`useStoredToken` is true, CompanyCore uses the encrypted workspace ClickUp
token and still does not return it to the browser.

When discovery includes a selected `teamId`, CompanyCore also persists safe
ClickUp structural metadata into the operating model registry:

- ClickUp Workspace as an external container mapping.
- ClickUp Spaces mapped to operating areas.
- ClickUp Folders mapped to operating folders.
- ClickUp Lists mapped to operating tables.

This persistence is idempotent and stores provider IDs/names only, not token
material.

Webhook reconciliation compares CompanyCore registrations with ClickUp's remote
webhook list, creates missing selected List webhooks, refreshes health metadata,
reactivates inactive remote webhooks when possible, replaces registrations that
no longer exist in ClickUp, and marks registrations for no-longer-selected
Lists inactive. Owner users can delete a single registration through
`DELETE /v1/integration-settings/clickup/webhooks/:id`, which first deletes the
remote ClickUp webhook and then removes the local encrypted registration.

Provider event inbox health is exposed without returning raw webhook payloads:

```http
GET /v1/integration-settings/clickup/events?status=failed
POST /v1/integration-settings/clickup/events/retry-failed
```

`GET /clickup/events` returns safe metadata such as event name, external task
ID, processing status, retry count, last error code, and timestamps. Owner users
can replay failed events with:

```json
{
  "eventIds": ["provider-event-uuid"],
  "limit": 25
}
```

Replay reprocesses failed inbox rows through the same ClickUp task/comment
mapper, clears `lastErrorCode` on success, and leaves still-failing rows in
`failed` state with an incremented retry count.

`POST /clickup/maintenance/run` is the canonical continuous-sync fallback for
agents or operators. It performs, in order:

- webhook registration reconciliation and health refresh
- failed provider-event replay
- non-destructive ClickUp task pull using `merge` by default

The endpoint accepts a limited import mode override:

```json
{
  "importMode": "merge"
}
```

Allowed maintenance modes are `merge`, `skip_existing`, and `inspect_only`.
`replace_selected_lists` is intentionally excluded from maintenance because it
is a destructive first-run/import-repair policy, not an always-on freshness
operation.

The backend also runs this maintenance flow automatically for active ClickUp
workspace settings when `COMPANYCORE_PUBLIC_API_BASE_URL` is configured. The
default cadence is 15 minutes and can be changed with
`CLICKUP_MAINTENANCE_INTERVAL_MINUTES`; values below 5 minutes are clamped to 5
minutes. Scheduled maintenance always uses `merge` so it refreshes ClickUp-owned
records without deleting native CompanyCore records.

Safe discovery response:

```json
{
  "data": {
    "workspaces": [
      {
        "id": "clickup-workspace-id",
        "name": "LuckySparrow"
      }
    ],
    "selectedWorkspace": {
      "id": "clickup-workspace-id",
      "name": "LuckySparrow"
    },
    "spaces": [
      {
        "id": "space-id",
        "name": "Operations",
        "lists": [
          {
            "id": "folderless-list-id",
            "name": "Inbox"
          }
        ],
        "folders": [
          {
            "id": "folder-id",
            "name": "Company",
            "lists": [
              {
                "id": "list-id",
                "name": "Jarvis"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Health

```http
GET /health
```

## Connection Handshake

Adapters should call this endpoint first to verify that their workspace API key
is valid and to discover safe v1 capabilities.

```http
GET /v1/connection
GET /connection
```

Safe response:

```json
{
  "data": {
    "service": "companycore",
    "apiVersion": "v1",
    "status": "ok",
    "auth": {
      "type": "api_key",
      "workspaceId": "uuid"
    },
    "workspace": {
      "id": "uuid",
      "name": "LuckySparrow"
    },
    "operatingModel": {
      "hierarchy": "workspace -> operating_area -> operating_folder -> operating_table -> record",
      "areas": [
        {
          "key": "strategy-governance",
          "name": "Strategy and governance",
          "tables": [
            {
              "tableName": "goals",
              "apiSlug": "goals",
              "name": "Goals",
              "source": "companycore"
            },
            {
              "tableName": "targets",
              "apiSlug": "targets",
              "name": "Targets",
              "source": "companycore"
            }
          ]
        }
      ],
      "systemTables": ["users", "workspaces", "api_keys"]
    },
    "capabilities": ["operating-model:read", "tasks:read", "tasks:write", "events:read"],
    "scopeMode": "scoped",
    "adapterManifest": {
      "basePath": "/v1",
      "schemaVersion": "2026-05-06",
      "auth": {
        "serviceHeader": "X-API-Key",
        "ownerHeader": "Authorization: Bearer <token>"
      },
      "routes": {
        "tasks": [
          {
            "method": "POST",
            "path": "/v1/tasks",
            "capability": "tasks:write"
          }
        ],
        "taskLists": [
          {
            "method": "PATCH",
            "path": "/v1/task-lists/:id",
            "capability": "task-lists:write"
          }
        ],
        "pipelineStages": [
          {
            "method": "PATCH",
            "path": "/v1/pipeline-stages/:id",
            "capability": "pipeline-stages:write"
          }
        ],
        "agents": [
          {
            "method": "POST",
            "path": "/v1/agents",
            "capability": "agents:write"
          }
        ],
        "interactions": [
          {
            "method": "POST",
            "path": "/v1/interactions",
            "capability": "interactions:write"
          }
        ],
        "events": [
          {
            "method": "GET",
            "path": "/v1/events",
            "capability": "events:read"
          }
        ]
      },
      "writeRules": [
        "Do not send workspaceId in write payloads."
      ],
      "schemas": {
        "note": {
          "create": {
            "required": ["content"],
            "optional": ["projectId", "taskId", "clientId", "dealId", "status", "externalId", "source"]
          }
        },
        "agentLog": {
          "create": {
            "required": ["message"],
            "optional": ["agentId", "level", "metadata"]
          }
        }
      },
      "errors": {
        "401": "Stop write mode because credentials are missing or invalid.",
        "403": "Stop the attempted action because the key lacks permission."
      }
    },
    "integrations": {
      "clickup": {
        "configured": true,
        "active": true,
        "config": {
          "listIds": ["clickup-list-id"],
          "syncMode": "pull"
        }
      }
    }
  }
}
```

The `adapterManifest` is the machine-readable v1 onboarding surface for
Paperclip, Jarvis, Jarvan, Aviary, n8n, and similar clients. It lists canonical
paths, methods, expected capabilities, payload field hints, safe error
behavior, and write rules without exposing secrets. `data.capabilities` is
filtered to the authenticated key's effective capabilities unless the key is in
documented broad compatibility mode.

## Agent CRUD Rollout Policy

The active rollout plan for teaching agents to read and write CompanyCore data
is `docs/planning/agent-crud-api-rollout-plan.md`.

Agent-facing access must follow these rules:

- business records should converge on list, single-record read, create, update,
  and safe archive/delete routes
- system, auth, secret, provider inbox, webhook, event, and audit tables must
  expose controlled domain actions instead of raw CRUD
- agents must discover available operations through `GET /v1/connection`
  before attempting writes
- service clients must never send `workspaceId`; the API derives workspace
  ownership from auth
- raw API keys, passwords, provider tokens, webhook secrets, and raw provider
  failures must never be returned
- destructive behavior must be guarded by relation checks, workspace checks,
  and provider ownership checks

Business `DELETE` routes are soft lifecycle operations. They preserve database
history and relation integrity by setting the record status to `archived`, or
to `retired` for agents. They do not hard-delete rows.

Provider and system lifecycle routes are intentionally action-shaped. Agents
may use advertised routes such as event `ack`, provider-event `retry`,
webhook `reconcile`, Drive file `scope`, Drive changes `reconcile`, and
Docs/Sheets write actions. Agents must not infer or call raw CRUD routes for
system tables such as API keys, integration settings, provider inbox rows,
webhook registrations, event rows, users, workspaces, or memberships.

Current table policy summary:

| Area | Tables | Agent access target |
| --- | --- | --- |
| Business records | `projects`, `goals`, `targets`, `task_lists`, `tasks`, `clients`, `pipeline_stages`, `deals`, `interactions`, `notes`, `decisions`, `agents` | Full workspace-scoped read/create/update plus safe archive/delete where allowed. |
| Agent observability | `agent_logs`, `agent_event_outbox`, `events` | Append/read or read/ack lifecycle; no broad raw delete. |
| Operating registry | `operating_areas`, `operating_folders`, `operating_tables`, `storage_locations`, `knowledge_roots`, `automation_definitions` | Scoped lifecycle APIs, with protected fallback/system records. |
| Provider registry | `external_container_mappings`, `external_field_mappings`, `google_drive_files`, `google_drive_content_snapshots`, `external_webhook_registrations`, `provider_event_inbox` | Provider-backed read, scope, refresh, retry, reconcile, and delete-through-provider actions. |
| Security and tenancy | `users`, `workspaces`, `workspace_memberships`, `api_keys`, `integration_settings` | Auth, owner account, API key, and provider settings actions only; no agent raw CRUD. |

## Operating Model

Adapters can read the workspace operating model and register scoped storage,
knowledge, and automation metadata through protected routes.

```http
GET /v1/operating-model
GET /v1/operating-model/areas
POST /v1/operating-model/areas
PATCH /v1/operating-model/areas/:id
DELETE /v1/operating-model/areas/:id
GET /v1/operating-model/tables
GET /v1/operating-model/folders
GET /v1/operating-model/folders/:id
POST /v1/operating-model/folders
PATCH /v1/operating-model/folders/:id
DELETE /v1/operating-model/folders/:id
GET /v1/operating-model/external-mappings
GET /v1/operating-model/external-fields
GET /v1/operating-model/storage-locations
GET /v1/operating-model/storage-locations/:id
POST /v1/operating-model/storage-locations
PATCH /v1/operating-model/storage-locations/:id
DELETE /v1/operating-model/storage-locations/:id
GET /v1/operating-model/knowledge-roots
GET /v1/operating-model/knowledge-roots/:id
POST /v1/operating-model/knowledge-roots
PATCH /v1/operating-model/knowledge-roots/:id
DELETE /v1/operating-model/knowledge-roots/:id
GET /v1/operating-model/automation-definitions
GET /v1/operating-model/automation-definitions/:id
POST /v1/operating-model/automation-definitions
PATCH /v1/operating-model/automation-definitions/:id
DELETE /v1/operating-model/automation-definitions/:id
```

Write payloads derive `workspaceId` from auth. Optional `areaId`, `folderId`,
and `tableId` must belong to the active workspace and to each other; otherwise
the API returns `not_found`.

Operating area payload:

```json
{
  "name": "Customer onboarding",
  "description": "User-created area for a focused operating slice"
}
```

CompanyCore catalog areas are returned with `isSystem: true`. System areas,
including the protected fallback `00. Glowny` / `main-general`, cannot be
renamed or deleted through the API. User-created areas have `isSystem: false`
and can be deleted only with explicit reassignment:

```json
{
  "reassignToAreaId": "uuid"
}
```

Deleting a user-created area reassigns its operating folders, operating tables,
provider mappings, storage locations, knowledge roots, automation definitions,
and Google Drive file scope to the selected target area before removing the
area row.

Operating folder payload:

```json
{
  "areaId": "uuid",
  "name": "Agent memory",
  "description": "Folder for agent-readable operating context"
}
```

Folder deletion is guarded. If a folder owns operating tables, the API returns
`conflict` instead of deleting it. Storage locations, knowledge roots, and
automation definitions can be deleted directly because related provider/file
records use nullable references and keep their own history.

Storage location payload:

```json
{
  "tableId": "uuid",
  "provider": "google_drive",
  "name": "Goals folder",
  "locator": {
    "folderId": "drive-folder-id"
  }
}
```

Knowledge root payload:

```json
{
  "tableId": "uuid",
  "provider": "obsidian",
  "name": "Goals vault",
  "locator": {
    "path": "CompanyCore/Strategy/Goals"
  }
}
```

Automation definition payload:

```json
{
  "tableId": "uuid",
  "provider": "clickup",
  "triggerType": "scheduled_pull",
  "name": "Goals table scheduled pull",
  "config": {
    "cadence": "manual"
  }
}
```

## Projects

```http
GET /v1/projects
GET /v1/projects/:id
POST /v1/projects
PATCH /v1/projects/:id
DELETE /v1/projects/:id
GET /projects
GET /projects/:id
POST /projects
PATCH /projects/:id
DELETE /projects/:id
```

```json
{
  "name": "Paperclip Growth",
  "description": "Strategic work for Paperclip"
}
```

## Goals

```http
GET /goals
GET /goals/:id
POST /goals
PATCH /goals/:id
DELETE /goals/:id
```

```json
{
  "projectId": "uuid",
  "title": "Reach first paying customers"
}
```

## Targets

```http
GET /targets
GET /targets/:id
POST /targets
PATCH /targets/:id
DELETE /targets/:id
```

```json
{
  "goalId": "uuid",
  "title": "Book 10 discovery calls",
  "metric": "calls",
  "targetValue": 10
}
```

## Task Lists

```http
GET /v1/task-lists
GET /v1/task-lists/:id
POST /v1/task-lists
PATCH /v1/task-lists/:id
DELETE /v1/task-lists/:id
GET /task-lists
GET /task-lists/:id
POST /task-lists
PATCH /task-lists/:id
DELETE /task-lists/:id
```

```json
{
  "projectId": "uuid",
  "name": "Paperclip intake",
  "description": "Lead capture tasks",
  "source": "paperclip"
}
```

Task lists are workspace-scoped. If `projectId` is provided, it must belong to
the active workspace. v1 supports list/create/update and intentionally does not
delete task lists yet.

## Tasks

```http
GET /v1/tasks
GET /v1/tasks/:id
POST /v1/tasks
PATCH /v1/tasks/:id
DELETE /v1/tasks/:id
POST /v1/tasks/:id/clickup/custom-fields/:fieldId
POST /v1/tasks/sync/clickup
POST /v1/tasks/sync/clickup/native
GET /tasks
GET /tasks/:id
POST /tasks
PATCH /tasks/:id
DELETE /tasks/:id
POST /tasks/:id/clickup/custom-fields/:fieldId
POST /tasks/sync/clickup
POST /tasks/sync/clickup/native
```

```json
{
  "projectId": "uuid",
  "title": "Prepare outreach list",
  "status": "todo"
}
```

ClickUp sync payload for external/manual orchestration:

```json
{
  "externalId": "clickup-task-id",
  "title": "Follow up with lead",
  "status": "in_progress",
  "projectId": "uuid",
  "raw": {
    "sourceWorkflow": "n8n"
  }
}
```

The primary v1 ClickUp path should be the native CompanyCore ClickUp adapter.
`POST /tasks/sync/clickup` remains as a compatible ingestion endpoint for
tests, manual repair, or optional orchestration. Native sync should use the
active workspace's ClickUp settings and upsert by `(workspace_id, source,
external_id)`.

`POST /tasks/sync/clickup/native` triggers the native pull-only ClickUp adapter
for the authenticated workspace. It reads `teamId` and `listIds` from
`/integration-settings/clickup`, calls ClickUp using the encrypted workspace
token, applies the selected import mode, and emits sync events. The request
body may override the saved import mode for a single run:

```json
{
  "importMode": "merge"
}
```

Supported import modes:

- `merge`: default safe mode. Existing native CompanyCore records are left
  untouched. ClickUp records are upserted by `(workspace_id, source,
  external_id)`, so existing ClickUp tasks are updated and new ClickUp tasks are
  added.
- `skip_existing`: existing ClickUp tasks are left unchanged and only new
  ClickUp tasks are added.
- `replace_selected_lists`: after ClickUp fetch succeeds, existing
  `source = clickup` tasks under the selected ClickUp Lists are deleted and the
  fetched records are inserted fresh. Native/manual CompanyCore tasks are not
  deleted.
- `inspect_only`: fetches ClickUp and reports what would be created or updated
  without writing or deleting any task records.

Imported ClickUp task fields currently mapped:

- `name` -> `tasks.title`
- Markdown/plain description -> `tasks.description`
- ClickUp status/type -> `tasks.status`
- ClickUp priority label -> `tasks.priority`
- `due_date` -> `tasks.due_date`
- task ID -> `tasks.external_id`
- list ID -> matching `task_lists.external_id` when present or a created
  ClickUp task list when missing

This means task imports can preserve priority and land under the right
CompanyCore task list once ClickUp discovery has persisted the List mapping.

For ClickUp-sourced tasks, `PATCH /v1/tasks/:id` writes supported CompanyCore
edits back to ClickUp before saving the local update. Supported write-back
fields are title, description, status, priority, and due date. Provider
failures return the mapped integration error and emit `clickup_writeback_failed`.

When `POST /v1/tasks` targets a ClickUp-sourced task list, CompanyCore creates
the task in ClickUp first, then stores the returned ClickUp task ID as
`externalId` with `source = clickup`. This keeps CompanyCore as the API source
of truth while preserving ClickUp as the mapped external workspace/list surface.

`DELETE /v1/tasks/:id` archives ClickUp-sourced tasks in ClickUp before marking
the local task `archived`. Native/manual CompanyCore tasks are archived locally.

`POST /v1/tasks/:id/clickup/custom-fields/:fieldId` sets a mapped ClickUp Custom
Field value for a ClickUp-sourced task. The field must exist in
`external_field_mappings` for the workspace, and provider failures emit
`clickup_custom_field_update_failed`.

Safe native sync response:

```json
{
  "data": {
    "provider": "clickup",
    "workspaceId": "uuid",
    "importMode": "merge",
    "itemCount": 12,
    "createdCount": 4,
    "updatedCount": 8,
    "skippedCount": 0,
    "deletedCount": 0,
    "wouldCreateCount": 0,
    "wouldUpdateCount": 0
  }
}
```

## Clients

```http
GET /clients
GET /clients/:id
POST /clients
PATCH /clients/:id
DELETE /clients/:id
```

```json
{
  "name": "Jane Doe",
  "companyName": "Example Co",
  "email": "jane@example.com"
}
```

## Pipeline Stages

```http
GET /v1/pipeline-stages
GET /v1/pipeline-stages/:id
POST /v1/pipeline-stages
PATCH /v1/pipeline-stages/:id
DELETE /v1/pipeline-stages/:id
GET /pipeline-stages
GET /pipeline-stages/:id
POST /pipeline-stages
PATCH /pipeline-stages/:id
DELETE /pipeline-stages/:id
```

```json
{
  "name": "Qualified",
  "position": 10,
  "source": "companycore"
}
```

Pipeline stages are workspace-scoped CRM configuration records. v1 supports
list/create/update and intentionally does not delete stages yet.

## Deals

```http
GET /deals
GET /deals/:id
POST /deals
PATCH /deals/:id
DELETE /deals/:id
```

```json
{
  "clientId": "uuid",
  "title": "Pilot contract",
  "value": 5000,
  "currency": "PLN"
}
```

## Interactions

```http
GET /v1/interactions
GET /v1/interactions/:id
POST /v1/interactions
PATCH /v1/interactions/:id
DELETE /v1/interactions/:id
GET /interactions
GET /interactions/:id
POST /interactions
PATCH /interactions/:id
DELETE /interactions/:id
```

```json
{
  "clientId": "uuid",
  "type": "email",
  "summary": "Paperclip captured a reply from the lead",
  "occurredAt": "2026-05-03T10:00:00.000Z",
  "source": "paperclip"
}
```

Interactions are workspace-scoped CRM timeline records. If `clientId` is
provided, it must belong to the active workspace.

## Notes

```http
GET /v1/notes
GET /v1/notes/:id
POST /v1/notes
PATCH /v1/notes/:id
DELETE /v1/notes/:id
GET /notes
GET /notes/:id
POST /notes
PATCH /notes/:id
DELETE /notes/:id
```

```json
{
  "projectId": "uuid",
  "content": "Important context for the next agent."
}
```

When a note is created against a ClickUp-sourced task, CompanyCore creates a
ClickUp task comment first and then stores the returned comment ID as the
note's `externalId` with `source = clickup`. If ClickUp rejects the comment,
the local note is not created and the API returns a safe integration error.

## Decisions

```http
GET /v1/decisions
GET /v1/decisions/:id
POST /v1/decisions
PATCH /v1/decisions/:id
DELETE /v1/decisions/:id
GET /decisions
GET /decisions/:id
POST /decisions
PATCH /decisions/:id
DELETE /decisions/:id
```

```json
{
  "title": "Use CompanyCore as source of truth",
  "rationale": "Agents need durable operational memory",
  "outcome": "approved",
  "projectId": "uuid"
}
```

## Agents

```http
GET /v1/agents
GET /v1/agents/:id
POST /v1/agents
PATCH /v1/agents/:id
DELETE /v1/agents/:id
GET /agents
GET /agents/:id
POST /agents
PATCH /agents/:id
DELETE /agents/:id
```

```json
{
  "name": "Jarvis",
  "role": "operations_agent",
  "status": "active",
  "source": "jarvis"
}
```

Agents are workspace-scoped. Use the returned `id` as `agentId` when writing
agent logs.

## Agent Logs

```http
GET /v1/agent-logs
GET /v1/agent-logs/:id
POST /v1/agent-logs
GET /agent-logs
GET /agent-logs/:id
POST /agent-logs
```

```json
{
  "level": "info",
  "message": "Jarvis inspected CompanyCore memory",
  "metadata": {
    "source": "jarvis"
  }
}
```

## Provider Webhooks

```http
POST /v1/webhooks/clickup
```

This route is public at the transport layer because ClickUp calls it directly.
It is mounted before JSON parsing so CompanyCore can verify the exact raw body
against ClickUp's `X-Signature` HMAC SHA-256 header. Requests without
`X-Signature` return `missing_signature`, malformed payloads return
`invalid_webhook_payload`, unknown webhooks return `webhook_not_registered`,
and invalid signatures return `invalid_webhook_signature`.

Valid signed ClickUp events are stored idempotently in the provider inbox,
processed into CompanyCore task records, and status changes create
provider-neutral agent events for Paperclip, Jarvis, Aviary, and future
consumers.

ClickUp task comment events are mapped to CompanyCore notes attached to the
same task. The note uses `source = clickup` and the ClickUp comment ID as
`externalId`, so repeated webhook deliveries update the same note instead of
duplicating context.

## Agent Events

```http
GET /v1/agent-events
POST /v1/agent-events/:id/ack
```

Agents use `GET /v1/agent-events` with their CompanyCore API key to read
pending provider-neutral operational events. Optional query parameter
`targetAgent` returns events targeted to that agent plus broadcast events.
After handling an event, the agent calls `POST /v1/agent-events/:id/ack`.

## Events

```http
GET /v1/events
GET /events
```

Generated v1 events:

- `project_created`
- `project_updated`
- `project_archived`
- `task_created`
- `task_updated`
- `task_archived`
- `task_list_created`
- `task_list_updated`
- `task_list_archived`
- `task_synced_from_clickup`
- `clickup_taskCreated`
- `clickup_taskUpdated`
- `clickup_taskStatusUpdated`
- `clickup_writeback_failed`
- `clickup_create_failed`
- `clickup_archive_failed`
- `clickup_custom_field_updated`
- `clickup_custom_field_update_failed`
- `clickup_webhook_deleted`
- `clickup_comment_create_failed`
- `goal_created`
- `goal_updated`
- `goal_archived`
- `target_created`
- `target_updated`
- `target_archived`
- `client_created`
- `client_updated`
- `client_archived`
- `pipeline_stage_created`
- `pipeline_stage_updated`
- `pipeline_stage_archived`
- `deal_created`
- `deal_updated`
- `deal_archived`
- `interaction_created`
- `interaction_updated`
- `interaction_archived`
- `note_created`
- `note_updated`
- `note_archived`
- `decision_created`
- `decision_updated`
- `decision_archived`
- `agent_created`
- `agent_updated`
- `agent_retired`
- `sync_started`
- `sync_succeeded`
- `sync_failed`
