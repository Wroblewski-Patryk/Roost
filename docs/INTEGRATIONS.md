# Integrations

## ClickUp To Company Core

v1 integration path:

```text
ClickUp -> n8n -> POST /tasks/sync/clickup -> Company Core DB -> event
```

n8n is responsible for listening to ClickUp, shaping the payload, and calling
Company Core with `X-API-Key`.

Company Core is responsible for:

- upserting the task by `(source = clickup, external_id)`
- storing `source = clickup`
- preserving optional raw payload context
- emitting `task_synced_from_clickup`

Company Core does not call ClickUp directly in v1.

## Paperclip

Paperclip should use Company Core as operational memory through the API:

- read projects, goals, targets, and tasks before planning work
- write notes and decisions when durable context appears
- read events for recent operational changes

Paperclip should not write directly to Postgres.

## Jarvis

Jarvis can use the same API for daily operations, summaries, and task updates.
Any writes should include a meaningful `source`, such as `jarvis`.
