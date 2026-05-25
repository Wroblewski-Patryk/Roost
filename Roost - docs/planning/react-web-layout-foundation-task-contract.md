# REACT-WEB-LAYOUT-001 Authenticated Layout Foundation

## Task Type

Implementation

## Current Stage

Verification

## Deliverable For This Stage

Make the approved Company Atlas layout the canonical post-login entry point and
add a single React route registry that future feature views can reuse for
navigation, titles, aliases, and auth redirects.

## Goal

Give CompanyCore a scalable web foundation after login: one authenticated
landing surface, one route map, one shared navigation model, and a predictable
way to add cleaner feature views without reintroducing duplicated sidebar or
route branching.

## Scope

- `web/src/app-route-registry.ts`
- `web/src/react-route-kit.tsx`
- `web/src/main.tsx`
- `docs/architecture/web-layer-react-ownership.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`

## Implementation Plan

1. Add a typed React route registry for public routes, authenticated route
   groups, canonical hrefs, aliases, and prefix matches.
2. Drive the shared React shell navigation from the registry instead of a local
   sidebar copy.
3. Make owner login/register redirect to `/dashboard` by default while
   preserving safe pending private routes.
4. Replace manual `ReactApp` route branching with a component map backed by the
   same route matching helper.
5. Update architecture and project-state source-of-truth files.
6. Run build, validation, route, auth, responsive, and cleanup checks.

## Acceptance Criteria

- Superseded by CC-AUDIT-001: `/areas?area=00-ogolny&view=overview` is the
  canonical post-auth landing path.
- `/dashboard` and `/react-dashboard` remain compatibility aliases that resolve
  to the `00 Ogolny` dashboard route.
- Existing route aliases still render their intended React views.
- The shared React shell navigation uses the central route registry.
- Mobile and desktop route proofs show no console/page errors and no
  horizontal overflow for representative authenticated routes.
- `npm run validate` and `git diff --check` pass.

## Definition Of Done

- Code changes are complete in React-only web files.
- Generated React assets are refreshed by the build.
- Verification evidence is recorded in this task contract and project state.
- Follow-up React workflow slices remain explicit.

## Result Report

- Status: implemented and locally verified.
- Implementation:
  - Added `web/src/app-route-registry.ts` as the typed registry for public
    routes, authenticated route groups, canonical hrefs, aliases, prefix
    matching, and post-auth redirect normalization.
  - Updated the shared React shell to derive desktop and mobile navigation
    from the registry.
  - Updated owner login/register so the default successful auth destination is
    `/dashboard`, with safe pending private routes preserved.
  - Replaced manual `ReactApp` route branching with a registry-compatible
    component map.
- Validation:
  - `npm run build:web`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed.
  - Playwright fallback route proof passed against local backend
    `http://127.0.0.1:3137`: login redirected to `/dashboard`; `/dashboard`,
    `/`, `/react-dashboard`, `/areas`, `/react-areas`, `/settings/api`, and
    `/react-agent-tools` rendered with no route-level error panel and no
    horizontal overflow; mobile `/dashboard` at `390x844` had no horizontal
    overflow.
  - Local validation server was stopped and no `chrome-headless-shell`
    processes remained.
- Residual risk:
  - Full ClickUp setup and Google Drive OAuth/folder-selection workflows remain
    dedicated React rebuild slices against existing backend contracts.
  - Production deployment proof is separate from this local web foundation
    slice.
