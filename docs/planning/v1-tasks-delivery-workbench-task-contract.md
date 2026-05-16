# V1TASKS-001 Tasks And Delivery Workbench Task Contract

## Header
- ID: V1TASKS-001
- Title: Tasks and delivery V1 workbench
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: V1OPS-001
- Priority: P1
- Module Confidence Rows: WEB-V1-TASKS
- Requirement Rows: REQ-V1TASKS-001
- Risk Rows: RISK-V1TASKS-001
- Iteration: 2026-05-16 V1 web cleanup
- Operation Mode: BUILDER
- Mission ID: V1-WEB-TASKS-DELIVERY
- Mission Status: DONE

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode is BUILDER for this implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] Affected module confidence, requirement, and risk rows were identified.
- [x] The task removes one V0 rebuild route from the V1 web index.

## Mission Block
- Mission objective: convert `/tasks-adapter` from a V0 table workbench into a
  V1 tasks and delivery cockpit connected to `/operations`.
- Release objective advanced: the owner can supervise execution pressure,
  create tasks, change task status, and understand AI handoff readiness from
  real task data.
- Included slices: route registry status, React task workbench layout,
  task create form, quick status update controls, department ownership
  context, AI handoff context, responsive proof, and source-of-truth updates.
- Explicit exclusions: new task schema, new assignment model, ClickUp provider
  write behavior beyond existing task routes, production deployment.
- Checkpoint cadence: implement one route and verify it end-to-end locally.
- Stop conditions: missing backend contract for task create/update, build
  failure, API regression, browser proof with horizontal overflow, or route
  data becoming fake.
- Handoff expectation: next slices can deepen `/data`, `/relationships`, or
  area-specific task capability views without changing the task API boundary.

## Context

The user asked to keep working until V1 is present across the whole app and
V0 can disappear. `docs/ux/v1-web-view-index-2026-05-15.md` marks
`/tasks-adapter` as `V0 rebuild`; V1OPS-001 introduced `/operations` with a
tasks lane that links here for deeper delivery supervision.

Design source:
`docs/ux/assets/companycore-v1-tasks-delivery-concept.png`.

## Goal

Implement `/tasks-adapter` as a V1 delivery workbench that answers:

- what execution pressure needs attention now;
- which tasks are open, due soon, blocked, or done;
- what department context is visible;
- what Paperclip/Jarvis can safely use as task context;
- how the owner creates the next task and moves work forward.

## Scope

- `web/src/react-route-kit.tsx`
- `web/src/app-route-registry.ts`
- `web/src/main.tsx`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `.agents/state/*`
- `.codex/context/PROJECT_STATE.md`

## Implementation Plan

1. Reuse existing `/v1/tasks`, `/v1/tasks/:id`, `/v1/connection`,
   `/v1/company-os`, and `/v1/mcp/manifest` contracts.
2. Extend the task workbench data load to include Company OS and MCP context.
3. Replace the generic task table hero with V1 delivery lanes:
   execution pressure, department ownership, AI handoff, and all-tasks table.
4. Add task create and status update flows through existing protected routes.
5. Verify build, API tests, real backend route proof, responsive screenshots,
   no horizontal overflow, and cleanup.
6. Update source-of-truth state and evidence.

## Acceptance Criteria

- [x] `/tasks-adapter` renders as a V1 tasks and delivery workbench.
- [x] The route loads real owner task, workspace, Company OS, and MCP data.
- [x] The owner can create a task from the workbench.
- [x] The owner can change task status from the workbench.
- [x] The workbench shows execution pressure and AI handoff context.
- [x] Desktop and mobile proof shows no horizontal overflow.

## Definition of Done

- [x] Code builds without errors.
- [x] `npm run test:api` passes.
- [x] Real UI proof covers loading, ready, success, and responsive states.
- [x] No fake data, mock-only behavior, or temporary bypass remains.
- [x] Source-of-truth files reflect the implemented state and evidence.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` are checked.

## Result Report

Status: done.

Implemented `/tasks-adapter` as a V1 Tasks & Delivery workbench. The route now
loads real task records, workspace context, Company OS attention state, and MCP
manifest context. It shows execution pressure, task metrics, department
delivery-table coverage, AI handoff readiness, all-task filters, an inline
create task form, and quick task status movement through existing protected
task routes.

Validation:

- `npm run build:web` passed.
- `DATABASE_URL=postgresql://companycore@127.0.0.1:55476/postgres?schema=public npm run validate` passed.
- `DATABASE_URL=postgresql://companycore@127.0.0.1:55476/postgres?schema=public npm run test:api` passed.
- `git diff --check` passed.
- Real backend Playwright proof on `http://127.0.0.1:3162/tasks-adapter`
  registered a fresh owner, opened the route, verified V1 delivery markers,
  created `Proof delivery task`, moved it to `in_progress`, verified success
  notices, and captured desktop/mobile screenshots with no horizontal
  overflow:
  `docs/ux/evidence/v1-tasks-delivery-real-backend-desktop.png` and
  `docs/ux/evidence/v1-tasks-delivery-real-backend-mobile.png`.
- Validation cleanup stopped the local server on port `3162`, stopped the
  workspace PostgreSQL proof database on port `55476`, and confirmed no
  `chrome-headless-shell` processes remained.

Architecture and quality review:

- The route reuses existing `/v1/tasks`, `/v1/tasks/:id`,
  `/v1/connection`, `/v1/company-os`, and `/v1/mcp/manifest` contracts.
- No new schema, fake task-to-area relation, provider bypass, or temporary
  agent authority was introduced.
- Department ownership is intentionally shown as current task/list and
  delivery-table coverage until a backend task-to-area relation is approved.
