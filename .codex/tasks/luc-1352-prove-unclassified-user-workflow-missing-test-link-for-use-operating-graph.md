# Task

## Header
- ID: LUC-1352
- Title: Prove unclassified user workflow missing-test-link for `USE /operating-graph`
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Operating Graph proof linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: not applicable
- Iteration: 2026-07-16-LUC-1352
- Operation Mode: TESTER
- Mission ID: LUC-1352-USE-OPERATING-GRAPH-PROOF-LINK
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
- Mission objective: close the routed Project Truth `missing_test_link` gap for `src/app.ts#/operating-graph` by linking the existing `/v1/operating-graph/areas/:areaKey` protected API proof to the exact route mount and refreshing generated truth artifacts.
- Release objective advanced: remove one routed unclassified missing-test-link row without broadening runtime scope.
- Included slices: one route-mount proof-link override, focused API proof verification, generated truth refresh, and source-of-truth state updates.
- Explicit exclusions: no route logic change, no auth model change, no deploy, no production mutation, no new browser work, and no broader operating-graph feature redesign.
- Checkpoint cadence: confirm the routed symbol and existing `/v1/operating-graph` proof, attach the exact override, run the verification/refresh chain, then update state and issue disposition if the gap clears.
- Stop conditions: focused proof fails, generated refresh keeps the exact symbol as `missing_test_link`, or refreshed truth contradicts current route ownership.

## Context
Project Truth currently routes `src/app.ts#/operating-graph` (`USE /operating-graph`) as the first unclassified `missing_test_link` item. The behavior is already exercised in `src/tests/api.test.ts` through direct `/v1/operating-graph/areas/:areaKey` assertions covering same-workspace graph reads, canonical and resolved area-key handling, workspace isolation, `404` behavior, and MCP manifest exposure for the `operating-graph:read` capability. The open gap is evidence-link drift between the route mount and existing automated proof.

## Goal
Attach existing test evidence to `src/app.ts#/operating-graph` in scanner metadata so the generated app-completion and Project Truth outputs no longer classify it as `missing_test_link`.

## Scope
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1352-prove-unclassified-user-workflow-missing-test-link-for-use-operating-graph.md`
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
1. Verify the dispatched route symbol and existing `/v1/operating-graph` proof in code and generated status artifacts.
2. Link `src/app.ts#/operating-graph` to the existing API proof through a minimal scanner override.
3. Run focused API verification, then refresh architecture-awareness, app-completion, and Project Truth indexes.
4. Update source-of-truth and module-confidence state files with the exact gap movement and next owner.

## Acceptance Criteria
- `docs/architecture/scanner-overrides.json` contains a `verified` entry for `src/app.ts#/operating-graph` with existing API proof evidence.
- Focused local proof confirms the current `/v1/operating-graph/areas/:areaKey` assertions still pass without runtime modification.
- Generated app-completion no longer reports `api_endpoint:use-operating-graph:90c17b9387` as `missing_test_link`.
- Project Truth first routed QA gap moves away from `USE /operating-graph`.
- Evidence and state updates record the exact refreshed gap movement and next routed target.

## Definition of Done
- Exact endpoint proof-link closure is recorded in scanner metadata and this task packet.
- Generated truth artifacts are refreshed and inspected.
- Source-of-truth state files are updated to reflect the next routed gap.
- Paperclip issue disposition includes completion evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Project Truth first routed QA gap: Unclassified user workflow `USE /operating-graph`.
- Evidence status: `src/tests/api.test.ts` already proves `/v1/operating-graph/areas/:areaKey` through area graph content, workspace isolation, alias resolution, missing-area failure, and MCP manifest exposure.
- Closure risk: route-mount evidence drift, not missing runtime behavior.

### 2. Select Priority Mission Objective
- Selected mission: `USE /operating-graph` missing-test-link closure for the exact `src/app.ts#/operating-graph` mount.
- Deferred scope: no behavioral additions and no broader operating-graph feature work.

### 3. Execute Implementation
- Scanner override links `src/app.ts#/operating-graph` to existing proof in `src/tests/api.test.ts`, `src/modules/operating-graph/operating-graph.routes.ts`, and this task packet.

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
- Completed: 2026-07-16
- Scope: completed the exact `missing_test_link` proof-link closure for `src/app.ts#/operating-graph` only.
- Evidence:
  - `docs/architecture/scanner-overrides.json` marks `src/app.ts#/operating-graph` `verified` through `src/tests/api.test.ts`, `src/modules/operating-graph/operating-graph.routes.ts`, and this task packet.
  - Focused protected API proof PASS after local build, migrations, and seed on disposable PostgreSQL test container `companycore-test-postgres-luc1352` on port `58010`:
    `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js`.
  - `npm run architecture:refresh` PASS.
  - External architecture-awareness refresh generated `2026-07-16T18:08:03.651Z` with `3094` entities / `8195` relations / `16524` files and materialized the exact proof relation for `src/app.ts#/operating-graph`.
  - Sequential app-completion refresh PASS with `46` items / `4` flows / `17` missing test links / `2` missing doc links / `0` implemented-needs-proof / `0` blocked / `19` risk items; it no longer routes `api_endpoint:use-operating-graph:90c17b9387` as `missing_test_link` and now keeps the same symbol as docs-owned `missing_doc_link`.
  - Sequential Project Truth apply generated `2026-07-16T18:08:18.372Z` with public probes `pass`, runtime findings `0`, incomplete event chains `0`, and operational gate gaps `0`; the first overall routed gap now keeps `src/app.ts#/operating-graph` only as docs-owned `missing_doc_link`, and the next QA-owned routed proof queue begins at `src/app.ts#/operating-model`.
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`, evidence queue `0`, chain worklist `0`).
- Source-of-truth updates:
  - `.codex/tasks/luc-1352-prove-unclassified-user-workflow-missing-test-link-for-use-operating-graph.md`
  - `docs/architecture/scanner-overrides.json`
  - generated architecture/app-completion/Project Truth artifacts under `docs/`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
- Cleanup:
  - Validation-owned PostgreSQL container `companycore-test-postgres-luc1352` was removed after the proof run.
- Source-control closure:
  - Not completed by this QA lane. The repo remains intentionally dirty with generated/state artifacts from this proof packet and requires a separate source-control closure action before commit/push decisions.
- Residual risk: the route-level QA proof gap for `src/app.ts#/operating-graph` is closed, but the same symbol is now docs-owned `missing_doc_link`; the next QA proof queue begins at unclassified `src/app.ts#/operating-model`.
