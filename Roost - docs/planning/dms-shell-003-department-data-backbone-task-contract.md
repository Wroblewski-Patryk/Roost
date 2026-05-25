# DMS-SHELL-003 Department Data Backbone Task Contract

## Task Type

- Frontend/UX + verification

## Current Stage

- Verification

## Deliverable For This Stage

Shared department-shell data backbone that makes every selected department show
operating graph readiness, table/record context, knowledge/source count, and
review gaps with an honest local fallback when the graph is not available.

## Goal

Make the shared department shell more consistent before building more
department-specific boards. Every department should answer: what data backs
this system, what comes from the graph, what comes from fallback tables/sources,
and what still needs review?

## Scope

- `web/src/main.tsx`
  - Add `DepartmentDataBackbone`.
  - Render it inside `DepartmentManagementShell`.
- `web/src/styles.css`
  - Add responsive backbone styles.
- Source-of-truth updates:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/*`
  - `docs/planning/mvp-next-commits.md`

Out of scope:

- new backend graph routes
- department packet APIs
- finance/sales web boards
- write commands

## Implementation Plan

1. Use existing `AreaDetailContext.operatingGraph`, graph status, tables,
   table records, Drive items, and review debt.
2. Render a compact data-backbone section after subsystem registry and before
   capability tabs.
3. Show graph live/loading/error/pending state.
4. Show gaps from the operating graph when available and fallback text when not.
5. Validate build, diff hygiene, and desktop/mobile rendered routes.

## Acceptance Criteria

- The selected-area route renders `DepartmentDataBackbone` for normal
  departments.
- The section shows graph, tables, knowledge/source, and review-gap signals.
- The section has a non-graph fallback message.
- Desktop and mobile proofs cover representative departments.
- No console/page errors or horizontal overflow occur in proof.

## Definition Of Done

- `npm run build:web` passes.
- `git diff --check` passes.
- Render proof passes for desktop and mobile.
- Validation-owned server and database processes are stopped.
- Source-of-truth docs and state are updated.
- Commit and push complete.

## Result Report

- Status: verified.
- Evidence:
  - `DepartmentDataBackbone` added to `web/src/main.tsx`.
  - Responsive styles added to `web/src/styles.css`.
  - `npm run build:web`: passed.
  - `git diff --check`: passed.
  - Playwright proof on local backend `http://127.0.0.1:3212` verified
    `01-strategia`, `07-finanse`, and `12-zarzadzanie` on desktop and mobile.
    The proof found the data-backbone section, graph/tables/review-gap text,
    no horizontal overflow, and no console/page errors.
- Cleanup: validation backend and portable PostgreSQL were stopped.
- Residual risk: production visual proof remains a release follow-up; future
  department packet APIs should replace more fallback signals when available.
