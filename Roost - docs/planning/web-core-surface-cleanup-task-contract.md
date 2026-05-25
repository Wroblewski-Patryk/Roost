# WEB-CORE-001 Web Core Surface Cleanup Task Contract

Date: 2026-05-16
Task Type: Frontend cleanup and route ownership
Current Stage: verification
Deliverable For This Stage: Active React web bundle contains only public home,
auth, `00 General`, `04 Operations`, and `08 Assets` surfaces while backend
APIs remain untouched.

## Goal

Remove unfinished v0/v1 web views from the active web runtime so the product no
longer mixes old workbench/admin screens with the approved CompanyCore
operating-system direction.

## Scope

- `web/src/main.tsx`
- `web/src/app-route-registry.ts`
- Source-of-truth documentation and state files that describe active web route
  ownership and next work.

Backend routes, database schema, API/MCP capabilities, and server behavior are
explicitly out of scope and must remain available for future department
systems.

## Implementation Plan

1. Reduce the React route registry to public home, login, registration, and the
   active private CompanyCore views: `00 General`, `04 Operations`, and
   `08 Assets`.
2. Replace the active React entrypoint with a smaller implementation that
   renders only those views.
3. Keep `/dashboard`, `/react-dashboard`, `/areas`, and `/operations` as
   compatibility entries that normalize into the approved current views.
4. Keep data read behavior source-backed through existing packets:
   `/v1/intake/route-proposals`, `/v1/operations/work-items`, and
   `/v1/assets/context`.
5. Remove old private web routes from the Express React route list.
6. Validate build, route proof, mobile overflow, removed-route behavior, and
   validation process cleanup.
6. Refresh source-of-truth docs and planning queues.

## Acceptance Criteria

- Public `/`, `/auth/login`, and `/auth/register` still render.
- Successful login opens `/areas?area=00-ogolny&view=overview`.
- `/dashboard` normalizes to the `00 General` dashboard.
- `/areas?area=04-operacje&view=overview` renders the Operations management
  view.
- `/areas?area=08-zasoby&view=overview` renders the Assets management view.
- Old private web paths such as `/settings/api` are no longer React app routes
  and no longer render former v0/v1 screens.
- Backend code and API route files are not deleted.
- Desktop and mobile proof has no console/page errors or horizontal overflow.

## Definition Of Done

- `npm run build:web` passes.
- `npm run build:server` passes.
- `git diff --check` passes, allowing repository line-ending warnings only.
- Playwright route proof passes for public, auth, post-login, `00`, `04`, `08`,
  and archived private route behavior.
- Temporary validation server and headless browser processes are cleaned up.
- Relevant project state, planning, architecture, UX, and module-confidence
  files are updated.

## Result Report

- `web/src/main.tsx` now contains the active small web shell and view set only:
  public home, auth, `00 General`, `04 Operations`, and `08 Assets`.
- `web/src/app-route-registry.ts` now exposes only the approved active route
  set and compatibility aliases.
- `src/app.ts` now serves the React app only for the approved public/auth/core
  web routes and compatibility aliases.
- `web/src/react-route-kit.tsx` was removed because it belonged to the old
  broad React workbench surface and is no longer imported by the active web
  bundle.
- `npm run build:web` passed and the generated bundle dropped to a much smaller
  active app surface.
- `npm run build:server` passed.
- `git diff --check` passed with line-ending warnings only.
- Playwright proof on a temporary static React server passed for:
  `/`, `/auth/login`, login redirect to `00 General`, `/dashboard` alias,
  desktop `04 Operations`, desktop `08 Assets`, mobile `08 Assets` without
  overflow, and absence of the former `/settings/api` React view.
- A targeted post-auth redirect proof also passed for direct unauthenticated
  entry into `/areas?area=04-operacje&view=overview`, confirming it returns to
  `04 Operations` after login instead of falling back to `00 General`.
- Validation cleanup passed: port `3231` was closed and no
  `chrome-headless-shell` process remained. The targeted redirect proof server
  on port `3232` was also closed.
