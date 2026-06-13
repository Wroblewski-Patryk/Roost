# LUC-3713 Process Core Integration Rung With Local API Test Database

Status: VERIFIED_DONE
Task type: QA / backend integration proof
Current stage: verification
Last updated: 2026-06-13
Owner: QA & Verification Engineer
Parent: [LUC-3703](/LUC/issues/LUC-3703)

## Goal

Move the Process Core selected slice from partially verified to verified, or
capture a concrete failing defect, by rerunning the local API integration rung
identified in [LUC-3545](/LUC/issues/LUC-3545) and carried forward by
[LUC-3703](/LUC/issues/LUC-3703).

## Scope

- Read `docs/planning/luc-3545-first-proof-ladder-from-implementation-without-tests.md`.
- Read `docs/planning/luc-3703-known-state-evidence-and-architecture-baseline.md`.
- Confirm whether Docker Desktop Linux engine or an authorized disposable
  local `companycore_test` `DATABASE_URL` is available.
- Run the target proof command, `npm run test:api:local`, if safe.
- Classify the result as environment blocker or product defect.

## Implementation Plan

1. Inspect the local database prerequisites without printing secrets.
2. Run the target local API proof command.
3. Record pass/fail evidence, residual risk, and next owner.
4. Keep the issue blocked if the integration rung cannot reach test execution.

## Acceptance Criteria

- `npm run test:api:local` either passes, or fails with exact evidence
  classified as environment blocker versus product defect.
- No protected smoke, deploy, push, restart, production mutation, credential
  disclosure, or production database access occurs.

## Evidence

| Check | Result |
| --- | --- |
| Initial `DATABASE_URL` presence | `DATABASE_URL_PRESENT=false`; no authorized disposable database URL was available in this heartbeat. |
| Initial Docker engine probe | Docker CLI was installed, Docker Desktop service was stopped, and `docker info` initially failed because Docker Desktop Linux engine pipe `//./pipe/dockerDesktopLinuxEngine` was missing. |
| Narrow unblock attempt | `Start-Service com.docker.service` failed, but launching `C:\Program Files\Docker\Docker\Docker Desktop.exe` brought Docker Desktop engine `28.3.2` online. |
| Target proof command | `npm run test:api:local` created disposable PostgreSQL `companycore_test`, built server/web, applied all `31` migrations, seeded data, and ran `node --test dist/tests/api.test.js`. |
| API test result | FAIL: `6` subtests passed and `1` failed. Failing subtest: `CompanyCore v1 protected API flow`. Error: `No OperatingArea found`. Compiled location: `dist/tests/api.test.js:459:25`; stack reached `dist/tests/api.test.js:2530:38`. |
| Cleanup | `companycore-test-postgres` was removed by the harness after the failed run. No `chrome-headless-shell` process was present. Docker Desktop remains running because it was started during this proof and the follow-up backend issue needs the local engine for the same validation command. |
| Blocker resolution rerun | After [LUC-3716](/LUC/issues/LUC-3716) resolved, `npm run test:api:local` passed. The harness created disposable PostgreSQL `companycore_test`, built server/web, applied all `31` migrations, seeded data, and ran `node --test dist/tests/api.test.js`. |
| Final API test result | PASS: `7` subtests passed, `0` failed, `0` cancelled, `0` skipped. `CompanyCore v1 protected API flow` passed. |
| Final cleanup | `companycore-test-postgres` was removed by the harness after the passing run. No `chrome-headless-shell` process was present. Docker Desktop remains running because unrelated Soar containers are active and must not be stopped by this Roost QA lane. |

## Classification

Selected slice status is now `verified`.

- Static route/capability proof remains inherited from LUC-3545:
  `npm run check:route-capabilities` passed.
- Build proof remains inherited from LUC-3545: `npm run build` passed.
- Integration proof reached the API test suite and passed after the
  [LUC-3716](/LUC/issues/LUC-3716) repair.
- The Process Core integration rung now has local disposable database proof
  through `npm run test:api:local`.

## Definition Of Done

- [x] Target command was attempted.
- [x] Failure was classified as product/test fixture behavior after the local
      database became available.
- [x] The blocker-resolution rerun passed after the backend repair.
- [x] No production data, protected smoke, deploy, push, restart, or secret
      access was used.
- [x] No validation-owned Docker container, server, browser, or database
      process was left running. Docker Desktop remains running because
      unrelated Soar containers are active and must not be stopped by this
      Roost QA lane.

## Result Report

LUC-3713 is complete. The blocker-resolution rerun passed:

```powershell
npm run test:api:local
```

Files changed: this evidence packet and source-of-truth state pointers only.
Result: build passed, all `31` migrations applied, seed completed, and
`node --test dist/tests/api.test.js` passed with `7/7` subtests. The selected
Process Core integration rung is verified.

Commit decision: not committed in this QA heartbeat because the workspace is
already a mixed shared packet owned by LUC-3703/LUC-3714 source-control
closure. Push status: not needed. Deploy impact: none.
