# WEBFOUND-008B Relationship Workbench Upgrade

Last updated: 2026-05-14

## Task Type

Frontend UX, API consumption, responsive validation.

## Current Stage

Verification.

## Deliverable For This Stage

The vanilla `/relationships` workbench consumes the verified relationship graph
API and exposes relationship confidence states to the owner.

## Goal

Upgrade `/relationships` from a provider/Drive assignment list into a
relationship graph review surface that clearly distinguishes direct facts,
provider hierarchy, route inference, review items, and unsupported relationship
families.

## Scope

- `public/app.js`
- `public/index.html`
- `public/styles.css`
- `docs/planning/web-and-mcp-foundation-task-plan.md`
- canonical state files under `.codex/context/` and `.agents/state/`

## Implementation Plan

1. Load `GET /v1/relationships/graph` during authenticated startup.
2. Render graph-derived rows when the graph is available.
3. Preserve existing provider and Drive scope assignment controls for review
   items with safe existing action routes.
4. Add filters for direct, provider hierarchy, route-inferred, and unsupported
   relationship states.
5. Add visual confidence badges without changing the design-system density.
6. Validate build, tests, desktop route, filtered state, and mobile route.

## Acceptance Criteria

- `/relationships` shows graph summary context from the API.
- Review queue uses graph `reviewItems` and still supports existing assignment
  actions.
- Provider graph and Drive/unsupported panels show confidence labels.
- Owner can filter by direct, provider hierarchy, route-inferred, and
  unsupported states.
- No fake relationship data, generic edge table, or new relationship write
  route is introduced.
- Desktop and mobile rendered checks show no horizontal overflow, console
  issues, or failed requests.

## Definition Of Done

- UI implementation is complete.
- Build and integration tests pass.
- Browser or Playwright rendered proof covers `/relationships` on desktop and
  mobile.
- Source-of-truth docs and state are updated.
- Local validation processes are cleaned up.

## Result Report

Status: `verified`.

Implemented:

- `/relationships` now loads `GET /v1/relationships/graph`.
- Graph rows show direct, provider-hierarchy, route-inferred, needs-review,
  and unsupported relationship states.
- Existing provider/Drive assignment controls are preserved for review items.
- Relationship filters include direct facts, provider hierarchy, route
  inference, and unsupported families.

Validation:

- `node --check public/app.js` passed.
- `npm run build` passed.
- `npm test` passed against disposable PostgreSQL on `localhost:55458`.
- Browser plugin path was attempted first, but no active Codex browser pane was
  available, so Playwright fallback was used.
- Playwright fallback rendered `/relationships` on
  `http://127.0.0.1:3108`, verified graph markers, route-inferred filtering,
  desktop `1366x900`, mobile `390x844`, no horizontal overflow, no console
  issues, and no failed requests.
- Validation server on port `3108`, disposable PostgreSQL
  `companycore-test-postgres-webfound008b`, and validation
  `chrome-headless-shell` processes were stopped after proof.
- Screenshots:
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound008b-desktop-1778785644938.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound008b-filtered-1778785644938.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound008b-mobile-1778785644938.png`
