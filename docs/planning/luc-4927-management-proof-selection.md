# LUC-4927 - 12 Management Proof Selection

## Header

- ID: LUC-4927
- Title: Roost next thin milestone proof selection for 12 Management
- Task Type: QA verification / milestone selection
- Current Stage: verification
- Status: DONE
- Owner: QA & Verification Engineer
- Mission ID: LUC-4927-MANAGEMENT-PROOF-SELECTION
- Mission Status: VERIFIED_BY_READBACK
- Operation Mode: TESTER

## Goal

Decide whether `12 Management -> Department management` needs a fresh local
proof ladder after the verified `11 Innovation -> Operating Graph Overview`
milestone, or whether current source-of-truth evidence is sufficient for the
thin Roost milestone decision.

## Scope

- `web/src/app-route-registry.ts`
- `web/src/features/departments/management-route.tsx`
- `src/modules/departments/departments.routes.ts`
- `docs/architecture/nodes/pages.csv`
- `docs/architecture/chains/chains.csv`
- `docs/architecture/nodes/features.csv`
- `docs/architecture/nodes/api_routes.csv`
- `docs/planning/management-department-catalog-task-contract.md`

## Implementation Plan

1. Read the Paperclip issue context and parent readiness mission.
2. Inspect the Management route, departments API, architecture page/chain
   nodes, and existing task contract.
3. Run the smallest current drift check before deciding on a rerun.
4. Record the milestone decision and residual risk in project memory.

## Acceptance Criteria

- [x] `12 Management -> Departments` source-of-truth paths are identified.
- [x] Existing evidence is classified as sufficient or stale.
- [x] If sufficient, exact evidence references are recorded and no rerun is
      performed.
- [x] If insufficient, the next executable QA proof lane is named.
- [x] Protected production smoke, deploy, push, restart, credentials, and
      production mutation are avoided.

## Validation Evidence

- Paperclip heartbeat context for [LUC-4927](/LUC/issues/LUC-4927) had no
  comments and no blockers. It explicitly requested evidence readback first.
- `docs/planning/management-department-catalog-task-contract.md` is already
  `DONE` / `VERIFIED` for `MGMT-DEPT-001`.
- Existing proof in that contract covers:
  - `npm run prisma:generate`
  - Prisma validation
  - `npm run build:server`
  - `npm run build:web`
  - `npm run validate`
  - `npm run test:api:local` with all `27` migrations and `6/6` API subtests
  - browser proof on
    `http://127.0.0.1:3351/areas?area=12-zarzadzanie&view=departments`
    that logged in, rendered the Management department table, created
    `13 Marketing Lab`, linked `Operations tasks` and `Assets files and
    folders`, reloaded, and verified sidebar/table readback with no console
    warnings or errors.
- Architecture source-of-truth marks the route and chain verified:
  - `docs/architecture/nodes/pages.csv` has
    `PAGE-12-MANAGEMENT-DEPARTMENTS` for
    `/areas?area=12-zarzadzanie&view=departments` as `verified`.
  - `docs/architecture/chains/chains.csv` has
    `CHAIN-MGMT-DEPT-CATALOG` as `verified`.
  - `docs/architecture/nodes/features.csv` has
    `FEAT-MGMT-DEPT-CATALOG` as `verified`.
  - `docs/architecture/nodes/api_routes.csv` has
    `API-DEPARTMENTS-LIST`, `API-DEPARTMENTS-CREATE`, and
    `API-DEPARTMENTS-UPDATE` as verified.
- Current drift check:
  `npm run check:route-capabilities` passed on 2026-06-20 with
  `checkedManifestRoutes=180`, `checkedRouteFiles=35`, and `status=ok`.
- Source-control readback:
  `git status --short --branch -uall` showed
  `main...origin/main [ahead 44]` with existing [LUC-4920](/LUC/issues/LUC-4920)
  and [LUC-4921](/LUC/issues/LUC-4921) evidence/state artifacts already
  pending closure; `HEAD=8135ad6a613b5a85cd28e9d9e7176d1aee4b08be`.

## Result Report

`12 Management -> Department management` does not need a fresh full local
API/browser proof ladder for this milestone selection. Current source-of-truth
evidence is sufficient by readback, and the current route/capability drift
check is green.

The next thin milestone action should not rerun the existing browser proof by
default. If additional confidence is desired, the narrowest follow-up is the
already documented hardening slice: add dedicated `/v1/departments` API
regression assertions for list/create/update behavior. That is a test-hardening
task, not a blocker for recognizing the Management department catalog as the
next locally verified thin milestone.

## Residual Risk

- The browser proof is from the original `MGMT-DEPT-001` verification, not a
  fresh rerun in this heartbeat.
- Dedicated `/v1/departments` API subtests are still a future hardening item.
- Protected production proof remains release/credential gated.
- Source-control closure for the current evidence/state batch is already
  delegated to [LUC-4926](/LUC/issues/LUC-4926).
