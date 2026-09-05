# Unified Organizational Operating System Architecture

Last updated: 2026-05-17

## Purpose

This document extends the accepted CompanyCore architecture toward a unified
organizational operating system. It aligns the current database, backend,
frontend, permissions, workforce, task, pipeline, API, MCP, and department
system direction without replacing the existing Company OS contracts.

CompanyCore is the operational source of truth for the organization. It is not
AI. It is the structured environment that humans, AI agents, integrations, and
future clients use to understand and operate the company.

```text
CompanyCore = organizational infrastructure and world state
Humans = workforce members using web and future mobile clients
AI agents = workforce members using API/MCP and service integrations
Providers = external systems connected through adapters
```

AI systems such as Codex Agent Host, Aviary, Jarvis, Codex, or future automation
runtimes must remain external clients. They may receive work, read context,
report progress, request approvals, and execute allowed commands only through
CompanyCore API/MCP/service boundaries.

## Current Architecture Baseline

The current implementation already contains important foundations:

| Area | Current foundation | Direction |
| --- | --- | --- |
| Workforce identity | `users`, `agents`, `workforce_entities`, service API keys, `company_roles` | use `workforce_entities` as the first shared human/AI roster while preserving human auth and agent profile/runtime details |
| Departments | `operating_areas`, `business_functions`, 00-12 department registry | use departments as management-system lenses over shared CompanyCore records |
| Roles and authority | `company_roles`, API scopes, capabilities, service-key profiles | evolve into rank, role, department, and project-context derived permissions |
| Tasks | `tasks`, `task_lists`, ClickUp sync, Operations read packets | evolve from todo/status records into recursive delegated work items |
| Workflows | `processes`, `pipelines`, `pipeline_stages`, `procedures`, `procedure_steps` | remain the canonical process/procedure model for human and agent execution |
| Process Core | existing workflow definitions, runtime runs, approvals, events, audit, resources, workforce, and MCP manifest foundations | evolve into reusable workflow-item attachment, evidence, approval-policy, checklist, blueprint, linked-asset, and agent runtime context contracts across departments and entity types |
| Runtime state | `pipeline_runs`, `stage_runs`, `approvals`, `acceptance_criteria`, `events`, `audit_logs` | remain the auditable evidence layer for work, escalation, approval, and automation |
| Resources and knowledge | `resources`, Drive files/snapshots, `knowledge_roots`, `knowledge_items`, notes, decisions | expose organizational context to humans and agents through permissioned read packets |
| MCP/API | capability manifest, scoped key profiles, `/v1/mcp/manifest`, `/v1/connection` | become the primary structured world-state interface for external agents |
| Frontend | selected-area department shell, read packets, shared components | render contextual management surfaces based on workforce context and authority |

These foundations should be extended before new broad tables are added. Missing
fields or tables are target gaps, not approval to create a parallel HR, task,
agent, or permission subsystem.

## Unified Workforce Model

CompanyCore must model humans and AI agents as native organizational entities:

```text
WorkforceMember
  -> Human profile
  -> Agent profile
```

The current `User` and `Agent` tables remain valid foundations. The first
approved unifying layer is `workforce_entities`, introduced for
`06 People & Agents` as a workspace-scoped roster and configuration source for
humans and AI agents. It is intentionally not a full HR/ERP model: skills,
competencies, rank, capacity, employment metadata, ClickUp assignee mapping,
and derived RBAC remain future scoped contracts.

Target shared properties:

| Property | Meaning |
| --- | --- |
| `id` | stable organizational identity |
| `type` | `human`, `agent`, and future hybrid/member types |
| `department_id` | primary department or operating area |
| `role_id` | functional role such as backend developer, CEO assistant, AI manager |
| `rank_id` | authority level such as worker, leader, manager, director, owner |
| `supervisor_id` | direct reporting target in the hierarchy |
| `visibility_scope` | what the member may see by default |
| `active_status` | active, paused, retired, archived, or similar lifecycle |
| `context_access` | knowledge, resource, and operational context boundaries |
| `workload_state` | availability, capacity, blockers, assigned workload |

Current `workforce_entities` V1 attributes are narrower: `type`, `status`,
`name`, `slug`, `description`, `avatar`, `department`, `role`, `manager_id`,
`personality_profile`, `model`, `runtime_mode`, `runtime_external_id`,
`synchronization_enabled`, generated markdown files, sync status, sync log, and
timestamps. CompanyCore/Roost owns these values; Codex Agent Host consumes them as a
runtime target through explicit sync events.

Human-specific profile data belongs in a human profile layer:

- employment and workforce metadata;
- contact and account information;
- availability and capacity;
- department, role, and reporting metadata;
- future HR compliance fields.

Agent-specific profile data belongs in an agent profile layer:

- model and provider;
- MCP identity and service-key linkage;
- connected systems and tool profile;
- skill and tool references;
- execution constraints and risk policy;
- memory/context configuration;
- behavior configuration and escalation rules.

Humans and agents must be assignable to the same organizational structures,
but profile details must stay type-specific. Do not put provider/model fields
on human records or employment/contact fields on agent records unless a future
hybrid profile contract explicitly requires it.

## Organizational Hierarchy

The [accepted autonomy contract](autonomy-activation-contract.md) refines this
target: the twelve department directors are peers, and the Management
Director/CEO coordinates rather than supervising them. Each worker has one
accountable department and one direct supervisor. Cross-department context and
specialist clarification do not bypass delegated responsibility.

The default authority hierarchy is:

```text
Owner -> Director -> Manager -> Leader -> Worker
```

This hierarchy applies to humans, AI agents, and mixed teams. It should be
represented through ranks, roles, departments, reporting relationships,
responsibilities, escalation paths, and permission derivation.

The hierarchy answers:

- who owns a result;
- who can approve or reject a risky action;
- who receives an escalation;
- who may delegate work downward;
- who receives status, blocker, and evidence reports upward.

Hierarchy must not replace horizontal process flow. Processes and pipelines
still describe how work moves from input to outcome. Hierarchy describes who
is accountable, who supervises, and who can decide.

## Recursive Delegation And Reporting

Task delegation flows downward. Reporting and escalation flow upward.

```text
Owner
  -> Department Director
  -> Manager
  -> Leader
  -> Worker

Worker reports blocker
  -> superior analyzes issue
  -> superior delegates information gathering if needed
  -> context returns downward
  -> original work resumes
```

An assistant or CEO may coordinate this loop but is not an extra reporting
layer above the directors. This recursive loop is a core architecture requirement.
It should apply equally when the worker, leader, manager, or assistant is human
or AI.

CompanyCore must store enough structure to answer:

- who assigned the task;
- who accepted or owns execution;
- who is blocked;
- who was asked for information;
- who escalated;
- what context or evidence returned;
- which approval or decision unblocked the work;
- which events and audit records prove the path.

## Task System Evolution

The current task model is a useful foundation, but target tasks are not simple
todo items. They are delegated organizational work units connected to people,
agents, procedures, resources, decisions, and evidence.

Target task capabilities:

- delegation chains;
- escalation chains;
- parent and child tasks;
- recursive subtasks;
- approval flows;
- reporting flows;
- dependency relationships;
- procedural execution;
- attached organizational context;
- attached knowledge and resources;
- communication history;
- audit history.

Target lifecycle:

```text
Created -> Assigned -> In Progress -> Blocked -> Needs Information
  -> Escalated -> Waiting Response -> Returned -> Review
  -> Approved -> Completed

Rejected is a terminal or rework-triggering decision state.
```

Future implementation should not overload the current `Task.status` enum with
every target state in one migration. Prefer:

1. read-model enrichment over current tasks, workflow runs, events, notes,
   dependencies, approvals, resources, and agent logs;
2. explicit task assignment/delegation records when ownership and history need
   first-class queryability;
3. command-shaped task lifecycle routes for assignment, escalation, return,
   approval, and completion;
4. audit/event evidence for every high-impact transition.

Task writes must preserve workspace scope, actor identity, permission checks,
approval requirements, events, audit, and MCP manifest exposure.

## Permissions And Contextual Visibility

Permissions should derive from organizational context, not user-specific
hardcoded logic.

Target derivation inputs:

| Input | Examples |
| --- | --- |
| Rank | worker, leader, manager, director, owner |
| Role | backend_developer, marketing_manager, qa_specialist, ceo_assistant, ai_worker, ai_manager |
| Department | 00 Main, 04 Operations, 06 People/Agents, etc. |
| Project or workflow context | assigned project, pipeline run, client, resource, procedure |
| Capability profile | API/MCP capability, risk level, approval requirement |
| Autonomy policy | read-only, propose-only, supervised command, approved execution |

All users technically access the same platform, but visible data and actions
must adapt to organizational context across web, API, MCP, resources, and
agent packets.

Contextual visibility examples:

| Rank | Default visibility |
| --- | --- |
| Worker | assigned tasks, procedures, checklists, reporting tools, own blockers |
| Leader | team work, blocker handling, local approvals, returned work |
| Manager | department planning, workload, escalations, approval queue |
| Director | department KPIs, strategic state, pipelines, risk and resource oversight |
| Owner | full organizational visibility, cross-department command, final approvals |

Visibility is not only frontend navigation. API and MCP responses must filter,
redact, or omit records and tools according to the same derived authority. MCP
tool manifests should expose only tools available to the key/profile/context,
and read packets should include blocked actions so agents know what they cannot
do.

## Contextual Rendering Model

The web UI must render the same CompanyCore world state differently depending
on the actor's organizational context.

The same route family can produce different emphasis:

- worker: today's assigned work, procedure, checklist, report blocker;
- leader: team blockers, returned tasks, local approvals;
- manager: department workload, planning, escalation analysis;
- director: KPIs, cross-team bottlenecks, pipeline health;
- owner: full command surface, cross-department risks, final decisions.

This rendering model affects:

- navigation;
- dashboards;
- selected department boards;
- action buttons;
- empty/error/blocked states;
- API packets;
- MCP tool manifests;
- resource visibility;
- organizational data access.

Do not create separate apps for each rank. Build one shared platform with
contextual projections over the same organizational records.

## Organizational World State

CompanyCore should expose the organization as a structured world state:

```text
workspace
  -> departments / business functions
  -> workforce members / roles / ranks / supervisors
  -> goals / processes / pipelines / procedures
  -> tasks / delegations / escalations / approvals
  -> resources / knowledge / decisions / metrics / risks
  -> events / audit / evidence / feedback
```

External agents should be able to ask CompanyCore:

- what is the current organizational structure?
- who owns this task, resource, process, or risk?
- what can I read?
- what can I propose?
- what can I execute?
- what needs approval?
- where should I escalate?
- what evidence proves the latest state?

CompanyCore must answer through structured APIs, read packets, MCP resources,
MCP tools, and audited command routes. Agents must not reconstruct authority
from raw database tables or provider-specific screens.

## MCP/API First Architecture

Major organizational systems should be accessible through:

- HTTP API endpoints;
- MCP tools and resources;
- service abstractions;
- read packets;
- command routes;
- event and audit evidence.

The target access shape is:

```text
External agent or service
  -> MCP tool/resource or HTTP API
  -> CompanyCore auth/capability/rank/role/context policy
  -> read packet or command service
  -> event/audit/evidence
  -> PostgreSQL source of truth
```

MCP servers remain thin wrappers. They must not implement independent
permission logic, workflow state transitions, approval decisions, provider
access, or database reads.

## Shared Organizational Record Context

Roost now has a reusable organizational-context foundation for global company
records:

- `organizational_department_relations` records owning, related, and applicable
  departments without making a department the database container of an object;
- `organizational_scopes` records company, department, project, product,
  service, client, team, role, human, agent, feature, and component lenses;
- `entity_ownerships` separates accountable/responsible ownership from scope
  and department relevance.

`Goal` is the native-model reference implementation. `01 Strategy -> Goals` is
the canonical all-company workbench, while `09 Technology -> Goals` is a
contextual projection over the same `/v1/goals` records. A Goal related to
multiple departments keeps one ID; updates made through any perspective are
immediately visible in every other matching perspective. Existing Goal rows are
preserved without inventing ownership or scope during migration.

The same service boundary is available to tasks, task lists, procedures,
projects, decisions, risks, metrics, resources, policies, processes,
applications, clients, workforce entities, features, evidence, and generic
company records and Drive-backed files. `company_records` supplies canonical requirements,
deliverables, issues, incidents, contracts, compliance items, budgets,
invoices, experiments, portfolio items, escalations, reviews, and similar
families only where no stronger native model exists. `evidence_records` and the
generic `dependencies` edge table provide verified evidence and typed
cross-entity relationships without department-local copies.

Tasks, Task Lists, Projects, Procedures, Decisions, Goals, Resources, Risks,
Metrics, Policies, workforce records, and Drive files
now expose department-filtered reads over their native records. Technology,
Legal, and Innovation reuse the canonical Operations Procedure and Assets File
workbenches through contextual routes; edits retain one source ID and Procedure
revisions inherit organizational context.

`department_view_definitions` declares each view's canonical department,
route, default scope, permissions, and order;
`department_view_availability` makes that view available in additional
departments. The authenticated department catalog now renders navigation from
these persisted availability rows; the static catalog is only a bootstrap and
network-failure fallback. Management can assign enabled views to a department
without changing frontend routing. The Products and Innovation requirement
workbenches therefore query the same record IDs. All 13 departments expose
active workbenches for their core native records or the shared record families.

The read layer exposes global search, company and department health, an
interactive unified Company Graph, universal entity inspection/navigation,
and `task-agent-execution-context-v1`. The agent packet includes objective,
business context, project, capabilities/features/requirements, current and
desired state, components, dependencies, policies, resources, permissions,
procedures, decisions, issues, incidents, risks, acceptance criteria, evidence,
and escalation rules. Application-linked
requirements are included in the existing Application Graph and application
agent context, preserving one graph per application.

Every department dashboard receives the same scoped health packet. The packet
aggregates active goals/projects, open/blocked/overdue tasks, applicable
procedures, assigned people and agents, resources, incidents/issues, decisions
requiring review, active risks, tracked metrics, stale evidence, and functional
state gaps. Dashboard cards route to the same reusable workbenches with a
department filter.

## Implemented Company OS Coverage

The runtime foundation now covers the requested shared domains without making
departments database containers:

| Concern | Canonical implementation | Department projection |
| --- | --- | --- |
| Ownership and scope | organizational relations, scopes, entity ownership | owner/related/applicable/company filters |
| Goals, tasks, task lists, projects, procedures, decisions | native global models and CRUD | canonical plus contextual workbenches |
| Requirements, deliverables, issues, incidents, environments, contracts and other record families | `company_records` | record-type and department filters |
| Resources, risks, metrics, policies | native models through `/v1/company-objects` | canonical Assets/Management/Strategy/Legal homes plus contextual views |
| Files | Drive-backed canonical file rows | Assets canonical file manager and department-filtered projections |
| Relations and evidence | generic dependency edges and evidence ledger | Company Graph and universal entity inspector |
| Company and department observability | one health aggregation API | the same signal model scoped per department |
| Agent execution | structured task/application context APIs | cross-department context follows explicit relations |
| Application engineering | one Application Workspace and expandable Application Graph | projects, capabilities, features, requirements, components, tasks, procedures and evidence remain linked records |
| Project execution | one central Project Workspace with five grouped views | intent, product model, delivery, governance, evidence and activity resolve from the canonical Project ID instead of duplicated project pages |

The intentionally deferred boundary from the request is automated repository
discovery/scanning. The model is ready to receive discovered architecture,
components, features, dependencies, implementation observations and evidence,
but no scanner is simulated and source code is never treated as proof that a
requirement works.

## Compatibility With Existing Architecture

This direction extends and does not supersede:

- `system-architecture.md`;
- `autonomous-company-operating-system.md`;
- `organizational-architecture-bridge.md`;
- `companycore-business-module-map.md`;
- `process-core-workflow-core-architecture.md`;
- `companycore-global-business-flow.md`;
- `department-management-systems-architecture.md`;
- `department-management-systems-v1-blueprint.md`;
- `company-os-workflow-definition-command-contract.md`;
- `company-os-definition-editing-contract.md`.

The non-negotiable invariants remain:

- PostgreSQL is the source of truth.
- API/MCP are the supported integration boundaries.
- AI agents are external clients, not embedded backend brains.
- High-impact writes are command-shaped, permissioned, approval-aware,
  audited, and event-emitting.
- Departments are management systems over shared records, not separate apps.
- Providers stay behind adapters and capability contracts.
- Missing data must be shown honestly, not hidden with fake rows or
  placeholders.

## Future Implementation Order

Recommended architecture-safe sequence:

1. Audit current `users`, `agents`, roles, API keys, capabilities, task,
   workflow, and department structures against the unified workforce target.
2. Build a read-only People/Agents authority packet for `06 People/Agents And
   Roles`.
3. Add an organizational world-state read API that joins departments, roles,
   agents, humans, tasks, workflows, resources, permissions, and evidence.
4. Add rank and reporting abstractions only after the read API proves the
   exact fields and queries needed.
5. Add task delegation/escalation command contracts before mutable lifecycle
   expansion.
6. Extend MCP resources/tools from the same API contracts.
7. Add contextual web rendering by rank/role/department after backend policy
   and read packets are explicit.

Runtime implementation should remain incremental and evidence-backed. This
document is a direction and compatibility contract, not authorization for a
broad schema rewrite.
