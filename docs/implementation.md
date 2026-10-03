# Current implementation

This document is the only active delivery handoff for completing Roost's
supervised-agent runtime. It records current facts, the outcome being delivered
and the demonstrations that prove completion. It is not a task board and does
not prescribe one conversation or commit per internal step.

## Delivery objective

Finish the reusable Roost runtime so an accepted task can travel through the
complete path below without manual technical coordination:

```text
Roost task
  -> outbound-connected Windows Local Worker
  -> managed Hermes
  -> explicitly selected provider/model/reasoning effort
  -> bounded work in the canonical application checkout
  -> evidence, review and result returned to Roost
  -> authorized release and production verification when the task requires it
```

The first proof uses the configured pilot application. Successful proof must be
reusable for later applications; installation-specific paths, domains and
credentials remain private configuration rather than repository defaults.

## Execution ownership

One implementation owner carries the currently authorized gate through its
complete result. The owner may plan substeps, modify several components and
create multiple reviewable commits, but does not hand the work back merely
because an adapter, migration, test fixture or technical contract is complete.
The same owner may continue later, but authorization for one gate never implies
authorization to start the next gate.

Codex work in this repository uses the `roost-runtime-delivery` repository
skill, the orchestration rules in `AGENTS.md` and the deterministic
`npm run codex:check` contract checks. These are delivery controls for building
Roost; they do not themselves satisfy any runtime gate. Subagent findings or
changes become evidence only after the implementation owner reviews,
integrates and verifies them at the level required by the applicable gate.

Ordinary implementation discoveries are resolved autonomously from, in order:

1. current accepted Decisions and `product/requirements.md`;
2. `product/product.md` and its stable product chapters;
3. current architecture and operations contracts relevant to the component;
4. inspected code, migrations, tests and runtime evidence.

A contradiction is recorded and resolved at the highest applicable source. Old
"next atom" statements in versioned technical evidence never define current
work.

## Current verified state

The repository already contains substantial Roost product functionality:
PostgreSQL/Prisma persistence, Express API, React owner console, workspace
boundaries, API/MCP surfaces, provider adapters, task/context/review primitives,
Windows Worker foundations and Hermes qualification evidence.

**Gate 1 is met at production/runtime evidence level (2026-09-27).** The
production API build `18bd5c6466372263316a5846f990f61cacd41040` was
read back after deployment `yesokuu2ikcxh43zdf3fju9w`; additive migrations
87–89 and native v3 signing/issuer checks passed. The sole owner provisioned
the public-key anchor and delivered the scoped Worker credential through HTTPS
handoff into Windows Credential Manager. Supervised execution uses attested
Hermes 0.21.2. Private installation values remain outside Git.

Host `edcde4a6-243a-4fab-a885-715c7013c6fc` claimed low-risk task
`a965868b-60b1-4c42-9acd-c077c044002d`. Execution
`9fc132c6-af99-4d98-a2e2-27de7d576879` completed on its first attempt at
01:08:43 UTC under signed Decision `2c12bf61-7cfe-475a-8431-40c8f3d8514a`:
`codex_responses`, `gpt-5.6-sol`, low reasoning, no fallback. Roost read back
the model response, clean baseline commit
`cf90418cc694dc0cb773a44c001c569407d05f9f`, no changed files, signed
admission, native Job exit 0/zero active processes and durable
`verified_candidate` review with verification and installation PASS. Spent
admission files were archived by execution ID. Hermes token/cost usage is
unavailable. Cancellation and lease-loss controls passed 66 focused
Worker/native tests, including Windows Job descendant termination; forced
production cancellation and lease-loss were not exercised.

Production readiness reports `executionEnabled: true` and
`supervised_execution`. Gate 1 proves this bounded round trip; it does not
claim independent coding review or release. Ollama remains unqualified.

**Gate 2 is met at native coding and independent review evidence level
(2026-09-27).** Separate managed read-only auditor and verifier executions
completed on the clean pilot baseline before the owner's one-time first-write
Decision. Incomplete and out-of-scope work was refused at Submit. The Windows
Worker demonstrated writer exclusion, an interrupted checkpoint and safe
same-attempt resume. Its managed Hermes coder worked only in the configured
pilot checkout, ran focused tests and created local commits. An independent
credential-bound reviewer rejected three successive candidates with specific
defects, and the accountable manager returned bounded corrections in Roost.
The corrected execution `b95cf777-fe24-46a4-a88e-4bd0a9314bef` produced
commit `774e858ae48d1f05d2b56982a7113da983f62af8` with a signed local
commit receipt, native `verified_candidate` review, passing Windows test and
clean checkout. A separate read-only Linux test passed the POSIX case. Reviewer
execution `5c27d054-7cc3-45a1-9ef6-d43760316e69` completed with unchanged
Git/process/Docker state and stored Decision
`c349899b-72c3-4260-9b77-de733f42866c` approving that exact commit and
coding material digest in Roost. The pilot branch remains local, clean and
recoverable. It has not been pushed or deployed. See the
[evidence record](architecture/traceability-matrix.md).

Gate 2 proof is bounded to this configured pilot task, its declared resolver
paths, procedures, roles and runtime. It does not certify general automatic
scheduling, all context semantics, arbitrary filesystem effects, release or
production behavior of the pilot change. Hermes token/cost usage remains
unavailable. A failed earlier coding attempt needed exact manual native lease
and spent-admission reconciliation before a later candidate could run; the
signed terminal proof and archived private artifacts are retained. Automatic
reconciliation of every after-spawn failure is not claimed.

## End-to-end delivery gates

These gates are outcome-sized delivery boundaries, not internal technical
atoms. Complete the currently authorized gate without requesting permission for
ordinary reversible technical work inside it.

## Gate authorization boundary

One user task authorizes one named gate by default. If the task does not name a
gate, use only the earliest unmet gate. The implementation owner may decompose,
delegate, repair and commit within that gate when authorized, but must not begin
the next gate in the same task unless the user explicitly authorized multiple
gates.

After proving the current gate, update this document, run the required checks,
leave recoverable state, report the exact evidence and stop. Remaining account
usage, available context or elapsed time is not authority to continue. The
owner reviews usage and starts or continues work with a new instruction for the
next gate. Push and deployment remain governed by their gate and explicit user
authority.

### Gate 1 — real agent round trip

An accepted low-risk Roost task is claimed by the intended Windows Worker.
Managed Hermes starts with an explicit approved backend, model and reasoning
effort. The execution reports heartbeats, terminal result, usage when available
and bounded evidence back to Roost. Cancellation and lease loss stop safely.

Completing this gate includes every missing internal dependency, including the
Prisma v3 integration, applying and qualifying migration 87, real signing and
verification, key provisioning, HTTPS admission and default runtime wiring.
None of those internal components is independently considered delivery.

### Gate 2 — governed coding delivery

The agent receives the pinned task/application/procedure context, works only in
the configured canonical checkout, respects the one-writer and one-instance
rules, checkpoints progress, resumes safely after interruption, runs the
required tests and produces a reviewable commit. An independent competent role
accepts or returns the work with reproducible evidence.

This gate also proves hierarchy, role/competence assignment, task decomposition,
clarification, Decision escalation, resource admission and learning feedback to
the extent required by the real delivery. Missing supporting behavior is fixed
inside the same outcome rather than deferred into unrelated contract work.

### Gate 3 — governed release

**Met at native/production evidence level (2026-10-02):** Exact Git/PR/merge,
interrupted deployment, controlled failure, healthy rollback and owned cleanup
passed. [Evidence](operations/governed-release.md). Gate 4 is in progress.

An accepted exact commit follows Git, deployment, baseline health, observation
and certification or rollback. Audit, secrets, backup/restore, compatibility
and owned cleanup are required; no extra clones or services.

### Gate 4 — pilot application proof

**In progress:** [evidence](operations/application-release.md); backup verified;
native RED/GREEN and current acceptance verified; observation failed;
old rollback unqualified; owner accepted a new baseline; new proof pending.

One real low-risk defect in the configured pilot application is discovered,
planned, implemented, independently tested, committed, released and verified in
production through Gates 1–3. Application-specific safety rules and any owner
consent explicitly required by `product/requirements.md` remain binding.

### Gate 5 — reusable company operation

The same mechanism can onboard another configured application without changing
the core runtime. Accepted requirements applicable to internal application
delivery are reconciled against real operation: organization and competencies,
procedures and goals, attention and
Decision UX, localization/time, recovery, resources, security, monitoring,
release and continuous improvement. A requirement is complete only with the
runtime evidence defined in the traceability matrix.

This gate proves reusable internal application development. Commercial sales,
customer-service delivery, native mobile and other explicitly deferred product
directions remain later phases. Reconciling a requirement means recording its
evidence and applicability; it does not make every accepted future requirement
an immediate implementation dependency or mark it complete.

## What is not a blocker

Do not stop or bounce the work because of:

- a missing adapter, migration, route, UI or test;
- a failed build, test, Docker start or database qualification;
- an architecture correction or a larger-than-expected implementation;
- the need to choose a reversible technical design;
- the need for several commits or coordinated backend/Worker/Hermes changes;
- discovery that an earlier source-only contract is incomplete.

Those are implementation work. Diagnose, repair, verify and continue.

## True owner dependencies

Pause for owner input only when progress requires one of these:

1. a login, 2FA response or secret unavailable to the runtime;
2. an unapproved irreversible operation against real data or an external
   account;
3. a genuine contradiction in accepted business/product intent that changes
   the requested outcome rather than its implementation;
4. an unavailable external service for which no safe technical alternative
   exists.

Before pausing, complete all independent preparation, retain recoverable state
and ask one concrete question describing the exact blocked action and effect.

## Completion evidence

For every gate, record the exact task/run identities, relevant commits,
configuration versions, model/backend request and observation, checks, review,
deployment identity, health comparison, cleanup and residual limitations.
Source-only and mocked tests are supporting evidence; they never substitute for
the native or production proof required by the gate.

Update this document in place as gates advance. Do not create a new versioned
plan or a new "next atom" document. Git history is the implementation history.

## Planning and execution handoff

The planning conversation prepares gates and reviews evidence. Each execution
conversation implements one authorized gate. Owner-requested planning of later
gates does not authorize their execution or expand an active assignment.

Keep product decisions in the existing product chapters and requirement IDs,
delivery scope and acceptance here, evidence in the traceability matrix and
technical records, and unresolved business choices in `planning/open-decisions.md`.
Conversation history is supporting context, never the required handoff source.

Batch new requirements for the next handoff; interrupt active work only for
STOP, safety or material scope correction. Preserve verified-state sections.
Before assigning a gate, reconcile its prerequisites against the previous
result and current repository. Planning alone never advances runtime status.

### Assignment contents

Prepare one outcome-sized assignment from the selected gate below. It contains:

- the gate, expected user-visible result, prerequisite evidence and relevant
  requirement IDs;
- the inspected existing implementation to reuse, missing behavior to build,
  installation configuration to apply and the proof needed for each;
- the scoped API/MCP, web and Worker surfaces, allowed local/VPS operations,
  credential availability, resource constraints and required owner approvals;
- observable success and failure cases, evidence locations and completion
  checks;
- one implementation owner, permitted bounded delegation, commit/push/deploy
  authority, current resource/usage budget and a mandatory stop after the gate.

Inspect code/configuration for the selected gate. Reuse adequate existing
dependencies; justify additions by missing behavior and maintenance/resource cost.

### Execution brief for Gate 2 — accountable coding and review

**Entry:** verified Gate 1 run and compatible runtime/configuration identities.
Primary requirements: RF-CTX-001 through RF-CTX-026, applicable RF-GOV and
RF-ORG rules, RF-HOST-002 through RF-HOST-012, RF-REL-003, RF-REL-011,
RF-ACT-002 and RF-ACT-005 through RF-ACT-008. Security, backup and resource
requirements apply before the operations they protect.

**Build and configure:** task readiness and pinned context, role/hierarchy and
competence routing, procedure assignment, model/effort policy, canonical
checkout and resource manifest, writer admission, checkpoints/resume,
independent review and the owner's attention/decision/result views. Configure
the actual roles and procedures needed for the proof; empty screens or example
records do not satisfy the gate. Agents use the scoped MCP interface over the
same authoritative API as the web console; no direct database bypass.

**Proof:** demonstrate rejection of incomplete/out-of-scope work, one-writer
enforcement, interruption and safe resume, review rejection and corrected
resubmission, then independent acceptance of an exact reviewable commit. The
owner can trace the assignment, responsible roles, tests, decisions and result
in Roost without reconstructing terminal conversations. Read-only pilot audit
and independent verifier precede the one-time first-write approval. Synthetic
qualification may prepare the flow before that approval; it cannot replace the
required native evidence. Application edits are performed by the managed
runtime under its mandate, not directly by the bootstrap implementation agent.

**Exit:** record accepted commit/run/context/configuration identities and
recovery proof; stop before release certification. Any prerequisite safety
control is implemented before use, even if its broader proof belongs to Gate 3.
Gate 2 authorizes neither a pilot push/deploy nor the one-time first-write
activation decision. After review, retain the pilot commit and branch as an
explicit recoverable handoff for later release; never claim the change shipped.
Bootstrap Roost/Worker commits and deployments follow the assignment's separate
authority and do not themselves certify the managed Gate 3 release path.

### Execution brief for Gate 3 — controlled release and recovery

**Entry:** Gate 2 coding/review proof. Primary requirements: RF-REL-001 through
RF-REL-018, RF-RES-001 through RF-RES-008, RF-ACT-003 and RF-ACT-004 and
applicable security/compatibility rules.

**Build and configure:** exact-commit release authority, free-account-compatible
Git protection, Git/deployment mapping, service and health manifests, baseline,
observation thresholds, backup/restore, compatible rollback artifacts and
cleanup ownership. Configure real deployment behavior; a release status field
alone is insufficient.

**Proof:** certify the branch/commit/push/PR/review/merge/deploy/health path in
the owner-provided temporary certification target, plus rejection of an
unreviewed or changed commit and a controlled recovery/rollback scenario.
Reconcile uncertain remote outcomes before retry. Verify deployed identity,
data preservation and cleanup/archive of only certification-owned resources.
Reuse any still-valid proof; request the temporary repository/folder/access
only when needed. Never change repository visibility to obtain free features.

**Exit:** release and recovery are proven with exact identities and observations;
stop before the real application repair pilot.

### Execution brief for Gate 4 — first real application repair

**Entry:** Gates 1–3 evidence and the pilot's required activation approval.
Primary requirements: RF-APP-003 through RF-APP-014, RF-ACT-005 through
RF-ACT-009, RF-CTX-021/RF-CTX-022 and applicable RF-PILOT rules.

**Build and configure:** reuse the pilot's assumptions, readiness records,
application card, roles, procedure and health/release settings. Select a
verified reversible low-risk non-financial defect and repair missing Roost
support. Reuse still-valid Gate 2 coding evidence where it fits the chosen task.

**Proof:** managed agents audit, plan, repair, review, release and verify the
original reproduction; link requirement, task, review, commit, deployment and
result. Direct bootstrap edits to the pilot cannot count as managed delivery.

**Exit:** one real repair proven. This does not mean the entire pilot application
is finished or sale-ready. Medium-risk access still requires the separate
three-success rule; live-position tests retain their explicit consent rules.

### Execution brief for Gate 5 — reusable internal application operation

**Entry:** proven pilot repair. Primary requirements: RF-PROD-011/RF-PROD-012,
RF-APP-001 through RF-APP-014, RF-ACT-010, RF-ORG and applicable RF-OUT,
RF-UX, RF-GOV, context, resource and recovery requirements.

**Build and configure:** reusable takeover and delivery procedures, configured
roles/competencies, application-specific assumptions and manifests, portfolio
status and owner decision flow. Audit the next owner-selected application and
apply its own configuration. Reuse shared mechanisms and preserve separate
product context, access and evidence. Existing apps enter at their proven
lifecycle stage rather than restarting development.

**Proof:** run the same managed flow for a bounded accepted outcome in a second
configured application. Demonstrate that onboarding uses application context and
configuration rather than a new execution engine; repair any discovered generic
gap and retain the pilot's relevant regression proof. The owner can identify
each application's current stage, nearest outcome, accountable role, blocker or
decision and evidence in the web console. Demonstrate continuation of approved
work and safe waiting for an actual owner decision through the intended queue.

**Exit:** reconcile applicable requirements against source, configuration and
runtime evidence in the existing matrix. Explicitly retain unmet or deferred
later-phase requirements. The outcome is a usable system for continuing the
internal portfolio; it is not a claim that every application or every future
company capability is complete. Each additional application still needs its
own audit and safe onboarding proof.

## Later product phases

These are planning horizons, not additional authorized execution gates. Prepare
concrete gates here when the preceding outcome is proven and the phase's
business choices are available. Do not silently add them to Gate 5.

| Horizon | Result and entry condition | Existing requirements / decisions |
| --- | --- | --- |
| Application completion | After Gate 5, deliver each app's backlog to owner-accepted product readiness. | RF-APP-001–014; private app baseline |
| Product sales | Prove offer, payments/access, invoices/accounting, support and controlled launch for a ready product. | RF-APP-015, RF-BIZ, RF-SUP; OPEN-FIN-001 |
| Customer-service capability | After sale readiness, configure website/service scoping, delivery, access, acceptance and settlement. | RF-SVC, RF-SCOPE-004/006; OPEN-SVC-001–004 |
| Customer acquisition | After proving delivery capacity and commercial rules, operate prospect qualification, offers and paid delivery. | RF-SVC, RF-SUP, RF-BIZ |
| Mobile application | After reliable web operation, use the same backend and authority; define platform and initial workflows before execution. | RF-SCOPE-001 |

New company needs extend the owning product chapter with status and dependencies.
Report progress against the authorized gate, not a percentage of the evolving
company vision.
