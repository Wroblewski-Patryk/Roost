# Company Core

LuckySparrow Company Core is the internal source-of-truth backend for company
operations.

It exists because Paperclip, Jarvis, n8n automations, and future GUI clients
need one consistent place to read and write operational data. Without Company
Core, project state, tasks, sales context, notes, decisions, and AI activity
would drift across tools.

Company Core v1 provides:

- PostgreSQL data model with Prisma.
- Express API protected by `X-API-Key`.
- Minimal flows for projects, goals, targets, tasks, clients, deals, notes, and
  events.
- ClickUp sync endpoint designed for n8n payloads.
- Docker Compose runtime for local and Coolify-style deployment.

It deliberately does not provide a GUI, direct ClickUp API integration,
advanced auth, analytics, background workers, or full business automation.
