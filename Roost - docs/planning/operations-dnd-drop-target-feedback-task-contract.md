# OPS-DND-001 Operations Drag-And-Drop Drop Target Feedback Task Contract

Task Type: frontend UX interaction  
Current Stage: verification  
Deliverable For This Stage: visible drop-target feedback for Operations task
status drag-and-drop.

## Goal

Make the Operations task board clearly show where a dragged task will land
before the owner drops it into a status column.

## Scope

- `web/src/features/departments/operations-route.tsx`
- `web/src/i18n/messages.ts`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/system-health.md`

Out of scope:

- New task statuses.
- Backend status command changes.
- Provider-specific drag-and-drop behavior beyond the existing
  `/v1/operations/work-items/:id` status update command.

## Implementation Plan

1. Inspect the existing Operations board drag-and-drop implementation.
2. Track the dragged task and current hovered status column.
3. Render a visible drop placeholder and target-column highlight only when the
   hovered column would change the task status.
4. Keep drag end/drop cleanup deterministic.
5. Add localized drop placeholder copy.
6. Validate with build, diff hygiene, and a rendered drag/drop proof.

## Acceptance Criteria

- Dragging a task over another status column shows a visible placeholder.
- The target column highlights while it is the active drop target.
- The dragged card has a clear in-drag visual state.
- Dropping still calls the existing domain status update command.
- The task appears in the target status after refresh.
- No horizontal overflow or console/page errors appear in the checked view.

## Definition of Done

- `npm run validate` passes.
- `git diff --check` passes.
- Playwright proof verifies hover feedback and drop behavior.
- Validation browser/server processes are cleaned up.

## Result Report

Completed on 2026-05-17.

Validation:

- `npm run validate` passed.
- `git diff --check` passed with line-ending warnings only.
- Playwright fallback on a Vite route mock verified `Drop here` placeholder,
  target column highlight, dragged card dimming, `PATCH` payload
  `{ "status": "done" }`, task movement into the target column, no horizontal
  overflow, and no console/page errors.
