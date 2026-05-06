# Agent CompanyCore API Playbook

## Purpose

This playbook teaches a service agent how to use CompanyCore as durable
operational memory. It applies to Jarvis, Paperclip, Aviary, n8n, and future
agents.

Agents must use the HTTP API. They must not connect directly to PostgreSQL.

## Required Inputs

- `COMPANYCORE_BASE_URL`, for example `https://api.companycore.luckysparrow.ch`
- `COMPANYCORE_API_KEY`, a workspace-scoped service key
- optional agent identity, for example `jarvis`, `paperclip`, or `aviary`

Raw service keys are secret material. Store them only in the agent's secret
store or runtime environment. Do not print them in logs, screenshots, traces,
or task notes.

## Startup Flow

1. Call the connection handshake:

```http
GET /v1/connection
X-API-Key: <service-key>
```

2. Verify these fields:

- `data.status` is `ok`
- `data.auth.workspaceId` exists
- `data.adapterManifest.basePath` is `/v1`
- `data.adapterManifest.schemas` includes the payloads the agent intends to
  write
- required capabilities are present before the agent writes

3. Treat these responses as fail-closed startup errors:

- `401`: missing or invalid credentials
- `403`: key cannot perform the operation
- `422`: workspace could not be resolved

Do not keep running in write mode when startup validation fails.

## Discovery Rules

Use `data.adapterManifest.routes` as the source of truth. Agents may call only
routes advertised in the manifest or explicitly documented in `docs/API.md`.

Write rules:

- never send `workspaceId`
- use CompanyCore IDs returned by the API when linking records
- use provider lifecycle routes for provider/system tables
- treat business `DELETE` routes as archive/deactivate lifecycle operations
- treat `data.capabilities` as the effective permissions for the current key
- never infer raw CRUD routes for users, workspaces, memberships, API keys,
  integration settings, provider inbox rows, webhook registrations, or event
  rows

## Common Read Flow

Read high-level context:

```http
GET /v1/projects
GET /v1/goals
GET /v1/tasks
GET /v1/clients
GET /v1/deals
GET /v1/notes
GET /v1/decisions
GET /v1/agents
GET /v1/events
```

Read one specific record when the agent already has an ID:

```http
GET /v1/projects/:id
GET /v1/tasks/:id
GET /v1/notes/:id
GET /v1/decisions/:id
GET /v1/agents/:id
```

Read operating structure:

```http
GET /v1/operating-model
GET /v1/operating-model/tables
GET /v1/operating-model/folders
GET /v1/operating-model/storage-locations
GET /v1/operating-model/knowledge-roots
GET /v1/operating-model/automation-definitions
```

## Common Write Flow

Create or update agent identity:

```http
POST /v1/agents
PATCH /v1/agents/:id
```

Create an operational note:

```http
POST /v1/notes
```

```json
{
  "projectId": "uuid",
  "taskId": "uuid",
  "content": "Agent-observed context that should persist."
}
```

Record a decision:

```http
POST /v1/decisions
```

```json
{
  "projectId": "uuid",
  "title": "Decision title",
  "rationale": "Why this decision was made",
  "outcome": "approved"
}
```

Update a task:

```http
PATCH /v1/tasks/:id
```

```json
{
  "status": "in_progress",
  "priority": "high"
}
```

Write an agent log:

```http
POST /v1/agent-logs
```

```json
{
  "agentId": "uuid",
  "level": "info",
  "message": "Agent inspected CompanyCore memory.",
  "metadata": {
    "source": "jarvis"
  }
}
```

Archive a business record:

```http
DELETE /v1/projects/:id
DELETE /v1/tasks/:id
DELETE /v1/notes/:id
DELETE /v1/decisions/:id
DELETE /v1/agents/:id
```

These routes preserve the row and set a lifecycle status such as `archived` or
`retired`.

## Provider And System Actions

Agents can use provider/system lifecycle actions when the manifest advertises
them:

```http
GET /v1/agent-events
POST /v1/agent-events/:id/ack
GET /v1/integration-settings/clickup/events
POST /v1/integration-settings/clickup/events/retry-failed
POST /v1/integration-settings/clickup/webhooks/reconcile
POST /v1/integration-settings/clickup/maintenance/run
GET /v1/google-drive/files
GET /v1/google-drive/files/:id/content
PATCH /v1/google-drive/files/:id/scope
POST /v1/integration-settings/google_drive/changes/reconcile
```

Agents should not mutate provider registry tables directly. Use reconcile,
retry, refresh, scope, and ack actions instead.

## Error Handling

Recommended agent behavior:

| Status | Agent behavior |
| --- | --- |
| `400` | Fix payload validation and retry only after correction. |
| `401` | Stop write mode; credential is missing or invalid. |
| `403` | Stop the attempted action; key lacks permission. |
| `404` | Treat as missing or not visible in this workspace. Do not probe other IDs. |
| `409` | Resolve the relation/state conflict before retrying. |
| `422` | Stop startup or write flow; workspace/integration context is invalid. |
| `429`, `502` | Back off and retry according to provider-safe policy. |
| `500` | Record a safe log and retry only if the action is idempotent. |

Never log raw response internals that could include provider details or secret
material.

## Minimal Local Smoke

With a disposable workspace/service key:

```powershell
$env:COMPANYCORE_BASE_URL = "http://localhost:3000"
$env:COMPANYCORE_API_KEY = "<service-key>"
npm run agent:training-smoke
```

Expected result:

- connection returns `status = ok`
- agent creation returns `201`
- note creation returns `201`
- note read/update works through `GET /v1/notes/:id` and `PATCH /v1/notes/:id`
- agent log creation returns `201`
- note archive returns `status = archived`

## Production Safety

- Use a dedicated key per agent.
- Rotate any key that was copied through chat, logs, screenshots, or shell
  history.
- Prefer narrow agent behavior even when the service key currently has broad
  capabilities.
- Run `GET /v1/connection` at startup and after credential rotation.
- Keep provider retries bounded and idempotent.
- Do not treat archived records as deleted history.
