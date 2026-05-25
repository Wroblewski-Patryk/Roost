# Rollback And Recovery

Document the safe rollback path for production deploys.

## Current V1 Rollback Pointer

- Current exposed production backend image from public `/health`:
  `rnqqkhl3o3dut4qv56mlxly2_backend:d2c9b9460a5db63703ca28f98988a2fa35d3a651`.
- Current exposed production build commit from public `/health`:
  `d2c9b9460a5db63703ca28f98988a2fa35d3a651`.
- VPS container inventory:
  - Running backend:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-d2c9b94`.
  - Running Postgres:
    `postgres-rnqqkhl3o3dut4qv56mlxly2-000111035165`.
- Previous verified rollback container retained after the 2026-05-16 manual
  rollover:
  `backend-rnqqkhl3o3dut4qv56mlxly2-000111041002-previous-d2c9b94`.
- Previous verified rollback image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:dd1f2c12600c748783394f29cbf24945c55a8752`.
- Production Postgres container/volume must be preserved during rollback.

## Rollback Triggers

- Failed `GET /health` after deploy.
- Failed `prisma migrate deploy`.
- Auth or workspace bootstrap failure after deploy.
- Data ownership regression or cross-workspace leakage.
- Native integration sync corrupts, duplicates, or loses data.
- Operator evidence to capture first: failing command, deployment version,
  migration name, relevant logs with secrets redacted, and smoke step result.

## Rollback Method

- App rollback: redeploy the previous known-good commit/image.
- Database rollback or recovery:
  - Prefer forward-fix migrations for already-applied production migrations.
  - Restore from backup only when data corruption or unsafe ownership migration
    requires it.
  - If Prisma reports `P3005` against an existing schema, verify table shape
    and add a one-time baseline migration metadata row instead of deleting the
    volume.
  - Never run ad hoc schema edits directly against production without a
    documented recovery decision.
  - Before risky migrations, take a PostgreSQL backup or verified volume
    snapshot.
  - After restoring from backup, rerun smoke checks before accepting traffic.
  - If a migration added ownership or external ID uniqueness, verify there are
    no cross-workspace records or duplicate external IDs before retrying deploy.
- Worker rollback: not applicable in v1 because there are no worker services.
- Cache or queue considerations: not applicable in v1.

## Recovery Verification

- Health checks: `GET /health`.
- User journey smoke: owner auth/bootstrap, protected workspace project/task
  call, denied unauthorized or cross-workspace call, ClickUp sync when
  configured, event readback.
- Log review: backend startup, migration output, auth failures, integration
  failures, and event creation failures.
- Data integrity review: confirm workspace-scoped records remain associated
  with the expected workspace and external sync idempotency is preserved.

## Notes

- Prefer deterministic rollback or forward-fix rules over improvisation.
- If rollback is unsafe for a given change type, record the required mitigation
  before deployment.
- Keep the PostgreSQL volume. Deleting the volume is data loss, not rollback.
