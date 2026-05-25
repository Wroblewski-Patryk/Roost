# Agent CRUD API Rollout Plan

Status: implemented. AGCRUD-001 through AGCRUD-006 are complete; later
agent-runtime evidence is tracked in
`docs/planning/agent-runtime-gap-closure-plan.md` and
`docs/operations/agent-runtime-coverage-ledger.csv`.

## Purpose

CompanyCore should become the safe read/write memory layer for Jarvis,
Paperclip, Aviary, n8n, and future agents. Agents must use the HTTP API and
must not write directly to PostgreSQL.

The rollout target is not raw database administration over HTTP. The target is
workspace-scoped, capability-discoverable CRUD for business records, plus
controlled lifecycle actions for system, security, provider, and audit tables.

## Architecture Constraints

- PostgreSQL remains the source of truth.
- Prisma remains the schema and persistence boundary.
- HTTP API remains the only supported integration access layer.
- Protected endpoints derive `workspaceId` from bearer auth or `X-API-Key`.
- Clients must not send or override `workspaceId`.
- Cross-workspace reads and writes fail closed.
- Significant business mutations emit durable events.
- System tables use domain actions instead of unrestricted delete/update.
- Agent onboarding uses `GET /v1/connection` and its adapter manifest.

## API Shape

Business record resources should converge on this route shape unless a table
has a documented reason to stay action-based:

```text
GET    /v1/<resource>
GET    /v1/<resource>/:id
POST   /v1/<resource>
PATCH  /v1/<resource>/:id
DELETE /v1/<resource>/:id
```

Deletion should default to soft archive or safe deactivate where the table is
part of operational history, external sync, or agent memory. Hard delete is
allowed only for clearly disposable configuration rows and only after relation
guardrails are implemented.

All resources must return the existing response envelope:

```json
{ "data": {} }
```

and errors must use safe stable codes such as `validation_error`, `not_found`,
`forbidden`, `conflict`, and `workspace_required`.

## Table Access Policy

| Prisma model | Table | Agent API target |
| --- | --- | --- |
| `Project` | `projects` | Full business CRUD with events. |
| `Goal` | `goals` | Full business CRUD with relation validation and events. |
| `Target` | `targets` | Full business CRUD with relation validation and events. |
| `TaskList` | `task_lists` | Full CRUD after safe delete/archive rules for linked tasks and ClickUp lists. |
| `Task` | `tasks` | Existing full CRUD/archival path, keep provider write-back rules. |
| `Client` | `clients` | Full CRM CRUD with relation validation. |
| `PipelineStage` | `pipeline_stages` | Create/read/update plus guarded delete or deactivate when deals reference it. |
| `Deal` | `deals` | Full CRM CRUD with client and stage validation. |
| `Interaction` | `interactions` | Create/read/update/archive; hard delete only if explicitly approved. |
| `Note` | `notes` | Create/read/update/archive; preserve ClickUp comment bridge behavior. |
| `Decision` | `decisions` | Create/read/update/archive; decisions should remain auditable. |
| `Agent` | `agents` | Create/read/update/deactivate; delete only after log/event guardrails. |
| `AgentLog` | `agent_logs` | Append/read plus optional redaction/archive; no broad destructive delete. |
| `Event` | `events` | Append-by-system/read-only for agents; no direct CRUD. |
| `OperatingArea` | `operating_areas` | Read/update for user-created areas only; guarded create/delete follows V2WEB-021. |
| `OperatingFolder` | `operating_folders` | CRUD after area ownership and child table reassignment rules. |
| `OperatingTable` | `operating_tables` | Read/update metadata; create custom tables only after an explicit architecture decision. |
| `ExternalContainerMapping` | `external_container_mappings` | Read plus scope update/reconcile actions; provider identity is adapter-owned. |
| `ExternalFieldMapping` | `external_field_mappings` | Read plus provider-backed reconcile/update mapping actions. |
| `StorageLocation` | `storage_locations` | Complete scoped CRUD with relation validation. |
| `KnowledgeRoot` | `knowledge_roots` | Complete scoped CRUD with relation validation. |
| `AutomationDefinition` | `automation_definitions` | Complete scoped CRUD with enable/disable lifecycle. |
| `GoogleDriveFile` | `google_drive_files` | Provider-owned read/scope/refresh/archive actions, not arbitrary raw CRUD. |
| `GoogleDriveContentSnapshot` | `google_drive_content_snapshots` | Read latest/history and refresh/rebuild actions; no arbitrary edits. |
| `ExternalWebhookRegistration` | `external_webhook_registrations` | Read/reconcile/delete-through-provider actions only. |
| `ProviderEventInbox` | `provider_event_inbox` | Read safe metadata and retry failed rows; no arbitrary edit. |
| `AgentEventOutbox` | `agent_event_outbox` | Read pending and ack; optional create for internal bridges only. |
| `ApiKey` | `api_keys` | Owner-managed create/list/activate/deactivate/rotate; raw key shown once. |
| `IntegrationSetting` | `integration_settings` | Provider-specific get/put/actions; never expose secrets. |
| `User` | `users` | Auth/account routes only, no agent CRUD. |
| `Workspace` | `workspaces` | Account/workspace metadata route only, no agent CRUD. |
| `WorkspaceMembership` | `workspace_memberships` | Future owner-admin membership API; not required for agent memory. |

## Delivery Waves

### Wave A: Contract And Capability Discovery

Goal: make it unambiguous what agents may read/write.

- Add an API/table capability matrix to `docs/API.md`.
- Expand `/v1/connection` adapter manifest with each implemented route and
  lifecycle constraint.
- Add route-level capability strings for `:read`, `:write`, `:archive`,
  `:delete`, `:admin`, `:retry`, and `:ack` where needed.
- Document an agent onboarding flow:
  `GET /v1/connection -> inspect capabilities -> use only advertised routes`.

Validation:
- `npm run build`
- `npm test`
- manifest assertions in `src/tests/api.test.ts`

### Wave B: Business Table Read/Update Completion

Goal: agents can read one record, list records, create records, and update
records for all first-party business tables.

Scope:
- `projects`
- `goals`
- `targets`
- `clients`
- `deals`
- `interactions`
- `notes`
- `decisions`
- existing `task_lists`, `tasks`, `pipeline_stages`, `agents`, `agent_logs`

Implementation rules:
- Add `GET /:id` wherever missing.
- Add `PATCH /:id` wherever missing.
- Keep relation IDs workspace-scoped.
- Emit update events for meaningful mutations.
- Preserve provider write-back behavior for ClickUp-backed tasks and notes.

Validation:
- same-workspace create/read/update tests
- cross-workspace foreign relation rejection tests
- denied unauthenticated/service scope tests where relevant
- event readback tests

### Wave C: Safe Archive/Delete Semantics

Goal: agents can remove or close records without corrupting operational
history or external provider mappings.

Default policy:
- `tasks`: existing archive behavior remains canonical.
- `notes`, `decisions`, `interactions`, `agent_logs`: archive/redact instead
  of hard delete unless approved otherwise.
- `task_lists`, `pipeline_stages`, `agents`: guarded delete/deactivate with
  clear relation handling.
- `projects`, `goals`, `targets`, `clients`, `deals`: guarded archive/delete
  after dependent-record rules are documented and tested.

Validation:
- dependent relation guard tests
- provider-owned record behavior tests
- event emission tests for archive/delete

### Wave D: Operating Model Registry CRUD

Goal: agents and owner UI can manage operating folders, storage, knowledge,
and automation records through stable APIs.

Scope:
- complete `GET /:id`, `PATCH /:id`, and guarded `DELETE /:id` for
  `storage-locations`, `knowledge-roots`, and `automation-definitions`
- complete safe lifecycle routes for operating folders
- keep operating tables explicit and typed; custom table creation needs user
  approval before implementation
- align with V2WEB-021 for user-created operating area deletion guardrails

Validation:
- scope relation matrix across area, folder, and table
- protected `00. Glowny` behavior
- owner UI smoke where a route is exposed in the console

### Wave E: Provider And System Lifecycle APIs

Goal: agents can operate integrations safely without raw system-table CRUD.

Scope:
- Google Drive file refresh, scope update, content read, and content rebuild
- ClickUp webhook registration reconcile/delete
- Provider event inbox read/retry
- Agent event outbox read/ack
- API key owner lifecycle and optional rotate endpoint
- Integration settings provider-specific configure/disable routes

Validation:
- secret redaction tests
- provider failure mapping tests
- replay/ack idempotency tests
- fail-closed tests for service keys without owner-only permission

### Wave F: Agent Training Package

Goal: one agent can be taught to use CompanyCore as durable operational memory.

Deliverables:
- `docs/operations/agent-companycore-api-playbook.md`
- example read flow: connection, list tables, read project/task/context
- example write flow: create note, create decision, update task, write log
- safety rules: never send `workspaceId`, never store raw key in logs, handle
  401/403/422 as startup failure, confirm capabilities before writes
- smoke script or documented curl sequence for an agent key

Validation:
- local or production protected smoke with a dedicated service API key
- no secret material committed or logged

## Proposed Canonical Queue

1. `AGCRUD-001 Agent CRUD Capability Matrix` - done
   - Stage: planning
   - Type: feature
   - Priority: P1
   - Deliverable: documented route/table matrix, first task contract, and
     updated canonical queue.

2. `AGCRUD-002 Business Read/Update API Completion` - done
   - Stage: implementation
   - Type: feature
   - Priority: P1
   - Deliverable: `GET /:id` and `PATCH /:id` for first-party business tables
     that currently lack them.

3. `AGCRUD-003 Business Archive/Delete Policy And Slice` - done
   - Stage: planning
   - Type: feature
   - Priority: P1
   - Deliverable: approved archive/delete semantics, then one small
     implementation slice.

4. `AGCRUD-004 Registry Resource Lifecycle API` - done
   - Stage: implementation
   - Type: feature
   - Priority: P1
   - Deliverable: full scoped lifecycle for storage locations, knowledge roots,
     automation definitions, and operating folders.

5. `AGCRUD-005 Provider/System Lifecycle Manifest` - done
   - Stage: implementation
   - Type: feature
   - Priority: P2
   - Deliverable: manifest and tests for provider/system action routes that
     agents may call safely.

6. `AGCRUD-006 Agent CompanyCore API Playbook` - done
   - Stage: release
   - Type: release
   - Priority: P1
   - Deliverable: agent onboarding and read/write playbook with smoke evidence.

## First Task Contract

## Header
- ID: AGCRUD-001
- Title: Agent CRUD Capability Matrix
- Task Type: feature
- Current Stage: planning
- Status: DONE
- Owner: Planner
- Depends on: V2WEB-021 awareness for operating area delete semantics
- Priority: P1
- Coverage Ledger Rows: not applicable
- Iteration: next available
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the current builder queue assumption.
- [x] The task is aligned with repository source-of-truth documents.

## Context

CompanyCore already exposes many workspace-scoped APIs and a machine-readable
adapter manifest. The current gap is that agents cannot reliably know which
tables support read, create, update, archive, delete, or only domain actions.

## Goal

Publish a precise agent-facing CRUD capability matrix and update the adapter
manifest contract so agents can discover safe read/write behavior before using
CompanyCore as operational memory.

## Scope

- `docs/planning/agent-crud-api-rollout-plan.md`
- `docs/API.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- optional follow-up task notes in `.codex/context/PROJECT_STATE.md`
- no runtime code changes in this planning task

## Implementation Plan

1. Compare Prisma models, `docs/API.md`, `docs/DATABASE.md`, and
   `/v1/connection` manifest.
2. Record per-table access policy: full CRUD, archive-only, read/action-only,
   owner-only, or internal-only.
3. Add the resulting matrix to API documentation.
4. Queue the next smallest implementation slice.
5. Leave runtime implementation to follow-up tasks.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: route coverage is uneven and not fully documented for agent training.
- Gaps: many business tables have create/list but lack single read, update, or
  archive semantics.
- Inconsistencies: docs say API is the access layer, but not every table has a
  clear agent-safe route policy.
- Architecture constraints: system tables must not become raw CRUD.

### 2. Select One Priority Task
- Selected task: AGCRUD-001.
- Priority rationale: agents need a stable contract before broader CRUD is
  implemented.
- Why other candidates were deferred: implementation before this matrix risks
  inconsistent route semantics.

### 3. Plan Implementation
- Files or surfaces to modify: planning and API docs only.
- Logic: no runtime logic in this task.
- Edge cases: distinguish full CRUD from safe lifecycle actions.

### 4. Execute Implementation
- Implementation notes: planning/documentation only.

### 5. Verify and Test
- Validation performed: documentation consistency review.
- Result: runtime validation deferred to implementation tasks.

### 6. Self-Review
- Simpler option considered: add generic CRUD for all models.
- Technical debt introduced: no.
- Scalability assessment: table policy matrix scales to new models.
- Refinements made: system tables use lifecycle/action APIs instead of raw
  mutation.

### 7. Update Documentation and Knowledge
- Docs updated: planning/API docs.
- Context updated: task board and next commits.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Every Prisma model is classified by safe API access policy.
- [x] The first implementation task is narrow and executable.
- [x] Agent-facing rules are explicit enough to teach an agent read/write usage.

## Success Signal
- User or operator problem: agents cannot confidently use CompanyCore memory.
- Expected product or reliability outcome: agents can discover supported routes
  and avoid unsafe direct DB or system-table writes.
- How success will be observed: a service-key agent can follow the playbook and
  perform read/write smoke without code-level knowledge.
- Post-launch learning needed: yes.

## Deliverable For This Stage

A planning document and canonical queue entries only.

## Constraints

- use existing API, Prisma, auth, and adapter-manifest patterns
- no raw table-admin API for secrets, users, workspaces, provider inbox, or
  audit/event rows
- no runtime implementation during this planning stage

## Definition of Done
- [x] Plan is committed to canonical planning docs.
- [x] Task board and next-commits queue are synchronized.
- [x] Runtime follow-up tasks are small enough for one-agent implementation.
- [x] `DEFINITION_OF_DONE.md` will be checked before any implementation task is
  marked `DONE`.

## Stage Exit Criteria
- [x] Output matches `planning`.
- [x] Later-stage implementation was not mixed in.
- [x] Risks and assumptions are stated clearly.

## Validation Evidence
- Tests: not applicable for planning.
- Manual checks: reviewed architecture, API, database, current route manifest,
  and task board.
- Screenshots/logs: not applicable.
- High-risk checks: system tables deliberately excluded from raw CRUD.
- Coverage ledger updated: not applicable.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: no, implementation deferred.
- Real API/service path used: not applicable.
- Endpoint and client contract match: planned.
- DB schema and migrations verified: schema model list reviewed.
- Regression check performed: documentation-level route coverage review.

## Security / Privacy Evidence
- `docs/security/secure-development-lifecycle.md` reviewed: deferred to
  implementation tasks.
- Data classification: business data, integration secrets, service keys,
  provider payloads, audit events.
- Trust boundaries: service API keys may operate only inside their workspace.
- Permission or ownership checks: must be included in every follow-up task.
- Abuse cases: broad delete, cross-workspace access, secret disclosure, and
  provider replay misuse.
- Secret handling: raw keys and integration secrets remain non-readable.
- Fail-closed behavior: required for 401, 403, 422, and cross-workspace IDs.

## Architecture Evidence
- Architecture source reviewed: `docs/architecture/system-architecture.md`,
  `docs/architecture/architecture-source-of-truth.md`.
- Fits approved architecture: yes.
- Mismatch discovered: no.
- Decision required from user: yes, before custom table creation or hard-delete
  semantics for historical records.
- Follow-up architecture doc updates: only if custom tables or delete policy
  changes source-of-truth behavior.

## Deployment / Ops Evidence
- Deploy impact: none for planning.
- Env or secret changes: none.
- Health-check impact: none.
- Smoke steps updated: deferred.
- Rollback note: revert docs/queue changes.
- Observability or alerting impact: deferred.
- Staged rollout or feature flag: not applicable for planning.
- `DEPLOYMENT_GATE.md` reviewed: deferred to runtime tasks.

## Review Checklist
- [x] Process self-audit completed before implementation.
- [x] Autonomous loop evidence covers all seven steps.
- [x] Exactly one priority task was selected for this iteration.
- [x] Current stage is declared and respected.
- [x] Deliverable for the current stage is complete.
- [x] Architecture alignment confirmed.
- [x] Existing systems were reused where applicable.
- [x] No workaround paths were introduced.
- [x] No temporary solution was introduced.
- [x] No logic duplication was introduced.

## Result Report
- Task summary: planning task for safe agent CRUD rollout.
- Files changed: planning/API queue docs.
- How tested: documentation review only.
- What is incomplete: nothing for AGCRUD planning; runtime follow-up work was
  completed by AGCRUD-002 through AGCRUD-006 and later AGRUN tasks.
- Next steps: no AGCRUD follow-up remains ready.
- Decisions made: system tables use controlled lifecycle actions, not raw CRUD.
