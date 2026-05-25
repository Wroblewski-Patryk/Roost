# ASSETS-FOLDERS-002 Folder Tree And Edit Command

## Task Type

Product/runtime implementation.

## Current Stage

Verification.

## Deliverable For This Stage

Implement and verify a usable `08 Assets -> Files and folders` folder-management
slice with a root-folder selector, folder tree, and governed folder metadata
edit command.

## Goal

Make Assets folders manageable as CompanyCore/Roost domain objects instead of
raw database rows. Root folders act as source filters and can own department
assignment. Nested folders inherit their department from the root and can be
renamed or moved inside the root-folder hierarchy.

## Scope

- Backend/API:
  - `src/modules/assets/assets.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/auth/agent-key-profiles.ts`
  - `src/mcp/manifest.ts`
  - `src/tests/api.test.ts`
- Web:
  - `web/src/features/departments/assets-route.tsx`
  - `web/src/api/errors.ts`
  - `web/src/i18n/messages.ts`
- State/docs:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/module-confidence-ledger.md`
  - `docs/ux/design-memory.md`

## Implementation Plan

1. Add `assets:write` and a governed `PATCH /v1/assets/folders/:id` command.
2. Enforce folder rules:
   - target must be a workspace-scoped Google Drive folder;
   - parent must be a visible workspace folder;
   - cycles are rejected;
   - only root folders may accept direct department assignment;
   - nested folders inherit area assignment from their root;
   - root assignment changes cascade to descendants.
3. Expose the route through the adapter manifest and MCP manifest for controlled
   operator agents only.
4. Replace the department-first Assets filter with root-folder source
   selection.
5. Render a collapsible folder/file tree and reuse one folder edit form for
   root and nested folders.
6. Verify build, schema, UI interaction, and route contract test coverage.

## Acceptance Criteria

- `08 Assets -> Files and folders` shows root folders as the primary filter.
- Folder structure is visible as a collapsible tree with files as leaves.
- Root folders can change name, parent, and department assignment.
- Nested folders can change name and parent, but the department select is
  disabled because department scope is inherited.
- API rejects assigning a department to a nested folder.
- API rejects parent cycles.
- API cascades root department assignment changes to descendants.
- The route appears in adapter/MCP manifest as `assets:write`.
- UI handles backend folder-rule errors with user-facing messages.

## Definition Of Done

- `npm run validate` passes.
- `npx prisma validate` passes with a validation `DATABASE_URL`.
- Render proof covers desktop, folder selection, nested-folder edit modal,
  save/refresh, and mobile.
- `npm run test:api` is attempted; any environment blocker is recorded.
- Durable state files are updated.

## Result Report

- Implemented `PATCH /v1/assets/folders/:id`.
- Added `assets:write` and exposed it only through the high-risk MCP operator
  profile, not read-only profiles.
- Rebuilt the Assets files view around root folders, collapsible tree,
  card/detail panes, and a shared folder-edit modal.
- Added API regression coverage for hierarchy readback, MCP manifest exposure,
  child department rejection, cycle rejection, root scope cascade, and moving a
  nested folder to root with direct department assignment.
- Validation:
  - `npm run build:server`: pass.
  - `npm run build:web`: pass.
  - `npm run validate`: pass.
  - `npx prisma validate`: pass with placeholder validation URL.
  - Playwright fallback render proof: pass on desktop and mobile, with no
    console/page errors. Browser plugin path was attempted first but timed out
    while connecting to the in-app tab.
  - `npm run test:api`: blocked before test execution because local
    `DATABASE_URL` is not configured.
