# Coolify VPS Deployment Contract

Roost (the CompanyCore runtime) deploys as a single backend Docker Compose application on a
Coolify-compatible VPS. The same backend serves a minimal owner web console on
the web domain and the JSON API on the API domain. The deployment must preserve
PostgreSQL data.

## Deployment Target

- VPS provider: Example Company-managed VPS.
- Platform: Coolify.
- Public domains:
  - Web UI: `roost.example.com`
  - API: `api.roost.example.com`
- Public service: `backend` on container port `3000`.
- Public web surface: React owner console served by `backend` from the generated
  `public/react/` bundle; legacy vanilla owner-console routes are not active.
- Private services: `postgres`.

## Runtime Inventory

- Main app services:
  - `backend`: Node.js/Express API plus the backend-served React owner console.
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
- Owner console: `GET https://roost.example.com/`.
- API metadata: `GET https://api.roost.example.com/`.
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
- `AUTH_TOKEN_SECRET`
- `API_KEY_HASH_SECRET` is recommended for secret separation. If omitted,
  production falls back to `AUTH_TOKEN_SECRET` for backward compatibility with
  existing service API key hashes.
- `INTEGRATION_SECRET_KEY`
- `COMPANYCORE_PUBLIC_WEB_BASE_URL`: public web origin for this installation
- `COMPANYCORE_PUBLIC_API_BASE_URL`: optional separate API origin
- `COMPANYCORE_ALLOWED_ORIGINS`: optional explicit CORS allowlist, otherwise
  derived from configured public origins
- `COMPANYCORE_API_HOSTS`: optional API-only hostnames, otherwise derived only
  when separate web/API origins are configured
- optional `PORT`

Production startup fails closed when `DATABASE_URL`, `AUTH_TOKEN_SECRET`, or
`INTEGRATION_SECRET_KEY` is missing, or when any configured secret or fallback
secret still uses the committed development placeholder pattern.

v1 service credentials:

- workspace-scoped service API keys for Codex Agent Host, Jarvis, n8n, and other
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

- `GET https://api.roost.example.com/health`
- `GET https://roost.example.com/`
- `GET https://api.roost.example.com/`
- CORS preflight from `https://roost.example.com` to
  `https://api.roost.example.com`
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
  permissions; the current repository is `example-org/Roost`.
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
  Example Company projects:
  - Git source: official Coolify GitHub App `vps-example-company`.
  - Repository then: `example-org/companycore`.
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
  `example-org/Roost`. Local `origin` now points to
  `https://github.com/example-org/Roost.git`. Coolify was checked under
  the `Example Company` team, project `Example Company`, production environment,
  application `Roost`; its Git Source now uses `example-org/Roost` on
  branch `main` with commit selector `HEAD`. No manual redeploy was triggered
  during the rename checkpoint.
- The next normal push to `main` after the repository rename triggered a
  Coolify deployment for `Roost`. Public health briefly returned `503` during
  rollout and then recovered; `https://api.roost.example.com/health`
  reported `status: ok` and build commit
  `c5b9aca6d5470060344b8f83a4d3e020f24cc6b7`.

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

- Container startup runs migrations, then `npm run bootstrap`.
- With no users and no workspaces, bootstrap atomically creates the owner,
  workspace and twelve departments plus `00 General`. First login defaults:
  `owner@owner.com` / `password`; change email/password in account settings.
- Any existing user or workspace skips all bootstrap writes. Changed environment
  values never reset existing credentials or ownership, and redeploy does not
  restore missing records or remove old seeded data.
- No service/API keys or business data are provisioned. Historical
  `SERVICE_PASSWORD_API_KEY` / `SEED_API_KEY` settings are unused by bootstrap.
- See [Deployment](../DEPLOYMENT.md) for optional first-install owner overrides.
  Do not roll back to an image that still runs the former data-populating seed.

## Local Codex Agent Runtime Rollout

The VPS deployment contains only the Roost migration, API, web console, and
private PostgreSQL data. It does not run Codex or mount laptop repositories.

Release order:

1. Back up production PostgreSQL and deploy the reviewed Roost image.
2. Confirm `prisma migrate deploy` applied the agent-runtime migration.
3. Verify public health and an owner-authenticated read of
   `/v1/agent-runtime/hosts` and `/v1/agent-runtime/executions`.
4. Create a workspace key with profile `mcp_codex_worker`.
5. Configure and start the outbound Windows host using
   `docs/operations/local-codex-agent-host.md`.
6. Queue one non-critical task, confirm progress/result visibility, inspect the
   local Git diff, then rotate the trial key if it was handled manually.

Do not expose PostgreSQL, add a database tunnel to the laptop, or run a second
production-connected Roost backend locally.

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
