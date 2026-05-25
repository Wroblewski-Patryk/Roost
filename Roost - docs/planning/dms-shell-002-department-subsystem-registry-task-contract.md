# DMS-SHELL-002 Department Subsystem Registry Task Contract

Last updated: 2026-05-16

## Task Type

Frontend/product implementation.

## Current Stage

Verification.

## Deliverable For This Stage

Static department-system registry for `00`-`12` rendered inside the shared
selected-area department shell.

## Goal

Make every department view present itself as a management system with a clear
system name, value role, owner question, first safe action, agent handoff,
subsystems, and blocked automation boundaries.

## Scope

- `web/src/main.tsx`
  - Add `departmentSystemRegistry` for all 13 Company Atlas areas.
  - Render `DepartmentSubsystemRegistry` inside `DepartmentManagementShell`.
  - Update the department hero to use system-specific value and owner-question
    copy.
- `web/src/styles.css`
  - Add scoped registry, subsystem card, owner-question, and blocked-action
    styling.
- Source-of-truth updates:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/core/project-memory-index.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/v1-department-systems-global-implementation-plan.md`

## Implementation Plan

1. Define one typed registry instead of 13 page-local component variants.
2. Add three subsystem entries for each department, with a consistent layer
   vocabulary.
3. Add blocked-action lists so agents and humans see the command boundaries.
4. Render the registry after the special panel and before capability tabs.
5. Validate build, diff hygiene, and real rendered department routes.
6. Refresh source-of-truth docs and commit.

## Acceptance Criteria

- Every `00`-`12` department has a registry entry.
- The selected-area route renders the system name and at least three
  subsystem cards.
- `06 Kadry` is explicitly People/Agents And Role Management System.
- Finance and Sales blocked actions prevent autonomous quoting, discounts,
  invoices, and binding offers.
- Technology and People/Agents blocked actions prevent unsupervised authority
  or scope expansion.
- Render proof covers more than one department and verifies no console errors
  or horizontal overflow.

## Definition Of Done

- `npm run build:web` passes.
- `git diff --check` passes.
- Browser proof passes for representative departments.
- Validation processes started by this task are stopped.
- Source-of-truth files are updated.

## Result Report

- Added a typed 13-department subsystem registry to `web/src/main.tsx`.
- Added the shared `DepartmentSubsystemRegistry` component inside
  `DepartmentManagementShell`.
- Updated the hero to use system-specific value role and owner-question copy.
- Added scoped styles in `web/src/styles.css`.
- Validation passed:
  - `npm run build:web`
  - `git diff --check`
  - Playwright real-backend proof on `http://127.0.0.1:3211`
- Browser proof verified:
  - `01-strategia` -> `Strategy Management System` / `Goals and targets`
  - `06-kadry` -> `People/Agents And Role Management System` /
    `Human and agent roster`
  - `07-finanse` -> `Finance And Billing Management System` /
    `Price list and hourly value`
  - `12-zarzadzanie` -> `Executive Management System` / `Owner command`
  - no console errors and no horizontal overflow
- Temporary validation backend and PostgreSQL processes on ports `3211` and
  `55480` were stopped after proof.
