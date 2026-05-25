# WEBFOUND-002-004 Workspace And Sidebar Foundation Task Contract

Last updated: 2026-05-14

## Task Type

Implementation

## Current Stage

Done

## Deliverable For This Stage

Implemented workspace switch API, workspace selector UI, and operating-area
resource inventory foundation with current local build evidence and explicit
remaining verification blocker.

## Goal

Make the authenticated web foundation support multiple owner workspaces and a
sidebar that starts from workspace context, operating areas, and real resource
families before V2 Company City or gamification work begins.

## Scope

- `src/modules/workspaces/workspaces.routes.ts`
- `src/app.ts`
- `src/modules/auth/auth.routes.ts`
- `src/modules/operating-model/operating-model.routes.ts`
- `src/tests/api.test.ts`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- project source-of-truth docs and state files

## Implementation Plan

1. Add owner-only workspace list, create, and select routes that mint a new
   token after membership verification.
2. Enrich owner `/auth/me` with visible workspace memberships.
3. Add an operating-area inventory endpoint for sidebar resource-family counts.
4. Add authenticated shell controls for workspace selection, workspace
   creation, and area/resource navigation.
5. Run build, JavaScript syntax check, and the broad test gate when a database
   URL is available.
6. Update canonical planning, requirement, risk, and module-confidence state.

## Acceptance Criteria

- Owner can list visible workspaces.
- Owner can create a second workspace with operating model seed data.
- Owner can select a workspace and receive a workspace-scoped bearer token.
- Foreign workspace selection is denied.
- Sidebar shows active workspace and expandable operating areas.
- Switching workspace refreshes connection, operating model, integrations,
  data snapshots, tasks, service keys, and sidebar resource counts.
- Validation evidence is recorded, including any blocked gate.

## Definition Of Done

- Implementation compiles.
- Static frontend JavaScript syntax passes.
- Integration tests pass with a configured disposable PostgreSQL database, or
  the blocker and residual risk are recorded before further release work.
- Source-of-truth files are updated.
- No route derives protected workspace scope from a client-selected workspace
  ID; protected APIs continue using auth context.

## Result Report

- Implemented `GET /v1/workspaces`, `POST /v1/workspaces`, and
  `POST /v1/workspaces/:id/actions/select`.
- Implemented owner `/auth/me` workspace membership readback.
- Implemented `/v1/operating-model/area-inventory`.
- Added workspace selector/create controls and area resource navigation to the
  authenticated vanilla shell.
- Added a mobile/tablet sidebar backdrop so the drawer can be closed without
  relying on an occluded `Menu` button.
- Added API test coverage for workspace list/create/select, token workspace
  selection, foreign selection denial, and area inventory readback.
- `npm test`: passed against disposable PostgreSQL
  `postgresql://companycore:companycore@localhost:55453/companycore?schema=public`;
  the test container was removed after validation.
- Playwright owner-shell smoke passed against isolated runtime
  `http://127.0.0.1:3106` and disposable PostgreSQL on `localhost:55454`;
  the server and database container were stopped after validation.
- UI proof covered register/login bootstrap, workspace create/select,
  switching back to the original workspace, 13 operating areas in the sidebar,
  desktop `1366x900`, tablet `834x1112`, mobile `390x844`, no horizontal
  overflow, no relevant console errors, no failed requests, and drawer close
  via backdrop.
- Screenshots:
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound-desktop-1778783405736.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound-switched-1778783405736.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound-tablet-1778783405736.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound-mobile-1778783405736.png`
