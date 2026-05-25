# DMS-07-002 Finance Context Read API Task Contract

## Task Type

- Backend/API + Security + Finance + AI integration

## Current Stage

- Implementation

## Deliverable For This Stage

Protected read-only `GET /v1/finance/context` endpoint that gives the owner and
Paperclip one safe Finance and Billing packet for pricing candidates, hourly
value, work valuation, commercial exceptions, invoice-readiness blockers,
payment context, risks, and owner decisions.

## Goal

Implement the first runtime slice from
`docs/planning/dms-07-finance-system-spec.md` without adding finance write
authority. The endpoint must preserve source conflicts and block active pricing,
quote, discount, invoice, and payment actions until future command contracts
exist.

## Scope

- `src/modules/finance/finance.routes.ts`
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

- active pricing policy writes
- discount application
- invoice creation/export/send
- payment-provider records or payment status writes
- Sales/Finance frontend board
- persisted pricing schema migrations

## Implementation Plan

1. Reuse the commercial exception read context inside a new finance read model.
2. Add source-backed pricing candidates from DMS-MONEY-001 as candidate packet
   records, not as active runtime policy.
3. Add hourly-value assumptions, work valuations from current deals, invoice
   readiness blockers, payment source context, finance risks, source conflicts,
   blocked actions, and Paperclip agent packet.
4. Expose `finance:read` in capabilities, adapter manifest, MCP manifest, and
   relevant MCP agent key profiles.
5. Add API docs and regression coverage.
6. Run quality gates and update canonical state files.

## Acceptance Criteria

- Unauthenticated callers cannot read Finance context.
- Scoped service keys without `finance:read` receive `403`.
- The Company OS reader profile includes `finance:read`.
- The MCP manifest exposes `companycore_get_finance_context` as a read tool.
- Pricing models include `499 CHF/month`, `1500 CHF setup + 150 CHF/month`,
  pure `150 CHF/month` analysis, and archived PL pricing as source-backed
  candidate/archive records.
- `150 CHF/hour` is visible as a candidate hourly-value assumption.
- `100%` commercial exception packets are included from the commercial
  exception read model.
- Source conflicts and owner decisions are visible.
- Reading the endpoint does not mutate source records.
- Blocked actions prevent active price policy, final quote, discount, invoice,
  and payment writes.

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
  - `GET /v1/finance/context` implemented in
    `src/modules/finance/finance.routes.ts`.
  - Commercial exception route now exposes reusable
    `buildCommercialExceptionsContext`.
  - `finance:read` added to capabilities, adapter manifest, MCP route catalog,
    and Paperclip-safe agent key profiles.
  - `docs/API.md` documents query parameters, read guarantees, and blocked
    finance actions.
  - `src/tests/api.test.ts` covers unauthenticated denial, scoped-key denial,
    workspace isolation, no mutation on read, pricing conflict shape,
    `150 CHF/hour`, `100%` commercial exception inclusion, invoice blockers,
    blocked actions, and MCP visibility.
- Validation:
  - `npm run build:server`: passed.
  - `git diff --check`: passed.
  - `npm run test:api`: passed against portable PostgreSQL on
    `127.0.0.1:55482`; validation PostgreSQL was stopped after the run.
- Residual risk: Finance web board, active price policy, persisted pricing
  schema, invoice/payment provider commands, and final quote/discount commands
  remain future guarded tasks.
