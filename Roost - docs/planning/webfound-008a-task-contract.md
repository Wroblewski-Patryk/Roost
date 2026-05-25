# WEBFOUND-008A Relationship Graph Read API

Last updated: 2026-05-14

## Task Type

Backend/API, MCP readiness, relationship data contract.

## Current Stage

Verification.

## Deliverable For This Stage

Workspace-scoped read-only relationship graph endpoint plus capability and MCP
manifest exposure.

## Goal

Expose a canonical read-only relationship graph that the web UI and future MCP
tools can trust before expanding `/relationships`.

## Scope

- `src/modules/relationships/relationships.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- canonical planning and state files

## Implementation Plan

1. Add `GET /v1/relationships/graph`.
2. Build graph nodes and edges from existing workspace-scoped records only.
3. Label edge confidence as `direct`, `provider_hierarchy`,
   `route_inferred`, `needs_review`, or `unsupported`.
4. Return review items with safe existing action hints only.
5. Add `relationships:read` capability and expose it to MCP reader profiles.
6. Add regression coverage for graph shape, review items, confidence labels,
   unsupported families, and MCP manifest visibility.

## Acceptance Criteria

- The endpoint is workspace-scoped from auth context.
- The endpoint returns `nodes`, `edges`, `reviewItems`,
  `unsupportedFamilies`, and summary counts.
- Every edge includes `confidence`, `sourceModel`, and `sourceField`.
- Provider hierarchy and route inference are labeled explicitly.
- Unassigned provider containers and Drive items appear as review items.
- API-key capability filtering exposes the graph only through
  `relationships:read`.
- No relationship write route, generic edge table, fake data, or placeholder
  link is introduced.

## Definition Of Done

- API implementation and route mount are complete.
- Capability/MCP metadata are updated.
- Integration tests prove the graph contract.
- Documentation and canonical state are updated.
- Relevant validation passes or residual risk is recorded.

## Result Report

Status: `verified`.

Implemented:

- `GET /v1/relationships/graph`
- `relationships:read` capability and MCP manifest route metadata
- MCP reader/operator profile access to the relationship graph
- integration-test coverage for direct, provider-hierarchy, route-inferred,
  needs-review, and unsupported relationship output

Validation:

- `npm run build` passed.
- `npm test` passed against disposable PostgreSQL on `localhost:55457`.
- Test database container `companycore-test-postgres-webfound008a` was removed
  after validation.

