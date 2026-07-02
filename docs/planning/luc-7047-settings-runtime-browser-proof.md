# LUC-7047 Settings Runtime Browser Proof

Date: 2026-07-02
Issue: [LUC-7047](/LUC/issues/LUC-7047)
Parent: [LUC-5556](/LUC/issues/LUC-5556)
Stage: verification

## Task Contract

- Goal: execute the [LUC-5556](/LUC/issues/LUC-5556) User configuration settings proof ladder in a Docker-enabled local runtime.
- Task Type: QA verification.
- Current Stage: verification.
- Deliverable For This Stage: API prerequisite proof, signed-in settings browser proof, defect routing, cleanup, and source-control disposition.

## Scope

- API prerequisite: `npm run test:api:local` against disposable PostgreSQL.
- Browser routes: `/account/settings` and `/workspace/settings`.
- Evidence:
  - `docs/ux/evidence/luc-7047-settings-runtime-browser-proof/report.json`
  - `docs/ux/evidence/luc-7047-settings-runtime-browser-proof-configured/report.json`
- Follow-up defect: [LUC-7062](/LUC/issues/LUC-7062)

## Validation Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Docker availability | PASS | `docker version --format '{{.Server.Version}}'` returned `28.3.2`. |
| API prerequisite | PASS | `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-7047-postgres COMPANYCORE_TEST_DB_PORT=55557 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 COMPANYCORE_TEST_DB_KEEP=1 npm run test:api:local` built server/web, applied `31` migrations, seeded, and passed `8/8` API subtests. |
| Local runtime | PASS | `node dist/server.js` on `http://127.0.0.1:3242`; `/health` returned `200` with service `companycore`. |
| Fresh-workspace browser proof | FAILED | Report generated `2026-07-02T19:14:42.167Z`; `/workspace/settings` rendered but `/v1/integration-settings/clickup` and `/v1/integration-settings/google_drive` returned `404 integration_not_configured`, causing browser console failed-resource errors. |
| Configured-state browser proof | PASS | Report generated `2026-07-02T19:16:41.457Z`; desktop/tablet/mobile `/account/settings` and `/workspace/settings` had `consoleIssues=[]`, `pageErrors=[]`, `failedRequiredRequests=[]`, no horizontal overflow, and no raw local proof token/secret leakage. |

## Defect

Fresh owner workspaces with no integration rows do not satisfy the expected
unconfigured settings state. The current backend route returns `404
integration_not_configured`, and the frontend treats that as provider error
recovery instead of rendering ClickUp and Google Drive as unconfigured/secret
missing without console errors.

[LUC-7062](/LUC/issues/LUC-7062) was created for the Frontend Web Engineer to
repair the unconfigured provider status behavior, with backend route evidence
included.

## Cleanup

- Stopped timed-out generic owner-console smoke runners and their
  `chrome-headless-shell` children.
- Final custom Playwright proof closed its browser.
- Local server on port `3242` was stopped after validation.
- Disposable PostgreSQL container `companycore-luc-7047-postgres` was removed.
- No validation-owned `chrome-headless-shell` or `chromium` processes remained.

## Source-Control Disposition

- Files changed: this proof packet, two UX evidence folders, and project state
  files.
- Product code changed: none.
- Commit: not created because the shared worktree already had unrelated dirty
  generated/status/state files and this heartbeat produced QA evidence plus a
  repair child rather than a completed product fix.
- Push: not needed.
- Deploy impact: none.
- Protected action: no push, deploy, protected smoke, production mutation,
  credential value read, live provider action, or secret disclosure occurred.

## Result Report

Status: `partially verified, repair routed`.

The [LUC-5556](/LUC/issues/LUC-5556) settings proof ladder blocker is no longer
Docker availability. The API prerequisite passes in a real disposable local DB,
and configured settings render cleanly in browser proof. A real fresh-workspace
defect remains and is routed to [LUC-7062](/LUC/issues/LUC-7062).
