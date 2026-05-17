# OPS-TASK-CREATE-001 Operations New Task Creation Task Contract

Task Type: frontend/backend vertical-slice UX  
Current Stage: verification  
Deliverable For This Stage: visible Operations task creation entrypoint using
the existing governed task API.

## Goal

Make it obvious how an owner creates a task from `04 Operations -> Tasks` and
`04 Operations -> Calendar`, without exposing raw database tables or creating a
fake button.

## Scope

- `web/src/features/departments/operations-route.tsx`
- `web/src/i18n/messages.ts`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/system-health.md`
- `.agents/state/module-confidence-ledger.md`

Out of scope:

- New backend task schema fields.
- New Operations-specific task creation endpoint.
- Calendar drag scheduling.
- Task creation production smoke before the deployed bundle updates.

## Implementation Plan

1. Audit production Operations Tasks and Calendar with an authenticated owner
   session.
2. Confirm whether a governed task creation command already exists.
3. Add a clear `New task` primary action to Tasks and Calendar.
4. Implement a task creation modal that posts to `POST /v1/tasks`, including
   title, description, task list, status, priority, and due date.
5. Refresh the Operations packet after creation.
6. Validate with build, diff hygiene, and rendered interaction proof.

## Acceptance Criteria

- `04 Operations -> Tasks` has a visible `New task` action near the board
  controls.
- `04 Operations -> Calendar` has a visible `New task` action near calendar
  mode controls.
- The create modal is keyboard-focusable and requires a task title.
- The modal lets the owner select the target task list, status, priority, and
  due date.
- Submit calls `POST /v1/tasks`, not raw database writes.
- After success, the modal closes and the Operations packet refreshes.

## Definition of Done

- `npm run validate` passes.
- `git diff --check` passes.
- Playwright proof verifies the create flow and Calendar action visibility.
- Production audit findings are recorded for follow-up.

## Result Report

Completed on 2026-05-17.

Validation:

- `npm run build:web` passed during implementation.
- Playwright fallback with a mocked Operations packet verified the Tasks
  `New task` button, create modal, `POST /v1/tasks` payload containing title,
  description, status, priority, and `taskListId`, modal close, refreshed board
  visibility, Calendar `New task` button, no horizontal overflow, and no
  console/page errors.

Production audit note:

- Production authenticated clickthrough showed no obvious task creation
  affordance in Tasks or Calendar. Production health still reports
  `commit=unknown`, and the page showed UI text removed by the latest local
  commits, so production was not proving the newest bundle at audit time.
