# V1 Department Systems Global Implementation Plan

Last updated: 2026-05-16

## Purpose

This plan turns the accepted department-management-system architecture into an
execution queue for CompanyCore V1 web, backend, and Paperclip integration.

Architecture inputs:

- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/planning/dms-13-systems-v1-implementation-audit.md`
- `docs/architecture/department-management-systems-architecture.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/ux/v1-department-management-systems-view-map.md`

The goal is a coherent minimal V1 where:

- `00 Main` receives and routes unclassified work;
- each of the 12 departments has a management system shell;
- Paperclip can inspect context, propose work, and report evidence through
  CompanyCore boundaries;
- the owner can react to Paperclip background output;
- pricing, discounts, current client work, archived clients, and feedback
  learning are visible before high-risk automation;
- backend read models are stable before write actions expand.
- the 12 operating departments share CompanyCore shell, evidence, and safety
  primitives but each has a differentiated management board and mobile review
  experience for its own work model.

As of 2026-05-16, the active owner-approved checkpoint is the
`00 Main -> 04 Operations -> 08 Assets` operating loop. Use
`docs/planning/companycore-00-04-08-operating-loop-plan.md` for the immediate
queue before resuming the broader department sequence.

## V1 Success Definition

CompanyCore V1 department systems are minimally working when:

1. The owner can open `00 Main` and see unclassified owner/client/provider/AI
   inputs that need routing or approval.
2. The owner can open each department and understand purpose, current health,
   connected records/files/tasks/workflows, agent readiness, and next action.
3. Paperclip can read a department packet for `00`-`12` through HTTP/MCP
   boundaries without direct database or provider-token access.
4. Paperclip-created or proposed background work appears in a review queue
   before it affects the company.
5. Sales/Finance can represent price-list context, hourly-value assumptions,
   discounts including 100 percent discounts, invoice readiness, and current
   client work as evidence-backed data.
6. Old clients can be imported or classified as archive evidence for learning.
7. Feedback and retros can create improvement tasks or standards/process
   updates.
8. High-risk writes remain approval-aware, audited, and fail-closed.

## Execution Rules

- Build read models before write models.
- Keep each task small enough to commit and revert.
- Update task board, requirement matrix, delivery map, module confidence, and
  relevant architecture/UX docs when a task changes product truth.
- Use existing CompanyCore tables, tasks, pipelines, Drive files, knowledge,
  resources, decisions, approvals, risks, controls, agents, MCP, and audit
  first.
- Do not add fake data to make a department look complete.
- Do not let Paperclip bypass CompanyCore APIs/MCP tools.
- Do not add invoice/payment, legal, paid-ad, or autonomous pricing writes
  until contracts and guardrails exist.

## Wave 0 - Program Planning And Alignment

Goal: make the V1 department-system buildout executable and recoverable from
repo state.

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-V1-000 | Publish global V1 department-systems implementation plan | planning | Product Docs | DMS-BLUEPRINT-001 | This plan, task board updates, next queue updates | `git diff --check` |
| DMS-V1-001 | Create department implementation task-template pack | planning | Product Docs | DMS-V1-000 | Reusable spec/task prompts for each department implementation | source review |
| DMS-V1-002 | Normalize department naming and route metadata | UX/backend planning | Frontend + Product Docs | DMS-V1-000 | Route registry and docs agree on 00-12 labels, including 06 People/Agents | build/web route metadata review |
| DMS-V1-003 | Define V1 department packet JSON contract | backend planning | Backend + AI Integration | DMS-V1-000 | Proposed shape for web and Paperclip packets | API design review |
| DMS-V1-004 | Define V1 department health status vocabulary | product/backend planning | Product Docs + Backend | DMS-V1-000 | `ready`, `blocked`, `needs_data`, `needs_owner_decision`, `agent_ready`, `unsafe_for_automation` | source review |
| DMS-V1-005 | Differentiate 12 department management systems | planning/product/UX | Product Docs | DMS-BLUEPRINT-001 | Shared shell plus department-specific board, desktop UX, mobile UX, and implementation assumptions for each operating department | source review + `git diff --check` |
| DMS-V1-006 | Audit all 13 department systems for V1 implementation | planning/backend/UX/AI | Product Docs + Backend + Frontend | DMS-V1-005 | Source-backed audit mapping each system to current backend reuse, current web readiness, V1 board/mobile needs, backend gaps, Paperclip boundaries, and first implementation slice | source review + `git diff --check` |

### Differentiated Department Implementation Rule

After DMS-V1-005, each department implementation task must include:

- the department's primary operating board type;
- desktop first-viewport zones;
- mobile first-screen command card and attention queue;
- department-specific empty, degraded, blocked, and success states;
- source records and backend read packet used by the board;
- Paperclip allowed actions, proposed actions, and blocked actions;
- the first safe command contract, or an explicit statement that the slice is
  read-only.

The shared Department Management Shell remains the frame. It must not flatten
all departments into one generic area detail screen.

### Active 13-System Audit

`docs/planning/dms-13-systems-v1-implementation-audit.md` is the current
handoff for selecting department implementation work. It confirms that `00
Main`, `01 Strategy`, `04 Operations`, and `07 Finance` already have important
read-only foundations, while `03 Sales`, `05 Relationships`, `02 Product And
Delivery`, `08 Assets`, `09 Technology/AI`, `10 Legal/Standards`, `06
People/Agents`, `11 Innovation/Growth`, and `12 Executive` still need
department-specific packets or source audits before their boards can be called
V1-complete. Future tasks must cite the relevant audit section and must not
fake missing backend structures in the UI.

## Wave 1 - 00 Main Intake And Paperclip Review

Goal: make `00 Main` the company intake, router, owner decision queue, and
Paperclip-output review surface.

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-00-001 | Design global intake and Paperclip output review contract | planning | Product Docs + Backend | DMS-V1-003 | Requirements for unclassified items, review states, routing, and evidence | source review |
| DMS-00-002 | Audit current sources for intake candidates | research | Backend + Product Docs | DMS-00-001 | Map existing tasks, agent events, provider inboxes, Drive files, notes, risks, and decisions into intake candidates | source/code review |
| DMS-00-003 | Implement read-only global intake aggregate | backend | Backend | DMS-00-002 | Protected read model for unclassified items and Paperclip-created/proposed items | API tests |
| DMS-00-004 | Build `00 Main` intake/review web panel | frontend | Frontend | DMS-00-003 | Selected-area management panel for global intake, classification context, owner decision, Paperclip review, and MCP intake visibility | Playwright desktop/mobile |
| DMS-00-005 | Add owner classification/routing proposal states | backend planning | Backend + Security | DMS-00-004 | Completed command contract for proposal-only route/classification actions; source mutation and high-risk actions remain blocked | `git diff --check` |
| DMS-00-006 | Implement first safe route/classification command | backend/frontend | Backend + Frontend | DMS-00-005 | Completed proposal-only `POST /v1/intake/actions/propose-route`, `intake:write`, web action, audit/event/decision evidence, optional task draft | API tests + browser proof |
| DMS-00-007 | Paperclip background output review proof | AI/QA | QA + AI Integration | DMS-00-004, DMS-00-006 | Controlled Paperclip-like item appears in `00 Main`, gets reviewed/routed | end-to-end smoke |

## Wave 2 - Shared Department Shell And Packet Foundation

Goal: make all departments consistently visible as management systems before
deep per-department behavior.

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-SHELL-001 | Extract shared Department Management Shell component | frontend | Frontend | DMS-V1-002 | Reusable identity bar, command brief, tabs, board, evidence rail, improvement loop | build + route proof |
| DMS-SHELL-002 | Add department-specific copy and subsystem registry | frontend/product | Frontend + Product Docs | DMS-SHELL-001 | Completed static config and rendered registry for 00-12 purpose, subsystems, blocked actions, and agent handoff copy | build + browser proof |
| DMS-SHELL-003 | Wire shared shell to operating graph fallback | frontend/backend | Frontend | DMS-SHELL-001 | Each department shell consumes AOG/connection data consistently | Playwright all departments |
| DMS-SHELL-004 | Add honest empty/degraded/error states | frontend | Frontend + QA | DMS-SHELL-003 | Department views explain missing data without fake records | responsive proof |
| DMS-SHELL-005 | Implement department packet read model v1 | backend | Backend | DMS-V1-003, DMS-SHELL-003 | `GET /v1/department-systems/:areaKey` or AOG extension | API tests |
| DMS-SHELL-006 | Expose department packet MCP read tool | backend/AI | Backend + AI Integration | DMS-SHELL-005 | Paperclip-readable packet for one area | API/MCP tests |
| DMS-SHELL-007 | Web consumes department packet with fallback | frontend | Frontend | DMS-SHELL-005 | Selected-area route uses packet when available | Playwright proof |
| DMS-SHELL-008 | All-department shell proof | QA | QA/Test | DMS-SHELL-007 | Desktop/mobile route proof for `00`-`12` | screenshot + no overflow |

## Wave 3 - Current 04 Operations Deepening

Goal: finish the first department system enough to establish the repeatable
pattern.

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-04-001 | Run database-backed or production proof for current Operations board | verification | QA/Test + Ops | DMS-OPS-001 | Real owner/database proof for `/areas?area=04-operacje&view=overview` | Playwright + API smoke |
| DMS-04-002 | Add Operations subsystem tabs | frontend | Frontend | DMS-SHELL-001 | SOPs, routines, dependencies, approvals, controls, improvements | Playwright proof |
| DMS-04-003 | Operations procedures read model | backend | Backend | DMS-SHELL-005 | Procedures/steps/dependencies/approvals aggregate | API tests |
| DMS-04-004 | Operations improvement queue | frontend/backend | Frontend + Backend | DMS-04-003 | Read-only improvement/gap list tied to tasks/decisions | API + UI proof |
| DMS-04-005 | First safe Operations write action design | planning | Product Docs + Backend | DMS-04-004 | Choose request approval, create task, or workflow draft action | decision record |
| DMS-04-006 | Implement first safe Operations action | backend/frontend | Backend + Frontend | DMS-04-005 | Audited command using existing contracts | API tests + browser proof |

## Wave 4 - Strategy, Sales, Relationships, Product/Delivery

Goal: implement the first business-core department systems that create demand,
convert work, deliver value, and maintain client context.

### 01 Strategy

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-01-001 | Strategy system spec | planning | Product Docs | DMS-SHELL-008 | Goals, targets, roadmap, decisions, risks, KPIs, agent packet | source review |
| DMS-01-002 | Strategy read-only web board | frontend | Frontend | DMS-01-001 | Goals/targets/decisions/risks/KPI board | Playwright proof |
| DMS-01-003 | Target metric relation design | backend planning | Backend | AOG-BE-002 | Metric relation plan | source review |
| DMS-01-004 | Goal-to-workflow bridge design | backend planning | Backend | AOG-BE-003 | Bridge contract | source review |
| DMS-01-005 | Strategy Paperclip planning packet | backend/AI | Backend + AI Integration | DMS-SHELL-006 | Strategy packet exposed to agents | MCP smoke |

### 03 Sales

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-03-001 | Sales system spec | planning | Product Docs | DMS-SHELL-008 | Leads, discovery, offers, pricing, discounts, pipeline, current client | source review |
| DMS-03-002 | Audit CRM/deal/interaction/pricing sources | research | Backend + Product Docs | DMS-03-001 | Current data map from CompanyCore, Drive, ClickUp | source review |
| DMS-03-003 | Sales read-only web board | frontend | Frontend | DMS-03-002 | Pipeline, discovery, offers, follow-up, discount context | Playwright proof |
| DMS-03-004 | Lead/discovery/offer relation design | backend planning | Backend | DMS-03-002 | Relation/read-model contract | source review |
| DMS-03-005 | Discount/commercial exception read model | planning | Product Docs + Backend | DMS-MONEY-001, DMS-07-001 | Completed protected read-only commercial exception packet spec with `100%` discount support and blocked high-risk writes | source review + `git diff --check` |
| DMS-03-005A | Commercial exception read API | backend | Backend + Security | DMS-03-005 | Protected read-only `GET /v1/commercial-exceptions` with `100%` discount packet support and no source mutation | API tests |
| DMS-03-006 | Current client work capture flow | frontend/backend | Frontend + Backend | DMS-03-003 | Add or classify current client work with discount context | browser/API proof |

### 05 Relationships

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-05-001 | Relationships system spec | planning | Product Docs | DMS-SHELL-008 | Active clients, archived clients, interactions, support, success, referrals | source review |
| DMS-05-002 | Archive client data source audit | research | Product Docs + Backend | DMS-05-001 | Drive/ClickUp/CompanyCore old-client source map | source review |
| DMS-05-003 | Relationships read-only web board | frontend | Frontend | DMS-05-002 | Active/archived clients, follow-ups, support, stakeholder map | Playwright proof |
| DMS-05-004 | Archived-client import/classification design | backend planning | Backend | DMS-05-002 | Archive client record/read model plan | source review |
| DMS-05-005 | Relationship health aggregate | backend | Backend | DMS-05-003 | Client/stakeholder/follow-up/readiness summary | API tests |
| DMS-05-006 | Client feedback capture design | planning | Product Docs + Backend | DMS-05-005 | Feedback/survey relation plan | source review |

### 02 Product And Delivery

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-02-001 | Product/delivery system spec | planning | Product Docs | DMS-SHELL-008 | Catalog, backlog, plans, releases, artifacts, acceptance | source review |
| DMS-02-002 | Delivery artifact and acceptance source audit | research | Backend + Product Docs | DMS-02-001 | Existing tasks, Drive files, acceptance criteria, procedures map | source review |
| DMS-02-003 | Product/delivery read-only web board | frontend | Frontend | DMS-02-002 | Promise/backlog/delivery/acceptance board | Playwright proof |
| DMS-02-004 | Artifact-to-task/acceptance relation design | backend planning | Backend | DMS-02-002 | Read model or relation plan | source review |
| DMS-02-005 | Delivery acceptance evidence panel | frontend/backend | Frontend + Backend | DMS-02-004 | Acceptance and proof view | API + UI proof |

## Wave 5 - Data, Evidence, Resources, Technology, Governance

Goal: make the information substrate reliable for humans and agents.

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| V1DATA-001 | Evidence browser V1 workbench | frontend | Frontend + QA | DMS-SHELL-001 | `/data` and `/data/:table` as department-aware evidence browser | Playwright proof |
| DMS-08-001 | Assets/resources system spec | planning | Product Docs | V1DATA-001 | Files, folders, resources, prompts, repos, tools, freshness | source review |
| DMS-08-002 | Assets/resources read-only web board | frontend | Frontend | DMS-08-001 | Drive/resources/storage/knowledge/tool inventory | Playwright proof |
| DMS-08-003 | Resource freshness/readiness aggregate | backend | Backend | DMS-08-002 | Stale/unmapped/untrusted source summary | API tests |
| DMS-09-001 | Technology/AI infrastructure system spec | planning | Product Docs | DMS-SHELL-008 | Agents, MCP, keys, integration health, deployment health, audit | source review |
| DMS-09-002 | Integration and MCP health aggregate | backend | Backend | DMS-09-001 | Settings/provider/MCP/agent health read model | API tests |
| DMS-09-003 | Technology/AI read-only web board | frontend | Frontend | DMS-09-002 | Agent authority, integration health, runtime/deploy status | Playwright proof |
| DMS-10-001 | Legal/standards system spec | planning | Product Docs | DMS-SHELL-008 | Policies, standards, risks, controls, decisions, approvals | source review |
| DMS-10-002 | Legal/standards read-only web board | frontend | Frontend | DMS-10-001 | Rules, risks, controls, approval boundaries | Playwright proof |
| DMS-10-003 | Standards-to-workflow guardrail read model | backend planning | Backend + Security | DMS-10-002 | What rules apply to which workflow/action | source review |

## Wave 6 - People/Agents, Executive, Pricing, Feedback

Goal: give the company a staffing model, owner steering layer, money context,
and learning loop.

### 06 People/Agents And Roles

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-06-001 | People/agents system spec | planning | Product Docs + AI Integration | DMS-SHELL-008 | People, agents, roles, capacity, authority, escalation, hiring/agent creation | source review |
| DMS-06-002 | Audit CompanyCore users/roles/agents/capabilities/service keys | research | Backend + Security | DMS-06-001 | Current authority and roster map | source review |
| DMS-06-003 | Audit Paperclip agent structure | research | AI Integration | DMS-06-001 | Paperclip roster fields and mapping proposal | source review |
| DMS-06-004 | People/agents read-only web board | frontend | Frontend | DMS-06-002, DMS-06-003 | Human/agent roster, roles, capacity, permissions, escalation | Playwright proof |
| DMS-06-005 | Paperclip roster reconciliation contract | backend planning | Backend + AI Integration | DMS-06-003 | Read/import/reconcile plan | source review |
| DMS-06-006 | Agent staffing plan view | frontend/backend | Frontend + Backend | DMS-06-004 | Missing agent/human capacity and proposed staffing tasks | UI/API proof |

### 12 Executive Management

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-12-001 | Executive system spec | planning | Product Docs | DMS-SHELL-008 | Approvals, escalation, portfolio, department health, agent autonomy | source review |
| DMS-12-002 | Department health aggregate | backend | Backend | DMS-SHELL-005 | Cross-department status, blockers, stale data, approvals | API tests |
| DMS-12-003 | Executive read-only web board | frontend | Frontend | DMS-12-002 | Owner command, approvals, portfolio, escalation | Playwright proof |
| DMS-12-004 | Owner approval queue deepening | backend/frontend | Backend + Frontend | DMS-12-003 | Better approval review/action context | API + UI proof |

### 07 Finance And Billing

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-MONEY-001 | Pricing/hourly-value/discount source inventory | research | Product Docs + Backend | DMS-03-002 | Drive/ClickUp pricing, service definitions, hourly assumptions, discounts | source review |
| DMS-07-001 | Finance system spec | planning | Product Docs + Security | DMS-MONEY-001 | Completed Finance system spec for price list, hourly value, work valuation, discounts, invoice readiness, Paperclip packet, owner decisions, and blocked high-risk writes | source review + `git diff --check` |
| DMS-07-002 | Price-list and hourly-value read model | backend | Backend | DMS-07-001 | Read-only pricing context | API tests |
| DMS-07-003 | Finance read-only web board | frontend | Frontend | DMS-07-002 | Pricing, invoice readiness, discounts, payment context | Playwright proof |
| DMS-07-004 | Invoice/payment command contract | backend/security planning | Backend + Security | DMS-07-003 | Approval-aware future command design | security/design review |

### 11 Innovation And Growth

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-11-001 | Innovation/growth system spec | planning | Product Docs | DMS-05-006 | Experiments, growth ideas, content, feedback, improvement, archive learning | source review |
| DMS-11-002 | Feedback-to-improvement read model | backend | Backend | DMS-05-006 | Feedback/retro/improvement task aggregate | API tests |
| DMS-11-003 | Innovation/growth read-only web board | frontend | Frontend | DMS-11-002 | Experiments, content ideas, feedback, improvements | Playwright proof |
| DMS-11-004 | Improvement-to-task/standard command design | planning | Backend + Product Docs | DMS-11-003 | Future guarded command plan | source review |

## Wave 7 - Paperclip V1 Integration

Goal: make Paperclip useful inside the company loop while keeping CompanyCore
as the authority boundary.

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| PC-DMS-001 | Paperclip department packet consumption spec | AI planning | AI Integration + Product Docs | DMS-SHELL-006 | How Paperclip reads packets, intake, department health, and task context | source review |
| PC-DMS-002 | Paperclip missing-work analysis contract | AI/backend planning | AI Integration + Backend | PC-DMS-001 | How Paperclip proposes gaps/tasks without direct writes | source review |
| PC-DMS-003 | Paperclip task proposal/create command | backend/AI | Backend + AI Integration | PC-DMS-002 | Scoped task proposal/create through CompanyCore API/MCP | API/MCP tests |
| PC-DMS-004 | Paperclip evidence report command | backend/AI | Backend + AI Integration | PC-DMS-003 | Agent can report evidence/status back to CompanyCore | API/MCP tests |
| PC-DMS-005 | Paperclip output review UI integration | frontend | Frontend | DMS-00-004, PC-DMS-003 | Owner sees Paperclip proposals and evidence in `00 Main` | Playwright proof |
| PC-DMS-006 | Paperclip supervised end-to-end smoke | QA/AI | QA + AI Integration | PC-DMS-005 | Business context -> proposal -> owner review -> task/evidence loop | repeatable smoke |

## Wave 8 - Verification, Production, And Closeout

Goal: prove the V1 minimal operating company loop locally and in production.

| ID | Task | Type | Owner | Depends on | Output | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| DMS-QA-001 | All-department local browser proof | QA | QA/Test | DMS-SHELL-008 | `00`-`12` routes render no overflow/error | Playwright screenshots |
| DMS-QA-002 | Backend API gate for department packets | QA/backend | Backend + QA | DMS-SHELL-005 | Department packet API tests and workspace isolation | `npm run test:api` |
| DMS-QA-003 | MCP manifest and Paperclip packet proof | QA/AI | AI Integration + QA | PC-DMS-001 | MCP exposes read-safe packet tools | MCP smoke |
| DMS-QA-004 | Company control loop local proof | QA | QA/Test | DMS-00-006, PC-DMS-005 | Intake -> route -> task/proposal -> evidence -> improvement | e2e smoke |
| DMS-QA-005 | Pricing/discount/current-client proof | QA | QA/Test | DMS-03-006, DMS-07-003 | Current client with 100 percent discount represented correctly | API + UI proof |
| DMS-QA-006 | Archived-client learning proof | QA | QA/Test | DMS-05-004, DMS-11-002 | Old client archive contributes to improvement context | API + UI proof |
| DMS-PROD-001 | Deploy V1 department systems | release | Ops/Release | DMS-QA-001..006 | Production running pushed commit | health + deploy evidence |
| DMS-PROD-002 | Authenticated production department smoke | release/QA | Ops + QA | DMS-PROD-001 | `/dashboard`, `00`, `04`, `01`, `03`, `05`, `07`, `09`, `12` smoke | Playwright production proof |
| DMS-CLOSE-001 | Update V1 operator handoff | docs/release | Product Docs + Ops | DMS-PROD-002 | Handoff docs and next V2 lane | source review |

## First Executable NOW Queue

The current active tasks are maintained in
`docs/planning/companycore-00-04-08-operating-loop-plan.md`:

1. `CC-UI-001` - shared component inventory.
2. `CC-00-001` - route proposal lifecycle readback plan.
3. `CC-04-001` - Operations task model gap audit.
4. `CC-08-001` - Assets/resource system spec.

The original bootstrap tasks from this global plan are now historical or
completed unless reactivated by a new task contract.

## Dependency Summary

```text
DMS-V1-000
  -> DMS-00-001 -> DMS-00-002 -> DMS-00-003 -> DMS-00-004
  -> DMS-SHELL-001 -> DMS-SHELL-005 -> DMS-SHELL-006
  -> DMS-04-001..006
  -> DMS-01 / DMS-03 / DMS-05 / DMS-02
  -> DMS-08 / DMS-09 / DMS-10
  -> DMS-06 / DMS-12 / DMS-07 / DMS-11
  -> PC-DMS-001..006
  -> DMS-QA / DMS-PROD / DMS-CLOSE
```

## Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| 12 systems become 12 disconnected apps | High | Shared shell, shared packet, shared backend modules. |
| Paperclip output becomes invisible background work | High | `00 Main` intake/review queue before broader automation. |
| Pricing automation happens before price sources are reliable | High | Read-only pricing/hourly/discount context before writes. |
| Old clients stay outside learning loop | Medium | Archived-client import/classification before improvement automation. |
| Department health becomes vanity status | Medium | Health must connect to blockers, tasks, evidence, approvals, and risks. |
| Finance/legal/ads writes become unsafe | High | Explicit security/governance contracts before commands. |
| Backend schema expands too early | Medium | Read models and audits before migrations. |
