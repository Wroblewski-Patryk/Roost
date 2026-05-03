# CompanyCore GUI Target Views And Scalable Rollout Plan

Last updated: 2026-05-03

## Purpose

Plan the target CompanyCore web GUI as a scalable company command center while
only scheduling implementation slices backed by runtime data, API routes, and
database structures that already exist in the application.

## Current Code Reality

Implemented UI today:

- static owner web console in `public/`
- routes: `/`, `/auth/login`, `/auth/register`, `/dashboard`, `/settings`,
  `/settings/api`
- dashboard task table backed by `GET /v1/tasks`
- ClickUp setup, discovery, list selection, import policy, save, sync, and
  stored-token refresh
- API capability display backed by `GET /v1/connection`

Implemented backend/API surfaces that can safely support new GUI views:

- workspace owner auth and workspace context
- `GET /v1/connection`
- projects, goals, targets, task lists, tasks
- clients, pipeline stages, deals, interactions
- notes and decisions
- agents, agent logs, agent events, system events
- API keys
- integration settings for ClickUp and Google Drive
- ClickUp discovery, sync, webhooks, provider event retry, task write-back,
  Custom Field writes, and task comment bridge
- Google Drive notes bridge settings/sync/webhook intake
- operating model registry:
  - 12 operating areas
  - operating folders
  - operating tables
  - external container mappings
  - external field mappings
  - storage locations
  - knowledge roots
  - automation definitions

Important current gap:

- External container mappings are readable, and the schema already has
  `areaId`, `folderId`, and `tableId`, but the API does not yet expose a safe
  reassignment endpoint. The first GUI slice may show mapping health and wrong
  assignments, but editing relationships requires a small backend+GUI task.

## Target Information Architecture

The target post-login GUI should use this main navigation:

1. Dashboard
2. Operating Areas
3. Tasks And Adapters
4. Pipeline
5. Settings

Future navigation groups, not scheduled until backed by complete UX/API slices:

- Knowledge And Storage
- AI Agents And Events
- Automations
- Relationship Mapping Studio

The product model behind every view is:

```text
Workspace -> Operating Area -> Operating Folder -> Operating Table -> Record
```

Provider-specific structures should be shown as mappings into that model:

```text
ClickUp Workspace -> Space -> Folder -> List -> Task
Google Drive -> Folder/File/Doc -> CompanyCore Knowledge/Storage Scope
Future provider -> External Container/Field -> CompanyCore Area/Folder/Table
```

## View Plan

### 1. Dashboard

Goal:

- Provide a clear post-login command center with summary cards, health signals,
  and fast links into the main operational surfaces.

Backed by implemented data:

- `/v1/connection`
- `/v1/tasks`
- `/v1/operating-model`
- `/v1/events`
- `/v1/agent-events`
- integration status from connection/integration settings

Initial UI:

- workspace summary
- integration health: ClickUp, Google Drive, API/service clients
- task summary: total, ClickUp-sourced, blocked, recently updated
- operating model summary: 12 areas, mapped tables, mapped provider containers
- event/outbox health summary
- quick links to Operating Areas, Tasks And Adapters, Pipeline, Settings

States:

- loading dashboard data
- empty workspace
- integration misconfigured
- provider event failures present
- success/healthy state

### 2. Operating Areas

Goal:

- Show the 12 company operating areas as the main organizational backbone.
- Let the owner inspect what each area owns and identify misplaced provider
  containers, lists, folders, fields, storage roots, and automation scopes.

Backed by implemented data:

- `/v1/operating-model`
- `/v1/operating-model/tables`
- `/v1/operating-model/external-mappings`
- `/v1/operating-model/external-fields`
- `/v1/operating-model/storage-locations`
- `/v1/operating-model/knowledge-roots`
- `/v1/operating-model/automation-definitions`

Initial UI:

- overview grid/list of all 12 areas
- area detail with:
  - owned folders
  - owned operating tables
  - provider mappings
  - external fields
  - storage locations
  - knowledge roots
  - automation definitions
- relationship health indicators:
  - unmapped provider containers
  - provider containers assigned to a mismatched area
  - tables without folders where a folder exists

First implementation should be read-focused. Editing assignments is scheduled
after the reassignment endpoint exists.

### 3. Tasks And Adapters

Goal:

- Make the task module the owner-facing place to inspect ClickUp-backed task
  data, task lists, provider relationships, comments/notes, webhooks, and retry
  health.

Backed by implemented data:

- `/v1/tasks`
- `/v1/task-lists`
- `/v1/notes`
- `/v1/integration-settings/clickup`
- `/v1/integration-settings/clickup/webhooks`
- `/v1/integration-settings/clickup/events`
- `/v1/agent-events`
- `/v1/operating-model/external-mappings`
- `/v1/operating-model/external-fields`

Initial UI:

- task table with filters for source, status, priority, list, due date
- task list grouping by mapped operating area/table
- ClickUp webhook health panel
- failed provider event queue with retry action where supported
- Custom Field mapping inventory
- task detail drawer with notes/comments and source identity

### 4. Pipeline

Goal:

- Provide the first CRM/sales pipeline module using existing CompanyCore
  pipeline stages and deals.

Backed by implemented data:

- `/v1/pipeline-stages`
- `/v1/deals`
- `/v1/clients`
- `/v1/interactions`
- `/v1/notes`
- `/v1/operating-model/tables`

Initial UI:

- stage-based pipeline view
- deal list/table grouped by stage
- client relationship preview
- interactions timeline preview
- source and operating-area context

Provider integration attachment for pipeline should remain future scope until a
provider-specific pipeline adapter is approved and implemented.

### 5. Settings

Goal:

- Split account/platform settings from integrations and make integrations
  understandable by data type, provider, and company area.

Backed by implemented data:

- owner session data from auth/connection responses
- `/v1/api-keys`
- `/v1/integration-settings/clickup`
- `/v1/integration-settings/google-drive`
- `/v1/operating-model`
- storage locations, knowledge roots, automation definitions

Initial UI:

- Account:
  - owner/workspace identity
  - current session state
- API:
  - service keys
  - adapter capabilities
- Integrations:
  - Tasks: ClickUp Lists, Views, Custom Fields, webhooks, event retry
  - Knowledge/Storage: Google Drive folder/file/doc sync
  - Automations: automation definitions by provider and operating area
  - Future categories visible only as disabled planning placeholders in docs,
    not as inactive product UI controls

## Relationship Mapping UX Rule

The GUI must treat provider mappings as first-class operational objects.

Example:

- A ClickUp List named `03.Sprzedaż` should map to the `Sales and CRM` area,
  not to an unrelated area such as relationships or administration.

The UI should make every mapping answer:

- Which provider owns this object?
- What external type is it? Workspace, Space, Folder, List, View, Custom Field,
  Drive folder, Drive file, webhook, automation, or another future type?
- Which CompanyCore operating area owns it?
- Which folder/table is it connected to?
- Which records are downstream of it?
- Is the mapping inferred, confirmed, or needing review?

## Scheduled Implementation Wave

These tasks are safe to schedule because they use existing data and APIs.

### CCV1-046 GUI App Shell And Navigation

- Task Type: design
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Priority: P1

Goal:

- Replace the minimal owner-console navigation with a scalable authenticated
  app shell for Dashboard, Operating Areas, Tasks And Adapters, Pipeline, and
  Settings.

Scope:

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- route whitelist in `src/app.ts`

Acceptance Criteria:

- Existing auth, ClickUp setup, dashboard task table, and API settings still
  work.
- New navigation exposes only implemented surfaces.
- Unknown routes still redirect safely.
- Mobile, tablet, and desktop navigation are usable.

### CCV1-047 Dashboard Command Center

- Task Type: feature
- Current Stage: planning
- Status: READY
- Owner: Frontend Builder
- Priority: P1

Goal:

- Expand `/dashboard` into a real command center with summaries and links.

Scope:

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- existing read APIs only

Acceptance Criteria:

- Dashboard summarizes workspace, integrations, tasks, operating model, and
  event health.
- Each summary links to the relevant implemented view.
- Loading, empty, error, and healthy states are visible locally.

### CCV1-048 Operating Areas Explorer

- Task Type: feature
- Current Stage: planning
- Status: READY
- Owner: Frontend Builder
- Priority: P1

Goal:

- Add `/areas` and `/areas/:areaKey` style client routing for the 12 operating
  areas and their implemented registry data.

Scope:

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- route whitelist in `src/app.ts`
- existing `/v1/operating-model*` read APIs

Acceptance Criteria:

- All 12 areas render in canonical order.
- Area detail shows tables, folders, provider mappings, external fields,
  storage locations, knowledge roots, and automations where present.
- Unmapped or suspicious mappings are highlighted without offering unsupported
  edits.

### CCV1-049 Settings Integration Taxonomy

- Task Type: feature
- Current Stage: planning
- Status: READY
- Owner: Frontend Builder
- Priority: P1

Goal:

- Rework `/settings` into Account, API, and Integrations sections, with
  integrations grouped by data type and operating area.

Scope:

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- existing ClickUp, Google Drive, API key, and operating-model APIs

Acceptance Criteria:

- ClickUp remains fully configurable through the existing owner flow.
- Google Drive appears as a knowledge/storage integration using existing
  settings/sync capabilities.
- Integration categories show provider, data type, and area hierarchy.

### CCV1-050 Tasks And Adapter Operations View

- Task Type: feature
- Current Stage: planning
- Status: READY
- Owner: Frontend Builder
- Priority: P1

Goal:

- Add `/tasks` as the operational view for task records, lists, ClickUp health,
  fields, comments/notes, and provider retry visibility.

Scope:

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- existing tasks, task-lists, notes, ClickUp webhook/event, agent-event, and
  operating-model APIs

Acceptance Criteria:

- Owner can filter and inspect tasks without leaving CompanyCore.
- ClickUp webhook/event health is visible.
- Failed provider events can use the existing retry action where supported.

### CCV1-051 Pipeline Module

- Task Type: feature
- Current Stage: planning
- Status: READY
- Owner: Frontend Builder
- Priority: P2

Goal:

- Add `/pipeline` using existing pipeline stages, deals, clients,
  interactions, and notes.

Scope:

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- existing CRM/pipeline APIs

Acceptance Criteria:

- Pipeline stages and deals render by workspace.
- Deal rows/cards show client, value, status, source, and stage.
- Provider attachment is displayed only where existing mappings/data support it.

## Not Yet Scheduled For Runtime Implementation

These are target product needs but need backend/API or architecture decisions
before GUI implementation:

- editable relationship reassignment for external mappings
- drag-and-drop mapping between provider containers and operating areas
- direct editing of operating folders/tables
- full Google Drive owner setup UI if existing settings API does not yet expose
  all fields needed for human configuration
- pipeline provider adapter integration beyond existing native CRM records
- automation builder UI beyond listing/creating existing definitions
- advanced RBAC, invitations, billing, multi-user workspace administration
- mobile app

## Next Required Backend Slice For Relationship Editing

After the read-first Operating Areas Explorer lands, schedule a narrow
backend+GUI slice:

- add `PATCH /v1/operating-model/external-mappings/:id/scope`
- validate `areaId`, `folderId`, and `tableId` with the existing fail-closed
  `assertScope` rules
- emit a safe system event when a mapping changes
- add GUI controls to reassign one provider container at a time
- test cross-workspace denial and invalid area/folder/table combinations

This is the slice that makes corrections such as moving `03.Sprzedaż` into the
proper Sales/CRM area safe and auditable.

## UX Direction

CompanyCore should feel like a calm operational control room:

- dense but readable
- table/list first, not marketing-card first
- clear hierarchy: workspace, area, folder, table, record
- low visual noise
- strong status and health signals
- local feedback where an action happens
- no raw provider/backend errors shown to users
- desktop optimized for scanning; tablet and mobile optimized for inspection
  and quick corrective action

The current static UI can support the first wave, but once CCV1-046 through
CCV1-051 are complete, the next architectural decision should be whether to
stay on static HTML/JS or approve a React/Vite frontend shell for v2.
