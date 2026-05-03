# Deployment

## Local Docker

```bash
docker compose up -d --build
```

Services:

- `backend`: Node/Express API and minimal owner console on port `3000`
- `postgres`: PostgreSQL available inside the Compose network

The backend startup command runs:

```bash
npm run prisma:migrate:deploy
npm run seed
node dist/server.js
```

Production startup must use `prisma migrate deploy`. Do not use
`prisma db push` against production.

The current seed command is for local/bootstrap use. For production, run seed
only when intentionally creating the first owner workspace and first workspace
API key, with `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`,
`SEED_WORKSPACE_NAME`, and `SEED_API_KEY` explicitly set. After the first owner
exists, do not rerun seed as a standing production shortcut.

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

Public domains:

- Project domain: `https://companycore.luckysparrow.ch`
- API domain: `https://api.companycore.luckysparrow.ch`

Required environment values:

- `SERVICE_PASSWORD_POSTGRES`
- `SERVICE_PASSWORD_API_KEY`
- `AUTH_TOKEN_SECRET`
- `API_KEY_HASH_SECRET`
- `INTEGRATION_SECRET_KEY`

Map domains to the `backend` service on container port `3000`.
The backend serves the minimal owner console from `/` and API routes from
`/v1/*` plus existing compatibility aliases.

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
curl https://api.companycore.luckysparrow.ch/health
curl https://api.companycore.luckysparrow.ch/
curl -H "X-API-Key: <workspace-api-key>" https://api.companycore.luckysparrow.ch/projects
curl -H "Authorization: Bearer <owner-token>" https://api.companycore.luckysparrow.ch/integration-settings/clickup
curl -X POST -H "Authorization: Bearer <owner-token>" https://api.companycore.luckysparrow.ch/tasks/sync/clickup/native
curl -H "Authorization: Bearer <owner-token>" https://api.companycore.luckysparrow.ch/events
```

Expected smoke evidence:

- `/health` returns healthy status.
- `/` returns the owner console assets.
- Protected API rejects missing auth and accepts owner token or workspace API
  key.
- Owner console can log in, check a ClickUp token, select a ClickUp Workspace,
  select Lists, save settings, and trigger sync.
- ClickUp settings response redacts token material.
- Native ClickUp sync creates or updates tasks without duplicating records.
- `GET /events` shows `task_synced_from_clickup` and sync status events.
