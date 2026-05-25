# Department Management Systems V1 Blueprint

Last updated: 2026-05-16

## Purpose

This blueprint turns the accepted department-management-system direction into
an implementation-ready model for CompanyCore V1 web and backend expansion.

It answers:

- what the best department systems should give the owner;
- how the 12 operating departments should differ from each other;
- how `00 Main` coordinates the whole company without becoming another silo;
- which existing CompanyCore backend contracts should be reused first;
- which backend gaps must be planned before richer V1 functionality;
- how Paperclip and other supervised agents should consume each department.

This document complements:

- `docs/architecture/autonomous-company-operating-system.md`
- `docs/architecture/department-management-systems-architecture.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/architecture/unified-organizational-operating-system.md`
- `docs/ux/v1-department-management-systems-view-map.md`

It is an architecture and planning source of truth. It does not approve broad
runtime implementation by itself. Each department still needs a scoped task
contract, validation plan, and source-of-truth refresh before code changes.

## Product Thesis

CompanyCore should not copy ClickUp, a CRM, an ERP, a helpdesk, or a finance
tool one-to-one. The stronger product is an owner and AI-agent operating layer
that can look across those categories and explain the company in one model:

```text
intent -> department system -> subsystem -> workflow/task/record
  -> evidence -> decision -> improvement -> next intent
```

The best business systems share a few patterns:

| Pattern | Why it matters in CompanyCore |
| --- | --- |
| Clear command surface | The owner should see what matters now, what is blocked, and what decision is needed. |
| Strong source-of-truth boundary | A department view should not invent data that belongs to tasks, CRM, Drive, Company OS, or finance. |
| Workflows plus records | A department must manage both stateful processes and the records/files that prove work happened. |
| Role and responsibility clarity | Every action needs an owner, supporting role, escalation path, and agent permission boundary. |
| Evidence and audit | Agents and humans need proof, not vibes. |
| Integrations behind adapters | Provider details stay in settings/adapters; department systems speak company language. |
| Metrics tied to decisions | Metrics should trigger decisions, tasks, risks, controls, or improvements. |
| Progressive depth | The owner should scan at executive level, then drill into records, workflow runs, tasks, and audit. |

The updated architecture boundary is explicit: CompanyCore is not the AI.
CompanyCore is the shared operating system that humans and AI agents use.
Department packets and MCP tools make the system AI-compatible, but department
backends must not become agent runtimes, chatbots, or autonomous AI
orchestrators.

CompanyCore V1 should therefore build one shared department system foundation
and then specialize each department as its own management product. The
foundation gives consistent navigation, auth, evidence, and agent safety. The
department-specific layer gives each operating department the tools, board
shape, workflow, and mobile behavior that match how that department actually
creates value.

## Scope Model

The company has:

- `00 Main`: whole-company orchestration and command layer.
- `01` to `12`: twelve department management systems.

`00 Main` is not counted as one of the 12 operating departments. It is the
control tower that routes attention across them. It is also the global intake
for anything unclassified: owner ideas, client requests, tasks, Paperclip
outputs, documents, risks, bugs, opportunities, feedback, and improvement
signals. Items should enter `00 Main` first when their department, owner,
workflow, or risk class is unclear, then be assigned into the correct
department system with evidence.

## Company Control Loop

The minimum operating loop for a real company is:

```text
intake in 00 Main
  -> classify and assign department
  -> decide or approve
  -> execute through department workflow/task
  -> capture evidence
  -> accept, invoice, support, or archive
  -> collect feedback
  -> create improvement task or update standard/process
```

This loop should become visible in V1 before broad automation. It lets the
owner react to what Paperclip creates in the background, turns old client work
into learning material, and prevents AI output from becoming invisible work.

## Shared Department Contract

Every department system must expose the same high-level contract:

| Contract area | V1 requirement |
| --- | --- |
| Purpose | The department's role in the company value flow. |
| Command brief | Current priority, blocker, next owner decision, suggested agent action. |
| Subsystems | Department-specific management capabilities. |
| Work graph | Goals, workflows, tasks, records, resources, decisions, metrics, risks, and evidence. |
| Actions | Read-only first; writes only through existing API/Company OS command contracts. |
| Agent packet | What Paperclip can read, propose, create, or request approval for. |
| Evidence rail | Tables, Drive files, task records, workflow runs, approvals, events, audit. |
| Improvement loop | Feedback, defects, retros, standards updates, and new tasks. |

## Differentiated Department Product Model

The V1 assumption is no longer "all departments look the same." The correct
model is:

```text
shared shell and safety model
  -> department-specific management system
  -> subsystem-specific board, workflow, records, actions, and agent packet
```

Every operating department still uses the shared CompanyCore shell, route
model, auth, MCP, evidence rail, and command safety language. However, each
department must have its own primary operating surface:

| Shared across all departments | Different per department |
| --- | --- |
| route shell, auth, workspace scope, responsive frame | primary board layout and workflow |
| identity bar, health, command brief, evidence rail | domain vocabulary and core objects |
| common links to goals, tasks, records, knowledge, metrics, risks, decisions, AI | subsystem tabs and action panels |
| read-first, command-shaped-write rule | default filters, tables, kanban/list/calendar/timeline shape |
| agent packet contract and blocked actions | department-specific agent recommendations |
| loading, empty, degraded, error, success states | mobile quick actions and decision prompts |

The shared shell should make CompanyCore feel like one product. The
department-specific board should make each department feel like the right tool
for that job.

### Department System Differentiation Matrix

| Department | Primary operating surface | Main functional areas | Desktop UX requirement | Mobile UX requirement | First safe runtime direction |
| --- | --- | --- | --- | --- | --- |
| `01 Strategy` | Strategy command board | goals, targets, KPIs, roadmap, portfolio choices, assumptions, decisions, risks, positioning | show strategic north star, goal/target tree, decision/risk rail, roadmap timeline, and gaps in one scan-friendly board | owner can review top goals, blocked decisions, risky assumptions, and approve/request follow-up from a compact brief | read-only strategy context, then strategy web board and data curation |
| `02 Product And Delivery` | Delivery promise and acceptance board | offer catalog, service/product packages, backlog, delivery plans, artifacts, releases, quality, acceptance | show promised value, active delivery streams, acceptance evidence, artifacts, blockers, and delivery readiness | show today's deliveries, blocked acceptance, required owner/client feedback, and next proof to capture | read-only delivery/acceptance packet before write actions |
| `03 Sales` | Sales pipeline and offer workbench | leads, qualification, discovery, offers, pricing context, discounts, deal stages, follow-ups, source campaigns | show pipeline by stage, next follow-up, offer/pricing packet, discount exceptions, and lead quality signals | show urgent follow-ups, deal stage changes, current client work, quick contact context, and discount warning | read-only sales context over clients/deals/interactions/commercial exceptions |
| `04 Operations` | Operating rhythm and control board | routines, SOPs, procedures, dependencies, approvals, controls, recurring admin, operational tasks | show procedure health, pending approvals, blocked dependencies, routines, and operational work queue | show what must be done today, approvals to review, blocked routines, and safe handoff to agents | deployed read-only operations context, then guarded command contract |
| `05 Relationships` | Client success and relationship health board | active clients, archived clients, stakeholders, interactions, support, satisfaction, referrals, feedback | show client health, contact history, stakeholder map, follow-up queue, support issues, and archived-learning signals | show who needs contact now, last interaction, open support, feedback request, and relationship risk | read-only relationships context plus archived-client source audit |
| `06 People/Agents And Roles` | Human/agent roster and authority board | people, AI agents, roles, responsibilities, capacity, permissions, escalation, hiring/agent creation, Paperclip roster sync | show roster, responsibilities, capacity load, authority boundaries, escalation map, service keys, and missing staffing | show who/which agent owns this, overload warnings, escalation route, and permission risk before action | read-only people/agents authority packet and Paperclip roster reconciliation design |
| `07 Finance And Billing` | Money readiness and billing control board | pricing models, hourly value, work valuation, discounts, invoice readiness, payments, receivables, margin, finance risks | show pricing assumptions, commercial exceptions, invoice blockers, payment status, margin risk, and owner decisions | show invoice-ready work, payment blockers, discount approvals, and money-risk alerts | deployed finance context plus read-only board; writes require finance command contract |
| `08 Assets And Resources` | Company asset and source control board | Drive folders/files, resources, prompts, repositories, tools, storage locations, knowledge roots, freshness | show source map, ownership, freshness, missing descriptions, unscoped files, and resource readiness by department | show recently changed/missing/untrusted sources, quick file inspection, and assignment needs | read-only asset/resource packet and freshness aggregate |
| `09 Technology And AI Infrastructure` | Runtime, integration, and agent tool control board | integrations, API keys, MCP tools, agent runtime health, deployment health, observability, automation, incidents | show integration health, MCP exposure, agent authority, API/service key risk, deploy/runtime status, and automation health | show broken integrations, risky keys, failed agent/tool events, deploy status, and required owner action | read-only technology health aggregate before any automation writes |
| `10 Legal, Standards, And Governance` | Rule, risk, and control board | standards, policies, controls, compliance, contracts, approvals, decision logs, legal risk | show applicable rules, standards, risks, controls, approvals, decision evidence, and workflow guardrails | show high-risk items, missing approval/standard, contract/legal decision, and blocked action reason | read-only legal/standards packet; writes only through approved standards/workflow commands |
| `11 Innovation And Growth` | Experiment and improvement lab | experiments, growth ideas, marketing signals, feedback loops, retros, lessons, improvement tasks | show idea funnel, experiment status, learning evidence, feedback sources, growth signals, and improvement backlog | show experiments needing decision, latest learning, feedback trend, and next small test | read-only innovation/feedback packet after feedback sources are mapped |
| `12 Executive Management` | Owner command and cross-department health board | portfolio, approvals, escalation, department health, risks, resources, agent autonomy, strategic reporting | show cross-department status, owner decision queue, approvals, escalations, KPI/risk summary, and portfolio tradeoffs | show top decisions, blocked departments, urgent approvals, and next executive action | department health aggregate and executive read-only board |

### Desktop And Mobile UX Principles

Desktop department systems should be built for command and comparison:

- dense but readable information architecture;
- two to three primary columns when useful: command board, operating records,
  evidence/decision rail;
- domain-specific board types such as pipeline, roster, timeline, health grid,
  control checklist, or asset map;
- visible filters for department-owned status, risk, owner, agent, source, and
  freshness;
- drill-down from board item to source record, workflow, task, decision, file,
  audit, or approval;
- no nested card-heavy marketing layout; this is operational software.

Mobile department systems should be built for review and quick response:

- one primary question at the top: what needs attention now?;
- compact command brief with next action, blocker, and responsible human/agent;
- short queues instead of wide tables;
- tap targets for inspect, assign/propose, request approval, or open source;
- no side-by-side comparison that requires horizontal scrolling;
- defer deep editing to desktop unless a safe command is explicitly designed
  for mobile.

### Shared Components vs Department-Specific Components

Reusable components should remain generic only when they preserve company
meaning:

| Component type | Shared component | Department-specific extension |
| --- | --- | --- |
| Command brief | `DepartmentCommandBrief` | department-specific priority and next-action wording |
| Evidence rail | `DepartmentEvidenceRail` | domain-specific evidence groups and missing-proof warnings |
| Work queue | `DepartmentWorkQueue` | sales follow-ups, finance blockers, operations routines, relationship care items |
| Metrics | `DepartmentMetricStrip` | KPI, revenue, capacity, freshness, risk, or delivery metrics |
| Agent packet | `DepartmentAgentPacketPanel` | allowed actions, blocked actions, recommended agent task by department |
| Empty state | `DepartmentEmptyState` | source-specific next setup action |
| Mobile summary | `DepartmentMobileCommandCard` | one department-specific owner decision and quick action |

Do not force every department into the same cards if the work model is
different. The system should reuse shell, safety, and evidence primitives while
allowing specialized boards.

## Shared Web Layout

All department routes should use the selected-area route:

```text
/areas?area=:areaKey&view=:viewId
```

V1 component groups form the shared shell, not the complete department UI:

| Zone | Component group | Purpose |
| --- | --- | --- |
| Header | Department identity bar | Department name, value-flow role, health, owner focus. |
| Top | Command brief | What matters now, blocker, next decision, agent suggestion. |
| Navigation | Subsystem tabs | Overview plus specialized department subsystems. |
| Main | Department-specific management board | The primary operating surface for the selected subsystem. |
| Right rail | Evidence and graph rail | Records, files, tasks, workflow runs, approvals, audit. |
| Bottom | Improvement loop | Feedback, process updates, standards, next gaps. |

Default common views remain available as cross-cutting drill-downs:

```text
overview
goals
workflows
tasks
records
knowledge
resources
metrics
risks
decisions
ai
improvements
```

Each department must define a smaller set of default visible tabs for its own
workflow. Cross-cutting views can remain reachable, but the first screen should
not expose every common tab if that makes the department feel generic.

## Shared Backend Reuse First

Use current foundations before adding new schema:

| Need | Reuse first |
| --- | --- |
| Department identity and scope | operating areas, provider mappings, Drive folder scope |
| Goals and targets | goals, targets, metrics, decisions |
| Tasks and execution | tasks, task lists, ClickUp adapter, events |
| Processes and SOPs | processes, pipelines, pipeline stages, procedures, procedure steps |
| Runtime proof | pipeline runs, stage runs, approvals, acceptance criteria, audit logs |
| Records | operating tables and table records |
| Knowledge | knowledge roots, knowledge items, notes, Drive content snapshots |
| Files and assets | Google Drive files, resources, storage locations |
| Clients and sales | clients, stakeholders, deals, interactions, shared pipelines |
| Governance | policies, risks, controls, standards, decision logs |
| AI and automation | agents, service keys, MCP manifest, agent events, automation rules |

V1 backend expansion should prefer derived read models such as department
operating graph aggregates before adding write models.

## Backend Expansion Principles

| Principle | Rule |
| --- | --- |
| Read model before write model | First expose department state clearly, then add actions. |
| Command-shaped writes | High-impact changes go through explicit commands, approvals, audit, and capabilities. |
| No duplicate department tables | Departments are projections over shared modules, not separate apps. |
| Area links must be real | Do not fake task-to-area, workflow-to-goal, or record-to-stage links. |
| Finance/legal/ads are high-risk | Payment, pricing, legal, and paid advertising need explicit contracts before writes. |
| Agent actions are supervised | Paperclip can propose broadly, execute narrowly, and must record evidence. |

## 00 Main - Company Orchestration System

Role: cross-company control tower.

Main question: what needs owner attention across the whole company right now?

Primary subsystems:

- global intake and classification;
- company command brief;
- global business-flow health;
- cross-department blockers;
- owner inbox and approval routing;
- Paperclip output review queue;
- module confidence and release readiness;
- company graph and escalation map;
- AI-agent supervision overview.

Current backend foundation:

- `/v1/connection`;
- `/v1/company-os`;
- `/v1/operating-graph/areas/:areaKey`;
- tasks, events, approvals, audit logs, MCP manifest;
- module confidence and planning docs as repo-side evidence.

V1 web target:

- `/dashboard` remains the main company command map.
- `/areas?area=00-ogolny&view=overview` becomes the detailed orchestration
  room.

Backend gaps:

- global intake/read-review model for unclassified owner, client, provider,
  and agent-generated items;
- global business-flow read model;
- cross-department blocker aggregate;
- owner approval queue aggregate;
- agent activity and evidence rollup.

Agent packet:

- current company priorities;
- active blockers by department;
- allowed MCP tools;
- pending approvals;
- Paperclip-created background items waiting for review;
- next suggested department to improve.

## 01 Strategy Management System

Role: direction, priorities, tradeoffs, and portfolio decisions.

Main question: what should the company pursue, stop, measure, or change?

Primary subsystems:

- goals and targets management;
- strategy roadmap;
- portfolio and initiative choices;
- KPI and success-criteria management;
- risks and assumptions;
- strategic decision log;
- market and offer positioning.

Current backend foundation:

- goals, targets, metrics;
- decisions and decision logs;
- risks and controls;
- knowledge items and strategic docs;
- tasks for strategic follow-up.

V1 web target:

- strategy command brief;
- goals/targets board;
- decision and risk board;
- initiative roadmap;
- agent planning packet.

Backend gaps:

- explicit initiative or portfolio relation if current goals/tasks are not
  enough;
- goal-to-workflow bridge;
- target-to-metric relation;
- global flow stage health for strategy.

First safe implementation slice:

- read-only Strategy Management System board using goals, targets, metrics,
  decisions, risks, tasks, and Drive strategy documents.

Agent packet:

- owner intent;
- current goals and constraints;
- decisions that should guide task proposals;
- strategic gaps that may become tasks.

## 02 Product And Delivery Management System

Role: define, package, build, deliver, and accept products/services.

Main question: what value is promised, being built, delivered, and accepted?

Primary subsystems:

- product/service catalog;
- offer and scope library;
- backlog and roadmap;
- delivery plan management;
- release and artifact management;
- acceptance criteria and QA;
- customer value proof.

Current backend foundation:

- tasks and task lists;
- processes, pipelines, procedures;
- acceptance criteria;
- Drive files and resources;
- clients/deals/interactions where product work is tied to customers.

V1 web target:

- product/service catalog overview from existing records/resources;
- delivery backlog board;
- acceptance/evidence board;
- release or handoff artifact rail.

Backend gaps:

- product/service catalog contract if existing records cannot represent offers;
- delivery artifact relation;
- task-to-acceptance and workflow-to-deliverable normalization.

First safe implementation slice:

- read-only Product and Delivery board showing delivery tasks, procedures,
  artifacts, acceptance criteria, and customer-value evidence.

Agent packet:

- what is being built or delivered;
- acceptance rules;
- linked tasks/artifacts;
- missing evidence before completion.

## 03 Sales Management System

Role: turn market attention into qualified, scoped, and approved work.

Main question: which opportunities need qualification, discovery, offer, or
follow-up?

Primary subsystems:

- lead intake;
- qualification;
- discovery management;
- opportunity and deal pipeline;
- offer/scope/pricing management;
- discount management;
- sales tasks and follow-up;
- sales content and proof assets.

Current backend foundation:

- clients, stakeholders, interactions, deals;
- pipelines and pipeline stages;
- tasks;
- Drive files for proposals and sales materials;
- decisions, risks, approvals for commitments.

V1 web target:

- sales pipeline board;
- discovery queue;
- offer readiness board;
- discount and commercial exception panel;
- client/opportunity evidence rail;
- sales follow-up task panel.

Backend gaps:

- lead status and qualification fields if not expressible through clients/deals;
- discovery-to-offer relation;
- pricing/quote contract;
- discount field or commercial adjustment contract;
- future provider adapter for CRM if needed.

First safe implementation slice:

- read-only Sales Management System board over clients, deals, interactions,
  pipeline stages, sales tasks, discounts/commercial exceptions when present,
  and proposal resources. A 100 percent discount must be represented as a real
  commercial exception connected to the client/deal/invoice context, not as
  missing revenue data.

Agent packet:

- qualified opportunities;
- discovery gaps;
- proposal drafting context;
- discount and exception context;
- follow-up tasks agents may propose.

## 04 Operations Management System

Role: keep the company running through planning, routines, controls, and
handoffs.

Main question: which routines, procedures, dependencies, approvals, or controls
need attention?

Primary subsystems:

- operations planning;
- SOP and procedure management;
- recurring routines;
- dependency management;
- approval and control monitoring;
- service/admin handoff;
- operational improvement queue.

Current backend foundation:

- business functions;
- procedures and procedure steps;
- dependencies;
- approvals;
- tasks;
- Company OS cockpit and workflow contracts.

Current V1 status:

- `DMS-OPS-001` implemented a read-only board for
  `/areas?area=04-operacje&view=overview`.

Backend gaps:

- database-backed production proof for the current board;
- safe operation write actions;
- recurring routine schedule model if current automation rules are not enough;
- dependency health aggregate.

Next safe implementation slices:

1. run production or database-backed smoke;
2. add operations subsystem tabs for SOPs, routines, dependencies, approvals,
   and improvements;
3. add first write action only through existing Company OS command contracts.

Agent packet:

- procedures agents must follow;
- blocked dependencies;
- approvals needed;
- safe routine/task proposals.

## 05 Relationship Management System

Role: manage client, partner, stakeholder, support, and success relationships.

Main question: which people or organizations need care, support, follow-up, or
expansion?

Primary subsystems:

- client and stakeholder directory;
- current client work;
- archived client history;
- interaction history;
- support and success check-ins;
- relationship health;
- referral/testimonial opportunities;
- renewal or expansion signals;
- handoff from sales or delivery.

Current backend foundation:

- clients, stakeholders, interactions;
- tasks;
- relationship graph API;
- Drive files and notes;
- deals where commercial relationship context exists.

V1 web target:

- relationship health board;
- active and archived client board;
- support/follow-up queue;
- stakeholder map;
- interaction timeline;
- relationship evidence and provenance rail.

Backend gaps:

- relationship health/readiness aggregate;
- archived-client import/classification contract;
- support case or request model if tasks/interactions are insufficient;
- client feedback/satisfaction fields or survey relation.

First safe implementation slice:

- read-only Relationship Management System board using current clients,
  archived clients, stakeholders, interactions, relationship graph, tasks, and
  Drive evidence.

Agent packet:

- who needs follow-up;
- relationship context before outreach;
- what archived clients teach about better processes, pricing, delivery, and
  support;
- safe suggested message/task drafts;
- blocked or high-risk relationship items for owner review.

## 06 People/Agents And Role Management System

Role: map people, AI agents, roles, responsibilities, capacity, authority, and
escalation as one workforce system.

Main question: which human or agent unit owns the work, and who can decide,
act, escalate, or be hired/created next?

Primary subsystems:

- people directory;
- agent directory;
- roles and responsibilities;
- capacity and workload;
- permission and authority map;
- escalation paths;
- human-agent role alignment;
- hiring and agent-creation planning;
- PAEI-style behavior profiles as advisory context;
- onboarding/training needs.

Current backend foundation:

- company roles;
- users, memberships, service API keys;
- agents and capabilities;
- tasks and approvals;
- policies, controls, and audit.
- future Paperclip agent structure as an external source to reconcile, not a
  direct source of authority until imported through CompanyCore contracts.

V1 web target:

- role ownership board;
- people/agent roster;
- authority and escalation map;
- capacity/readiness summary;
- agent/human responsibility split;
- hiring and agent-creation plan;
- onboarding/training evidence.

Backend gaps:

- explicit responsibility assignments if role/task ownership is not enough;
- capacity signal model;
- Paperclip agent roster import or reconciliation contract;
- people/agent unit relation to roles, capabilities, departments, and tasks;
- PAEI profile storage if accepted later;
- role-to-capability and escalation aggregate.

First safe implementation slice:

- read-only People/Agents and Role board using roles, users, agents, task
  ownership, approvals, policies, Paperclip agent-structure context when
  available, and capability scopes.

Agent packet:

- which human or agent owns which department/workflow;
- what each agent can do;
- what requires owner approval;
- escalation route for blocked work.
- missing human or agent capacity that should become a hiring, training, or
  agent-creation task.

## 07 Finance And Billing Management System

Role: capture delivered value through pricing, invoicing, payment, and
financial closure.

Main question: what delivered value needs pricing, invoice, payment, margin, or
closure attention?

Primary subsystems:

- pricing and estimate context;
- price list and hourly-value model;
- work-effort estimation;
- invoice readiness;
- discount and pro-bono handling;
- payment status;
- receivables follow-up;
- cost and margin signals;
- financial risk and approval;
- delivery-to-payment closure.

Current backend foundation:

- deals;
- clients;
- tasks;
- resources/documents for invoices or proposals;
- approvals, decisions, risks, metrics.
- Drive and ClickUp records that currently hold scattered price lists,
  service definitions, work estimates, and client-specific commercial notes.

V1 web target:

- finance command brief;
- price list and hourly-rate board;
- service/work valuation board;
- invoice readiness queue;
- discount/pro-bono review panel;
- payment/receivable status board;
- deal-to-delivery-to-payment evidence rail;
- finance risk controls.

Backend gaps:

- service price list contract;
- role/person/agent hourly value model;
- work-estimate-to-price calculation contract;
- explicit invoice/payment contract;
- payment provider adapter if needed;
- receivable status model;
- margin/cost fields;
- high-risk security and audit requirements.

First safe implementation slice:

- read-only Finance board that shows deals, delivered/accepted work evidence,
  price-list resources, hourly-value assumptions, invoice-related resources,
  payment tasks, discounts, approvals, and finance risks. Until a finance
  contract exists, agents may prepare pricing analysis but should not send
  invoices, change prices, or autonomously promise final commercial terms.

Agent packet:

- billing readiness context;
- price-list and hourly-value context;
- discount context, including 100 percent discount cases;
- missing acceptance/payment evidence;
- safe task proposals;
- no autonomous payment, pricing, or invoice send without explicit approval.

## 08 Assets And Resource Management System

Role: make files, folders, documents, prompts, tools, repos, and resources
addressable by humans and agents.

Main question: which assets exist, where are they, who owns them, and can an
agent safely use them?

Primary subsystems:

- file and folder inventory;
- document and knowledge source registry;
- tool/resource catalog;
- prompt and template library;
- repository/system asset map;
- storage location management;
- freshness and ownership review.

Current backend foundation:

- Google Drive files and content snapshots;
- resources;
- storage locations;
- knowledge roots/items;
- tool adapters and provider mappings.

V1 web target:

- asset inventory board;
- resource ownership map;
- Drive/folder evidence rail;
- AI-safe resource labels;
- freshness/review queue.

Backend gaps:

- richer resource type taxonomy;
- freshness and stale-source aggregate;
- resource-to-workflow/task relation;
- safe document write/update commands.

First safe implementation slice:

- read-only Assets and Resource board over Drive files, resources, storage
  locations, knowledge roots, tool adapters, and provider mappings.

Agent packet:

- which files/resources are trusted;
- what can be read or created;
- what is stale;
- what needs owner mapping or review.

## 09 Technology And AI Infrastructure Management System

Role: operate the technical systems, integrations, MCP tools, AI agents,
observability, and deployment safety.

Main question: are the systems, integrations, agents, and deployment paths safe
and healthy?

Primary subsystems:

- integration health;
- API keys and service access;
- MCP tool catalog;
- agent command authority;
- deployment/build health;
- observability and incidents;
- technical risk and regression queue.

Current backend foundation:

- integration settings;
- service API keys and capabilities;
- MCP manifest;
- agents and agent events;
- health endpoints;
- audit logs, events, policies, controls.

V1 web target:

- technology command brief;
- integration health board;
- MCP/agent authority board;
- deployment and runtime health rail;
- technical risk queue.

Backend gaps:

- consolidated integration health aggregate;
- deployment metadata history;
- incident or regression record contract;
- agent command result/evidence rollup.

First safe implementation slice:

- read-only Technology and AI Infrastructure board using settings, MCP
  manifest, agents, events, service keys, health metadata, and audit evidence.

Agent packet:

- allowed tools;
- current runtime health;
- risk level for actions;
- incidents/regressions that block autonomy.

## 10 Legal, Standards, And Decision Management System

Role: define guardrails, policies, standards, risks, controls, decisions, and
acceptance rules.

Main question: what is allowed, risky, approved, rejected, or required before
the company acts?

Primary subsystems:

- policy management;
- standard operating rules;
- decision log;
- risk and control register;
- approval rules;
- compliance and contract review;
- acceptance and quality standards.

Current backend foundation:

- policies, standards, risks, controls;
- decisions and decision logs;
- approvals;
- acceptance criteria;
- audit logs and events;
- Company OS definition editing contracts.

V1 web target:

- standards and policy board;
- risk/control board;
- approval and decision board;
- compliance evidence rail;
- agent authority guardrail panel.

Backend gaps:

- richer contract/legal document relation;
- approval policy templates;
- standards-to-workflow enforcement read model;
- legal review queue if needed.

First safe implementation slice:

- read-only Legal/Standards board using policies, standards, decisions,
  risks, controls, approvals, acceptance criteria, audit, and events.

Agent packet:

- what rules apply;
- what actions are blocked;
- what approvals are required;
- which decisions must be cited before execution.

## 11 Innovation And Growth Management System

Role: learn, experiment, improve offers, improve operations, and grow market
reach.

Main question: what should the company test, improve, publish, automate, or
learn next?

Primary subsystems:

- experiment backlog;
- growth ideas;
- marketing/content ideas;
- feedback and learning loop;
- post-delivery surveys;
- archived-client learning;
- process improvement queue;
- automation opportunity review;
- offer improvement.

Current backend foundation:

- tasks;
- knowledge items and notes;
- decisions;
- metrics;
- feedback sources when represented as notes/tasks/resources;
- automation definitions/rules;
- Drive docs and sheets.

V1 web target:

- experiment and growth board;
- feedback-to-improvement board;
- post-process survey and retro board;
- archived-client learning board;
- content/promotion idea board;
- automation opportunity board;
- learning evidence rail.

Backend gaps:

- explicit experiment model if tasks/decisions are insufficient;
- feedback survey relation;
- archived-client learning import relation;
- content/campaign relation;
- improvement-to-standard/process update command.

First safe implementation slice:

- read-only Innovation and Growth board using tasks, notes, decisions,
  metrics, automation rules, Drive evidence, and improvement records.

Agent packet:

- improvement candidates;
- experiment drafts;
- content ideas needing owner approval;
- feedback that should become tasks or standards.
- archived work patterns that should improve pricing, delivery, onboarding,
  support, or agent training.

## 12 Executive Management System

Role: owner-level steering, approvals, escalation, portfolio management, and
company control.

Main question: what must the owner decide, approve, delegate, or stop?

Primary subsystems:

- owner command center;
- approvals and escalations;
- cross-department health;
- portfolio status;
- risk and confidence ledger;
- agent autonomy supervision;
- company operating-system updates.

Current backend foundation:

- approvals, decisions, risks, metrics;
- tasks and events;
- Company OS cockpit;
- MCP manifest and service keys;
- module confidence, task board, project state as repo evidence.

V1 web target:

- executive command board;
- approval/escalation queue;
- portfolio and department health board;
- agent autonomy board;
- operating-system improvement decisions.

Backend gaps:

- owner approval queue aggregate;
- portfolio/initiative relation;
- department health aggregate;
- module-confidence API if repo-side ledgers become runtime data later.

First safe implementation slice:

- read-only Executive Management board using approvals, decisions, risks,
  tasks, metrics, events, MCP authority, and department graph summaries.

Agent packet:

- decisions waiting for owner;
- proposed delegated work;
- high-risk actions needing approval;
- next cross-department improvement.

## Implementation Waves

V1 should be built in waves that raise confidence without widening risk.

### Wave 0 - Architecture And Source-Of-Truth

Goal: make the department system target recoverable from docs.

Output:

- this blueprint;
- updated view map;
- implementation queue for department specs and read-only shells;
- backend gap list.

### Wave 1 - Shared Department Shell

Goal: make all 12 departments render as management systems, even before every
subsystem is deep.

Output:

- common department management layout in selected-area route;
- department-specific command brief copy;
- subsystem cards derived from existing tables, Drive files, tasks, workflows,
  and MCP data;
- honest empty states.

Backend:

- reuse current selected-area data and operating graph;
- no new writes.

### Wave 2 - Department Read Models

Goal: expose richer read aggregates for each department.

Output:

- one `department system packet` read shape for web and agents;
- normalized health, blockers, records, tasks, workflows, files, decisions,
  metrics, risks, and agent permissions.

Backend:

- extend `GET /v1/operating-graph/areas/:areaKey` or add a scoped
  `/v1/department-systems/:areaKey` read model if the operating graph becomes
  too generic.

### Wave 3 - Safe Existing-Contract Actions

Goal: add actions only where backend already supports safe commands.

Examples:

- create task;
- move task status;
- create client;
- request approval;
- create workflow draft;
- save integration settings;
- create service key;
- create Drive document through approved provider command.

Backend:

- no raw workflow mutation;
- all high-risk actions remain approval-aware and audited.

### Wave 4 - New Backend Contracts

Goal: close real concept gaps discovered by read models and proof.

Candidate contracts:

- department system packet aggregate;
- global intake and Paperclip output review queue;
- global business-flow read model;
- lead/discovery/offer relation;
- price list, hourly-value, discount, and invoice readiness read model;
- invoice/payment read model and later command contract;
- feedback/survey-to-improvement flow;
- archived-client learning import/classification flow;
- explicit responsibility/capacity model;
- resource freshness and agent-safe usage model;
- department health aggregate.

### Wave 5 - Paperclip Department Operators

Goal: let agents help run departments through supervised packets and commands.

Output:

- read-only department packets;
- task proposal and gap analysis;
- scoped task creation;
- approval-request commands for risky work;
- evidence reporting back into CompanyCore.

## Recommended Build Order

The current owner-approved near-term focus is `00 Main`, `04 Operations`, then
`08 Assets`. That focus takes priority over the older generic next-department
selection because it creates the minimal company operating loop:

```text
00 Main intake/routing -> 04 Operations execution/control
  -> 08 Assets evidence/source readiness
```

After that focused loop is stable, continue with the broader department order
based on existing backend readiness and company leverage:

| Order | Department | Reason |
| --- | --- | --- |
| 1 | 04 Operations | Already started; strongest fit with procedures, approvals, dependencies, and routines. |
| 2 | 01 Strategy | Needed to steer every other department and agent proposal. |
| 3 | 03 Sales | Connects market, CRM, discovery, offers, and revenue pipeline. |
| 4 | 08 Assets And Resources | Makes Drive/resources/knowledge usable by humans and agents after `00` and `04`. |
| 5 | 05 Relationships | Reuses clients, stakeholders, interactions, and relationship graph. |
| 6 | 02 Product And Delivery | Connects promises, tasks, artifacts, and acceptance. |
| 7 | 09 Technology And AI Infrastructure | Gives agents, MCP, integrations, and deployment health a management home. |
| 8 | 10 Legal, Standards, And Decisions | Raises safety for AI, sales, finance, and workflow writes. |
| 9 | 12 Executive Management | Consolidates approvals, escalation, and portfolio control after lower-level signals exist. |
| 10 | 07 Finance And Billing | High business value but high-risk; needs explicit finance contract before writes. |
| 11 | 06 People/Agents And Roles | Important for scaling humans and agents together, but capacity/responsibility and Paperclip-roster contracts need careful work. |
| 12 | 11 Innovation And Growth | Best after strategy, sales, relationships, and feedback foundations provide signals. |

`00 Main` should evolve in parallel as the company-level orchestrator and
should not wait until all departments are complete.

## V1 Backend Gap Register

| Gap ID | Gap | Needed by | Suggested first step |
| --- | --- | --- | --- |
| DMS-BE-001 | Department system packet read model | all departments, Paperclip | Decide whether to extend AOG or add `/v1/department-systems/:areaKey`. |
| DMS-BE-002 | Global business-flow read model | 00, 01, 03, 12 | Project current records into 13 stages without new writes. |
| DMS-BE-003 | Goal/workflow/task bridge | 01, 02, 04, 12 | Continue AOG-BE-003 after AOG production proof. |
| DMS-BE-004 | Lead/discovery/offer relation | 03, 05, 07 | Audit current CRM/deal/interactions shape before schema. |
| DMS-BE-005 | Feedback-to-improvement flow | 05, 11, 12 | Start as task/knowledge/decision read model, then plan survey contract. |
| DMS-BE-006 | Invoice/payment read model | 07 | Write finance/security requirements before implementation. |
| DMS-BE-007 | Responsibility/capacity model | 06, 12 | Verify current roles/users/agents/task ownership coverage first. |
| DMS-BE-008 | Resource freshness model | 08, 09, agents | Add read-only stale/source-confidence aggregate before write commands. |
| DMS-BE-009 | Integration health aggregate | 09, 12 | Derive from settings, provider state, events, and health metadata. |
| DMS-BE-010 | Department health aggregate | 00, 12, all | Combine blockers, stale evidence, open tasks, risks, and approvals. |
| DMS-BE-011 | Global intake and Paperclip output review | 00, 09, 12, all | Start with read/review queue for unassigned ideas, tasks, files, risks, and agent-created items. |
| DMS-BE-012 | Price list, hourly value, and discount model | 03, 07, 12 | Inventory Drive/ClickUp pricing sources, then create a read-only pricing context before write actions. |
| DMS-BE-013 | Archived-client learning model | 05, 11, 03, 07 | Import/classify old clients as archive evidence before using them for process improvement. |

## Acceptance Criteria For Future Department Specs

Before implementing a department system, its spec must include:

- department purpose and value-flow contribution;
- subsystem list;
- source-of-truth modules and current backend contracts;
- V1 read-only board design;
- allowed existing-contract actions;
- explicitly blocked actions;
- agent packet;
- metrics and health signals;
- empty/error/success states;
- responsive requirements;
- validation plan;
- backend gaps and follow-up tasks.

## Guardrails

- Do not build 12 separate apps.
- Do not create department-specific duplicate tables when shared modules can
  express the concept.
- Do not let provider names become the product model.
- Do not add finance, legal, paid ads, or autonomous-agent writes without
  explicit security, governance, and approval contracts.
- Do not hide empty state by adding fake data.
- Do not let `04 Operations` become the dumping ground for unowned work.
- Do not let `00 Main` become an unmaintainable copy of every department.
