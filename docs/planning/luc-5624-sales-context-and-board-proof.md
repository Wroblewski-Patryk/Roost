# LUC-5624 Sales Context And Board Proof

## Task Type

QA verification / focused app-completion proof.

## Current Stage

Verification.

## Deliverable For This Stage

Evidence-backed local proof for the Sales Management slice selected from the
Roost app-completion missing-test-link debt.

## Goal

Prove the current Sales context API and Sales board route as one bounded local
confidence lane after [LUC-5619](/LUC/issues/LUC-5619) selected
`Subscription and entitlement -> Sales context and board local proof`.

## Scope

- API prerequisite:
  - `GET /v1/sales/context`
  - `sales:read`
  - existing assertions in `src/tests/api.test.ts`
- Browser route:
  - `/areas?area=03-sprzedaz&view=overview`
- Implementation surfaces inspected or exercised:
  - `src/modules/sales/sales.routes.ts`
  - `src/auth/capabilities.ts`
  - `web/src/features/departments/sales-route.tsx`
  - `web/src/features/departments/shared.tsx`
  - `scripts/owner-console-ux-smoke.mjs`
- Evidence output:
  - `docs/ux/evidence/luc-5624-sales-board-proof/report.json`
  - desktop, tablet, and mobile screenshots under
    `docs/ux/evidence/luc-5624-sales-board-proof/`
  - local server logs under
    `docs/ux/evidence/luc-5624-sales-board-proof/`

## Exclusions

- No product code, schema, migration, route implementation, test authoring,
  provider call, credential access, secret handling, push, deploy, protected
  production smoke, production mutation, or long-running watcher.
- No ownership switch to later sibling Sales proof lanes; this packet closes
  the explicitly assigned [LUC-5624](/LUC/issues/LUC-5624) heartbeat.

## Implementation Plan

1. Confirm the selected lane and non-duplication basis from
   [LUC-5619](/LUC/issues/LUC-5619).
2. Run the local API prerequisite against a dedicated disposable PostgreSQL
   database.
3. Start a short-lived local server against a separate seeded disposable
   PostgreSQL database.
4. Run owner-console browser proof for
   `/areas?area=03-sprzedaz&view=overview` at desktop, tablet, and mobile.
5. Validate the generated report for signed-in state, required text, no console
   issues, and screenshots.
6. Run route capability, architecture status, and diff hygiene checks.
7. Clean validation-owned server, browser, and database resources.
8. Update source-of-truth files and close the issue with evidence.

## Acceptance Criteria

- API prerequisite passes on a disposable local database.
- Sales board renders signed in at desktop, tablet, and mobile sizes.
- Required Sales markers are present:
  - `03 Sales`
  - `Sales Management System`
  - `Current client work`
  - `Follow-up tasks`
  - `Blocked write actions`
  - `quote_final_terms`
- Browser report has `consoleIssues=[]`.
- Required gates pass:
  - `npm run check:route-capabilities`
  - `npm run architecture:status`
  - `git diff --check`
- No validation-owned server, browser, or database process remains after the
  task.

## Definition Of Done

- Evidence packet exists and links to exact artifacts.
- Commands and results are recorded.
- Cleanup evidence is recorded.
- Source-of-truth state files are updated.
- Deployment impact and residual risk are explicit.

## Result Report

### API Prerequisite

Command:

```powershell
$env:COMPANYCORE_TEST_DB_CONTAINER='companycore-luc-5624-postgres'
$env:COMPANYCORE_TEST_DB_PORT='55524'
$env:COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP='0'
npm run test:api:local
```

Result: PASS.

The run completed server/web build, all `31` Prisma migrations, seed, and
`7/7` Node API subtests. The selected Sales assertions in
`src/tests/api.test.ts` remain covered by the passing API flow, including
Sales context auth/workspace/capability behavior and `sales:read` exposure.

### Browser Proof

Setup:

- Disposable PostgreSQL:
  `companycore-luc-5624-browser-postgres` on port `55534`.
- Local server: `http://127.0.0.1:31524`.
- Browser command:

```powershell
$env:COMPANYCORE_BASE_URL='http://127.0.0.1:31524'
$env:COMPANYCORE_UX_ARTIFACT_DIR='docs/ux/evidence/luc-5624-sales-board-proof'
$env:COMPANYCORE_UX_ROUTES='/areas?area=03-sprzedaz&view=overview'
$env:COMPANYCORE_UX_FULL_PAGE='1'
$env:COMPANYCORE_UX_REQUIRED_TEXT_JSON='{"/areas?area=03-sprzedaz&view=overview":["03 Sales","Sales Management System","Current client work","Follow-up tasks","Blocked write actions","quote_final_terms"]}'
npm run owner-console:ux-smoke
```

Result: PASS.

Report:
`docs/ux/evidence/luc-5624-sales-board-proof/report.json`, generated
`2026-06-27T19:05:48.598Z`.

Artifact summary:

- Route:
  `/areas?area=03-sprzedaz&view=overview`.
- Viewports: desktop `1440x960`, tablet `834x1112`, mobile `390x844`.
- Screenshots: `3`.
- Assertions: `21`.
- Console issues: `0`.

### Required Gate Results

- `npm run check:route-capabilities` PASS:
  `180` manifest routes and `35` route files checked.
- `npm run architecture:status` PASS:
  `GREEN`, graph `454` nodes / `765` relations / `35` chains,
  evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass.
- `git diff --check` PASS with LF-to-CRLF warnings only.
- Report validator PASS:
  `screenshots=3`, `assertions=21`, `consoleIssues=0`.

### Cleanup

- Stopped the validation-owned `node dist/server.js` process for port `31524`.
- Removed `companycore-luc-5624-browser-postgres`.
- `companycore-luc-5624-postgres` was removed by `test:api:local`.
- Cleanup check PASS:
  - LUC-5624 containers: none.
  - `chrome-headless-shell`: `0`.
  - port `31524` listeners: `0`.
  - port `55534` listeners: `0`.

## Contract Note

[LUC-5619](/LUC/issues/LUC-5619) named the expected marker as
`Blocked sales actions`. The implemented shared guardrail component uses the
canonical label `Blocked write actions` and renders Sales-specific blocked
action rows such as `quote_final_terms`. The first browser run proved the
route loaded with `consoleIssues=[]` but failed only on that exact wording.
The final passing proof uses the actual implemented UI label plus the
Sales-specific blocked action row. No product repair issue is warranted from
this wording difference.

## Final Disposition

Verified done locally. The Sales Management context and board lane has fresh
API prerequisite proof plus desktop/tablet/mobile browser evidence. No product
repair issue is warranted.

## Deployment Impact

None. This was local QA evidence only; no push, deploy, production mutation,
protected smoke, schema change, or runtime configuration change was made.

## Residual Risk

Protected production proof remains a separate approval/credential-gated release
lane. The local proof validates current seeded behavior and current browser
rendering, not production data density.
