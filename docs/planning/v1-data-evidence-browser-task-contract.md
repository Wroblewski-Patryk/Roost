# Task

## Header
- ID: V1DATA-001
- Title: V1 Data Evidence Browser
- Task Type: feature
- Current Stage: verification
- Status: VERIFIED
- Owner: Frontend Builder + QA/Test
- Depends on: V1OPS-001, V1TASKS-001, DMS-04-001
- Priority: P1
- Module Confidence Rows: V1DATA-001
- Requirement Rows: REQ-V1DATA-001
- Risk Rows: RISK-V1DATA-001
- Operation Mode: BUILDER
- Mission ID: V1DATA-001

## Goal
Convert `/data` and `/data/:table` from a generic table browser into a V1
evidence browser that shows department ownership, table records, API source
routes, agent-readable capability context, empty tables, and review gaps.

## Scope
Allowed files:

- `web/src/main.tsx`
- `web/src/app-route-registry.ts`
- `docs/planning/v1-data-evidence-browser-task-contract.md`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/*`
- `docs/planning/mvp-next-commits.md`
- `docs/ux/evidence/v1-data-evidence-browser-desktop.png`
- `docs/ux/evidence/v1-data-evidence-browser-mobile.png`

## Implementation Plan
1. Reuse existing `/v1/connection`, table-record snapshot, provider mapping,
   and Google Drive file contracts.
2. Render V1 evidence metrics for department records, agent-readable tables,
   empty tables, and review gaps.
3. Add selected-table context for owner area, API source route, records,
   read capability, agent packet readiness, and write-mode boundary.
4. Add department coverage rows linking table evidence back to selected-area
   department views.
5. Preserve generic record inspection and empty states without adding new
   backend writes or fake data.
6. Verify desktop and mobile against a real local backend.

## Acceptance Criteria
- `/data` explains company evidence health, not only raw table browsing.
- `/data/:table` shows selected-table records with owner context and
  agent-readable capability context.
- Company OS table records load through the existing `company-os:read`
  capability.
- The route links records back to department views and agent tools.
- No new backend schema, raw write action, fake data, or provider-direct
  action is introduced.

## Definition Of Done
- React route implementation builds.
- Route registry marks `/data` as V1 foundation.
- State and planning files record the new proof and next queue.
- Real backend Playwright proof covers desktop `/data` and mobile
  `/data/procedures`.

## Result Report
- Status: VERIFIED
- Files changed:
  - `web/src/main.tsx`
  - `web/src/app-route-registry.ts`
  - `docs/planning/v1-data-evidence-browser-task-contract.md`
  - source-of-truth state and planning files
  - `docs/ux/evidence/v1-data-evidence-browser-desktop.png`
  - `docs/ux/evidence/v1-data-evidence-browser-mobile.png`
- Validation:
  - `npm run build:web`: passed.
  - Playwright real-backend proof on `http://127.0.0.1:3215` registered a
    fresh owner, seeded Company OS evidence records, and verified desktop
    `/data` plus mobile `/data/procedures` with `V1 evidence browser`,
    department records, agent-readable context, empty-table signals, review
    gaps, owner context, department coverage, `company-os:read`, and the
    seeded procedure record.
  - Screenshots:
    `docs/ux/evidence/v1-data-evidence-browser-desktop.png` and
    `docs/ux/evidence/v1-data-evidence-browser-mobile.png`.
  - No console/page errors or horizontal overflow were reported.
- Residual risk: production smoke remains pending after deploy. Data writes
  remain limited to existing typed editors and command contracts.
