# Auth, Workspace, And Integration Plan

Status: implemented historical architecture plan. The owner/workspace auth,
workspace-scoped service keys, workspace-scoped integration settings, and
native ClickUp integration direction were delivered by the CCV1 runtime queue
and later hardened by AGCRUD/AGRUN tasks.

CompanyCore v1 must secure company operations without becoming an overbuilt
enterprise tenant system. The target is a simple owner workspace:

```text
register owner -> create workspace -> authenticate -> configure integration
  -> sync external data into workspace-scoped CompanyCore records
```

## Design Intent

- A user owns a workspace.
- Registration creates the owner user and workspace atomically.
- Owner authentication uses email/password with hashed password storage for v1.
- Workspace memberships are included now for future growth, but v1 activates
  only the `owner` role.
- Business records belong to a workspace.
- Service API keys belong to a workspace and are intended for Paperclip,
  Jarvis, n8n, and other agents.
- Integration settings belong to a workspace.
- ClickUp is the first native integration adapter and should establish the
  pattern for future integrations.
- v1 does not include invitations, billing, advanced RBAC, organization admin
  UI, or full multi-tenant product workflows.

## Implemented v1 Data Model Direction

The original working target was:

- `users`
  - `id`
  - `email`
  - `password_hash`
  - `name`
  - `created_at`
  - `updated_at`

- `workspaces`
  - `id`
  - `name`
  - `owner_user_id`
  - `created_at`
  - `updated_at`

- `workspace_memberships`
  - Include now for future-proofing.
  - v1 activates only `owner`.

- `api_keys`
  - Existing table should become workspace-scoped.
  - Store hashed key material, not only plaintext.
  - Optional scopes can support agent/service boundaries.

- `integration_settings`
  - `id`
  - `workspace_id`
  - `provider`, for example `clickup`
  - encrypted or protected secret material
  - non-secret configuration JSON
  - `active`
  - `last_validated_at`
  - `created_at`
  - `updated_at`

- Business tables
  - Add `workspace_id` to projects, goals, targets, task lists, tasks, clients,
    deals, pipeline stages, interactions, notes, decisions, agents, agent logs,
    events, and future integration sync state where applicable.

## Auth Flow

Minimum API shape:

```http
POST /auth/register
POST /auth/login
GET /me
```

Registration must:

1. validate email and password or approved identity payload
2. create the user
3. create the workspace
4. assign the user as owner through `workspace_memberships`
5. return a safe auth response without secrets
6. emit `workspace_created` and `user_registered` or equivalent events if event
   scope is approved

Login must:

1. verify credentials fail-closed
2. return an auth token/session or approved auth context
3. include enough safe context for clients to know the active workspace

Protected requests must:

1. authenticate user session/token or workspace API key
2. resolve `workspaceId`
3. reject requests without a workspace
4. filter reads and writes by `workspaceId`
5. avoid leaking whether records exist in another workspace

## Service API Keys

API keys are still useful for Paperclip, Jarvis, n8n, and other agents. They
should not remain global.

v1 service key target:

- key belongs to one workspace
- key is hashed at rest
- key can be active/inactive
- optional scopes are supported or explicitly deferred with schema room
- middleware resolves `workspaceId`
- `last_used_at` updates safely
- raw key is only shown once at creation if a creation endpoint is added

## Workspace-Scoped ClickUp Settings

ClickUp settings should be stored under the workspace, not in global env except
for encryption/app secrets.

Minimum ClickUp config:

- ClickUp API token or approved OAuth token material
- team ID if needed
- list IDs, folder IDs, or space IDs selected for sync
- sync mode: recommended v1 is read-only discovery plus pull sync
- active flag

Recommended first ClickUp slice:

1. Read-only discovery endpoint for workspace owner/Jarvis:
   - list teams/spaces/folders/lists/tasks available from the configured token
2. Pull-only sync from selected list IDs into CompanyCore tasks:
   - no write-back to ClickUp in first slice
   - upsert by `(workspace_id, source = clickup, external_id)`
   - emit `task_synced_from_clickup`

Write-back to ClickUp should be planned later after the read/pull path is
verified.

## Integration Adapter Implementation Contract

ClickUp should establish the reusable adapter pattern:

1. Load active workspace settings through the integration settings service.
2. Instantiate a provider client with decrypted token material in memory only.
3. Fetch provider records through the provider client.
4. Map provider records into CompanyCore task inputs without writing to the DB.
5. Upsert records through a sync service using
   `(workspace_id, source, external_id)`.
6. Emit safe sync start/success/failure signals and per-task sync events.
7. Return stable CompanyCore error codes for missing config, provider
   unavailability, and sync failures.

Provider clients must not read ClickUp credentials from process env. Process env
only owns backend encryption/auth secrets.

## Required Safety Rules

- No integration token may be hardcoded.
- No integration token may be logged.
- No integration token may be returned in API responses.
- Cross-workspace access must fail closed.
- Provider errors should return safe, actionable error codes.
- Sync must not corrupt existing tasks when ClickUp is unavailable.
- External IDs must be unique per workspace and source, not globally.

## Resolved Architecture Choices For v1

- Use email/password for owner registration/login.
- Store password hashes, never plaintext passwords.
- Include `workspace_memberships` now, but only use `owner` in v1.
- Support both owner auth and workspace-scoped service API keys.
- Treat service API keys as credentials for agents and automation clients.
- Defer invitations, non-owner roles, and advanced RBAC.

## Completed Implementation Order

1. CCV1-001: align canonical docs with workspace/auth/native ClickUp direction.
2. CCV1-011: finalize workspace/auth architecture contract.
3. CCV1-003: create migration baseline and migration policy.
4. CCV1-012: implement registration, login, workspace bootstrap.
5. CCV1-013: implement workspace integration settings and secret storage.
6. CCV1-007: harden workspace-scoped API keys.
7. CCV1-010: implement ClickUp read-only discovery and pull sync.
8. CCV1-006: add endpoint and auth/integration tests.
9. CCV1-009: verify production deployment and record smoke evidence.
