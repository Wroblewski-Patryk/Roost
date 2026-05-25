# CompanyCore Business Module Map

Last updated: 2026-05-15

## Purpose

CompanyCore is the bridge for operating the company. It is not only a CRM,
task manager, Drive browser, or integration dashboard. It is the business
operating layer that connects company areas, work, knowledge, files, tools,
agents, governance, resources, decisions, and evidence into one graph.

This document translates the long-term organizational architecture into
model-level modules. It should guide future schema, API, MCP, UI, and agent
work without replacing the approved contracts in `system-architecture.md`,
`organizational-architecture-bridge.md`, or the Company OS command contracts.
The global value-flow model that connects these modules from market signal to
delivery, payment, feedback, and improvement lives in
`docs/architecture/companycore-global-business-flow.md`. The department
management-system architecture that turns the 13 operating areas into scalable
owner and agent surfaces lives in
`docs/architecture/department-management-systems-architecture.md`.
The unified workforce and organizational world-state target lives in
`docs/architecture/unified-organizational-operating-system.md`.

## Product Direction

CompanyCore should let the owner and supervised agents operate the company from
one connected surface:

```text
company intent
  -> operating area
  -> goals / targets
  -> processes / pipelines / tasks
  -> resources / files / knowledge
  -> decisions / approvals / audit
  -> agent tools / feedback / next gaps
```

The complete business loop is defined in
`docs/architecture/companycore-global-business-flow.md` as:

```text
strategic intent -> brand/market -> demand -> lead qualification
  -> discovery -> offer/agreement -> delivery planning
  -> product/service execution -> quality/acceptance -> payment
  -> support -> feedback -> improvement -> next intent
```

Google Drive, Docs, Sheets, ClickUp, and future CRM tools remain important
providers, but they are not the operating source of truth for CompanyCore.
CompanyCore owns operational interpretation, permissions, relationships,
workflow state, audit, and agent-safe access. Providers own their native
content or external records and are connected through adapters.

## Module Classification

Every module should be classified before implementation:

| Classification | Meaning | Examples |
| --- | --- | --- |
| Native core | CompanyCore owns the durable business state and command rules. | operating areas, goals, tasks, processes, approvals, audit |
| Provider-backed | An external provider owns native content while CompanyCore owns metadata, scope, interpretation, and safe commands. | Drive files, Docs, Sheets, ClickUp tasks/lists |
| Future adapter | A future provider may be connected through the adapter/capability layer. | HubSpot CRM, GitHub, Coolify, n8n |
| Derived view | A UI/API/MCP projection over existing state, not a new source of truth. | dashboards, operating graph, agent readiness, route summaries |

New implementation work should first reuse native core or provider-backed
models. Add new tables only when the module map exposes a real concept gap
that cannot be expressed through the existing Company OS, operating model,
resource, knowledge, integration, or governance records.

## Canonical Business Modules

| Module | Classification | Primary purpose | Current foundation | Primary views or tools | Agent value |
| --- | --- | --- | --- | --- | --- |
| Company Graph Core | Native core | Connect work to departments, roles, responsibilities, ownership, escalation, and business functions. | `operating_areas`, `business_functions`, `company_roles`, `agents`, relationship graph | Company Atlas, selected-area operating room, relationship workbench | Agents can understand who owns a topic and where to escalate. |
| Unified Workforce And Authority | Native core | Treat humans and AI agents as organizational members with departments, roles, ranks, supervisors, workload, context access, and escalation paths. | `users`, `agents`, `company_roles`, service API keys, capabilities, future workforce profile layer | People/Agents board, authority map, agent key/profile workbench, contextual navigation | Agents and humans can receive work, report progress, escalate, and use permissions from the same organizational model. |
| Strategy, Goals, And Targets | Native core | Turn owner intent into measurable direction and execution targets. | `goals`, `targets`, `metrics`, decisions | dashboard brief, selected-area goals tab, future planning views | Agents can align proposed work with company priorities. |
| Work And Tasks | Native core plus provider-backed ClickUp | Manage executable work, lists, status, priority, comments, and provider sync. | `tasks`, `task_lists`, ClickUp adapter, provider event inbox/outbox | tasks workbench, selected-area tasks tab, ClickUp settings | Agents can create, inspect, update, or report work through scoped commands. |
| Processes And Pipelines | Native core | Define how work moves across departments from intake to outcome. | `processes`, `pipelines`, `pipeline_stages`, `procedures`, `procedure_steps`, workflow drafts | pipeline workbench, Company OS cockpit, selected-area workflows tab | Agents can follow approved procedures and avoid inventing workflow state. |
| Runtime Execution And Evidence | Native core | Record concrete workflow runs, stage runs, approvals, validation, and evidence. | `pipeline_runs`, `stage_runs`, `approvals`, `acceptance_criteria`, `audit_logs`, `events` | Company OS cockpit, approval queue, correlation timeline | Agents can act with supervision and leave proof instead of hidden side effects. |
| Knowledge And Decisions | Native core plus provider-backed content | Store searchable company memory, decisions, notes, standards, and knowledge sources. | `knowledge_roots`, `knowledge_items`, `notes`, `decisions`, `decision_logs`, Drive snapshots | selected-area knowledge/decisions tabs, future knowledge workbench | Agents can cite trusted context and learn from decisions. |
| Storage And Documents | Provider-backed | Connect folders, files, Docs, Sheets, assets, and snapshots to company areas and work. | Google Drive adapter, `google_drive_files`, content snapshots, storage locations | Drive workbench, settings integrations, selected-area resources tab | Agents can read or create documents through CompanyCore without raw provider tokens. |
| CRM And Relationships | Native core now, future adapter later | Manage clients, deals, interactions, stakeholders, and relationship context. | `clients`, `deals`, `interactions`, `stakeholders`, shared pipelines | CRM/pipeline workbench, relationships workbench, selected-area resources | Agents can understand commercial context before proposing tasks or outreach. |
| Resources And Assets | Native core plus provider-backed references | Index addressable things the company can reason about or act on. | `resources`, `tool_adapters`, provider mappings, API resources, storage locations | selected-area resources tab, integration readiness, operating graph | Agents can see what a command touches before acting. |
| Integrations And Tool Adapters | Provider-backed / future adapter | Connect external systems through provider-neutral capabilities and audited settings. | `integration_settings`, `tool_adapters`, `integration_capabilities`, provider adapters | settings integrations, MCP/API settings, readiness dashboards | Agents use capabilities rather than provider-specific secrets. |
| Agents, MCP, And Autonomy | Native core over API/MCP | Give Jarvis, Paperclip, Aviary, Codex, n8n, and future agents safe knowledge and tools. | service API keys, MCP manifest, scopes, capabilities, agent events | agent tools, API keys, Company OS cockpit | Agents operate through permissioned tools, approval gates, and audit. |
| Governance, Risk, And Controls | Native core | Define policies, controls, risks, approval needs, autonomy levels, and fail-closed behavior. | `policies`, `risks`, `controls`, approvals, capability metadata | Company OS cockpit, settings/API safety views, future governance workbench | Agents know what is allowed, blocked, risky, or owner-gated. |
| Metrics And Operating Health | Native core / derived view | Measure company health, process health, agent readiness, and delivery confidence. | `metrics`, health endpoints, task/graph summaries, module confidence ledgers | dashboard brief, selected-area overview, system health views | Agents can prioritize gaps and report evidence-backed status. |

## Department And Area Lens

Operating areas are the default owner-facing lens for the company. A module can
span many areas, but every business record should be explainable in relation to
an area or to platform/system ownership.

The area view should answer:

- what matters now in this department;
- what goals, targets, workflows, tasks, knowledge, resources, and decisions
  are connected here;
- what is blocked, stale, risky, or missing evidence;
- what an owner can do next;
- what an agent may read, propose, or execute.

The canonical area capabilities are:

```text
overview -> goals -> workflows -> tasks -> knowledge -> resources
  -> decisions -> AI/agents -> custom views
```

These are view capabilities over the module map. They should not become
duplicated data models for each department.

Each area is also a department management system. The department system may
contain specialized subsystems such as sales pipeline management, promotion
management, content management, advertising management, support management, or
finance closure management. Those subsystems must still reuse shared
CompanyCore modules and declare their owner, supporting departments, source of
truth, actions, agent access, evidence, metrics, and escalation path.

## Provider Role Boundaries

Provider integrations must attach to modules through capabilities:

| Provider | Role in CompanyCore | Boundary |
| --- | --- | --- |
| Google Drive | Storage, document content, knowledge snapshots, Docs/Sheets creation and editing. | Drive owns native files; CompanyCore owns scope, metadata, snapshots, commands, and agent access. |
| ClickUp | Task/list/status provider and external work mirror. | CompanyCore owns operating interpretation, events, sync policy, and safe write-back commands. |
| Future HubSpot or CRM | CRM provider for clients, deals, interactions, and sales activity. | CompanyCore should map CRM records to native CRM/relationship concepts and shared pipelines instead of becoming provider-locked. |
| GitHub / Coolify / n8n | Tool and resource providers for delivery, deployment, automation, and orchestration. | CompanyCore should expose provider-neutral capabilities with approval and audit before agents act. |

## UI Direction

Future views should derive from the module map rather than from provider names
or database table lists.

| View family | Primary question | Backing modules |
| --- | --- | --- |
| Dashboard / Company Atlas | What is happening across the company and what needs owner attention? | Company Graph Core, Goals, Tasks, Runtime Evidence, Metrics |
| Selected-area operating room | What is happening in this department and what can I or an agent do next? | All business modules filtered by operating area |
| Pipeline builder / workflow workbench | How does work move from input to outcome? | Processes And Pipelines, Runtime Evidence, Governance |
| Task and execution workbench | What work exists, what is blocked, and what needs action? | Work And Tasks, Runtime Evidence, ClickUp |
| Knowledge and storage workbench | What can the company and agents know or create? | Knowledge, Storage, Drive/Docs/Sheets |
| CRM and relationship workbench | Who are we working with and what is the commercial context? | CRM, Relationships, Pipelines |
| Resources workbench | What assets, tools, files, APIs, and systems are addressable? | Resources, Integrations, Storage |
| Agent tools and authority | What can agents see or do, and what needs supervision? | Agents/MCP, Governance, Audit, Tools |
| Settings | How are providers, keys, sync policies, and workspace settings configured? | Integrations, Access, Workspace, Provider settings |

Settings should configure providers and access. Workbenches should operate the
business. Dashboards should summarize and route attention.

## Agent Capability Layers

Agent-facing work should be described through layers instead of provider names:

| Layer | What agents need | Backing modules |
| --- | --- | --- |
| Intent | Current priorities, goals, decisions, active focus, business plan context. | Strategy, Goals, Knowledge, Decisions |
| Knowledge | Trusted searchable context, Docs/Sheets snapshots, standards, notes, sources. | Knowledge, Storage, Drive, Decisions |
| Planning and orchestration | How gaps become tasks, workflow runs, or owner proposals. | Tasks, Processes, Pipelines, Runtime Evidence |
| Tools | Safe commands to create, edit, update, request, or report. | Integrations, Tool Adapters, Company OS commands |
| Access and autonomy | Which key/profile/capability allows which action and when approval is needed. | Agents/MCP, Governance, API keys, Policies |
| Audit and feedback | What happened, why, with what evidence, and what should change next. | Events, Audit Logs, Approvals, Module Confidence |

Paperclip's first scalable loop should therefore be:

```text
business plan / owner intent
  -> CompanyCore knowledge and area graph
  -> missing-work analysis
  -> proposed or created task/workflow item
  -> owner or agent execution
  -> evidence, feedback, next gap
```

## Implementation Guardrails

- Treat this module map as an architecture planning layer, not direct approval
  to add broad schema or UI scope.
- Do not create duplicate provider-specific modules when a native CompanyCore
  concept already exists.
- Keep high-impact writes command-shaped, permissioned, approval-aware, and
  audited.
- Add read models before write models when relationships are unclear.
- Prefer area-filtered views over separate per-department data models.
- Keep providers behind adapters and capabilities.
- Expose MCP tools from the same HTTP/API contracts used by the web app.
- Record module confidence and requirement evidence before calling a module
  verified.

## Near-Term Architecture Follow-Ups

1. Verify the selected-area operating graph read API and expose it as a stable
   read model for web and future agent use.
2. Derive future route/view work from the module map, especially settings,
   Drive, ClickUp, CRM, pipeline, knowledge, resources, and agent tools.
3. Add a Paperclip-ready planning-to-task requirement only after current
   knowledge, task, ClickUp, MCP, approval, and audit surfaces are verified.
4. Add explicit responsibility, process-domain, PAEI, and governance-rule
   slices only when an implementation task proves the current models cannot
   express the needed behavior.
