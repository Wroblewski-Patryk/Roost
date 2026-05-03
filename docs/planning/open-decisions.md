# Open Decisions

Track unresolved decisions that can block or reshape execution.

## Active Decisions

No active decisions.

## Resolved Decisions

- 2026-05-02: CompanyCore v1 has no GUI.
- 2026-05-02: PostgreSQL is the source of truth.
- 2026-05-02: Backend API is the only supported access layer.
- 2026-05-02: CompanyCore v1 should include native direct ClickUp API
  integration as the first integration adapter. n8n is optional orchestration,
  not the required primary path.
- 2026-05-02: CompanyCore v1 should include a workspace ownership boundary.
  Registration creates an owner user and a workspace, and integration settings
  are assigned to the workspace.
- 2026-05-02: Owner authentication uses email/password with hashed password
  storage for v1. Token/session implementation details remain scoped to
  CCV1-012.
- 2026-05-02: v1 supports both owner-user auth for humans/API clients and
  hashed workspace-scoped service API keys for Paperclip, Jarvis, n8n, and
  other agents.
- 2026-05-02: v1 includes `workspace_memberships` now for future growth, but
  only the `owner` role is active. Invitations, non-owner roles, and advanced
  RBAC are deferred.
- 2026-05-02: Production deployments use `prisma migrate deploy` during backend
  startup. Local development may use `prisma migrate dev`; `db push` is not the
  production path.
- 2026-05-02: DEC-005 resolved. The smallest v1-native ClickUp slice is
  pull-only task sync from workspace-configured ClickUp lists into CompanyCore
  tasks. It does not write changes back to ClickUp in v1.
- 2026-05-02: DEC-001 resolved. v1 uses `/v1/*` route aliases without `/api`
  because the API already has a dedicated domain. Root routes remain available
  as compatibility aliases during v1.
- 2026-05-02: DEC-003 resolved. v1 adds minimal API routes only for
  `decisions` and `agent-logs`; task lists, pipeline stages, interactions, and
  agents remain deferred until workflows require them.
- 2026-05-03: CompanyCore should evolve toward a ClickUp-shaped operating
  model with the canonical hierarchy `Workspace -> Operating Area -> Operating
  Folder -> Operating Table -> Record`, mapped to ClickUp
  `Team/Workspace -> Space -> Folder -> List -> Task`. Business tables belong
  to one of 12 approved operating areas; system tables remain platform-owned.
- 2026-05-03: Provider API work must check current official provider
  documentation before implementation or mapping changes. For ClickUp, task
  evidence must cover hierarchy terminology, Custom Fields, Views, rate limits,
  pagination, webhook signatures, and permissions when relevant.
