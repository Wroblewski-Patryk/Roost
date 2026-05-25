# DMS-00-006 First Safe Global Intake Route Command Task Contract

Last updated: 2026-05-16

## Task Type

Implementation.

## Current Stage

Verification.

## Deliverable For This Stage

Audited proposal-only route/classification command for `00 Main`, exposed
through HTTP/MCP capability metadata and visible from the `00 Main` web panel.

## Goal

Let the owner create a safe route proposal from an intake item to a canonical
department system without acknowledging agent events, retrying providers,
approving work, mutating provider scope, invoicing, discounting, deleting, or
executing legal/ads actions.

## Scope

- `src/modules/intake/intake.routes.ts`
  - Add `POST /v1/intake/actions/propose-route`.
  - Validate source model, source id, canonical target department,
    idempotency, and workspace ownership.
  - Create proposal evidence through `Decision`, `AuditLog`, `Event`, and
    optional `Task`.
- `src/auth/capabilities.ts`
  - Add `intake:write` and adapter manifest route.
- `src/auth/agent-key-profiles.ts`
  - Allow supervised operational/event-worker profiles to propose intake
    routes.
- `src/mcp/manifest.ts`
  - Document `intake:write` behavior in MCP tool descriptions.
- `src/tests/api.test.ts`
  - Verify the new command, idempotency, workspace isolation, invalid
    department rejection, MCP manifest exposure, and no source mutation.
- `web/src/main.tsx`
  - Add `Propose route` action in `00 Main` intake item rows.
  - Normalize old inferred intake department hints into canonical department
    keys before calling the backend command.
- `web/src/styles.css`
  - Add scoped proposal action/status styling.
- `docs/API.md`
  - Document the new endpoint.

## Implementation Plan

1. Implement the backend route from the DMS-00-005 contract.
2. Add capability and MCP manifest exposure.
3. Extend API tests around the existing global intake proof.
4. Add a minimal web action that proposes the inferred route and refreshes the
   intake panel.
5. Build server and web.
6. Run API tests against a disposable PostgreSQL instance.
7. Run browser proof against a local backend and confirm no source mutation.
8. Update source-of-truth docs and commit.

## Acceptance Criteria

- `POST /v1/intake/actions/propose-route` returns `201` for a valid source and
  `200` for idempotent replay.
- The response reports `sourceMutated=false`,
  `agentEventAcknowledged=false`, and `providerStateMutated=false`.
- The route rejects cross-workspace sources and non-canonical department keys.
- MCP manifest exposes `companycore_post_intake_actions_propose_route` with
  `intake:write`.
- The web panel can create a proposal from `00 Main`.
- Browser proof shows the proposal success state, no console errors, no
  horizontal overflow, and the source agent event remains `pending`.

## Definition Of Done

- `npm run build:server` passes.
- `npm run build:web` passes.
- `npm run test:api` passes with an explicit local `DATABASE_URL`.
- Browser proof passes on the local backend.
- Validation processes started by this task are stopped.
- Source-of-truth files are updated.

## Result Report

- Implemented `POST /v1/intake/actions/propose-route`.
- Added `intake:write` capability, MCP manifest exposure, and agent profile
  scope for supervised route proposals.
- Added `Propose route` UI affordance in the `00 Main` panel.
- Validation passed:
  - `npm run build:server`
  - `npm run build:web`
  - `npm run test:api` with
    `DATABASE_URL=postgresql://postgres@127.0.0.1:55480/postgres`
  - Playwright browser proof on `http://127.0.0.1:3210`
- Browser proof result:
  - route:
    `http://127.0.0.1:3210/areas?area=00-ogolny&view=overview`
  - status text: `Route proposal created for 03 sprzedaz.`
  - source `AgentEventOutbox.deliveryStatus`: `pending`
  - proposal status: `proposed`
  - console errors: none
  - horizontal overflow: false
- The temporary backend server and temporary PostgreSQL instances on ports
  `3210`, `55476`, and `55480` were stopped after verification. Pre-existing
  `chrome-headless-shell` processes from an earlier run were observed and left
  untouched.
