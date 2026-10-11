# Open decisions

## Current delivery

G16b Composition reached its authorized boundary; its proof and limitations
are in [`docs/implementation.md`](../implementation.md) and the
[composition contract](../architecture/department-composition.md). No gate is
active. The earlier stopped second-application release and G17 remain closed.

Accepted product intent is canonical in
[`docs/product/requirements.md`](../product/requirements.md). Ordinary
implementation gaps inside an approved gate are delivery work. A new provider,
material scope change, repeated ineffective attempt or exhausted budget
requires a safe checkpoint and revised owner-approved assignment. The
implementation owner resolves other reversible technical choices from the
accepted requirements, current architecture, inspected code and evidence.

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

## Accepted G16b composition decision

The bounded implementation contract is in
[`department-composition.md`](../architecture/department-composition.md).

The owner approved the bounded `OPEN-ORG-001` migration direction on
2026-10-11. Keep each existing `WorkspaceDepartment.id`, key and old URL as
stable identity. Keep `OperatingArea` separate: its IDs and provider container
bindings are not department IDs. `00 General` remains a company-wide owner
projection; the twelve model departments are an initial template, not a
required topology. A shared view keeps one canonical steward and can appear
in another department without copying records or transferring authority.

G16b changes one existing department and its shared view availability. The
owner sees the current and proposed navigation, responsibilities and existing
relations before confirming exactly that version. The apply command must be
atomic, reject stale previews, keep old links working, and never let a later
read or default seed restore an intentionally detached view. It must not
delete or reassign records, people, managers, roles, permissions, task-scoped
human access, ClickUp/Drive mappings or provider data. A configuration change
that would require ambiguous reassignment is refused pending a separate
decision; general hierarchy migration and blank onboarding are outside G16b.

The permitted proof is an isolated populated-data migration and native owner
flow, browser PL/EN checks, Security review, then standard release with only
read-only production verification. No synthetic production business records,
production composition change, paid model proof, purchase, reset or VPS cleanup
is authorized. G17 remains closed.

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
| OPEN-UX-001 | Before redesigning the public pre-login page | Decide whether its primary audience is only people entering an existing installation or also people evaluating Roost; approve the truthful promise and primary action. | `RF-UX-011` requires verified content and interaction without implying unproven sale readiness. |
| OPEN-AUTH-001 | Before changing normal browser-session persistence beyond the currently observed behavior | Set the intended trusted-browser lifetime and reauthentication/revocation experience after the reported login behavior is reproduced. | `RF-SEC-013` preserves fresh, exact-action owner authorization and separate agent identities; a five-minute fresh-owner check is not evidence that the normal token expires then. |
| OPEN-HOST-001 | Before granting the environment steward unattended change authority | Define eligible update classes, exact host/VPS scope, maintenance windows, notification and approval boundaries, and risk/rollback limits. | `RF-HOST-021` starts with observation and supervised proof; initial host updates remain manual, Windows reboot is not autonomous, and hosting-platform cleanup is not duplicated. |
| OPEN-STRATEGY-001 | Before accepting numeric company value and revenue targets or autonomous prospect qualification | Choose evidence of durable client value, review intervals, viable economics and explicit disqualifiers from actual baselines. | `RF-OUT-008` keeps the owner-stated direction separate from guessed targets; a visibly outdated website alone is not proof of client need. |
| OPEN-MODEL-001 | Before claiming savings in the task model-policy gate | Accept a concrete quality, latency and total-cost comparison on representative tasks, including local host resources, power, maintenance and rework; report provider usage as unknown when not exposed. | `RF-HOST-022` defines safe choice. A manual Hermes/Ollama smoke cannot prove managed availability or savings; each future gate still needs a separate owner assignment. |

## True owner dependencies during implementation

Implementation pauses for scope/budget stops and the bounded dependencies in
[`docs/implementation.md`](../implementation.md#true-owner-dependencies): an
unavailable login, 2FA response or secret; an unapproved irreversible action
against real data or an external account; a genuine contradiction in accepted
business intent; or an unavailable external service with no safe alternative.
Operational approvals already required by the accepted runtime contract, such
as first-write activation and each live-position test, remain explicit gates but
are not missing product assumptions.
