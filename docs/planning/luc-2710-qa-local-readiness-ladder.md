# Task

## Header
- ID: LUC-2710
- Title: Roost QA local readiness ladder from LUC-2708 review
- Task Type: verification
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: LUC-2708
- Priority: P1
- Mission ID: LUC-2710-QA-LOCAL-READINESS-LADDER
- Mission Status: PARTIALLY_VERIFIED

## Goal
Define and run the smallest local proof set that keeps Roost ready while the
protected target-runtime smoke remains blocked by the CompanyCore key gate.

## Scope
- `package.json`
- `docs/engineering/testing.md`
- `docs/engineering/local-development.md`
- `DEFINITION_OF_DONE.md`
- `INTEGRATION_CHECKLIST.md`
- `NO_TEMPORARY_SOLUTIONS.md`
- `.agents/state/active-mission.md`
- `.agents/state/next-steps.md`
- `.agents/state/module-confidence-ledger.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan
1. Confirm the verification lane from the LUC-2708 review packet.
2. Select the smallest useful local readiness ladder from project-native
   commands.
3. Run checks in increasing cost: architecture status, static route checks,
   build, then local API tests only if prerequisites are healthy.
4. Record pass/fail/skipped evidence and separate local readiness from
   protected runtime proof.
5. Sync source-of-truth state and close the issue with a clear disposition.

## Acceptance Criteria
- [x] Local readiness ladder is explicit and reproducible.
- [x] Commands are recorded with exact pass/fail status.
- [x] Skipped or blocked checks include the reason and next owner/action.
- [x] No protected target smoke, deploy, push, restart, production mutation, or
  secret disclosure is performed.
- [x] Source-of-truth files are updated with QA evidence.

## Local Readiness Ladder

| Rung | Command | Result | Evidence | Next action |
| --- | --- | --- | --- | --- |
| 1 | `npm run architecture:status` | PASS | `GREEN`; graph `452` nodes, `761` relations, `34` chains; evidence queue `0`; chain worklist `0`; delta `0/0/0`; all gates pass `yes`. | Keep as first local release gate. |
| 2 | `npm run check:public-js` | PASS | Output: `legacy public JS removed; React/Vite build is the web syntax gate`. | Use `npm run build` as the real web syntax gate. |
| 3 | `npm run check:route-capabilities` | PASS | JSON result: `checkedManifestRoutes=179`, `checkedRouteFiles=34`, `status=ok`. | Keep as route/capability drift gate. |
| 4 | `npm run build` | PASS | Server TypeScript build passed; Vite web build passed. Non-fatal Vite note: `/vendor/phosphor/bold/style.css` was not present at build time and will resolve at runtime. | Keep before any release or source-control closure. |
| 5 | `npm run test:api:local` | BLOCKED BY ENVIRONMENT | The local runner could not provision disposable PostgreSQL because Docker Desktop Linux engine was unavailable: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` | Local environment owner enables Docker Desktop Linux engine or provides a disposable `DATABASE_URL`, then reruns `npm run test:api:local`. |

## Validation Evidence
- `npm run architecture:status` -> PASS.
- `npm run check:public-js` -> PASS.
- `npm run check:route-capabilities` -> PASS.
- `npm run build` -> PASS.
- `npm run test:api:local` -> blocked by local Docker engine availability, not
  by an API assertion failure.
- `git rev-parse --short HEAD` -> `a48a8ee`.
- UTC checkpoint: `2026-06-07T07:23:14.1204459Z`.
- `git status --short --branch` showed `main...origin/main [ahead 12]` with
  existing docs/state changes from prior Roost lanes; no runtime code changes
  were introduced by this QA lane.
- Cleanup proof: no `chrome-headless-shell` process was found. Node processes
  inspected were Paperclip/Codex/MCP control-plane processes, so no validation
  server started by this lane needed shutdown.

## Explicit Non-Scope
- No `npm run aog:deploy-smoke`.
- No `npm run adapter:smoke`.
- No protected target runtime request.
- No deploy, push, restart, production mutation, migration, schema change, or
  secret disclosure.

## Definition Of Done
- [x] Applicable local readiness commands were run.
- [x] Runtime feature DoD items are marked not applicable because this task did
  not implement or change runtime behavior.
- [x] Integration checklist was reviewed; no integrated feature changed.
- [x] No temporary solution or workaround was introduced.
- [x] Residual environment gap is named with owner/action.

## Result Report
- Task summary: Roost is locally ready through architecture, static route, and
  build gates. API integration proof remains blocked only by local validation
  database provisioning because Docker Desktop Linux engine is unavailable.
- Files changed:
  - `docs/planning/luc-2710-qa-local-readiness-ladder.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- What is incomplete: `npm run test:api:local` was not completed because local
  Docker/PostgreSQL provisioning is unavailable in this environment.
- Deployment impact: none.
- Residual risk: API integration regressions cannot be ruled out by this
  heartbeat until a disposable PostgreSQL path is available.
- Final disposition: done for the QA local readiness ladder; separate
  environment follow-up is required before API integration confidence can move
  from blocked to verified.
