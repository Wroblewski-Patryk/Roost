# DMS-SHELL-001 Shared Department Management Shell Task Contract

## Task Type

Frontend implementation / UX architecture.

## Current Stage

Implementation.

## Deliverable For This Stage

Extract the selected-area department route into one reusable department
management shell so `00 Main`, `04 Operations`, and future department systems
share the same layout contract.

## Goal

Make the selected-area department view reusable before building the remaining
department systems. The shared shell must preserve existing `00 Main` intake
and `04 Operations` behavior while adding the common improvement-loop zone that
every department system needs.

## Scope

- `web/src/main.tsx`
  - Add `DepartmentManagementShell`.
  - Add `DepartmentImprovementLoop`.
  - Route selected-area rendering through the shared shell.
  - Keep `MainIntakeSystemPanel` and `OperationsManagementSystemPanel` as
    special panels inside the shared shell.
- `web/src/styles.css`
  - Add scoped styles for the shell and improvement loop.
- `web/src/react-route-kit.tsx`
  - Make shell navigation keys unique where duplicate hrefs appear across
    route groups.
- Source-of-truth updates:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/core/project-memory-index.md`
  - `.agents/state/*`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/v1-department-systems-global-implementation-plan.md`

## Explicit Exclusions

- No backend route or schema changes.
- No department packet API yet.
- No new write actions.
- No visual redesign beyond the shared shell/improvement-loop structure.
- No changes to provider sync, pricing, invoice, or approval behavior.

## Implementation Plan

1. Inspect current selected-area route composition.
2. Extract a reusable shell that owns the common department layout:
   identity/hero, optional special panel, capability tabs, operating board,
   selected view, improvement loop, and evidence grid.
3. Keep existing `00 Main` and `04 Operations` panels as injected special
   panels.
4. Add common improvement-loop UI derived from existing tasks, decisions,
   records, Drive evidence, and MCP visibility.
5. Fix duplicate shell navigation keys discovered during browser proof.
6. Validate with web build, diff hygiene, and rendered route proof for `00`,
   `01`, and `04`.
7. Refresh source-of-truth files and commit/push.

## Acceptance Criteria

- [x] `AreaDetailView` renders through one shared department shell component.
- [x] `00 Main` intake panel still renders inside the shell.
- [x] `04 Operations` management panel still renders inside the shell.
- [x] A normal department such as `01 Strategy` still renders the shared
      operating board.
- [x] All selected departments render the common improvement loop.
- [x] Desktop and mobile proof have no horizontal overflow.
- [x] Browser proof has no console/page errors in the clean static SPA
      harness.
- [x] `npm run build:web` passes.
- [x] `git diff --check` passes.

## Definition Of Done

- [x] Runtime frontend implementation is complete for the scoped shell
      extraction.
- [x] Existing special department panels keep their behavior.
- [x] Source-of-truth docs and ledgers are updated.
- [x] Validation evidence is recorded.
- [x] Commit is pushed to the active branch.

## Result Report

Completed. The selected-area route now has a reusable
`DepartmentManagementShell` with a shared improvement loop. Existing `00 Main`
and `04 Operations` special panels are injected into the shell, while standard
departments retain the existing operating board, selected view, and evidence
grid. The React shell navigation now uses unique keys for duplicate route hrefs.

Validation:

- `npm run build:web` passed.
- `git diff --check` passed.
- Playwright static SPA proof on `http://127.0.0.1:3206` verified:
  - `/areas?area=01-strategia&view=overview`
  - `/areas?area=04-operacje&view=overview`
  - `/areas?area=00-ogolny&view=overview`
  - mobile `/areas?area=04-operacje&view=overview`
- Required markers were present, no horizontal overflow was found, and
  console/page errors were empty.
- Temporary validation servers on ports `3204`, `3205`, and `3206` were stopped.
