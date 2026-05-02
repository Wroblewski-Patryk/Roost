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
npx prisma db push
npm run seed
node dist/server.js
```

## Local Development

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

For local development without Docker, provide a reachable PostgreSQL
`DATABASE_URL`.

## Coolify

Use Docker Compose deployment with the repository root as the compose context.

Required environment values:

- `DATABASE_URL`
- `PORT`
- `SEED_API_KEY`

For production, replace `SEED_API_KEY` with a private value and rotate it after
first deploy if needed. Keep Postgres storage persistent through Coolify volume
configuration.

## Smoke Check

```bash
curl http://localhost:3000/health
curl -H "X-API-Key: dev-companycore-key" http://localhost:3000/projects
```
