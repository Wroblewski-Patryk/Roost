# Deployment

## Local Docker

```bash
docker compose up -d --build
```

Services:

- `backend`: Node/Express API and owner console on local host port `3102` by default; the container still listens on port `3000`
- `postgres`: PostgreSQL available inside the Compose network

The backend startup command runs:

```bash
npm run prisma:migrate:deploy
npm run bootstrap
node dist/server.js
```

Production startup must use `prisma migrate deploy`. Do not use
`prisma db push` against production.

`npm run bootstrap` (also available as `npm run seed`) initializes only an
installation with no users and no workspaces. It creates one owner, one workspace,
the owner membership, twelve company departments and the system `00 General`
surface. Defaults are `owner@owner.com` / `password`, owner name `Owner`, and
workspace name `Roost`. Optional `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`,
`SEED_OWNER_NAME`, and `SEED_WORKSPACE_NAME` override first-install values only.
After first login, change the email/password in account settings (new passwords
must have at least 12 characters).

The check and creation run in one transaction with database locks. If any user
or workspace exists, bootstrap skips all writes, regardless of changed credentials,
ownership, missing departments or environment values. Concurrent starts cannot
create duplicate installations; failed creation rolls back completely.

Bootstrap creates no API keys, agents, tasks, projects, applications, integrations,
procedures, pipelines, capability packs or other business data. It does not remove
old seeded records. Existing data and credentials remain unchanged on redeploy.
`SEED_API_KEY` and `SERVICE_PASSWORD_API_KEY` no longer provision credentials;
create service keys explicitly through authenticated workspace settings/API.

Schema migrations still run before bootstrap. The public distribution removes
installation-specific data statements from the historical
`20260830120000_codex_agent_runtime` migration while retaining its name and schema.
Already-applied migrations are not replayed by `prisma migrate deploy`; the original
stored checksum and business records remain unchanged. Existing development
clones may report that historical migration as modified under `migrate dev`.
Never accept a reset against a retained database; use a fresh disposable development
database or the operator's private original migration archive when needed.
Future migrations require separate data-impact review. Do not roll back to an
image containing the old automatic seed command against live data.

## Local Development

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev
```

For local development without Docker, provide a reachable PostgreSQL
`DATABASE_URL`.

## Coolify

Use Docker Compose deployment with the repository root as the compose context
and `docker-compose.coolify.yml` as the compose file.

Public domains are configured per installation. For one domain, configure the
backend domain in Coolify and pass its origin as `COMPANYCORE_PUBLIC_WEB_BASE_URL`
(or `SERVICE_URL_BACKEND_3000`). The browser calls the API on the same origin.
For separate web/API domains, also set `COMPANYCORE_PUBLIC_API_BASE_URL`.
The examples below use reserved example domains; no company domain is built in.

Required environment values:

- `SERVICE_PASSWORD_POSTGRES`
- `AUTH_TOKEN_SECRET`
- `API_KEY_HASH_SECRET` is recommended. If omitted, production falls back to
  `AUTH_TOKEN_SECRET` to preserve existing service API key hashes.
- `INTEGRATION_SECRET_KEY`
- `COMPANYCORE_PUBLIC_WEB_BASE_URL`: the public web origin (e.g. `https://roost.example.com`)
- `COMPANYCORE_PUBLIC_API_BASE_URL`: optional separate API origin; defaults to the web origin
- `COMPANYCORE_ALLOWED_ORIGINS`: optional explicit comma-separated CORS allowlist;
  otherwise derived from configured public origins
- `COMPANYCORE_API_HOSTS`: optional API-only hostnames serving metadata at `/`;
  otherwise derived only when separate web/API origins are configured
- `ROOST_CODEX_EXECUTION_ENABLED` remains `false` during the foundation
  rollout. Set it to `true` only after the application map, scoped worker key,
  Windows host, paused trigger contract, and non-critical trial are reviewed.
- `ROOST_ALLOW_WORKSPACE_CREATION` remains unset/`false` by default.
  Enable it only for an explicitly approved multi-workspace
  deployment; ordinary people join through workspace invitations.

Production startup fails when required secrets are missing or still use the
committed development placeholder values.

Map domains to the `backend` service on container port `3000`.
The backend serves the owner console from `/` on the web domain. The React
console calls same-origin `/auth/*` and `/v1/*`. An optional API-only domain
serves API metadata at its root. Integration setup uses the configured public
API origin. No public domains are inferred from a particular company name.

Keep Postgres storage persistent through Coolify volume configuration.

Production deploys must use Prisma migrations. Do not use `prisma db push` for
production once data matters.

Migration release checklist:

- Review generated SQL before deploy.
- Test migration against an empty database.
- Test migration against a copy of the current foundation database when schema
  changes touch auth, workspaces, API keys, integrations, tasks, or external ID
  uniqueness.
- Confirm rollback or forward-fix plan before deploy.
- Back up the PostgreSQL volume/database before risky ownership or integration
  migrations.

## Smoke Check

```bash
curl https://api.roost.example.com/health
curl https://roost.example.com/
curl https://api.roost.example.com/
curl -H "X-API-Key: <workspace-api-key>" https://api.roost.example.com/projects
curl -H "Authorization: Bearer <owner-token>" https://api.roost.example.com/integration-settings/clickup
curl -X POST -H "Authorization: Bearer <owner-token>" https://api.roost.example.com/tasks/sync/clickup/native
curl -H "Authorization: Bearer <owner-token>" https://api.roost.example.com/events
```

Expected smoke evidence:

- `/health` returns healthy status.
- `https://roost.example.com/` returns the owner console assets.
- `https://api.roost.example.com/` returns API metadata.
- Protected API rejects missing auth and accepts owner token or workspace API
  key.
- Owner console can log in, check a ClickUp token, select a ClickUp Workspace,
  select Lists, save settings, and trigger sync.
- ClickUp settings response redacts token material.
- Native ClickUp sync creates or updates tasks without duplicating records.
- `GET /events` shows `task_synced_from_clickup` and sync status events.
