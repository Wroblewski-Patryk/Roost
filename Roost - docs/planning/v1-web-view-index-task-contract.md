# V1WEB-INDEX-001 Web View UX Maturity Index

## Task Type

Documentation / Planning

## Current Stage

Verification

## Deliverable For This Stage

Create a durable index that marks current web routes as V1 canonical,
V1 foundation, V0 rebuild, V0 compatibility, or V2 deferred, and tie that index
to user journeys and future implementation order.

## Goal

Make it obvious which views are being built from canonical V1 UX references
and which old views remain transitional surfaces to rebuild or remove.

## Scope

- `docs/ux/v1-web-view-index-2026-05-15.md`
- `web/src/app-route-registry.ts`
- `docs/architecture/web-layer-react-ownership.md`
- `docs/ux/design-memory.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/*`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan

1. Define route/view maturity statuses.
2. Mark Company Atlas and selected-area detail as `V1 canonical`.
3. Mark foundation surfaces that are useful but not canonical yet.
4. Mark old/transitional module views as `V0 rebuild` or compatibility aliases.
5. Map primary user journeys from dashboard to selected department and deeper
   capabilities.
6. Add lightweight route registry markers so implementation work can see the
   UX status near route metadata.
7. Update architecture, planning, and memory indexes.

## Acceptance Criteria

- Every active user-facing React route has a V1/V0 maturity classification.
- Canonical views name their source specs.
- V0 views have an explicit rebuild direction.
- Primary owner journeys are documented.
- Future build order is explicit.
- `git diff --check` passes.

## Definition Of Done

- The index is recoverable from repository docs.
- The route registry contains matching lightweight UX stage markers.
- Active planning queues point to V1 capability depth and rebuild work.
- Documentation uses English and does not rely on hidden chat memory.

## Result Report

- Status: implemented and locally verified.
- Validation:
  - `git diff --check`: passed.
- Residual risk:
  - This is an index and planning slice; runtime behavior is unchanged except
    route metadata annotations.
