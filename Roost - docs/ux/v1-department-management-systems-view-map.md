# V1 Department Management Systems View Map

Last updated: 2026-05-16

## Purpose

This document defines the V1 web view map for CompanyCore after accepting the
department management systems direction. It refreshes the view list so the app
can evolve from separate modules into one coherent company operating system.

Architecture source:

- `docs/architecture/department-management-systems-architecture.md`
- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/companycore-business-module-map.md`

## View Layers

CompanyCore V1 has three web layers:

| Layer | Audience | Purpose |
| --- | --- | --- |
| Public | visitors and owner before login | explain the product and allow safe entry. |
| Private owner | owner/operator | operate the company through the Company Atlas and department systems. |
| Agent-facing support | owner plus supervised agents | expose what agents can read/do, what needs approval, and what evidence exists. |

## Public Views

| View | Route | Purpose | V1 status | Primary components |
| --- | --- | --- | --- | --- |
| Public Home | `/` | Explain CompanyCore and route to login/register. | V1 canonical | value statement, product signal, login/register actions |
| Owner Login | `/auth/login` | Safe owner return path. | V1 canonical | login form, pending route recovery, workspace safety copy |
| Owner Registration | `/auth/register` | First owner and workspace bootstrap. | V1 canonical | registration form, workspace creation, onboarding cue |

## Private Core Views

| View | Route | Purpose | V1 status | Primary components |
| --- | --- | --- | --- | --- |
| 00 Ogolny Dashboard | `/areas?area=00-ogolny&view=overview` (`/dashboard` compatibility alias) | Whole-company command map and orchestration layer across 00-12 areas. | V1 canonical | company decision board, area map, health signals, next action |
| Operations Cockpit | `/operations` | Cross-perspective supervision for clients, tasks, files/tables, and AI handoff. | V1 canonical | four-lane command surface, quick create, department evidence, AI handoff |
| Department Management System | `/areas?area=:areaKey&view=:viewId` | Canonical department operating room for one area. | V1 canonical base; `00 Main` and `04 Operacje` have first dedicated read-only management panels | department identity, command brief, subsystem tabs, board, evidence rail |
| Unified Settings | `/settings` | Configure connectors, agent keys, and MCP handoff fields. | V1 canonical | integration settings, agent keys, MCP instructions |

## Private Support Workbenches

These support department systems and should be progressively rebuilt around the
department management model.

| View | Route | Current status | Target role |
| --- | --- | --- | --- |
| All-Areas Admin Workbench | `/areas` | V0 rebuild | Manage operating-area mappings and lifecycle, not the primary department view. |
| Task Delivery Workbench | `/tasks-adapter` | V1 canonical | Execution pressure and task operations for department systems. |
| Data Evidence Browser | `/data`, `/data/:table` | V0 rebuild | Area-aware table/record evidence browser. |
| Relationship Review | `/relationships` | V0 rebuild | Area-aware relationship provenance and confidence review. |
| Pipeline Workbench | `/pipeline` | V0 rebuild | Workflow and sales/delivery pipeline management by area. |
| Company OS Cockpit | `/react-company-os` | V1 foundation | Command/evidence cockpit for workflows, approvals, audit, and standards. |
| Agent Tool Surface | `/react-agent-tools` | V1 canonical section entry | MCP tool handoff from settings, later area-aware agent view. |
| Account Settings | `/settings/account` | V0 rebuild | Workspace/account administration. |

## Department System Routes

All department systems use:

```text
/areas?area=:areaKey&view=:viewId
```

Default `viewId` values:

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

The current implementation already supports a subset of capability tabs. V1
should expand toward the full set as existing backend contracts allow it.

Important product rule:

```text
same route shell does not mean same department screen
```

Each department must keep shared CompanyCore navigation, safety, evidence, and
agent handoff, but its first viewport and primary board must match the work of
that department. A Sales system should behave like a pipeline and offer
workbench. A Finance system should behave like money readiness control. A
People/Agents system should behave like a roster, capacity, and authority map.

## Differentiated Web Experience Contract

### Shared Shell Requirements

Every department route must provide:

| Requirement | Desktop | Mobile |
| --- | --- | --- |
| Identity | department name, value role, health, selected subsystem | compact title, health, one-line role |
| Command | current priority, blocker, next owner decision, agent suggestion | one primary action, one blocker, owner/agent responsible |
| Navigation | subsystem tabs plus cross-cutting drill-down links | segmented control or compact tab list; no overflow |
| Board | department-specific primary board | one-column review queue with top action |
| Evidence | linked records, files, tasks, workflows, audit, approvals | source chips and "open evidence" affordance |
| Safety | allowed actions and blocked actions | explicit disabled/blocked action reason |
| Improvement | feedback, defects, standards/process updates | short improvement queue |

### Department-Specific Board Requirements

| Area | Primary desktop board | Mobile first screen | Key UI patterns | Required states |
| --- | --- | --- | --- | --- |
| `01-strategia` | strategic goals tree plus roadmap/decision/risk rail | top goals, blocked decisions, risky assumptions | goal tree, KPI strip, roadmap timeline, decision cards | no goals, stale decisions, missing metrics, blocked strategy write |
| `02-produkt` | delivery promise board with backlog, artifacts, acceptance | today's delivery proof and acceptance blockers | kanban/list hybrid, artifact list, acceptance checklist | no catalog, blocked acceptance, missing artifacts, client feedback needed |
| `03-sprzedaz` | deal pipeline with qualification, discovery, offer, pricing, follow-up | urgent leads/follow-ups and discount warnings | pipeline columns, lead cards, offer packet, pricing chips | no leads, stale follow-up, missing discovery, discount approval needed |
| `04-operacje` | routines/procedures/dependencies/approvals control board | today's routines, approvals, blocked dependencies | SOP list, dependency board, approval queue, routine checklist | no routines, blocked dependency, pending approval, stale SOP |
| `05-relacje` | client health and stakeholder care board | clients needing contact and open support | health cards, stakeholder map, interaction timeline, feedback queue | no clients, no recent contact, support blocked, feedback overdue |
| `06-kadry` | people/agents roster with role, capacity, authority, escalation | owner/agent responsible, overload, escalation | roster table, capacity meters, authority badges, escalation map | no owner, over capacity, missing permission, escalation missing |
| `07-finanse` | pricing, invoice readiness, discounts, payments, margin risk board | invoice-ready work, payment blockers, discount decisions | money readiness cards, exception table, invoice blocker list, risk strip | no price source, missing approval, payment blocked, invoice not ready |
| `08-zasoby` | asset/source map for files, folders, resources, prompts, tools | changed/untrusted/missing sources | source tree, freshness badges, mapping table, resource cards | unscoped files, stale source, missing description, untrusted asset |
| `09-technologia` | integration/MCP/runtime/agent health board | broken integration, risky key, failed tool event | health grid, MCP tool table, key risk cards, incident queue | integration down, risky key, failed event, deploy mismatch |
| `10-prawo` | standards, policies, risks, controls, approvals board | high-risk item and missing approval/standard | rule cards, control matrix, approval queue, decision log | missing standard, control unverified, legal decision needed, action blocked |
| `11-innowacje` | experiment and improvement lab | experiment needing decision and latest learning | idea funnel, experiment cards, feedback trend, learning log | no hypothesis, stale experiment, missing result, improvement not assigned |
| `12-zarzadzanie` | executive command board across departments | top decisions, blocked departments, urgent approvals | department health grid, portfolio board, approval stack, escalation list | blocked department, approval overdue, KPI missing, autonomy risk |

### Desktop Layout Guidance

Use desktop width for comparison and control:

- `01 Strategy`, `12 Executive`: three-column command, portfolio/roadmap, risk
  and decision rail.
- `03 Sales`, `02 Product And Delivery`: stage/pipeline boards with right-side
  context and source evidence.
- `04 Operations`, `10 Legal`: control boards with procedure/rule lists and
  approval/risk rail.
- `05 Relationships`, `06 People/Agents`: roster/relationship health grids
  with timeline or escalation detail.
- `07 Finance`: money readiness board with clear high-risk blocked states.
- `08 Assets`, `09 Technology`: health/source maps with diagnostics and
  freshness/status filters.
- `11 Innovation`: experiment funnel with learning and feedback queue.

### Mobile Layout Guidance

Use mobile for supervision, not full administration:

- top area: one department command card;
- second area: three to five compact health metrics;
- third area: short queue of items needing attention;
- fourth area: evidence chips and one safe next action;
- deep tables, large graph maps, and multi-column comparisons should collapse
  into detail screens or source links;
- high-risk actions should show a blocked state unless a mobile-safe command
  contract exists.

## Department System Inventory

| Area key | Label | System view name | Primary route | Core subsystems |
| --- | --- | --- | --- | --- |
| `00-ogolny` | 00 Ogolny | Company Orchestration System | `/areas?area=00-ogolny&view=overview` | global intake, owner inbox, Paperclip/agent output, unassigned resources, risks, cross-department priorities, company graph, global flow, system health |
| `01-strategia` | 01 Strategia | Strategy Management System | `/areas?area=01-strategia&view=overview` | goals, targets, roadmap, decisions, risks, KPIs, portfolio |
| `02-produkt` | 02 Produkt | Product And Delivery Management System | `/areas?area=02-produkt&view=overview` | offers, service/product catalog, backlog, delivery plans, releases, acceptance |
| `03-sprzedaz` | 03 Sprzedaz | Sales Management System | `/areas?area=03-sprzedaz&view=overview` | leads, discovery, opportunities, offers, pricing, deal pipeline |
| `04-operacje` | 04 Operacje | Operations Management System | `/areas?area=04-operacje&view=overview` | planning, SOPs, recurring operations, quality controls, admin routines, dependencies, approvals |
| `05-relacje` | 05 Relacje | Relationship Management System | `/areas?area=05-relacje&view=overview` | clients, stakeholders, interactions, support, success, referrals |
| `06-kadry` | 06 Kadry | People/Agents And Role Management System | `/areas?area=06-kadry&view=overview` | people, agents, roles, responsibilities, capacity, escalation, PAEI, permissions |
| `07-finanse` | 07 Finanse | Finance And Billing Management System | `/areas?area=07-finanse&view=overview` | invoices, payments, receivables, margin, finance risks |
| `08-zasoby` | 08 Zasoby | Assets And Resource Management System | `/areas?area=08-zasoby&view=overview` | files, folders, resources, repositories, prompts, tools, storage locations |
| `09-technologia` | 09 Technologia | Technology And AI Infrastructure Management System | `/areas?area=09-technologia&view=overview` | agents, MCP tools, integration health, API keys, audit, observability |
| `10-prawo` | 10 Prawo | Legal, Standards, And Decision Management System | `/areas?area=10-prawo&view=overview` | policies, standards, decision logs, risks, controls, compliance |
| `11-innowacje` | 11 Innowacje | Innovation And Growth Management System | `/areas?area=11-innowacje&view=overview` | experiments, growth ideas, marketing signals, feedback loops, improvements |
| `12-zarzadzanie` | 12 Zarzadzanie | Executive Management System | `/areas?area=12-zarzadzanie&view=overview` | owner command, approvals, escalation, cross-department health, portfolio |

## Department View Component Contract

Every department route should be composed from these groups:

| Zone | Component group | Required content |
| --- | --- | --- |
| Header | Department identity bar | name, role, value-flow contribution, health, active owner/agent focus |
| Top board | Management command brief | what matters now, blocker/risk, next owner decision, suggested AI action |
| Navigation | Subsystem tabs | overview, goals, workflows, tasks, records, knowledge, resources, metrics, risks, decisions, AI, improvements |
| Main | Primary management board | subsystem-specific cards, tables, pipeline preview, task list, action panels |
| Right rail | Evidence and graph rail | linked records, Drive files, knowledge, pipeline runs, events, audit, relationship confidence |
| Bottom | Improvement loop | feedback, retro notes, improvement tasks, standards/process updates |

## Per-Department UX Requirements

| System | Must answer first | Must not do |
| --- | --- | --- |
| Company Orchestration | What needs owner attention across the whole company? | Become a duplicate of every department board. |
| Strategy | Which goals and decisions steer the company now? | Hide execution blockers from strategic decisions. |
| Product And Delivery | What value is promised, being built, and accepted? | Split products and services into unrelated systems. |
| Work Execution | What is blocked, overdue, assigned, or ready to move? | Show tasks without ownership, area, or evidence. |
| Sales | Which opportunities need qualification, discovery, offer, or follow-up? | Mix sales with generic relationship support without stage clarity. |
| Relationships | Which clients/stakeholders need care, support, or expansion? | Treat clients as only sales leads. |
| Finance | Which delivered value needs invoice/payment/closure? | Add payment actions without finance/security contracts. |
| People/Agents And Roles | Which human or agent unit owns the work, capacity, authority, and escalation? | Use PAEI as permission or authority. |
| Operations | Which routines, controls, and procedures keep the company running? | Become a dumping ground for unowned work. |
| Knowledge | What does the company know, decide, and need to learn? | Store knowledge without source, ownership, or freshness. |
| Assets | Which files, tools, repos, prompts, and resources are addressable? | Expose raw provider complexity before company meaning. |
| Integrations | Which providers and automations are connected and healthy? | Let providers become the product model. |
| AI Agents | What can agents read/do, and what needs supervision? | Let agents bypass approvals, audit, or CompanyCore APIs. |

## V1 Build Sequence

1. Publish the shared department-system architecture and prompt pack.
2. Update the selected-area route spec so each area is a department management
   system, not a generic area detail.
3. Refresh Company Atlas copy and route metadata to point to department
   systems.
4. Build read-only department shell consistency for all 13 systems.
5. Deepen one system at a time, starting from existing backend contracts:
   Strategy, Sales, Work Execution, Knowledge, AI Agents.
6. Add write actions only where current APIs already support safe scoped
   behavior.
7. Add Paperclip/MCP department packets after human-readable department
   read models are stable.

## Prompt Pack Link

Use `docs/ux/v1-department-system-prompt-pack.md` for generation and
implementation prompts.

## Detailed Department Blueprint

Use `docs/architecture/department-management-systems-v1-blueprint.md` before
building each department. It defines the 12 operating department systems,
`00 Main` orchestration, shared layout, backend reuse rules, backend gap
register, agent packets, and recommended build order.
