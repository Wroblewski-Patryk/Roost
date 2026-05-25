# AOG-BE-001 Area Operating Graph Read API Task Contract

Last updated: 2026-05-15
Task Type: backend/API/product infrastructure
Current Stage: verification
Deliverable For This Stage: verified local backend/API result report

## Goal

Implement a read-only backend aggregate that lets the V1 selected-area web view
and future AI agents load one coherent operating graph for a company
department. The graph must connect area structure, goals, targets, metrics,
workflows, tasks, knowledge, Drive sources, provider mappings, and explicit
readiness gaps without fake data or broad generic edge editing.

## Scope

Included:

- Add a workspace-scoped HTTP route:
  `GET /v1/operating-graph/areas/:areaKey`.
- Add an internal service that resolves canonical LuckySparrow area keys
  (`00-ogolny` through `12-zarzadzanie`) to current `OperatingArea` records.
- Reuse existing data sources:
  - `OperatingArea`, `OperatingFolder`, `OperatingTable`;
  - `Goal`, `Target`, `Metric`, `TaskList`, `Task`;
  - Company OS process, pipeline, stage, procedure, run, risk, control, and
    standard collections where relevant;
  - `KnowledgeRoot`, `KnowledgeItem`, `GoogleDriveFile`,
    `GoogleDriveContentSnapshot`;
  - `ExternalContainerMapping`, `ExternalFieldMapping`;
  - existing relationship graph internals.
- Return normalized `nodes`, `edges`, `layers`, `summary`, `gaps`,
  `reviewItems`, and `unsupportedFamilies`.
- Include edge confidence and evidence fields:
  `direct`, `route_inferred`, `provider_hierarchy`, `content_inferred`,
  `needs_review`, or `unsupported`.

Excluded:

- No generic relationship editor.
- No fake seed data.
- No agent write tool.
- No schema migration except small read-model helpers if inspection proves they
  are strictly required for the aggregate.
- No broad frontend route rewrite; frontend consumption should be a separate
  follow-up unless a narrow proof adapter is needed and documented.

## Implementation Plan

1. Inspect existing relationship graph service and selected-area data loaders.
2. Define typed response contracts for area graph nodes, edges, layers, gaps,
   and evidence.
3. Build the aggregate service around existing repositories/Prisma queries,
   preserving workspace scoping on every query.
4. Resolve canonical area aliases and return an honest empty graph when the
   area exists but has no linked data.
5. Compose direct and inferred edges from current relations:
   `Goal -> Target -> Task`, `Metric -> Process/Pipeline`,
   `KnowledgeItem -> Process/Pipeline/Project/Client/Agent`, Drive hierarchy,
   table-to-record route inference, and provider mappings.
6. Emit `gaps[]` for missing target, metric, workflow, task, and knowledge
   links where the absence is actionable.
7. Add integration tests for an owner workspace, empty area, unsupported link
   families, and cross-workspace denial.
8. Update API docs, requirement matrix, module confidence, and web dependency
   notes with proof.

## Acceptance Criteria

- `GET /v1/operating-graph/areas/01-strategia` returns `area`, `summary`,
  `nodes`, `edges`, `layers`, and `gaps`.
- The response contains real data only from the caller workspace.
- Every returned edge includes `confidence`, `sourceModel`, `sourceField`, and
  evidence references.
- Missing operational links are represented as `gaps[]`, not as silent absence.
- Empty areas return a valid empty graph with useful next-action gaps.
- Cross-workspace access fails closed.
- The selected-area frontend can consume this response in a follow-up slice
  without inventing a second graph model.

## Definition Of Done

- Backend route and service implemented.
- Relevant API/integration tests pass.
- `npm run validate` or the project-required equivalent passes.
- API documentation is updated.
- Requirement matrix, task board, next steps, risk register, and module
  confidence ledger reflect the implemented state and evidence.
- No temporary data, no broad generic edge editor, and no duplicate operating
  graph subsystem are introduced.

## Result Report

Status: verified locally.

Evidence:

- `src/modules/operating-graph/operating-graph.routes.ts` implements
  `GET /v1/operating-graph/areas/:areaKey`.
- `src/app.ts` mounts the protected route.
- `src/auth/capabilities.ts` and `src/mcp/manifest.ts` expose
  `operating-graph:read`.
- `web/src/react-route-kit.tsx` and `web/src/main.tsx` let the selected-area
  React view consume the graph while preserving the existing fallback view.
- `src/tests/api.test.ts` contains regression coverage for canonical area
  aliases, direct/route/content/provider edges, gaps, workspace isolation, MCP
  manifest exposure, and the Google Drive OAuth repair/refresh regression found
  during the database-backed run.
- `docs/API.md` documents the route.

Validation:

- `npm run build:server`: passed.
- `npm run build:web`: passed.
- `npx prisma validate` with a dummy `DATABASE_URL`: passed.
- `git diff --check`: passed.
- `npm run test:api`: passed against workspace-local PostgreSQL on
  `127.0.0.1:55476`.

Next action: deploy and smoke `/v1/operating-graph/areas/01-strategia` before
raising production confidence. Keep schema-level graph write relations such as
`Target.metricId`, goal/workflow bridges, normalized workflow-task links, or
knowledge/source link commands behind that production proof.
