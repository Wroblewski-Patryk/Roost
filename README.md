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

## Agent Operating System

Agent continuation state lives in `.agents/core/` and `.agents/state/`. These
files define the startup order, execution loop, anti-regression checks, quality
gates, current focus, known issues, regression log, system health, and next
steps for future Codex sessions.

## Agent App-Building Helpers

- `docs/governance/app-creation-playbook.md` turns loose app ideas into architecture and first slices.
- `docs/governance/user-feedback-loop.md` keeps user notes and visual corrections durable.
- `.codex/templates/handoff-packet-template.md` captures closeout context for the next agent.
