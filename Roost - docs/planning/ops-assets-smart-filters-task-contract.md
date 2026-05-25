# Task

## Header
- ID: OPS-ASSETS-SMART-005
- Title: Operations and Assets smart filters
- Task Type: design | refactor | feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: OPS-ASSETS-FILTER-004
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: OPS-ASSETS-FILTER-004
- Requirement Rows: REQ-OPS-ASSETS-SMART-005
- Quality Scenario Rows: QA-WEB-UX-OPS-ASSETS-001
- Risk Rows: RISK-WEB-DENSE-WORKBENCH-001
- Iteration: 2026-05-17-BUILDER
- Operation Mode: BUILDER
- Mission ID: OPS-ASSETS-SMART-005
- Mission Status: VERIFIED

## Process Self-Audit
- [x] One bounded mission objective is selected.
- [x] Existing workbench filters and packets are reused.
- [x] No backend schema, provider behavior, or raw table editing is changed.
- [x] The task improves the active `04` and `08` workbench foundation.
- [x] Verification and source-of-truth updates are planned.

## Mission Block
- Mission objective: Make common Operations and Assets filtering questions one-click instead of requiring manual text search.
- Release objective advanced: improve real daily use of the `00 -> 04 -> 08` loop before adding more departments.
- Included slices: Operations due-date scope filter shared by Tasks/Calendar and Assets file type filter for previewable content.
- Explicit exclusions: saved views, backend search endpoints, pagination, provider sync, and new write commands.
- Checkpoint cadence: implement controls, run build/validation/browser proof, then update state files.
- Stop conditions: compile failure, route crash, duplicated filter logic, or API contract mismatch.
- Handoff expectation: record validation evidence and production-smoke risk.

## Context
The previous slices added selector search, task search, priority filtering, sorting, and recoverable empty states. The next daily-use gap is quick narrowing by operational time and asset type.

## Goal
Add useful smart filters over existing packets: task due-date scope and Assets preview type.

## Scope
- `web/src/features/departments/operations-route.tsx`
- `web/src/features/departments/assets-route.tsx`
- `web/src/i18n/messages.ts`
- source-of-truth docs/state files touched by this task

## Implementation Plan
1. Add an Operations due-date filter shared by Tasks and Calendar.
2. Extend task filtering to support overdue, today, this week, and unscheduled.
3. Add an Assets file type filter using existing preview-kind taxonomy.
4. Run build, validation, diff hygiene, and mocked route proof.
5. Update task contract and project state ledgers.

## Acceptance Criteria
- [x] Tasks and Calendar share the same due-date scope filter.
- [x] Due-date filtering supports all, overdue, today, this week, and unscheduled.
- [x] Assets Files/Folders can filter by all types, folders, markdown, CSV, JSON, image, PDF, text, and unsupported.
- [x] Affected routes build and render without console/page errors or horizontal overflow in proof.

## Deliverable For This Stage
Smart filtering controls plus validation evidence.

## Constraints
- Keep behavior client-side over existing packets.
- Keep copy in i18n.
- Do not add unsupported write behavior.

## Validation Evidence
- Tests: `npm run build:web`; `npm run validate`; `git diff --check`.
- Manual checks: Browser plugin path was attempted first, but the mocked browser proof timed out. Playwright fallback on temporary static React port `3394` verified Operations Tasks due-date filtering, Operations Calendar due-date filtering, Assets file-type filtering, desktop/mobile no horizontal overflow, and no console/page errors.
- Screenshots/logs: `.codex/tmp/ops-tasks-smart-filter.png`, `.codex/tmp/ops-calendar-smart-filter.png`, `.codex/tmp/assets-type-filter.png`.
- Reality status: verified

## Result Report
- Task summary: Added a shared Operations due-date filter for Tasks and Calendar, and an Assets preview-type filter for Files/Folders.
- Files changed: `web/src/features/departments/operations-route.tsx`, `web/src/features/departments/assets-route.tsx`, `web/src/i18n/messages.ts`, and source-of-truth state files.
- How tested: Build, full validation, diff hygiene, and mocked rendered browser proof.
- What is incomplete: Production smoke with the real large task/file dataset remains pending after deploy.
- Next steps: Smoke `04 Operations -> Tasks/Calendar` and `08 Assets -> Files/Folders` after deployment; only add saved views if real owner usage shows a need.
