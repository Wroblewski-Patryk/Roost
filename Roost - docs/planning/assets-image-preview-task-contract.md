# Task

## Header
- ID: ASSETS-IMAGE-PREVIEW-004
- Title: Authenticated Drive image previews in Assets
- Task Type: bugfix | feature | verification
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder + Frontend Builder + QA/Test
- Depends on: ASSETS-FILES-003
- Priority: P0
- Requirement Rows: REQ-ASSETS-IMAGE-PREVIEW-004
- Risk Rows: RISK-CC-08-001; RISK-WEB-DENSE-WORKBENCH-001
- Iteration: 2026-05-17-BUILDER
- Operation Mode: BUILDER
- Mission ID: ASSETS-IMAGE-PREVIEW-004
- Mission Status: VERIFIED

## Process Self-Audit
- [x] One bounded mission objective is selected.
- [x] Existing Google Drive OAuth and Assets packet contracts are reused.
- [x] No raw provider table editing or unauthenticated file exposure is added.
- [x] The fix targets the active `08 Assets -> Files and folders` user journey.
- [x] Verification and source-of-truth updates are planned.

## Mission Block
- Mission objective: Make Drive-hosted image resources render inside Assets without relying on fragile direct Drive image URLs.
- Release objective advanced: improve the active `08 Assets` workbench enough for real file browsing.
- Included slices: backend image preview proxy, frontend authenticated image rendering, route proof.
- Explicit exclusions: broad Drive resync redesign, image editing, binary database storage, public file sharing, and non-image media preview.
- Stop conditions: file endpoint exposes cross-workspace data, route cannot build, or rendered proof cannot show a Drive image.

## Goal
Render Google Drive image resources inside Assets cards and preview panel through a CompanyCore authenticated preview path.

## Scope
- `src/integrations/google-drive/google-drive.client.ts`
- `src/modules/assets/assets.routes.ts`
- `src/auth/capabilities.ts`
- `web/src/features/departments/assets-route.tsx`
- `web/src/i18n/messages.ts`
- source-of-truth docs/state files touched by this task

## Implementation Plan
1. Add a Google Drive binary media download helper.
2. Add `GET /v1/assets/files/:id/preview` for workspace-scoped image files.
3. Use authenticated blob rendering in Assets image cards and preview panel.
4. Add friendly image error/fallback state.
5. Run build, validation, and rendered proof with mocked image bytes.
6. Update ledgers and task state.

## Acceptance Criteria
- [x] Google Drive image files render without requiring direct public Drive links.
- [x] Preview endpoint is workspace-scoped and limited to image resources.
- [x] Assets card thumbnails and preview panel use the same authenticated image path.
- [x] A failed image load shows a useful fallback and Open action remains available.
- [x] Build, validation, diff hygiene, and rendered route proof pass.

## Deliverable For This Stage
Authenticated Drive image preview support for Assets Files/Folders.

## Constraints
- Keep provider writes blocked.
- Do not store binary image data in the database.
- Do not make Drive files public.

## Validation Evidence
- Tests: `npm run build:server`; `npm run build:web`; `npm run validate`; `DATABASE_URL=postgresql://user:pass@localhost:5432/companycore_validation npx prisma validate`; `git diff --check`.
- Manual checks: Playwright static React proof on temporary port `3395` mocked an Assets packet with a Google Drive PNG and verified the frontend called `/v1/assets/files/:id/preview` with `Authorization: Bearer proof-token`, rendered the image as a blob in the card and preview panel, and had no horizontal overflow or console/page errors.
- Screenshots/logs: `.codex/tmp/assets-auth-image-preview.png`.
- Reality status: verified

## Result Report
- Task summary: Added a workspace-scoped authenticated Drive image preview route and switched Assets image rendering to authenticated blob loading.
- Files changed: `src/integrations/google-drive/google-drive.client.ts`, `src/modules/assets/assets.routes.ts`, `src/auth/capabilities.ts`, `web/src/features/departments/assets-route.tsx`, `web/src/i18n/messages.ts`, and source-of-truth state files.
- How tested: Server build, web build, full validation, Prisma schema validation with dummy `DATABASE_URL`, diff hygiene, and rendered image proof.
- What is incomplete: Production smoke against the real Drive image dataset remains pending after deploy.
- Next steps: After deploy, open `08 Assets -> Files/Folders`, filter by Images, and confirm real Drive image files render; if missing files are absent from the list, run Drive import/reconcile separately.
