# Task

## Header
- ID: LUC-1833
- Title: Publish the versioned owner-facing product map UI
- Task Type: feature
- Current Stage: implementation
- Status: IN_PROGRESS
- Owner: Roost Project Manager
- Depends on: docs/maps/product-map.md, web/src/app-route-registry.ts, web/src/main.tsx, web/src/features/departments/core-area-data.ts, web/src/features/departments/general-dashboard.tsx
- Priority: high
- Mission ID: LUC-1833-PRODUCT-MAP-UI
- Mission Status: IN_PROGRESS

## Goal
Publish the versioned owner-facing product map UI in the authenticated 00 General shell.

## Scope
- `web/src/app-route-registry.ts`
- `web/src/main.tsx`
- `web/src/features/departments/core-area-data.ts`
- `web/src/features/departments/general-dashboard.tsx`
- `web/src/features/departments/product-map-route.tsx`
- `web/src/i18n/messages.ts`
- `docs/maps/product-map.md`
- `.agents/state/active-mission.md`
- `.agents/state/current-focus.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/next-steps.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan
1. Wire a canonical 00 General product-map route into the React shell.
2. Render the versioned authority matrix, conflict rules, and use cases in a readable layout.
3. Expose the new view from the 00 General navigation and dashboard.
4. Update the product-map doc and state files to reference the canonical UI path.
5. Verify the route with a focused build and browser proof.

## Acceptance Criteria
- [ ] The 00 General shell exposes a private product-map view.
- [ ] The view shows source SHA, deployed SHA, freshness boundary, and readiness verdict separately.
- [ ] The dashboard and docs point to the canonical product-map route.
- [ ] The implementation is verified in browser/build evidence.

## Definition of Done
- [ ] Code builds without errors.
- [ ] The route works in the real UI after reload/navigation.
- [ ] No placeholder or fake truth remains.
- [ ] Documentation and repo state point to the canonical route.
- [ ] Validation evidence is recorded.
- [ ] `DEFINITION_OF_DONE.md` is checked before closing.

## Result Report
- Status: complete
- Notes: `npm run build` PASS; browser proof PASS on `http://127.0.0.1:3102/areas?area=00-ogolny&view=overview` -> `Open product map` -> `/areas?area=00-ogolny&view=product-map`, with the loaded product map showing separate source SHA, deployed SHA, freshness boundary, and readiness verdict; reload proof PASS on the canonical route; screenshot artifact captured at `C:\Users\wrobl\AppData\Local\Temp\roost-luc-1833-product-map-final.png`.
