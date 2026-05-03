# TASK_BOARD

## Ready

- CCV1-036B ClickUp Webhook Registration
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: add ClickUp get/create/update/delete webhook client methods and an
    owner reconcile API that stores returned webhook secrets encrypted.

- CCV1-036C ClickUp Webhook Receiver And Inbox
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: add `POST /v1/webhooks/clickup`, verify `X-Signature`, persist
    idempotent inbox rows, and acknowledge valid events quickly.

- CCV1-036D Task Event Processor
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: process ClickUp task events, especially `taskStatusUpdated`, update
    CompanyCore tasks, and emit internal events.

- CCV1-036E Agent Event Bridge
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: expose provider-neutral agent events so Paperclip, Jarvis, Aviary,
    and future bridges can react without ClickUp-specific logic.

- CCV1-036F Production Webhook Smoke
  - Stage: planning
  - Owner: Ops/Release
  - Priority: P0
  - Scope: deploy webhook runtime, reconcile selected List webhooks, change a
    real ClickUp task status, and verify CompanyCore plus agent-event readback.

## Blocked

- CCV1-020 GitHub webhook auto-deploy completion
  - Stage: release
  - Owner: Ops/Release
  - Priority: P2
  - Blocked by: GitHub repository settings require an authenticated GitHub
    session or token with webhook administration permissions. Coolify
    `Auto Deploy` is enabled, but no deployment was created automatically after
    push.

## Backlog

No active backlog item beyond the continuous ClickUp update strategy and
Paperclip application-side adapter work tracked in
`docs/planning/mvp-next-commits.md`.

## Done

- Initialize `companycore` from `!template`.
- Add Express/TypeScript/Prisma backend foundation.
- Add PostgreSQL schema for CompanyCore v1 entities.
- Add API key auth using `X-API-Key`.
- Add minimal endpoints required for v1.
- Add event creation for project/task/goal/target lifecycle events.
- Add initial ClickUp-shaped task sync endpoint.
- Add Dockerfile and Docker Compose.
- Add handoff documentation.
- Validate build and Docker smoke flow.
- Audit current repository architecture against CompanyCore v1 expectations.
- CCV1-002 Real planning queue and task contracts.
- CCV1-001 Canonical architecture and deployment docs alignment.
- CCV1-011 Workspace ownership and auth architecture contract.
- CCV1-014 API contract and error response standard.
- CCV1-015 Workspace guardrail test matrix.
- CCV1-003 Prisma migration baseline and deployment entrypoint.
- CCV1-012 Registration, login, and workspace bootstrap.
- CCV1-013 Workspace-scoped integration settings and secret storage.
- CCV1-017 Integration adapter contract and observability minimum.
- CCV1-010 Native ClickUp integration contract and first adapter slice.
- CCV1-004 Complete required v1 event emission.
- CCV1-005 Deployment domain documentation and smoke checklist.
- CCV1-016 Migration safety and seed/bootstrap policy.
- CCV1-007 API key hardening plan and implementation.
- CCV1-006 Endpoint test foundation.
- CCV1-008 Missing module route decision and minimal route slice.
- CCV1-018 Owner-managed adapter API keys.
- CCV1-009 Production deployment recovery and public smoke.
- CCV1-019 Database/API workspace coverage for core records.
- CCV1-021 Adapter connection handshake for Paperclip and Jarvis.
- CCV1-022 Adapter manifest for service clients.
- CCV1-023 Workspace-scoped agents API.
- CCV1-024 Workspace-scoped interactions API.
- CCV1-025 Task list and pipeline stage API.
- CCV1-026 Adapter smoke script.
- CCV1-009P Protected production smoke for adapter CRUD.
- CCV1-027 Paperclip and Jarvis production env wiring.
- CCV1-029 ClickUp production bootstrap slot.
- CCV1-030 Minimal owner ClickUp web console.
- CCV1-031P ClickUp owner console deployment plan.
- CCV1-028 Jarvis application-side CompanyCore Data Source deployment.
- CCV1-031 ClickUp Discovery Backend.
- CCV1-032 Guided Owner Console.
- CCV1-033 Production deploy and smoke for guided ClickUp owner console.
- CCV1-034 ClickUp-shaped operating model architecture and implementation plan.
- CCV1-034A Operating Model Registry Schema.
- CCV1-034B ClickUp Structure Persistence.
- CCV1-034B2 ClickUp Views and Custom Fields Persistence.
- CCV1-034C Registry-Backed Table API Contract.
- CCV1-034D Storage and Knowledge Roots.
- CCV1-034E Automation Scope Registry.
- CCV1-035 ClickUp first-run import policy and launch audit.
- CCV1-036 ClickUp webhook trigger architecture plan.
- CCV1-037 ClickUp list selection UX fix.
- CCV1-038 Dashboard task table.
- CCV1-039 ClickUp config-only save fix.
- CCV1-040 ClickUp save-and-sync activation fix.
- CCV1-036A Webhook Schema And Security Foundation.
