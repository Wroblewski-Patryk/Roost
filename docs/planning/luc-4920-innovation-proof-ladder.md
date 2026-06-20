# LUC-4920 Innovation Operating Graph Overview Proof Ladder

## Task Type

QA verification / regression evidence.

## Current Stage

Verification.

## Goal

Verify the `11 Innovation` department-system operating graph overview with the
smallest safe local proof ladder after the verified Legal route.

## Scope

- Route: `/areas?area=11-innowacje&view=overview`
- Frontend files:
  - `web/src/features/departments/innovation-route.tsx`
  - `web/src/app-route-registry.ts`
  - `web/src/main.tsx`
- API packet:
  - `GET /v1/operating-graph/areas/11-innowacje?limit=80`
- Capability:
  - `operating-graph:read`
- Evidence artifacts:
  - `docs/ux/evidence/luc-4920-innovation-proof-ladder-2026-06-20/`

## Implementation Plan

1. Inspect route, registry, API packet, and capability mapping.
2. Run static route/capability validation.
3. Run the local API proof rung against a disposable validation database.
4. Start a local backend against the kept validation database.
5. Register a disposable local owner and run authenticated desktop/mobile
   Playwright proof.
6. Verify synthetic backend failure copy does not leak raw backend details.
7. Clean up server, validation database container, headless browser state, and
   disposable local token material.
8. Record source-of-truth evidence and issue disposition.

## Acceptance Criteria

- Exact route, API, capability, and files are recorded.
- `npm run check:route-capabilities` passes.
- Local API proof passes before browser proof.
- Desktop and mobile browser proof verifies route identity, Innovation area
  signal, graph rows or honest empty state, safe error state, no raw backend
  leakage, no relevant console/page errors, no relevant failed requests, and
  no horizontal overflow.
- Local validation resources are cleaned up.
- A repair issue is opened only if a reproducible failing product rung is
  found.

## Definition Of Done

- Static route/capability check: verified.
- Local API, migrations, seed, and regression tests: verified.
- Real authenticated browser route: verified on desktop and mobile.
- Error-state safety: verified with synthetic backend failure.
- Cleanup: verified.
- Documentation/state updates: completed.
- Protected actions: not performed.

## Result Report

Status: `VERIFIED_DONE`.

Evidence:

- Static inspection confirmed `InnovationRoute` consumes
  `/v1/operating-graph/areas/11-innowacje?limit=80`, and route registry/main
  route `/areas?area=11-innowacje&view=overview` to the Innovation view.
- `npm run check:route-capabilities` PASS:
  `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`.
- `COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` PASS after server/web
  build, all `31` migrations, seed, and `7/7` API subtests.
- API preflight verified the route-key alias contract:
  request/canonical key `11-innowacje`, resolved backend area key
  `ai-agents-observability`, `5` nodes, `4` edges, and `1` gap.
- MCP manifest preflight verified `GET /v1/operating-graph/areas/:areaKey`
  exposes capability `operating-graph:read`.
- Authenticated Playwright Chromium proof on local backend port `3240` PASS:
  desktop `1366x900` and mobile `390x844` rendered route identity,
  `11 Innovation`, backend area signal `AI agents and observability`, and
  `5` graph rows; both had no relevant failed requests, no console issues,
  and no horizontal overflow.
- Synthetic backend failure PASS: the route displayed
  `CompanyCore hit a server problem. Try again in a moment.` and did not leak
  injected raw text `RAW_PROVIDER_STACK`, `password=secret`, `Prisma`, or
  stack details.
- Evidence files:
  - `docs/ux/evidence/luc-4920-innovation-proof-ladder-2026-06-20/desktop-1366x900.png`
  - `docs/ux/evidence/luc-4920-innovation-proof-ladder-2026-06-20/mobile-390x844.png`
  - `docs/ux/evidence/luc-4920-innovation-proof-ladder-2026-06-20/desktop-error-state.png`
  - `docs/ux/evidence/luc-4920-innovation-proof-ladder-2026-06-20/result.json`

Cleanup:

- Local backend PID `42796` on port `3240` stopped.
- `companycore-test-postgres` validation container removed.
- No `chrome-headless-shell` process rows remained.
- Disposable local owner token file and temporary Playwright harness were
  removed.

No repair issue was opened because no reproducible failing product rung was
found. No implementation, schema, migration authoring, push, deploy, restart,
protected smoke, production mutation, credential access, secret disclosure, or
production data access occurred.

Source control:

- Commit: not created in this QA heartbeat because the shared workspace already
  contained unrelated dirty/staged source-of-truth and generated files from
  adjacent Roost lanes.
- Push status: not needed.
- Deploy impact: none.
