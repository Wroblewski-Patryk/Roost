# CC-00-001 Route Proposal Lifecycle Readback Plan

Last updated: 2026-05-16

## Purpose

`00 Main` is the general company control layer. It receives owner ideas,
provider outputs, agent outputs, unassigned resources, risks, tasks, and
improvement signals. It must route work without becoming an AI agent or
monolithic orchestrator.

The current route proposal command already writes a proposal-shaped record set:
`Decision`, optional `Task`, `AuditLog`, and `Event`. The next step is to make
this lifecycle readable and reviewable before adding broader write behavior.

## Existing Runtime Evidence

| Runtime area | Current behavior | Source |
| --- | --- | --- |
| Read queue | `GET /v1/intake` returns classified intake items, evidence, allowed actions, blocked actions, and summary counts. | `src/modules/intake/intake.routes.ts` |
| Proposal command | `POST /v1/intake/actions/propose-route` creates a `Decision`, optional draft `Task`, `AuditLog`, and `Event` without mutating provider state. | `src/modules/intake/intake.routes.ts` |
| Idempotency | Proposal command uses source, target department, classification, and idempotency key to replay existing proposal. | `src/modules/intake/intake.routes.ts` |
| Agent boundary | Proposal output reports `sourceMutated=false`, `agentEventAcknowledged=false`, and `providerStateMutated=false`. | `src/modules/intake/intake.routes.ts` |
| UI | `MainIntakeSystemPanel` can propose a route from the `00 Main` panel. | `web/src/main.tsx` |

## Lifecycle States

| State | Backing record | Meaning |
| --- | --- | --- |
| `not_proposed` | none | Intake item has no matching route proposal decision. |
| `proposed` | `Decision.status = proposed` | Owner or agent has proposed a route. No source/provider mutation has happened. |
| `task_draft_created` | matching `Task.source = companycore_intake` | A human-review task exists for the proposal. |
| `accepted` | future decision transition | Owner accepted the route proposal through an explicit decision command. |
| `rejected` | future decision transition | Owner rejected the route proposal through an explicit decision command. |
| `superseded` | future decision transition | A newer proposal replaces an older one. |

## Readback Packet

`GET /v1/intake` or a dedicated `GET /v1/intake/route-proposals` should expose
the following fields before additional route writes are added:

| Field | Source | Notes |
| --- | --- | --- |
| `proposalId` | `Decision.id` | Stable review target. |
| `sourceModel` / `sourceId` | `Decision.rationale` today; future structured metadata if needed | Should remain source-specific and workspace-scoped. |
| `targetDepartmentKey` | `Decision.title`/external id today; future metadata if needed | Must use canonical department key. |
| `classification` | proposal input | Keep limited to existing classification enum. |
| `reason` | `Decision.rationale` | Human-readable review context. |
| `proposedNextAction` | `Decision.outcome` | Not an execution instruction until accepted. |
| `riskLevel` | `AuditLog.inputPayload` | Avoid parsing user text when audit payload has structured input. |
| `taskId` | matching `Task` by `source/externalId` | Optional. |
| `auditLogId` | matching `AuditLog` by resource | Required for traceability. |
| `eventId` | matching `Event` correlation | Useful for timeline and MCP context. |
| `allowedActions` | server-derived | Initially read, inspect, create follow-up, propose replacement. |
| `blockedActions` | server-derived | Provider mutation, approval decision, task execution, destructive action. |

## UI Requirements

`00 Main` should show route proposal lifecycle as an owner review queue:

- proposed route, source, target department, risk, and reason
- task draft link when created
- audit/event evidence
- clear blocked actions that prevent autonomous mutation
- mobile first queue with primary question: what needs owner decision now?
- desktop table/list with filters by status, risk, source model, target
  department, and source agent

## API/MCP Requirements

- AI agents may read proposals and propose new route proposals through the
  explicit command.
- AI agents must not approve, reject, execute, delete, acknowledge provider
  events, or mutate source systems through this readback.
- MCP tools should expose readback as low-risk read and proposal creation as a
  guarded command with audit.

## Next Runtime Task

`CC-00-002 Route proposal lifecycle readback API` should add the minimum
structured readback for current proposal records. It should not add acceptance
or rejection commands until the owner review UI is proven.
