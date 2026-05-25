# V1 Production Smoke And Rollout Task Contract

## Header

- ID: V1OPS-002
- Title: Production V1 Smoke After Company OS Area Foundation
- Task Type: release
- Current Stage: post-release
- Status: DONE
- Owner: Ops/Release + Frontend Builder + QA/Test
- Depends on: V1COS-001, production manual rollover path
- Priority: P1
- Coverage Ledger Rows: CCORE-DM-010, CCORE-DM-012, CCORE-DM-012A,
  CCORE-DM-012E, CCORE-DM-014
- Module Confidence Rows: V1OPS-002
- Requirement Rows: REQ-V1OPS-002
- Quality Scenario Rows: QA-V1OPS-002
- Risk Rows: RISK-V1OPS-002
- Iteration: 2026-05-16
- Operation Mode: TESTER
- Mission ID: V1OPS-002
- Mission Status: DONE

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected from the active queue.
- [x] Operation mode is TESTER because this slice is deploy/smoke evidence.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed in this mission wave.
- [x] `.agents/core/mission-control.md` was reviewed previously in this
      mission wave; this slice remains bounded.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.

## Mission Block

- Mission objective: deploy the pushed V1 Company OS area foundation to
  production through the accepted manual VPS rollover path and run the V1
  production smoke set.
- Release objective advanced: production should match the latest pushed V1
  web state and prove the owner can open critical V1 routes.
- Included slices: local release gates, source archive build on VPS, canary
  health, production container rollover, public health, authenticated browser
  smoke for representative V1 surfaces, documentation updates.
- Explicit exclusions: no schema changes, no new runtime feature work, no
  provider token rotation, no Paperclip changes.
- Checkpoint cadence: commit after deploy/smoke evidence is recorded.
- Stop conditions: build failure, canary health failure, public health mismatch,
  or authenticated smoke failure that indicates a real production regression.
- Handoff expectation: production commit and route proof are recoverable from
  operations docs and state ledgers.

## Goal

Bring production from `d2c9b9460a5db63703ca28f98988a2fa35d3a651` to the
current pushed commit and verify the V1 web foundation on public production.

## Scope

- `docs/operations/post-deploy-smoke.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/*`
- `docs/planning/mvp-next-commits.md`
- production VPS backend container only

## Implementation Plan

1. Confirm public health and current deployed commit.
2. Run local release gates.
3. Build a local source archive for the exact pushed commit.
4. Copy the archive to the VPS and build the Docker image with explicit build
   metadata.
5. Start a canary container using the current production env and labels, but
   without taking traffic.
6. If canary health passes, stop and retain the previous backend as rollback,
   then start the new routed backend container.
7. Run public health and authenticated V1 route smoke.
8. Update source-of-truth docs and state.

## Acceptance Criteria

- [x] Public `/health` reports the new commit on web and API domains.
- [x] Production Postgres remains running and unchanged.
- [x] Previous backend container/image is retained as rollback.
- [x] Authenticated production smoke covers `/operations`, `/tasks-adapter`,
      `/data`, `04 Operacje`, and `/react-company-os`.
- [x] Smoke reports no console/page errors and no horizontal overflow.
- [x] Source-of-truth docs record the release evidence.

## Definition of Done

- [x] Code builds without errors before rollout.
- [x] Production canary and final health pass.
- [x] Feature works manually through the real production UI/API path.
- [x] No secrets are printed or committed.
- [x] Temporary local and VPS deployment artifacts are removed.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` are checked before
      status changes to `DONE`.

## Validation Evidence

- Tests:
  - `npm run build`: passed before rollout.
  - `git diff --check`: passed before rollout and after documentation updates.
- Manual checks:
  - Production was manually rolled over to commit
    `5f1fc71e44d09cb1780d29b2579c85023205efb9`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71`.
  - Image:
    `rnqqkhl3o3dut4qv56mlxly2_backend:5f1fc71e44d09cb1780d29b2579c85023205efb9`.
  - Previous backend retained stopped as rollback:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-d2c9b94-previous-5f1fc71`.
  - Production Postgres container remained running and healthy.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    the expected commit and image.
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with the
    expected commit and image.
  - Authenticated owner smoke verified `/operations`, `/tasks-adapter`,
    `/data`, `/areas?area=04-operacje&view=overview`, `/settings/drive`, and
    `/react-company-os?area=04-operacje`; the Company OS route clicked `06`
    and verified `People/Agents And Role Management System`.
  - Authenticated direct API smoke verified
    `/v1/operating-graph/areas/01-strategia` with `27` nodes and `32` edges.
- Screenshots/logs:
  - `docs/ux/evidence/production-v1-5f1fc71-2026-05-16/`
  - `docs/ux/evidence/production-v1-5f1fc71-2026-05-16/production-v1-route-report.json`
- Reality status: verified in production.

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- `DEFINITION_OF_DONE.md` reviewed: yes.
- Real production API/service path used: yes.
- Endpoint and client contract match: yes; public web/API health and
  authenticated AOG route reported the expected commit and data shape.
- Loading/error/signed-in states verified: signed-in production routes rendered
  without page errors, console errors, failed requests, or horizontal overflow.
- Refresh/restart behavior verified: the final routed backend started from the
  production image and public health remained stable after rollover.

## Result Report

- Result: production V1 smoke rollout completed.
- Files changed: documentation and evidence artifacts only.
- Deployment impact: production now runs the V1 Company OS area foundation
  commit `5f1fc71e44d09cb1780d29b2579c85023205efb9`.
- Cleanup evidence: temporary local archive/script were removed; VPS
  `/tmp/companycore-5f1fc71*` artifacts were absent after cleanup; no
  `chrome-headless-shell` or `chromium` validation processes remained.
- Residual risk: future feature work still needs one bounded department or
  command slice at a time; no production smoke defect was found in this
  rollout.
