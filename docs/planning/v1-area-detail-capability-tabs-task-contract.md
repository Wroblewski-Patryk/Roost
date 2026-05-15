# V1AREA-003 Area Detail Capability Tabs

## Task Type

Implementation

## Current Stage

Verification

## Deliverable For This Stage

Extend the canonical selected-department view so each capability tab gives an
area-scoped operating preview derived from existing backend data.

## Goal

Let the owner open one company department and inspect the linked goals,
workflows, tasks, knowledge, resources, decisions, and AI handoff context
without leaving the area view first.

## Scope

- `web/src/main.tsx`
- `web/src/styles.css`
- `docs/ux/v1-area-detail-canonical-spec-2026-05-15.md`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/*`

## Implementation Plan

1. Reuse the existing `/areas?area=:areaKey&view=:viewId` route, atlas shell,
   capability rail, and already-loaded backend snapshots.
2. Classify area tables and records by existing API slugs instead of inventing
   new data contracts.
3. Add a reusable capability board that renders pinned records, linked sources,
   and next safe actions for each tab.
4. Keep empty states honest when a tab has no scoped records or provider
   evidence.
5. Validate build, route behavior, responsive layout, and source-of-truth docs.

## Acceptance Criteria

- `overview`, `goals`, `workflows`, `tasks`, `knowledge`, `resources`,
  `decisions`, `ai`, and `add-view` each render a distinct area-scoped
  capability board.
- The boards only use data already available from `/v1/connection`,
  `/v1/operating-model/external-mappings`, `/v1/google-drive/files`, MCP
  manifest data, and readable table endpoints.
- Tabs are interactive and preserve the selected route query.
- Desktop and mobile render without horizontal overflow or route-level errors.
- `npm run build:web`, `npm run validate`, and `git diff --check` pass.

## Definition Of Done

- The selected-department view provides a practical first V1 overview for every
  capability tab.
- No new backend route, fake seed data, or temporary bypass is introduced.
- Source-of-truth docs and state files describe the implementation and evidence.

## Result Report

- Status: implemented and locally verified.
- Validation:
  - `npm run build:web`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed.
  - Playwright fallback against `http://127.0.0.1:3144` clicked every desktop
    capability tab and verified mobile AI tab rendering at `390x844`.
  - No horizontal overflow, console errors, or page errors were observed.
  - Screenshots:
    `docs/ux/evidence/v1-area-detail-tabs-desktop.png`,
    `docs/ux/evidence/v1-area-detail-tabs-mobile.png`.
- Residual risk: capability-specific create/edit flows remain future slices
  unless an existing backend contract already supports them cleanly.
