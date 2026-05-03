# System Architecture

CompanyCore is the operational core for LuckySparrow. It stores company
projects, goals, targets, tasks, CRM context, decisions, notes, AI agent
metadata, agent logs, integration state, and system events. PostgreSQL is the
source of truth, and the HTTP API is the supported integration access layer.

## Main Runtime Surfaces

- API or backend: Node.js 22, Express, TypeScript, Prisma.
- Web: minimal owner-only static console in v1 for ClickUp integration setup.
  A broader company operations dashboard is v2 scope.
- Mobile: none in v1; v2 mobile should follow the web product experience.
- Jobs or workers: the backend owns a lightweight in-process ClickUp
  maintenance scheduler. It reuses the authenticated maintenance service for
  active workspace settings so missed webhooks, failed inbox rows, and provider
  drift are repaired without introducing a separate worker tier in v1.
- External services: PostgreSQL, ClickUp API, Google Drive/Docs/Sheets APIs,
  optional n8n orchestration, future Paperclip/Jarvis/future GUI API clients.

## Source Of Truth Rules

- PostgreSQL owns canonical company state.
- Prisma owns the database schema and generated database client.
- External tools must not write directly to PostgreSQL.
- Paperclip, Jarvis, n8n, future dashboard clients, and other agents must use
  the API.
- Significant state changes should emit events.
- Schema changes must use migrations before production data becomes valuable.

## Workspace Ownership Boundary

CompanyCore v1 must include a workspace ownership boundary before integration
settings are production-ready.

- Registration creates an owner user and workspace atomically.
- Business records belong to a workspace.
- Service API keys belong to a workspace and are intended for agents and
  automations.
- Integration settings and secrets belong to a workspace.
- Protected requests must resolve `workspaceId` before reads or writes.
- Cross-workspace access must fail closed.

This is not full enterprise multi-tenancy in v1. Invitations, billing,
advanced RBAC, organization administration, and a full CRM UI are out of scope.

## Core Data Areas

- Strategy and delivery: projects, goals, targets, task lists, tasks.
- CRM and sales: clients, deals, pipeline stages, interactions.
- Knowledge: notes, decisions.
- AI operations: agents, agent logs.
- Platform state: events, users, workspaces, workspace-scoped API keys,
  integration settings.

## ClickUp-Shaped Operating Model

CompanyCore should evolve toward a ClickUp-compatible operating model without
becoming a ClickUp clone. The canonical internal hierarchy is:

```text
Workspace -> Operating Area -> Operating Folder -> Operating Table -> Record
```

This maps to ClickUp API v2 terminology as:

```text
ClickUp Team/Workspace -> Space -> Folder -> List -> Task
```

ClickUp API v2 still calls the top-level workspace a `Team`; CompanyCore docs
and UI should use `Workspace` and treat ClickUp `team_id` as an external
workspace identifier. Provider-specific naming must stay in integration
mappers, not leak into core domain names.

Every business table should belong to exactly one of 12 operating areas. Each
area can own several operating folders and several operating tables. System
tables such as users, memberships, API keys, integration settings, provider
mappings, audit/events, and schema metadata remain platform-owned and are not
counted as business-area tables.

The approved 12 operating areas are:

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

For each workspace, the operating model should make the following resources
addressable through one consistent scope:

- tables and records
- API resources for those tables
- automations that read or write those tables
- storage locations, including local disk, object storage, Google Drive, or
  other providers
- knowledge roots, including Obsidian Markdown branches or Google Drive Docs
- external provider mappings, starting with ClickUp Space, Folder, List, View,
  Custom Field, and Task identifiers

The registry layer should be explicit instead of inferred from table names. A
future schema slice should add records such as `operating_areas`,
`operating_folders`, `operating_tables`, `external_container_mappings`,
`external_field_mappings`, `storage_locations`, `knowledge_roots`, and
`automation_definitions` before broad two-way provider sync is attempted.

Existing v1 domain tables are valid as a foundation, but they are not yet a
complete ClickUp 1:1 structural mirror. The current gap is intentional planning
work, not a reason to overload `projects` or `task_lists` with unrelated
metadata.

## Module Boundaries

- `src/auth/`: authentication and service API key middleware.
- `src/config/`: runtime configuration.
- `src/db/`: Prisma client boundary.
- `src/health/`: public health endpoint.
- `src/middleware/`: shared Express middleware and error handling.
- `src/modules/*`: domain route modules and business behavior.
- `src/integrations/<provider>/`: provider-specific API clients, mappers, sync
  services, and safe error mapping.
- `public/`: minimal static owner console served by the backend for setup
  workflows only.

Route modules should not call external provider APIs directly. They should call
integration services that read workspace-owned settings and normalize provider
data into CompanyCore models.

## Integration Architecture

ClickUp is the first native CompanyCore integration adapter. The v1 target flow
is:

```text
Owner registration -> workspace -> workspace settings -> ClickUp API
  -> CompanyCore integration adapter -> PostgreSQL -> event
```

The ClickUp adapter should establish the pattern for future integrations:

- provider client
- provider mapper
- provider documentation review before mapping or API implementation
- workspace settings reader
- sync service
- webhook registration service
- webhook receiver with raw-body signature verification
- provider event inbox with idempotency keys
- provider event replay for failed inbox rows
- safe provider error mapper
- idempotent persistence using `(workspace_id, source, external_id)`
- explicit import policy for existing records before writes run
- event emission, outbound agent signals, and observable sync/webhook results
- bidirectional task operations through CompanyCore API routes: create,
  update, archive, mapped Custom Field value writes, and task comments mapped
  to CompanyCore notes

Provider adapters must be designed from current vendor documentation and
record the relevant endpoint, hierarchy, pagination, rate-limit, webhook,
signature, field, and permission assumptions in the task evidence. For ClickUp,
mapping must preserve the `Team/Workspace -> Space -> Folder -> List -> Task`
hierarchy, Custom Field metadata and values, View parent scope, per-token rate
limits, and webhook HMAC signature requirements before enabling write-back or
continuous sync.

For first-run and manually repeated imports, the adapter must support a
workspace-visible import policy. The approved ClickUp modes are `merge`,
`skip_existing`, `replace_selected_lists`, and `inspect_only`. Destructive
provider cleanup must be scoped to provider-owned records only, for example
`source = clickup` tasks under selected ClickUp Lists, and must never delete
native/manual CompanyCore records.

After first import, continuous updates should use ClickUp webhooks as the
primary trigger path instead of relying only on scheduled pulls. The approved
webhook flow is:

```text
Owner enables ClickUp integration -> CompanyCore creates scoped ClickUp webhook
  -> ClickUp POSTs signed event -> CompanyCore verifies signature from raw body
  -> provider event inbox deduplicates -> task delta is reconciled
  -> CompanyCore event/outbox notifies Paperclip, Jarvis, Aviary, or future agents
```

ClickUp webhook registrations are tied to the user token that created them, so
CompanyCore must track webhook health and provide an owner reactivation path
when the ClickUp user loses access or the webhook becomes inactive. Webhook
secrets returned by ClickUp must be encrypted as workspace integration secret
material. Incoming webhook requests must be rejected before parsing business
logic when the `X-Signature` HMAC SHA-256 check fails.

Webhook operations should be managed as durable provider resources, not as
fire-and-forget setup calls. Reconciliation must compare local registrations
with ClickUp's remote webhook list, refresh health, reactivate inactive
webhooks when possible, replace missing remote registrations, and keep stale
local registrations from no-longer-selected Lists inactive until an owner
deletes them.

ClickUp retries delivery, but CompanyCore must also own downstream processing
recovery. If a signed webhook is stored but task/comment processing fails, the
provider event inbox must retain safe failure metadata and expose an owner-only
replay path. Replay must run through the same idempotent mapper as live
webhooks so recovered events refresh CompanyCore state and notify agents
without requiring direct database edits.

Always-fresh behavior should not depend on webhooks alone. CompanyCore exposes
a non-destructive ClickUp maintenance run that reconciles webhook health,
retries failed provider events, and performs a `merge` pull fallback from
ClickUp. Agents or operators can invoke this through the API to close gaps from
missed webhook deliveries, temporary provider failures, or backend restarts
while preserving CompanyCore's immediate write-back path for local changes.
The backend also starts the same maintenance operation on a configurable
interval for every active workspace ClickUp setting. This scheduler must remain
non-destructive and use `merge` only; destructive import repair remains an
explicit owner/operator action.

Webhook processing should be event-first and bridge-friendly. Status changes,
for example `taskStatusUpdated`, must update the CompanyCore task state and
also emit a durable internal event that downstream agents can consume. Paperclip
can use status changes as work triggers, while Jarvis and Aviary can consume the
same event stream for context refreshes, decisions, notifications, or future
automation modules.

Task comments are operational context and should not be lost in a task-only
sync. ClickUp `taskCommentPosted` and comment-field update payloads should map
to CompanyCore notes attached to the corresponding task, keyed by the ClickUp
comment ID. CompanyCore notes created against ClickUp-sourced tasks should
create a ClickUp task comment first and then store the returned comment ID.

n8n remains optional orchestration for workflows better kept outside the
backend. It is not the required primary ClickUp path in v1.

## Google Drive Operating Model

Google Drive is the next native integration after ClickUp. It must reuse the
same adapter architecture instead of creating a parallel document subsystem.
The approved v2 target flow is:

```text
Owner OAuth consent -> workspace Google Drive setting -> Drive API
  -> CompanyCore Google Drive adapter -> PostgreSQL -> events/outbox
```

Google Drive hierarchy maps into the same CompanyCore operating model:

```text
Google account/shared drive -> Drive folder -> Drive file
CompanyCore workspace -> Operating Area/Folder -> Storage/Knowledge file record
```

Drive folders can be attached to an operating area, operating folder, operating
table, storage location, or knowledge root. This lets the dashboard show one
company area that combines ClickUp Spaces/Folders/Lists, Drive folders/files,
CompanyCore tables, automations, and knowledge roots without requiring agents
to know provider-specific hierarchy rules.

Google Drive records are workspace-scoped and must be idempotent by
`(workspace_id, provider = google_drive, external_id)`. Folder/file metadata is
stored separately from extracted content snapshots so repeated scans can update
searchable descriptions without duplicating files. Provider-owned records must
track parent folder IDs, MIME type, Drive web links, revision/version signals,
trashed state, selected operating scope, and safe scan status.

Docs and Sheets support must use current official Google Workspace
documentation before implementation:

- Drive `files.list` for paginated folder/file discovery, including `q`,
  `spaces`, `supportsAllDrives`, `nextPageToken`, and `parents`.
- Drive `files.create`, `files.update`, `files.export`, and download/export
  flows for file creation and content access.
- Drive `changes.getStartPageToken`, `changes.list`, and later
  `changes.watch` for durable freshness.
- Docs `documents.get` and `documents.batchUpdate` for document read/edit.
- Sheets `spreadsheets.get`, `spreadsheets.values.get`,
  `spreadsheets.values.batchGet`, `spreadsheets.values.update`,
  `spreadsheets.values.batchUpdate`, and `spreadsheets.create` for sheet
  read/edit/create.

Google Drive authentication is OAuth-based, not an API-key flow. Refresh tokens
and webhook/channel secrets are workspace-owned integration secret material and
must be encrypted through the existing integration settings mechanism. The
non-secret configuration should include selected root folder IDs, shared drive
IDs when used, import/sync policy, current Drive changes page token, and
operating scope mappings.

The Google Drive adapter should deliver in vertical slices:

1. Persist Drive folder/file metadata and extracted content snapshots.
2. Add OAuth-backed provider client and owner connection routes.
3. Import selected folders into storage locations and knowledge roots.
4. Read Docs and Sheets into safe, searchable snapshots.
5. Create and edit Docs/Sheets through CompanyCore APIs, then refresh local
   metadata/content snapshots after successful provider writes.
6. Reconcile external edits through Drive `changes.list`, then add
   `changes.watch` channels for push-based freshness.
7. Expose provider-neutral file/content APIs for Jarvis, Paperclip, Aviary, and
   future GUI modules.

CompanyCore remains the source of truth for operational interpretation. Google
Drive remains the file/content source of truth. Jarvis or Paperclip may propose
structured imports from Docs/Sheets into CompanyCore business tables only when a
workspace-visible table mapping exists, the operation is auditable, and writes
go through CompanyCore APIs. Agents must not use raw Google tokens or write
directly to PostgreSQL.

## Security Boundaries

- `GET /health` is public.
- Business, auth-context, integration, and event routes are protected except for
  explicitly public auth bootstrap/login/register routes.
- Owner-user auth is for human/API clients.
- Workspace-scoped service API keys are for Paperclip, Jarvis, n8n, and other
  agents.
- API keys and integration tokens must not be stored only as plaintext in
  production paths.
- Integration secrets must not be returned in API responses or logs.
- Raw provider/backend errors must not be exposed directly to clients.

## Deployment Topology

- Hosting target: Coolify-compatible VPS deployment.
- Runtime services: `backend`, `postgres`.
- Public entry point: backend service on port `3000`.
- Production domains to document and verify:
  - `companycore.luckysparrow.ch`
  - `api.companycore.luckysparrow.ch`
- Private infrastructure: PostgreSQL service and persistent Docker volume.
- Health/readiness endpoint: `GET /health`.
- Required persistence: `companycore_postgres` Docker volume.

## Regression Guardrails

Every runtime feature must answer:

- Which workspace owns the data?
- Which auth path allowed the request?
- Which denied path was tested?
- Which event or log proves the change happened?
- Which migration or schema check protects persistence?
- Which smoke step would catch a regression after deploy?
