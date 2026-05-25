# V1 Area Operating Room Layer Depth Task Contract

Last updated: 2026-05-15

## Task Type

Frontend UX/UI implementation.

## Current Stage

Implementation and verification.

## Deliverable For This Stage

Improve the selected-area V1 operating room so department tabs are not isolated
lists. The view should connect goals, workflows, tasks, knowledge, and sources
through reusable area-scoped components.

## Goal

Make `/areas?area=:areaKey&view=:viewId` easier to understand as a human and
AI operating room. The owner should quickly see which tables, records, Drive
items, provider containers, and proof sources make up the selected department,
then drill into the right layer without losing context.

## Scope

- `web/src/main.tsx`
  - Shared area layer insights.
  - Area operating map.
  - Data layer panel.
  - Google Drive knowledge tree panel.
- `web/src/styles.css`
  - Responsive styling for the new shared area layer components.

## Implementation Plan

1. Keep using the existing selected-area data contract:
   `AreaDetailContext`, backend operating tables, table record snapshots,
   Google Drive files, and external provider mappings.
2. Add a reusable operating-map component that explains the area flow:
   goals -> workflows -> tasks -> knowledge -> sources.
3. Add a reusable layer workbench that shows backend tables/records and synced
   Drive knowledge for the active area tab.
4. Add a Drive tree component built from `parentExternalId` so knowledge reads
   like folders and files instead of a flat list.
5. Validate build and render the production route after deployment.

## Acceptance Criteria

- The selected-area view contains a visible operating graph/layer map.
- The active layer shows area tables and record counts.
- The knowledge layer shows a folder/file tree from synced Google Drive data.
- The implementation is shared for all departments because it is derived from
  `AreaDetailContext`, not hardcoded to Strategy.
- Desktop and mobile must avoid horizontal overflow.
- `npm run validate` passes.

## Definition Of Done

- Code is committed and pushed.
- Production deploy is completed if the user asks to see it live.
- Screenshot proof is captured for desktop and mobile selected-area routes.
- Any remaining backend/data limitation is recorded.

## Result Report

Completed on 2026-05-15.

- Commit deployed:
  `95927f61724444fdb7555f538624762eb13f5794`.
- Runtime image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:95927f6`.
- Running backend container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-95927f6`.
- Validation:
  `npm run build:web`, `npm run validate`, `git diff --check`, VPS Docker
  image build, canary health, final routed container health, public web/API
  health, and authenticated production Playwright proof passed.
- Evidence:
  `docs/ux/evidence/production-area-operating-room-95927f6-2026-05-15/`.
- Result:
  The selected-area V1 view now includes a reusable operating graph, active
  layer context, tables/records panel, and Drive knowledge tree derived from
  `AreaDetailContext`. Production proof covered overview, goals, workflows,
  and knowledge tabs on desktop and mobile with no horizontal overflow,
  console errors, failed requests, or missing graph/layer/tree markers.
