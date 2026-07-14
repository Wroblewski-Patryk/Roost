# Task

## Header
- ID: LUC-1131
- Title: Unclassified user workflow `USE /api-keys` proof-link closure
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `Unclassified user workflow api-keys route proof linkage`
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: not applicable
- Iteration: 2026-07-14-LUC-1131
- Operation Mode: TESTER
- Mission ID: LUC-1131-USE-API-KEYS-PROOF-LINK
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected verification checkpoint.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: close the routed Project Truth `missing_test_link` gap for `src/app.ts#/api-keys` by linking current proof to the exact route mount.
- Release objective advanced: remove the first unclassified API-keys route proof gap from current app-completion and Project Truth routing without adding duplicate runtime behavior.
- Included slices: exact `src/app.ts#/api-keys` proof-link curation, generated truth refresh, and durable state updates.
- Explicit exclusions: no runtime route logic changes unless current evidence proves insufficient, no protected smoke, deploy, push, or production mutation.
- Checkpoint cadence: confirm current proof coverage, apply exact route linkage, refresh generated truth, then close if the routed gap disappears.
- Stop conditions: existing proof no longer covers the api-keys chain, generated refresh fails, or the same routed gap persists after exact linkage repair.
- Handoff expectation: if the exact endpoint gap closes, the next generated routed gap becomes a separate lane.

## Context
Project Truth still routes `src/app.ts#/api-keys` as the first `missing_test_link` row. The local API suite already exercises the api-keys chain through `GET /v1/api-keys`, `GET /v1/api-keys/profiles`, `POST /v1/api-keys`, and `PATCH /v1/api-keys/:id`; the open gap is proof-link drift, not a reproduced runtime failure.

## Goal
Attach the smallest current verification evidence to `src/app.ts#/api-keys` so the generated `missing_test_link` gap closes on the next refresh.

## Scope
- `src/tests/api.test.ts`
- `.codex/tasks/luc-1131-prove-unclassified-user-workflow-missing-test-link-for-use-api-keys.md`
- `docs/architecture/scanner-overrides.json`
- `docs/graphs/*`
- `docs/status/*`
- `.agents/state/active-mission.md`
- `.agents/state/current-focus.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `.agents/state/system-health.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan
1. Confirm the routed gap is the exact `src/app.ts#/api-keys` endpoint row and not a new api-keys runtime failure.
2. Reuse the existing api-keys API proof evidence if it still covers the mounted route.
3. Add narrow alias coverage for the exact endpoint only.
4. Refresh architecture/app-completion/Project Truth outputs and confirm the routed gap moves.
5. Update source-of-truth state and close the issue with evidence.

## Acceptance Criteria
- `src/app.ts#/api-keys` is backed by current proof evidence in `docs/architecture/scanner-overrides.json`.
- Generated app-completion no longer reports `api_endpoint:use-api-keys:d7553f1e44` as `missing_test_link`.
- Project Truth no longer routes `src/app.ts#/api-keys` as the first gap.
- Residual api-keys-family debt, if any, is called out precisely.

## Definition Of Done
- Exact endpoint proof-link closure is recorded.
- Generated truth artifacts are refreshed and inspected.
- Source-of-truth state reflects the new routed gap.
- Paperclip issue disposition includes verification evidence and residual risk.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Project Truth dispatches `src/app.ts#/api-keys` as the next routed `missing_test_link`.
- Gaps: the exact mount row lacks a route-level proof entry despite existing api-keys chain coverage.
- Inconsistencies: app-completion reports `USE /api-keys` as unclassified missing-test-link debt while `src/tests/api.test.ts` already exercises the handler chain through `/v1/api-keys` endpoints.
- Architecture constraints: stay inside proof linkage; do not rewrite route behavior or duplicate API tests unless current evidence is actually missing.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no
- Missing or template-like files: none blocking
- Sources scanned: app-completion index, module confidence ledger, `src/app.ts`, `src/tests/api.test.ts`, `src/modules/api-keys/api-keys.routes.ts`, and scanner overrides.
- Rows created or corrected: pending generated refresh
- Assumptions recorded: the existing API suite still proves the api-keys chain and the missing proof is route-mount linkage drift.
- Blocking unknowns: none
- Why it was safe to continue: current repo evidence already covers the api-keys chain; the open gap is linkage drift.

### 2. Select One Priority Mission Objective
- Selected task: close the exact routed `use-api-keys` proof-link gap.
- Priority rationale: it is the first current Project Truth routed gap for Roost after the prior closures.
- Why other candidates were deferred: the next unclassified rows depend on the post-refresh queue and should stay separate if they remain.

### 3. Plan Implementation
- Files or surfaces to modify: API test coverage, scanner overrides if needed, this task packet, generated truth artifacts, and source-of-truth state summaries.
- Logic: attach existing api-keys API proof to the exact mounted endpoint row.
- Edge cases: if the generated gap persists after narrow linkage, record that the route family needs broader proof-link curation rather than pretend closure.

### 4. Execute Implementation
- Implementation notes: add a verified entity override and test relation from `src/tests/api.test.ts` to `src/app.ts#/api-keys` by exercising the root alias directly.

### 5. Verify and Test
- Validation to run:
  - `npm run test:api:local`
  - `npm run architecture:refresh`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  - `$env:ROOST_PUBLIC_URL='https://roost.luckysparrow.ch'; $env:ROOST_API_PUBLIC_URL='https://api.roost.luckysparrow.ch'; node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  - `npm run architecture:status`

### 6. Self-Review
- Simpler option considered: do nothing and open another duplicate agent proof run; rejected because current repo evidence already covers the route family.
- Technical debt introduced: none intended.
- Scalability assessment: the fix follows the same exact proof-link pattern already used for root, agent-events, agent-logs, and agents route gaps.
- Refinements made: scope stays on one exact endpoint row rather than broad unclassified route-family cleanup.

### 7. Update Documentation and Knowledge
- Docs updated: this task packet plus source-of-truth state files and generated truth artifacts.
- Context updated: yes
- Learning journal updated: not applicable unless refresh uncovers a repeatable tooling pitfall.

## Result Report
- Outcome: closed the routed unclassified `USE /api-keys` `missing_test_link` gap on `src/app.ts#/api-keys` by linking the existing api-keys proof packet directly to the exact route entity.
- Evidence added:
  - `src/tests/api.test.ts`
  - `docs/architecture/scanner-overrides.json`
  - `.codex/tasks/luc-1131-prove-unclassified-user-workflow-missing-test-link-for-use-api-keys.md`
- Verification summary:
  - `npm run architecture:refresh` PASS
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`3026` entities / `7604` relations / `16522` files)
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`missingTestLink=34`, `missingDocLink=0`)
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS with public probes `pass` and first gap advanced to `src/app.ts#/api/build-info`
  - `npm run architecture:status` PASS (`GREEN`, `454/765/35`)
- Residual risk: the next routed gap is `src/app.ts#/api/build-info`; if `/api-keys` regresses, re-check the task packet and scanner overrides.
