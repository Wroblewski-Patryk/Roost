# Web View Creation Rules

Last updated: 2026-05-17

## Purpose

CompanyCore/Roost web views are operating tools, not marketing pages. New
views must maximize useful backend-connected work in the first viewport and
avoid decorative summaries, redundant badges, or explanatory hero blocks.

These rules are derived from the current best local patterns:

- `04 Operations -> Tasks`
- `04 Operations -> Calendar`
- `08 Assets -> Files/Folders`

## Core Rule

Start every authenticated module view from the work object and the next useful
action.

Good default structure:

```text
Shell
  -> compact work surface header
       title, current scope, primary action, secondary action if needed
  -> filters / selector / mode controls
  -> primary work area
       board, table, list, tree, calendar, editor, or preview
  -> detail / inspector / preview panel
  -> local empty, error, loading, and recovery states
```

Avoid this for authenticated work views:

```text
large hero section
  -> generic explanation
  -> KPI cards not tied to immediate action
  -> decorative badges
  -> actual tool below the fold
```

## Required View Contract

Every new or reactivated authenticated view must define:

| Item | Requirement |
| --- | --- |
| Primary object | The backend object or packet the user acts on. |
| Primary action | The main backend-connected action available from the first viewport. |
| Secondary actions | Only actions that are real and wired, not placeholders. |
| Work layout | Board, calendar, list/detail, tree/preview, table/editor, or another justified tool layout. |
| Filters | Search, scope, mode, or sort controls only when they change visible data. |
| Detail panel | Show editable fields, preview, sync, evidence, or related records. |
| Recovery state | Clear empty, filtered-empty, loading, and error states with useful next actions. |
| Responsive behavior | Desktop, tablet, and mobile must keep navigation and primary work usable. |

## Visual Density Rules

- Use one compact header inside the work surface, not a page hero.
- Use `h1` or `h2` scale that matches the container. Workbench headers should
  usually use `text-xl`, not `text-3xl`.
- Do not add summary cards by default. Add counters only when they directly
  affect workflow decisions, such as visible item count, selected list count,
  unscheduled task count, or current scope count.
- Do not add a badge for every field. Prefer compact metadata rows, columns, or
  labels. Badges are reserved for status, risk, active filters, or hard
  capability boundaries.
- Keep action buttons near the object they affect.
- Keep technical architecture copy out of the first viewport unless it changes
  a decision the operator must make.

## Backend-Connected Functionality Rules

- A view is not useful because it displays many labels; it is useful because it
  lets the owner inspect, edit, filter, sync, route, preview, assign, move, or
  recover real backend state.
- Prefer adding one real command, editor, preview, or detail workflow over
  adding a new KPI band.
- If backend support does not exist, show a precise disabled state or omit the
  affordance. Do not add fake UI for future capability.
- Existing backend packets and routes must drive the layout before a new API is
  added.

## Current Reusable Patterns

### Operations Board Pattern

Use when records move through statuses.

- Compact surface header.
- Real actions: create, workflow settings.
- Shared filter bar.
- Horizontally scrollable status lanes.
- Local drag/drop feedback.
- Empty and filtered-empty recovery.
- Detail/edit modal tied to backend routes.

### Operations Calendar Pattern

Use when time and unscheduled work matter.

- Compact range header.
- Mode controls and date controls.
- Same filters as the board.
- Visible unscheduled panel.
- Day/week/month views with direct task opening.

### Assets Files/Folders Pattern

Use when source hierarchy and preview matter.

- Root selector.
- Folder tree.
- Compact content header with visible scope count.
- Search, sort, type filters.
- Resource cards.
- Preview/editor panel.
- Folder/content edit modals tied to backend commands.

### People/Agents Directory Pattern

Use when the module manages workforce profiles and runtime configuration.

- Compact roster header inside the list surface.
- Search/type/status filters.
- List/detail layout.
- Detail tabs for profile, sync, and generated files.
- Primary actions: create, edit, manual sync where allowed.
- Avoid hero copy, generic KPI bands, and repeated badges.

## Checklist Before Shipping A New View

- [ ] The first viewport contains real work controls, not a hero.
- [ ] Every visible action calls an existing backend route or has a clear
      disabled reason.
- [ ] Counters are workflow-specific, not decorative.
- [ ] Badges are limited to actionable status/risk/capability information.
- [ ] The view has loading, error, empty, and filtered-empty states.
- [ ] Desktop, tablet, and mobile preserve navigation and primary work.
- [ ] The view reuses existing shell, `CcButton`, `CcField`, `CcNotice`,
      selector, table/list, Roost work-surface, and route conventions before
      introducing new local UI.
