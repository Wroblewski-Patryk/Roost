# Task

## Header
- ID: CC-04-002
- Title: Operations Work Item Read Model V1
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Depends on: CC-04-001, CC-UI-003, CC-00-002
- Priority: P0
- Coverage Ledger Rows: CompanyCore-04-Operations, Operations Work Items
- Module Confidence Rows: 04 Operations / Work Item Read Packet
- Requirement Rows: REQ-CC-04-002
- Quality Scenario Rows: QA-CC-04-001
- Risk Rows: RISK-CC-04-001
- Iteration: 2026-05-16-CC-04-002
- Operation Mode: BUILDER
- Mission ID: COMPANYCORE-OS-00-04-08-M1
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
- Mission objective: expose existing operational work as a coherent read-only packet without forking task management.
- Release objective advanced: `04 Operations` can supervise work execution from current CompanyCore records before schema expansion.
- Included slices: HTTP endpoint, capability/MCP exposure, API docs, integration assertions, no-mutation proof.
- Explicit exclusions: task writes, assignment writes, checklist/subtask writes, provider execution, schema migrations, UI consumption.
- Checkpoint cadence: one backend/API slice with full API regression.
- Stop conditions: workspace leak, provider mutation, failed migration/test, or duplicated task system.
- Handoff expectation: `CC-08-002` Assets context API can start next; future Operations UI can consume this packet.

## Context
`CC-04-001` established that Operations must reuse the current task, project, list, Company OS workflow, dependency, event, note, resource, Drive, and agent-log foundations. The runtime gap was a protected read model that lets the owner or an AI/MCP client inspect work items with operational context without adding task fields prematurely.

## Goal
Add a protected read-only `GET /v1/operations/work-items` packet that normalizes existing execution evidence for Operations.

## Scope
- `src/modules/operations/operations.routes.ts`
- `src/auth/capabilities.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- Canonical planning and state files updated in the same checkpoint.

## Implementation Plan
1. Inspect current Operations context, task schema, workflow models, dependencies, notes/events, agent logs, Drive evidence, and tests.
2. Add a read-only endpoint over existing records with status/priority/source/limit query support.
3. Expose it through `operations:read` and MCP manifest generation.
4. Extend API regression coverage for packet shape, workspace isolation, no mutation, and blocked actions.
5. Update source-of-truth docs and ledgers.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Operations had context packets for procedures/dependencies, but no task-centered operational work item packet.
- Gaps: no normalized task hierarchy, workflow evidence, readiness, responsibility gaps, or resource/Drive context in one read model.
- Inconsistencies: target task model is richer than current schema, so UI could overclaim missing assignment/time/checklist fields.
- Architecture constraints: read model first; no second task manager; AI remains API/MCP client.

### 1a. Bootstrap Missing Project Knowledge
- Bootstrap needed: no.
- Sources scanned: `cc-04-001` audit, Prisma schema, Operations route, API tests, API docs, capability manifest.
- Rows created or corrected: state rows updated after implementation.
- Assumptions recorded: missing owner/agent/reviewer/time fields must be represented as `null` or `not_modeled`, not faked.
- Blocking unknowns: none.
- Why it was safe to continue: existing records already provide enough evidence for a read-only v1 packet.

### 2. Select One Priority Mission Objective
- Selected task: CC-04-002.
- Priority rationale: Operations execution is the second leg of the owner-approved `00 -> 04 -> 08` loop.
- Why other candidates were deferred: Assets follows after the work execution packet.

### 3. Plan Implementation
- Files or surfaces to modify: listed in Scope.
- Logic: fetch workspace tasks with hierarchy; join task dependencies, pipeline runs, stage/procedure context, notes, events, agent-log evidence, project resources, and Operations Drive context.
- Edge cases: missing project/list/responsibility/time fields, blocked dependencies, workspace isolation, empty Operations Drive area, no mutation on read.

### 4. Execute Implementation
- Implementation notes: reused `operations:read`, current task/workflow/resource tables, and MCP manifest generation. No migration or new task system was added.

### 5. Verify and Test
- Validation performed: `npm run build:server`; `npm run test:api` with disposable PostgreSQL on `127.0.0.1:55499`.
- Result: passed. Validation-owned PostgreSQL was stopped and port `55499` closed.

### 6. Self-Review
- Simpler option considered: return tasks only. Rejected because it would not expose execution readiness, workflow evidence, dependency risk, or source/resource context.
- Technical debt introduced: no.
- Scalability assessment: v1 uses bounded query limits and in-memory joins over limited recent workflow/log evidence; future normalized relations can replace the inference without breaking the packet intent.
- Refinements made: explicit blocked actions and missing-field reporting prevent UI/agent overclaiming.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/API.md`, this task contract, planning/state files.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `GET /v1/operations/work-items` is exposed under `operations:read`.
- [x] Response includes task core, hierarchy, operational context, readiness, evidence, Operations knowledge, summary, and read-only agent packet.
- [x] Missing target fields are explicit as `null`, `not_modeled`, or readiness gaps.
- [x] Endpoint does not mutate tasks, dependencies, pipeline runs, notes, events, agent logs, Drive files, providers, or procedures.
- [x] API tests prove workspace isolation and MCP read-risk exposure.

## Success Signal
- User or operator problem: Operations work can be scanned as executable work without switching across raw tables.
- Expected product or reliability outcome: future `04 Operations` UI can be built from one safe read packet.
- How success will be observed: API/MCP clients can fetch task-centered Operations evidence through `operations:read`.
- Post-launch learning needed: yes, after the UI consumes the packet.

## Deliverable For This Stage
Verified read-only Operations work item API and durable source-of-truth evidence.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works manually through the real API test path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across tasks, hierarchy, workflow evidence, dependencies, notes/events, agent logs, resources, Drive context, and MCP manifest.
- [x] Backend error handling exists through existing validation/auth wrappers.
- [x] No existing functionality is broken.
- [x] Feature works after fresh migration and test process start.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests: `npm run build:server`; `npm run test:api` on disposable PostgreSQL `127.0.0.1:55499`.
- Manual checks: validation-owned PostgreSQL was stopped and port `55499` was closed after tests.
- High-risk checks: route is read-only, capability-scoped, workspace-scoped, and MCP risk is `read`.
- Module confidence ledger updated: yes.
- Requirements matrix updated: yes.
- Quality scenarios updated: yes.
- Risk register updated: yes.
- Reality status: verified.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: yes, fresh API test database migrated before tests.
- Loading state verified: not applicable.
- Error state verified: validation schema and existing auth wrappers covered by API suite.
- Refresh/restart behavior verified: yes, test process built and started against fresh migrated database.
- Regression check performed: protected API flow passed.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes.
- Data classification: workspace-scoped operational metadata, work item evidence, task hierarchy, workflow evidence, resource/Drive metadata.
- Trust boundaries: API/MCP clients call CompanyCore HTTP routes; no direct DB/provider access.
- Permission or ownership checks: existing auth plus workspace-scoped filters.
- Abuse cases: assignment, checklist/subtask, task status write, workflow mutation, and provider execution remain blocked.
- Secret handling: route does not expose provider secrets, API keys, password hashes, or raw stack traces.
- Fail-closed behavior: endpoint requires auth and `operations:read` for service clients.
- Residual risk: UI must preserve missing-field and blocked-action language.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/autonomous-company-operating-system.md`, `docs/planning/cc-04-001-operations-task-model-gap-audit.md`.
- Fits approved architecture: yes.
- Mismatch discovered: no.
- Decision required from user: no.
- Follow-up architecture doc updates: no architecture change; API/state updated.

## Deployment / Ops Evidence
- Deploy impact: low.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: not required for route-only local slice.
- Rollback note: remove route registration, handler, docs, and test assertions if rollback is needed.
- Observability or alerting impact: none.
- `DEPLOYMENT_GATE.md` reviewed: yes.

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was completed in this iteration.
- [x] Current stage is declared and respected.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.
- [x] Relevant validations were run.
- [x] Docs or context were updated if repository truth changed.

## Result Report
- Task summary: added verified read-only Operations work item packet API.
- Files changed: `src/modules/operations/operations.routes.ts`, `src/auth/capabilities.ts`, `src/tests/api.test.ts`, `docs/API.md`, source-of-truth state files.
- How tested: `npm run build:server`; `npm run test:api` on disposable PostgreSQL.
- What is incomplete: UI consumption and write commands remain future tasks.
- Next steps: continue to `CC-08-002` Assets context read API.
- Decisions made: work item packet remains read-only under `operations:read`; assignment/time/checklist gaps are explicit, not faked.
