# ACF-UX-001 Task Contract

## Header

- ID: ACF-UX-001
- Title: Mobile Overflow And Focus Accessibility Fix
- Task Type: implementation
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Priority: P1
- Source: `docs/operations/application-completion-audit-2026-05-14.md`
- Requirement Rows: REQ-APP-AUDIT-002
- Quality Scenario Rows: QA-APP-AUDIT-002
- Risk Rows: RISK-APP-AUDIT-001; RISK-APP-AUDIT-002
- Operation Mode: BUILDER

## Goal

Remove the freshly observed mobile horizontal overflow and unnamed focusable
controls from `/settings/api` and `/react-company-os`.

## Scope

- `public/styles.css`
- `public/index.html`
- `public/app.js`
- `web/src/styles.css`
- `web/src/react-route-kit.tsx`
- `web/src/main.tsx`
- generated `public/react/` assets from `npm run build`

## Implementation Plan

1. Add defensive responsive constraints for long API paths, capability tokens,
   buttons, badges, tables, cards, and React grid/flex children.
2. Add explicit accessible names to action buttons and dense Company OS form
   inputs that were flagged by focusable-control heuristics.
3. Rebuild the React bundle.
4. Verify `/settings/api` and `/react-company-os` on desktop and mobile with
   signed-in Playwright checks.
5. Run the integration gate against disposable PostgreSQL.

## Acceptance Criteria

- Desktop and mobile checks for `/settings/api` and `/react-company-os` report
  `horizontalOverflow=false`.
- Desktop and mobile checks report `unnamedFocusableCount=0`.
- Checks report no console warnings/errors and no relevant failed requests.
- `npm test` passes against a disposable PostgreSQL database.

## Definition of Done

- The implementation changes are scoped to responsive and accessibility fixes.
- Generated React assets are refreshed.
- Validation evidence is recorded in source-of-truth docs.
- Local validation resources are cleaned up after the task.

## Validation Evidence

- `npm run build`: passed.
- Playwright fallback route check:
  - report: `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-check-1778776663635\report.json`
  - screenshots: `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-check-1778776663635`
  - routes: `/settings/api`, `/react-company-os`
  - viewports: desktop `1440x960`, mobile `390x844`
  - result: `horizontalOverflow=false`, `unnamedFocusableCount=0`,
    no console warnings/errors, no relevant failed requests.
- `npm test` with
  `DATABASE_URL=postgresql://companycore:companycore@localhost:55451/companycore?schema=public`:
  passed.
- Browser plugin path: attempted first, but the in-app Browser reported no
  active Codex browser pane; Playwright fallback was used.

## Result Report

The API settings surface and React Company OS cockpit now contain long route,
capability, badge, table, and command text without page-level horizontal
overflow on phone-sized screens. The focused controls checked in the target
routes have accessible names.

Remaining usability work is not closed by this slice: the app still needs the
security hardening task, data-completeness decision, Company City dashboard
work, and larger information-architecture improvements from the audit queue.
