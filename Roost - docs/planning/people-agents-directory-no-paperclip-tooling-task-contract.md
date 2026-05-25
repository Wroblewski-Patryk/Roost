# People/Agents Directory No-Paperclip Tooling Task Contract

Last updated: 2026-05-18

## Task Type

Backend/frontend vertical slice.

## Current Stage

Verification.

## Deliverable For This Stage

Improve `06 People & Agents -> Directory` as a CompanyCore management tool
without exposing Paperclip runtime synchronization in the UI.

## Goal

Execute the actionable non-Paperclip audit findings from
`docs/ux/people-agents-directory-ux-backend-audit-2026-05-18.md`: move
readiness and authority from frontend-only inference into the backend packet,
show work/responsibility context from existing CompanyCore tasks, use backend
dictionaries/canonical departments, and support denser roster scanning.

## Scope

- `src/modules/workforce/workforce.service.ts`
- `web/src/types.ts`
- `web/src/features/departments/people-agents-route.tsx`
- Source-of-truth status files for result evidence.

Out of scope:

- Paperclip delivery, runtime ack, sync worker, sync tab, or Paperclip-specific
  UI.
- New assignment tables or migrations.
- New permission mutation routes.
- Bulk write commands.

## Implementation Plan

1. Expand `/v1/workforce` with source-backed management data:
   readiness, authority, work summary, direct report count, and canonical
   department dictionaries.
2. Keep work responsibility honest by labeling task matches as inferred from
   department, role, and task text until a direct assignment model exists.
3. Update the Directory detail panel with `work` and `authority` tabs.
4. Remove Paperclip sync from the visible UI for this slice.
5. Use backend dictionaries for status, runtime, personality, and department
   selects.
6. Add a compact roster density mode.
7. Validate builds and responsive proof.

## Acceptance Criteria

- Directory does not expose a Paperclip sync tab or Paperclip form fields.
- Profile readiness uses backend packet data when available.
- Work tab answers what related work exists and clearly states inference gaps.
- Authority tab shows boundaries, recommended access profile context, and
  blocked actions without allowing permission edits.
- Form departments come from backend-provided canonical department dictionaries.
- Desktop, tablet, and mobile render without horizontal overflow or console
  errors.

## Definition Of Done

- `npm run build:server` passes.
- `npm run build:web` passes.
- `npm run validate` passes.
- `git diff --check` passes.
- Render proof covers desktop, tablet, and mobile.
- Source-of-truth files are updated.

## Result Report

Implemented. `/v1/workforce` now returns readiness, authority, inferred work
responsibility, direct report count, and department dictionaries. The Directory
now focuses on CompanyCore management data: profile, work, authority, and
generated files. Paperclip sync remains in backend compatibility scope but is
not exposed as a visible workflow in this UI slice.

Verification evidence:

- `npm run build:server`
- `npm run build:web`
- `npm run validate`
- `git diff --check`
- Playwright fallback proof on desktop, tablet, and mobile with screenshots in
  `%TEMP%/companycore-people-no-paperclip-qa`
- Browser plugin validation was attempted first but the local browser plugin
  bundle was missing `browser-client.mjs`, so Playwright was used as the
  fallback render proof.
- `npm run test:api` was not run in this checkpoint because `DATABASE_URL` is
  not set in the local shell; this slice did not add a migration.
