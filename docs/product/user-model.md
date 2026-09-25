# User Model

Last updated: 2026-09-25

## Purpose

Define who uses the product, what they need, what they can do, and how the
system should treat their context.

## User Roles

| Role | Goals | Permissions | Core journeys | Risks |
| --- | --- | --- | --- | --- |
| Owner | Understand company state, make reserved decisions, delegate accountable work, and verify outcomes. | Full workspace authority subject to explicit safety and release gates. | Attention -> required decision -> accountable delegation -> completion evidence. | Overload, hidden blockers, unclear accountability, unsupported confidence in automation. |
| Administrator | Keep the workspace, people, integrations, and credentials operational within delegated authority. | Administrative authority to connect approved providers, manage credentials and synchronization scope, and accept classifications when authorized, without reserved owner actions. | Configure the workspace, support members, maintain integrations, and surface risks to the owner. | Excess access, configuration drift, or treating administrative access as product-direction authority. |
| Member | Complete and coordinate company work using shared operating records. | Read and write company operating records without workspace security administration. | Receive work, use procedures and context, report progress, and attach evidence. | Ambiguous ownership, duplicated records, or work performed outside the canonical flow. |
| Viewer | Understand relevant company state without changing it. | Read-only access to permitted operating records. | Review status, decisions, and evidence. | Mistaking stale or incomplete information for current authority. |
| Supervised agent | Complete bounded work and return verifiable results under an explicit mandate. | Workspace-scoped API/MCP capabilities, never implicit human authority. | Receive bounded context, perform authorized work, report outcome and evidence, escalate uncertainty. | Acting beyond mandate, missing context, weak evidence, or requiring constant owner intervention. |
| Provider-only participant | Complete assigned work through an approved external service without using the Roost console. | Create and update work only inside the mapped synchronization scope; no implied Roost membership or authority over company goals, accepted decisions, permissions, mandates, or accountability. | Receive synchronized work, create or update permitted provider records, and return results through bidirectional synchronization. | Identity mismatch, stale context, conflicting edits, excessive synchronized scope, or treating provider access as Roost authority. |

The current validation cohort is one human owner plus supervised agents. The
administrator, member, viewer, and provider-only roles remain part of the
product model and existing capabilities are not removed, but multi-human
onboarding is not required to validate the present owner workflow.

Roost mechanisms are actor-neutral. A role may be occupied by a person, an
agent, or an explicitly governed combination. Authority, responsibility and
escalation follow the role and mandate rather than actor type. Each work item or
decision has exactly one accountable actor or role at a time; contributors may
be many, but transfer of accountability is explicit and preserves context,
history and evidence.

## Operator Roles

| Role | Responsibilities | Tools | Approval authority | Evidence needed |
| --- | --- | --- | --- | --- |
| Workspace owner | Set product and company direction, resolve material ambiguity, and accept consequential changes. | Owner console and governed operating records. | Reserved product, money, legal, critical-risk, and mandate decisions. | Current company state, options, trade-offs, accountable owner, and downstream impact. |
| Accountable manager | Turn accepted direction into bounded work and verify that it reaches the intended outcome. | Department workbenches, tasks, procedures, decisions, and evidence. | Delegated operational decisions within mandate. | Assigned executor, acceptance criteria, progress, verification, and completion evidence. |

## Attention And Decision Experience

- The owner sees one actionable attention surface for blockers, overdue work,
  risks, decisions, defects, and opportunities that require a response; routine
  activity is available as context but does not compete for attention.
- A priority recommendation shows why it was proposed. An owner or accountable
  manager confirms a change within their authority; Roost does not silently
  reorder accepted commitments.
- A material decision presents affected goals, projects, tasks, and processes
  before acceptance. Applying the decision preserves the prior direction and a
  traceable record of every accepted downstream effect.
- The current first-stage owner journey observes a real Roost-plus-Worker task,
  sees which role and agent are accountable, and receives the evidence-backed
  result and independent review without reconstructing context manually. The
  following application journey selects an existing configured application,
  approves its takeover baseline, reviews contradictions and gaps, and delegates
  bounded completion work. Sale readiness is a later gate. An agent does not
  redefine product intent or declare commercial readiness on its own authority.
- During the initial audit, the interface must keep decision status separate
  from implementation state. For every material accepted assumption, the owner
  can see whether it is not implemented, implemented correctly, implemented
  incorrectly, or still unverified, together with the supporting observation or
  evidence.
- Product readiness and sale readiness are separate decisions. An application
  may be product ready without yet having an accepted offer, subscription path,
  customer information, and operational support needed for sale readiness.
- The accepted product-ready experience requires an intended user to complete
  the core journey and obtain the promised value without routine developer
  assistance. Readiness also includes risk-appropriate secure access, error
  handling, monitoring, backup and restore, and a usable support path.
- The desired financial-operations experience lets the owner inspect current
  product-customer, revenue, invoice-routing, and accounting synchronization
  state in Roost without routine external-service logins or manual document
  copying. The application's own administration remains responsible for its user
  accounts, subscription entitlement, and access; Roost does not mirror that
  operational state.
- Stable and tested payment, invoice, document-routing, accounting, and Roost
  updates run through deterministic callbacks, APIs, or scripts. Agents verify
  the connected evidence and handle ambiguous or exceptional cases rather than
  spend model tokens repeating safe machine work. Refunds, price or tax changes,
  payouts, transfers, and accounting corrections require explicit owner
  approval.
- A missing, failed, or inconsistent financial result produces one deduplicated
  attention item for an accountable agent. The agent verifies and reconciles the
  chain within mandate; only unresolved or high-risk cases escalate into the
  owner's attention surface.
- Before the owner accepts a subscription payment path for real sales, the same
  end-to-end journey is proven in provider sandbox/test mode and then through a
  controlled live-mode switch plus one real, independently reconciled
  transaction. The two proofs remain visibly distinct.
- Roost uses one canonical customer identity and distinguishes
  product-subscription and digital-service relationships explicitly. The same
  person or organization may have both relationship types without duplicate
  customer records.
- A product-customer view contains only the business context needed by Roost:
  identity/contact, application offering, amount and currency, purchase date,
  invoice, accounting state, and relevant support relationship. Login,
  entitlement, and application-access data remain in the application.
- The owner can inspect revenue by application offering and service, with paid
  and exceptional transactions, invoice evidence, and accounting status, without
  entering each application's user-administration panel.
- Roost shows the company-level subscription relationship as `active`,
  `payment_issue`, `cancelled`, or `ended` without copying exact entitlement
  state. The application or payment-provider path confirms cancellation and
  enforces the end of paid access; Roost records the business consequence.
- A failed renewal may use only the offering's bounded provider retry behavior.
  An agent verifies unresolved exceptions but does not repeatedly pressure a
  customer to continue. No confirmed payment means no continuing paid access or
  chargeable delivery.
- An actionable monitoring or application-error signal appears as one
  deduplicated incident with the affected application, severity, evidence, and
  accountable agent. Proven safeguards act first, the agent investigates, and
  only unresolved or high-risk incidents enter the owner's attention surface.
- A customer request appears as one support case linked to the canonical
  customer and the relevant application offering or digital service. The agent
  may resolve it within an accepted procedure; ambiguity, material customer
  impact, or a reserved money, legal, security, or product decision escalates.
- Customer input is visibly classified as a technical defect, support question,
  or feature proposal. Only a confirmed defect or an accepted product decision
  creates implementation work; an unaccepted feature proposal remains visible
  without becoming a commitment.
- For later digital-service sales, lead acquisition and a bounded initial
  discovery interview are free acquisition activities. This stage identifies the
  problem, fit, and indicative scope or budget; detailed audits, specifications,
  designs, prototypes, and reusable deliverables are paid.
- Small closed-scope services are paid fully before work starts. Larger projects
  require a confirmed deposit before project start and payment for each milestone
  before its phase. A request outside accepted scope becomes a visible scope
  change with outcome, price, schedule impact, and payment condition; no extra
  work begins before customer acceptance and the required payment.
- Each engagement names one customer-side decision authority for scope, price,
  schedule, changes, milestone acceptance, and handover. Other participant input
  is useful context but is not binding until that authority confirms it. A
  replacement or bounded delegate is explicit and time/scope limited.
- A statement made verbally, in a meeting, by email, or in chat affects a
  material commitment only after it is recorded in the canonical engagement
  context and confirmed by the authorized customer actor. Roost links the source
  communication but does not infer approval from it.
- Every milestone begins with an explicit result, acceptance criteria, evidence,
  and accountable approver. The customer reviews evidence against that baseline;
  the next milestone waits for acceptance and its applicable payment condition.
- The offer defines a review window and the delivery notice states its deadline
  and consequence. If the agreement allows it and no criteria-based objection
  arrives in time, Roost may record deemed acceptance without repeated pursuit;
  silence is never interpreted this way unless the rule was disclosed in advance.
- A result that fails the accepted scope or criteria is a defect corrected
  without an additional scope fee. A new function, changed expectation, or new
  direction is a paid scope change rather than a defect.
- The default period for reporting such defects is 30 calendar days after the
  relevant acceptance, unless the offering states another period. Later ordinary
  maintenance, updates, support, and changes require a paid maintenance
  subscription, retainer, time package, or new order.
- A reported critical security event always enters immediate assessment. The
  assessment establishes impact, cause, responsibility, and the safe next action;
  it does not automatically classify every later repair as free warranty work.
- The company can refuse, pause, or end an engagement that is illegal, unethical,
  unsafe, materially insecure, beyond demonstrated competence, commercially
  unrealistic, abusive, or incompatible with reliable delivery. Material or
  ambiguous cases show the reason and impact to the owner for decision rather
  than requiring an agent to continue blindly.
- After full settlement, the customer receives the final project-specific files,
  newly created administrative control, and rights or licence agreed in the
  contract, with handover evidence. Existing customer-owned accounts, data, and
  credentials remain the customer's. Reusable company tools and components stay
  with the company unless explicitly agreed otherwise.
- Customer-system access is never implied by assignment alone. Each person or
  agent uses an individually attributable identity, receives only the least
  scope and duration needed, and requires authorization from the recorded
  customer-side authority or administrator. Shared credentials and unbounded
  standing access are not the default.
- At project close, unnecessary company and agent access is revoked with
  evidence. Task-owned working copies are removed under the agreed retention
  basis; only copies justified by an agreed deliverable or an explicit legal,
  accounting, warranty, security, or business-evidence purpose remain.
  Customer-owned sources are not removed by this cleanup.
- The later customer-service direction prefers isolated test or staging
  environments and synthetic or anonymized data before real production data.
  Necessary production/customer-data access is explicitly approved,
  time-bounded, attributable, and audited. The enabling infrastructure is
  deferred until the service phase and adequate resources exist; the current
  owner-controlled local runtime remains governed by the separate runtime
  baseline.

## Context Model

- What the product needs to know: workspace membership, current role and
  authority, accountable department, assigned work, decisions requiring
  attention, communication preferences, and relevant context boundaries. A
  record used for internal or customer work also needs explicit subject,
  beneficiary, ownership, and relationship context where applicable.
- Work records need to distinguish the capability steward, the accountable
  department, and the assigned person or agent. The same record may be visible
  through several department views without multiplying responsibility.
- Cross-department work keeps one accountable department and records every
  contributing department, person, or agent separately. The owner can inspect
  all permitted company records globally; other roles receive scoped defaults
  subject to their authority and access.
- Members and viewers start with navigation limited to their relevant
  departments, assigned work, and permitted capabilities. The owner starts with
  a global company projection. Neither default changes the underlying authority
  or grants access beyond explicit permissions.
- What must never be inferred without evidence: approval, authority, intent,
  risk acceptance, company-specific policy, or permission to release or spend.
- Explicit preferences: communication and UI language, timezone, notification
  choices, and per-installation operating configuration.
- Learnable preferences: presentation and workflow conveniences that do not
  alter authority, policy, or product truth; learned behavior must remain
  inspectable and reversible.
- Department composition is explicit installation configuration. It must not be
  inferred from industry, imported data, or a reference template without owner
  acceptance.
- Onboarding proposes a refined department-and-capability template by default
  and shows an editable preview before acceptance. The owner can revise that
  proposal or deliberately choose the advanced blank setup. A capability set is
  configuration of shared product behavior, never a separate record store.
- The owner can revise accepted department composition and capability
  assignments after launch. Before applying a consequential revision, Roost
  shows affected views and responsibilities; the revision preserves existing
  record identity, relationships, and history and does not silently delete data.
- Context proposed from the current view must be shown before save and remain
  correctable. A view may assist data entry but cannot silently grant authority,
  select a customer, or redefine accountability.
- Provider-originated activity needs an explicit mapped actor or an honest
  provider identity when no person mapping is proven. Roost must preserve where
  and when the change occurred, the authoritative owner of the synchronized
  data, and whether the local projection is current, stale, pending, or in
  conflict.
- Provider identity that cannot be mapped exactly remains unverified and must
  not be guessed. Data exposed to the provider follows an explicit
  `sync_allowed`, `restricted`, or `roost_only` classification and the least
  scope needed for the assigned work.
- Offboarding or provider-access revocation disables the actor mapping and future
  synchronization authority immediately. Historical actions retain their
  original attribution, and affected responsibilities require explicit
  reassignment rather than silent transfer.
- Complete owner export is an accepted later-phase direction and must omit
  secrets while preserving usable business records, relationships, decisions,
  history, and provider references.
- Company removal is an accepted later-phase two-step direction: reversible
  archive first, then a separate explicit permanent deletion with visible impact
  and an opportunity to export.
- Full integration disconnection is an accepted later-phase direction: stop
  synchronization, retain prior history as disconnected, and require a separate
  explicit owner decision for any purge. Exact retention, backup, and provider
  effects remain unresolved until that phase opens.

## Maintenance Rule

When auth, permissions, onboarding, personalization, or role-specific UX
changes, update this model and linked architecture/security docs.
