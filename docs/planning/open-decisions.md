# Open decisions

## Product-first MVP operating model — general readiness rules accepted, application-specific criteria open

On 2026-09-23 the owner corrected the sequencing inferred from the 2026-09-21
objective. Roost does not begin by building the digital-service sales flow. Its
first business proof is that the owner and an explicitly authorized Roost agent
can take one already-started application from its current incomplete state to
evidence-backed readiness for subscription sale, then reuse the governed
completion process for further applications. The private reference application
identity remains installation data and is not recorded in distributed docs.

The accepted target application flow is:

`idea -> defined problem and audience -> completion plan -> build ->
verification -> sale readiness -> subscription offering -> active subscriber ->
support and renewal`.

The owner accepted the application-completion control model on 2026-09-23:

- begin with `accepted assumptions -> observed state -> contradictions and gaps
  -> completion plan -> accountable work -> verification evidence`;
- keep decision status separate from implementation state;
- classify every material accepted assumption as `not_implemented`,
  `implemented_correctly`, `implemented_incorrectly`, or `unverified`, with
  evidence;
- use distinct product-ready and sale-ready gates, each explicitly accepted by
  the owner from evidence rather than declared by the implementing agent; and
- reuse one completion blueprint across applications while retaining
  application-specific assumptions, criteria, risks, and exceptions.

The owner accepted the general application-readiness proof on 2026-09-24:

- every application names one primary intended user, that user's primary
  problem, and one end-to-end core outcome path before a positive readiness
  decision;
- the core path must produce the promised result repeatedly against explicit
  application-specific criteria without routine developer assistance; secondary
  features cannot substitute for that proof;
- a known critical blocker in the core path or required access, security, error
  recovery, monitoring, backup/restore, or support controls prevents product-ready
  acceptance;
- a known critical blocker in the offer, subscription/payment path, required
  customer information, or operating/support responsibility additionally
  prevents sale-ready acceptance; and
- the owner may accept only a non-critical limitation, with its impact, affected
  scope or users, workaround, accountable owner, review date, evidence, and
  explicit acceptance attached to the readiness decision.

The exact primary user, problem, core path, repetition threshold, acceptance
criteria, and severity thresholds are application-specific installation data and
remain open until the selected application's assumptions are reviewed. A known
limitation that invalidates the core promise or creates unacceptable security,
data, access, payment, or recovery risk cannot be waived through the exception
mechanism.

The owner also observed that a similar assessment may already have been started
through another mechanism, but does not know whether it was completed. This is
an observation and unknown, not proof of an existing complete capability. Before
any implementation, inspect the canonical product records and documentation,
reuse valid work, preserve provenance, and do not create a second source of
truth merely because the existing state is unclear.

After this product-first flow works, the accepted later service flow is:

`prospect -> free qualification and initial discovery -> offer and scope ->
accepted engagement -> required payment condition satisfied -> delivery project
-> tasks -> evidence and acceptance -> settlement status`.

Lead acquisition and a bounded initial interview are accepted free acquisition
costs because they qualify an opportunity and may lead to revenue. They are not
open-ended free consulting or delivery. After price and scope are accepted,
chargeable work starts only after the agreed payment condition is confirmed.

The owner accepted the service payment and scope boundary on 2026-09-23:

- free qualification identifies the customer's problem, mutual fit, and an
  indicative direction, scope, and budget range;
- a detailed audit, specification, design, prototype, or reusable deliverable is
  paid discovery or part of the paid project;
- small closed-scope services are paid fully before delivery begins;
- larger projects require a confirmed deposit before start and payment for each
  milestone before that phase begins; and
- an out-of-scope request requires a customer-accepted change stating outcome,
  price, schedule impact, and payment condition, with the required payment
  confirmed before additional work starts.

The owner accepted the service acceptance and handover boundary on 2026-09-24:

- every milestone defines its result, acceptance criteria, required evidence,
  and accountable approver before work starts;
- the next milestone waits for acceptance of the current milestone and
  satisfaction of the next payment condition;
- failure against accepted scope or criteria is a defect corrected without an
  additional scope fee, while a new function, changed expectation, or changed
  direction follows the paid scope-change path;
- after full settlement, the customer receives the agreed project-specific
  files, newly created administrative control, and contractually agreed rights
  or licence with handover evidence;
- customer-owned accounts, data, and credentials remain customer property and
  are not withheld; and
- reusable company tools, libraries, methods, and components remain company
  assets unless explicitly transferred or licensed differently.

The owner also accepted the service closure and maintenance boundary on
2026-09-24:

- every offer defines a customer review window and every delivery notice states
  the exact deadline, evidence, and contractual consequence of no response;
- where the agreement explicitly permits it, absence of a criteria-based
  objection within that disclosed window may close the milestone as accepted
  without repeated pursuit of the customer;
- the default defect-reporting warranty is 30 calendar days after the relevant
  milestone or final acceptance, with a different period allowed only when the
  offering states it explicitly;
- the warranty covers reproducible failure against accepted scope and criteria,
  not new requirements, third-party changes, misuse, or indefinite maintenance;
- after the warranty, ordinary support, maintenance, updates, and changes are a
  separate paid subscription, retainer, time package, or order; and
- every reported critical security event receives immediate assessment of
  impact, cause, responsibility, and safe action regardless of commercial
  status. Immediate assessment does not itself decide free remediation.

The owner accepted the customer authority and engagement-safety boundary on
2026-09-24:

- every engagement names one customer-side authority for scope, price, schedule,
  changes, milestone acceptance, and final handover;
- input from other customer participants remains context or a proposal until the
  authorized actor confirms it;
- replacement or delegation of that authority is explicit, bounded by scope and
  time, and never inferred from title, attendance, or message volume;
- a verbal, meeting, email, or chat statement changes a material commitment only
  after canonical recording and confirmation by the authorized customer actor;
- the original external communication remains linked as evidence; and
- the company may refuse, pause, or end illegal, unethical, unsafe, materially
  insecure, competence-exceeding, commercially unrealistic, abusive, or
  unreliable work. Material termination and uncertain legal, money, security,
  or reputational cases require the owner decision with reason, impact, and safe
  next step recorded.

The owner accepted the customer-system access and closure boundary on
2026-09-24:

- every person or agent uses an individually attributable identity with the
  least scope and shortest practical duration needed for accepted work;
- shared customer credentials and broad permanent access are not the operating
  default; access is granted by the authorized customer actor or administrator;
- closing a project revokes unnecessary company and agent access, removes
  task-owned working copies under the agreed retention basis, and records proof;
- material needed for an agreed deliverable or an explicit legal, accounting,
  warranty, security, or business-evidence purpose may be retained under that
  stated basis; and
- customer-owned canonical systems, accounts, credentials, and data remain the
  customer's and are not deleted as an implicit cleanup action.

For the later service phase, the owner accepted isolated test/staging and
synthetic or anonymized data as the preferred first path. Necessary access to
real production or customer data must be explicitly approved, time-bounded,
attributable, and audited. The infrastructure enabling this model is deliberately
deferred until service delivery begins and revenue or other resources can support
it. It is not a gate for the current application-first MVP. Current supervised
agent work remains under the separately accepted owner-controlled local runtime
baseline; no runtime decision or activation is changed here.

Offering-level thresholds, prices, deposit percentages, milestone amounts, and
any deliberately free promotional deliverable remain open commercial choices.
The exact review-window length, maintenance offer, and jurisdiction-appropriate
rights, licence, deemed-acceptance, warranty, or liability language remain open
contract choices. This records product intent, not legal advice or a completed
customer agreement. Exact retention periods for task-owned working copies and
evidence, plus the detailed design and funding trigger for future customer
test/staging and anonymization infrastructure, also remain open and deferred.

The owner clarified the system boundary on 2026-09-23. Each application owns its
user accounts, subscription entitlement, and access enforcement, including the
application-side response to payment callbacks. Roost does not need to mirror
that live per-user subscription state.

Roost instead owns the company operating context after a paid purchase: the
customer relationship, purchased application offering, revenue and invoice
evidence, document-routing state, accounting synchronization, exceptions, and
responsibility. Stable, repeatable, tested steps should use deterministic
callbacks, APIs, or scripts to route approved invoice copies, synchronize
accounting and Roost state, and preserve machine-checkable evidence. Explicitly
authorized agents verify that chain and handle ambiguous, provider-specific, or
exceptional work rather than consume model tokens on routine browser actions.
This is an expected product direction, not proof of current capability.

No provider has been selected. Stripe is only an example candidate. Saving an
invoice copy in its governed Google Drive context is an owner proposal, not yet
an accepted authoritative document flow. Invoice source, payment and subscription
authority, accounting provider, legal/fiscal responsibilities, retention, error
recovery, and human approval boundaries remain open. In particular, the owner is
not yet sure which exact invoice and accounting capabilities must precede the
first sale-ready acceptance or may be delivered through controlled stages. Roost
does not require live subscription-entitlement synchronization to resolve that
question.

The owner accepted that agents may automatically retrieve invoices, store
approved copies, synchronize statuses, reconcile differences, and surface
failures within explicit mandates. Refunds, price or tax changes, payouts,
transfers, and accounting corrections require explicit owner approval.

The owner accepted the following financial-operation policy on 2026-09-23:

- deterministic callbacks, APIs, or scripts perform stable, repeatable, tested
  operations with idempotency, bounded retry, reconciliation, observable failure,
  and auditable evidence;
- an authorized agent verifies the result and handles ambiguous, dedicated, or
  exceptional work, including application diagnosis or repair when judgment is
  required;
- a failed, missing, or inconsistent result creates one deduplicated attention
  item for an accountable agent; unresolved or high-risk cases escalate to the
  owner; and
- the complete subscription-payment path first passes in provider sandbox/test
  mode, then moves through a separately controlled live-mode switch and one real
  transaction independently reconciled across the payment result, application
  access response, invoice, Roost, and every applicable document/accounting
  destination. Sandbox success alone does not prove live sale readiness.

The owner accepted one canonical customer identity on 2026-09-23. A person or
organization may carry product-subscription and digital-service relationship
types simultaneously without duplicate customer records. For a product purchase,
Roost keeps the minimum business context: identity/contact, application offering,
amount and currency, purchase date, invoice reference, accounting state, and
relevant support relationship. Application login, entitlement, and access state
remain outside Roost.

The owner accepted the subscription business lifecycle on 2026-09-23. Roost
tracks the offering relationship as at least `active`, `payment_issue`,
`cancelled`, or `ended`, while the application/provider remains authoritative for
exact access. The customer cancels through the application or its payment path;
Roost updates only from the confirmed result. A failed renewal may receive the
offering's bounded automatic retries, after which an agent verifies the exception
without repeatedly pursuing a customer who chooses not to pay. Confirmed
cancellation or non-payment ends access to paid value and does not authorize
continued chargeable work.

The owner also accepted a consolidated revenue view separated by application
offering and digital service, covering paid and exceptional transactions,
invoice evidence, and accounting state. The view must preserve links to
underlying business evidence and must not become a cross-application user-access
panel.

The owner accepted the post-sale support model on 2026-09-23:

- an actionable monitoring or application-error signal creates one deduplicated
  incident linked to the application, severity, evidence, and accountable agent;
- proven deterministic safeguards act first, an agent diagnoses and coordinates
  recovery, and only unresolved or high-risk incidents escalate to the owner;
- each accepted customer request creates one support case linked to the canonical
  customer and relevant application offering or digital service;
- agents may handle cases inside accepted procedures, while ambiguity, material
  customer impact, and reserved money, legal, security, or product decisions
  escalate; and
- customer input is classified as a technical defect, support question, or
  feature proposal. Only a confirmed defect or an authorized product decision
  creates implementation work.

The support channel, response targets, severity thresholds, and rules for
customer-facing communication remain open and may differ by offering. No support
workflow or integration implementation is authorized by this decision.

Current product documentation already connects one canonical `Application`
identity across Product Engineering and Products & Services and treats projects,
tasks, procedures, decisions, and evidence as shared mechanisms. The exact
per-application criteria inside the accepted product-ready and sale-ready gates,
the state of any existing assessment mechanism, and the first-sale
  invoice/accounting capability boundary remain open before this can become a
closed MVP capability baseline.

No feature, schema, workflow, provider, billing, sales, accounting, or
application-delivery implementation is authorized by this product decision.

## Data portability and lifecycle — direction accepted, deferred beyond MVP

The owner accepted on 2026-09-21 that Roost should later provide:

- a complete readable export of Roost-owned business data and history without
  secrets;
- reversible company archive followed by separately confirmed permanent
  deletion with visible impact and an opportunity to export; and
- integration disconnection that preserves prior history as disconnected, with
  any purge requiring a separate explicit owner decision.

All three directions are deferred beyond the current MVP. Exact formats,
retention periods, backup interaction, deletion guarantees, provider effects,
and implementation stages remain unknown until that later phase is opened.

## Current product stage and removed roadmap assumptions — accepted, documentation reconciliation pending

The owner accepted on 2026-09-20 that:

- current product validation uses one human owner and supervised agents;
- invitation delivery and multi-human onboarding are deferred until the web
  foundation works and the owner has an actual need for additional human users;
  the observed invitation capability is not removed, but it is not a current
  success requirement;
- native mobile is deferred until the web owner loop works reliably;
- Company City and gamification are removed from active product and roadmap
  assumptions rather than being treated as promised later phases;
- the current product remains independently installed and self-hosted, without
  native billing, a marketplace, hosted multi-tenant SaaS, or a full native CRM
  suite in this phase.

The current architecture source still names Company City and gamification as V2
possibilities and describes mobile as V2 scope. Product documentation now records
the newer owner decision: only mobile remains deferred, while the other two are
not accepted directions. Reconcile those architecture statements explicitly
before any related planning or implementation. The frozen
`docs/product/requirements.md` remains unchanged; its invitation rule
continues to govern who may invite if that capability is used and does not make
multi-human onboarding a current product requirement.

No code, invitation configuration, email delivery, mobile work, billing,
marketplace, hosting-model change, CRM expansion, or architecture rewrite is
authorized by this product decision.

## Configurable company composition — product direction accepted, architecture reconciliation pending

The owner accepted the product direction on 2026-09-20:

- each company may construct its own departments and attach views backed by
  capabilities available across Roost;
- `00 General` plus the twelve model departments is a best-practice starting
  template, not a mandatory topology for every installation;
- onboarding proposes that refined department-and-capability template by
  default, shows an editable preview before acceptance, and retains an
  intentionally blank setup as an advanced option;
- an onboarding "module" is only a configurable capability set, preferably
  presented with the plain-language label "capability set" or localized "zestaw
  funkcji"; it does not create a separate store, product fork, or duplicate
  record model;
- one product and shared capability model serves both internal and
  customer-facing work when the behavior is the same; relationships such as
  owner, beneficiary, customer, project, or subject provide context;
- every shared capability has exactly one company-wide steward for findability,
  rules, and quality while remaining usable through contextual views in every
  relevant department. Operations is the
  accepted example for task organization: it provides the cross-company task
  view, while other departments work on the same canonical task records;
- each task identifies its accountable department and assigned person or agent,
  and may appear in more than one relevant view without creating copies;
- cross-department work retains exactly one accountable department while
  recording any number of contributing departments, people, and agents;
- the owner receives a global projection of company records, while department
  views are scoped by default and link to the same canonical records;
- members and viewers start from only the departments, tasks, and capabilities
  relevant to their responsibility and permissions, while the owner starts from
  the global company view;
- departments combine organizational accountability with configured work
  surfaces, including leadership, people, goals, budgets, and decisions;
- after launch, the owner may change departments and attached capabilities;
  consequential changes require an impact preview and must preserve canonical
  record identity, relationships, and history rather than deleting data hidden
  by the new configuration;
- context derived from a view may be proposed during creation only when it is
  visible and correctable before save;
- separately installable modules or industry templates are not a requirement by
  default and should not fragment complementary company capabilities.

Future onboarding templates may represent other operating patterns, but they
must configure the same shared capability and record model rather than introduce
industry-specific product forks.

This target conflicts with the current accepted fixed-topology statement in
`RF-GOV-003` and with V1 architecture that names thirteen fixed areas. The frozen
`docs/product/requirements.md` remains unchanged. Before any
implementation, an explicit supersession and impact decision must define at
least stable area identity, the fate of `00 General`, hierarchy and workforce
assignment, permissions, navigation, provider mappings, existing-installation
migration, capability stewardship, contextual creation defaults, and
compatibility with shared-record projections, configuration versioning, impact
preview, and safe detachment or reassignment when a department or capability is
removed from a view.

No code, schema, runtime, migration, or deployment change is authorized by this
product decision.

## Integration coverage map — governing rules accepted, provider choices partly open

The owner accepted on 2026-09-20 that provider-only participants may create and
update work inside an explicitly synchronized scope, without gaining authority
over company goals, accepted decisions, permissions, mandates, or accountability.
Unmapped provider identities remain honest unverified provider actors. Data uses
`sync_allowed`, `restricted`, or `roost_only` classification with least-necessary
scope.

Not every Roost capability needs an external provider. Native Roost behavior is
complete product behavior, not a temporary gap. The current interview map is:

- tasks: ClickUp is the accepted first-class provider and bidirectional work
  surface;
- files, Docs, and Sheets: Google Drive is an accepted shared provider capability
  stewarded by Technology and usable through scoped department, project, and
  customer contexts across the company;
- customer relationship work: HubSpot is a candidate for later evaluation, not
  an accepted adapter or implementation claim;
- strategy and procedures: no provider is selected or required; keep these
  Roost-native unless a later workflow demonstrates clear integration value.

Future provider selection must define authoritative records or fields, identity
mapping, synchronization directions, allowed creation/update scope, data
classification, conflict handling, outage recovery, and evidence before
implementation. A provider qualifies only when people genuinely need to work in
that service and a safe bidirectional contract is possible. No adapter, purchase,
connection, or data transfer is authorized by this interview note.

RF-RUNTIME-005B30 kwalifikuje osobną klasę `synthetic_fixed`: stały program,
publiczne API/Ready/claim i Worker, pierwotny ownership B28, zawieszony Job,
trwały resume receipt/ack, dokładnie 22 bajty wyniku, niezależne review i cleanup.
[Tabela gotowości](../architecture/agent-delivery-readiness.md) opisuje dodatni E2E oraz odmowę
bez resume receipt. Dowód dotyczy zamkniętej semantyki tego programu, bez sandboxa.
Hermes, Direct i sześć flag pozostają zablokowane/false. Jedyna następna luka:
RF-HOST-035 — dopuszczenie ochrony host lifecycle dla rzeczywistego providera.
Nie ma zgody na model trial ani automatyczną kontynuację; propozycje poniżej
są historyczne.

RF-RUNTIME-005B26 [adopted recovery](../architecture/hermes-b26-adopted-recovery-v1.md) defines the separately owner-authorized
one-use cleanup of the exact B25-adopted B21 fixture, then its lease and Writer.
A signed append-only consumption/intent chain, exclusive controller and recovery
barrier fence each identity-checked deletion and deterministic resume. Original
B21/B24/B25 evidence and spent records remain historical truth; successful recovery
is not task acceptance. All six flags stay false, with no provider/API/configuration
authority or production autonomy. The proposed next atom is B27 durable original
fixture-ownership evidence at creation, source/synthetic only. See the contract for
the verified terminal state; earlier successor statements below are historical.


RF-RUNTIME-005B25 [exact legacy fixture adoption](../architecture/hermes-b25-legacy-adoption-v1.md) implements the owner's
one-shot acceptance of B21's missing historical parent-fixture ownership proof.
It freezes canonical paths, physical objects and all B21/B24/control/runtime
evidence in a separate append-only record; original history is never backfilled.
Adoption expires after 24 hours and grants no cleanup, execution, API or config
authority. Only B26 preparation may qualify, subject to fresh checks and a new
explicit owner decision for that separate recovery atom. All six flags remain
false; production autonomy is not ready. Execution ADR v13 and runtime policies
remain unchanged. Earlier status and successor statements below are historical.


RF-RUNTIME-005B24 [recovery evidence supplement](../architecture/hermes-b24-recovery-supplement-v1.md) implements versioned
identity bridging and append-only later verification without rewriting the original
B21 REFUSED review or spent authorization. Recovery remains **BLOCKED** on missing
historical parent-fixture ownership; a present marker cannot recreate that proof.
No cleanup, barrier, grant or provider activation is authorized. One proposed owner
decision is an exact-identity recovery/adoption contract addressing that gap.
ADR-004 execution v13, native-risk v7, profile/registry v5, startup v2 and all six
false public flags remain unchanged. Earlier successor statements are historical.


RF-RUNTIME-005B23 [Windows startup
environment](../architecture/windows-startup-environment-v1.md) derives SystemDrive from
the verified local SYSTEMROOT, checks parent agreement, rejects unresolved configured
path tokens and binds the value/physical root into startup receipt and policy v2. Every
pre-spawn proof rechecks live Worker identity; task/API candidates cannot override it.
Profile/registry v5, owner attestation, native-risk v7 and ADR-004 execution authority
v13 stay unchanged. B21 evidence, fixture, Writer/lease/spent remain retained; its
eight-entry attribution and recovery blockers are unchanged. No provider, cleanup,
barrier or new grant is authorized. One next proposed atom is B24: a versioned
append-only recovery-evidence contract with synthetic tests, without actual B21 cleanup
or activation. All six public flags remain false. Earlier outcomes and successor
statements below are historical.

RF-RUNTIME-005B22 [preserved-footprint
diagnosis](../architecture/hermes-b22-footprint-diagnosis-v1.md) is complete with
**BLOCKED attribution (8 unknown entries)**. All eight additions are unchanged: five
directories and three cache-shaped binaries under a literal unresolved SystemDrive path.
The Worker drops SystemDrive, but the creating process is unproven. Independent system
Node now passes the unchanged arithmetic test; the exact repair and baseline are
verified. B21 remains acceptance_failed and spent. Ordinary recovery is blocked by
identity serialization order and the original signed REFUSED verification; no B21
evidence, fixture, lease or Writer was changed. One proposed owner action is B23: a
validated SystemDrive environment correction with synthetic tests, without provider
execution or cleanup. See the diagnosis for the separate recovery evidence requirements.
ADR-004 v13, profile/registry v5, native-risk v7 and all six false public flags remain
unchanged. Earlier outcomes and next-step statements below are historical.

RF-RUNTIME-005B20 [exact legacy B17 recovery](../architecture/hermes-b20-legacy-recovery-v1.md) is **DONE**
under the explicit ADR-004 v12 owner exception. Exact application lease then
Writer were removed, each absence read back; B13/B14/B17 spent records retain
original bytes and physical identities. The private journal is complete, the
exception spent/disabled and the recovery barrier released. Seven bounded process
checks found no matching live process; missing historical identity proof remains
explicitly unavailable. Strict B19 recovery remains the default. B17 repair/test
acceptance stays BLOCKED. One proposed successor is a separately owner-authorized
B21 single new coding smoke; no activation follows automatically. Profile/registry
v5, native-risk reference v7 and all six false public flags remain unchanged.
Earlier pending-recovery and successor statements below are historical.

RF-RUNTIME-005B19 [root-scoped review and reconciliation v2](../architecture/hermes-root-scoped-review-reconciliation-v2.md) is implemented and synthetically qualified. Ordinary safe coding paths are
acceptance scope, while protected paths remain blocked. Durable private evidence
precedes verification, terminal receipt, owned cleanup and lease/Writer release.
Future recovery requires a complete identity chain and separate explicit owner
authority. The real B17 legacy dry run refuses seven missing evidence requirements;
its Writer, application lease and all spent records remain unchanged. The sole
next owner action is a decision on a separately scoped legacy-only recovery
exception; no bypass or new run follows. ADR-004 is v11 for this policy amendment,
profile/registry stay v5, native-risk binding stays v7 and all six public flags
remain false. Earlier successor/version statements below are historical.

RF-RUNTIME-005B18 [source/synthetic diagnosis](../architecture/hermes-b18-footprint-diagnosis-v1.md) is complete,
but real B17 root-cause attribution and lock-recovery proof remain **BLOCKED**.
Minimal repair/test and completed atomic replacement pass the unchanged footprint;
undeclared paths or byte-identical undeclared rewrites can trigger violations.
Loss of diagnostic evidence before fixture deletion is confirmed. The retained
Writer/lease match each other but lack the complete spent/process identity chain.
Both artifacts remain untouched. Only B19 root-scoped protected-path policy,
durable evidence ordering and guarded reconciliation are proposed; deletion needs
separate owner approval plus currently missing proof. ADR-004 stays v10, all six
public flags stay false, and no provider started in B18. Earlier next-atom
statements below are historical.

RF-RUNTIME-005B17 [one-shot coding smoke](../architecture/hermes-b17-coding-smoke-v1.md) is **BLOCKED** after
one authorized provider start under ADR-004 v10. Root exit 0 was rejected by
native review (unexpected_changed_path); exact repair and independent test PASS
were not established. Genuine Job cleanup and owned fixture removal passed.
Separate post-result full installation readback passed without receipt changes.
Writer and one application lease remain held for reconciliation; all B13/B14/B17
authorizations are spent. All six public flags remain false. Exactly one proposed
successor is B18 source-only footprint diagnosis and reconciliation-plan
qualification, with no runtime/private mutation or new execution. Earlier
B16/no-launch/version-9 and successor statements below are historical.

RF-RUNTIME-005C [native owned-job qualification](../architecture/windows-owned-process-job-v1.md)
is complete for local fixture process lifetime/cleanup. Native receipt validation
is required per attempt; missing proof remains fail-closed.
[RF-RUNTIME-005B4 same-owner qualification](../architecture/hermes-same-owner-profile-v1.md)
is complete using explicit private owner attestation. A stable account ID is not
required. Installed CLI help does not establish secret-free status output; no
status command was run and availability is not claimed. Attestation is checked
at sealing/pre-spawn, expires within 90 days, and requires explicit renewal on
expiry/revocation or reported account/session/config changes. Silent account
switches and unreported session loss remain residual risks.
[RF-RUNTIME-005B5 effective-config qualification](../architecture/hermes-effective-config-qualification-v1.md)
is BLOCKED: exact-pin loader data is partial, with intercepted read/import attempts
and unqualified startup/tool/rotation consumers. Its private negative receipt grants
no Ready/admission authority. [RF-RUNTIME-005B6 source analysis](../architecture/hermes-minimal-startup-contract-v1.md)
recorded NOT_SUPPORTED for strict minimal startup. B7 resolves that requirement
through explicit owner acceptance of local skills sync/banner prefetch, with
network updates off. Exact Worker startup policy and Ready/input-bound receipt are
implemented and synthetically tested; only the local config blocker is removed
with fresh proof. Real Hermes launch remains denied.
[RF-RUNTIME-005B8 attempt/budget qualification](../architecture/hermes-attempt-budget-contract-v1.md)
remains historical evidence of missing physical dispatch/token boundaries.
RF-RUNTIME-005B9 owner amendment supersedes those pilot requirements with the
[implemented practical attempt policy](../architecture/hermes-practical-attempt-budget-v1.md):
24 logical turns; retry setting 2; original deadline at most 900 seconds;
native cleanup; no resume or whole-task restart; unavailable accounting null;
exit 0 only candidate_result for independent review. Private v3 profile is read
back with owner identity/confirmation/expiry preserved. This is synthetic/native
fixture qualification, not real Hermes execution. All six flags remain false.
[RF-RUNTIME-005B11 native audited coding](../architecture/hermes-native-tool-boundary-v1.md)
is implemented under ADR-004 v7. Owner acceptance resolves B10's one pending
risk decision; authority, v4 startup, leases, manifests and owned cleanup have
synthetic qualification. Native tool isolation remains technically incomplete;
violations block review/release and unobserved/transient effects remain accepted
risk. Only fresh opaque proof removes the local native-tool blocker. All six
flags remain false. [RF-RUNTIME-005B12 local launch admission](../architecture/hermes-local-launch-admission-v1.md)
is source/synthetic qualified with a single opaque, expiring, one-use proof set.
Local policyQualified can be true while activationAuthorized=false and
spawnStarted=false. B11 cleanup is closed by verified owner removal.
RF-RUNTIME-005B16 [controlled rebuild and split attestation](../architecture/hermes-controlled-rebuild-v1.md)
is **DONE**. The unchanged exact source pin now has a verified canonical venv
with 83 original distributions, no optional AWS closure, 23,653 immutable files
and 826 separately verified generated files. Profile v5 and the sealed Worker
environment deny lazy installation. Owner identity/confirmation/expiry, private
data and B13/B14 spent records are preserved. Staging/rollback cleanup and fresh
file-only admission passed. No Hermes/model run or new activation occurred.
ADR-004 execution decision remains v9 and all six public flags remain false.
Earlier next-step/lock/launch statements below are historical.

The first-provider choice is resolved by RF-RUNTIME-002 /
[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md): native Hermes using
Codex OAuth behind Windows Local Worker; direct CLI alternative and Herdr optional.
Workspace, one-writer, cleanup, secrets, Ready/review and release guards remain.
No VM/Windows Sandbox/Hyper-V prerequisite. No runtime activation follows.

## Same-owner authentication — attestation qualified, runtime still blocked

[RF-RUNTIME-005A](../architecture/hermes-supervised-quiet-v1.md) accepts public
quiet/oneshot on existing stable 0.21.2 for the first supervised pilot. Waiting
for unreleased stream-json is no longer required; older rejection evidence remains
historical. B1/B2 profile-only isolation findings remain historical after the B3
owner amendment. B4 accepts the explicit owner attestation as authoritative for this single-owner
pilot; technical account identity is not required. No OAuth or model operation
occurred in B3/B4. Fresh owned-tree receipts remain mandatory;
effective config, auth/tool
boundaries, internal turns and hard budgets remain unqualified; all six runtime
flags stay false. Config completion must not be reported as pilot readiness.

Local Ollama with OpenAI gpt-oss or Mistral/Devstral is **PLANNED/DISABLED**.
Installation waits for confirmed disk expansion and resource/quality qualification.
Later routing is explicit by competencies, risk, quality, cost, resources and
privacy, with visible escalation and no automatic fallback.

## Accepted foundations

- PostgreSQL is the canonical operational data store.
- The API is the supported write boundary for web clients, agents and
  integrations.
- Owner registration creates a workspace; business records and integration
  settings are workspace-scoped.
- ClickUp is the first native provider adapter; n8n remains optional.
- The React owner console is the human control plane.
- Codex Agent Host and other agents are external supervised clients. They do not own
  Roost's product model or repository state.
- Production uses reviewed Prisma migrations and a Coolify-compatible Docker
  deployment.

Add new unresolved decisions here only when they materially affect scope,
ownership, architecture or release safety.
