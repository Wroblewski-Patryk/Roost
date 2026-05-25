# DMS 13 Systems V1 Implementation Audit

Last updated: 2026-05-16

## Purpose

This audit turns the accepted department-management-system direction into an
implementation handoff for CompanyCore V1. It covers `00 Main` plus the 12
operating department systems as one connected company management system.

The goal is not to create 13 isolated apps. CompanyCore should provide one
shared shell, one auth and workspace model, one evidence and audit model, one
Paperclip/MCP boundary, and one company operating graph. Each department then
gets a purpose-built management system over those shared foundations.

## Current Backend Reality

The current backend already has useful foundations:

- Workspace/auth/API keys: `User`, `Workspace`, `WorkspaceMembership`,
  `ApiKey`, `IntegrationSetting`.
- Operating model: `OperatingArea`, `OperatingFolder`, `OperatingTable`,
  external mappings, storage locations, knowledge roots, automation
  definitions.
- Work/delivery: `Project`, `Goal`, `Target`, `TaskList`, `Task`, `Artifact`,
  checklist and acceptance records.
- CRM/sales: `Client`, `PipelineStage`, `Deal`, `Interaction`, `Note`,
  `Decision`.
- Company OS: `Process`, `Pipeline`, `Procedure`, `ProcedureStep`, `Approval`,
  `Metric`, `Risk`, `Control`, `Policy`, `Standard`, `DecisionLog`,
  `AutomationRule`, `Trigger`, runtime events, audit logs, and dependencies.
- Agent/AI: `Agent`, `AgentLog`, `AgentEventOutbox`,
  `ProviderEventInbox`, `ToolAdapter`, `IntegrationCapability`.
- Knowledge/files: `GoogleDriveFile`, `GoogleDriveContentSnapshot`,
  `KnowledgeItem`, `Resource`.

Implemented read packets already include:

- `GET /v1/intake` and proposal-only `POST /v1/intake/actions/propose-route`
  for `00 Main`.
- `GET /v1/strategy/context` for `01 Strategy`.
- `GET /v1/commercial-exceptions` for Sales/Finance commercial exceptions.
- `GET /v1/operations/context` for `04 Operations`.
- `GET /v1/finance/context` for `07 Finance`.
- `GET /v1/operating-graph/areas/:areaKey`, `GET /v1/relationships/graph`,
  Google Drive file APIs, and Company OS collection/command APIs as shared
  supporting surfaces.

## V1 Implementation Principles

1. Read-only, source-backed packets come before department write authority.
2. Department boards must answer: what matters now, what is blocked, what
   evidence backs it, what can an owner do safely, and what can Paperclip only
   propose.
3. Missing backend structures must be shown as gaps, not simulated in the UI.
4. Shared components are allowed for shell, evidence, loading, error, empty,
   mobile queue, and agent packet patterns. Primary department boards must be
   differentiated.
5. Money, legal, permissions, external provider, and AI autonomy actions stay
   blocked until explicit command contracts, tests, and audit evidence exist.
6. CompanyCore is the operating system. AI agents are API/MCP clients, not
   embedded backend intelligence.
7. The current owner-approved near-term focus is `00 Main -> 04 Operations ->
   08 Assets`; the broader department sequence resumes after that checkpoint.

## Implementation Readiness Summary

| System | V1 readiness | Existing backend strength | Main missing gap | Recommended next slice |
| --- | --- | --- | --- | --- |
| `00 Main` | implemented, extend carefully | global intake API, route proposal command, agent/provider/resource sources | richer owner triage and cross-department review states | add intake outcome/status readback and route proposal review queue |
| `01 Strategy` | backend deployed, web board pending | strategy context packet, goals, targets, metrics, risks, decisions, Drive | strategy board and real strategy data curation | Strategy web board over `/v1/strategy/context` |
| `02 Product And Delivery` | foundation exists, packet missing | projects, tasks, artifacts, checklists, acceptance criteria, pipelines | delivery packet, offer-to-delivery relation, acceptance workflow | `GET /v1/product-delivery/context` |
| `03 Sales` | urgent, packet missing | clients, deals, pipeline stages, interactions, commercial exceptions | sales context, offer/discovery model, discount display, current-client capture | `GET /v1/sales/context` |
| `04 Operations` | backend and board verified | operations context, procedures, approvals, dependencies, functions | safe planning/procedure command contracts | operation planning/procedure proposal command contract |
| `05 Relationships` | foundation exists, packet missing | clients, stakeholders, interactions, notes, relationship graph | relationship context, support/feedback, archived-client learning | `GET /v1/relationships/context` |
| `06 People/Agents And Roles` | foundation exists, packet missing | users, memberships, roles, agents, API keys, logs, approvals | capacity, responsibility, escalation, Paperclip roster reconciliation | People/Agents roster and authority audit packet |
| `07 Finance And Billing` | backend and board verified locally | finance context, deals, commercial exceptions, risks, decisions | invoices, payments, price-list policy, labor rates | price policy/invoice readiness model, writes blocked |
| `08 Assets And Knowledge` | strong foundation, packet missing | Drive index, content snapshots, resources, storage, knowledge roots | asset readiness packet and source-quality classification | `GET /v1/assets/context` |
| `09 Technology And AI` | foundation exists, packet missing | integrations, keys, agents, MCP manifest, events, health | agent runtime health, incident state, autonomy controls by department | `GET /v1/technology-ai/context` |
| `10 Legal And Standards` | foundation exists, packet missing | policies, standards, controls, risks, approvals, audit | contract records, applicability map, legal review queue | `GET /v1/legal-standards/context` |
| `11 Innovation And Growth` | weak foundation, packet missing | notes, decisions, knowledge, tasks, feedback-like sources | experiments, improvement loop records, survey/feedback model | improvement/experiment source audit before API |
| `12 Executive Management` | aggregate pending | all context packets, metrics, risks, approvals, intake | department health aggregate, portfolio score, cross-system queue | executive health aggregate after more packets exist |

## `00 Main` - General Intake And Company Router

Owner question: What has entered the company, what needs classification, and
where should it go next?

Existing backend foundations:

- `GET /v1/intake` aggregates agent output, provider events, unassigned
  resources, risks, approvals, tasks, and events.
- `POST /v1/intake/actions/propose-route` creates auditable route proposals
  without acknowledging or mutating source records.
- Source records: `AgentEventOutbox`, `ProviderEventInbox`, `GoogleDriveFile`,
  `ExternalContainerMapping`, `ExternalFieldMapping`, `Approval`, `Risk`,
  `Task`, `Event`, `Decision`, `AuditLog`.

Current web readiness:

- `/areas?area=00-ogolny&view=overview` has a read-only Global Intake panel.
- It can propose routing for intake rows.

V1 web/mobile expectation:

- Desktop: triage board with queues for owner decision, Paperclip output,
  provider events, unassigned resources, risks, and feedback/improvement.
- Mobile: attention queue with one row at a time, risk, department suggestion,
  and proposal action.

Backend gaps:

- Route proposal review state and outcome readback.
- Feedback/improvement signal model.
- Richer duplicate/source conflict detection.

Paperclip role:

- Read intake, propose classification, create owner-review draft work, and
  stop on high-risk actions.

Blocked actions:

- No automatic acknowledgment, provider retry, discount, invoice, legal,
  ad/spend, delete, or approval decision from intake.

First implementation slice:

- Add route proposal review/outcome readback and owner queue states over
  existing `Decision`, `Task`, `AuditLog`, and `Event` evidence.

## `01 Strategy` - Strategy And Direction Management

Owner question: Are we pursuing the right goals with visible risks, evidence,
and decisions?

Existing backend foundations:

- `GET /v1/strategy/context`.
- `Goal`, `Target`, `Metric`, `Risk`, `Control`, `DecisionLog`, `Decision`,
  `KnowledgeItem`, `GoogleDriveFile`, `Task`.

Current web readiness:

- Shared department shell and data backbone exist.
- Dedicated Strategy board is still missing.

V1 web/mobile expectation:

- Desktop: strategic scorecard, goal/target tree, risk/control lane, decision
  log, strategic documents, Paperclip planning packet, and next decisions.
- Mobile: goal health, top risk, next decision, and latest strategy evidence.

Backend gaps:

- Real strategy data curation in production.
- Strategy write commands for goal/target proposals, decisions, or portfolio
  changes.
- Stronger links between targets, metrics, workflows, and tasks.

Paperclip role:

- Read strategy context, draft strategy analysis, propose next work, and flag
  source gaps.

Blocked actions:

- No autonomous strategy changes, target changes, portfolio decisions, pricing
  decisions, or task execution.

First implementation slice:

- Build a Strategy web board over `/v1/strategy/context`, then curate real
  goals/targets/decision records.

## `02 Product And Delivery` - Product, Service, And Delivery Management

Owner question: What are we building or delivering, for whom, in what state,
  and what acceptance evidence proves it?

Existing backend foundations:

- `Project`, `TaskList`, `Task`, `Artifact`, `ChecklistTemplate`,
  `ChecklistItem`, `AcceptanceCriterion`, `Process`, `Pipeline`, `Procedure`,
  `PipelineRun`, `StageRun`, `GoogleDriveFile`, `Note`, `Decision`.

Current web readiness:

- `/tasks-adapter` is a verified delivery workbench.
- Selected-area `tasks` and `knowledge` views provide generic depth.
- Dedicated Product/Delivery packet and board are missing.

V1 web/mobile expectation:

- Desktop: delivery portfolio, active client work, product/service backlog,
  acceptance checklist, artifact readiness, delivery blockers, and QA state.
- Mobile: today delivery queue, blocked work, acceptance status, and owner
  review requests.

Backend gaps:

- Department-specific delivery context packet.
- Explicit offer/agreement to delivery relation.
- Acceptance/quality workflow packet for services.
- Direct task-to-area or task-to-delivery ownership relation.

Paperclip role:

- Plan delivery tasks, summarize artifact readiness, propose acceptance
  evidence, and prepare client updates for owner review.

Blocked actions:

- No client delivery acceptance, final scope changes, deletion, provider
  mutation, or invoicing without command contracts.

First implementation slice:

- Add `GET /v1/product-delivery/context` reusing projects, tasks, artifacts,
  checklists, acceptance criteria, Drive files, notes, and decisions.

## `03 Sales` - Sales, Demand, Offer, And Promotion Management

Owner question: Which opportunities can become paid or intentionally discounted
work, and what is the next sales action?

Existing backend foundations:

- `Client`, `PipelineStage`, `Deal`, `Interaction`, `Note`, `Decision`,
  `Approval`, `Risk`, `Task`.
- `GET /v1/commercial-exceptions` for discounts/pro-bono/current-client
  exception context.
- Finance context can expose pricing candidates and `100%` discounts.

Current web readiness:

- `/pipeline` exists as a CRM workbench.
- Dedicated Sales context packet and Sales department board are missing.

V1 web/mobile expectation:

- Desktop: lead/opportunity pipeline, discovery state, offer state, follow-up
  queue, discount/commercial exception lane, current-client work, marketing
  source, and sales documents.
- Mobile: next follow-up, hot opportunity, discount review, and current-client
  action.

Backend gaps:

- Sales context packet.
- Lead source / campaign / promotion records.
- Discovery/offer/agreement model.
- Current-client work capture with discount and invoice-readiness context.
- Direct marketing content/ad campaign integration.

Paperclip role:

- Draft outreach, summarize discovery, propose follow-ups, prepare offer
  drafts, and flag pricing/discount source conflicts.

Blocked actions:

- No final quote, discount application, invoice, ad spend, email blast, legal
  agreement, or autonomous price commitment.

First implementation slice:

- Add `GET /v1/sales/context` using clients, deals, stages, interactions,
  notes, tasks, decisions, commercial exceptions, and finance context.

## `04 Operations` - Operations, Planning, Procedures, And Controls

Owner question: What routines, dependencies, approvals, and procedures keep
  the company running today?

Existing backend foundations:

- `GET /v1/operations/context`.
- `Procedure`, `ProcedureStep`, `Approval`, `Dependency`,
  `BusinessFunction`, `Task`, `Risk`, `Control`, `DecisionLog`.

Current web readiness:

- Dedicated Operations Management System board is implemented and verified.
- `/operations` cockpit is also verified as a broader owner supervision view.

V1 web/mobile expectation:

- Desktop: planning board, routines, SOPs, dependencies, approvals, blocked
  work, resource pressure, and improvement loop.
- Mobile: today's operational blockers, pending approval, routine due, and
  next safe owner action.

Backend gaps:

- Safe procedure/planning proposal command.
- Procedure step completion or improvement commands with approval policy.
- Operations-specific calendar/capacity relation.

Paperclip role:

- Inspect operations context, propose routine improvements, draft procedure
  changes, and route blockers to owner.

Blocked actions:

- No direct approval decision, provider execution, procedure activation, or
  destructive workflow change without existing Company OS command contracts.

First implementation slice:

- Define and implement an operations planning/procedure proposal command that
  writes draft evidence only and reuses existing audit/event patterns.

## `05 Relationships` - Clients, Partners, Support, And Feedback

Owner question: Who matters, what is the relationship history, and what should
  happen next?

Existing backend foundations:

- `Client`, `Stakeholder`, `Interaction`, `Note`, `Deal`, `Decision`, `Task`.
- `GET /v1/relationships/graph`.
- Google Drive files and relationship provenance review.

Current web readiness:

- `/relationships?area=:areaKey` shows relationship provenance.
- Dedicated relationship management packet is missing.

V1 web/mobile expectation:

- Desktop: relationship map, client history, stakeholders, commitments,
  feedback, support state, archived clients, and next touchpoints.
- Mobile: next contact, at-risk relationship, last interaction, and feedback
  request.

Backend gaps:

- Relationship context packet.
- Structured feedback/survey records.
- Support case or service follow-up records.
- Archived-client import/classification.

Paperclip role:

- Summarize client history, draft follow-ups, classify old clients, and propose
  relationship improvement actions.

Blocked actions:

- No autonomous message sending, promise-making, contract changes, archive
  deletion, or feedback fabrication.

First implementation slice:

- Add `GET /v1/relationships/context` over clients, stakeholders,
  interactions, notes, deals, tasks, graph confidence, and archived-client
  candidates.

## `06 People/Agents And Roles` - Workforce, AI Units, Capacity, Authority

Owner question: Who or which agent owns what, how much capacity exists, and
  when should work escalate?

Existing backend foundations:

- `User`, `WorkspaceMembership`, `CompanyRole`, `Agent`, `AgentLog`,
  `ApiKey`, `Approval`, `AgentEventOutbox`, MCP profiles, capabilities.

Current web readiness:

- Department shell identifies `06` as People/Agents And Role Management.
- `/react-agent-tools` and `/settings/api` expose agent/tool/key context.
- Dedicated People/Agents context packet is missing.

V1 web/mobile expectation:

- Desktop: human/agent roster, roles, responsibilities, capacity, permission
  scopes, escalation paths, hiring/agent creation queue, and agent health.
- Mobile: current capacity pressure, blocked responsibility, escalation, and
  agent needing owner attention.

Backend gaps:

- Capacity and responsibility assignment records.
- Role-to-capability and escalation map.
- Paperclip agent-roster reconciliation to CompanyCore agents.
- Hiring/agent creation planning state.

Paperclip role:

- Read roster and authority, propose role/capacity changes, plan future agent
  units, and flag missing owners.

Blocked actions:

- No autonomous permission grant, key rotation, role escalation, hiring
  decision, or agent activation.

First implementation slice:

- Create a People/Agents roster and authority audit packet from existing
  users, agents, roles, memberships, API keys, logs, approvals, and Paperclip
  source metadata.

## `07 Finance And Billing` - Pricing, Value, Invoice, And Payment Readiness

Owner question: What is the value of work, what can be invoiced, and what
  commercial exceptions need review?

Existing backend foundations:

- `GET /v1/finance/context`.
- `GET /v1/commercial-exceptions`.
- `Deal`, `Client`, `Task`, `Approval`, `Decision`, `Note`, `Risk`,
  `AgentEventOutbox`.

Current web readiness:

- Read-only Finance board exists locally over `/v1/finance/context`.

V1 web/mobile expectation:

- Desktop: pricing candidates, hourly value, work valuation, discounts,
  invoice readiness, payment source state, risk/conflict queue, and owner
  finance decisions.
- Mobile: invoice blocker, discount review, value assumption, and next owner
  finance action.

Backend gaps:

- Invoice and payment entities.
- Confirmed price-list/service catalog.
- Labor-rate table and work-effort valuation.
- Quote/discount/invoice/payment command contracts.

Paperclip role:

- Read finance context, estimate draft value with caveats, propose invoice
  readiness steps, and flag pricing conflicts.

Blocked actions:

- No invoice issue, payment marking, discount application, final quote, active
  price-policy change, or autonomous pricing.

First implementation slice:

- Add explicit price-policy and invoice-readiness read structures; keep writes
  blocked until security and owner-approval contracts exist.

## `08 Assets And Knowledge` - Files, Sources, Resources, And Knowledge

Owner question: What company knowledge and assets exist, where are they, and
  can agents safely use them?

Existing backend foundations:

- Production Google Drive index is verified for selected `00`-`12` roots.
- `GoogleDriveFile`, `GoogleDriveContentSnapshot`, `Resource`,
  `StorageLocation`, `KnowledgeRoot`, `KnowledgeItem`, `OperatingFolder`,
  `OperatingTable`, external mappings.

Current web readiness:

- `/settings/drive`, selected-area knowledge depth, and `/data` expose pieces.
- Dedicated Assets/Knowledge context packet and board are missing.

V1 web/mobile expectation:

- Desktop: asset inventory, Drive source tree, freshness, content snapshot
  quality, ownership by department, reusable templates, missing descriptions,
  and agent-readiness.
- Mobile: recent changed files, unreviewed sources, missing scope, and top
  asset action.

Backend gaps:

- Assets context packet.
- Source quality/trust classification.
- Template/library asset model.
- Stronger content snapshot coverage and freshness reporting per department.

Paperclip role:

- Find and summarize sources, propose categorization, flag stale or unsafe
  knowledge, and prepare drafts based on approved files.

Blocked actions:

- No Drive deletion, broad write, source trust promotion, or private-data
  exposure without explicit contracts.

First implementation slice:

- Add `GET /v1/assets/context` using Drive files, content snapshots, resources,
  storage locations, knowledge roots, operating tables, and freshness state.

## `09 Technology And AI` - Integrations, Agents, Automation, And Reliability

Owner question: Which systems, agents, tools, and automations are healthy and
  safe to use?

Existing backend foundations:

- `IntegrationSetting`, `ApiKey`, `Agent`, `AgentLog`, `ToolAdapter`,
  `IntegrationCapability`, `AutomationDefinition`, `AutomationRule`,
  `Trigger`, `ProviderEventInbox`, `AgentEventOutbox`, `Event`, `AuditLog`,
  MCP manifest, health endpoint.

Current web readiness:

- `/settings/api`, `/settings/integrations`, `/react-agent-tools`, and
  `/react-company-os` expose technology/AI pieces.
- Dedicated Technology/AI department packet is missing.

V1 web/mobile expectation:

- Desktop: integration health, API key blast radius, agent roster health,
  MCP tools, automation queue, failed events, incidents, and reliability
  checks.
- Mobile: failed integration, agent needing review, risky key, and next
  recovery action.

Backend gaps:

- Technology/AI health aggregate.
- Incident model.
- Agent runtime status aggregation across Paperclip.
- Department-specific autonomy policy readback.

Paperclip role:

- Inspect its own tools and health, propose fixes, report failures, and stop
  when capability or authority is missing.

Blocked actions:

- No secret exposure, permission escalation, destructive provider operation,
  key rotation, or unsupervised automation activation.

First implementation slice:

- Add `GET /v1/technology-ai/context` from integrations, keys, MCP manifest,
  agent logs, provider inbox, outbox events, automation definitions, and
  health.

## `10 Legal And Standards` - Policies, Controls, Contracts, And Compliance

Owner question: What rules govern the work, what requires approval, and what
  legal/standard risk is open?

Existing backend foundations:

- `Policy`, `Standard`, `Control`, `Risk`, `Approval`, `DecisionLog`,
  `AuditLog`, `Decision`, `Procedure`, `Process`.
- Standards editor and guarded Company OS definition patterns exist.

Current web readiness:

- Company OS and data surfaces expose policies/standards records.
- Dedicated Legal/Standards packet and board are missing.

V1 web/mobile expectation:

- Desktop: policy library, standards, controls, approval requirements,
  contract/legal review queue, audit evidence, and applicability by process.
- Mobile: high-risk legal item, pending approval, violated/missing standard,
  and next owner action.

Backend gaps:

- Contract/legal document records.
- Legal review queue.
- Standard-to-workflow applicability read model.
- Approval policy matrix for department actions.

Paperclip role:

- Surface relevant standards, flag missing approvals, summarize legal risk,
  and prepare owner-review drafts.

Blocked actions:

- No contract acceptance, legal advice as final authority, policy activation,
  or approval decision without owner/legal command contract.

First implementation slice:

- Add `GET /v1/legal-standards/context` over standards, policies, controls,
  risks, approvals, audit, decisions, and relevant Drive documents.

## `11 Innovation And Growth` - Experiments, Feedback, Learning, Improvement

Owner question: What have we learned, what should be improved, and which
  experiments should become real work?

Existing backend foundations:

- `KnowledgeItem`, `Note`, `Decision`, `Task`, `Metric`, `Risk`, Drive
  sources, intake signals, potential feedback signals.

Current web readiness:

- Improvement loop appears in shared department shell.
- Dedicated Innovation/Growth packet is missing.

V1 web/mobile expectation:

- Desktop: feedback inbox, experiment backlog, improvement candidates,
  learnings, retrospectives, growth hypotheses, and promoted actions.
- Mobile: newest feedback, top improvement, experiment needing decision, and
  learning summary.

Backend gaps:

- Experiment model.
- Structured feedback/survey model.
- Improvement-loop records linked to process/client/delivery.
- Learning promotion workflow into strategy, operations, product, sales, or
  relationships.

Paperclip role:

- Cluster feedback, propose experiments, extract learnings from archived
  clients/work, and draft improvement tasks.

Blocked actions:

- No autonomous product pivot, public campaign, process activation, or
  feedback fabrication.

First implementation slice:

- Run an improvement/experiment source audit first, then add a read-only
  innovation context packet only over existing trustworthy sources.

## `12 Executive Management` - CEO Cockpit And Cross-System Governance

Owner question: Is the company healthy, what needs my decision, and which
  department needs attention first?

Existing backend foundations:

- All existing packets and shared records: intake, strategy, operations,
  finance, risks, approvals, metrics, tasks, events, audits, Drive, MCP,
  relationship graph.

Current web readiness:

- Dashboard and `/react-company-os` show broad company context.
- Dedicated Executive aggregate packet is missing.

V1 web/mobile expectation:

- Desktop: company health, department status grid, decision queue, risk map,
  finance/commercial signals, AI activity, capacity, top blockers, and next
  executive actions.
- Mobile: CEO attention list, top blocker, money/risk alert, and one next
  decision.

Backend gaps:

- Executive health aggregate.
- Department packet readiness scoreboard.
- Cross-system owner decision queue.
- Portfolio scoring and operating cadence.

Paperclip role:

- Prepare briefings, summarize department packet health, propose agenda items,
  and route decisions to the owner.

Blocked actions:

- No autonomous executive decision, budget allocation, hiring, legal, finance,
  or strategy mutation.

First implementation slice:

- Add executive health aggregate after at least Sales, Relationships,
  Product/Delivery, Assets, Technology/AI, and Legal have read packets.

## Cross-System Backend Gap Register

| Gap ID | Gap | First owning system | Reused foundations | Notes |
| --- | --- | --- | --- | --- |
| DMS-GAP-001 | Sales context packet | `03 Sales` | clients, deals, stages, interactions, tasks, notes, commercial exceptions | Highest next value because current client and discounts need visibility. |
| DMS-GAP-002 | Product/delivery context packet | `02 Product And Delivery` | projects, tasks, artifacts, checklists, acceptance criteria | Needed before service delivery can feel managed, not just task-listed. |
| DMS-GAP-003 | Relationship context packet | `05 Relationships` | clients, stakeholders, graph, interactions, notes | Should include archived-client learning candidates. |
| DMS-GAP-004 | People/Agents authority packet | `06 People/Agents And Roles` | users, agents, keys, roles, approvals, logs | Needed for Paperclip roster reconciliation and capacity planning. |
| DMS-GAP-005 | Assets/knowledge context packet | `08 Assets And Knowledge` | Drive index, snapshots, resources, storage, knowledge roots | Needed so files become governed assets. |
| DMS-GAP-006 | Technology/AI context packet | `09 Technology And AI` | integrations, keys, manifest, agents, provider inbox, events | Needed for agent/tool reliability management. |
| DMS-GAP-007 | Legal/standards context packet | `10 Legal And Standards` | standards, policies, controls, risks, approvals, audits | Needed before higher-risk command expansion. |
| DMS-GAP-008 | Innovation/feedback/experiment model | `11 Innovation And Growth` | notes, decisions, tasks, metrics, knowledge | Requires audit before schema; do not fake surveys. |
| DMS-GAP-009 | Executive department health aggregate | `12 Executive Management` | all department packets | Should wait until more packets exist. |
| DMS-GAP-010 | Price-list/labor/invoice entities | `07 Finance And Billing` | finance context, deals, approvals, decisions | Money writes remain blocked. |
| DMS-GAP-011 | Capacity/responsibility/escalation records | `06 People/Agents And Roles` | roles, agents, users, approvals | Should support humans and AI agents together. |
| DMS-GAP-012 | Feedback and improvement loop records | `11 Innovation And Growth` plus `00 Main` | intake, tasks, notes, decisions | Should attach to many processes, not one isolated module. |

## Recommended V1 Build Order

Owner-approved active loop:

1. `00 Main` intake, routing, owner review, and Paperclip output review.
2. `04 Operations` task/procedure/execution control and safe proposal
   commands.
3. `08 Assets And Knowledge` source, file, resource, and AI-readiness
   management.

Broader department order after the active loop:

1. `03 Sales` read packet and Sales board.
2. `05 Relationships` read packet and relationship management board.
3. `02 Product And Delivery` read packet and delivery board.
4. `09 Technology And AI` read packet and technology/agent health board.
5. `10 Legal And Standards` read packet and standards/legal board.
6. `06 People/Agents And Roles` roster and authority packet.
7. `11 Innovation And Growth` source audit, then context packet.
8. `12 Executive Management` aggregate packet after enough department packets
   exist.
9. Finance write planning, invoice/payment schema, and money commands only
   after pricing policy and owner approval rules are resolved.

`00 Main`, `01 Strategy`, `04 Operations`, and `07 Finance` already have enough
foundation to deepen web boards, owner queues, or proposal-only commands while
the missing department packets are built.

## Paperclip Operating Boundary

For V1, Paperclip should be able to:

- read all approved department packets through scoped API/MCP tools;
- propose routing, tasks, analyses, follow-ups, and improvement actions;
- identify missing source data and owner decisions;
- prepare drafts using indexed Drive and CompanyCore evidence;
- write only through proposal or explicitly approved command contracts.

For V1, Paperclip must not:

- apply discounts, send invoices, mark payments, or commit final prices;
- approve legal, finance, strategy, hiring, permissions, or provider actions;
- mutate provider state outside explicit integration contracts;
- trust unreviewed files as authoritative without source-quality signals;
- invent clients, feedback, experiments, invoices, or relationships to make a
  board look full.

## Completion Definition For A Department System

A department system is V1-complete only when it has:

- a source-backed read packet or documented reason it can reuse an existing
  packet;
- a differentiated desktop board;
- a mobile attention queue;
- loading, empty, error, ready, and blocked states;
- source/evidence links;
- Paperclip read/proposal boundaries;
- blocked action list;
- API tests for protected packet behavior when a backend route exists;
- responsive browser proof when the web board exists;
- state ledger and task board updates.
