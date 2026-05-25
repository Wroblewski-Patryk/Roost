# DMS-00-005 Global Intake Classify/Route Command Contract

Last updated: 2026-05-16

## Task Type

Planning / backend contract.

## Current Stage

Planning.

## Deliverable For This Stage

Command-shaped contract for the first safe `00 Main` write layer after the
verified read-only global intake API and web panel.

## Goal

Define how `00 Main` can classify, route, and request owner decisions for
intake items without acknowledging agent events, approving risky work,
discounting, invoicing, deleting data, mutating provider state, or letting
Paperclip bypass CompanyCore.

## Scope

- Source API reviewed:
  - `src/modules/intake/intake.routes.ts`
  - `docs/API.md`
  - `docs/planning/dms-00-global-intake-web-panel-task-contract.md`
- Future implementation target:
  - backend route under `/v1/intake/actions/*`
  - optional frontend action affordance in the `00 Main` intake panel
  - existing task/event/decision/audit foundations where available
- Source-of-truth updates:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/core/project-memory-index.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/decision-register.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/v1-department-systems-global-implementation-plan.md`

## Current Read Model

`GET /v1/intake` already returns normalized items from:

- `AgentEventOutbox`
- `ProviderEventInbox`
- `GoogleDriveFile`
- `ExternalContainerMapping`
- `ExternalFieldMapping`
- `Approval`
- `Risk`
- `Task`
- `Event`

The read model exposes `allowedActions` and `blockedActions`, but those are
review hints only. They are not authority to execute high-risk work directly.

## Command Principle

The first command layer must produce an auditable proposal, not perform the
final business action.

Accepted first-write outcome:

- create a route/classification proposal;
- optionally create a follow-up owner task or decision-request record;
- emit an internal event or audit evidence when the existing foundations are
  available;
- leave the source item unchanged unless the source already has a dedicated,
  safe, approved command route.

Rejected first-write outcomes:

- acknowledging `AgentEventOutbox`;
- retrying `ProviderEventInbox`;
- approving or rejecting `Approval`;
- changing discounts, prices, invoice readiness, payment state, legal state,
  paid ads, provider files, provider mappings, or external provider records;
- deleting or archiving source records;
- creating a generic edge or raw table mutation.

## Proposed Endpoint Shape

### `POST /v1/intake/actions/propose-route`

Creates an auditable route proposal for one intake source item.

```json
{
  "sourceModel": "AgentEventOutbox",
  "sourceId": "event-uuid",
  "targetDepartmentKey": "04-operacje",
  "classification": "route_to_department",
  "reason": "Paperclip reported an operations planning gap that belongs to procedure management.",
  "proposedNextAction": "Create an Operations improvement task after owner review.",
  "riskLevel": "medium",
  "requestOwnerDecision": true,
  "createTaskDraft": true,
  "idempotencyKey": "intake-route-AgentEventOutbox-event-uuid-04-operacje"
}
```

### Allowed Values

`sourceModel`:

- `AgentEventOutbox`
- `ProviderEventInbox`
- `GoogleDriveFile`
- `ExternalContainerMapping`
- `ExternalFieldMapping`
- `Approval`
- `Risk`
- `Task`
- `Event`

`targetDepartmentKey`:

- `00-ogolny`
- `01-strategia`
- `02-produkt`
- `03-sprzedaz`
- `04-operacje`
- `05-relacje`
- `06-kadry`
- `07-finanse`
- `08-zasoby`
- `09-technologia`
- `10-prawo`
- `11-innowacje`
- `12-zarzadzanie`

`classification`:

- `needs_classification`
- `route_to_department`
- `needs_owner_decision`
- `create_task`
- `request_approval`
- `archive_learning`
- `needs_source_fix`
- `defer`

`riskLevel`:

- `low`
- `medium`
- `high`
- `critical`

## Response Shape

```json
{
  "proposal": {
    "id": "decision-or-event-id",
    "sourceModel": "AgentEventOutbox",
    "sourceId": "event-uuid",
    "targetDepartmentKey": "04-operacje",
    "classification": "route_to_department",
    "status": "proposed",
    "riskLevel": "medium",
    "createdAt": "2026-05-16T12:00:00.000Z"
  },
  "effects": {
    "sourceMutated": false,
    "agentEventAcknowledged": false,
    "providerStateMutated": false,
    "taskDraftCreated": true,
    "ownerDecisionRequested": true,
    "auditRecorded": true
  },
  "blockedActions": [
    {
      "action": "ack",
      "reason": "Use POST /v1/agent-events/:id/ack only after the owner or assigned department handles the item."
    }
  ]
}
```

## Status Vocabulary For Future UI

- `needs_classification`
- `ready_to_route`
- `needs_owner_decision`
- `blocked`
- `routed`
- `deferred`
- `converted_to_task`
- `requires_command_contract`

The first implementation may calculate status from proposal evidence rather
than adding a new persisted status field.

## Guardrails

- The route is workspace-scoped and must verify that `sourceId` belongs to the
  authenticated workspace.
- The source lookup must be allowlisted by `sourceModel`; no arbitrary model
  names or table names are accepted.
- `targetDepartmentKey` must be one of the canonical Company Atlas department
  keys.
- Idempotency must use workspace, source model, source id, target department,
  classification, and `idempotencyKey` when provided.
- Paperclip or any service key may propose only through its scoped capability;
  owner-only actions remain owner-only.
- The command must return stable fail-closed errors for unsupported source,
  missing workspace ownership, high-risk action attempts, duplicate proposals,
  and invalid department keys.
- Existing source-specific routes remain authoritative:
  - agent event acknowledgement stays under `POST /v1/agent-events/:id/ack`;
  - provider replay stays under provider-specific retry/replay routes;
  - approval decisions stay under Company OS approval routes;
  - Drive or provider scope changes stay under their existing guarded routes.
- Finance, legal, ads, payment, invoice, discount, and provider-write actions
  cannot be executed by this command.

## Recommended Persistence Reuse

The first safe implementation should avoid a migration if current tables can
store enough evidence.

Preferred order:

1. `Decision` or `DecisionLog` for route/classification proposal memory.
2. `Event` for observable intake command evidence.
3. `Task` only when `createTaskDraft=true`, with clear source metadata and no
   hidden execution.
4. `AuditLog` where the current audit helper is available for command routes.

If current tables cannot represent proposal status and idempotency cleanly,
the next implementation must stop and create a narrow schema proposal instead
of hiding state in unqueryable JSON.

## Frontend Contract

The `00 Main` panel may expose a future "Propose route" control only when:

- the item has `route_to_department` in `allowedActions`;
- the item is not already represented by an open proposal;
- the target department is explicit;
- high-risk or critical items show owner-decision copy and do not auto-route;
- the UI displays the expected effects before submission:
  source unchanged, no acknowledgement, no provider mutation, no finance/legal
  action, optional task draft only.

Required states:

- loading proposal;
- proposal created;
- duplicate proposal;
- blocked unsafe action;
- source no longer available;
- unsupported source model;
- validation error with user-language recovery.

## Paperclip / Agent Contract

Paperclip can use this command only to propose routing or owner decisions. It
cannot use it to complete work, approve work, hide events, retry providers, or
change commercial state.

Agent payloads should include:

- source item reference;
- target department;
- concise reason;
- risk level;
- evidence summary;
- proposed next action;
- confidence and uncertainty;
- explicit statement when owner approval is needed.

## DMS-00-006 Implementation Handoff

The next backend/frontend slice should be:

> Implement `POST /v1/intake/actions/propose-route` as an audited proposal
> command that validates the source item and department, creates proposal
> evidence, optionally creates an owner follow-up task, and leaves all source
> systems unchanged.

Acceptance criteria for DMS-00-006:

- API tests prove workspace isolation, source allowlist, canonical department
  validation, idempotency, duplicate handling, and fail-closed high-risk
  attempts.
- Read-only `GET /v1/intake` still mutates nothing.
- The command does not acknowledge agent events, retry providers, approve
  approvals, update provider scope, invoice, discount, delete, or mutate
  external state.
- Web proof shows the owner can create or see a route proposal from `00 Main`
  without confusing it with final execution.
- MCP/service-key access is scoped and supervised according to existing agent
  profiles.

## Acceptance Criteria

- The first safe classify/route command layer is documented with endpoint,
  payload, response, status, guardrails, persistence reuse, frontend states,
  and Paperclip boundaries.
- The contract explicitly blocks acknowledge, approval, provider-write,
  invoice, discount, delete, legal, and ads behavior.
- DMS-00-006 has a clear implementation handoff.
- Source-of-truth planning and confidence files reference this contract.

## Definition Of Done

- Source review completed for current intake route and command-shaped
  CompanyCore patterns.
- This contract is committed as source-of-truth planning.
- Active queues move DMS-00-005 to done and add DMS-00-006 as the next
  implementation candidate.
- `git diff --check` passes.

## Result Report

- Defined `POST /v1/intake/actions/propose-route` as the first safe future
  command.
- Selected proposal evidence, optional owner follow-up task, and no source
  mutation as the first implementation shape.
- Kept all high-risk actions out of the intake command.
- Validation: `git diff --check`.
