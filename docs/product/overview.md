# Product Overview

## Plain-Language Summary

Roost is a reusable, self-hosted company operating system for owners, their
teams, and supervised agents. Each company receives an independently configured
installation and workspace boundary. Roost keeps operational records,
integrations, decisions, and agent activity within a workspace-scoped
PostgreSQL and API foundation instead of allowing them to drift across tools.

The reference installation supplies real usage evidence and may introduce
specialized capabilities. Those capabilities should become reusable product
behavior or explicit per-installation configuration when they can serve other
companies or industries; private assumptions must not be hard-coded as universal
defaults. The first delivered foundation must make the owner web console, HTTP
API, and MCP access dependable while retaining ClickUp and Google Drive as
governed providers. `CompanyCore` remains a legacy technical identifier for
existing runtime surfaces; it is not a separate product.

Companies may compose their own departments and operating areas from shared
Roost capabilities. The reference `00 General` plus twelve-department company
model is a best-practice starting template, not a mandatory topology for every
installation. Shared capabilities remain complementary across the company: the
same website, project, task, process, knowledge, or evidence mechanisms can
serve internal or customer work, with relationships providing context instead
of duplicate product modules.

The default onboarding path is guided setup from a refined template that
combines departments with relevant capability sets, beginning with the reference
model and allowing future template variants. Before acceptance, the owner sees
an editable preview and can change the proposed structure. An intentionally
blank setup remains available as an advanced option. In this context, a product
"module" means a configurable capability set, preferably labelled in plain
language as a "capability set" or localized "zestaw funkcji"; it never creates a
separate store or duplicate record model. After setup, the owner can change the
department and capability configuration through an impact-aware,
history-preserving change rather than deleting the underlying company records.

Every shared capability has one responsible company-wide steward while remaining
available in every relevant department. Operations, for example, governs the
task system and its cross-company overview, while Sales, Technology, and other
departments create and work with scoped views of the same canonical tasks.
Technology similarly governs the shared Google Drive capability and integration
quality, while files, Docs, and Sheets remain available through the relevant
department, project, and customer contexts across the company.
Departments also remain real organizational units with accountable leadership,
people, goals, budgets, and decisions; their configured views do not create
parallel records.

Cross-department work retains one accountable department and can include many
contributing departments, people, and agents. The owner can inspect a global
projection of company records; department views are scoped by default and link
back to the same records. Members and viewers start from the departments, tasks,
and capabilities relevant to their responsibility and permissions; the owner
starts from the global company view.

The owner control plane prioritizes actionable attention rather than general
activity. Blockers, overdue work, risks, pending decisions, defects, and business
opportunities appear when they require a concrete response. Roost may recommend
priority with a visible explanation, while an authorized owner or manager
confirms changes. Accepted decisions show their impact on linked goals, projects,
tasks, and processes before that impact is applied and recorded.

ClickUp, Google Drive, and future approved providers are bidirectional work
surfaces. A worker can receive and complete permitted work through a provider
without direct Roost-console access, while Roost retains company structure,
governance, accountability, relationships, and synchronization provenance. Each
synchronized record or field has one declared authoritative owner. Concurrent
changes never overwrite silently. During an outage, Roost shows the last valid
state as stale, preserves pending synchronization intent, and performs bounded
catch-up and conflict reconciliation after recovery.

External coverage is optional per capability. Roost remains fully responsible
for capabilities such as strategy or procedures even when no useful external
service exists. Provider-only participants may create or update records only in
their mapped synchronization scope; this never grants authority over company
direction, decisions, permissions, or accountability. Provider accounts are
mapped to exact Roost actors when proven, otherwise their original identity is
retained as unverified. Data is classified as synchronization-allowed,
restricted, or Roost-only and shared with the least necessary scope.

Only owners and administrators connect providers and choose synchronized
workspaces, lists, folders, or equivalent scopes. The capability steward
proposes data classification; an owner or authorized administrator accepts it.
Weakening protection is explicit and audited. Offboarding disables the actor's
provider mapping and future synchronization authority immediately, preserves
historical attribution, and surfaces affected work for reassignment.

## Current Phase

- Phase: internal Roost-plus-Worker foundation; the managed agent runtime remains
  incomplete until the end-to-end gates in `../implementation.md` pass.
- Primary outcome for this phase: a workspace-safe owner control plane and
  agent integration boundary built around the operating loop `attention ->
  decision -> accountable delegation -> completion evidence`.
- Current first-stage objective: Roost plus the Local Worker provides the owner
  with a governed team of agents that retains bounded context, divides
  responsibility and completes a real end-to-end task with evidence and review.
  Internal atoms and subjective progress estimates are not completion.
- First application-work proof: those agents take over one already-started
  configured application, establish its truthful assumption/implementation
  baseline without mixing product contexts, complete an accepted verified
  outcome, and reuse the mechanism for another application. Subscription sale
  readiness, customer acquisition and digital-service sales follow later.
- Application completion starts by separating accepted product assumptions from
  observed implementation. Each material assumption is classified as not
  implemented, implemented correctly, implemented incorrectly, or unverified
  and linked to evidence. Product readiness and sale readiness are separate
  owner-accepted gates. Existing assessment mechanisms must be inspected before
  another source of truth is introduced.
- Product readiness means a real intended user can obtain the promised value
  through the core experience without routine developer help and that the
  application has proportionate security, error handling, monitoring, recovery,
  and support. Each application owns its user accounts and subscription-access
  state; Roost does not duplicate that administration. Roost receives only the
  company-level customer, product, invoice, revenue, accounting, and exception
  context needed to operate the business. The desired document and accounting
  flow is automated and visible in Roost, while exact providers remain open.
  Stable repeatable steps use tested callbacks, APIs, or scripts; agents verify
  evidence and resolve exceptions. The complete payment path must pass first in
  sandbox/test mode and then through a controlled live switch plus one real,
  independently reconciled transaction. Failures create one accountable,
  deduplicated attention item and unresolved or high-risk cases reach the owner.
- Each application readiness profile names one primary intended user, the
  primary problem, and one end-to-end core outcome path that must work
  repeatedly without routine developer help. Known critical blockers in that
  path or its required access, security, recovery, monitoring, backup, support,
  offer, payment, customer-information, or operating controls prevent the
  applicable readiness gate. The owner may accept only non-critical limitations,
  each with visible impact, scope, workaround, accountability, review date, and
  evidence.
- One canonical customer can carry both a product-subscription relationship and
  a digital-service relationship. Roost keeps the minimum business data needed
  for revenue, invoices, accounting, and support context and presents an owner
  revenue view separated by application offering and service.
- Roost tracks subscription relationships as active, in payment difficulty,
  cancelled, or ended while each application remains authoritative for exact
  access. Confirmed cancellation or non-payment ends paid value according to the
  offering terms; bounded provider retries may run, but agents do not repeatedly
  pursue customers who choose not to pay.
- In the later service flow, lead acquisition and a bounded initial discovery
  interview are free acquisition costs and stop at problem, fit, and indicative
  scope or budget. Detailed audits, specifications, designs, prototypes, and
  reusable outputs are paid. Small closed-scope work is paid fully in advance;
  larger projects require a deposit and payment before each milestone. Work
  outside scope requires an accepted change with price, schedule impact, and
  confirmed payment before execution. Each milestone has prior acceptance
  criteria and evidence; defects against that baseline are corrected without an
  added scope fee, while new expectations are paid changes. Final agreed files,
  control, and rights/licence are handed over after settlement, but reusable
  company assets are retained unless explicitly transferred or licensed. Each
  offer discloses a review window and may use contractually agreed deemed
  acceptance after silence. The default defect warranty is 30 calendar days;
  later ordinary maintenance is paid, while every critical security event still
  receives immediate assessment of impact, cause, and responsibility.
- Each service engagement identifies one authorized customer decision actor.
  Comments from other participants and external channels remain evidence or
  proposals until canonically confirmed by that actor. Roost never infers
  authority from a title or conversation. The company may refuse, pause, or end
  unlawful, unethical, unsafe, materially insecure, abusive, incompetent, or
  commercially untenable work through a recorded, owner-governed decision.
- Later service delivery uses individually attributable, least-privilege,
  time-bounded customer-system access without shared credentials. Project close
  revokes unnecessary company and agent access and removes task-owned working
  copies under an explicit retention basis, while preserving required evidence
  and never deleting customer-owned sources implicitly. The accepted future
  data path prefers isolated test/staging environments and synthetic or
  anonymized data; necessary real-data access is approved and audited. This
  infrastructure is deferred and does not alter the current owner-controlled
  local runtime baseline for the application-first MVP.
- Post-sale operation distinguishes a deduplicated technical incident, a
  customer support case, and a feature proposal. Incidents and cases receive
  explicit responsibility; agents handle them within accepted procedures and
  only unresolved, high-risk, or reserved decisions reach the owner. A feature
  proposal does not become implementation work without an authorized product
  decision.
- Current validation cohort: one human owner and supervised agents. Existing
  invitation and additional-human role capabilities are not removed, but
  multi-human onboarding is not a success requirement for this phase.
- Native mobile is deferred until the web owner loop works reliably. Company
  City and gamification are not active product or roadmap assumptions.
- What is intentionally out of scope: native billing, a marketplace, hosted
  multi-tenant SaaS, a full native CRM suite, and broad automation
  orchestration.
- Complete owner export, two-stage company deletion, and the full
  disconnect-and-purge lifecycle for integrations are accepted later-phase
  directions, not MVP requirements.
- Product-direction caveat: the current runtime still implements the fixed
  reference areas. `RF-PROD-002` supersedes fixed topology as the accepted
  product target, while the technical migration remains open and unimplemented.
  Existing records and history must not be treated as disposable merely because
  the target structure is configurable.
