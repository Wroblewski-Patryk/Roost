# Coolify VPS Deployment Contract

CompanyCore v1 deploys as a single backend Docker Compose application on a
Coolify-compatible VPS. The same backend serves a minimal owner web console on
the web domain and the JSON API on the API domain. The deployment must preserve
PostgreSQL data.

## Deployment Target

- VPS provider: LuckySparrow-managed VPS.
- Platform: Coolify.
- Public domains:
  - Web UI: `companycore.luckysparrow.ch`
  - API: `api.companycore.luckysparrow.ch`
- Public service: `backend` on container port `3000`.
- Public web surface: minimal owner console served by `backend` at `/`.
- Private services: `postgres`.

## Runtime Inventory

- Main app services:
  - `backend`: Node.js/Express API plus minimal static owner console.
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
- Owner console: `GET https://companycore.luckysparrow.ch/`.
- API metadata: `GET https://api.companycore.luckysparrow.ch/`.
- Migration entrypoint:
  - Runtime startup runs `npm run prisma:migrate:deploy`.
  - Local development may use `npm run prisma:migrate:dev`.
  - `prisma db push` is not the production deploy path.
  - Existing production databases that predate Prisma migration history must
    be baselined once in `_prisma_migrations` only after table shape is
    verified against the baseline migration.

## Env And Secrets Contract

Current foundation secrets:

- `DATABASE_URL`
- `SERVICE_PASSWORD_POSTGRES`
- `SERVICE_PASSWORD_API_KEY` or `SEED_API_KEY`
- `AUTH_TOKEN_SECRET`
- `API_KEY_HASH_SECRET` is recommended for secret separation. If omitted,
  production falls back to `AUTH_TOKEN_SECRET` for backward compatibility with
  existing service API key hashes.
- `INTEGRATION_SECRET_KEY`
- `COMPANYCORE_ALLOWED_ORIGINS` as a comma-separated allowlist for browser
  CORS. Production defaults to
  `https://companycore.luckysparrow.ch,https://api.companycore.luckysparrow.ch`
  when the value is omitted.
- optional `PORT`

Production startup fails closed when `DATABASE_URL`, `AUTH_TOKEN_SECRET`, or
`INTEGRATION_SECRET_KEY` is missing, or when any configured secret or fallback
secret still uses the committed development placeholder pattern.

v1 service credentials:

- workspace-scoped service API keys for Paperclip, Jarvis, n8n, and other
  agents

ClickUp configuration:

- ClickUp tokens, list IDs, team IDs, and sync configuration should be stored
  as workspace-owned integration settings.
- Only app-level encryption or runtime secrets belong in Coolify env.
- ClickUp tokens must not be hardcoded, logged, or returned in API responses.
- For production bootstrap, use `npm run clickup:bootstrap` with temporary
  operator env values documented in
  `docs/operations/clickup-production-bootstrap.md`. Do not add
  `CLICKUP_API_TOKEN` as a permanent backend runtime env unless a scheduled
  sync worker is explicitly approved.

## Release Requirements

Required checks before deploy:

- `npm run build`
- migration review for schema changes
- migration validation against empty and existing database shapes when schema
  changes touch ownership, auth, API keys, integrations, tasks, or external ID
  uniqueness
- relevant endpoint/integration tests once CCV1-006 is implemented
- `git diff --check` before commit/release handoff

Required smoke checks after deploy:

- `GET https://api.companycore.luckysparrow.ch/health`
- `GET https://companycore.luckysparrow.ch/`
- `GET https://api.companycore.luckysparrow.ch/`
- owner registration/login or approved first-owner bootstrap
- protected workspace-scoped project/task call
- denied unauthenticated or cross-workspace request
- workspace ClickUp settings response with secrets redacted
- owner console guided ClickUp discovery and settings save
- native ClickUp sync
- event readback showing expected sync event

## Auto-Deploy Status

GitHub-to-Coolify auto-deploy is not required for v1 runtime readiness.

Current status as of 2026-05-24:

- Coolify services are healthy on the VPS.
- CompanyCore manual runtime rollover is proven and documented.
- The GitHub app previously saw the pre-rename repository with admin
  permissions; the current repository is `Wroblewski-Patryk/Roost`.
- The available GitHub connector tool surface does not expose repository
  webhook list/create/update/delete actions.
- The local `gh` CLI is not installed in the Codex workspace.
- A later planning note mentioned commit `63348d6` as an auto-deploy success,
  but no matching operations smoke record currently supersedes the repeated
  manual-rollover evidence.
- Public web and API health currently return `200`, but build metadata reports
  `commit: unknown` and `image: unknown`; this cannot prove that GitHub push
  `ece93b1` reached the running image automatically.
- ACF-OPS-002 restored source-level metadata wiring. The backend now derives
  health `build.commit` from `COMPANYCORE_BUILD_COMMIT`, Coolify
  `SOURCE_COMMIT`, or common Git commit env vars, and derives `build.image`
  from `COMPANYCORE_BUILD_IMAGE`, Coolify/container identifiers, or
  `HOSTNAME`. `docker-compose.coolify.yml` maps `SOURCE_COMMIT` and
  `COOLIFY_CONTAINER_NAME` into the backend metadata path.
- Coolify `Auto Deploy` is enabled for the `companycore` application.
- On 2026-05-19, the pre-rename Coolify source was aligned with the working
  LuckySparrow projects:
  - Git source: official Coolify GitHub App `vps-luckysparrow`.
  - Repository then: `Wroblewski-Patryk/companycore`.
  - Branch: `main`.
  - Commit selector: `HEAD`.
  - Deploy key removed from the application source so Coolify no longer treats
    the app as a deploy-key/SSH repository.
  - Coolify application metadata now records GitHub repository project id
    `1227435697`, which is required for official GitHub App push webhook
    routing.
- The Coolify webhooks screen now reports: official Git App is in use and
  manual webhooks are not required.
- `Include Source Commit in Build` is enabled in the application Advanced
  settings. This is required for the current compose/build metadata path to
  expose the deployed commit through `GET /health`.
- The 2026-05-17 manual redeploy for commit
  `82d45f9142d6be9d4d154b9db246f1a50d7e0d74` succeeded and public health then
  reported that exact commit.
- The 2026-05-19 Coolify redeploy after GitHub App source alignment succeeded
  with deployment id `mdpc5qc8p8olnerkovmz8k9n`. The Coolify configuration
  banner disappeared after redeploy, and both public health endpoints reported
  commit `1b9414e674e2dd76eca0fa6045ac4ce94d23259c`.
- GitHub-to-Coolify webhook delivery is configured through the official Coolify
  GitHub App and no paid GitHub feature is required. The next normal push to
  `main` should be used as the end-to-end proof that Coolify creates a
  `Webhook` deployment record for `companycore`.
- On 2026-05-24, the GitHub repository was renamed to
  `Wroblewski-Patryk/Roost`. Local `origin` now points to
  `https://github.com/Wroblewski-Patryk/Roost.git`. Coolify was checked under
  the `LuckySparrow` team, project `LuckySparrow`, production environment,
  application `Roost`; its Git Source now uses `Wroblewski-Patryk/Roost` on
  branch `main` with commit selector `HEAD`. No manual redeploy was triggered
  during the rename checkpoint.

Manual VPS/Coolify backend rollover remains the fallback release path. It must
preserve the PostgreSQL volume, record the previous and new build commits or the
absence of build metadata, verify public health, and retain or document a
rollback image/container.

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

Production baseline recovery:

- Prisma `P3005` means the database is not empty and migration history is
  missing; it is not a reason to delete the PostgreSQL volume.
- Verify existing tables first, then baseline only the migration that exactly
  matches the existing schema.
- After baseline, redeploy the latest commit and verify backend logs show
  migration success before running protected smoke.

First-owner bootstrap:

- Prefer `POST /auth/register` when public registration is temporarily allowed
  and immediately protect/disable that path if deployment policy requires it.
- Alternatively run `npm run seed` once with explicit production bootstrap
  secrets.
- After bootstrap, rotate temporary owner password/API key material if it was
  shared through deployment tooling.
- Do not rely on repeat production seed runs as an admin access mechanism.

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
