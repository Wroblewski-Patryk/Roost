# Task

## Header
- ID: LUC-1392
- Title: Prove unclassified user workflow missing-test-link for `USE /operating-model`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Operating Model proof linkage`
- Requirement Rows: `REQ-OM-001`, `REQ-OM-002`
- Quality Scenario Rows: not applicable
- Risk Rows: `RISK-OM-001`
- Iteration: 2026-07-17-LUC-1392
- Operation Mode: TESTER
- Mission ID: LUC-1392-USE-OPERATING-MODEL-PROOF-LINK
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
- Mission objective: close the routed Project Truth `missing_test_link` gap for `src/app.ts#/operating-model` by linking the existing `/v1/operating-model` protected API proof to the exact route mount and refreshing generated truth artifacts.
- Release objective advanced: remove one routed unclassified missing-test-link row without broadening runtime scope.
- Included slices: one route-mount proof-link override, focused API proof verification, generated truth refresh, and source-of-truth state updates.
- Explicit exclusions: no route logic change, no auth model change, no deploy, no production mutation, no new browser work, and no broader operating-model feature redesign.
- Checkpoint cadence: confirm the routed symbol and existing `/v1/operating-model` proof, attach the exact override, run the verification/refresh chain, then update state and issue disposition if the gap clears.
- Stop conditions: focused proof fails, generated refresh keeps the exact symbol as `missing_test_link`, or refreshed truth contradicts current route ownership.

## Context
Project Truth currently routes `src/app.ts#/operating-model` (`USE /operating-model`) as the first unclassified `missing_test_link` item. The behavior is already exercised in `src/tests/api.test.ts` through direct `/v1/operating-model` assertions covering workspace-scoped aggregate reads, system-area restoration, protected system-area deletion, custom area lifecycle, folder lifecycle, knowledge-root lifecycle, storage-location lifecycle, automation-definition lifecycle, cross-workspace denial, and manifest capability exposure. The open gap is evidence-link drift between the route mount and existing automated proof.

## Goal
Attach existing test evidence to `src/app.ts#/operating-model` in scanner metadata so the generated app-completion and Project Truth outputs no longer classify it as `missing_test_link`.

## Scope
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1392-prove-unclassified-user-workflow-missing-test-link-for-use-operating-model.md`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-awareness.json`
- `docs/status/app-completion-index.json`
- `docs/status/app-completion-index.md`
- `docs/status/project-truth-index.json`
- `docs/status/project-truth-index.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/active-mission.md`
- `.agents/state/next-steps.md`
- `.agents/state/module-confidence-ledger.md`

## Implementation Plan
1. Verify the dispatched route symbol and existing `/v1/operating-model` proof in code and generated status artifacts.
2. Link `src/app.ts#/operating-model` to the existing API proof through a minimal scanner override.
3. Run focused API verification, then refresh architecture-awareness, app-completion, and Project Truth indexes.
4. Update source-of-truth and module-confidence state files with the exact gap movement and next owner.

## Acceptance Criteria
- `docs/architecture/scanner-overrides.json` contains a `verified` entry for `src/app.ts#/operating-model` with existing API proof evidence.
- Focused local proof confirms the current `/v1/operating-model` assertions still pass without runtime modification.
- Generated app-completion no longer reports `api_endpoint:use-operating-model:dcc5e71b5f` as `missing_test_link`.
- Project Truth first routed QA gap moves away from `USE /operating-model`.
- Evidence and state updates record the exact refreshed gap movement and next routed target.

## Definition of Done
- Exact endpoint proof-link closure is recorded in scanner metadata and this task packet.
- Generated truth artifacts are refreshed and inspected.
- Source-of-truth state files are updated to reflect the next routed gap.
- Paperclip issue disposition includes completion evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Project Truth first routed QA gap: Unclassified user workflow `USE /operating-model`.
- Evidence status: `src/tests/api.test.ts` already proves `/v1/operating-model` through aggregate hierarchy readback, canonical area restoration, protected delete denial, scoped resource lifecycle, workspace isolation, and route capability exposure.
- Closure risk: route-mount evidence drift, not missing runtime behavior.

### 2. Select Priority Mission Objective
- Selected mission: `USE /operating-model` missing-test-link closure for the exact `src/app.ts#/operating-model` mount.
- Deferred scope: no behavioral additions and no broader operating-model feature work.

### 3. Execute Implementation
- Scanner override links `src/app.ts#/operating-model` to existing proof in `src/tests/api.test.ts`, `src/modules/operating-model/operating-model.routes.ts`, `docs/planning/luc-5226-operating-model-api-journey-proof.md`, and this task packet.

### 4. Verify and Test
- Validation planned:
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
- Update after refresh in:
  - `.codex/tasks`
  - `.codex/context`
  - `.agents/state`
  - `.agents/state/module-confidence-ledger.md`

## Result Report
- Completed: 2026-07-17
- Scope: completed the exact `missing_test_link` proof-link closure for `src/app.ts#/operating-model` only.
- Evidence:
  - `docs/architecture/scanner-overrides.json` marks `src/app.ts#/operating-model` `verified` through the existing protected API suite in `src/tests/api.test.ts`, `src/modules/operating-model/operating-model.routes.ts`, and `docs/planning/luc-5226-operating-model-api-journey-proof.md`.
  - Focused protected API proof PASS via `npm run test:api:local`, which built server/web, applied all `31` migrations to disposable PostgreSQL on `127.0.0.1:55432`, seeded data, and passed all `8/8` subtests including `CompanyCore v1 protected API flow`.
  - `npm run architecture:refresh` PASS.
  - External architecture-awareness refresh generated `2026-07-17T19:40:37.350Z` with `3102` entities / `8252` relations / `16524` files and materialized the exact proof relation for `src/app.ts#/operating-model`.
  - Sequential app-completion refresh PASS with `46` items / `4` flows / `16` missing test links / `1` missing doc link / `0` implemented-needs-proof / `0` blocked / `17` risk items; it no longer routes `api_endpoint:use-operating-model:dcc5e71b5f` as `missing_test_link`.
  - Sequential Project Truth apply generated `2026-07-17T19:41:39.861Z` with public probes `pass`, runtime findings `0`, incomplete event chains `0`, and operational gate gaps `0`; the first routed QA gap advanced to `src/app.ts#/operations` `missing_test_link`, while the only docs-owned route gap remains `src/app.ts#/connection`.
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`, evidence queue `0`, chain worklist `0`).
- Source-of-truth updates:
  - `.codex/tasks/luc-1392-prove-unclassified-user-workflow-missing-test-link-for-use-operating-model.md`
  - `docs/architecture/scanner-overrides.json`
  - generated architecture/app-completion/Project Truth artifacts under `docs/`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
- Cleanup:
  - `npm run test:api:local` removed its disposable local PostgreSQL container after the proof run.
  - No `chrome-headless-shell` validation process remained after verification.
- Source-control closure:
  - Not completed by this QA lane. Open sidecar [LUC-1399](/LUC/issues/LUC-1399) owns dirty-state classification and any scoped local commit decision for this packet.
- Residual risk: the route-level QA proof gap for `src/app.ts#/operating-model` is closed, but the next routed QA proof gap is unclassified `src/app.ts#/operations`.
