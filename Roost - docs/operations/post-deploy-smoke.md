# Post-Deploy Smoke

Use this file to record the minimum checks after each deploy.

## Production Operations List Board Rollover

- Timestamp: 2026-05-16
- Environment: production VPS Docker backend
- Commit: `849b74c06f8f04364b2a08662a66e45c45ffafcf`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:849b74c06f8f04364b2a08662a66e45c45ffafcf`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-849b74c`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-d673837`, retained stopped as
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-d673837-previous-849b74c`.
- Local/source checks:
  - `npm run validate`: passed.
  - `npm run test:api` passed against validation-owned PostgreSQL on
    `127.0.0.1:55511`.
  - Playwright fallback on temporary mocked API port `3244`: passed for
    desktop/mobile Operations board and modal save interaction.
  - `git diff --check`: passed with line-ending warnings only.
- Rollover checks:
  - Docker image build from the pushed commit archive for `849b74c` passed.
  - Canary container returned local `/health` with the expected commit before
    traffic rollover.
  - Final routed container returned local `/health` with the expected commit.
  - Production Postgres container stayed running.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `status=ok`
    with the expected build commit and image.
  - `GET https://companycore.luckysparrow.ch/health` returned `status=ok`
    with the same build commit and image.
  - `GET /areas?area=04-operacje&view=tasks` returned the React shell HTML and
    served `/react/assets/index-SR5I21Wt.js`.
- Cleanup:
  - Temporary local archive and rollout script were removed.
  - Temporary VPS archive, extracted source directory, and rollout script were
    removed from `/tmp`.
- Residual risks:
  - No production smoke defect was found.
  - Full authenticated production data proof remains a future owner-session
    smoke because the public smoke cannot inspect private task content.

## Production Web Shell And Operations Tasks Rollover

- Timestamp: 2026-05-16
- Environment: production VPS Docker backend
- Commit: `02f86b613b5d69d282f554cf465e5688b251a5c0`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:02f86b613b5d69d282f554cf465e5688b251a5c0`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-02f86b6`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-203839472398`, retained stopped as
  `backend-rnqqkhl3o3dut4qv56mlxly2-203839472398-previous-02f86b6`.
- Local/source checks:
  - `npm run build:web`: passed.
  - `npm run build:server`: passed.
  - `npm run validate`: passed.
  - Playwright fallback on temporary mocked API port `3139`: passed.
  - `git diff --check`: passed with line-ending warnings only.
- Rollover checks:
  - Docker image build from the pushed commit archive for `02f86b6` passed.
  - Canary container returned local `/health` with the expected commit before
    traffic rollover.
  - Final routed container returned local `/health` with the expected commit.
  - Production Postgres container stayed running.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `status=ok`
    with the expected build commit and image.
  - `GET https://companycore.luckysparrow.ch/health` returned `status=ok`
    with the same build commit and image.
  - `GET https://companycore.luckysparrow.ch/` served
    `/react/assets/index-RfhYEq4o.js` and
    `/react/assets/index-D362Tku6.css`.
  - `GET /account/settings`, `GET /workspace/settings`, and
    `GET /areas?area=04-operacje&view=tasks` returned the React shell HTML.
- Cleanup:
  - Temporary local archive and rollout script were removed.
  - Temporary VPS archive, extracted source directory, and rollout script were
    removed from `/tmp`.
- Residual risks:
  - No production smoke defect was found.
  - Account/workspace settings are intentionally read-only in this slice;
    settings write contracts and API key management remain future work.

## Production Strategy Context Rollover

- Timestamp: 2026-05-16
- Environment: production VPS Docker backend
- Commit: `5db4dd8b1fe9058d1fc78ebc957c0716ebd4822a`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:5db4dd8b1fe9058d1fc78ebc957c0716ebd4822a`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5db4dd8`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9ff1882`, retained stopped as
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9ff1882-previous-5db4dd8`.
- Local/source checks:
  - DMS-01-005A `npm run build:server`: passed.
  - DMS-01-005A `npm run test:api`: passed against validation-owned
    PostgreSQL on `127.0.0.1:55496`.
  - DMS-01-005A `git diff --check`: passed.
- Rollover checks:
  - Docker image build from the pushed commit archive for `5db4dd8` passed.
  - Canary container returned local `/health` with the expected commit before
    traffic rollover.
  - Final routed container returned local `/health` with the expected commit.
  - Production Postgres container stayed running.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `status=ok`
    with the expected build commit and image.
  - `GET https://companycore.luckysparrow.ch/health` returned `status=ok`
    with the same build commit and image.
- Protected smoke:
  - Owner login succeeded without recording token material.
  - `GET /v1/strategy/context` returned `200` with
    `department.canonicalKey=01-strategia`,
    `department.backendAreaKey=strategy-governance`,
    `summary.activeMetrics=1`, `summary.activeRisks=1`,
    `agentPacket.mode=read_only`, and `blockedActions=4`.
- Cleanup:
  - Temporary local archive was removed.
  - Temporary VPS archive, source directory, env file, and labels were removed
    from `/tmp`.
- Residual risks:
  - No production smoke defect was found.
  - Production currently has no goals, targets, decision logs, or active
    decisions in the Strategy packet; data import/curation remains a future
    department content task.
  - Future strategy writes remain gated by explicit command contracts.

## Production V1OPS Operations Context Rollover

- Timestamp: 2026-05-16
- Environment: production VPS Docker backend
- Commit: `9ff18820cb00bb2164904b947c2ef2a48e5d3b14`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:9ff18820cb00bb2164904b947c2ef2a48e5d3b14`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9ff1882`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71`, retained stopped as
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71-previous-9ff1882`.
- Local/source checks:
  - V1OPS-004 `npm run build:server`: passed.
  - V1OPS-004 `npm run test:api`: passed against validation-owned PostgreSQL
    on `127.0.0.1:55495`.
  - V1OPS-004 `git diff --check`: passed.
- Rollover checks:
  - Docker image build from the pushed commit archive for `9ff1882` passed.
  - Canary container returned local `/health` with the expected commit before
    traffic rollover.
  - Final routed container returned local `/health` with the expected commit.
  - Production Postgres container stayed running.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `status=ok`
    with the expected build commit and image.
  - `GET https://companycore.luckysparrow.ch/health` returned `status=ok`
    with the same build commit and image.
- Protected smoke:
  - Owner login succeeded without recording token material.
  - `GET /v1/operations/context` returned `200` with
    `department.canonicalKey=04-operacje`,
    `department.backendAreaKey=operations-administration`,
    `summary.procedures=7`, `agentPacket.mode=read_only`, and
    `blockedActions=4`.
- Cleanup:
  - Temporary local archive and rollout script were removed.
  - Temporary VPS archive and rollout script were removed from `/tmp`.
- Residual risks:
  - No production smoke defect was found.
  - Future operations writes remain gated by explicit command contracts.

## Production V1 Company OS Area Foundation Rollover

- Timestamp: 2026-05-16
- Environment: production VPS Docker backend
- Commit: `5f1fc71e44d09cb1780d29b2579c85023205efb9`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:5f1fc71e44d09cb1780d29b2579c85023205efb9`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-d2c9b94`, retained stopped as
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-d2c9b94-previous-5f1fc71`.
- Local/source checks:
  - `npm run build`: passed.
  - `git diff --check`: passed before rollout.
- Rollover checks:
  - Docker image build from the local `git archive` for `5f1fc71` passed.
  - Canary container returned local `/health` with the expected commit before
    traffic rollover.
  - Final routed container returned local and public `/health` with the
    expected commit.
  - Production Postgres container stayed running and healthy.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    the expected build commit and image.
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with the
    same build commit and image.
- Protected smoke:
  - Owner login succeeded without recording secrets.
  - `GET /v1/operating-graph/areas/01-strategia` returned `200` with
    `areaKey=strategy-governance`, `27` nodes, and `32` edges.
  - Authenticated desktop and mobile proof covered `/operations`,
    `/tasks-adapter`, `/data`, `/areas?area=04-operacje&view=overview`,
    `/settings/drive`, and `/react-company-os?area=04-operacje`.
  - `/react-company-os` switched to `06` and verified
    `People/Agents And Role Management System`.
  - Playwright reported no console/page errors, no failed non-font requests,
    and no horizontal overflow.
- Evidence:
  - `docs/ux/evidence/production-v1-5f1fc71-2026-05-16/`
  - `docs/ux/evidence/production-v1-5f1fc71-2026-05-16/production-v1-route-report.json`
- Cleanup:
  - Temporary VPS archive, source directory, env file, labels, and rollout
    script were removed from `/tmp`.
  - Temporary local archive and rollout script were removed.
  - No `chrome-headless-shell` or `chromium` validation processes remained.
- Residual risks:
  - No production smoke defect was found. Future department writes remain gated
    by explicit command contracts.

## Production Google Drive Changes Baseline Rollover

- Timestamp: 2026-05-16
- Environment: production VPS Docker backend
- Commit: `d2c9b9460a5db63703ca28f98988a2fa35d3a651`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:d2c9b9460a5db63703ca28f98988a2fa35d3a651`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-d2c9b94`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-000111041002`, retained stopped as
  `backend-rnqqkhl3o3dut4qv56mlxly2-000111041002-previous-d2c9b94`.
- Data safety:
  - Production Postgres container stayed running.
  - Canary startup reported no pending migrations and seed completed.
  - Final backend startup reported no pending migrations and seed completed.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `d2c9b9460a5db63703ca28f98988a2fa35d3a651`.
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with the
    same build commit and image.
- Protected smoke:
  - Before first reconcile, the Google Drive setting had no
    `changesPageToken`.
  - First `POST /v1/integration-settings/google_drive/changes/reconcile`
    returned `200`, `baselineInitialized=true`, `processedCount=0`, and stored
    `newStartPageToken=25137`.
  - Second reconcile returned `200` through the stored-token path.
  - `/v1/google-drive/files` stayed clean with `754` records, `0` unassigned,
    `0` pending, `0` failed, and `0` trashed.
- Cleanup:
  - Temporary VPS source archive, source directory, rollout script, label file,
    and env file were removed from `/tmp`. The temporary env file contained
    runtime secrets and was deleted after smoke.
- Residual risks:
  - None for Google Drive changes baseline.

## Production Paperclip CompanyCore Bridge Proof

- Timestamp: 2026-05-16
- Paperclip public health:
  - `GET https://paperclip.luckysparrow.ch/api/health` returned `200`.
- Runtime configuration proof:
  - Paperclip `company_core_settings` stores the CompanyCore base URL plus
    configured knowledge and tools keys.
  - The current Paperclip app container does not rely on `COMPANYCORE_*` env
    fallback for this bridge.
- CompanyCore calls from the Paperclip runtime:
  - knowledge key: `/v1/connection` returned `200`.
  - knowledge key: `/v1/mcp/manifest` returned `200`.
  - knowledge key: `/v1/google-drive/files` returned `200`.
  - tools key: `/v1/connection` returned `200`.
  - tools key: `/v1/google-drive/files` returned `200`.
- Tool assignment proof:
  - Paperclip has 1282 CompanyCore tool assignments across 36 agents,
    including 12 distinct Google Drive tools.
- Result:
  - Global Paperclip-to-CompanyCore bridge rotation is not required.
  - If a named Paperclip agent or UI screen still misses files, inspect that
    agent's assigned tools or route filters.

## Global Checks

- [x] `https://api.companycore.luckysparrow.ch/health` returns success
- [x] `https://api.companycore.luckysparrow.ch/health` reports the expected
  deployed build commit when `COMPANYCORE_BUILD_COMMIT` or a supported Coolify
  commit env var is available
- [ ] `https://companycore.luckysparrow.ch` reaches the configured project
  surface or intentional backend/API response
- [x] `https://api.companycore.luckysparrow.ch` reaches the backend API
- [x] Logs show no startup crash loop
- [x] No unexpected worker checks are required because v1 has no workers

## User Journey Checks

- [ ] Owner registration/login or approved first-owner bootstrap works
- [ ] Protected project/task API call works with owner token or workspace API
  key
- [x] Missing auth is denied
- [ ] ClickUp integration settings can be read without returning token material
- [ ] Native ClickUp sync creates or updates at least one task when credentials
  and list IDs are configured
- [ ] `GET /events` includes `task_synced_from_clickup` and sync status events
- [x] `npm run google-drive:smoke` passes with a real workspace API key
- [x] Google Drive settings can be read without returning OAuth material
- [x] Google Drive file list route returns imported files/snapshots for the
  workspace

## Ops Checks

- [x] Migrations completed successfully
- [ ] Required env values are present
- [ ] Metrics or error tracking show no new critical issue
- [ ] Rollback target is known and PostgreSQL volume preservation is confirmed
- [ ] If migration or data corruption occurs, restore from backup instead of
  deleting the Postgres volume

## Evidence

- Timestamp: 2026-05-15 23:10 +02:00
- Environment: production VPS Docker backend
- Purpose: V1 area operating-room layer depth.
- Deployment:
  - Manual VPS backend rollover to commit
    `95927f61724444fdb7555f538624762eb13f5794`.
  - Runtime image: `rnqqkhl3o3dut4qv56mlxly2_backend:95927f6`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-95927f6`.
  - Previous backend container retained stopped as rollback:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-1dafe91-previous-95927f6`.
- Local/source checks:
  - `npm run build:web`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed for the area operating-room slice.
  - Commit pushed to `origin/codex/companycore-local-port-3102`.
- Rollover checks:
  - Docker image build from the local `git archive` for `95927f6` passed.
  - Canary container started from the new image and returned local `/health`
    with the expected build commit before traffic rollover.
  - Final routed container returned local `/health` with the expected build
    commit.
- Public smoke:
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with
    build commit `95927f61724444fdb7555f538624762eb13f5794`.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    the same build commit.
- Authenticated production screenshot proof:
  - Captured desktop and mobile screenshots for
    `/areas?area=01-strategia&view=overview`,
    `/areas?area=01-strategia&view=goals`,
    `/areas?area=01-strategia&view=workflows`, and
    `/areas?area=01-strategia&view=knowledge`.
  - Evidence directory:
    `docs/ux/evidence/production-area-operating-room-95927f6-2026-05-15/`.
  - Playwright proof reported no horizontal overflow, no console errors, no
    failed requests, and verified operating graph, layer context,
    tables/records, Drive knowledge tree, and backend table markers.
- Residual risk:
  - Goals/workflows/tasks records are only as complete as the existing backend
    table snapshots. A future backend/content slice should connect concrete
    goal-target-metric-workflow-task relationships instead of relying only on
    table and source grouping.

- Timestamp: 2026-05-15 22:30 +02:00
- Environment: production VPS Docker backend
- Purpose: V1PROD-003 authenticated V1 production parity and selected-area data
  match.
- Deployment:
  - Manual VPS backend rollover to commit
    `1dafe910ff612e027b686f09e2a488600f6e60d4`.
  - Runtime image: `rnqqkhl3o3dut4qv56mlxly2_backend:1dafe91`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-1dafe91`.
  - Previous backend container retained stopped as rollback:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-ff5e041-previous-1dafe91`.
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-152944834285` remained running.
- Local/source checks:
  - `npm run validate`: passed before commit.
  - `git diff --check`: passed before commit.
  - Commit pushed to `origin/codex/companycore-local-port-3102`.
- Rollover checks:
  - Docker image build from the local `git archive` for `1dafe91` passed.
  - Canary container started from the new image and returned local `/health`
    with the expected build commit before traffic rollover.
  - Final routed container returned local `/health` with the expected build
    commit.
- Public smoke:
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with
    build commit `1dafe910ff612e027b686f09e2a488600f6e60d4`.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    the same build commit.
- Authenticated production screenshot proof:
  - Captured desktop and mobile screenshots for `/dashboard`,
    `/areas?area=01-strategia&view=overview`, and
    `/areas?area=01-strategia&view=ai`.
  - Evidence directory:
    `docs/ux/evidence/production-auth-v1-1dafe91-2026-05-15/`.
  - Playwright proof reported no horizontal overflow, no console errors, and
    no failed requests.
  - `01 Strategia` no longer shows the empty unmatched backend-area state. It
    resolves backend context with `8 TABLES`, Drive evidence, and provider
    mappings.
- Residual risk:
  - Deeper per-capability create/edit/filter UX remains future work. This
    release verifies the authenticated V1 skeleton and selected-area backend
    context parity only.

- Timestamp: 2026-05-15 21:50 +02:00
- Environment: production VPS Docker backend
- Purpose: V1PROD-002 V1 canonical web skeleton deployment.
- Deployment:
  - Manual VPS backend rollover to commit
    `ff5e04192db93a53280fab58bcd8f47cba30f554`.
  - Runtime image: `rnqqkhl3o3dut4qv56mlxly2_backend:ff5e041`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-ff5e041`.
  - Previous backend container retained stopped as rollback:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-b716f02-previous-ff5e041`.
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-152944834285` remained running and
    healthy.
- Local/source checks:
  - `npm run validate`: passed before commit.
  - `git diff --check`: passed before commit.
  - `npm run test:api`: not run because local Docker commands timed out in
    this desktop session; this release changed the React web layer and UX
    documentation, not migrations or backend API contracts.
  - Commit pushed to `origin/codex/companycore-local-port-3102`.
- Rollover checks:
  - Docker image build from the local `git archive` for `ff5e041` passed.
  - Canary container started from the new image and returned local `/health`
    with the expected build commit before traffic rollover.
  - Final routed container returned local `/health` with the expected build
    commit before the previous backend was stopped and renamed as rollback.
- Public smoke:
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with
    build commit `ff5e04192db93a53280fab58bcd8f47cba30f554`.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    the same build commit.
  - `GET https://companycore.luckysparrow.ch/` returned `200` and now serves
    the V1 public home instead of redirecting to login.
  - `GET https://companycore.luckysparrow.ch/dashboard` returned the React
    shell for signed-out users, which redirects in-browser to `/auth/login`.
- Production screenshot proof:
  - Captured desktop and mobile screenshots for `/`, `/auth/login`,
    `/auth/register`, signed-out `/dashboard`, and signed-out
    `/areas?area=01-strategia&view=overview`.
  - Evidence directory:
    `docs/ux/evidence/production-v1-ff5e041-2026-05-15/`.
  - Public home, login, and registration rendered with no horizontal overflow,
    no console errors, and no failed requests.
  - Signed-out private routes redirected to `/auth/login` with no horizontal
    overflow and no console errors. Playwright recorded one aborted
    `Phosphor-Bold.woff2` request during the redirect, matching the earlier
    redirect-only behavior and not causing visible layout failure.
- Residual risk:
  - Authenticated production dashboard and selected-area visual parity still
    needs an owner-session screenshot pass. This deployment proves the
    skeleton, public entry, auth pages, build metadata, signed-out redirect
    behavior, and production route ownership.

- Timestamp: 2026-05-15 18:05 +02:00
- Environment: production VPS Docker backend
- Purpose: V1AUTH-001 owner auth redirect flow.
- Deployment:
  - Manual VPS backend rollover to commit `c62d662`.
  - Runtime image: `rnqqkhl3o3dut4qv56mlxly2_backend:c62d662`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-c62d662`.
  - Previous backend container retained stopped as rollback:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-e69919b-previous-c62d662`.
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-152944834285` remained running and
    healthy.
- Local/source checks:
  - `npm run validate`: passed.
  - `git diff --check`: passed before commit.
  - Local Playwright stale-token proof redirected `/dashboard` to
    `/auth/login`, preserved pending `/dashboard`, removed the invalid owner
    token, and did not render the dashboard load error.
  - Local Playwright post-login proof redirected pending `/` into the React
    shell after login.
- Public smoke:
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with
    build commit `c62d662`.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `c62d662`.
  - `GET https://companycore.luckysparrow.ch/` returned React shell assets
    `index-DCaIUVzr.js` and `index-B1Wcb5DB.css`.
  - Production Playwright verified missing-session `/` redirects to
    `/auth/login` with pending `/`.
  - Production Playwright verified stale-token `/dashboard` redirects to
    `/auth/login`, preserves pending `/dashboard`, clears the token, and does
    not render the dashboard load error.
- Deployment-path verdict:
  - Manual VPS rollover remains the accepted release path for runtime changes
    until GitHub-to-Coolify auto-deploy is proven with matching public build
    metadata.

- Timestamp: 2026-05-15 17:19 +02:00
- Environment: production VPS Docker backend
- Purpose: V1AREA-001 premium Company Atlas visual parity rollout.
- Deployment:
  - Manual VPS backend rollover to commit `1acb709592d9d6601c2d8278e26736dacf9e0692`.
  - Runtime image: `rnqqkhl3o3dut4qv56mlxly2_backend:1acb709`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-1acb709`.
  - Previous backend container retained stopped as rollback:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-79d8d0e-previous-1acb709`.
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-140735959479` remained running and
    healthy.
- Local/source checks:
  - `npm run validate`: passed before rollover.
  - `git diff --check`: passed before commit.
  - Docker image build from local `git archive`: passed and emitted
    `index-wbA5Pvhk.js` plus `index-B1Wcb5DB.css`.
- Public smoke:
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with
    build commit `1acb709`.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `1acb709`.
  - `GET https://companycore.luckysparrow.ch/dashboard` returned `200` and
    served `index-wbA5Pvhk.js` plus `index-B1Wcb5DB.css`.
- Deployment-path verdict:
  - GitHub push reached `origin/main`, but public health still reported
    `79d8d0e` before manual rollover. Manual VPS rollover remains the accepted
    release path until GitHub-to-Coolify auto-deploy is proven with matching
    public build metadata.

- Timestamp: 2026-05-15 16:23 +02:00
- Environment: production VPS Docker backend
- Purpose: V1AREA-001 production update after Coolify redeploy left the public
  runtime on the old image.
- Deployment:
  - Manual VPS backend rollover to commit `df99969`.
  - Runtime image: `rnqqkhl3o3dut4qv56mlxly2_backend:df99969`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-df99969`.
  - Previous backend container retained stopped as rollback:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-fb6aca9-previous-df99969`.
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-140735959479` remained running and
    healthy.
- Local/source checks:
  - `npm run validate`: passed before rollover.
  - `git diff --check`: passed before rollover.
  - Docker image build from local `git archive` for `df99969`: passed.
- Public smoke:
  - `GET https://companycore.luckysparrow.ch/health` returned `200` with
    build commit `df99969`.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `df99969`.
  - `GET https://companycore.luckysparrow.ch/dashboard` returned the React
    dashboard HTML with current assets `index-0as746Hb.js` and
    `index-Dafh8u4t.css`.
- Deployment-path verdict:
  - GitHub push reached `origin/main`, but Coolify redeploy did not update the
    running image. Manual VPS rollover remains the accepted release path until
    GitHub-to-Coolify auto-deploy is proven with matching public build
    metadata.
- Cleanup:
  - Temporary VPS archive, source directory, env file, label file, container id
    file, health file, and rollout/build scripts were removed from `/tmp`.
  - Temporary local source archive and scripts were removed.

- Timestamp: 2026-05-15
- Environment: production VPS Docker backend
- Purpose: JARVIS-GDRIVE-001 OAuth reconnect repair deploy.
- Deployment:
  - Manual VPS backend rollover to commit `fb6aca9`.
  - Runtime image: `rnqqkhl3o3dut4qv56mlxly2_backend:fb6aca9`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-fb6aca9`.
  - Previous backend container was retained stopped as rollback.
  - Production Postgres container remained running and healthy.
- Local/source checks:
  - `npm run build`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed.
  - `npm run test:api`: not rerun locally because Docker/PostgreSQL access
    hung in this desktop session; regression coverage was added in
    `src/tests/api.test.ts`.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `fb6aca9`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`
    with build commit `fb6aca9`.
  - `GET https://companycore.luckysparrow.ch/settings/drive` returned `200`.
- Protected CompanyCore/Jarvis smoke:
  - The current Jarvis container `COMPANYCORE_API_KEY` did not match an active
    CompanyCore hash after deployment, so its hash was registered in
    CompanyCore without printing or storing the raw key in docs.
  - `npm run google-drive:smoke` passed using the current Jarvis container key:
    `googleDriveConfigured=true`, `googleDriveActive=true`,
    `importedFileCount=748`.
  - Required Doc and Sheet creation through CompanyCore using the Jarvis key
    returned `401 integration_invalid_token` for both files, confirming the
    remaining blocker is Google OAuth re-consent.
- Residual risk:
  - Owner must complete Google Drive OAuth re-consent from `/settings/drive`
    before Jarvis can create/read the required Docs and Sheets.

- Timestamp: 2026-05-15
- Environment: production VPS Docker backend
- Purpose: JARVIS-GDRIVE-001 Jarvis CompanyCore Google Drive Docs/Sheets write
  path.
- Deployment:
  - Manual VPS backend rollover to commit `669c1c8`.
  - New runtime image: `rnqqkhl3o3dut4qv56mlxly2_backend:669c1c8`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-669c1c8`.
  - Previous backend container was stopped after the new container reported
    local health with build commit `669c1c8`.
  - Production Postgres container remained running and healthy.
- Local/source checks:
  - `npm run build`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed.
  - `npm run test:api`: blocked before tests because this desktop session had
    no `DATABASE_URL`; Docker validation attempt timed out before a disposable
    database could be started.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `669c1c8`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`
    with build commit `669c1c8`.
- Protected CompanyCore smoke:
  - `npm run google-drive:smoke` from the deployed backend container passed
    with `googleDriveConfigured=true`, `googleDriveActive=true`, and
    `importedFileCount=748`.
  - A protected content refresh against an existing imported Google Sheet
    returned `401 integration_invalid_token`; this confirms the previous raw
    Docs 500 is now fail-closed but the stored Google OAuth secret is not
    usable with the current integration secret.
  - A recovery probe checked Coolify application environment records for
    `INTEGRATION_SECRET_KEY` candidates. Only the current candidate was
    available, and it does not decrypt the existing Google Drive or ClickUp
    integration ciphertext. Temporary probe scripts were removed from the VPS
    and Coolify container.
- OpenJarvis checks:
  - Local targeted OpenJarvis tests passed:
    `tests/tools/test_companycore_tool.py::test_companycore_google_doc_create_uses_real_drive_route`,
    `tests/tools/test_companycore_tool.py::test_companycore_google_sheet_create_can_target_drive_folder`,
    `tests/connectors/test_companycore.py`, and
    `tests/server/test_companycore_context.py`.
  - Production Jarvis container image is
    `ilkb..._jarvis:3d86f9d61c0fb10879f8dd3c99ae5a08b100405e`.
  - Production Jarvis has `COMPANYCORE_BASE_URL`,
    `COMPANYCORE_API_KEY`, and `COMPANYCORE_ADAPTER_SOURCE`; the visible
    non-secret values are
    `COMPANYCORE_BASE_URL=https://api.companycore.luckysparrow.ch` and
    `COMPANYCORE_ADAPTER_SOURCE=jarvis`.
  - Jarvis agent smoke used CompanyCore only and confirmed the target folder is
    visible through CompanyCore:
    `12. Zarzadzanie`, externalId
    `1U1GMpy0erVETPDA9ciRb7l1gVbSJfaff`.
  - The same Jarvis smoke attempted the required Google Doc and Google Sheet
    creations and both returned `401 integration_invalid_token`; no files were
    created, so readback could not run.
- Residual risk:
  - Jarvis two-file smoke must not be treated as ready to pass until the
    Google Drive OAuth secret is repaired by restoring the matching
    `INTEGRATION_SECRET_KEY` or completing owner OAuth re-consent from
    `/settings/drive`.

- Timestamp: 2026-05-15
- Environment: production public domains
- Purpose: ACF-OPS-001 auto-deploy proof or manual path acceptance refresh.
- Current local source:
  - Latest pushed commit checked locally: `ece93b1`.
- Public checks:
  - `GET https://companycore.luckysparrow.ch/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.
  - Both health responses reported `build.commit="unknown"` and
    `build.image="unknown"`.
- Deployment-path verdict:
  - GitHub-to-Coolify auto-deploy remains unverified because the public runtime
    does not expose commit/image metadata that can be compared with the latest
    pushed commit.
  - Manual VPS/Coolify backend rollover remains the accepted release path until
    either build metadata is restored or a future push-to-running-image smoke
    records unambiguous Coolify deployment evidence.
- Residual risks:
  - A healthy public response proves the service is up, but not that it is
    running the latest pushed commit. Operators must not claim automatic deploy
    success from `/health` while build metadata is unknown.

- Timestamp: 2026-05-14
- Environment: production VPS Docker backend
- Purpose: AGRUN-007 Google Drive owner consent/import release gate.
- Deployment:
  - Manual VPS backend rollover to commit
    `c5878d95a47f17745f65689c08e9e317a6465777`.
  - Previous runtime image:
    `rnqqkhl3o3dut4qv56mlxly2_backend:b7b39e50210d6a65371c737ae52fb5b8cf30e2c3`.
  - New runtime image:
    `rnqqkhl3o3dut4qv56mlxly2_backend:c5878d95a47f17745f65689c08e9e317a6465777`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-c5878d9`.
  - Rollback container retained stopped:
    `backend-rnqqkhl3o3dut4qv56mlxly2-025605103087-previous-c5878d9`.
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-025605098067` remained running and
    healthy.
- Data safety:
  - Canary startup applied seven pending Company OS migrations:
    `202605091_company_os_stage1_foundation`,
    `202605092_company_os_stage2_runtime_evidence`,
    `202605093_company_os_stage3_governance_intelligence`,
    `202605141_company_os_standard_definition_status`,
    `202605142_workflow_definition_drafts`,
    `202605143_workflow_root_version_uniqueness`, and
    `202605144_workflow_root_family_lineage`.
  - Seed completed successfully.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `c5878d95a47f17745f65689c08e9e317a6465777`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`
    with the same build commit.
  - `GET https://companycore.luckysparrow.ch/settings/drive` returned `200`
    and served the Drive setup shell.
- Protected Google Drive smoke:
  - Existing Jarvis workspace service API key passed
    `npm run google-drive:smoke` from the deployed backend container.
  - Smoke returned `googleDriveConfigured=true`,
    `googleDriveActive=true`, and `importedFileCount=0`.
  - Owner-authenticated folder discovery returned 172 folders.
  - After owner clarification, selected numbered department root folders
    `00. Główny` through `12. Zarządzanie` and excluded the non-department
    `Gemini Gems` folder.
  - First import completed for the selected roots. Readback returned 748
    imported Drive items, including 171 folders.
  - Department scoping was applied root-by-root with child inheritance.
    Verification returned `unassignedCount=0` and `mismatches=[]`, proving
    imported descendants are not assigned to other departments.
- Cleanup:
  - Removed temporary VPS source archive, source directory, env file, label
    file, health file, and rollout/smoke scripts under `/tmp`.
- Residual risks:
  - Large Drive imports can exceed a synchronous request client timeout even
    when backend work succeeds; consider an async import job/progress UI if
    repeated large imports become a normal operator workflow.

- Timestamp: 2026-05-08
- Environment: production public domains
- Purpose: AGRUN-009 deploy automation reliability evidence reconciliation.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://companycore.luckysparrow.ch/` returned `200`.
  - `/health` reported build commit
    `71f3eb3b063ea68226a1736c727c52882b33f27a` and image
    `rnqqkhl3o3dut4qv56mlxly2_backend:71f3eb3b063ea68226a1736c727c52882b33f27a`.
- Deployment-path verdict:
  - Auto-deploy remains unverified as a reliable path because the available
    operations evidence repeatedly records manual VPS rollovers after GitHub
    pushes, and the historical `63348d6` planning note has no matching
    post-deploy smoke entry.
  - Manual VPS backend rollover remains the approved release path until a
    future push-to-running-image smoke proves otherwise.
- Residual risks:
  - VPS container inventory could not be refreshed in this local session
    because the available SSH key/password path was rejected. Public health
    still proves the current exposed runtime image.

- Timestamp: 2026-05-07
- Environment: production public domains
- Deployment:
  - Manual VPS backend rollover for V2WEB-025.
  - Previous runtime commit:
    `d5505799718faa62653482e0474ee5ab6fe345d1`.
  - New runtime commit:
    `0007f2387ec6f162a651121f61b66a9388f03edb`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-0007f23`.
  - Running backend image:
    `rnqqkhl3o3dut4qv56mlxly2_backend:0007f2387ec6f162a651121f61b66a9388f03edb`.
  - Production Postgres container remained healthy.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `0007f2387ec6f162a651121f61b66a9388f03edb`.
  - `GET https://companycore.luckysparrow.ch/data/notes` returned `200` and
    included the table workbench shell markers `tableWorkbenchTitle` and
    `recordInspector`.
- Residual risks:
  - Full protected production record inspection was not run because it requires
    an owner login session. Local authenticated Playwright smoke created a real
    note through the API and inspected it in `/data/notes` before deploy.

- Timestamp: 2026-05-07
- Environment: production public domains
- Deployment:
  - Manual VPS backend rollover for AGRUN-005.
  - Previous runtime commit:
    `1d9f5869bd0951693375a196a37689df64d33fcf`.
  - New runtime commit:
    `68ef5f99659ffd8cc1de88476aab97bcaa9bccbd`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-68ef5f9`.
  - Running backend image:
    `rnqqkhl3o3dut4qv56mlxly2_backend:68ef5f99659ffd8cc1de88476aab97bcaa9bccbd`.
  - Production Postgres container remained healthy.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `68ef5f99659ffd8cc1de88476aab97bcaa9bccbd`.
  - `GET https://companycore.luckysparrow.ch/settings/api` returned `200` and
    included the Agent service keys shell markers `Agent service keys` and
    `agentKeyForm`.
- Residual risks:
  - Full protected production key creation was not run to avoid creating real
    service credentials during public smoke. Local authenticated Playwright
    smoke covered create, copy-once display, and deactivate before deploy.

- Timestamp: 2026-05-07
- Environment: production public domains
- Deployment:
  - Manual VPS backend rollover for V2WEB-024.
  - Previous runtime commit:
    `b2b493b9eb3d6ed3c31e4a82e0b57f67f8de2565`.
  - New runtime commit:
    `bab9d589b7260f3e4a72a29b0f2bf907a94238ea`.
  - Running backend container:
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-bab9d58`.
  - Running backend image:
    `rnqqkhl3o3dut4qv56mlxly2_backend:bab9d589b7260f3e4a72a29b0f2bf907a94238ea`.
  - Production Postgres container remained healthy.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `bab9d589b7260f3e4a72a29b0f2bf907a94238ea`.
  - `GET https://companycore.luckysparrow.ch/data` returned `200` and included
    the Data Operations SPA shell markers `Database modules` and
    `dataModuleList`.
- Residual risks:
  - Full protected browser verification in production still depends on an owner
    login session. Local authenticated desktop/mobile Playwright smoke covered
    the `/data` interaction before deploy.

- Timestamp: 2026-05-02
- Environment: production public domains
- Domains checked:
  - `companycore.luckysparrow.ch`
  - `api.companycore.luckysparrow.ch`
- Commands run:
  - `GET https://api.companycore.luckysparrow.ch/health`
  - `GET https://api.companycore.luckysparrow.ch/v1/health`
  - `GET https://api.companycore.luckysparrow.ch/v1/projects` without auth
  - `GET https://api.companycore.luckysparrow.ch/projects` without auth
  - `GET https://companycore.luckysparrow.ch`
- Screenshots or logs:
  - `GET /health` returned `{ "status": "ok", "service": "companycore",
    "name": "LuckySparrow Company Core" }`.
  - `GET /v1/health` returned `401 Unauthorized`; this indicates production is
    not yet running the current v1 route build where `/v1/health` is public.
  - `GET /v1/projects` without auth returned `401 Unauthorized`, which is the
    expected negative path for protected API routes.
  - `GET /projects` without auth returned `401 Unauthorized`, which is the
    expected negative path for protected compatibility routes.
  - `GET companycore.luckysparrow.ch` returned `401 Unauthorized`; acceptable
    only if this domain intentionally points at the protected API surface.
- Residual risks:
  - Full CCV1-009 cannot be marked done until the latest commits are deployed
    and production credentials are available for protected owner/API-key,
    ClickUp settings, native sync, and event readback checks.

## Production Recovery Evidence

- Timestamp: 2026-05-02
- Environment: Coolify production, Root Team, `companycore (localhost)`
- Deployment:
  - Forced redeploy `r4hgrbmh5obfvz9v61mlbgyc`.
  - Coolify imported commit `3f64a72da107c112c4ced8f0ba7aa88602650c2a`.
  - Deployment finished and the application status changed to `Running`.
- Recovery action:
  - Production PostgreSQL already contained the foundation schema but lacked
    `_prisma_migrations`.
  - Added a one-time Prisma baseline row for
    `202605021_v1_foundation` with checksum
    `097fade7aa0850b167c9a76966742759deb85a5358e1ff11def2f5bd29b247c3`.
  - Preserved the existing PostgreSQL volume and did not delete business data.
- Logs:
  - Backend log after redeploy:
    - `7 migrations found in prisma/migrations`
    - `No pending migrations to apply.`
    - `npm run seed`
    - `companycore listening on port 3000`
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/projects` without auth
    returned `401`, which is the expected protected-route negative path.
- Residual risks:
  - Protected production smoke still needs an approved owner token or
    workspace API key plus configured ClickUp workspace settings.

## Workspace Scope Deployment Evidence

- Timestamp: 2026-05-02
- Environment: Coolify production, Root Team, `companycore (localhost)`
- Deployment:
  - Manual redeploy `zibcl0a0rih1vmhig3vkf4ce`.
  - Coolify imported commit `1d6f21abc8da90c83cdab32ea279ce3872d574b2`.
  - Deployment finished and the application status stayed `Running`.
- Logs:
  - Backend log after redeploy:
    - `8 migrations found in prisma/migrations`
    - `Applying migration 202605028_workspace_core_records`
    - `All migrations have been successfully applied.`
    - `npm run seed`
    - `companycore listening on port 3000`
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/projects` without auth
    returned `401`, which is the expected protected-route negative path.
- Auto-deploy note:
  - Coolify `Auto Deploy` is enabled.
  - No deployment was created automatically after pushing `1d6f21a`.
  - GitHub was not logged in in the browser, so repository webhook creation
    could not be completed from this session.

## Adapter Connection Deployment Evidence

- Timestamp: 2026-05-02
- Environment: Coolify production, Root Team, `companycore (localhost)`
- Deployment:
  - Manual redeploy `qn7wcxnony0jdm2o2q4ex7rc`.
  - Coolify imported commit `4a4554f`.
  - Manual redeploy for commit `c564d0a` finished successfully after the
    adapter manifest change.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/connection` without auth
    returned `401`, which is the expected protected-route negative path.
- Residual risks:
  - Full protected adapter handshake still needs a real production workspace
    service API key.

## Agents API Deployment Evidence

- Timestamp: 2026-05-02
- Environment: Coolify production, Root Team, `companycore (localhost)`
- Deployment:
  - Manual redeploy was queued by Coolify, then force-started from the
    CompanyCore deployment detail page.
  - Coolify imported commit `ebc660b3761464c4571cfba822d22c2a2923b5d8`.
  - Deployment finished, created new backend/postgres containers, and the app
    status stayed `Running`.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/agents` without auth
    returned `401`, which is the expected protected-route negative path.
  - `GET https://api.companycore.luckysparrow.ch/v1/connection` without auth
    returned `401`, which is the expected protected-route negative path.
- Residual risks:
  - Full protected agent creation and connection manifest smoke still needs a
    real production workspace service API key.

## Adapter CRUD Deployment Evidence

- Timestamp: 2026-05-03
- Environment: Coolify production, Root Team, `companycore (localhost)`
- Deployment:
  - Manual redeploy imported commit `decd899`.
  - Deployment was in progress at `2026-05-02 22:18:26 UTC` and public smoke
    passed after the rollout window.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/task-lists` without auth
    returned `401`, which is the expected protected-route negative path.
  - `GET https://api.companycore.luckysparrow.ch/v1/pipeline-stages` without
    auth returned `401`, which is the expected protected-route negative path.
  - `GET https://api.companycore.luckysparrow.ch/v1/interactions` without auth
    returned `401`, which is the expected protected-route negative path.
- Residual risks:
  - Full protected CRUD smoke still needs a real production workspace service
    API key. Use `npm run adapter:smoke` once that key exists.

## Protected Adapter Smoke Evidence

- Timestamp: 2026-05-03
- Environment: production API, workspace `LuckySparrow`
  (`00000000-0000-4000-8000-000000000100`)
- Credential path:
  - SSH access to the VPS was verified through `plink`.
  - A fresh hash-only service API key named
    `Paperclip/Jarvis production adapter` was created in the production
    database through the running backend container.
  - The raw key was used for smoke only and was not printed in docs.
  - Key prefix: `cc_v1_LxSo`
  - API key id: `d64ab750-b6e7-4806-96b3-8e64eadeb37d`
- Command run:
  - `npm run adapter:smoke` with
    `COMPANYCORE_BASE_URL=https://api.companycore.luckysparrow.ch`
- Result:
  - `/v1/connection` succeeded.
  - Created agent `7e651b64-5bc1-4013-8f4e-fa68ece8da29`.
  - Created task list `db2b6b31-bcda-44f0-8ee1-651785c2f7df`.
  - Created task `19b3f439-eb18-477b-821c-d0fb59162a0b`.
  - Created interaction `d1a38820-8961-44a3-81bb-f384b90f3144`.
  - Created agent log `5d9d5f26-4aae-4dbe-b2d2-02e8fa50722b`.
  - `/v1/events` contained the expected adapter event types.
- Residual risks:
  - The service key value is not recoverable from CompanyCore because raw keys
    are shown only once by design. To wire Paperclip/Jarvis directly, create a
    dedicated key per adapter through `/v1/api-keys` or create/store a fresh
    key directly in each adapter's secret environment.

## Paperclip And Jarvis Environment Wiring Evidence

- Timestamp: 2026-05-03
- Environment: production VPS Docker Compose apps
- Target containers:
  - `paperclip-prod-paperclip-1`
  - `openjarvis-prod-jarvis-1`
- Credential path:
  - Created separate hash-only service API keys in CompanyCore for:
    - `Paperclip production adapter`
    - `Jarvis production adapter`
  - Stored raw keys only in the target app `.env` files on the VPS.
  - Recreated both application containers with Docker Compose so new env values
    are visible at runtime.
- CompanyCore env visible in containers:
  - Paperclip:
    - `COMPANYCORE_BASE_URL=https://api.companycore.luckysparrow.ch`
    - `COMPANYCORE_ADAPTER_SOURCE=paperclip`
    - `COMPANYCORE_API_KEY` prefix `cc_v1_qUZK`
  - Jarvis:
    - `COMPANYCORE_BASE_URL=https://api.companycore.luckysparrow.ch`
    - `COMPANYCORE_ADAPTER_SOURCE=jarvis`
    - `COMPANYCORE_API_KEY` prefix `cc_v1_GaF4`
- Protected smoke:
  - Paperclip key passed `npm run adapter:smoke`.
  - Jarvis key passed `npm run adapter:smoke`.
- Residual risks:
  - Paperclip and Jarvis application code still needs to read these env vars
    and call CompanyCore through its adapter layer. Infrastructure wiring is
    complete.

## Local Docker Reproduction Evidence

- Timestamp: 2026-05-02
- Environment: local production-like Docker Compose
- Commands run:
  - `docker compose down -v`
  - `docker compose up --build -d`
  - `docker compose logs backend --tail=160`
  - `GET http://localhost:3000/health`
  - `GET http://localhost:3000/v1/health`
- Result:
  - Reproduced production startup failures before the hotfix:
    - seed could not import helpers from `src/` because runtime image only
      copied `dist` and `prisma`
    - Prisma Client was not generated in runtime because `node_modules` came
      from the dependency stage before `prisma generate`
  - After the hotfix, local Docker startup applied all migrations, ran seed,
    logged `companycore listening on port 3000`, and both `/health` and
    `/v1/health` returned `ok`.
- Residual risks:
  - Production still needs redeploy from the fixed commit and protected smoke
    with real owner/API-key and ClickUp workspace settings.

## Guided ClickUp Owner Console Deployment Evidence

- Timestamp: 2026-05-03
- Environment: Coolify production, Root Team, `companycore`
- Deployment:
  - Manual redeploy `i12v0znlzq4twrl509iuqwmo`.
  - Coolify imported commit `b46a96071f2c5a6b8c17bc725940ba60122f658f`.
  - Backend container image tag is
    `rnqqkhl3o3dut4qv56mlxly2_backend:b46a96071f2c5a6b8c17bc725940ba60122f658f`.
  - A temporary Coolify deploy API token was created for the redeploy and
    deleted after the API call.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/` returned `200` and served
    the `CompanyCore Integrations` / `ClickUp connection` owner console.
  - `GET https://api.companycore.luckysparrow.ch/app.js` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/styles.css` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/connection` without auth
    returned `401`, which is the expected protected-route negative path.
  - `POST https://api.companycore.luckysparrow.ch/auth/login` with the seeded
    owner account returned `200`.
- Residual risks:
  - A real ClickUp token was not available in this session, so the first
    provider discovery, Workspace/List selection, settings save, and native
    pull sync still need to be performed by the owner through the deployed
    console.
  - Continuous ClickUp updates are not enabled yet. CCV1-034 must decide
    scheduled pull sync versus webhook ingestion after the first production
    ClickUp pull succeeds.

## Web/API Domain Split Deployment Evidence

- Timestamp: 2026-05-03
- Environment: Coolify production, Root Team, `companycore`
- Deployment:
  - Manual redeploy `k13xfp6hyot611v1w9n3qlzi`.
  - Coolify imported commit `514d1913cc35c053d1ae9e5ce6f6541a09b7d366`.
- Public checks:
  - `GET https://companycore.luckysparrow.ch/` returned `200` and served the
    `CompanyCore Integrations` / `ClickUp connection` owner console.
  - `GET https://companycore.luckysparrow.ch/app.js` returned `200`.
  - The served `app.js` contains `API_ORIGIN` pointing browser API calls from
    the web domain to `https://api.companycore.luckysparrow.ch`.
  - `GET https://api.companycore.luckysparrow.ch/` returned `200` with API
    metadata JSON containing the web and API URLs.
  - `GET https://api.companycore.luckysparrow.ch/app.js` returned `401`, so
    API domain is no longer the public asset surface.
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.

## Owner Console View Split Deployment Evidence

- Timestamp: 2026-05-03
- Environment: Coolify production, Root Team, `companycore`
- Deployment:
  - Manual redeploy `dtsz5sbd091zpz7h5ax8czze`.
  - Coolify imported commit `e056ee0a6c90556d6e709153a6d99174437e38f1`.
- Public web checks:
  - `GET https://companycore.luckysparrow.ch/` returned `200`.
  - `GET https://companycore.luckysparrow.ch/auth/login` returned `200`.
  - `GET https://companycore.luckysparrow.ch/auth/register` returned `200`.
  - `GET https://companycore.luckysparrow.ch/dashboard` returned `200`.
  - `GET https://companycore.luckysparrow.ch/settings` returned `200`.
  - `GET https://companycore.luckysparrow.ch/settings/api` returned `200`.
  - `GET https://companycore.luckysparrow.ch/app.js` returned the view router
    with `/dashboard`, `/settings`, `/settings/api`, and `/auth/register`.
- API checks:
  - `GET https://api.companycore.luckysparrow.ch/` still returned API metadata.
  - `GET https://api.companycore.luckysparrow.ch/app.js` still returned `401`.
  - `POST https://api.companycore.luckysparrow.ch/auth/login` with the
    production owner account returned `200` for workspace `LuckySparrow`.

## ClickUp First-Run Import Policy Deployment Evidence

- Timestamp: 2026-05-03
- Environment: Coolify production, Root Team, `companycore`
- Deployment:
  - Pushed `main` through commit `0ed8c96896f7c2b754a24f35843a16e1737ba6e0`.
  - Auto-deploy did not immediately update the running image, so a temporary
    Coolify API token was created, manual deploy `gpos2n2ll9x301v6h3qlit8x`
    was queued, and the token was deleted after the deploy completed.
  - Coolify deployment status finished successfully.
  - Backend container image tag became
    `rnqqkhl3o3dut4qv56mlxly2_backend:0ed8c96896f7c2b754a24f35843a16e1737ba6e0`.
- Runtime logs:
  - `prisma migrate deploy` found 9 migrations and no pending migrations.
  - Seed completed and the backend logged `companycore listening on port 3000`.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/connection` without auth
    returned `401 missing_api_key`, which is the expected protected-route
    negative path.
  - `GET https://companycore.luckysparrow.ch/` returned the owner console with
    the new ClickUp `Import mode` selector and `Inspect only` option.
  - `GET https://companycore.luckysparrow.ch/app.js` returned the new sync
    response display fields including `wouldCreateCount`.
- Residual risks:
  - A real ClickUp token was not entered in this session, so provider
    discovery, selected List import, and Jarvis readback remain the next owner
    action.
  - Continuous ClickUp updates are still not enabled; the queued follow-up is
    the scheduled pull versus webhook ingestion decision after the first real
    production pull succeeds.

## ClickUp Live Sync Bridge Deployment Evidence

- Timestamp: 2026-05-03
- Environment: Coolify production, Root Team, `companycore`
- Commit: `75df028f9dc3cab59f026fd7d2c5fef430e6d5ea`
- Deployment:
  - Pushed `main` to GitHub.
  - Auto-deploy did not immediately replace the running image, so a temporary
    Coolify API token was created for manual deploy
    `e12x9rc7i8071qfnrzh6u1hh` and then deleted.
  - Coolify deployment status finished successfully.
  - Backend image became
    `rnqqkhl3o3dut4qv56mlxly2_backend:75df028f9dc3cab59f026fd7d2c5fef430e6d5ea`.
- Migration evidence:
  - Backend logs applied `202605032_clickup_webhook_foundation`.
  - `_prisma_migrations` shows
    `202605032_clickup_webhook_foundation` finished at
    `2026-05-03 03:08:02.719036+00`.
- Public checks:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.
  - Unsigned `POST /v1/webhooks/clickup` returned `401 missing_signature`.
- ClickUp webhook registration smoke:
  - Owner-authenticated `POST /v1/integration-settings/clickup/webhooks/reconcile`
    registered `21` active ClickUp List webhooks.
  - The registered endpoint URL is
    `https://api.companycore.luckysparrow.ch/v1/webhooks/clickup`.
  - Returned webhook secrets are encrypted in the database and were not copied
    into docs or logs.
- Signed webhook processing smoke:
  - A production signed webhook smoke used the stored encrypted webhook secret
    to sign a `taskStatusUpdated` payload for a real ClickUp task and sent it
    through the public endpoint.
  - `POST /v1/webhooks/clickup` returned `202 accepted`.
  - The provider inbox row has `processingStatus = processed`,
    `eventName = taskStatusUpdated`, and `signatureVerified = true`.
  - `agent_event_outbox` contains a pending
    `task_status_updated_from_clickup` event.
  - Jarvis's CompanyCore API key can read `/v1/agent-events` (`1` pending),
    `/v1/integration-settings/clickup/webhooks` (`21` registrations), and
    `/v1/tasks` (`224` tasks).
- Residual risk:
  - This smoke proves the deployed receiver, signature verification, inbox,
    ClickUp full-task fetch, task upsert path, and agent outbox. The first
    naturally provider-initiated ClickUp webhook should still be observed after
    the owner next changes a real task in ClickUp.

### Natural ClickUp Webhook Roundtrip Evidence

- Timestamp: 2026-05-03
- Method:
  - Selected real ClickUp task `86c5fqumu`
    (`Stworzyć repozytorium na githubie`) from the mapped
    `11. Innovations - Featherly` list.
  - Called CompanyCore `PATCH /v1/tasks/:id` to temporarily append a smoke
    marker to the title.
  - CompanyCore write-back updated the ClickUp task through ClickUp's API.
  - Waited for ClickUp to POST its natural webhook back to CompanyCore.
  - Called CompanyCore `PATCH /v1/tasks/:id` again to restore the original
    title.
- Result:
  - Final CompanyCore title is back to `Stworzyć repozytorium na githubie`.
  - Provider inbox received `2` natural ClickUp `taskUpdated` events for the
    task.
  - Both inbox rows have `processingStatus = processed` and
    `signatureVerified = true`.
- Conclusion:
  - The production bridge is confirmed in both directions:
    CompanyCore -> ClickUp write-back and ClickUp -> CompanyCore webhook
    ingestion.

## Jarvis Authenticated CompanyCore Smoke

- Timestamp: 2026-05-03
- Environment: production OpenJarvis at `https://jarvis.luckysparrow.ch`
- Deployment:
  - Rebuilt and restarted the `openjarvis-prod-jarvis-1` container after a
    CompanyCore context relevance update.
- Protected connector checks:
  - Bearer-authenticated `GET /v1/connectors/companycore` returned `200`.
  - Response reported `connected=true` and `auth_type=bridge`.
  - Bearer-authenticated `POST /v1/connectors/companycore/sync` returned
    `200` with `status=started`.
  - `GET /v1/connectors` reported the CompanyCore connector with indexed
    chunks.
- Chat smoke:
  - Bearer-authenticated `POST /v1/chat/completions` answered from CompanyCore
    records for the Paperclip onboarding project.
  - The answer included the CompanyCore project and the two durable project
    tasks after the relevance update.
- Precision follow-up:
  - Jarvis initially picked an adapter smoke agent for a broad Paperclip
    prompt. The CompanyCore context injector now excludes smoke/test records
    from normal business prompts unless the user explicitly asks for smoke or
    test records.
  - After redeploy, the same chat smoke included project
    `Paperclip AI onboarding to CompanyCore`, tasks
    `Reuse the same CompanyCore adapter path in Paperclip` and
    `Teach Jarvis to summarize CompanyCore records`, and agent
    `Jarvis production chat adapter`.

## CompanyCore Clean Sync Data Hygiene

- Timestamp: 2026-05-03
- Backup:
  - CompanyCore Postgres dump:
    `/home/codex/backups/companycore-cleanup-20260503/companycore-before-cleanup.sql`
  - Jarvis knowledge SQLite copy:
    `/home/codex/backups/companycore-cleanup-20260503/jarvis-knowledge-before-cleanup.db`
  - Jarvis sync-state SQLite copy:
    `/home/codex/backups/companycore-cleanup-20260503/jarvis-sync-state-before-cleanup.db`
- Audit finding:
  - CompanyCore had 219 ClickUp tasks and 0 duplicate ClickUp task
    `external_id` values.
  - Repeated ClickUp maintenance pulls had created redundant
    `task_synced_from_clickup` audit events.
  - Jarvis had indexed CompanyCore events as ordinary knowledge chunks, which
    made the knowledge database look noisy even though task records were not
    duplicated.
- Runtime fix:
  - CompanyCore ClickUp sync now skips unchanged task pulls and does not emit a
    new `task_synced_from_clickup` event for unchanged records.
  - OpenJarvis CompanyCore connector now indexes CompanyCore events only when
    `COMPANYCORE_SYNC_EVENTS` is explicitly enabled.
- Cleanup result:
  - Smoke/test records were removed from CompanyCore production data.
  - Redundant ClickUp task sync events were pruned, preserving one latest sync
    event per ClickUp task.
  - Jarvis CompanyCore knowledge chunks were cleared and rebuilt from clean
    business records.
- Verification:
  - CompanyCore retained 219 ClickUp tasks and 0 duplicate ClickUp task
    external IDs.
  - CompanyCore retained 219 `task_synced_from_clickup` events after pruning.
  - A production maintenance run with `merge` returned 219 items, 0 created,
    0 updated, and 219 skipped.
  - The same maintenance run did not increase `task_synced_from_clickup`
    events.
  - Jarvis rebuilt the CompanyCore connector index to 259 chunks with event
    indexing disabled by default.

## V1 Launch Boundary

- Timestamp: 2026-05-03
- Environment: production CompanyCore, OpenJarvis, and Paperclip
- Verdict:
  - The approved CompanyCore v1 runtime slice is achieved.
  - CompanyCore is the workspace-scoped source of truth for the imported
    ClickUp task set.
  - ClickUp updates are handled by signed webhooks plus non-destructive
    scheduled maintenance.
  - CompanyCore writes supported task and note changes back to ClickUp.
  - Jarvis reads CompanyCore through the authenticated CompanyCore connector
    with smoke/test records excluded from normal business prompts.
  - Paperclip consumes CompanyCore agent events and acknowledges processed
    events.
- Boundary:
  - GitHub-to-Coolify auto-deploy is a release automation follow-up, not a v1
    runtime blocker.
  - OpenJarvis and Paperclip source handoff is tracked separately from
    CompanyCore runtime readiness.

## Final V1 Runtime Rollover

- Timestamp: 2026-05-03
- Environment: production VPS Docker backend
- Commit: `9116026c5584414acaee4d44764bc83a1f62d8cb`
- Image: `rnqqkhl3o3dut4qv56mlxly2_backend:9116026`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9116026`
- Previous backend stopped:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-ae2c3bf`
- Data safety:
  - Production Postgres container remained running and healthy.
  - No pending migrations were reported.
  - Seed completed successfully.
  - ClickUp maintenance scheduler enabled every 15 minutes.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://companycore.luckysparrow.ch/` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/` returned `200` with
    CompanyCore v1 API metadata.
  - Unauthenticated `GET /v1/connection` returned `401`.
- Protected smoke:
  - Jarvis service-key `GET /v1/connection` returned `200`.
  - ClickUp maintenance with `importMode=inspect_only` returned 219 items,
    0 created, 0 updated, 0 deleted, 219 skipped, and 0 failed retries.

## Full V1 Live System Smoke

- Timestamp: 2026-05-03
- Environment: production CompanyCore, OpenJarvis, Paperclip, and ClickUp
- CompanyCore:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://companycore.luckysparrow.ch/` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/` returned `200`.
  - Protected `GET /v1/connection` returned `200`.
- ClickUp:
  - Maintenance `importMode=inspect_only` returned 219 items, 0 created,
    0 updated, 0 deleted, 219 skipped, and 0 failed retries.
- Jarvis:
  - `GET https://jarvis.luckysparrow.ch/health` returned `200`.
  - Authenticated `GET /v1/connectors/companycore` returned `200`.
  - The CompanyCore connector reported `connected=true` and
    `auth_type=bridge`.
  - Authenticated `POST /v1/connectors/companycore/sync` returned `200` with
    `status=started`.
  - Authenticated connector list reported CompanyCore with 259 chunks.
- Paperclip:
  - `GET https://paperclip.luckysparrow.ch/api/health` returned `200`.
  - CompanyCore `GET /v1/agent-events?targetAgent=paperclip` returned `200`
    with 0 total and 0 pending Paperclip events.
- Guardrail captured:
  - `.codex/context/LEARNING_JOURNAL.md` now records that remote smoke scripts
    touching secrets must avoid PowerShell here-string piping into bash and use
    ASCII temporary scripts or proven single remote commands instead.

## V1 Post-Release Artifact Cleanup

- Timestamp: 2026-05-03
- Environment: production VPS
- Cleanup:
  - Removed `/tmp/companycore-9116026`.
  - Removed `/tmp/companycore-9116026.tar`.
  - Confirmed temporary Jarvis smoke files are absent from `/tmp`.
- Runtime preserved:
  - Running backend remains
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9116026`.
  - Running backend image remains
    `rnqqkhl3o3dut4qv56mlxly2_backend:9116026`.
  - Production Postgres remains running and healthy.
- Rollback preserved:
  - Previous runtime image
    `rnqqkhl3o3dut4qv56mlxly2_backend:ae2c3bf` remains available for rollback.

## Google Drive V2 Production Rollover Smoke

- Timestamp: 2026-05-03
- Environment: production VPS Docker backend
- Commit: `a52afef4492445c87d1313324dcee8bbe82f3323`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:a52afef4492445c87d1313324dcee8bbe82f3323`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-a52afef`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-171327323464`, which was running
  `6731b82cd40866f3a06dc7b719cd7d13c269d5d5`
- Data safety:
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-171327317813` remained running and
    healthy.
  - `prisma migrate deploy` reported 13 migrations and no pending migrations.
  - Seed completed successfully.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `a52afef4492445c87d1313324dcee8bbe82f3323`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`
    with the same build commit.
  - `GET https://companycore.luckysparrow.ch/` returned `200` and served the
    owner console.
  - `GET https://api.companycore.luckysparrow.ch/` returned `200` with API
    metadata.
- Protected smoke:
  - Jarvis workspace service API key `GET /v1/connection` returned workspace
    `LuckySparrow`, `authType=api_key`, `googleDriveConfigured=false`,
    `googleDriveActive=false`, and 47 capabilities.
  - `npm run google-drive:smoke` logic passed from the production source
    bundle with `googleDriveConfigured=false`, `googleDriveActive=false`, and
    `importedFileCount=0`.
  - Unauthenticated `GET /v1/google-drive/files` remains denied.
- Residual risks:
  - Google Drive itself is ready for credential entry, but no Drive files are
    expected until OAuth/configuration is completed and an import is run.

## Web Console Operating Map Production Smoke

- Timestamp: 2026-05-03
- Environment: production VPS Docker backend
- Commit: `6b4d57a6e98159e64d9f065427e7201238b47ab5`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:6b4d57a6e98159e64d9f065427e7201238b47ab5`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-6b4d57a`
- Data safety:
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-171327317813` remained running and
    healthy.
  - `prisma migrate deploy` reported 13 migrations and no pending migrations.
  - Seed completed successfully.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `6b4d57a6e98159e64d9f065427e7201238b47ab5`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`
    with the same build commit.
  - `GET https://companycore.luckysparrow.ch/` returned `200`.
  - `GET https://companycore.luckysparrow.ch/settings/drive` returned `200`
    and served the owner web console shell.
- Protected smoke:
  - Existing workspace service API key `GET /v1/connection` returned workspace
    `LuckySparrow`, 12 operating areas, and 47 capabilities.
  - Existing workspace service API key `GET /v1/google-drive/files` returned
    0 files, which is expected before Google Drive OAuth/configuration.
- Residual risks:
  - Full browser owner workflow on production still depends on owner login and
    entering real Google Drive OAuth credentials.

## Agent CRUD API Production Smoke

- Timestamp: 2026-05-06
- Environment: production VPS Docker backend
- Commit: `bf59b2f80d9a837e05694cbb3f6417b8a7bf83c2`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:bf59b2f80d9a837e05694cbb3f6417b8a7bf83c2`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-bf59b2f`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-004822203171`, which was running
  `rnqqkhl3o3dut4qv56mlxly2_backend:44324845137a7343b31adc7995e2fd8e01938143`.
- Data safety:
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-004822197627` remained running and
    healthy.
  - `prisma migrate deploy` applied
    `202605061_agent_crud_archive_status` and
    `202605062_operating_area_system_guardrails`.
  - Seed completed successfully.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `bf59b2f80d9a837e05694cbb3f6417b8a7bf83c2`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`
    with the same build commit.
  - `GET https://api.companycore.luckysparrow.ch/` returned API metadata.
  - `GET https://companycore.luckysparrow.ch/` returned the owner console.
  - `GET https://companycore.luckysparrow.ch/settings/drive` returned the
    owner console shell.
- Protected smoke:
  - Jarvis workspace service API key `GET /v1/connection` returned workspace
    `LuckySparrow`, 51 capabilities, `agent-events:read`, and
    `agent-events:ack`.
  - The adapter manifest included the deployed agent CRUD routes, including
    `/v1/notes/:id`, `/v1/operating-model/areas/:id`, and
    `/v1/agent-events/:id/ack`.
  - Created and deleted a user-created operating area with reassignment to
    `main-general`.
  - Created, read, updated, and archived a deployment-smoke note.
  - `GET /v1/agent-events?targetAgent=paperclip` returned `200` with an
    empty Paperclip event queue.
- Cleanup:
  - Removed temporary VPS release and smoke scripts under `/tmp`.
  - The previous backend container was retained stopped as
    `backend-rnqqkhl3o3dut4qv56mlxly2-004822203171-previous-bf59b2f` for
    rollback reference.

## Agent Runtime Hardening Production Smoke

- Timestamp: 2026-05-06
- Environment: production VPS Docker backend
- Commit: `8b604d8e56f24c24f5f095815f8d52c6a84887dd`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:8b604d8e56f24c24f5f095815f8d52c6a84887dd`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-8b604d8`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-2f3139b`, retained stopped as
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-2f3139b-previous-8b604d8`.
- Data safety:
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-004822197627` remained running and
    healthy.
  - `prisma migrate deploy` reported no pending migrations.
  - Seed completed successfully.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `8b604d8e56f24c24f5f095815f8d52c6a84887dd`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`.
  - `GET https://api.companycore.luckysparrow.ch/` returned API metadata.
  - `GET https://companycore.luckysparrow.ch/` returned the owner console.
- Protected agent smoke:
  - Jarvis production CompanyCore key passed `npm run agent:training-smoke`
    from the production backend image.
  - Paperclip production CompanyCore key passed `npm run agent:training-smoke`
    from the production backend image.
  - Both Jarvis and Paperclip `/v1/connection` responses reported
    `scopeMode = broad`, 51 effective capabilities, manifest
    `schemaVersion = 2026-05-06`, and note create schema metadata.
  - A temporary scoped service key with `connection:read` and `notes:read`
    could read notes, while `POST /v1/notes` returned `403`.
  - A controlled Paperclip-targeted agent event
    `48783287-2dff-4c01-ab14-2bb497500667` was visible through
    `GET /v1/agent-events?targetAgent=paperclip`, acknowledged through
    `POST /v1/agent-events/:id/ack`, and no longer appeared as pending.
- Cleanup:
  - Temporary scoped key was deleted.
  - Temporary VPS release and smoke scripts under `/tmp` were removed.

## Google Drive Hierarchy Preview Production Smoke

- Timestamp: 2026-05-07
- Environment: production VPS Docker backend
- Commit: `7f0e09078f6b9f54db641328ea3d75830c2d2b3d`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:7f0e09078f6b9f54db641328ea3d75830c2d2b3d`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-7f0e090`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-8b604d8`, retained stopped as
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-8b604d8-previous-7f0e090`.
- Data safety:
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-004822197627` remained running and
    healthy.
  - Canary startup applied migration `202605071_drive_descriptions`.
  - Final backend startup reported no pending migrations and seed completed.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `7f0e09078f6b9f54db641328ea3d75830c2d2b3d`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`
    with the same build commit.
  - `GET https://api.companycore.luckysparrow.ch/` returned `200`.
  - `GET https://companycore.luckysparrow.ch/settings/drive` returned `200`
    and served the owner console shell containing the Google Drive surface.
  - Unauthenticated `GET /v1/google-drive/files` returned `401`.
- Protected smoke:
  - Jarvis production CompanyCore key passed `npm run google-drive:smoke`
    from the deployed backend container.
  - The smoke verified Google Drive capabilities including
    `google-drive:files:write`, `GET /v1/google-drive/files`, and current
    Drive state: `googleDriveConfigured=false`, `googleDriveActive=false`,
    `importedFileCount=0`.
- Cleanup:
  - Removed temporary VPS source archive, source directory, env file, label
    file, and rollout/smoke scripts under `/tmp`.
- Residual risks:
  - Real Drive folders/files will appear only after owner OAuth consent and
    first import. That remains tracked as AGRUN-007.

## Owner Console Snapshot Routing Hotfix Production Smoke

- Timestamp: 2026-05-14
- Environment: production VPS Docker backend
- Commit: `a7557120b8ea4630a0b32097e66ba0d4bb012b1b`
- Image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:a7557120b8ea4630a0b32097e66ba0d4bb012b1b`
- Running container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-a755712`
- Replaced container:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-c5878d9`, retained stopped as
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-c5878d9-previous-a755712`.
- Data safety:
  - Production Postgres container
    `postgres-rnqqkhl3o3dut4qv56mlxly2-025605098067` remained running and
    healthy.
  - Canary startup reported no pending migrations and seed completed.
  - Final backend startup reported no pending migrations and seed completed.
- Public smoke:
  - `GET https://api.companycore.luckysparrow.ch/health` returned `200` with
    build commit `a7557120b8ea4630a0b32097e66ba0d4bb012b1b`.
  - `GET https://api.companycore.luckysparrow.ch/v1/health` returned `200`
    with the same build commit.
  - `GET https://companycore.luckysparrow.ch/settings/drive` returned `200`.
- Owner UI proof:
  - Playwright signed-in checks for `/dashboard`, `/data`, `/relationships`,
    `/settings/drive`, `/settings/api`, and `/areas` reported no failed
    requests and no console warnings or errors.
  - `/settings/drive` rendered `13 selected folders`, `748 imported items`,
    and `0 folders need review`.
  - `/areas` rendered `DRIVE ITEMS`, `748/748 assigned`, and
    `0 imported Drive items still need an operating area`.
- Cleanup:
  - Temporary VPS source archive, source directory, env file, and label file
    were removed by the rollout script.
  - Temporary local rollout archive and script were removed.
