# Task

## Header
- ID: PEOPLE-AGENTS-DIRECTORY-UX-002
- Title: People/Agents Directory management presentation
- Task Type: feature
- Current Stage: release
- Status: DONE
- Owner: Frontend Builder + Backend Builder + QA/Test
- Priority: P1
- Module Confidence Rows: DMS-06-WORKFORCE-001
- Requirement Rows: REQ-PA-DIRECTORY-MGMT-UX-002
- Operation Mode: BUILDER
- Mission ID: PEOPLE-AGENTS-DIRECTORY-MGMT-UX-2026-05-18
- Mission Status: COMPLETE

## Goal
Make `06 People & Agents -> Directory` clearer and more useful as a management
tool by separating roster scanning from preview, adding per-record actions, and
correcting the owner human profile.

## Scope
- `web/src/features/departments/people-agents-route.tsx`
- `web/src/types.ts`
- `src/modules/workforce/workforce.routes.ts`
- `src/modules/workforce/workforce.service.ts`
- `src/auth/capabilities.ts`
- `src/tests/api.test.ts`
- `prisma/seed.ts`
- UX audit and state docs

## Implementation Plan
1. Audit the current screen and record the UX issues.
2. Change preview to explicit selection only.
3. Add row-local Preview/Edit/Archive/Delete actions.
4. Add a guarded hard-delete backend action separate from archive.
5. Correct owner seed identity and INTJ-aligned Big Five profile.
6. Verify build, API, seed, and responsive UI behavior.

## Acceptance Criteria
- [x] The detail inspector is hidden until a record is previewed.
- [x] Each visible record exposes preview, edit, archive, and guarded delete
      actions locally.
- [x] Archive remains lifecycle state and hard delete uses a separate backend
      command.
- [x] User-backed owner records cannot be hard-deleted.
- [x] Seeded owner workforce record displays Patryk Wroblewski, not
      `Local owner`, and includes an INTJ-aligned Big Five profile.
- [x] Desktop, tablet, and mobile proofs show no horizontal overflow.

## Result Report
- Audit published in
  `docs/ux/people-agents-directory-usability-audit-2026-05-18.md`.
- Frontend now uses explicit preview selection only, row-local
  Preview/Edit/Archive/Delete controls, responsive management rows, and a
  mobile/tablet detail-first selected state.
- Backend now exposes guarded `POST /v1/workforce/:id/actions/delete` while
  preserving `DELETE /v1/workforce/:id` as archive.
- Registration-created owner workforce records are `source=user`; seed updates
  the owner to `Patryk Wroblewski`, `Founder / Owner`, analytical profile, and
  INTJ-aligned Big Five scores.
- Verification passed: `npm run validate`, `npm run test:api:local`,
  disposable PostgreSQL migration/seed smoke, and rendered desktop/tablet/mobile
  Directory proof. Evidence screenshots:
  `docs/ux/evidence/people-agents-directory-management-desktop-list.png`,
  `docs/ux/evidence/people-agents-directory-management-desktop-preview.png`,
  `docs/ux/evidence/people-agents-directory-management-tablet-list.png`,
  `docs/ux/evidence/people-agents-directory-management-tablet-preview.png`,
  `docs/ux/evidence/people-agents-directory-management-mobile-list.png`, and
  `docs/ux/evidence/people-agents-directory-management-mobile-preview.png`.
