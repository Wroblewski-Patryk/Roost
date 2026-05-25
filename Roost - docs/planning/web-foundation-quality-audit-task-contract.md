# WEB-QA-AUDIT-001 Web Foundation Quality Audit Task Contract

Date: 2026-05-16
Task Type: Frontend audit and implementation planning
Current Stage: planning
Deliverable For This Stage: Detailed audit and ordered implementation plan for
the cleaned CompanyCore web foundation.

## Goal

Audit whether the current web foundation is scalable enough for future
department systems and identify the next implementation slices for language,
validation, errors, notifications, and maintainability.

## Scope

- `web/src/main.tsx`
- `web/src/app-route-registry.ts`
- `web/src/components/cc-button.tsx`
- `web/src/components/cc-data-table.tsx`
- `web/src/styles.css`
- `src/app.ts`
- rendered proof on the active web routes
- documentation and planning output

Runtime implementation changes are out of scope for this task.

## Implementation Plan

1. Review active routing, server route hosting, shared components, shell,
   auth forms, data loading, and CSS.
2. Run rendered proof for active routes, form validation, API error states,
   packet states, mobile overflow, and removed v0 routes.
3. Identify architectural and UX gaps that should be fixed before adding more
   departments.
4. Write the audit and implementation plan.

## Acceptance Criteria

- The audit states whether the active web base is clean enough for production
  testing.
- The audit identifies whether i18n is ready and what must be added.
- The audit verifies form validation and error behavior.
- The audit verifies old web routes do not render old React views.
- The audit includes a sequenced implementation plan.

## Definition Of Done

- `npm run build:web` passes.
- `npm run build:server` passes.
- Rendered proof covers active routes, auth validation, API errors, packet
  states, mobile overflow, and old-route removal.
- Temporary validation server and browser processes are cleaned up.
- Audit is written to `docs/planning/web-foundation-quality-audit-2026-05-16.md`.

## Result Report

- Audit saved at
  `docs/planning/web-foundation-quality-audit-2026-05-16.md`.
- Build checks passed:
  - `npm run build:web`
  - `npm run build:server`
- Rendered proof passed with Playwright fallback because Browser plugin
  initialization timed out.
- Evidence JSON and screenshots were generated under
  `.tmp/web-foundation-audit/` and intentionally not committed.
- Main findings:
  - i18n foundation is missing;
  - raw API error codes are visible;
  - forms rely on native validation only;
  - notifications/live feedback are not centralized;
  - `main.tsx` should be split before more departments;
  - historical CSS selectors should be cleaned after primitives land.
