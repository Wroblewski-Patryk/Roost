# Accepted requirements

Status: current accepted product requirements. Private interview provenance and
installation details are maintained outside this repository.

This is the canonical product, architecture, operations and release
requirements registry. It is not an execution queue, agent memory or a claim of
completed implementation.
The [traceability matrix](../architecture/traceability-matrix.md) separately records
implementation/proof status. Repeated approvals are consolidated into requirements
with explicit acceptance clauses; none of these clauses independently authorizes
execution, external writes or financial tests.

## Maintenance and provenance

These requirements describe the reusable product. Examples are fictional and do not configure a deployment or authorize access to another installation.

IDs remain stable. Do not repurpose or renumber an ID. Update the current
requirement in place when the owner changes the accepted rule; Git preserves the
prior wording and rationale. Add a new ID only for a genuinely new requirement,
not for another interview or implementation iteration. Evidence status may
advance in the matrix without rewriting product intent. `accepted`, `deferred`
and `rejected` describe decisions, not implementation.
P0/P1/P2 are engineering dependency priorities assigned during this audit,
not owner approval or a runtime incident priority.

## Product direction and precedence

The requirements in this file are the current accepted product intent. When a
current requirement explicitly supersedes older fixed-scope wording in an
architecture, planning, or historical interview document, the older wording
remains evidence of the previous decision but cannot authorize new product work.
Observed implementation remains a separate fact: accepting a target requirement
does not claim that the current runtime implements it or authorize execution.

The whole-product requirements below are separate from the agent-runtime
activation requirements later in this file. Runtime completion is a prerequisite
for supervised agents to deliver product work safely; it does not replace the
application-first business objective or silently activate any later product
feature.

`RF-PROD-*`, `RF-OUT-*`, `RF-APP-*`, `RF-BIZ-*`, `RF-SUP-*`, `RF-SVC-*`,
`RF-INT-*`, and `RF-SCOPE-*` consolidate owner decisions accepted during the
whole-product interview on 2026-09-20 through 2026-09-25. Their dated rationale
is retained in `docs/planning/open-decisions.md`. Until an implementation audit
adds evidence to the traceability matrix, each new requirement is unassessed and
must not be reported as implemented merely because it appears here.

## Product identity, company composition, and onboarding

Gate/scope of enforcement: product model and company setup.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-prod-001"></a>RF-PROD-001 | [Product identity](product.md#product-identity) | accepted | Roost is a reusable, independently installed and configurable self-hosted company operating system. The reference installation supplies real usage evidence, while private company identity, portfolio, paths and operating choices remain per-installation configuration rather than universal defaults. | — |
| <a id="rf-prod-002"></a>RF-PROD-002 | [Company composition](product.md#accepted-company-composition-direction) | accepted | Each installation may configure its departments and attach shared Roost capabilities. `00 General` plus twelve model departments is the recommended starting template, not mandatory topology. The currently fixed V1 surface is observed implementation and requires an explicit migration design before it can satisfy this target. | Supersedes the fixed-topology target previously recorded in RF-GOV-003. |
| <a id="rf-prod-003"></a>RF-PROD-003 | [Company composition](product.md#accepted-company-composition-direction) | accepted | Capabilities and records remain canonical and reusable across internal and customer work. Contextual department, project and customer views never create parallel stores. Each capability has one company-wide steward; each work record has one accountable department and an assigned person or agent, while contributing departments remain explicit without diluting accountability. | — |
| <a id="rf-prod-004"></a>RF-PROD-004 | [Onboarding](product.md#accepted-onboarding-direction) | accepted | Default onboarding proposes an editable preview of the refined department-and-capability template. The owner may change it before acceptance or choose an intentionally blank advanced setup. A product "module" means only a configurable capability set and must not imply a separate product fork or record store. | — |
| <a id="rf-prod-005"></a>RF-PROD-005 | [Target users](product.md#target-users) | accepted | Current product validation uses one human owner and supervised agents. Administrator, employee, viewer and invitation-based multi-human roles remain valid, but invitation delivery and multi-human onboarding are not current success gates. | — |
| <a id="rf-prod-006"></a>RF-PROD-006 | [User model](user-model.md#context-model) | accepted | The owner starts from a global company projection. Other people start from only the departments, capabilities and work relevant to their responsibilities and permissions. A view may propose visible, correctable context but cannot infer authority, approval, customer selection or accountability. | — |
| <a id="rf-prod-007"></a>RF-PROD-007 | [Company composition](product.md#accepted-company-composition-direction) | accepted | A department combines organizational accountability with a configured work surface and may have leadership, people, goals, budgets and decisions. Operations is the company-wide steward for task organization while every relevant department works through contextual views of the same task records; Technology stewards the shared Google Drive capability while its governed files, Docs and Sheets remain usable in relevant department, project and customer contexts. | — |
| <a id="rf-prod-008"></a>RF-PROD-008 | [Company composition](product.md#accepted-company-composition-direction) | accepted | After launch, the owner may revise departments and attached capability sets. Before a consequential change, Roost shows affected views and responsibilities; applying it preserves canonical record identity, relationships and history and does not treat removal from a view as data deletion. | — |
| <a id="rf-prod-009"></a>RF-PROD-009 | [Company composition](product.md#accepted-company-composition-direction) | accepted | Separately installable modules or industry-specific product forks are not required by default. Introduce separate packaging only when a demonstrated difference in lifecycle, permissions, dependencies or distribution cannot be served by shared capabilities plus explicit context. | — |
| <a id="rf-prod-010"></a>RF-PROD-010 | [Target users](product.md#target-users) | accepted | Roost work, decision, responsibility and escalation mechanisms are actor-neutral. A role may be occupied by a person, an agent, or an explicitly governed combination; authority follows the role and mandate rather than actor type. Work is resolved at the lowest authorized level and escalates only when it exceeds that mandate, crosses accountable areas, or changes accepted business direction. | — |
| <a id="rf-prod-011"></a>RF-PROD-011 | [Product goal](product.md#current-first-stage-mvp) | accepted | The current first-stage MVP is an internally usable Roost plus Local Worker that supplies a governed team of agents for the owner. It must preserve company and application context, divide responsibility, avoid cross-application assumption leakage, and enable agents to take over and finish already-started applications. Selling Roost, multi-human operation, customer infrastructure and native mobile are not gates for this stage. | Supersedes wording that treated subscription sale readiness as the immediate first-stage Roost MVP. |
| <a id="rf-prod-012"></a>RF-PROD-012 | [Product goal](product.md#current-first-stage-mvp) | accepted | Roost is the shared work surface and visible operating record, not an autonomous actor by itself. Deterministic scripts collect data and perform repeatable operations; authorized people or agents interpret, decide and update Roost within their roles. The owner retains reserved business decisions. | — |
| <a id="rf-prod-013"></a>RF-PROD-013 | [Product rules](product.md#product-rules) | accepted | Every task, decision, case or process has exactly one accountable actor or role at a time. Contributors may be many, including people and agents together, but transfer of accountability is explicit and carries the relevant context, history and evidence. | — |

## Owner workflow and outcome requirements

Gate/scope of enforcement: owner control plane and product success.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-out-001"></a>RF-OUT-001 | [Product goal](product.md#product-goal) | accepted | The primary owner loop is `what requires attention -> what decision is needed -> who is accountable for delivery -> what evidence proves completion`. Roost must keep these stages connected instead of requiring the owner to reconstruct state across tools. | — |
| <a id="rf-out-002"></a>RF-OUT-002 | [Product rules](product.md#product-rules) | accepted | The attention surface contains blockers, overdue work, risks, pending decisions, defects and business opportunities only when a concrete response is needed. Priority recommendations show their rationale; an authorized owner or manager confirms material priority changes and history is preserved. | — |
| <a id="rf-out-003"></a>RF-OUT-003 | [Product rules](product.md#product-rules) | accepted | Before an accepted decision changes linked goals, projects, tasks or procedures, Roost shows the affected scope and expected consequences. An authorized actor separately accepts the impact and the previous direction remains traceable. | — |
| <a id="rf-out-004"></a>RF-OUT-004 | [Success metrics](success-metrics.md#ninety-day-outcome-set) | accepted | Product success includes faster owner orientation, fewer lost assumptions and decisions, faster decisions, more work with an accountable executor, more completion with inspectable evidence, and successful agent work with less continuous owner supervision. Baselines and numeric targets remain open until measured honestly. | — |
| <a id="rf-out-005"></a>RF-OUT-005 | [Product goal](product.md#current-first-stage-mvp) | accepted | Progress and completion are derived from satisfied end-to-end gates and inspectable evidence, not an agent's subjective percentage or claim that work is nearly done. Internal atoms, contracts, tests and commits may support delivery but are not handoff or completion boundaries when the accepted outcome is a working integration. Discovery of more work updates the truthful scope and blockers without redefining a partial result as complete. | — |
| <a id="rf-out-006"></a>RF-OUT-006 | [Product rules](product.md#product-rules) | accepted | Work priority is derived from accepted goals, binding deadlines, risk, blockers and dependencies with a visible rationale. An authorized role may change priority within mandate. When competing goals require a business-direction trade-off not resolved by existing authority, the responsible role presents options, impacts and a recommendation to the next authorized level rather than choosing silently. | — |
| <a id="rf-out-007"></a>RF-OUT-007 | [Product rules](product.md#product-rules) | accepted | Goals identify a measurable result, metric, target, evidence source and responsibility. The owner or authorized manager accepts business goals and target changes; scripts may collect deterministic measures and a responsible agent or person may interpret and update progress. A binding deadline, an uncertainty-bearing forecast and an execution schedule remain distinct facts; unknown estimates are reported as unknown rather than guessed. | — |

## Application-first business lifecycle and readiness

Gate/scope of enforcement: current MVP and every application readiness decision.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-app-001"></a>RF-APP-001 | [MVP scope](mvp_scope.md#mvp-business-objective) | accepted | After Roost plus Worker proves a real governed agent round trip, its first product-work proof is to take one already-started configured application from its current state through an evidence-backed completion flow, then reuse that flow for further applications. Subscription sale readiness is a later gate after the internal creation/completion system works. Prospect acquisition, digital-service delivery and sale of Roost follow later. The selected application identity remains private installation data. | Supersedes wording that collapsed Worker readiness, application completion and first sale into one immediate MVP gate. |
| <a id="rf-app-002"></a>RF-APP-002 | [Business sequence](product.md#accepted-business-sequence) | accepted | The target product flow is `idea -> defined problem and audience -> completion plan -> build -> verification -> sale readiness -> subscription offering -> active subscriber -> support and renewal`. One canonical Application identity connects Product Engineering and commercialization while projects, tasks, procedures, decisions and evidence remain shared mechanisms. | — |
| <a id="rf-app-003"></a>RF-APP-003 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | Completion begins with an audit: accepted assumptions, observed state, contradictions and gaps, accountable plan, bounded work and verification evidence. Decision status (`proposed`, `accepted`, `deferred`, `rejected`, `superseded`) remains separate from implementation state (`not_implemented`, `implemented_correctly`, `implemented_incorrectly`, `unverified`). | — |
| <a id="rf-app-004"></a>RF-APP-004 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | `Product ready` means an intended user can obtain the promised core value without routine developer help and risk-applicable access security, error handling, monitoring, backup/restore and support are proven. `Sale ready` additionally requires the offer, subscription/payment path, customer information and operating/support responsibilities to be ready for real customers. | — |
| <a id="rf-app-005"></a>RF-APP-005 | [Success metrics](success-metrics.md#product-metrics) | accepted | Before either positive gate, the application identifies one primary intended user, that user's primary problem and one end-to-end core outcome path. The path must repeatedly meet explicit application-specific criteria without routine developer help; secondary features cannot substitute for this proof. | — |
| <a id="rf-app-006"></a>RF-APP-006 | [MVP scope](mvp_scope.md#in-scope) | accepted | A known critical blocker in the core path or applicable access, security, error recovery, monitoring, backup/restore or support control blocks product readiness. A critical blocker in the offer, subscription/payment path, required customer information or operating/support responsibility also blocks sale readiness. A blocker cannot be relabelled merely to pass a gate. | — |
| <a id="rf-app-007"></a>RF-APP-007 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | The owner may accept only a non-critical limitation, with impact, affected users or scope, workaround, accountable owner, evidence, review date and explicit acceptance attached to the readiness decision. A limitation invalidating the core promise or creating unacceptable security, data, access, payment or recovery risk cannot be waived. | — |
| <a id="rf-app-008"></a>RF-APP-008 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | The owner accepts product-ready and sale-ready gates from connected evidence. Agents may audit, propose, implement within mandate and supply evidence, but cannot silently redefine assumptions or self-declare commercial readiness. | — |
| <a id="rf-app-009"></a>RF-APP-009 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | Before creating a new assumption-audit or readiness mechanism, inspect existing canonical product records and documentation, preserve useful provenance and reuse valid work. Uncertainty about an earlier mechanism is not evidence that it is complete and does not justify a parallel source of truth. | — |
| <a id="rf-app-010"></a>RF-APP-010 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | Roost uses one application lifecycle with two entry paths. A new application starts with problem and user definition. An already-started application first undergoes takeover: recover and classify assumptions, inspect documentation and implementation, verify evidence, expose gaps and contradictions, and establish an owner-approved baseline. It then joins the common lifecycle at the highest stage actually proven rather than restarting or assuming completion. | — |
| <a id="rf-app-011"></a>RF-APP-011 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | Before implementation work in a taken-over application, compare that application's own canonical assumptions, documentation, code, tests and observed behavior. Unambiguous implementation divergence from an accepted requirement may be repaired within mandate; contradiction or missing authority among product assumptions stops affected work for an owner decision. Requirements from another application must never be imported by inference. | — |
| <a id="rf-app-012"></a>RF-APP-012 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | Every application follows a universal minimum for clear product intent, acceptance criteria, documentation, security, data handling, testing, error handling, monitoring, recovery, release and evidence, plus its own domain-specific requirements. Existing work is credited only where evidence supports it; the common standard does not copy or homogenize product-specific behavior. | — |
| <a id="rf-app-013"></a>RF-APP-013 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | The common lifecycle is `problem and intended user -> accepted requirements -> solution design -> implementation -> verification -> product readiness -> sale readiness -> operation and improvement`. Each stage has evidence-backed exit gates and may move backward when a material defect or contradiction invalidates earlier proof. | — |
| <a id="rf-app-014"></a>RF-APP-014 | [Owner workflow](product.md#product-rules) | accepted | The owner portfolio shows each application's current proven stage, gate state, blockers, decisions needing attention, nearest outcome, accountable actor and completion evidence. Gate states are at least `unmet`, `in_progress`, `met`, `blocked` and `explicitly_deferred`. Any percentage is secondary and cannot override a critical blocker or unmet gate. | — |
| <a id="rf-app-015"></a>RF-APP-015 | [Completion control](product.md#accepted-application-completion-control-model) | accepted | Commercial launch uses a controlled cohort only after the complete customer path is implemented and verified; customers are not required testers. Broad availability follows observed production evidence from the full applicable operating cycle. A critical production failure automatically limits new sales or the affected capability, raises owner attention and starts accountable recovery. | — |

## Subscription, finance, customer, and support operations

Gate/scope of enforcement: product commercialization and post-sale operation.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-biz-001"></a>RF-BIZ-001 | [Business sequence](product.md#accepted-business-sequence) | accepted | Each application remains authoritative for its user accounts, subscription entitlement and access response to payment events. Roost owns company-level customer relationships, offerings, revenue, invoice evidence, accounting synchronization, exceptions and responsibility; it does not duplicate per-user entitlement administration. | — |
| <a id="rf-biz-002"></a>RF-BIZ-002 | [User model](user-model.md#context-model) | accepted | Roost uses one canonical customer identity for a person or organization with explicit product-subscription and digital-service relationship types, including both at once. It stores only the minimum business context needed for the relationship and never treats application credentials or entitlement state as required customer-master data. | — |
| <a id="rf-biz-003"></a>RF-BIZ-003 | [Business sequence](product.md#accepted-business-sequence) | accepted | Subscription relationships use at least `active`, `payment_issue`, `cancelled` and `ended`. Confirmed cancellation or non-payment ends paid value through the authoritative application/provider path after only the offering's bounded retries; agents do not repeatedly pursue a customer who chooses not to pay, and unpaid status does not authorize chargeable delivery. | — |
| <a id="rf-biz-004"></a>RF-BIZ-004 | [MVP scope](mvp_scope.md#accepted-boundary-and-open-financial-workflow) | accepted | Stable, repeatable and tested financial steps use deterministic callbacks, APIs or scripts with idempotency, durable queueing, bounded retry, reconciliation, observable failure and auditable evidence. There is no routine manual fallback for a flow that can be automated reliably. Authorized agents handle ambiguous or exceptional judgment work and perform periodic aggregate reconciliation rather than spend model work on every transaction. | — |
| <a id="rf-biz-005"></a>RF-BIZ-005 | [Success metrics](success-metrics.md#product-metrics) | accepted | Every payment, invoice, document-routing and accounting result has an explicit synchronization state. A missing, failed or inconsistent result creates one deduplicated attention item; persistent failure after automatic recovery stops new affected sales, notifies the owner and remains unresolved until repaired and reconciled. Failures never disappear silently. | — |
| <a id="rf-biz-006"></a>RF-BIZ-006 | [MVP scope](mvp_scope.md#accepted-boundary-and-open-financial-workflow) | accepted | The complete subscription-payment path first passes in provider sandbox/test mode, then uses a separately controlled live switch and one real transaction independently reconciled across payment result, application access response, invoice, Roost and every applicable document/accounting destination. Sandbox proof alone cannot establish live sale readiness. | — |
| <a id="rf-biz-007"></a>RF-BIZ-007 | [Business sequence](product.md#accepted-business-sequence) | accepted | Within explicit mandates, agents may retrieve invoices, store approved copies, synchronize status and reconcile or surface mismatches. Refunds, price or tax changes, payouts, transfers and accounting corrections require explicit owner approval. No payment/accounting provider, invoice authority, authoritative document route or exact first-sale automation boundary is selected by this requirement. | — |
| <a id="rf-biz-008"></a>RF-BIZ-008 | [Success metrics](success-metrics.md#product-metrics) | accepted | The owner receives one revenue view separated by application offering and digital service, covering paid and exceptional transactions, invoice evidence and accounting state with drill-down to source evidence. It is not a cross-application user-access panel. | — |
| <a id="rf-biz-009"></a>RF-BIZ-009 | [Product rules](product.md#product-rules) | accepted | Roost provides native operational views and actions while a declared external provider may remain authoritative for provider-native or legally formal records. Payment providers own transaction state, the selected accounting system owns formal accounting records, approved file content remains in its file provider, and Roost retains indexed metadata, relations, provenance and synchronization state. Bidirectional writes follow the declared field authority and expose conflicts rather than pretending Roost is the external legal system. | — |
| <a id="rf-sup-001"></a>RF-SUP-001 | [Post-sale support](product.md#accepted-post-sale-support-model) | accepted | An actionable monitoring or application-error condition becomes one deduplicated incident linked to application, severity, evidence and accountable agent. Proven deterministic safeguards act first; unresolved or high-risk incidents escalate to the owner. | — |
| <a id="rf-sup-002"></a>RF-SUP-002 | [Post-sale support](product.md#accepted-post-sale-support-model) | accepted | Each accepted customer request becomes one canonical support case linked to the customer, relevant offering or service, responsibility, status and outcome evidence. Agents handle it only within accepted procedure and mandate; material ambiguity or reserved money, legal, security or product decisions escalate. | — |
| <a id="rf-sup-003"></a>RF-SUP-003 | [Post-sale support](product.md#accepted-post-sale-support-model) | accepted | Incoming customer information is classified as technical defect, support question or feature proposal. Only a confirmed defect or an authorized product decision creates implementation work; feedback alone is not a delivery commitment. | — |
| <a id="rf-sup-004"></a>RF-SUP-004 | [Post-sale support](product.md#accepted-post-sale-support-model) | accepted | Each customer application may expose a simple problem-reporting path while Roost centralizes cases, safe technical context, priority and customer-visible status. Email may be added later as another channel. The initial standard uses severity-based handling without an unstaffed public SLA: critical harm is contained immediately, a broken core path is next repair work, ordinary issues enter the planned queue, and suggestions remain separate. | — |

## Digital-service commercial and delivery rules

Gate/scope of enforcement: later digital-service sales and delivery.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-svc-001"></a>RF-SVC-001 | [Business sequence](product.md#accepted-business-sequence) | accepted | Lead acquisition and a bounded initial interview are free acquisition costs limited to problem, mutual fit and indicative direction, scope and budget. A detailed audit, specification, design, prototype or reusable deliverable is paid discovery or part of a paid project. | — |
| <a id="rf-svc-002"></a>RF-SVC-002 | [Business sequence](product.md#accepted-business-sequence) | accepted | Small closed-scope services are paid in full before delivery. Larger projects require a confirmed deposit before start and payment before each milestone phase. Exact thresholds and percentages remain offering decisions but cannot silently weaken pay-before-work. | — |
| <a id="rf-svc-003"></a>RF-SVC-003 | [Success metrics](success-metrics.md#product-metrics) | accepted | Work outside accepted scope requires a customer-accepted change stating outcome, price, schedule impact and payment condition; additional work starts only after its required payment is confirmed. Informal requests never create free delivery obligations. | — |
| <a id="rf-svc-004"></a>RF-SVC-004 | [User model](user-model.md#operator-roles) | accepted | Every engagement identifies one customer-side authority for scope, price, schedule, changes, milestone acceptance and handover. Replacement or delegation is explicit and bounded by scope/time. Verbal, meeting, email or chat input changes a material commitment only after canonical recording and confirmation by that actor; the source communication remains evidence. | — |
| <a id="rf-svc-005"></a>RF-SVC-005 | [Business sequence](product.md#accepted-business-sequence) | accepted | Before each milestone, expected result, acceptance criteria, required evidence and accountable approver are explicit. The next milestone waits for acceptance of the current result and satisfaction of its applicable payment condition. | — |
| <a id="rf-svc-006"></a>RF-SVC-006 | [Business sequence](product.md#accepted-business-sequence) | accepted | Failure against accepted scope or criteria is a defect corrected without an added scope fee. A new function, changed expectation or changed direction is a paid scope change. Classification is resolved before additional work begins. | — |
| <a id="rf-svc-007"></a>RF-SVC-007 | [Business sequence](product.md#accepted-business-sequence) | accepted | Every offer defines a review window and every delivery notice states the exact deadline, evidence and contractual consequence of no response. Deemed acceptance after silence is allowed only when the agreement disclosed it in advance and no criteria-based objection arrives in time. Exact legal wording remains jurisdiction- and agreement-specific. | — |
| <a id="rf-svc-008"></a>RF-SVC-008 | [Business sequence](product.md#accepted-business-sequence) | accepted | Default defect-reporting warranty is 30 calendar days after the relevant acceptance unless the offering explicitly states another period. It covers reproducible failure against accepted scope/criteria, not new requirements, third-party changes, misuse or indefinite maintenance. Later ordinary support is paid; every critical security report still receives immediate impact, cause, responsibility and safe-action assessment. | — |
| <a id="rf-svc-009"></a>RF-SVC-009 | [Business sequence](product.md#accepted-business-sequence) | accepted | After full settlement, the customer receives agreed project-specific files, newly created administrative control and contracted rights or licence with handover evidence. Customer-owned accounts, data and credentials remain theirs; reusable company tools, libraries, methods and components remain company assets unless explicitly transferred or licensed differently. | — |
| <a id="rf-svc-010"></a>RF-SVC-010 | [Business sequence](product.md#accepted-business-sequence) | accepted | The company may refuse, pause or end illegal, unethical, unsafe, materially insecure, competence-exceeding, commercially unrealistic, abusive or unreliable work. Reason, affected commitments and safe next step are recorded; material or ambiguous legal, money, security and reputation cases remain owner decisions. | — |
| <a id="rf-svc-011"></a>RF-SVC-011 | [User model](user-model.md#operator-roles) | accepted | Every person or agent accessing customer systems uses an individually attributable identity with least scope and shortest practical duration, authorized by the recorded customer actor or administrator. Shared credentials and broad permanent access are not the operating default; any unavoidable exception is explicit, temporary and audited. | — |
| <a id="rf-svc-012"></a>RF-SVC-012 | [User model](user-model.md#operator-roles) | accepted | Project closure revokes unnecessary company and agent access with evidence. Task-owned working copies are removed under the agreed retention basis; only material justified by an agreed deliverable or explicit legal, accounting, warranty, security or business-evidence purpose remains. Cleanup never deletes customer-owned canonical systems or data implicitly. | — |
| <a id="rf-svc-013"></a>RF-SVC-013 | [MVP scope](mvp_scope.md#out-of-scope) | deferred | Later customer delivery prefers isolated test/staging and synthetic or anonymized data before real production data. Necessary production/customer-data access is approved, time-bounded, attributable and audited. Dedicated enabling infrastructure is deferred until the service phase and sufficient resources exist; it is not a current application-first MVP gate and does not change the separately governed owner-controlled local runtime. | — |

## Provider integration and later data lifecycle

Gate/scope of enforcement: integration selection, synchronization, and deferred lifecycle administration.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-int-001"></a>RF-INT-001 | [Product rules](product.md#product-rules) | accepted | Approved providers are legitimate bidirectional work surfaces. A provider-only participant may create and update permitted work inside an explicitly synchronized scope without direct Roost-console access, but provider access cannot change goals, accepted decisions, permissions, mandates or accountability outside that scope. | — |
| <a id="rf-int-002"></a>RF-INT-002 | [Product rules](product.md#product-rules) | accepted | A Roost capability remains complete native product behavior without an external provider. Add an adapter only when people need to work in that service and identity, authoritative ownership, synchronization directions, scope, classification, conflicts, recovery and evidence can be defined safely. ClickUp is the accepted task provider and Google Drive the accepted shared file/Docs/Sheets provider; a CRM provider remains only a candidate, while strategy and procedures remain Roost-native unless later evidence justifies integration. | — |
| <a id="rf-int-003"></a>RF-INT-003 | [Product rules](product.md#product-rules) | accepted | Roost is authoritative for company structure, goals, decisions, responsibility, relationships, governance and integration mappings. Every synchronized record or field declares one authoritative owner and preserves actor identity, provider, workspace, provenance and audit history. Unmapped provider identities remain honestly unverified and are never attributed by inference. | — |
| <a id="rf-int-004"></a>RF-INT-004 | [Product rules](product.md#product-rules) | accepted | Every synchronized capability or data class is `sync_allowed`, `restricted` or `roost_only` and uses least necessary scope. Only an owner or administrator connects a provider or grants its scope; weakening protection requires explicit approval and audit. Offboarding immediately disables future mapping/synchronization authority while retaining historical attribution and surfacing reassignment. | — |
| <a id="rf-int-005"></a>RF-INT-005 | [Product rules](product.md#product-rules) | accepted | Concurrent changes never resolve by silent overwrite. Roost shows competing versions, authority, differences and safe choices. During provider outage it marks affected data stale, preserves pending intent and unrelated work, then performs bounded bidirectional catch-up and reconciliation; unresolved conflicts remain visible. | — |
| <a id="rf-int-006"></a>RF-INT-006 | [Data lifecycle](product.md#accepted-later-phase-data-lifecycle-direction) | deferred | Later Roost lifecycle administration provides a readable export of Roost-owned business records/history without secrets, reversible company archive followed by separately confirmed permanent deletion with impact preview/export opportunity, and integration disconnection preserving prior history with purge as a separate owner decision. Exact formats, retention, backup and provider effects remain open and none is a current MVP requirement. | — |

## Product scope deferrals and removed directions

Gate/scope of enforcement: roadmap and current MVP exclusions.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-scope-001"></a>RF-SCOPE-001 | [Non-goals](non-goals.md) | deferred | Native mobile is deferred until the web owner loop works reliably. Mobile web usability may continue, but no native application is part of the current MVP. | Supersedes older architecture wording that presented native mobile as an automatic V2 scope item. |
| <a id="rf-scope-002"></a>RF-SCOPE-002 | [Non-goals](non-goals.md) | rejected | Company City and gamification are removed from accepted current and future roadmap assumptions. Old architecture references are historical only and cannot authorize design or implementation; re-entry requires a fresh owner decision based on demonstrated product need. | Supersedes prior V2 roadmap assumptions. |
| <a id="rf-scope-003"></a>RF-SCOPE-003 | [MVP scope](mvp_scope.md#out-of-scope) | deferred | Native Roost billing, a marketplace, hosted multi-tenant SaaS and a full native CRM suite are outside the current independently installed self-hosted product phase. Integration with an external payment provider for customer applications is distinct from native Roost billing. | — |
| <a id="rf-scope-004"></a>RF-SCOPE-004 | [MVP scope](mvp_scope.md#out-of-scope) | deferred | Prospect collection and full digital-service sales/delivery implementation wait until one existing application reaches accepted sale readiness and the completion process is reusable. The accepted commercial rules remain requirements for that later phase rather than current implementation scope. | — |
| <a id="rf-scope-005"></a>RF-SCOPE-005 | [Non-goals](non-goals.md) | deferred | Invitation delivery, multi-human onboarding and external email/Telegram notifications are not current validation gates. Existing role/invitation capability is preserved; these flows reopen when the web foundation works and an actual user/channel need plus required account configuration exists. | — |
| <a id="rf-scope-006"></a>RF-SCOPE-006 | [MVP scope](mvp_scope.md#out-of-scope) | deferred | Dedicated customer-project test/staging environments and anonymization infrastructure are not prerequisites for the application-first MVP. They reopen with the later service phase and adequate revenue or other resources. | — |

## Activation order and constraints

Keep `ROOST_CODEX_EXECUTION_ENABLED=false` and the laptop in observer mode.
Local fault-injection certification precedes write access. Broker-enforced
main protection precedes real push/PR testing. A one-time GitHub/Coolify playground
requires the owner's repository and folder **only when that stage is ready**.
Its cleanup/archive is part of certification. The first real DemoApp worker is
read-only Application Auditor, followed by independent read-only Audit Verifier.
A concise readiness report and one-time owner approval precede first DemoApp write.
Later promotion still requires task/risk gates and three successful low-risk
deliveries before medium risk. This batch activates none of these stages.

2FA, dedicated Roost/runtime staging, paid GitHub, bigger VPS, investment
optimization, workspace-language migration, external notifications, native
Roost self-development/Constitution and retiring both bootstrap automations are
deferred and nonblocking. Existing
Example Company workspace must use **English** and **Europe/Zurich**; communication
language and UI language are independent user settings, with PL/EN UI initially.

## Company and bootstrap governance

Gate/scope of enforcement: governance.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-gov-001"></a>RF-GOV-001 | — | accepted | Owner supplies goals, product intent and material decisions; competent agents handle reversible technical choices autonomously within verified mandates. | — |
| <a id="rf-gov-002"></a>RF-GOV-002 | — | accepted | Every goal, initiative and task has a parent, accountable owner, measurable contribution and evidence; agents cannot change or delete owner direction. | — |
| <a id="rf-gov-003"></a>RF-GOV-003 | [RF-PROD-002](#rf-prod-002) | accepted | Company accountability may begin from twelve peer model departments with `00 General` as a shared projection and Management coordinating rather than commanding all directors, but the topology is configurable per installation. The fixed V1 surface is an observed migration source, not the mandatory product target. | Prior fixed-topology wording is superseded by RF-PROD-002; implementation migration remains open. |
| <a id="rf-gov-004"></a>RF-GOV-004 | — | accepted | Each worker has one accountable department and one direct supervisor; cross-department relevance does not create another reporting line. | — |
| <a id="rf-gov-005"></a>RF-GOV-005 | — | accepted | Delegate along the shortest valid hierarchy; domain director decides within mandate, Management coordinates conflicts, owner resolves reserved issues. | — |
| <a id="rf-gov-006"></a>RF-GOV-006 | — | accepted | Use shared human/agent workforce, persistent identities and fresh bounded execution sessions; preserve actor type and author. | — |
| <a id="rf-gov-007"></a>RF-GOV-007 | [RF-PROD-002](#rf-prod-002) | accepted | Maintain a complete role catalog for the installation's configured departments; the twelve-department template supplies the initial best-practice catalog. Instantiate active agents only for demonstrated demand. | Supersedes wording that made all twelve departments mandatory in every installation. |
| <a id="rf-gov-008"></a>RF-GOV-008 | — | accepted | HR recruitment requires manager request, role profile, director placement, Security least privilege, competency eval and probation; no self-hiring or self-promotion. | — |
| <a id="rf-gov-009"></a>RF-GOV-009 | — | accepted | Evaluate difficulty-adjusted outcomes, quality, regressions, rework, evidence, handoff, time and cost; independently diagnose failures before training, reassignment or deactivation. | — |
| <a id="rf-gov-010"></a>RF-GOV-010 | — | accepted | Requalify after material role/model/tool/procedure changes; skills transfer across similar apps, while new technology/risk requires additional proof and app-specific access. | current rule |
| <a id="rf-gov-011"></a>RF-GOV-011 | — | accepted | PM owns product result, Technology implementation quality; UI design, visual design, frontend, visual QA and functional testing remain distinct responsibilities when needed. | — |
| <a id="rf-gov-012"></a>RF-GOV-012 | — | accepted | Application-specific PMs share cross-portfolio technical specialists; add staff only for competence gaps or sustained overload. | — |
| <a id="rf-gov-013"></a>RF-GOV-013 | — | accepted | Dynamic subagents are allowed with visible parent, role, goal, scope, budget, minimal authority, structured return and scheduler-controlled resource/writer limits. | — |
| <a id="rf-gov-014"></a>RF-GOV-014 | — | accepted | Every agent has its own technical identity; never record agent actions as owner actions or infer authority from actor type alone. | — |
| <a id="rf-gov-015"></a>RF-GOV-015 | — | accepted | Bootstrap implementation changes only Roost and its host/infrastructure; DemoApp and other applications are future native-agent targets, never bootstrap edits. | — |
| <a id="rf-gov-016"></a>RF-GOV-016 | — | accepted | One implementation owner carries an accepted end-to-end outcome through coding, integration, verification and demonstration. Internal substeps and multiple commits are allowed but are not handoff or STOP boundaries; new interview input changes active work only for STOP, safety or a material scope correction. | current rule |
| <a id="rf-gov-017"></a>RF-GOV-017 | — | accepted | Every accepted requirement has a stable ID, decision/supersession status and evidence links to code, tests, configuration, commit and deployment where verified. | — |
| <a id="rf-gov-018"></a>RF-GOV-018 | — | accepted | Resolve reversible technical choices autonomously from accepted requirements, current architecture and evidence. Owner input is reserved for unavailable login/2FA/secret, an unapproved irreversible real-data action, a genuine business-intent contradiction or an unavailable external service without a safe alternative. Preserve unrelated work and avoid repository task boards or execution memory. | — |
| <a id="rf-gov-019"></a>RF-GOV-019 | [RF-PROD-001](#rf-prod-001) | accepted | The managed application portfolio is per-installation private configuration rather than a distributed fixed list. During the current bootstrap, Roost is infrastructure and is excluded from application imports and native-agent targets unless a later explicit self-development decision changes that boundary. | Supersedes the former fixed portfolio list while preserving the current Roost bootstrap exclusion. |
| <a id="rf-gov-020"></a>RF-GOV-020 | — | accepted | Key decisions, authority changes, releases, rollback and incidents use an append-only audit with corrections as linked new entries and permanent compact retention. | — |

## Context, procedures, tasks and decisions

Gate/scope of enforcement: before execution.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-ctx-001"></a>RF-CTX-001 | — | accepted | Roost compiles an explicit minimal context packet for the specific task rather than supplying the entire company or relying on conversation memory. It contains the outcome, acceptance criteria, application and repository scope, current accepted decisions/requirements, role/authority, dependencies, blockers, required tests/evidence and only necessary company records. Missing required sources block launch rather than inventing task intent. | current clarification |
| <a id="rf-ctx-002"></a>RF-CTX-002 | — | accepted | Authority order is latest accepted Decision, approved product/company assumptions, canonical technical docs, observed code/config/tests and production evidence; contradictions do not rewrite intent. | — |
| <a id="rf-ctx-003"></a>RF-CTX-003 | — | accepted | Separate approved facts, observations, proposals, inferences and unknowns with source, version/date and confidence; incomplete app cards permit analysis only. | — |
| <a id="rf-ctx-004"></a>RF-CTX-004 | — | accepted | Application card identifies goal, users, core flows, non-goals, assumptions, owner/PM, canonical repo/path, deploy, commands, integrations, risk, health and rollback. | — |
| <a id="rf-ctx-005"></a>RF-CTX-005 | — | accepted | Context layers include company, profile/authority, task, application decisions, procedure/tests, technical fragments and dependencies/handoff. Every included item records why it is needed and its source version/hash; application-specific assumptions remain inside that application's canonical boundary and are never imported from another application by inference. | current clarification |
| <a id="rf-ctx-006"></a>RF-CTX-006 | — | accepted | Pin the packet at Ready and revalidate at launch and resume. Revalidation is impact-based: only a material goal, scope, assignment, access, dependency or source change affecting this work invalidates readiness or its dependent evidence. Unaffected evidence remains valid; one independent acceptance closes a gate until a relevant new change or defect appears. | current clarification preventing recursive full revalidation |
| <a id="rf-ctx-007"></a>RF-CTX-007 | — | accepted | Request additional context through an authorized, audited narrow request; material scope expansion requires revalidation. | — |
| <a id="rf-ctx-008"></a>RF-CTX-008 | — | accepted | Draft and Needs-context/Decision become Ready only through Submit-for-execution completeness validation; creation, assignment and free status edits cannot launch work. | — |
| <a id="rf-ctx-009"></a>RF-CTX-009 | — | accepted | One task has one app/component, outcome, accountable manager, executor and branch with independent acceptance; combine issues only for inseparable shared cause. | — |
| <a id="rf-ctx-010"></a>RF-CTX-010 | — | accepted | Task roles identify requester, accountable manager, executor, independent verifier and releaser; author cannot be sole verifier or self-authorize release. | — |
| <a id="rf-ctx-011"></a>RF-CTX-011 | — | accepted | Primary task types include audit, diagnosis, design, implementation, QA, review, release, recovery, operation and decision; type controls input, role, tools, result and gates. | — |
| <a id="rf-ctx-012"></a>RF-CTX-012 | — | accepted | Compose versioned base procedure, application extension and risk gates; missing procedure or approved exception blocks Ready; active runs keep pinned versions. | — |
| <a id="rf-ctx-013"></a>RF-CTX-013 | — | accepted | Formal handoff contains outcome/state, packet, decisions, commit/branch, changed areas, tests/evidence, limits, reproduce/continue/rollback and expected recipient action; recipient accepts or rejects. | — |
| <a id="rf-ctx-014"></a>RF-CTX-014 | — | accepted | Reviewer does not repair code; rejects with reproducible evidence; manager returns scoped work to author or creates a dependent specialist task without losing history. | — |
| <a id="rf-ctx-015"></a>RF-CTX-015 | — | accepted | Specialists may clarify linked work directly but may not reassign authority, scope or priority; retain structured conversation and verified execution summary. | — |
| <a id="rf-ctx-016"></a>RF-CTX-016 | — | accepted | Use short thematic interview blocks only for material unknowns; continue independent fact gathering; decisions include context, options, recommendation, consequences, dependencies and deferral. | — |
| <a id="rf-ctx-017"></a>RF-CTX-017 | — | accepted | New conflicting decisions preserve history, explain downstream impact and narrow scope; silence remains pending; budget limitations reopen on real events, not daily reminders. | — |
| <a id="rf-ctx-018"></a>RF-CTX-018 | — | accepted | Reserve product direction, money, legal, critical risk and mandate changes for owner; other decisions use shortest hierarchy and explicit delegated mandate. | — |
| <a id="rf-ctx-019"></a>RF-CTX-019 | — | accepted | Out-of-scope discoveries become linked findings instead of silent task growth, except necessary safe completion with explicit revalidation. | — |
| <a id="rf-ctx-020"></a>RF-CTX-020 | — | accepted | Lessons remain candidates until independently diagnosed and approved; promote versioned procedure/context/profile/checklist/test with applicability, source and rollback. | — |
| <a id="rf-ctx-021"></a>RF-CTX-021 | — | accepted | Classify audit findings as defect, unfinished function, stale docs, missing assumption or improvement; deduplicate, independently verify, then PM/triage creates an atomic Ready task or Decision. | — |
| <a id="rf-ctx-022"></a>RF-CTX-022 | — | accepted | Priority order: security/data/incidents/outages, blocked core flows, wrong results/actions, incomplete flows/regressions, stability-blocking debt, approved missing features, cosmetic/unproven optimization. | — |
| <a id="rf-ctx-023"></a>RF-CTX-023 | — | accepted | Paperclip remnants are untrusted audit input; validate before reuse/merge and clean only in a separate evidenced task. | — |
| <a id="rf-ctx-024"></a>RF-CTX-024 | — | accepted | Use version-matched official technical sources and dates; verify commercial licensing of dependencies/code/art and escalate unclear licenses to Legal before release. | — |
| <a id="rf-ctx-025"></a>RF-CTX-025 | — | accepted | Technical disputes go to an independent competent adjudicator using requirements/tests/evidence, then hierarchy; ruling binds the task until new evidence, never vote-shopping. | — |
| <a id="rf-ctx-026"></a>RF-CTX-026 | — | accepted | Every procedure step declares its primary executor class and escalation path: deterministic script for stable machine-verifiable rules, authorized agent for contextual judgment or exceptions, and authorized human for reserved or personally accountable decisions. Each step defines success, bounded retry and fallback; a repeated agent action becomes default automation only after the replacement script is tested and accepted. | — |

## Local execution, scheduling and models

Gate/scope of enforcement: before execution.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-host-001"></a>RF-HOST-001 | — | accepted | VPS owns queue and private database; Windows host initiates outbound HTTPS; offline laptop leaves work queued without agent token consumption. | — |
| <a id="rf-host-002"></a>RF-HOST-002 | — | accepted | Only one writer across the laptop, with parallel lightweight readers only after resource checks; release writer on waiting only after safe checkpoint and confirmed stop. | current rule |
| <a id="rf-host-003"></a>RF-HOST-003 | — | accepted | Before claim or resume, Worker scripts read deterministic facts including API lease, local processes, branch/files, task revision and versioned checkpoint. Roost stores and exposes the checkpoint and observations; the resuming agent interprets differences and selects a safe continuation. A deterministic mismatch may block writes automatically, while ambiguity preserves evidence and escalates or replans with reason. | current clarification that Roost is not the reasoning actor |
| <a id="rf-host-004"></a>RF-HOST-004 | — | accepted | One direct canonical physical clone per app; verify root, origin and branch provenance; no worktree/copy bypass, reset-hard or destruction of unknown work. | current rule |
| <a id="rf-host-005"></a>RF-HOST-005 | — | accepted | One deterministic task branch per task; checkpoint/WIP remote backup allowed in private GitHub; branch ends merged, formally rejected or recoverable with evidence, never abandoned. | — |
| <a id="rf-host-006"></a>RF-HOST-006 | — | accepted | Checkpoint at meaningful recovery boundaries, before consequential side effects and when interruption risk requires it. The operational checkpoint records parent outcome/gate, exact changed state, checks/evidence, blockers, decisions and next safe action without preserving hidden reasoning or entire conversations. Lease loss/cancellation stops execution and preserves writer lock when process termination cannot be proven. | current clarification |
| <a id="rf-host-007"></a>RF-HOST-007 | — | accepted | Windows login starts one hidden observer with visible identity, heartbeat and status; observer never claims work or launches Codex. | — |
| <a id="rf-host-008"></a>RF-HOST-008 | — | accepted | Host updates only while idle using compatible signed versions and rollback; initial updates remain manual. | — |
| <a id="rf-host-009"></a>RF-HOST-009 | — | accepted | Central scheduler admits complete Ready tasks by dependencies, online host, resources and priority; low/normal/high/critical with aging and only confirmed critical incident preemption. | — |
| <a id="rf-host-010"></a>RF-HOST-010 | — | accepted | Each task has time/token/cost/attempt limits, checkpoints and early stop; exhaustion needs independent plan review and new budget, never automatic increase. | — |
| <a id="rf-host-011"></a>RF-HOST-011 | — | accepted | Detect repeated ineffective operations and lack of progress in the parent end-to-end gate. After bounded attempts, stop further resource consumption and require an independent diagnosis plus changed approach before another attempt; rate limits/outages checkpoint and respect backoff/Retry-After instead of aggressive retries. | current clarification |
| <a id="rf-host-012"></a>RF-HOST-012 | — | accepted | Attribute model use, attempts, elapsed time, repeated reads/checks, rework, review returns and accepted results to task, application, agent, goal and parent outcome. Evaluate resources against difficulty-adjusted verified outcomes rather than activity volume; unknown provider usage remains unknown, and cost optimization never reduces required quality, tests, review or safety. | current clarification |
| <a id="rf-host-013"></a>RF-HOST-013 | — | accepted | No autonomous Windows reboot/shutdown or rebooting updates; shared-service restart only after proving no other workload impact; real overload triggers safe pause. | — |
| <a id="rf-host-014"></a>RF-HOST-014 | — | accepted | Check backend/UI/schema/host compatibility before writes; Roost updates drain/checkpoint, migrate, check health, update host then resume; failure restores a compatible set with agents paused. | — |
| <a id="rf-host-015"></a>RF-HOST-015 | — | accepted | Each future device has separate identity/credential and owner-approved first pairing or re-pairing; one laptop only for now. | — |
| <a id="rf-host-016"></a>RF-HOST-016 | — | accepted | Every launch requires an explicit approved model at least GPT-5.6 and an explicit supported reasoning effort; pass the exact pair to Codex without inherited defaults or silent downgrade. | — |
| <a id="rf-host-017"></a>RF-HOST-017 | — | accepted | Select model and reasoning independently per task/stage, honor owner overrides and risk/procedure minima; escalate effort/model when needed, wait or use approved equivalent if unavailable. | — |
| <a id="rf-host-018"></a>RF-HOST-018 | — | accepted | Record requested and actually observed model/effort, time, cost and outcomes; never label requested settings as provider-confirmed use. | — |
| <a id="rf-host-019"></a>RF-HOST-019 | — | accepted | External pages, documents, logs, issues and user data are untrusted evidence; isolate suspicious instructions and report safely without executing them. | — |
| <a id="rf-host-020"></a>RF-HOST-020 | — | accepted | Agents read only task-scoped application and approved context, not private laptop data; browser uses isolated controlled sessions through broker. | — |

## Security, credentials, risk and data

Gate/scope of enforcement: before writing or sensitive operations.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-sec-001"></a>RF-SEC-001 | — | accepted | Risk is maximum impact across money/data/security/availability/legal/reversibility/users; uncertainty raises risk and cumulative changes cannot evade controls. | — |
| <a id="rf-sec-002"></a>RF-SEC-002 | — | accepted | Low/medium act within verified procedures; high requires extended independent review and mandate/decision; critical and destructive production migration require fresh owner approval, verified backup and restore plan. | — |
| <a id="rf-sec-003"></a>RF-SEC-003 | — | accepted | Broker grants least privilege per task/agent/app/operation/time/risk, executes sensitive operations without returning secrets and revokes on completion, interruption or role change. | — |
| <a id="rf-sec-004"></a>RF-SEC-004 | — | accepted | Redact secrets and personal data before logs, attachments, checkpoints and model context persist; discovery creates incident without copying secret value. | — |
| <a id="rf-sec-005"></a>RF-SEC-005 | — | accepted | Dependencies require rationale, lockfile, security scan and independent review; no arbitrary internet scripts/global installs; task-scoped network egress blocks unjustified data export. | — |
| <a id="rf-sec-006"></a>RF-SEC-006 | — | accepted | Production diagnosis uses minimal anonymized samples and metrics; full records only exceptional, time-bounded and audited. | — |
| <a id="rf-sec-007"></a>RF-SEC-007 | — | accepted | Sensitive auth/permissions/secrets/trading/money/data changes require Security review; safeguard changes are high risk and disabling a key gate needs fresh narrow expiring owner exception. | — |
| <a id="rf-sec-008"></a>RF-SEC-008 | — | accepted | Version environment variable names/purpose/requirements, never secret values; expose availability only; expired credentials block dependent work and give safe renewal instructions. | — |
| <a id="rf-sec-009"></a>RF-SEC-009 | — | accepted | Only owner or explicitly authorized admin invites; new members receive minimal role scope, not blanket projects, secrets or decisions. | — |
| <a id="rf-sec-010"></a>RF-SEC-010 | — | accepted | Routine health checks are read-only and side-effect free; real orders, messages, record changes or paid operations require an explicitly scoped test. | — |
| <a id="rf-sec-011"></a>RF-SEC-011 | — | accepted | Uncertain external outcomes require reconciliation before retry across push, merge, deploy, task creation and configuration. | — |
| <a id="rf-sec-012"></a>RF-SEC-012 | — | accepted | Serious incident suspends affected risky capability until independent cause/impact/remediation/regression proof; owner manual intervention triggers reread/replan, never automatic undo. | — |

## Resource manifests and backup

Gate/scope of enforcement: before writing or release.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-res-001"></a>RF-RES-001 | — | accepted | Manifest fixes canonical directory/repo, Docker project, containers, ports, networks, volumes, DB and commands; distinguish permanent services from task-owned temporary ones. | — |
| <a id="rf-res-002"></a>RF-RES-002 | — | accepted | Start registered services only if absent; stop/clean only execution-owned temporary resources; unknown conflicts trigger diagnosis without kill/alternate port/duplicate environment. | — |
| <a id="rf-res-003"></a>RF-RES-003 | — | accepted | Rebuild disposable dependencies/containers safely; persistent volume changes require risk gates and verified backup; preserve unknown files/data until provenance resolved. | — |
| <a id="rf-res-004"></a>RF-RES-004 | — | accepted | Ordinary code relies on Git and prior image; risky data changes need verified backup before replacement; retain last good copy plus temporary pre-release copy through observation, then rotate by capacity. | — |
| <a id="rf-res-005"></a>RF-RES-005 | — | accepted | Before agents, prove encrypted Roost DB backup/restore without disturbing production; sync one latest verified encrypted copy to owner-designated laptop folder; keep restore key separate. | current rule |
| <a id="rf-res-006"></a>RF-RES-006 | — | accepted | Generate one-time owner recovery code stored off laptop/VPS; record only acknowledgement, never code in Roost records or artifacts. | — |
| <a id="rf-res-007"></a>RF-RES-007 | — | accepted | Default one VPS deployment or heavy production test at a time unless manifest proves capacity; check disk/memory/load/Docker/services and wait with reason if insufficient. | — |
| <a id="rf-res-008"></a>RF-RES-008 | — | accepted | Coolify owns scheduled cleanup; Roost does not duplicate, diagnose or repair that cleanup job; insufficient resources only delay deployment. | — |

## Review, GitHub and production delivery

Gate/scope of enforcement: before push or release.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-rel-001"></a>RF-REL-001 | — | accepted | Use private GitHub Free branches and PRs without paid CI dependency; local Agent Host runs required tests; broker enforces review/main protection, hooks alone are insufficient. | — |
| <a id="rf-rel-002"></a>RF-REL-002 | — | accepted | Repository visibility is owner-controlled and may never be changed autonomously to obtain free protections. | — |
| <a id="rf-rel-003"></a>RF-REL-003 | — | accepted | Reviewer is an independent agent identity in a fresh session, selected by scheduler; inspect criteria/exact diff/commit/evidence and independently reproduce checks, without hidden reasoning. | — |
| <a id="rf-rel-004"></a>RF-REL-004 | — | accepted | Temporary release capabilities require independently approved exact commit and passing tests; releaser does not edit code; changed base/commit invalidates review and needs new checks. | — |
| <a id="rf-rel-005"></a>RF-REL-005 | — | accepted | Tracked changes finish only after commit, integration and push; runtime additionally requires expected production commit, health and observation; docs-only changes do not require deploy. | — |
| <a id="rf-rel-006"></a>RF-REL-006 | — | accepted | Observe production for risk-based window; attribute regression to release before rollback; baseline defects become separate findings; ambiguity freezes further releases and triggers independent diagnosis. | — |
| <a id="rf-rel-007"></a>RF-REL-007 | — | accepted | Rollback restores immutable previously verified image, config and compatible schema as one manifest; retain current plus one verified prior artifact through observation/backup checks. | — |
| <a id="rf-rel-008"></a>RF-REL-008 | — | accepted | Clear safe release failure triggers rollback without routine owner question; never repeat failed deployment blindly; irreversible/data-loss case uses separately approved recovery plan. | — |
| <a id="rf-rel-009"></a>RF-REL-009 | — | accepted | VPS monitors continuously while laptop offline and records incidents; initial mode makes no code/deploy/rollback without laptop; app-native safety remains active. | — |
| <a id="rf-rel-010"></a>RF-REL-010 | — | accepted | Each app needs defined tested safe state and allowed emergency procedures before autonomous production; invalidate safety proof by impact/expiry and retest safely in paper/simulation with resource limits. | — |
| <a id="rf-rel-011"></a>RF-REL-011 | — | accepted | Test plan follows change impact: direct regression/reproduction first then affected contracts; broad tests for shared core/auth/API/schema, equivalent repeatable evidence if automation impractical, no arbitrary coverage quota. | — |
| <a id="rf-rel-012"></a>RF-REL-012 | — | accepted | UI work needs application-appropriate before/after visual, responsive, accessibility and functional evidence with independent UI/UX review. | — |
| <a id="rf-rel-013"></a>RF-REL-013 | — | accepted | API/backend remain compatible with existing frontend, integrations and stored data; breaking changes require staged migration plan. | — |
| <a id="rf-rel-014"></a>RF-REL-014 | — | accepted | Production configuration has versioned desired state, reason and proof; diagnose drift before correction, escalate unclear/risky differences instead of overwriting. | — |
| <a id="rf-rel-015"></a>RF-REL-015 | — | accepted | App health contract includes critical flows, jobs, integrations, errors and thresholds; establish deployed commit/services/config/known-problem baseline and block unknown production state. | — |
| <a id="rf-rel-016"></a>RF-REL-016 | — | accepted | Each app has deployment windows and tolerated interruption; Roost any time after draining/checkpoint, target interruption at most ten minutes and safe rollback. | — |
| <a id="rf-rel-017"></a>RF-REL-017 | — | accepted | DemoApp any time only without active live position/trading; expected full six-component deployment within 20 minutes, warning after 20, component diagnosis after 30, never timeout-only rollback; propose threshold changes, never silently extend. | current rule |
| <a id="rf-rel-018"></a>RF-REL-018 | — | accepted | Feature flags are required only when concrete risk warrants them, not on every change during the test stage. | current rule |

## Readiness and staged activation

Gate/scope of enforcement: activation gates.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-act-001"></a>RF-ACT-001 | — | accepted | Keep execution disabled until applicable readiness gates pass; observer presence, docs, completed bootstrap batch and account keys do not activate agents. | — |
| <a id="rf-act-002"></a>RF-ACT-002 | — | accepted | Before writing, run local synthetic end-to-end readiness and fault injection covering interruption/restart, lease expiry, reviewer rejection, missing resources, preserving work and preventing duplication. | — |
| <a id="rf-act-003"></a>RF-ACT-003 | — | accepted | Before push/PR certify broker main protection; then one temporary owner-provided private GitHub repository and canonical folder exercise branch, commit, push, PR, review, merge, Coolify, health and rollback. | current rule |
| <a id="rf-act-004"></a>RF-ACT-004 | — | accepted | After temporary certification, remove only owned local clone/containers/Coolify app and archive test repository; recreate only after material host/process changes, never permanent playground. | current rule |
| <a id="rf-act-005"></a>RF-ACT-005 | — | accepted | First real worker is read-only DemoApp Application Auditor: verify repo/docs/code/tests/Git/public health and report findings; no edits, Docker, branch, commit or exchange operation. | — |
| <a id="rf-act-006"></a>RF-ACT-006 | — | accepted | Second worker is independent read-only Audit Verifier with fresh session and structured handoff; sample evidence, validate target and unchanged files/Git/processes/Docker, approve or return gaps. | — |
| <a id="rf-act-007"></a>RF-ACT-007 | — | accepted | First write requires both canaries and one concise readiness report with proofs, exact capabilities, prohibitions, risks and recovery plus owner approval; select small reproducible reversible non-financial DemoApp bug. | — |
| <a id="rf-act-008"></a>RF-ACT-008 | — | accepted | Unlock read-only, local write/test, push/PR, merge/deploy then higher risk only after evidence; after one-time write approval ordinary advancement is automatic, sensitive/live exceptions remain. | — |
| <a id="rf-act-009"></a>RF-ACT-009 | — | accepted | Require three consecutive complete low-risk DemoApp successes with review, release and observation before medium risk; failure pauses advancement and independent analysis sets additional proof, not blind history reset. | — |
| <a id="rf-act-010"></a>RF-ACT-010 | — | accepted | Each additional app gets its own audit, manifest, health contract and safe canary despite portable worker competencies. | current rule |
| <a id="rf-act-011"></a>RF-ACT-011 | — | accepted | Each implementation outcome first audits current mechanisms and advances the earliest unmet end-to-end gate. It may contain multiple bounded internal tasks and delegated components, but has one accountable implementation owner, one active outcome and coordinated non-overlapping writers. Do not duplicate foundations, start a competing outcome or stop at an internal atom while the accepted gate remains unproven. | Supersedes the former one-atom-per-run stopping rule. |

## DemoApp product and controlled integration tests (future native agents only)

Gate/scope of enforcement: after activation and relevant approval.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-demoapp-001"></a>RF-PILOT-001 | — | accepted | DemoApp is first pilot with canonical DemoApp clone, example-org/DemoApp repository and demoapp.example.com deployment; stabilize unfinished core flows before features. | — |
| <a id="rf-demoapp-002"></a>RF-PILOT-002 | — | accepted | Backtest, paper and live share strategy decision engine and persisted decisions; modes differ in historical input/order executor, with multiple exchanges, markets and portfolios. | — |
| <a id="rf-demoapp-003"></a>RF-PILOT-003 | — | accepted | Separate strategy logic, immutable configuration version and run; edits create a version, rollback selects prior history, existing positions remain owned by opening version until close unless tested migration approved. | — |
| <a id="rf-demoapp-004"></a>RF-PILOT-004 | — | accepted | Deploy must not silently change mode/config or interrupt/duplicate trading; verify live positions/orders/processes, stop new orders and reconcile in-flight work before safe restart. | — |
| <a id="rf-demoapp-005"></a>RF-PILOT-005 | — | accepted | Current test mandate is 10 USDT Binance Futures and 10 USDT Gate.io Futures; minimize losses, protect all spot assets; increased capital or spot scope needs new decision. | — |
| <a id="rf-demoapp-006"></a>RF-PILOT-006 | — | accepted | No deposits, withdrawals or wallet transfers by DemoApp/agents; before first live test confirm once that BOTH exchange API keys lack withdrawal AND transfer rights, automatically if API supports else owner manual check. | — |
| <a id="rf-demoapp-007"></a>RF-PILOT-007 | — | accepted | Every real-position live test requires fresh single-use owner consent bound to exchange, strategy, amount, duration, closing procedure and start window; owner confirms laptop available at least one hour; expiry/silence blocks. | current rule |
| <a id="rf-demoapp-008"></a>RF-PILOT-008 | — | accepted | Test only target DemoApp functions for open/manage/close/history; at most 60 minutes exposure, prompt closure and risk reduction preferred to price; no temporary watchdog/test-only app feature. | current rule |
| <a id="rf-demoapp-009"></a>RF-PILOT-009 | — | accepted | One position at a time, smallest market-supported size, at most 1 USDT margin, leverage at most 10x and confirmed isolated margin; impossible minima/unknown mode block or require new owner decision. | — |
| <a id="rf-demoapp-010"></a>RF-PILOT-010 | — | accepted | Failed close or laptop interruption fails test, blocks further tests and may need owner manual close; never claim a temporary VPS watchdog will rescue it. | current rule |
| <a id="rf-demoapp-011"></a>RF-PILOT-011 | — | accepted | Before test verify no conflicting existing orders/position; after test reconcile exchange and DemoApp DB, history, fees, result, zero residual orders/position; certify Binance and Gate.io separately and sequentially. | — |
| <a id="rf-demoapp-012"></a>RF-PILOT-012 | — | accepted | Same impacted code/config passes automatic tests, backtest and paper before proposing live; paper sample/time and pass conditions set in advance; technical correctness separate from investment performance. | — |
| <a id="rf-demoapp-013"></a>RF-PILOT-013 | — | accepted | During repairs adjust strategy only to reproduce/test, not optimize profit; version test config, restore prior active config unless approved target; each run links ID, code, strategy and config to decisions/orders/results. | — |
| <a id="rf-demoapp-014"></a>RF-PILOT-014 | — | accepted | After uncertain order response or reconnect reconcile exchange by order identifier before retry to avoid duplicated positions. | — |
| <a id="rf-demoapp-015"></a>RF-PILOT-015 | — | accepted | Use separate application test accounts where feasible; external integrations specifically use owner real connected account in an isolated folder/list/tag or exact allowed operations. | current rule |
| <a id="rf-demoapp-016"></a>RF-PILOT-016 | — | accepted | Mark integration artifacts with test ID and delete only artifacts created by that test unless retained by acceptance; respect rate/cost limits, extra charge requires budget decision. | — |
| <a id="rf-demoapp-017"></a>RF-PILOT-017 | — | accepted | Test locally/mocked first, then local integration; use resource-bounded VPS gateway only for demonstrated callback/fixed-IP requirement within approved scope. | — |

## User communication, localization, time and attention

Gate/scope of enforcement: before affected user workflows.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-ux-001"></a>RF-UX-001 | — | accepted | Central attention shows Decisions, Blockers, Incidents and Results; actionable entries stay until resolved/snoozed, deduplicate event threads and avoid routine heartbeat noise. | — |
| <a id="rf-ux-002"></a>RF-UX-002 | — | accepted | Default concise outcome and key evidence with expandable execution timeline, roles, model/effort/budget/checkpoints/handoffs/tests/commits/releases/retries/stops; explain actions without hidden reasoning. | — |
| <a id="rf-ux-003"></a>RF-UX-003 | — | accepted | Owner can drain queue, checkpoint-stop task, block app or emergency-stop host with scope/reason/audit/resume; uncertain process stop keeps writer fenced. | — |
| <a id="rf-ux-004"></a>RF-UX-004 | — | accepted | Permanent compact decisions/handoffs/result/commit/deploy evidence; successful raw logs 7 days, failures 30 days or until diagnosis complete; redact before persistence, remove safe local temps after upload, large artifacts source links/hash only. | — |
| <a id="rf-ux-005"></a>RF-UX-005 | — | accepted | Store communication language per user, UI language independently, and canonical knowledge language per workspace; route decision language to responsible recipient and retain original plus canonical translation, confirm ambiguity. | — |
| <a id="rf-ux-006"></a>RF-UX-006 | — | accepted | Choose workspace language at creation and keep immutable; existing Example Company workspace is English; language migration deferred. | — |
| <a id="rf-ux-007"></a>RF-UX-007 | — | accepted | Preserve current UI choice; support PL/EN now and extensible catalog; missing translations fall back to English and create a finding rather than raw key. | — |
| <a id="rf-ux-008"></a>RF-UX-008 | — | accepted | Store timestamps UTC, display in user timezone, company schedules in workspace timezone; Example Company Europe/Zurich; user browser detection with manual override. | — |
| <a id="rf-ux-009"></a>RF-UX-009 | — | accepted | Daily schedules preserve workspace wall time across DST without duplicate/missed work; offline missed periods coalesce to one catch-up unless procedure explicitly requires all. | — |

## Explicitly deferred features

Gate/scope of enforcement: nonblocking and disabled.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-def-001"></a>RF-DEF-001 | — | deferred | 2FA is future security improvement, not a first-agent activation prerequisite. | — |
| <a id="rf-def-002"></a>RF-DEF-002 | — | deferred | Dedicated Roost/runtime staging, paid GitHub/CI and larger VPS wait for owner/infrastructure change; no periodic purchase reminders. This does not reject the separately deferred customer-project environment direction in RF-SVC-013. | current rule |
| <a id="rf-def-003"></a>RF-DEF-003 | — | deferred | Investment optimization agent and its detailed mandate remain future decisions; current work only stabilizes/tests DemoApp. | — |
| <a id="rf-def-004"></a>RF-DEF-004 | — | deferred | Changing workspace language after creation is deferred. | — |
| <a id="rf-def-005"></a>RF-DEF-005 | — | deferred | External email/Telegram notifications are deferred; use Roost attention surfaces initially. | — |
| <a id="rf-def-006"></a>RF-DEF-006 | — | deferred | Native Roost self-development, Constitution work and shutdown of both bootstrap automations remain deferred until separate owner decision. | current rule |

## Organization and product lifecycle

Gate/scope of enforcement: before related workflows.

| ID | Reference | Decision | Requirement and acceptance clauses | Supersession |
| --- | --- | --- | --- | --- |
| <a id="rf-org-001"></a>RF-ORG-001 | — | accepted | Agent profile includes identity, department, role, manager, competence levels/evidence, allowed/denied task types, maximum authority/tools, procedures, model policy, availability and outcome history. | — |
| <a id="rf-org-002"></a>RF-ORG-002 | — | accepted | Goal is outcome, hierarchical procedure is how, pipeline is execution and task is atomic work; each procedure has owner, inputs, outputs, roles, exceptions and gates. | — |
| <a id="rf-org-003"></a>RF-ORG-003 | — | accepted | Applications progress concept/prototype/stabilization/market readiness/product-service/maintenance using evidence and one shared application identity across departments. | — |
| <a id="rf-org-004"></a>RF-ORG-004 | — | accepted | Postmortem has one accountable owner and independent domain reviewers; author contributes evidence but cannot unilaterally change own instructions or company process. | — |
| <a id="rf-org-005"></a>RF-ORG-005 | — | accepted | Classify legacy product assumptions before migration; Roost owns approved company/product context, repositories own current technical architecture/tests; retain provenance without mechanical copy. | — |
