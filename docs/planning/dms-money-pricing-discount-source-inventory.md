# DMS-MONEY-001 Pricing And Discount Source Inventory

Last updated: 2026-05-16

## Purpose

This inventory turns scattered pricing, service, discount, current-client, and
archived-client evidence into a safe implementation handoff for the Sales,
Relationships, Finance, and Innovation department systems.

It supports these V1 goals:

- `03 Sales`: leads, discovery, offers, pricing context, discounts, and current
  client work.
- `05 Relationships`: active and archived clients, interaction history,
  support, and learning.
- `07 Finance And Billing`: price list, hourly value, estimates, discounts,
  invoice readiness, payment context, and commercial exceptions.
- `11 Innovation And Growth`: feedback and archived-client lessons that update
  standards, offers, and processes.

This document is intentionally read-only. It does not approve autonomous
pricing, invoice/payment writes, or provider mutations.

## Reviewed Sources

| ID | Source | Location | Evidence found | Confidence | Next action |
| --- | --- | --- | --- | --- | --- |
| SRC-MONEY-001 | Google Drive `Business plan` | `https://docs.google.com/document/d/1P_oxlgK9ur88HEUpkGEZNcdO9X-J_rNyAKgwzCCdXcU` | Swiss SME target, Super KPI `5000 CHF net profit/month`, target `12` subscription clients, target MRR `5988 CHF/month`, close rate `25%`, mandatory Start subscription `499 CHF/month`, OPEX about `71 CHF/month`, gross margin about `428 CHF/client`, 2-week delivery SOP, weekly backup, restore within 4 hours after server failure report, 12-month minimum contract, copyright transfer after 12 paid months, suspension after 14 days overdue. | high | Treat as current strategic business-plan source until owner supersedes it. |
| SRC-MONEY-002 | Google Drive pricing benchmark `Analiza Rentownosci i Benchmarking Cen Rynkowych...` | `https://docs.google.com/document/d/1wY1iqrNYKVJgiARskLSDlJ92QCZ0pnb2DMZGigMqwDk` | Swiss one-off web benchmark `2000-3500 CHF`, internal hourly value about `150 CHF/hour`, build I-COGS reference `3000 CHF`, M-COGS `50 CHF/month`, subscription `150 CHF/month`, margin after M-COGS `100 CHF/month`, pure subscription BEP `30-45` months, recommended hybrid model `1500 CHF setup + 150 CHF/month`, 12-month minimum, hybrid BEP `15` months. | high | Treat as pricing strategy analysis and conflict source against `499 CHF/month`. |
| SRC-MONEY-003 | Google Drive `2. Zalozenia` | `https://docs.google.com/document/d/1UFOv3oSVzoBLI6wyiyoqL0KfMUFIBaxzpvzgsL8Ri_I` | Older/current Polish website project assumptions: WordPress site, OVH hosting `130 PLN/year`, domain first year `10 PLN` with hosting/free, later `50 PLN/year`, option 1 plus business cards `2200 PLN`, option 2 plus business cards `1700 PLN`, target delivery by end of July 2025 or latest end of August 2025. | high for historical project, medium for current pricing | Import as archived/current-client evidence, not as canonical Swiss price policy. |
| SRC-MONEY-004 | Google Drive `Plan na start biznesu.docx` search result | `https://drive.google.com/file/d/1xq7xDtIyOm0jkzrCmfZ_G45tukg2qBVx` | Search snippet references `Offer - Services - PL`, Start/Standard/Premium packages, current projects `Adzi & Noxon`, `Ceramika Sparrow (DropAdzi)`, and a Human spreadsheet. | medium | Fetch/export later if needed; use as pointer to offer and archived-client sources. |
| SRC-MONEY-005 | Google Drive `Offer - Services - PL` pointer | `https://docs.google.com/document/d/1m6Iig6D4GESfDNI9hvIbsGPuVkOWQY8xmfpUhNSP5oo` | Search result says it contains service packages and detailed net price list. Direct fetch returned Google Drive `404 File not found` for this connector session. | low until accessible | Owner or connector must expose this document before Finance can treat it as source of truth. |
| SRC-MONEY-006 | ClickUp sources | Not directly accessible in this session | The repo has ClickUp adapter, imported task foundations, provider mappings, and tests. Tool discovery did not expose a callable ClickUp search/read tool in this session, so external ClickUp pricing/tasks were not inspected. | blocked | Use CompanyCore imported ClickUp data first; direct ClickUp inventory needs a callable connector/tool or owner export. |
| SRC-MONEY-007 | Current user context | Conversation 2026-05-16 | One current client will receive work with a final 100 percent discount. Old clients should be imported as archive evidence. | accepted user input, missing record details | Create current-client capture flow with explicit `100%` commercial exception and owner approval before invoice/discount writes. |

## Extracted Pricing Facts

| Fact ID | Value | Source | Department owner | Status |
| --- | --- | --- | --- | --- |
| PRICE-001 | Start subscription `499 CHF/month` | SRC-MONEY-001 | `07 Finance`, `03 Sales` | accepted as strategic source, conflicts with PRICE-002 |
| PRICE-002 | Hybrid model `1500 CHF setup + 150 CHF/month`, 12-month minimum | SRC-MONEY-002 | `07 Finance`, `03 Sales`, `10 Legal` | strategy analysis, needs owner decision against PRICE-001 |
| PRICE-003 | Pure subscription `150 CHF/month`, 36-month minimum, BEP `30-45` months | SRC-MONEY-002 | `07 Finance`, `10 Legal` | analysis only, likely not first offer because of BEP risk |
| PRICE-004 | Swiss benchmark one-off website `2000-3500 CHF` | SRC-MONEY-002 | `03 Sales`, `07 Finance` | benchmark input |
| PRICE-005 | Internal hourly value about `150 CHF/hour` | SRC-MONEY-002 | `07 Finance`, `06 People/Agents`, `04 Operations` | planning assumption, needs owner confirmation for labor-rate table |
| PRICE-006 | Build I-COGS reference `3000 CHF` | SRC-MONEY-002 | `07 Finance`, `04 Operations` | planning assumption |
| PRICE-007 | Maintenance COGS `50 CHF/month`, split `25 CHF` infra/licensing and `25 CHF` intervention buffer | SRC-MONEY-002 | `07 Finance`, `08 Assets`, `09 Technology/AI` | planning assumption |
| PRICE-008 | OPEX about `71 CHF/month` for tools/infrastructure | SRC-MONEY-001 | `07 Finance`, `12 Executive` | strategic assumption |
| PRICE-009 | Older project option 1 `2200 PLN`, option 2 `1700 PLN` | SRC-MONEY-003 | `03 Sales`, `05 Relationships` | archive/current project evidence, not canonical V1 price policy |
| PRICE-010 | OVH hosting `130 PLN/year`, domain `10 PLN` first year with hosting/free and `50 PLN/year` later | SRC-MONEY-003 | `08 Assets`, `07 Finance` | historical cost evidence |

## Conflicts And Owner Decisions Needed

| Decision ID | Conflict | Why it matters | Safe default before decision |
| --- | --- | --- | --- |
| MONEY-DEC-001 | `499 CHF/month` Start subscription vs `150 CHF/month + 1500 CHF setup` hybrid offer | Sales, finance forecasts, legal minimum terms, and invoice readiness depend on one canonical package policy. | Store both as candidate pricing models. Do not let agents quote autonomously. |
| MONEY-DEC-002 | 12-month minimum in `Business plan` and hybrid model vs 36-month minimum in pure subscription model | Contract term changes risk and customer promise. | Treat 12 months as the current default only for the hybrid or `499 CHF/month` Start policy; keep pure subscription as analysis only. |
| MONEY-DEC-003 | Polish PLN project prices vs Swiss CHF pricing | Historical client work cannot be used as Swiss pricing without market/context classification. | Import PLN projects as archive/client evidence and learning data, not as canonical price list. |
| MONEY-DEC-004 | Current client with `100%` discount | A zero-revenue invoice or free work still consumes capacity and should improve process learning. | Model as a commercial exception with owner approval, reason, linked client/deal/work, and final invoice/discount readiness later. |
| MONEY-DEC-005 | `Offer - Services - PL` inaccessible | It may contain the detailed package source the owner expects. | Mark Finance read model incomplete until the document is accessible or replaced by a canonical CompanyCore price list. |

## Current CompanyCore Reuse

| Need | Current foundation | Fit | Gap |
| --- | --- | --- | --- |
| Clients | `Client`, `/v1/clients` | Can hold active and archived client records. | No dedicated archive-learning classification or client source-quality state. |
| Deals/offers | `Deal`, `/v1/deals` with `value`, `currency`, `status`, `clientId`, `pipelineStageId` | Can hold simple opportunity value and currency. | No service line items, price model, discount, quote, estimate, tax, invoice, or approval link. |
| Notes | `Note` linked to client, deal, task, project | Can hold imported pricing notes and archive context. | Not enough for canonical pricing policy by itself. |
| Interactions | `Interaction` linked to client | Can hold discovery, offer, follow-up, support history. | No typed sales-stage or finance-readiness semantics. |
| Intake | `GET /v1/intake` and `intake:read` | Can surface Paperclip pricing/discount proposals and high-risk finance approvals. | No classify/route write contract yet. |
| Approvals | `Approval` with `requestedForAction`, `resourceType`, `riskLevel` | Can represent high-risk discount/invoice requests. | No approved discount command or invoice-readiness command. |
| Risks | `Risk` | Can track finance/legal risk. | Needs department-specific read model and decision link. |
| Drive files | `GoogleDriveFile` plus Drive connector | Can point to pricing/business-plan/client source docs. | Needs source classification and import packet. |
| ClickUp | Integration settings, provider mappings, task sync, webhook inbox | Can provide task/project evidence after import. | Direct ClickUp source review was blocked in this session. |

## Backend Gaps For V1 Finance/Sales

| Gap ID | Proposed concept | Purpose | First safe implementation |
| --- | --- | --- | --- |
| MONEY-GAP-001 | `ServiceOffer` or service catalog read model | Canonical list of services/packages and included deliverables. | Read-only derived packet from accepted docs and owner-created records. |
| MONEY-GAP-002 | `PricingModel` | Store candidate and active pricing policies with currency, setup fee, recurring fee, minimum term, source, and status. | Read-only API first; write only through owner approval. |
| MONEY-GAP-003 | `LaborRate` | Represent owner/human/agent hourly value, cost, capacity, and margin assumptions. | Planning table/read model after owner confirms rate policy. |
| MONEY-GAP-004 | `Estimate` | Convert scope and labor assumptions into a proposed effort/value model. | Draft-only estimate with no invoice/payment authority. |
| MONEY-GAP-005 | `DiscountPolicy` and `CommercialException` | Represent discounts, including `100%`, with reason, owner approval, linked client/deal, and risk. | Read model plus approval contract before any invoice output. |
| MONEY-GAP-006 | `InvoiceDraft` / invoice readiness | Prepare invoice context without issuing payment documents. | Command contract and security/legal review before implementation. |
| MONEY-GAP-007 | `ClientArchiveImport` | Import old clients/projects as learning evidence. | Source audit and classification flow before bulk import. |
| MONEY-GAP-008 | `PricingSource` | Track Drive/ClickUp/manual source, confidence, extracted facts, conflicts, and owner decision. | Could start as read-only file-backed inventory, then migrate if needed. |

## Minimal Future Data Packet

Future Finance/Sales read models should provide this normalized packet to web
and Paperclip:

| Field | Meaning |
| --- | --- |
| `serviceOfferId` | Stable service/package identifier. |
| `name` | Owner-facing package or service name. |
| `market` | Example: `CH`, `PL`, `internal`, `archive`. |
| `currency` | `CHF`, `PLN`, or another explicit currency. |
| `setupFee` | One-time setup/build amount when applicable. |
| `recurringFee` | Monthly recurring amount when applicable. |
| `minimumTermMonths` | Required minimum contract duration. |
| `includedScope` | Included deliverables and support boundaries. |
| `laborRateAssumptions` | Hourly value/cost assumptions and source. |
| `cogsAssumptions` | Build cost, maintenance cost, infra, tools, support buffer. |
| `sourceRefs` | Drive file, note, decision, or imported provider evidence. |
| `status` | `candidate`, `active`, `archived`, `needs_owner_decision`. |
| `riskFlags` | Missing source, conflict, legal review, finance review, discount risk. |

## Current Client And 100 Percent Discount Rule

The current-client work mentioned by the owner should become a first-class
case, even if final invoice value is zero.

Minimum record set before implementation:

| Record | Requirement |
| --- | --- |
| Client | Real client name, company/contact if available, source, status. |
| Work item | Task/project/deal describing tomorrow's work, expected effort, due date, and evidence. |
| Commercial exception | Discount `100%`, reason, owner approval, and whether it is portfolio, goodwill, recovery, trial, or strategic work. |
| Invoice readiness | Future invoice should show full value, discount amount, final amount `0`, currency, and approval evidence before export. |
| Learning loop | After delivery, feedback/retro should update offer, SOP, estimate accuracy, and archive evidence. |

Agents may propose this packet, but the owner must approve the client identity,
discount reason, and any invoice/export action.

## Archived Client Learning Candidates

| Candidate | Evidence | Use |
| --- | --- | --- |
| Adzi / DropAdzi / Ceramika Sparrow | `Plan na start biznesu.docx` search snippet references current projects and Ceramika Sparrow. `REGULAMIN_CERAMIKAS` search result exists. | Archive project/client history, delivery lessons, legal/store terms, support context. |
| Noxon | `Plan na start biznesu.docx` search snippet references Noxon logo/identity/site. | Archive design/site delivery evidence. |
| Irena Musialkiewicz / psychologist site | `2. Zalozenia` includes domain suggestion `irenamusialkiewicz.pl`, scope, options, costs, deadline. | Archive/current project pricing and delivery assumptions. |
| Older Drive/ClickUp clients | User requested old clients as archive. | Needs dedicated `DMS-05-002` archive client data source audit. |

## Paperclip Guardrails

Paperclip may:

- read this inventory;
- propose missing pricing-source tasks;
- propose current-client capture records;
- propose archive-client import candidates;
- flag conflicts and ask for owner decisions;
- draft an estimate or discount packet for owner review.

Paperclip must not:

- choose between conflicting price models autonomously;
- apply a discount;
- issue or send an invoice;
- mutate payment, legal, ClickUp, Drive, or provider state;
- treat PLN historical prices as Swiss canonical pricing;
- treat a missing source as approval.

## Next Implementation Tasks

| Task ID | Title | Output |
| --- | --- | --- |
| DMS-07-001 | Finance system spec | Detailed Finance board and backend read-model spec from this inventory. |
| DMS-03-002 | Audit CRM/deal/interaction/pricing sources | Map current CompanyCore CRM data plus imported provider evidence into Sales. |
| DMS-03-005 | Discount/commercial exception read model | Represent `100%` discounts and other exceptions without invoice writes. |
| DMS-03-006 | Current client work capture flow | Add/classify current client work with discount context and owner approval. |
| DMS-05-002 | Archive client data source audit | Locate and classify old clients from Drive, ClickUp imports, and CompanyCore. |
| DMS-07-002 | Price-list and hourly-value read model | Expose accepted/candidate pricing context to Finance web and Paperclip. |

## Validation

- Google Drive connector search/fetch reviewed the named sources above.
- Repo source review confirmed current Client, Deal, Note, Interaction,
  Intake, Approval, Risk, Drive, and ClickUp adapter foundations.
- ClickUp direct source review is blocked because no callable ClickUp
  search/read tool was exposed in this session.
- `git diff --check` passed for this documentation-only change.
