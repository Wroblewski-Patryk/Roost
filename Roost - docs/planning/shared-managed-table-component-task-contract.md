# Shared Managed Table Component Task Contract

Task ID: CC-DATA-TABLE-MANAGED-005

Task Type: frontend/UX/maintainability

Current Stage: verification

Deliverable For This Stage: a reusable managed table component with filters, sorting, column visibility, selection, row actions, pagination, and modal-safe Directory adoption.

## Goal

Upgrade `CcDataTable` from a simple table/list primitive into a reusable management-table foundation for CompanyCore/Roost modules. The component must support common operator needs without every route rebuilding table mechanics locally.

## Scope

- `web/src/components/cc-data-table.tsx`
- `web/src/features/departments/people-agents-route.tsx`
- `docs/ux/design-memory.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`
- `.agents/core/project-memory-index.md`

## Implementation Plan

1. Preserve existing `CcDataTable` usage while adding managed-table props.
2. Add a three-zone component structure: filter/settings bar, table body, and pagination footer.
3. Add reusable client-side query search, quick filters, column filters, sortable headers, column visibility dropdown, first-column checkbox selection, row action items, optional bulk action callbacks, and page-size/page navigation controls.
4. Reuse DaisyUI primitives: table, checkbox, dropdown, select, join, button, and dialog modal patterns.
5. Move People/Agents Directory filtering, sorting, row actions, duplicate action, and pagination onto the shared component.
6. Replace `window.confirm` archive/delete confirmations with a DaisyUI-style modal.
7. Verify desktop/tablet/mobile behavior and run repository quality gates.

## Acceptance Criteria

- [x] `CcDataTable` table element has `min-w-full` and still supports route-provided min-width constraints.
- [x] Component renders filters/settings, table, and pagination as separate stacked zones.
- [x] Columns can opt into filters from fixed values present in table data.
- [x] Columns can be sorted by clicking headers with ascending/descending direction.
- [x] User can hide/show non-required columns through a dropdown.
- [x] First column is checkbox selection with select-all/deselect-all for visible rows.
- [x] Optional bulk actions can receive selected row data.
- [x] Row action items can include default management actions plus route-specific additions.
- [x] Pagination supports page sizes `10`, `25`, `50`, `100`, `250`, `500`, previous/next buttons, and page number input.
- [x] People/Agents Directory uses the enhanced component for search, People/Agents scope, filters, sorting, duplicate/edit/archive/delete/preview actions, and pagination.
- [x] Archive/delete confirmation uses a modal, not `window.confirm`.

## Definition Of Done

- [x] `npm run build:web`
- [x] `npm run validate`
- [x] `npm run test:api:local`
- [x] `git diff --check`
- [x] Playwright responsive proof for desktop, tablet, and mobile.
- [x] Evidence screenshots saved under `docs/ux/evidence/managed-table-preview-*.png`.
- [x] Validation server, Docker containers, and headless browser processes cleaned up.
- [x] Source-of-truth state and UX memory updated.

## Result Report

Implemented and verified. `CcDataTable` now supports managed-table behavior: quick filters, search, fixed-value column filters, sortable headers, column visibility dropdown, checkbox row selection, optional bulk actions, row action definitions, sticky select/action columns, internal pagination, and page-size/page input controls. Existing simple usage remains compatible.

`06 People & Agents -> Directory` now delegates table mechanics to `CcDataTable`. The route provides People/Agents/Directors/Needs-attention quick filters, status/type/runtime column filters, sortable operational columns, Preview/Duplicate/Edit/Archive/Delete row actions, and DaisyUI-style archive/delete confirmation modal. `window.confirm` is no longer used for those record actions.

Validation passed: `npm run build:web`, `npm run validate`, `npm run test:api:local` with all 25 migrations and 6/6 API tests, and `git diff --check`. Playwright proof on Vite build preview verified desktop, tablet, and mobile interactions: quick filter, page-size select, next/page input, select-all with selected count, column visibility dropdown, runtime filter, clear filters, duplicate modal, archive modal, and no page-level horizontal overflow. The preview server produced a known local-only 404 for `/vendor/phosphor/bold/style.css`; production Express serves that asset from `public/vendor`.
