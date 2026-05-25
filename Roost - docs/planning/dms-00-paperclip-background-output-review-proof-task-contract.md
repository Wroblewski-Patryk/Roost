# DMS-00-007 Paperclip Background Output Review Proof Task Contract

## Task Type

- Verification + AI integration + documentation

## Current Stage

- Verification

## Deliverable For This Stage

Durable proof that a controlled Paperclip-like background item can enter
`00 Main`, receive a route proposal, create department review evidence, and
remain source-safe.

## Goal

Confirm that CompanyCore can react to Paperclip background work without hidden
agent authority. The route proposal loop must remain proposal-only and must
not acknowledge agent events, mutate provider state, approve work, discount,
invoice, delete, or execute legal/ads actions.

## Scope

- `docs/planning/dms-00-paperclip-background-output-review-proof.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/planning/mvp-next-commits.md`
- `.agents/state/*` affected by this proof
- Existing API regression evidence in `src/tests/api.test.ts`

Out of scope:

- new runtime authority
- new route proposal behavior
- provider mutations
- frontend redesign
- invoice/payment/discount/legal/ads commands

## Implementation Plan

1. Review the existing DMS-00-006 route proposal contract and latest API tests.
2. Record the exact Paperclip output review path and assertions.
3. Link DMS-03-005A commercial exceptions and DMS-07-002 Finance context as
   the safe downstream review surfaces.
4. Update canonical queues and state files so DMS-00-007 is complete and the
   next queue is clear.

## Acceptance Criteria

- Proof names the source object, intake route, proposal route, evidence
  objects, and source-safety checks.
- Proof states allowed and blocked actions.
- Proof records validation evidence.
- Proof identifies the remaining UI proof gap honestly.
- Canonical planning/state files no longer keep DMS-00-007 as active after
  completion.

## Definition Of Done

- Proof doc exists and is source-of-truth linked.
- Task board, next commits, project state, delivery map, module confidence,
  system health, requirement matrix, and next steps are updated.
- `git diff --check` passes.
- Commit and push complete.

## Result Report

- Status: verified.
- Evidence:
  - `docs/planning/dms-00-paperclip-background-output-review-proof.md`.
  - Existing `src/tests/api.test.ts` regression path for Paperclip-like
    intake, route proposal, task/audit/event evidence, idempotency, workspace
    isolation, invalid department rejection, MCP exposure, and unchanged source
    `AgentEventOutbox.deliveryStatus`.
  - Latest `npm run test:api` passed against portable PostgreSQL on
    `127.0.0.1:55482`.
- Residual risk: the UI visual proof should be repeated after the next
  frontend change or before claiming the `00 Main` route proposal flow is
  visually final.
