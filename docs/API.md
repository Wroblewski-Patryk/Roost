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
- Inactive keys fail closed.
- Future scopes may restrict service clients to narrower permissions.
- Raw keys are only shown once if an API key creation endpoint is added.

## Integration Settings

Workspace-owned integration settings are configured through protected routes.
The active `workspaceId` is derived from bearer auth or `X-API-Key`; clients do
not send `workspaceId`.

```http
GET /integration-settings/clickup
PUT /integration-settings/clickup
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
    "syncMode": "pull"
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
      "syncMode": "pull"
    },
    "active": true,
    "secretConfigured": true
  }
}
```

`token` is encrypted before storage and is never returned. Updating config
without a `token` preserves the existing encrypted secret. Creating a new
setting requires a token.

## Health

```http
GET /health
```

## Projects

```http
GET /projects
POST /projects
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
POST /goals
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
POST /targets
```

```json
{
  "goalId": "uuid",
  "title": "Book 10 discovery calls",
  "metric": "calls",
  "targetValue": 10
}
```

## Tasks

```http
GET /tasks
POST /tasks
PATCH /tasks/:id
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
token, upserts tasks, and emits sync events.

Safe native sync response:

```json
{
  "data": {
    "provider": "clickup",
    "workspaceId": "uuid",
    "itemCount": 12,
    "createdCount": 4,
    "updatedCount": 8,
    "skippedCount": 0
  }
}
```

## Clients

```http
GET /clients
POST /clients
```

```json
{
  "name": "Jane Doe",
  "companyName": "Example Co",
  "email": "jane@example.com"
}
```

## Deals

```http
GET /deals
POST /deals
```

```json
{
  "clientId": "uuid",
  "title": "Pilot contract",
  "value": 5000,
  "currency": "PLN"
}
```

## Notes

```http
GET /notes
POST /notes
```

```json
{
  "projectId": "uuid",
  "content": "Important context for the next agent."
}
```

## Events

```http
GET /events
```

Generated v1 events:

- `project_created`
- `task_created`
- `task_updated`
- `task_synced_from_clickup`
- `goal_created`
- `target_created`
- `client_created`
- `deal_created`
- `note_created`
- `sync_started`
- `sync_succeeded`
- `sync_failed`
