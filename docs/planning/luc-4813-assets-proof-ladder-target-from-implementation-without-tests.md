# LUC-4813 Assets Proof-Ladder Target From Implementation-Without-Tests

## Header
- ID: LUC-4813
- Title: [Roost] [QA] Select next proof-ladder target from implementation-without-tests debt
- Task Type: QA verification
- Current Stage: planning
- Status: DONE
- Owner: QA & Verification Engineer
- Priority: P1
- Mission ID: LUC-4813-ASSETS-PROOF-LADDER-TARGET
- Mission Status: TARGET_SELECTED
- Last updated: 2026-06-20

## Goal
Select the next concrete proof-ladder target from the current
`implementation_without_tests` / `actionable_implementation_without_tests`
debt after the `04 Operations` proof ladder completed under
[LUC-4777](/LUC/issues/LUC-4777).

## Scope
- Included:
  - Review current source-of-truth state, architecture-health debt, and module
    confidence rows.
  - Avoid reselecting already completed proof ladders.
  - Select one next P0/P1 target and define proof rungs.
  - Run one low-cost static readiness gate.
- Excluded:
  - Runtime code changes.
  - Schema or migration changes.
  - Full API/database test execution.
  - Browser proof, protected smoke, deploy, push, restart, production mutation,
    credential access, secret disclosure, server, database, Docker, or watcher
    process.

## Selected Target
Selected target: `08 Assets -> Files/Folders` proof ladder.

Primary surfaces:
- `GET /v1/assets/context`
- `PATCH /v1/assets/folders/:id`
- `PATCH /v1/google-drive/files/:id/text-content`
- `web/src/features/departments/assets-route.tsx`
- Google Drive file/folder context and preview read path

Architecture-health entities still carrying implementation-without-test-link
debt at current granularity:

| Entity | Path | Status |
| --- | --- | --- |
| `api_endpoint:use-assets:ac41eec16d` | `src/app.ts#/assets` | implemented |
| Assets route feature | `src/modules/assets/assets.routes.ts` | implemented |
| Assets frontend feature | `web/src/features/departments/assets-route.tsx` | implemented |

Exact generated feature IDs may vary by scanner refresh; the selected product
chain is the existing `CHAIN-ASSETS-CONTEXT` Assets context chain.

## Selection Rationale
- Priority: Assets is part of the approved `00 Main -> 04 Operations -> 08
  Assets` operating loop and remains release-relevant.
- Fresh confidence gap: `04 Operations` is locally verified by
  [LUC-4777](/LUC/issues/LUC-4777), while multiple Assets rows remain
  `PARTIAL` because earlier API regression proof was blocked by local database
  availability.
- Current unblock: [LUC-4779](/LUC/issues/LUC-4779) restored
  `npm run test:api:local`, so the missing Assets API regression rung is now
  feasible locally without protected production credentials.
- User risk: Assets owns Google Drive file/folder density, image/text previews,
  folder scoping, and editable text-file command boundaries. Regressions here
  can make the owner think imported source material is missing or unsafe to
  inspect.
- Role fit: this is a QA proof target selection. Any product defect found by
  the follow-up proof should become a narrow backend/frontend repair issue.

## Evidence Reviewed

| Source | Result |
| --- | --- |
| `docs/graphs/architecture-health.json` | Current signal: `implementation_without_tests.count=1161`; `actionable_implementation_without_tests=1152` is recorded in source-of-truth state. Assets route/file entities remain in the implementation-without-test signal. |
| `.agents/state/module-confidence-ledger.md` | `ASSETS-GDRIVE-006`, `ASSETS-FOLDERS-002`, and `ASSETS-FILES-001` remain `PARTIAL` because full API regression and production/real-data proof were pending when database validation was blocked. |
| `docs/planning/luc-4777-operations-work-items-proof-ladder.md` | Prior selected Operations proof ladder is complete locally, so it should not be reselected here. |
| `docs/planning/luc-4779-restore-local-api-test-database-path.md` | Local API test database path is restored; `npm run test:api:local` passed after Docker Desktop recovery. |
| `docs/architecture/nodes/generated/FEAT-ASSETS-CONTEXT.md` | `CHAIN-ASSETS-CONTEXT` maps `/areas?area=08-zasoby&view=files` through `AssetsRoute`, `GET /v1/assets/context`, local API proof, Playwright proof, and production Drive import smoke. |

## Proof Ladder For Follow-Up QA

| Rung | Purpose | Command / method | Pass condition |
| --- | --- | --- | --- |
| 1 | Prove route/capability/MCP static alignment did not drift before selecting the Assets ladder. | `npm run check:route-capabilities` | PASS with `status=ok`. Completed in this selection lane. |
| 2 | Prove backend/frontend compile compatibility for Assets route, auth manifest, MCP manifest, and tests. | `npm run build:server` and `npm run build:web` or the build steps inside `npm run test:api:local`. | Builds pass without type or bundling errors. |
| 3 | Prove API behavior against a disposable local test database after the LUC-4779 runner fix. | `npm run test:api:local` | Existing Assets assertions pass, including the low-limit folder/non-folder coverage regression and guarded folder/text-file command behavior covered by the API suite. |
| 4 | Prove the operator UI consumes the packet and renders dense file/folder states. | Authenticated local route proof for `/areas?area=08-zasoby&view=files`. | Files/Folders view renders folder tree, file cards, type filters, preview panel, and recovery states on desktop and mobile with no console/page errors or horizontal overflow. |
| 5 | Keep production/real Drive proof gated. | Existing protected production smoke path only after source-ref/deploy and credential gates are satisfied. | Real Drive density and preview proof recorded without exposing secrets or private data. |

## Validation Run In This Lane
- `npm run check:route-capabilities`: PASS.
  - `checkedManifestRoutes=180`
  - `checkedRouteFiles=35`
  - `status=ok`

## Classification
Selected target status: implemented, partially verified at current confidence
granularity.

This issue did not find an Assets product defect. It converted the broad
implementation-without-test-link signal into the next concrete QA follow-up
target. Repair work should wait until a proof rung fails with a reproducible
defect.

## Result Report
[LUC-4813](/LUC/issues/LUC-4813) is complete for selection scope. The next
proof-ladder target is `08 Assets -> Files/Folders`, with proof rungs that
start from static route/capability alignment and then move to local API
integration and authenticated desktop/mobile UI proof.

Follow-up: [LUC-4821](/LUC/issues/LUC-4821) was created as the worker-ready
child issue for the actual Assets proof ladder.

No runtime code, schema, migration, protected smoke, deploy, push, restart,
production mutation, credential access, secret disclosure, server, browser,
database, Docker, or watcher process occurred.
