# LUC-2491 Known-State Evidence Delta and Repair Lanes

- Task type: known-state refresh / routing
- Current stage: verification
- Status: routed
- Owner: Roost Product Manager
- Source: [LUC-2491](/LUC/issues/LUC-2491)
- Generated baseline: 2026-08-04T02:28:54.356Z

## Goal

Refresh the smallest local evidence set needed to distinguish a current defect
from broad generated confidence debt and create one-owner, non-production
repair lanes.

## Evidence delta

| Area | Result | Evidence | Disposition |
| --- | --- | --- | --- |
| Architecture awareness | PASS | `node scripts/build-architecture-awareness-index.mjs --project Roost --root C:\\Personal\\Projekty\\Aplikacje\\Roost` from `Paperclip_Softwarehouse`; 2,815 entities, 4,861 relations, 2,141 files | Fresh generated exports; no task-link, owner, disconnected-entity, or verified-without-proof gap. |
| Deployment/source alignment | PASS (read-only) | `docs/status/project-truth-index.json`: source, upstream, and deployed SHA `4d975864...`; probe `pass` | Protected deploy/smoke work was not run. |
| Route capability contract | FAIL | `npm run check:route-capabilities` reports `No protected mount classification for product-map-projection.routes.ts` | Concrete local repair is owned by [LUC-2494](/LUC/issues/LUC-2494). |
| App-completion evidence links | PARTIALLY VERIFIED | Current index: 48 items, 44 `missing_test_link`, 0 missing docs, 0 blocked/runtime findings. Existing dashboard, strategy, and integration-settings assertions are present in `src/tests/api.test.ts`, but mounted `src/app.ts` entities lack inferred links. | Linkage classification/repair is owned by [LUC-2495](/LUC/issues/LUC-2495); aggregate debt is not treated as 44 confirmed broken flows. |

## Known user-facing flow state

| Flow group | State | Reason |
| --- | --- | --- |
| Dashboard overview | Partially verified | Existing dashboard command API and historic browser proof are mapped, but the current mounted-route item lacks an inferred test link. |
| Trading operation / strategy | Partially verified | Strategy context assertions exist in `src/tests/api.test.ts`; generated mounted-route linkage remains absent. |
| User configuration / integration settings | Partially verified | Integration-settings API coverage exists in `src/tests/api.test.ts`; generated mounted-route linkage remains absent. |
| Product-map projection | Failed static contract | The route-capability checker cannot classify its router mount. This is the only reproduced local functional-contract failure in this refresh. |
| Remaining unclassified mounted routes | Unknown confidence | They remain generated missing-link debt pending the bounded mapping analysis; no runtime failure was reproduced. |

## Repair lanes

1. [LUC-2494](/LUC/issues/LUC-2494) — Engineering Delivery Lead: classify the product-map projection router using the existing protected-mount contract and prove the static route check passes.
2. [LUC-2495](/LUC/issues/LUC-2495) — Test Automation Engineer: reconcile the test-map/architecture relation producer for mounted `src/app.ts` routes, regenerate the completion index, and report any residual genuinely untested routes.

## Constraints and source-control decision

- No push, deploy, restart, production smoke, live-account action, or credential access occurred.
- This checkpoint refreshed generated, ignored architecture/status exports and added this planning evidence packet. The worktree already contained unrelated untracked LUC-2469/LUC-2485 artifacts; no mixed commit is safe or required for this routing checkpoint.
- The two repair lanes own any code or test-map mutation and their own source-control closure.

## Result report

The refresh is complete: one concrete static defect and one bounded evidence-linkage concern are now separately owned. The architecture inventory itself is fresh and has no missing task ownership, disconnected entities, or verified-without-proof rows. No product-runtime health claim is made beyond the focused evidence above.
