# Task

## Header
- ID: OPS-ASSETS-DENSE-003
- Title: Operations and Assets dense-data controls
- Task Type: design | refactor | feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: OPS-ASSETS-REFINE-002
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: OPS-ASSETS-REFINE-002
- Requirement Rows: REQ-OPS-ASSETS-DENSE-003
- Quality Scenario Rows: QA-WEB-UX-OPS-ASSETS-001
- Risk Rows: RISK-WEB-DENSE-WORKBENCH-001
- Iteration: 2026-05-17-BUILDER
- Operation Mode: BUILDER
- Mission ID: OPS-ASSETS-DENSE-003
- Mission Status: VERIFIED

## Process Self-Audit
- [x] The task serves one bounded mission objective.
- [x] Existing workbench primitives are reused first.
- [x] No backend schema or raw table editing is introduced.
- [x] The change improves the current `04` and `08` release foundation.
- [x] Validation and source-of-truth updates are planned.

## Mission Block
- Mission objective: Make dense task and file datasets easier to narrow and scan in the active Operations and Assets workbenches.
- Release objective advanced: strengthen the owner-usable `00 -> 04 -> 08` loop before adding new departments.
- Included slices: shared Operations task search/priority filter reused by Tasks and Calendar, plus Assets sort controls for file/folder cards.
- Explicit exclusions: backend search endpoints, saved views, provider sync changes, new write commands, and raw table editing.
- Checkpoint cadence: implement the controls, run build/validation, run mocked route proof, then update state files.
- Stop conditions: compile failure, route crash, duplicate filter logic per view, or API contract mismatch.
- Handoff expectation: record validation evidence and next production-smoke risk.

## Context
The active workbenches now have better selector search and preview context. The next daily-use gap is narrowing the actual task cards and sorting file cards when the datasets become large.

## Goal
Add lightweight client-side controls that reuse the same data packets and avoid new backend behavior: Tasks and Calendar should share one task filter model, and Assets should support explicit sort order.

## Scope
- `web/src/features/departments/operations-route.tsx`
- `web/src/features/departments/assets-route.tsx`
- `web/src/i18n/messages.ts`
- source-of-truth docs/state files touched by this task

## Implementation Plan
1. Add a reusable Operations task filter bar for search and priority.
2. Apply the same filtered task rows to the Operations board and calendar.
3. Add Assets card sort controls for name, modified date, type, and source.
4. Validate with web build, full validation, diff hygiene, and mocked route proof.
5. Update task contract, module confidence, requirements, risk, health, project state, and task board.

## Acceptance Criteria
- [x] Tasks and Calendar share one Operations task filter behavior.
- [x] Task search filters by task title, description, list, project, source, status, and priority.
- [x] Assets Files/Folders can sort visible cards by useful file attributes.
- [x] Affected routes build and render without console/page errors or horizontal overflow in proof.

## Deliverable For This Stage
Runtime dense-data controls plus validation evidence.

## Constraints
- Keep all controls local to the existing API packets.
- Keep user-facing copy in i18n.
- Do not add fake provider data or unsupported write behavior.

## Validation Evidence
- Tests: `npm run build:web`, `npm run validate`, and `git diff --check` passed. `git diff --check` reported line-ending warnings only.
- Manual checks: Playwright static React proof passed on temporary port `3387`.
- Screenshots/logs: route proof verified Operations task search in Tasks, priority filtering in Tasks, task search in Calendar, Assets modified/type sorting, CSV preview, JSON preview, desktop/mobile no horizontal overflow, and no console/page errors.
- Cleanup proof: no `chrome-headless-shell` processes remained after browser validation.
- Reality status: verified

## Result Report
- Task summary: added one shared Operations task filter bar reused by Tasks and Calendar, and added explicit Assets sort controls for visible file/folder cards.
- Files changed: `web/src/features/departments/operations-route.tsx`, `web/src/features/departments/assets-route.tsx`, `web/src/i18n/messages.ts`, and source-of-truth docs/state files.
- How tested: web build, full validation, diff hygiene, and mocked Playwright route proof.
- What is incomplete: backend/API tests were not rerun because this slice only changes frontend filtering/sorting over existing packets.
- Next steps: production-smoke with real task and Drive datasets after deploy; consider saved views only after the owner confirms the preferred filters.
