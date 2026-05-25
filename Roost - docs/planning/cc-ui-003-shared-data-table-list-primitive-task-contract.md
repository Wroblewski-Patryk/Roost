# Task

## Header
- ID: CC-UI-003
- Title: Shared Data Table/List Primitive
- Task Type: refactor
- Current Stage: implementation
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: `CC-UI-001`, `CC-UI-002`
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `CC-UI-003`
- Requirement Rows: `REQ-CC-UI-001`
- Quality Scenario Rows: `QA-CC-UI-001`
- Risk Rows: `RISK-CC-UI-001`
- Iteration: 1
- Operation Mode: BUILDER
- Mission ID: CC-LOOP-001
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

## Mission Block
- Mission objective: introduce the shared CompanyCore table/list primitive.
- Release objective advanced: make future pagination, loading, empty/error, row-action, density, and mobile table behavior central.
- Included slices: add `CcDataTable`, keep the existing `DataTable` export compatible, build and smoke.
- Explicit exclusions: broad route migration, live pagination wiring, data API changes.
- Checkpoint cadence: one implementation checkpoint.
- Stop conditions: web build failure, route smoke failure, or incompatible table call sites.
- Handoff expectation: next tasks can use `CcDataTable`/`DataTable` without adding page-local table shells.

## Context

`CC-UI-001` found repeated table shells across management views. The existing
`DataTable` in `react-route-kit` was a useful start but did not expose loading,
error, pagination, row actions, density, or mobile list behavior.

## Goal

Create one shared table/list primitive while preserving existing route calls.

## Scope

- `web/src/components/cc-data-table.tsx`
- `web/src/react-route-kit.tsx`
- planning/state files

## Implementation Plan

1. Add `CcDataTable` with compatible columns/rows plus loading, error, density,
   mobile mode, pagination, row actions, and row labels.
2. Keep `react-route-kit` `DataTable` export as a compatibility wrapper.
3. Validate with web build, static render check, local route smoke, and diff hygiene.
4. Update task board and state ledgers.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: route-level tables would need local changes for pagination and state handling.
- Gaps: loading, error, pagination-ready API, row actions, and mobile cards were missing from the shared table contract.
- Inconsistencies: several route-specific table wrappers exist in `web/src/main.tsx`.
- Architecture constraints: preserve current behavior and DaisyUI/Tailwind theme.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: `web/src/react-route-kit.tsx`, `web/src/main.tsx`, `web/src/components/cc-button.tsx`.
- Rows created or corrected: module confidence and queue rows.
- Assumptions recorded: existing `DataTable` calls should continue to compile without migration.
- Blocking unknowns: none.
- Why it was safe to continue: compatibility wrapper preserves current props.

### 2. Select One Priority Mission Objective
- Selected task: `CC-UI-003`.
- Priority rationale: tables are the main reusable structure for `00`, `04`, and `08` management views.
- Why other candidates were deferred: read-only APIs can now consume shared UI primitives without increasing clutter.

### 3. Plan Implementation
- Files or surfaces to modify: shared component and route-kit wrapper.
- Logic: add new component and delegate existing export to it.
- Edge cases: empty/error/loading states, disabled pagination controls, mobile card mode.

### 4. Execute Implementation
- Implementation notes: added `CcDataTable`; updated `DataTable` wrapper and `TableColumn` alias.

### 5. Verify and Test
- Validation performed:
  - `npm run build:web`
  - `npx tsx -e` static render of `CcDataTable` with mobile cards and pagination
  - Playwright local `/auth/login` route smoke
  - `git diff --check`
- Result: passed. Browser route smoke found no console/page errors and no horizontal overflow.

### 6. Self-Review
- Simpler option considered: expanding the old `DataTable` inline.
- Technical debt introduced: no.
- Scalability assessment: central primitive can carry pagination and mobile behavior for all future management tables.
- Refinements made: default `mobileMode="scroll"` preserves existing dense table behavior while enabling cards where needed.

### 7. Update Documentation and Knowledge
- Docs updated: task contract, task board, state files.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] A shared `CcDataTable` component exists.
- [x] Existing `DataTable` export remains compatible.
- [x] Loading, empty, error, density, pagination, row action, and mobile behavior APIs exist.
- [x] Web build, static render, browser smoke, and diff hygiene pass.

## Success Signal
- User or operator problem: future department tables can improve from one component.
- Expected product or reliability outcome: no page-local table feature drift.
- How success will be observed: `00`, `04`, and `08` views can use the shared primitive for read packets.
- Post-launch learning needed: yes.

## Deliverable For This Stage

Runtime shared table/list primitive plus compatibility wrapper.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through a render proof and local route smoke for changed web bundle.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `npm run build:web`; `npx tsx -e "..."` render check.
- Manual checks: Playwright route smoke for local `/auth/login`.
- Screenshots/logs: browser smoke output reported no console/page errors and no horizontal overflow.
- High-risk checks: no provider/API/schema behavior changed.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: `CC-UI-003`.
- Requirements matrix updated: yes.
- Requirement rows closed or changed: `REQ-CC-UI-001`.
- Quality scenarios updated: yes.
- Quality scenario rows closed or changed: `QA-CC-UI-001`.
- Risk register updated: yes.
- Risk rows closed or changed: `RISK-CC-UI-001`.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: not applicable.
- Endpoint and client contract match: not applicable.
- DB schema and migrations verified: not applicable.
- Loading state verified: static render/component API.
- Error state verified: static render/component API.
- Refresh/restart behavior verified: local Express dev server served the built React app route.
- Regression check performed: web build and route smoke.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable.
