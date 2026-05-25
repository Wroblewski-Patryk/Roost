# System Architecture

CompanyCore is the operational core for LuckySparrow. It stores company
projects, goals, targets, tasks, CRM context, decisions, notes, AI agent
metadata, agent logs, integration state, and system events. PostgreSQL is the
source of truth, and the HTTP API is the supported integration access layer.
CompanyCore is the company operating system, not an embedded AI system. Humans
use it through the web UI, while AI agents use it through API/MCP as external
clients. The accepted boundary is documented in
`docs/architecture/autonomous-company-operating-system.md`.
The long-term direction is an AI-first organizational operating system that
connects humans, agents, processes, tasks, governance, memory, workflows,
knowledge, KPIs, resources, and decisions into one organizational graph. The
accepted bridge direction is documented in
`docs/architecture/organizational-architecture-bridge.md`. The model-level
business modules that keep this direction scalable across UI, API, MCP,
providers, and agents are documented in
`docs/architecture/companycore-business-module-map.md`. The end-to-end
business value flow that connects market presence, lead qualification,
discovery, offer, product/service delivery, acceptance, payment, support,
feedback, and operating-system improvement is documented in
`docs/architecture/companycore-global-business-flow.md`. The V1 department
management-system direction for turning each of the 13 operating areas into a
coherent management surface is documented in
`docs/architecture/department-management-systems-architecture.md`.
The unified workforce and organizational world-state direction is documented in
`docs/architecture/unified-organizational-operating-system.md`; it treats
humans and AI agents as organizational workforce members while preserving the
boundary that CompanyCore itself is infrastructure, not AI.

## Main Runtime Surfaces

- API or backend: Node.js 22, Express, TypeScript, Prisma.
- Web: owner-only console for workspace setup, operating model visibility,
  integrations, data workbenches, relationship review, Company OS surfaces, and
  MCP/API key management. Before V2 visuals, the web console must become the
  reliable human control plane for the backend and MCP tools. Web UI work must
  stay responsive across mobile, tablet, and desktop while reusing the shared
  Tailwind/DaisyUI component system.
- Mobile: no native app before V2. Mobile web must remain usable for owner
  checks and core actions, but native mobile product work is deferred.
- Jobs or workers: the backend owns a lightweight in-process ClickUp
  maintenance scheduler. It reuses the authenticated maintenance service for
  active workspace settings so missed webhooks, failed inbox rows, and provider
  drift are repaired without introducing a separate worker tier in v1.
- External services: PostgreSQL, ClickUp API, Google Drive/Docs/Sheets APIs,
  optional n8n orchestration, future Paperclip/Jarvis/future GUI API clients.

## Source Of Truth Rules

- PostgreSQL owns canonical company state.
- Prisma owns the database schema and generated database client.
- External tools must not write directly to PostgreSQL.
- Paperclip, Jarvis, n8n, future dashboard clients, and other agents must use
  the API.
- MCP is the preferred agent tool interface above the API. MCP servers should
  wrap CompanyCore HTTP routes and inherit the same workspace, capability,
  validation, approval, event, and audit boundaries.
- AI agents are clients of CompanyCore, not a backend subsystem that owns
  CompanyCore behavior, personality, or decision authority.
- Significant state changes should emit events.
- Schema changes must use migrations before production data becomes valuable.

## Workspace Ownership Boundary

CompanyCore v1 must include a workspace ownership boundary before integration
settings are production-ready.

- Registration creates an owner user and workspace atomically.
- Business records belong to a workspace.
- Service API keys belong to a workspace and are intended for agents and
  automations.
- Integration settings and secrets belong to a workspace.
- Protected requests must resolve `workspaceId` before reads or writes.
- Cross-workspace access must fail closed.

This is not full enterprise multi-tenancy in v1. Invitations, billing,
advanced RBAC, organization administration, and a full CRM UI are out of scope.
However, a single owner may need to manage several company workspaces before
V2. Workspace switching must therefore be explicit: the active workspace stays
inside the signed auth token, switching workspaces mints a new scoped token,
and service API keys remain bound to exactly one workspace.

Before Company City or gamification work begins, follow
`docs/architecture/web-and-mcp-foundation-before-v2.md` as the web/backend/MCP
foundation target.

## Core Data Areas

- Strategy and delivery: projects, goals, targets, task lists, tasks.
- Company OS foundation: processes, pipelines, pipeline stages, procedures,
  procedure steps, company roles, provider-neutral resources, tool adapters,
  integration capabilities, and quality standards.
- Shared pipelines: reusable workflow definitions and ordered workflow/status
  stages that can be used by any department.
- CRM and sales: clients, deals, interactions, and CRM usage of shared
  pipelines where needed.
- Knowledge: notes, decisions.
- AI operations: agents, agent logs.
- Platform state: events, users, workspaces, workspace-scoped API keys,
  integration settings.

The target workforce model unifies human and AI organizational membership over
these foundations:

```text
User / WorkforceMember
  -> Human profile
  -> Agent profile
```

The current `users` and `agents` tables remain foundations, not competing
systems. As of 2026-05-17, `workforce_entities` is the first shared workforce
layer for `06 People & Agents`. It stores the workspace-scoped roster for
humans and AI agents, including type, lifecycle status, name/slug, description,
avatar, department, role, manager link, personality profile, model,
runtime mode, Paperclip runtime ID, sync opt-in state, generated markdown
resources, and sync evidence. Human auth and existing agent registry behavior
remain separate foundations; richer HR, skills, rank, capacity, ClickUp account
mapping, and RBAC derivation require future scoped contracts. Human-specific
employment/account metadata belongs in a human profile; AI-specific provider,
MCP identity, connected systems, skills, tools, constraints, memory, and
behavior metadata belongs in an agent profile.

The target organizational bridge adds these cross-cutting dimensions without
replacing the existing Company OS model:

- vertical role hierarchy and escalation:
  `Owner -> Director -> Manager -> Leader -> Worker`, including human, agent,
  and mixed teams
- APQC-style process domains over the existing process and pipeline graph
- MECE responsibility ownership for important processes, resources, KPIs,
  tools, and governance rules
- PAEI behavioral profiles for roles and agents
- knowledge sources spanning Drive, docs, Markdown/Obsidian roots, snapshots,
  embeddings, and decision memory
- web, future mobile, and MCP as first-class clients over the same API,
  permission, approval, audit, and event boundaries
- Paperclip as a supervised external company-building execution agent that
  uses CompanyCore knowledge, task context, and scoped tools through the same
  API/MCP boundaries rather than direct database or provider access

Task delegation must flow downward through this hierarchy, while reporting,
blockers, requests for information, and approvals flow upward. The task system
must therefore evolve from basic todo records toward delegated work units with
parent/child tasks, delegation chains, escalation chains, approval and
reporting flows, dependency relationships, procedure execution, attached
context/resources, communication history, and audit evidence. The target
lifecycle is `Created -> Assigned -> In Progress -> Blocked -> Needs
Information -> Escalated -> Waiting Response -> Returned -> Review ->
Approved -> Completed`, with `Rejected` as a terminal or rework-triggering
decision state. This should be implemented incrementally through read models,
assignment/delegation records, and command-shaped lifecycle routes rather than
one broad status-enum migration.

Permissions should derive from rank, role, department, project/workflow
context, capability profile, and autonomy policy. They should not be encoded
as user-specific UI or route exceptions. The same derived authority must shape
frontend navigation, dashboards, API responses, MCP manifest exposure,
resource visibility, and organizational read packets.

The global company flow must be treated as a graph projection over these
modules:

```text
strategic intent -> brand/market -> demand -> lead qualification
  -> discovery -> offer/agreement -> delivery planning
  -> product/service execution -> quality/acceptance -> payment
  -> support -> feedback -> improvement -> next intent
```

This flow is the shared model for products, services, and hybrid delivery. It
must not introduce a parallel CRM, delivery, billing, or survey subsystem
without a scoped architecture decision and task contract.

Each operating area should be exposed in V1 as a department management system:

```text
department -> subsystems -> shared CompanyCore modules
  -> records / pipelines / tasks / knowledge / resources
  -> metrics / decisions / risks / AI agent packet / evidence
```

Department systems are UX and graph projections over shared CompanyCore
foundations. They must not duplicate tables, create provider-led departmental
apps, or give agents a bypass around existing API, MCP, approval, event, and
audit boundaries.

## ClickUp-Shaped Operating Model

CompanyCore should evolve toward a ClickUp-compatible operating model without
becoming a ClickUp clone. The canonical internal hierarchy is:

```text
Workspace -> Operating Area -> Operating Folder -> Operating Table -> Record
```

This maps to ClickUp API v2 terminology as:

```text
ClickUp Team/Workspace -> Space -> Folder -> List -> Task
```

ClickUp API v2 still calls the top-level workspace a `Team`; CompanyCore docs
and UI should use `Workspace` and treat ClickUp `team_id` as an external
workspace identifier. Provider-specific naming must stay in integration
mappers, not leak into core domain names.

Every business table should belong to exactly one operating area. The model has
one non-removable fallback area, `00. Glowny`, followed by the 12 company
departments. Each area can own several operating folders and several operating
tables. System tables such as users, memberships, API keys, integration
settings, provider mappings, audit/events, and schema metadata remain
platform-owned and are not counted as business-area tables.

The approved company operating areas are:

0. Glowny
1. Strategy and governance
2. Projects and delivery
3. Tasks and workflow
4. Sales and CRM
5. Marketing and growth
6. Finance and billing
7. People and roles
8. Operations and administration
9. Knowledge and decisions
10. Assets and storage
11. Automations and integrations
12. AI agents and observability

Pipelines are a shared workflow capability, not a Sales/CRM-owned module. CRM
can use pipeline stages for deals, but the same pipeline concept must remain
available to other operating areas when their workflows need staged movement.
The approved Company OS model now separates:

```text
Process -> Pipeline -> PipelineStage -> Procedure -> ProcedureStep
```

Processes describe stable company work such as sales, onboarding, feature
development, documentation, deployment, and agent task execution. Pipelines
describe the cross-department flow from input to outcome. Stages describe the
ordered state and handoff conditions inside a pipeline. Procedures and steps
describe how a stage is executed, including expected input/output, validation,
tools, rollback instructions, and approval needs.

`company_roles` is the role catalog for humans, agents, and system actors.
Every important process and pipeline should have exactly one accountable role
through the owner/default-owner relationship before automation is enabled.
Agents must operate through role responsibilities, permissions, allowed tools,
default policies, and escalation targets rather than raw provider access.

`tool_adapters` and `integration_capabilities` are the provider-neutral
adapter layer. Processes and pipelines should depend on capabilities such as
`create_task`, `read_file`, or `deploy_app`, not on direct ClickUp, Drive,
GitHub, or Coolify API calls. Provider-specific code remains in
`src/integrations/<provider>/`, while the database records expose connection
state, auth type, health, config schema, rate-limit metadata, permission
requirements, approval needs, and audit requirements.

`resources` is the universal resource index for externally or internally
addressable objects: ClickUp tasks, Drive files/folders, GitHub repos, database
tables, clients, projects, documents, prompts, automations, and API endpoints.
Resources can be owned by roles and linked back to projects and processes so
agents can reason about what they are touching before they act.

Runtime evidence for the Company OS is represented as:

```text
PipelineRun -> StageRun -> Approval / AcceptanceCriterion / AuditLog
Event(correlation_id) observes the same workflow
```

`pipeline_runs` are concrete executions of a pipeline, for example a client
onboarding or deployment. They record initiating actor, input/output payloads,
linked task/document IDs, optional client/project links, current stage, status,
timestamps, error state, and a workspace-unique `correlation_id`.

`stage_runs` record the execution of a specific stage inside a pipeline run.
They include assigned actor, input/output, logs, validation result, approval
status, and timestamps. A stage definition can exist without a run; a stage run
is the auditable fact that work started, blocked, failed, or completed.

`approvals` protect risky agent, system, integration, and human-triggered
actions. They capture who requested the action, what resource/action is being
requested, risk level, approver role or user, decision status, decision reason,
expiry, and optional run/stage-run links.

`checklist_templates`, `checklist_items`, and `acceptance_criteria` define and
track completion evidence. Templates are reusable. Acceptance criteria are
attached to a concrete target and hold validation status, verifier, timestamp,
and evidence payload.

`audit_logs` are append-style records for important actions. They store actor,
resource, tool adapter, input, output, approval reference, error state, run
links, and `correlation_id`. They complement `events`: events are the
observable stream, while audit logs are the durable action evidence.

Governance intelligence is represented as:

```text
Policy + Metric + Risk + Control + KnowledgeItem + DecisionLog
AutomationRule + Trigger + Artifact + Dependency
BusinessFunction + Stakeholder
```

Policies define what agents, processes, pipelines, tools, resources, or
departments may do and how enforcement happens: warning, block, approval, or
log-only. Metrics and KPIs define how CompanyCore measures whether the company
and its agents are operating well. Risks capture what can go wrong. Controls
capture how the risk is reduced, verified, and owned.

Knowledge items are the durable knowledge index for process, pipeline,
project, client, agent, and document context. Decision logs are richer than
the earlier lightweight `decisions` table: they record context, options
considered, chosen option, reason, consequences, and review date.

Automation rules and triggers are separate from provider-specific webhooks.
Triggers describe why a workflow starts. Automation rules describe the
condition/action contract that should run or escalate work. Artifacts record
work outputs, and dependencies connect resources or entities so agents can
see blockers before acting.

Business functions are the approved LuckySparrow departments and operating
functions. Stakeholders provide the broader client, vendor, partner, internal,
or other people map beyond CRM clients.

The supported API entrypoint for this graph is `/v1/company-os`. It exposes a
cockpit snapshot plus allowlisted collection reads for Stage 1-3 Company OS
records through `company-os:read`. Writes must be lifecycle-specific routes
with policy, approval, acceptance criteria, event, and audit behavior rather
than raw table CRUD.

### Company OS Approval Lifecycle

Company OS writes must be command-oriented. The first approved write direction
is not raw CRUD over `approvals`, `pipeline_runs`, `stage_runs`, or
`audit_logs`; it is a small set of lifecycle commands that preserve policy,
approval, event, and audit boundaries:

```text
Agent/User/System -> lifecycle command -> policy check -> approval gate
  -> state transition -> event -> audit log -> optional MCP tool result
```

The initial lifecycle command set should be:

1. Request approval: create a pending approval for a proposed action.
2. Decide approval: approve or reject a pending approval exactly once.
3. Start or update pipeline/stage execution: future commands that must require
   an approval reference when risk or policy requires one.
4. Validate or close execution evidence: future commands that record validation
   and acceptance criteria evidence before completion.

Approval requests are for agents, integrations, users, and system processes
that need permission to perform a risky action. The route should create an
`approval_requested` event and an `approval.requested` audit log entry with one
correlation ID. It must derive `workspace_id` from auth, never from the client.

Approval decisions are human- or accountable-role actions. The route should
only operate on `pending` approvals that have not expired. The decision should
set `status`, `decision_reason`, `approver_user_id` when available, and
`decided_at`; then emit `approval_approved` or `approval_rejected` plus an
`approval.decided` audit log entry with the same correlation ID. Decisions must
be idempotency-safe by refusing to decide an already-decided approval.

Lifecycle commands that execute work must fail closed when:

- the caller lacks the route capability
- the target record is outside the caller workspace
- the approval is missing, rejected, expired, or linked to a different resource
- a blocking policy applies
- the requested transition is invalid for the current status

MCP servers should expose these commands only from the CompanyCore manifest.
They must not implement separate approval state transitions or bypass
CompanyCore policy checks.

### Company OS Pipeline And Stage Lifecycle

Pipeline and stage execution writes must use lifecycle commands over
`pipeline_runs` and `stage_runs`. They must not expose raw status patching,
because status transitions also change current stage, approval state,
validation evidence, events, and audit logs.

The stage lifecycle command set is:

1. Start stage: create or resume a `stage_run` for a stage in a running
   pipeline run and set `pipeline_runs.current_stage_id`.
2. Block stage: mark a stage run as blocked with a reason, optional approval
   request reference, and recovery hint.
3. Complete stage: mark a stage run as completed only when required approval
   and acceptance criteria are satisfied.
4. Validate stage: write validation result and acceptance criteria evidence
   without completing the stage automatically.
5. Complete pipeline run: a later command should close a pipeline run only
   when all required stage runs and acceptance criteria have completed or been
   explicitly skipped.

The first implementation slice exposes stage-level commands:

```text
POST /v1/company-os/pipeline-runs/:id/actions/start-stage
POST /v1/company-os/stage-runs/:id/actions/block
POST /v1/company-os/stage-runs/:id/actions/validate
POST /v1/company-os/stage-runs/:id/actions/complete
```

`start-stage` should accept a `pipelineStageId`, optional input payload, and
optional assignment actor. It should fail if the stage is not part of the
pipeline definition, if another active stage run already blocks progression, or
if a required approval policy applies and no approved approval reference is
provided.

`block` should accept a reason, optional error state, and optional
`approvalId`. It should set `stage_runs.status = blocked`, append the block to
`stage_runs.logs`, and set the parent `pipeline_runs.status = blocked` unless
the pipeline has already failed or completed.

`validate` should accept validation status, evidence, and optional acceptance
criterion IDs. It should update `stage_runs.validation_result` and matching
`acceptance_criteria` records. It must not mark the stage complete by itself.

`complete` should accept output payload, validation summary, and optional
`approvalId`. It should require:

- current stage run status is `running` or `blocked`
- every required acceptance criterion for the stage run is `passed` or
  explicitly `waived`
- approval is approved when the stage definition, tool capability, risk, or
  active policy requires approval
- approval belongs to the same workspace and the same stage or pipeline run

Every command must emit a specific event and append an audit log with one
correlation ID:

| Command | Event | Audit action |
| --- | --- | --- |
| start stage | `stage_started` | `stage_run.started` |
| block stage | `stage_blocked` | `stage_run.blocked` |
| validate stage | `stage_validated` | `stage_run.validated` |
| complete stage | `stage_completed` | `stage_run.completed` |
| complete pipeline | `pipeline_completed` | `pipeline_run.completed` |

Invalid transitions must return conflict-style errors instead of silently
overwriting execution history. Automation rules may observe these events, but
automation execution must remain a later slice.

### Company OS Automation Rule Execution

Automation rules are event observers and action requesters. They must not be a
parallel workflow engine that mutates `pipeline_runs`, `stage_runs`,
`approvals`, provider resources, or audit records directly. The approved
execution direction is:

```text
Event -> trigger match -> automation rule condition evaluation
  -> policy/risk/capability check -> action proposal
  -> approval request or lifecycle command -> event + audit evidence
```

The event stream is the input boundary. A rule may match events by
`event_type`, actor, resource, pipeline, stage, provider, metadata, or
correlation ID. Provider webhooks such as ClickUp status changes and Drive file
changes must first become normalized CompanyCore events, then automation rules
can observe those events. Rules must not call provider APIs directly from
trigger matching.

`automation_rules.condition` is a declarative JSON condition. It should support
small, explicit predicates before any broad expression language is introduced:

- event type equals one of an allowlisted set
- event payload path equals, contains, or exists
- event age or stage age crosses a configured threshold
- related resource, pipeline, or stage has a required status
- related policy, risk, or control requires approval

`automation_rules.action` is a declarative action proposal. The first approved
action kinds are:

- `request_approval`: create a pending approval for a risky follow-up action
- `start_stage`: call the stage lifecycle start command
- `block_stage`: call the stage lifecycle block command
- `validate_stage`: call the stage lifecycle validate command
- `complete_stage`: call the stage lifecycle complete command
- `emit_event`: write an informational system event when no state transition
  should happen yet

Risky or externally visible actions must request approval before execution when
the matched policy, risk level, stage definition, tool capability, or
integration capability requires it. Automation execution must use the same
command routes and helper contracts as UI and MCP tools; it must never patch
raw statuses or bypass approval validation.

Automation execution must be idempotency-safe. A matched rule should derive a
stable execution key from workspace ID, rule ID, source event ID, action kind,
and target resource/run/stage ID. Reprocessing the same source event with the
same rule and target must return the existing event/audit evidence or a
conflict-style no-op instead of creating duplicate approvals or repeated stage
transitions.

Every rule evaluation must leave evidence:

| Outcome | Event | Audit action |
| --- | --- | --- |
| rule matched | `automation_rule_matched` | `automation_rule.matched` |
| action proposed | `automation_action_proposed` | `automation_rule.action_proposed` |
| approval requested | `approval_requested` | `approval.requested` |
| lifecycle command executed | command-specific event | command-specific audit action |
| no rule matched | optional `automation_no_match` for debug modes only | optional `automation_rule.no_match` |
| rule failed | `automation_rule_failed` | `automation_rule.failed` |

The current implementation evaluates a single existing event against active
rules and executes `request_approval`, `emit_event`, and stage lifecycle action
proposals. Lifecycle actions such as `start_stage`, `block_stage`,
`validate_stage`, and `complete_stage` call shared lifecycle command functions;
command rejections produce `automation_rule_failed` evidence with the same
stable fail-closed reason. Scheduled scanning, provider-specific webhook
fan-out, retries, backoff, and a separate worker tier remain later slices.

#### Automation Lifecycle Helper Reuse

Automation must not reimplement lifecycle transitions inside the evaluator.
Stage lifecycle behavior lives in a shared internal command service used by
both:

- HTTP route handlers such as
  `POST /v1/company-os/stage-runs/:id/actions/complete`
- automation evaluator actions such as `complete_stage`

The shared service should own validation and mutation in one place:

```text
HTTP route or automation evaluator
  -> parse and authorize caller-specific input
  -> call shared lifecycle command service
  -> service validates workspace, status, approval, criteria, and policy
  -> service writes state transition, event, and audit evidence
  -> caller returns the service result
```

The shared lifecycle service should expose internal functions with explicit
inputs instead of Express request objects:

- `startStageCommand({ workspaceId, actor, pipelineRunId, input })`
- `blockStageCommand({ workspaceId, actor, stageRunId, input })`
- `validateStageCommand({ workspaceId, actor, stageRunId, input })`
- `completeStageCommand({ workspaceId, actor, stageRunId, input })`

These functions must preserve the existing HTTP route behavior, response
payloads, event names, audit actions, and stable error codes. They must not
accept `workspaceId` from external request bodies. They must accept an actor
object derived by the caller, so automation can act as `system` or `agent`
while still recording the original source event and rule ID in audit input.

Automation evaluator lifecycle execution maps to the shared service:

- `start_stage` maps to `startStageCommand`
- `block_stage` maps to `blockStageCommand`
- `validate_stage` maps to `validateStageCommand`
- `complete_stage` maps to `completeStageCommand`

Each evaluator call creates automation-level evidence
(`automation_rule_matched` and `automation_action_proposed`) before calling the
stage lifecycle service. The lifecycle service then creates command-specific
evidence such as `stage_completed` and `stage_run.completed`. Both evidence
chains include correlation metadata, and automation-level audit input records
the source event ID, rule ID, action kind, and idempotency key.

The extraction was behavior-preserving before lifecycle automation was enabled.
Future slices should extend automation breadth by adding new command-shaped
actions, not by patching workflow state directly inside the evaluator.

MCP agents may request evaluation through manifest-exposed CompanyCore routes
only when their service key has the automation capability. They must receive a
structured result containing the matched rule IDs, proposed action, approval
requirement, emitted event IDs, audit log IDs, and any fail-closed reason.

For each workspace, the operating model should make the following resources
addressable through one consistent scope:

- tables and records
- API resources for those tables
- automations that read or write those tables
- storage locations, including local disk, object storage, Google Drive, or
  other providers
- knowledge roots, including Obsidian Markdown branches or Google Drive Docs
- external provider mappings, starting with ClickUp Space, Folder, List, View,
  Custom Field, and Task identifiers

Provider scope assignment is operator-correctable. Automatic classification is
allowed to choose the first operating area for an imported provider container,
but the owner console must let an operator move provider containers to another
area without direct database access. Manual assignments become integration
state, not cosmetic UI state, and provider refresh/import code must preserve
them.

The registry layer should be explicit instead of inferred from table names. A
future schema slice should add records such as `operating_areas`,
`operating_folders`, `operating_tables`, `external_container_mappings`,
`external_field_mappings`, `storage_locations`, `knowledge_roots`, and
`automation_definitions` before broad two-way provider sync is attempted.

Existing v1 domain tables are valid as a foundation, but they are not yet a
complete ClickUp 1:1 structural mirror. The current gap is intentional planning
work, not a reason to overload `projects` or `task_lists` with unrelated
metadata.

## Module Boundaries

- `src/auth/`: authentication and service API key middleware.
- `src/config/`: runtime configuration.
- `src/db/`: Prisma client boundary.
- `src/health/`: public health endpoint.
- `src/mcp/`: MCP-friendly route/tool manifest projection for bridge servers.
- `src/middleware/`: shared Express middleware and error handling.
- `src/modules/*`: domain route modules and business behavior.
- `src/integrations/<provider>/`: provider-specific API clients, mappers, sync
  services, and safe error mapping.
- `public/`: minimal static owner console served by the backend for setup
  workflows only.

Route modules should not call external provider APIs directly. They should call
integration services that read workspace-owned settings and normalize provider
data into CompanyCore models.

## MCP Agent Tooling

CompanyCore should be optimized for MCP consumption without making MCP the
database boundary. The target architecture is:

```text
Agent runtime -> MCP server -> CompanyCore HTTP API -> policies/approvals/events/audit -> PostgreSQL
```

`GET /v1/mcp/manifest` is the first bridge contract. It projects the
capability-scoped HTTP route manifest into MCP-friendly tool definitions,
including tool names, route paths, capability requirements, risk level,
approval hints, and JSON input schemas. The same manifest is also included in
`GET /v1/connection` so agents can discover one connection and then decide
whether to operate through HTTP directly or through an MCP bridge.

MCP servers must stay thin. They should not read Prisma models directly, should
not load integration secrets, and should not implement separate business rules.
Their job is to expose the CompanyCore API as ergonomic tools for agents while
CompanyCore keeps ownership of validation, permissions, event emission,
approval gates, audit logs, and provider adapter behavior.

Agent-facing functionality should be exposed as logical layers rather than as
provider-specific shortcuts:

- knowledge: what an agent may read, search, and cite from CompanyCore,
  imported Drive/Docs/Sheets snapshots, decisions, standards, task state, and
  operating graph context;
- tools: what an agent may execute, such as task creation, status reporting,
  approval requests, document writes, or provider actions routed through
  CompanyCore command APIs;
- access: which service key, profile, scope, risk level, and approval policy
  allows the knowledge or tool use;
- audit: which event, audit log, correlation ID, and feedback signal proves
  the action or read path.

This keeps future Paperclip, Jarvis, and other agents focused on CompanyCore's
business operating graph instead of raw ClickUp, Google Drive, or database
contracts.

## Integration Architecture

ClickUp is the first native CompanyCore integration adapter. The v1 target flow
is:

```text
Owner registration -> workspace -> workspace settings -> ClickUp API
  -> CompanyCore integration adapter -> PostgreSQL -> event
```

The ClickUp adapter should establish the pattern for future integrations:

- provider client
- provider mapper
- provider documentation review before mapping or API implementation
- workspace settings reader
- sync service
- webhook registration service
- webhook receiver with raw-body signature verification
- provider event inbox with idempotency keys
- provider event replay for failed inbox rows
- safe provider error mapper
- idempotent persistence using `(workspace_id, source, external_id)`
- explicit import policy for existing records before writes run
- event emission, outbound agent signals, and observable sync/webhook results
- bidirectional task operations through CompanyCore API routes: create,
  update, archive, mapped Custom Field value writes, and task comments mapped
  to CompanyCore notes

Provider adapters must be designed from current vendor documentation and
record the relevant endpoint, hierarchy, pagination, rate-limit, webhook,
signature, field, and permission assumptions in the task evidence. For ClickUp,
mapping must preserve the `Team/Workspace -> Space -> Folder -> List -> Task`
hierarchy, Custom Field metadata and values, View parent scope, per-token rate
limits, and webhook HMAC signature requirements before enabling write-back or
continuous sync.

For first-run and manually repeated imports, the adapter must support a
workspace-visible import policy. The approved ClickUp modes are `merge`,
`skip_existing`, `replace_selected_lists`, and `inspect_only`. Destructive
provider cleanup must be scoped to provider-owned records only, for example
`source = clickup` tasks under selected ClickUp Lists, and must never delete
native/manual CompanyCore records.

After first import, continuous updates should use ClickUp webhooks as the
primary trigger path instead of relying only on scheduled pulls. The approved
webhook flow is:

```text
Owner enables ClickUp integration -> CompanyCore creates scoped ClickUp webhook
  -> ClickUp POSTs signed event -> CompanyCore verifies signature from raw body
  -> provider event inbox deduplicates -> task delta is reconciled
  -> CompanyCore event/outbox notifies Paperclip, Jarvis, Aviary, or future agents
```

ClickUp webhook registrations are tied to the user token that created them, so
CompanyCore must track webhook health and provide an owner reactivation path
when the ClickUp user loses access or the webhook becomes inactive. Webhook
secrets returned by ClickUp must be encrypted as workspace integration secret
material. Incoming webhook requests must be rejected before parsing business
logic when the `X-Signature` HMAC SHA-256 check fails.

Webhook operations should be managed as durable provider resources, not as
fire-and-forget setup calls. Reconciliation must compare local registrations
with ClickUp's remote webhook list, refresh health, reactivate inactive
webhooks when possible, replace missing remote registrations, and keep stale
local registrations from no-longer-selected Lists inactive until an owner
deletes them.

ClickUp retries delivery, but CompanyCore must also own downstream processing
recovery. If a signed webhook is stored but task/comment processing fails, the
provider event inbox must retain safe failure metadata and expose an owner-only
replay path. Replay must run through the same idempotent mapper as live
webhooks so recovered events refresh CompanyCore state and notify agents
without requiring direct database edits.

Always-fresh behavior should not depend on webhooks alone. CompanyCore exposes
a non-destructive ClickUp maintenance run that reconciles webhook health,
retries failed provider events, and performs a `merge` pull fallback from
ClickUp. Agents or operators can invoke this through the API to close gaps from
missed webhook deliveries, temporary provider failures, or backend restarts
while preserving CompanyCore's immediate write-back path for local changes.
The backend also starts the same maintenance operation on a configurable
interval for every active workspace ClickUp setting. This scheduler must remain
non-destructive and use `merge` only; destructive import repair remains an
explicit owner/operator action.

Webhook processing should be event-first and bridge-friendly. Status changes,
for example `taskStatusUpdated`, must update the CompanyCore task state and
also emit a durable internal event that downstream agents can consume. Paperclip
can use status changes as work triggers, while Jarvis and Aviary can consume the
same event stream for context refreshes, decisions, notifications, or future
automation modules.

Task comments are operational context and should not be lost in a task-only
sync. ClickUp `taskCommentPosted` and comment-field update payloads should map
to CompanyCore notes attached to the corresponding task, keyed by the ClickUp
comment ID. CompanyCore notes created against ClickUp-sourced tasks should
create a ClickUp task comment first and then store the returned comment ID.

n8n remains optional orchestration for workflows better kept outside the
backend. It is not the required primary ClickUp path in v1.

## Google Drive Operating Model

Google Drive is the next native integration after ClickUp. It must reuse the
same adapter architecture instead of creating a parallel document subsystem.
The approved v2 target flow is:

```text
Owner OAuth consent -> workspace Google Drive setting -> Drive API
  -> CompanyCore Google Drive adapter -> PostgreSQL -> events/outbox
```

Google Drive hierarchy maps into the same CompanyCore operating model:

```text
Google account/shared drive -> Drive folder -> Drive file
CompanyCore workspace -> Operating Area/Folder -> Storage/Knowledge file record
```

Drive folders can be attached to an operating area, operating folder, operating
table, storage location, or knowledge root. This lets the dashboard show one
company area that combines ClickUp Spaces/Folders/Lists, Drive folders/files,
CompanyCore tables, automations, and knowledge roots without requiring agents
to know provider-specific hierarchy rules.

Google Drive records are workspace-scoped and must be idempotent by
`(workspace_id, provider = google_drive, external_id)`. Folder/file metadata is
stored separately from extracted content snapshots so repeated scans can update
searchable descriptions without duplicating files. Provider-owned records must
track parent folder IDs, MIME type, Drive web links, revision/version signals,
trashed state, selected operating scope, and safe scan status.

Docs and Sheets support must use current official Google Workspace
documentation before implementation:

- Drive `files.list` for paginated folder/file discovery, including `q`,
  `spaces`, `supportsAllDrives`, `nextPageToken`, and `parents`.
- Drive `files.create`, `files.update`, `files.export`, and download/export
  flows for file creation and content access.
- Drive `changes.getStartPageToken`, `changes.list`, and later
  `changes.watch` for durable freshness.
- Docs `documents.get` and `documents.batchUpdate` for document read/edit.
- Sheets `spreadsheets.get`, `spreadsheets.values.get`,
  `spreadsheets.values.batchGet`, `spreadsheets.values.update`,
  `spreadsheets.values.batchUpdate`, and `spreadsheets.create` for sheet
  read/edit/create.

Google Drive authentication is OAuth-based, not an API-key flow. Refresh tokens
and webhook/channel secrets are workspace-owned integration secret material and
must be encrypted through the existing integration settings mechanism. The
non-secret configuration should include selected root folder IDs, shared drive
IDs when used, import/sync policy, current Drive changes page token, and
operating scope mappings.

Google Drive folder-to-operating-area corrections are stored as operating scope
mappings in the workspace Google Drive integration configuration. When a folder
is manually moved to another operating area, existing imported descendants
should move with it and future imports under that folder should keep the manual
area.

The Google Drive adapter should deliver in vertical slices:

1. Persist Drive folder/file metadata and extracted content snapshots.
2. Add OAuth-backed provider client and owner connection routes.
3. Import selected folders into storage locations and knowledge roots.
4. Read Docs and Sheets into safe, searchable snapshots.
5. Create and edit Docs/Sheets through CompanyCore APIs, then refresh local
   metadata/content snapshots after successful provider writes.
6. Reconcile external edits through Drive `changes.list`, then add
   `changes.watch` channels for push-based freshness.
7. Expose provider-neutral file/content APIs for Jarvis, Paperclip, Aviary, and
   future GUI modules.

CompanyCore remains the source of truth for operational interpretation. Google
Drive remains the file/content source of truth. Jarvis or Paperclip may propose
structured imports from Docs/Sheets into CompanyCore business tables only when a
workspace-visible table mapping exists, the operation is auditable, and writes
go through CompanyCore APIs. Agents must not use raw Google tokens or write
directly to PostgreSQL.

## Security Boundaries

- `GET /health` is public.
- Business, auth-context, integration, and event routes are protected except for
  explicitly public auth bootstrap/login/register routes.
- Owner-user auth is for human/API clients.
- Workspace-scoped service API keys are for Paperclip, Jarvis, n8n, and other
  agents.
- API keys and integration tokens must not be stored only as plaintext in
  production paths.
- Integration secrets must not be returned in API responses or logs.
- Raw provider/backend errors must not be exposed directly to clients.

## Deployment Topology

- Hosting target: Coolify-compatible VPS deployment.
- Runtime services: `backend`, `postgres`.
- Public entry point: backend service on port `3000`.
- Production domains to document and verify:
  - `companycore.luckysparrow.ch`
  - `api.companycore.luckysparrow.ch`
- Private infrastructure: PostgreSQL service and persistent Docker volume.
- Health/readiness endpoint: `GET /health`.
- Required persistence: `companycore_postgres` Docker volume.

## Regression Guardrails

Every runtime feature must answer:

- Which workspace owns the data?
- Which auth path allowed the request?
- Which denied path was tested?
- Which event or log proves the change happened?
- Which migration or schema check protects persistence?
- Which smoke step would catch a regression after deploy?
