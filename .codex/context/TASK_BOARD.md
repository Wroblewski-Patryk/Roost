# TASK_BOARD

## Ready

- CCV1-005 Deployment domain documentation and smoke checklist
  - Stage: planning
  - Owner: Ops/Release
  - Priority: P0
  - Scope: Record production domains and smoke path.

- CCV1-016 Migration safety and seed/bootstrap policy
  - Stage: planning
  - Owner: DB/Migrations
  - Priority: P0
  - Scope: Define migration, local seed, production first-owner bootstrap, and
    rollback expectations.

- CCV1-007 API key hardening plan and implementation
  - Stage: planning
  - Owner: Security
  - Priority: P1
  - Scope: Harden workspace-scoped API key storage and service-client access.

## Blocked

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
- CCV1-015 Workspace guardrail test matrix.
- CCV1-003 Prisma migration baseline and deployment entrypoint.
- CCV1-012 Registration, login, and workspace bootstrap.
- CCV1-013 Workspace-scoped integration settings and secret storage.
- CCV1-017 Integration adapter contract and observability minimum.
- CCV1-010 Native ClickUp integration contract and first adapter slice.
- CCV1-004 Complete required v1 event emission.
