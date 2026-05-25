# Web Responsive Shell And People Link Task Contract

## Header
- ID: WEB-SHELL-RESP-001
- Title: Responsive department shell and People/Agents direct link
- Task Type: fix
- Current Stage: verification
- Status: REVIEW
- Owner: Frontend Builder + QA/Test
- Priority: P1
- Module Confidence Rows: WEB-SHELL-RESP-001
- Requirement Rows: REQ-WEB-SHELL-RESP-001
- Risk Rows: RISK-WEB-SHELL-RESP-001
- Iteration: 2026-05-17 owner feedback
- Operation Mode: BUILDER
- Mission ID: WEB-SHELL-RESP-001
- Mission Status: VERIFIED

## Goal
Make the active web shell usable on mobile, tablet, and desktop without changing feature behavior, and make `06 People / Agents` reachable after redeploy through a direct URL.

## Scope
- `web/src/layout/shell.tsx`
- `web/src/app-route-registry.ts`
- `web/src/main.tsx`
- Source-of-truth and UX memory updates

## Implementation Plan
1. Keep existing desktop sidebar behavior.
2. Add a mobile/tablet drawer that reuses the same department sidebar data.
3. Add a horizontal quick department strip for active modules on smaller screens.
4. Add `/people-agents` and `/workforce` aliases that normalize to `/areas?area=06-kadry&view=directory`.
5. Validate desktop, tablet, and mobile render paths with no overflow or console/page errors.

## Acceptance Criteria
- [x] `/people-agents` opens the `06 People & Agents` directory and normalizes to the canonical route.
- [x] Mobile/tablet users can open department navigation from the header.
- [x] Mobile/tablet users can switch active modules from the quick department strip.
- [x] Desktop sidebar remains intact.
- [x] No feature behavior is removed or changed.

## Validation Evidence
- `npm run build:web`: passed.
- `npm run build:server`: passed.
- `git diff --check`: passed with line-ending warnings only.
- Browser plugin path: attempted first, but setup timed out.
- Playwright fallback proof:
  - desktop `/people-agents` normalized to `/areas?area=06-kadry&view=directory`;
  - tablet drawer opened and showed `06 People / Agents`;
  - mobile drawer opened and showed `06 People / Agents`;
  - mobile quick nav switched `People / Agents -> General -> People / Agents`;
  - mobile `00 General` drawer opened;
  - all checked viewports had no horizontal overflow, no console errors, and no failed requests.

## Definition of Done
- [x] Code builds without errors.
- [x] Responsive shell works through rendered UI proof.
- [x] Route alias works.
- [x] Changes are documented.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` were already checked for the current People/Agents vertical slice and remain satisfied for this UI-only routing/layout fix.
