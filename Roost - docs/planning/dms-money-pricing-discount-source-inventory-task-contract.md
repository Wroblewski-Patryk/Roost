# DMS-MONEY-001 Pricing And Discount Source Inventory Task Contract

## Task Type

Research / product architecture / backend planning.

## Current Stage

Analysis.

## Deliverable For This Stage

An evidence-backed source inventory for pricing, hourly value, service offers,
discounts, current-client work, archived-client learning, and backend gaps
before Sales or Finance write behavior is implemented.

## Goal

Consolidate the known pricing and commercial-context sources so CompanyCore can
later expose read-only Sales and Finance boards, then guarded pricing,
discount, estimate, invoice-readiness, and archived-client workflows without
letting Paperclip or other agents invent prices.

## Scope

- Add `docs/planning/dms-money-pricing-discount-source-inventory.md`.
- Review current backend foundations:
  - `prisma/schema.prisma`
  - `docs/API.md`
  - `src/tests/api.test.ts`
- Review connected Google Drive sources available through the Google Drive
  connector:
  - `Business plan`
  - `Analiza Rentownosci i Benchmarking Cen Rynkowych...`
  - `2. Zalozenia`
  - searched but inaccessible `Offer - Services - PL`
- Record connector gaps for ClickUp because the ClickUp plugin was installed
  but no callable ClickUp search/read tool was exposed in this session.
- Update source-of-truth queue and confidence files.

## Explicit Exclusions

- No Prisma migration.
- No runtime route or UI implementation.
- No invoice, payment, quote, pricing, or discount write action.
- No autonomous pricing decision.
- No Drive or ClickUp source mutation.
- No client data import yet.

## Implementation Plan

1. Inspect existing CompanyCore CRM, deal, note, interaction, intake, approval,
   and ClickUp/Drive adapter foundations.
2. Search Google Drive for pricing, service, offer, invoice, and current/old
   client evidence.
3. Fetch the strongest Drive sources and summarize only the decision-relevant
   data.
4. Classify source facts by department owner, confidence, conflict, and next
   CompanyCore action.
5. Define the minimum future read model needed before Sales/Finance runtime
   work.
6. Refresh planning queues, requirements, module confidence, delivery map,
   project state, memory index, system health, and decision memory.
7. Validate diff hygiene and commit/push.

## Acceptance Criteria

- [x] Source inventory names each reviewed source, URL, confidence, extracted
      values, and next action.
- [x] Conflicting commercial models are recorded as decision gaps, not silently
      resolved.
- [x] The 100 percent discount case is represented as a required commercial
      exception, not as missing revenue.
- [x] Current CompanyCore backend reuse and backend gaps are explicit.
- [x] ClickUp connector limitation is recorded.
- [x] Paperclip guardrails are explicit before autonomous pricing.
- [x] Source-of-truth files are refreshed.
- [x] No runtime behavior changes are made.

## Definition Of Done

- [x] `docs/planning/dms-money-pricing-discount-source-inventory.md` exists.
- [x] Active queues no longer treat DMS-MONEY-001 as unstarted.
- [x] Follow-up tasks are clear for Sales, Finance, current-client capture, and
      archived-client import/classification.
- [x] `git diff --check` passes.
- [x] Commit is pushed to the active branch.

## Result Report

Completed. The inventory identifies three pricing models that must remain
separate until the owner chooses a canonical policy:

- strategic Start subscription at `499 CHF/month`;
- benchmarked hybrid offer at `150 CHF/month + 1500 CHF setup`;
- older Polish project pricing at `1700 PLN` or `2200 PLN`.

Existing CompanyCore foundations can represent clients, deals, notes,
interactions, approvals, risks, intake rows, provider mappings, and Drive files.
They do not yet contain a first-class service catalog, labor-rate table,
pricing policy, discount policy, estimate, quote, invoice draft, payment, or
archived-client learning model. Future runtime work should start with read
models and owner-approved command contracts.
