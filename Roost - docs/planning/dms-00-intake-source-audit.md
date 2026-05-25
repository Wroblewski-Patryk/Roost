# DMS-00-002 Intake Source Audit

Last updated: 2026-05-16

## Purpose

This audit maps current CompanyCore data sources into the DMS-00 global intake
model before implementing runtime code.

Source contract:

- `docs/planning/dms-00-global-intake-paperclip-review-contract.md`

Result:

- The first runtime implementation can be a read-only aggregate without a
  migration.
- Preferred first route: `GET /v1/intake`.
- Preferred first MCP tool: `companycore_get_intake`.
- First web consumer: `00 Main` selected-area panel on
  `/areas?area=00-ogolny&view=overview`.

## Source Inventory

| Source | Code/table | Readiness | Intake family | First use |
| --- | --- | --- | --- | --- |
| Agent event outbox | `AgentEventOutbox`, `src/modules/agent-events/agent-events.routes.ts` | ready | `agent_output` | Pending Paperclip/Jarvis/general agent items. |
| Provider event inbox | `ProviderEventInbox`, `src/integrations/clickup/clickup.webhooks.ts` | ready | `provider_signal` | Failed/pending ClickUp provider events needing owner review or retry. |
| Company events | `Event`, `src/modules/events/events.routes.ts` | ready | `improvement_signal`, `agent_output`, `provider_signal` | Recent observable activity, especially agent/provider sourced events. |
| Tasks | `Task`, `src/modules/tasks/tasks.routes.ts` | ready | `owner_idea`, `client_signal`, `improvement_signal` | Unassigned, blocked, overdue, or agent/source-created work. |
| Drive files | `GoogleDriveFile` | ready | `unassigned_resource` | Files/folders without operating area/folder/table assignment. |
| Provider mappings | `ExternalContainerMapping`, `ExternalFieldMapping` | ready | `unassigned_resource`, `provider_signal` | Provider containers/fields without area/table assignment. |
| Relationship graph review items | `src/modules/relationships/relationships.routes.ts` | ready via existing API logic | `unassigned_resource`, `client_signal` | Existing review items for provider/Drive relationship confidence. |
| Company OS approvals | `Approval`, Company OS read routes | ready | `risk_or_approval` | Pending owner decisions and approvals. |
| Risks and controls | `Risk`, `Control`, Company OS read routes | ready | `risk_or_approval` | High/critical active risks. |
| Notes and decisions | `Note`, `Decision`, `DecisionLog` | ready | `owner_idea`, `feedback_signal`, `improvement_signal` | Owner-authored or agent-authored context that needs routing. |
| Agents and API keys | `Agent`, `ApiKey`, MCP profiles | ready | `agent_output`, `risk_or_approval` | Authority context and source-agent attribution. |

## No-Migration Feasibility

The first read model can derive rows from existing records:

- source id is a composite string such as `agent_event_outbox:{id}`;
- review status is derived from source state;
- suggested department is heuristic only;
- evidence links point back to existing HTTP routes or future web anchors;
- actions are returned as allowed/blocked metadata but not executed yet.

No durable review state exists yet. That means DMS-00-003 should be read-only.
Owner review commands such as mark-reviewed, route, archive, reject, or
create-task-from-item require DMS-00-005/DMS-00-006 and a future write
contract.

## Source-To-Intake Mapping

| Intake source | Selection rule | Derived status | Priority | Risk | Suggested action |
| --- | --- | --- | --- | --- | --- |
| Pending Paperclip agent events | `deliveryStatus=pending`, `targetAgent=paperclip` or null | `needs_owner_decision` when payload proposes work; otherwise `new` | `p1` | `medium` | review Paperclip item and route or archive |
| Pending generic agent events | `deliveryStatus=pending`, `targetAgent=null` | `needs_classification` | `p2` | `medium` | classify source agent/department |
| Failed ClickUp provider events | `processingStatus=failed` | `blocked` | `p1` | `medium` | review provider error or retry through existing route |
| Pending old provider events | `processingStatus=pending` and old enough | `needs_owner_decision` | `p2` | `medium` | inspect integration health |
| Unassigned Drive items | no operating area/folder/table assignment | `needs_classification` | `p2` | `low` or `medium` for folders | assign operating scope |
| Unassigned provider containers | no area/folder/table assignment | `needs_classification` | `p2` | `medium` | assign provider scope |
| Unmapped provider fields | no table assignment | `needs_classification` | `p3` | `low` | map or archive |
| High/critical active risks | active risk with high or critical level | `needs_owner_decision` | `p0` or `p1` | `high` or `critical` | review mitigation/control |
| Pending approvals | approval pending or requested | `needs_owner_decision` | `p0` or `p1` | based on approval target | approve, reject, or request context |
| Blocked/failed pipeline or stage runs | Company OS blocked/failed runtime | `blocked` | `p1` | `medium` or `high` | inspect workflow and assign recovery |
| Unassigned or source-created tasks | task has no project/goal/target/list or source is agent/provider | `needs_classification` | based on due/priority | low/medium | route to department or task workbench |
| Agent/provider sourced events | event source is `paperclip`, `jarvis`, `clickup`, `google_drive`, or other agent/provider | `new` | `p2` | based on type | inspect evidence or convert to task |
| Notes/decisions without department context | no explicit department relation available | `needs_classification` | `p3` | low/medium | classify into knowledge/decision context |

## Recommended First Runtime Query Set

DMS-00-003 should use bounded queries:

| Query | Limit | Sort |
| --- | --- | --- |
| pending agent events | 50 | `availableAt asc` |
| failed/pending provider inbox rows | 50 | `receivedAt asc` |
| unassigned Drive files/folders | 50 | folders first, `updatedAt desc` |
| unassigned external mappings/fields | 50 | `updatedAt desc` |
| pending approvals | 25 | `createdAt desc` |
| high/critical risks | 25 | `riskLevel desc`, `createdAt desc` |
| blocked/failed pipeline/stage runs | 25 | `startedAt desc` |
| unassigned/recent source-created tasks | 50 | `createdAt desc` |
| recent provider/agent events | 50 | `createdAt desc` |

The aggregate should deduplicate by source id and cap total rows to 200.

## Initial Derived Row Rules

### Agent Event Row

- id: `agent_event_outbox:{id}`
- family: `agent_output`
- sourceAgent: `targetAgent` or payload source if present
- status: `needs_owner_decision` for Paperclip, otherwise `new`
- agentAuthority: `proposal_only`
- allowed actions: `inspect_source`, future `route_to_department`,
  future `create_task_from_item`, future `archive`
- blocked actions: `autonomous_execute`

### Provider Inbox Row

- id: `provider_event_inbox:{id}`
- family: `provider_signal`
- status: `blocked` for failed, `new` for pending
- suggested department: `09-technologia` by default, or `03-sprzedaz` /
  `04-operacje` when task/customer/delivery signals are evident
- allowed actions: `inspect_source`, existing provider retry link for failed
  ClickUp events
- blocked actions: direct provider mutation

### Unassigned Resource Row

- id: `google_drive_file:{id}` or `external_container_mapping:{id}`
- family: `unassigned_resource`
- status: `needs_classification`
- suggested department: heuristic from name/path/provider metadata
- allowed actions: existing scope assignment links where available
- blocked actions: autonomous routing until owner approves

### Risk/Approval Row

- id: `approval:{id}` or `risk:{id}`
- family: `risk_or_approval`
- status: `needs_owner_decision`
- priority: P0 for critical/high impact, otherwise P1
- risk: high/critical as source indicates
- allowed actions: open Company OS/approval context
- blocked actions: agent approval without owner/supervised authority

## First Route Decision

Use:

```http
GET /v1/intake
```

Reason:

- `00 Main` is a cross-department intake and router, not only a selected-area
  detail.
- Paperclip and other agents need a stable top-level MCP-friendly tool.
- The route can still be rendered inside `/areas?area=00-ogolny`.

Capability:

```text
intake:read
```

MCP exposure:

```text
companycore_get_intake
```

No write capability in DMS-00-003.

## First Web Decision

DMS-00-004 should add a dedicated `00 Main` panel above the generic selected
area board, similar to how `04 Operations` currently has a dedicated board.

Required sections:

- intake command brief;
- Paperclip review queue;
- classification groups;
- high-risk/approval lane;
- unassigned resources lane;
- evidence rail and safe links.

## Security And Privacy Notes

- Do not expose raw provider payloads in the first web view.
- Do not expose secrets from integration settings, API keys, or provider raw
  metadata.
- Paperclip read should not acknowledge agent events.
- Ack remains a separate explicit route with `agent-events:ack`.
- High-risk rows must be visible but not executable unless a future command
  contract permits the action.
- Workspace scoping is mandatory for every source query.

## DMS-00-003 Implementation Scope

Recommended files:

- `src/auth/capabilities.ts`
- `src/mcp/manifest.ts`
- `src/app.ts`
- new `src/modules/intake/intake.routes.ts`
- `src/tests/api.test.ts`
- `docs/API.md`
- web consumption can wait for DMS-00-004 unless a tiny route link is needed.

Required tests:

- owner can read intake;
- unauthenticated request is rejected;
- workspace isolation prevents cross-workspace rows;
- Paperclip filter returns Paperclip and global rows only;
- failed provider inbox rows appear;
- unassigned Drive/provider mapping rows appear;
- high-risk rows appear with blocked unsafe action metadata;
- MCP manifest exposes `intake:read`;
- reading intake does not change `AgentEventOutbox.deliveryStatus`.

## Open Questions For Later

| Question | Status | Suggested owner |
| --- | --- | --- |
| Should review state become durable in an `intake_items` table? | defer until after read model proof | Backend + Product Docs |
| Should route/classification create tasks directly or create proposals first? | defer to DMS-00-005 | Backend + Security |
| Should Paperclip create intake items, agent events, tasks, or all three? | defer to PC-DMS-002 | AI Integration |
| Should archived old clients enter through intake or relationships first? | defer to DMS-05 and DMS-MONEY | Product Docs |
