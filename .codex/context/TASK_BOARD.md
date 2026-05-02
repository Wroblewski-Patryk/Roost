# TASK_BOARD

## Ready

- CCV1-003 Prisma migration baseline and deployment entrypoint
  - Stage: planning
  - Owner: DB/Migrations
  - Priority: P0
  - Scope: Replace production reliance on `prisma db push`.
  - Blockers: DEC-004 should be resolved before implementation.

- CCV1-004 Complete required v1 event emission
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: Add `client_created`, `deal_created`, and `note_created`.

- CCV1-005 Deployment domain documentation and smoke checklist
  - Stage: planning
  - Owner: Ops/Release
  - Priority: P0
  - Scope: Record production domains and smoke path.

- CCV1-010 Native ClickUp integration contract and first adapter slice
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: Implement ClickUp as the first native CompanyCore integration
    adapter after CCV1-001 and DEC-005 are resolved.

- CCV1-012 Registration, login, and workspace bootstrap
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: Implement owner registration/login and automatic workspace creation
    after the architecture contract is approved.

- CCV1-013 Workspace-scoped integration settings and secret storage
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: Store ClickUp and future integration settings under workspace
    ownership with protected secret handling.

- CCV1-015 Workspace guardrail test matrix
  - Stage: planning
  - Owner: QA/Test
  - Priority: P0
  - Scope: Define required allowed/denied workspace tests for every protected
    route.

- CCV1-016 Migration safety and seed/bootstrap policy
  - Stage: planning
  - Owner: DB/Migrations
  - Priority: P0
  - Scope: Define migration, local seed, production first-owner bootstrap, and
    rollback expectations.

- CCV1-017 Integration adapter contract and observability minimum
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P0
  - Scope: Define reusable integration adapter layers, idempotency, safe errors,
    logs/events, and smoke signals.

## Blocked

- CCV1-007 API key hardening plan and implementation
  - Stage: planning
  - Owner: Security
  - Priority: P1
  - Blocked by: CCV1-012, CCV1-003

- CCV1-008 Missing module route decision and minimal route slice
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P1
  - Blocked by: DEC-001, DEC-003

## Backlog

- CCV1-006 Endpoint test foundation
  - Stage: planning
  - Owner: QA/Test
  - Priority: P1
  - Depends on: CCV1-003

- CCV1-009 Production deployment verification
  - Stage: planning
  - Owner: Ops/Release
  - Priority: P1
  - Depends on: CCV1-003, CCV1-004, CCV1-005, CCV1-006

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
