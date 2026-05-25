# V1 Operations Context Read API Task Contract

## Header

- ID: V1OPS-004
- Title: V1 Operations Context Read API
- Task Type: backend
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder + QA/Test + Product Docs
- Depends on: V1OPS-001, V1OPS-002, V1OPS-003, DMS-04-001
- Priority: P1
- Coverage Ledger Rows: CCORE-DM-010, CCORE-DM-014, CCORE-DM-001B
- Module Confidence Rows: V1OPS-004
- Requirement Rows: REQ-V1OPS-004
- Quality Scenario Rows: QA-V1OPS-004
- Risk Rows: RISK-V1OPS-004
- Iteration: 2026-05-16
- Operation Mode: BUILDER
- Mission ID: V1OPS-004
- Mission Status: VERIFIED

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode is BUILDER because this is the next implementation slice
      after V1OPS-003 compatibility cleanup.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was considered through the active V1
      mission posture.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task closes a V1OPS group gap by giving agents a stable read packet
      for `04 Operations` before any operation writes are added.

## Mission Block

- Mission objective: provide a backend read packet for `04 Operations` that
  lets the owner and Paperclip inspect operational planning context through one
  protected API.
- Release objective advanced: V1OPS moves from route/UI proof plus alias
  cleanup to an agent-readable operations management context.
- Included slices: protected read route, MCP/capability exposure, API docs,
  API tests, and source-of-truth updates.
- Explicit exclusions: no schema migration, no procedure writes, no approval
  decisions, no task creation, no provider mutation, no frontend redesign, no
  production deployment in this commit.
- Checkpoint cadence: commit and push after validation and state updates.
- Stop conditions: unsafe write behavior, schema gap that requires product
  decision, or failed API gate.
- Handoff expectation: the next agent can add a safe command contract or web
  consumption over the read packet.

## Context

V1OPS-001 implemented `/operations` as the owner cockpit, V1OPS-002 proved the
route in production, and V1OPS-003 unified department aliases. The remaining
V1OPS gap is that Paperclip and owner-facing backend consumers still need a
single operations packet for routines, procedures, dependencies, approvals,
tasks, and blocked actions instead of assembling raw Company OS collections.

## Goal

Add a protected read-only `GET /v1/operations/context` API that aggregates the
current `04 Operations` management context from existing tables and exposes it
to MCP-capable agents through a new read capability.

## Scope

- `src/modules/operations/operations.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/planning/v1-operations-context-read-api-task-contract.md`
- relevant source-of-truth state files after validation

## Implementation Plan

1. Add a read-only operations route that resolves `04-operacje` through the
   shared department registry and aggregates existing Company OS records.
2. Return summaries for procedures, procedure steps, approvals, dependencies,
   business functions, and tasks, plus an agent packet with allowed and blocked
   actions.
3. Add `operations:read` capability, manifest route, and MCP descriptions.
4. Extend API tests for auth, workspace isolation, scoped key access, no
   mutation on read, response shape, and MCP visibility.
5. Update API docs and source-of-truth files after validation.

## Acceptance Criteria

- [x] `GET /v1/operations/context` requires authentication.
- [x] Owner auth returns a workspace-scoped `04-operacje` operations packet.
- [x] Scoped API keys require `operations:read`.
- [x] The route mutates no procedures, approvals, dependencies, tasks, audit
      logs, or events.
- [x] The packet includes procedures, approvals, dependencies, business
      functions, tasks, summary counts, agent allowed actions, and blocked
      write actions.
- [x] MCP manifest exposes the route as read-only.
- [x] No schema, provider, or frontend authority changes are introduced.

## Definition of Done

- [x] Code builds without errors.
- [x] Relevant API tests pass.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Existing command behavior and fail-closed validation are preserved.
- [x] Changes are documented in relevant source-of-truth files.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` is checked before status changes to `DONE`.

## Validation Evidence

- Tests:
  - `npm run build:server` passed.
  - `npm run test:api` passed against validation-owned portable PostgreSQL on
    `127.0.0.1:55495`.
  - First `npm run test:api` run failed because the new operations proof data
    intentionally added records before older exact-count assertions; the test
    was corrected to clean up operations proof records before downstream
    assertions, then the full API suite passed.
  - `git diff --check` passed.
- Manual checks:
  - Verified the validation PostgreSQL listener on port `55495` was stopped.
  - Removed the validation-owned `.tmp/companycore-v1ops004-pg*` artifacts.
- Screenshots/logs: not applicable unless UI is changed.
- Reality status: verified.

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: protected API regression path through
  `/v1/operations/context`, `/v1/mcp/manifest`, and scoped API-key auth.
- Endpoint and client contract match: yes; route is mounted under `/v1`.
- DB schema and migrations verified: not applicable, no schema change planned.
- Loading state verified: not applicable, no UI change planned.
- Error state verified: unauthenticated and insufficient-scope requests fail
  closed.
- Refresh/restart behavior verified: build/test gate rebuilt server and web
  artifacts and reran migrations cleanly.
- Regression check performed: full API regression suite passed.

## Result Report

- Task summary: added protected read-only `GET /v1/operations/context`,
  exposed it through `operations:read` and MCP, documented the API, and added
  regression coverage for auth, scoping, workspace isolation, no mutation,
  response shape, profile visibility, and scoped-key denial.
- Files changed:
  - `src/modules/operations/operations.routes.ts`
  - `src/app.ts`
  - `src/auth/capabilities.ts`
  - `src/auth/agent-key-profiles.ts`
  - `src/mcp/manifest.ts`
  - `src/tests/api.test.ts`
  - `docs/API.md`
  - source-of-truth state files listed in git history for V1OPS-004
- How tested: `npm run build:server`, `npm run test:api` with
  `DATABASE_URL=postgresql://postgres@127.0.0.1:55495/postgres`, and
  `git diff --check`.
- What is incomplete: no frontend consumption was added in this backend slice;
  production deployment/smoke is covered by V1OPS-005.
- Next steps: deploy the pushed commit and smoke public health plus protected
  `/v1/operations/context`; then continue outside V1OPS with the next
  department-specific read model or safe command contract.
