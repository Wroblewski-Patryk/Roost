# Task

## Header
- ID: OPS-ASSETS-POLISH-001
- Title: Operations and Assets workbench polish
- Task Type: design | refactor | feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: OPS-BOARD-001, OPS-MGMT-002, ASSETS-FOLDERS-002, ASSETS-FILES-003
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: OPS-BOARD-001, OPS-BOARD-UX-001, ASSETS-FOLDERS-002, ASSETS-FILES-003
- Requirement Rows: REQ-OPS-ASSETS-POLISH-001
- Quality Scenario Rows: QA-WEB-UX-OPS-ASSETS-001
- Risk Rows: RISK-WEB-DENSE-WORKBENCH-001
- Iteration: 2026-05-17-BUILDER
- Operation Mode: BUILDER
- Mission ID: OPS-ASSETS-POLISH-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed through the operating-system startup contract.
- [x] Missing or template-like state tables were confirmed not blocking for this scoped UI polish.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by making two core owner workbenches more usable.

## Mission Block
- Mission objective: Improve the daily-use quality of `04 Operations -> Tasks/Calendar` and `08 Assets -> Files and folders` without changing architecture or exposing raw table editing.
- Release objective advanced: strengthen the `00 -> 04 -> 08` operating loop as the current product foundation.
- Included slices: Operations calendar visibility for undated work, tighter board/calendar states, improved Assets cards, improved content-first file preview panel, shared Roost workbench styling.
- Explicit exclusions: new backend schema, new provider sync behavior, raw database editors, multimedia editors beyond current text-command scope, canonical department settings.
- Checkpoint cadence: implement one vertical UI polish slice, then build and browser-proof the affected routes.
- Stop conditions: compile failure, route crash, API contract mismatch, or evidence that a backend change is required.
- Handoff expectation: leave docs, confidence ledger, task board, and next steps synchronized with validation evidence.

## Context
Operations and Assets are the owner-approved core workbenches. They already use backend packets and governed commands, but owner feedback asks for a more polished, useful daily workflow.

## Goal
Make the existing workbenches more useful and premium without expanding product scope: Operations should not hide tasks without dates, and Assets should prioritize file content and scanability over low-value metadata.

## Scope
- `web/src/features/departments/operations-route.tsx`
- `web/src/features/departments/assets-route.tsx`
- `web/src/components/cc-resource-selector.tsx`
- `web/src/i18n/messages.ts`
- `web/src/styles.css`
- source-of-truth docs/state files touched by this task

## Implementation Plan
1. Inspect the existing Operations/Assets components and shared selector.
2. Polish Operations calendar/board states using existing `TaskCard`, `CcButton`, `CcNotice`, and Roost utilities.
3. Polish Assets cards and preview panel around file content, thumbnails, and primary actions.
4. Run build/validate and a Playwright route proof with mocked API packets.
5. Update source-of-truth documentation and confidence evidence.

## Acceptance Criteria
- [x] Operations Calendar shows undated tasks in a clear unscheduled lane instead of silently excluding them.
- [x] Operations empty selection and calendar controls stay understandable and action-oriented.
- [x] Assets file cards and detail panel foreground file content/preview and reduce metadata noise.
- [x] The affected routes build and render without console/page errors or horizontal overflow on desktop and mobile proof.

## Deliverable For This Stage
Runtime UI polish plus validation evidence for the two active workbenches.

## Constraints
- use existing systems and approved mechanisms
- do not introduce new architecture or raw table editing
- do not duplicate component logic where the shared selector/card patterns already exist
- keep provider writes behind existing command routes only

## Validation Evidence
- Tests: `npm run build:web`, `npm run validate`, and `git diff --check` passed. `git diff --check` reported line-ending warnings only.
- Manual checks: Playwright static React route proof passed on temporary port `3364` for Operations Tasks, Operations Calendar, and Assets Files.
- Screenshots/logs: browser proof verified scheduled tasks, unscheduled tasks, no-list-selection empty state, markdown preview, CSV preview, JSON preview, SVG image preview, and PDF preview action. Console/page errors were empty.
- Responsive proof: desktop and mobile overflow checks passed for the exercised Operations and Assets routes.
- Cleanup proof: no `chrome-headless-shell` processes remained after browser validation.
- Reality status: verified

## Result Report
- Task summary: Operations now keeps undated work visible, has clearer calendar range controls, and shows an explicit empty state when all lists are cleared. Assets now uses cleaner resource cards and a content-first file preview panel for markdown, CSV, JSON, image, PDF, and text-style resources.
- Files changed: `web/src/features/departments/operations-route.tsx`, `web/src/features/departments/assets-route.tsx`, `web/src/i18n/messages.ts`, `web/src/styles.css`, generated web bundle files, and source-of-truth docs/state files.
- How tested: build, repository validation, diff whitespace check, and a Playwright proof with mocked API packets for the affected routes.
- What is incomplete: API/backend tests were not rerun because this slice did not change backend contracts; the known local API database gate remains outside this frontend polish slice.
- Next steps: run a production smoke after deploy and use real owner data to tune dense card metadata and folder/file preview priorities.
