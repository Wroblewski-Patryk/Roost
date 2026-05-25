# DMS-03-005A Commercial Exception Read API Task Contract

## Task Type

- Backend/API + Security + AI integration

## Current Stage

- Implementation

## Deliverable For This Stage

Protected read-only `GET /v1/commercial-exceptions` runtime API that exposes
source-backed discount and commercial-exception context to CompanyCore and
Paperclip without enabling discount, quote, invoice, payment, or final-term
writes.

## Goal

Implement the first runtime slice from
`docs/planning/dms-03-commercial-exception-read-model-spec.md` so Sales,
Finance, `00 Main`, and Paperclip can inspect `100%` discounts, pro-bono
work, commercial exceptions, missing source evidence, owner-decision blockers,
and invoice-readiness state from one workspace-scoped endpoint.

## Scope

- `src/modules/commercial-exceptions/commercial-exceptions.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/planning/mvp-next-commits.md`
- `.agents/state/*` affected by this implementation

Out of scope:

- creating, approving, or applying discounts
- issuing, sending, or marking invoices or payments
- selecting an active price policy
- autonomous pricing
- frontend Sales or Finance panels
- importing archived clients

## Implementation Plan

1. Add a read-only commercial exception router deriving packets from existing
   approvals, decisions, deals, tasks, notes, interactions, risks, and agent
   events.
2. Mount the router under `/commercial-exceptions` and `/v1/commercial-exceptions`.
3. Add `commercial-exceptions:read` to capabilities, adapter manifest, MCP
   manifest descriptions, and relevant MCP agent key profiles.
4. Add API documentation for endpoint semantics, query parameters, read
   guarantees, and blocked actions.
5. Add API tests for auth, workspace isolation, `100%` discount packet shape,
   missing-source status, no mutation on read, MCP exposure, and scoped-key
   denial.
6. Run quality gates and update canonical planning/state files.

## Acceptance Criteria

- Unauthenticated callers cannot read commercial exceptions.
- Scoped service keys without `commercial-exceptions:read` receive `403`.
- The Company OS reader profile includes `commercial-exceptions:read`.
- The MCP manifest exposes `companycore_get_commercial_exceptions` as a read
  tool that does not require approval.
- `GET /v1/commercial-exceptions` only returns records from the active
  workspace.
- A `100%` discount linked to a deal returns gross value, discount value,
  final value, risk flags, and blocked invoice/discount actions.
- Missing client, value, reason, or owner approval evidence is reflected as
  `needs_source` or `needs_owner_decision`.
- Reading the endpoint does not mutate approvals, notes, tasks, deals, or
  agent events.
- Tests cover the route and pass.

## Definition Of Done

- Source-of-truth docs and state are updated in the same task.
- `npm run build:server` passes.
- `npm run test:api` passes against a local PostgreSQL database or the
  validation gap is recorded with residual risk.
- `git diff --check` passes.
- Changes are committed and pushed after successful validation.

## Result Report

- Status: verified.
- Evidence:
  - `GET /v1/commercial-exceptions` implemented in
    `src/modules/commercial-exceptions/commercial-exceptions.routes.ts`.
  - Route mounted in `src/app.ts`.
  - `commercial-exceptions:read` added to capabilities, adapter manifest, MCP
    route catalog, and Paperclip-safe agent key profiles.
  - `docs/API.md` documents query parameters, read guarantees, and blocked
    actions.
  - `src/tests/api.test.ts` covers unauthenticated denial, scoped-key denial,
    workspace isolation, no mutation on read, `100%` discount packet math,
    missing-source status, blocked actions, and MCP visibility.
- Validation:
  - `npm run build:server`: passed.
  - `git diff --check`: passed.
  - `npm run test:api`: passed against portable PostgreSQL on
    `127.0.0.1:55481`; validation PostgreSQL was stopped after the run.
- Residual risk: Finance context, Sales/Finance web panels, real current-client
  capture, and invoice/payment commands remain future guarded tasks.
