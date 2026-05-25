# V1AREA-002 Area Detail Canonical View

## Task Type

Implementation

## Current Stage

Verification

## Deliverable For This Stage

Create and verify the canonical V1 department drill-down view opened from the
Company Atlas dashboard.

## Goal

Let an owner move from the whole-company dashboard into a selected department
and see the department's health, operating board, capability views, evidence,
and AI handoff readiness without falling back to a generic workbench.

## Scope

- `web/src/main.tsx`
- `web/src/styles.css`
- `docs/ux/v1-area-detail-canonical-spec-2026-05-15.md`
- `docs/architecture/web-layer-react-ownership.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/*`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan

1. Keep `/areas` as the all-areas workbench.
2. Add a canonical area-detail route state for `/areas?area=:areaKey`.
3. Reuse the area-first atlas shell, sidebar, mobile appbar, and area selector.
4. Add department hero, capability rail, operating board, selected capability
   focus, evidence grid, and decision rail.
5. Derive metrics from existing connection, area tables, record snapshots,
   Drive files, provider mappings, capabilities, and MCP readiness.
6. Verify desktop and mobile route rendering with mocked backend responses.
7. Record UX, planning, project-state, and validation evidence.

## Acceptance Criteria

- `/areas?area=01-strategia&view=overview` renders a department detail view,
  not the generic all-areas workbench.
- The view includes department identity, capability navigation, operating
  board, selected capability focus, evidence grid, and decision rail.
- `/areas` remains available as the all-areas workbench.
- Desktop and mobile render without horizontal overflow or console/page errors.
- `npm run validate` and `git diff --check` pass.

## Definition Of Done

- The area-detail view is implemented in React with the existing Tailwind,
  DaisyUI, and atlas visual language.
- No new backend routes or fake product data are introduced.
- The source-of-truth docs and active planning queue are updated.
- Local validation and browser proof are recorded.

## Result Report

- Status: implemented and locally verified.
- Validation:
  - `npm run build:web`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed.
  - Playwright fallback against local backend `http://127.0.0.1:3138`
    verified `/areas?area=01-strategia&view=overview` on desktop `1366x900`
    and `/areas?area=01-strategia&view=ai` on mobile `390x844`.
  - Proof markers included `01 Strategia`, `Observe, decide, execute,
    delegate`, `Decision rail`, `Tables`, `Records`, `Knowledge`, `Providers`,
    and `AI handoff readiness`.
  - No horizontal overflow, console errors, or page errors were observed.
  - Screenshots:
    `.tmp/area-detail-desktop.png`,
    `.tmp/area-detail-mobile-clean.png`.
  - Current canonical visual targets:
    `docs/ux/assets/companycore-v1-area-detail-desktop-canonical.png`,
    `docs/ux/assets/companycore-v1-area-detail-mobile-canonical.png`.
- Residual risk:
  - Production deploy proof is separate.
  - Future slices should connect capability-specific filters and editable
    configuration once backend view-configuration contracts exist.
