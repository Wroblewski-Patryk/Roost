# CC-04-001 Operations Task Model Gap Audit

Last updated: 2026-05-16

## Purpose

`04 Operations` is the central work execution system. The owner target includes
workspace/domain/project/pipeline/procedure/task objects, rich task metadata,
subsystems, and multiple operational views.

This audit compares the target model to current runtime surfaces so the next
implementation slice can deepen the existing system instead of creating a
parallel task manager.

## Current Runtime Foundation

| Area | Current support | Source |
| --- | --- | --- |
| Tasks | CRUD over tasks with project, goal, target, task list, title, description, status, priority, due date, provider source/external id, and ClickUp writeback. | `src/modules/tasks/tasks.routes.ts`, `prisma/schema.prisma` |
| Task statuses | `todo`, `in_progress`, `blocked`, `done`, `archived`. | `prisma/schema.prisma` |
| Projects/goals/targets/task lists | Existing relation anchors for work hierarchy. | `prisma/schema.prisma`, route modules |
| Pipelines/stages/procedures | Rich Company OS models for pipelines, stages, procedures, procedure steps, runs, approvals, dependencies, and workflow definition drafts. | `prisma/schema.prisma`, `src/modules/company-os/*`, `src/modules/operations/operations.routes.ts` |
| Operations context | Read-only packet for procedures, approvals, dependencies, business functions, operational tasks, and agent blocked actions. | `src/modules/operations/operations.routes.ts` |
| UI | Operations management panel, Operations cockpit, task tables, area tasks depth, and data evidence browser. | `web/src/main.tsx` |

## Target-To-Current Gap Matrix

| Target field/system | Current status | Gap | Recommendation |
| --- | --- | --- | --- |
| `title`, `description` | Supported. | None. | Reuse current Task fields. |
| `status` target values: `draft`, `backlog`, `planned`, `ready`, `in_progress`, `blocked`, `review`, `testing`, `completed`, `archived` | Partially supported through `todo`, `in_progress`, `blocked`, `done`, `archived`. | Missing planning/review/testing states and naming mismatch. | Add compatibility strategy before enum migration: either status map view or explicit status expansion with migration/API tests. |
| `priority`: `critical`, `high`, `medium`, `low`, `someday` | `priority` is string. | No canonical enum or UI map. | First add shared status/priority badge map; later constrain API if needed. |
| `start_date`, `estimated_end_date`, `completed_at` | `dueDate` exists. | Missing start, estimated end, completion timestamp. | Add fields only after UI/read model proves need; `estimated_end_date` should derive from start + duration. |
| `estimated_duration_minutes`, `actual_duration_minutes`, `tracked_time_minutes` | Not on Task. | Missing duration/time tracking. | Add a task operations extension or normalized time log model; avoid burying all time data in task row if logs are expected. |
| `owner_user_id`, `assigned_agent_id`, `reviewer_id`, `team_id` | Not first-class on Task. Company roles/agents exist elsewhere. | Missing responsibility model. | Define assignment relation contract that can support human and agent assignees without making AI internal. |
| `complexity`, `urgency`, `impact`, `effort_score`, `business_value`, `risk_level` | Not on Task; risk exists elsewhere. | Missing scoring model. | Add task scoring read model first; write contract later. |
| `parent_task_id`, subtasks | Not first-class. | Missing hierarchy. | Add parent/subtask relation only with cycle prevention and UI proof. |
| `related_pipeline_id`, `related_stage_id` | PipelineRun has linked task IDs; Task lacks direct pipeline/stage relation. | Runtime relations are partly JSON-based and not query-friendly. | Normalize workflow-task links as already planned in AOG-BE-004 or a dedicated Operations relation task. |
| `related_resources`, `related_clients` | Task has events/notes and project links; clients/resources are not first-class task relations. | Missing universal record relations. | Use existing relationship/graph direction before adding task-specific join tables. |
| Checklists | Not first-class for Task. | Missing. | Add checklist model only after task detail screen contract. |
| Dependencies | Company OS `Dependency` exists between resources/entities. | Not task-specific in UI/API. | Reuse dependency engine with task resource/entity mapping instead of new local dependency table. |
| Activity timeline | Events exist. | Needs task-specific timeline readback. | Use Events Engine as source. |
| Comments/discussions | Notes exist; comments engine is target architecture. | Missing unified comments. | Do not add page-local comments; plan shared comments engine. |
| Execution logs | Agent logs/events exist. | Need task-linked execution log packet. | Reuse agent logs/events through relation read model. |
| Linked resources | Resource and Drive files exist. | Need task/resource relation contract. | Build via universal relation/graph contract. |
| List/Kanban/Calendar/Timeline/Workload/Graph/Dashboard views | List/table and dashboard-like panels exist. | Kanban/calendar/timeline/workload/graph are not complete task views. | Start with list + board read model after task fields are stable. |

## Safe Next Slice

`CC-04-002 Operations task read model v1` should produce a protected read-only
packet that normalizes existing Task, Project, TaskList, Pipeline/Stage,
Procedure, Event, Note, Dependency, AgentLog, Drive/Resource evidence into a
single Operations work item view. It should not add schema fields until the
read model proves the exact gaps and user questions.

Minimum packet:

- task core: title, description, status, priority, due date, source
- hierarchy: project, goal, target, task list
- operational context: pipeline/stage/procedure when discoverable
- responsibility: current owner/agent/reviewer fields as `unknown` or derived
  evidence, not fake values
- readiness: blocked/dependency/risk evidence
- knowledge links: Drive/resources/notes/events linked by existing relations
- agent packet: allowed reads and blocked writes

## Implementation Guardrails

- Do not create a second task system.
- Do not replace Company OS pipelines/procedures with task-local pipelines.
- Do not add AI personality or autonomous execution logic to backend.
- Use read-only packets before write commands.
- Preserve ClickUp/provider behavior and workspace isolation.
