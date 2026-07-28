# Task

## Header

- ID: LUC-2147
- Title: Restore disposable API suite workspace provisioning
- Task Type: fix
- Current Stage: verification complete
- Status: DONE
- Owner: CTO
- Priority: P0
- Operation Mode: BUILDER
- Mission Status: VERIFIED

## Goal

Restore workspace registration in the disposable API suite without changing product behavior.

## Scope

- `src/operating-model/catalog.ts`
- `src/tests/api.test.ts`
- this task record and the applicable project confidence state

## Plan

1. Confirm the singleton-workspace repair lane is terminal and its disposable resources are absent.
2. Repair the operating-model provisioning invariant, with a focused regression assertion.
3. Run the disposable suite and record the result.

## Acceptance Criteria

- `npm run test:api:local` reaches the Product Map journey.
- Workspace registration preserves valid area-to-table foreign-key relationships.
- No fixture-only bypass or runtime/deployment change is introduced.

## Risk And Validation

- Risk: standard test-infrastructure/database provisioning repair.
- Proof: focused regression coverage plus the exact disposable API-suite command.
- Deployment impact: none.

## Resource-Safety Precondition

The local board placed a resource-safety hold because the singleton disposable PostgreSQL suite overlapped with LUC-2145. The overlapping run is invalid as test evidence. LUC-2145 is now terminal; before the isolated rerun, port 55432 and Docker's published-port inventory were confirmed clear.

## Result

- The isolated `npm run test:api:local` run passed: server and web build, 33
  migrations, seed, and all 8 API subtests, including `CompanyCore v1 protected
  API flow` and its Product Map HTTP coverage.
- The prior `operating_tables_area_id_fkey` failure did not reproduce once the
  singleton fixture was exclusive. No provisioning code change was warranted.
- Root cause: concurrent lanes contended for the singleton disposable PostgreSQL
  fixture. The overlapping run is invalid evidence; the exclusive rerun is the
  accepted baseline.
- Deploy, credentials, production mutation, and protected smoke were excluded.
