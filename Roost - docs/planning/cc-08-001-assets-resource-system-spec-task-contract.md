# Task

## Header
- ID: CC-08-001
- Title: Assets Resource System Spec
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Product Docs + Backend Builder + Frontend Builder
- Depends on: `CC-UI-001`
- Priority: P0
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `CC-08-001`
- Requirement Rows: `REQ-CC-08-001`
- Quality Scenario Rows: `QA-CC-08-001`
- Risk Rows: `RISK-CC-08-001`
- Iteration: 1
- Operation Mode: BUILDER
- Mission ID: CC-LOOP-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: define the first `08 Assets` system over existing resource/Drive foundations.
- Release objective advanced: prepare the organizational memory module without duplicating provider storage.
- Included slices: inspect current Google Drive/resource/knowledge foundations and write the Assets board/API spec.
- Explicit exclusions: new provider integration, schema migration, API implementation, UI implementation.
- Checkpoint cadence: one planning checkpoint.
- Stop conditions: need for new storage architecture or unsafe provider-write scope.
- Handoff expectation: next task can implement a read-only Assets context packet.

## Context

The owner requested `08 Assets` after `00 Main` and `04 Operations`. Assets
should store files, documents, knowledge, prompts, architecture, repositories,
and organizational materials while staying AI-compatible through API/MCP.

## Goal

Define the first Assets/resource system spec using existing foundations.

## Scope

- `src/modules/google-drive/google-drive.routes.ts`
- `prisma/schema.prisma` resource and Drive models
- `web/src/main.tsx` knowledge/data surfaces
- `docs/planning/cc-08-001-assets-resource-system-spec.md`
- planning/state files

## Implementation Plan

1. Inspect current Drive/resource/knowledge surfaces.
2. Define resource taxonomy and AI-readiness labels.
3. Define first web board, blocked actions, and agent packet.
4. Update planning and state evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Assets concepts exist across Drive, Resource, knowledge, and data views but are not yet one `08 Assets` board.
- Gaps: AI readiness labels, resource detail, folder/resource explorer, and read packet are not first-class.
- Inconsistencies: Google Drive is strong, but generic Resource is not yet the visible owner-facing memory model.
- Architecture constraints: do not duplicate Google Drive; use existing Drive/resource foundations.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: Google Drive route, Prisma schema, current knowledge/data UI surfaces.
- Rows created or corrected: requirement, quality, risk, and module confidence rows.
- Assumptions recorded: first runtime step is a read-only Assets context API.
- Blocking unknowns: exact future write commands remain deferred.
- Why it was safe to continue: planning-only task.

### 2. Select One Priority Mission Objective
- Selected task: `CC-08-001`.
- Priority rationale: Assets is the next owner-requested module after `00` and `04`.
- Why other candidates were deferred: runtime board needs API/shared component preparation.

### 3. Plan Implementation
- Files or surfaces to modify: docs/state only.
- Logic: define board zones, taxonomy, readiness labels, blocked actions, and agent packet.
- Edge cases: provider writes, private documents, legal/commercial resources, and sync scope expansion.

### 4. Execute Implementation
- Implementation notes: added Assets resource system spec and next runtime API task.

### 5. Verify and Test
- Validation performed: `git diff --check`.
- Result: passed.

### 6. Self-Review
- Simpler option considered: jump directly to a Drive explorer UI.
- Technical debt introduced: no.
- Scalability assessment: spec keeps Drive as a provider-backed source while allowing generic resources.
- Refinements made: made AI readiness explicitly compatibility-only, not embedded AI.

### 7. Update Documentation and Knowledge
- Docs updated: Assets spec and state docs.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] First Assets board is defined for desktop, tablet, and mobile.
- [x] Resource taxonomy and AI-readiness labels are documented.
- [x] Agent packet and blocked actions preserve API/MCP client boundary.

## Success Signal
- User or operator problem: organizational memory becomes usable without provider clutter.
- Expected product or reliability outcome: clear first Assets implementation path.
- How success will be observed: future `CC-08-002` can build the read API from existing sources.
- Post-launch learning needed: yes.

## Deliverable For This Stage

Assets/resource planning spec.

## Definition of Done
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Stage Exit Criteria
- [x] The output matches the declared `Current Stage`.
- [x] Work from later stages was not mixed in without explicit approval.
- [x] Risks and assumptions for this stage are stated clearly.

## Validation Evidence
- Tests: `git diff --check`.
- Manual checks: Drive/resource/knowledge source inspection.
- Screenshots/logs: not applicable.
- High-risk checks: no provider write behavior changed.
- Module confidence ledger updated: yes.
- Module confidence rows closed or changed: `CC-08-001`.
- Requirements matrix updated: yes.
- Requirement rows closed or changed: `REQ-CC-08-001`.
- Quality scenarios updated: yes.
- Quality scenario rows closed or changed: `QA-CC-08-001`.
- Risk register updated: yes.
- Risk rows closed or changed: `RISK-CC-08-001`.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: planning based on existing source.
- Endpoint and client contract match: not applicable.
- DB schema and migrations verified: not applicable.
- Loading state verified: not applicable.
- Error state verified: not applicable.
- Refresh/restart behavior verified: not applicable.
- Regression check performed: docs-only diff check.

## AI Testing Evidence (required for AI features)
- `AI_TESTING_PROTOCOL.md` reviewed: not applicable; no AI feature implemented.
