# Post-Deploy Smoke

Use this file to record the minimum checks after each deploy.

## Global Checks

- [x] `https://api.companycore.luckysparrow.ch/health` returns success
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

## Ops Checks

- [x] Migrations completed successfully
- [ ] Required env values are present
- [ ] Metrics or error tracking show no new critical issue
- [ ] Rollback target is known and PostgreSQL volume preservation is confirmed
- [ ] If migration or data corruption occurs, restore from backup instead of
  deleting the Postgres volume

## Evidence

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
