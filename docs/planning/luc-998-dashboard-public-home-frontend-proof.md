# LUC-998 Dashboard And Public Home Frontend Proof

Date: 2026-07-14
Issue: [LUC-998](/LUC/issues/LUC-998)
Stage: verification

## Task Contract

- Goal: add current frontend/browser proof for the public home and dashboard
  overview route family.
- Task Type: frontend verification / proof-link repair.
- Current Stage: verification.
- Deliverable For This Stage: current browser proof, linked evidence for the
  exact route entities, regenerated readback, and source-of-truth closure.

## Scope

Indexed gaps:

- `web/src/features/departments/general-dashboard.tsx`
- `web/src/features/departments/general-dashboard.tsx#GeneralDashboard`
- `web/src/features/departments/general-dashboard.tsx#healthTone`
- `web/src/features/departments/general-dashboard.tsx#itemMeta`
- `web/src/features/public/public-home.tsx`
- `web/src/features/public/public-home.tsx#HeroTopology`
- `web/src/features/public/public-home.tsx#PublicHomeRoute`
- `web/src/features/public/public-home.tsx#RoostGlyph`
- `web/src/features/public/public-home.tsx#StatusRail`
- `web/src/features/public/public-home.tsx#tx`

Files updated:

- `scripts/luc-998-dashboard-public-home-proof.mjs`
- `docs/planning/luc-998-dashboard-public-home-frontend-proof.md`
- `docs/architecture/scanner-overrides.json`
- `docs/ux/evidence/luc-998-dashboard-public-home-proof/`
- generated architecture and Project Truth status exports after refresh

Exclusions:

- No backend route changes, provider calls, production smoke, deploy, push,
  restart, credential reads, or runtime mutation.

## Diagnosis

The current Dashboard overview queue still exposes frontend/browser evidence
debt after `LUC-726` cleared the route-shaped backend parity lane. The missing
proof is the web rung that shows:

- `/` still serves the intended public home surface;
- signed-in `/dashboard` resolves to the canonical `00 General` route;
- the dashboard shell requests authenticated packets correctly; and
- both routes render without console/page failures or responsive overflow.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Web build | PASS | `npm run build:web` completed successfully and refreshed `public/react`. |
| Focused frontend browser proof | PASS | `node scripts/luc-998-dashboard-public-home-proof.mjs` served the built web bundle locally and exercised `/` plus signed-in `/dashboard` on desktop and mobile. |
| Public home render proof | PASS | `docs/ux/evidence/luc-998-dashboard-public-home-proof/report.json` records public-home hero, CTA, footer language selector, zero runtime errors, and no horizontal overflow for both viewports. |
| Dashboard redirect/render proof | PASS | The same report records `/dashboard` redirecting to `/areas?area=00-ogolny&view=overview` with visible command packet, priority panel, next actions, and route proposal content on both viewports. |
| Dashboard bearer-auth proof | PASS | The report records `Authorization: Bearer proof-token` on every mocked `/v1/auth/me`, `/v1/departments`, and `/v1/dashboard/command` request. |
| Screenshot artifacts | PASS | `desktop-public-home.png`, `mobile-public-home.png`, `desktop-dashboard-overview.png`, and `mobile-dashboard-overview.png` under `docs/ux/evidence/luc-998-dashboard-public-home-proof/`. |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| Architecture-awareness refresh | PASS | Refresh generated `2026-07-14T00:21:11.899Z` with `2887` entities / `7074` relations / `16471` files. |
| App-completion refresh | PASS | `missingTestLink` dropped from `1150` to `1140`, and the LUC-998 dashboard/public-home rows are absent from `docs/status/app-completion-index.md`. |
| Project Truth apply | PASS with unrelated runtime risk | Refresh generated `2026-07-14T00:21:51.327Z`; the LUC-998 route entities are absent from `docs/status/project-truth-index.json`, while the first remaining gap is an unrelated production `api_health` probe failure. |
| Architecture status | PASS | `npm run architecture:status` -> `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, all gates pass. |

## Acceptance Criteria

- [x] Desktop and mobile local proof for `/` confirms the public home hero,
  CTA, and footer language selector render without runtime errors or horizontal
  overflow.
- [x] Desktop and mobile local proof for `/dashboard` confirms canonical
  redirect to `?area=00-ogolny&view=overview` and visible dashboard overview
  content without runtime errors or horizontal overflow.
- [x] Local proof records bearer-token auth headers for dashboard shell/API
  requests.
- [x] Repo-owned evidence report and screenshots are saved under
  `docs/ux/evidence/luc-998-dashboard-public-home-proof/`.
- [x] Refreshed app-completion and Project Truth readback no longer report the
  listed dashboard/public-home entities as `missing_test_link`.

## Result Report

Status: `VERIFIED`.

This lane closed the remaining frontend/browser rung after `LUC-726`. Local
proof now shows the public home and signed-in dashboard overview render
correctly, the dashboard shell requests use the owner bearer token, and the
refreshed scanner/app-completion/Project Truth exports no longer classify the
target dashboard/public-home entities as `missing_test_link`.

Residual risk outside scope: Project Truth still reports a critical production
probe failure for `https://api.roost.luckysparrow.ch/health`, which remains a
deployment/runtime lane rather than a blocker to this local frontend proof.
