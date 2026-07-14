# LUC-998 Dashboard And Public Home Frontend Proof

Date: 2026-07-14
Issue: [LUC-998](/LUC/issues/LUC-998)
Stage: verification

## Task Contract

- Goal: add focused frontend/browser proof for the Dashboard overview and
  public home route family.
- Task Type: frontend verification / proof-link repair.
- Current Stage: verification.
- Deliverable For This Stage: current browser proof, linked evidence for the
  exact dashboard/public-home entities, regenerated readback, and
  source-of-truth closure.

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
- `.codex/tasks/luc-998-dashboard-public-home-frontend-proof.md`
- `docs/planning/luc-998-dashboard-public-home-frontend-proof.md`
- `docs/architecture/scanner-overrides.json`
- `docs/ux/evidence/luc-998-dashboard-public-home-proof/`
- generated architecture and Project Truth status exports after refresh

Exclusions:

- No backend route changes, provider calls, production smoke, deploy, push,
  restart, credential reads, or runtime mutation.

## Diagnosis

The active Dashboard overview `missing_test_link` rows for `general-dashboard`
and `public-home` are confidence-model debt, not a reproduced product defect.
`LUC-726` already closed the backend `/dashboard/command` parity lane. What was
still missing was a direct frontend/browser proof packet that exercises the
public route and the signed-in dashboard route, then links that evidence to the
exact React entities still listed in app-completion.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Web build | PASS | `npm run build:web` completed successfully and produced current `public/react` assets. |
| Focused frontend browser proof | PASS | `node scripts/luc-998-dashboard-public-home-proof.mjs` served the built React app locally, injected `sessionStorage.companycoreOwnerToken='proof-token'`, and opened `/` plus signed-in `/dashboard` on desktop and mobile. |
| Public home render proof | PASS | `docs/ux/evidence/luc-998-dashboard-public-home-proof/report.json` records `heroTitle=true`, `enterRoostCta=true`, `footerLanguageSelector=true`, `runtimeErrors=true`, and `allSurfacesNoHorizontalOverflow=true` for desktop/mobile public-home runs. |
| Dashboard redirect and render proof | PASS | The same report records desktop/mobile `/dashboard` runs with `canonicalDashboardRedirect=true`, `commandPacketVisible=true`, `priorityPanelVisible=true`, `nextActionsVisible=true`, and the mocked route proposal visible after redirect to `/areas?area=00-ogolny&view=overview`. |
| Dashboard bearer-auth proof | PASS | The report records `authMe=2`, `departments=2`, `dashboardCommand=2`, and every captured header value is `Bearer proof-token`. |
| Screenshot artifacts | PASS | `docs/ux/evidence/luc-998-dashboard-public-home-proof/desktop-public-home.png`, `mobile-public-home.png`, `desktop-dashboard-overview.png`, and `mobile-dashboard-overview.png`. |
| Override JSON parse | PASS | `node -e "JSON.parse(require('fs').readFileSync('docs/architecture/scanner-overrides.json','utf8')); console.log('scanner-overrides json ok')"` |
| Architecture-awareness refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` generated `2026-07-14T00:21:11.899Z` with `2887` entities / `7074` relations / `16471` files. |
| App-completion refresh | PASS | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost` reduced `missingTestLink` from `1150` to `1140`; `rg` confirms the listed `general-dashboard` and `public-home` rows are absent from `docs/status/app-completion-index.md`. |
| Project Truth apply | PASS with unrelated runtime risk | `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply` generated `2026-07-14T00:21:51.327Z`. The LUC-998 route entities are absent from `docs/status/project-truth-index.json`; the first remaining gap is an unrelated production probe failure on `https://api.roost.luckysparrow.ch/health`. |
| Architecture status | PASS | `npm run architecture:status` -> `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, all gates pass. |

## Acceptance Criteria

- [x] Current local frontend proof demonstrates `/` renders the public home on
  desktop and mobile without runtime errors or horizontal overflow.
- [x] Current local frontend proof demonstrates signed-in `/dashboard` resolves
  to the canonical dashboard route and renders the dashboard overview on
  desktop and mobile without runtime errors or horizontal overflow.
- [x] Current local frontend proof demonstrates dashboard shell/API requests
  use the owner bearer token.
- [x] Browser proof artifacts are saved in the repository.
- [x] Regenerated readback no longer reports the listed dashboard/public-home
  entities as `missing_test_link`.

## Result Report

Status: `VERIFIED`.

The local browser run proved both sides of the issue scope: `/` still renders
the Roost public home on desktop and mobile, and signed-in `/dashboard`
redirects to the canonical `00 General` route while rendering the dashboard
overview packet with bearer-auth shell requests. The scanner overrides now link
the proof packet directly to the dashboard/public-home entities, and refreshed
app-completion / Project Truth readback cleared the original LUC-998
`missing_test_link` rows.

Residual risk outside this lane: Project Truth still reports an unrelated
critical production probe failure for `https://api.roost.luckysparrow.ch/health`
that belongs to Deployment Reliability Engineer + Ops Release Lead, not to this
local frontend proof closure.
