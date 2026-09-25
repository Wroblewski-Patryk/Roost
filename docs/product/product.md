# Product Definition

## Product Identity

Roost is a reusable, self-hosted company operating system that can be installed
and configured independently for different companies. It gives the owner and
supervised agents one workspace-scoped place to operate company work: strategy
and delivery, customer context, operating-model records, integrations,
knowledge, decisions, and governed automation.

The first reference installation is the primary source of real usage evidence
for product and UX decisions. Capabilities created for that installation should
be expressed as reusable product behavior or per-installation configuration
when they can serve other companies or industries. Private company assumptions
must not become hard-coded product defaults.

`CompanyCore` is the legacy/runtime name that remains in API namespaces,
database and environment identifiers, integration names, and some source
files. It does not name a separate product. New product-facing documentation
should use **Roost**; technical references may use `CompanyCore` where they
identify an existing compatibility surface.

### Evidence Basis

This definition is derived from the approved [architecture direction](../architecture/architecture-source-of-truth.md), the
[system architecture](../architecture/system-architecture.md), the
[technology stack](../architecture/tech-stack.md), and the implemented
[runtime and route inventory](../operations/v1-code-surface-index.md). It does
not authorize new product scope or change existing API/database identifiers.

## Product Goal

- Core user problem: company operations and agent activity otherwise drift
  between tools, providers, and unscoped automation.
- Core promise: give an owner and approved agents a reliable, workspace-scoped
  operating record with an API/MCP boundary and a human control plane.
- Primary owner loop: identify what requires attention, resolve the necessary
  decision, delegate accountable work, and inspect evidence of completion.
- Current first-stage MVP objective: make Roost plus its Local Worker an
  internally usable operating system for the owner and a governed team of
  agents. The combined system must retain context, divide responsibility and
  complete real work without treating repeated rediscovery, internal technical
  atoms or unsupported progress estimates as delivery.
- First application-work proof: the Worker-supplied agents take over one
  already-started configured application, audit its own assumptions and actual
  state without importing assumptions from another product, resolve or escalate
  contradictions, and carry an accepted outcome through verification. The same
  process must then work for further configured applications.
- Subscription sale readiness follows only after that internal creation and
  completion system works. It is not the current Worker-completion gate.
- Later business expansion: after the application-completion flow works, extend
  Roost to acquire customers and sell and deliver digital services. This later
  direction must not displace the product-first MVP priority.
- Business intent: validate that loop in the reference installation while
  maintaining a configurable product foundation suitable for other companies
  before adding a native mobile channel or other unproven product expansion.

## Target Users

- Primary users: company owners, administrators, employees, and read-only
  collaborators who operate from one role-governed workspace per installation.
- Secondary users: supervised agents and automations (including local Codex
  Agent Hosts and Jarvis) that use workspace-scoped API keys or MCP tools.
- Provider-only participants: employees or collaborators who complete assigned
  work through an approved external provider such as ClickUp or Google Drive
  without requiring direct access to the Roost console. Their work returns
  through a governed integration with actor, provider, workspace, and record
  provenance. Within an explicitly mapped scope they may create and update work,
  but provider access alone cannot change company goals, accepted decisions,
  permissions, mandates, or accountability outside that scope.
- Early adopter profile: a small company operator who needs one accountable
  operational source of truth while continuing to use existing providers such
  as ClickUp and Google Drive. The reference installation informs priorities
  without defining the only supported company or industry.
- Current validation cohort: one human owner working with supervised agents.
  Administrators, employees, viewers, and invitation-based multi-human operation
  remain valid product roles, but they are not required to validate the current
  owner loop.

## Current First-Stage MVP

Roost is the shared work surface, context system and visible operating record;
the Local Worker supplies governed agent execution. Deterministic scripts handle
repeatable data collection and operations, while people or agents perform work
and judgment within role authority. Roost itself is not described as an actor.

The first stage is complete only when the combined Roost-plus-Worker system can
accept real work, provide the correct bounded company and application context,
assign one accountable role, execute through the intended agents, return
evidence, obtain the required review, and let the owner see the truthful result.
Source-only contracts, migrations, fixtures, isolated tests, commits or a
subjective completion percentage are supporting work, not completion of this
end-to-end outcome.

Application work uses one lifecycle with two entry paths. A new product begins
with its user and problem. An existing product first goes through takeover:
recover its own assumptions, inspect documentation and implementation, identify
contradictions and gaps, preserve valid history, and establish an approved
baseline. It then joins the common lifecycle at the stage supported by evidence.
Product-specific requirements never leak between applications.

The current reference cohort is the owner plus Worker-supplied agents on the
owner-controlled environment. Selling Roost, native mobile, multi-human rollout,
customer-hosted execution and the later service business remain outside this
first-stage completion gate.

## Accepted Company Composition Direction

- Departments and operating areas are configurable company views, not separate
  product silos or duplicated data stores. A company can compose its own areas
  by attaching the capabilities and views it needs.
- Roost provides a best-practice template containing `00 General` and twelve
  model departments. The template helps a company start from a high operating
  standard, but it is not the only valid organizational structure.
- After initial setup, the owner can change departments and the capabilities
  attached to them. A consequential change must show its impact, preserve the
  identity, relationships, and history of existing records, and avoid treating
  removal from a view as deletion of company data.
- Capabilities are reusable across Roost and retain one canonical record
  identity. Department views select and contextualize those capabilities rather
  than creating department-specific copies.
- Every shared capability has exactly one stewarding area responsible for its
  company-wide rules, quality, and cross-company overview without becoming
  exclusive to that area. Other departments use scoped views of the same
  capability and records. This stable home is part of how users find and
  understand capabilities in the system.
- Tasks illustrate this rule: Operations stewards company-wide task
  organization, while Sales, Technology, and every other relevant department
  can create and work with its contextual task views. A task remains one record
  with an explicit accountable department and an assigned person or agent.
- Files and collaborative content illustrate the same rule: Technology stewards
  the shared Google Drive capability and its integration quality, while every
  relevant department, project, and customer context can use scoped views of
  the same provider-backed files, Docs, and Sheets.
- One record may appear in several relevant views. Its canonical identity,
  accountable home, assignee, and relationships remain explicit so additional
  visibility does not create competing ownership.
- Cross-department work has exactly one accountable department while allowing
  any number of explicitly related contributing departments, people, and agents.
  Participation does not dilute final accountability.
- The same capability can support internal and customer-facing work. For
  example, the mechanism used to manage a website may represent a company's own
  website or a website delivered for a customer; ownership, beneficiary,
  project, and other relations supply the context.
- The product direction does not require every capability to become a separately
  installable module or industry template. Introduce such packaging only when a
  real difference in lifecycle, permissions, dependencies, or distribution
  justifies it.
- A department combines organizational accountability with a configured work
  surface: it can have leadership, people, goals, budgets, and decisions while
  presenting the shared capabilities relevant to its work. The work surface
  never becomes a parallel store.
- Creating a record from a contextual view may prefill its department, customer
  or internal beneficiary, project, and related context when the interface can
  derive them reliably. The proposed context must be visible and correctable
  before save; view location alone must not create hidden authority or intent.
- The owner has a global projection over company records. Department views are
  scoped by default to their relevant work, with filters and links leading back
  to the same canonical records rather than copies.
- Members and viewers start from only the departments, tasks, and capabilities
  relevant to their responsibility and permissions. The owner starts from the
  global company view, still subject to explicit authority and data boundaries.

The currently implemented surface still exposes `00 General` and departments
`01`-`12`.
`RF-PROD-002` now makes the configurable model the accepted product target and
supersedes the former fixed-topology requirement. This does not claim that the
current fixed V1 surface already implements that target. Before implementation,
the open technical migration decision must define stable area identity,
permissions, workforce and provider mappings, compatibility, versioning, impact
preview, and safe detachment or reassignment without losing canonical records or
history.

## Accepted Onboarding Direction

- The default onboarding path is guided setup from a refined template that
  combines a department structure with suitable capability sets. The first
  template is the best-practice `00 General` plus twelve-department model, and
  future templates may represent other operating patterns.
- Before creating the company structure, the owner sees an editable preview and
  can add, remove, or change departments and their capability sets before
  explicitly accepting the configuration.
- An intentionally blank company setup remains available as an advanced option,
  while the recommended path provides useful operating structure immediately.
- In product language, a "module" in this onboarding context means only a
  configurable capability set. The interface should prefer a plain-language
  label such as "capability set" (localized as "zestaw funkcji") so it cannot be
  mistaken for a separate store, product fork, or duplicate record model.

## Current Product Surface

- A backend-served React owner console provides the public and authentication
  routes, account and workspace settings, the `00 General` dashboard and
  product map, and active workbenches for departments `01`-`12`.
- `11 Innovation` provides the Product Engineering source of truth for
  applications, capability definitions and application-specific target versus
  observed state, evidence, gaps, architecture, interfaces, and calculated
  readiness. `02 Products & Services` commercializes the same application
  records through product/service offerings. `04 Operations` provides a
  versioned procedure workbench for shared human and supervised-agent work.
- All active user-facing web routes render through the React bundle. `/areas`
  with an `area` and `view` query is the canonical department surface, with a
  small set of compatibility aliases normalized by the route registry. The
  retired vanilla console is not an active runtime path; backend capabilities
  without a current React view remain available through API/MCP contracts.
  Route ownership is recorded in `docs/operations/v1-code-surface-index.md`.
- PostgreSQL is the canonical operational data store. Human web clients and
  agent clients use the HTTP API; MCP is the preferred agent interface above
  that API.
- Native ClickUp and Google Drive adapters are workspace-scoped. n8n is an
  optional orchestrator, not the required operating path.
- The owner can queue a Codex run from a Roost task, observe its local execution
  from the VPS-hosted console, cancel or retry it, and review the reported diff,
  checks, final response, and task evidence before committing or deploying.
- Workspace administrators can copy secret-free API, Codex MCP, and Windows
  Agent Host setup from workspace settings. The People / Agents activity view
  combines live Codex execution events with provider-neutral agent logs while
  keeping existing raw keys hidden and execution triggers disabled until the
  explicit activation gate is satisfied.

## Accepted Autonomy Target

The [autonomy activation contract](../architecture/autonomy-activation-contract.md)
records the accepted company model: the owner sets direction and resolves
material ambiguity; humans and agents deliver through department responsibility,
bounded context, risk controls and independent evidence. Autonomous releases are
a staged target. The current supervised runtime and owner review described above
remain in effect until the corresponding command and activation gates are proven.
The first delivery proof is a low-risk DemoApp repair under a separate task contract.

## Product Rules

- Key constraints: records, service keys, integration settings, and provider
  sync state are workspace-scoped; external tools do not write PostgreSQL
  directly.
- Source-of-truth policy: Roost remains authoritative for company structure,
  goals, decisions, responsibility, relationships, governance, and integration
  mappings. Every synchronized record or field has one explicit authoritative
  owner; provider-native content can remain provider-owned where the integration
  contract declares it.
- Bidirectional-integration policy: approved providers are legitimate work
  surfaces, not read-only exports. Roost sends assigned and relevant work to the
  provider and imports permitted changes back so a provider-only participant can
  work without direct Roost-console access. Every direction preserves identity,
  provenance, scope, and auditability.
- Integration-coverage policy: a Roost capability does not need an external
  provider. It remains natively usable in Roost unless a provider offers clear
  workflow value and an owner accepts its authority, scope, data mapping, and
  failure behavior. Adapters extend capabilities; they do not define whether a
  capability exists. A new adapter is justified only when people genuinely need
  to work in that external service and a safe bidirectional contract can define
  identity, ownership, synchronization, conflicts, and recovery.
- Provider-identity policy: a provider account should map to an exact Roost
  person or agent before its actions are attributed to that actor. If no mapping
  is proven, Roost preserves the real provider identity, marks the actor as
  unverified, and never attributes the action to the owner or another worker by
  inference.
- Synchronization-classification policy: every synchronized capability or data
  class declares one of `sync_allowed`, `restricted`, or `roost_only`.
  Synchronization uses the least scope needed. Restricted data requires the
  configured approval or policy gate; `roost_only` data never leaves Roost.
- Integration-administration policy: only an owner or administrator may connect
  a provider, grant credentials, or choose synchronized workspaces, lists,
  folders, and equivalent scopes. Other workers may request an integration or
  scope change but cannot authorize provider access.
- Classification-governance policy: the capability's stewarding area proposes
  synchronization classification and scope. An owner or authorized
  administrator accepts it. Protection may be tightened directly within
  authority; weakening protection requires explicit approval and an audit entry.
- Integration-offboarding policy: when a worker leaves or loses provider access,
  Roost immediately disables that account mapping and future synchronization
  authority. Historical attribution remains immutable. Affected records and
  responsibilities become visible for controlled reassignment to an authorized
  successor.
- Synchronization-conflict policy: concurrent changes are never resolved by a
  silent overwrite. Roost exposes the competing versions, authoritative owner,
  relevant differences, and safe resolution choices before a destructive merge
  or replacement.
- Integration-outage policy: Roost continues unrelated work from its last known
  valid state, marks affected data as stale, and retains pending synchronization
  intent. When the provider recovers, Roost performs bounded catch-up and
  reconciliation so required changes flow in both directions; unresolved
  conflicts remain visible rather than being guessed away.
- Trust or safety expectations: protected actions resolve the workspace before
  access, enforce the current membership role, fail closed across workspaces,
  and audit membership, invitation, ownership and credential changes.
- Data sensitivity notes: owner credentials, service API keys, and integration
  tokens are secret material and must not be returned in API responses or logs.
- UX complexity policy: the web console is the reliable human control plane;
  active screens use responsive, reusable React components, and retired legacy
  workbenches must not be described as available until rebuilt in React.
- Product configuration policy: reusable company behavior belongs in the
  product; installation identity, private operating details, and genuinely
  company-specific choices belong in per-installation configuration.
- Current distribution policy: validate independently installed self-hosted
  companies without making native billing, a marketplace, hosted multi-tenant
  SaaS, or a full native CRM suite part of the current product phase. Provider
  integrations and shared customer capabilities may cover demonstrated needs.
- Channel policy: the web experience must first support the accepted owner loop
  reliably. Native mobile is deferred until that proof exists. Company City and
  gamification are not accepted roadmap assumptions and require a fresh owner
  decision before they may re-enter product planning.
- Shared-capability policy: internal and customer-facing uses should reuse the
  same canonical capability and record model whenever their behavior is the
  same; context and relationships distinguish the use case.
- Capability-stewardship policy: the area responsible for governing a shared
  capability is singular and does not own every use of it. Department
  responsibility, record accountability, assignment, participation, and
  cross-company capability stewardship are related but distinct facts.
- Owner workflow policy: the human control plane should make attention,
  required decisions, accountable delegation, and completion evidence easy to
  follow as one connected operating loop.
- Attention policy: the main attention surface includes blockers, overdue work,
  risks, pending decisions, defects, and business opportunities only when they
  require a concrete response. Ordinary activity stays outside the attention
  queue. Each item should make the reason, responsible actor, evidence, and next
  useful action understandable.
- Priority policy: Roost may calculate and recommend a priority with a visible
  rationale, but it must not silently reprioritize accepted work. The owner or
  an accountable manager confirms a change within their authority, and the
  previous priority remains in history.
- Decision-impact policy: before an accepted decision changes linked goals,
  projects, tasks, or processes, Roost shows the affected scope and expected
  consequences. An authorized actor accepts the impact separately; previous
  direction and the resulting changes remain traceable.
- Task-context policy: every executable task receives a minimal, versioned packet
  assembled from canonical sources for that application and mandate. It includes
  only the company context needed for the outcome, records why each source was
  included, and treats missing or contradictory required context as a visible
  blocker rather than inviting the executor to guess.
- Execution-routing policy: every process step declares whether a deterministic
  script, an authorized agent or an authorized person is the primary executor,
  together with success, retry and escalation behavior. Stable repeatable work
  should migrate to tested automation; judgment, exceptions and reserved
  decisions remain with the appropriate role.
- Evidence-freshness policy: a material change invalidates only the evidence and
  gates it can actually affect. Direct checks run first; broad revalidation is
  reserved for shared core, security, data, API or release impact. Independent
  acceptance does not recursively require another reviewer unless relevant new
  change or failure appears.
- Resume policy: Worker scripts observe deterministic machine and task state,
  Roost stores checkpoints and observations, and an authorized agent interprets
  differences before continuation. Roost is the record and work surface, not the
  reasoning actor.
- Loop-control policy: repeated operations without progress in the parent
  outcome consume only a bounded number of attempts. Further execution waits for
  a recorded diagnosis and materially changed approach instead of silently
  spending another model budget on the same loop.

## Accepted Later-Phase Data Lifecycle Direction

The owner accepted the following directions but explicitly deferred them beyond
the current MVP:

- a complete readable export of Roost-owned business records, relationships,
  decisions, history, and provider references without exporting secrets;
- two-stage company removal: reversible archive first, then a separate explicit
  permanent deletion with an impact preview and an opportunity to export;
- provider disconnection that stops synchronization while preserving existing
  history as disconnected, with any purge handled as a separate explicit owner
  decision.

These are future product requirements, not authorization to design or implement
their storage, retention, deletion, or provider behavior in the current phase.

## Accepted Business Sequence

- The first Roost business proof is application completion, not lead generation
  or client-service sales.
- The accepted target application flow is `idea -> defined problem and audience
  -> completion plan -> build -> verification -> sale readiness -> subscription
  offering -> active subscriber -> support and renewal`. The application itself
  owns its user accounts, subscription entitlement, and access enforcement;
  Roost governs the company-level product, customer, revenue, evidence, and
  responsibility context rather than duplicating the application's admin panel.
- The immediate proof uses one owner-selected existing application without
  publishing that private application identity in distributed documentation.
  Roost and a supervised agent must keep target assumptions, gaps, accountable
  work, decisions, and completion evidence connected throughout the flow.
- After this flow is proven and reusable, the accepted later service flow is
  `prospect -> free qualification and initial discovery -> offer and scope ->
  accepted engagement -> required payment condition satisfied -> delivery
  project -> tasks -> evidence and acceptance -> settlement status`.
- Lead acquisition and a bounded initial customer interview are intentionally
  free pre-sale activities and acquisition costs because they qualify the need
  and may lead to revenue. They do not authorize open-ended consulting,
  specification, design, or delivery without a paid agreement.
- The free stage may identify the customer's problem, assess mutual fit, and
  provide an indicative direction, scope, and budget range. A detailed audit,
  specification, design, prototype, or other reusable deliverable is paid work,
  either as a separate paid discovery engagement or inside the paid project.
- Small, closed-scope services are paid in full before delivery begins. Larger
  projects use an advance deposit and paid milestones; the deposit is confirmed
  before project start and each later milestone is paid before its phase begins.
  Offering configuration may define the size boundary and percentages but may
  not silently weaken the pay-before-work rule.
- Every engagement identifies one customer-side decision authority for scope,
  price, schedule changes, milestone acceptance, and final handover. Input from
  other customer participants remains context or a proposal until that authority
  confirms it. A replacement or delegated authority must be recorded explicitly
  with its scope and effective period; Roost never infers decision rights from
  meeting attendance, job title, or message volume.
- A verbal, meeting, email, or chat statement changes scope, price, schedule,
  acceptance, or another material commitment only after it is recorded in the
  canonical engagement context and confirmed by the authorized customer actor.
  The original communication remains linked as evidence but is not silently
  promoted into a binding decision.
- Any request outside the accepted scope requires an explicit scope change that
  states its outcome, price, schedule impact, and payment condition. Additional
  work begins only after the customer accepts the change and its required payment
  is confirmed. Informal requests never become free delivery obligations.
- The company may refuse, pause, or end an engagement whose requested outcome or
  operating conditions are illegal, unethical, unsafe, materially insecure,
  outside demonstrated competence, commercially unrealistic, abusive, or
  incompatible with reliable delivery. The reason, affected commitments, and
  safe next step are recorded. Material termination and uncertain legal, money,
  security, or reputational cases remain owner decisions.
- Before a service milestone starts, its expected result, acceptance criteria,
  required evidence, and accountable approver are explicit. Completion evidence
  is presented against those criteria, and the next milestone does not start
  until the current one is accepted and its next payment condition is satisfied.
- Each offer defines a customer review window. Delivery of the result and
  evidence includes the exact deadline and the contractual consequence of no
  response. If the customer submits no criteria-based objection within that
  disclosed window, the milestone may be recorded as accepted without repeated
  pursuit, only where the agreement explicitly permits deemed acceptance.
- A failure to meet accepted scope or acceptance criteria is a defect and is
  corrected without an additional scope fee. A new function, changed expectation,
  or changed direction is not a defect; it follows the paid scope-change path.
- The default defect-reporting warranty is 30 calendar days after milestone or
  final acceptance, unless the offering explicitly defines another period. It
  covers reproducible failure against the accepted scope and criteria, not new
  requirements, third-party changes, misuse, or indefinite free maintenance.
- After the warranty period, ordinary support, maintenance, updates, and changes
  require a separate paid maintenance subscription, retainer, time package, or
  new order. A critical security event is assessed immediately regardless of the
  commercial period; responsibility, remedy, and payment then follow the agreed
  scope, cause, maintenance terms, and applicable obligations.
- Final project-specific files, newly created administrative control, and the
  contractually agreed rights or licence are handed over after full settlement,
  with evidence of what was transferred. Existing customer-owned data,
  credentials, and accounts are never treated as company leverage. Reusable
  company tools, libraries, methods, and components remain company assets unless
  the agreement explicitly transfers or licenses them differently.
- Every person or agent accessing a customer's systems uses an individually
  attributable identity with the least scope and shortest practical duration
  needed for the accepted work. Shared customer credentials and broad permanent
  access are not an accepted operating model; the authorized customer actor or
  administrator controls the grant.
- Project closure includes evidence-backed access closure. Company and agent
  access that is no longer required is revoked, task-owned working copies are
  removed according to the agreed retention basis, and only material required
  for an agreed deliverable or a stated legal, accounting, warranty, security,
  or business-evidence purpose is retained. Customer-owned source systems and
  canonical data are never deleted as an implicit cleanup step.
- For later customer-service delivery, the accepted direction is to begin in an
  isolated test or staging environment and use synthetic or anonymized data when
  that can prove the result. Access to real production or customer data is an
  explicit necessity-based exception: approved, time-bounded, attributable, and
  audited. The dedicated infrastructure needed to support this model is deferred
  until the service phase and sufficient business resources exist.
- This future customer-environment direction does not change the current MVP
  execution baseline. Current work by supervised agents remains on the
  owner-controlled local runtime governed by the separately accepted runtime
  contract; this product interview does not redesign or activate that runtime.
- The accepted system boundary is that each application owns its user and
  subscription-access state and reacts to the payment callback needed to grant
  or revoke access. Roost does not need to mirror per-user entitlement state.
- Roost tracks the business relationship state for each subscription offering as
  at least `active`, `payment_issue`, `cancelled`, or `ended`, while the
  application remains authoritative for exact access. A confirmed cancellation
  or unpaid state ends paid access according to the offering terms; Roost records
  the resulting business event rather than operating a second entitlement panel.
- The expected financial-operations direction is automated coordination at the
  company level: after a paid purchase, Roost can identify the customer
  relationship, product and revenue context, invoice, document-routing state,
  and accounting synchronization state without routine copying or
  external-service logins.
- Stable, repeatable, tested financial steps should run through deterministic
  callbacks, APIs, or scripts rather than consume agent attention and model
  tokens. This applies, for example, to receiving a payment event, routing an
  approved invoice copy, updating accounting and Roost state, and recording
  machine-checkable evidence. Such automation still requires idempotency,
  bounded retries, reconciliation, observable failure, and an auditable result.
- An authorized agent verifies the resulting chain and handles ambiguous,
  provider-specific, or exceptional work that cannot be safely expressed as a
  deterministic procedure. Application diagnosis and code repair remain agent
  work when judgment is required; routine browser-based invoice handling is not
  the target operating model when a safe API or callback exists.
- No payment or accounting provider is selected. A payment service such as
  Stripe is only a candidate. Storing an invoice copy in the governed Google
  Drive context is an owner proposal that remains open until invoice authority,
  document flow, accounting provider, retention, error recovery, and approval
  boundaries are defined.
- Agents may automatically retrieve invoices, store approved document copies,
  synchronize statuses, and reconcile or surface mismatches within explicit
  mandates. Refunds, price or tax changes, payouts, transfers, and accounting
  corrections require explicit owner approval.
- A missing, failed, or inconsistent payment, invoice, document-routing, or
  accounting result creates one deduplicated attention item with an accountable
  agent. The agent verifies and reconciles it within mandate; unresolved or
  high-risk exceptions escalate to the owner instead of failing silently.
- Recurring-payment failure follows only the bounded automated retry behavior
  accepted for the payment provider and offering. An agent verifies an unresolved
  exception but does not repeatedly pursue a customer who chooses not to pay.
  Without confirmed payment, the customer does not retain access to paid value
  and the company does not continue chargeable delivery.
- Subscription-payment qualification uses two distinct proofs. The full
  end-to-end path first passes in the payment provider's sandbox or test mode
  without a real charge. Moving to live mode is a separate, controlled decision,
  after which one real transaction is independently reconciled across the
  payment result, application access response, invoice evidence, Roost business
  context, and every applicable document/accounting destination. Sandbox success
  alone does not prove the live path or justify sale readiness.
- Roost uses one canonical customer identity for a person or organization and
  attaches any number of explicit relationship types. The same party may be a
  product-subscription customer, a digital-service client, or both without
  duplicate customer records.
- For a subscription-product relationship, Roost keeps only the business data
  required to operate the company: customer identity and contact context,
  application offering, amount and currency, purchase date, invoice reference,
  accounting synchronization state, and relevant business/support relationship.
  Application login, entitlement, and access state remain in the application.
- The owner receives one revenue view separated by application offerings and
  digital services, including paid and exceptional transactions, invoices, and
  accounting state. The view aggregates company outcomes without becoming an
  application-user administration surface.

## Accepted Post-Sale Support Model

- A monitoring or application-error signal that requires action becomes one
  deduplicated incident linked to the affected application, severity, current
  evidence, and accountable agent. Deterministic safeguards and diagnostics act
  first where they are proven; the agent investigates and coordinates recovery.
  Only unresolved or high-risk incidents require owner attention.
- A customer request becomes one canonical support case linked to the customer,
  the relevant application offering or digital service, responsibility, status,
  and evidence. It supplies company support context without copying the
  application's user-account or entitlement administration into Roost.
- An authorized agent may handle a support case within an accepted procedure and
  mandate. Ambiguity, material customer impact, actions outside the procedure,
  and reserved money, legal, security, or product decisions escalate to the
  accountable human or owner.
- Incoming customer information is classified as a technical defect, a support
  question, or a feature proposal. A confirmed defect may create accountable
  corrective work. A feature proposal remains a proposal until an authorized
  product decision accepts, rejects, or defers it; feedback alone never becomes
  an implementation commitment.
- Support channels, response targets, severity thresholds, and customer-facing
  communication rules remain open and may differ by offering. Their later
  selection must preserve this common case, incident, and decision model.

## Accepted Application Completion Control Model

- The completion process begins with an audit, not implementation: collect the
  application's accepted assumptions, observe the current product, identify
  contradictions and gaps, create an accountable completion plan, execute
  bounded work, and attach verification evidence.
- Product intent and implementation state are separate facts. Every material
  accepted assumption receives one evidence-backed implementation state:
  `not_implemented`, `implemented_correctly`, `implemented_incorrectly`, or
  `unverified`. A proposal or stale document cannot be counted as implementation
  evidence.
- Decision status remains separate from implementation state. Proposed,
  accepted, deferred, rejected, and superseded assumptions must not be mixed
  into one undifferentiated documentation list.
- Readiness has two distinct gates. **Product ready** means the application
  lets an intended user complete the core journey and obtain the promised value
  in a working environment without routine developer assistance. It also has
  risk-appropriate secure access, error handling, monitoring, backup and restore,
  and a support path. **Sale ready** additionally means the commercial offer,
  subscription path, customer information, and operating/support responsibilities
  are ready for real customers.
- Before either gate can pass, the application identifies one primary intended
  user, that user's primary problem, and one end-to-end core outcome path. The
  path must produce the promised result repeatedly against application-specific
  acceptance criteria without routine help from the developer. Secondary flows
  may add value, but their existence cannot substitute for proof of this path.
- A known critical blocker in the core outcome path, access control, security,
  error recovery, monitoring, backup/restore, or support path prevents
  **product-ready** acceptance. **Sale-ready** acceptance is also blocked by a
  critical failure in the offer, subscription or payment path, required customer
  information, or the defined operating and support responsibility. Exact
  severity thresholds remain application- and risk-specific, but a blocker
  cannot be relabelled as a minor limitation merely to pass a gate.
- The owner may accept a known non-critical limitation without waiting for an
  unrealistic state of perfection only when its impact, affected users or
  scope, available workaround, accountable owner, and review date are explicit.
  The exception and its evidence remain attached to the readiness decision.
  A limitation that invalidates the core promise or creates unacceptable
  security, data, access, payment, or recovery risk is not eligible for this
  exception.
- The owner accepts both readiness gates from connected evidence. Agents may
  audit, propose, implement within mandate, and supply evidence, but cannot
  silently redefine assumptions or self-declare commercial readiness.
- Every application uses one reusable completion blueprint containing common
  stages, classifications, evidence types, and gates. Each application retains
  its own assumptions, criteria, risks, and justified exceptions; reuse never
  means copying private product requirements.
- The reusable lifecycle is `problem and intended user -> accepted requirements
  -> solution design -> implementation -> verification -> product readiness ->
  sale readiness -> operation and improvement`. A stage advances only from
  evidence and may move backward when new evidence invalidates its gate.
- The takeover path is a pre-stage for existing applications, not a second
  development method. It establishes the application's truthful baseline and
  then enters the same lifecycle used for a new application.
- Every application follows a shared minimum for requirements, acceptance,
  security, data handling, testing, error handling, monitoring, recovery,
  release and evidence, while retaining its own domain behavior and criteria.
- The owner portfolio presents the proven stage, gate state, blockers, pending
  decisions, next outcome, accountable actor and evidence for every application.
  Percentages are only orientation and never override an unmet gate.
- The owner reports that a similar assessment process may already have been
  started, but its completion and authority are unknown. Before creating any new
  mechanism, future work must locate and evaluate existing canonical records,
  preserve useful history, and avoid a parallel source of truth.

## Success Signals

- Usage success: an owner can bootstrap a workspace, manage its operating
  context and integrations, and complete the supported business-editor flows.
- Outcome success: the owner orients faster, loses fewer decisions and
  assumptions, makes decisions sooner, sees accountable ownership and evidence
  on more work, and supervises successful agent work with fewer interventions.
- Quality success: the API, MCP, and owner-console paths preserve workspace
  scoping, authentication, validation, events, and audit behavior.
- Delivery success: build, focused API/UI checks, migration review when
  applicable, and documented deployment/smoke gates provide evidence for the
  changed surface.
