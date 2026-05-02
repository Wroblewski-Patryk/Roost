# LuckySparrow Company Core v1

Company Core is the central backend for LuckySparrow operations. It stores the
company's projects, goals, targets, tasks, clients, CRM pipeline, notes,
decisions, AI agents, agent logs, system events, and API keys.

This repository is intentionally a v1 foundation. It does not include a GUI and
does not try to implement every business workflow. The goal is to provide a
stable database, API boundary, Docker runtime, and documentation that a
dedicated development agent can extend.

## Quick Start

```bash
cp .env.example .env
npm install
npm run prisma:generate
docker compose up -d
```

The Docker path starts Postgres and the backend, pushes the Prisma schema, seeds
the local API key, and exposes the API on `http://localhost:3000`.

Local development key:

```text
X-API-Key: dev-companycore-key
```

## Validation

```bash
npm run build
curl http://localhost:3000/health
```

See `docs/` for architecture, database, API, integrations, deployment, and
next-step handoff notes.
