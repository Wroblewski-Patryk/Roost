# Web View Rules And People Directory Cleanup Task Contract

Last updated: 2026-05-17

## Task Type

Frontend UX governance and focused route cleanup.

## Current Stage

Verification.

## Deliverable For This Stage

Record durable web-view rules derived from the strongest current workbench
patterns, then align `06 People & Agents -> Directory` with those rules and
prove the route remains usable on desktop, tablet, and mobile.

## Goal

Make authenticated CompanyCore/Roost views behave like backend-connected tools,
not decorative landing pages. The immediate code target is the People/Agents
Directory, which must remove the oversized hero, generic KPI cards, and
badge-heavy presentation while keeping useful roster, filter, detail, sync, and
generated-file workflows.

## Scope

- `docs/ux/web-view-creation-rules.md`
- `docs/ux/design-memory.md`
- `.agents/core/project-memory-index.md`
- `web/src/features/departments/people-agents-route.tsx`
- Source-of-truth status files touched by the task result.

Out of scope:

- New People/Agents backend schema or API behavior.
- New HR/RBAC, skills, capacity, or Paperclip worker behavior.
- Broad redesign of Operations, Calendar, Assets, or the shared shell.

## Implementation Plan

1. Analyze the existing `04 Operations -> Tasks`, `04 Operations -> Calendar`,
   and `08 Assets -> Files/Folders` route patterns.
2. Write durable rules for future authenticated work views.
3. Refactor People/Agents Directory into a compact list/detail tool surface.
4. Limit badges and counters to workflow-relevant state.
5. Validate build and responsive rendering.
6. Update project memory, requirements, risks, health, and task board.

## Acceptance Criteria

- The new rules explicitly say authenticated views are work tools, not landing
  pages.
- People/Agents Directory no longer starts with a large hero section or KPI
  summary cards.
- The first viewport exposes useful search, type/status filters, roster,
  detail tabs, edit, create, generated-file preview, and manual sync controls.
- Desktop, tablet, and mobile render without horizontal overflow, console
  errors, or failed mocked API requests.
- Existing backend behavior remains unchanged.

## Definition Of Done

- `npm run build:web` passes.
- `npm run build:server` passes.
- `npm run validate` passes or any gap is documented.
- `git diff --check` passes.
- Responsive route proof covers desktop, tablet, and mobile.
- Source-of-truth docs are updated.

## Result Report

Implemented and continued. `docs/ux/web-view-creation-rules.md` now captures
the app-wide authenticated-view rules derived from Operations and Assets.
People/Agents Directory now uses a compact workbench header, filters, roster,
and detail panel instead of the previous hero/KPI/badge-heavy composition.
The follow-up tool pass added scope segments, `Needs attention`, sorting,
configuration readiness checks, manual sync proof, and archive feedback backed
by the existing `/v1/workforce` API surface.

Verification evidence:

- `npm run build:web`
- `npm run build:server`
- `npm run validate`
- `git diff --check`
- Playwright fallback proof on desktop, tablet, and mobile with screenshots in
  `%TEMP%/companycore-directory-tool-v2-qa`
- Process cleanup check found no `chrome-headless-shell` processes.

Remaining follow-up:

- Production-smoke `/people-agents` after redeploy.
