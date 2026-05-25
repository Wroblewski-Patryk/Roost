# Task

## Header
- ID: WEB-SHELL-OPS-001
- Title: Shell User Menu, Settings Routes, And Operations Tasks
- Task Type: implementation
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: WEB-SIDEBAR-001, WEB-QA-001, CC-04-002
- Priority: P1
- Iteration: 2026-05-16-WEB-SHELL-OPS-001
- Operation Mode: BUILDER
- Mission ID: WEB-FOUNDATION-CONTINUATION
- Mission Status: VERIFIED

## Goal
Make the active React web shell less cluttered and make `04 Operations`
surface real ClickUp-backed task records from the existing Operations read
packet.

## Scope
- `web/src/layout/shell.tsx`
- `web/src/features/departments/operations-route.tsx`
- `web/src/features/departments/core-area-data.ts`
- `web/src/features/departments/shared.tsx`
- `web/src/features/settings/settings-routes.tsx`
- `web/src/hooks/use-owner-packet.ts`
- `web/src/i18n/messages.ts`
- `web/src/types.ts`
- `web/src/main.tsx`
- `web/src/app-route-registry.ts`
- `src/app.ts`

## Implementation Plan
1. Remove top-header department buttons and replace them with a user dropdown.
2. Move language selection into the authenticated footer with the required
   LuckySparrow attribution.
3. Keep sidebar department ordering from canonical numeric keys while hiding
   visible numeric prefixes in labels.
4. Add workspace settings access next to the workspace selector and add simple
   account/workspace settings routes.
5. Fix owner packet unwrapping so active department views consume standard
   `{ data: ... }` API responses.
6. Enable the Operations Tasks subview and render the nested work-item packet
   as a task table with source/list/due/readiness fields and ClickUp links.

## Acceptance Criteria
- [x] Authenticated header no longer shows department button links.
- [x] Header user icon opens a dropdown with welcome, account, settings, and
      sign-out actions.
- [x] Sidebar department labels do not visibly show `00`-`12`, while order is
      preserved by the existing `coreAreas` array.
- [x] Workspace selector has adjacent workspace settings navigation.
- [x] Language selector appears in the authenticated footer with
      `Made with <3 by LuckySparrow.ch`.
- [x] `/account/settings` and `/workspace/settings` render as private React
      routes.
- [x] `/areas?area=04-operacje&view=tasks` renders task records from
      `/v1/operations/work-items`.

## Definition of Done
- [x] Existing shared components are reused.
- [x] No v0 web routes are restored.
- [x] Validation passes.
- [x] Rendered smoke covers shell, settings, and Operations task table.
- [x] Source-of-truth files are updated.

## Result Report
- Task summary: Updated the authenticated shell and made Operations task data
  visible through the existing read-only Operations packet.
- Files changed: see Scope.
- How tested:
  - `npm run build:web`
  - `npm run build:server`
  - `npm run validate`
  - Playwright fallback smoke on temporary mocked API port `3139`
  - Manual VPS rollover and public production smoke for commit `02f86b6`
- What is incomplete: Workspace name editing, account profile editing, API key
  management, and integration settings remain future settings slices.
- Next steps: Add audited settings write contracts and continue expanding
  Operations task detail/workflow views without provider bypasses.
