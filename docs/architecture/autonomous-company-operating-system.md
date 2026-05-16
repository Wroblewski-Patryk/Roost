# Autonomous Company Operating System Architecture

Last updated: 2026-05-16

## Purpose

This document records the accepted architecture direction for CompanyCore as
the operating system of an autonomous company.

CompanyCore is not an AI system. CompanyCore is the system that humans and AI
agents use.

```text
CompanyCore = company operating system
AI agents = clients of the system through API/MCP
Humans = clients of the system through web UI
```

This distinction is mandatory for future architecture, backend, web, mobile,
MCP, and department-system work.

## Non-Negotiable Boundary

CompanyCore must remain:

- stable;
- predictable;
- modular;
- event-driven;
- API-first;
- MCP-ready;
- AI-compatible.

CompanyCore backend must not become:

- an embedded AI agent;
- a personality engine;
- a chatbot;
- a monolithic AI orchestrator;
- a direct autonomous decision maker that bypasses approvals, audit, events,
  permissions, or CompanyCore command contracts.

AI may read data, write data, create tasks, update statuses, create documents,
manage pipelines, and propose actions only through approved CompanyCore API/MCP
boundaries. CompanyCore owns validation, permissions, approvals, events, audit,
and source-of-truth state.

MCP tools should expose domain objects and governed commands, not raw database
table ownership. An agent should update an Operations work item, inspect an
Assets resource, read a relationship graph, or request a workflow action. It
should not be guided to think "edit row in `tasks`" or "mutate table X" unless
the tool is an explicitly technical/admin diagnostic capability. Table names
remain implementation details that are mapped into department systems, shared
engines, graph packets, and command routes.

## Unified Workforce Boundary

CompanyCore must treat humans and AI agents as organizational workforce
members without making CompanyCore itself an AI runtime.

```text
Human workforce member -> web / future mobile -> CompanyCore API
AI workforce member -> MCP / API / service integration -> CompanyCore API
```

Both humans and agents can receive tasks, report work, belong to departments,
exist in hierarchy, own permissions, participate in workflows, execute
procedures, access resources, escalate issues, and communicate
organizationally. Their profiles and client interfaces differ, but the
organizational structures they operate in must be shared.

The detailed workforce, hierarchy, task recursion, contextual visibility, and
world-state target lives in
`docs/architecture/unified-organizational-operating-system.md`.

## Interaction Model

| Client | Interface | Allowed model |
| --- | --- | --- |
| Human owner/operator | Responsive web UI for desktop, tablet, and mobile | inspect, decide, edit safe records, run approved actions, review evidence |
| AI agent | API/MCP tools | read context, propose work, execute approved commands, update records within capability scope |
| Provider integrations | Adapter routes and sync services | exchange provider data through normalized CompanyCore records |

Humans and AI agents use the same underlying company model. They must not get
separate sources of truth.

## Company Structure

CompanyCore organizes the company as `00 Main` plus 12 operating departments:

| Area | Department system | Primary role |
| --- | --- | --- |
| `00-ogolny` | Company Orchestration System | company intake, routing, cross-department command |
| `01-strategia` | Strategy Management System | goals, roadmap, decisions, risks, KPIs |
| `02-produkt` | Product And Delivery Management System | product/service promise, delivery, acceptance |
| `03-sprzedaz` | Sales Management System | leads, offers, pipeline, commercial conversion |
| `04-operacje` | Operations Management System | work execution, procedures, routines, controls |
| `05-relacje` | Relationship Management System | clients, partners, stakeholders, support |
| `06-kadry` | People/Agents And Role Management System | humans, agents, roles, capacity, authority |
| `07-finanse` | Finance And Billing Management System | pricing, invoice readiness, payment state |
| `08-zasoby` | Assets And Resource Management System | files, documents, prompts, repositories, sources |
| `09-technologia` | Technology And AI Infrastructure Management System | code, deployments, integrations, MCP, runtime health |
| `10-prawo` | Legal, Standards, And Decision Management System | contracts, policies, compliance, controls |
| `11-innowacje` | Innovation And Growth Management System | R&D, experiments, feedback, improvements |
| `12-zarzadzanie` | Executive Management System | owner command, KPIs, escalation, governance |

Departments are not separate apps and not duplicated databases. They are
management systems over shared CompanyCore engines and records.

## Shared System Engines

Every department should reuse shared engines before a department-specific
concept is added:

| Engine | Purpose |
| --- | --- |
| Tasks Engine | work units, subtasks, checklists, dependencies, ownership, timelines |
| Pipelines Engine | staged work movement across departments |
| Procedures Engine | SOPs, steps, validation, approval needs, repeatable work |
| Resources Engine | files, folders, documents, prompts, repositories, tools |
| Relations Engine | links between records, people, clients, tasks, files, workflows |
| Events Engine | observable state changes and integration triggers |
| Permissions Engine | human and service-key capability boundaries |
| Automation Engine | event observers and command requesters, not raw state mutators |
| Knowledge Engine | notes, documents, summaries, entities, AI-ready context |
| Metrics/KPI Engine | decision-driving status, health, and performance signals |
| Comments/Discussions Engine | human/agent discussion and review context |

When a needed capability already exists in a shared engine, future work must
extend or compose that engine instead of adding a parallel department-local
implementation.

## Record-First Data Principle

Everything important in CompanyCore is a record or a relationship between
records:

- workspace, department, project, pipeline, stage, procedure, task, subtask;
- folder, resource, document, file, prompt, repository, architecture doc;
- client, stakeholder, contract, decision, comment, event, audit log;
- metric, KPI, risk, control, approval, automation, deployment.

This enables:

- one company graph;
- consistent UI patterns;
- consistent API/MCP contracts;
- AI interoperability without embedding AI in the backend;
- source-backed evidence instead of fake dashboard state.

Every persistent backend table must have a clear owner in the product model:
either the core system, one of the `00` plus `01`-`12` department management
systems, or a shared engine used by several departments. Tables without a
clear product owner, route, graph packet, MCP packet, or documented future
adapter are architectural debt and should be mapped before more data is added.

## Operations System Target

`04 Operations` is the central work execution and administration system.

Core objects:

- workspace;
- space/domain;
- project;
- pipeline;
- pipeline stage;
- procedure;
- task.

The Task model should support:

- identity: title, description, tags, category;
- dates: start date, due date, estimated end date, completed time;
- time: estimated, actual, and tracked minutes;
- responsibility: owner, assigned agent, reviewer, team;
- operating score: complexity, urgency, impact, effort, business value, risk;
- relations: parent task, project, pipeline, stage, resources, clients;
- statuses: draft, backlog, planned, ready, in progress, blocked, review,
  testing, completed, archived;
- priority: critical, high, medium, low, someday;
- execution context: instructions, checklists, dependencies, activity,
  comments, execution logs, linked resources, and history.

Task execution may be human, AI, or hybrid. The backend still treats both
humans and AI agents as actors using CompanyCore permissions and APIs.

## Assets System Target

`08 Assets` is the organizational memory and source-control system for company
knowledge and artifacts.

Core objects:

- folder;
- resource.

Resource types include:

- document;
- markdown;
- spreadsheet;
- image;
- video;
- prompt;
- architecture document;
- repository;
- API reference;
- deployment document;
- knowledge note;
- contract;
- brand asset.

AI compatibility fields such as embeddings, summary, extracted entities, and
`ai_context_ready` mean the asset can be used safely by external agents. They
do not mean AI lives inside CompanyCore.

Assets must connect to tasks, projects, pipelines, clients, agents, and
departments through relationships so humans and agents can find the evidence
needed to act.

## Web And Component Architecture Direction

The web product must be a functional management tool, not a collection of busy
dashboards.

Required direction:

- mobile, tablet, and desktop are all first-class responsive surfaces;
- desktop supports comparison, tables, boards, evidence rails, and command
  panels;
- tablet balances overview and selected context;
- mobile focuses on attention queues, one next action, blockers, and source
  links;
- every department reuses the shared CompanyCore shell and design system;
- every repeated primitive must be a shared component or approved variant:
  button, icon button, table, card, metric strip, empty state, command brief,
  tabs, filters, modal, drawer, action panel, evidence rail;
- Tailwind CSS and DaisyUI theme tokens are the styling base;
- page-local component styles are allowed only when the pattern is truly unique
  and documented before reuse.

If one table gains pagination, filtering, loading, empty, or error behavior,
the shared table pattern should make that improvement available to all tables
that use the same component. The same rule applies to buttons, cards, badges,
forms, command panels, and action feedback.

## Implementation Order

The accepted near-term order is:

1. Preserve and deepen `00 Main` as the company intake, router, and
   Paperclip/agent-output review system.
2. Preserve and deepen `04 Operations` as the operations management and task
   execution system.
3. Then build `08 Assets` as the file/resource/source-readiness system.

This order supersedes generic department queue selection when the user is
explicitly steering the system toward `00`, `04`, and then `08`.

## Guardrails

- Do not build one giant module.
- Do not build 13 separate apps.
- Do not create duplicate tables for department-local views when shared
  CompanyCore records can represent the concept.
- Do not expose raw provider errors or provider vocabulary as the product
  model.
- Do not hide missing data with placeholders or fake rows.
- Do not add AI personality or agent behavior to the backend.
- Do not let MCP tools bypass CompanyCore API, permissions, approval, audit, or
  event contracts.
- Do not add finance, legal, permission, provider-write, ad, or autonomous
  agent actions without explicit command contracts and validation.

## Source-Of-Truth Links

This direction extends:

- `docs/architecture/system-architecture.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/department-management-systems-architecture.md`
- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/ux/design-system-contract.md`
- `docs/ux/v1-department-management-systems-view-map.md`
