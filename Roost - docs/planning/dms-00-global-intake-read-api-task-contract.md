# DMS-00-003 Global Intake Read API Task Contract

## Task Type

Backend implementation, API contract, MCP manifest, documentation, and
regression coverage.

## Current Stage

Verification.

## Deliverable For This Stage

Protected read-only `GET /v1/intake` for the `00 Main` Department Management
System, backed by existing CompanyCore data sources and exposed to MCP through
`intake:read`.

## Goal

Implement the first runtime slice of the global intake and Paperclip output
review system so owners and agents can see unclassified or decision-needing
items in one workspace-scoped queue without mutating provider or agent state.

## Scope

- `src/modules/intake/intake.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/next-steps.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/requirements-verification-matrix.md`

## Implementation Plan

1. Add a protected `GET /v1/intake` route mounted under the existing protected
   API router.
2. Aggregate existing records from agent events, provider inbox, Drive files,
   provider mappings, approvals, risks, tasks, and events.
3. Normalize rows into intake families, statuses, risk, suggested department,
   evidence, allowed actions, and blocked actions.
4. Keep the route read-only; do not acknowledge agent events, retry provider
   events, update Drive/provider scope, or decide approvals.
5. Add `intake:read` to capabilities, adapter manifest, MCP descriptions, and
   MCP-oriented agent profiles.
6. Cover workspace isolation, unauthenticated denial, Paperclip filtering,
   failed provider rows, unassigned resource rows, high-risk blocked-action
   metadata, MCP exposure, and no-mutation behavior in API tests.
7. Update API documentation and source-of-truth state files.

## Acceptance Criteria

- `GET /v1/intake` requires authentication and is workspace-scoped.
- Owner bearer auth can read the global intake.
- A request without credentials is rejected.
- Rows from another workspace do not appear.
- `sourceAgent=paperclip` returns Paperclip-targeted and broadcast agent
  events, while excluding other targeted agent events.
- Failed provider inbox rows appear as blocked provider signals.
- Unassigned Drive files, provider containers, and provider fields appear as
  unassigned resources.
- Pending approvals and high/critical risks appear with blocked action
  metadata.
- Reading intake does not change `AgentEventOutbox.deliveryStatus`.
- MCP manifest exposes `companycore_get_intake` when the caller has
  `intake:read`.

## Definition Of Done

- Server TypeScript build passes.
- Relevant API regression coverage is added.
- `docs/API.md` documents the route, query parameters, response shape, and MCP
  exposure.
- Source-of-truth planning/state files record implementation and remaining
  next steps.
- Diff hygiene passes.

## Result Report

Implemented `GET /v1/intake` as a read-only aggregate over existing
CompanyCore data. The route returns normalized items for agent output, provider
signals, unassigned resources, approvals, risks, owner/task signals, and event
signals with inferred department routing and safety metadata. It is exposed
through the adapter manifest, MCP manifest, and MCP agent profiles via
`intake:read`.

Validation:

- `npm run build:server` passed.
- `npm run test:api` passed against workspace-local PostgreSQL on
  `127.0.0.1:55476` using the existing `postgres` database.
- `npm run typecheck` could not run because the repository has no
  `typecheck` script.
- `src/tests/api.test.ts` includes route-level coverage for the acceptance
  criteria.
