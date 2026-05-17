# OPS-LIST-FILTER-001 Operations List Select-All Sticky Task Contract

Task Type: frontend UX interaction  
Current Stage: verification  
Deliverable For This Stage: cleaner and reliable Operations list select-all
control.

## Goal

Keep the Operations list select-all control available at the top of the list
rail and make selecting or deselecting all lists behave predictably.

## Scope

- `web/src/features/departments/operations-route.tsx`
- `web/src/i18n/messages.ts`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/system-health.md`

Out of scope:

- New list grouping rules.
- Backend task-list assignment changes.
- Calendar layout redesign.

## Implementation Plan

1. Remove the explanatory helper text under the `All` list checkbox.
2. Make the select-all row sticky inside the Operations list rail.
3. Fix selection initialization so empty selection can mean intentionally no
   lists selected instead of falling back to all lists.
4. Verify build, diff hygiene, and rendered checkbox behavior.

## Acceptance Criteria

- The text `All visible work items from every Operations list...` is no longer
  rendered.
- The `All` checkbox row has sticky positioning at the top of the list rail.
- First load selects all available lists.
- Unchecking `All` hides all task cards and leaves the checkbox unchecked.
- Rechecking `All` restores the task cards.
- The checked behavior is consistent for board and calendar filtering.

## Definition of Done

- `npm run validate` passes.
- `git diff --check` passes.
- Playwright proof verifies the visible behavior.

## Result Report

Completed on 2026-05-17.

Validation:

- `npm run build:web` passed.
- `git diff --check` passed with line-ending warnings only.
- Playwright fallback with a mocked Operations packet verified the helper text
  is gone, the select-all control has `position: sticky`, initial state is
  checked, unchecking hides task cards and shows `0 selected lists`, rechecking
  restores task cards and the `All` heading, no horizontal overflow, and no
  console/page errors.
