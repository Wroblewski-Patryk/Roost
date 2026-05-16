# DMS 03 Sales Context And Board Task Contract

## Task Type

Backend + frontend implementation.

## Current Stage

verification

## Deliverable For This Stage

Protected read-only `03 Sales` context packet plus a dedicated Sales
Management board in the selected-area web route.

## Goal

Implement the first post-audit department system slice from
`docs/planning/dms-13-systems-v1-implementation-audit.md`: `03 Sales`.
The owner and Paperclip should be able to inspect clients, deals, pipeline
stages, interactions, follow-up tasks, notes, commercial exceptions, pricing
context, and blocked sales actions without gaining quote, discount, invoice,
ad, or autonomous outreach authority.

## Scope

- `src/modules/sales/sales.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `web/src/main.tsx`
- `web/src/styles.css`
- `docs/API.md`
- State and planning files required by the project workflow.

Out of scope:

- Quote creation.
- Discount application.
- Invoice or payment writes.
- Ad campaign or Meta integration writes.
- Email sending or autonomous outreach.
- New database tables or migrations.

## Implementation Plan

1. Add a read-only Sales context route that reuses current CRM, commercial
   exception, finance, task, note, interaction, and Drive evidence.
2. Expose `sales:read` through capabilities, key profiles, adapter manifest,
   and MCP manifest descriptions.
3. Add API tests for auth, workspace isolation, no mutation on read, MCP
   exposure, and blocked high-risk actions.
4. Add a Sales board for `/areas?area=03-sprzedaz&view=overview` that consumes
   the new packet and shows pipeline, follow-up, commercial exception, current
   client, source conflict, and blocked action context.
5. Run backend/web validation, update source-of-truth ledgers, then commit and
   push.

## Acceptance Criteria

- `GET /v1/sales/context` requires auth and `sales:read` for scoped keys.
- The route returns `03-sprzedaz`, `sales-crm`, summary counts, clients, deals,
  pipeline stages, interactions, follow-up tasks, notes, commercial exceptions,
  pricing conflicts, and a read-only agent packet.
- API tests prove no source records mutate on read and foreign workspace data
  does not leak.
- MCP manifest exposes `companycore_get_sales_context` as a read tool.
- `/areas?area=03-sprzedaz&view=overview` renders a dedicated Sales Management
  board with desktop/mobile-safe states.
- High-risk sales actions remain visibly blocked.

## Definition Of Done

- `npm run build:server`
- `npm run build:web`
- `npm run test:api`
- `git diff --check`
- Browser or Playwright proof for the Sales board, or a recorded blocker.
- Task board, project state, requirements, quality, risks, delivery map,
  module confidence, and next steps are refreshed.

## Result Report

Implemented `03 Sales` as the first post-audit department system slice. The
backend now exposes protected read-only `GET /v1/sales/context` through
`sales:read`, adapter capability metadata, MCP manifest tooling, and read
profile scopes. The packet reuses existing clients, deals, pipeline stages,
interactions, tasks, notes, commercial exceptions, finance handoff context,
Drive evidence, and blocked action metadata without adding quote, discount,
invoice, ad, or outreach writes.

The selected-area web route now renders a dedicated `03 Sales Management
System` board for `/areas?area=03-sprzedaz&view=overview`, including sales
pipeline lanes, current client work, commercial exceptions, decision/finance
handoff, source context, follow-up work, and visible blocked agent actions.

Validation:

- `npm run build:server` passed.
- `npm run build:web` passed.
- `npm run test:api` passed against validation-owned PostgreSQL on
  `127.0.0.1:55497`.
- `git diff --check` passed.
- Playwright proof on `http://127.0.0.1:3220` passed for desktop and mobile:
  no console/page errors and no horizontal overflow. Evidence:
  `docs/ux/evidence/dms-03-sales-board-desktop.png` and
  `docs/ux/evidence/dms-03-sales-board-mobile.png`.
