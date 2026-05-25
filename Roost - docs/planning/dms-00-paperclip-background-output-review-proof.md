# DMS-00-007 Paperclip Background Output Review Proof

Last updated: 2026-05-16

## Purpose

This proof verifies the first safe background-agent review loop:

```text
Paperclip-like output -> 00 Main intake -> route proposal -> department review
task/evidence -> original source remains unchanged
```

It confirms that CompanyCore can react to work Paperclip creates in the
background without giving the agent hidden authority to acknowledge events,
mutate providers, approve work, invoice, discount, delete, or execute legal or
ads actions.

## Verified Runtime Path

| Step | Runtime object or route | Verified behavior |
| --- | --- | --- |
| Paperclip output arrives | `AgentEventOutbox` with `targetAgent="paperclip"` | Appears in `GET /v1/intake` as an agent-output intake item. |
| Owner/system reads global intake | `GET /v1/intake?sourceAgent=paperclip` | Returns only workspace-visible Paperclip or unassigned intake rows. |
| Route proposal is created | `POST /v1/intake/actions/propose-route` | Creates proposal evidence through `Decision`, `AuditLog`, `Event`, and optional `Task`. |
| Department review path exists | optional `Task` from route proposal | Task contains target department, classification, reason, proposed next action, source model, and source id. |
| Source stays unchanged | original `AgentEventOutbox` | `deliveryStatus` remains `pending`; route proposal does not acknowledge or mutate it. |
| Repeated proposal is safe | same idempotency key | Returns the same proposal/task instead of duplicating work. |
| Unsafe routing is blocked | foreign source or non-canonical department | Foreign workspace source returns `404`; invalid department returns `400`. |
| Agent/MCP exposure is explicit | MCP manifest | Read route is `intake:read`; proposal command is `intake:write` and not destructive. |

## API Regression Evidence

`src/tests/api.test.ts` covers the loop with a controlled Paperclip-like event:

- creates `paperclip_pricing_discount_proposal` in `AgentEventOutbox`;
- verifies it appears in `GET /v1/intake`;
- verifies `sourceAgent=paperclip` filtering;
- calls `POST /v1/intake/actions/propose-route` to `03-sprzedaz`;
- creates a review task and owner-decision evidence;
- verifies `Decision`, `AuditLog`, and `Event` evidence;
- verifies the original agent event remains `pending`;
- verifies idempotent replay;
- verifies foreign source and invalid department rejection;
- verifies MCP manifest exposure for intake read and write routes.

Latest validation:

```text
npm run test:api
DATABASE_URL=postgresql://postgres@127.0.0.1:55482/postgres
Result: PASS, 6/6 tests
```

The portable PostgreSQL validation process was stopped after the run.

## Current Safety Boundary

Allowed:

- read Paperclip output in `00 Main`;
- propose a route to a canonical department;
- create proposal evidence;
- create optional review task;
- request owner review;
- expose the context to MCP clients through scoped capabilities.

Blocked:

- acknowledge agent events;
- retry provider events;
- mutate provider scope;
- approve work;
- send invoice;
- apply discount;
- mark payment status;
- delete records;
- execute legal, ads, or final commercial actions.

## Department Handoff

The proof currently routes a pricing/discount Paperclip item to `03-sprzedaz`.
Because DMS-03-005A and DMS-07-002 are now implemented, the next human or
agent reviewer can inspect:

- `GET /v1/commercial-exceptions` for discount and `100%` exception context;
- `GET /v1/finance/context` for pricing conflicts, hourly value,
  invoice-readiness blockers, and blocked finance actions.

This means the background output can move from `00 Main` into Sales/Finance
review without bypassing CompanyCore.

## Remaining Proof Gap

The current proof is API-regression verified. The older DMS-00-006 browser
proof already verified the `00 Main` web panel can create a route proposal, but
after Finance/Commercial Exception additions the next UI proof should repeat a
fresh desktop/mobile route proposal when the owner wants the visual flow locked
again.

Recommended next slice:

- DMS-SHELL-003 graph fallback consistency, or
- a read-only `07 Finance` web board consuming `GET /v1/finance/context`.
