# Success Metrics

Last updated: 2026-09-24

## Purpose

Define how the project knows it is working.

Use metrics to guide prioritization, not to create vanity dashboards.

## Product Metrics

| Metric | Target | Source | Review cadence | Notes |
| --- | --- | --- | --- | --- |
| Time to owner orientation | Baseline first; numeric target pending | Owner-flow timing and short owner check-in | Weekly during the first 90 days | Time needed to identify what requires attention and why. |
| Lost decision or assumption incidents | Baseline first; trend downward | Decision history, reopened work, and owner review | Monthly | Count only confirmed losses or material ambiguity, not ordinary decision changes. |
| Decision lead time | Baseline first; trend downward | Decision records from request to accepted outcome | Monthly | Segment by consequence and urgency so safety review is not treated as waste. |
| Accountable ownership coverage | Baseline first; trend upward | Active goals, initiatives, and tasks | Weekly | Share with one accountable owner or manager and a clear executor where applicable. |
| Evidence-backed completion coverage | Baseline first; trend upward | Completed work and linked evidence | Weekly | A completion claim without required evidence does not count. |
| Actionable-attention precision | Baseline first; trend upward | Owner review of attention items | Weekly | Share of surfaced items that required a concrete response; routine activity and duplicate alerts count against usefulness. |
| Reference application sale readiness | One owner-selected existing application reaches an explicitly accepted sale-ready state through Roost | Application assumptions, gaps, plan, tasks, verification evidence, and owner decision | At every readiness review | The private application identity belongs to installation data, not distributed product documentation. |
| Application-completion reuse | The accepted completion structure can initialize the next application without copying private assumptions | Completion blueprint and next-application setup review | After the first sale-readiness acceptance | Reuse means common stages and evidence rules with explicit application-specific differences, not identical product requirements. |
| Material-assumption implementation coverage | Every material accepted assumption for the reference application has an evidence-backed implementation state before either readiness decision | Assumption registry, observations, verification evidence, and readiness review | At every audit and readiness review | `unverified` is an honest state but blocks a positive readiness claim when the assumption is required for that gate. |
| Core user outcome proof | The named primary intended user repeatedly completes the application's explicit end-to-end core path and obtains the promised value without routine developer assistance | Readiness profile, application-specific criteria, repeated end-to-end outcome evidence, and owner readiness review | At product-ready review | Technical completion or secondary feature coverage without the primary outcome does not qualify; the exact repetition threshold is risk- and application-specific. |
| Operational readiness coverage | Every risk-applicable access, error, monitoring, backup/restore, and support requirement has current evidence | Readiness criteria and linked operational evidence | At product-ready review and material change | Requirements are proportional to application risk; an inapplicable item needs an explicit reason. |
| Readiness blocker integrity | No product-ready or sale-ready decision passes while a known critical blocker remains in a requirement applicable to that gate | Classified defects and risks, gate criteria, verification evidence, and owner decision | At every readiness review | Payment and other commercial blockers apply to sale readiness; relabelling a critical blocker as minor without evidence is a failed gate. |
| Accepted-limitation governance | Every limitation carried through a positive readiness decision is non-critical and records impact, affected scope, workaround, accountable owner, review date, evidence, and explicit owner acceptance | Limitation register and readiness decision | At every readiness review and due review date | The goal is an honest release boundary, not either hidden debt or unattainable perfection. |
| Paid-customer revenue traceability | Every company-relevant paid purchase imported into Roost links the customer relationship, application offering, revenue and invoice evidence, and accounting synchronization or exception state | Payment/invoice integration events, customer and offering relations, document evidence, and reconciliation state | Daily once commercial sales begin | Roost does not need to copy application user accounts or live entitlement state to provide this company view. |
| Revenue-view reconciliation | Revenue totals by application offering and digital service reconcile with linked transaction, invoice, and accounting states or expose the exact unresolved difference | Owner revenue view, provider totals, invoice evidence, and accounting synchronization | Daily once commercial sales begin and at period close | A summary without drill-down to its business evidence does not qualify. |
| Subscription-payment qualification | The complete path passes in sandbox/test mode, then one real transaction after a controlled live switch reconciles across the payment result, application access response, invoice, Roost, and every applicable destination | Test-mode evidence, live-mode change record, real transaction, reconciliation evidence, and owner readiness review | Before first sale-ready acceptance and after material payment-path changes | Sandbox success and live success are separate proofs; neither may be inferred from the other. |
| Financial exception accountability | No failed, missing, or inconsistent financial result is silently lost; each unresolved case has one deduplicated attention item, accountable agent, and resolution or owner escalation | Integration events, reconciliation state, attention/task records, and escalation history | Daily once the flow is active and after every incident | Duplicate alerts count against the result even when the underlying failure is detected. |
| Paid-access integrity | No cancelled, ended, or unresolved unpaid subscription retains paid access beyond its explicitly accepted offering terms; Roost records the company relationship without claiming entitlement authority | Confirmed payment/cancellation events, relationship state, application/provider access evidence, and reconciliation | Daily once subscriptions are live and after every relevant exception | A deliberately free offer or contractual grace period must be explicit; silence is not an extension. |
| Unpaid-delivery prevention | No chargeable service delivery begins before its agreed payment condition is confirmed | Accepted offer/scope, payment condition, payment evidence, project start, and exception decision | At every later service engagement start | Lead acquisition and bounded initial discovery are explicit acquisition costs and do not count as chargeable delivery. |
| Service scope-change integrity | No out-of-scope service work begins without an accepted change stating outcome, price, schedule impact, and a satisfied payment condition | Original scope, change record, customer acceptance, payment evidence, and linked work | At every service scope change | Informal discussion is not authorization to deliver additional work. |
| Free-discovery boundary integrity | Free qualification produces only problem, fit, and indicative scope/budget context; every detailed or reusable deliverable is linked to paid discovery or a paid project | Discovery record, proposal, deliverables, engagement, and payment evidence | At every later service conversion | The metric protects company capacity without preventing useful sales conversations. |
| Milestone acceptance integrity | Every completed service milestone is reviewed against criteria defined before work began and has linked evidence and accountable acceptance before the next milestone starts | Milestone baseline, acceptance criteria, evidence, customer decision, and next-phase payment | At every milestone boundary | A progress update or internal completion claim is not customer acceptance. |
| Defect/change classification integrity | Every requested correction is traceably classified against accepted scope as either a defect with no added scope fee or a new/changed requirement following the paid change path | Accepted scope, criteria, observed result, classification decision, and linked work | At every correction or change request | Ambiguity is resolved before work begins rather than after invoicing. |
| Final handover completeness | After full settlement, every contractually agreed project-specific file, control transfer, and right/licence has evidence of delivery, while reusable company assets and customer-owned accounts remain correctly attributed | Settlement evidence, handover checklist, access transfer, asset classification, and agreement | At every service project close | Exact legal language remains agreement- and jurisdiction-specific. |
| Review-window closure integrity | Every explicit or deemed milestone acceptance links the delivered result, evidence, disclosed deadline, applicable agreement rule, and any criteria-based objection | Delivery and notice evidence, review deadline, customer response, agreement, and acceptance record | At every milestone close | Silence never counts as acceptance unless the customer received the rule and deadline in advance. |
| Warranty-bound defect handling | Every in-period defect report is classified against the accepted scope, resolved with evidence when covered, or given a justified exclusion; ordinary post-period work follows a paid maintenance path | Acceptance date, warranty term, defect evidence, classification, resolution, and maintenance agreement | At every defect report | Default warranty is 30 calendar days unless the offering explicitly states another period. |
| Critical security assessment coverage | Every reported critical security event receives immediate impact, cause, responsibility, and containment assessment regardless of warranty or maintenance status | Security incident, assessment, evidence, decisions, and communication record | Immediately and at incident review | Immediate assessment does not predetermine free remediation or contractual liability. |
| Customer decision-authority integrity | Every material service decision is confirmed by the engagement's authorized customer actor or an explicit bounded delegate | Engagement authority, source communication, canonical decision, scope/time of delegation, and audit history | At every scope, price, schedule, acceptance, or handover decision | Meeting attendance, title, or repeated messages do not prove authority. |
| External-commitment confirmation | No verbal, meeting, email, or chat statement changes a material commitment until it is recorded and confirmed in the canonical engagement context | Source communication, proposed change, authorized confirmation, and resulting record | At every material external decision | Preserving the original message provides evidence without making it automatically binding. |
| Unsafe-engagement control | Every refused, paused, resumed, or ended engagement has a recorded reason, impact, accountable decision, and safe next step | Risk assessment, engagement state, owner decision where required, customer commitments, and closure/resume evidence | At every such decision | Revenue and sunk effort never substitute for legal, ethical, security, competence, or delivery evidence. |
| Customer-access integrity | Every active company or agent access to a customer system is individually attributable, explicitly authorized, limited to the least required scope, and time-bounded | Customer authorization, access inventory, identity mapping, scope, expiry, and audit evidence | At every grant/change and weekly during later service delivery | Shared credentials or permanent broad access require an explicit exceptional decision and must not become the default. |
| Project access-closure completeness | Every closed service project has evidence that unnecessary company and agent access was revoked and task-owned working copies were removed or retained under an explicit basis | Closure checklist, revocation evidence, working-copy inventory, retention basis, and handover evidence | At every later service project close | Cleanup never authorizes deletion of customer-owned canonical systems or data. |
| Safe customer-data path | Once the later service infrastructure exists, applicable work starts in an isolated test/staging environment with synthetic or anonymized data; every production/customer-data exception is necessary, approved, time-bounded, attributable, and audited | Environment classification, data classification, approval, access evidence, and audit history | At project start and every production-data exception | This is an accepted later-phase metric, not a current MVP gate. |
| Incident accountability | Every actionable monitoring or application-error condition has one deduplicated incident, accountable agent, current evidence, and resolution or justified owner escalation | Monitoring/error signals, incident records, linked work, and recovery evidence | Daily once an application is live and after every material incident | Raw repeated signals do not count as separate incidents unless they represent different underlying problems. |
| Support-case traceability | Every accepted customer request has one case linked to the canonical customer, offering, responsibility, status, and outcome evidence | Support cases, customer and offering relations, communication and resolution evidence | Weekly once customer support begins | Roost tracks the company relationship and case without copying application user-account or entitlement administration. |
| Feedback classification integrity | No feature proposal becomes implementation work without an authorized product decision; confirmed defects remain distinguishable from support questions | Classified customer input, decision records, and linked tasks | Monthly once feedback is collected | The purpose is to prevent accidental commitments and backlog noise, not to suppress useful ideas. |

## Quality Metrics

| Metric | Target | Source | Review cadence | Notes |
| --- | --- | --- | --- | --- |
| Daily owner-loop completion | Baseline first; target pending | Attention, decision, delegation, and evidence records | Weekly | Measures whether the connected operating loop can be completed without reconstructing state across tools. |
| Workspace-boundary and audit integrity | No known cross-workspace or unaudited protected action | Security, access, and audit evidence | Every release and monthly review | A guardrail; speed improvements must not weaken it. |
| Bidirectional synchronization freshness | Baseline first; target pending by provider and record type | Integration checkpoints and last-success timestamps | Daily and after incidents | Distinguish current, stale, pending, and conflicting state; provider availability alone does not prove data freshness. |
| Synchronization recovery completeness | No silently lost accepted change | Pre-outage checkpoints, pending operations, catch-up results, and conflict queue | After every outage | Recovery is complete only when both directions reconcile or remaining conflicts are explicitly visible. |
| Integration access hygiene | No active mapping for an offboarded or revoked actor; no scope wider than its accepted classification | Provider mappings, credential state, classification, last use, and reassignment queue | On every access change and monthly | Historical attribution is retained; disabling access must not delete evidence. |

## Agent/Automation Metrics

Use when agents or automations are part of the project.

| Metric | Target | Source | Review cadence | Notes |
| --- | --- | --- | --- | --- |
| Verified agent outcome rate | Baseline first; trend upward | Reviewed agent results and acceptance evidence | Weekly once active | Count independently accepted outcomes, not process exit or self-reported completion. |
| Owner intervention rate | Baseline first; trend downward without reducing safety | Clarifications, corrections, cancellations, and manual recoveries | Weekly once active | Distinguish useful reserved decisions from avoidable supervision caused by weak context or execution. |
| Deterministic automation coverage | Every eligible stable and repeatable financial step runs through a tested callback, API, or script rather than routine AI or manual handling | Workflow classification, automation evidence, and exception records | At readiness review and quarterly once active | Agent verification and exception handling remain valid; the metric targets unnecessary model work, not useful judgment. |

## Ninety-Day Outcome Set

The owner accepted all of the following as success outcomes on 2026-09-20:

- faster orientation in company state;
- fewer lost assumptions and decisions;
- faster decisions;
- more work with an accountable executor;
- more completed work with inspectable evidence;
- successful agent work with less continuous supervision.

On 2026-09-23 the owner added the immediate MVP proof: one existing application
reaches evidence-backed readiness for subscription sale through Roost and an
authorized supervised agent, and the resulting completion process is reusable
for further applications. Service sales and customer acquisition follow later.
The audit must distinguish accepted assumptions from observed implementation and
classify every material assumption before readiness is accepted.

These directions are accepted. Baselines, numeric targets, data-collection
details, and any prioritization among them remain open until the product can
measure them honestly.

## Maintenance Rule

When a metric becomes irrelevant, mark it deprecated with a reason instead of
silently deleting it.
