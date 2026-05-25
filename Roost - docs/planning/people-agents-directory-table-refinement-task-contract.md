# People/Agents Directory Table Refinement Task Contract

Task ID: PEOPLE-AGENTS-DIRECTORY-TABLE-UX-004

Task Type: frontend/UX/maintainability

Current Stage: verification

Deliverable For This Stage: verified reusable management-table adoption in `06 People & Agents -> Directory`.

## Goal

Refine `06 People & Agents -> Directory` into a cleaner operational table: one row per workforce entity, an explicit People/Agents split, no density toggles, and row-local actions that remain visible across desktop, tablet, and mobile.

## Scope

- `web/src/components/cc-data-table.tsx`
- `web/src/features/departments/people-agents-route.tsx`
- `docs/ux/design-memory.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`

## Implementation Plan

1. Reuse and extend `CcDataTable` instead of keeping a route-local roster card layout.
2. Remove the redundant type select and comfortable/compact density controls.
3. Keep one compact table with operational columns: person/agent, kind, role/department, manager, status, runtime, and actions.
4. Keep People and Agents as first-class scope chips.
5. Make row actions sticky in the shared table so Preview/Edit/Archive/Delete stay reachable without horizontal scrolling.
6. Validate build, API regression safety, responsive rendering, and process cleanup.

## Acceptance Criteria

- [x] Directory renders one table and no roster cards.
- [x] Each workforce entity maps to one table row.
- [x] People filter shows the owner human row.
- [x] Agents filter shows the 13 Paperclip director agent rows in the proof dataset.
- [x] No `comfortable` or `compact` toggle is visible.
- [x] Row actions are visible without horizontal scrolling on desktop, tablet, and mobile.
- [x] Preview opens the profile modal and does not permanently occupy the right side of the Directory.
- [x] Shared `CcDataTable` gains reusable row-class and sticky action-column behavior.

## Definition Of Done

- [x] `npm run build:web`
- [x] `npm run validate`
- [x] `npm run test:api:local`
- [x] `git diff --check`
- [x] Playwright responsive proof for desktop, tablet, and mobile.
- [x] Evidence screenshots saved under `docs/ux/evidence/`.
- [x] Validation server and headless browser processes cleaned up.
- [x] Source-of-truth state and UX memory updated.

## Result Report

Implemented and verified. `People/Agents -> Directory` now uses the shared `CcDataTable` as a real roster table with one row per person or agent, explicit People/Agents scope chips, a simplified filter bar, and sticky row actions. The route no longer renders density mode toggles or card-style roster articles. `CcDataTable` now supports `getRowClassName` and keeps the action column sticky for dense management tables.

Validation passed: `npm run build:web`, `npm run validate`, `npm run test:api:local` with all 25 migrations and 6/6 API tests, and `git diff --check`. Playwright proof on a controlled workforce packet verified desktop, tablet, and mobile: exactly one table, no article cards, no density toggle text, People = 1 row, Agents = 13 rows, sticky Preview action visible without horizontal scrolling, preview modal rendering, no console warnings/errors, and no page-level horizontal overflow.
