# Assets File Preview Workbench Task Contract

## Task Type

Frontend + backend vertical slice.

## Current Stage

Verification.

## Deliverable For This Stage

Usable `08 Assets -> Files and folders` file workbench with source-backed
content previews and safe text-file editing.

## Goal

Make file content the primary object in the Assets detail panel instead of
showing mostly metadata, while preserving the CompanyCore rule that provider
writes go through explicit integration commands.

## Scope

- `src/integrations/google-drive/google-drive.client.ts`
- `src/integrations/google-drive/google-drive.content.ts`
- `src/modules/google-drive/google-drive.routes.ts`
- `src/modules/assets/assets.routes.ts`
- `src/auth/capabilities.ts`
- `src/integrations/errors.ts`
- `src/tests/api.test.ts`
- `web/src/features/departments/assets-route.tsx`
- `web/src/types.ts`
- `web/src/i18n/messages.ts`
- `web/src/styles.css`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/requirements-verification-matrix.md`

## Implementation Plan

1. Extend Google Drive content extraction to read normal text, Markdown, CSV,
   and JSON files through Drive media download.
2. Add a Drive text-file media update command for editable text formats instead
   of mutating raw database rows or pretending to edit source files.
3. Extend the Assets context packet with bounded snapshot preview fields,
   structured preview, media links, and file taxonomy for CSV, JSON, PDF, and
   images.
4. Replace the metadata-first file detail experience with a content-first
   preview panel for Markdown, CSV/table, JSON, image, PDF handoff, text, and
   unsupported files.
5. Keep folder editing available from the same panel and add text-file editor
   access only when the selected resource can be safely updated as Drive media.
6. Validate with builds, diff hygiene, and a rendered mocked Assets route proof.

## Acceptance Criteria

- Markdown files render readable inline content.
- CSV and Google Sheet snapshots render as compact tables.
- JSON snapshots render formatted JSON.
- PNG/JPG/SVG-style image resources render inline when a content or thumbnail
  URL is available.
- PDF resources show a clear Drive-open handoff instead of a metadata wall.
- Text/Markdown/CSV/JSON Drive files can be edited through a provider command.
- The Assets packet exposes only bounded preview text, not unbounded raw file
  dumps.
- The file list uses icon/content cues instead of noisy readiness badges.
- Folder tree, resource cards, and preview panel remain responsive and reuse
  existing Roost/Tailwind/DaisyUI styling.

## Definition Of Done

- `npm run build:server` passes.
- `npm run build:web` passes.
- `npm run validate` passes.
- `git diff --check` passes.
- Rendered route proof covers Markdown, CSV, JSON, image, PDF, no horizontal
  overflow, and no console errors.
- Source-of-truth task and confidence ledgers are updated.

## Result Report

- Implemented Drive media extraction for text, Markdown, CSV, and JSON files.
- Added `PATCH /v1/google-drive/files/:id/text-content` as the explicit
  provider command for editable text-file media.
- Extended `/v1/assets/context` with preview text, text length, truncation
  marker, structured preview, and source media links.
- Reworked the Assets files panel into a content-first preview workbench with
  Markdown, CSV, JSON, image, PDF, text, unsupported, and folder states.
- Validation passed:
  - `npm run build:server`
  - `npm run build:web`
  - `npm run validate`
  - `git diff --check`
  - Playwright static React proof on port `3342` for Markdown, CSV, JSON,
    SVG image, PDF handoff, no horizontal overflow, and no console errors.
- `npm run test:api` was not run because the current local environment still
  lacks `DATABASE_URL`; API assertion rows were updated for the Assets preview
  packet.
