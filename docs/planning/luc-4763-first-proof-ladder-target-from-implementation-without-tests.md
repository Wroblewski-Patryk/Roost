# LUC-4763 First Proof-Ladder Target From Implementation-Without-Tests

## Header
- ID: LUC-4763
- Title: [Roost] [QA] Select first proof-ladder target from implementation-without-tests debt
- Task Type: QA verification
- Current Stage: planning
- Status: DONE
- Owner: QA & Verification Engineer
- Priority: P1
- Mission ID: LUC-4763-FIRST-PROOF-LADDER-TARGET
- Mission Status: TARGET_SELECTED
- Last updated: 2026-06-20

## Goal
Select one concrete, high-priority proof-ladder target from the current
`implementation_without_tests` debt so follow-up QA work can prove a real
workflow instead of treating the `1161` / `1152` architecture-health signal as
an unbounded test-everything queue.

## Scope
- Included:
  - Read current Roost source-of-truth state and architecture-health debt.
  - Review the prior LUC-3545 proof-ladder selection.
  - Select one next P0/P1 target and define proof rungs.
  - Run the smallest static readiness gate relevant to target selection.
- Excluded:
  - Runtime code changes.
  - Schema or migration changes.
  - Full API/database test execution.
  - Browser proof, protected smoke, deploy, push, restart, production mutation,
    credential access, secret disclosure, server, database, Docker, or watcher
    process.

## Selected Target
Selected target: `04 Operations` work-items vertical slice.

Primary surfaces:
- `GET /v1/operations/work-items`
- `POST /v1/operations/work-items`
- `PATCH /v1/operations/work-items/:id`
- `PATCH /v1/operations/task-lists/:id`
- `web/src/features/departments/operations-route.tsx`

Architecture-health entities still carrying implementation-without-test-link
debt at current granularity:

| Entity | Path | Status |
| --- | --- | --- |
| `api_endpoint:use-operations:f4ce71f687` | `src/app.ts#/operations` | implemented |
| `feature:operations-routes-ts:3ba5fa4f22` | `src/modules/operations/operations.routes.ts` | implemented |
| `feature:operations-route-tsx:046117caa5` | `web/src/features/departments/operations-route.tsx` | implemented |

## Selection Rationale
- Priority: `CC-04-002` is recorded as P0 and sits in the active
  `00 Main -> 04 Operations -> 08 Assets` product loop.
- User risk: Operations is the central work execution surface. A regression can
  affect task creation, editing, board/calendar readback, workspace isolation,
  and provider writeback boundaries.
- Existing implementation: backend and frontend code are present; API assertions
  already exist in `src/tests/api.test.ts`, but the latest generated
  architecture-health signal still flags Operations at route/file granularity.
- Prior ladder avoidance: LUC-3545 already selected Process Core and its local
  integration proof later passed under LUC-2713. Repeating Process Core would
  not reduce the next highest-confidence gap.
- Feasibility: the target can be proven in a bounded ladder without protected
  smoke or production credentials.

## Evidence Reviewed

| Source | Result |
| --- | --- |
| `docs/graphs/architecture-health.json` | Current signal: `implementation_without_tests.count=1161`; Operations API, backend route file, and frontend route remain in the debt items. |
| `docs/planning/luc-4748-known-state-evidence-and-architecture-baseline.md` | Latest completed PM baseline records `implementation_without_tests=1161` and `actionable_implementation_without_tests=1152`; local architecture gates were green. |
| `docs/planning/luc-3545-first-proof-ladder-from-implementation-without-tests.md` | Prior first ladder selected Process Core, so the next proof target should move to a different high-priority workflow. |
| `docs/planning/cc-04-002-operations-work-item-read-model-task-contract.md` | Operations work-items read packet is P0, implemented, and previously verified through API regression. |
| `src/tests/api.test.ts` | Contains Operations work-item assertions for route/MCP exposure, workspace isolation, create/read/filter/patch flows, and scoped capability behavior. |
| `web/src/features/departments/operations-route.tsx` | Frontend consumes `/v1/operations/work-items`, creates/patches work items, edits lists, and renders board/calendar states. |

## Proof Ladder For Follow-Up QA

| Rung | Purpose | Command / method | Pass condition |
| --- | --- | --- | --- |
| 1 | Prove route/capability/MCP static alignment for Operations. | `npm run check:route-capabilities` | PASS with `status=ok`. Completed in this selection lane. |
| 2 | Prove backend compile compatibility for Operations route, auth manifest, MCP manifest, and tests. | `npm run build:server` | TypeScript server build passes. |
| 3 | Prove API behavior against a disposable local test database. | `npm run test:api:local` | Operations assertions in `src/tests/api.test.ts` pass, including auth, workspace isolation, create/read/filter/patch, and scoped capability behavior. |
| 4 | Prove the operator UI consumes the packet and exposes recovery states. | Local web route proof for `/areas?area=04-operacje&view=overview` after authenticated test setup. | Operations board/calendar render with seeded data; create/edit controls call the real API; loading/error/empty states do not expose raw backend errors. |

## Validation Run In This Lane
- `npm run check:route-capabilities`: PASS.
  - `checkedManifestRoutes=180`
  - `checkedRouteFiles=35`
  - `status=ok`

## Classification
Selected target status: implemented, partially verified at current confidence
granularity.

This issue did not find an Operations defect. It converted the broad
implementation-without-test-link signal into a concrete QA follow-up target.
Any repair issue should wait until a proof rung fails with a reproducible
defect.

## Result Report
LUC-4763 is complete for selection scope. The next proof-ladder target is
`04 Operations` work-items, with proof rungs that start from static
route/capability alignment and escalate only as needed to server build, local
API integration, and authenticated UI proof.

No runtime code, schema, migration, protected smoke, deploy, push, restart,
production mutation, credential access, secret disclosure, server, browser,
database, Docker, or watcher process occurred.
