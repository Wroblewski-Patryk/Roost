# LUC-3716 Local API Test OperatingArea Fixture Repair

Status: DONE
Task type: backend repair / API test fixture
Current stage: verification
Last updated: 2026-06-13
Owner: Core Backend Engineer
Parent: [LUC-3713](/LUC/issues/LUC-3713)

## Goal

Make `npm run test:api:local` pass again for the CompanyCore protected API flow
and Process Core integration rung after [LUC-3713](/LUC/issues/LUC-3713)
surfaced a missing `OperatingArea` fixture failure.

## Scope

- `src/modules/relationships/relationships.routes.ts`
- `src/tests/api.test.ts`
- Local disposable API validation through `npm run test:api:local`

## Implementation Plan

1. Reproduce the failing local API proof from LUC-3713.
2. Fix the smallest fixture/runtime drift without bypassing coverage.
3. Preserve Process Core auth, workspace isolation, no-mutation, MCP/profile,
   and scoped-denial assertions.
4. Rerun the local API proof and record cleanup evidence.

## Acceptance Criteria

- `npm run test:api:local` passes against disposable `companycore_test`.
- Relationships context uses the canonical department registry mapping for
  `05-relacje` instead of a non-existent ad hoc backend area.
- Process Core coverage still proves knowledge-link counting when a live link
  exists.
- Command-route assertions use live test targets and do not pollute later
  workspace isolation counts.
- No protected smoke, deploy, push, restart, production mutation, credential
  disclosure, or production DB access occurs.

## Definition Of Done

- [x] Missing `OperatingArea` fixture failure is repaired.
- [x] Follow-on stale fixture failures are repaired without weakening
      assertions.
- [x] `npm run test:api:local` passes.
- [x] Disposable PostgreSQL container is removed by the harness after proof.
- [x] Source-of-truth state is updated with evidence.

## Result Report

Fixed the local API test fixture drift and one related runtime fallback:

- `05-relacje` Relationships context now falls back to canonical backend area
  `sales-crm`, matching `src/operating-model/department-registry.ts`.
- The Relationships API fixture uses `sales-crm` and cleans up its temporary
  records before later exact-count isolation assertions.
- The Process Core coverage proof creates a temporary `KnowledgeLink` against
  an existing knowledge item before reading `/v1/process-core/coverage`, then
  removes the link.
- Company OS command-route assertions now use a live local task fixture instead
  of the earlier deleted Operations task.
- Late workflow process/pipeline IDs are created directly in the disposable
  test database because raw POST routes for `/v1/company-os/processes` and
  `/v1/company-os/pipelines` are not exposed command routes.

Validation:

- `npm run test:api:local` PASS. The command built server/web, applied all
  `31` migrations, seeded, and ran `7/7` API subtests successfully against
  disposable PostgreSQL `companycore_test`.
- Cleanup check: `docker ps -a --filter "name=^/companycore-test-postgres$"`
  returned no rows after the passing run.

Commit decision: not committed in this heartbeat because the shared Roost
workspace already contains unrelated LUC-3712/LUC-3713 generated/state changes
and source-control closure is a separate lane. Push status: not needed. Deploy
impact: none.
