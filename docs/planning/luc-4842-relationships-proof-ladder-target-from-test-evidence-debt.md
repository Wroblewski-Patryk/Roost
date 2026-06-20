# LUC-4842 Relationships Proof-Ladder Target From Test-Evidence Debt

## Header
- ID: LUC-4842
- Title: Select next proof-ladder target from architecture test-evidence debt
- Task Type: research
- Current Stage: planning
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-4837](/LUC/issues/LUC-4837)
- Priority: P1
- Module Confidence Rows: Relationships context/API/web route; DMS-V1-006; local proof-ladder continuity
- Iteration: 2026-06-20 QA selection heartbeat
- Operation Mode: TESTER
- Mission ID: LUC-4842-RELATIONSHIPS-PROOF-LADDER-TARGET
- Mission Status: VERIFIED

## Goal

Select the next smallest high-value QA proof-ladder target from the current
architecture test-evidence debt after Operations and Assets already have local
proof.

## Scope

Included:
- `docs/graphs/architecture-health.json`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/dms-13-systems-v1-implementation-audit.md`
- `src/modules/relationships/relationships.routes.ts`
- `src/auth/capabilities.ts`
- `web/src/features/departments/relationships-route.tsx`
- `web/src/app-route-registry.ts`

Excluded:
- Runtime code, schema, migration, browser proof execution, full API/database
  test execution, protected smoke, deploy, push, restart, production mutation,
  credential access, secret disclosure, production data access, server,
  database, Docker, browser, or watcher processes.

## Selected Target

Selected proof-ladder target: `05 Relationships -> Context/Overview`.

Execution owner: [LUC-4844](/LUC/issues/LUC-4844).

Target surfaces:
- API: `GET /v1/relationships/context`
- Capability: `relationships:read`
- Backend file: `src/modules/relationships/relationships.routes.ts`
- Web route: `/areas?area=05-relacje&view=overview`
- Web file: `web/src/features/departments/relationships-route.tsx`

## Rationale

`docs/graphs/architecture-health.json` still reports
`implementation_without_tests=1161` at the current baseline. Operations and
Assets should not be reselected because [LUC-4777](/LUC/issues/LUC-4777) and
[LUC-4821](/LUC/issues/LUC-4821) locally verified those proof ladders.

`05 Relationships` is the next highest-value local proof target because the
department-system audit names it immediately after the already verified Sales,
Operations, and Assets path. It is also executable without protected
production credentials: the backend context route, read capability, app route,
and web route already exist, so QA can start with the local API regression rung
and proceed to authenticated desktop/mobile UI proof if the API rung remains
green.

## Evidence

- `docs/graphs/architecture-health.json` generated at
  `2026-06-20T04:42:46.848Z` reports `implementation_without_tests=1161`.
- Debt grouping found Relationships still in the signal:
  `USE /relationships` at `src/app.ts#/relationships` and
  `relationships.routes.ts` at
  `src/modules/relationships/relationships.routes.ts`.
- `npm run check:route-capabilities` PASS:
  `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`.
- Static route/capability inspection confirms:
  `relationships:read` covers `GET /v1/relationships/context`;
  `relationshipsRouter.get("/context")` exists; and
  `web/src/features/departments/relationships-route.tsx` loads
  `/v1/relationships/context`.
- [LUC-4844](/LUC/issues/LUC-4844) was created as the execution child issue.

## Verification Ladder For LUC-4844

1. Run `npm run test:api:local`.
2. If the API/database rung fails, stop and create a narrow repair issue with
   the exact failure, owner, and rerun command.
3. If API remains green, run authenticated local browser proof for
   `/areas?area=05-relacje&view=overview` at desktop `1366x900` and mobile
   `390x844`.
4. Cover client/stakeholder/interaction/notes/Drive/graph evidence visibility,
   loading/empty/error states, safe user-facing error language, no raw
   provider/backend error leakage, no console/page errors, no failed relevant
   requests, and no horizontal overflow.
5. Save browser artifacts under `docs/ux/evidence/` if browser proof runs.
6. Clean up any backend, database container, browser, watcher, or temporary
   validation process started by the proof.

## Acceptance Criteria

- [x] One target is selected and excludes already verified Operations and
      Assets ladders.
- [x] The selected target names exact API, capability, route, and files.
- [x] The proof ladder is ordered from local API proof to authenticated browser
      proof.
- [x] Protected production actions are explicitly excluded.
- [x] A child execution issue exists for the selected proof ladder.

## Result Report

Task summary: selected `05 Relationships -> Context/Overview` as the next QA
proof-ladder target from current test-evidence debt.

Files changed: this planning packet plus source-of-truth state updates.

How tested: `npm run check:route-capabilities` passed; static inspection
confirmed route/capability/client alignment.

What is incomplete: the actual API and browser proof are intentionally owned by
[LUC-4844](/LUC/issues/LUC-4844), not this selection issue.

Residual risk: protected production proof remains under the existing
release/credential approval path and is not part of this local QA selection.
