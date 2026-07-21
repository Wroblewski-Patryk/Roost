# Task

## Header
- ID: LUC-1536
- Title: Prove unclassified user workflow missing-test-link for `USE /v1/webhooks/clickup`
- Task Type: fix
- Current Stage: verification
- Status: COMPLETED
- Owner: QA/Test
- Depends on:
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `v1 webhooks clickup proof linkage`
- Requirement Rows: `REQ-APP-AUDIT-005`
- Quality Scenario Rows: not applicable
- Risk Rows: unclassified route proof-link drift for public ClickUp webhook aliases
- Iteration: 2026-07-20-LUC-1536
- Operation Mode: TESTER
- Mission ID: LUC-1536-USE-V1-WEBHOOKS-CLICKUP-PROOF-LINK
- Mission Status: COMPLETED

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
- Mission objective: close the routed Project Truth `missing_test_link` gap for `src/app.ts#/v1/webhooks/clickup` by linking the existing public webhook proof to the exact `/v1/webhooks/clickup` mount and refreshing generated truth artifacts.
- Release objective advanced: remove one routed unclassified missing-test-link row without broadening runtime scope.
- Responsibility lanes: single-lane QA/Test execution; subagent delegation not used because the work is a tightly coupled proof-link and verification packet.
- Included slices: one route-mount proof-link override, focused API proof verification, generated truth refresh, and source-of-truth state updates.
- Explicit exclusions: no route logic change, no schema change, no deploy, no production mutation, no new browser work, and no broader webhook or API redesign.
- Checkpoint cadence: confirm the routed symbol and existing `/v1/webhooks/clickup` proof, attach the exact override, run the verification/refresh chain, then update state and issue disposition if the gap clears.
- Stop conditions: focused proof fails, generated refresh keeps the exact symbol as `missing_test_link`, or refreshed truth contradicts current route ownership.

## Context
Project Truth currently routes `src/app.ts#/v1/webhooks/clickup` (`USE /v1/webhooks/clickup`) as the first unclassified `missing_test_link` item. The behavior is already exercised in `src/tests/api.test.ts` through the ClickUp webhook cases that verify missing-signature rejection, unregistered-webhook rejection, and live signed event ingestion, and the route is already documented in `docs/API.md` and the production smoke record in `docs/operations/post-deploy-smoke.md`. The open gap is evidence-link drift between the `/v1/webhooks/clickup` mount in `src/app.ts` and the existing automated proof plus accepted webhook documentation.

## Goal
Attach existing test evidence to `src/app.ts#/v1/webhooks/clickup` in scanner metadata so the generated app-completion and Project Truth outputs no longer classify it as `missing_test_link`.

## Scope
- `docs/architecture/scanner-overrides.json`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1536-prove-unclassified-user-workflow-missing-test-link-for-use-v1-webhooks-clickup.md`
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
1. Verify the dispatched route symbol and existing `/v1/webhooks/clickup` proof in code and generated status artifacts.
2. Link `src/app.ts#/v1/webhooks/clickup` to the existing public runtime proof through a minimal scanner override and supporting doc relation.
3. Run focused API verification, then refresh architecture-awareness, app-completion, and Project Truth indexes.
4. Update source-of-truth and module-confidence state files with the exact gap movement and next owner.

## Acceptance Criteria
- `docs/architecture/scanner-overrides.json` contains a `verified` entry for `src/app.ts#/v1/webhooks/clickup` with existing API proof evidence.
- Focused local proof confirms the current webhook assertions still pass without runtime modification.
- Generated app-completion no longer reports `api_endpoint:use-v1-webhooks-clickup:61d965c5ad` as `missing_test_link`.
- Project Truth first routed QA gap moves away from `USE /v1/webhooks/clickup`.
- Evidence and state updates record the exact refreshed gap movement and next routed target.

## Definition of Done
- Exact endpoint proof-link closure is recorded in scanner metadata and this task packet.
- Generated truth artifacts are refreshed and inspected.
- Source-of-truth state files are updated to reflect the next routed gap.
- Paperclip issue disposition includes completion evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Project Truth first routed QA gap: Unclassified user workflow `USE /v1/webhooks/clickup`.
- Evidence status: `src/tests/api.test.ts` already proves the webhook route through the ClickUp webhook cases that assert missing-signature rejection, unregistered-webhook rejection, and live signed event ingestion.
- Closure risk: route-mount evidence drift, not missing runtime behavior.

### 2. Select Priority Mission Objective
- Selected mission: `USE /v1/webhooks/clickup` missing-test-link closure for the exact `src/app.ts#/v1/webhooks/clickup` mount.
- Deferred scope: no behavioral additions and no broader webhook, readiness, or API redesign.

### 3. Execute Implementation
- Scanner override links `src/app.ts#/v1/webhooks/clickup` to existing proof in `src/tests/api.test.ts`, `src/app.ts`, `src/integrations/clickup/clickup.webhooks.ts`, `docs/API.md`, and this task packet.

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
- Completed: yes
- Scope: `docs/architecture/scanner-overrides.json`,
  `docs/architecture/relations/documentation-links.csv`,
  `docs/graphs/architecture-awareness.csv`,
  `docs/graphs/architecture-awareness.json`,
  `docs/status/app-completion-index.json`,
  `docs/status/app-completion-index.md`,
  `docs/status/project-truth-index.json`,
  `docs/status/project-truth-index.md`,
  `.codex/context/TASK_BOARD.md`,
  `.codex/context/PROJECT_STATE.md`,
  `.agents/state/current-focus.md`,
  `.agents/state/active-mission.md`,
  `.agents/state/next-steps.md`,
  `.agents/state/module-confidence-ledger.md`,
  `.agents/state/system-health.md`
- Evidence:
  - `docs/architecture/scanner-overrides.json` already contained the verified
    route proof for `src/app.ts#/v1/webhooks/clickup`.
  - `npm run test:api:local` PASS (`8/8`).
  - `npm run architecture:refresh` PASS.
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS (`3127` entities / `8584` relations / `16525` files).
  - `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` PASS; `missingTestLink=3`; `USE /v1/webhooks/clickup` no longer reported as `missing_test_link`.
  - `$env:ROOST_PUBLIC_URL='https://roost.luckysparrow.ch'; $env:ROOST_API_PUBLIC_URL='https://api.roost.luckysparrow.ch'; node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` PASS; public probes `pass`; first routed gap moved to `src/app.ts#/workforce`.
  - `npm run architecture:status` PASS (`GREEN`, `455/769/35`).
- No runtime route logic, schema, deploy, push, or production mutation changed.
