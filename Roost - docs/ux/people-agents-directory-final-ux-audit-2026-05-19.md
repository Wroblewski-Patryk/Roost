# People/Agents Directory Final UX Audit

Date: 2026-05-19
Scope: `06 People & Agents -> Directory`, workforce preview modal, and
new/edit workforce entity modal.
Implementation reviewed:
`web/src/features/departments/people-agents-route.tsx` and
`web/src/components/cc-data-table.tsx`.

## Purpose

This audit captures the final UX conclusions from the People/Agents workstream
so future complex management screens can reuse the same product logic. The
goal is not a decorative HR dashboard. The goal is a source-of-truth management
tool where the owner can scan, filter, inspect, edit, and govern humans and AI
agents with backend-backed data.

CompanyCore/Roost remains the organizational source of truth. Paperclip remains
the external agent runtime. The People/Agents UI must therefore explain and
edit the CompanyCore record first, with runtime context shown only where it
helps manage the workforce entity.

## Executive Assessment

| Surface | Current quality | Main strength | Main remaining risk |
| --- | --- | --- | --- |
| Directory | Strong foundation | One object per table row, reusable table primitive, row-local actions, filters, sorting, selection, pagination, and column visibility | Needs future real bulk actions and richer backend-backed permissions/skills resources when those tables exist |
| Preview modal | Strong foundation | Intentional detail overlay with identity, hierarchy, profile, access, authority, and generated files separated into tabs | Needs deeper operational history and live activity once backend exposes it |
| New/Edit modal | Good foundation | Sectioned source-of-truth form with runtime/personality/access groups and Big Five visualization | Needs field-level backend validation messages and future RBAC-aware edit affordances |

No P0 UX blocker remains for this slice. The view is now usable as a real
management surface instead of a badge-heavy concept page. The next quality
gains should come from backend data depth, not from more visual ornaments.

## Directory Audit

### What Works

- The screen now behaves like a workbench. It opens on the roster and controls,
  not on a large hero, KPI strip, or explanatory marketing block.
- `CcDataTable` gives the route a reusable management-table shell: filter zone,
  table zone, and pagination zone.
- Each workforce entity occupies exactly one row. This matches owner
  expectations for a management index.
- Role and department are separate operational columns. They answer different
  management questions and should not be merged.
- The row no longer repeats low-value secondary text such as slug or raw
  Paperclip sync state.
- Row-level actions are visible where the user is already looking:
  Preview, Duplicate, Edit, Archive, and Delete.
- Manager and runtime remain available through the column picker without
  crowding the first-load table.
- Filters have visible labels, which makes the table understandable and
  accessible.
- Quick filter chips were removed because they duplicated the structured
  filters.
- Sort icons are compact stateful carets instead of noisy generic glyphs.
- Rows have hover treatment, making the table feel interactive and aligned with
  DaisyUI table expectations.

### Issues To Watch

- The table currently has selection state, but real bulk operations are still
  limited by backend workflows. Do not expose destructive bulk actions until
  the backend has explicit guarded commands.
- Column visibility is client-side. If future datasets become large, filtering,
  sorting, and pagination should move server-side through a query contract.
- Workforce access indexes are arrays today. They are useful as source-of-truth
  names, but skills, knowledge, tools, and permissions should become linked
  resources when the backend model is ready.
- A future audit should verify keyboard navigation across row actions, column
  picker, page input, and modals after the next interaction-heavy slice.

## Preview Modal Audit

### What Works

- Preview opens only after an explicit action. The base Directory remains a
  collection screen instead of constantly showing a right-side detail panel.
- The modal gives the selected entity enough hierarchy and identity context
  before showing detailed tabs.
- Tabs keep the detail model scannable:
  Profile, Access, Work, Authority, and Files.
- Big Five is visualized with a compact radar chart and exact trait bars. This
  helps compare personality shape without turning the roster into a chart
  dashboard.
- Generated files are in a dedicated tab. They are important for agents, but
  too verbose for the main table.

### Issues To Watch

- The preview should remain an inspection and decision surface. Avoid adding a
  second edit form inside it unless the edit action is deliberately scoped.
- Paperclip/runtime details should not dominate human records.
- Generated markdown preview should eventually show freshness, last generated
  timestamp, and validation status if backend persistence exposes those fields.
- Authority and access tabs should eventually separate granted resources,
  missing resources, and blocked resources once RBAC/skills tables exist.

## New/Edit Modal Audit

### What Works

- The modal frames the record as a source-of-truth entity, which matches the
  architecture boundary.
- Fields are grouped by job: identity/role, runtime/personality, Big Five, and
  access indexes.
- Big Five has live visual feedback. This makes an abstract data shape
  editable without forcing the user to mentally parse five numeric inputs.
- The same modal supports create, edit, and duplicate modes, which keeps route
  behavior consistent.

### Issues To Watch

- Form validation should keep improving toward field-local messages from the
  backend validation contract.
- For long future workflows, use a dedicated page or stepper instead of
  growing this modal indefinitely.
- Future RBAC should make restricted fields visibly read-only instead of
  silently failing on save.
- Access indexes are still name arrays. When they become resources, the form
  should use searchable pickers, not comma text fields.

## Durable Decisions From This Workstream

1. Authenticated management views are tools, not landing pages.
2. First viewport should contain backend-connected work controls and records.
3. Avoid hero sections, large page titles, decorative counters, and badge
   noise in dense internal tools.
4. A table is the default for flat management datasets.
5. One row should represent one primary object.
6. Every management table needs a name/title column and an actions column.
7. Actions must be local to the row or record they affect.
8. Preview, edit, archive, and delete should be explicit actions.
9. Destructive actions require a styled confirmation modal, not a browser
   alert.
10. Role and department are separate operational dimensions when both affect
    assignment or accountability.
11. Do not show raw provider/backend implementation details in a table row
    unless they directly support an operator decision.
12. Filters need visible labels.
13. Quick filters are allowed only when they provide a distinct shortcut that
    is not already covered by select filters.
14. Sort affordances should be compact, stateful, and visually quiet.
15. Rows need hover and focus states.
16. Dense secondary columns should be available through column visibility
    rather than forced into first-load layout.
17. Details should open intentionally in a modal for small/medium records.
18. Large workflows should become dedicated views instead of overloaded modals.
19. Forms should be grouped by user decision, not by database column order.
20. Data visualizations belong near the decision they clarify.
21. Generated files, runtime context, and integration state belong in detail
    tabs unless they are the immediate table task.
22. CompanyCore/Roost is the source of truth. External runtimes are consumers.

## Reusable Complex View Standard

Use this standard before building any future complex management component.

### 1. Define The Job

Write the one-sentence operator job before coding. Example:
"Manage the source-of-truth workforce roster and inspect/edit individual human
or AI worker records."

If the job is to manage records, start with a table or structured collection.
If the job is to execute work, consider a board/calendar. If the job is to
browse hierarchy, consider a tree. Do not use a decorative dashboard by
default.

### 2. Split The Surface

Every complex management surface should declare:

- collection surface: list/table/tree/board/calendar;
- inspection surface: modal, drawer, detail route, or preview pane;
- edit surface: modal, drawer, or route;
- destructive surface: confirmation modal with clear consequence language;
- empty/loading/error states;
- responsive behavior for desktop, tablet, and mobile.

### 3. Prefer Shared Primitives

Use `CcDataTable` for flat backend-backed indexes before creating local table
logic. The table primitive should own:

- search;
- fixed-value filters;
- sortable columns;
- column visibility;
- row selection;
- bulk-action handoff;
- row actions;
- min-width table layout;
- pagination;
- page-size select.

Route-specific code should provide columns, rows, actions, filter definitions,
and domain copy. It should not reimplement generic table mechanics.

### 4. Keep The First View Functional

The first viewport must answer:

- What records exist?
- Which subset am I seeing?
- What can I do to the selected or visible records?
- What needs attention?
- What is the next useful action?

Do not spend first-viewport space on generic slogans, decorative metrics, or
large explanatory prose.

### 5. Map Data To Decisions

Show fields where they help the current action:

- table: identity, status, ownership, role, department, high-signal state,
  actions;
- preview: hierarchy, authority, work scope, access resources, generated
  context, integration readiness;
- form: editable source-of-truth fields grouped by decision;
- audit/log view: historical and diagnostic data.

### 6. Make Responsiveness A Product Requirement

Desktop, tablet, and mobile are separate experience surfaces:

- desktop may keep more columns visible;
- tablet should preserve actions and filters before optional columns;
- mobile should keep row actions reachable and avoid horizontal page overflow;
- large tables may scroll inside the table shell, not the whole page.

### 7. Verify With Evidence

A complex UI slice is not done until it has:

- build/validation result;
- desktop, tablet, and mobile render proof when browser-facing;
- interaction proof for the main user journey;
- no page-level horizontal overflow;
- no relevant console errors;
- updated UX memory when the pattern should be reused.

## Backlog Recommendations

| Priority | Recommendation | Why |
| --- | --- | --- |
| P1 | Add real backend-supported bulk actions for selected workforce records | The table already supports selection; bulk lifecycle commands need explicit guarded backend contracts |
| P1 | Convert skills, knowledge, and tools from string arrays into linked resources | This will make People/Agents a stronger management system instead of a profile-only roster |
| P1 | Add field-local backend validation feedback to the workforce form | Better recovery, fewer failed saves, and cleaner trust in source-of-truth edits |
| P2 | Add activity/readiness history to preview | Helps understand why an agent/person is blocked, stale, or ready |
| P2 | Add keyboard/a11y interaction audit for table and modals | Important as table controls become more powerful |
| P2 | Add server-side query contract if workforce grows beyond local table scale | Prevents client-side filtering/sorting from becoming a performance ceiling |

## Final Call

The current People/Agents Directory is now directionally correct: it is a
management tool with a reusable table foundation, intentional detail/edit
modals, and source-of-truth framing. Future improvements should deepen backend
meaning, permissions, linked resources, and operational history rather than
adding more counters, badges, or presentation-only UI.
