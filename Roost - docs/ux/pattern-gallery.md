# Pattern Gallery

Use this file as a starter catalog of common app patterns that agents can
reuse and adapt instead of improvising every screen from scratch.

This is not a component inventory. It is a screen and flow pattern catalog.

## How To Use

- Choose the closest proven pattern before inventing a new layout.
- Adapt the pattern to the project's visual thesis.
- Record project-specific approved variants in `docs/ux/design-memory.md`.

## Core Patterns

### App Shell

- Purpose: stable navigation and page rhythm for the main product surface.
- Project-specific contract:
  `docs/ux/authenticated-shell-layout-audit-2026-05-14.md`.
- Mobile: compact top bar, drawer for full IA, command-first content, optional
  bottom shortcuts for core destinations, and primary action reachable.
- Tablet: compact rail or drawer rail, split panels when useful, contextual
  command panel.
- Desktop: persistent command/company navigation, top command bar, optional
  right command brief, status strip, visible filters, wider content lanes.
- Avoid: permanent route-local shells that teach a second navigation model.

### List Detail

- Purpose: browse many items and inspect one deeply.
- Mobile: stacked navigation with clear back behavior.
- Tablet: two-pane layout is often ideal.
- Desktop: persistent list, detail panel, and supporting controls can coexist.

### Dashboard

- Purpose: quick monitoring, triage, and action initiation.
- Mobile: prioritize the 1 to 3 most important signals and one primary action.
- Tablet: combine summary cards with richer previews.
- Desktop: use width for comparison, trends, and secondary context.

### Company City Map

- Purpose: orient the user inside the whole company as a strategic value
  ecosystem, not a generic dashboard.
- Current project-specific spec:
  `docs/ux/company-city-dashboard-v3-spec.md`.
- Use when: the screen needs to show company areas, responsibility, value
  flow, unassigned `GENERAL` intake, integrations, tasks, decisions, and
  automation readiness together.
- Mobile: compress the map into an overview, district switcher, or progressive
  drill-down; do not force tiny labels on a full city canvas.
- Tablet: pair the selected district with a command panel when space allows.
- Desktop: use the full cinematic city canvas with persistent navigation,
  right-side command brief, and a bottom value-journey strip.
- Avoid: flat node graphs, generic bento dashboards, map labels that obscure
  the view, and game-like rewards that are not backed by real company state.

### Form Heavy Workflow

- Purpose: creation, editing, onboarding, settings, or checkout.
- Mobile: reduce visible complexity with sections and progressive disclosure.
- Tablet: use width for helper text, previews, and grouped controls.
- Desktop: use structured columns carefully without breaking scan order.

### Search And Filter

- Purpose: exploration with narrowing and sorting.
- Mobile: filters should be accessible without dominating the screen.
- Tablet: filter drawers or side panels often work well.
- Desktop: persistent filter sidebars can reduce repeated effort.

### Empty State

- Purpose: orient, reassure, and guide the next meaningful action.
- Include: what this area is for, why it is empty, and what to do next.
- Avoid: dead-end illustrations with no clear path forward.

### Activity Or Timeline

- Purpose: show recent events, history, or system progress.
- Mobile: simplify density and maintain clear timestamps and labels.
- Tablet/Desktop: add metadata and secondary actions without creating noise.

### Settings

- Purpose: stable configuration area with low cognitive overhead.
- Group by mental model, not backend structure.
- Keep destructive actions isolated and obvious.

## Pattern Selection Questions

- Is the user browsing, deciding, creating, monitoring, or configuring?
- Does width help comparison, preview, or persistent navigation?
- Is the user likely to switch devices mid-task?
- Which pattern reduces effort for the main job instead of merely filling space?
