# Task

## Header
- ID: OPS-ASSETS-FILTER-004
- Title: Operations and Assets filter recovery states
- Task Type: design | refactor | feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: OPS-ASSETS-DENSE-003
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: OPS-ASSETS-DENSE-003
- Requirement Rows: REQ-OPS-ASSETS-FILTER-004
- Quality Scenario Rows: QA-WEB-UX-OPS-ASSETS-001
- Risk Rows: RISK-WEB-DENSE-WORKBENCH-001
- Iteration: 2026-05-17-BUILDER
- Operation Mode: BUILDER
- Mission ID: OPS-ASSETS-FILTER-004
- Mission Status: VERIFIED

## Process Self-Audit
- [x] One bounded mission objective is selected.
- [x] Existing filters and workbench primitives are reused.
- [x] No backend schema, provider behavior, or raw table editing is changed.
- [x] The task improves the active `04` and `08` workbench foundation.
- [x] Verification and source-of-truth updates are planned.

## Mission Block
- Mission objective: Make filtered-empty states recoverable and understandable in Operations and Assets.
- Release objective advanced: improve daily usability for dense datasets before adding more departments.
- Included slices: clear task filter action, filter-aware empty states for Tasks/Calendar, clear Assets filters action, and filter-aware Assets empty state.
- Explicit exclusions: saved views, backend search, pagination, provider sync, and new write commands.
- Checkpoint cadence: implement recovery controls, run build/validation/browser proof, then update state files.
- Stop conditions: compile failure, route crash, duplicated filter logic, or API contract mismatch.
- Handoff expectation: leave validation evidence and production-smoke risk recorded.

## Context
The previous slice added task filtering and Assets sorting. The remaining UX gap is recovery: when filters hide all results, the owner should immediately understand why and clear the filters without hunting through controls.

## Goal
Add clear, local recovery states so empty filtered views do not feel broken.

## Scope
- `web/src/features/departments/operations-route.tsx`
- `web/src/features/departments/assets-route.tsx`
- `web/src/i18n/messages.ts`
- source-of-truth docs/state files touched by this task

## Implementation Plan
1. Add clear action support to the shared Operations task filter bar.
2. Show filter-aware empty states in Operations board and calendar when selected lists exist but task filters return no rows.
3. Add clear-all filters action and copy to Assets filtered-empty state.
4. Run build, validation, diff hygiene, and mocked route proof.
5. Update task contract and project state ledgers.

## Acceptance Criteria
- [x] Operations task filters can be cleared from the filter bar.
- [x] Operations Tasks and Calendar show a filter-specific empty state when filters hide all selected work.
- [x] Assets Files/Folders shows a filter-specific empty state with a one-click reset.
- [x] Affected routes build and render without console/page errors or horizontal overflow in proof.

## Deliverable For This Stage
Recoverable filtered-empty states plus validation evidence.

## Constraints
- Keep all behavior client-side over existing packets.
- Keep copy in i18n.
- Do not add unsupported write behavior.

## Validation Evidence
- Tests: `npm run build:web`, `npm run validate`, and `git diff --check` passed. `git diff --check` reported line-ending warnings only.
- Manual checks: Playwright static React proof passed on temporary port `3388`.
- Screenshots/logs: route proof verified Operations Tasks filtered-empty state, Operations Tasks clear filters recovery, Operations Calendar filtered-empty state, Operations Calendar clear filters recovery, Assets filtered-empty state, Assets clear filters recovery, CSV preview, desktop/mobile no horizontal overflow, and no console/page errors.
- Cleanup proof: no `chrome-headless-shell` processes remained after browser validation.
- Reality status: verified

## Result Report
- Task summary: added recoverable filtered-empty states and clear-filter actions for Operations Tasks, Operations Calendar, and Assets Files/Folders.
- Files changed: `web/src/features/departments/operations-route.tsx`, `web/src/features/departments/assets-route.tsx`, `web/src/i18n/messages.ts`, and source-of-truth docs/state files.
- How tested: web build, full validation, diff hygiene, and mocked Playwright route proof.
- What is incomplete: backend/API tests were not rerun because this slice only changes frontend filtering recovery over existing packets.
- Next steps: production-smoke with real task and Drive datasets after deploy.
