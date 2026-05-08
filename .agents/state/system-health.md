# System Health

Last updated: 2026-05-08

## Latest Validation Snapshot

| Check | Command or method | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| lint | Not configured | NOT APPLICABLE | `.codex/context/PROJECT_STATE.md` validation commands | Project has no lint script. |
| typecheck | `npm run build` | PASS (latest recorded) | `docs/operations/v1-operator-handoff.md`; recent V2WEB task evidence in `.codex/context/PROJECT_STATE.md` | Build is the project typecheck gate. |
| tests | `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy && node --test 'dist/tests/**/*.test.js'"` | PASS | 2026-05-08 UXA-002 | Direct host `npm test` still requires a host-reachable `DATABASE_URL`; compose Postgres is internal only, so the integration test was run inside the backend container. |
| build | `npm run build` | PASS | 2026-05-08 UXA-003 | TypeScript build passed after dashboard markup, JS, and CSS changes. |
| smoke | Production public health smoke | PASS | 2026-05-08 AGRUN-009 public checks | `/health`, `/v1/health`, and web root returned `200`; `/health` reported build `71f3eb3b063ea68226a1736c727c52882b33f27a`. |
| ux/private smoke | `npm run owner-console:ux-smoke` against `http://localhost:3000` | PASS | `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T19-47-08-826Z` | Captured `/dashboard`, `/data`, `/data/tasks`, `/areas`, `/relationships`, `/settings/drive`, and `/settings/api` at desktop/tablet/mobile plus desktop interaction screenshots; report contained zero console issues. |
| ux/dashboard smoke | `npm run owner-console:ux-smoke` against isolated `http://localhost:3002` | PASS | `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T20-00-12-315Z` | UXA-003 dashboard screenshots show a dominant current-priority action, compact readiness evidence, top attention items, and secondary module exploration across desktop/tablet/mobile. |
| ux/auth smoke | Browser DOM check plus local Playwright viewport screenshots against `http://localhost:3003` | PASS | `C:\Users\wrobl\AppData\Local\Temp\companycore-auth-ux-smoke\2026-05-08T20-08-09-640Z` | UXA-004 verified mobile login/register form-first order, submit buttons inside the first viewport, preserved desktop two-column auth, and zero console issues. Browser screenshot capture timed out, so viewport screenshots used local Playwright fallback. |
| ux/workbench smoke | `npm run owner-console:ux-smoke` against isolated `http://localhost:3004` | PASS | `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T20-13-50-112Z` | UXA-005 verified private workbench routes after shared visual-role cleanup across desktop/tablet/mobile with zero console issues. |
| ux/local feedback smoke | Playwright fallback plus `npm run owner-console:ux-smoke` against isolated `http://localhost:3005` | PASS | `.tmp/uxa006-owner-console-rerun`; `.tmp/companycore-uxa006-login-local-status-rerun.png` | UXA-006 verified invalid login renders local error status, ClickUp/Drive empty status slots stay hidden, and private routes pass desktop/tablet/mobile smoke. Browser opened the route but interaction fallback was required because Browser failed on `locator.fill`. |
| ux/mobile header smoke | Targeted Playwright plus `npm run owner-console:ux-smoke` against isolated `http://localhost:3006` | PASS | `.tmp/uxa007-targeted`; `.tmp/uxa007-owner-console-rerun` | UXA-007 verified mobile topbar height `70px`, no horizontal overflow, drawer opens, Sign out remains visible, and desktop module search remains visible. |
| ux/dashboard iconography smoke | Browser login-page load plus targeted Playwright and `npm run owner-console:ux-smoke` against isolated `http://localhost:3000` | PASS | `.tmp/companycore-uxa008-targeted-final`; `.tmp/companycore-uxa008-owner-console-final` | UXA-008 verified local Phosphor font loading, 20 dashboard Phosphor icons on desktop, 18 visible in the first mobile viewport, no horizontal overflow, module icon color `rgb(35, 100, 210)`, and zero targeted console issues. |
| ux/react foundation smoke | Browser route load plus targeted Playwright and `npm run owner-console:ux-smoke` against isolated `http://localhost:3000` | PASS | `.tmp/companycore-uxa009-react-foundation`; `.tmp/companycore-uxa009-owner-console-final` | UXA-009 verified `/react-dashboard`, DaisyUI primary button and success alert, 3 table rows, owner-session detection on desktop/mobile, no horizontal overflow, and zero targeted console issues. |
| ux/react dashboard smoke | Targeted Playwright plus `npm run owner-console:ux-smoke` against isolated `http://localhost:3000` | PASS | `.tmp/companycore-uxa010-react-dashboard-final`; `.tmp/companycore-uxa010-owner-console-final` | UXA-010 verified `/react-dashboard` title, `companycore` DaisyUI theme, live `LuckySparrow` workspace data, 4 module links, 4 migration table rows, 13 Phosphor icons, desktop/mobile no horizontal overflow, and zero targeted console issues. |
| ux/react primitives smoke | Targeted Playwright plus `npm run owner-console:ux-smoke` against isolated `http://localhost:3000` | PASS | `.tmp/companycore-uxa011-react-primitives-final`; `.tmp/companycore-uxa011-owner-console-final` | UXA-011 verified `/react-dashboard` with 2 local notices, 1 reusable table primitive, 6 live table rows, internal table scroller, `companycore` theme, desktop/mobile no horizontal overflow, and zero targeted console issues. |
| ux/react task workbench smoke | Browser signed-out check plus targeted Playwright and `npm run owner-console:ux-smoke` against isolated `http://localhost:3007` | PASS | `C:\Users\wrobl\AppData\Local\Temp\companycore-uxa012-react-tasks-data`; `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T21-59-46-321Z` | UXA-012 verified `/react-tasks`, `companycore` theme, live `/v1/tasks` row after isolated API creation, search empty/recovery states, desktop/mobile no document-level overflow, and zero targeted console issues. Browser form fill hit the known virtual-clipboard limitation, so signed-in checks used Playwright fallback. |
| ux/browser | Production public/auth Browser audit | PARTIAL PASS | 2026-05-08 UXA-001 | Public entry, login, register, and mobile auth rendered with no relevant console warnings/errors; authenticated Browser entry was blocked by an automation issue on `input[type=email]`. |
| local runtime | Docker local runtime for UX audit | PASS | 2026-05-08 UXA-001 | Local backend ran on `http://localhost:3001`; `/health` returned `ok`; migrations and seed completed. |
| web editor markers | Production `app.js` marker check | PASS | 2026-05-08 AGRUN-008 public `app.js` check | Typed editor markers for Notes, Projects, Clients, Task Lists, and Tasks are present. |
| operator handoff parity | Docs review | PASS | 2026-05-08 CCV1-062 | `v1-operator-handoff.md` and rollback docs now reference the current public health build and note the SSH inventory limitation. |

## Runtime Health

- Production CompanyCore, Jarvis, and Paperclip health were green in the latest
  v1 handoff evidence.
- CompanyCore public health currently reports image
  `rnqqkhl3o3dut4qv56mlxly2_backend:71f3eb3b063ea68226a1736c727c52882b33f27a`.
- Known blockers are external: Google Drive owner consent/import,
  Paperclip/OpenJarvis upstream write access, and deploy-automation evidence
  reconciliation.
- Authenticated private-route UX screenshots now have an approved local
  Playwright path through `owner-console:ux-smoke`; UXA-003 used it to verify
  dashboard polish across desktop, tablet, and mobile.
- UX smoke that depends on seeded owner state should use an isolated compose
  project when the default local volume has been touched by integration tests.
- UXA-006 confirmed integration tests and UX smoke must run sequentially when
  sharing one isolated compose database, because the integration test suite
  mutates seeded owner data.
- UXA-008 confirmed local Phosphor assets render from the backend-served static
  app without CDN dependency. Browser login-page load had no console issues;
  form filling used the approved Playwright fallback because the in-app browser
  hit the known form-fill limitation.
- UXA-009 confirmed React/Vite/Tailwind/DaisyUI assets can be generated into
  ignored `public/react/` output during build and copied from the Docker build
  stage into the runtime image.
- UXA-010 confirmed the React route can read the existing owner browser session
  boundary and `/v1/connection` without changing the vanilla dashboard route.
- UXA-011 confirmed generated React output should be cleaned before Vite builds
  and that table overflow must stay inside `.react-table-shell` on mobile.
- UXA-012 confirmed the React migration can host a real task workbench in
  parallel with vanilla routes, using existing `/v1/tasks` and `/v1/connection`
  contracts without backend changes. Browser still cannot reliably fill login
  forms in this environment, so authenticated rendered checks should continue
  to use the approved Playwright fallback when Browser form input fails.

## Quality Gate Notes

- Latest v1 handoff: `docs/operations/v1-operator-handoff.md`.
- Latest release readiness: `docs/operations/v1-release-readiness.md`.
- Required pre-commit contract remains the validation commands in
  `.codex/context/PROJECT_STATE.md`.
