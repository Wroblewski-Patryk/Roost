# DMS-00-001 Global Intake And Paperclip Output Review Contract

Last updated: 2026-05-16

## Purpose

This contract defines the V1 design for `00 Main` as the global intake and
review system for CompanyCore. It is the owner-controlled place where
unclassified work, provider signals, Paperclip background output, feedback,
risks, opportunities, and improvement ideas become visible before they are
assigned to a department or allowed to affect the company.

This is planning/design scope. It does not add runtime endpoints, database
tables, migrations, UI code, or autonomous Paperclip writes.

## Architecture Sources

- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/planning/v1-department-systems-global-implementation-plan.md`
- `docs/architecture/companycore-business-module-map.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/organizational-architecture-bridge.md`
- `docs/operations/agent-companycore-api-playbook.md`

## Core Decision

`00 Main` is the intake and routing department.

Anything that does not yet have a trusted department, owner, workflow, risk
level, or evidence chain should appear in `00 Main` first. The owner can then
classify it, route it, approve it, reject it, archive it, or ask Paperclip to
propose next work.

## Current Reusable Foundations

| Foundation | Current shape | Reuse for intake |
| --- | --- | --- |
| Agent events | `AgentEventOutbox`, `/v1/agent-events`, ack route | Paperclip/Jarvis assigned work and background output signals. |
| Provider inbox | `ProviderEventInbox`, ClickUp webhook events and failed/retry state | Provider changes that need owner review or recovery. |
| Company events | `Event`, `/v1/events` | Evidence that something happened in CompanyCore. |
| Tasks | `/v1/tasks`, ClickUp sync | Work items that may be unassigned, overdue, blocked, or agent-created. |
| Drive files | `/v1/google-drive/files` | New/unmapped/stale files and folders that may need department assignment. |
| Provider mappings | operating model mappings | Unassigned provider containers and relationship review items. |
| Relationship graph | `/v1/relationships/graph` | Existing needs-review relationship families. |
| Company OS | approvals, risks, controls, audit, workflow drafts | Decisions and guarded actions that need owner review. |
| Agents/MCP | service keys, MCP manifest, agent profiles | What Paperclip can read or propose. |

The first implementation must build a derived read/review model from these
foundations before adding new durable intake tables.

## Intake Candidate Families

V1 intake should classify candidates into these families:

| Family | Meaning | Candidate sources |
| --- | --- | --- |
| `agent_output` | Paperclip/Jarvis/agent-created or proposed work that needs owner visibility. | `AgentEventOutbox`, agent logs, events with agent source. |
| `provider_signal` | Provider or integration event that needs review or recovery. | ClickUp provider inbox, failed provider events, provider mappings. |
| `unassigned_resource` | File, folder, provider container, task, or record without trusted department ownership. | Drive files, external mappings, operating model review rows. |
| `owner_idea` | Human-created idea, note, decision, task, or request not yet routed. | Notes, decisions, tasks, future manual intake form. |
| `client_signal` | Client, lead, interaction, support, or current-work signal needing routing. | Clients, interactions, deals, tasks, relationships. |
| `risk_or_approval` | Approval, risk, control, blocked action, or high-risk agent proposal. | Company OS approvals, risks, controls, MCP guarded actions. |
| `feedback_signal` | Feedback, retro, survey, or old-client learning item. | Notes, tasks, archived-client imports, future survey flow. |
| `improvement_signal` | Gap that should become a task, standard update, process update, or automation idea. | Module confidence, decisions, retros, Paperclip analysis. |

## Review Status Vocabulary

V1 review rows should use owner-readable statuses:

| Status | Meaning |
| --- | --- |
| `new` | Newly visible in intake and not reviewed by owner. |
| `needs_classification` | Needs department, source, risk, or type decision. |
| `needs_owner_decision` | Cannot safely proceed without owner choice. |
| `ready_to_route` | Has enough context to assign to a department/workflow/task. |
| `routed` | Assigned to a department or concrete work surface. |
| `accepted` | Accepted as valid work/evidence. |
| `rejected` | Rejected as not useful, duplicate, invalid, or unsafe. |
| `archived` | Preserved for history without active follow-up. |
| `blocked` | Cannot proceed due to missing data, permission, contract, or risk. |

Runtime implementation may derive these statuses from source records until a
durable intake table exists.

## Priority And Risk Vocabulary

| Field | Allowed values | Rule |
| --- | --- | --- |
| priority | `p0`, `p1`, `p2`, `p3` | P0 blocks company operation or unsafe automation; P1 blocks useful V1 loop. |
| risk | `low`, `medium`, `high`, `critical` | Finance, legal, payment, destructive provider, and autonomous-agent writes are high or critical until contracts exist. |
| agentAuthority | `read_only`, `proposal_only`, `supervised_write`, `blocked` | Paperclip starts as read/proposal; write access needs scoped command contracts. |

## Intake Row Shape

The first backend aggregate should return this read shape:

```json
{
  "id": "agent_event_outbox:uuid",
  "sourceType": "agent_event",
  "sourceId": "uuid",
  "family": "agent_output",
  "title": "Paperclip proposed a follow-up task",
  "summary": "Short owner-readable context.",
  "status": "needs_owner_decision",
  "priority": "p1",
  "risk": "medium",
  "agentAuthority": "proposal_only",
  "targetDepartment": "00-ogolny",
  "suggestedDepartment": "04-operacje",
  "suggestedAction": "review_and_route",
  "sourceAgent": "paperclip",
  "sourceProvider": "companycore",
  "createdAt": "2026-05-16T00:00:00.000Z",
  "updatedAt": "2026-05-16T00:00:00.000Z",
  "evidence": [
    {
      "type": "agent_event",
      "label": "Agent event",
      "href": "/v1/agent-events/:id"
    }
  ],
  "links": [
    {
      "label": "Open suggested department",
      "href": "/areas?area=04-operacje&view=overview"
    }
  ],
  "allowedActions": [
    "mark_reviewed",
    "route_to_department",
    "create_task_from_item",
    "archive"
  ],
  "blockedActions": [
    {
      "action": "autonomous_execute",
      "reason": "Owner review required before agent write."
    }
  ]
}
```

## Aggregate Summary Shape

The same read model should include summary fields:

```json
{
  "summary": {
    "total": 12,
    "new": 3,
    "needsOwnerDecision": 4,
    "paperclipItems": 2,
    "highRisk": 1,
    "unassignedResources": 5,
    "readyToRoute": 3
  },
  "families": [
    { "family": "agent_output", "count": 2 },
    { "family": "unassigned_resource", "count": 5 }
  ],
  "departments": [
    { "areaKey": "04-operacje", "suggestedCount": 3 },
    { "areaKey": "03-sprzedaz", "suggestedCount": 2 }
  ]
}
```

## Proposed Backend Surface

### Read Aggregate

```http
GET /v1/intake
```

Query parameters:

| Param | Meaning |
| --- | --- |
| `family` | Filter by candidate family. |
| `status` | Filter by review status. |
| `sourceAgent` | Filter by agent such as `paperclip`. |
| `risk` | Filter by risk level. |
| `suggestedDepartment` | Filter by suggested area key. |
| `limit` | Default 100, max 200. |

Capability:

```text
intake:read
```

First implementation note:

- If a dedicated `/v1/intake` route feels too broad, implement as
  `GET /v1/department-systems/00-ogolny/intake` only after the department
  packet route is selected. The product shape should stay the same.

### Future Review Commands

Do not implement these in the first read-model slice unless separately
approved:

```http
POST /v1/intake/:id/actions/mark-reviewed
POST /v1/intake/:id/actions/route
POST /v1/intake/:id/actions/create-task
POST /v1/intake/:id/actions/archive
POST /v1/intake/:id/actions/reject
```

Future capability:

```text
intake:write
```

Command requirements:

- workspace scoped;
- source row exists and is visible;
- command is idempotent where possible;
- action emits event;
- action records audit when it changes Company OS or approval-relevant state;
- high-risk rows require owner auth or explicit supervised operator mode;
- route/create-task must preserve source evidence.

## MCP Surface

Read-only tool:

```text
companycore_get_intake
```

Purpose:

```text
Read unclassified intake, Paperclip output, owner decision needs, and suggested
department routing without mutating CompanyCore.
```

Allowed profiles:

- `mcp_company_os_reader`
- `mcp_event_worker`
- future `mcp_department_operator` if created

Paperclip should use this tool to:

- see what background items need owner attention;
- avoid duplicating already-routed work;
- propose classification or tasks;
- cite evidence before asking for action.

Paperclip must not:

- acknowledge or hide owner-review items as a side effect of reading;
- directly mutate providers;
- create invoice/payment/legal commitments;
- execute high-risk commands without owner approval.

## Web Surface In `00 Main`

Route:

```text
/areas?area=00-ogolny&view=overview
```

Required panels:

| Panel | Purpose |
| --- | --- |
| Intake command brief | Shows new items, owner decisions, Paperclip output, high-risk rows, and ready-to-route rows. |
| Paperclip review queue | Shows agent-created/proposed work with source, risk, suggested department, and blocked actions. |
| Classification board | Groups items by family, status, risk, and suggested department. |
| Evidence rail | Shows source records, agent events, provider inbox rows, Drive files, tasks, decisions, and audit/events. |
| Next safe actions | Shows read-only suggestions first; write actions only when backend commands exist. |

States:

- loading;
- empty;
- populated;
- filtered-empty;
- degraded when some source APIs fail;
- blocked when high-risk action has no contract;
- success/failure for future local actions.

Mobile requirement:

- show summary cards first;
- keep review row actions touch-safe;
- avoid showing raw JSON payloads in the first viewport.

## Source Ranking

When many candidates exist, rank:

1. critical/high-risk owner decisions;
2. Paperclip-created or proposed items awaiting review;
3. unassigned client/current-work items;
4. unassigned Drive/provider resources;
5. failed provider inbox rows;
6. feedback and improvement signals;
7. older archived/low-risk items.

## Department Routing Heuristics

Initial suggestions can be derived conservatively:

| Signal | Suggested department |
| --- | --- |
| pricing, discount, invoice, payment | `07-finanse` |
| lead, client, offer, proposal | `03-sprzedaz` |
| support, follow-up, old client | `05-relacje` |
| SOP, dependency, approval, routine | `04-operacje` |
| goal, KPI, strategic decision | `01-strategia` |
| product, delivery, acceptance | `02-produkt` |
| file, folder, prompt, resource | `08-zasoby` |
| agent, MCP, integration, runtime health | `09-technologia` |
| policy, standard, legal, risk/control | `10-prawo` |
| experiment, feedback, improvement | `11-innowacje` |
| authority, staffing, agent role | `06-kadry` |
| unresolved or cross-department | `00-ogolny` |

Suggestions are not final assignments. Owner or approved command must confirm
them.

## First Implementation Slice

Recommended next task:

`DMS-00-002 Audit current sources for intake candidates`

Scope:

- inspect current tables/routes for agent events, provider inbox, events,
  tasks, Drive files, mappings, relationship review, approvals, risks, and
  decisions;
- produce a source-to-intake mapping table;
- choose whether first runtime route is `/v1/intake` or a
  department-system packet extension;
- define exact fields that can be implemented without migration.

No code changes should be made until DMS-00-002 closes the source audit.

## Acceptance Criteria For DMS-00 Runtime Work

Before DMS-00 runtime work is marked verified:

- workspace isolation is tested;
- Paperclip-only filters are tested;
- high-risk rows are visible but blocked from unsafe action;
- owner can see evidence and source;
- no row disappears because an agent read it;
- no provider payload secret is exposed;
- mobile and desktop render without overflow;
- MCP read tool matches HTTP read behavior;
- review/write commands, if added, emit event/audit evidence.
