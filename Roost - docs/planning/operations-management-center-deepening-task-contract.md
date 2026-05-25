# Operations Management Center Deepening Task Contract

Task Type: frontend/backend/API/UX

Current Stage: verification

Deliverable For This Stage: one non-duplicated `04 Operations` task board,
department-grouped task-list navigation, editable task-list metadata and
department assignment, drag-and-drop status movement, and calendar modes that
match day/week/month expectations.

## Goal

Deepen `04 Operations` into a simpler CompanyCore-native work management
center over the existing Operations domain packet, without reintroducing old v0
views or exposing raw database-table editing.

## Scope

- `web/src/app-route-registry.ts`
- `web/src/features/departments/core-area-data.ts`
- `web/src/features/departments/operations-route.tsx`
- `web/src/i18n/messages.ts`
- `web/src/types.ts`
- `src/auth/capabilities.ts`
- `src/modules/operations/operations.routes.ts`
- `src/tests/api.test.ts`
- Project state, confidence, requirements, and UX memory docs.

## Implementation Plan

1. Remove the duplicated Operations dashboard/overview route and make
   `Tasks` the canonical Operations work board.
2. Extend the Operations work-item packet with operating-area metadata and
   task-list area assignments derived from `ExternalContainerMapping`.
3. Add a domain-level `PATCH /v1/operations/task-lists/:id` action for editable
   list metadata and department assignment.
4. Rework the Operations board into two main containers: a grouped list rail
   and selected-list status lanes.
5. Add drag-and-drop status movement through the existing Operations work-item
   command route.
6. Replace the calendar placeholder with day, week, and month modes.
7. Verify build, rendered desktop/mobile UX, list editing, and route cleanup.

## Acceptance Criteria

- Operations has no active duplicate dashboard/overview view.
- The task board starts with one `All` item, then department-grouped task
  lists, then unassigned lists.
- Real task lists can be renamed, described, status-edited, and assigned or
  unassigned from a department through an Operations domain endpoint.
- Task cards can be moved across status columns through drag/drop without
  mutating raw database tables directly from the client.
- Calendar day mode shows a daily timeline with due-today work, week mode
  renders seven day columns, and month mode renders actual month day cells with
  compact badges instead of full lists.
- The board uses constrained heights and internal scrolling instead of stacking
  several tall sections.

## Definition of Done

- `npm run validate` passes.
- `npm run build:server`, `npm run build:web`, and `git diff --check` pass.
- Rendered proof covers desktop tasks, desktop calendar, and mobile tasks.
- Any blocked database/API validation is recorded honestly with cleanup
  evidence.
- Source-of-truth docs are updated in the same task.

## Result Report

- Implemented the canonical `04 Operations -> Tasks` work board and removed
  the active Operations overview duplication from the web route metadata.
- Added operating-area list assignment to the Operations packet and added
  `PATCH /v1/operations/task-lists/:id` under `operations:write` for task-list
  metadata and department assignment. Clearing a department assignment now
  clears the stored mapping.
- Rebuilt the board around a grouped list rail plus selected-list columns,
  with one `All` entry, collapsible department groups, collapsible unassigned
  lists, compact task cards, visual task signals, list editing, and drag/drop
  status changes.
- Rebuilt Calendar into day, week, and month modes. Week renders seven columns;
  month renders the actual number of days for the current month with compact
  badges.
- Verification: `npm run build:server`, `npm run build:web`, `npm run
  validate`, and `git diff --check` passed. Playwright fallback on a temporary
  mocked API at `http://127.0.0.1:3261` verified desktop tasks, list editing,
  desktop calendar, week column count `7`, month cell count `31`, mobile tasks,
  no duplicate Dashboard tab, one `All` entry, and no page/console errors.
- Blocked proof: `npm run test:api` could not complete because local Docker
  daemon commands timed out while starting or inspecting PostgreSQL. Validation
  docker CLI processes started by this task were force-stopped; API test code
  was still updated for the new endpoint and should run on the next healthy
  database validation environment.
