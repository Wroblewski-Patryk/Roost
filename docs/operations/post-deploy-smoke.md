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

- Timestamp:
- Environment:
- Domains checked:
  - `companycore.luckysparrow.ch`
  - `api.companycore.luckysparrow.ch`
- Commands run:
- Screenshots or logs:
- Residual risks:
