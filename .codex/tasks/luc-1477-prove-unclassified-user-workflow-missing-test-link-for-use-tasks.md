# Task

## Header
- ID: LUC-1477
- Title: Prove unclassified user workflow missing-test-link for `USE /tasks`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Tasks proof linkage`
- Requirement Rows: `REQ-APP-AUDIT-005`
- Quality Scenario Rows: not applicable
- Risk Rows: `RISK-APP-AUDIT-006`
- Iteration: 2026-07-18-LUC-1477
- Operation Mode: TESTER
- Mission ID: LUC-1477-USE-TASKS-PROOF-LINK
- Mission Status: DONE

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
- Mission objective: close the routed Project Truth `missing_test_link` gap for `src/app.ts#/tasks` by linking the existing protected Tasks API proof to the exact route mount and refreshing generated truth artifacts.
- Release objective advanced: remove one routed unclassified missing-test-link row without broadening runtime scope.
- Responsibility lanes: single-lane QA/Test execution; subagent delegation not used because the work is a tightly coupled proof-link and verification packet.
- Included slices: one route-mount proof-link override, focused API proof verification, generated truth refresh, and source-of-truth state updates.
- Explicit exclusions: no route logic change, no schema change, no deploy, no production mutation, no new browser work, and no broader tasks workflow redesign.
- Checkpoint cadence: confirm the routed symbol and existing `/v1/tasks` proof, attach the exact override, run the verification/refresh chain, then update state and issue disposition if the gap clears.
- Stop conditions: focused proof fails, generated refresh keeps the exact symbol as `missing_test_link`, or refreshed truth contradicts current route ownership.

## Context
Project Truth currently routes `src/app.ts#/tasks` (`USE /tasks`) as the first unclassified `missing_test_link` item. The behavior is already exercised in `src/tests/api.test.ts` through direct `/tasks` and `/v1/tasks` protected API assertions covering workspace-scoped create, read, update, cross-workspace list isolation, ClickUp-backed write-back and archive flows, custom-field write-through, and native sync ingestion. The open gap is evidence-link drift between the route mount and existing automated proof.

## Goal
Attach existing test evidence to `src/app.ts#/tasks` in scanner metadata so the generated app-completion and Project Truth outputs no longer classify it as `missing_test_link`.

## Scope
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1477-prove-unclassified-user-workflow-missing-test-link-for-use-tasks.md`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-awareness.json`
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/status/project-truth-index.json`
- `docs/status/project-truth-index.md`
- `docs/planning/mvp-next-commits.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/current-focus.md`
- `.agents/state/active-mission.md`
- `.agents/state/next-steps.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`

## Implementation Plan
1. Verify the dispatched route symbol and existing `/v1/tasks` proof in code and generated status artifacts.
2. Link `src/app.ts#/tasks` to the existing API proof through a minimal scanner override.
3. Run focused API verification, then refresh architecture-awareness, app-completion, and Project Truth indexes.
4. Update source-of-truth and module-confidence state files with the exact gap movement and next owner.

## Acceptance Criteria
- `docs/architecture/scanner-overrides.json` contains a `verified` entry for `src/app.ts#/tasks` with existing API proof evidence.
- Focused local proof confirms the current `/v1/tasks` assertions still pass without runtime modification.
- Generated app-completion no longer reports `api_endpoint:use-tasks:de5ac00ee8` as `missing_test_link`.
- Project Truth first routed QA gap moves away from `USE /tasks`.
- Evidence and state updates record the exact refreshed gap movement and next routed target.

## Definition of Done
- Exact endpoint proof-link closure is recorded in scanner metadata and this task packet.
- Generated truth artifacts are refreshed and inspected.
- Source-of-truth state files are updated to reflect the next routed gap.
- Paperclip issue disposition includes completion evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Project Truth first routed QA gap: Unclassified user workflow `USE /tasks`.
- Evidence status: `src/tests/api.test.ts` already proves `/v1/tasks` and `/tasks` through workspace-scoped POST, GET by id, PATCH, list isolation, native sync, ClickUp write-back, custom-field update, and archive flows.
- Closure risk: route-mount evidence drift, not missing runtime behavior.

### 2. Select Priority Mission Objective
- Selected mission: `USE /tasks` missing-test-link closure for the exact `src/app.ts#/tasks` mount.
- Deferred scope: no behavioral additions and no broader Tasks UI or provider-data work.

### 3. Execute Implementation
- Scanner override links `src/app.ts#/tasks` to existing proof in `src/tests/api.test.ts`, `src/modules/tasks/tasks.routes.ts`, `docs/API.md`, and this task packet.

### 4. Verify and Test
- Validation planned:
  - `npm run test:api:local`
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `$env:ROOST_PUBLIC_URL='https://roost.luckysparrow.ch'; $env:ROOST_API_PUBLIC_URL='https://api.roost.luckysparrow.ch'; node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`

### 5. Self-Review
- Minimal linkage preserves scope and avoids duplicating existing runtime coverage.
- No new automated runtime tests are planned unless verification proves the current suite is insufficient for the exact route mount.

### 6. Documentation and State Updates
- Update after refresh in:
  - `.codex/tasks`
  - `.codex/context`
  - `.agents/state`
  - `.agents/state/module-confidence-ledger.md`

## Result Report
- Completed: 2026-07-18
- Scope: completed the exact `missing_test_link` proof-link closure for `src/app.ts#/tasks` only.
- Evidence:
  - `docs/architecture/scanner-overrides.json` marks `src/app.ts#/tasks` `verified` through the existing protected API suite in `src/tests/api.test.ts`, `src/modules/tasks/tasks.routes.ts`, and `docs/API.md`, plus explicit route-to-test and route-to-document relation overrides.
  - Focused protected API proof PASS via `npm run test:api:local`, which built server/web, applied all `31` migrations to disposable PostgreSQL on `127.0.0.1:55432`, seeded data, and passed all `8/8` subtests including `CompanyCore v1 protected API flow`.
  - `npm run architecture:refresh` PASS.
  - External architecture-awareness refresh generated `2026-07-18T20:36:14.217Z` with `3119` entities / `8472` relations / `16524` files and materialized the exact route-to-test plus route-to-document proof relations for `src/app.ts#/tasks`.
  - Sequential app-completion refresh PASS with `46` items / `4` flows / `7` missing test links / `0` missing doc links / `0` implemented-needs-proof / `0` blocked / `7` risk items; it no longer routes `api_endpoint:use-tasks:de5ac00ee8` as `missing_test_link`.
  - Sequential Project Truth apply generated `2026-07-18T20:36:27.751Z` with public probes `pass`, runtime findings `0`, incomplete event chains `0`, and operational gate gaps `0`; the first routed QA gap advanced to `src/app.ts#/v1` `missing_test_link`.
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`, evidence queue `0`, chain worklist `0`).
- Source-of-truth updates:
  - `.codex/tasks/luc-1477-prove-unclassified-user-workflow-missing-test-link-for-use-tasks.md`
  - `docs/architecture/scanner-overrides.json`
  - generated architecture/app-completion/Project Truth artifacts under `docs/`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
- Cleanup:
  - `docker ps -a --format "{{.Names}} {{.Ports}}"` after the proof run showed no lingering `companycore-test-postgres` container on port `55432`; the listed `roost-backend-1` and `roost-postgres-1` services were pre-existing project runtime containers, not test-run leftovers.
  - No browser-validation process was started for this route-level QA closure.
- Residual risk: the route-level QA proof gap for `src/app.ts#/tasks` is closed, but the next routed QA proof gap is unclassified `src/app.ts#/v1`. Source-control closure for the generated local dirty packet remains a separate follow-up lane.
