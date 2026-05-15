# V1WEB-002 Five Canonical Web Surfaces

## Task Type

Implementation

## Current Stage

Verification

## Deliverable For This Stage

Organize the V1 web layer around five canonical surfaces:

- public home on `/`
- public login on `/auth/login`
- public registration on `/auth/register`
- private dashboard on `/dashboard`
- private selected-area detail on `/areas?area=:areaKey&view=:viewId`

## Goal

Make CompanyCore feel coherent from first public entry through owner login into
the private company operating system, with canonical screenshots refreshed
after implementation changes.

## Scope

- `web/src/app-route-registry.ts`
- `web/src/main.tsx`
- `web/src/styles.css`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `docs/ux/v1-area-detail-canonical-spec-2026-05-15.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/*`

## Implementation Plan

1. Make `/` a public home route instead of a private dashboard alias.
2. Reuse one public layout for home, login, and registration.
3. Keep `/dashboard` and selected-area detail on the private atlas layout.
4. Refresh canonical screenshots for all five surfaces after implementation.
5. Validate desktop, mobile, and tablet-derived behavior with Playwright.

## Acceptance Criteria

- `/` renders a public CompanyCore home view without requiring an owner token.
- `/auth/login` and `/auth/register` use the same public layout language.
- `/dashboard` remains the authenticated post-login destination.
- `/areas?area=01-strategia&view=overview` remains the selected-area private
  view.
- Each of the five canonical surfaces has a refreshed desktop and mobile image.
- `npm run build:web`, `npm run validate`, and `git diff --check` pass.

## Definition Of Done

- Public and private layouts are clearly separated.
- No new backend route or fake persisted data is introduced.
- Canonical screenshots and source-of-truth docs are updated.

## Result Report

- Status: implemented and locally verified.
- Validation:
  - `npm run build:web`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed.
  - Playwright fallback against `http://127.0.0.1:3148` rendered all five
    canonical views in desktop and mobile and captured dashboard tablet proof.
  - After the mobile public-nav refinement, Playwright fallback against
    `http://127.0.0.1:3150` refreshed public home, login, and registration
    desktop/mobile canonical images again.
  - No horizontal overflow, blank page, console errors, or page errors were
    observed.
- Canonical images:
  - `docs/ux/assets/companycore-v1-home-desktop-canonical.png`
  - `docs/ux/assets/companycore-v1-home-mobile-canonical.png`
  - `docs/ux/assets/companycore-v1-login-desktop-canonical.png`
  - `docs/ux/assets/companycore-v1-login-mobile-canonical.png`
  - `docs/ux/assets/companycore-v1-register-desktop-canonical.png`
  - `docs/ux/assets/companycore-v1-register-mobile-canonical.png`
  - `docs/ux/assets/companycore-v1-dashboard-desktop-canonical.png`
  - `docs/ux/assets/companycore-v1-dashboard-mobile-canonical.png`
  - `docs/ux/assets/companycore-v1-area-detail-desktop-canonical.png`
  - `docs/ux/assets/companycore-v1-area-detail-mobile-canonical.png`
- Residual risk: future changes to any of the five canonical surfaces must
  refresh their desktop/mobile images in the same task.
