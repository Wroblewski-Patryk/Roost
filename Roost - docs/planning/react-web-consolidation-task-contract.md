# REACT-WEB-001 React Web Layer Consolidation

## Task Type

Implementation

## Current Stage

Verification

## Deliverable For This Stage

Replace the active vanilla owner web console runtime with a React/Tailwind/DaisyUI
web layer and record the remaining React follow-up slices.

## Goal

Make React the single active web UI runtime for CompanyCore while preserving
backend data contracts, owner auth redirects, and the current area-first
dashboard direction.

## Scope

- `src/app.ts`
- `web/src/main.tsx`
- `package.json`
- Removed legacy static web files in `public/`
- Generated Vite output in `public/react/`
- Source-of-truth documentation for React route ownership

## Implementation Plan

1. Serve the React bundle for all user-facing web routes.
2. Add React auth forms for owner login and registration.
3. Add React route coverage for former vanilla routes:
   relationships, data, pipeline, account, Drive, API settings, and ClickUp
   status.
4. Reuse existing React dashboard, areas, tasks, integrations, Company OS, and
   MCP tool surfaces.
5. Remove active vanilla web files and move validation to the React/Vite build
   gate.
6. Run build and browser route proofs for signed-out and signed-in states.
7. Record architecture ownership, validation evidence, residual risks, and next
   React slices.

## Acceptance Criteria

- No active user-facing web route is served by `public/index.html`.
- Removed legacy vanilla scripts are not loaded by the tested routes.
- `/auth/login` and `/auth/register` render in React.
- Private routes redirect to login when no owner token exists.
- Signed-in route proofs render through React for the migrated route set with
  no console errors and no horizontal overflow.
- `npm run validate` passes.

## Definition Of Done

- Express route ownership updated.
- Active legacy vanilla public files removed.
- React views cover the route set above.
- Validation evidence is recorded.
- Follow-up work is explicit for workflows that were simplified instead of
  copied from vanilla.

## Result Report

- Status: implemented and locally verified.
- Validation:
  - `npm run validate`: passed.
  - Playwright signed-out route proof covered `/`, `/auth/login`,
    `/auth/register`, `/dashboard`, `/settings/api`, `/relationships`, `/data`,
    `/pipeline`, and `/settings/drive`.
  - Playwright signed-in mocked-backend proof covered `/dashboard`, `/areas`,
    `/tasks-adapter`, `/settings/integrations`, `/react-agent-tools`,
    `/relationships`, `/data`, `/pipeline`, `/settings/api`, `/settings/drive`,
    `/settings/account`, and `/settings`.
  - Proof result: React root present, old public shell absent, old vanilla
    scripts absent, no horizontal overflow, no console errors, and no route
    error panels for the mocked signed-in route set.
- Screenshot review:
  - `.tmp/react-auth-mobile.png`
  - `.tmp/react-dashboard-desktop.png`
- Residual risk:
  - Full ClickUp setup and full Google Drive OAuth/folder-selection browser
    workflows need dedicated React rebuild slices. Current React routes expose
    real backend status and safe actions but do not yet reproduce every legacy
    form control.
  - Database-backed `npm run test:api` was not rerun in this slice because the
    implementation changed web routing and React UI only; existing local proof
    used mocked `/v1/*` responses for private browser routes.

