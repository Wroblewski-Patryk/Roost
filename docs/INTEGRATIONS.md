# Integrations

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

Secrets must not be returned in API responses, written to logs, or stored in
plain text without an approved v1 security decision.

## Paperclip

Paperclip should use Company Core as operational memory through the API:

- read projects, goals, targets, and tasks before planning work
- write notes and decisions when durable context appears
- read events for recent operational changes

Paperclip should not write directly to Postgres.

## Jarvis

Jarvis can use the same API for daily operations, summaries, and task updates.
Any writes should include a meaningful `source`, such as `jarvis`.
