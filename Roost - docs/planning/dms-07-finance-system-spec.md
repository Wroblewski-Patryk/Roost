# DMS-07-001 Finance System Spec

Last updated: 2026-05-16

Runtime update: DMS-07-002 now implements the protected read-only
`GET /v1/finance/context` endpoint described in this spec. The route remains
read-only and blocks active pricing, quote, discount, invoice, and payment
writes.

## Purpose

This spec defines the first safe V1 target for the `07 Finance And Billing
Management System`.

It converts the completed pricing and discount inventory into a Finance system
contract for web, backend read models, and Paperclip consumption before any
invoice, payment, discount, or autonomous pricing write exists.

Primary source:

- `docs/planning/dms-money-pricing-discount-source-inventory.md`

Architecture sources:

- `docs/architecture/department-management-systems-v1-blueprint.md`
- `docs/architecture/department-management-systems-architecture.md`
- `docs/architecture/companycore-global-business-flow.md`
- `docs/architecture/companycore-business-module-map.md`

## System Role

`07 Finance And Billing` captures delivered value and turns it into safe,
evidence-backed pricing, invoice-readiness, payment follow-up, margin learning,
and commercial closure.

The system answers:

> Which work needs price context, discount review, invoice readiness, payment
> follow-up, margin review, or owner approval before the company can close
> financial value safely?

## V1 Operating Principles

| Principle | Rule |
| --- | --- |
| Read before write | Finance V1 starts with read-only context. No invoice, payment, or discount write is approved by this spec. |
| Source confidence first | Price facts must keep source references, confidence, market, currency, and conflict state. |
| Candidate versus active | Conflicting price models stay visible as candidates until an owner decision marks one active. |
| Full value still matters | A `100%` discount must preserve original value, discount amount, final value, reason, approval, and learning context. |
| Agent proposals only | Paperclip may draft pricing analysis and missing-data tasks; it cannot choose final terms or execute commercial actions. |
| Finance is cross-department | Sales owns opportunity context, Product/Delivery owns delivery evidence, Relationships owns client context, Finance owns commercial closure, Legal/Standards owns contract and authority guardrails. |

## Management Board

The V1 Finance board should use the shared department shell and show these
zones.

| Zone | Component group | Purpose | Data sources |
| --- | --- | --- | --- |
| Finance command brief | Priority, blocker, next owner decision, agent-safe suggestion | Tell the owner what needs finance attention now. | finance read model, intake, approvals, risks, tasks |
| Price policy board | Candidate and active pricing models | Compare `499 CHF/month`, `1500 CHF setup + 150 CHF/month`, pure subscription analysis, and historical PLN prices without flattening conflicts. | pricing sources, decisions, Drive files, notes |
| Hourly value board | Labor value and cost assumptions | Show owner/human/agent hourly value, cost assumptions, capacity impact, and missing confirmation. | pricing inventory, People/Agents future packet, tasks |
| Work valuation board | Service/work estimate context | Connect deals, tasks, accepted work, effort assumptions, source evidence, and draft valuation. | clients, deals, tasks, resources, Drive files |
| Discount and exception review | Discounts, pro-bono work, and owner-approved commercial exceptions | Represent `100%` discounts as real commercial facts, not missing revenue. | approvals, decisions, deals, tasks, risks |
| Invoice readiness queue | Work that may become invoice-ready later | Show missing acceptance, missing price policy, missing client details, missing approval, or missing legal review. | deals, tasks, acceptance evidence, approvals |
| Payment and receivables context | Payment status and follow-up tasks when available | Track unpaid/overdue/follow-up context only after source exists. | tasks, notes, future invoice/payment read model |
| Finance risk rail | Commercial, legal, tax, margin, source, and agent-authority risks | Keep unsafe actions visible and blocked until contracts exist. | risks, controls, standards, audit |

## First Safe Web Shape

Route:

```text
/areas?area=07-finanse&view=overview
```

Initial V1 behavior:

- render inside `DepartmentManagementShell`;
- keep `DepartmentSubsystemRegistry` visible;
- add a future `FinanceManagementBoard` only after DMS-07-002 provides a
  backend read model or a documented no-migration derived packet;
- show honest empty and blocked states if price sources, client links, or
  invoice evidence are missing;
- link risky actions to planning or approval tasks, not direct financial
  mutation.

Expected visible states:

| State | Requirement |
| --- | --- |
| Loading | Local to the Finance board. |
| Empty | Explain which source is missing: active price policy, hourly value, client/deal, accepted work, discount approval, invoice resource, or payment evidence. |
| Conflict | Show candidate pricing models side by side and mark `needs_owner_decision`. |
| Blocked | Explain why invoice, payment, discount, or final quote is blocked. |
| Ready for review | Show proposed valuation/exception packet and the owner decision needed. |
| Verified source | Show source document, decision, approval, or imported record evidence. |

## Backend Read Model Target

DMS-07-002 should implement a protected read-only finance context. The preferred
route is:

```text
GET /v1/finance/context
```

An area-scoped alias may be added later through the department packet route, but
the finance domain packet should remain finance-owned.

### Query Parameters

| Parameter | Meaning |
| --- | --- |
| `clientId` | Optional client filter. |
| `dealId` | Optional deal/opportunity filter. |
| `market` | Optional market filter such as `CH`, `PL`, `internal`, or `archive`. |
| `status` | Optional status filter: `candidate`, `active`, `archived`, `needs_owner_decision`. |
| `includeArchived` | Optional boolean for archived/historical pricing context. |

### Response Shape

```json
{
  "summary": {
    "candidatePricingModels": 0,
    "activePricingModels": 0,
    "needsOwnerDecision": 0,
    "openCommercialExceptions": 0,
    "invoiceReadinessBlocked": 0,
    "highRiskItems": 0
  },
  "pricingModels": [],
  "hourlyValueAssumptions": [],
  "workValuations": [],
  "commercialExceptions": [],
  "invoiceReadiness": [],
  "paymentContext": [],
  "risks": [],
  "sourceConflicts": [],
  "agentPacket": {}
}
```

### `pricingModels[]`

| Field | Meaning |
| --- | --- |
| `id` | Stable packet identifier. Can be source-derived before a persisted model exists. |
| `name` | Owner-facing policy name. |
| `market` | `CH`, `PL`, `internal`, `archive`, or another explicit market. |
| `currency` | Explicit currency, for example `CHF` or `PLN`. |
| `setupFee` | One-time setup amount when applicable. |
| `recurringFee` | Monthly recurring amount when applicable. |
| `minimumTermMonths` | Minimum term if source-backed. |
| `hourlyValue` | Optional hourly value assumption. |
| `cogsAssumptions` | Build, maintenance, infra, tools, and support buffer assumptions. |
| `status` | `candidate`, `active`, `archived`, `needs_owner_decision`. |
| `sourceRefs` | Drive file, note, decision, approval, or imported provider evidence. |
| `riskFlags` | Missing source, conflicting source, legal review, margin risk, discount risk. |
| `ownerDecisionNeeded` | Whether the owner must choose or approve before use. |

### `hourlyValueAssumptions[]`

| Field | Meaning |
| --- | --- |
| `id` | Stable assumption identifier. |
| `roleOrUnit` | Owner, human role, AI agent unit, or generic delivery role. |
| `valuePerHour` | Commercial value per hour. |
| `costPerHour` | Internal cost per hour when known. |
| `currency` | Currency. |
| `sourceRefs` | Evidence for the assumption. |
| `status` | `candidate`, `active`, `needs_owner_decision`, `archived`. |
| `capacityImpact` | Future link to People/Agents capacity when available. |

### `workValuations[]`

| Field | Meaning |
| --- | --- |
| `id` | Stable valuation identifier. |
| `clientId` | Linked client when known. |
| `dealId` | Linked deal/opportunity when known. |
| `taskIds` | Work items contributing to the value. |
| `acceptedEvidenceRefs` | Acceptance or delivery evidence. |
| `pricingModelId` | Candidate/active pricing model used for context. |
| `estimatedHours` | Effort estimate. |
| `grossValue` | Value before discount. |
| `discountValue` | Discount amount if known. |
| `finalValue` | Value after discount. |
| `readinessStatus` | `needs_scope`, `needs_price_policy`, `needs_acceptance`, `needs_owner_approval`, `ready_for_invoice_review`, `blocked`. |

### `commercialExceptions[]`

| Field | Meaning |
| --- | --- |
| `id` | Stable exception identifier. |
| `exceptionType` | `discount`, `pro_bono`, `goodwill`, `portfolio`, `recovery`, `trial`, `strategic`. |
| `discountPercent` | Supports `100`. |
| `grossValue` | Value before exception. |
| `finalValue` | Value after exception. |
| `reason` | Owner-facing reason. |
| `clientId` | Linked client. |
| `dealId` | Linked deal. |
| `taskIds` | Linked work. |
| `approvalId` | Owner approval reference when present. |
| `riskFlags` | Missing reason, missing approval, margin risk, legal review, invoice clarity. |
| `status` | `proposed`, `approved`, `rejected`, `needs_owner_decision`, `archived`. |

### `invoiceReadiness[]`

| Field | Meaning |
| --- | --- |
| `id` | Stable readiness identifier. |
| `clientId` | Linked client. |
| `dealId` | Linked deal. |
| `workValuationId` | Linked valuation. |
| `readinessStatus` | `blocked`, `needs_acceptance`, `needs_client_data`, `needs_price_policy`, `needs_exception_approval`, `ready_for_draft_review`, `draft_resource_present`. |
| `missingEvidence` | Exact missing facts before invoice review. |
| `blockedActions` | Always includes invoice/payment send until a future command contract exists. |

### `agentPacket`

Paperclip and other agents may receive:

- pricing candidates and conflicts;
- hourly-value assumptions;
- missing source facts;
- work valuation gaps;
- commercial exception proposals;
- invoice-readiness blockers;
- safe suggested tasks;
- required owner decisions.

Agents must not receive:

- provider payment credentials;
- raw invoice send authority;
- tax/legal finalization authority;
- authority to choose final pricing policy;
- authority to apply discounts;
- authority to mark payment complete.

## Current Source Interpretation

| Source fact | Finance interpretation | Status |
| --- | --- | --- |
| `499 CHF/month` Start subscription | Candidate strategic active policy from business plan. | needs owner decision against hybrid model |
| `1500 CHF setup + 150 CHF/month` | Candidate hybrid policy from benchmark analysis. | needs owner decision against Start model |
| `150 CHF/month` pure subscription | Analysis-only model with long BEP risk. | candidate or archived analysis |
| `150 CHF/hour` | Candidate hourly value assumption. | needs owner confirmation |
| `3000 CHF` build I-COGS | Candidate cost/value assumption. | needs owner confirmation |
| `50 CHF/month` maintenance COGS | Candidate recurring cost assumption. | needs owner confirmation |
| `1700/2200 PLN` historical prices | Archive/current-client evidence for PL context only. | not canonical Swiss pricing |
| `100%` current-client discount | Commercial exception requiring owner approval and learning loop. | required in DMS-03-005 and future DMS-07-002 |

## Owner Decisions Needed

| Decision ID | Question | Safe default |
| --- | --- | --- |
| FIN-DEC-001 | Which first canonical offer is active: `499 CHF/month` Start or `1500 CHF setup + 150 CHF/month` hybrid? | Keep both as candidates and block autonomous quoting. |
| FIN-DEC-002 | Is `150 CHF/hour` the owner/human delivery value, the agent value, or only a strategy-analysis assumption? | Store as candidate hourly-value assumption. |
| FIN-DEC-003 | How should historical PLN projects influence current offers? | Treat as archive learning and PL market evidence, not CH price policy. |
| FIN-DEC-004 | What is the reason category for the current-client `100%` discount? | Create proposed commercial exception and require owner approval before invoice-readiness. |
| FIN-DEC-005 | Which legal/tax/invoice provider will eventually issue documents? | No provider write until invoice/payment command contract exists. |

## Allowed Actions In V1

Before invoice/payment command contracts exist, Finance may only support:

- read pricing context;
- read source conflicts;
- read hourly-value assumptions;
- read deal/client/work valuation context;
- read commercial exception context;
- create or route follow-up tasks through existing safe task contracts;
- request owner decisions or approvals through existing approval patterns when
  a scoped command contract explicitly allows it later;
- expose safe read packets to Paperclip.

## Blocked Actions

This spec explicitly blocks:

- sending invoices;
- exporting final invoice documents;
- marking payment paid or overdue as a financial authority action;
- applying discounts;
- changing active price policy;
- quoting a binding offer;
- mutating legal terms;
- creating payment-provider records;
- giving Paperclip autonomous pricing, discount, invoice, or payment authority.

## Security And Audit Requirements

Finance data is high impact because it affects money, contracts, tax, client
promises, and agent authority.

Future DMS-07-002 implementation must include:

- owner-authenticated workspace isolation;
- read-only route capability such as `finance:read`;
- no destructive tools in the MCP manifest for the read model;
- source references for every pricing or valuation claim;
- stable blocked-action metadata for unsafe actions;
- tests proving read-only access does not mutate deals, approvals, tasks,
  provider records, or agent events;
- fail-closed behavior when source references are missing or conflicting.

Future DMS-07-004 invoice/payment command contract must additionally include:

- legal/tax review boundary;
- provider credential boundary;
- approval and audit requirements;
- idempotency;
- rollback/reversal story;
- adversarial AI checks;
- payment-provider failure handling;
- explicit owner confirmation for send/export/mark-paid actions.

## Relationship To Other Departments

| Department | Finance dependency |
| --- | --- |
| `00 Main` | Intake routes pricing, discount, invoice, and payment-risk items into Finance/Sales review. |
| `01 Strategy` | Chooses commercial policy direction and revenue targets. |
| `02 Product And Delivery` | Provides scope, delivery evidence, acceptance, and artifact proof. |
| `03 Sales` | Owns leads, discovery, offers, discount context, and deal pipeline. |
| `04 Operations` | Provides planning, effort, routines, and delivery process evidence. |
| `05 Relationships` | Provides client identity, archive history, support context, and feedback. |
| `06 People/Agents And Roles` | Provides capacity and hourly-value assumptions for humans and agents. |
| `08 Assets And Resources` | Provides Drive files, price lists, proposals, invoice resources, and source freshness. |
| `09 Technology And AI` | Provides integration and MCP safety context. |
| `10 Legal, Standards, And Decisions` | Provides terms, policies, approvals, and risk controls. |
| `11 Innovation And Growth` | Feeds pricing, offer, and process improvements from feedback and archived clients. |
| `12 Executive` | Owns final owner-level financial approvals and commercial tradeoffs. |

## DMS-07-002 Implementation Handoff

First backend slice:

1. Implement protected read-only `GET /v1/finance/context`.
2. Derive candidate pricing models from the existing inventory and available
   CompanyCore records without creating finance write tables yet, or document
   the exact migration if a persisted read source is unavoidable.
3. Include hardcoded source facts only if they are represented as source-backed
   candidate records with source IDs from this inventory, not fake runtime
   business data.
4. Return explicit `needs_owner_decision` and blocked-action metadata.
5. Add API tests for auth, workspace isolation, read-only behavior, source
   conflict shape, `100%` commercial exception support, and MCP manifest
   exposure if exposed.
6. Update docs, requirement matrix, risk register, and module confidence.

First web slice after backend:

1. Render `FinanceManagementBoard` in
   `/areas?area=07-finanse&view=overview`.
2. Show price-policy conflicts, hourly assumptions, exception queue, and
   invoice-readiness blockers.
3. Show no direct invoice, payment, discount, or quote-write controls.
4. Run desktop/mobile Playwright proof with no overflow and no console errors.

## Acceptance Criteria For DMS-07-002

- The owner can see candidate pricing models and their conflict state.
- The owner can see the `150 CHF/hour` assumption as candidate, not final.
- The owner can see `100%` discount as a commercial exception packet.
- Paperclip can read the same packet safely.
- The API is read-only and workspace-scoped.
- Blocked actions clearly prevent invoice/payment/discount autonomy.
- Missing source facts are visible rather than silently defaulted.

## Validation For This Spec

- Source review of
  `docs/planning/dms-money-pricing-discount-source-inventory.md`.
- Source review of
  `docs/architecture/department-management-systems-v1-blueprint.md`.
- Code/source search for current Finance route labels and high-risk intake
  blockers.
- `git diff --check`.
