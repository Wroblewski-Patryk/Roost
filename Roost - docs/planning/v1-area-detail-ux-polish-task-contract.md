# V1AREA-004 Area Detail UX Polish

## Task Type

Implementation

## Current Stage

Verification

## Deliverable For This Stage

Polish the selected-department view so it feels calmer, more useful, and more
intentional for owner-level company management.

## Goal

Improve the V1 department operating room without changing backend contracts:
make the operating flow easier to scan, make capability boards less card-heavy,
and improve mobile readability.

## Scope

- `web/src/styles.css`
- `web/src/main.tsx` only if a small accessibility or structure adjustment is
  needed
- `docs/ux/v1-area-detail-canonical-spec-2026-05-15.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/*`

## Implementation Plan

1. Keep the existing area detail route and data model unchanged.
2. Convert the operating board into a calmer connected flow map on desktop.
3. Make capability boards feel like an inspection surface, not nested cards.
4. Tighten mobile density so the first scan is faster without hiding evidence.
5. Validate build, route rendering, screenshots, and source-of-truth docs.

## Acceptance Criteria

- The selected-area operating board reads as a connected workflow.
- Capability tab content has clearer hierarchy and less nested-card weight.
- Mobile `390x844` has no horizontal overflow and the AI tab remains readable.
- `npm run build:web`, `npm run validate`, and `git diff --check` pass.

## Definition Of Done

- Runtime CSS/React remains scoped to the selected-area view.
- No new backend contract, fake data, or temporary bypass is introduced.
- Validation evidence and source-of-truth updates are recorded.

## Result Report

- Status: implemented and locally verified.
- Validation:
  - `npm run build:web`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed.
  - Playwright fallback against `http://127.0.0.1:3146` clicked every desktop
    capability tab and verified mobile AI tab rendering at `390x844`.
  - No horizontal overflow, console errors, or page errors were observed.
  - Screenshots:
    `docs/ux/evidence/v1-area-detail-polish-desktop.png`,
    `docs/ux/evidence/v1-area-detail-polish-mobile.png`.
- Residual risk: deeper capability-specific editing remains a future backend
  contract and interaction design task.
