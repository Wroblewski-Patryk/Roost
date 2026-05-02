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

All business tables should include `workspace_id` before v1 is production
stable:

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

The first runtime workspace-scoped business table is `tasks`. Native ClickUp
sync writes `tasks.workspace_id` from auth context and uses the
`(workspace_id, source, external_id)` unique key for idempotent task imports.

`decisions` and `agent_logs` are workspace-scoped in v1 because they are the
approved minimal AI memory and audit surfaces.
