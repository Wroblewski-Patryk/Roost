# Process Core / Workflow Core Architecture

Last updated: 2026-06-01

## Purpose

Roost must evolve into a company operating system where process state is a
reusable core capability, not a view owned by one department. The Process Core
is the shared workflow engine for departments, products, service projects,
clients, tasks, people, AI agents, assets, repositories, releases, decisions,
and agent runtime context synchronization.

Roost remains the source of truth. Codex Agent Host remains an external execution
layer that reads context, proposes work, executes allowed actions, reports
progress, requests approvals, and leaves evidence through Roost API/MCP
contracts.

## Non-Negotiable Boundaries

- Process Core is not a separate department app.
- Pipelines, procedures, checklists, approvals, evidence, blueprints, linked
  assets, and agent runtime contexts are reusable system entities.
- Departments are management lenses over the shared Process Core.
- Runtime writes must stay command-shaped, workspace-scoped,
  permission-aware, approval-aware, event-emitting, and auditable.
- External agents must not infer authority from raw database rows, provider
  records, spreadsheets, or agent-host-local state.
- Do not seed real named clients, service projects, or subscription products
  merely to explain the architecture.

## Business Entity Taxonomy

The architecture must distinguish these entity families before runtime
implementation:

| Entity family | Meaning | Subscription-product rule |
| --- | --- | --- |
| `client` | A person or organization relationship. | A client is not a subscription product. |
| `service_project` | Client-specific service delivery work. | May use delivery pipelines and evidence, but is not a product unless explicitly converted. |
| `internal_project` | Company internal work. | May support product, operations, or technology workflows. |
| `innovation_project` | Research, experiment, or prototype work. | Can transfer into Product after a decision. |
| `product` | A sellable or reusable company offering. | Can be service, software, module, or hybrid. |
| `subscription_product` | A product sold with recurring billing. | Must be separate from clients and service projects. |
| `application` | A software app or system. | May be a subscription product when business model says so. |
| `task` | Executable work item. | May be linked to any workflow item. |
| `procedure` | Reusable way of doing work. | May govern people, agents, stages, or departments. |
| `department` | Operating area or management system. | Provides lens and ownership, not a separate workflow engine. |
| `agent` / `human` | Workforce members. | May be assigned to stages, procedures, approvals, and evidence. |
| `asset`, `repository`, `file` | Addressable resources. | Linked through shared asset relations. |

Example guardrail: a client such as Anna Wasik is a client, relationship,
service-project source, or request source. She must not be modeled as a
subscription product unless the owner creates a distinct product entity.

## Core Model Contract

The initial Process Core target is expressed as a reusable model set. Existing
Company OS tables and command contracts should be reused first; new migrations
must be justified by a gap audit.

| Model | Responsibility | Minimum target contract |
| --- | --- | --- |
| `Pipeline` | Defines a reusable workflow for a workspace and optional department. | workspace, optional department, name, slug, description, type, status, target entity type, owner type/ID, template/active flags, agent runtime enabled flag. |
| `PipelineStage` | Ordered state inside a pipeline. | order, criteria, approval/evidence requirements, default role, assignee, procedure, WIP limit, agent runtime instruction. |
| `PipelineTransition` | Allowed movement between stages. | from stage, to stage, condition, approval and evidence requirements. |
| `WorkflowItem` | Attaches any entity to a pipeline and current stage. | workspace, pipeline, current stage, entity type/ID, title, status, priority, owner, assignee, start/completion timestamps. |
| `Procedure` | Reusable method of work. | workspace, optional department, type, status, purpose, trigger, input/output requirements, owner role, responsible actor, related pipeline/stage, approval policy, agent runtime context. |
| `ProcedureStep` | Human-readable and agent-readable action step. | ordered instruction, expected output, tool/asset requirement, human approval flag, evidence flag, agent runtime instruction. |
| `Checklist` / `ChecklistItem` | Reusable completion lists. | template support, required items, evidence requirements, attachable to stages, procedures, tasks, products, projects, releases, service projects, or agent assignments. |
| `EvidenceLog` | Proof that work happened. | entity type/ID, related task, workflow item, stage, procedure, submitter, evidence type, title, description, URL/file/repository/commit/screenshot metadata. |
| `ApprovalPolicy` / `ApprovalRequest` / `ApprovalDecision` | Governance control layer. | policy definition, concrete request, one-time decision with approver, decision, reason, timestamp, and audit/event evidence. |
| `Blueprint` / `EntitySchema` | Structured object definition. | workspace, optional department, entity type, JSON schema, template/active flags. |
| `LinkedAsset` | Universal asset relation. | entity type/ID, asset type/ID, relation type, description. |
| `AgentRuntimeContext` | Agent-readable authority and context packet. | entity type/ID, enabled flag, scope, summary, allowed actions, blocked actions, default agent, required approval policy, last sync date. |

Recommended enum families must stay extensible:

- Pipeline types: `product`, `project`, `innovation`, `sales`,
  `operations`, `technology`, `legal`, `finance`, `relationship`,
  `people_agents`, `management`, `custom`.
- Entity types: `product`, `subscription_product`, `project`,
  `service_project`, `task`, `client`, `lead`, `deal`, `procedure`,
  `experiment`, `release`, `deployment`, `asset`, `agent`, `human`,
  `department`, `repository`, `file`, `custom`.
- Evidence types: `file`, `link`, `commit`, `screenshot`, `note`, `report`,
  `test_result`, `deployment`, `approval`, `agent_runtime_output`.

## Codex Agent Host Context Contract

Every Codex Agent Host-operable object must expose a structured context packet:

```text
entity type/id
summary and current status
current pipeline and stage
department and owner context
assigned human or agent
related tasks, procedures, checklists, and assets
approval requirements
allowed actions and blocked actions
evidence requirements
last sync date
```

Codex Agent Host must know what the object is, which department it belongs to, which
stage it is in, what procedure applies, what is allowed, what is blocked, who
approves risky work, and what evidence must be left. Publishing to clients,
changing prices, changing legal terms, changing permissions, or deploying
production remains blocked unless an explicit approval policy and command
contract allow it.

## Department View Contract

Department views must consume Process Core instead of owning separate process
tables.

| Department | Required Process Core lens |
| --- | --- |
| `00 General` | command center, inbox, global pipelines, global procedures, Codex Agent Host sync. |
| `01 Strategy` | goals, roadmap, decisions, priorities, strategic pipelines. |
| `02 Product` | products, product pipeline, backlog, releases, pricing, requirements, product procedures. |
| `03 Sales` | leads, deals, offers, sales pipeline, subscriptions, follow-ups, proposal templates, conversion evidence. |
| `04 Operations` | procedures, SOP library, checklists, routines, delivery pipelines, recurring work, exceptions, quality control. |
| `05 Relationships` | contacts, clients, partners, feedback, support cases, relationship pipeline, customer health. |
| `06 People / Agents` | directory, roles, responsibilities, skills, tools, permissions, assignments, agent procedures, approval rules. |
| `07 Finance` | revenue, costs, budgets, invoices, subscription finance, unit economics, project budget, product PnL. |
| `08 Assets` | files, folders, repositories, documents, prompts, templates, knowledge roots, linked assets, sync status. |
| `09 Technology` | apps, repositories, environments, deployments, integrations, technical backlog, incidents, automation hooks, release checklists. |
| `10 Legal` | contracts, policies, approvals, legal risks, compliance checklists, product legal, client agreements, data processing. |
| `11 Innovation` | ideas, experiments, research, hypotheses, validation, innovation pipeline, prototype lab, transfer to product. |
| `12 Management` | portfolio, approvals, risks, reports, audit log, decision log, governance, permissions, Codex Agent Host control, process map. |

Pipeline UI must support at least board and table modes. Board mode shows
stages as columns. Table mode filters by department, entity type, status,
priority, owner, assignee, approval requirement, missing evidence, and
Codex Agent Host enablement.

## System Flows

### Idea To Subscription Product

```text
Innovation idea/research/experiment
  -> Strategy fit and priority decision
  -> Product definition, features, roadmap, backlog, pricing
  -> Technology architecture, repository, environment, deployment
  -> Legal terms, privacy, subscription and data posture
  -> Finance cost, price, profitability threshold
  -> Operations delivery, maintenance, support procedures
  -> Sales and Relationships offer, leads, customers, feedback
  -> Management approvals, risks, reports, decisions
  -> Codex Agent Host supervised execution, delegation, synchronization, reporting
```

Innovation validates. Product owns the product definition after transfer.

### Client To Service Delivery

```text
Relationships client/contact/need/request
  -> Sales offer, scope, agreement
  -> Operations task, delivery pipeline, procedure
  -> Assets files, designs, documents, templates
  -> Technology implementation when technical work is needed
  -> Product/Operations/Assets content or design delivery evidence
  -> Management approval, quality control, decision
  -> Codex Agent Host draft/checklist/content/report generation with approval gates
```

A client can have projects, orders, tasks, files, feedback, and relationship
history. A client is not a subscription product.

## MVP Implementation Sequence

1. Audit existing `processes`, `pipelines`, `pipeline_stages`, procedures,
   procedure steps, runtime runs, approvals, acceptance criteria, events,
   audit logs, resources, Drive files, workforce, roles, and MCP manifests
   against this target.
2. Decide whether to name the entity attachment model `WorkflowItem` or
   `PipelineItem`; prefer `WorkflowItem` if it becomes cross-process and
   cross-department.
3. Add or extend the minimal data contract only after the audit proves real
   gaps.
4. Expose read-only packets before write commands:
   global pipelines, global procedures, agent runtime contexts, linked
   assets, evidence requirements, and approval requirements.
5. Add command-shaped writes for workflow item creation, stage movement,
   evidence submission, approval request/decision, linked asset attach, and
   agent runtime context updates.
6. Add department views from shared packets, not department-specific process
   copies.
7. Expose MCP tools/resources only from the same API contracts and with
   capability filtering, blocked actions, approval metadata, events, and audit.

## Acceptance Criteria For Future Runtime Work

- Pipelines are reusable and not hard-bound to one department.
- The same pipeline model works for Product, Innovation, Sales, Operations,
  Technology, Management, and custom departments.
- A pipeline can attach to multiple entity types through one attachment model.
- Stages define order, entry criteria, exit criteria, evidence requirements,
  approval requirements, and allowed transitions.
- Procedures and checklists are reusable independent models.
- Evidence is required before high-impact completion can be treated as done.
- Approval policies are a separate control layer.
- Assets can link to any supported entity.
- AgentRuntimeContext tells external agents what they may read, propose,
  execute, and must not do.
- Clients, service projects, internal projects, innovation projects, products,
  and subscription products are distinct.
- Department sidebars and views extend the existing department architecture
  instead of creating a competing workflow app.
- Management can inspect portfolio, risks, approvals, decisions, evidence,
  and Codex Agent Host activity.
- The design stays ready for MCP, repositories, Obsidian/Markdown/CSV,
  provider adapters, and future automation.

## Implementation Guardrails

- Reuse current Company OS workflow, approval, audit, event, workforce,
  resource, and MCP foundations before adding tables.
- Start with current-state audits and read models before migrations.
- Keep client/project/product taxonomy explicit in API names and UI copy.
- Keep agent access least-privilege by workspace, department, role,
  entity permission, capability, and approval policy.
- Never let Codex Agent Host use direct database access or provider tokens as a
  substitute for Roost authority.
- Do not add fake clients, fake subscription products, or placeholder records
  to make views look complete.
