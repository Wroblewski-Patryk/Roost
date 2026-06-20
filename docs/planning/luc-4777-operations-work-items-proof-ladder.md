# LUC-4777 Operations Work-Items Proof Ladder

## Header
- ID: LUC-4777
- Title: [Roost] [QA] Execute Operations work-items proof ladder from LUC-4774 baseline
- Task Type: QA verification
- Current Stage: verification
- Deliverable For This Stage: local API proof, authenticated UI proof, and cleanup evidence
- Status: DONE
- Owner: QA & Verification Engineer
- Priority: P1
- Mission ID: LUC-4777-OPERATIONS-WORK-ITEMS-PROOF-LADDER
- Last updated: 2026-06-20

## Goal
Run the Operations work-items proof ladder selected by LUC-4763 and reaffirmed
by LUC-4774, using the smallest local checks that can prove the target
workflow without protected smoke, deploy, push, restart, production mutation,
credential access, or secret disclosure.

## Scope
- Included:
  - `04 Operations` work-items vertical slice.
  - `npm run build:server`.
  - `npm run test:api:local`.
  - Authenticated UI proof for `/areas?area=04-operacje&view=overview` after
    the API rung was restored by [LUC-4779](/LUC/issues/LUC-4779).
- Evidence paths:
  - `docs/planning/luc-4763-first-proof-ladder-target-from-implementation-without-tests.md`
  - `docs/planning/luc-4774-known-state-evidence-and-architecture-baseline.md`
  - `docs/planning/luc-4779-restore-local-api-test-database-path.md`
  - `src/modules/operations/operations.routes.ts`
  - `web/src/features/departments/operations-route.tsx`
  - `src/tests/api.test.ts`
  - `scripts/test-api-local.mjs`
- Excluded:
  - Runtime code changes by QA.
  - Schema or migration changes by QA.
  - Protected smoke, deploy, push, restart, production mutation, credential
    access, secret disclosure, or production data access.

## Implementation Plan
1. Confirm LUC-4763/LUC-4774 selected the Operations work-items ladder.
2. Run `npm run build:server`.
3. Run `npm run test:api:local`.
4. If a rung fails, stop broadening and route a repair issue with exact
   command output and owner.
5. After [LUC-4779](/LUC/issues/LUC-4779) resolves the local database blocker,
   rerun `npm run test:api:local`.
6. If API proof is green, run authenticated UI proof for
   `/areas?area=04-operacje&view=overview`.

## Acceptance Criteria
- Exact commands, pass/fail output, and cleanup evidence are recorded.
- If a rung fails, broader proof stops and a repair issue is created or routed.
- No protected smoke, deploy, push, restart, production mutation, credential
  access, or secret disclosure occurs.

## Definition Of Done
- The highest completed rung is evidence-backed.
- Any failed rung is captured with exact output and owner.
- Relevant project state and module confidence files are updated.
- Paperclip issue disposition matches repository evidence.
- `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` are checked before
  marking done.

## Proof Results

| Rung | Command | Result | Evidence |
| --- | --- | --- | --- |
| Server compile | `npm run build:server` | PASS | TypeScript server build completed with no errors. |
| Local API integration, first attempt | `npm run test:api:local` | BLOCKED before API tests | Script failed while checking Docker availability: `Docker is not available for local API tests.` and `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` |
| Repair lane | [LUC-4779](/LUC/issues/LUC-4779) | DONE | DRE restored the local API test database path in `scripts/test-api-local.mjs` and verified `npm run test:api:local` passed. |
| Local API integration, QA rerun | `npm run test:api:local` | PASS | Built server and web, applied all `31` migrations to disposable `companycore_test` on `127.0.0.1:55432`, seeded, and passed `7/7` API subtests. |
| Kept disposable DB for UI proof | `COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` | PASS | Rebuilt, reapplied `31` migrations, seeded, passed `7/7` API subtests, and left the validation database available for the temporary backend. |
| Local backend health | `node dist/server.js` on `PORT=3234` with local `DATABASE_URL`; `GET /health` | PASS | `GET http://127.0.0.1:3234/health` returned `200` with `status=ok`. |
| Authenticated UI proof | Playwright Chromium against `/areas?area=04-operacje&view=overview` | PASS | Registered a disposable owner through `/v1/auth/register`, stored the real owner token in `sessionStorage`, and verified desktop `1366x900` plus mobile `390x844`: Operations surface visible, Lists visible, board columns visible, no packet error, no horizontal overflow, no console issues, and no relevant failed requests. |

## Cleanup Evidence
- The temporary backend process on `PORT=3234` was stopped after UI proof;
  follow-up health check returned `server stopped`.
- The validation-owned `companycore-test-postgres` container was removed with
  `docker rm -f companycore-test-postgres`; follow-up `docker ps -a --filter
  "name=^/companycore-test-postgres$"` returned no rows.
- Playwright browser contexts were closed; `Get-Process chrome-headless-shell
  -ErrorAction SilentlyContinue` returned no process rows after cleanup.
- Docker Desktop was left running because the DRE repair packet recorded
  unrelated active containers; this QA run removed only the Roost validation
  container it owned.

## Blocker And Repair Lane
- Previous blocker: local validation database path was unavailable because
  Docker Desktop Linux engine was not reachable in this environment.
- Repair owner: Deployment and Reliability Engineer.
- Child issue: [LUC-4779](/LUC/issues/LUC-4779), now `DONE`.
- Blocker disposition: resolved for this QA lane. QA reran the local API rung
  and completed authenticated UI proof.

## Result Report
LUC-4777 is complete for the Operations work-items proof-ladder scope.
The initial local API database blocker was routed to and resolved by
[LUC-4779](/LUC/issues/LUC-4779). QA then reran `npm run test:api:local`,
which built server/web, applied all `31` migrations, seeded, and passed `7/7`
API subtests. QA also ran authenticated Playwright proof against
`/areas?area=04-operacje&view=overview` on desktop and mobile using a real
disposable owner registration and the local backend; the Operations surface,
Lists area, and board columns rendered with no packet error, no horizontal
overflow, no console issues, and no relevant failed requests.

No runtime code, schema, migration, protected smoke, deploy, push, restart,
production mutation, credential access, secret disclosure, or production data
access occurred in this QA lane. Validation-owned backend, browser, and
database resources were cleaned up.
