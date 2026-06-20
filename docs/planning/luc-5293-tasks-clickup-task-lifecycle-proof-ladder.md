# LUC-5293 Tasks And ClickUp Task Lifecycle Proof Ladder

## Goal

Verify one focused local QA proof-ladder slice for [LUC-5293](/LUC/issues/LUC-5293), the Tasks and ClickUp task lifecycle child from [LUC-5291](/LUC/issues/LUC-5291).

## Scope

- Task type: QA verification.
- Current stage: verification.
- Deliverable for this stage: local evidence packet and issue disposition.
- In scope: `src/modules/tasks/tasks.routes.ts`, `src/modules/task-lists/task-lists.routes.ts`, ClickUp sync/write-back integration, `src/tests/api.test.ts`, and architecture entities `FEAT-AUTO-0028`, `API-AUTO-0019`, `API-AUTO-0085`, `API-AUTO-0086`, `API-AUTO-0113`, `API-AUTO-0157`, `API-AUTO-0158`, `API-AUTO-0159`, `API-AUTO-0160`.
- Out of scope: protected production smoke, live ClickUp provider action, deploy, push, restart, production mutation, credential access, secret disclosure, runtime code, schema, migration changes, and browser proof.

## Implementation Plan

1. Confirm the Tasks/ClickUp route and architecture surface.
2. Run the smallest sufficient local API proof for the existing lifecycle assertions.
3. Run route/capability and architecture status drift checks.
4. Verify disposable runtime cleanup.
5. Record durable evidence and final disposition.

## Acceptance Criteria

- Local API proof passes against a disposable test database.
- Proof covers workspace-scoped task lifecycle behavior and ClickUp-backed lifecycle assertions already in `src/tests/api.test.ts`.
- Route/capability and architecture status checks pass.
- No validation-owned database container or headless browser process remains.
- No repair issue is warranted unless proof fails.

## Proof

- Command: `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5293-postgres COMPANYCORE_TEST_DB_PORT=55493 npm run test:api:local`
- Result: PASS.
- Evidence:
  - server build PASS
  - web build PASS
  - Prisma migrate deploy PASS with all `31` migrations applied to disposable PostgreSQL `companycore_test` at `127.0.0.1:55493`
  - seed PASS
  - Node API tests PASS: `7/7`
  - `CompanyCore v1 protected API flow` PASS in `36867.6222ms`
  - full test duration `40401.2761ms`

Lifecycle behavior covered by the existing protected API flow:

- ClickUp webhook signature fail-closed checks.
- ClickUp sync import modes: `merge`, `skip_existing`, `inspect_only`, `replace_selected_lists`.
- ClickUp-backed task list association on imported tasks.
- CompanyCore task creation into a ClickUp-backed list before local persistence.
- ClickUp custom field update route.
- ClickUp-backed archive propagation through provider payload `{ archived: true }`.
- Local task archived state after delete.
- Task and sync event emission, including `task_created`, `task_archived`, `task_synced_from_clickup`, and `sync_succeeded`.
- Workspace-scoped event/task readback and cross-workspace isolation covered in the same flow.

## Drift Checks

- `npm run check:route-capabilities`: PASS
  - `checkedManifestRoutes=180`
  - `checkedRouteFiles=35`
  - `status=ok`
- `npm run architecture:status`: PASS
  - `Architecture Status: GREEN`
  - graph `454` nodes / `765` relations / `35` chains
  - evidence queue `0`
  - chain worklist `0`
  - delta nodes `0`, relations `0`, chains `0`
  - all gates pass `yes`

## Cleanup Evidence

- `docker ps -a --filter "name=companycore-luc-5293-postgres" --format "{{.Names}} {{.Status}}"`: no output.
- `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue`: no output.
- No browser proof, dev server, watcher, deploy, protected smoke, credential access, secret disclosure, or live provider action was started.

## Result Report

Status: verified done.

The Tasks and ClickUp task lifecycle slice is locally verified through existing API regression coverage and green route/architecture checks. No defect was found and no repair child issue is warranted. Protected live ClickUp/provider proof remains a separate approval/credential-gated lane.
