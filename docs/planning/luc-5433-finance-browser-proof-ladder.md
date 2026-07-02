# LUC-5433 Finance Browser Proof Ladder

Date: 2026-06-21
Issue: [LUC-5433](/LUC/issues/LUC-5433)
Parent: [LUC-5423](/LUC/issues/LUC-5423)
Stage: verification

## Task Contract

- Goal: select and prove one non-duplicated sub-flow from the refreshed
  [LUC-5423](/LUC/issues/LUC-5423) app-completion confidence debt.
- Task Type: QA verification
- Current Stage: verification
- Deliverable For This Stage: local browser evidence for the selected Finance
  board sub-flow plus project memory updates.

## Scope

Selected flow: `Subscription and entitlement`.

Selected non-duplicated sub-flow: desktop/tablet/mobile browser proof for the
Finance and Billing board at `/areas?area=07-finanse&view=overview`.

Mapped surfaces:

- `web/src/features/departments/finance-route.tsx`
- `web/src/features/departments/shared.tsx`
- `web/src/hooks/use-owner-packet.ts`
- `web/src/api/client.ts`
- `src/modules/finance/finance.routes.ts`
- `src/auth/capabilities.ts`
- `src/mcp/manifest.ts`
- `scripts/owner-console-ux-smoke.mjs`
- `docs/status/app-completion-index.json`

The selected flow already had recent local API proof in
`docs/planning/luc-5392-subscription-entitlement-finance-proof-ladder.md`.
This task intentionally avoided repeating that API proof and instead verified
the browser projection that was listed as residual risk.

## Exclusions

No product feature code, schema, migration authoring, protected smoke,
production mutation, live credentials, secret access, push, deploy, restart, or
live provider action was performed.

## Implementation Plan

1. Read the [LUC-5423](/LUC/issues/LUC-5423) baseline and app-completion
   queue.
2. Avoid recently proven Account access, Subscription/Entitlement API,
   Dashboard, User configuration, Exchange connection/configuration,
   Strategy/Trading, broad API-backbone, ClickUp/provider task-sync, and
   Company OS approval/automation proof lanes.
3. Reuse the project-native owner console Playwright harness for a focused
   Finance route proof.
4. Run a local disposable database, seed the owner workspace, start a local
   server, and prove the route at desktop/tablet/mobile.
5. Clean validation-owned server, database, and browser resources.
6. Record evidence, residual risk, and source-control state.

## Harness Adjustment

`scripts/owner-console-ux-smoke.mjs` was extended without changing its default
route list:

- `COMPANYCORE_UX_ROUTES` can scope the smoke to a specific route list.
- `COMPANYCORE_UX_VIEWPORTS_JSON` can override viewport definitions.
- `COMPANYCORE_UX_REQUIRED_TEXT_JSON` can assert route-specific content.
- `COMPANYCORE_UX_FULL_PAGE=1` captures full-page screenshots.
- The signed-in assertion now checks the current React auth token in
  `sessionStorage` instead of a legacy `body.is-signed-in` marker.
- Optional desktop interaction checks now run only when their matching route is
  included in the selected route list.

## Verification Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Selected confidence debt | SELECTED | `docs/status/app-completion-index.json` generated `2026-06-21T02:17:29.656Z`; `Subscription and entitlement` remains the largest flow (`500` entities, `484` missing test links, `14` implemented-needs-proof, `2` blocked), but the API posture was already covered by [LUC-5392](/LUC/issues/LUC-5392), so this proof targets the browser sub-flow |
| Build | PASS | `npm run build`; server TypeScript compile PASS and Vite web build PASS |
| Disposable DB migration | PASS | PostgreSQL container `companycore-luc-5433-postgres` on port `55543`; `npm run prisma:migrate:deploy`; all `31` migrations applied |
| Seed | PASS | `npm run seed` against `companycore_test` |
| Local health | PASS | `http://127.0.0.1:31543/health` returned `status=ok`, service `companycore` |
| Browser proof | PASS | `COMPANYCORE_BASE_URL=http://127.0.0.1:31543 COMPANYCORE_UX_ARTIFACT_DIR=docs/ux/evidence/luc-5433-finance-browser-proof COMPANYCORE_UX_ROUTES=/areas?area=07-finanse&view=overview COMPANYCORE_UX_FULL_PAGE=1 COMPANYCORE_UX_REQUIRED_TEXT_JSON=... npm run owner-console:ux-smoke` |
| Browser assertions | PASS | `report.json` generated `2026-06-21T02:39:37.409Z`; desktop/tablet/mobile signed-in state true; required text present for `Finance and Billing Management`, `Invoice readiness`, `Commercial exceptions`, `Pricing model`, and `Blocked write actions`; `consoleIssues=[]` |
| Screenshot artifacts | PASS | `docs/ux/evidence/luc-5433-finance-browser-proof/desktop-areas-area-07-finanse-view-overview.png`, `tablet-areas-area-07-finanse-view-overview.png`, `mobile-areas-area-07-finanse-view-overview.png`, and `report.json` |
| Cleanup | PASS | Validation server on port `31543` stopped; DB container `companycore-luc-5433-postgres` removed; no listener remained on port `55543`; no `chrome-headless-shell` validation process remained |

## Acceptance Criteria

- [x] One non-duplicated flow or sub-flow selected from the
      [LUC-5423](/LUC/issues/LUC-5423) confidence debt.
- [x] Affected code, docs, and tests mapped before validation.
- [x] Smallest safe local proof run through project-native browser automation.
- [x] Validation-owned local resources cleaned.
- [x] Product repair issue created only if proof found a real defect.

## Result Report

Status: `VERIFIED_DONE`.

The Finance and Billing browser projection for the current
Subscription/Entitlement posture is locally verified at desktop, tablet, and
mobile. The route renders the owner-authenticated Finance board, summary
signals, invoice readiness, commercial exceptions, pricing model table, and
blocked write-action guardrails with no browser console issues in the focused
local proof.

No product repair issue is warranted from this proof. The only code change is
a reusable, backward-compatible enhancement to the local owner-console UX smoke
harness so future proof ladders can scope routes and assertions without
duplicating Playwright setup.

Commit status: not committed in this heartbeat because the shared workspace
already contains sibling/generated evidence packets and source-control closure
lanes. Push status: not pushed. Deploy impact: none.

Residual risk: protected production proof remains approval/credential gated.
This proof verifies the local browser projection, not a production signed-in
session.
