# V1 Area-First Dashboard Implementation Paths

Date: 2026-05-15
Source spec:
`docs/ux/v1-simple-dashboard-canonical-spec-2026-05-15.md`

## Product Decision

CompanyCore V1 should be area-first.

The user should navigate LuckySparrow as a company:

```text
LuckySparrow
  Dzialy
    00 Ogolny
    01 Strategia
    02 Produkt
    03 Sprzedaz
    04 Operacje
    05 Relacje
    06 Kadry
    07 Finanse
    08 Zasoby
    09 Technologia
    10 Prawo
    11 Innowacje
    12 Zarzadzanie
```

Capabilities such as goals, workflows, tasks, knowledge, resources, decisions,
and AI belong inside the selected area.

## Target User Paths

### 1. CEO Opens The Company

- Entry: `/dashboard`
- Goal: understand whole-company state without choosing a module.
- UI:
  - sidebar shows 00-12 areas
  - central atlas shows readiness and review dots
  - right rail shows today priority
  - bottom path highlights `Overview`
- Evidence:
  - workspace loaded
  - operating areas loaded
  - relationship/Drive/task/MCP summaries loaded where available

### 2. CEO Opens Strategy

- Entry: click `01 Strategia` in sidebar or atlas.
- Goal: see strategy health and what needs review.
- UI:
  - `01 Strategia` expands in sidebar
  - subviews appear: Overview, Goals, Workflows, Tasks, Knowledge, Resources,
    Decisions, AI, `+ Add view`
  - main panel switches to strategy overview
  - right rail filters to strategy decisions and global priority

### 3. CEO Reviews Goals

- Entry: `01 Strategia -> Goals`
- Goal: inspect goals, KPIs, targets, and ownership.
- UI:
  - goals list or compact board
  - one primary action: review/update goal
  - MECE owner state visible per goal
  - related tasks/workflows linked from rows

### 4. CEO Reviews Workflow

- Entry: `01 Strategia -> Workflows`
- Goal: inspect processes, pipelines, stages, procedures, and blockers.
- UI:
  - workflow chain with current stage and approval state
  - commands remain guarded and lifecycle-specific
  - raw Company OS tooling is secondary, not the first surface

### 5. CEO Checks Knowledge

- Entry: selected area -> Knowledge
- Goal: see whether area context is fresh enough for AI.
- UI:
  - Drive/docs/files/resources by area
  - freshness/provenance
  - unassigned or stale context surfaced
  - AI readiness updated from evidence

### 6. CEO Delegates To AI

- Entry: selected area -> AI
- Goal: see what Jarvis/Paperclip/Codex can safely do.
- UI:
  - read-only/supervised/waiting status
  - MCP scopes and guarded commands summarized in user language
  - approval requirement and audit proof visible

### 7. CEO Adds A Custom Area View

- Entry: selected area -> `+ Add view`
- Goal: create an area-specific view without adding global sidebar clutter.
- Initial V1 behavior:
  - show a planned/disabled configuration shell if backend config does not
    exist yet
  - record view type, source, and desired layout as future task
- Future behavior:
  - choose data source
  - choose layout: list, board, table, timeline, evidence feed
  - choose owner and visibility
  - save as area-scoped view config

## Implementation Sequence

1. Freeze the current route-heavy shell behind a migration branch or feature
   flag if needed.
2. Build shared `CompanyShell` with simplified header and area-first sidebar.
3. Implement `AreaSidebar` from existing operating area data, with static
   fallback names above if live names differ.
4. Implement selected-area state from URL query or route param.
5. Implement `AreaSubnav` for the selected area.
6. Implement dashboard `CompanyAtlasBoard` as CSS/SVG, not a static image.
7. Implement `AreaOverviewPanel` and `DecisionRail` with current backend
   summaries.
8. Wire capability tabs one at a time:
   - Overview
   - Goals
   - Workflows
   - Tasks
   - Knowledge
   - Resources
   - Decisions
   - AI
9. Verify desktop and mobile against canonical images before adding more
   route bodies.

## Validation Plan

- Desktop screenshot: `1366x900`
- Mobile screenshot: `390x844`
- Checks:
  - no horizontal overflow
  - header has one search/action cluster only
  - sidebar is area-first
  - exactly one expanded area on desktop
  - capability tabs are area-scoped
  - primary action appears in area context, not as global clutter
  - keyboard focus reaches area list, subnav, atlas nodes, right rail
  - no unnamed visible controls

## Rollout Notes

- Do not delete backend routes.
- Do not remove existing workbench capability.
- Rehouse existing route destinations into area-scoped tabs and links.
- Keep `/settings/account` and safety/API surfaces reachable through system or
  AI/context links.
- Preserve the current production shell until the area-first shell passes
  signed-in browser proof.
