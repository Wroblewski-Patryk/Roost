# Open Decisions

Track unresolved decisions that can block or reshape execution.

## Active Decisions

- DEC-001 API namespace for v1
  - Question: Should v1 keep the current root-level endpoints
    (`/projects`, `/tasks`, `/events`) or introduce `/api/v1/*` before external
    consumers depend on the API?
  - Why it matters: Paperclip, Jarvis, n8n, and future GUI clients need a
    stable base path. Changing it later would require client migration.
  - Options:
    - Keep root-level endpoints for v1 and document them as stable.
    - Add `/api/v1/*` now while preserving root-level aliases during a short
      transition.
    - Add `/api/v1/*` only when a breaking v2 API appears.
  - Needed by: CCV1-008
  - Current owner: Planner / Backend Builder

- DEC-002 API key hardening depth for v1
  - Question: How should service API keys coexist with owner-user
    authentication and workspace scoping?
  - Why it matters: Paperclip, Jarvis, and automation clients need secure
    machine access, while human registration/login creates the workspace owner.
    Both paths must resolve to a workspace and fail closed.
  - Options:
    - Keep API keys as workspace-scoped service credentials with hashed storage
      and optional scopes.
    - Replace API keys with user-issued personal tokens in v1.
    - Support both: owner login for humans and hashed workspace API keys for
      agents/services.
  - Needed by: CCV1-007, CCV1-011, CCV1-012
  - Current owner: Security / Backend Builder

- DEC-003 Missing module API scope for v1
  - Question: Which DB-backed modules need public API routes in v1:
    task lists, pipeline stages, interactions, decisions, agents, and agent
    logs?
  - Why it matters: The schema already includes these entities, but adding
    routes without real workflows may expand the API surface too early.
  - Options:
    - Add minimal GET/POST routes for all existing models.
    - Add routes only for decisions and agent logs because AI consumers need
      durable memory and traceability.
    - Keep README-only placeholders until Paperclip/Jarvis workflows are
      specified.
  - Needed by: CCV1-008
  - Current owner: Product Docs / Backend Builder

- DEC-004 Production migration policy
  - Question: What is the exact production migration command and rollback
    expectation for Coolify deployments?
  - Why it matters: The current Docker runtime uses `prisma db push`; v1 should
    move to a migration flow before production data becomes valuable.
  - Options:
    - Run `prisma migrate deploy` during backend startup.
    - Run migrations as a separate one-off deploy step before backend rollout.
    - Keep `db push` only for local development and block production deploys
      without migrations.
  - Needed by: CCV1-003
  - Current owner: DB/Migrations / Ops/Release

- DEC-005 Native ClickUp integration scope
  - Question: What is the smallest v1-native ClickUp integration that is useful
    for Jarvis and future integrations without overbuilding?
  - Why it matters: ClickUp is now the first native integration adapter pattern.
    Its boundaries should guide future integrations instead of becoming a
    one-off implementation.
  - Options:
    - Pull-only task sync from configured ClickUp lists/spaces into
      CompanyCore.
    - Pull tasks plus write selected CompanyCore task updates back to ClickUp.
    - Read-only discovery first: list ClickUp spaces/folders/lists/tasks so
      Jarvis can inspect and propose mapping before enabling sync writes.
  - Needed by: CCV1-010
  - Current owner: Product Docs / Backend Builder

- DEC-006 Owner authentication mechanism
  - Question: What should v1 use for owner registration and login?
  - Why it matters: CompanyCore has no GUI in v1, but Paperclip/Jarvis and
    future GUI clients need a secure auth foundation. Registration must create
    an owner user and workspace atomically.
  - Options:
    - Email/password with hashed passwords and JWT or opaque sessions.
    - External identity provider only, if Paperclip already has a reusable auth
      provider.
    - Start with API-only bootstrap endpoint for first owner, then add full
      login when GUI work begins.
  - Needed by: CCV1-011, CCV1-012
  - Current owner: Security / Backend Builder

- DEC-007 Workspace model depth for v1
  - Question: Should v1 support one owner-only workspace, or owner plus future
    membership rows now?
  - Why it matters: The user wants settings assigned to a workspace with a user
    owner, but not an overbuilt multi-tenant product. The schema should support
    future users without requiring a rewrite.
  - Options:
    - Minimal `workspaces.owner_user_id` only, no memberships in v1.
    - Add `workspace_memberships` now with only `owner` role active.
    - Full roles and invitations now.
  - Needed by: CCV1-011
  - Current owner: Product Docs / Backend Builder

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
