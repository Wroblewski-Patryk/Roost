# Task

## Header
- ID: PEOPLE-AGENTS-DIRECTORY-MODAL-UX-003
- Title: People/Agents Directory modal preview and form refinement
- Task Type: feature
- Current Stage: release
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Priority: P1
- Module Confidence Rows: DMS-06-WORKFORCE-001
- Requirement Rows: REQ-PA-DIRECTORY-MODAL-UX-003
- Operation Mode: BUILDER
- Mission ID: PEOPLE-AGENTS-DIRECTORY-MODAL-UX-2026-05-18
- Mission Status: COMPLETE

## Goal
Keep `06 People & Agents -> Directory` as a clean roster view and move profile
preview into the same modal interaction pattern used elsewhere in the web app.
Refine the create/edit workforce form so it is easier to scan and use.

## Scope
- `web/src/features/departments/people-agents-route.tsx`
- UX/state docs and rendered evidence screenshots

## Implementation Plan
1. Remove the right-column detail panel from the Directory base layout.
2. Convert workforce preview into a modal opened from the row Preview action.
3. Keep create/edit as a modal and organize the form into useful sections.
4. Verify desktop, tablet, and mobile behavior against overflow and modal
   state regressions.

## Acceptance Criteria
- [x] Directory renders as a single roster surface by default.
- [x] No detail/profile content is visible before a row Preview action.
- [x] Preview opens one modal with profile tabs and closes back to the roster.
- [x] Edit opens a form modal with clear Identity, Runtime, and Access sections.
- [x] Desktop, tablet, and mobile proofs show no horizontal overflow.

## Result Report
- `DetailPanel` was replaced with `DetailModal`; selected records no longer
  change the page into a two-column layout.
- The edit/create form modal now has a fixed header/footer, inner scroll area,
  and grouped sections: Identity and role, Runtime and personality, Access
  indexes.
- Verification passed: `npm run validate`; Browser plugin connection attempt
  was made but authenticated proof was blocked because the in-app browser
  exposed no `sessionStorage/localStorage` for the local app; Playwright
  fallback verified the real local server on desktop, tablet, and mobile.
- Evidence screenshots:
  `docs/ux/evidence/people-agents-directory-modal-desktop-list.png`,
  `docs/ux/evidence/people-agents-directory-modal-desktop-preview.png`,
  `docs/ux/evidence/people-agents-directory-modal-desktop-edit.png`,
  `docs/ux/evidence/people-agents-directory-modal-tablet-list.png`,
  `docs/ux/evidence/people-agents-directory-modal-tablet-preview.png`,
  `docs/ux/evidence/people-agents-directory-modal-tablet-edit.png`,
  `docs/ux/evidence/people-agents-directory-modal-mobile-list.png`,
  `docs/ux/evidence/people-agents-directory-modal-mobile-preview.png`, and
  `docs/ux/evidence/people-agents-directory-modal-mobile-edit.png`.
