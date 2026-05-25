# V1 Department System Prompt Pack

Last updated: 2026-05-16

## Purpose

Use these prompts to generate consistent specs, visual concepts, UI slices, and
agent-facing implementation plans for CompanyCore V1 department management
systems.

This pack is intentionally reusable. Each prompt should be filled with one
department system from:

- `docs/architecture/department-management-systems-architecture.md`
- `docs/ux/v1-department-management-systems-view-map.md`

## Shared Context Block

Use this context at the top of every prompt:

```text
CompanyCore is an AI-first company operating system for LuckySparrow.
The app uses a Company Atlas with 13 areas: 00 Main plus 12 departments.
Each department is a Department Management System, not just a tab or filtered table.
Each system reuses shared CompanyCore modules: goals, tasks, processes, pipelines, tables, records, knowledge, resources, metrics, risks, decisions, approvals, events, audit logs, and AI/MCP tools.
The department view must fit the V1 selected-area route:
/areas?area=:areaKey&view=:viewId
The UI must be useful for a human owner and also produce clear context for Paperclip and other supervised AI agents.
Do not invent fake data, raw provider shortcuts, broad CRUD, or separate subsystem databases.
Use existing backend contracts first and mark missing contracts explicitly.
```

## Master UX Spec Prompt

```text
Create a V1 UX specification for the [DEPARTMENT_SYSTEM_NAME].

Department:
- Area key: [AREA_KEY]
- User-facing label: [LABEL]
- Primary value-flow contribution: [VALUE_FLOW_LAYER]
- Core subsystems: [SUBSYSTEM_LIST]

Use the CompanyCore department management system architecture.
The output must include:
1. The department purpose in one sentence.
2. The owner question answered in the first 3 seconds.
3. The standard layout zones:
   - Department identity bar
   - Management command brief
   - Subsystem navigation
   - Primary management board
   - Evidence and graph rail
   - Improvement loop
4. A component inventory for each zone.
5. Empty, loading, error, blocked, success, and degraded states.
6. Desktop, tablet, and mobile behavior.
7. Data sources from existing CompanyCore modules.
8. Actions allowed now from existing backend contracts.
9. Actions that must wait for future backend contracts.
10. Paperclip/AI agent packet: what the agent may read, propose, execute, and what needs owner approval.
11. Risks and anti-patterns.
12. Acceptance criteria for a V1 implementation.

Keep the spec concrete, implementation-facing, and consistent with CompanyCore V1.
```

## Visual Concept Prompt

```text
Create a high-fidelity product UI concept for the CompanyCore [DEPARTMENT_SYSTEM_NAME].

Route:
/areas?area=[AREA_KEY]&view=overview

Style:
Quiet professional SaaS operating-system UI, dense but readable, no marketing hero, no decorative blobs, no fake charts.
Use a restrained department identity accent color, but keep the app visually consistent with the Company Atlas.

Layout:
- Left/primary area: department command brief and management board.
- Top: department identity bar with health, owner focus, and AI readiness.
- Middle: subsystem tabs for overview, goals, workflows, tasks, records, knowledge, resources, metrics, risks, decisions, AI, improvements.
- Right rail: evidence graph with linked records, files, tasks, decisions, events, and audit.
- Bottom area: improvement loop with feedback, standards, and next gaps.

Content:
Use realistic labels for [DEPARTMENT_SYSTEM_NAME] only.
Do not use fake company names, fake huge metrics, stock photos, or decorative illustrations.
Text must be legible and not overlap.
Show empty or partial states honestly where data may be missing.

Generate desktop and mobile concepts separately if needed.
```

## Implementation Planning Prompt

```text
Plan the smallest safe V1 implementation slice for [DEPARTMENT_SYSTEM_NAME].

Use the current CompanyCore architecture and existing backend contracts.
Do not add schema, migrations, new providers, or raw CRUD unless the plan explicitly marks them as future work.

Output:
1. Current route and target route.
2. Existing data contracts to reuse.
3. Components to build or reuse.
4. Read-only scope for the first slice.
5. Safe write actions, only if existing endpoints support them.
6. Missing backend contracts.
7. MCP/Paperclip read packet for this department.
8. Validation plan:
   - build
   - API test or source proof
   - desktop render proof
   - mobile render proof
   - no horizontal overflow
   - no console errors
   - no unnamed visible controls
9. Documentation updates required.
10. Rollback or disable path.
```

## Agent Capability Prompt

```text
Define the Paperclip/AI agent operating packet for [DEPARTMENT_SYSTEM_NAME].

The packet must include:
- Department purpose.
- Current goals and constraints.
- Relevant tasks and blockers.
- Relevant tables/records.
- Relevant files and knowledge.
- Relevant processes/pipelines/stages.
- Metrics and risks.
- Decisions and standards.
- Allowed MCP tools.
- Disallowed actions.
- Approval-required actions.
- Evidence the agent must create when acting.
- Feedback loop after completion.

Classify every action as:
- read-only
- propose-only
- supervised write
- blocked until future contract

Do not allow direct database access, raw provider tokens, unapproved workflow activation, destructive writes, or acceptance without evidence.
```

## Department-Specific Prompt Seeds

### 00 Main - Company Orchestration System

```text
Department system: Company Orchestration System
Area key: 00-ogolny
Label: 00 Ogolny
Value-flow layer: whole-company coordination
Subsystems: owner inbox, global flow, company graph, cross-department priorities, system health, escalation
First owner question: What needs my attention across the whole company right now?
```

### 01 Strategy - Strategy Management System

```text
Department system: Strategy Management System
Area key: 01-strategia
Label: 01 Strategia
Value-flow layer: direction
Subsystems: goals, targets, roadmap, strategic decisions, risks, KPIs, portfolio choices
First owner question: Which goals, decisions, and risks steer the company now?
```

### 02 Product - Product And Delivery Management System

```text
Department system: Product And Delivery Management System
Area key: 02-produkt
Label: 02 Produkt
Value-flow layer: product/service promise
Subsystems: product catalog, service catalog, backlog, delivery plans, releases, acceptance criteria, customer value
First owner question: What value are we promising, building, delivering, and validating?
```

### 03 Sales - Sales Management System

```text
Department system: Sales Management System
Area key: 03-sprzedaz
Label: 03 Sprzedaz
Value-flow layer: commercial conversion
Subsystems: leads, lead sources, qualification, discovery, opportunities, offers, pricing, sales pipeline, follow-up tasks
First owner question: Which opportunity needs qualification, discovery, offer, or follow-up now?
```

### 04 Operations - Operations Management System

```text
Department system: Operations Management System
Area key: 04-operacje
Label: 04 Operacje
Value-flow layer: company administration and delivery control
Subsystems: planning, procedures, procedure steps, recurring operations, controls, admin routines, dependencies, approvals, operating cadence
First owner question: Which plan, routine, control, or dependency keeps the company running today?
```

### 05 Relationships - Relationship Management System

```text
Department system: Relationship Management System
Area key: 05-relacje
Label: 05 Relacje
Value-flow layer: client and partner care
Subsystems: clients, stakeholders, interactions, support requests, success check-ins, renewals, referrals, testimonials
First owner question: Which relationship needs care, support, renewal, or expansion?
```

### 06 People/Agents - People/Agents And Role Management System

```text
Department system: People/Agents And Role Management System
Area key: 06-kadry
Label: 06 Kadry
Value-flow layer: human and agent organization
Subsystems: roles, responsibilities, capacity, permissions, escalation, PAEI profiles, training needs
First owner question: Who owns the work, who can decide, and where should escalation go?
```

### 07 Finance - Finance And Billing Management System

```text
Department system: Finance And Billing Management System
Area key: 07-finanse
Label: 07 Finanse
Value-flow layer: revenue capture
Subsystems: invoice readiness, invoices, payment status, receivables, margin signals, pricing decisions, finance risks
First owner question: Which delivered value still needs invoice, payment, or financial closure?
```

### 08 Assets - Assets And Resource Management System

```text
Department system: Assets And Resource Management System
Area key: 08-zasoby
Label: 08 Zasoby
Value-flow layer: addressable assets and tools
Subsystems: files, folders, resources, repositories, prompts, tools, storage locations, provider-owned assets
First owner question: Which resources are available, assigned, stale, or risky to use?
```

### 09 Technology - Technology And AI Infrastructure Management System

```text
Department system: Technology And AI Infrastructure Management System
Area key: 09-technologia
Label: 09 Technologia
Value-flow layer: tooling and observability
Subsystems: agents, service keys, MCP tools, command safety, audit, integration health, runtime observability
First owner question: Which tools, agents, and technical surfaces are healthy enough to depend on?
```

### 10 Legal - Legal, Standards, And Decision Management System

```text
Department system: Legal, Standards, And Decision Management System
Area key: 10-prawo
Label: 10 Prawo
Value-flow layer: guardrails
Subsystems: policies, standards, decision logs, risks, controls, compliance routines, approval criteria
First owner question: Which decision, standard, risk, or control protects the company now?
```

### 11 Innovation - Innovation And Growth Management System

```text
Department system: Innovation And Growth Management System
Area key: 11-innowacje
Label: 11 Innowacje
Value-flow layer: learning and growth
Subsystems: experiments, growth ideas, content ideas, marketing signals, feedback loops, improvements, new offers
First owner question: Which experiment or learning should improve the company next?
```

### 12 Management - Executive Management System

```text
Department system: Executive Management System
Area key: 12-zarzadzanie
Label: 12 Zarzadzanie
Value-flow layer: supervised company steering
Subsystems: owner command, cross-department health, approvals, escalation, portfolio choices, operating review
First owner question: What needs the owner decision, approval, or escalation across the company?
```

## Batch Planning Prompt

Use this when generating a sequence of implementation tasks:

```text
Create a phased V1 build plan for all 13 CompanyCore Department Management Systems.

Use the department system inventory and prompt seeds.
For each department:
1. classify current state as implemented, partial, planned, or missing;
2. identify existing backend contracts to reuse;
3. define the first read-only UI slice;
4. define the first safe write action only if existing APIs support it;
5. define the Paperclip/AI read packet;
6. define validation evidence required;
7. define the next smallest task contract ID.

Prioritize:
1. Strategy
2. Sales
3. Work Execution
4. Knowledge
5. AI Agents
6. Product/Delivery
7. Relationships
8. Finance
9. Operations
10. Assets
11. Integrations
12. People/Roles
13. Main Orchestration

Do not start code. Produce planning rows only.
```
