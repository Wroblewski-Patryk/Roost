# LUC-5661 /v1 Auth Alias Parity API Proof

## Header
- ID: LUC-5661
- Title: Add /v1/auth alias parity API proof after LUC-5659
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Depends on: [LUC-5659](/LUC/issues/LUC-5659)
- Priority: P1
- Module Confidence Rows: Account access / auth API alias parity
- Iteration: 2026-06-27 heartbeat
- Operation Mode: TESTER
- Mission ID: LUC-5661-V1-AUTH-ALIAS-PARITY-API-PROOF
- Mission Status: VERIFIED

## Context

[LUC-5659](/LUC/issues/LUC-5659) selected `/v1/auth` alias parity as the
smallest non-duplicated app-completion proof gap. `src/app.ts` mounts the same
`authRouter` at `/auth` and `/v1/auth`, while `src/tests/api.test.ts` already
covered `/auth/register`, `/auth/login`, and `/auth/me` without explicit
`/v1/auth/register` or `/v1/auth/login` assertions.

## Goal

Add executable API proof that `/v1/auth` behaves like the existing public auth
contract for owner registration, login, authenticated identity readback, and
fail-closed denial paths.

## Scope

- `src/app.ts` inspected; no route implementation change needed.
- `src/modules/auth/auth.routes.ts` inspected; no route implementation change
  needed.
- `src/tests/api.test.ts` updated.
- Source-of-truth state/context files updated with verification evidence.

## Implementation Plan

1. Inspect current route mounts and auth router implementation.
2. Add the smallest non-duplicated assertions in the existing API integration
   flow.
3. Run requested route, architecture, and API gates.
4. Record evidence, cleanup status, and source-control disposition.

## Result Report

`src/tests/api.test.ts` now asserts:

- `POST /v1/auth/register` creates a disposable owner, token, user, and
  workspace with the expected response shape.
- `POST /v1/auth/login` succeeds for that owner and returns the same user and
  workspace identity.
- `GET /v1/auth/me` with the returned bearer token reports user auth context,
  active workspace, and workspace membership.
- `POST /v1/auth/login` with the wrong password returns `401
  invalid_credentials`.
- `GET /v1/auth/me` with an invalid bearer token returns `401
  invalid_auth_token`.

## Validation Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Route capability drift | PASS | `npm run check:route-capabilities` -> `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok` |
| Architecture status | PASS | `npm run architecture:status` -> `GREEN`, graph `454` nodes / `765` relations / `35` chains, queues `0`, delta `0/0/0`, all gates pass |
| API integration gate | PASS | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5661-postgres COMPANYCORE_TEST_DB_PORT=55561 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` -> build server/web, Prisma migrate deploy, seed, and Node API tests `7/7` pass |
| Cleanup | PASS with pre-existing listener noted | No LUC-5661 Docker container; no `chrome-headless-shell`; port `55561` is held by a pre-existing embedded PostgreSQL process using `.tmp/luc-5561-pg-data`, started before this task, so it was not stopped |

## Definition of Done

- [x] Code builds without errors through `npm run test:api:local`.
- [x] The affected API contract works through executable integration tests.
- [x] No mock, placeholder, fake, or temporary route path was introduced.
- [x] Existing `/auth/*` and protected API test coverage still passes.
- [x] Error handling is covered for invalid credentials and invalid bearer
  token.
- [x] `DEFINITION_OF_DONE.md`, `INTEGRATION_CHECKLIST.md`, and
  `NO_TEMPORARY_SOLUTIONS.md` were reviewed.

## Source-Control Disposition

- Files changed by this lane: `src/tests/api.test.ts`,
  `docs/planning/luc-5661-v1-auth-alias-parity-api-proof.md`, plus
  source-of-truth state/context entries.
- Commit: created for the scoped test and proof packet only; final SHA is
  recorded in the Paperclip closure. Source-of-truth state/context entries
  remain uncommitted because the shared worktree already contains unrelated
  uncommitted LUC-5658/docs/state changes, including some of the same files.
- Push: not needed.
- Deploy impact: none.
- Residual risk: production runtime remains governed by separate release and
  protected smoke gates; this task proves local API alias parity only.
