# Task

## Header
- ID: V1REL-001
- Title: V1 Area Relationship Provenance Review
- Task Type: feature
- Current Stage: verification
- Status: VERIFIED
- Owner: Frontend Builder + QA/Test
- Depends on: V1DATA-001, REQ-WEBFOUND-004, REQ-WEBFOUND-005
- Priority: P1
- Module Confidence Rows: V1REL-001
- Requirement Rows: REQ-V1REL-001
- Risk Rows: RISK-V1REL-001
- Operation Mode: BUILDER
- Mission ID: V1REL-001

## Goal
Convert `/relationships` from a transitional graph workbench into a V1
relationship provenance review surface that explains which links are direct,
provider-derived, inferred, in review, or unsupported for a selected company
area.

## Scope
Allowed files:

- `web/src/main.tsx`
- `web/src/app-route-registry.ts`
- `docs/planning/v1-relationship-provenance-review-task-contract.md`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/*`
- `docs/planning/mvp-next-commits.md`
- `docs/ux/evidence/v1-relationship-provenance-desktop.png`
- `docs/ux/evidence/v1-relationship-provenance-mobile.png`

## Implementation Plan
1. Reuse the existing `/v1/relationships/graph` read model and route-kit data
   loader instead of adding graph writes or fake edges.
2. Add an area focus control that filters relationship evidence by the selected
   Company Atlas area when possible.
3. Show provenance metrics for direct, provider-derived, inferred, and review
   relationships.
4. Render an agent-readable edge list with source model, source field,
   confidence, route, and action hints.
5. Keep review queue and unsupported family reporting visible so agents do not
   treat weak or missing links as direct facts.
6. Verify desktop and mobile against a real local backend.

## Acceptance Criteria
- `/relationships?area=04-operacje` renders a V1 provenance review, not a raw
  relationship admin screen.
- The view exposes direct, provider, inferred, review, and unsupported signals.
- Selected-area focus is visible and can be changed without route-specific
  custom navigation.
- The view links relationship evidence back to selected-area resources and the
  V1 data evidence browser.
- No new backend schema, broad edge CRUD, provider write, or fake relationship
  data is introduced.

## Definition Of Done
- React route implementation builds.
- Route registry marks `/relationships` as V1 foundation.
- State and planning files record the new proof and next queue.
- Real backend Playwright proof covers desktop and mobile
  `/relationships?area=04-operacje`.

## Result Report
- Status: VERIFIED
- Files changed:
  - `web/src/main.tsx`
  - `web/src/app-route-registry.ts`
  - `docs/planning/v1-relationship-provenance-review-task-contract.md`
  - source-of-truth state and planning files
  - `docs/ux/evidence/v1-relationship-provenance-desktop.png`
  - `docs/ux/evidence/v1-relationship-provenance-mobile.png`
- Validation:
  - `npm run build:web`: passed.
  - Playwright real-backend proof on `http://127.0.0.1:3216` registered a
    fresh owner, seeded mapped and unscoped provider/Drive relationship
    evidence, and verified desktop plus mobile
    `/relationships?area=04-operacje` with `V1 relationship provenance`,
    agent-safe provenance framing, area focus, provenance edges, review queue,
    and unsupported families.
  - Screenshots:
    `docs/ux/evidence/v1-relationship-provenance-desktop.png` and
    `docs/ux/evidence/v1-relationship-provenance-mobile.png`.
  - No console/page errors or horizontal overflow were reported.
- Residual risk: production smoke remains pending after deploy. Direct
  relationship writes and provider remapping remain outside this route until
  explicit command contracts exist.
