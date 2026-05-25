# Operations Management Board UX Polish Task Contract

## Task Type

Frontend UX implementation with source-of-truth update.

## Current Stage

verification

## Deliverable For This Stage

Verified `04 Operations` board polish that improves the current task-management
surface without adding unsupported backend schema or exposing raw technical
agent/MCP warnings in the owner UI.

## Goal

Make the Operations management center more usable as the daily task board:
full-width workspace, stable status columns, an `All` list, richer priority and
readiness presentation, and a first calendar view over due work.

## Scope

- `web/src/layout/shell.tsx`
- `web/src/features/departments/operations-route.tsx`
- `web/src/features/departments/core-area-data.ts`
- `web/src/i18n/messages.ts`
- `web/src/types.ts`
- Source-of-truth documentation and state files for the completed web slice.

Out of scope:

- New task assignment, time tracking, checklist, subtask, comment, or tag schema.
- Raw table editing or direct MCP database-table tooling.
- Provider status preservation migrations.
- Production deployment execution.

## Implementation Plan

1. Remove the authenticated content `max-w-7xl` cap so management views can use
   the available workspace width.
2. Make the sidebar independently scrollable and fix active subview highlighting.
3. Add the `Calendar` Operations subview to the department metadata and i18n.
4. Replace the cramped five-column board grid with horizontally scrollable,
   stable-width status lanes.
5. Add a virtual `All` list before provider/native task lists.
6. Replace plain priority text with priority badges and due-date/readiness chips.
7. Keep editable fields limited to the currently supported domain write
   contract: title, description, status, priority, and due date.
8. Move technical blocked-action information out of the primary owner UI while
   keeping backend/MCP safety contracts unchanged.
9. Add a simple calendar view over due, overdue, upcoming, monthly, and
   unscheduled tasks.
10. Validate with build and rendered desktop/mobile interaction proof.

## Acceptance Criteria

- `04 Operations -> Tasks` uses the full authenticated content width.
- The sidebar is not visually cut off in the authenticated shell.
- The list rail starts with `All`.
- The board includes all backend-provided status columns, including `Review`
  when present.
- Technical `Blocked write actions` cards are not rendered on the task board.
- Task cards show priority as visual badges and due/readiness signals.
- Opening a task shows a modal form with supported editable fields and
  read-only operational detail/readiness/resource context.
- `04 Operations -> Calendar` is reachable from tabs and sidebar metadata.
- Desktop and mobile render without console/page errors in proof.

## Definition Of Done

- `npm run build:web` passes.
- Rendered proof covers desktop board, task modal, desktop calendar, and mobile
  board.
- Temporary validation processes are stopped.
- Source-of-truth project state, task board, system health, module confidence,
  requirements matrix, and UX memory are updated.

## Result Report

Implemented and verified on 2026-05-16.

Changed the authenticated layout to full-width content and sticky full-height
sidebar scrolling. The Operations task board now has a virtual `All` list,
stable horizontal status lanes, priority badges, due-date chips, readiness
signals, richer task modal context, and no visible technical blocked-action
warning section. Added the `Calendar` subview with today/week/month controls
and due-date grouping.

Validation:

- `npm run build:web` passed.
- Browser plugin was available but had no active Codex browser pane, so
  Playwright fallback was used.
- Playwright fallback on temporary mocked API port `3248` verified:
  - desktop board renders `All` and `Review`;
  - technical `Blocked write actions` panel is absent;
  - task modal opens;
  - calendar view renders `Operations calendar`, `Today`, and `Unscheduled`;
  - mobile board renders `CompanyCore` and `All`;
  - console/page errors were empty.
- Screenshots were captured under the local temp directory:
  `companycore-operations-board-desktop.png`,
  `companycore-operations-task-modal.png`,
  `companycore-operations-calendar-desktop.png`, and
  `companycore-operations-board-mobile.png`.
- Temporary mock server processes were stopped.

Residual risk:

- Assignment, reviewer, time estimate, tags, subtasks, checklists, comments, and
  provider-custom status preservation remain future backend schema/command work.
  The UI intentionally does not fake those fields as persisted features.
