# Architecture

Company Core is built around one rule: the database is the source of truth, and
the API is the only supported access layer.

The long-term product shape is a company operating bridge, not only a backend
integration dashboard. The model-level module map for scaling UI, API, MCP,
provider, and agent work is
`docs/architecture/companycore-business-module-map.md`.
The unified organizational operating-system direction is documented in
`docs/architecture/unified-organizational-operating-system.md`: CompanyCore is
the non-AI organizational world state where humans and AI agents are both
workforce members operating through shared departments, hierarchy, tasks,
permissions, resources, API, and MCP boundaries.

## Source Of Truth

PostgreSQL stores canonical company state. Prisma owns the schema and generated
database client. External tools should not write directly to the database.

## API Boundary

Express exposes a small HTTP API. Paperclip, Jarvis, n8n, and future GUI
clients must use this API rather than bypassing it.

## Ownership Boundary

CompanyCore v1 must create a workspace ownership boundary before production
integrations are considered complete. Registration creates an owner user and a
workspace atomically. Business records, service API keys, integration settings,
integration sync state, and agent access should resolve to a workspace before
writes are accepted.

This is not full enterprise multi-tenancy in v1. Invitations, billing,
advanced RBAC, and organization administration are out of scope. The goal is a
secure owner workspace that can later grow without rewriting the data model.

## Integration Layer

CompanyCore supports first-class backend integration adapters when an external
system should be part of the core operational memory. ClickUp is the first v1
native adapter and should establish the pattern for future integrations:
provider-specific client code stays in `src/integrations/<provider>/`, data is
normalized into internal models, writes go through CompanyCore persistence, and
events are emitted for automation and auditability.

Integration credentials and settings belong to a workspace. ClickUp tokens,
team/list configuration, sync cursors, and future provider settings must not be
global process state.

n8n remains optional orchestration for workflows that are better outside the
backend. It is not the required primary path for ClickUp in v1.

## Consumers

Paperclip and Jarvis consume Company Core as operational memory:

- goals, targets, tasks, processes, pipelines, and runtime evidence for
  execution context
- clients, deals, stakeholders, and relationships for CRM context
- Drive/Docs/Sheets snapshots, notes, standards, and decisions for durable
  knowledge
- resources, tools, permissions, approvals, audit logs, and events for safe
  agent action

## Current Runtime

- Node.js 22
- Express
- Prisma
- PostgreSQL
- Docker Compose
