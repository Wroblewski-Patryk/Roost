# LUC-5570 API Auth/Config Route Coverage

## Task Contract

- Task Type: backend test coverage
- Current Stage: verification
- Deliverable For This Stage: focused API assertions and recorded proof for the auth/config route coverage handoff from the missing-test signal.
- Goal: turn high-risk backend auth/config entries from `implementation_without_tests` into targeted coverage or a precise no-defect note.
- Scope: `src/tests/api.test.ts` assertions for `/auth/me`, `/v1/api-keys`, `/v1/api-keys/profiles`, and `/v1/workspaces` owner-only configuration boundaries. Existing route code in `src/app.ts`, `src/modules/auth/auth.routes.ts`, `src/modules/api-keys/api-keys.routes.ts`, and `src/modules/workspaces/workspaces.routes.ts` was inspected but not changed.
- Implementation Plan: inspect existing protected API flow coverage, add only missing focused assertions, run the smallest static/backend gates, attempt the project local API harness, and record residual risk.
- Acceptance Criteria: invalid bearer auth fails closed; service API keys cannot list/manage owner API key configuration; service API keys cannot list or select user workspaces; route capability mapping remains green; architecture status remains green.
- Definition of Done: code compiles, route capability mapping passes, diff hygiene has no whitespace errors, architecture status is green, and blocked behavioral proof is recorded with exact environment blocker.

## Result Report

- Changed: `src/tests/api.test.ts`.
- Added coverage:
  - `/auth/me` with an invalid bearer token returns `401 invalid_auth_token`.
  - Broad service API key callers receive `403 forbidden` from `/v1/api-keys` and `/v1/api-keys/profiles`.
  - Broad service API key callers receive `403 forbidden` from `/v1/workspaces` and `/v1/workspaces/:id/actions/select`.
- Verification:
  - `npm run build:server` PASS.
  - `npm run check:route-capabilities` PASS (`180` manifest routes / `35` route files).
  - `git diff --check` PASS with existing LF-to-CRLF warnings only.
  - `npm run architecture:status` PASS (`GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass).
- Blocked proof:
  - `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5570-postgres COMPANYCORE_TEST_DB_PORT=55570 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` could not start because Docker Desktop's Linux engine pipe was unavailable before disposable PostgreSQL creation.
- Disposition: partially verified. Static/backend coverage gates passed, and the behavioral API harness remains blocked by local Docker availability rather than a code assertion failure.
- Deploy impact: none. No schema, migration, route implementation, push, deploy, protected smoke, credential access, provider call, browser, local server, or long-running process was used.
- Residual risk: the new assertions are compiled but not executed in this heartbeat because the local API database harness could not start. Next owner should rerun the same `test:api:local` command in a Docker-enabled environment or with an approved safe local `DATABASE_URL`.
