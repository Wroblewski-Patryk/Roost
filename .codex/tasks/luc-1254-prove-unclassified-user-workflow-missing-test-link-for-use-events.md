# Task

## Header
- ID: LUC-1254
- Title: Prove unclassified user workflow missing-test-link for `USE /events`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Events proof linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: not applicable
- Iteration: 2026-07-15-LUC-1254
- Operation Mode: TESTER
- Mission ID: LUC-1254-USE-EVENTS-PROOF-LINK
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task increases release confidence without changing product runtime behavior.

## Mission Block
- Mission objective: close the routed Project Truth `missing_test_link` gap for `src/app.ts#/events` by linking the existing `/v1/events` API proof to the exact route mount and refreshing generated truth artifacts.
- Release objective advanced: remove one routed unclassified missing-test-link row without broadening runtime scope.
- Included slices: one route-mount proof-link override, focused API proof verification, generated truth refresh, and source-of-truth state updates.
- Explicit exclusions: no route logic change, no auth model change, no deploy, no production mutation, no new browser work, and no broader events or provider redesign.
- Checkpoint cadence: confirm the routed symbol and existing proof, attach the exact override, run the verification/refresh chain, then update state and issue disposition if the gap clears.
- Stop conditions: focused proof fails, generated refresh keeps the exact symbol as `missing_test_link`, or refreshed truth contradicts current route ownership.

## Context
Project Truth currently routes `src/app.ts#/events` (`USE /events`) as the first unclassified `missing_test_link` item. The behavior is already exercised in `src/tests/api.test.ts` through direct `GET /events` requests with assertions over successful response status, workspace isolation across two owners, and emitted lifecycle event visibility. The open gap is evidence-link drift between the route mount and existing automated proof.

## Goal
Attach existing test evidence to `src/app.ts#/events` in scanner metadata so the generated app-completion and Project Truth outputs no longer classify it as `missing_test_link`.

## Scope
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1254-prove-unclassified-user-workflow-missing-test-link-for-use-events.md`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-awareness.json`
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/status/project-truth-index.json`
- `docs/status/project-truth-index.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/active-mission.md`
- `.agents/state/current-focus.md`
- `.agents/state/next-steps.md`
- `.agents/state/module-confidence-ledger.md`

## Implementation Plan
1. Verify the dispatched route symbol and existing `/v1/events` proof in code and generated status artifacts.
2. Link `src/app.ts#/events` to the existing API proof through a minimal scanner override.
3. Run focused API verification, then refresh architecture-awareness, app-completion, and Project Truth indexes.
4. Update source-of-truth and module-confidence state files with the exact gap movement and next owner.

## Acceptance Criteria
- `docs/architecture/scanner-overrides.json` contains a `verified` entry for `src/app.ts#/events` with existing API proof evidence.
- Focused local proof confirms the current `/v1/events` assertions still pass without runtime modification.
- Generated app-completion no longer reports `api_endpoint:use-events:679c33c90e` as `missing_test_link`.
- Project Truth first gap moves away from `USE /events`.
- Evidence and state updates record the exact refreshed gap movement and next routed target.

## Definition of Done
- Exact endpoint proof-link closure is recorded in scanner metadata and this task packet.
- Generated truth artifacts are refreshed and inspected.
- Source-of-truth state files are updated to reflect the next routed gap.
- Paperclip issue disposition includes completion evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Project Truth first gap: Unclassified user workflow `USE /events`.
- Evidence status: `src/tests/api.test.ts` already proves the route responds successfully for two workspaces and returns only same-workspace events.
- Closure risk: route-mount evidence drift, not missing runtime behavior.

### 2. Select Priority Mission Objective
- Selected mission: `USE /events` missing-test-link closure for the exact `src/app.ts#/events` mount.
- Deferred scope: no behavioral additions and no broader events feature work.

### 3. Execute Implementation
- Scanner override links `src/app.ts#/events` to existing proof in `src/tests/api.test.ts`, `src/modules/events/events.routes.ts`, and this task packet.

### 4. Verify and Test
- Validation performed:
  - `npm run build`
  - `npm run prisma:migrate:deploy`
  - `npm run seed`
  - `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js`
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`

### 5. Self-Review
- Minimal linkage preserves scope and avoids duplicating existing runtime coverage.
- No new automated runtime tests are planned unless verification proves the current suite is insufficient for the exact route mount.

### 6. Documentation and State Updates
- Updated after refresh in:
  - `.codex/tasks`
  - `.codex/context`
  - `.agents/state`
  - `.agents/state/module-confidence-ledger.md`

## Result Report
- Completed: 2026-07-15
- Scope: completed the exact `missing_test_link` proof-link closure for
  `src/app.ts#/events` only.
- Evidence:
  - `docs/architecture/scanner-overrides.json` marks `src/app.ts#/events`
    `verified` through `src/tests/api.test.ts`,
    `src/modules/events/events.routes.ts`, and this task packet.
  - Focused protected API proof PASS after local build, migrations, and seed:
    `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js`
    against local PostgreSQL test container `companycore-test-postgres-luc1254`
    on port `52493`; container removed during cleanup.
  - `npm run architecture:refresh` PASS.
  - External architecture-awareness refresh generated
    `2026-07-15T17:10:17.439Z` with `3056` entities / `7879` relations /
    `16523` files and materialized the exact proof relations.
  - Sequential app-completion refresh PASS with `46` items / `4` flows /
    `24` missing test links / `2` missing doc links / `0`
    implemented-needs-proof / `0` blocked; `USE /events` no longer appears as
    `missing_test_link` and now resolves as the same-symbol docs-owned
    `missing_doc_link`.
  - Sequential Project Truth apply generated `2026-07-15T17:10:29.646Z` with
    public probes `pass`; the next QA-owned routed proof gap now advances to
    `src/app.ts#/goals` as `missing_test_link`.
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`, evidence queue
    `0`, chain worklist `0`).
- Source-of-truth updates:
  - `.codex/tasks/luc-1254-prove-unclassified-user-workflow-missing-test-link-for-use-events.md`
  - `docs/architecture/scanner-overrides.json`
  - generated architecture/app-completion/Project Truth artifacts under `docs/`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
- Cleanup:
  - Started Docker Desktop locally because the Docker Linux engine pipe was
    initially unavailable; stopped Docker Desktop after validation.
  - Validation-owned PostgreSQL container `companycore-test-postgres-luc1254`
    was removed after the proof run.
- Residual risk: the route-level QA proof gap for `src/app.ts#/events` is
  closed, but the same symbol is now docs-owned `missing_doc_link`; the next
  QA proof lane is unclassified `src/app.ts#/goals`.
