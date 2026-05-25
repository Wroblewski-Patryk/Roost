# Operations Shared Selector And Form Refactor Task Contract

## Task Type

UX/UI implementation and verification.

## Current Stage

verification.

## Deliverable For This Stage

Reusable Operations filtering and form patterns verified across Tasks and
Calendar with rendered browser evidence.

## Goal

Make `04 Operations` consistent and easier to extend by using one list and
department selector pattern across task-based views, and by sharing task/list
form fields between create and edit flows.

## Scope

- `web/src/features/departments/operations-route.tsx`
- `web/src/components/cc-field.tsx`
- `web/src/components/cc-text-input.tsx`
- `web/src/i18n/messages.ts`
- `docs/ux/design-memory.md`

## Implementation Plan

1. Extract the Operations list selector so Tasks and Calendar consume the same
   filter, list grouping, all/clear/empty controls, and new-list action.
2. Extract shared task fields for create and edit modals.
3. Extract shared task-list fields for create and edit modals.
4. Improve shared form primitives so labels stack cleanly and inputs fill their
   available width.
5. Verify desktop and mobile Operations flows with mocked real API packets.

## Acceptance Criteria

- Tasks and Calendar use the same selector component and control layout.
- New list is visible in the selector and opens the list create modal.
- List create and edit use the same field component.
- Task create and edit use the same field component.
- Task edit exposes task-list reassignment.
- Calendar no longer has a separate chip-style list filter.
- Desktop and mobile rendered checks have no app console errors or horizontal
  page overflow.

## Definition Of Done

- `npm run build:web` passes.
- Browser proof covers Tasks, Calendar, create list, create task, edit task,
  and mobile Calendar.
- Reusable UX rule is recorded in design memory.

## Result Report

- Implemented `OperationsListSelector`, `TaskFields`, and `TaskListFields`.
- Reused `OperationsListSelector` for both Tasks and Calendar.
- Added create-list support through the existing native task-list route plus
  Operations department assignment route.
- Improved `CcField` and `CcTextInput` so form controls stack and size
  consistently across active web forms.
- Verification passed:
  - `npm run build:web`
  - Playwright rendered proof on `http://127.0.0.1:3297` with mocked
    Operations API:
    - Tasks selector and board rendered.
    - New list modal opened, submitted, and read back.
    - New task modal opened, submitted, and read back.
    - Task edit modal opened with task-list field visible.
    - Calendar rendered with the same selector.
    - Mobile Calendar rendered with no horizontal page overflow.
    - Console messages: none.
