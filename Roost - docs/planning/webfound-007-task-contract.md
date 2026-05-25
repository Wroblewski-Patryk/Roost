# WEBFOUND-007 Relationship Graph Audit

Last updated: 2026-05-14

## Task Type

Architecture, UX, API planning, MCP readiness.

## Current Stage

Verification.

## Deliverable For This Stage

Durable relationship graph audit, follow-up task decomposition, and canonical
queue updates.

## Goal

Turn existing provider, Drive, operating-area, resource, and business-object
links into a clear relationship matrix before expanding `/relationships`.

## Scope

- `prisma/schema.prisma`
- `src/modules/operating-model/operating-model.routes.ts`
- `public/app.js`
- `docs/architecture/web-and-mcp-foundation-before-v2.md`
- `docs/planning/web-and-mcp-foundation-task-plan.md`
- canonical state files under `.codex/context/` and `.agents/state/`

## Implementation Plan

1. Inspect current schema relationships for operating model, provider mapping,
   Drive files, storage, knowledge, automation definitions, business records,
   resources, integrations, and agent events.
2. Inspect current web surfaces that compose relationship data.
3. Classify each relationship family as implemented, inferred, partial,
   unsupported, or missing.
4. Define the next safe architecture for a read-only relationship graph.
5. Update active planning queues so implementation can proceed without
   reopening V2 visuals.

## Acceptance Criteria

- The audit identifies implemented, inferred, unsupported, and missing
  relationship types.
- Follow-up tasks separate API/data work from UI work.
- No fake links, placeholder relationships, demo-only records, or generic edge
  store are proposed.
- MCP-safe read needs are explicit.
- Canonical queue files point to the next executable foundation task.

## Definition Of Done

- Source review is recorded in a durable architecture document.
- Task result report records validation evidence.
- Planning and state files are synchronized.
- No runtime behavior changes are made in this audit slice.

## Result Report

Status: `verified`.

Source review covered:

- `prisma/schema.prisma`
- `src/modules/operating-model/operating-model.routes.ts`
- `public/app.js`
- `docs/architecture/web-and-mcp-foundation-before-v2.md`
- `docs/planning/web-and-mcp-foundation-task-plan.md`

Findings:

- Workspace and operating-area relationships are the strongest current graph
  backbone.
- Provider mappings, Drive files, storage locations, knowledge roots, and
  automation definitions already support direct area/folder/table scope.
- Business records use direct domain FKs, but operating-table-to-record links
  are mostly route-inferred through `apiSlug`.
- Provider and Drive hierarchy links are provider-derived and must not be
  presented as database-enforced relationships.
- `/relationships` currently covers provider mappings and Drive folders, but
  omits field mappings, registry definitions, business record neighborhoods,
  confidence labels, and MCP-readable graph output.

Decision:

- The next implementation should be a read-only relationship graph API before
  broad UI expansion.
- The UI workbench should then consume that API and make direct, inferred,
  provider-derived, unsupported, and needs-review states visible.
- A generic relationship edge table is deferred until a concrete editable
  relationship workflow proves the need.

Evidence:

- Architecture audit: `docs/architecture/relationship-graph-audit-2026-05-14.md`
- Validation: `git diff --check` passed.

