# Task

## Header
- ID: LUC-1430
- Title: Prove unclassified user workflow missing-test-link for `USE /projects`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Projects proof linkage`
- Requirement Rows: `REQ-APP-AUDIT-005`
- Quality Scenario Rows: not applicable
- Risk Rows: `RISK-APP-AUDIT-006`
- Iteration: 2026-07-17-LUC-1430
- Operation Mode: TESTER
- Mission ID: LUC-1430-USE-PROJECTS-PROOF-LINK
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
- Mission objective: close the routed Project Truth `missing_test_link` gap for `src/app.ts#/projects` by linking the existing protected CRUD/API proof to the exact route mount and refreshing generated truth artifacts.
- Release objective advanced: remove one routed unclassified missing-test-link row without broadening runtime scope.
- Included slices: one route-mount proof-link override, focused API proof verification, generated truth refresh, and source-of-truth state updates.
- Explicit exclusions: no route logic change, no schema change, no deploy, no production mutation, no new browser work, and no broader projects workflow redesign.
- Checkpoint cadence: confirm the routed symbol and existing `/v1/projects` proof, attach the exact override, run the verification/refresh chain, then update state and issue disposition if the gap clears.
- Stop conditions: focused proof fails, generated refresh keeps the exact symbol as `missing_test_link`, or refreshed truth contradicts current route ownership.

## Context
Project Truth currently routes `src/app.ts#/projects` (`USE /projects`) as the first unclassified `missing_test_link` item. The behavior is already exercised in `src/tests/api.test.ts` through direct `/projects` and `/v1/projects` assertions covering unauthenticated denial, invalid API-key denial, scoped API-key project creation, owner-workspace list/read/update/archive behavior, and cross-workspace isolation. The open gap is evidence-link drift between the route mount and existing automated proof.

## Goal
Attach existing test evidence to `src/app.ts#/projects` in scanner metadata so the generated app-completion and Project Truth outputs no longer classify it as `missing_test_link`.

## Scope
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1430-prove-unclassified-user-workflow-missing-test-link-for-use-projects.md`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-awareness.json`
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/status/project-truth-index.json`
- `docs/status/project-truth-index.md`
- `docs/planning/mvp-next-commits.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/LEARNING_JOURNAL.md`
- `.agents/state/active-mission.md`
- `.agents/state/next-steps.md`
- `.agents/state/module-confidence-ledger.md`

## Implementation Plan
1. Verify the dispatched route symbol and existing `/projects` plus `/v1/projects` proof in code and generated status artifacts.
2. Link `src/app.ts#/projects` to the existing API proof through a minimal scanner override.
3. Run focused API verification, then refresh architecture-awareness, app-completion, and Project Truth indexes.
4. Update source-of-truth and module-confidence state files with the exact gap movement and next owner.

## Acceptance Criteria
- `docs/architecture/scanner-overrides.json` contains a `verified` entry for `src/app.ts#/projects` with existing API proof evidence.
- Focused local proof confirms the current `/projects` and `/v1/projects` assertions still pass without runtime modification.
- Generated app-completion no longer reports `api_endpoint:use-projects:2ab7f26357` as `missing_test_link`.
- Project Truth first routed QA gap moves away from `USE /projects`.
- Evidence and state updates record the exact refreshed gap movement and next routed target.

## Definition of Done
- Exact endpoint proof-link closure is recorded in scanner metadata and this task packet.
- Generated truth artifacts are refreshed and inspected.
- Source-of-truth state files are updated to reflect the next routed gap.
- Paperclip issue disposition includes completion evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Project Truth first routed QA gap: Unclassified user workflow `USE /projects`.
- Evidence status: `src/tests/api.test.ts` already proves `/projects` missing-auth denial, `/projects` invalid API-key denial, service-key project creation, owner `/v1/projects` list visibility, cross-workspace empty-list isolation, owner `/v1/projects/:id` read/update success, and owner-vs-foreign archive behavior.
- Closure risk: route-mount evidence drift, not missing runtime behavior.

### 2. Select Priority Mission Objective
- Selected mission: `USE /projects` missing-test-link closure for the exact `src/app.ts#/projects` mount.
- Deferred scope: no behavioral additions and no broader CRUD or UI work.

### 3. Execute Implementation
- Scanner override links `src/app.ts#/projects` to existing proof in `src/tests/api.test.ts`, `src/modules/projects/projects.routes.ts`, `docs/API.md`, and this task packet.

### 4. Verify and Test
- Validation planned:
  - `npm run test:api:local`
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
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
- Completed: 2026-07-17
- Scope: completed the exact `missing_test_link` proof-link closure for `src/app.ts#/projects` only.
- Evidence:
  - `docs/architecture/scanner-overrides.json` marks `src/app.ts#/projects` `verified` through the existing protected API suite in `src/tests/api.test.ts`, `src/modules/projects/projects.routes.ts`, and `docs/API.md`, plus explicit route-to-test and route-to-document relation overrides.
  - Focused protected API proof PASS via `npm run test:api:local`, which built server/web, applied all `31` migrations to disposable PostgreSQL on `127.0.0.1:55432`, seeded data, and passed all `8/8` subtests including `CompanyCore v1 protected API flow`.
  - `npm run architecture:refresh` PASS.
  - External architecture-awareness refresh generated `2026-07-17T23:05:46.914Z` with `3108` entities / `8332` relations / `16524` files and materialized the exact route-to-test plus route-to-document proof relations for `src/app.ts#/projects`.
  - Sequential app-completion refresh generated `2026-07-17T23:07:02.854Z` with `46` items / `4` flows / `12` missing test links / `1` missing doc link / `0` implemented-needs-proof / `0` blocked / `13` risk items; it no longer routes `api_endpoint:use-projects:2ab7f26357` as `missing_test_link`.
  - Sequential Project Truth apply generated `2026-07-17T23:07:02.875Z` with public probes `pass`, runtime findings `0`, incomplete event chains `0`, and operational gate gaps `0`; the first routed QA gap advanced to `src/app.ts#/ready` `missing_test_link`, while the only docs-owned route gap remains `src/app.ts#/connection`.
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`, evidence queue `0`, chain worklist `0`).
  - Source-control closure completed in [LUC-1439](/LUC/issues/LUC-1439), which classified and committed the coherent local dirty packet created by this proof lane.
- Source-of-truth updates:
  - `.codex/tasks/luc-1430-prove-unclassified-user-workflow-missing-test-link-for-use-projects.md`
  - `docs/architecture/scanner-overrides.json`
  - generated architecture/app-completion/Project Truth artifacts under `docs/`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/LEARNING_JOURNAL.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
- Cleanup:
  - `npm run test:api:local` removed its disposable local PostgreSQL container after the proof run.
  - No `chrome-headless-shell` validation process remained after verification.
- Residual risk: the route-level QA proof gap for `src/app.ts#/projects` is closed, but the next routed QA proof gap is unclassified `src/app.ts#/ready`.
