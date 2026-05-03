# Database

Primary keys are UUIDs. Tables include `created_at`, `updated_at`, and
integration fields such as `external_id` and `source` where relevant.

## Tables

- `users`: human account records for owner login.
- `workspaces`: workspace containers owned by users.
- `workspace_memberships`: future-proof membership table; v1 activates only
  the `owner` role.
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
- `api_keys`: workspace-scoped service credentials for agents and automations.
- `integration_settings`: workspace-scoped provider configuration and protected
  secret material, starting with ClickUp.

## Operating Registry

The schema includes a registry that keeps business areas, folders, tables, API
surfaces, storage, knowledge roots, automations, and provider mappings aligned.
Registration and seed/bootstrap paths create the standard operating model for
each workspace.

Target hierarchy:

```text
workspaces
  -> operating_areas
  -> operating_folders
  -> operating_tables
  -> business records
```

ClickUp mapping:

```text
workspaces.id
  -> ClickUp team_id / Workspace
operating_areas.external mapping
  -> ClickUp Space
operating_folders.external mapping
  -> ClickUp Folder
operating_tables.external mapping
  -> ClickUp List
business record external mapping
  -> ClickUp Task or provider-specific entity
```

The approved business areas are fixed catalog values owned by CompanyCore:

| Area | Example current/future tables |
| --- | --- |
| Strategy and governance | `goals`, `targets`, future governance policies |
| Projects and delivery | `projects`, future milestones/releases |
| Tasks and workflow | `task_lists`, `tasks`, future statuses/checklists |
| Sales and CRM | `clients`, `deals`, `pipeline_stages`, `interactions` |
| Marketing and growth | future campaigns, experiments, channels |
| Finance and billing | future invoices, expenses, subscriptions |
| People and roles | future teammates, responsibilities, role maps |
| Operations and administration | future vendors, assets, procedures |
| Knowledge and decisions | `notes`, `decisions`, future docs index |
| Assets and storage | future file/storage objects and media references |
| Automations and integrations | `integration_settings`, future automations |
| AI agents and observability | `agents`, `agent_logs`, `events` |

System tables remain outside the 12 business areas:

- `users`
- `workspaces`
- `workspace_memberships`
- `api_keys`
- provider mapping tables
- migration, audit, schema, and platform metadata tables

Registry tables:

- `operating_areas`: one row per approved area per workspace, with a stable
  area key.
- `operating_folders`: workspace and area-owned grouping layer equivalent to a
  ClickUp Folder.
- `operating_tables`: registry rows for each business table or custom table,
  with `workspace_id`, optional `operating_area_id`,
  optional `operating_folder_id`, stable `api_slug`, storage and knowledge
  references, and sync policy.
- `external_container_mappings`: provider IDs for ClickUp Workspaces, Spaces,
  Folders, Lists, Views, and equivalent future systems.
- `external_field_mappings`: provider field definitions and links to
  CompanyCore fields, including ClickUp Custom Field metadata.
- `storage_locations`: local disk, object storage, Google Drive folder, or
  other provider roots for a workspace/folder/table.
- `knowledge_roots`: Obsidian Markdown branch, Google Drive Docs root, or
  other durable knowledge base root for a workspace/folder/table.
- `automation_definitions`: workspace/folder/table-scoped automations and
  provider triggers.

The operating model API exposes these registry records through
`/v1/operating-model`. Storage locations, knowledge roots, and automation
definitions can be created through that API after their optional area, folder,
or table scope has been validated inside the active workspace.

Runtime routes should eventually resolve table API behavior through
`operating_tables.api_slug` or an equivalent registry lookup, while preserving
explicit typed routes for the stable first-party domain tables.

Implemented first-party table assignments:

| Area | Tables |
| --- | --- |
| Strategy and governance | `goals`, `targets` |
| Projects and delivery | `projects` |
| Tasks and workflow | `task_lists`, `tasks` |
| Sales and CRM | `clients`, `pipeline_stages`, `deals`, `interactions` |
| Knowledge and decisions | `notes`, `decisions` |
| AI agents and observability | `agents`, `agent_logs`, `events` |

The remaining approved areas are created even when they do not yet have
first-party tables, so future finance, people, marketing, operations, storage,
and automation records can attach to stable area keys without reshaping the
workspace contract.

## Migration Policy

Production schema changes must be represented by Prisma migrations committed
under `prisma/migrations/`. `prisma db push` is not a production migration
mechanism.

Every migration that touches ownership, auth, service keys, integration
settings, tasks, events, or external ID uniqueness must include:

- generated SQL review
- empty-database validation
- existing-database validation or a documented reason it cannot be run locally
- rollback or forward-fix note
- data ownership impact review

Applied production migrations should normally be recovered through forward-fix
migrations. Restore from backup only when data corruption or unsafe ownership
state makes forward-fix unsafe.

## Important Relations

- Users can own workspaces.
- Workspaces have membership rows. v1 supports only the `owner` role.
- Workspaces own business records, service API keys, integration settings, and
  events.
- Projects have goals, task lists, tasks, notes, decisions, and events.
- Goals have targets and tasks.
- Targets can have tasks.
- Clients have deals, interactions, and notes.
- Deals belong to clients and optional pipeline stages.
- Events can reference projects and tasks.

## Workspace Ownership

All business tables include `workspace_id` for v1 workspace isolation:

- `projects`
- `goals`
- `targets`
- `task_lists`
- `tasks`
- `clients`
- `pipeline_stages`
- `deals`
- `interactions`
- `notes`
- `decisions`
- `agents`
- `agent_logs`
- `events`
- `operating_areas`
- `operating_folders`
- `operating_tables`
- `external_container_mappings`
- `external_field_mappings`
- `storage_locations`
- `knowledge_roots`
- `automation_definitions`
- `external_webhook_registrations`
- `provider_event_inbox`
- `agent_event_outbox`
- `api_keys`
- `integration_settings`

Protected reads and writes must filter by the active `workspace_id`. If the
request cannot resolve a workspace from a user session/token or service API key,
the request must fail closed.

## User And Workspace Tables

Planned v1 shape:

- `users`
  - `id`
  - `email` unique
  - `password_hash`
  - `name`
  - timestamps

- `workspaces`
  - `id`
  - `name`
  - `owner_user_id`
  - timestamps

- `workspace_memberships`
  - `id`
  - `workspace_id`
  - `user_id`
  - `role`, with only `owner` active in v1
  - timestamps

Registration must create the user, workspace, and owner membership in one
transaction.

## Seed And Bootstrap

`prisma/seed.ts` creates local/bootstrap data:

- owner user from `SEED_OWNER_EMAIL`
- owner password from `SEED_OWNER_PASSWORD`
- workspace from `SEED_WORKSPACE_NAME`
- local workspace API key from `SEED_API_KEY`
- default pipeline stages

This seed path is acceptable for local development and intentional first-owner
bootstrap. It must not become a permanent production admin shortcut. Production
operators should prefer `POST /auth/register` for the first owner when public
registration is acceptable, or run seed once with explicit deployment secrets
and then rotate bootstrap credentials.

## Service API Keys

`api_keys` should become workspace-scoped and hashed:

- `workspace_id`
- `name`
- `key_hash`
- optional `key_prefix` for operator identification
- `scopes`, JSON array reserved for service-client permissions
- `active`
- `last_used_at`
- timestamps

Raw API keys should only be shown at creation time if a creation endpoint is
added. Existing plaintext foundation keys require a migration or explicit
rotation plan before production use.

Current transition state keeps the legacy `key` column for compatibility while
new seed/bootstrap paths populate `key_hash` and `key_prefix`. Middleware checks
`key_hash` first and only falls back to plaintext rows when `key_hash` is null.
Production should rotate service keys and remove plaintext dependence in a
future cleanup migration.

Owner-created API keys leave the legacy `key` column null and store only
`key_hash`, `key_prefix`, metadata, scopes, and active state. The raw key is
shown once by the API and cannot be recovered from the database.

## Integration Settings

`integration_settings` stores workspace-owned integration configuration:

- `workspace_id`
- `provider`, for example `clickup`
- `secret_ciphertext`, encrypted with authenticated encryption
- non-secret configuration JSON
- `active`
- `last_validated_at`
- timestamps

Each workspace can have one setting per provider through the
`(workspace_id, provider)` unique key. Secret values must not be returned in API
responses or logs.

## Integration Fields

`source` identifies the origin system, for example `companycore`, `clickup`, or
`paperclip`.

`external_id` stores the upstream identifier from the source system. External
records should be unique per workspace and source, for example
`(workspace_id, source, external_id)`, so ClickUp sync can upsert records
without crossing workspace boundaries.

Runtime routes must write `workspace_id` from auth context and filter protected
reads by that workspace. Relation IDs supplied by clients must be checked
against the active workspace before creating dependent records.

Native ClickUp sync writes `tasks.workspace_id` from auth context and uses the
`(workspace_id, source, external_id)` unique key for idempotent task imports.

`events` are workspace-scoped so agent and operator event readback cannot leak
activity across workspaces.

## Provider Webhook And Agent Event Tables

Continuous provider sync uses durable, workspace-scoped tables before any
business processing:

- `external_webhook_registrations`
  - provider webhook identity, scope, endpoint URL, subscribed events, status,
    health metadata, and encrypted webhook secret
- `provider_event_inbox`
  - verified provider deliveries, idempotency key, payload hash, safe payload,
    processing state, retry count, and timestamps
- `agent_event_outbox`
  - provider-neutral follow-up events for Paperclip, Jarvis, Aviary, and future
    consumers

ClickUp webhook secrets are secret material and must be encrypted like provider
tokens. Incoming webhook payloads must be signature-verified against the raw
request body before any durable business update is processed.

The live-sync direction is:

- ClickUp -> CompanyCore: signed webhook -> provider inbox -> full task fetch
  when needed -> task upsert -> internal event -> agent outbox.
- CompanyCore -> ClickUp: updates to ClickUp-sourced tasks call ClickUp's task
  update API before the local task write is accepted.
