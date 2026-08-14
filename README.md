# Roost (CompanyCore runtime) v1

Roost is the central operating system for LuckySparrow operations. It stores the
company's projects, goals, targets, tasks, clients, CRM pipeline, notes,
decisions, AI agents, agent logs, system events, and API keys.

This repository is intentionally a v1 foundation. It includes a backend-served
React owner console for the active product routes; it does not try to expose
every backend business workflow in the web UI. The goal is to provide a stable
database, API/MCP boundary, Docker runtime, and documentation that a dedicated
development agent can extend. `CompanyCore` remains the legacy technical
identifier used by existing runtime contracts.

## Quick Start

```bash
cp .env.example .env
npm install
npm run prisma:generate
docker compose up -d
```

The Docker path starts Postgres and the backend, pushes the Prisma schema, seeds
the local API key, and exposes the API on `http://localhost:3102`.

Coolify uses `docker-compose.coolify.yml`, which keeps Postgres private and
routes traffic through the Coolify proxy.

Local development key:

```text
X-API-Key: dev-companycore-key
```

## Validation

```bash
npm run build
curl http://localhost:3102/health
```

See `docs/` for architecture, database, API, integrations, deployment, and
next-step handoff notes.

## Agent execution

Paperclip owns agent roles, assignments, coordination, execution state, and
handoffs. This repository supplies Roost code and project-specific technical
truth; it does not maintain a second agent operating system.

## Agent App-Building Helpers

- `docs/governance/app-creation-playbook.md` turns loose app ideas into architecture and first slices.
- `docs/governance/user-feedback-loop.md` keeps user notes and visual corrections durable.
- Paperclip issues, comments, and work products carry execution handoffs.
