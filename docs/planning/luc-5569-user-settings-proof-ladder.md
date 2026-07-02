# LUC-5569 User Settings Proof Ladder

## Task Type

QA verification / focused proof ladder.

## Current Stage

Verification.

## Deliverable For This Stage

Evidence-backed local proof for one non-duplicated implementation-without-tests
confidence lane.

## Goal

Close one focused QA proof ladder from Roost implementation-without-tests debt
without adding product code or duplicating recent Account access, Finance,
Dashboard, Exchange, Strategy, Company OS, ClickUp/provider, or broad API
backbone proof lanes.

## Scope

- Selected user journey: User configuration settings.
- Backend/API prerequisite:
  - `src/tests/api.test.ts`
  - auth, workspace, integration settings, and API key route assertions already
    present in the API suite.
- Browser routes:
  - `/account/settings`
  - `/workspace/settings`
- Browser implementation surfaces:
  - `web/src/features/settings/settings-routes.tsx`
  - `web/src/layout/shell.tsx`
  - `web/src/app-route-registry.ts`
  - `web/src/main.tsx`
  - `scripts/owner-console-ux-smoke.mjs`
- Evidence output:
  - `docs/ux/evidence/luc-5569-user-settings-proof/report.json`
  - desktop/tablet/mobile screenshots under
    `docs/ux/evidence/luc-5569-user-settings-proof/`

## Exclusions

- No product feature code, schema, migrations, route implementation, or test
  authoring.
- No push, deploy, protected production smoke, production mutation, live
  provider action, credential access, or secret disclosure.
- No broad workspace validation beyond the selected route/API proof.

## Implementation Plan

1. Use recent QA history to avoid duplicated lanes.
2. Run the local API prerequisite against a dedicated disposable PostgreSQL
   database.
3. Start a short-lived local server against a fresh seeded disposable database.
4. Run owner-console browser proof for `/account/settings` and
   `/workspace/settings` at desktop, tablet, and mobile sizes.
5. Validate generated report assertions and no-console condition.
6. Run route capability, architecture status, and diff hygiene checks.
7. Clean validation-owned server, browser, and database resources.
8. Update project source-of-truth files with evidence and residual risk.

## Acceptance Criteria

- API prerequisite passes on a disposable local database.
- Settings routes render with a signed-in owner session on desktop, tablet, and
  mobile.
- Required user-visible settings text appears on each target route.
- Browser report has `consoleIssues=[]`.
- No validation-owned server, browser, or database process remains after the
  task.
- No product repair issue is created unless proof finds a real defect.

## Definition Of Done

- Evidence packet exists and links to exact artifacts.
- Commands and results are recorded.
- Cleanup evidence is recorded.
- Source-of-truth state files are updated.
- Deployment impact and residual risk are explicit.

## Result Report

### Selected Ladder

User configuration settings, narrowed to the current implemented settings
routes: `/account/settings` and `/workspace/settings`.

Non-duplication basis:

- [LUC-5561](/LUC/issues/LUC-5561) already verified Account access locally.
- [LUC-5433](/LUC/issues/LUC-5433) already verified a Finance browser
  entitlement projection.
- [LUC-5402](/LUC/issues/LUC-5402) previously verified User configuration API
  posture; this packet adds fresh local API prerequisite plus browser route
  proof for the current React settings routes.
- Recent packets already cover Dashboard, Exchange, Strategy, Company OS,
  ClickUp/provider task sync, intake routing, relationships/operating graph,
  and broad API backbone lanes.

### Evidence

- API prerequisite:
  `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5569-postgres`
  `COMPANYCORE_TEST_DB_PORT=55569`
  `COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local`
  PASS. The run completed server/web build, all `31` migrations, seed, and
  `7/7` Node API subtests.
- Browser setup:
  disposable PostgreSQL `companycore-luc-5569-browser-postgres` on port
  `55579`; local server `http://127.0.0.1:31569`; `/health` returned
  `status=ok`.
- Browser proof:
  `npm run owner-console:ux-smoke` with
  `COMPANYCORE_UX_ROUTES=/account/settings,/workspace/settings`,
  desktop `1440x960`, tablet `834x1112`, and mobile `390x844`.
  The shell command timed out after the report and screenshots were written,
  so the proof was validated by parsing the generated report.
- Report validation:
  `node -e "...report assertion validator..."` PASS:
  `report assertions pass 2 3 6`.
- Route capability:
  `npm run check:route-capabilities` PASS (`180` manifest routes /
  `35` route files).
- Architecture status:
  `npm run architecture:status` PASS (`GREEN`, graph `454/765/35`, evidence
  queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass).
- Diff hygiene:
  `git diff --check` PASS with LF-to-CRLF warnings only.

### Browser Artifact Summary

`docs/ux/evidence/luc-5569-user-settings-proof/report.json` generated
`2026-06-27T18:33:31.766Z`.

- Routes: `/account/settings`, `/workspace/settings`.
- Viewports: desktop, tablet, mobile.
- Screenshots: `6`.
- Required text assertions:
  - `/account/settings`: `Account settings`, `Workspace role`.
  - `/workspace/settings`: `Workspace settings`, `Integrations and API`,
    `API keys`.
- Signed-in assertions: true for every route and viewport.
- Console issues: `[]`.

### Cleanup

- Stopped validation-owned `node dist/server.js` process for port `31569`.
- Removed `companycore-luc-5569-browser-postgres`.
- Confirmed no listener remains on port `55579`.
- Confirmed port `31569` has only `TIME_WAIT` entries and no listening owner.
- Confirmed `chromeHeadlessShell=0`.
- Removed leftover test container name if present:
  `companycore-luc-5569-postgres`.

## Final Disposition

Verified done locally. The selected User configuration settings lane now has
fresh API prerequisite proof plus desktop/tablet/mobile browser evidence. No
product repair issue is warranted.

## Deployment Impact

None. This was local QA evidence only; no production, deploy, push, schema, or
runtime configuration changes were made.

## Residual Risk

Protected production proof remains a separate approval/credential-gated release
lane. The owner-console smoke command timed out after writing a passing report,
so future harness hardening may investigate why the process did not exit
cleanly after artifact generation.
