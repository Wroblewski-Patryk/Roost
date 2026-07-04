# LUC-94 Company OS Seed Idempotency

## Task Type

Implementation / data persistence repair.

## Current Stage

Verification.

## Deliverable For This Stage

Repair and prove Company OS seed idempotency for Docker smoke reruns.

## Goal

Make `npm run seed` idempotent for the Company OS foundation automation rule path so Docker-backed smoke reruns can proceed past setup.

## Scope

- `prisma/seed.ts`
- Company OS foundation seed path for `AutomationRule(workspace_id,name)` and its deployment-health trigger.
- Local Docker Compose validation only.

Out of scope:

- Production deploy, push, restart, protected smoke, credential rotation, or schema migration.
- Broad seed refactors outside the failing Company OS foundation rule.

## Implementation Plan

1. Replace the nested automation-rule create path with an idempotent rule upsert.
2. Ensure the related trigger through lookup plus update/create instead of nested create.
3. Verify TypeScript build and Docker-backed migration/seed/smoke path.
4. Clean up validation-owned Docker resources.

## Acceptance Criteria

- `npm run seed` is idempotent for the Company OS foundation path on a migrated local Docker database.
- The previous Prisma `P2002` on `AutomationRule(workspace_id,name)` no longer reproduces.
- The previously blocked smoke setup proceeds to `company-os:trace-smoke` and `operating-model:registry-smoke`, or any remaining smoke failure is classified separately.
- Cleanup evidence is recorded.

## Result Report

Implemented and verified.

Changed `prisma/seed.ts` so `Escalate failed deployment health check` is upserted as the automation-rule record first, then its `deployment_health_failed` trigger is ensured by `findFirst` plus update/create. This reuses the existing persistence model and avoids a nested create inside the compound-key rule upsert.

Validation:

- `npm run build:server` - PASS.
- `docker info --format '{{.ServerVersion}}'` - PASS, Docker `28.3.2`.
- `docker compose up -d --build backend` - PASS; started validation-owned `roost-postgres-1` and `roost-backend-1`.
- Initial container seed attempt exposed a separate local production-env config requirement: missing `AUTH_TOKEN_SECRET`, before seed logic. Rerun used disposable local proof values for `AUTH_TOKEN_SECRET`, `INTEGRATION_SECRET_KEY`, and `API_KEY_HASH_SECRET`; no real secrets were used or printed.
- `docker compose run --rm -T ... backend sh -lc "npm run prisma:migrate:deploy && npm run seed && npm run seed"` - PASS; 31 migrations present, no pending migrations, two consecutive seed passes completed.
- `docker compose run --rm -T ... backend sh -lc "npm run prisma:migrate:deploy && npm run seed && npm run company-os:trace-smoke && npm run operating-model:registry-smoke"` - PASS; `company-os:trace-smoke` returned `ok: true` and `operating-model:registry-smoke` returned `ok: true`.
- `docker compose down -v` - PASS; removed `roost-backend-1`, `roost-postgres-1`, `roost_default`, and `roost_companycore_postgres`.
- Post-cleanup checks for matching `roost` / `companycore` containers, volumes, and networks returned no output.

## Definition Of Done

- Code builds without errors: verified by `npm run build:server`.
- Real affected operator path works: verified by Docker-backed migrate, two seed passes, and both Company OS smoke scripts.
- No temporary bypass: the seed now owns rule and trigger idempotency through persisted records.
- Database schema/code alignment: no schema change required; existing `AutomationRule(workspaceId,name)` unique key is reused.
- Documentation/source-of-truth updated: this packet plus project state, task board, active mission, module confidence, and project memory index.

## Deployment Impact

Local seed code only. No push, deploy, restart, protected smoke, provider mutation, production database mutation, or credential value read occurred.

## Residual Risk

No remaining LUC-94 seed blocker. The first compose backend start still requires production-grade env vars when `NODE_ENV=production`; this is existing runtime configuration behavior and was not changed by this issue.
