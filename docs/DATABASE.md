# Database

Primary keys are UUIDs. Tables include `created_at`, `updated_at`, and
integration fields such as `external_id` and `source` where relevant.

## Tables

- `projects`: company projects and strategic work containers.
- `goals`: outcomes, optionally linked to projects.
- `targets`: measurable targets, optionally linked to goals.
- `task_lists`: task grouping layer, optionally linked to projects.
- `tasks`: operational tasks linked to projects, goals, targets, or task lists.
- `clients`: CRM contacts or companies.
- `pipeline_stages`: sales pipeline stages.
- `deals`: sales opportunities linked to clients and pipeline stages.
- `interactions`: CRM interactions linked to clients.
- `notes`: notes linked to projects, tasks, clients, or deals.
- `decisions`: recorded decisions, usually linked to projects.
- `agents`: AI agents such as Paperclip/Jarvis workers.
- `agent_logs`: logs emitted by agents.
- `events`: append-style system events for important changes.
- `api_keys`: simple API key records for service access.

## Important Relations

- Projects have goals, task lists, tasks, notes, decisions, and events.
- Goals have targets and tasks.
- Targets can have tasks.
- Clients have deals, interactions, and notes.
- Deals belong to clients and optional pipeline stages.
- Events can reference projects and tasks.

## Integration Fields

`source` identifies the origin system, for example `companycore`, `clickup`, or
`paperclip`.

`external_id` stores the upstream identifier from the source system. Tasks have
a unique pair on `(source, external_id)` so ClickUp sync can upsert records.
