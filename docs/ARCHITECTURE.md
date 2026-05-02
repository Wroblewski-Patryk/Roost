# Architecture

Company Core is built around one rule: the database is the source of truth, and
the API is the only supported access layer.

## Source Of Truth

PostgreSQL stores canonical company state. Prisma owns the schema and generated
database client. External tools should not write directly to the database.

## API Boundary

Express exposes a small HTTP API. Paperclip, Jarvis, n8n, and future GUI
clients must use this API rather than bypassing it.

## Integration Layer

n8n is the integration orchestrator. In v1, ClickUp data reaches Company Core
through `POST /tasks/sync/clickup`. Company Core does not call the ClickUp API
directly.

## Consumers

Paperclip and Jarvis consume Company Core as operational memory:

- projects, goals, targets, and tasks for execution context
- clients and deals for CRM context
- notes and decisions for durable knowledge
- events for auditability and automation triggers

## Current Runtime

- Node.js 22
- Express
- Prisma
- PostgreSQL
- Docker Compose
