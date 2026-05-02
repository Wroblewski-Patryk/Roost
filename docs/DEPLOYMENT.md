# Deployment

## Local Docker

```bash
docker compose up -d --build
```

Services:

- `backend`: Node/Express API on port `3000`
- `postgres`: PostgreSQL available inside the Compose network

The backend startup command runs:

```bash
npm run prisma:migrate:deploy
npm run seed
node dist/server.js
```

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
- `INTEGRATION_SECRET_KEY`

Map domains to the `backend` service on container port `3000`.

Keep Postgres storage persistent through Coolify volume configuration.

Production deploys must use Prisma migrations. Do not use `prisma db push` for
production once data matters.

## Smoke Check

```bash
curl https://api.companycore.luckysparrow.ch/health
curl -H "X-API-Key: <workspace-api-key>" https://api.companycore.luckysparrow.ch/projects
curl -H "Authorization: Bearer <owner-token>" https://api.companycore.luckysparrow.ch/integration-settings/clickup
curl -X POST -H "Authorization: Bearer <owner-token>" https://api.companycore.luckysparrow.ch/tasks/sync/clickup/native
curl -H "Authorization: Bearer <owner-token>" https://api.companycore.luckysparrow.ch/events
```

Expected smoke evidence:

- `/health` returns healthy status.
- Protected API rejects missing auth and accepts owner token or workspace API
  key.
- ClickUp settings response redacts token material.
- Native ClickUp sync creates or updates tasks without duplicating records.
- `GET /events` shows `task_synced_from_clickup` and sync status events.
