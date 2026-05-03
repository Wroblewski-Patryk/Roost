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

The owner web console discovers available ClickUp Workspaces and Lists before
settings are saved:

```http
POST /v1/integration-settings/clickup/discover
```

Discovery calls ClickUp's authorized Workspaces, Spaces, Folders, folder Lists,
and folderless Lists endpoints. A submitted discovery token is never stored;
the save route remains the only path that encrypts token material. Existing
connections can rediscover structure with the stored encrypted token without
returning the token to the browser.

Setting a ClickUp token does not automatically start continuous listening.
Continuous updates require an approved scheduled sync, webhook receiver, or
external orchestration task.

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

- `sync_started`: provider, workspace ID, requested scope, correlation ID
- `sync_succeeded`: provider, workspace ID, item counts, created/updated counts
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
