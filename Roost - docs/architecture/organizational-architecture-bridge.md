# Organizational Architecture Bridge

Last updated: 2026-05-15

## Purpose

CompanyCore is evolving into an AI-first organizational operating system. It
must connect humans, AI agents, processes, tasks, governance, organizational
memory, workflows, knowledge, KPIs, and resources through one durable operating
graph.

This document records the target architecture direction. It does not by itself
open broad schema or UI implementation work. Future implementation must still
move through scoped task contracts, migrations, command routes, permission
checks, MCP exposure, web/mobile UX, and evidence.

## Core Product Thesis

CompanyCore should become:

- the operating system for the organization
- the AI-to-human coordination layer
- the execution engine for work and handoffs
- the governance layer for permissions, approvals, autonomy, and audit
- the durable memory of the company
- the organizational graph that connects structure, process, resources,
  knowledge, metrics, and decisions

The product must be usable by humans through web and future mobile surfaces,
and by AI agents through MCP. Paperclip, Jarvis, Codex, n8n, and future agents
must operate through CompanyCore APIs or MCP tools rather than direct database
or provider access.

The model-level module map for turning this thesis into scalable product,
API, MCP, provider, and UI surfaces lives in
`docs/architecture/companycore-business-module-map.md`. Use that document to
classify future work as native core, provider-backed, future adapter, or
derived view before implementation.

## Foundational Principle

Hierarchy is not process.

The vertical organization and horizontal workflows must coexist:

```text
Vertical authority/accountability:
Patryk -> AssistantAI -> Directors -> Managers -> TeamLeaders -> Workers

Horizontal value flow:
intake -> process domain -> workflow -> task/handoff -> evidence -> KPI
```

Vertical structure answers who owns, approves, escalates, and is accountable.
Process structure answers how value moves across departments and roles.
CompanyCore must not collapse one into the other.

The unified workforce and organizational world-state layer is specified in
`docs/architecture/unified-organizational-operating-system.md`. That document
clarifies that humans and AI agents are both organizational entities in the
target model, while CompanyCore remains non-AI infrastructure.

## Architecture Layers

### Organizational Structure

The target organization has a role hierarchy:

```text
Owner -> Director -> Manager -> Leader -> Worker
```

This should be modeled through roles, reporting relationships, responsibilities,
permissions, and escalation paths. The current `company_roles`, `agents`,
`operating_areas`, `business_functions`, and future role hierarchy fields are
the preferred foundation. Do not introduce a parallel people/agent hierarchy
without reconciling it with these existing tables.

The hierarchy applies to humans, AI agents, and mixed teams. Delegation flows
downward, while reporting, blockers, requests for information, approvals, and
escalations flow upward. This recursive loop must be preserved in task,
workflow, API, MCP, and web design.

### APQC Process Structure

The company should be modelled process-first as well as department-first.
Process domains classify stable enterprise activity. Processes, pipelines,
stages, procedures, and procedure steps describe how work moves and how agents
or humans execute it.

The current Company OS graph already supports this direction:

```text
Process -> Pipeline -> PipelineStage -> Procedure -> ProcedureStep
PipelineRun -> StageRun -> Approval / AcceptanceCriterion / AuditLog
```

Future APQC alignment should extend this graph with process-domain taxonomy and
classification, not replace the workflow command model.

### MECE Responsibility Structure

Every meaningful responsibility must have exactly one accountable owner, even
when many roles contribute. Responsibility records should connect to:

- role or agent owner
- department or business function
- process domain or process
- workflow, tool, resource, KPI, or control when applicable
- escalation path and approval authority

No high-impact process, automation, workflow, resource, or KPI should be
enabled for autonomous agent action until accountability is explicit.

### PAEI Behavioral Profiles

Agents and roles should be able to carry a behavioral profile:

- `P`: producer / execution
- `A`: administrator / structure and control
- `E`: entrepreneur / exploration and change
- `I`: integrator / coordination and alignment

PAEI is a behavioral lens, not an authorization model. Permissions and autonomy
must still come from governance rules, capabilities, approvals, and tool
policies.

### Governance Structure

Governance covers permissions, approvals, autonomy, policies, controls, risk,
audit, and escalation. Existing Company OS command routes must remain the
boundary for high-impact writes.

Target invariant:

```text
Human or agent intent
  -> MCP or web/mobile/API command
  -> workspace/capability/policy check
  -> approval/autonomy gate
  -> audited state transition
  -> event and evidence
```

Agents must not bypass the HTTP/API/MCP command boundary, and MCP tools must
stay thin wrappers around CompanyCore routes.

### Knowledge Structure

Knowledge should join provider files, Obsidian-style Markdown, docs, extracted
snapshots, embeddings, decisions, process knowledge, and operational notes into
one searchable memory layer.

Google Drive, Docs, Sheets, local or future Obsidian roots, and generated docs
should remain provider-backed where appropriate. CompanyCore owns the
operational interpretation, metadata, links, summaries, and permissioned access
to that knowledge.

### Execution Structure

Execution is task, workflow, command, evidence, and handoff oriented. The target
execution model should combine:

- tasks and task lists
- processes and pipelines
- workflow steps and procedures
- runtime stage runs
- approvals and acceptance criteria
- audit logs and decision logs
- agent event outbox and provider event inbox
- Paperclip/Jarvis/future-agent handoffs

Paperclip should be treated as an execution/work item surface connected through
CompanyCore events, MCP/API tools, and auditable handoffs.

### Resource Structure

Resources are the addressable things CompanyCore can reason about or act on:

- repositories
- VPS/deployment surfaces
- API endpoints and MCP tools
- Drive files and folders
- ClickUp tasks and lists
- documents, assets, prompts, generated artifacts
- service credentials and integration settings

The existing `resources`, `tool_adapters`, `integration_capabilities`,
`google_drive_files`, provider mappings, and operations docs are the current
foundation.

### Metrics Structure

KPIs and health scores should measure the organization, processes, agents,
resources, and workflows. Metrics must be owned, traceable, and connected to
the work or behavior they claim to measure.

`metrics` is the current canonical KPI table name. Future UI may use `kpis` as
user-facing language, but implementation should not create a duplicate `kpis`
table unless an approved migration justifies the split.

## Target Concept Table Map

The user's target concepts are accepted as product architecture direction. The
implementation should map them to current tables first, then add new tables only
where a real gap remains.

| Target concept | Current or preferred CompanyCore model | Status |
| --- | --- | --- |
| `departments` | `operating_areas`, `business_functions` | implemented foundation; may need hierarchy/detail expansion |
| `agents` | `agents` | implemented |
| `agent_roles` | `company_roles` with agent/human/system role type | implemented foundation; avoid duplicate role table |
| `process_domains` | future taxonomy linked to `processes` and `business_functions` | target gap |
| `responsibilities` | `company_roles`, `business_functions`, future explicit responsibility records | target gap |
| `governance_rules` | `policies`, `controls`, `risks`, approval gates | implemented foundation; may need rule UX/API expansion |
| `workflows` | `processes`, `pipelines`, `workflow_definition_drafts` | implemented foundation |
| `workflow_steps` | `pipeline_stages`, `procedures`, `procedure_steps`, `stage_runs` | implemented foundation |
| `permissions` | API key scopes, capabilities, `integration_capabilities`, future role permission records | implemented foundation; expansion likely |
| `tools` | `tool_adapters`, `integration_capabilities`, MCP manifest tools | implemented foundation |
| `knowledge_sources` | `knowledge_roots`, `knowledge_items`, `google_drive_files`, content snapshots | implemented foundation; expansion likely |
| `kpis` | `metrics` | implemented as metrics; UI can label as KPIs |
| `audit_logs` | `audit_logs` | implemented |
| `decision_logs` | `decision_logs` plus legacy `decisions` | implemented foundation |

## Access Channels

CompanyCore must support three first-class consumption modes:

| Channel | Primary user | Boundary |
| --- | --- | --- |
| Web | owner/operator and future team users | authenticated UI over CompanyCore API |
| Mobile | owner/operator and future team users | future native/mobile UI over the same API |
| MCP | AI agents and automation runtimes | thin MCP tools wrapping CompanyCore HTTP routes |

All channels must respect the same workspace ownership, permissions,
capabilities, approval, audit, and event rules.

## Paperclip Bridge Direction

Paperclip should be connected as an execution companion, not a separate source
of truth. CompanyCore emits and receives work signals through auditable events,
API routes, MCP tools, and agent outbox/inbox patterns.

Target behavior:

- CompanyCore can send actionable work items or context to Paperclip.
- Paperclip can report issue/work status back through CompanyCore routes.
- AI agents can see the CompanyCore-to-Paperclip context through MCP.
- Handoffs leave audit/event evidence and do not require direct DB access.

## Paperclip Company-Building Operating Model

Paperclip's long-term role is a supervised company-building execution agent.
CompanyCore itself does not need an embedded AI brain for this direction:
external AI agents may use CompanyCore as the business operating layer through
HTTP APIs and MCP tools.

The minimum operating loop is:

```text
Business plan / owner intent
  -> CompanyCore knowledge and operating graph
  -> gap and task analysis
  -> ClickUp or CompanyCore work items
  -> owner or agent execution
  -> status, feedback, evidence, and next gaps
```

Paperclip should first help the owner by reading the business plan, current
CompanyCore context, imported knowledge, ClickUp task state, decisions, and
operating-area responsibilities; then it should identify missing work, propose
or create scoped tasks, and continue only through approved CompanyCore tools.

For this purpose, agent-facing functionality is organized into these logical
layers:

| Layer | Purpose | Current foundation |
| --- | --- | --- |
| Intent | What the company is trying to build now: business plan, priorities, owner decisions, and active operating-area goals. | goals, decisions, decision logs, operating areas, planning docs imported as knowledge |
| Knowledge | What Paperclip may know: trusted sources, document snapshots, task/context reads, decisions, standards, and operating graph context. | knowledge roots, knowledge items, Google Drive files/content snapshots, Company OS reads, relationship graph |
| Planning and orchestration | How gaps become executable work and follow-up tasks. | tasks, task lists, processes, pipelines, agent events, ClickUp sync |
| Tools | What Paperclip may do through CompanyCore: create/update work items, report status, request approvals, create or update provider documents where allowed. | MCP manifest, HTTP command routes, tool adapters, integration capabilities |
| Access and autonomy | Which agent profile can use which knowledge and tools, at which risk level, and when owner approval is required. | service API keys, scopes, capabilities, risk levels, approval requirements |
| Audit and feedback | What happened, why, under which key/profile, and what the result teaches the next planning pass. | events, audit logs, approvals, agent event outbox, correlation IDs |

Provider integrations must be classified by capability, not by provider. The
same provider can serve several layers: Google Drive can be a knowledge source
when reading Docs or Sheets and a tool when creating or updating them; ClickUp
can be knowledge when reading task state and a tool when creating tasks,
comments, or status updates.

The first Paperclip-ready implementation direction should therefore be narrow:

1. expose business-plan and company-context knowledge through existing
   CompanyCore read APIs or MCP tools;
2. expose ClickUp and CompanyCore task state as planning input;
3. let Paperclip propose missing tasks before broad autonomous execution;
4. allow task creation or status reporting only through scoped CompanyCore
   tools;
5. require owner approval for high-risk external writes, workflow activation,
   destructive actions, or broad provider mutations.

This model is a direction for future implementation, not approval for broad new
tables or direct provider access. Future slices should first verify the current
knowledge, task, and MCP surfaces, then add the smallest missing API or MCP
tool needed to close one planning-to-task loop.

## Implementation Guardrails

- Do not add duplicate tables when existing Company OS or operating-model
  tables already own the concept.
- Do not expose broad raw CRUD for process, workflow, governance, permission,
  runtime, or audit objects.
- Add command-shaped routes for high-impact changes.
- Keep web, mobile, and MCP as different clients over the same policy boundary.
- Treat organization hierarchy, process flow, responsibility ownership,
  governance, knowledge, resources, and metrics as graph dimensions that must
  connect through stable IDs.
- Prefer verification tasks before feature work when a concept may already be
  partially implemented.

## Future Work Candidates

1. Add a process-domain taxonomy connected to APQC categories and existing
   `processes`.
2. Add explicit responsibility records if `company_roles` and
   `business_functions` cannot express MECE accountability well enough.
3. Add PAEI profile fields or records for roles and agents.
4. Expand governance-rule UX/API around policies, controls, autonomy levels,
   and approvals.
5. Build an organizational graph read API that joins hierarchy, process,
   responsibility, tools, knowledge, KPI, and resource relationships.
6. Add web and future mobile surfaces that make the graph understandable for
   humans while keeping MCP tools usable for agents.
