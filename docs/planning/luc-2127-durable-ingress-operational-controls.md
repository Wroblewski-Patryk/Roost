# LUC-2127 Durable Ingress Operational Controls

## Task Contract

- Task Type: backend/data implementation
- Current Stage: verification
- Deliverable For This Stage: committed Roost-only ingress-control packet with
  migration compatibility and database-backed API proof.

## Goal

Make Product Map ingress admission and retention survive process restarts and
operate consistently across Roost instances without adding another queue,
rate-limit family, or scheduler.

## Scope

- `ProductMapProjectionAdmission` stores the `(ingest key, workspace)` token
  bucket in PostgreSQL.
- Transaction-scoped PostgreSQL advisory locks serialize same-workspace ingress
  across application instances.
- The existing ClickUp maintenance scheduler performs bounded projection cleanup
  once per 24 hours and emits a named stderr failure signal.
- The baseline projection migration uses explicit PostgreSQL-safe index names.

## Implementation Plan

1. Add durable token-bucket schema and migration.
2. Apply admission before projection parsing and use an xact-scoped workspace
   lock during acceptance.
3. Add daily cleanup to the existing scheduler and remove stale admission rows.
4. Prove migration application and the real ingress/read journey on a local
   disposable PostgreSQL database.

## Acceptance Criteria

- Migration deploy succeeds from an empty local database.
- Ingress persists the accepted packet, an independent workspace reads `empty`,
  exact retries are safe, and the burst cap returns the generic denial.
- Server build and focused envelope checks pass.
- No local runtime, deployment, push, or protected probe is performed.

## Definition of Done

The source-control commit, migration/test evidence, residual release gates,
and parent handoff are recorded in the issue closeout.

## Result Report

- `npm run test:api:local` passed on 2026-07-28: build, all 33 migrations,
  seed, and 8 API tests passed, including the scheduler's bounded cleanup of
  an expired admission row. The disposable `companycore-test-postgres`
  container was removed by the harness.
- `npm run build:server` and `node --test dist/tests/product-map-projection.test.js`
  passed.
- Residual risk: protected production deployment, independent Security/Ops
  review, backup/restore exercise, and publisher/runtime activation remain
  intentionally outside this local backend packet.
