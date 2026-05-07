# Design Memory

Purpose: keep a compact memory of approved visual directions, reusable UI
patterns, and verified UX learnings so future tasks can build on them instead
of rediscovering them.

## Update Rules

- Add or update an entry when a visual pattern, layout approach, or interaction
  rule has been approved in implementation or review.
- Prefer updating an existing entry over creating duplicates.
- Keep entries specific enough to reuse in future tasks.
- If a pattern is project-specific, say so explicitly.

## Entry Template

```markdown
### YYYY-MM-DD - Short Title
- Type: visual_direction | reusable_pattern | responsive_rule | ux_learning
- Context:
- Decision:
- Reuse when:
- Avoid when:
- Evidence:

### YYYY-MM-DD - Background Asset Fidelity Rule
- Type: ux_learning
- Context:
- Decision:
- Reuse when:
- Avoid when:
- Evidence:
```

## Entries

### 2026-05-07 - Adapter Context Panel
- Type: reusable_pattern
- Context: Integration adapter screens need to explain connection state,
  selected provider scope, local/provider record split, and the best next
  action before showing raw tables.
- Decision: Place a compact adapter context panel before secondary stats and
  tables. Use a capability/status badge, source/scope/health pills, and two
  local actions: one for the operational editor, one for provider
  configuration.
- Reuse when: A screen is both an integration health surface and a record
  review surface, such as task, file, calendar, or provider event adapters.
- Avoid when: The route is purely a settings form or a typed business-record
  editor with no provider-scope context.
- Evidence: V2WEB-037 adds `/tasks-adapter` context with ClickUp/local task
  split, selected List count, workload health, sync state, and links to the
  task editor plus ClickUp settings.

### 2026-05-07 - Table Context Panel
- Type: reusable_pattern
- Context: Detail workbenches reached from a module index need to preserve the
  operator's orientation: what table is open, whether it is editable, which API
  methods exist, what sources are loaded, and what the next local action is.
- Decision: Place a compact context panel before the stats strip and record
  workbench. Pair capability badges with API/source/field pills and keep the
  primary table-level action local to the panel.
- Reuse when: A workbench route is one level deeper than an index and combines
  records, filters, inspectors, and optional typed editors.
- Avoid when: The route is a single-purpose form where the page title already
  answers the context and next action.
- Evidence: V2WEB-036 adds `/data/:table` context panels with typed-editor
  `New draft` and read-only `Review API` actions while preserving existing
  table filters and inspectors.

### 2026-05-07 - Workbench Capability Rows
- Type: reusable_pattern
- Context: Database and integration indexes need to answer "can I edit this",
  "what API/source coverage exists", and "what should I open next" before the
  operator drills into a table or provider screen.
- Decision: Extend workbench index rows with a capability badge, compact
  operation tags, and a right-side metrics/source panel. Editable business
  modules get a positive typed-editor badge; unsupported modules stay visibly
  read-only instead of implying unfinished write support.
- Reuse when: A module index mixes editable and inspect-only resources, or when
  agents/operators need route/source confidence before opening details.
- Avoid when: Every row has the same capability state, or when dense
  multi-column comparison is the primary job.
- Evidence: V2WEB-035 `/data` polish adds typed-editor/read-only badges,
  API/write/area tags, and responsive source metrics while preserving the
  existing workbench route behavior.

### 2026-05-07 - Workbench Index Rows
- Type: reusable_pattern
- Context: Data-heavy owner-console pages need clear operational lists for
  modules, API-backed records, provider sources, and future table workbenches.
- Decision: Reuse `workbench-panel`, `workbench-filter-bar`,
  `workbench-index-list`, `workbench-index-row`, `workbench-index-metrics`,
  `workbench-index-meta`, and `workbench-index-action` for dense index screens.
- Reuse when: A page needs searchable/filterable rows that combine a primary
  entity description, operational metrics, source/status metadata, and one
  route action.
- Avoid when: The user is editing one record in detail or comparing tabular
  cells where a real table is more scannable.
- Evidence: V2WEB-024 `/data` desktop and mobile Playwright smoke passed with
  13 module rows, filter interaction, and no browser console errors.

### 2026-05-07 - Agent Key Control Panel
- Type: reusable_pattern
- Context: Auth-sensitive owner-console actions need guided forms, copy-once
  secret handling, local status, and clear inactive states without exposing raw
  provider/backend errors.
- Decision: Use a two-column control panel with a scoped preset form on the
  left, one-time secret output on the right, and a row list below for current
  credentials and lifecycle actions.
- Reuse when: A settings screen creates sensitive credentials, webhooks, OAuth
  client material, or agent runtime tokens.
- Avoid when: The action is a simple non-secret toggle or a read-only status
  summary.
- Evidence: AGRUN-005 `/settings/api` browser smoke created a scoped key,
  displayed the raw key once, deactivated the key, and passed desktop/mobile
  visual checks without console errors.

### 2026-05-07 - Split Record Workbench
- Type: reusable_pattern
- Context: Operators need to inspect records from many CompanyCore tables
  before typed create/edit forms exist for every module.
- Decision: Use a split layout with a searchable record list on the left and a
  selected-record inspector on the right. Show concise record title/meta,
  readable field rows, and a collapsible raw JSON block for verification.
- Reuse when: A database, provider, or integration module needs fast read-only
  triage before a payload-specific editor is implemented.
- Avoid when: The task requires multi-row comparison, bulk actions, or typed
  editing controls; use a table or typed form pattern instead.
- Evidence: V2WEB-025 `/data/notes` browser smoke created a note through the
  API, filtered the table, and inspected the record on desktop/mobile.

### 2026-05-07 - Typed Record Editor Panel
- Type: reusable_pattern
- Context: Data module workbenches need editing only when the payload and
  lifecycle semantics are known for that specific route.
- Decision: Add a `record-editor` panel inside the selected-record inspector
  for typed modules. Keep create/save/archive actions local to the panel,
  validate required fields before calling the API, refresh the table after each
  mutation, and keep unrelated tables read-only until their typed editor is
  implemented.
- Reuse when: A CompanyCore business route has existing create/update/archive
  APIs and a small payload that can be represented honestly in the UI.
- Avoid when: The route has provider-side side effects, unresolved relationship
  mapping, bulk editing, or ambiguous archive/delete semantics.
- Evidence: V2WEB-026 `/data/notes` local Playwright smoke created, updated,
  archived, and reloaded real Notes API records on desktop and mobile without
  console errors. V2WEB-027 reused the same pattern for `/data/projects` with
  typed name/status/description controls and responsive `record-editor-grid`
  validation. V2WEB-028 reused it for `/data/clients` with a CRM-specific grid
  and full-width email field so longer contact values remain readable.
  V2WEB-029 reused it for `/data/task-lists` with typed project linkage and
  draft preservation so background workspace refreshes do not wipe in-progress
  create input. V2WEB-030 reused it for `/data/tasks` with denser task fields
  while keeping provider-specific ClickUp custom-field and sync actions out of
  the local business-record editor.

### 2026-05-07 - Provider Folder Picker
- Type: reusable_pattern
- Context: Provider import setup should not force operators to paste opaque
  external IDs when the provider can list selectable containers after consent.
- Decision: Use a setup guide for provider-specific auth prerequisites, keep
  manual IDs as an advanced fallback, and make the normal import path a
  checkbox list with selected-count feedback plus an explicit save-selection
  action before import.
- Reuse when: A provider integration imports folders, lists, projects, or other
  external containers and the owner can discover them safely through an OAuth
  or API token.
- Avoid when: The provider cannot list containers with the granted scopes, or
  selection has destructive side effects before a separate confirmation/import
  action.
- Evidence: V2GD-012 added Google Drive folder discovery and selection in
  `/settings/drive`, passed authenticated desktop/mobile Playwright smoke, and
  retained manual folder IDs as a fallback for restricted Google accounts.

### 2026-05-07 - Shared Capability Labels
- Type: domain_language_pattern
- Context: Some modules are shared infrastructure that can be used by several
  departments, even when the first visible records come from one department.
- Decision: Label shared capabilities by their reusable operating purpose first
  and describe department-specific records as current usage or consumers. Do
  not group shared workflow primitives under CRM just because CRM deals use
  them.
- Reuse when: A page combines shared configuration with records from a current
  department, such as pipelines used by CRM now and other departments later.
- Avoid when: A module is truly owned by one department and should be optimized
  for that team's language.
- Evidence: V2WEB-031 moved pipeline copy and navigation grouping from
  CRM-owned language to shared workflow language while keeping CRM usage
  records visible.

### 2026-05-07 - Command Center Pairing
- Type: reusable_pattern
- Context: Operational dashboards need to answer priority, blockers, and next
  action before the operator scrolls.
- Decision: Pair the current-priority cockpit with the attention queue in one
  responsive command layout. Put readiness lanes inside the cockpit and keep
  secondary health cards below as a compact strip.
- Reuse when: A dashboard is the owner's starting point and has both ranked
  action items and readiness/status lanes.
- Avoid when: The screen is a single-purpose editor, table workbench, or setup
  flow where a split command center would distract from the main form.
- Evidence: V2WEB-032 moved dashboard attention items beside the operational
  cockpit on desktop, stacked them cleanly on mobile, and preserved existing
  dynamic state wiring.

### 2026-05-07 - Semantic Sidebar Sections
- Type: reusable_pattern
- Context: The owner console has enough modules that a flat sidebar becomes
  slower to scan than the underlying operating model.
- Decision: Group shell navigation by job family, not implementation order:
  command, operate, integrations, and workspace. Keep route URLs and active
  state contracts stable while improving labels and visual grouping.
- Reuse when: A navigation rail mixes daily work surfaces, provider setup,
  system settings, and account controls.
- Avoid when: A flow has fewer than five destinations or a wizard needs a
  strict linear stepper instead of persistent navigation.
- Evidence: V2WEB-033 grouped the CompanyCore sidebar while preserving every
  existing `href`, `data-link`, and `data-nav` route contract.

### 2026-05-07 - Shared Navigation Lanes
- Type: reusable_pattern
- Context: Persistent sidebar navigation and command-bar search should teach
  the same mental model instead of presenting two different taxonomies.
- Decision: Use the same job-family lanes in sidebar links and module switcher
  results. Mark the active destination in both surfaces so the operator always
  knows where they are before jumping elsewhere.
- Reuse when: A command bar, global search, or module switcher points at the
  same destinations as the app shell.
- Avoid when: Search results are heterogeneous objects rather than navigation
  destinations; those should group by object type or relevance instead.
- Evidence: V2WEB-034 aligned module switcher groups with the V2WEB-033
  sidebar lanes and added active-result styling without changing route paths.
