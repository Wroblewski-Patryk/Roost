# V1 Area Detail Canonical Spec

Date: 2026-05-15
Stage: implementation
Task: `V1AREA-002`

## Purpose

This spec defines the canonical V1 drill-down from the Company Atlas dashboard
into one company department. The route is `/areas?area=:areaKey&view=:viewId`.
It is the area-first counterpart to the whole-company dashboard.

The owner outcome is:

```text
I select a department and immediately see its health, ownership, decisions,
execution pressure, knowledge, provider context, and safe AI handoff.
```

## Canonical Images

- Desktop target:
  `docs/ux/assets/companycore-v1-area-detail-desktop-canonical.png`
- Mobile target:
  `docs/ux/assets/companycore-v1-area-detail-mobile-canonical.png`

These images are the current visual implementation targets for the selected
department view. They should be treated as a focused operating-room pattern:
health first, then ownership and flow, then evidence, then the safe owner/AI
handoff path.

## Active Route Contract

- `/areas` remains the all-areas operating workbench.
- `/areas?area=01-strategia` opens the canonical department detail view.
- `view` selects one of the area capability views:
  `overview`, `goals`, `workflows`, `tasks`, `knowledge`, `resources`,
  `decisions`, `ai`, or `add-view`.
- Unsupported or missing `area` values continue to use the all-areas
  workbench instead of guessing.

## Layout Model

### Desktop

- Reuse the area-first `atlas-shell` and dark department sidebar.
- Keep the selected department expanded in the sidebar with capability
  shortcuts and `+ Add view`.
- Main surface:
  - department hero with area number, lens, description, status sigil, and
    four metrics;
  - horizontal capability rail;
  - operating board with `Observe`, `Decide`, `Execute`, and `Delegate` lanes;
  - selected capability focus panel;
  - selected capability board with pinned records, linked sources, and next
    safe actions for the active tab;
  - evidence grid for tables, records, knowledge, and provider mappings.
- Right rail:
  - ownership, knowledge, and AI decision signals;
  - proof-source chips.

### Mobile

- Use mobile appbar plus horizontal department selector.
- Keep capability selection as a horizontal rail, not a fixed bottom nav.
- Stack hero, board lanes, capability focus, evidence, and decision rail.
- No horizontal overflow.

## Data Sources

- `/v1/connection` for workspace, operating areas, capabilities, MCP manifest,
  and integration readiness.
- `/v1/operating-model/external-mappings` for provider ownership.
- `/v1/google-drive/files` for scoped knowledge and Drive evidence.
- Existing table record paths derived from area table `apiSlug` values.

## Component Contract

- `AreaDetailView`: route-level department view.
- `AreaDetailHero`: department identity and high-level metrics.
- `AreaCapabilityRail`: area capability view selector.
- `AreaOperatingBoard`: observe/decide/execute/delegate decision model.
- `AreaCapabilityFocus`: selected capability explanation and deep links.
- `AreaCapabilityBoard`: area-scoped records, sources, proof, and next actions
  for the active capability tab.
- `AreaEvidenceGrid`: tables, records, knowledge, provider proof.
- `AreaDecisionRail`: owner decision and AI handoff rail.

## Quality Bar

- The view must feel like a department operating room, not another module
  directory.
- The owner should understand what matters now before choosing a table or tool.
- The first read should answer: what is this department, is it ready, where is
  the work flowing, what proof backs it, and what can be delegated safely?
- Capability boards should feel like an inspection surface, not nested
  dashboards. Prefer a connected flow, light separators, and clear proof rows
  over heavy stacked cards.
- AI delegation must stay visibly guarded by ownership, knowledge, and MCP
  readiness.
- Empty states are honest and do not invent fake resources.
