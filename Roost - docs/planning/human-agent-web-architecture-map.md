# Human-Agent Web Architecture Map

Last updated: 2026-05-14

## Purpose

This analysis maps the approved CompanyCore architecture into a web product
direction where the owner can inspect, edit, approve, and supervise the same
Company OS graph that agents can access through MCP.

It is intentionally stricter than a visual polish note. The current UI has
useful verified slices, but it is not yet a complete human-grade operating
console for the architecture that already exists in the backend.

## Current Reality

CompanyCore has a stronger backend and agent contract than web product
experience.

The architecture already defines PostgreSQL as source of truth, HTTP API as
the supported integration layer, and MCP as the preferred agent tool
projection above HTTP. Risky writes are command-oriented: approvals, stage
lifecycle, automation evaluation, events, and audit logs must stay inside
CompanyCore command routes instead of raw table mutation.

The web currently exposes parts of that graph:

- operating areas, provider mappings, Drive ownership, and table previews;
- Company OS cockpit, drilldowns, record detail, approvals, stage commands,
  automation evaluation, and an agent command queue;
- integration and task workbenches backed by existing API routes.

The gap is not that there is no UI. The gap is that the UI is still organized
as several workbenches and controls, while the architecture describes one
operator-visible operating system:

```text
Workspace
  -> Operating Area / Folder / Table
  -> Process / Pipeline / Stage / Procedure
  -> Run / Stage Run / Approval / Acceptance Criterion
  -> Policy / Risk / Control / Automation Rule
  -> Event / Audit Log / Agent Event / Provider Resource
```

MCP agents discover that system through the route manifest. The owner should
discover and operate it through a web console that mirrors the same command
surface, capability boundaries, and evidence chain.

## Architecture-To-Web Translation

| Architecture concept | Backend source | MCP exposure | Web responsibility | Current web state | Gap |
| --- | --- | --- | --- | --- | --- |
| Workspace and owner boundary | auth middleware, user token, API keys | capability-scoped service keys | show active workspace, owner session, key/profile capability impact | present across routes | capability impact is not consistently visualized near actions |
| Operating areas/folders/tables | `/v1/operating-model`, typed table routes | operating-model routes in manifest | browse and edit company structure, provider scope, Drive scope, table record previews | strong in `/areas` | not yet unified with Company OS process/run context |
| Company OS definitions | `/v1/company-os/:collection` | `company-os:read` tools | inspect processes, pipelines, roles, procedures, tools, policies | present in drilldowns and agent context panel | definition records are mostly read-only generic cards, not purpose-built editors |
| Runtime evidence | pipeline runs, stage runs, approvals, acceptance criteria, audit logs, events | read tools plus lifecycle commands | show what is running, blocked, awaiting approval, validated, audited | present in Company OS cockpit | timeline/correlation view is missing, so evidence is fragmented |
| Approval lifecycle | approval command routes | requires-approval MCP tools | request, decide, explain, trace impact | implemented | needs richer decision cockpit and effect preview |
| Stage lifecycle | start/block/validate/complete commands | supervised MCP command tools | operate stages with approval and criteria context | implemented controls | forms are functional but not yet workflow-grade; context and recovery are thin |
| Automation evaluator | event evaluation route | automation execute tool | dry-run, compare proposals, execute under owner supervision | implemented controls | lacks proposal diff, blast-radius preview, and replay history |
| Policies, risks, controls | Company OS collections | read tools | explain why an action is blocked or approval-gated | visible as lists/queue items | no policy-to-action reasoning panel |
| MCP manifest | `/v1/mcp/manifest`, `/v1/connection` | source of MCP tools | show the owner what agents can read/write and which tools require supervision | partially exposed through API key profiles and connection data | no human-readable "agent tool surface" workbench |
| Provider resources | ClickUp, Drive, resources, mappings | route manifest plus provider routes | inspect provider state and correct scope without raw DB edits | present for mapping and Drive | not yet linked to Company OS resources, risks, runs, and automations |

## Product Direction

The web should become an "agent-visible operating console" with two equal
promises:

1. The owner can see the same operating graph agents see.
2. The owner can perform the same approved actions agents can request, with
   better context, safer defaults, and clearer evidence.

This does not mean exposing raw CRUD for every table. The architecture already
forbids raw lifecycle writes for approvals, runs, stages, and audit evidence.
The web should follow the same rule:

- raw-ish editing is acceptable for operating model registry resources where
  the API already supports scoped CRUD;
- command-shaped actions are required for approvals, stage runs, automation,
  provider lifecycle, agent event acknowledgement, and any risky state change;
- read-only generic collection drilldowns are acceptable as a starting point,
  but high-value collections need purpose-built editors or command panels.

## Recommended Information Architecture

### 1. Command Center

Goal: answer "what matters now?" within seconds.

Surface:

- owner-gated agent command queue;
- pending approvals;
- blocked or failed stage runs;
- unhealthy adapters;
- high risks and blocking policies;
- recent automation proposals;
- recent events and audit evidence.

Actions:

- approve/reject;
- open stage run;
- open policy/risk reason;
- dry-run automation;
- acknowledge/route agent event;
- jump to affected operating area/resource.

### 2. Operating Graph

Goal: show how company structure, provider resources, data tables, knowledge,
and automations fit together.

Surface:

- operating area tree;
- folders/tables/records;
- provider mappings;
- Drive files/knowledge roots/storage locations;
- linked resources, automations, policies, and risks.

Actions:

- create/update/delete user operating areas;
- create/update/delete folders, storage locations, knowledge roots, and
  automation definitions;
- reassign provider and Drive scope;
- inspect table records;
- open linked Company OS process/pipeline/run context.

### 3. Process And Pipeline Builder

Goal: let the owner inspect and eventually edit the operational model agents
execute.

Surface:

- processes;
- pipelines;
- stages;
- procedures;
- procedure steps;
- roles;
- tool adapters and integration capabilities;
- standards and acceptance templates.

Actions:

- initially: purpose-built read/detail views;
- next: scoped create/update for definitions only after backend write contracts
  are explicitly approved;
- never: raw mutation of runtime evidence from this builder.

### 4. Run And Evidence Timeline

Goal: make auditability usable by humans, not only present in tables.

Surface:

- one correlation timeline joining pipeline run, stage runs, approvals,
  acceptance criteria, automation proposals, events, and audit logs;
- status transitions and actor identity;
- command inputs/outputs with safe JSON preview;
- recovery hints for blocked/failed states.

Actions:

- start/block/validate/complete stage through existing command routes;
- request/decide approval;
- copy evidence IDs;
- open related event/audit/agent/provider resources.

### 5. Agent Tool Surface

Goal: show what an MCP agent can do before a key is handed to it.

Surface:

- effective capabilities for owner/API-key/profile;
- MCP tools grouped by read/write/destructive and requires-approval;
- route path, method, capability, risk, and schema summary;
- profile comparison: reader vs operator vs custom key.

Actions:

- create scoped key from profile;
- inspect missing/extra capabilities;
- run safe read smoke;
- require supervised mode for risky tools;
- link every risky tool to the equivalent web command panel.

### 6. Automation Studio

Goal: turn automation from a JSON list into an owner-supervised control system.

Surface:

- rule list;
- trigger conditions;
- action proposals;
- dry-run results;
- execution evidence;
- idempotency key and replay status;
- policy/approval requirements.

Actions:

- evaluate selected event in dry-run;
- compare proposals before execute;
- execute only with visible risk and evidence target;
- pause/archive automation definitions where supported;
- create/edit automation definitions through operating-model routes.

## Functional Gaps To Close

| Gap ID | Gap | Why it matters | Existing backend support | Proposed next slice |
| --- | --- | --- | --- | --- |
| HAW-001 | No unified architecture navigation model in web | Users cannot understand how areas, processes, runs, resources, and agents relate | data exists across `/v1/connection`, `/v1/operating-model`, `/v1/company-os`, typed table routes | Add a graph-oriented Company OS navigation map backed by existing reads |
| HAW-002 | MCP manifest is not human-readable in the UI | Owner cannot audit what agents can do before issuing keys | `/v1/mcp/manifest`, `/v1/connection` | Build Agent Tool Surface workbench |
| HAW-003 | Runtime evidence is fragmented | Audit logs/events exist but do not explain one action chain | `correlationId`, events, audit logs, runs, approvals | Build correlation timeline panel |
| HAW-004 | Generic collection drilldowns are insufficient for editing | Important objects are visible but not comfortably operable | read APIs exist; selected write APIs exist only for lifecycle/registry | Split read-only explorer from approved command/edit panels |
| HAW-005 | Stage and automation actions lack blast-radius preview | Owner can click commands but has limited before/after confidence | dry-run automation; command errors; policy data | Add proposal/effect preview before execute |
| HAW-006 | Policies/risks do not explain action gating inline | The system can block correctly while still feeling opaque | policy/risk/control collections exist | Add "why blocked / why approval needed" panel |
| HAW-007 | Provider resources are not fully connected to Company OS resources/runs | User sees mappings but not operational consequences | resources, mappings, Drive files, ClickUp tables, events | Add resource detail linking provider, table, area, process, runs, events |
| HAW-008 | Definition editing is not approved for most Company OS objects | Adding UI CRUD would violate command/source-of-truth discipline if done casually | mostly read-only Company OS collections | Decide definition write contracts before building editors |

## Priority Plan

### Slice 1: Agent Tool Surface Workbench

Why first: it directly matches the user's point: the web should expose what
agents can do through MCP.

Scope:

- read `/v1/connection` and `/v1/mcp/manifest`;
- group tools by capability, route group, risk, and `requiresApproval`;
- show current owner capabilities and API-key profile intent;
- link risky Company OS tools to existing cockpit command panels.

No backend or schema change is needed.

### Slice 2: Correlation Timeline

Why second: the architecture is evidence-first, but the UI is not yet
evidence-first.

Scope:

- add a timeline panel for a selected `correlationId`;
- compose existing `/v1/company-os/events`, `/v1/company-os/audit-logs`,
  approvals, pipeline runs, stage runs, and automation result data;
- start from selected recent event/audit/stage/approval.

Potential backend gap: current collection reads are limit-only. If client-side
composition from recent records is too weak, add a narrow read route such as
`GET /v1/company-os/correlations/:id` only after documenting the contract.

### Slice 3: Operating Graph Detail

Why third: the owner needs one place where area/table/provider/resource/process
context comes together.

Scope:

- start from `/areas` selected context;
- add linked Company OS resources, policies, risks, automations, and recent
  runs where existing IDs allow it;
- keep edits limited to already-approved operating-model and scope routes.

### Slice 4: Workflow-Grade Command Panels

Why fourth: existing controls work, but they need more product context.

Scope:

- improve stage lifecycle controls with prerequisites, selected approval
  context, acceptance criteria state, and expected result preview;
- improve automation evaluator with proposal diff and execution evidence;
- improve approval decisions with resource/run/stage/policy context.

### Slice 5: Definition Editing Decisions

Why fifth: editing processes, pipelines, procedures, roles, policies, and
automation rules can change agent behavior and must not be casual CRUD.

Scope:

- decide which Company OS definitions can use scoped CRUD;
- decide which need command routes, versioning, or approval;
- implement one definition editor only after the write contract is approved.

## UX Bar

The current UI should not be described as complete or exceptional. It is a
verified technical foundation with useful slices. The product-quality target is
still ahead.

For the next web slices, every screen must answer:

- what matters now;
- what is blocked;
- what the next safe action is;
- what evidence proves the action happened;
- what an agent can or cannot do with the same context.

The interface should feel like a calm operational system, not a loose set of
admin tables.

## Recommended Next Task Contract

The next executable task should be:

```text
V2WEB-AGENT-001 Agent Tool Surface Workbench
```

Goal: add a web route that reads the MCP manifest and shows the owner the same
tool surface agents receive, grouped by capability, risk, approval requirement,
and route family.

This is the smallest safe bridge between agent architecture and human web UX
because it requires no backend schema change and makes the hidden MCP layer
visible to the user before deeper editing surfaces are expanded.
