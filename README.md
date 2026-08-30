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
npm ci
npm run prisma:generate
```

Continue with the executable [local development contract](docs/engineering/local-development.md).
It covers the host watch-mode database, migrations and seed, backend-served
React build, local PROD-like startup, Compose image readback, verification, and
safe cleanup. The production-mode backend requires explicit non-placeholder
local secrets, so a bare `docker compose up backend` is not the local quick
start.

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

Roost owns task intent, governed company context, execution requests, and
completion evidence. Local Codex Agent Hosts claim authorized work through the
production API and report results back to Roost.

The local execution boundary is fixed at
`C:\Personal\Projekty\Aplikacje`. Agent Host configuration may select only
allowlisted, direct-child Git repositories under that root; path traversal,
nested repositories, links/junctions, and mismatched origins fail closed.

## Agent App-Building Helpers

- `docs/governance/app-creation-playbook.md` turns loose app ideas into architecture and first slices.
- `docs/governance/user-feedback-loop.md` keeps user notes and visual corrections durable.
- Agent execution records, events, and evidence carry execution handoffs.
