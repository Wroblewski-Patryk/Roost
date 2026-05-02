# Coolify VPS Deployment Contract

CompanyCore v1 deploys as a backend-only Docker Compose application on a
Coolify-compatible VPS. The deployment must preserve PostgreSQL data and expose
only the backend API publicly.

## Deployment Target

- VPS provider: LuckySparrow-managed VPS.
- Platform: Coolify.
- Public domains:
  - `companycore.luckysparrow.ch`
  - `api.companycore.luckysparrow.ch`
- Public service: `backend` on container port `3000`.
- Private services: `postgres`.

## Runtime Inventory

- Main app services:
  - `backend`: Node.js/Express API.
  - `postgres`: PostgreSQL database.
- Worker or cron services: none in v1.
- Databases: PostgreSQL 16.
- Cache or queue: none in v1.
- Persistent volumes:
  - `companycore_postgres` mounted at `/var/lib/postgresql/data`.

## Required Artifacts

- Dockerfile path: `Dockerfile`.
- Local Compose path: `docker-compose.yml`.
- Coolify Compose path: `docker-compose.coolify.yml`.
- Env example file: `.env.example`.
- Health/readiness endpoint: `GET /health`.
- Migration entrypoint:
  - Runtime startup runs `npm run prisma:migrate:deploy`.
  - Local development may use `npm run prisma:migrate:dev`.
  - `prisma db push` is not the production deploy path.

## Env And Secrets Contract

Current foundation secrets:

- `DATABASE_URL`
- `SERVICE_PASSWORD_POSTGRES`
- `SERVICE_PASSWORD_API_KEY` or `SEED_API_KEY`
- `AUTH_TOKEN_SECRET`
- `INTEGRATION_SECRET_KEY`
- optional `PORT`

v1 service credentials:

- workspace-scoped service API keys for Paperclip, Jarvis, n8n, and other
  agents

ClickUp configuration:

- ClickUp tokens, list IDs, team IDs, and sync configuration should be stored
  as workspace-owned integration settings.
- Only app-level encryption or runtime secrets belong in Coolify env.
- ClickUp tokens must not be hardcoded, logged, or returned in API responses.

## Release Requirements

Required checks before deploy:

- `npm run build`
- migration review for schema changes
- relevant endpoint/integration tests once CCV1-006 is implemented
- `git diff --check` before commit/release handoff

Required smoke checks after deploy:

- `GET https://api.companycore.luckysparrow.ch/health`
- owner registration/login or approved first-owner bootstrap
- protected workspace-scoped project/task call
- denied unauthenticated or cross-workspace request
- workspace ClickUp settings response with secrets redacted
- native ClickUp sync
- event readback showing expected sync event

Rollback trigger:

- failed health check
- failed owner/auth bootstrap
- failed migration that risks data ownership
- failed protected API path
- failed ClickUp sync that corrupts or duplicates data

Rollback method:

- redeploy previous image/commit
- preserve the PostgreSQL volume
- restore database from backup if migration or data corruption occurred
- record the incident and add a regression check before retrying

## Data Safety

- Backup strategy: take Postgres volume/database backups before risky
  production migrations.
- Restore verification expectation: periodically verify backup restore path
  before relying on production data.
- Risky migration policy: any migration that changes ownership, auth, API key,
  integration settings, or external ID uniqueness must include rollback or
  recovery notes.

## Observability And Logs

Minimum v1 logs/signals:

- backend startup and migration failures
- auth failures without logging credentials
- workspace scoping failures without leaking record details
- integration settings changes without logging secret values
- ClickUp sync start, success, failure, and item counts
- event creation failures

Provider tokens, API keys, passwords, and raw secret material must never be
logged.
