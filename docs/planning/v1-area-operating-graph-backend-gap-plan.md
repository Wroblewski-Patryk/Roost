# V1 Area Operating Graph Backend Gap Plan

Last updated: 2026-05-15
Stage: planning
Owner: Backend Builder + Frontend Builder + Product Docs

## Purpose

The selected-area V1 web view now exposes a human-readable operating room, but
the backend still needs a stronger area operating graph so goals, targets,
metrics, workflows, tasks, knowledge, and sources are connected as one company
management system instead of adjacent lists.

This plan records the backend gaps and the implementation order. It should be
used before adding more UI depth to `/areas?area=:areaKey&view=:viewId`.

## Target User Question

For any department, the owner should be able to answer:

```text
What are we trying to achieve?
Which target or metric proves it?
Which workflow moves it?
Which tasks execute it?
Which knowledge/source proves or explains it?
What is missing before an owner or AI agent can act?
```

## Current Foundation

| Layer | Existing models / APIs | Status | Notes |
| --- | --- | --- | --- |
| Department | `OperatingArea`, `OperatingFolder`, `OperatingTable`, `/v1/connection` | implemented | Strong area/table ownership exists. |
| Goals | `Goal`, `Target`, `/v1/goals`, `/v1/targets` table routes | partial | `Goal -> Target -> Task` exists, but area assignment is inferred through operating table slugs. |
| Metrics | `Metric`, `/v1/company-os/metrics` | partial | `Metric` links to `Process` and `Pipeline`; `Target.metric` is text, not a `Metric` FK. |
| Workflows | `Process`, `Pipeline`, `PipelineStage`, `Procedure`, `ProcedureStep`, `PipelineRun`, `StageRun`, `/v1/company-os` | implemented foundation | Workflow definitions and runtime evidence exist. Direct goal/target/task links are incomplete. |
| Tasks | `TaskList`, `Task`, `/v1/tasks`, ClickUp imported tables | partial | `Task -> Goal/Target/TaskList/Project` exists. Workflow run links are partly JSON-based or inferred. |
| Knowledge | `KnowledgeRoot`, `KnowledgeItem`, `GoogleDriveFile`, `GoogleDriveContentSnapshot`, `/v1/google-drive/files`, `/v1/google-drive/files/:id/content` | partial | Drive hierarchy, scopes, and content snapshots exist; knowledge is not consistently attached to goal/target/workflow/task records. |
| Sources | `OperatingTable`, `ExternalContainerMapping`, `ExternalFieldMapping`, `GoogleDriveFile`, `/v1/relationships/graph` | implemented foundation | Existing relationship graph distinguishes direct, provider, inferred, review, and unsupported links. |
| AI/MCP | `/v1/mcp/manifest`, `/v1/company-os`, `/v1/relationships/graph` | implemented foundation | Agents can read many surfaces, but not one area-scoped operating graph. |

## Confirmed Backend Gaps

| ID | Gap | Impact | Recommended handling |
| --- | --- | --- | --- |
| AOG-BE-001 | No area-scoped operating graph read API. | Web and AI must compose `/v1/connection`, table snapshots, Drive files, Company OS, and relationship graph differently. | Add `GET /v1/areas/:areaKey/operating-graph` or `GET /v1/operating-graph/areas/:areaKey` as a read-only aggregate. |
| AOG-BE-002 | Business records do not consistently carry `operatingAreaId` / `operatingTableId`. | Goals, targets, tasks, metrics, and knowledge can appear disconnected unless inferred by table route. | Keep inference in V1 read API with explicit `confidence=route_inferred`; add direct FKs only where a write workflow needs durable ownership. |
| AOG-BE-003 | `Target.metric` is a text field, not a `Metric` relation. | The UI cannot reliably connect target progress to KPI/metric records. | Add `metricId` to `Target` in a focused migration, preserve `metric` text as compatibility display. |
| AOG-BE-004 | `Goal` and `Target` do not link to `Process` or `Pipeline`. | Strategy cannot show which workflow moves a goal without guesswork. | Add optional `processId` and `pipelineId` to `Goal` or `Target` only after read-model proof shows which root should own the relation. Recommended first: `Target -> Pipeline` and `Goal -> Process` optional FKs. |
| AOG-BE-005 | Runtime workflow-to-task links rely partly on JSON (`PipelineRun.linkedTaskIds`) or indirect context. | Hard to show task pressure inside a workflow lane with confidence. | Add a typed join table for workflow runtime task links, or normalize linked task IDs into a command-managed table. Do not expose raw generic edge CRUD. |
| AOG-BE-006 | Knowledge attaches to process/pipeline/project/client/agent, but not to goal, target, task, metric, or generic source nodes. | Business plan, docs, sheets, and notes cannot be cleanly shown as evidence for a specific goal or task. | Add a narrow `KnowledgeLink` command/read model for supported target families, or add explicit nullable FKs only for goal/target/task/metric if that remains manageable. |
| AOG-BE-007 | Drive content snapshots are present but area graph responses do not summarize them. | Owner sees file names, but not what the file contributes or whether its text is current. | Include latest snapshot summary/scan status in the area operating graph knowledge nodes. |
| AOG-BE-008 | Existing `/v1/relationships/graph` is workspace-wide, not optimized for one department operating room. | UI must filter and compose too much client-side. | Reuse relationship graph internals to return area-filtered nodes, edges, review items, and unsupported link families. |
| AOG-BE-009 | No explicit gap/readiness computation for missing links. | UI cannot say "this goal has no target", "this target has no metric", "this workflow has no tasks", or "this knowledge is unscoped" consistently. | Area operating graph API should return `gaps[]` with severity, owner action, safe route/action hint, and source evidence. |
| AOG-BE-010 | MCP does not expose an area operating graph tool. | Jarvis/Paperclip cannot ask one stable question about a department. | After HTTP read API passes tests, expose read-only MCP tool with `company-os:read` or new `operating-graph:read` capability. |

## Proposed Read API Shape

Start with a read-only aggregate. Do not begin with write routes or a generic
edge table.

```http
GET /v1/operating-graph/areas/:areaKey?include=goals,workflows,tasks,knowledge,sources
```

Response shape:

```json
{
  "data": {
    "area": {
      "id": "uuid",
      "key": "strategy-governance",
      "canonicalKey": "01-strategia",
      "name": "Strategy and governance"
    },
    "summary": {
      "goals": 4,
      "targets": 3,
      "metrics": 2,
      "workflows": 1,
      "tasks": 12,
      "knowledge": 8,
      "sources": 16,
      "gaps": 5
    },
    "nodes": [],
    "edges": [],
    "layers": {
      "goals": [],
      "workflows": [],
      "tasks": [],
      "knowledge": [],
      "sources": []
    },
    "gaps": [],
    "reviewItems": [],
    "unsupportedFamilies": []
  }
}
```

Every edge must include:

- `confidence`: `direct`, `route_inferred`, `provider_hierarchy`,
  `content_inferred`, `needs_review`, or `unsupported`;
- `sourceModel`;
- `sourceField`;
- `actionHint` when a safe existing route can fix the link;
- `evidence` with route/table/file/snapshot references.

## Proposed Implementation Order

### AOG-BE-001 Read Model First

Goal: one backend route for the selected-area UI and future AI reads.

Scope:

- Add an internal service that accepts `workspaceId` and canonical/real area
  key.
- Resolve canonical `00-12` keys to current backend operating areas.
- Load:
  - `OperatingArea` with folders/tables;
  - table records for area tables;
  - goals/targets/tasks from direct and route-inferred records;
  - Company OS processes/pipelines/metrics/risks/controls/knowledge;
  - Drive files and latest content snapshots;
  - relationship graph nodes/edges scoped to the area.
- Return nodes, edges, layers, and gaps.

Validation:

- API test for `01 Strategia` returns goal/target/table/Drive/source nodes.
- Edges include confidence and source fields.
- Cross-workspace access fails closed.
- Empty areas return honest empty layers, not fake data.

### AOG-BE-002 Target Metric Relation

Goal: make targets and metrics connect reliably.

Scope:

- Add optional `metricId` to `Target`.
- Backfill where `Target.metric` text exactly matches `Metric.name` in the same
  workspace.
- Keep `Target.metric` text as compatibility label.
- Update API serialization to include both `metric` and `metricRecord`.

Validation:

- Migration applies.
- Existing target reads still work.
- Area operating graph shows `target -> metric` direct edge when present and
  `needs_review` when only text exists.

### AOG-BE-003 Goal/Workflow Bridge

Goal: connect strategy to operating motion.

Preferred minimal model:

- `Goal.processId` optional.
- `Target.pipelineId` optional.

Reasoning:

- A goal usually belongs to a stable process/domain.
- A target usually moves through a measurable workflow/pipeline.

Validation:

- API can show `goal -> process -> pipeline -> target`.
- Missing process/pipeline links become graph gaps with action hints.

### AOG-BE-004 Workflow Task Link Normalization

Goal: make workflow execution pressure visible without parsing JSON.

Option A:

- Add `PipelineRunTaskLink` with `workspaceId`, `pipelineRunId`, `taskId`,
  `linkType`, `source`, `createdAt`.

Option B:

- Add `Task.pipelineRunId` / `Task.stageRunId` optional FKs.

Recommended first option: `PipelineRunTaskLink`, because one run may involve
several tasks and one task may support more than one workflow evidence path.

Validation:

- Existing `PipelineRun.linkedTaskIds` remains readable.
- New command paths write normalized links.
- Area graph treats old JSON links as `route_inferred` and new links as
  `direct`.

### AOG-BE-005 Knowledge Link Contract

Goal: connect files, snapshots, notes, and knowledge records to the operating
graph without inventing a broad editable edge system.

Recommended model:

```text
KnowledgeLink
workspaceId
knowledgeItemId?
googleDriveFileId?
contentSnapshotId?
targetType: goal | target | metric | process | pipeline | task | operating_area | operating_table
targetId
linkType: evidence | source | decision_input | requirement | reference
confidence: direct | owner_assigned | content_inferred | provider_hierarchy
metadata
```

Guardrail:

- Writes must be command-shaped and workspace-scoped.
- V1 may start read-only with links derived from existing FKs and Drive scopes.
- Do not expose generic edge editing in the UI until the owner workflow is
  clear.

Validation:

- Drive file linked to a goal appears under the goal layer.
- Latest content snapshot summary appears on the knowledge node.
- Unscoped Drive files appear as `needs_review` gaps.

### AOG-BE-006 MCP Tool

Goal: let Jarvis/Paperclip read one stable department context.

Scope:

- Add capability `operating-graph:read` or reuse `company-os:read` if policy
  says the graph is Company OS read context.
- Expose MCP tool for:
  - `GET /v1/operating-graph/areas/:areaKey`;
  - optional filter params for layer and depth.

Validation:

- Reader profile can see read-only graph.
- Reader profile cannot mutate graph links.
- MCP smoke proves `01-strategia` graph returns nodes, edges, gaps, and
  knowledge summaries.

## Backend Tasks To Add To Queue

| Task ID | Priority | Stage | Goal |
| --- | --- | --- | --- |
| AOG-BE-001 | P0 | planning | Implement read-only area operating graph API from existing data and relationship graph internals. |
| AOG-BE-002 | P1 | planning | Add `Target.metricId` and direct target-to-metric graph edges. |
| AOG-BE-003 | P1 | planning | Add minimal goal/workflow bridge: `Goal.processId` and `Target.pipelineId` if read-model proof confirms the shape. |
| AOG-BE-004 | P1 | planning | Normalize workflow-task links from JSON into command-managed relation records. |
| AOG-BE-005 | P1 | planning | Add knowledge/source link contract for Drive snapshots and knowledge items. |
| AOG-BE-006 | P1 | planning | Expose the area operating graph to MCP as a read-only agent tool. |

## Frontend Dependency Notes

The current selected-area UI should be treated as a visual shell over partial
backend connectivity. Once AOG-BE-001 exists, the UI should stop composing the
area graph from `AreaDetailContext` alone and instead consume the backend graph
response. `AreaDetailContext` can remain as a compatibility fallback until the
new route is verified in production.

## Non-Goals

- Do not add a broad generic edge editor as the first fix.
- Do not seed fake goals, targets, workflows, or Drive files.
- Do not make agents write graph links without owner-approved command routes.
- Do not duplicate `metrics` as `kpis`; use `Metric` and label it as KPI in UI
  when helpful.
- Do not replace `/v1/relationships/graph`; reuse and specialize it for
  area-scoped operating context.
