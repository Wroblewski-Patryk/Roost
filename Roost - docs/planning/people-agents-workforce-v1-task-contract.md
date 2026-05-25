# People/Agents Workforce V1 Task Contract

## Header
- ID: DMS-06-WORKFORCE-001
- Title: 06 People & Agents workforce foundation
- Task Type: feature
- Current Stage: verification
- Status: REVIEW
- Owner: Backend Builder + Frontend Builder + QA/Test
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: DMS-06-WORKFORCE-001
- Requirement Rows: REQ-DMS-06-WORKFORCE-001
- Risk Rows: RISK-DMS-06-WORKFORCE-001
- Iteration: 2026-05-17 owner-directed implementation
- Operation Mode: BUILDER
- Mission ID: DMS-06-WORKFORCE-001
- Mission Status: PARTIALLY_VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] One priority task is selected: the first `06 People & Agents` vertical slice.
- [x] `.agents/core/project-memory-index.md` and current architecture state were reviewed.
- [x] Existing backend models, permissions, route conventions, selected-area UI, and operating-model catalog were inspected before implementation.
- [x] The task advances the accepted unified workforce architecture without creating a parallel HR or Paperclip runtime subsystem.

## Mission Block
- Mission objective: create the first source-of-truth workforce module for humans and AI agents.
- Release objective advanced: make `06 Kadry / People & Agents` an active department surface backed by Prisma, API, capability checks, generated markdown resources, and a manual Paperclip sync queue.
- Included slices: schema, migration, service/repository layer, CRUD routes, capability manifest/profile updates, owner registration/seed backfill, React selected-area route, list/detail/edit/sync/generated-files UI, and local validation.
- Explicit exclusions: full HR/ERP, payroll, contracts, availability, Big5 profile expansion, direct Paperclip HTTP delivery, ClickUp assignee matching, and future RBAC policy engine.
- Stop conditions: architecture mismatch, permission bypass, missing migration, or UI/API contract drift.
- Handoff expectation: deploy migration, smoke `/areas?area=06-kadry&view=directory`, then connect the queued outbox event to the Paperclip runtime worker in a later scoped task.

## Context
The accepted architecture treats CompanyCore/Roost as the organizational source of truth and Paperclip as an external runtime. Existing `users`, `agents`, `company_roles`, events, capabilities, and selected-area routes were reused rather than bypassed.

## Goal
Deliver a simple but durable V1 foundation for managing people and AI agents in one workforce roster.

## Scope
- Prisma schema and migration for `workforce_entities`.
- Backend workforce service and `/v1/workforce` CRUD/sync API.
- Capability, MCP manifest, and service-key profile updates.
- Owner registration and seed synchronization into workforce entities.
- `06-kadry` selected-area route and React UI.
- Planning/state/architecture documentation updates.

## Implementation Plan
1. Inspect architecture, Prisma schema, existing agent/users APIs, capabilities, and selected-area UI conventions.
2. Add one unified workforce table with enums and workspace scoping.
3. Implement service-layer CRUD, generated markdown resources, and manual sync outbox event.
4. Add UI for list, filters, detail tabs, editing, generated file preview, and sync trigger.
5. Validate builds, schema, static checks, and rendered desktop/mobile UI proof.
6. Update source-of-truth files and record residual risks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Existing `agents` was too narrow for a human/AI workforce source of truth.
- `06-kadry` was present in the department registry but disabled in the active web route set.
- Capabilities and service-key profiles already provided the right future-RBAC extension point.

### 2. Select One Priority Mission Objective
- The owner explicitly switched focus to `06 People & Agents`.
- Other department queue items were deferred because this request creates the required people/agent foundation.

### 3. Plan Implementation
- Use one table for humans and agents.
- Keep humans and agents in one list, with type-specific fields optional.
- Queue Paperclip sync via existing event/outbox patterns instead of direct runtime coupling.

### 4. Execute Implementation
- Added `workforce_entities`, generated markdown files, manual sync event creation, CRUD API, capabilities, seed/backfill, route registry, and a new department UI.

### 5. Verify and Test
- `npm run prisma:generate`: passed.
- `DATABASE_URL=postgresql://companycore:companycore@localhost:5432/companycore?schema=public npx prisma validate`: passed.
- `npm run build:server`: passed.
- `npm run build:web`: passed.
- `npm run validate`: passed.
- `git diff --check`: passed with line-ending warnings only.
- Playwright fallback rendered desktop/mobile `06 People & Agents`, filters, file previews, and manual sync success with no console/page errors or horizontal overflow.

### 6. Self-Review
- Simpler option considered: extend only the existing `agents` table. Rejected because the user requested humans and agents in one source-of-truth roster and the architecture already points to a unified workforce layer.
- Technical debt introduced: partial. Sync currently queues a runtime event but does not deliver to Paperclip directly.
- Scalability assessment: suitable for V1; skills/competencies, rank, capacity, ClickUp account mapping, and RBAC should be future tables/contracts.

### 7. Update Documentation and Knowledge
- Docs updated: this task contract, architecture/project state, task board, module confidence, requirements, risks, next steps, and system health.
- Learning journal updated: not applicable; no new recurring pitfall confirmed.

## Acceptance Criteria
- [x] `workforce_entities` supports humans and AI agents in one workspace-scoped table.
- [x] `/v1/workforce` supports list, detail, create, update, archive, and manual sync.
- [x] Saving an entity regenerates `agent.md`, `personality.md`, and `environment.md`.
- [x] `06 People & Agents` shows avatar, name, type, department, role, status, runtime mode, sync state, search, and filters.
- [x] Detail view supports profile editing, sync tab, and generated files preview.
- [x] Permission and manifest foundations are present for future RBAC.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the rendered UI with mocked API and through compiled backend/API contracts.
- [x] No placeholder-only runtime path was added.
- [x] UI, API, DB schema, validation, and event/sync queue are connected.
- [x] Documentation and state files are updated.
- [ ] Full `npm run test:api` passed locally.

## Validation Evidence
- Tests: API regression coverage added in `src/tests/api.test.ts`, but full `npm run test:api` did not run in this local session because PostgreSQL/Docker validation was unavailable.
- Manual checks: Playwright fallback route proof on desktop and mobile.
- Screenshots/logs: `docs/ux/evidence/people-agents-v1-2026-05-17/desktop.png`, `mobile.png`, and `report.json`.
- Reality status: partially verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes for compiled routes and client contracts; rendered browser proof used a mocked API because the local database service was unavailable.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: yes by Prisma generation and schema validation.
- Loading state verified: yes.
- Error state verified: yes by UI code path and sync-not-enabled handling.
- Refresh/restart behavior verified: not fully; requires migrated DB smoke after deploy.

## Product / Discovery Evidence
- Problem validated: yes, owner requested one roster for physical workers and digital agents.
- Existing pain: people, roles, agents, Paperclip runtime config, and future ClickUp assignment mapping were split across concepts.
- Smallest useful slice: unified roster with editable profile, generated files, and manual sync queue.
- Success signal: owner can open `06 People & Agents`, see self plus agents, edit configuration, preview generated files, and queue Paperclip sync.

## Reliability / Observability Evidence
- `docs/operations/service-reliability-and-observability.md` reviewed: not applicable for a non-deployed local feature slice.
- Critical journey: owner manages a workforce entity and requests sync.
- Rollback or disable path: route can be hidden from active department registry; sync is opt-in per entity through `synchronizationEnabled`.

## AI Testing Evidence
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable for autonomous AI behavior. This slice stores/queues agent configuration only and does not execute agent decisions.
