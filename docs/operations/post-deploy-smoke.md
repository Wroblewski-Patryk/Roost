# Post-Deploy Smoke

Use this file to record the minimum checks after each deploy.

## Global Checks

- [ ] `https://api.companycore.luckysparrow.ch/health` returns success
- [ ] `https://companycore.luckysparrow.ch` reaches the configured project
  surface or intentional backend/API response
- [ ] `https://api.companycore.luckysparrow.ch` reaches the backend API
- [ ] Logs show no startup crash loop
- [ ] No unexpected worker checks are required because v1 has no workers

## User Journey Checks

- [ ] Owner registration/login or approved first-owner bootstrap works
- [ ] Protected project/task API call works with owner token or workspace API
  key
- [ ] Missing auth is denied
- [ ] ClickUp integration settings can be read without returning token material
- [ ] Native ClickUp sync creates or updates at least one task when credentials
  and list IDs are configured
- [ ] `GET /events` includes `task_synced_from_clickup` and sync status events

## Ops Checks

- [ ] Migrations completed successfully
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
