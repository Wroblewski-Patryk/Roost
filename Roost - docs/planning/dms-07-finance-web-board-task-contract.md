# DMS-07-003 Read-Only Finance Web Board Task Contract

## Task Type

- Frontend/UX + Finance + verification

## Current Stage

- Verification

## Deliverable For This Stage

Read-only `07 Finance And Billing Management System` board rendered on
`/areas?area=07-finanse&view=overview` from `GET /v1/finance/context`.

## Goal

Give the owner a first usable Finance department surface for pricing conflicts,
hourly value, commercial exceptions, invoice-readiness blockers, source
conflicts, and blocked actions without adding finance write authority.

## Scope

- `web/src/main.tsx`
  - Add `FinanceManagementBoard`.
  - Load `GET /v1/finance/context` only for `07-finanse`.
  - Render Finance board as the department special panel.
- `web/src/styles.css`
  - Add responsive board/list/decision-strip styles.
- Source-of-truth updates:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/*`
  - `docs/planning/mvp-next-commits.md`

Out of scope:

- active price policy writes
- quote, discount, invoice, payment, or final-term commands
- persisted pricing tables
- provider invoice integration

## Implementation Plan

1. Define a typed `FinanceContextData` UI contract matching DMS-07-002.
2. Add a finance context loader using owner API auth.
3. Render pricing candidates, hourly assumptions, commercial exceptions,
   invoice blockers, source conflicts, and blocked actions.
4. Hide the generic operating board for `07-finanse` when the Finance board is
   active.
5. Validate web build, diff hygiene, and desktop/mobile render proof.

## Acceptance Criteria

- `/areas?area=07-finanse&view=overview` renders the Finance board.
- Board shows `499 CHF`, `1500 CHF setup + 150 CHF/month`, and `150 CHF/hour`
  context from `GET /v1/finance/context`.
- Board shows commercial exception and invoice blocker sections.
- Board shows blocked actions and does not expose finance write controls.
- Desktop and mobile proofs have no console/page errors or horizontal overflow.

## Definition Of Done

- `npm run build:web` passes.
- `git diff --check` passes.
- Local backend Playwright proof passes.
- Validation-owned server and database processes are stopped.
- Source-of-truth docs and state are updated.
- Commit and push complete.

## Result Report

- Status: verified.
- Evidence:
  - `FinanceManagementBoard` and finance loader added to `web/src/main.tsx`.
  - Responsive Finance board styles added to `web/src/styles.css`.
  - `npm run build:web`: passed.
  - `git diff --check`: passed.
  - Playwright proof on local backend `http://127.0.0.1:3213` verified
    desktop and mobile `/areas?area=07-finanse&view=overview`, including
    Finance board text, `499 CHF`, `150 CHF`, commercial exceptions, invoice
    blockers, blocked actions, no horizontal overflow, and no console/page
    errors.
- Cleanup: validation backend and portable PostgreSQL were stopped.
- Residual risk: production visual proof remains a release follow-up; finance
  write commands remain blocked until separate command/security contracts.
