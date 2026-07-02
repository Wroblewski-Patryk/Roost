# LUC-6155 Auth/Config API Proof Lane

Date: 2026-06-29
Issue: [LUC-6155](/LUC/issues/LUC-6155)
Related: [LUC-6151](/LUC/issues/LUC-6151), [LUC-5570](/LUC/issues/LUC-5570)

## Task Contract

- Task Type: backend/API verification
- Current Stage: verification
- Deliverable For This Stage: behavioral local proof for auth/config endpoint assertions previously surfaced but not executed in [LUC-5570](/LUC/issues/LUC-5570).
- Goal: prove the auth and configuration backend boundary assertions against a real disposable PostgreSQL database.
- Scope: `src/app.ts`, `src/modules/auth/auth.routes.ts`, `src/modules/api-keys/api-keys.routes.ts`, `src/modules/workspaces/workspaces.routes.ts`, `src/modules/connection/connection.routes.ts`, `src/modules/integration-settings/integration-settings.routes.ts`, `src/tests/api.test.ts`, and `docs/planning/luc-5570-api-auth-config-route-coverage.md`.
- Exclusions: product route implementation changes, schema changes, migrations, frontend/browser proof, protected production smoke, push, deploy, restart, live provider action, credential access, or secret disclosure.

## Implementation Plan

1. Read the prior [LUC-5570](/LUC/issues/LUC-5570) coverage packet and current route/test sources.
2. Run the same behavioral local API proof in a [LUC-6155](/LUC/issues/LUC-6155) owned disposable database environment.
3. Run static route capability and architecture status checks.
4. Confirm validation-owned local resources were cleaned up.
5. Update source-of-truth files with the completed proof and residual risk.

## Acceptance Criteria

- The API suite executes against a disposable local PostgreSQL database.
- The assertions added by [LUC-5570](/LUC/issues/LUC-5570) are included in the executed suite.
- Route/capability mapping remains green.
- Architecture status remains green.
- No task-owned Docker/browser/server process remains.

## Definition Of Done

- Proof command and result are recorded.
- Cleanup evidence is recorded.
- Source-of-truth state files are updated.
- Deployment impact and residual risk are explicit.

## Result Report

Status: `verified`.

### Evidence

- Behavioral API proof: `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-6155-postgres COMPANYCORE_TEST_DB_PORT=55655 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` PASS.
- Harness details: `npm run build:server` PASS; `npm run build:web` PASS; `npm run prisma:migrate:deploy` PASS with `31` migrations applied to `companycore_test` on `127.0.0.1:55655`; `npm run seed` PASS; `node --test dist/tests/api.test.js` PASS (`8/8` subtests).
- Focused auth/config assertions included in the passing suite: `account and workspace settings profile contract exposes active owner workspace`; `CompanyCore v1 protected API flow`, including the [LUC-5570](/LUC/issues/LUC-5570) auth/config additions and `/v1/auth` alias register/login/me assertions.
- Route capability: `npm run check:route-capabilities` PASS (`180` manifest routes / `35` route files).
- Architecture status: `npm run architecture:status` PASS (`GREEN`, graph `454` nodes / `765` relations / `35` chains, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass).
- Diff hygiene: `git diff --check` PASS with LF-to-CRLF warnings only.
- Cleanup: `docker ps -a --filter "name=companycore-luc-6155-postgres"` returned no rows after the harness completed. `Get-Process chrome-headless-shell` returned no rows; no browser proof was started.

## Final Disposition

[LUC-6155](/LUC/issues/LUC-6155) is complete locally. The previously blocked behavioral API proof from [LUC-5570](/LUC/issues/LUC-5570) now passes in the current repository snapshot. No backend repair child issue is warranted.

## Deployment Impact

None. This was local verification only. No product code, schema, migration, push, deploy, protected smoke, production mutation, credential access, or provider action was performed.

## Residual Risk

Protected production auth/config smoke remains a separate release/Ops gate requiring explicit approval and valid runtime credentials. The shared worktree remains mixed-dirty and ahead of origin, so this proof packet was not committed in this heartbeat.
