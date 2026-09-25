# MVP Scope

## MVP Business Objective

The current first-stage MVP is an internally usable Roost plus Local Worker that
provides a governed team of agents for the owner. It must retain bounded company
and application context, assign responsibility, execute and review real work,
and let those agents take over and finish already-started applications without
mixing their assumptions. Subscription sale readiness follows after this
internal creation/completion system works. Digital-service sales, prospect
collection, client delivery and sale of Roost follow later. This objective does
not authorize implementation.

<a id="in-scope"></a>
## Current First-Stage In Scope

- Owner/workspace authentication and workspace-scoped service API keys.
- React owner-console views for authentication, account/workspace settings,
  the `00`-`12` department surfaces, and their accepted dashboard/workbench
  slices.
- API/MCP control of workspace-scoped operating data, service keys,
  integrations, relationships, and accepted typed business records.
- HTTP API and MCP access to the same governed operational source of truth.
- Workspace-scoped ClickUp sync/webhooks and Google Drive connection, selected
  folder, metadata/content, Docs, and Sheets foundation.
- Validation of the owner loop with one human owner and supervised agents.
- A real end-to-end Roost-plus-Worker round trip in which an accepted task
  receives bounded context, reaches the intended agent, returns evidence and
  independent review, and is shown truthfully to the owner.
- One application lifecycle with two entry paths: new-product definition or an
  existing-product takeover audit. After takeover establishes an approved
  evidence-backed baseline, both paths use the same stages and gates.
- Proof that Worker-supplied agents can take over one configured existing
  application, preserve its own assumptions, expose contradictions and gaps,
  and complete an accepted verified outcome. The mechanism must then onboard a
  further configured application without changing the core runtime.
- Gate- and evidence-based progress. Internal technical atoms, repeated tests,
  documents, migrations and commits do not count as delivery of a required
  end-to-end result, and subjective percentages cannot replace gate evidence.

### Later sale-readiness scope (accepted, not a current first-stage gate)

- A clear ownership boundary: the application manages its users, subscription
  entitlement, and access response to payment callbacks; Roost does not mirror
  per-user application access state.
- A company-level subscription relationship state of at least `active`,
  `payment_issue`, `cancelled`, or `ended`, updated only from confirmed business
  events. Cancellation and non-payment end paid access through the authoritative
  application/provider path rather than through a duplicate Roost entitlement
  panel.
- Company-level visibility linking a paid customer relationship to the relevant
  application offering, revenue and invoice evidence, document-routing status,
  and accounting synchronization or exception state.
- A deterministic-first financial path in which tested callbacks, APIs, or
  scripts process repeatable payment, invoice, document-routing, accounting, and
  Roost updates with idempotency, bounded retry, reconciliation, and inspectable
  evidence; agents verify results and handle exceptions rather than repeat safe
  machine work manually.
- End-to-end subscription-payment qualification: a complete sandbox/test-mode
  pass followed by a separately controlled live-mode switch and one real
  transaction reconciled across every applicable system before the payment path
  supports sale-ready acceptance.
- One deduplicated attention item for a failed, missing, or inconsistent
  financial result, assigned to an accountable agent and escalated to the owner
  when unresolved or high risk.
- One post-sale support model that keeps monitoring/error incidents, customer
  support cases, and feature proposals distinct: incidents are deduplicated and
  assigned, cases link the canonical customer and offering, and feature ideas do
  not create implementation work before an authorized product decision.
- Agent handling of incidents and support cases within an accepted procedure,
  with owner attention reserved for unresolved, high-risk, materially ambiguous,
  or otherwise reserved decisions.
- One canonical customer identity with explicit product-subscription and
  digital-service relationship types, allowing the same party to have both.
- A minimal subscription-product customer context: identity/contact,
  application offering, amount and currency, purchase date, invoice reference,
  accounting state, and relevant business/support context, without application
  login or entitlement data.
- An owner revenue view separated by application offering and digital service,
  covering paid and exceptional transactions, invoices, and accounting state.

### Application takeover and completion scope

- An initial assumption-to-product audit: accepted assumptions, observed current
  state, contradictions, implementation classification, prioritized completion
  plan, accountable tasks, and connected verification evidence.
- Separate product-ready and sale-ready gates accepted by the owner. Agents may
  prepare and verify evidence within mandate but cannot redefine product intent
  or accept commercial readiness.
- Product-ready proof that an intended user can complete the core journey and
  obtain the promised value without routine developer assistance, with
  risk-appropriate access security, error handling, monitoring, backup and
  restore, and support.
- A readiness profile for the application that names one primary intended user,
  that user's primary problem, and one end-to-end core outcome path. The path
  must pass repeatedly against explicit application-specific criteria; secondary
  features cannot compensate for failure of the core result.
- A blocking-defect rule: known critical failures in the core path or required
  access, security, recovery, monitoring, backup/restore, and support controls
  block product readiness. Critical failures in the offer, subscription/payment
  path, required customer information, or operating responsibility additionally
  block sale readiness.
- A governed readiness-exception record for non-critical limitations only,
  stating impact, affected scope, workaround, accountable owner, review date,
  evidence, and the owner's explicit acceptance.
- A reusable completion blueprint with common stages and evidence rules plus
  explicit application-specific assumptions and exceptions.
- One universal minimum standard for product intent, acceptance, documentation,
  security, data handling, testing, error handling, monitoring, recovery,
  release and evidence, combined with requirements specific to each application.
- An owner portfolio showing proven stage, gate state, blockers, decisions,
  nearest outcome, accountable actor and evidence for each application.
- A private, owner-selected reference application may supply installation
  evidence, but its identity and private assumptions stay outside distributed
  product documentation.

## Out Of Scope

- Native mobile until the web owner loop is reliable. Company City and
  gamification are not accepted roadmap assumptions.
- Invitation delivery and multi-human onboarding as required MVP flows. The
  existing invitation mechanism is preserved as observed product capability,
  not claimed as a current validation requirement.
- Advanced RBAC, native billing, a marketplace, hosted multi-tenant SaaS, and a
  full native CRM suite.
- Prospect collection and the complete digital-service sales and delivery flow
  until the application-completion proof is accepted and reusable.
- Dedicated customer-project test/staging environments, anonymization pipelines,
  and production-data access infrastructure. Their safety direction is accepted
  for the later service phase, but they are not prerequisites for the current
  application-first MVP. Current supervised-agent work remains governed by the
  separately accepted owner-controlled local runtime baseline.
- Implementation of the later digital-service commercial flow. Its accepted
  boundary remains: bounded qualification and indicative discovery may be free;
  detailed or reusable discovery output is paid; small closed-scope work is paid
  fully in advance; larger work uses a deposit and pre-paid milestones; and
  out-of-scope work requires an accepted, paid scope change before execution.
  Each milestone also has prior acceptance criteria and evidence, defects are
  separated from paid changes, and final agreed handover follows full settlement
  without transferring reusable company assets by default. The accepted later
  model also uses a disclosed review window, a default 30-day defect warranty,
  paid post-warranty maintenance, and immediate assessment of critical security
  events without presuming unlimited free remediation. One explicitly authorized
  customer actor confirms material decisions; external conversations become
  binding only after canonical confirmation; and unsafe, unlawful, unethical, or
  commercially untenable engagements may be refused, paused, or ended through a
  recorded owner-governed decision. Later service work also uses individually
  attributable, least-privilege, time-bounded access rather than shared
  credentials. Closing an engagement revokes unnecessary company and agent
  access and removes task-owned working copies under an explicit retention basis,
  with evidence, without deleting customer-owned sources.
- A second application-assessment or readiness source of truth before the status
  and suitability of existing mechanisms have been evaluated.
- A central Roost copy of every application's user-account and subscription-
  entitlement administration.
- Automatic conversion of every customer comment or feature suggestion into an
  implementation task before classification and an authorized product decision.
- Complete owner data export, two-stage company archive/permanent deletion, and
  full provider disconnect-and-purge lifecycle. Their product direction is
  accepted for a later phase.
- React UI parity for every backend capability or restoration of retired
  legacy owner-console routes.

## Accepted Boundary And Open Financial Workflow

The application is authoritative for its users, entitlements, and access. Roost
is authoritative for company relationships and responsibility and should expose
the business consequence of a paid purchase: customer type, purchased offering,
revenue and invoice context, document routing, accounting synchronization, and
exceptions. It does not need the application's live per-user subscription state.

Repeatable and proven steps use deterministic callbacks, APIs, or scripts;
authorized agents verify their evidence and resolve exceptional or ambiguous
cases. Every failure becomes a deduplicated, accountable attention item rather
than silent loss. Refunds, price or tax changes, payouts, transfers, and
accounting corrections require explicit owner approval.

Bounded provider retry behavior may handle a failed recurring payment. An agent
verifies the unresolved exception without repeatedly pursuing a customer who
chooses not to pay. Confirmed cancellation or non-payment ends access to paid
value through the application/provider authority and updates the Roost business
relationship; it does not create a promise of continued access or unpaid work.

The complete payment path must first pass in provider sandbox or test mode. A
separate controlled switch to live mode is followed by one real transaction and
independent reconciliation across the payment result, application access
response, invoice, Roost, and every applicable document and accounting
destination. No payment or accounting provider, invoice authority,
authoritative document flow, retention rule, or exact first-sale automation
threshold is yet selected.

## MVP Quality Bar

- Minimum usable flows: owner authentication, workspace-safe business/editor
  actions, integration setup and sync, and API/MCP access using the same
  workspace boundary.
- Required validation: focused build/API/UI checks appropriate to the changed
  surface, including workspace scoping and denied access when applicable.
- Required deployment readiness: documented migration, health, owner-console,
  protected API, integration, and event-readback smoke gates.
