# Task Lists Module

The task lists module exposes workspace-scoped list/create/update routes for
organizing tasks created by Codex, Jarvis, and future adapters.

Implemented routes:

- `GET /v1/task-lists`
- `POST /v1/task-lists`
- `PATCH /v1/task-lists/:id`
- root compatibility aliases under `/task-lists`

Delete is intentionally deferred until retention behavior for related tasks is
explicitly approved.
