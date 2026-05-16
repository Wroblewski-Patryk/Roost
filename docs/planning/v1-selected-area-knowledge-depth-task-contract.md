# Task

## Header
- ID: V1KNOW-001
- Title: V1 Selected Area Knowledge Depth
- Task Type: feature
- Current Stage: verification
- Status: VERIFIED
- Owner: Frontend Builder + QA/Test
- Depends on: V1DATA-001, V1REL-001, DMS-SHELL-003
- Priority: P1
- Module Confidence Rows: V1KNOW-001
- Requirement Rows: REQ-V1KNOW-001
- Risk Rows: RISK-V1KNOW-001
- Operation Mode: BUILDER
- Mission ID: V1KNOW-001

## Goal
Deepen the selected-area `knowledge` capability so department knowledge shows
Drive/source coverage, AI-readable packet readiness, missing context, and
improvement work before owners or Paperclip rely on it.

## Scope
Allowed files:

- `web/src/main.tsx`
- `web/src/styles.css`
- `docs/planning/v1-selected-area-knowledge-depth-task-contract.md`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/core/project-memory-index.md`
- `.agents/state/*`
- `docs/planning/mvp-next-commits.md`
- `docs/ux/evidence/v1-area-knowledge-depth-desktop.png`
- `docs/ux/evidence/v1-area-knowledge-depth-mobile.png`

## Implementation Plan
1. Reuse the existing selected-area context, Drive file records, knowledge
   records, table records, and shared department shell.
2. Add a `knowledge`-only evidence panel for source readiness, agent packet
   readiness, descriptions, freshness, and improvement queue.
3. Render an agent-readable packet list from scoped Drive folders/files.
4. Keep the existing knowledge tree and table panels in place.
5. Avoid new backend schema, Drive writes, file edits, or fake knowledge data.
6. Verify desktop and mobile against a real local backend with scoped Drive
   evidence.

## Acceptance Criteria
- `/areas?area=04-operacje&view=knowledge` renders a knowledge-specific
  readiness panel inside the selected-area shell.
- The view shows Drive scope, agent packet, descriptions, freshness,
  agent-readable packet, and improvement queue.
- Scoped Drive files/folders are visible and mobile-safe.
- No new backend writes, provider writes, fake records, or autonomous source
  trust decisions are introduced.

## Definition Of Done
- React route implementation builds.
- State and planning files record the proof and next queue.
- Real backend Playwright proof covers desktop and mobile
  `/areas?area=04-operacje&view=knowledge`.

## Result Report
- Status: VERIFIED
- Files changed:
  - `web/src/main.tsx`
  - `web/src/styles.css`
  - `docs/planning/v1-selected-area-knowledge-depth-task-contract.md`
  - source-of-truth state and planning files
  - `docs/ux/evidence/v1-area-knowledge-depth-desktop.png`
  - `docs/ux/evidence/v1-area-knowledge-depth-mobile.png`
- Validation:
  - `npm run build:web`: passed.
  - Playwright real-backend proof on `http://127.0.0.1:3217` registered a
    fresh owner, seeded scoped Google Drive evidence for the Operations area,
    and verified desktop plus mobile
    `/areas?area=04-operacje&view=knowledge` with `Knowledge evidence`,
    `Drive scope`, `Agent packet`, `Descriptions`, `Freshness`,
    `Agent-readable packet`, `Improvement queue`, and seeded Drive source
    names.
  - Screenshots:
    `docs/ux/evidence/v1-area-knowledge-depth-desktop.png` and
    `docs/ux/evidence/v1-area-knowledge-depth-mobile.png`.
  - No console/page errors or horizontal overflow were reported.
- Residual risk: production smoke remains pending after deploy. Knowledge
  writes, Drive content edits, and autonomous source-trust decisions remain
  outside this slice.
