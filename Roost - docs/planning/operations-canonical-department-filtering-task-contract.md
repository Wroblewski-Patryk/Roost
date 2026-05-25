# Operations Canonical Department Filtering Task Contract

Task Type: backend/frontend/UX

Current Stage: verification

Deliverable For This Stage: Operations task-list assignment and filtering must
use the canonical CompanyCore department model (`00` through `12`) instead of
legacy backend operating-area labels.

## Goal

Make `04 Operations` use the same department language as the sidebar and owner
mental model when assigning task lists, grouping task lists, and filtering task
visibility in the board and calendar.

## Scope

- `src/modules/operations/operations.routes.ts`
- `src/tests/api.test.ts`
- `web/src/features/departments/operations-route.tsx`
- `web/src/types.ts`
- `web/src/i18n/messages.ts`
- Source-of-truth state and UX evidence docs.

## Implementation Plan

1. Keep existing `OperatingArea` rows as backend compatibility buckets.
2. Add canonical `departments` to the Operations work-item packet from the
   shared department registry.
3. Store task-list assignments by canonical `departmentKey` while still mapping
   to the compatible backend operating area.
4. Render list grouping and list-edit assignment from canonical departments,
   not raw `OperatingArea.name`.
5. Change task-list selection into multi-select checkboxes and reuse that
   filter for Calendar.

## Acceptance Criteria

- Legacy labels such as `Strategy and governance` are not shown in the
  Operations owner UI.
- The list-edit select shows `00 General` through `12 Management`.
- Task lists can be assigned by canonical department key.
- The task board can show several selected lists at once.
- Calendar has the same list-filter capability before day/week/month views.

## Definition of Done

- `npm run validate` passes.
- `npx prisma validate` passes.
- `git diff --check` passes.
- Rendered proof verifies canonical labels and calendar filters.

## Result Report

- `GET /v1/operations/work-items` now includes canonical `departments` while
  preserving `operatingAreas` for compatibility.
- `PATCH /v1/operations/task-lists/:id` accepts `departmentKey`, resolves it to
  the compatible backend area, and stores `manualDepartmentKey` in the mapping
  payload so shared backend buckets can still represent distinct canonical
  departments.
- The Operations board groups by canonical departments and supports selecting
  multiple lists through checkboxes.
- Calendar now shows list filter checkboxes above day/week/month modes.
- Verification passed: `npm run validate`, `npx prisma validate`, `git diff
  --check`, and Playwright fallback proof on temporary mocked API port `3267`.
  Proof confirmed no visible `Strategy and governance`, canonical `00`-`12`
  select options, and calendar list checkboxes.
- Full department administration remains a separate future slice: backend
  `OperatingArea` management exists, but the active web settings module does
  not yet expose an owner-facing canonical department editor for name,
  hierarchy number, icon, and description.
