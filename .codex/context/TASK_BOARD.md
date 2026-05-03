# TASK_BOARD

## Ready

- Implement Paperclip application-side adapter code
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: update Paperclip so it reads `COMPANYCORE_BASE_URL` and
    `COMPANYCORE_API_KEY`, consumes CompanyCore agent events, and writes
    relevant records back through CompanyCore instead of direct provider paths.

- CCV1-047 Dashboard Command Center
  - Stage: planning
  - Owner: Frontend Builder
  - Priority: P1
  - Scope: expand `/dashboard` into the post-login command center with
    workspace, integration, task, operating model, and event health summaries.

- CCV1-048 Operating Areas Explorer
  - Stage: planning
  - Owner: Frontend Builder
  - Priority: P1
  - Scope: add the 12-area operating model explorer and read-first mapping
    health view backed by `/v1/operating-model*`.

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

- CCV1-049 Settings Integration Taxonomy
  - Stage: planning
  - Owner: Frontend Builder
  - Priority: P1
  - Scope: split settings into Account, API, and Integrations grouped by data
    type, provider, and operating area.

- CCV1-050 Tasks And Adapter Operations View
  - Stage: planning
  - Owner: Frontend Builder
  - Priority: P1
  - Scope: add `/tasks` for task/list inspection, ClickUp health, provider
    events, Custom Fields, notes/comments, and retry visibility.

- CCV1-051 Pipeline Module
  - Stage: planning
  - Owner: Frontend Builder
  - Priority: P2
  - Scope: add `/pipeline` using existing stages, deals, clients,
    interactions, and notes.

- CCV1-052 Relationship Mapping Reassignment API And UI
  - Stage: planning
  - Owner: Backend Builder + Frontend Builder
  - Priority: P1
  - Scope: after the read-first areas explorer, add a safe mapping reassignment
    endpoint and one-at-a-time GUI correction flow for provider containers.

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
- CCV1-036B ClickUp Webhook Registration.
- CCV1-036C ClickUp Webhook Receiver And Inbox.
- CCV1-036D Task Event Processor.
- CCV1-036E Agent Event Bridge.
- CCV1-036G CompanyCore to ClickUp write-back.
- CCV1-036F Production Webhook Smoke.
- CCV1-041 Template Agent Governance Sync.
- CCV1-042 ClickUp Full API Bridge Completion.
- CCV1-043 ClickUp Task Comment Bridge.
- CCV1-044 ClickUp Provider Event Retry And Health.
- CCV1-045 Google Drive Bidirectional Notes Bridge.
- CCV1-046 GUI App Shell And Navigation.
