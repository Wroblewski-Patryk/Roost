# Task

## Header
- ID: DMS-FOUNDATION-001
- Title: Dashboard, Operations, and Workforce foundation improvements
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder / Frontend Builder / QA-Test
- Depends on: existing Department Management Systems architecture
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: General Dashboard, Operations Tasks/Calendar, People and Agents Directory
- Requirement Rows: not applicable
- Quality Scenario Rows: usability, maintainability, integration reliability
- Risk Rows: assignment-model-gap, calendar-schedule-model-gap
- Iteration: 1
- Operation Mode: BUILDER
- Mission ID: DMS-FOUNDATION-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Context
The audit found strong existing foundations for Department Management Systems, especially the People and Agents Directory and Operations work board. The main release-confidence gaps were that the logged-in dashboard was still mostly an intake proposal view, Operations task creation used the generic task endpoint, and larger responsibility/calendar semantics need explicit architecture decisions before schema work.

## Goal
Improve the three audited areas with a safe, testable foundation slice: a real dashboard command packet, a domain Operations work-item creation command, frontend integration, and documented follow-up boundaries for assignment and schedule semantics.

## Scope
- Backend: `src/modules/dashboard/dashboard.routes.ts`, `src/app.ts`, `src/auth/capabilities.ts`, `src/auth/agent-key-profiles.ts`, `src/mcp/manifest.ts`, `src/modules/operations/operations.routes.ts`
- Frontend: `web/src/types.ts`, `web/src/features/departments/general-dashboard.tsx`, `web/src/features/departments/operations-route.tsx`, `web/src/main.tsx`
- Tests: API validation covering dashboard command packet and Operations work-item creation
- Docs/state: this task contract and source-of-truth confidence notes

## Implementation Plan
1. Add a read-only dashboard command endpoint that aggregates existing intake, operations, workforce, assets, approvals, and risks data.
2. Add a governed Operations work-item create route using existing relation checks, events, and ClickUp create writeback.
3. Connect the General Dashboard to the command packet and route Operations task creation through the domain route.
4. Lazy-load larger route components to improve future module scalability.
5. Validate with build/typecheck/API tests and update project confidence evidence.

## Acceptance Criteria
- [ ] `GET /v1/dashboard/command` returns workspace-scoped command summary, department signals, priority items, next actions, and agent packet.
- [ ] `POST /v1/operations/work-items` creates a task through the Operations domain contract and records an event.
- [ ] Dashboard and Operations frontend use the new domain packets without losing loading/error/empty states.
- [ ] Existing validation and API tests pass.
- [ ] Assignment and richer calendar gaps are recorded as explicit follow-up decisions, not hidden implementation shortcuts.

## Definition of Done
- [ ] Code builds without errors.
- [ ] Feature works through real API/client paths.
- [ ] No mock, placeholder, fake, or temporary data/path remains.
- [ ] Full data flow works across all relevant layers.
- [ ] Backend and UI/client error handling exists where applicable.
- [ ] No existing functionality is broken.
- [ ] Changes are documented in the relevant source of truth.
- [ ] Behavior is reproducible from validation evidence.
- [ ] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests: `npm run prisma:generate` passed; `npm run validate` passed; `npm run test:api:local` passed with all 26 migrations and 6/6 API tests; `git diff --check` passed with only CRLF warnings.
- Manual checks: Browser plugin was attempted but had no active Codex browser pane; Playwright fallback rendered the dashboard and Operations routes against a validation-owned server, real owner token, and real API-created scheduled/assigned work item.
- High-risk checks: route/capability drift passed with 173 manifest routes and 33 protected route files; API tests proved dashboard command packet, MCP manifest exposure, Operations create command, event evidence, workspace isolation, assignment fields, schedule fields, and migration application.
- Module confidence ledger updated: yes.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: yes.
- Loading state verified: yes.
- Error state verified: API error paths and existing client error handling.
- Refresh/restart behavior verified: build and API test restart paths.
- Regression check performed: `npm run validate`; `npm run test:api:local`.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/department-management-systems-architecture.md`, `docs/architecture/department-management-systems-v1-blueprint.md`.
- Fits approved architecture: yes.
- Mismatch discovered: no.
- Decision required from user: no for this slice.
- Follow-up architecture doc updates: deeper recurrence execution or external calendar sync remains a future architecture task.

## Result Report
- Task summary: Added a real dashboard command packet, domain Operations work-item creation, task responsibility/schedule fields, frontend command dashboard integration, Operations create/update controls, calendar start-date fallback, and route-level lazy loading.
- Files changed: backend dashboard/operations/auth/MCP routes, frontend dashboard/operations/main/types, API tests, route capability checker, and project state docs.
- How tested: `npm run validate`; `npm run test:api:local`; Browser plugin cleanup after incomplete rendered proof.
- What is incomplete: recurrence execution and external calendar sync are not implemented; recurrence is stored as metadata for future scheduler/calendar work.
- Next steps: define recurrence execution semantics and external calendar integration only after owner approval.
- Decisions made: assignment/schedule belongs on the existing `Task` contract for this slice; no parallel task-management subsystem was introduced.
