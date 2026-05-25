# ClickUp-Shaped Operating Model Plan

## Purpose

CompanyCore should map operational structure 1:1 with ClickUp where that
structure is useful, while keeping CompanyCore as the source of truth for its
own workspace, API, storage, knowledge, automation, and agent contracts.

The target is not a ClickUp clone. The target is a consistent operating model
that can absorb ClickUp first and later borrow useful ideas from Airtable,
Notion, Linear, HubSpot, Google Drive, Obsidian, and other systems without
fracturing the database.

## Current State

Implemented foundation:

- Workspace ownership exists.
- Most first-party business records include `workspace_id`.
- ClickUp settings are workspace-owned and encrypted.
- The owner console can discover ClickUp Workspaces, Spaces, Folders, and
  Lists before saving selected Lists.
- Native ClickUp sync imports tasks into the current `tasks` table.

Gaps:

- There is no CompanyCore table for ClickUp Space.
- There is no CompanyCore table for ClickUp Folder.
- `task_lists` approximates ClickUp Lists but is not a general table registry.
- Existing business tables are not explicitly assigned to 12 operating areas.
- API routes are hand-authored per domain and not tied to a table registry.
- Automations, storage roots, and knowledge roots are not scoped to
  workspace/folder/table yet.
- ClickUp Custom Fields, Views, webhook state, and structural provider mappings
  are not persisted as first-class mapping records.

## Target Model

Canonical hierarchy:

```text
Workspace -> Operating Area -> Operating Folder -> Operating Table -> Record
```

Provider hierarchy for ClickUp:

```text
Team/Workspace -> Space -> Folder -> List -> Task
```

Every workspace should eventually have the approved 12 areas:

1. Strategy and governance
2. Projects and delivery
3. Tasks and workflow
4. Sales and CRM
5. Marketing and growth
6. Finance and billing
7. People and roles
8. Operations and administration
9. Knowledge and decisions
10. Assets and storage
11. Automations and integrations
12. AI agents and observability

System tables remain platform-owned and outside the area catalog: users,
workspaces, memberships, API keys, integration settings, provider mappings,
migrations, audit/event infrastructure, and schema metadata.

## Implementation Tasks

### CCV1-034A Operating Model Registry Schema

- Task Type: feature
- Stage: verification
- Owner: DB/Migrations
- Priority: P0
- Status: DONE

Scope:

- Add Prisma models and migration for `operating_areas`,
  `operating_folders`, `operating_tables`, `external_container_mappings`,
  `external_field_mappings`, `storage_locations`, `knowledge_roots`, and
  `automation_definitions`.
- Seed the 12 operating areas per workspace.
- Backfill existing first-party tables into `operating_tables`.
- Keep system tables outside the area catalog.

Acceptance criteria:

- Each workspace has exactly the 12 approved operating areas.
- Existing business tables are assigned to an area.
- `task_lists` remains compatible with current API behavior.
- Provider mapping uniqueness is workspace-scoped.
- Migration passes fresh and existing database validation.

### CCV1-034B ClickUp Structure Persistence

- Task Type: feature
- Stage: verification
- Owner: Backend Builder
- Priority: P0
- Status: DONE

Scope:

- Persist discovered ClickUp Spaces, Folders, and Lists into mapping tables.
- Link ClickUp Spaces to operating areas, Folders to operating folders, and
  Lists to operating tables.
- Preserve selected `listIds` compatibility until the registry becomes the
  native sync source.

Acceptance criteria:

- Discovery can be rerun idempotently.
- Provider IDs are unique per workspace/provider/provider entity type.
- Views and Custom Field metadata are not blocked by the container mapping
  shape and are queued separately.
- Rate-limit and invalid-token behavior remains safe.

Deferred to CCV1-034B2:

- ClickUp Views.
- ClickUp Custom Field definitions and values.

### CCV1-034C Registry-Backed Table API Contract

- Task Type: feature
- Stage: verification
- Owner: Backend Builder
- Priority: P1
- Status: DONE

Scope:

- Define how typed routes and future generic table routes use
  `operating_tables.api_slug`.
- Expose safe table metadata through `/v1/connection`.
- Keep existing `/v1/projects`, `/v1/tasks`, CRM, notes, decisions, and agent
  routes stable.

Acceptance criteria:

- Service clients can discover table API metadata without database access.
- Existing typed routes still work.
- Generic table access cannot bypass workspace ownership or validation.

### CCV1-034D Storage And Knowledge Roots

- Task Type: feature
- Stage: verification
- Owner: Backend Builder
- Priority: P1
- Status: DONE

Scope:

- Add workspace/folder/table-scoped storage and knowledge root APIs.
- Support metadata for local disk paths, Google Drive folders/docs roots, and
  Obsidian Markdown branches.
- Do not sync file contents until a separate vertical slice is approved.

Acceptance criteria:

- Every root belongs to a workspace and optional folder/table scope.
- Provider secrets stay in integration settings or approved provider auth.
- API responses do not expose unsafe local paths or secret material to
  unauthorized clients.

### CCV1-034E Automation Scope Registry

- Task Type: feature
- Stage: verification
- Owner: Backend Builder
- Priority: P1
- Status: DONE

Scope:

- Register automations against workspace, area, folder, table, or provider
  mapping scopes.
- Prepare for scheduled pull sync, ClickUp webhooks, and later external
  orchestrators.

Acceptance criteria:

- Automation records state trigger type, scope, provider, enabled state, and
  last run/error metadata.
- ClickUp webhook processing requires signature verification and idempotency.
- Scheduled sync respects provider rate limits.

### CCV1-034B2 ClickUp Views And Custom Fields Persistence

- Task Type: feature
- Stage: verification
- Owner: Backend Builder
- Priority: P1
- Status: DONE

Scope:

- Persist ClickUp Custom Field definitions from Workspace, Space, Folder, and
  List endpoints.
- Persist ClickUp Workspace/List Views as container mappings.
- Link List-level fields and views to their mapped operating table.

Acceptance criteria:

- Custom Field IDs are unique per workspace/provider.
- View IDs are unique per workspace/provider/entity type.
- List-level metadata links to the right operating table.
- Provider errors still map through safe integration errors.

## Provider Documentation Guardrail

Before implementing or changing any provider API integration, the task must
check current official provider documentation and record the exact mapping
assumptions. For ClickUp, this means checking hierarchy terminology,
pagination, rate limits, webhook signatures, Custom Field behavior, task
relationship behavior, and endpoint availability before coding.

## Validation Plan

- Documentation-only planning validation for this plan.
- For schema work: `npx prisma generate`, `npx prisma validate`, fresh
  `prisma migrate deploy`, and existing-database migration validation.
- For API work: `npm run build` and integration tests covering same-workspace
  allowed paths, cross-workspace denied paths, provider mapping idempotency,
  and safe provider errors.
- For ClickUp behavior: tests based on official ClickUp documentation plus one
  real-token operator smoke before production completion.
