# Department Management Systems Architecture

Last updated: 2026-05-16

## Purpose

CompanyCore V1 should treat each company department as a department management
system, not only as a navigation tab or filtered data table. A department
management system is a web UX surface that lets the owner and supervised AI
agents understand, operate, improve, and audit one department's contribution to
the global business flow.

This document extends:

- `docs/architecture/system-architecture.md`
- `docs/architecture/autonomous-company-operating-system.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/organizational-architecture-bridge.md`

It is architecture and UX planning scope. It does not approve broad schema,
automation, billing, provider, or raw CRUD implementation by itself.

The detailed V1 implementation blueprint for `00 Main` plus the 12 operating
departments lives in
`docs/architecture/department-management-systems-v1-blueprint.md`. Use that
blueprint when planning department-specific web views, backend read models,
safe write actions, and Paperclip department packets.

## Core Principle

Every department is a management system over the same CompanyCore graph.

```text
Department shell
+-- Department identity bar
|   +-- department name, role, value-flow contribution
|   +-- health and confidence status
|   +-- owner/agent next action
+-- Management command brief
|   +-- what matters now
|   +-- blocked or risky items
|   +-- next owner decision
|   +-- suggested AI-agent action
+-- Subsystem navigation
|   +-- overview
|   +-- goals
|   +-- workflows
|   +-- tasks
|   +-- records/tables
|   +-- knowledge
|   +-- resources
|   +-- metrics
|   +-- risks/controls
|   +-- decisions
|   +-- AI/agents
+-- Primary management board
|   +-- subsystem-specific work surface
|   +-- actionable records
|   +-- local feedback states
|   +-- empty/error/success states
+-- Evidence and graph rail
|   +-- linked tables and records
|   +-- files and knowledge sources
|   +-- related pipeline runs and tasks
|   +-- audit/events
|   +-- relationship confidence
+-- Improvement loop
    +-- feedback signals
    +-- improvement tasks
    +-- updated standards/processes
    +-- next gap
```

Departments may have specialized subsystems, but they must reuse shared
CompanyCore foundations: operating areas, tables, tasks, processes, pipelines,
resources, knowledge, metrics, policies, events, audit, and MCP.

The backend remains a company operating-system backend. AI agents are external
clients through API/MCP, so department systems may expose agent packets and
supervised commands, but they must not embed chatbot/personality/orchestration
logic inside department modules.

Do not create a separate application, database model, or provider-led workflow
for each department unless a future architecture decision proves the shared
CompanyCore graph cannot represent it.

## Relationship To The Global Business Flow

The global business flow defines how the company creates value:

```text
Strategic intent -> Brand/market -> Demand -> Lead qualification
  -> Discovery -> Offer/agreement -> Delivery planning
  -> Product/service execution -> QA/acceptance -> Payment
  -> Support/relationship -> Feedback/learning -> Improve OS
```

Department management systems are the vertical ownership view over that
horizontal flow.

| Global flow zone | Department systems that usually own it |
| --- | --- |
| Strategic intent | 01 Strategy, 12 Management, 10 Law/Standards |
| Brand/market and demand | 03 Sales, 11 Innovation/Growth |
| Lead qualification, discovery, offer | 03 Sales, 05 Relationships, 07 Finance |
| Delivery planning and execution | 02 Product, 04 Operations, 03 Sales when commercial work is active |
| QA, acceptance, evidence | 02 Product, 04 Operations, 09 Technology, 10 Law/Standards |
| Payment and financial closure | 07 Finance |
| Support and relationship care | 05 Relationships, 04 Operations |
| Feedback and improvement | 11 Innovation, 01 Strategy, all departments |
| Operating foundation | 00 Main, 06 People/Agents, 08 Resources, 09 Technology, 12 Management |

## Canonical Department Systems

User-facing labels may use the current LuckySparrow Polish names. Architecture
source of truth keeps English names for clarity.

| Area | User-facing label | Department management system | Primary value layer | Core subsystems |
| --- | --- | --- | --- | --- |
| 00 | Ogolny / Main | Company Orchestration System | Whole-company coordination | command brief, cross-department health, owner inbox, priority routing, company graph |
| 01 | Strategia | Strategy Management System | Direction | goals, targets, roadmap, decisions, risks, KPIs, portfolio choices |
| 02 | Produkt | Product And Delivery Management System | Product/service promise | product/service catalog, backlog, delivery plans, releases, acceptance, customer value |
| 03 | Sprzedaz | Sales Management System | Commercial conversion | leads, opportunities, discovery, offers, pipeline, pricing, sales tasks |
| 04 | Operacje | Operations Management System | Company administration and delivery control | planning, procedures, recurring operations, quality controls, admin routines, dependencies, approvals |
| 05 | Relacje | Relationship Management System | Client and partner care | clients, stakeholders, interactions, support, success check-ins, referrals |
| 06 | Kadry | People/Agents And Role Management System | Human/agent organization | people, agents, roles, responsibilities, capacity, permissions, escalation, PAEI profiles |
| 07 | Finanse | Finance And Billing Management System | Revenue capture | invoices, payment status, pricing decisions, receivables, margin signals |
| 08 | Zasoby | Assets And Resource Management System | Addressable assets | files, folders, resources, repositories, documents, prompts, tools, storage locations |
| 09 | Technologia | Technology And AI Infrastructure Management System | Tooling and observability | agents, service keys, MCP tools, command safety, audit, integration health |
| 10 | Prawo | Legal, Standards, And Decision Management System | Guardrails | policies, standards, decision logs, risks, controls, compliance routines |
| 11 | Innowacje | Innovation And Growth Management System | Learning and growth | experiments, marketing growth, content ideas, feedback loops, improvements |
| 12 | Zarzadzanie | Executive Management System | Supervised company steering | owner command, cross-department health, approvals, escalation, portfolio management |

## Subsystem Rule

A subsystem is a focused management capability inside a department system.
For example, Sales may include lead management, discovery management, offer
management, and pipeline management. Marketing may include promotion
management, content management, advertising management, and channel analytics.

Subsystems must declare:

- owning department;
- supporting departments;
- source-of-truth module;
- primary tables or APIs;
- allowed actions;
- AI-agent access level;
- evidence generated;
- metrics owned;
- escalation path.

Subsystems can use data from other departments, but only one department should
be accountable for the subsystem's operating health.

## Standard Department View Layout

Every department management view should share one predictable structure:

```text
Department shell
â”śâ”€â”€ Department identity bar
â”‚   â”śâ”€â”€ department name, role, value-flow contribution
â”‚   â”śâ”€â”€ health and confidence status
â”‚   â””â”€â”€ owner/agent next action
â”śâ”€â”€ Management command brief
â”‚   â”śâ”€â”€ what matters now
â”‚   â”śâ”€â”€ blocked or risky items
â”‚   â”śâ”€â”€ next owner decision
â”‚   â””â”€â”€ suggested AI-agent action
â”śâ”€â”€ Subsystem navigation
â”‚   â”śâ”€â”€ overview
â”‚   â”śâ”€â”€ goals
â”‚   â”śâ”€â”€ workflows
â”‚   â”śâ”€â”€ tasks
â”‚   â”śâ”€â”€ records/tables
â”‚   â”śâ”€â”€ knowledge
â”‚   â”śâ”€â”€ resources
â”‚   â”śâ”€â”€ metrics
â”‚   â”śâ”€â”€ risks/controls
â”‚   â”śâ”€â”€ decisions
â”‚   â””â”€â”€ AI/agents
â”śâ”€â”€ Primary management board
â”‚   â”śâ”€â”€ subsystem-specific work surface
â”‚   â”śâ”€â”€ actionable records
â”‚   â”śâ”€â”€ local feedback states
â”‚   â””â”€â”€ empty/error/success states
â”śâ”€â”€ Evidence and graph rail
â”‚   â”śâ”€â”€ linked tables and records
â”‚   â”śâ”€â”€ files and knowledge sources
â”‚   â”śâ”€â”€ related pipeline runs and tasks
â”‚   â”śâ”€â”€ audit/events
â”‚   â””â”€â”€ relationship confidence
â””â”€â”€ Improvement loop
    â”śâ”€â”€ feedback signals
    â”śâ”€â”€ improvement tasks
    â”śâ”€â”€ updated standards/processes
    â””â”€â”€ next gap
```

This standard layout lets the owner learn one pattern and then operate any
department. It also lets Paperclip and other agents reason consistently about
where to read context, propose work, request approval, and report evidence.

## Standard Component Groups

| Component group | Purpose | Required states |
| --- | --- | --- |
| Department Identity Bar | Shows where the owner is, what the department owns, and how it contributes to the value flow. | loading, ready, degraded |
| Command Brief | Summarizes current priority, blocker, next decision, and AI suggestion. | empty, normal, blocked, risk |
| Subsystem Tabs | Moves between department subsystems without changing the department mental model. | active, disabled, unavailable |
| Operating Board | Main work surface for the selected subsystem. | loading, empty, populated, error, success |
| Action Panel | Create/update/request/assign actions allowed by existing backend contracts. | idle, submitting, success, failure |
| Evidence Rail | Shows files, records, tasks, workflows, decisions, events, and audit proof. | none, partial, verified |
| Agent Handoff Panel | Shows what agents can read/do and what needs owner approval. | read-only, supervised, blocked |
| Metrics Strip | Shows department health and trend signals tied to decisions. | unknown, healthy, warning, critical |
| Improvement Queue | Converts feedback and gaps into tasks, standards, or process changes. | empty, proposed, accepted, in progress |

## Agent Operating Model

Each department system should eventually expose an agent packet:

```text
Department agent packet
  -> department purpose
  -> current goals and constraints
  -> active tasks and blockers
  -> relevant records, files, and knowledge
  -> allowed MCP tools
  -> approval requirements
  -> recent decisions and audit
  -> feedback and improvement queue
```

Paperclip should use this packet to:

- understand the department's job;
- find missing work;
- propose tasks or workflow changes;
- request approvals for risky changes;
- create or update records only through CompanyCore command/API/MCP paths;
- report evidence back into the same department system.

Agents must not bypass CompanyCore APIs, raw-edit workflow definitions, use raw
provider tokens, or mark work accepted without evidence.

## V1 Implementation Direction

V1 should not attempt to fully implement every subsystem at once. The safe
sequence is:

1. Make each of the 13 departments visible as a management system shell.
2. For each department, derive subsystem cards from existing tables,
   processes, tasks, knowledge, resources, and metrics.
3. Add read-only management boards before write actions.
4. Add write actions only when an existing backend contract supports them.
5. Add MCP/agent packets after the human read model is understandable.
6. Add automation only after policy, approval, audit, and rollback are clear.

## Guardrails

- A department system is a UX and graph projection, not a duplicate database.
- Each department can use `tables`, `pipelines`, `tasks`, `resources`,
  `knowledge`, `metrics`, and `agents` as shared building blocks.
- Use one shared layout and component language for all departments.
- Keep provider details inside adapters and settings; department systems should
  talk in company language.
- Avoid route-local navigation models. Department systems must fit the
  Company Atlas and selected-area operating-room model.
- Do not add fake subsystem data. Empty departments should explain what is
  missing and how to create/import real data.
- Finance, legal, payment, advertising, and autonomous-agent actions are
  high-risk until explicit contracts exist.

## Future Architecture Questions

1. Which subsystem definitions should become durable records, and which should
   remain view configuration?
2. Should each department have a typed agent profile, or should one Paperclip
   profile inspect all departments with scoped capabilities?
3. Which V1 department systems need write actions first?
4. Which provider integrations are required for marketing ads, finance, and
   customer support?
5. Which metrics are useful enough to drive decisions rather than decorate the
   dashboard?
