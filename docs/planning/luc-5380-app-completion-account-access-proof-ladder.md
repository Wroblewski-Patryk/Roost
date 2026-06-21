# LUC-5380 App-Completion Account Access Proof Ladder

## Header
- ID: LUC-5380
- Title: Roost QA proof-ladder selection from LUC-5377 app-completion confidence debt
- Task Type: QA verification
- Current Stage: verification
- Status: DONE
- Owner: QA and Verification Engineer
- Priority: P1
- Mission ID: LUC-5380-APP-COMPLETION-ACCOUNT-ACCESS-PROOF
- Mission Status: VERIFIED_DONE

## Goal
Select and run one focused QA proof ladder from the
[LUC-5377](/LUC/issues/LUC-5377) app-completion confidence debt without broad
test generation, feature implementation, or protected actions.

## Scope
- Parent evidence packet:
  `docs/planning/luc-5377-known-state-evidence-and-architecture-baseline.md`
- Refreshed app-completion index:
  `docs/status/app-completion-index.md`
  and `docs/status/app-completion-index.json`
- Selected flow: `Account access`
- Selected local browser routes:
  - `/areas?area=00-ogolny&view=overview`
  - `/account/settings`
  - `/workspace/settings`
- Existing validation harnesses:
  - `npm run build`
  - `npm run prisma:migrate:deploy`
  - `npm run seed`
  - Playwright Chromium against a validation-owned local server
  - `npm run check:route-capabilities`
  - `npm run architecture:status`

## Explicit Exclusions
- No product code, schema, migration authoring, push, deploy, restart of user
  processes, protected smoke, production mutation, credential access, secret
  disclosure, live provider action, or live account mutation.

## Selection Rationale
The [LUC-5377](/LUC/issues/LUC-5377) app-completion refresh reported `820`
items, `7` flows, `791` missing test links, `10` browser/screenshot review
needs, and `2` blocked items. Prior QA proof ladders already verified the
backend/API side for Auth/Workspace/API-key, Department/Workforce, read-only
department packets, Relationship/Operating Graph, Intake routing, Tasks,
Google Drive, Integration Settings, and Agent Events.

Because the refreshed app-completion priority queue still starts with
Account-access/auth entities, the next highest-value QA slice is not another
backend-only API rerun. It is a real local authenticated browser proof that a
seeded owner can enter the current React shell, render the canonical post-auth
dashboard, and reach account/workspace settings with no console, request, or
overflow failures.

## Affected Entities And Files

| Area | Evidence |
| --- | --- |
| User flow | `Account access` from `docs/status/app-completion-index.md` |
| Routes | `/areas?area=00-ogolny&view=overview`, `/account/settings`, `/workspace/settings` |
| Auth/session path | `web/src/api/auth-token.ts`, `web/src/features/auth/auth-pages.tsx`, `src/modules/auth/auth.routes.ts` |
| Route registry | `web/src/app-route-registry.ts` |
| API/server | `src/app.ts`, `src/server.ts`, `src/config/env.ts` |
| Seeded owner/database | `prisma/seed.ts`, all `31` migrations via `prisma migrate deploy` |
| Existing stale harness finding | `scripts/owner-console-ux-smoke.mjs` still waits for legacy `body.is-signed-in`; it timed out and should be treated as harness drift, not product failure |

## Verification Run

| Check | Result | Evidence |
| --- | --- | --- |
| Preflight cleanup check | PASS | No existing `companycore-luc-5380-postgres` container, no listener on port `3280`, no `chrome-headless-shell` process |
| First attempt with existing UX smoke | HARNESS DRIFT | Build, migrations, seed, route-capability, and architecture status passed, but `scripts/owner-console-ux-smoke.mjs` timed out waiting for legacy `body.is-signed-in` on the current React shell |
| Current-shell browser proof | PASS | Playwright logged in through real `/v1/auth/login`, injected the owner token through `companycoreOwnerToken`, rendered selected routes, captured screenshots, and reported no missing text, no horizontal overflow, no console issues, and no failed `/v1` responses |
| `npm run build` | PASS | Server TypeScript build and Vite web build passed |
| `npm run prisma:migrate:deploy` | PASS | Applied all `31` migrations to disposable PostgreSQL `companycore-luc-5380-postgres` on port `55580` |
| `npm run seed` | PASS | Seeded owner/workspace/API data into the disposable validation database |
| `npm run check:route-capabilities` | PASS | `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok` |
| `npm run architecture:status` | PASS | `GREEN`; graph `454` nodes / `765` relations / `35` chains; evidence queue `0`; chain worklist `0`; delta `0/0/0`; all gates pass |
| Cleanup | PASS | Disposable PostgreSQL container removed, port `3280` not listening, no `chrome-headless-shell` process remains |

## Evidence Artifacts
- `docs/ux/evidence/luc-5380-account-access-browser-proof-2026-06-21/current-shell-report.json`
- `docs/ux/evidence/luc-5380-account-access-browser-proof-2026-06-21/luc-5380-summary.json`
- `docs/ux/evidence/luc-5380-account-access-browser-proof-2026-06-21/desktop-general.png`
- `docs/ux/evidence/luc-5380-account-access-browser-proof-2026-06-21/mobile-general.png`
- `docs/ux/evidence/luc-5380-account-access-browser-proof-2026-06-21/desktop-account-settings.png`
- `docs/ux/evidence/luc-5380-account-access-browser-proof-2026-06-21/desktop-workspace-settings.png`

## Acceptance Criteria
- [x] One high-risk app-completion flow is selected from the refreshed
      confidence debt.
- [x] Selected flow is mapped to routes, files, and existing proof history.
- [x] Smallest safe local proof runs against real local build, API, database,
      migrations, seed data, and browser rendering.
- [x] Desktop/mobile/account/workspace evidence is captured.
- [x] No console, failed `/v1` response, or horizontal-overflow issue is found.
- [x] Route-capability and architecture status gates remain green.
- [x] Local validation-owned server, browser, and database resources are
      cleaned up.

## Result Report
Status: `VERIFIED_DONE`.

The next focused QA proof ladder from the [LUC-5377](/LUC/issues/LUC-5377)
app-completion confidence debt is complete. Account-access browser confidence
is now locally verified for the current React shell and canonical post-auth
dashboard plus account/workspace settings. No product defect or repair issue is
warranted from this proof.

Residual risks:
- Protected production/browser proof remains release/credential gated.
- `scripts/owner-console-ux-smoke.mjs` has legacy selector drift and should be
  modernized in a future QA-harness maintenance lane if that script remains a
  required reusable gate.
- Source-control closure for concurrent generated/status evidence remains owned
  by the active PM/source-control sidecar lane, not this QA proof issue.

Deploy impact: none.
Push status: held / not requested.
