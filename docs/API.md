# API

All endpoints except `GET /health` require:

```text
X-API-Key: dev-companycore-key
```

Base URL in local Docker:

```text
http://localhost:3000
```

## Auth And Workspace

v1 must add owner registration/login before workspace-owned settings are
production-ready. Registration should create an owner user and workspace in one
transaction. Protected business and integration routes should resolve an active
`workspaceId` from either a user auth context or a workspace-scoped service API
key.

Planned minimum:

```http
POST /auth/register
POST /auth/login
GET /me
```

Integration settings such as ClickUp credentials must belong to the active
workspace and must not be returned in API responses.

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
