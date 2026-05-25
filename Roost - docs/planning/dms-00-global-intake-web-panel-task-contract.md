# DMS-00-004 Global Intake Web Panel Task Contract

Last updated: 2026-05-16

## Task Type

Implementation.

## Current Stage

Verification.

## Deliverable For This Stage

Owner-facing read-only `00 Main` panel in the selected-area route, backed by
the verified `GET /v1/intake` API and validated with a real backend session.

## Goal

Make `00 Main` the visible global intake and routing desk for owner decisions,
Paperclip and agent output, unassigned resources, high-risk items, and future
classification commands without adding unsafe write behavior.

## Scope

- `web/src/main.tsx`
  - Add intake response types.
  - Load `/v1/intake` only for `00-ogolny`.
  - Render the `MainIntakeSystemPanel` before generic selected-area layers.
  - Keep command buttons limited to existing selected-area views.
- `web/src/styles.css`
  - Reuse the existing management-system visual language and add scoped styles
    for intake status, quick filters, section cards, risk labels, and routing
    packet controls.
- Source-of-truth updates:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/core/project-memory-index.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/ux/v1-department-management-systems-view-map.md`

## Implementation Plan

1. Add a typed global intake loader using the existing owner session token.
2. Detect `00-ogolny` in the selected-area route and load intake data only for
   that system.
3. Add the `00 Main Management System` panel with:
   - read-only/MCP readiness status,
   - intake metrics,
   - quick API filter links,
   - owner decision, Paperclip/agent, unassigned resource, and risk queues,
   - routing packet that forwards to existing selected-area views only.
4. Preserve the generic selected-area capability rail, evidence grid, and
   decision rail around the new management-system panel.
5. Validate build and real rendered behavior on desktop and mobile.
6. Update planning, confidence, delivery, and system-health source-of-truth
   files.

## Acceptance Criteria

- `/areas?area=00-ogolny&view=overview` renders a dedicated `00 Main
  Management System` panel before generic selected-area content.
- The panel reads from `/v1/intake` and displays summary counts plus separate
  queues for owner decisions, Paperclip/agents, unassigned resources, and
  risks/blockers.
- The panel remains read-only. No acknowledge, approve, invoice, discount,
  delete, or provider-write action is introduced.
- The MCP intake capability state is visible from the current connection
  manifest.
- Desktop and mobile render without horizontal overflow, framework overlay, or
  relevant console errors.
- The `Tasks` routing packet control changes the selected-area view to
  `view=tasks`.

## Definition Of Done

- `npm run build:web` passes.
- `npm run build:server` passes after TypeScript changes are present in the
  workspace.
- Real backend Playwright proof passes against a seeded owner session.
- Source-of-truth files list DMS-00-004 as verified and identify the next safe
  slice.
- No validation processes started by this task are left running.

## Result Report

- Implemented a read-only `00 Main` intake panel in `web/src/main.tsx` and
  scoped styling in `web/src/styles.css`.
- Validation passed:
  - `npm run build:web`
  - `npm run build:server`
  - Playwright real-backend proof on `http://127.0.0.1:3192`
- Render proof:
  - desktop `1440x1100` route
    `/areas?area=00-ogolny&view=overview`, then `Tasks` click to
    `/areas?area=00-ogolny&view=tasks`
  - mobile `390x900` route `/areas?area=00-ogolny&view=overview`
  - no console errors, no framework overlay, no horizontal overflow
- Evidence screenshots were saved outside the repository:
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-dms-00-main-intake-desktop.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-dms-00-main-intake-mobile.png`
- Browser plugin path was attempted first, but no active Codex browser pane
  was available, so Playwright fallback was used.
- The local backend server and PostgreSQL validation process were stopped after
  verification.
