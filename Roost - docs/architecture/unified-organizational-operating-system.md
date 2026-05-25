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

AI systems such as Paperclip, Aviary, Jarvis, Codex, or future automation
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
`personality_profile`, `model`, `runtime_mode`, `paperclip_agent_id`,
`synchronization_enabled`, generated markdown files, sync status, sync log, and
timestamps. CompanyCore/Roost owns these values; Paperclip consumes them as a
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
CEO Assistant
  -> Director
  -> Manager
  -> Leader
  -> Worker

Worker reports blocker
  -> superior analyzes issue
  -> superior delegates information gathering if needed
  -> context returns downward
  -> original work resumes
```

This recursive organizational loop is a core architecture requirement. It
should apply equally when the worker, leader, manager, or assistant is human or
AI.

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

## Missing Abstractions And Target Gaps

The following gaps are accepted target gaps. They require future scoped task
contracts before implementation:

| Gap | Current workaround/foundation | Future architecture direction |
| --- | --- | --- |
| Unified workforce identity | separate `users` and `agents` with roles/service keys | workforce member abstraction with human and agent profiles |
| Rank hierarchy | role type and escalation targets | rank catalog and supervisor/reporting graph |
| Department membership | operating areas, business functions, role ownership | explicit workforce-department membership/capacity model |
| Assignment/delegation history | task owner fields are not first-class; workflow actors exist in runs | task assignment, delegation, escalation, returned-context records |
| Rich task lifecycle | limited `TaskStatus` plus workflow/stage statuses | command-shaped lifecycle over task and workflow records |
| Contextual visibility | API capabilities and service-key profiles | rank/role/department/project-context policy derivation |
| Workforce workload | partial task/read packet summaries | capacity, availability, workload, blocker state |
| Agent profile depth | `agents`, service keys, agent logs/events | profile for MCP identity, provider/model, skills, tools, constraints, memory |
| Organizational world-state API | area graphs and department read packets | unified org-state read API plus MCP resources |

Implementation must prefer read models and explicit mapping audits first. Add
new tables only when existing CompanyCore foundations cannot honestly express
the needed behavior.

## Compatibility With Existing Architecture

This direction extends and does not supersede:

- `system-architecture.md`;
- `autonomous-company-operating-system.md`;
- `organizational-architecture-bridge.md`;
- `companycore-business-module-map.md`;
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
