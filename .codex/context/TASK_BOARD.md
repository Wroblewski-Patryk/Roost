# TASK_BOARD

## Ready

No additional ready P0/P1 web console implementation task is queued after
V2WEB-016.

## Blocked

- CCV1-057B Paperclip upstream branch push
  - Stage: release
  - Owner: Ops/Release
  - Priority: P2
  - Blocked by: GitHub returned `403` for pushing
    `codex/companycore-adapter-v1` to `paperclipai/paperclip` as
    `Wroblewski-Patryk`. The adapter commit is validated locally and remains
    available as `4cfa476f` plus the managed CompanyCore patch.
- CCV1-058B OpenJarvis upstream branch push
  - Stage: release
  - Owner: Ops/Release
  - Priority: P2
  - Blocked by: GitHub returned `403` for pushing
    `codex/companycore-connector-v1` to `open-jarvis/OpenJarvis` as
    `Wroblewski-Patryk`. The connector change was replayed on clean
    `origin/main`, validated with 6 targeted tests, and remains available as
    the documented OpenJarvis source handoff.

## Backlog

- Future v2 OAuth browser consent UI and token refresh hardening after core
  server-side API slices are complete.
- Future v2 dashboard surfaces that show ClickUp Lists, Drive folders/files,
  storage locations, knowledge roots, automations, and CompanyCore tables as
  one company operating area.
- Upstream OpenJarvis/Paperclip source merge execution and blocked GitHub
  auto-deploy webhook administration task.

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
- CCV1-045 ClickUp Maintenance Freshness Run.
- CCV1-046 ClickUp Maintenance Scheduler.
- CCV1-047 Paperclip Application-Side CompanyCore Adapter.
- CCV1-048 V1 Closure Audit.
- CCV1-049 Authenticated Jarvis Smoke And Managed Paperclip Source Path.
- CCV1-050 Jarvis CompanyCore Answer Precision Hardening.
- CCV1-051 Clean Sync Data Hygiene.
- CCV1-052 V1 Launch Boundary And Source Handoff.
- CCV1-053 V1 Source Handoff Package.
- CCV1-054 Final V1 Runtime Rollover Smoke.
- CCV1-055 Full V1 Live System Smoke.
- CCV1-056 V1 Post-Release Artifact Cleanup.
- CCV1-057 Paperclip Source Handoff Validation.
- CCV1-058 OpenJarvis Source Handoff Validation.
- CCV1-059 GitHub Auto-Deploy Capability Audit.
- CCV1-060 V1 Operator Handoff.
- V2GD-001 Google Drive Architecture And Queue.
- V2GD-002 Google Drive Persistence Foundation.
- V2GD-003 Google Drive Provider Client And OAuth Settings.
- V2GD-004 Folder Discovery And File Import.
- V2GD-005 Docs And Sheets Read/Create/Edit.
- V2GD-006 Drive Changes Freshness.
- V2GD-007 Google Drive Deploy Smoke Hardening.
- V2GD-008 Google Drive OAuth Runtime Hardening.
- V2GD-009 Google Drive Production Rollover Smoke.
- V2WEB-001 Operating Map And Google Drive Console.
- V2WEB-002 Manual Provider Scope Mapping.
- V2WEB-003 Main Branch Web Console Shell Reconciliation.
- CCV1-020 GitHub webhook auto-deploy completion.
- V2WEB-004 Dedicated Operating Areas View.
- V2WEB-005 Dedicated Tasks Adapter View.
- V2WEB-006 Settings Integration Taxonomy View.
- V2WEB-007 Dedicated Pipeline View.
- V2WEB-008 Dashboard Command Center.
- V2WEB-009 Account Settings View.
- V2WEB-010 Relationship Review Center.
- V2WEB-011 Task Workbench Filters.
- V2WEB-012 Pipeline Workbench Filters.
- V2WEB-013 Operating Area Workbench Filters.
- V2WEB-014 Integration Matrix Filters.
- V2WEB-015 Google Drive Files Workbench Filters.
- V2WEB-016 API Workbench Filters.
