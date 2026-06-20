# LUC-4821 Assets Files/Folders Proof Ladder

## Header
- ID: LUC-4821
- Title: [Roost] [QA] Run Assets files/folders proof ladder
- Task Type: QA verification
- Current Stage: verification
- Status: DONE
- Owner: QA & Verification Engineer
- Priority: P1
- Mission ID: LUC-4821-ASSETS-FILES-FOLDERS-PROOF-LADDER
- Mission Status: VERIFIED_DONE
- Last updated: 2026-06-20

## Goal
Run the Assets proof ladder selected by [LUC-4813](/LUC/issues/LUC-4813) for
`08 Assets -> Files/Folders`, starting with local API proof and moving to
authenticated desktop/mobile UI proof only if the API rung is green.

## Scope
- Included:
  - `npm run test:api:local`.
  - Kept local validation database rerun for browser proof setup.
  - Authenticated local UI proof for `/areas?area=08-zasoby&view=files`.
  - Folder tree, file cards, type filters, preview panel, no-match recovery,
    synthetic packet error state, console/page errors, and horizontal overflow.
  - Cleanup proof for the validation server, browser, and Docker container.
- Excluded:
  - Runtime code changes.
  - Schema or migration changes.
  - Protected production smoke.
  - Production mutation, real Drive mutation, credential access, secret
    disclosure, deploy, push, or restart.

## Implementation Plan
1. Run `npm run test:api:local`.
2. If green, rerun with `COMPANYCORE_TEST_DB_KEEP=1` to keep the disposable
   validation database for UI proof.
3. Start a temporary local server against `companycore_test`.
4. Seed local-only Assets fixtures into the disposable validation database.
5. Authenticate as the local test owner and run Playwright desktop/mobile proof.
6. Record evidence and cleanup all validation-owned resources.

## Acceptance Criteria
- API proof pass/fail is recorded with exact command output summary.
- UI proof runs only after API is green.
- Folder tree, file cards, type filters, preview panel, empty/error recovery,
  console/page errors, and horizontal overflow are verified.
- Any started server, browser, Docker container, or watcher is cleaned up.
- Source-of-truth files record verified status and residual risk.

## Verification Evidence

| Rung | Result | Evidence |
| --- | --- | --- |
| API proof | PASS | `npm run test:api:local` built server/web, applied all `31` migrations to disposable `companycore_test`, seeded, and passed `7/7` API subtests. |
| Kept-db setup | PASS | `COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` repeated the same green API proof and left `companycore-test-postgres` available for browser proof. |
| Local server | PASS | Temporary server on `http://127.0.0.1:3235` returned `/health` status `ok`; PID `5636` was owned by this QA run. |
| UI packet data | PASS | Local-only fixture packet returned `total=13`, `folders=4`, `nonFolders=9`, and types `folder`, `document`, `csv`, `markdown`, `architecture_doc`, and `knowledge_note`. |
| Desktop UI | PASS | Playwright Chromium desktop `1366x900` verified Files/Folders heading, folder tree, root and child folders, file cards, Files kind filter, Markdown type filter, Markdown preview text, no-match empty recovery, no console issues, no page errors, no failed requests, and no horizontal overflow (`scrollWidth=1366`, `clientWidth=1366`). Screenshot: `docs/ux/evidence/luc-4821-assets-proof-ladder-2026-06-20/assets-files-desktop.png`. |
| Mobile UI | PASS | Playwright Chromium mobile `390x844` verified the same route elements and interactions with no console issues, no page errors, no failed requests, and no horizontal overflow (`scrollWidth=390`, `clientWidth=390`). Screenshot: `docs/ux/evidence/luc-4821-assets-proof-ladder-2026-06-20/assets-files-mobile.png`. |
| Error state | PASS | Playwright intercepted `/v1/assets/context` with synthetic HTTP 500 and verified the route rendered an error state without leaking the synthetic raw provider message. Screenshot: `docs/ux/evidence/luc-4821-assets-proof-ladder-2026-06-20/assets-files-error-state.png`. |
| Proof summary artifact | PASS | Machine-readable summary: `docs/ux/evidence/luc-4821-assets-proof-ladder-2026-06-20/proof-summary.json`. |

## Cleanup Evidence
- Temporary backend on port `3235` stopped.
- `companycore-test-postgres` validation container removed after proof.
- No `chrome-headless-shell` process rows remained after cleanup.
- Docker Desktop was not stopped because unrelated `soar-postgres-1` and
  `soar-redis-1` containers were active before this run.

## Result Report
[LUC-4821](/LUC/issues/LUC-4821) is complete for the local Assets files/folders
proof ladder. The API and authenticated UI rungs are verified locally with no
reproducible failing rung, so no focused repair issue was opened.

Residual risk: production proof with the real imported Drive dataset remains
outside this issue and still requires the established release/credential
approval path before any protected production Drive smoke or write action.
