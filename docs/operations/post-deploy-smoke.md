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
