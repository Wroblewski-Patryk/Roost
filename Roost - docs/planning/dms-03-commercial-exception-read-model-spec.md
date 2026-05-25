# DMS-03-005 Commercial Exception Read Model Spec

Last updated: 2026-05-16

## Purpose

This spec defines the first safe read model for discounts and commercial
exceptions across `03 Sales` and `07 Finance And Billing`.

It exists because a `100%` discount is not "no value". It is a commercial
decision that consumes capacity, affects margin, may need invoice clarity, and
should feed delivery and improvement learning.

Primary sources:

- `docs/planning/dms-money-pricing-discount-source-inventory.md`
- `docs/planning/dms-07-finance-system-spec.md`
- `docs/architecture/department-management-systems-v1-blueprint.md`

## System Role

`03 Sales` owns commercial exception context before offer and deal closure:
what is being discounted, why, for whom, and what owner decision is needed.

`07 Finance` owns how the exception affects value, invoice readiness, margin,
and financial closure.

The shared question is:

> Which client, deal, or work item has a discount or pro-bono exception that
> must be reviewed, approved, priced, invoiced clearly, or learned from?

## V1 Read Model Target

Preferred route:

```text
GET /v1/commercial-exceptions
```

This route must be protected and read-only. It may derive rows from existing
CompanyCore data first:

- `Approval` records for discount, invoice, pricing, or commercial actions;
- `Decision` and `DecisionLog` records for owner commercial decisions;
- `Deal` records with value and currency;
- `Client` records for active or archived client context;
- `Task` records for work items and follow-up;
- `Note` and `Interaction` records for discovery or rationale;
- `Risk` records for finance/legal/margin risk;
- `AgentEventOutbox` and `GET /v1/intake` for Paperclip-created proposals;
- Drive files and imported provider records as evidence references.

The first implementation should avoid a migration unless code inspection proves
that existing records cannot represent read-only exceptions safely. A future
write model may later add a persisted `CommercialException` table, but that is
not approved by this spec.

## Query Parameters

| Parameter | Meaning |
| --- | --- |
| `clientId` | Optional client filter. |
| `dealId` | Optional deal filter. |
| `status` | Optional status filter. |
| `exceptionType` | Optional type filter, for example `discount` or `pro_bono`. |
| `includeArchived` | Include archive and learning-only items. |
| `risk` | Optional risk filter: `low`, `medium`, `high`, `critical`. |

## Response Shape

```json
{
  "summary": {
    "total": 0,
    "needsOwnerDecision": 0,
    "approved": 0,
    "missingClient": 0,
    "missingReason": 0,
    "missingGrossValue": 0,
    "invoiceReadinessBlocked": 0,
    "hundredPercentDiscounts": 0
  },
  "exceptions": [],
  "sourceConflicts": [],
  "agentPacket": {},
  "blockedActions": []
}
```

## `exceptions[]`

| Field | Meaning |
| --- | --- |
| `id` | Stable read-model identifier. |
| `sourceFamily` | `approval`, `decision`, `deal`, `task`, `note`, `interaction`, `agent_event`, `manual_candidate`. |
| `sourceId` | Original source record ID. |
| `exceptionType` | `discount`, `pro_bono`, `goodwill`, `portfolio`, `recovery`, `trial`, `strategic`, `unknown`. |
| `status` | `proposed`, `needs_owner_decision`, `approved`, `rejected`, `needs_source`, `archived`. |
| `clientId` | Linked client when known. |
| `clientName` | Safe display name when linked or inferred. |
| `dealId` | Linked deal when known. |
| `taskIds` | Linked work items when known. |
| `grossValue` | Value before discount. |
| `discountPercent` | Supports `100`. |
| `discountValue` | Monetary value of the exception when computable. |
| `finalValue` | Value after exception. |
| `currency` | Explicit currency. |
| `reason` | Owner-facing commercial rationale. |
| `reasonCategory` | `portfolio`, `goodwill`, `recovery`, `trial`, `strategic`, `relationship`, `unknown`. |
| `approvalId` | Linked approval when present. |
| `approvalStatus` | Current approval status when present. |
| `risk` | `low`, `medium`, `high`, `critical`. |
| `riskFlags` | Missing reason, missing approval, missing gross value, missing client, legal review, margin risk, invoice clarity. |
| `invoiceReadiness` | Whether future invoice review is blocked, pending, or ready for draft review. |
| `learningLoop` | Suggested follow-up after delivery or archive review. |
| `sourceRefs` | Source records, Drive files, intake rows, decisions, and audit evidence. |
| `allowedActions` | Safe actions such as create follow-up task or request owner review when a command contract exists. |
| `blockedActions` | Unsafe actions blocked by this spec. |

## Status Rules

| Status | Rule |
| --- | --- |
| `proposed` | Evidence suggests a commercial exception but owner decision is not complete. |
| `needs_owner_decision` | The exception is high impact or missing approval/reason/value. |
| `approved` | Owner approval evidence exists and source facts are sufficient for read-only display. |
| `rejected` | Owner decision rejects the exception. |
| `needs_source` | The row is incomplete because client, value, reason, or source evidence is missing. |
| `archived` | Historical exception is retained for learning, not active commercial work. |

## Current Client `100%` Discount Packet

The current-client packet must preserve full value even when final invoice
amount is zero.

Minimum fields before it can be treated as reviewed:

| Field | Requirement |
| --- | --- |
| Client | Real client identity or explicit `needs_client` status. |
| Work item | Task/deal/project/work description and expected effort. |
| Gross value | Full value before discount, even if estimated. |
| Discount percent | `100`. |
| Final value | `0` with explicit currency. |
| Reason category | One of the accepted categories or `unknown` until owner decides. |
| Owner approval | Approval/decision reference before invoice readiness. |
| Invoice clarity | Future invoice must show gross value, discount, final value, and approval evidence before export. |
| Learning loop | Post-delivery feedback or retro task. |

Safe default when details are missing:

```text
status = needs_owner_decision
invoiceReadiness = blocked
blockedActions = apply_discount, send_invoice, mark_paid, quote_final_terms
```

## Derivation Rules

The read model may infer candidates cautiously:

| Source | Derivation |
| --- | --- |
| Approval `requestedForAction` contains `discount`, `invoice.discount`, `commercial_exception`, `pro_bono`, or `quote` | Create a candidate exception with approval status and high-risk flags. |
| Decision title/body references discount or pro-bono work | Create a decision-backed exception if client/work evidence is present or mark `needs_source`. |
| Deal has value/currency and linked notes/tasks mention discount | Create a deal-backed candidate. |
| Task title/description mentions `100%`, `discount`, `free`, `pro bono`, or `gratis` | Create a task-backed candidate with `needs_owner_decision`. |
| Intake row or agent event is routed to Sales/Finance with pricing/discount context | Create proposal-only candidate; source event remains unchanged. |

The read model must not:

- invent a gross value;
- invent a client;
- turn an unapproved note into an approved discount;
- mutate source records during read;
- write invoice state;
- acknowledge agent events;
- apply discount to a deal value.

## Department Usage

| Department | Use |
| --- | --- |
| `00 Main` | Show commercial exceptions from Paperclip/intake that need routing or owner review. |
| `03 Sales` | Show discount/pro-bono context in offer and deal readiness. |
| `05 Relationships` | Connect exception reasons to relationship health, goodwill, support, archive learning, or recovery. |
| `07 Finance` | Show gross/final value, invoice-readiness blockers, margin risk, and owner approval evidence. |
| `10 Legal/Standards` | Flag missing terms, invoice clarity, or risky promises. |
| `11 Innovation/Growth` | Turn exception outcomes into offer/process improvement tasks. |
| `12 Executive` | Review high-risk or strategic commercial tradeoffs. |

## Paperclip Guardrails

Paperclip may:

- read exception packets;
- propose missing client/value/reason tasks;
- draft a reason summary for owner review;
- propose a post-delivery feedback task;
- route a candidate to Sales, Finance, Relationships, or Executive review.

Paperclip must not:

- approve an exception;
- apply a discount;
- change deal value;
- create/send an invoice;
- mark payment status;
- decide final commercial terms;
- use a note or prompt as financial authority.

## Future Implementation Plan

### DMS-03-005A Backend Read API

1. Add protected read-only `GET /v1/commercial-exceptions`.
2. Add capability `commercial-exceptions:read`.
3. Add MCP read exposure only if the response is fully source-scoped and
   blocked actions are explicit.
4. Derive candidates from approvals, decisions, deals, tasks, notes,
   interactions, risks, and intake/agent proposals.
5. Add API tests for auth, workspace isolation, no mutation on read, `100%`
   packet shape, missing-source status, and Paperclip-safe blocked actions.

### DMS-03-005B Sales/Finance Web Consumption

1. Add read-only panel to `03 Sales` or `07 Finance` after API proof.
2. Show exception cards with gross value, discount, final value, reason,
   approval status, and blockers.
3. Do not render apply/send/mark-paid controls.
4. Run desktop/mobile browser proof.

### DMS-03-006 Current Client Capture Flow

After read model proof, add a separate owner-reviewed capture flow for the
current client:

- client;
- work item;
- estimated effort;
- gross value;
- `100%` discount reason;
- owner approval;
- post-delivery feedback task.

This capture flow needs its own write contract.

## Acceptance Criteria For DMS-03-005A

- `100%` discounts are represented as commercial exceptions, not missing
  revenue.
- Read response preserves gross value, discount value, final value, currency,
  reason, owner approval, and linked work when present.
- Missing details are visible through `needs_source` or
  `needs_owner_decision`.
- The API is workspace-scoped and read-only.
- Paperclip sees blocked actions and cannot infer approval from source text.
- Invoice/payment/write actions remain blocked.

## Validation For This Spec

- Source review of the money inventory and Finance spec.
- Source review of Prisma `Client`, `Deal`, `Task`, `Approval`, `Decision`,
  `Note`, `Interaction`, and `Risk` foundations.
- `git diff --check`.
