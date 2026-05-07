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
