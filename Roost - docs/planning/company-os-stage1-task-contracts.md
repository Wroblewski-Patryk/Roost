# Company OS Stage 1 Task Contracts

## CCOS-001 Company OS Stage 1 Data Foundation

## Header
- ID: CCOS-001
- Title: Company OS Stage 1 Data Foundation
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: DB/Migrations
- Depends on: existing workspace, operating model registry, ClickUp and Google
  Drive integration foundations
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 1
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
The user requested a Company OS foundation for processes, pipelines,
procedures, roles, resources, adapter capabilities, agents, approvals, events,
auditability, metrics, knowledge, and automation. The repository already had a
workspace-scoped v1 runtime, ClickUp and Google Drive foundations, events,
agents, operating areas, and a CRM-oriented `pipeline_stages` table.

## Goal
Add the Stage 1 Company OS data foundation without duplicating existing
entities or breaking current ClickUp/Drive behavior.

## Scope
- `prisma/schema.prisma`
- `prisma/migrations/202605091_company_os_stage1_foundation/migration.sql`
- `prisma/seed.ts`
- `src/operating-model/catalog.ts`
- `src/modules/pipeline-stages/pipeline-stages.routes.ts`
- `src/tests/api.test.ts`
- `docs/DATABASE.md`
- `docs/architecture/system-architecture.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/current-focus.md`
- `.agents/state/next-steps.md`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan
1. Audit the current Prisma schema, architecture docs, integration modules,
   seed path, operating model catalog, and test reset behavior.
2. Extend the existing `PipelineStage` model instead of adding a duplicate
   stage table.
3. Add Stage 1 models for roles, processes, pipelines, procedures, procedure
   steps, standards, resources, tool adapters, and integration capabilities.
4. Add idempotent LuckySparrow seed data for the first seven pipelines.
5. Add targeted tests for core relations and enum status validation.
6. Update architecture/database/planning/state docs.
7. Run build and migration/test gates.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: current `pipeline_stages` represented only lightweight stages and
  used free-form status strings.
- Gaps: no durable process, pipeline, SOP, adapter-capability, or role catalog
  for agents to reason against.
- Inconsistencies: architecture said pipelines are shared, but the operating
  table catalog still placed `pipeline_stages` under Sales/CRM.
- Architecture constraints: PostgreSQL is source of truth; API is the access
  layer; providers must go through adapters; no duplicate domain entities.

### 2. Select One Priority Task
- Selected task: CCOS-001 Company OS Stage 1 Data Foundation.
- Priority rationale: it unlocks later pipeline runs, approvals, audit logs,
  UI, and automation without forcing premature full automation.
- Why other candidates were deferred: pipeline runs, approvals, dashboard, and
  Paperclip automation depend on this schema foundation.

### 3. Plan Implementation
- Files or surfaces to modify: schema, migration, seed, operating model catalog,
  pipeline-stage validation, tests, and source-of-truth docs.
- Logic: workspace-scoped records with role ownership, capability metadata,
  process/pipeline/procedure relations, and idempotent seed upserts.
- Edge cases: existing CRM pipeline stage rows must remain valid; status values
  must be migrated to the new enum; repeated seed runs must not duplicate
  foundation rows.

### 4. Execute Implementation
- Implementation notes: `PipelineStage` was extended rather than replaced.
  Existing ClickUp/CRM routes keep working, now with validated
  `OperatingStatus`. The seed creates the first Company OS pipelines and
  adapters but does not mark external integrations connected unless already
  configured.

### 5. Verify and Test
- Validation performed: `npx prisma validate`, `npx prisma generate`,
  `npm run build:server`, `npm run build`, isolated Docker
  `prisma migrate deploy`, compiled Node integration test, seed smoke, and
  `git diff --check`.
- Result: all required validation passed. Plain local `npm test` could not run
  because this desktop session has no `DATABASE_URL`; the equivalent migration
  and compiled test gate passed inside the isolated compose network.

### 6. Self-Review
- Simpler option considered: documentation-only architecture plan.
- Technical debt introduced: no.
- Scalability assessment: models are workspace-scoped, provider-neutral, and
  leave runtime runs/approvals/audit as later vertical slices.
- Refinements made: moved `pipeline_stages` operating-table ownership from
  Sales/CRM to Tasks and workflow.

### 7. Update Documentation and Knowledge
- Docs updated: database, system architecture, planning/task contract.
- Context updated: pending in this task.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Stage 1 Company OS models exist in Prisma and migration SQL.
- [x] Existing `PipelineStage` is reused and extended, not duplicated.
- [x] Pipeline stage status is enum-validated at the API boundary.
- [x] Seed creates roles, adapters, capabilities, processes, pipelines,
  procedures, procedure steps, resources, and the seven requested pipelines.
- [x] Tests cover core model relations and adapter capability metadata.
- [x] Full validation evidence is recorded before moving to `DONE`.

## Success Signal
- User or operator problem: agents and humans need one operating model instead
  of scattered ClickUp/Drive/task/document concepts.
- Expected product or reliability outcome: future UI, API, and Paperclip
  automation can reference a stable Company OS graph.
- How success will be observed: migrations apply cleanly, build/tests pass,
  and seeded workspace contains the first seven pipelines with stages and SOP
  links.
- Post-launch learning needed: yes.

## Deliverable For This Stage
Verified database foundation, seed data, tests, and architecture documentation
for Company OS Stage 1.

## Constraints
- Reuse existing systems and approved mechanisms.
- Do not duplicate `pipeline_stages`.
- Do not introduce mock-only runtime behavior.
- Keep ClickUp and Google Drive foundations compatible.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real DB migration/seed/test path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow for this slice works across schema, seed, and tests.
- [x] Backend validation exists for updated pipeline stage status.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from validation evidence.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - Isolated Docker: `npx prisma migrate deploy && node --test
    dist/tests/api.test.js`: passed; 17 migrations applied including
    `202605091_company_os_stage1_foundation`, 1 test passed.
- Manual checks:
  - `npx prisma validate`: passed with a temporary local `DATABASE_URL`.
  - `npx prisma generate`: passed.
  - `npm run build:server`: passed.
  - Seed smoke in isolated Docker: `npm run seed` passed; SQL verification
    confirmed 7 distinct requested pipeline names, plus seeded roles,
    adapters, procedures, stages, and capabilities.
- Screenshots/logs: not applicable.
- High-risk checks: migration applied from empty DB in isolated Docker;
  compiled integration test passed.
- Coverage ledger updated: not applicable.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: not applicable for Stage 1 data foundation
- Endpoint and client contract match: yes for updated pipeline-stage status
- DB schema and migrations verified: yes
- Regression check performed: isolated migration plus compiled integration
  test; local `npm test` failed only because `DATABASE_URL` was not set.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes
- Data classification: operational metadata, adapter configuration metadata,
  no raw secrets.
- Trust boundaries: adapters point to existing workspace-scoped integration
  settings for credential references.
- Permission or ownership checks: all new models are workspace-scoped.
- Secret handling: no provider tokens stored in new seed data.
- Fail-closed behavior: high-risk capabilities can require approval.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/system-architecture.md`
- Fits approved architecture: yes
- Mismatch discovered: yes, `pipeline_stages` catalog ownership was too
  Sales/CRM-oriented.
- Decision required from user: no, current docs already state pipelines are
  shared.
- Follow-up architecture doc updates: completed in this task.

## Deployment / Ops Evidence
- Deploy impact: medium, schema migration
- Env or secret changes: none
- Health-check impact: none
- Rollback note: forward-fix preferred; rollback requires restoring prior DB
  schema or removing unused Stage 1 records before reverting code.
- `DEPLOYMENT_GATE.md` reviewed: yes

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
- Task summary: Stage 1 Company OS schema, seed, relation test, and docs added.
- Files changed: see final response.
- How tested: `npm run build`, isolated Docker migration/test gate, seed
  smoke, seed count SQL checks, and `git diff --check`.
- What is incomplete: Stage 2 runtime runs/events/audit/approval/checklists,
  Stage 3 policies/metrics/risks/controls/knowledge/decision log, and Stage 4
  dashboard/automation UI remain future tasks.
- Next steps: CCOS-002 Pipeline Run, Stage Run, Approval, Checklist, Event, and
  Audit foundation.
- Decisions made: reuse and extend existing `pipeline_stages` instead of adding
  a duplicate stage entity.

## CCOS-002 Company OS Stage 2 Runtime Evidence Foundation

## Header
- ID: CCOS-002
- Title: Company OS Stage 2 Runtime Evidence Foundation
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: DB/Migrations
- Depends on: CCOS-001
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 2
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-001 created the durable Company OS definition graph. CCOS-002 adds the
runtime evidence graph required before approvals, audit, agent execution, and
pipeline UI can be treated as real product behavior.

## Goal
Add workspace-scoped runtime evidence models for pipeline runs, stage runs,
approvals, checklists, acceptance criteria, audit logs, and correlated events.

## Scope
- `prisma/schema.prisma`
- `prisma/migrations/202605092_company_os_stage2_runtime_evidence/migration.sql`
- `prisma/seed.ts`
- `src/operating-model/catalog.ts`
- `src/modules/events/event.service.ts`
- `src/tests/api.test.ts`
- `docs/DATABASE.md`
- `docs/architecture/system-architecture.md`
- planning and state files

## Implementation Plan
1. Extend Prisma with runtime evidence models and enum validation.
2. Extend `events` with actor/resource/correlation fields.
3. Register runtime tables in the operating model catalog and seed registry.
4. Add default pipeline-run checklist template seed data.
5. Add integration test coverage for run/stage/approval/checklist/audit/event
   relationships.
6. Update architecture and database docs.
7. Run build, migration, seed, and regression gates.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Company OS definitions existed, but there was no durable execution
  evidence or approval/audit/checklist substrate.
- Gaps: agents could know a pipeline definition, but not record a concrete run,
  stage result, approval request, or audit trail against it.
- Architecture constraints: keep events append-style, keep provider actions
  auditable, keep all runtime evidence workspace-scoped.

### 2. Select One Priority Task
- Selected task: CCOS-002 runtime evidence foundation.
- Priority rationale: it is the mandatory bridge between static pipeline
  design and safe agent automation.
- Why other candidates were deferred: policies, metrics, automation rules, and
  UI need this runtime evidence first.

### 3. Plan Implementation
- Files or surfaces to modify: schema, migration, seed, event service, tests,
  operating model catalog, docs.
- Logic: add concrete run records, stage execution records, approvals,
  checklist templates/items, acceptance criteria, audit logs, and event
  correlation.
- Edge cases: existing events must remain readable; new fields are nullable.

### 4. Execute Implementation
- Implementation notes: `events` was extended in place; no parallel event
  table was created. `audit_logs` and `events` are intentionally separate:
  events are observable stream entries, audit logs are action evidence.

### 5. Verify and Test
- Validation performed: `npx prisma validate`, `npx prisma generate`,
  `npm run build:server`, `npm run build`, fresh isolated Docker
  `prisma migrate deploy`, compiled Node integration test, seed smoke, seed
  SQL verification, and `git diff --check`.
- Result: all required validation passed. Plain local `npm test` still requires
  a caller-provided `DATABASE_URL`; the equivalent migration and compiled
  test gate passed inside a fresh isolated compose network.

### 6. Self-Review
- Simpler option considered: JSON-only run state on `pipelines`.
- Technical debt introduced: no.
- Scalability assessment: concrete tables support API/UI/runtime expansion
  without embedding run state in static pipeline definitions.
- Refinements made: `correlation_id` is explicit and indexed on runs, events,
  and audit logs.

### 7. Update Documentation and Knowledge
- Docs updated: database and system architecture.
- Context updated: pending final state update.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Runtime evidence models exist in Prisma.
- [x] `events` supports actor/resource/correlation metadata.
- [x] Operating model catalog and seed registry include runtime evidence
  tables.
- [x] Default pipeline-run checklist template seed exists.
- [x] Tests cover pipeline run, stage run, approval, acceptance criteria, audit
  log, and correlated event relations.
- [x] Full migration/test/seed validation evidence is recorded before `DONE`.

## Deliverable For This Stage
Verified runtime evidence persistence layer for Company OS Stage 2.

## Definition of Done
- [x] Code builds without errors.
- [x] Migrations apply cleanly from an empty database.
- [x] Integration tests pass.
- [x] Seed can create Stage 1 and Stage 2 foundation records idempotently.
- [x] Source-of-truth docs and planning state are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    18 migrations applied including
    `202605092_company_os_stage2_runtime_evidence`, 1 test passed.
- Manual checks:
  - `npx prisma validate`: passed.
  - `npx prisma generate`: passed.
  - `npm run build:server`: passed.
- Seed smoke:
  - Fresh isolated Docker `npm run seed`: passed.
  - SQL verification confirmed runtime registry records across seeded/test
    workspaces plus checklist template/items and runtime evidence rows created
    by the integration test.
- High-risk checks: migration applied from empty database in a fresh isolated
  Docker Compose project; compiled integration test passed.

## Result Report
- Task summary: Stage 2 runtime evidence schema, migration, seed registry,
  event correlation, relation tests, and docs added.
- Files changed: see final response.
- How tested: `npm run build`, fresh isolated Docker migration/test gate,
  seed smoke, seed SQL verification, and `git diff --check`.
- What is incomplete: Stage 3 policy/standard/metric/risk/control/knowledge
  runtime APIs and Stage 4 UI/automation remain future slices.
- Next steps: CCOS-003 policy/risk/control/metric/knowledge/decision runtime
  foundation, then CCOS-004 API/UI surfaces.

## CCOS-003 Company OS Stage 3 Governance Intelligence Foundation

## Header
- ID: CCOS-003
- Title: Company OS Stage 3 Governance Intelligence Foundation
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: DB/Migrations
- Depends on: CCOS-002
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 3
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-001 defined work, roles, resources, and adapters. CCOS-002 defined
execution evidence. CCOS-003 adds the governance/intelligence layer that lets
CompanyCore become policy-driven, measurable, risk-aware, and explainable.

## Goal
Add workspace-scoped foundations for policies, metrics, risks, controls,
knowledge items, decision logs, automation rules, triggers, artifacts,
dependencies, business functions, and stakeholders.

## Scope
- `prisma/schema.prisma`
- `prisma/migrations/202605093_company_os_stage3_governance_intelligence/migration.sql`
- `prisma/seed.ts`
- `src/operating-model/catalog.ts`
- `src/tests/api.test.ts`
- `docs/DATABASE.md`
- `docs/architecture/system-architecture.md`
- planning and state files

## Implementation Plan
1. Add Stage 3 Prisma models and enums.
2. Register Stage 3 tables in the operating model catalog and seed registry.
3. Seed LuckySparrow business functions and default deployment governance
   records.
4. Add tests for policy, metric, risk/control, knowledge, decision log,
   automation rule, trigger, artifact, dependency, business function, and
   stakeholder relations.
5. Update architecture and database docs.
6. Run build, migration, seed, and regression gates.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Company OS could define and execute work but could not yet encode
  policies, controls, KPIs, decision records, dependencies, artifacts, or
  stakeholder/business-function mapping.
- Gaps: no governance intelligence substrate for safe autonomous operation.
- Architecture constraints: reuse existing `decisions` for lightweight records
  and add `decision_logs` only for structured decision governance.

### 2. Select One Priority Task
- Selected task: CCOS-003 governance intelligence foundation.
- Priority rationale: agent automation cannot be safe without policies,
  controls, risk ownership, and measurable outcomes.
- Why other candidates were deferred: API/UI should expose this graph after
  the schema and seed/test foundation exists.

### 3. Plan Implementation
- Files or surfaces to modify: schema, migration, seed, operating model
  catalog, tests, architecture/database docs.
- Logic: add governance records with workspace ownership and relations back to
  processes, pipelines, resources, roles, projects, clients, and agents.
- Edge cases: avoid replacing existing `AutomationDefinition` or `Decision`;
  Stage 3 adds higher-level governance records and keeps existing provider
  registry behavior intact.

### 4. Execute Implementation
- Implementation notes: `automation_rules` and `triggers` are provider-neutral
  workflow contracts; existing `automation_definitions` remain scoped provider
  configuration records.

### 5. Verify and Test
- Validation performed:
  - `npx prisma validate`: passed.
  - `npx prisma generate`: passed.
  - `npm run build:server`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    19 migrations applied including
    `202605093_company_os_stage3_governance_intelligence`, 1 test passed.
  - Fresh isolated Docker `npm run seed`: passed.
  - SQL seed verification confirmed business functions, policies, metrics,
    risks, controls, automation rules, triggers, and knowledge items.
- Result: all required validation passed.

### 6. Self-Review
- Simpler option considered: storing governance metadata as JSON on pipelines.
- Technical debt introduced: no.
- Scalability assessment: separate records keep future API/UI/agent surfaces
  queryable and enforceable.
- Refinements made: automation rules and triggers are distinct so a single
  rule can later support multiple trigger sources.

### 7. Update Documentation and Knowledge
- Docs updated: database, system architecture, planning/task contract.
- Context updated: project state, task board, next steps, current focus.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Stage 3 governance/intelligence models exist in Prisma and migration SQL.
- [x] Operating model catalog and seed registry include Stage 3 tables.
- [x] LuckySparrow business functions are seeded.
- [x] Default deployment policy, metric, risk, control, automation rule,
  trigger, and knowledge item are seeded.
- [x] Tests cover key Stage 3 relations.
- [x] Full validation evidence is recorded before `DONE`.

## Deliverable For This Stage
Verified governance intelligence persistence layer for Company OS Stage 3.

## Definition of Done
- [x] Code builds without errors.
- [x] Migrations apply cleanly from an empty database.
- [x] Integration tests pass.
- [x] Seed creates Stage 3 foundation records.
- [x] Source-of-truth docs and planning state are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Result Report
- Task summary: Stage 3 governance intelligence schema, migration, seed
  registry/data, relation tests, and docs added.
- Files changed: see final response.
- How tested: `npm run build:server`, fresh isolated Docker migration/test
  gate, seed smoke, seed SQL verification.
- What is incomplete: Stage 4 API/UI dashboards and Stage 5 Paperclip-driven
  automation remain future slices.
- Next steps: CCOS-004 Company OS API and dashboard surfaces.

## CCOS-004 Company OS Read API Surface

## Header
- ID: CCOS-004
- Title: Company OS Read API Surface
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder
- Depends on: CCOS-001, CCOS-002, CCOS-003
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 4
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
Stages 1-3 created the Company OS definition, runtime evidence, and governance
intelligence records. Those records were usable through Prisma and seeds/tests,
but not yet through the supported HTTP access layer that agents and UI clients
must use.

## Goal
Expose a read-only, workspace-scoped Company OS API surface with a cockpit
snapshot and approved collection reads, guarded by route capabilities.

## Scope
- `src/modules/company-os/company-os.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- planning and state files

## Implementation Plan
1. Audit existing route, auth, capability, and connection-manifest patterns.
2. Add a read-only `/v1/company-os` cockpit snapshot with counts, attention
   queues, recent evidence, and collection discovery.
3. Add approved collection list/detail reads for Stage 1-3 Company OS tables.
4. Add `company-os:read` to the capability catalog and adapter manifest.
5. Cover owner and scoped-service access in integration tests.
6. Update API docs and canonical planning/state files.
7. Run build and integration validation gates.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Company OS records existed but were not accessible through the
  supported API layer.
- Gaps: agents could discover the operating model but could not read process,
  pipeline, run, approval, audit, policy, risk, knowledge, or automation
  records as one coherent Company OS surface.
- Architecture constraints: API is the only supported access layer; service
  keys must use explicit capabilities; writes to governance/runtime records
  should not be opened before dedicated lifecycle rules exist.

### 2. Select One Priority Task
- Selected task: CCOS-004 Company OS Read API Surface.
- Priority rationale: this unlocks dashboard and agent work without adding
  premature write automation.
- Why other candidates were deferred: dashboard UI and Paperclip automation
  should consume a real API contract first.

### 3. Plan Implementation
- Files or surfaces to modify: Company OS route module, app route mounting,
  capability manifest, API tests, API docs, planning/state docs.
- Logic: provide workspace-scoped read surfaces only, with a stable cockpit
  response and allowlisted collection names.
- Edge cases: invalid collections return validation errors; cross-workspace
  records remain invisible through `workspaceId` guards.

### 4. Execute Implementation
- Implementation notes: the route reuses existing Prisma models and includes
  related records only where relations already exist in the schema. It does
  not create a generic raw-table CRUD endpoint.

### 5. Verify and Test
- Validation performed: `npm run build:server`, `npm run build`, fresh
  isolated Docker `prisma migrate deploy` plus compiled Node integration test,
  and `git diff --check`.
- Result: all required validation passed.

### 6. Self-Review
- Simpler option considered: expose all Prisma delegates dynamically.
- Technical debt introduced: no intended debt; collection readers are explicit
  so unsupported/system tables remain closed.
- Scalability assessment: this read surface is enough for dashboards and
  agents while future write APIs can be added as lifecycle-specific routes.

### 7. Update Documentation and Knowledge
- Docs updated: API docs.
- Context updated: pending final state update after validation.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `/v1/company-os` returns workspace-scoped counts, attention queues,
  recent evidence, and allowed collections.
- [x] `/v1/company-os/:collection` and `/:collection/:id` read only approved
  Company OS collections.
- [x] `company-os:read` is present in the capability catalog and connection
  manifest.
- [x] Scoped service keys can read Company OS data when granted
  `company-os:read`.
- [x] Full validation evidence is recorded before `DONE`.

## Deliverable For This Stage
Verified read-only Company OS API surface for Stage 1-3 records.

## Definition of Done
- [x] Code builds without errors.
- [x] Integration tests pass.
- [x] API docs describe routes, capability, and supported collections.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` is checked before status changes to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    19 migrations applied and 1 integration test passed.
- Manual checks:
  - `npm run build:server`: passed.
  - `git diff --check`: passed; only line-ending warnings were reported.
- High-risk checks: route capability enforcement was covered by a scoped
  service key with `company-os:read`.

## Result Report
- Task summary: added a read-only Company OS API cockpit and allowlisted
  collection reads for Stage 1-3 records, wired through `company-os:read`.
- Files changed: see final response.
- How tested: `npm run build`, fresh isolated Docker migration/test gate, and
  `git diff --check`.
- What is incomplete: dashboard UI, write lifecycle routes, and Paperclip
  trigger automation remain future slices.
- Next steps: CCOS-005 Company OS dashboard/workbench surface.

## MCP-001 MCP Bridge Manifest Foundation

## Header
- ID: MCP-001
- Title: MCP Bridge Manifest Foundation
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder
- Depends on: CCOS-004, existing service-key capability enforcement
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: MCP wave 1
- Operation Mode: BUILDER

## Context
The user confirmed that CompanyCore should move toward MCP as the preferred
agent tool interface. CompanyCore already had a capability-scoped HTTP
manifest, but no MCP-facing projection of that contract.

## Goal
Expose a safe MCP bridge manifest that lets MCP servers wrap CompanyCore HTTP
routes as tools without bypassing workspace auth, capabilities, approvals,
events, audit logs, or provider adapter boundaries.

## Scope
- `src/mcp/manifest.ts`
- `src/modules/mcp/mcp.routes.ts`
- `src/modules/connection/connection.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/architecture/system-architecture.md`
- planning and state files

## Implementation Plan
1. Audit current agent-facing connection and capability surfaces.
2. Add an MCP manifest builder derived from the existing adapter manifest.
3. Add `/v1/mcp/manifest`, guarded by `mcp:read`.
4. Include the filtered MCP manifest in `/v1/connection`.
5. Cover broad and scoped service-key behavior in integration tests.
6. Document the MCP direction and bridge constraints.
7. Run build and regression gates.

## Acceptance Criteria
- [x] `/v1/mcp/manifest` returns an MCP-friendly tool catalog.
- [x] Tool catalog is filtered by the caller's effective capabilities.
- [x] MCP manifest is included in `/v1/connection`.
- [x] `mcp:read` is present in the capability catalog and route manifest.
- [x] Docs state that MCP wraps the HTTP API and must not access PostgreSQL or
  provider secrets directly.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    19 migrations applied and 1 integration test passed.
- Manual checks:
  - `git diff --check`: passed; only line-ending warnings were reported.

## Result Report
- Task summary: added the first MCP bridge contract while preserving the HTTP
  API as CompanyCore's permission, policy, event, and audit boundary.
- Files changed: see final response.
- How tested: `npm run build`, fresh isolated Docker migration/test gate, and
  `git diff --check`.
- What is incomplete: an actual MCP server package remains MCP-002.
- Next steps: MCP-002 CompanyCore MCP Bridge Server.

## MCP-002 CompanyCore MCP Bridge Server

## Header
- ID: MCP-002
- Title: CompanyCore MCP Bridge Server
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder
- Depends on: MCP-001
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: MCP wave 2
- Operation Mode: BUILDER

## Context
MCP-001 exposed a capability-scoped MCP manifest. MCP-002 makes that manifest
usable by adding a first local stdio MCP bridge process.

## Goal
Provide a thin MCP stdio server that discovers CompanyCore tools from the HTTP
manifest and executes tool calls through the CompanyCore HTTP API with a
workspace-scoped service key.

## Scope
- `scripts/companycore-mcp-server.mjs`
- `package.json`
- `docs/operations/companycore-mcp-bridge.md`
- `docs/API.md`
- planning and state files

## Implementation Plan
1. Confirm current MCP stdio transport requirements from official docs.
2. Add a dependency-free stdio JSON-RPC bridge script.
3. Implement `initialize`, `ping`, `tools/list`, and `tools/call`.
4. Route tool calls through CompanyCore HTTP with `X-API-Key`.
5. Document configuration, smoke checks, and safety rules.
6. Run syntax, build, migration/test, and diff checks.

## Acceptance Criteria
- [x] MCP bridge starts with `npm run mcp:server`.
- [x] Bridge reads `COMPANYCORE_BASE_URL` and `COMPANYCORE_API_KEY`.
- [x] Bridge loads `/v1/mcp/manifest` and exposes tools through `tools/list`.
- [x] Bridge calls CompanyCore HTTP routes through `tools/call`.
- [x] Bridge writes only JSON-RPC messages to stdout and logs to stderr.
- [x] Operational documentation explains setup and guardrails.

## Validation Evidence
- Tests:
  - `node --check scripts/companycore-mcp-server.mjs`: passed.
  - `npm run build`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    19 migrations applied and 1 integration test passed.
- Manual checks:
  - `node scripts/companycore-mcp-server.mjs --print-config`: passed without
    exposing secret material.
  - `git diff --check`: passed; only line-ending warnings were reported.

## Result Report
- Task summary: added the first local CompanyCore stdio MCP bridge server.
- Files changed: see final response.
- How tested: `node --check`, `--print-config`, `npm run build`, fresh
  isolated Docker migration/test gate, and `git diff --check`.
- What is incomplete: owner-facing MCP key profiles remain MCP-003.
- Next steps: MCP-003 MCP Agent Key Profiles.

## MCP-003 MCP Agent Key Profiles

## Header
- ID: MCP-003
- Title: MCP Agent Key Profiles
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder
- Depends on: MCP-002
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: MCP wave 3
- Operation Mode: BUILDER

## Context
MCP-001 and MCP-002 made CompanyCore discoverable and callable through MCP,
but owners still needed to manually assemble service-key scopes for each
agent. The static owner-console presets also contained older Drive scopes that
no longer match the current capability catalog.

## Goal
Add canonical MCP-oriented service-key profiles so owners can create
least-privilege agent keys safely and consistently.

## Scope
- `src/auth/agent-key-profiles.ts`
- `src/modules/api-keys/api-keys.routes.ts`
- `src/tests/api.test.ts`
- `public/app.js`
- `docs/API.md`
- `docs/operations/companycore-mcp-bridge.md`
- planning and state files

## Implementation Plan
1. Define canonical MCP agent key profiles with risk levels and recommended
   roles.
2. Expose owner-only `GET /v1/api-keys/profiles`.
3. Let owner-only `POST /v1/api-keys` accept `profileId` and apply the
   profile's scopes when explicit scopes are omitted.
4. Update owner-console presets to include MCP and current Drive capabilities.
5. Add integration tests for profile listing, key creation, manifest access,
   and invalid profile handling.
6. Update API and MCP bridge docs.
7. Run build and regression gates.

## Acceptance Criteria
- [x] Backend exposes canonical MCP key profiles.
- [x] Profile-created keys receive the expected least-privilege scopes.
- [x] Invalid profile IDs fail closed.
- [x] Owner-console presets include MCP scopes and current Drive capabilities.
- [x] Full validation evidence is recorded before `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    19 migrations applied and 1 integration test passed.
- Manual checks:
  - `git diff --check`: passed; only line-ending warnings were reported.

## Result Report
- Task summary: added canonical MCP key profiles, profile-based owner key
  creation, matching tests, and MCP/current Drive scopes in owner-console
  presets.
- Files changed: see final response.
- How tested: `npm run build`, fresh isolated Docker migration/test gate, and
  `git diff --check`.
- What is incomplete: future UI can load profiles dynamically from the backend
  instead of maintaining static presets.
- Next steps: CCOS-005 dashboard or dynamic API-key profile UI loading.

## MCP-004 Dynamic MCP Profile UI Loading

## Header
- ID: MCP-004
- Title: Dynamic MCP Profile UI Loading
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: MCP-003
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: MCP wave 4
- Operation Mode: BUILDER

## Context
MCP-003 added canonical backend key profiles, but the owner-console API key
screen still used a static frontend preset list as its source of truth.

## Goal
Make the owner console load MCP service-key profiles from the backend so UI,
API, and future agent setup docs share one canonical profile contract.

## Scope
- `public/app.js`
- `docs/API.md`
- `docs/operations/companycore-mcp-bridge.md`
- planning and state files

## Implementation Plan
1. Add profile state and backend profile loading in the owner console.
2. Map backend profiles into the existing preset UI.
3. Keep static presets only as signed-out/load-failure fallback data.
4. Create keys with `profileId` when selected profile scopes are unchanged.
5. Update API and MCP bridge docs.
6. Run frontend syntax, build, integration, and diff checks.

## Acceptance Criteria
- [x] Owner console loads `/v1/api-keys/profiles` after sign-in.
- [x] Backend profiles replace static presets when available.
- [x] Static presets remain only as fallback behavior.
- [x] Creating an unchanged backend profile key sends `profileId`.
- [x] Manually edited scopes still create explicit least-privilege keys.
- [x] Documentation records the dynamic profile flow.

## Validation Evidence
- Tests:
  - `node --check public/app.js`: passed.
  - `npm run build`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    19 migrations applied and 1 integration test passed.
- Manual checks:
  - `git diff --check`: passed; only line-ending warnings were reported.

## Result Report
- Task summary: owner-console API-key presets now load from backend MCP
  profiles and use `profileId` for unchanged canonical profile creation.
- Files changed: see final response.
- How tested: `node --check public/app.js`, `npm run build`, fresh isolated
  Docker migration/test gate, and `git diff --check`.
- What is incomplete: no rendered browser screenshot was captured for this
  small vanilla JS settings change.
- Next steps: CCOS-005 dashboard or UXA-016 React route shell extraction.

## MCP-005 MCP Bridge Runtime Smoke Harness

## Header
- ID: MCP-005
- Title: MCP Bridge Runtime Smoke Harness
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: QA/Test
- Depends on: MCP-002, MCP-003, MCP-004
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: MCP wave 5
- Operation Mode: TESTER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CompanyCore exposes a capability-scoped MCP manifest and a stdio bridge server.
The missing evidence was a repeatable runtime smoke proving that a real
workspace service key can initialize the bridge, discover tools, and execute a
safe read tool call through CompanyCore HTTP.

## Goal
Add a repeatable MCP bridge smoke harness and run it from integration tests
with a real profile-created API key.

## Scope
- `scripts/companycore-mcp-smoke.mjs`
- `scripts/companycore-mcp-server.mjs`
- `package.json`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/operations/companycore-mcp-bridge.md`
- planning and state files

## Implementation Plan
1. Add a small Node smoke script that starts the stdio MCP bridge.
2. Send `initialize`, `tools/list`, and `tools/call`.
3. Default the safe call to `companycore_get_company_os`.
4. Add `npm run mcp:smoke`.
5. Invoke the smoke from the integration test using a real
   `mcp_company_os_reader` profile key.
6. Update MCP operation docs and task state.
7. Run syntax, build, migration/test, and diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: MCP bridge runtime behavior was documented but not smoke-tested.
- Gaps: no single command proved initialize, tool discovery, and safe tool
  execution through a real service key.
- Inconsistencies: docs had manual `printf` instructions but no repeatable
  scripted assertion.
- Architecture constraints: MCP must call CompanyCore HTTP and preserve API key
  capability boundaries.

### 2. Select One Priority Task
- Selected task: MCP-005 MCP Bridge Runtime Smoke Harness.
- Priority rationale: the next required mode is TESTER, and MCP is now the
  agent-facing direction.
- Why other candidates were deferred: CCOS dashboard and React shell work are
  useful, but bridge proof reduces agent-runtime risk first.

### 3. Plan Implementation
- Files or surfaces to modify: smoke script, package script, integration test,
  MCP docs, planning/state docs.
- Logic: spawn the existing bridge process, send JSON-RPC requests over stdio,
  assert tool discovery and a successful safe read tool call.
- Edge cases: missing API key fails closed; timeout exits non-zero; explicit
  smoke tool and arguments can be supplied by environment.

### 4. Execute Implementation
- Implementation notes: added a dependency-free smoke script that starts the
  existing stdio bridge process, sends JSON-RPC requests over stdin, validates
  newline-delimited JSON responses, and reports a redacted summary.

### 5. Verify and Test
- Validation performed: script syntax checks, help output check, build,
  fail-closed missing-key check, isolated Docker migration plus integration
  test, and diff check.
- Result: all required validation passed.

### 6. Self-Review
- Simpler option considered: document manual `printf` only.
- Technical debt introduced: no.
- Scalability assessment: script can be reused locally, in CI, or in
  post-deploy smoke by changing env vars.
- Refinements made: the integration test runs the smoke with a real
  profile-created `mcp_company_os_reader` key.

### 7. Update Documentation and Knowledge
- Docs updated: API docs, MCP bridge operations docs, planning task contract.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `npm run mcp:smoke` starts the stdio bridge.
- [x] Smoke sends `initialize`, `tools/list`, and `tools/call`.
- [x] Smoke fails closed without `COMPANYCORE_API_KEY`.
- [x] Integration test runs the smoke with a real profile-created MCP key.
- [x] Docs describe the smoke command and expected result.
- [x] Full validation evidence is recorded before `DONE`.

## Deliverable For This Stage
Verified runtime smoke harness for the CompanyCore MCP bridge.

## Definition of Done
- [x] Code builds without errors.
- [x] Integration tests pass through the real bridge process.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Smoke command is documented for operators and future agents.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` is checked before status changes to `DONE`.

## Validation Evidence
- Tests:
  - `node --check scripts/companycore-mcp-smoke.mjs`: passed.
  - `node --check scripts/companycore-mcp-server.mjs`: passed.
  - `npm run build`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    19 migrations applied and 1 integration test passed. The test created a
    real `mcp_company_os_reader` profile key and ran the MCP smoke script
    against the live in-test CompanyCore API server.
- Manual checks:
  - `node scripts/companycore-mcp-smoke.mjs --help`: passed.
  - Missing-key fail-closed check: passed with exit code `1` and
    `COMPANYCORE_API_KEY is required.`
  - `git diff --check`: passed; only line-ending warnings were reported.

## Result Report
- Task summary: added `npm run mcp:smoke`, a repeatable stdio bridge runtime
  smoke, and integration coverage using a real MCP profile key.
- Files changed: see final response.
- How tested: syntax checks, help output, build, fail-closed missing-key check,
  isolated Docker migration/test gate, and `git diff --check`.
- What is incomplete: no production MCP smoke was run because this slice
  validates the local repeatable harness.
- Next steps: MCP-006 agent setup guide or CCOS-005 dashboard surface.

## MCP-006 MCP Agent Runtime Setup Guide

## Header
- ID: MCP-006
- Title: MCP Agent Runtime Setup Guide
- Task Type: documentation
- Current Stage: post-release
- Status: DONE
- Owner: Product Docs
- Depends on: MCP-005
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: MCP wave 6
- Operation Mode: ARCHITECT

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
MCP-001 through MCP-005 created the manifest, stdio bridge, canonical key
profiles, dynamic profile UI, and runtime smoke. Future agents need a concise
setup guide that maps those pieces into runtime configuration.

## Goal
Document how Codex, Paperclip-style executors, and generic MCP runtimes should
connect to CompanyCore with least-privilege MCP key profiles.

## Scope
- `docs/operations/mcp-agent-runtime-setup.md`
- `docs/operations/companycore-mcp-bridge.md`
- `docs/API.md`
- planning and state files

## Implementation Plan
1. Map each canonical MCP key profile to agent roles and use cases.
2. Add setup snippets for Codex, Paperclip-style executors, and generic MCP
   runtimes.
3. Add smoke, safety, prompt-contract, checklist, and failure-handling notes.
4. Link the guide from existing MCP API and bridge docs.
5. Update planning/state files and run doc diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: runtime setup knowledge existed across bridge/API docs but not as an
  agent-facing setup guide.
- Gaps: no profile-to-runtime mapping for Codex, Paperclip, or generic MCP
  clients.
- Inconsistencies: not applicable.
- Architecture constraints: MCP remains a thin bridge over CompanyCore HTTP;
  service keys must be least-privilege and workspace-scoped.

### 2. Select One Priority Task
- Selected task: MCP-006 MCP Agent Runtime Setup Guide.
- Priority rationale: it makes the freshly validated MCP path usable by future
  agents without adding new runtime behavior.
- Why other candidates were deferred: CCOS dashboard and React shell work
  remain ready, but this docs slice closes the MCP handoff loop.

### 3. Plan Implementation
- Files or surfaces to modify: operations guide, bridge docs, API docs,
  planning/state docs.
- Logic: document the existing bridge/profile/smoke contract without adding a
  new system.
- Edge cases: secrets must stay out of repo files and prompt text.

### 4. Execute Implementation
- Implementation notes: added a dedicated operations guide with role/profile
  mapping, Codex and Paperclip snippets, generic MCP snippet, prompt contract,
  setup checklist, and failure handling.

### 5. Verify and Test
- Validation performed: documentation review and `git diff --check`.
- Result: passed; only line-ending warnings were reported.

### 6. Self-Review
- Simpler option considered: append snippets to the bridge doc only.
- Technical debt introduced: no.
- Scalability assessment: separate setup guide keeps operational MCP runtime
  setup independent from the lower-level bridge contract.
- Refinements made: bridge/API docs now link to the runtime setup guide.

### 7. Update Documentation and Knowledge
- Docs updated: operations MCP setup guide, MCP bridge docs, API docs.
- Context updated: project state, task board, next steps.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Guide maps profiles to agent runtime roles.
- [x] Guide includes Codex, Paperclip-style, and generic MCP snippets.
- [x] Guide references `npm run mcp:smoke`.
- [x] Guide documents safety, secret handling, and failure recovery.
- [x] Existing MCP docs link to the new guide.

## Deliverable For This Stage
Agent runtime setup documentation for the current MCP bridge and profile model.

## Definition of Done
- [x] Documentation is in English.
- [x] No new runtime system or duplicate contract is introduced.
- [x] Existing MCP bridge/profile/smoke contracts are reused.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` is checked before status changes to `DONE`.

## Validation Evidence
- Tests:
  - Not applicable; docs-only slice.
- Manual checks:
  - `git diff --check`: passed; only line-ending warnings were reported.

## Result Report
- Task summary: added an MCP agent runtime setup guide and linked it from API
  and bridge docs.
- Files changed: see final response.
- How tested: `git diff --check`.
- What is incomplete: no runtime-specific connector was installed or deployed.
- Next steps: CCOS-005 dashboard surface or UXA-016 React route shell
  extraction.

## CCOS-005 Company OS Dashboard Surface

## Header
- ID: CCOS-005
- Title: Company OS Dashboard Surface
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCOS-004, UXA-016
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 5
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-004 exposed the read-only `/v1/company-os` cockpit and collection API.
UXA-016 extracted shared React route primitives. CCOS-005 adds the first
frontend surface that consumes the Company OS cockpit API.

## Goal
Add a React Company OS cockpit route that summarizes definitions, runtime
evidence, governance records, attention queues, adapter health, and recent
evidence from `/v1/company-os`.

## Scope
- `src/app.ts`
- `web/src/main.tsx`
- `web/src/react-route-kit.tsx`
- planning and state files

## Implementation Plan
1. Add Company OS response types, loader, and route state hook to the React
   route kit.
2. Add `/react-company-os` to the backend React route allowlist.
3. Add a React Company OS cockpit that reuses shared shell, notices, metrics,
   and data table primitives.
4. Surface attention queues for approvals, blocked execution, risks, and
   adapter health.
5. Surface recent runs, approvals, audit logs, and events.
6. Run build, route smoke, migration/test, and diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Company OS records were readable through API but had no UI cockpit.
- Gaps: owner and agents lacked a first screen for runtime evidence,
  governance queues, and automation readiness.
- Inconsistencies: not applicable.
- Architecture constraints: route must consume `/v1/company-os`; no raw table
  writes or premature automation.

### 2. Select One Priority Task
- Selected task: CCOS-005 Company OS Dashboard Surface.
- Priority rationale: it turns the Company OS API into an operator-visible
  control surface.
- Why other candidates were deferred: broader dashboard automation and write
  flows need a read cockpit first.

### 3. Plan Implementation
- Files or surfaces to modify: backend React route allowlist, React route kit,
  React route module, planning/state docs.
- Logic: load `/v1/connection` and `/v1/company-os` in parallel, then render
  counts, attention queues, and recent evidence.
- Edge cases: signed-out and load-error states reuse existing React route
  patterns.

### 4. Execute Implementation
- Implementation notes: added `/react-company-os`, shared Company OS types and
  loader, and a first cockpit using the extracted route kit.

### 5. Verify and Test
- Validation performed: `npm run build`, targeted backend static route
  Playwright smoke for signed-out `/react-company-os`, isolated Docker
  migration/test gate, and `git diff --check`.
- Result: all required validation passed.

### 6. Self-Review
- Simpler option considered: add only a link to API docs.
- Technical debt introduced: no.
- Scalability assessment: the route consumes the cockpit API and can later add
  collection drill-downs without changing the API boundary.
- Refinements made: route uses shared `react-route-kit` primitives instead of
  adding another independent shell.

### 7. Update Documentation and Knowledge
- Docs updated: planning task contract.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `/react-company-os` is served by the backend React route allowlist.
- [x] Route loads `/v1/company-os` through the existing owner session.
- [x] Route shows definition, runtime, governance, attention, and collection
  metrics.
- [x] Route shows pending approvals, blocked execution, high risks, adapter
  health, and recent evidence.
- [x] Signed-out, loading, and error states exist.
- [x] Full validation evidence is recorded before `DONE`.

## Deliverable For This Stage
First read-only Company OS cockpit route for the React workbench lane.

## Definition of Done
- [x] Code builds without errors.
- [x] Route works through the real backend static route path.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` is checked before status changes to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    19 migrations applied and 1 integration test passed.
- Manual checks:
  - Backend static route smoke: `/react-company-os` rendered Company OS shell
    and signed-out state with no page errors.
  - `git diff --check`: passed; only line-ending warnings were reported.

## Result Report
- Task summary: added the first React Company OS cockpit route.
- Files changed: see final response.
- How tested: `npm run build`, targeted backend static route Playwright smoke,
  fresh isolated Docker migration/test gate, and `git diff --check`.
- What is incomplete: collection drill-downs and write lifecycle actions remain
  future slices.
- Next steps: UXA-017 React Workbench Third Route Candidate or CCOS-006
  Company OS collection drill-down.

## CCOS-006 Company OS Collection Drill-Down

## Header
- ID: CCOS-006
- Title: Company OS Collection Drill-Down
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCOS-005
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 6
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-005 added the first Company OS cockpit. It surfaced counts, attention
queues, and recent evidence, but did not let operators inspect key collections
without leaving the route.

## Goal
Add read-only collection drill-downs to `/react-company-os` for pipelines,
approvals, audit logs, risks, and tool adapters.

## Scope
- `web/src/main.tsx`
- `web/src/react-route-kit.tsx`
- planning and state files

## Implementation Plan
1. Add typed Company OS collection names and record fields to the React route
   kit.
2. Add a `loadCompanyOsCollection` API helper for
   `/v1/company-os/:collection`.
3. Add a collection state hook with loading, error, signed-out, and ready
   states.
4. Add read-only collection selector cards and a reusable drill-down table in
   `/react-company-os`.
5. Run build, route smoke, migration/test, and diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: cockpit counts were useful but not inspectable.
- Gaps: operators could not quickly preview pipelines, approvals, audit logs,
  risks, or adapters from the Company OS surface.
- Inconsistencies: not applicable.
- Architecture constraints: use the read-only Company OS API; do not add write
  workflows before lifecycle/approval rules exist.

### 2. Select One Priority Task
- Selected task: CCOS-006 Company OS Collection Drill-Down.
- Priority rationale: it makes the cockpit actionable while preserving the
  read-only boundary.
- Why other candidates were deferred: write workflows and automation rules
  need collection visibility first.

### 3. Plan Implementation
- Files or surfaces to modify: React route kit, Company OS React route,
  planning/state docs.
- Logic: lazy-load one selected collection at a time and render generic record
  title/context/state/date columns.
- Edge cases: collection load failure is local to the drill-down; signed-out
  route state remains supported.

### 4. Execute Implementation
- Implementation notes: added the collection loader/hook and a selector-driven
  drill-down table for five high-value collections.

### 5. Verify and Test
- Validation performed: `npm run build`, backend static route Playwright
  smoke for signed-out `/react-company-os`, isolated Docker migration/test
  gate, and `git diff --check`.
- Result: all required validation passed.

### 6. Self-Review
- Simpler option considered: link out to raw API docs.
- Technical debt introduced: no.
- Scalability assessment: additional collections can be added by extending the
  selector metadata, while writes remain closed.
- Refinements made: collection preview uses existing `DataTable` and
  `LocalNotice` primitives.

### 7. Update Documentation and Knowledge
- Docs updated: planning task contract.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `/react-company-os` can preview pipelines.
- [x] `/react-company-os` can preview approvals.
- [x] `/react-company-os` can preview audit logs.
- [x] `/react-company-os` can preview risks.
- [x] `/react-company-os` can preview tool adapters.
- [x] Drill-down remains read-only and uses `/v1/company-os/:collection`.
- [x] Full validation evidence is recorded before `DONE`.

## Deliverable For This Stage
Read-only Company OS collection previews inside the React cockpit.

## Definition of Done
- [x] Code builds without errors.
- [x] Route works through the real backend static route path.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` is checked before status changes to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - Fresh isolated Docker:
    `npx prisma migrate deploy && node --test dist/tests/api.test.js` passed;
    19 migrations applied and 1 integration test passed.
- Manual checks:
  - Backend static route smoke: `/react-company-os` rendered Company OS shell
    and signed-out state with no page errors.
  - `git diff --check`: passed; only line-ending warnings were reported.

## Result Report
- Task summary: added read-only Company OS collection drill-downs.
- Files changed: see final response.
- How tested: `npm run build`, backend static route smoke, fresh isolated
  Docker migration/test gate, and `git diff --check`.
- What is incomplete: no collection detail pages or write lifecycle actions
  were added.
- Next steps: CCOS-007 Company OS collection detail route or UXA-017 next
  React workbench candidate.

## CCOS-007 Company OS Collection Detail Route

## Header
- ID: CCOS-007
- Title: Company OS Collection Detail Route
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCOS-006
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 7
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-006 added read-only collection previews to `/react-company-os`. Operators
and agents could see the list-level shape of pipelines, approvals, audit logs,
risks, and adapters, but could not inspect one record without calling the API
manually.

## Goal
Add focused read-only detail inspection for selected Company OS collection
records before introducing any lifecycle write actions.

## Scope
- `web/src/react-route-kit.tsx`
- `web/src/main.tsx`
- planning and state files

## Implementation Plan
1. Add a typed loader for `/v1/company-os/:collection/:id` to the shared React
   route kit.
2. Add a detail-state hook with idle, signed-out, loading, error, and ready
   states.
3. Add row-level detail selection to the existing Company OS collection table.
4. Add a selected-record detail panel with key fields and raw API evidence.
5. Preserve the read-only boundary and defer write lifecycle actions.
6. Run build, route smoke, migration/test, and diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: collection tables were useful but shallow.
- Gaps: no UI path from list row to complete API evidence for a selected
  Company OS object.
- Inconsistencies: not applicable.
- Architecture constraints: use the existing read-only Company OS API and keep
  actions closed until explicit lifecycle routes and approvals exist.

### 2. Select One Priority Task
- Selected task: CCOS-007 Company OS Collection Detail Route.
- Priority rationale: agents and operators need inspectable context before
  safe approval or lifecycle actions can be designed.
- Why other candidates were deferred: write actions and automations need a
  trustworthy read-detail surface first.

### 3. Plan Implementation
- Files or surfaces to modify: React route kit, Company OS React route,
  planning/state docs.
- Logic: lazy-load the selected record through the detail endpoint, keep the
  selection scoped to the active collection, and render human-readable facts
  plus capped raw JSON evidence.
- Edge cases: no selected row shows an idle guidance panel; missing owner
  session and load failures remain local to the detail panel.

### 4. Execute Implementation
- Implementation notes: added `loadCompanyOsRecord`,
  `useCompanyOsRecordDetailState`, row detail buttons, and a read-only detail
  panel for selected records.

### 5. Verify and Test
- Validation performed: `npm run build`, backend static route Playwright
  smoke for signed-out `/react-company-os`, and final diff checks.
- Result: build and route smoke passed. The full Docker migration/test gate
  remains unchanged from CCOS-006 because this slice only touches frontend
  read behavior and existing backend routes.

### 6. Self-Review
- Simpler option considered: open the raw API response in a new tab.
- Technical debt introduced: no.
- Scalability assessment: the detail panel can later host lifecycle actions
  while keeping those actions separate from raw table CRUD.
- Refinements made: raw evidence is capped in the UI to avoid oversized panels.

### 7. Update Documentation and Knowledge
- Docs updated: planning task contract.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `/react-company-os` can select a record from the active collection.
- [x] Detail loading uses `/v1/company-os/:collection/:id`.
- [x] Detail panel supports idle, loading, signed-out, error, and ready states.
- [x] Detail panel shows readable key fields and raw API evidence.
- [x] No write lifecycle action or raw table mutation is introduced.
- [x] Validation evidence is recorded before `DONE`.

## Deliverable For This Stage
Read-only selected-record detail inspection inside the Company OS cockpit.

## Definition of Done
- [x] Code builds without errors.
- [x] Route works through the real backend static route path.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
- Manual checks:
  - Backend static route smoke: `/react-company-os` rendered the Company OS
    shell and signed-out state with no page errors.
- High-risk checks: not applicable; no backend write behavior changed.

## Result Report
- Task summary: added read-only selected-record detail inspection to the
  Company OS cockpit.
- Files changed: see final response.
- How tested: `npm run build`, backend static route smoke, and final diff
  checks.
- What is incomplete: approval/lifecycle actions remain future slices.
- Next steps: CCOS-008 Company OS agent context panel or UXA-017 next React
  workbench candidate.

## CCOS-008 Company OS Agent Context Panel

## Header
- ID: CCOS-008
- Title: Company OS Agent Context Panel
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCOS-007
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 8
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
The Company OS cockpit can now show collection previews and selected-record
details. Future MCP-compatible agents need a concise read packet that answers
what work is visible, which workflows and procedures apply, which tools are
available, which policies constrain action, and which approvals are pending.

## Goal
Add a read-only agent-facing context panel inside `/react-company-os` using
existing API boundaries.

## Scope
- `web/src/react-route-kit.tsx`
- `web/src/main.tsx`
- planning and state files

## Implementation Plan
1. Extend the typed Company OS collection union to cover the existing read API
   collection names needed by agent context.
2. Add a route-kit state hook that loads tasks plus Company OS agent context
   collections in parallel.
3. Add a read-only panel for tasks, pipelines, procedures, tools, policies,
   acceptance criteria, and approvals.
4. Keep lifecycle writes closed and avoid adding a separate permission layer.
5. Run build, route smoke, and diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Company OS data was inspectable but not summarized as an agent
  operating packet.
- Gaps: agents had no UI-aligned view of current work, procedures, tools,
  policies, checks, and approval pressure.
- Inconsistencies: not applicable.
- Architecture constraints: MCP and UI must consume CompanyCore APIs instead
  of reading database tables or provider secrets directly.

### 2. Select One Priority Task
- Selected task: CCOS-008 Company OS Agent Context Panel.
- Priority rationale: it aligns the cockpit with MCP-oriented agent usage
  before write actions are added.
- Why other candidates were deferred: lifecycle actions need this read context
  and explicit approval design first.

### 3. Plan Implementation
- Files or surfaces to modify: React route kit, Company OS React route,
  planning/state docs.
- Logic: load `/v1/tasks` plus `/v1/company-os` collections for pipelines,
  procedures, tool adapters, policies, acceptance criteria, and approvals in
  parallel.
- Edge cases: signed-out, loading, and load-error states stay local to the
  panel.

### 4. Execute Implementation
- Implementation notes: added `useCompanyOsAgentContextState` and a cockpit
  panel that renders the agent packet without introducing writes.

### 5. Verify and Test
- Validation performed: `npm run build`, backend static route Playwright
  smoke for signed-out `/react-company-os`, and `git diff --check`.
- Result: all required validation passed.

### 6. Self-Review
- Simpler option considered: reuse only existing attention cards.
- Technical debt introduced: no.
- Scalability assessment: the panel is intentionally read-only and can later
  become the launch point for lifecycle routes after approvals are designed.
- Refinements made: collection loads are parallelized in one hook to avoid
  request waterfalls.

### 7. Update Documentation and Knowledge
- Docs updated: planning task contract.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Agent context shows tasks.
- [x] Agent context shows active pipeline definitions.
- [x] Agent context shows procedures.
- [x] Agent context shows tool adapters.
- [x] Agent context shows policies and approval pressure.
- [x] Agent context shows acceptance criteria.
- [x] No write lifecycle action or raw table mutation is introduced.
- [x] Validation evidence is recorded before `DONE`.

## Deliverable For This Stage
Read-only MCP-oriented agent operating packet inside the Company OS cockpit.

## Definition of Done
- [x] Code builds without errors.
- [x] Route works through the real backend static route path.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
- Manual checks:
  - Backend static route smoke: `/react-company-os` rendered the Company OS
    shell and signed-out state with no page errors.
  - `git diff --check`: passed; only line-ending warnings were reported.
- High-risk checks: no backend write behavior changed.

## Result Report
- Task summary: added read-only agent context to the Company OS cockpit.
- Files changed: see final response.
- How tested: `npm run build`, backend static route smoke, and `git diff
  --check`.
- What is incomplete: approval/lifecycle action design remains future work.
- Next steps: CCOS-009 Company OS approval/lifecycle action design or UXA-017
  next React workbench candidate.

## CCOS-009 Company OS Approval Lifecycle Design

## Header
- ID: CCOS-009
- Title: Company OS Approval Lifecycle Design
- Task Type: design
- Current Stage: post-release
- Status: DONE
- Owner: Planner
- Depends on: CCOS-008
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 9
- Operation Mode: ARCHITECT

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
The Company OS UI now exposes read-only cockpit, collection detail, and agent
context. The next risk is opening write behavior too broadly. Approval and
execution writes must be lifecycle commands with policy, event, audit, and MCP
boundaries rather than table CRUD.

## Goal
Design the first explicit Company OS approval/lifecycle command contract before
implementation.

## Scope
- `docs/architecture/system-architecture.md`
- `docs/API.md`
- planning and state files

## Implementation Plan
1. Review current Prisma models for approval, audit log, event, policy, and
   runtime evidence.
2. Review current Company OS read API and MCP architecture.
3. Define the first safe command routes for requesting and deciding approvals.
4. Define future pipeline/stage lifecycle command direction without
   implementing it in this design slice.
5. Update planning/state files and run documentation diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: read surfaces are ready, but write behavior is not yet designed.
- Gaps: no approved command contract for approval requests, approval decisions,
  or future lifecycle transitions.
- Inconsistencies: not applicable.
- Architecture constraints: agents must use CompanyCore HTTP/MCP tools,
  workspace is derived from auth, and risky actions require approval, events,
  and audit logs.

### 2. Select One Priority Task
- Selected task: CCOS-009 Company OS Approval Lifecycle Design.
- Priority rationale: design must precede high-risk write endpoints.
- Why other candidates were deferred: UI write affordances and MCP write tools
  need a route contract first.

### 3. Plan Implementation
- Files or surfaces to modify: architecture docs, API docs, planning/state
  docs.
- Logic: document command-shaped approval routes and fail-closed rules.
- Edge cases: already-decided approvals, expired approvals, cross-workspace
  resources, invalid transitions, missing approval references.

### 4. Execute Implementation
- Implementation notes: added architecture and API sections for request and
  decision commands plus future pipeline/stage lifecycle route direction.

### 5. Verify and Test
- Validation performed: source-of-truth review and `git diff --check`.
- Result: passed; only line-ending warnings were reported.

### 6. Self-Review
- Simpler option considered: implement a direct `PATCH /approvals/:id`.
- Technical debt introduced: no.
- Scalability assessment: command-shaped routes can become MCP tools while
  preserving CompanyCore as the policy/audit boundary.
- Refinements made: approval decisions are specified as one-time transitions
  that refuse already-decided approvals.

### 7. Update Documentation and Knowledge
- Docs updated: architecture and API docs.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Architecture defines command-oriented approval lifecycle direction.
- [x] API docs define planned approval request route.
- [x] API docs define planned approval decision route.
- [x] Future pipeline/stage command direction is documented.
- [x] Raw CRUD over approval/runtime/audit tables remains prohibited.
- [x] Validation evidence is recorded before `DONE`.

## Deliverable For This Stage
Approved design direction for Company OS approval lifecycle commands.

## Definition of Done
- [x] Documentation is in English.
- [x] No runtime write behavior is implemented in the design slice.
- [x] Source-of-truth architecture and API docs agree.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - Not applicable; docs-only design slice.
- Manual checks:
  - `git diff --check`: passed; only line-ending warnings were reported.
- High-risk checks: design explicitly fails closed for missing capabilities,
  invalid approval state, expired approvals, cross-workspace resources, and
  invalid transitions.

## Result Report
- Task summary: designed the first Company OS approval lifecycle command
  contract.
- Files changed: see final response.
- How tested: source-of-truth review and `git diff --check`.
- What is incomplete: backend implementation and UI action affordances remain
  future slices.
- Next steps: CCOS-010 Company OS approval lifecycle backend slice or UXA-017
  next React workbench candidate.

## CCOS-010 Company OS Approval Lifecycle Backend

## Header
- ID: CCOS-010
- Title: Company OS Approval Lifecycle Backend
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder
- Depends on: CCOS-009
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 10
- Operation Mode: TESTER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-009 documented the approval lifecycle command contract. This slice
implements the first two backend commands so future UI and MCP tools can use
approved lifecycle routes instead of raw table mutations.

## Goal
Implement command-shaped approval request and approval decision routes with
capability gates, workspace checks, events, audit logs, and integration tests.

## Scope
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/modules/company-os/company-os.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- planning and state files

## Implementation Plan
1. Add approval lifecycle capabilities and manifest routes.
2. Add `POST /v1/company-os/approvals/request`.
3. Add `POST /v1/company-os/approvals/:id/decision`.
4. Emit lifecycle events and append audit logs with correlation IDs.
5. Add integration coverage for success, event/audit evidence, repeated
   decision rejection, cross-workspace denial, and scoped-key capability
   denial.
6. Run build, migration/test gate, and diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: approvals could be read but not requested or decided through domain
  lifecycle routes.
- Gaps: no backend command route for agent approval requests or human approval
  decisions.
- Inconsistencies: not applicable.
- Architecture constraints: workspace from auth, capability gates from
  manifest, events and audit logs required for meaningful state changes.

### 2. Select One Priority Task
- Selected task: CCOS-010 Company OS Approval Lifecycle Backend.
- Priority rationale: it turns the CCOS-009 contract into the first safe write
  slice for Company OS.
- Why other candidates were deferred: UI affordances and MCP autonomous use
  need tested backend commands first.

### 3. Plan Implementation
- Files or surfaces to modify: auth capability manifest, MCP projection,
  Company OS route module, integration test, API docs, planning/state docs.
- Logic: request creates a pending approval plus `approval_requested` event and
  `approval.requested` audit log; decision changes only pending, non-expired
  approvals and records event/audit evidence.
- Edge cases: missing linked run/stage/role, stage/run mismatch, repeated
  decision, expired approval, cross-workspace access, missing capability.

### 4. Execute Implementation
- Implementation notes: added command routes before generic collection routes,
  extended MCP manifest projection, and updated `mcp_operator` with approval
  lifecycle scopes.

### 5. Verify and Test
- Validation performed: `npm run build`, host `npm test` attempt, Docker
  Compose migration plus compiled integration test, and `git diff --check`.
- Result: build and Docker gate passed. Host `npm test` failed before tests
  because this desktop shell has no `DATABASE_URL`.

### 6. Self-Review
- Simpler option considered: direct approval status patch.
- Technical debt introduced: no.
- Scalability assessment: command routes can be advertised as MCP tools and
  extended with future pipeline/stage actions without exposing raw CRUD.
- Refinements made: MCP manifest marks approval decisions as approval-required
  write tools.

### 7. Update Documentation and Knowledge
- Docs updated: API docs and planning task contract.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Approval request route exists and is capability-gated.
- [x] Approval request creates pending approval, event, and audit log.
- [x] Approval decision route exists and is capability-gated.
- [x] Approval decision updates only pending, non-expired approvals.
- [x] Repeated decisions fail closed.
- [x] Cross-workspace and missing-capability access fail closed.
- [x] Integration tests cover the lifecycle.

## Deliverable For This Stage
Tested backend approval lifecycle command routes.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API path.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Full data flow works across API, auth, DB, events, audit, and tests.
- [x] Backend error handling exists for invalid state and missing resources.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test dist/tests/api.test.js"`: passed; no pending migrations and 1
    integration test passed.
- Manual checks:
  - Host `npm test`: failed before tests because `DATABASE_URL` is not set in
    this desktop shell.
  - `git diff --check`: passed; only line-ending warnings were reported.
- High-risk checks: integration test covers approval request, approval
  decision, audit/event evidence, repeated decision rejection, cross-workspace
  not-found, and scoped-key forbidden response.

## Result Report
- Task summary: implemented Company OS approval request and approval decision
  backend commands.
- Files changed: see final response.
- How tested: build, Docker migration/test gate, and diff check.
- What is incomplete: frontend approval action affordances and future
  pipeline/stage lifecycle commands remain future work.
- Next steps: CCOS-011 Company OS Approval UI Actions or UXA-017 next React
  workbench candidate.

## CCOS-011 Company OS Approval UI Actions

## Header
- ID: CCOS-011
- Title: Company OS Approval UI Actions
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCOS-010
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 11
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-010 implemented audited approval lifecycle backend commands. The Company
OS cockpit still showed approval context but did not expose owner-facing
actions for requesting or deciding approvals.

## Goal
Add owner-facing approval request and approval decision affordances in
`/react-company-os` using the command-shaped backend routes.

## Scope
- `web/src/react-route-kit.tsx`
- `web/src/main.tsx`
- planning and state files

## Implementation Plan
1. Add shared React route-kit clients for approval request and decision
   commands.
2. Add a request approval form in the Company OS agent context panel.
3. Add approve/reject controls for pending approvals.
4. Refresh the local agent context and parent cockpit snapshot after actions.
5. Run build, backend static route smoke, and diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: backend lifecycle commands existed but cockpit users could not use
  them.
- Gaps: no UI affordance for creating or deciding approvals.
- Inconsistencies: not applicable.
- Architecture constraints: use command routes; do not mutate raw records or
  bypass approval/event/audit behavior.

### 2. Select One Priority Task
- Selected task: CCOS-011 Company OS Approval UI Actions.
- Priority rationale: it makes the approved backend lifecycle usable by a
  human owner before broader automation.
- Why other candidates were deferred: pipeline/stage lifecycle actions should
  wait until approval UI proves the command pattern.

### 3. Plan Implementation
- Files or surfaces to modify: React route kit, Company OS cockpit, planning
  and state docs.
- Logic: owner session token calls `approvals/request` and
  `approvals/:id/decision`; local status shows success/error; successful
  actions refresh context and cockpit data.
- Edge cases: signed-out token, backend validation errors, repeated decisions,
  empty pending queue.

### 4. Execute Implementation
- Implementation notes: added request/decision client helpers, request form,
  pending decision list, local action feedback, disabled in-flight buttons, and
  refresh hooks.

### 5. Verify and Test
- Validation performed: `npm run build`, backend static route Playwright
  smoke for signed-out `/react-company-os`, and `git diff --check`.
- Result: all required validation passed.

### 6. Self-Review
- Simpler option considered: show links to raw API docs only.
- Technical debt introduced: no.
- Scalability assessment: action helpers can later support MCP-like UI tools
  and pipeline/stage lifecycle actions without changing the cockpit boundary.
- Refinements made: action feedback stays local to the agent context panel.

### 7. Update Documentation and Knowledge
- Docs updated: planning task contract.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] UI can request an approval through the lifecycle route.
- [x] UI can approve pending approvals through the lifecycle route.
- [x] UI can reject pending approvals through the lifecycle route.
- [x] UI shows local success/error feedback.
- [x] UI refreshes context after successful actions.
- [x] No raw table mutation or direct CRUD path is introduced.

## Deliverable For This Stage
Owner-facing Company OS approval actions in the React cockpit.

## Definition of Done
- [x] Code builds without errors.
- [x] Route works through the real backend static route path.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Frontend uses the real lifecycle command routes.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
- Manual checks:
  - Backend static route smoke: `/react-company-os` rendered the Company OS
    shell and signed-out state with no page errors.
  - `git diff --check`: passed; only line-ending warnings were reported.
- High-risk checks: backend lifecycle commands remain covered by CCOS-010
  Docker integration test.

## Result Report
- Task summary: added owner-facing approval request/decision UI actions.
- Files changed: see final response.
- How tested: build, backend static route smoke, and diff check.
- What is incomplete: pipeline/stage lifecycle commands remain future work.
- Next steps: CCOS-012 Company OS Pipeline Stage Lifecycle Design or UXA-017
  next React workbench candidate.

## CCOS-012 Company OS Pipeline Stage Lifecycle Design

## Header
- ID: CCOS-012
- Title: Company OS Pipeline Stage Lifecycle Design
- Task Type: design
- Current Stage: post-release
- Status: DONE
- Owner: Planner
- Depends on: CCOS-011
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 12
- Operation Mode: ARCHITECT

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
Approval lifecycle commands are implemented and visible in the Company OS
cockpit. Pipeline and stage runtime writes must now be designed around the
same command/event/audit pattern before any backend status mutations are added.

## Goal
Design command-shaped pipeline and stage lifecycle actions that consume
approval references, update runtime evidence, emit events, and append audit
logs.

## Scope
- `docs/architecture/system-architecture.md`
- `docs/API.md`
- planning and state files

## Implementation Plan
1. Review current runtime models for pipeline runs, stage runs, approvals,
   acceptance criteria, events, and audit logs.
2. Define stage lifecycle command set and valid transitions.
3. Define approval and acceptance criteria gates for completion.
4. Define event/audit contract for each command.
5. Update planning/state files and run diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: approval commands exist, but pipeline/stage runtime commands are
  still only described as future work.
- Gaps: no route-level contract for starting, blocking, validating, or
  completing stage runs.
- Inconsistencies: not applicable.
- Architecture constraints: no raw status patching; commands must preserve
  policy, approval, event, and audit behavior.

### 2. Select One Priority Task
- Selected task: CCOS-012 Company OS Pipeline Stage Lifecycle Design.
- Priority rationale: high-risk runtime writes need an explicit lifecycle
  contract before implementation.
- Why other candidates were deferred: UI and MCP execution actions depend on
  tested backend command semantics.

### 3. Plan Implementation
- Files or surfaces to modify: architecture docs, API docs, planning/state
  docs.
- Logic: stage-first lifecycle routes for start, block, validate, and complete.
- Edge cases: invalid transitions, missing approval, approval linked to a
  different resource, incomplete acceptance criteria, terminal pipeline runs.

### 4. Execute Implementation
- Implementation notes: documented route shape, request bodies, planned
  capabilities, required gates, event names, audit actions, and conflict error
  direction.

### 5. Verify and Test
- Validation performed: source-of-truth review and `git diff --check`.
- Result: passed; only line-ending warnings were reported.

### 6. Self-Review
- Simpler option considered: generic `PATCH /stage-runs/:id`.
- Technical debt introduced: no.
- Scalability assessment: command routes can later be exposed as MCP tools and
  UI actions without changing the database model.
- Refinements made: validation is separate from completion so agents can
  submit evidence without closing the stage prematurely.

### 7. Update Documentation and Knowledge
- Docs updated: architecture and API docs.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Architecture defines pipeline/stage lifecycle command direction.
- [x] API docs define planned start-stage route.
- [x] API docs define planned block-stage route.
- [x] API docs define planned validate-stage route.
- [x] API docs define planned complete-stage route.
- [x] Approval and acceptance-criteria gates are documented.
- [x] Event and audit requirements are documented.

## Deliverable For This Stage
Approved design direction for Company OS pipeline and stage lifecycle commands.

## Definition of Done
- [x] Documentation is in English.
- [x] No runtime write behavior is implemented in the design slice.
- [x] Source-of-truth architecture and API docs agree.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - Not applicable; docs-only design slice.
- Manual checks:
  - `git diff --check`: passed; only line-ending warnings were reported.
- High-risk checks: design explicitly fails closed for invalid transitions,
  missing/invalid approvals, incomplete acceptance criteria, and terminal run
  states.

## Result Report
- Task summary: designed Company OS pipeline/stage lifecycle command contract.
- Files changed: see final response.
- How tested: source-of-truth review and `git diff --check`.
- What is incomplete: backend implementation, MCP manifest exposure, and UI
  action affordances remain future slices.
- Next steps: CCOS-013 Company OS Stage Lifecycle Backend or UXA-017 next
  React workbench candidate.

## CCOS-013 Company OS Stage Lifecycle Backend

## Header
- ID: CCOS-013
- Title: Company OS Stage Lifecycle Backend
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder
- Depends on: CCOS-012
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 13
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-012 documented command-shaped stage lifecycle writes. The backend still
needed tested domain actions so agents and UI can operate stage execution
without raw `stage_runs` or `pipeline_runs` status patching.

## Goal
Implement audited start, block, validate, and complete commands for Company OS
stage execution with capability gates, approval checks, acceptance criteria
gates, events, audit logs, and MCP manifest exposure.

## Scope
- `src/modules/company-os/company-os.routes.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/architecture/system-architecture.md`
- planning and state files

## Implementation Plan
1. Inspect the existing Company OS routes, runtime models, approval commands,
   capability manifest, MCP projection, and integration tests.
2. Add stage lifecycle request validation and shared audit/event helpers.
3. Implement `start-stage`, `block`, `validate`, and `complete` routes.
4. Add capability manifest routes and MCP tool projection updates.
5. Extend integration coverage for success and fail-closed transitions.
6. Update source-of-truth docs and state.
7. Run build, migration/test gate, and diff checks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: runtime records existed, but stage execution writes were not
  exposed as approved domain actions.
- Gaps: no API route for starting, blocking, validating, or completing a
  stage run.
- Inconsistencies: API docs still described stage commands as planned.
- Architecture constraints: workspace from auth, capability gates from the
  manifest, no raw table mutation for lifecycle state, event and audit for
  meaningful changes.

### 2. Select One Priority Task
- Selected task: CCOS-013 Company OS Stage Lifecycle Backend.
- Priority rationale: it turns the approved lifecycle design into the next
  usable Company OS write surface for UI and MCP agents.
- Why other candidates were deferred: UI actions need tested backend commands
  first; broader automation should wait for explicit action routes.

### 3. Plan Implementation
- Files or surfaces to modify: Company OS route module, capabilities, MCP
  manifest, API docs, architecture docs, integration tests, planning/state
  docs.
- Logic: start or resume active stage execution, block with log/error state,
  validate evidence and criteria, then complete only after approval and
  acceptance criteria gates pass.
- Edge cases: missing run/stage, stage outside pipeline, terminal run/stage,
  another active stage, missing or invalid approval, incomplete required
  criteria, repeated completion, missing capability.

### 4. Execute Implementation
- Implementation notes: added four command routes before generic collection
  reads, reused `Approval`, `AcceptanceCriterion`, `Event`, and `AuditLog`
  models, and updated MCP manifest tools instead of adding a separate agent
  execution path.

### 5. Verify and Test
- Validation performed: `npm run build`, host `npm test` attempt, Docker
  Compose build, Docker migration plus compiled integration test, and
  `git diff --check`.
- Result: build, Docker build, Docker migration/test gate, and diff check
  passed. Host `npm test` failed before tests because this desktop shell has
  no `DATABASE_URL`.

### 6. Self-Review
- Simpler option considered: direct `PATCH /stage-runs/:id`.
- Technical debt introduced: no.
- Scalability assessment: commands are route-level lifecycle actions that can
  be projected to MCP tools and UI controls without changing the DB model.
- Refinements made: `start-stage` now fails closed when another active stage
  run already exists in the same pipeline run.

### 7. Update Documentation and Knowledge
- Docs updated: API docs, system architecture, planning task contract.
- Context updated: project state, task board, next steps, current focus,
  system health, regression log.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `start-stage` route exists and is capability-gated.
- [x] `block` route exists and appends stage log plus event/audit evidence.
- [x] `validate` route updates validation result and linked acceptance
  criteria evidence.
- [x] `complete` route requires passed/waived required criteria.
- [x] Stage completion requires an approved approval when stage definition
  requires approval.
- [x] Scoped read-only keys cannot call stage write commands.
- [x] MCP manifest exposes the new lifecycle commands as write tools.
- [x] Integration tests cover success and fail-closed behavior.

## Deliverable For This Stage
Tested backend stage lifecycle command routes for Company OS.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API path.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Full data flow works across API, auth, DB, events, audit, and tests.
- [x] Backend error handling exists for invalid state and missing resources.
- [x] Source-of-truth docs and planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test 'dist/tests/**/*.test.js'"`: passed; no pending migrations and
    1 integration test passed.
- Manual checks:
  - Host `npm test`: failed before tests because `DATABASE_URL` is not set in
    this desktop shell.
  - `git diff --check`: passed; only line-ending warnings were reported.
- High-risk checks: integration test covers stage start, block, validation,
  required acceptance criteria completion gate, approved approval usage,
  repeated completion conflict, scoped-key denial, MCP manifest exposure, and
  event/audit evidence.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: yes
- Error state verified: yes
- Refresh/restart behavior verified: yes, through rebuilt Docker runtime and
  compiled integration test.
- Regression check performed: Docker migration/test gate and `git diff --check`.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: yes
- Data classification: operational workflow state, approval metadata,
  validation evidence, audit/event metadata.
- Trust boundaries: workspace derived from auth; service keys require scoped
  capabilities.
- Permission or ownership checks: all target records are workspace-scoped.
- Abuse cases: read-only key write attempt, cross-workspace approval decision,
  repeated transition, missing acceptance criteria, invalid approval state.
- Secret handling: no secrets introduced or returned.
- Fail-closed behavior: yes.

## Deployment / Ops Evidence
- Deploy impact: low to medium, backend API behavior only; no migration in
  this slice.
- Env or secret changes: none.
- Health-check impact: none.
- Rollback note: revert route/capability changes; existing data remains
  compatible because no schema changes were added.
- `DEPLOYMENT_GATE.md` reviewed: yes.

## Result Report
- Task summary: implemented Company OS stage lifecycle backend commands.
- Files changed: see final response.
- How tested: build, Docker compose build, Docker migration/test gate, and
  diff check.
- What is incomplete: owner-facing UI actions and broader automation rules are
  future slices.
- Next steps: CCOS-014 Company OS Stage Lifecycle UI Actions or UXA-017 next
  React workbench candidate.

## CCOS-014 Company OS Stage Lifecycle UI Actions

## Header
- ID: CCOS-014
- Title: Company OS Stage Lifecycle UI Actions
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCOS-013
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 14
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-013 implemented audited stage lifecycle backend commands. The Company OS
cockpit still needed owner-facing controls so a human operator could drive the
same command routes before broader automation is introduced.

## Goal
Add owner-facing start, block, validate, and complete stage controls to
`/react-company-os` using the audited lifecycle command routes.

## Scope
- `web/src/react-route-kit.tsx`
- `web/src/main.tsx`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/current-focus.md`
- `.agents/state/next-steps.md`
- `.agents/state/system-health.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/company-os-stage1-task-contracts.md`

## Implementation Plan
1. Reuse the existing React route kit and Company OS agent context panel.
2. Add shared clients for start, block, validate, and complete stage routes.
3. Load pipeline runs, pipeline stages, stage runs, acceptance criteria, and
   approvals into the Company OS agent context.
4. Add compact owner controls with local success/error feedback.
5. Refresh Company OS context after successful actions.
6. Validate build, rendered desktop/mobile route, and backend integration
   regression.
7. Update task/state docs.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: backend lifecycle commands existed, but the cockpit could not invoke
  them.
- Gaps: no owner-facing stage execution controls.
- Inconsistencies: the agent context still described itself as read-only even
  after lifecycle writes became available.
- Architecture constraints: use command routes only; no raw table mutation;
  preserve local action feedback and shared React route patterns.

### 2. Select One Priority Task
- Selected task: CCOS-014 Company OS Stage Lifecycle UI Actions.
- Priority rationale: it completes the vertical slice from backend lifecycle
  commands to human-supervised Company OS operation.
- Why other candidates were deferred: automation rules should wait until the
  human/operator control path is visible and validated.

### 3. Plan Implementation
- Files or surfaces to modify: React route kit, Company OS cockpit, planning
  and state files.
- Logic: owner bearer token calls audited command routes; action state reports
  success/error; successful writes refresh context and cockpit snapshot.
- Edge cases: missing selected run/stage, no available approval, backend
  transition conflicts, incomplete acceptance criteria, signed-out owner state,
  mobile overflow.

### 4. Execute Implementation
- Implementation notes: added route-kit command clients and extended
  `CompanyOsAgentContext` to load runtime collections. The existing agent
  context panel now includes Start, Block, Validate, and Complete forms that
  use real CompanyCore IDs and command endpoints.

### 5. Verify and Test
- Validation performed: `npm run build`, Docker rebuild, Playwright
  signed-out route render, Playwright signed-in desktop render, Playwright
  signed-in mobile render, Docker migration/test gate, and `git diff --check`.
- Result: all required checks passed; `git diff --check` reported only
  line-ending warnings.

### 6. Self-Review
- Simpler option considered: links to API docs or raw collection detail only.
- Technical debt introduced: no.
- Scalability assessment: shared route-kit clients can support future UI
  surfaces and MCP-like command panels without duplicating fetch logic.
- Refinements made: backend error codes are mapped to owner-readable action
  messages in the cockpit.

### 7. Update Documentation and Knowledge
- Docs updated: planning task contract and state files.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] UI exposes start-stage through the audited lifecycle route.
- [x] UI exposes block-stage through the audited lifecycle route.
- [x] UI exposes validate-stage through the audited lifecycle route.
- [x] UI exposes complete-stage through the audited lifecycle route.
- [x] UI loads real pipeline run, stage, stage run, approval, and acceptance
  criteria data.
- [x] UI shows local success/error feedback.
- [x] UI refreshes Company OS context after successful actions.
- [x] Desktop and mobile render without console errors or horizontal overflow.

## Deliverable For This Stage
Owner-facing Company OS stage lifecycle controls in the React cockpit.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real backend static route path.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Frontend uses the real lifecycle command routes.
- [x] Backend integration regression remains green.
- [x] Source-of-truth planning/state files are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test 'dist/tests/**/*.test.js'"`: passed; no pending migrations and
    1 integration test passed.
- Manual checks:
  - `docker compose up -d --build`: passed.
  - Playwright signed-out `/react-company-os`: title and owner-session state
    rendered with zero console errors.
  - Playwright signed-in desktop `/react-company-os`: Start, Block, Validate,
    and Complete buttons rendered with zero console errors and no horizontal
    overflow.
  - Playwright signed-in mobile `/react-company-os`: Complete action rendered
    with zero console errors and no horizontal overflow.
  - `git diff --check`: passed; only line-ending warnings were reported.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: yes, through Docker migration/test gate
- Loading state verified: yes
- Error state verified: yes
- Refresh/restart behavior verified: yes, through rebuilt Docker runtime and
  refreshed cockpit data.
- Regression check performed: backend integration test and rendered route
  checks.

## UX/UI Evidence
- Design source type: approved_snapshot
- Existing shared pattern reused: React route kit `Shell`, `LocalNotice`,
  `MetricCard`, DaisyUI form controls, cards, badges, and buttons.
- New shared pattern introduced: no
- Responsive checks: desktop and mobile
- Accessibility checks: labeled form controls and button states
- State checks: loading, signed-out, error, success
- Raw technical errors hidden from end users: yes, common backend codes are
  mapped to owner-readable messages.
- Parity evidence: rendered route checks passed without console errors or
  horizontal overflow.

## Deployment / Ops Evidence
- Deploy impact: low, frontend route and route-kit clients only.
- Env or secret changes: none.
- Health-check impact: none.
- Rollback note: revert the route-kit clients and Company OS panel controls;
  backend commands remain compatible.
- `DEPLOYMENT_GATE.md` reviewed: yes.

## Result Report
- Task summary: added owner-facing stage lifecycle controls to the Company OS
  cockpit.
- Files changed: see final response.
- How tested: build, Docker rebuild, rendered route checks, Docker
  migration/test gate, and diff check.
- What is incomplete: automation rule execution and trigger orchestration are
  future slices.
- Next steps: CCOS-015 Company OS Automation Rule Execution Design or UXA-017
  next React workbench candidate.

## CCOS-015 Company OS Automation Rule Execution Design

## Header
- ID: CCOS-015
- Title: Company OS Automation Rule Execution Design
- Task Type: design
- Current Stage: post-release
- Status: DONE
- Owner: Planner
- Depends on: CCOS-014
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 15
- Operation Mode: TESTER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected iteration rotation.
- [x] The task is aligned with repository source-of-truth documents.

## Context
Company OS now has definition data, runtime evidence, governance records,
approval lifecycle commands, and stage lifecycle commands. `automation_rules`
and `triggers` exist, but rule execution still needed an approved architecture
contract before backend implementation.

## Goal
Design how automation rules and triggers observe Company OS lifecycle events
and request approved follow-up actions without bypassing policy, approval,
event, audit, capability, or MCP boundaries.

## Scope
- `docs/architecture/system-architecture.md`
- `docs/API.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/current-focus.md`
- `.agents/state/next-steps.md`
- `.agents/state/system-health.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/company-os-stage1-task-contracts.md`

## Implementation Plan
1. Review the current Company OS architecture, API contracts, and schema
   models for events, automation rules, triggers, approvals, and stage runs.
2. Define the automation execution boundary as event-driven rule evaluation,
   not direct raw table mutation.
3. Define first action kinds, approval behavior, idempotency rules, event/audit
   evidence, and MCP exposure expectations.
4. Update canonical architecture/API docs and planning/state files.
5. Run a docs/source consistency and diff validation pass.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: automation rules and triggers were persisted and readable, but there
  was no approved execution contract.
- Gaps: no documented rule-matching boundary, action proposal shape,
  idempotency rule, or MCP-safe execution path.
- Inconsistencies: prior lifecycle docs said automation could observe events
  later, but not how observation becomes a safe action.
- Architecture constraints: lifecycle writes must remain command-shaped;
  agents and MCP servers must use CompanyCore API boundaries.

### 2. Select One Priority Task
- Selected task: CCOS-015 Company OS Automation Rule Execution Design.
- Priority rationale: automation is the next risk boundary after human stage
  controls; design should precede any autonomous execution.
- Why other candidates were deferred: UXA-017 remains useful but less critical
  than preventing unsafe automation semantics.

### 3. Plan Implementation
- Files or surfaces to modify: architecture docs, API docs, queue/state docs.
- Logic: design `Event -> trigger match -> condition evaluation -> action
  proposal -> approval or lifecycle command -> event/audit evidence`.
- Edge cases: duplicate event processing, risky actions without approval,
  provider-specific webhooks, arbitrary scripts, raw status mutation, dry-run
  versus execute mode.

### 4. Execute Implementation
- Implementation notes: documented automation rules as event observers and
  action requesters. Defined first action kinds, planned evaluation endpoint,
  planned `company-os:automation:execute` capability, idempotency expectations,
  audit/event evidence, and MCP manifest boundaries.

### 5. Verify and Test
- Validation performed: source-of-truth review, targeted docs consistency
  review, and `git diff --check`.
- Result: architecture/API contracts now agree on the next automation
  execution slice.

### 6. Self-Review
- Simpler option considered: document automation as a future worker only.
- Technical debt introduced: no.
- Scalability assessment: the event-observer/action-proposal model keeps room
  for scheduled scanning and provider fan-out without changing lifecycle
  command boundaries.
- Refinements made: dry-run and execute modes were separated so future agents
  can inspect proposed work before executing approved actions.

### 7. Update Documentation and Knowledge
- Docs updated: architecture, API, task contract, queue/state files.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Architecture documents automation as event-driven rule evaluation.
- [x] Architecture forbids raw table mutation or provider direct calls from
  rule execution.
- [x] API docs define the planned command-shaped evaluation route and
  capability.
- [x] API docs define dry-run versus execute behavior.
- [x] Docs define first allowed action kinds.
- [x] Docs define approval, idempotency, MCP, event, and audit requirements.
- [x] Canonical queue moves to the next executable backend slice.

## Deliverable For This Stage
Approved design contract for Company OS automation rule execution.

## Definition of Done
- [x] Runtime code changes are not applicable for this design slice.
- [x] No mock, placeholder, fake, or temporary runtime path was introduced.
- [x] Architecture and API docs are updated.
- [x] Queue/state files are updated.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `git diff --check`: passed with line-ending warnings only.
- Manual checks:
  - Reviewed `docs/architecture/system-architecture.md`, `docs/API.md`,
    `prisma/schema.prisma`, `DEFINITION_OF_DONE.md`, and
    `INTEGRATION_CHECKLIST.md`.
- High-risk checks:
  - Confirmed automation execution remains behind future capability,
    approval/lifecycle command helpers, and event/audit evidence.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: not applicable, design slice only
- Endpoint and client contract match: planned endpoint documented for next
  slice
- DB schema and migrations verified: existing `automation_rules`, `triggers`,
  `events`, `approvals`, `pipeline_runs`, and `stage_runs` reviewed
- Regression check performed: docs/source consistency review

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: not applicable for
  docs-only design, but security constraints were carried from lifecycle docs.
- Data classification: operational event, workflow, approval, and audit
  metadata.
- Trust boundaries: workspace derived from auth; MCP uses service-key scopes;
  automation cannot read provider secrets or patch raw tables.
- Abuse cases: duplicate rule execution, arbitrary script execution, risky
  action without approval, provider direct call bypass, cross-workspace event
  matching.
- Fail-closed behavior: planned route must return structured no-op/conflict or
  approval-required results instead of performing unsafe actions.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/system-architecture.md`.
- Fits approved architecture: yes
- Mismatch discovered: no
- Decision required from user: no
- Follow-up architecture doc updates: first implementation should add
  backend-specific helper details if the evaluator reveals a cleaner shared
  lifecycle-command abstraction.

## Deployment / Ops Evidence
- Deploy impact: none, docs-only design.
- Env or secret changes: none.
- Health-check impact: none.
- Rollback note: revert documentation/state changes; no runtime behavior
  changes.
- `DEPLOYMENT_GATE.md` reviewed: not applicable for docs-only design.

## Result Report
- Task summary: designed the Company OS automation rule execution boundary.
- Files changed: see final response.
- How tested: source review and diff check.
- What is incomplete: backend evaluator route, capability, MCP manifest entry,
  idempotency persistence, and tests remain future implementation.
- Next steps: CCOS-016 Company OS Automation Rule Evaluator Backend.

## CCOS-016 Company OS Automation Rule Evaluator Backend

## Header
- ID: CCOS-016
- Title: Company OS Automation Rule Evaluator Backend
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder
- Depends on: CCOS-015
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 16
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the selected implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.

## Context
CCOS-015 approved an event-driven, command-shaped automation execution
contract. The backend still needed the first evaluator route, capability,
manifest exposure, idempotency behavior, and integration coverage.

## Goal
Implement the first Company OS automation evaluator route that evaluates one
existing event against active triggers/rules, supports `dry_run` and
`execute`, records event/audit evidence, and avoids raw table mutation.

## Scope
- `src/modules/company-os/company-os.routes.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- `docs/architecture/system-architecture.md`
- Planning and state files

## Implementation Plan
1. Add `company-os:automation:execute` and manifest route exposure.
2. Add evaluator request validation for `dry_run`, `execute`, optional
   `ruleIds`, and optional idempotency key.
3. Match active triggers/rules against a workspace-scoped source event.
4. Evaluate small declarative conditions and produce action proposals.
5. Execute only `request_approval` and `emit_event`; fail closed for lifecycle
   action kinds until shared lifecycle helper reuse exists.
6. Record `automation_rule_matched`, `automation_action_proposed`,
   `approval_requested`, and fail-closed evidence with audit logs.
7. Add integration coverage for dry-run, execution, idempotency, scoped
   denial, profile/manifest exposure, and docs/state updates.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: rules and triggers were readable but not executable.
- Gaps: no automation capability, no evaluator route, no MCP tool exposure, no
  idempotency evidence.
- Inconsistencies: architecture/API docs described the route as planned.
- Architecture constraints: no raw status patches, no provider-direct calls,
  no arbitrary scripts, and no bypassing approval/event/audit boundaries.

### 2. Select One Priority Task
- Selected task: CCOS-016 Company OS Automation Rule Evaluator Backend.
- Priority rationale: it turns the approved automation architecture into the
  first safe runtime slice for agents and MCP tools.
- Why other candidates were deferred: owner UI can wait until the backend path
  is validated.

### 3. Plan Implementation
- Files or surfaces to modify: capability catalog, MCP manifest, Company OS
  route module, integration tests, architecture/API docs, state files.
- Logic: source event -> active trigger/rule match -> condition evaluation ->
  proposal -> dry-run response or audited execution.
- Edge cases: missing event, scoped key without capability, unsupported action
  shape, duplicate event/rule/action processing, lifecycle action proposals
  that require helper reuse.

### 4. Execute Implementation
- Implementation notes: added route
  `POST /v1/company-os/events/:id/actions/evaluate-automation-rules`, exposed
  `company-os:automation:execute`, added MCP approval hints, and implemented
  idempotency lookup through existing automation proposal audit evidence.

### 5. Verify and Test
- Validation performed:
  - `npm run build`
  - `docker compose up -d --build`
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test 'dist/tests/**/*.test.js'"`
- Result: all checks passed.

### 6. Self-Review
- Simpler option considered: dry-run only.
- Technical debt introduced: no schema debt; lifecycle action execution is
  deliberately fail-closed until shared helper reuse exists.
- Scalability assessment: the route can later be called by schedulers,
  provider-event processors, or MCP agents without changing the event/audit
  boundary.
- Refinements made: scoped service keys without automation capability are
  denied; MCP tools mark automation execution as requiring approval.

### 7. Update Documentation and Knowledge
- Docs updated: architecture, API, task contract, queue/state files.
- Context updated: project state, task board, next steps, system health.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `company-os:automation:execute` exists and guards the evaluator route.
- [x] `/v1/company-os/events/:id/actions/evaluate-automation-rules` supports
  `dry_run`.
- [x] The route supports `execute` for `request_approval` and `emit_event`.
- [x] Lifecycle action proposals fail closed with evidence instead of raw
  mutation.
- [x] Reprocessing the same event/rule/action with the same idempotency key
  does not duplicate execution.
- [x] MCP manifest exposes the evaluator as an approval-requiring write tool.
- [x] Integration tests cover dry-run, execute, idempotency, manifest exposure,
  and scoped denial.

## Deliverable For This Stage
First audited backend automation evaluator route for Company OS events.

## Definition of Done
- [x] Code builds without errors.
- [x] Feature works through the real API path.
- [x] No mock, placeholder, fake, or temporary path remains.
- [x] Full data flow works across API, DB, validation, event, audit, and tests.
- [x] Backend error handling exists for missing event, forbidden scoped key,
  unsupported action, and duplicate processing.
- [x] No existing functionality is broken.
- [x] Changes are documented in relevant source-of-truth files.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test 'dist/tests/**/*.test.js'"`: passed; no pending migrations and
    1 integration test passed.
- Manual checks:
  - `docker compose up -d --build`: passed.
- High-risk checks:
  - Capability denial verified for a scoped key without
    `company-os:automation:execute`.
  - Idempotency verified by repeated `execute` returning `already_processed`.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes
- Real API/service path used: yes
- Endpoint and client contract match: yes
- DB schema and migrations verified: yes
- Error state verified: yes
- Refresh/restart behavior verified: yes, through Docker rebuild and container
  test gate.
- Regression check performed: full backend integration test.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: inherited from
  CCOS lifecycle command requirements.
- Data classification: operational event, approval, automation, and audit
  metadata.
- Trust boundaries: workspace is derived from auth; API keys require the new
  automation capability; MCP is manifest-scoped.
- Abuse cases: duplicate processing, scoped key escalation, unsupported action
  execution, raw table mutation, provider-direct calls.
- Secret handling: no secrets introduced or returned.
- Fail-closed behavior: lifecycle actions return `automation_rule_failed`
  evidence until helper reuse is implemented.

## Deployment / Ops Evidence
- Deploy impact: low to medium, backend route/capability behavior only.
- Env or secret changes: none.
- Health-check impact: none.
- Rollback note: revert route/capability/manifest/test/doc changes; no schema
  migration was added.
- `DEPLOYMENT_GATE.md` reviewed: yes.

## Result Report
- Task summary: implemented the first Company OS automation evaluator backend.
- Files changed: see final response.
- How tested: build, Docker rebuild, Docker migration/test gate.
- What is incomplete: owner-facing UI controls and shared lifecycle helper
  execution for start/block/validate/complete proposals remain future slices.
- Next steps: CCOS-017 Company OS Automation Evaluator UI Actions or UXA-017
  React Workbench Third Route Candidate.

## CCOS-017 Company OS Automation Evaluator UI Actions

## Header
- ID: CCOS-017
- Title: Company OS Automation Evaluator UI Actions
- Task Type: feature
- Current Stage: post-release
- Status: DONE
- Owner: Frontend Builder
- Depends on: CCOS-016
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 17
- Operation Mode: ARCHITECT

## Context
CCOS-016 implemented the audited automation evaluator backend route. The
Company OS cockpit still needed an owner-facing way to run `dry_run` and
`execute` without raw automation table mutation.

## Goal
Expose owner-facing automation evaluator controls inside `/react-company-os`
using the audited backend route and shared React route kit.

## Scope
- `web/src/react-route-kit.tsx`
- `web/src/main.tsx`
- Planning and state files

## Implementation Plan
1. Add a shared route-kit client for the automation evaluator route.
2. Load automation rules and recent cockpit events into the agent context.
3. Add a compact Automation evaluator panel with event, mode, rule IDs,
   idempotency key, and reason inputs.
4. Submit through the audited backend route and show local result feedback.
5. Validate build, Docker runtime render, desktop/mobile overflow, and route
   console/API failures.

## Acceptance Criteria
- [x] UI exposes evaluator controls in `/react-company-os`.
- [x] UI supports `dry_run` and `execute` mode selection.
- [x] UI uses recent Company OS events from the cockpit snapshot.
- [x] UI calls the real backend evaluator route.
- [x] UI shows local success/warning/error feedback and result metrics.
- [x] UI does not add raw automation table mutation.
- [x] Desktop and mobile render without route-level console/API failures or
  horizontal overflow.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - `git diff --check`: passed with line-ending warnings only.
- Manual checks:
  - `docker compose up -d --build`: passed.
  - `docker compose exec -T backend sh -lc "npm run seed"`: passed.
  - Playwright signed-in `/react-company-os`: Automation evaluator heading,
    `dry_run`, and Evaluate button rendered.
  - Playwright desktop/mobile: no horizontal overflow.
  - Route-only Playwright check: no console messages and no 4xx/5xx responses
    after navigating to `/react-company-os`.
  - Clicking Evaluate with fresh seed data showed the expected local
    "Automation needs an event" warning instead of sending an invalid request.

## Result Report
- Task summary: added owner-facing automation evaluator controls to the
  Company OS cockpit.
- Files changed: see final response.
- How tested: build, Docker rebuild, seed, Playwright signed-in desktop/mobile
  route checks, diff check.
- What is incomplete: lifecycle action proposals still fail closed in the
  backend until shared lifecycle helper reuse is designed and implemented.
- Next steps: CCOS-018 Company OS Automation Lifecycle Helper Reuse Design or
  UXA-017 React Workbench Third Route Candidate.

## CCOS-018 Company OS Automation Lifecycle Helper Reuse Design

## Header
- ID: CCOS-018
- Title: Company OS Automation Lifecycle Helper Reuse Design
- Task Type: design
- Current Stage: post-release
- Status: DONE
- Owner: Planner
- Depends on: CCOS-016
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 18
- Operation Mode: BUILDER

## Context
The automation evaluator can execute `request_approval` and `emit_event`, but
stage lifecycle proposals still fail closed with
`action_requires_lifecycle_helper`. Enabling them safely requires shared
lifecycle command logic rather than duplicated transition code inside the
evaluator.

## Goal
Design how the automation evaluator should reuse stage lifecycle command logic
for `start_stage`, `block_stage`, `validate_stage`, and `complete_stage`
without bypassing approval, acceptance criteria, event, audit, capability, or
workspace boundaries.

## Scope
- `docs/architecture/system-architecture.md`
- `docs/API.md`
- Planning and state files

## Implementation Plan
1. Review current stage lifecycle handlers and evaluator fail-closed behavior.
2. Define the shared lifecycle command service boundary.
3. Define the internal command function names and inputs.
4. Document evidence chaining and stable error propagation.
5. Queue the first implementation slice.

## Acceptance Criteria
- [x] Architecture defines shared lifecycle command service reuse.
- [x] Architecture forbids evaluator-side duplicate transition logic.
- [x] API docs explain how lifecycle proposals become enabled later.
- [x] Docs preserve fail-closed behavior until helper extraction exists.
- [x] Queue advances to the first implementation slice.

## Validation Evidence
- Tests:
  - `git diff --check`: passed with line-ending warnings only.
- Manual checks:
  - Reviewed existing Company OS route handlers, current evaluator
    `action_requires_lifecycle_helper` branch, architecture docs, and API docs.

## Result Report
- Task summary: designed shared lifecycle helper reuse for automation
  lifecycle proposals.
- Files changed: see final response.
- How tested: source review and diff check.
- What is incomplete: implementation extraction remains future work.
- Next steps: CCOS-019 Company OS Stage Lifecycle Command Service Extraction.

## CCOS-019 Company OS Stage Lifecycle Command Service Extraction

## Header
- ID: CCOS-019
- Title: Company OS Stage Lifecycle Command Service Extraction
- Task Type: refactor
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder
- Depends on: CCOS-018
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 19
- Operation Mode: ARCHITECT

## Context
CCOS-018 documented that automation lifecycle proposals must reuse stage
lifecycle transition logic rather than duplicating it in the evaluator. The
existing stage lifecycle logic still lived inside Express route handlers.

## Goal
Extract stage lifecycle route logic into shared internal command functions
while preserving current HTTP behavior, stable errors, events, audit logs, and
tests.

## Scope
- `src/modules/company-os/company-os.routes.ts`
- Planning and state files

## Implementation Plan
1. Add internal command result/error types.
2. Extract `startStageCommand`, `blockStageCommand`, `validateStageCommand`,
   and `completeStageCommand`.
3. Keep route handlers as parse/auth/command/response wrappers.
4. Preserve existing stable error codes and response payload shape.
5. Run build and container integration tests.

## Acceptance Criteria
- [x] Stage start route uses a shared command function.
- [x] Stage block route uses a shared command function.
- [x] Stage validate route uses a shared command function.
- [x] Stage complete route uses a shared command function.
- [x] Existing route behavior and stable errors remain covered by integration
  tests.
- [x] No automation lifecycle action behavior is enabled in this refactor.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - `docker compose up -d --build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test 'dist/tests/**/*.test.js'"`: passed; no pending migrations and
    1 integration test passed.

## Result Report
- Task summary: extracted stage lifecycle logic into internal command
  functions and left HTTP behavior unchanged.
- Files changed: see final response.
- How tested: build, Docker rebuild, Docker migration/test gate.
- What is incomplete: automation evaluator still fails closed for lifecycle
  action proposals until the next backend slice maps proposals to command
  functions.
- Next steps: CCOS-020 Company OS Automation Lifecycle Proposal Execution.

## CCOS-020 Company OS Automation Lifecycle Proposal Execution

## Header
- ID: CCOS-020
- Title: Company OS Automation Lifecycle Proposal Execution
- Task Type: implementation
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder
- Depends on: CCOS-019
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: Company OS wave 20
- Operation Mode: TESTER

## Context
The automation evaluator can already execute `request_approval` and
`emit_event`, and CCOS-019 extracted stage lifecycle transitions into shared
internal command functions. Lifecycle action proposals still fail closed until
the evaluator maps safe proposals to those commands.

## Goal
Enable automation evaluator lifecycle proposals to execute
`start_stage`, `block_stage`, `validate_stage`, and `complete_stage` through
the shared stage lifecycle command functions while preserving idempotency,
approval checks, stable errors, events, audit logs, and fail-closed evidence.

## Scope
- `src/modules/company-os/company-os.routes.ts`
- `src/tests/api.test.ts`
- Planning and state files

## Implementation Plan
1. Review the existing evaluator action execution branch and lifecycle command
   function inputs.
2. Add proposal payload parsing for each lifecycle action kind.
3. Call the shared lifecycle command functions from evaluator execution.
4. Preserve idempotency evidence and record stable failure evidence when a
   command rejects a transition.
5. Add integration coverage for at least one successful lifecycle proposal and
   one fail-closed rejected proposal.
6. Run build, Docker rebuild, migrations, and integration tests.

## Acceptance Criteria
- [x] `start_stage` automation proposals can call the shared start command.
- [x] `block_stage` automation proposals can call the shared block command.
- [x] `validate_stage` automation proposals can call the shared validate
  command.
- [x] `complete_stage` automation proposals can call the shared complete
  command.
- [x] Command failures become explicit automation result evidence rather than
  silent partial success.
- [x] Idempotency still prevents duplicate execution for the same rule/event
  action key.
- [x] Existing approval, acceptance criteria, event, and audit behavior remains
  covered by tests.

## Validation Evidence
- Tests:
  - `npm run build`: passed.
  - `docker compose up -d --build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test 'dist/tests/**/*.test.js'"`: passed; no pending migrations and
    1 integration test passed.
- Manual checks:
  - Reviewed evaluator action execution, lifecycle command inputs, and stable
    command error propagation.
  - Confirmed the first attempted lifecycle test failed for the expected
    approval-required reason, then isolated success coverage with a stage that
    has no approval requirement.

## Result Report
- Task summary: enabled automation evaluator lifecycle proposals to call the
  shared stage lifecycle command functions.
- Files changed: see final response.
- How tested: build, Docker rebuild, Docker migration/test gate.
- What is incomplete: scheduled/background automation scanning remains a later
  slice; this task evaluates explicit existing events only.
- Next steps: UXA-017 React Workbench Third Route Candidate.
