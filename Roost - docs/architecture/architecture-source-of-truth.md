# Architecture Source Of Truth

This document defines how architecture decisions should be treated in the
repository.

## Purpose

The `docs/architecture/` folder is the canonical record of the application's
approved architecture:

- system boundaries
- ownership of data and state
- module and integration contracts
- deployment shape
- technology choices that are already decided

Treat these files as implementation constraints, not as loose suggestions.

## Default Rule

- Build the application to match the approved architecture.
- Do not silently change architecture during implementation.
- Do not reinterpret unclear architecture in a way that expands scope.
- If implementation exposes a gap or mismatch, stop implementation and escalate
  before changing architectural direction.
- Prefer asking for a decision over shipping an incorrect workaround.

## What Agents May Do Without Re-Approving Architecture

- implement work that fits the documented boundaries
- add clarifying detail that does not change behavior or ownership
- document discovered inconsistencies
- propose follow-up tasks that improve implementation quality inside the
  approved architecture

## What Requires Explicit User Approval First

- changing module boundaries or service responsibilities
- moving source-of-truth ownership for data or state
- replacing an approved integration pattern with another one
- changing deployment topology or runtime shape
- changing a confirmed tech-stack decision that affects architecture
- introducing a new cross-cutting pattern that contradicts existing
  architecture docs

## Mandatory Decision Flow For Mismatches

When implementation does not fit approved architecture:

1. describe the mismatch clearly
2. propose 2 to 3 valid options with tradeoffs
3. wait for explicit user decision

Agents must not self-approve a workaround or architecture rewrite.

If there is a strong argument for a better design, the agent should present the
case in conversation first, including tradeoffs and why the current
architecture may be insufficient. The agent must not self-approve the change.

## Required Architecture Files

At minimum, keep these files aligned:

- `docs/architecture/system-architecture.md`
- `docs/architecture/architecture-evidence-system.md`
- `docs/architecture/autonomous-company-operating-system.md`
- `docs/architecture/tech-stack.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/architecture/unified-organizational-operating-system.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/department-management-systems-architecture.md`
- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/architecture/company-os-definition-editing-contract.md`
- `docs/architecture/company-os-workflow-definition-command-contract.md`
- `docs/architecture/web-and-mcp-foundation-before-v2.md`
- `docs/architecture/relationship-graph-audit-2026-05-14.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/planning/auth-workspace-integration-plan.md`
- `docs/planning/regression-prevention-plan.md`

Projects may add more architecture docs or ADRs, but these baseline files
should always stay current.

## CompanyCore v1 Approved Direction

The approved v1 direction is:

- API-first product foundation with a minimal owner-only web console for v1
  ClickUp setup
- CompanyCore is the company operating system, not an embedded AI system;
  humans use web UI and AI agents use API/MCP as external clients
- PostgreSQL is the source of truth
- API is the supported access layer for agents, automations, future dashboards,
  and future mobile clients
- owner registration creates a workspace
- business data, service API keys, integration settings, and integration sync
  state are workspace-scoped
- ClickUp is the first native integration adapter
- CompanyCore should evolve toward a ClickUp-shaped operating model:
  `Workspace -> Operating Area -> Operating Folder -> Operating Table ->
  Record`, mapped to ClickUp `Team/Workspace -> Space -> Folder -> List ->
  Task`
- first-party business tables should be assigned to an approved operating area;
  `00. Glowny` is the non-removable fallback area for unclassified imports,
  followed by the 12 company departments, while users, memberships, API keys,
  integration settings, provider mappings, and platform metadata remain system
  tables
- provider imports must expose an explicit existing-record policy before
  writing; ClickUp supports `merge`, `skip_existing`,
  `replace_selected_lists`, and `inspect_only`, with deletes limited to
  provider-owned records in the selected scope
- n8n remains optional orchestration, not the required primary ClickUp path
- schema changes should move from `prisma db push` to controlled migrations
- tests and smoke checks must prove workspace scoping and integration sync
  behavior before v1 is considered stable
- full company dashboard and mobile app are v2 scope; mobile should follow the
  web product experience
- before V2 Company City, gamification, or native mobile app work, the product
  must finish the web/backend/MCP foundation described in
  `docs/architecture/web-and-mcp-foundation-before-v2.md`: workspace selection,
  operating-area/resource navigation, relationship/integration clarity, and
  MCP workspace-safe usability
- CompanyCore's long-term product architecture is an AI-first organizational
  operating system where vertical hierarchy and horizontal processes coexist.
  The accepted direction is recorded in
  `docs/architecture/organizational-architecture-bridge.md` and must guide
  future schema, MCP, web, mobile, Paperclip, governance, knowledge, KPI, and
  organizational graph work without bypassing scoped task contracts or existing
  Company OS boundaries.
- CompanyCore's unified organizational operating-system direction is recorded
  in `docs/architecture/unified-organizational-operating-system.md`. Humans
  and AI agents are both organizational workforce members in the target model:
  they can receive work, report progress, belong to departments, exist in a
  hierarchy, hold role/rank-derived permissions, use procedures, access
  resources, escalate issues, and communicate organizationally. This extends
  the current `users`, `agents`, `company_roles`, `business_functions`,
  `tasks`, workflow, approval, event, audit, API, and MCP foundations without
  authorizing a broad schema rewrite.
- CompanyCore should scale through model-level business modules recorded in
  `docs/architecture/companycore-business-module-map.md`. Future views and
  agent tools should derive from those modules and classify work as native
  core, provider-backed, future adapter, or derived view before adding schema,
  API, UI, or MCP surfaces.
- CompanyCore's global business flow is recorded in
  `docs/architecture/companycore-global-business-flow.md`. Future CRM,
  marketing, product/service delivery, finance, support, feedback, and
  improvement work should derive from the 13-stage value pipeline before
  adding runtime surfaces.
- CompanyCore V1 department views should become department management systems
  as recorded in
  `docs/architecture/department-management-systems-architecture.md`. Each of
  the 13 areas is a scalable management system over shared tables, pipelines,
  tasks, knowledge, resources, metrics, decisions, governance, and AI/MCP
  tools, not a separate database or provider-led app.
- The V1 implementation blueprint for the 12 operating department systems and
  `00 Main` orchestration is recorded in
  `docs/architecture/department-management-systems-v1-blueprint.md`. Future
  department web/backend work should use that document to define each
  department's purpose, subsystems, shared backend reuse, backend gaps, agent
  packet, safe actions, and recommended implementation order before coding.
- CompanyCore now has an Obsidian-first architecture evidence system recorded
  in `docs/architecture/architecture-evidence-system.md`. CSV registries under
  `docs/architecture/nodes/`, `docs/architecture/relations/`,
  `docs/architecture/chains/`, `docs/testing/test-map.csv`, and
  `docs/status/evidence-status.csv` are the source of truth for mapped
  features, routes, components, data models, tests, docs, agents, prompts,
  workflows, events, dependencies, and proof. Future meaningful feature work
  must update those records and run `npm run architecture:graph` before it can
  be treated as officially mapped.

## Implementation Contract

Before architecture-impacting work is marked complete, confirm:

- the task still fits the approved architecture
- any deviation was explicitly approved
- the architecture docs and implementation remain synchronized
- no workaround path was introduced to bypass architecture constraints
- existing mechanisms were reused before proposing new structures
