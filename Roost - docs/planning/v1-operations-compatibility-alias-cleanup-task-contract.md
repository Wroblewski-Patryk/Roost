# V1 Operations Compatibility Alias Cleanup Task Contract

## Header

- ID: V1OPS-003
- Title: V1 Operations Compatibility Alias Cleanup
- Task Type: refactor
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder + QA/Test + Product Docs
- Depends on: V1OPS-002, AOG-BE-001, DMS-00-006
- Priority: P1
- Coverage Ledger Rows: CCORE-DM-001A, CCORE-DM-017, CCORE-DM-023A
- Module Confidence Rows: V1OPS-003
- Requirement Rows: REQ-V1OPS-003
- Quality Scenario Rows: QA-V1OPS-003
- Risk Rows: RISK-V1OPS-003
- Iteration: 2026-05-16
- Operation Mode: BUILDER
- Mission ID: V1OPS-003
- Mission Status: VERIFIED

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode is BUILDER because this is the next implementation slice
      after the production tester rollout.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by removing a route-key drift risk.

## Mission Block

- Mission objective: make backend department-key compatibility deterministic
  before deeper `/operations` and department-system work continues.
- Release objective advanced: V1 department routes, AOG reads, and global
  intake proposals use the same canonical `00`-`12` department vocabulary.
- Included slices: backend canonical department registry, AOG alias resolution,
  intake suggestion keys, API regression tests, source-of-truth updates.
- Explicit exclusions: no schema migration, no new write authority, no
  frontend redesign, no provider changes, no production deployment in this
  commit.
- Checkpoint cadence: commit and push after validation and state updates.
- Stop conditions: API contract mismatch, command-write behavior expansion, or
  failed API gate.
- Handoff expectation: the next agent can safely start one department-specific
  read model or safe command contract.

## Context

V1OPS-002 proved production can open the V1 routes. The next active queue item
asks for compatibility alias cleanup before new department-specific work. The
current backend resolves selected-area graph aliases in one route file, while
global intake uses a separate list of canonical keys and non-canonical
suggestion hints. This can make `03`, `07`, or other numbered departments
resolve by backend position instead of the intended V1 department key.

## Goal

Centralize the backend `00`-`12` department key vocabulary and make AOG plus
global intake use it consistently.

## Scope

- `src/operating-model/department-registry.ts`
- `src/modules/operating-graph/operating-graph.routes.ts`
- `src/modules/intake/intake.routes.ts`
- `src/tests/api.test.ts`
- `docs/planning/v1-operations-compatibility-alias-cleanup-task-contract.md`
- relevant source-of-truth state files after validation

## Implementation Plan

1. Add a small backend registry for canonical department keys, backend area
   keys, positions, and hint terms.
2. Replace local AOG alias map with the shared resolver and prioritize backend
   key resolution before numeric position fallback.
3. Replace intake hardcoded department keys and non-canonical hint outputs with
   the shared canonical list and canonical hint keys.
4. Add API tests proving selected V1 department keys resolve to the intended
   backend areas and intake suggestion/proposal validation remains canonical.
5. Run build/API validation and update source-of-truth files.

## Acceptance Criteria

- [x] `GET /v1/operating-graph/areas/03-sprzedaz` resolves to `sales-crm`, not
      the backend position-3 `tasks-workflow` area.
- [x] `GET /v1/operating-graph/areas/07-finanse` resolves to
      `finance-billing`, not the backend position-7 `people-roles` area.
- [x] Global intake suggested departments use canonical keys such as
      `07-finanse` and `00-ogolny`.
- [x] `POST /v1/intake/actions/propose-route` still rejects non-canonical
      department aliases like `07-finance`.
- [x] No schema, provider, or frontend authority changes are introduced.

## Definition of Done

- [x] Code builds without errors.
- [x] Relevant API tests pass.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Existing command behavior and fail-closed validation are preserved.
- [x] Changes are documented in relevant source-of-truth files.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changes to `DONE`.

## Validation Evidence

- Tests:
  - `npm run build:server` passed.
  - `npm run test:api` passed against validation-owned portable PostgreSQL on
    `127.0.0.1:55494`.
  - First `npm run test:api` run failed because the original intake heuristic
    selected the first matching department; the implementation was corrected to
    score hint matches so finance-heavy items resolve to `07-finanse`.
  - `git diff --check` passed.
- Manual checks:
  - Verified the validation PostgreSQL listener on port `55494` was stopped.
  - Removed the validation-owned `.tmp/companycore-v1ops003-pg*` artifacts.
- Screenshots/logs: not applicable unless UI is changed.
- Reality status: verified.

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: protected API regression path through
  `/v1/intake` and `/v1/operating-graph/areas/:areaKey`.
- Endpoint and client contract match: yes; no frontend contract changed.
- DB schema and migrations verified: not applicable, no schema change planned.
- Loading state verified: not applicable, no UI change planned.
- Error state verified: invalid department API test still rejects
  `07-finance`.
- Refresh/restart behavior verified: build/test gate rebuilt server and web
  artifacts and reran migrations cleanly.
- Regression check performed: full API regression suite passed.

## Result Report

- Task summary: added a shared backend department registry, replaced local AOG
  alias resolution with the shared resolver, made global intake use canonical
  `00`-`12` keys and scored department hints, and expanded API tests for
  selected-area alias resolution plus canonical intake suggestions.
- Files changed:
  - `src/operating-model/department-registry.ts`
  - `src/modules/operating-graph/operating-graph.routes.ts`
  - `src/modules/intake/intake.routes.ts`
  - `src/tests/api.test.ts`
  - source-of-truth state files listed in git history for V1OPS-003
- How tested: `npm run build:server`, `npm run test:api` with
  `DATABASE_URL=postgresql://postgres@127.0.0.1:55494/postgres`, and
  `git diff --check`.
- What is incomplete: no production deployment in this commit; frontend still
  has its own DMS metadata and can be unified in a later frontend/shared-model
  slice if needed.
- Next steps: implement one department-specific read model or safe command
  contract, starting with `01 Strategy` or a read-only department packet API
  that Paperclip can consume.
