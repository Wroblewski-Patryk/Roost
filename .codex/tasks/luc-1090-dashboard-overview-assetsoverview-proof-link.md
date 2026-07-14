# LUC-1090 Dashboard Overview AssetsOverview Proof Link

Date: 2026-07-14
Issue: [LUC-1090](/LUC/issues/LUC-1090)
Task Type: frontend verification / proof-link repair
Current Stage: verification
Deliverable For This Stage: focused local browser proof for `AssetsOverview`,
linked evidence for the exact function entity, regenerated readback, and
source-of-truth closure.

## Goal

Prove the Dashboard overview `missing_test_link` for
`web/src/features/departments/assets-route.tsx#AssetsOverview` with the
smallest route-level browser evidence that directly renders the overview
surface.

## Scope

- `web/src/features/departments/assets-route.tsx#AssetsOverview`
- `scripts/luc-1090-assets-overview-proof.mjs`
- `docs/planning/luc-1090-dashboard-overview-assetsoverview-proof.md`
- `docs/architecture/scanner-overrides.json`
- `docs/testing/test-map.csv`
- `docs/ux/evidence/luc-1090-assets-overview-proof/`
- generated architecture/app-completion/Project Truth readback after refresh
- required project state updates for the routed proof lane

## Implementation Plan

1. Add a focused local Playwright/browser harness that serves the built React
   bundle, mocks the authenticated Assets overview packet, and records bearer
   headers plus desktop/mobile evidence.
2. Run the smallest relevant validation: `npm run build:web`, the focused proof
   script, readback refresh, and `npm run architecture:status`.
3. Link the evidence to the exact `AssetsOverview` function row, update the test
   map and durable state files, then close the routed `missing_test_link` if
   readback confirms it.

## Acceptance Criteria

- The proof directly renders `/areas?area=08-zasoby&view=overview`.
- The proof records bearer-auth requests for `/v1/auth/me`, `/v1/departments`,
  and `/v1/assets/context`.
- The overview title, description, summary cards, and files CTA are evidenced
  on desktop and mobile with no runtime errors or horizontal overflow.
- The refreshed readback no longer reports
  `web/src/features/departments/assets-route.tsx#AssetsOverview` as
  `missing_test_link`.

## Definition Of Done

- A repo-owned proof packet exists with script, report, screenshots, and a
  planning artifact for `LUC-1090`.
- `docs/architecture/scanner-overrides.json` and `docs/testing/test-map.csv`
  link the proof to the exact entity.
- Validation evidence is recorded, and durable state files point to the next
  routed gap after `AssetsOverview`.

## Result Report

Focused proof completed locally: `npm run build:web` PASS and
`node scripts/luc-1090-assets-overview-proof.mjs` PASS. The report under
`docs/ux/evidence/luc-1090-assets-overview-proof/report.json` shows the live
Assets overview route rendered its heading, description, summary cards, and
files CTA on desktop and mobile; all `/v1/auth/me`, `/v1/departments`, and
`/v1/assets/context` requests carried `Authorization: Bearer
luc-1090-proof-token`; and there were no console/page errors or horizontal
overflow. `npm run architecture:refresh` PASS; external architecture-awareness
refresh generated `2026-07-14T12:39:31.558Z` with `3015` entities / `7465`
relations / `16521` files; sequential app-completion refresh generated `1282`
items / `5` flows / `1113` missing test links / `30` missing doc links /
`8` implemented-needs-proof / `0` blocked / `1151` risk items and no longer
reports `AssetsOverview`; Project Truth apply generated
`2026-07-14T12:39:43.507Z` with public probes `pass` and advanced the first
gap to Trading operation `src/app.ts#/strategy`; `npm run architecture:status`
PASS (`GREEN`, `454/765/35`, evidence queue `0`, chain worklist `0`).
