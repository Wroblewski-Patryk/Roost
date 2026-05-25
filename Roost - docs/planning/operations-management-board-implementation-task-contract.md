# Task

## Header
- ID: OPS-BOARD-001
- Title: Operations List Board And Work Item Editing
- Task Type: implementation
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder + Frontend Builder + QA/Test
- Depends on: CC-04-002, WEB-SHELL-OPS-001
- Priority: P1
- Iteration: 2026-05-16-OPS-BOARD-001
- Operation Mode: BUILDER
- Mission ID: OPERATIONS-MANAGEMENT-SYSTEM
- Mission Status: VERIFIED

## Goal
Turn `04 Operations` into a usable work-management board over existing backend
tasks and ClickUp-imported task lists, while preserving the architecture rule
that clients operate domain objects instead of raw database tables.

## Scope
- `src/modules/operations/operations.routes.ts`
- `src/auth/capabilities.ts`
- `src/mcp/manifest.ts`
- `web/src/features/departments/operations-route.tsx`
- `web/src/types.ts`
- `web/src/i18n/messages.ts`
- `docs/API.md`
- `docs/architecture/autonomous-company-operating-system.md`

## Backend Table/Engine Mapping For This Slice

| Backend table/model | Operations use in this slice |
| --- | --- |
| `task_lists` / `TaskList` | Left-side list selector and list-to-board grouping. |
| `tasks` / `Task` | Work item cards and modal edit form. |
| `projects` / `Project` | Task/list context in board and modal. |
| `goals` / `Goal` | Work item hierarchy context in the packet. |
| `targets` / `Target` | Work item hierarchy context in the packet. |
| `pipeline_runs` / `PipelineRun` | Execution evidence in work item packet. |
| `stage_runs` / `StageRun` | Stage evidence in work item packet. |
| `procedures` / `Procedure` | Procedure context for stage evidence. |
| `dependencies` / `Dependency` | Readiness and blocker evidence. |
| `notes` / `Note` | Task evidence. |
| `events` / `Event` | Task history evidence and update event emission. |
| `agent_logs` / `AgentLog` | AI execution evidence attached to tasks. |
| `resources` / `Resource` | Project-linked task resources. |
| `operating_areas` / `OperatingArea` | Operations Drive scoping. |
| `google_drive_files` / `GoogleDriveFile` | Operations knowledge/source evidence. |

## Implementation Plan
1. Extend `GET /v1/operations/work-items` with `taskLists`, canonical status
   columns, and optional `taskListId` filtering.
2. Change `todo` display normalization from `backlog` to `todo`.
3. Add `PATCH /v1/operations/work-items/:id` as the governed Operations work
   item update route with ClickUp writeback reuse.
4. Add `operations:write` and expose it in MCP as a domain command, not a raw
   task-table command.
5. Replace the Operations table with list selector, status columns, task cards,
   and an edit modal over the work item route.
6. Document the MCP/table ownership direction.

## Acceptance Criteria
- [x] Every task in the packet can be displayed under its assigned list.
- [x] Selected list shows status columns for canonical CompanyCore task states.
- [x] Clicking a task opens a modal with editable task fields.
- [x] Saving a task uses `/v1/operations/work-items/:id`.
- [x] `todo` no longer displays as `backlog` in Operations.
- [x] MCP direction is recorded: agents should use domain packets/commands,
      not raw database table thinking.

## Definition of Done
- [x] Shared shell/components are reused.
- [x] Backend build passes.
- [x] Web build passes.
- [x] API docs and architecture direction are updated.
- [x] No provider bypass is introduced.

## Result Report
- Task summary: Implemented the first functional Operations board with list
  selection, canonical status columns, task modal editing, and a domain-level
  Operations write endpoint.
- How tested:
  - `npm run build:server`
  - `npm run build:web`
  - `npm run validate`
  - `npm run test:api` against validation-owned PostgreSQL on
    `127.0.0.1:55511`, including migrations, `taskLists`, canonical statuses
    without `backlog`, list filtering, work item patch, update event evidence,
    and cross-workspace write denial.
  - Playwright fallback rendered
    `http://127.0.0.1:3244/areas?area=04-operacje&view=tasks` through a
    temporary mocked API server, proved list selector/status columns/task
    modal/save interaction, desktop screenshot
    `C:/Users/wrobl/AppData/Local/Temp/companycore-ops-board-desktop.png`,
    mobile screenshot
    `C:/Users/wrobl/AppData/Local/Temp/companycore-ops-board-mobile.png`, no
    console warnings/errors, and no mobile horizontal overflow. Browser plugin
    setup was attempted first but the active browser pane was unavailable, so
    Playwright fallback was used.
- What is incomplete: Full task lifecycle needs future schema work for richer
  statuses, assignees, subtasks, checklists, comments, time tracking, and
  provider-status preservation.
- Next steps: Expand the task detail modal using the richer task lifecycle
  schema once approved.
