# Task

## Header
- ID: LUC-1169
- Title: Unclassified user workflow `USE /clients` proof-link closure
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Unclassified user workflow clients route proof linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: not applicable
- Iteration: 2026-07-15-LUC-1169
- Operation Mode: TESTER
- Mission ID: LUC-1169-USE-CLIENTS-PROOF-LINK
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
- Mission objective: close the routed Project Truth `missing_test_link` gap for
  `src/app.ts#/clients` by linking existing API proof to the exact route mount
  and refreshing generated truth artifacts.
- Release objective advanced: remove one routed unclassified missing-test-link
  row without broadening runtime scope.
- Included slices: one route-mount proof-link override, generated truth
  refresh, and source-of-truth state updates.
- Explicit exclusions: no route or middleware logic changes, no deploy, no
  production mutation, no new browser or runtime feature work.
- Checkpoint cadence: confirm existing proof, attach exact override, run refresh
  chain, then update state and issue disposition if the gap clears.
- Stop conditions: generated refresh fails, the exact symbol persists as
  `missing_test_link`, or refreshed truth contradicts current routing.

## Context
Project Truth currently routes `src/app.ts#/clients` (`USE /clients`) as an
unclassified `missing_test_link` item. The behavior is already exercised in
`src/tests/api.test.ts` through workspace-scoped `/v1/clients` CRUD flows; the
open gap is proof-link drift between the route mount and existing evidence.

## Goal
Attach existing test evidence to `src/app.ts#/clients` in scanner metadata so
the generated app-completion and Project Truth outputs no longer classify it as
`missing_test_link`.

## Scope
- `docs/architecture/scanner-overrides.json`
- `.codex/tasks/luc-1169-prove-unclassified-user-workflow-missing-test-link-for-use-clients.md`
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
1. Verify the dispatched route symbol and existing `/v1/clients` proof in code
   and generated status artifacts.
2. Link `src/app.ts#/clients` to the existing API proof through a minimal
   scanner override.
3. Refresh architecture-awareness, app-completion, and Project Truth indexes.
4. Update source-of-truth and module-confidence state files with the exact gap
   movement and next owner.

## Acceptance Criteria
- `docs/architecture/scanner-overrides.json` contains a `verified` entry for
  `src/app.ts#/clients` with existing API proof evidence.
- Generated app-completion no longer reports
  `api_endpoint:use-clients:da4494ab5d` as `missing_test_link`.
- Project Truth first gap moves away from `USE /clients`.
- Evidence and state updates record the exact refreshed gap movement and next
  routed target.

## Definition of Done
- Exact endpoint proof-link closure is recorded in scanner metadata and this
  task packet.
- Generated truth artifacts are refreshed and inspected.
- Source-of-truth state files are updated to reflect the next routed gap.
- Paperclip issue disposition includes completion evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Project Truth first gap: Unclassified user workflow `USE /clients`.
- Evidence status: `src/tests/api.test.ts` already proves workspace-scoped
  `/v1/clients` create, read, update, list isolation, and archive behavior.
- Closure risk: route-mount evidence drift, not missing runtime behavior.

### 2. Select Priority Mission Objective
- Selected mission: `USE /clients` missing-test-link closure for the exact
  `src/app.ts#/clients` mount.
- Deferred scope: no behavioral additions; no broader CRUD-family refactor.

### 3. Execute Implementation
- Scanner override entry added for `src/app.ts#/clients` and linked to
  existing API proof in `src/tests/api.test.ts`.

### 4. Verify and Test
- Planned verification:
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`

### 5. Self-Review
- Minimal linkage preserves scope and avoids duplicating existing runtime
  coverage.
- No new automated runtime tests are planned unless refresh proves the current
  suite does not satisfy the exact route mount.

### 6. Documentation and State Updates
- Planned after refresh in:
  - `.codex/tasks`
  - `.codex/context`
  - `.agents/state`
  - `.agents/state/module-confidence-ledger.md`

## Result Report
- Completed: 2026-07-15
- Scope: completed the exact `missing_test_link` proof-link closure for
  `src/app.ts#/clients` only.
- Evidence:
  - `docs/architecture/scanner-overrides.json` marks `src/app.ts#/clients`
    `verified` through `src/tests/api.test.ts` and
    `src/modules/clients/clients.routes.ts`.
  - `npm run architecture:refresh` PASS.
  - external architecture-awareness refresh PASS at
    `2026-07-14T22:36:49.446Z` with `3034` entities / `7667` relations /
    `16523` files.
  - app-completion refresh PASS with `46` items / `4` flows /
    `31` missing test links / `1` missing doc link / `0`
    implemented-needs-proof; `USE /clients` no longer appears as
    `missing_test_link`.
  - Project Truth apply PASS at `2026-07-14T22:36:58.833Z` with public probes
    `pass`; the first routed gap now remains `src/app.ts#/clients` as
    docs-owned `missing_doc_link`.
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`, evidence queue
    `0`, chain worklist `0`).
- Source-of-truth updates:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
- Residual risk: the `/clients` route family still needs a documentation-link
  closure before Project Truth removes it completely; no runtime product logic
  remains unproved in this QA lane.
