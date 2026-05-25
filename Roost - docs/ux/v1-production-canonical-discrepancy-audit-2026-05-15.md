# V1 Production Canonical Discrepancy Audit

Date: 2026-05-15
Stage: verification
Owner: Frontend Builder + Product Docs

## Scope

This audit compares the deployed CompanyCore web experience at
`https://companycore.luckysparrow.ch/` against the current V1 canonical web
targets:

- Public Home: `/`
- Owner Login: `/auth/login`
- Owner Registration: `/auth/register`
- Company Atlas: `/dashboard`
- Selected Area Operating Room: `/areas?area=:areaKey&view=:viewId`

Desktop and mobile production screenshots were captured under
`docs/ux/evidence/production-compare-2026-05-15/`. Private routes were tested
only in signed-out mode because no production owner browser session was
available in this validation run.

## Version Evidence

| Surface | Evidence |
| --- | --- |
| Production web health | `build.commit="b716f02"` |
| Production API health | `build.commit="b716f02"` |
| Local source target | `9b575e2` plus current V1 working tree changes |
| Production route report | `docs/ux/evidence/production-compare-2026-05-15/production-route-report.json` |

## Discrepancy Register

| ID | Surface | Production Evidence | Canonical Target | Severity | Discrepancy | Likely Cause | Required Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V1PROD-001 | `/` desktop/mobile | `home-desktop.png`, `home-mobile.png`; final URL is `/auth/login` | `companycore-v1-home-desktop-canonical.png`, `companycore-v1-home-mobile-canonical.png` | P0 | Production root is still an auth redirect/login surface. V1 requires a public home with the CompanyCore operating-room promise and atlas preview. | Production is running `b716f02`, which predates the local V1WEB-002 public-home route change. | Deploy the V1WEB-002 React bundle where `/` is public and private auth is limited to private routes. |
| V1PROD-002 | `/auth/login` desktop/mobile | `login-desktop.png`, `login-mobile.png` | `companycore-v1-login-desktop-canonical.png`, `companycore-v1-login-mobile-canonical.png` | P1 | Production login uses the older two-card "Owner workspace / Owner access" layout. Canonical login uses the public shell, larger owner-return message, capability context, and calmer mobile spacing. | Production build drift. | Deploy the current React public auth layout and rerun desktop/mobile screenshot comparison. |
| V1PROD-003 | `/auth/register` desktop/mobile | `register-desktop.png`, `register-mobile.png` | `companycore-v1-register-desktop-canonical.png`, `companycore-v1-register-mobile-canonical.png` | P1 | Production registration uses the older card layout and does not match the canonical workspace-bootstrap page. | Production build drift. | Deploy the current React public registration layout and rerun desktop/mobile screenshot comparison. |
| V1PROD-004 | `/dashboard` desktop/mobile | `dashboard-signed-out-desktop.png`, `dashboard-signed-out-mobile.png`; final URL is `/auth/login` | `companycore-v1-dashboard-desktop-canonical.png`, `companycore-v1-dashboard-mobile-canonical.png` | Evidence blocked | Signed-out redirect is expected, but the authenticated production Company Atlas could not be compared without an owner session. | Missing production owner session for this audit. | After deploy, repeat with a valid owner session and compare the authenticated desktop, tablet, and mobile dashboard. |
| V1PROD-005 | `/areas?area=01-strategia&view=overview` desktop/mobile | `area-detail-signed-out-desktop.png`, `area-detail-signed-out-mobile.png`; final URL is `/auth/login` | `companycore-v1-area-detail-desktop-canonical.png`, `companycore-v1-area-detail-mobile-canonical.png` | Evidence blocked | Signed-out redirect is expected, but the authenticated selected-area operating room could not be compared without an owner session. | Missing production owner session for this audit. | After deploy, repeat with a valid owner session and compare the authenticated area detail route across `overview`, `tasks`, `knowledge`, and `ai`. |
| V1PROD-006 | Production release parity | `/health` and `/v1/health` report `b716f02` | Current local V1 canonical implementation | P0 | Production is not running the local V1 canonical web implementation. Visual parity cannot be achieved on production until the V1 working tree is committed, pushed, deployed, and smoke-tested. | Release drift between local source and production image. | Commit and deploy the V1 canonical web layer, then rerun this audit. |
| V1PROD-007 | Public route asset load | Route report shows aborted `Phosphor-Bold.woff2` on root/private redirects | No public font aborts during canonical proof | P2 | The font request abort appears only on navigations that redirect or are cancelled; it did not produce console errors or visible layout failure in the captured screenshots. | Browser navigation cancellation during redirect or old production asset path. | Recheck after V1 deploy. Treat as a cleanup issue only if it persists on stable canonical pages. |

## Outcome

The main production discrepancy is deployment drift. The local V1 canonical
web layer already defines the corrected route ownership and visual targets:
`/` is public, `/auth/login` and `/auth/register` use the public layout, and
private dashboard/area views remain behind owner auth. Production still runs
an older build, so the next parity action is release, not a redesign.

## Post-Deploy Update

V1PROD-002 deployed commit `ff5e04192db93a53280fab58bcd8f47cba30f554` to
production. Public web/API health now report that commit and image
`rnqqkhl3o3dut4qv56mlxly2_backend:ff5e041`.

Resolved:

- `V1PROD-001`: `/` now serves the V1 public home.
- `V1PROD-002`: `/auth/login` now serves the V1 public auth layout.
- `V1PROD-003`: `/auth/register` now serves the V1 public registration layout.
- `V1PROD-006`: production build drift is resolved for the deployed skeleton.

Still open:

- `V1PROD-004`: authenticated dashboard parity needs an owner-session
  screenshot pass.
- `V1PROD-005`: authenticated selected-area parity needs an owner-session
  screenshot pass.
- `V1PROD-007`: redirect-only aborted `Phosphor-Bold.woff2` requests still
  appear on signed-out private redirects, with no console error or visible
  layout failure.

## Next Verification Pass

1. Capture authenticated production desktop/tablet/mobile screenshots for
   `/dashboard` and `/areas?area=01-strategia&view=overview`.
2. Compare fresh production evidence against the canonical assets and update
   this audit from `blocked by deploy drift` to `pass` or a concrete visual
   mismatch list.
