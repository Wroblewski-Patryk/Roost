# Task

## Header
- ID: V1AREATASKS-001
- Title: V1 Selected Area Tasks Depth
- Task Type: feature
- Current Stage: verification
- Status: VERIFIED
- Owner: Frontend Builder + QA/Test
- Depends on: V1TASKS-001, V1KNOW-001, DMS-SHELL-003
- Priority: P1
- Module Confidence Rows: V1AREATASKS-001
- Requirement Rows: REQ-V1AREATASKS-001
- Risk Rows: RISK-V1AREATASKS-001
- Operation Mode: BUILDER
- Mission ID: V1AREATASKS-001

## Goal
Deepen the selected-area `tasks` capability so department execution shows task
evidence, execution tables, provider pressure, ownership gaps, and safe owner
actions without pretending that a direct task-to-area relation exists.

## Scope
Allowed files:

- `web/src/main.tsx`
- `web/src/styles.css`
- `docs/planning/v1-selected-area-tasks-depth-task-contract.md`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/*`
- `docs/planning/mvp-next-commits.md`
- `docs/ux/evidence/v1-area-tasks-depth-desktop.png`
- `docs/ux/evidence/v1-area-tasks-depth-mobile.png`

## Implementation Plan
1. Reuse the existing selected-area context, task-related table records,
   provider mappings, Drive evidence, and shared department shell.
2. Add a `tasks`-only execution panel for task evidence, execution tables,
   provider pressure, guarded ownership, execution packet, and owner action
   queue.
3. Link the owner to `/tasks-adapter` for real task creation and movement.
4. Make the missing direct task-to-area ownership relation explicit instead of
   faking area task counts.
5. Avoid backend schema changes, task writes, provider writes, or invented
   relationships.
6. Verify desktop and mobile against a real local backend.

## Acceptance Criteria
- `/areas?area=04-operacje&view=tasks` renders a task-specific execution panel
  inside the selected-area shell.
- The view shows task evidence, execution tables, provider pressure, ownership
  model, execution packet, owner action queue, and guarded task-to-area
  language.
- No new backend writes, provider writes, fake relationships, or hidden
  task-to-area ownership is introduced.

## Definition Of Done
- React route implementation builds.
- State and planning files record the proof and next queue.
- Real backend Playwright proof covers desktop and mobile
  `/areas?area=04-operacje&view=tasks`.

## Result Report
- Status: VERIFIED
- Files changed:
  - `web/src/main.tsx`
  - `web/src/styles.css`
  - `docs/planning/v1-selected-area-tasks-depth-task-contract.md`
  - source-of-truth state and planning files
  - `docs/ux/evidence/v1-area-tasks-depth-desktop.png`
  - `docs/ux/evidence/v1-area-tasks-depth-mobile.png`
- Validation:
  - `npm run build:web`: passed.
  - Playwright real-backend proof on `http://127.0.0.1:3218` registered a
    fresh owner and verified desktop plus mobile
    `/areas?area=04-operacje&view=tasks` with `Task execution`, `Execution
    pressure without fake ownership`, `Task evidence`, `Execution tables`,
    `Provider pressure`, `Ownership model`, `Execution packet`, and `Owner
    action queue`.
  - Screenshots:
    `docs/ux/evidence/v1-area-tasks-depth-desktop.png` and
    `docs/ux/evidence/v1-area-tasks-depth-mobile.png`.
  - No console/page errors or horizontal overflow were reported.
- Residual risk: production smoke remains pending after deploy. Direct
  task-to-area ownership remains a future backend-backed slice.
