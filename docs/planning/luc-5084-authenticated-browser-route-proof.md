# LUC-5084 Authenticated Browser Route Proof

## Task Contract

- Task Type: QA verification / authenticated browser proof
- Current Stage: verification
- Deliverable For This Stage: one release-critical authenticated browser route proof from the [LUC-5065](/LUC/issues/LUC-5065) ladder, with cleanup evidence and residual risk for [LUC-5084](/LUC/issues/LUC-5084).

## Goal

Prove one authenticated browser route from the release-critical ladder using a
real local CompanyCore API, local database, browser registration, route
rendering, screenshots, and cleanup checks.

## Scope

- Included:
  - Select one route from the [LUC-5065](/LUC/issues/LUC-5065) release-critical
    ladder.
  - Start only local validation-owned infrastructure.
  - Register an owner through the browser.
  - Verify authenticated redirect and render for
    `/areas?area=00-ogolny&view=overview`.
  - Capture desktop and mobile screenshots.
  - Record console/page/network/overflow checks.
  - Clean validation-owned browser, server, and database resources.
- Excluded:
  - Product code changes, schema changes, migrations authoring, deploy, push,
    protected smoke, production mutation, restart of existing services,
    credential access, secret disclosure, or production data access.

## Implementation Plan

1. Read the [LUC-5065](/LUC/issues/LUC-5065) proof ladder and choose the
   smallest route that covers auth/session plus owner shell readiness.
2. Build the app, migrate and seed a validation-owned local PostgreSQL
   container.
3. Start a validation-owned local CompanyCore server.
4. Use Playwright Chromium to register an owner and verify the authenticated
   post-auth route.
5. Capture evidence artifacts and cleanup local resources.
6. Update source-of-truth state and Paperclip disposition.

## Acceptance Criteria

- [x] Browser registration creates an owner session.
- [x] Browser lands on `/areas?area=00-ogolny&view=overview`.
- [x] The route renders visible dashboard command content.
- [x] Desktop and mobile evidence screenshots are captured.
- [x] No browser console/page/network failures or horizontal overflow are
      recorded.
- [x] Validation-owned browser, server, and database resources are cleaned up.

## Selected Route

| Route | Ladder Coverage | Reason |
| --- | --- | --- |
| `/areas?area=00-ogolny&view=overview` | Rung 1 owner auth/session boundary and rung 3 owner console shell/dashboard readiness | It is the canonical post-auth owner route and proves that a newly registered owner can enter the release-critical shell through the browser. |

## Verification Run

- Command:
  `node .tmp\luc-5084-auth-route-proof.mjs`.
- Result: PASS. The outer shell command timed out after the proof had already
  written its result file, so the validation-owned local server on port `3284`
  was stopped manually by confirmed PID/command-line readback before final
  cleanup.
- Build/migration/seed:
  - `npm run build` passed.
  - `npm run prisma:migrate:deploy` passed against disposable local
    PostgreSQL container `companycore-luc-5084-postgres` on port `55484`.
  - `npm run seed` passed against the same validation database.
- Browser proof:
  - Desktop `1366x900`: registered a new owner, reached
    `http://127.0.0.1:3284/areas?area=00-ogolny&view=overview`, rendered
    `Command packet` and `Next actions`, no console errors, page errors,
    failed requests, bad `/v1` responses, or horizontal overflow.
  - Mobile `390x844`: registered a new owner, reached
    `http://127.0.0.1:3284/areas?area=00-ogolny&view=overview`, rendered
    `Command packet` and `Next actions`, no console errors, page errors,
    failed requests, bad `/v1` responses, or horizontal overflow.
- Evidence artifacts:
  - `docs/ux/evidence/luc-5084-authenticated-00-dashboard-proof.json`
  - `docs/ux/evidence/luc-5084-authenticated-00-dashboard-desktop.png`
  - `docs/ux/evidence/luc-5084-authenticated-00-dashboard-mobile.png`
- Cleanup proof:
  - `docker ps -a --filter "name=companycore-luc-5084-postgres"` returned no
    rows.
  - `Get-NetTCPConnection -LocalPort 3284 -ErrorAction SilentlyContinue`
    returned no rows after stopping the validation-owned `node dist/server.js`
    PID.
  - `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue`
    returned no rows.

## Result Report

Status: `VERIFIED_DONE`.

What is verified:

- A browser-created owner session can enter the canonical authenticated
  CompanyCore dashboard route from the release-critical ladder.
- The route renders command-ready owner shell content on desktop and mobile.
- The local proof used a real built web app, real local API, migrations, seed,
  and disposable PostgreSQL database rather than mocked browser data.

Residual risk:

- This is local browser evidence only. Protected production proof remains
  release/credential gated and outside [LUC-5084](/LUC/issues/LUC-5084).
- The proof covers one route, by design. The next QA slice should select
  another single ladder route only when it adds release confidence.

No product code, schema, migration authoring, push, deploy, protected smoke,
production mutation, restart of existing services, credential access, secret
disclosure, or production data access occurred.
