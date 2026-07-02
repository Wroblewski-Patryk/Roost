# LUC-5561 Auth And Account Access Local Smoke Proof

Date: 2026-06-27
Issue: [LUC-5561](/LUC/issues/LUC-5561)
Parent: [LUC-5559](/LUC/issues/LUC-5559)
Stage: verification

## Task Contract

- Goal: verify the Account access lane called out by the Roost
  app-completion index.
- Task Type: QA verification.
- Current Stage: verification.
- Deliverable For This Stage: local API and browser smoke proof for
  registration, login, owner-token persistence, and protected-route access.

## Scope

Surfaces verified:

- API routes: `USE /auth`, `USE /v1/auth`, and protected `/v1/auth/me`.
- Frontend files: `web/src/features/auth/auth-pages.tsx`,
  `web/src/api/auth-token.ts`, `web/src/api/client.ts`.
- Test/proof entrypoints: `npm run test:api:local` and a scoped Playwright
  browser smoke against a temporary local server.

Exclusions:

- No product code, schema, migration authoring, push, deploy, protected smoke,
  production mutation, live credentials, provider action, or secret access.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Local API harness | PASS | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5561-postgres COMPANYCORE_TEST_DB_PORT=55561 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` passed after build, `31` migrations, seed, and `7/7` Node API subtests. |
| Migration retry diagnostic | PASS | First harness attempt reached build and then hit a terse Prisma schema-engine error at `migrate deploy`. Kept DB diagnostic showed PostgreSQL healthy; direct `npx prisma migrate deploy --schema prisma/schema.prisma` then applied all `31` migrations successfully, and the full harness rerun passed. |
| Browser registration | PASS | Scoped Playwright proof on `http://127.0.0.1:31562` submitted `/auth/register`, stored `companycoreOwnerToken` in `sessionStorage`, opened `/areas?area=00-ogolny&view=overview`, and verified `/v1/auth/me` returned a user auth context with active workspace. |
| Browser login | PASS | Same proof cleared the token, submitted `/auth/login`, stored a new `companycoreOwnerToken`, opened `/areas?area=00-ogolny&view=overview`, and verified `/v1/auth/me` returned a user auth context with active workspace. |
| Artifacts | PASS | `docs/ux/evidence/luc-5561-auth-account-access/browser-auth-smoke-report.json` plus `register-form-filled.png`, `post-register-protected-route.png`, `login-form-filled.png`, and `post-login-protected-route.png`. |
| Cleanup | PASS | Validation-owned server `31562`, Docker container `companycore-luc-5561-browser-postgres`, stale validation server `31561`, and Playwright Chrome processes were cleaned up; follow-up checks showed no listeners on `31561`/`31562`, no `companycore-luc-5561*` containers, and no Playwright Chrome/headless rows. |

## Acceptance Criteria

- [x] Registration/login/token persistence is reported with evidence.
- [x] Protected-route access is reported with evidence.
- [x] Command output and browser/API proof are included.
- [x] Protected/live credentials were not used.

## Result Report

Status: `VERIFIED_DONE`.

Account access is locally verified. The API harness passed the existing
protected API flow, including auth and workspace behavior. The browser proof
verified the real UI registration and login forms, token persistence in
`sessionStorage`, protected route navigation, and authenticated
`/v1/auth/me` readback from the browser context.

Residual risk: the browser report captured generic Chrome console messages for
`401 Unauthorized` during auth route transitions, but Playwright recorded no
failed browser requests and all auth assertions passed. Treat this as
non-blocking noise for this issue unless a future UX-console cleanup lane
requires zero-console auth transitions.

Commit status: not committed because the shared workspace already contains
unrelated untracked evidence/planning packets and source-control closure is a
separate lane. Push status: not pushed. Deploy impact: none.
