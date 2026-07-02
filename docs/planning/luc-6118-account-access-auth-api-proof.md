# LUC-6118 Account Access Auth API Proof

Date: 2026-06-29
Issue: [LUC-6118](/LUC/issues/LUC-6118)
Parent: [LUC-6113](/LUC/issues/LUC-6113)
Task Type: QA verification
Current Stage: verification

## Task Contract

- Goal: determine whether the current automated API tests prove the
  highest-risk Account access app-completion queue for `/auth` and `/v1/auth`.
- Scope: local, non-production proof for owner registration, login,
  auth-token identity readback, protected API denial, invalid credentials, and
  invalid bearer behavior using existing tests and scripts.
- Implementation Plan: inspect the app-completion queue, route mounts,
  auth router, and existing API test coverage; run the smallest local API proof
  against a validation-owned PostgreSQL database; record residual risks and
  source-control posture.
- Acceptance Criteria: commands and results are recorded; paths/functions/routes
  proven are named; remaining auth/security risks have owner/action; no
  protected production smoke, push, deploy, restart, provider action, or secret
  disclosure occurs.
- Definition of Done: existing tests either pass with evidence or a narrow gap
  is routed to the owning role; local resources are cleaned up; source-control
  closure is recorded.

## Coverage Decision

Existing tests already cover the requested Account access API target. No new
test was added in this heartbeat.

The focused proof target was `src/tests/api.test.ts` test
`CompanyCore v1 protected API flow`. It exercises:

- public `GET /health` and `GET /v1/health`;
- missing protected API auth on `/projects` returning `401 missing_api_key`;
- owner registration through `/auth/register`;
- owner token use through protected `/auth/me`, `/v1/connection`, workspace,
  department, operating-model, API-key, and domain routes;
- `/auth/login` success;
- `/auth/me` invalid bearer denial returning `401 invalid_auth_token`;
- `/v1/auth/register` alias registration;
- `/v1/auth/login` alias success;
- `/v1/auth/me` alias identity readback with active workspace;
- `/v1/auth/login` wrong-password denial returning `401 invalid_credentials`;
- `/v1/auth/me` invalid bearer denial returning `401 invalid_auth_token`;
- cross-workspace protected API denial paths in the same protected flow.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Docker availability | PASS | `docker info --format '{{.ServerVersion}}'` returned `28.3.2`. |
| Validation database | PASS | Started task-owned container `companycore-luc-6118-postgres` on `127.0.0.1:55618`; `pg_isready` returned accepting connections. |
| Server/test compile | PASS | `DATABASE_URL=postgresql://companycore:companycore@127.0.0.1:55618/companycore_test?schema=public NODE_ENV=test npm run build:server`. |
| Migrations | PASS | Same local `DATABASE_URL`; `npm run prisma:migrate:deploy` applied all `31` migrations successfully. |
| Seed | PASS | Same local `DATABASE_URL`; `npm run seed`. |
| Focused API proof | PASS | Same local `DATABASE_URL`; `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js` passed `1/1` in `12.431s`. |
| Route capability drift | PASS | `npm run check:route-capabilities` returned `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. |
| Diff hygiene | PASS | `git diff --check` returned only existing LF-to-CRLF warnings. |
| Cleanup | PASS | `docker rm -f companycore-luc-6118-postgres`; follow-up `docker ps -a --filter name=^/companycore-luc-6118-postgres$` returned no rows. `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned no rows. |

## Result Report

Status: `verified`.

The current automated API suite already proves the account-access API path
requested by [LUC-6118](/LUC/issues/LUC-6118). The highest-risk `/auth` and
`/v1/auth` route rows are executable locally through the named protected API
flow, including registration, login, auth-token readback, protected-request
denial, invalid credentials, invalid bearer token, and workspace isolation.

No product code, test code, schema, migration, production smoke, push, deploy,
restart, provider action, credential access, secret disclosure, browser, or
frontend change was performed.

Residual risk: this is local non-production API proof only. Production auth
smoke, protected live credentials, and release deployment evidence remain
separate Ops/Security gates.

Source-control disposition: new evidence packet only, plus source-of-truth
state entries. Commit not created because the shared worktree is already
mixed-dirty and `main` is ahead of `origin/main`; push not needed; deploy
impact none.
