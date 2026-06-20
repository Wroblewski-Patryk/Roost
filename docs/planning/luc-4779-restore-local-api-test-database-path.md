# LUC-4779 Restore Local API Test Database Path

## Header
- ID: LUC-4779
- Title: [Roost] [DRE] Restore local API test database path for Operations proof ladder
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: Ops/Release
- Priority: P1
- Mission ID: LUC-4779-RESTORE-LOCAL-API-TEST-DB-PATH
- Mission Status: VERIFIED
- Last updated: 2026-06-20

## Goal
Restore the local `npm run test:api:local` database path so the Operations
proof ladder can run against a disposable PostgreSQL database instead of
stopping at an offline Docker Desktop engine.

## Scope
- Included:
  - `scripts/test-api-local.mjs`
  - `docs/engineering/testing.md`
  - Roost source-of-truth state and evidence files
- Excluded:
  - Product route behavior changes
  - Prisma schema or migration changes
  - Protected smoke, deploy, push, restart, production mutation, credential
    access, secret disclosure, browser proof, or production database access

## Implementation Plan
1. Reproduce the local database blocker from the Operations proof ladder.
2. Keep the existing destructive database guardrails intact.
3. Restore the Windows local path by launching Docker Desktop when the CLI is
   installed but the engine is offline, then wait for Docker readiness.
4. Harden container creation against Docker Desktop warm-up races.
5. Run the smallest proof ladder needed: server build and local API test.
6. Record cleanup/process evidence and update project memory.

## Evidence

| Check | Result |
| --- | --- |
| Initial Docker probe | FAIL: `docker info --format '{{.ServerVersion}}'` could not connect to `//./pipe/dockerDesktopLinuxEngine`. |
| Server build rung | PASS: `npm run build:server`. |
| First patched rerun | FAIL: Docker Desktop path with spaces was launched through the shell and split at `C:\Program`; runner was corrected to launch detached executable paths without the shell. |
| Second patched rerun | FAIL/advanced: Docker Desktop came online, but `docker run` hit transient `_ping` `500 Internal Server Error` while the engine was warming up; runner was corrected to retry container creation. |
| Docker readiness after fix | PASS: `docker info --format '{{.ServerVersion}}'` returned `28.3.2`. |
| Final local API proof | PASS: `npm run test:api:local` built server and web, applied all `31` migrations to disposable `companycore_test` on `127.0.0.1:55432`, seeded, and ran `node --test dist/tests/api.test.js`. |
| API test result | PASS: `7` subtests passed, `0` failed, `0` cancelled, `0` skipped. |
| Cleanup | PASS: `docker ps -a --filter name=^/companycore-test-postgres$` returned no rows after the run. |
| Browser cleanup | PASS: `Get-Process chrome-headless-shell` returned no process rows. |
| Docker Desktop disposition | Left running intentionally: Docker Desktop was started by this heartbeat, but active unrelated containers `soar-postgres-1` and `soar-redis-1` were present, so stopping Docker Desktop would have affected another project. |

## Implementation Notes
- The runner still refuses destructive tests unless the database is local and
  named `companycore_test` or an explicit override is set.
- `COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0` disables automatic Docker
  Desktop launch.
- `COMPANYCORE_DOCKER_DESKTOP_PATH` can override the default Windows Docker
  Desktop executable path.
- Container creation now retries during Docker Desktop startup, then reports
  the last Docker error if creation still fails.

## Acceptance Criteria
- [x] `npm run build:server` passes.
- [x] `npm run test:api:local` reaches the disposable PostgreSQL database and
      passes.
- [x] The validation-owned `companycore-test-postgres` container is removed.
- [x] No product behavior, schema, production, deploy, protected smoke, or
      secret path is changed.
- [x] Documentation and source-of-truth state are updated.

## Definition of Done
- [x] Code builds without errors.
- [x] The CLI/operator path works through the real `npm run test:api:local`
      command.
- [x] No mock, placeholder, fake, or temporary path was added.
- [x] Existing destructive database guardrails remain in place.
- [x] Behavior is reproducible from the evidence above.
- [x] Cleanup/process evidence is recorded.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Result Report
LUC-4779 is complete. The local API test database path is restored for the
Operations proof ladder. The runner can now recover from an offline Windows
Docker Desktop engine, wait through startup, create the disposable PostgreSQL
container, apply migrations, seed, run API tests, and remove the Roost test
container afterward.

Files changed:
- `scripts/test-api-local.mjs`
- `docs/engineering/testing.md`
- source-of-truth state and planning files for this evidence packet

Validation:
- `node --check scripts/test-api-local.mjs`: PASS
- `npm run build:server`: PASS
- `npm run test:api:local`: PASS (`31` migrations, `7/7` API subtests)

Next step:
- QA/Test can rerun the Operations proof ladder from LUC-4777 and proceed to
  authenticated UI proof for `/areas?area=04-operacje&view=overview` if the
  API rung remains green.
