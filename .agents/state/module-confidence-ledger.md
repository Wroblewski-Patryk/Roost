# Module Confidence Ledger

Last updated: 2026-05-11

## Purpose

This ledger is the quick reality map for companycore. It tracks whether each
important CRM/company, task, pipeline, interaction, agent, integration, and
operations journey is implemented, verified, broken, blocked, or unknown. Keep
it honest. Do not turn uncertainty into optimism.

## Status Vocabulary

- `NOT_STARTED`: no meaningful implementation exists.
- `IN_PROGRESS`: implementation is actively changing.
- `IMPLEMENTED_NOT_VERIFIED`: code exists, but current proof is missing.
- `PARTIAL`: some scenarios pass, but important scenarios are missing or stale.
- `VERIFIED`: current evidence proves the journey for the target scope.
- `BROKEN`: a reproducible defect exists.
- `BLOCKED`: verification or implementation is blocked by access, decision,
  environment, dependency, or missing input.
- `DEFERRED`: explicitly out of the current release scope.

## Confidence Rules

- `High`: fresh reproducible evidence exists for the real journey.
- `Medium`: good local proof exists, but target, edge-case, or freshness is
  incomplete.
- `Low`: evidence is missing, stale, inferred, or chat-only.

## Ledger

| ID | Module | Journey / function | Priority | Status | Confidence | Evidence | Missing proof or defect | Next smallest action | Owner | Last verified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CCORE-REL-001 | Release confidence | Release-critical CRM/company module inventory and proof map | P0 | IMPLEMENTED_NOT_VERIFIED | Low | Existing module READMEs and governance docs need current journey-level truth. | No current module-by-module proof ledger. | Inventory companies, contacts, interactions, task lists, pipeline stages, decisions, agents, integrations, and deployment journeys; replace this row with real rows. | Planning | 2026-05-11 |

## Maintenance Rules

- Update this file when a feature ships, a bug is fixed, a regression appears,
  architecture changes, validation proves a journey, or a module is deferred.
- Prefer verification tasks before fix tasks when the only problem is missing
  evidence.
- Mark a journey `VERIFIED` only when evidence is current and reproducible.
- Mark a journey `BROKEN` when a real user journey fails, even if related tests
  pass.
- Link evidence to test names, commands, screenshots, smoke notes, commits, or
  task IDs. Chat-only evidence is not enough.
