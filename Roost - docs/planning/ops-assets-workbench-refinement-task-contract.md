# Task

## Header
- ID: OPS-ASSETS-REFINE-002
- Title: Operations and Assets workbench refinement
- Task Type: design | refactor | feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: OPS-ASSETS-POLISH-001, ASSETS-FILES-003, OPS-DEPT-FILTER-001
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: OPS-ASSETS-POLISH-001, ASSETS-FILES-003
- Requirement Rows: REQ-OPS-ASSETS-REFINE-002
- Quality Scenario Rows: QA-WEB-UX-OPS-ASSETS-001
- Risk Rows: RISK-WEB-DENSE-WORKBENCH-001
- Iteration: 2026-05-17-BUILDER
- Operation Mode: BUILDER
- Mission ID: OPS-ASSETS-REFINE-002
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] Exactly one priority task is selected.
- [x] The task is aligned with the `00 -> 04 -> 08` operating loop.
- [x] Existing shared selector, card, notice, and form primitives are reused first.
- [x] The task stays inside web workbench UX and does not introduce backend schema or raw table editing.

## Mission Block
- Mission objective: Refine the active Operations and Assets workbenches so dense real data is easier to scan, filter, and preview.
- Release objective advanced: strengthen the current owner-usable foundation before adding more departments.
- Included slices: shared resource-selector search/empty state, explicit Operations Calendar empty-selection state, Assets breadcrumb/path context, and tighter preview metadata.
- Explicit exclusions: new backend commands, new provider sync behavior, department settings, multimedia editors beyond existing text-file editor.
- Checkpoint cadence: implement one shared selector improvement plus one Operations and one Assets refinement, then build and browser-proof.
- Stop conditions: compile failure, route crash, duplicated selector logic, or API contract mismatch.
- Handoff expectation: leave docs/state synchronized with validation evidence.

## Context
Operations Tasks/Calendar and Assets Files/Folders are the approved daily-use management surfaces. The previous polish pass verified the routes, but long real lists still need better in-place filtering and preview context.

## Goal
Improve usability and scanability without changing the backend contract: selecting resources should scale to many lists/folders, Calendar should not become ambiguous when filters are cleared, and file previews should answer where a file lives.

## Scope
- `web/src/components/cc-resource-selector.tsx`
- `web/src/features/departments/operations-route.tsx`
- `web/src/features/departments/assets-route.tsx`
- `web/src/i18n/messages.ts`
- `web/src/styles.css`
- source-of-truth docs/state files touched by this task

## Implementation Plan
1. Add search and filtered empty state to the shared resource selector.
2. Make Operations Calendar show an explicit no-list-selection state and include workflow settings access.
3. Add Assets path/breadcrumb context and cleaner selected-resource metadata.
4. Run build/validate and a mocked route proof for Operations and Assets.
5. Update source-of-truth files with evidence.

## Acceptance Criteria
- [x] Operations and Assets resource filters can be searched without page-local duplicate selector logic.
- [x] Operations Calendar clearly explains when no task lists are selected.
- [x] Assets preview shows useful file/folder path context near the content.
- [x] Affected routes build and render without console/page errors or horizontal overflow in proof.

## Deliverable For This Stage
Runtime UI refinements plus validation evidence for the active workbenches.

## Constraints
- Use existing systems and approved mechanisms.
- Do not add raw database editors or provider write bypasses.
- Keep repository artifacts in English.
- Keep user-facing copy localized through i18n.

## Validation Evidence
- Tests: `npm run build:web`, `npm run validate`, and `git diff --check` passed. `git diff --check` reported line-ending warnings only.
- Manual checks: Playwright static React proofs passed on temporary ports `3384`, `3385`, and `3386`.
- Screenshots/logs: route proofs verified Operations selector search/no-match, Tasks empty list selection, Calendar empty list selection, Calendar workflow access, unscheduled task visibility, Assets root-folder search, Markdown preview, CSV preview, JSON preview, SVG image preview, and Assets resource path/depth context.
- Responsive proof: desktop and mobile overflow checks passed for the exercised routes.
- Cleanup proof: no `chrome-headless-shell` processes remained after browser validation.
- Reality status: verified

## Result Report
- Task summary: added shared resource-selector search/no-match states, improved Operations Calendar parity with Tasks, and added file/folder path context to Assets previews.
- Files changed: `web/src/components/cc-resource-selector.tsx`, `web/src/features/departments/operations-route.tsx`, `web/src/features/departments/assets-route.tsx`, `web/src/i18n/messages.ts`, and source-of-truth docs/state files.
- How tested: web build, full validation, diff hygiene, and mocked Playwright route proofs for Operations Tasks, Operations Calendar, and Assets Files/Folders.
- What is incomplete: backend/API tests were not rerun because this slice only changes frontend rendering and shared selector behavior; the known local database-test gap remains for full API suites when `DATABASE_URL` is configured.
- Next steps: production-smoke these views with the real task and Drive datasets after deploy, then tune only the usability issues that appear with live density.
