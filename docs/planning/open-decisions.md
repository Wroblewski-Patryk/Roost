# Open decisions

## Current delivery

There is no unresolved owner business decision blocking the current delivery
objective in [`docs/implementation.md`](../implementation.md): completing the
Roost VPS, Windows Local Worker and managed Hermes path, then proving it through
the configured application pilot.

Accepted product intent is canonical in
[`docs/product/requirements.md`](../product/requirements.md). Implementation
gaps, audits, migrations, adapters, configuration and failed checks are delivery
work rather than owner decisions. The implementation owner resolves ordinary
reversible technical choices from the accepted requirements, current
architecture, inspected code and evidence.

## Required takeover outputs, not open decisions

The configured application's takeover audit must establish its private primary
user, primary problem, core outcome path, repetition threshold, acceptance
criteria and severity thresholds. It must also inventory any existing
assumption/readiness mechanism before creating or changing one. These are
evidence-backed audit outputs under `RF-APP-003` through `RF-APP-011`; they do
not block completion of the Roost runtime and must not trigger a repeated
general product interview.

A genuine contradiction between authoritative application assumptions is
escalated as one concrete Decision with the conflicting sources and affected
work. Missing implementation or uncertain current behavior is not such a
contradiction.

## Deferred decisions

The following choices become necessary only when their later phase is opened.
They are not gates for the current Roost-plus-Worker delivery or the initial
application repair pilot.

| ID | Trigger | Decision reserved for that phase | Current boundary |
| --- | --- | --- | --- |
| OPEN-FIN-001 | Before first sale-ready acceptance | Select payment and accounting providers, invoice authority, transaction/document sources of truth, legal/fiscal responsibility, retention, recovery and exact approval boundaries. | `RF-BIZ-001` and `RF-BIZ-004` through `RF-BIZ-008` govern the later flow without selecting providers now. |
| OPEN-SVC-001 | Before publishing a service offering | Set prices, deposit and milestone amounts, qualification thresholds and any deliberately free promotional deliverable. | `RF-SVC-001` through `RF-SVC-003` preserve paid-work boundaries. |
| OPEN-SVC-002 | Before customer contracting | Set review periods, maintenance terms and jurisdiction-appropriate rights, licence, deemed-acceptance, warranty and liability language. | `RF-SVC-007` through `RF-SVC-009` state product intent, not legal advice or a completed contract. |
| OPEN-SVC-003 | Before making public support commitments | Select additional support channels and evidence-based response commitments for the offering. | `RF-SUP-001` through `RF-SUP-004` already define centralized, severity-based handling without an unstaffed public SLA. |
| OPEN-SVC-004 | Before the customer-service delivery phase | Set working-copy/evidence retention and fund isolated staging/anonymization infrastructure. | `RF-SVC-011` through `RF-SVC-013` define access and closure direction without making that infrastructure a current gate. |
| OPEN-DATA-001 | Before later lifecycle administration | Define export formats, retention, backup interaction, permanent-deletion guarantees and provider effects. | `RF-INT-006` keeps this explicitly deferred beyond the current MVP. |
| OPEN-ORG-001 | Before migrating the current fixed department surface to configurable composition | Define stable area identity, `00 General`, hierarchy/workforce migration, permissions, navigation, provider mappings, compatibility, versioning, impact preview and safe reassignment. | `RF-PROD-002` defines the target; the current installation remains valid until a separately accepted migration design exists. |

## True owner dependencies during implementation

Implementation pauses only for the bounded dependencies in
[`docs/implementation.md`](../implementation.md#true-owner-dependencies): an
unavailable login, 2FA response or secret; an unapproved irreversible action
against real data or an external account; a genuine contradiction in accepted
business intent; or an unavailable external service with no safe alternative.
Operational approvals already required by the accepted runtime contract, such
as first-write activation and each live-position test, remain explicit gates but
are not missing product assumptions.
