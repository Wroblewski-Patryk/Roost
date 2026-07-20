# Task

## Header
- ID: LUC-1527
- Title: Prove unclassified user workflow missing-test-link for `USE /v1/ready`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `v1 readiness mount proof linkage`
- Requirement Rows: `REQ-APP-AUDIT-005`
- Quality Scenario Rows: not applicable
- Risk Rows: unclassified route proof-link drift for public v1 readiness aliases
- Iteration: 2026-07-20-LUC-1527
- Operation Mode: TESTER
- Mission ID: LUC-1527-USE-V1-READY-PROOF-LINK
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
- Mission objective: close the routed Project Truth `missing_test_link` gap for `src/app.ts#/v1/ready` by linking the existing public runtime proof to the exact `/v1/ready` mount and refreshing generated truth artifacts.
- Release objective advanced: remove one routed unclassified missing-test-link row without broadening runtime scope.
- Responsibility lanes: single-lane QA/Test execution; subagent delegation not used because the work is a tightly coupled proof-link and verification packet.
- Included slices: one route-mount proof-link override, focused API proof verification, generated truth refresh, and source-of-truth state updates.
- Explicit exclusions: no route logic change, no schema change, no deploy, no production mutation, no new browser work, and no broader readiness or API redesign.
- Checkpoint cadence: confirm the routed symbol and existing `/v1/ready` proof, attach the exact override, run the verification/refresh chain, then update state and issue disposition if the gap clears.
- Stop conditions: focused proof fails, generated refresh keeps the exact symbol as `missing_test_link`, or refreshed truth contradicts current route ownership.

## Context
Project Truth currently routes `src/app.ts#/v1/ready` (`USE /v1/ready`) as the first unclassified `missing_test_link` item. The behavior is already exercised in `src/tests/api.test.ts` through the `CompanyCore v1 protected API flow`, which verifies public `GET /health`, `GET /v1/health`, `GET /ready`, `GET /v1/ready`, and `GET /api/build-info` parity before continuing into the protected v1 API surface. The open gap is evidence-link drift between the `/v1/ready` mount in `src/app.ts` and the existing automated proof plus accepted readiness-route documentation.

## Goal
Attach existing test evidence to `src/app.ts#/v1/ready` in scanner metadata so the generated app-completion and Project Truth outputs no longer classify it as `missing_test_link`.

## Scope
- `docs/architecture/scanner-overrides.json`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1527-prove-unclassified-user-workflow-missing-test-link-for-use-v1-ready.md`
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
1. Verify the dispatched route symbol and existing `/v1/ready` proof in code and generated status artifacts.
2. Link `src/app.ts#/v1/ready` to the existing public runtime proof through a minimal scanner override and supporting doc relation.
3. Run focused API verification, then refresh architecture-awareness, app-completion, and Project Truth indexes.
4. Update source-of-truth and module-confidence state files with the exact gap movement and next owner.

## Acceptance Criteria
- `docs/architecture/scanner-overrides.json` contains a `verified` entry for `src/app.ts#/v1/ready` with existing API proof evidence.
- Focused local proof confirms the current `/v1/ready` assertions still pass without runtime modification.
- Generated app-completion no longer reports `api_endpoint:use-v1-ready:035c4febde` as `missing_test_link`.
- Project Truth first routed QA gap moves away from `USE /v1/ready`.
- Evidence and state updates record the exact refreshed gap movement and next routed target.

## Definition of Done
- Exact endpoint proof-link closure is recorded in scanner metadata and this task packet.
- Generated truth artifacts are refreshed and inspected.
- Source-of-truth state files are updated to reflect the next routed gap.
- Paperclip issue disposition includes completion evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Project Truth first routed QA gap: Unclassified user workflow `USE /v1/ready`.
- Evidence status: `src/tests/api.test.ts` already proves `/v1/ready` through the `CompanyCore v1 protected API flow`, which asserts public `200` responses for `/health`, `/v1/health`, `/ready`, `/v1/ready`, and `/api/build-info` before protected v1 route coverage continues.
- Closure risk: route-mount evidence drift, not missing runtime behavior.

### 2. Select Priority Mission Objective
- Selected mission: `USE /v1/ready` missing-test-link closure for the exact `src/app.ts#/v1/ready` mount.
- Deferred scope: no behavioral additions and no broader readiness, webhook, or workspace route redesign.

### 3. Execute Implementation
- Scanner override links `src/app.ts#/v1/ready` to existing proof in `src/tests/api.test.ts`, `src/health/health.routes.ts`, `docs/API.md`, and this task packet.

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
- Completed: 2026-07-20
- Scope: completed the exact `missing_test_link` proof-link closure for `src/app.ts#/v1/ready` only.
- Evidence:
  - `docs/architecture/scanner-overrides.json` marks `src/app.ts#/v1/ready` `verified` through the existing CompanyCore protected API suite in `src/tests/api.test.ts`, `src/health/health.routes.ts`, `docs/API.md`, and this task packet, plus explicit route-to-test and route-to-document relation overrides for the exact alias mount.
  - Focused local API proof PASS via `npm run test:api:local`, which built server/web, applied all `31` migrations to disposable PostgreSQL on `127.0.0.1:55432`, seeded data, and passed all `8/8` subtests including `CompanyCore v1 protected API flow`.
  - `npm run architecture:refresh` PASS.
  - External architecture-awareness refresh generated `2026-07-20T21:39:16.682Z` with `3126` entities / `8565` relations / `16525` files and materialized the exact route-to-test proof relations for `src/app.ts#/v1/ready`.
  - Sequential app-completion refresh reduced `missingTestLink` from `5` to `4` and no longer routes `api_endpoint:use-v1-ready:035c4febde` as `missing_test_link`.
  - Sequential Project Truth apply completed with public probes `pass`, runtime findings `0`, incomplete event chains `0`, operational gate gaps `0`, and advanced the first routed QA gap to `src/app.ts#/v1/webhooks/clickup` `missing_test_link`.
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`, evidence queue `0`, chain worklist `0`).
  - Focused local API proof should pass via `npm run test:api:local`.
  - Generated truth should no longer report `api_endpoint:use-v1-ready:035c4febde` as `missing_test_link`.
