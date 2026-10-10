# Current implementation

This is the sole active delivery handoff: current facts, authorized outcome
and required end-to-end evidence.

## Delivery objective

Make Roost usable as the owner's company workspace with an optional local agent.
An accepted company task must travel through the path below without manual
technical coordination:

```text
Owner-created Roost task and current, scoped company context
  -> outbound-connected Windows Local Worker
  -> managed Hermes
  -> explicitly selected provider/model/reasoning effort
  -> bounded work within the task's actual authority
  -> result and status visible to the owner in Roost
  -> owner decision or review appropriate to that task
```

Local repository work is one task type. Git push, application deployment,
production observation and application backup apply only when a separately
authorized task has those effects. A local read-only company task needs none of
them. Preserve the separately accepted recoverability requirement for Roost's
own business database before allowing agent writes to those records; reuse
existing proof rather than repeating it for every task. Configured applications
may later exercise the mechanism, but their readiness does not define Roost's
product completion. Installation paths, domains and credentials stay private.

## Execution ownership

One implementation owner completes the authorized gate across components,
integration and native proof. Internal steps/commits are not handoff boundaries.
Continuing later requires new gate authority.

Use `roost-runtime-delivery`, `AGENTS.md` and `npm run codex:check`.
The owner integrates and verifies delegated work; these development controls
alone do not prove a runtime gate.

Ordinary implementation discoveries are resolved autonomously from, in order:

1. current accepted Decisions and `product/requirements.md`;
2. `product/product.md` and its stable product chapters;
3. current architecture and operations contracts relevant to the component;
4. inspected code, migrations, tests and runtime evidence.

A contradiction is recorded and resolved at the highest applicable source. Old
"next atom" statements in versioned technical evidence never define current
work.

## Current verified state

Existing foundations: PostgreSQL/Prisma, Express, React owner console, workspace
API/MCP boundaries, provider/task/context/review, Windows Worker and Hermes.

**Gate 1 is met at production/runtime evidence level (2026-09-27).** The
API build `18bd5c6466372263316a5846f990f61cacd41040`, deployment
`yesokuu2ikcxh43zdf3fju9w`, migrations 87–89 and Hermes 0.21.2 are verified.
Execution `9fc132c6-af99-4d98-a2e2-27de7d576879` finished one signed
`codex_responses` attempt as `verified_candidate`; files stayed unchanged and
the Worker stopped. The [matrix](architecture/traceability-matrix.md) preserves
exact signing, credential, model, task, cancellation and archive evidence.
Provider token/cost usage and forced production cancellation remain unproved;
coding, release and Ollama were outside Gate 1.

**Gate 2 is met at native coding and independent review evidence level
(2026-09-27).** Read-only canaries and separate first-write consent preceded
one-writer coding, checkpoint/resume and independent rejection/correction.
Execution `b95cf777-fe24-46a4-a88e-4bd0a9314bef` produced clean local commit
`774e858ae48d1f05d2b56982a7113da983f62af8`; independent execution
`5c27d054-7cc3-45a1-9ef6-d43760316e69` accepted it without push/deploy.
The [matrix](architecture/traceability-matrix.md) retains exact checks,
refusals, signed receipts and recovery evidence. General scheduling, arbitrary
filesystem effects, release, provider usage and every after-spawn recovery
remain unproved.

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
passed. [Evidence](operations/governed-release.md).

An accepted exact commit follows Git, deployment, baseline health, observation
and certification or rollback. Audit, secrets, backup/restore, compatibility
and owned cleanup are required; no extra clones or services.

### Gate 4 — pilot application proof

**Production verified:** [evidence](operations/application-release.md).
Managed PWA repair `7512bc3` is released with 1238s healthy observation,
unchanged data/protected services and independent postrelease verification.
The failed rollback remains unqualified; exact adopted rollback image and
verified backup/restore are retained. Worker stopped; resources cleaned.
Gate 5 later received a separate owner assignment; neither result authorizes a
subsequent release.

One real low-risk defect in the configured pilot application is discovered,
planned, implemented, independently tested, committed, released and verified in
production through Gates 1–3. Application-specific safety rules and any owner
consent explicitly required by `product/requirements.md` remain binding.

### Gate 5 — reusable company operation

**Met at native/deployed-console evidence level (2026-10-04).** The second
configured application reused shared roles/procedures and its own audited,
owner-accepted baseline and separate first-write consent. Worker/Hermes produced
clean local `3cf9645e` with six native tests; independent `7f78d3c2` accepted the
exact commit in `674c5607`. Fixed recovery preserved earlier refusals/spent
attempts. Authenticated portfolio, evidence, actual Decision history and approved
continuation are verified on Roost `d7a5e0de`. Worker stopped; no application
push/deploy. Whole-product readiness and later capabilities remain unproven.
See [evidence and operating limits](operations/internal-application-operation.md).

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

### Second-application release — paused by owner

**STOP on 2026-10-10; no delivery gate is active.** Preserve Gate 5's local
commit `3cf9645e`, the exact accepted candidate `d73e6234`, and historical
evidence. Managed Git push/PR/merge occurred, but release `bdc1387e` failed
at deployment configuration. Normal closure `9154a122` retained its five
operations as FAILED. Fresh read `7441bb91` passed 27 closed native Jobs.
Preparation of another backup stopped before dump/restore; no new credential
rotation or deployment followed. Worker and write/recovery locks were absent at
STOP. The deployment queue was not read after STOP. There is no verified
deployment, observation or independent postrelease acceptance. Exact identities,
refusals and earlier proofs remain in the [matrix](architecture/traceability-matrix.md)
and [Compose record](operations/governed-compose-release.md).

This release cannot restart from a generic "finish the repair" instruction.
A future owner-approved brief must first confirm the actual stopped state and
whether the installed Compose adapter can complete the remaining path. It must
name one result, permitted effects, evidence reuse, rollback, time/token/cost/
attempt limits and a stop rule for a new provider, repeated failure or exhausted
budget. An application push, grant or deployment still requires its own exact
authority. The paused gate grants none.

### Proposed next gate — owner-to-local-agent task loop (not authorized)

**Roost outcome:** the owner creates one low-risk informational company task in
the console, assigns the configured local agent and sees its result and status
back in Roost without using a terminal, database or another conversation. The
agent receives a small, owner-selected set of current Roost records through
the existing task packet and Worker/Hermes path. The owner can accept or return the
result. A repeated ineffective attempt or approved time/attempt limit stops the
task with a visible reason and recoverable state; continuation needs a changed
plan and fresh budget. This advances RF-PROD-011, RF-CTX-001 and RF-HOST-010/011
without claiming full company readiness or completing general API/MCP context
classification under RF-CTX-027.

**Scope:** inspect the existing console task flow, selected-record packet,
Worker/Hermes result path and budget handling first. Reuse working pieces and
change only the missing owner-facing or agent-facing link. Prove one real
low-risk company task, such as a sourced status and proposed next action for an
existing project, and its owner-visible outcome using current Roost records.
Reuse unaffected Gate 1–5 evidence and run focused checks plus
`npm run codex:check`. No application repository change, push, deployment,
application backup or product-readiness review belongs to this gate. Preserve
the existing Roost database protection; do not repeat full backup/restore
certification unless its underlying recovery contract changes.

**Proposed execution ceiling for owner review:** one implementation owner,
45-minute diagnostic checkpoint, 90-minute total wall-clock ceiling and at most
one materially changed retry of the same failed action. No subagent unless a
distinct code change needs review. Token/dollar caps must be stated as unavailable
unless a provider-enforced meter is demonstrated; wall time is not a dollar cap.
For external Codex this is a procedural checkpoint, not an automatic spend cap.
At the ceiling, repeated failure or discovery of a new provider/material
architecture dependency, stop with a recoverable checkpoint and ask for a
smaller revised assignment. No silent extension or next gate.

## What is not a blocker

Ordinary defects inside the approved surfaces are implementation work. An
unplanned provider, material architecture change, repeated ineffective attempt
or exhausted budget requires a safe checkpoint and a smaller revised gate for
owner approval. Preserve the actual failure; do not add hypothetical cases or
repeat unaffected certification.

## True owner dependencies

Pause for owner input when a scope/budget stop above occurs, or when progress
requires one of these:

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
result and current repository. Inspect the real target topology, installed
adapter and observed failure before estimating work. Planning alone never
advances runtime status.

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
  authority, an owner-approved time/attempt ceiling and token/cost ceiling where
  enforceable, plus a mandatory stop after the gate. If token/cost enforcement
  is unavailable, say so and use a shorter time/attempt checkpoint; never call
  an estimate a hard cap;
- a stop rule for an unplanned provider, material architecture change, repeated
  ineffective operation or exhausted budget. Preserve a checkpoint and require
  independent diagnosis, a materially changed plan and fresh owner authority
  before another attempt. Reuse unaffected proof; do not expand the gate to
  hypothetical failure cases.

Inspect code/configuration for the selected gate. Reuse adequate existing
dependencies; justify additions by missing behavior and maintenance/resource cost.

Completed Gate 2–5 execution briefs are retained as
[historical protocol records](operations/completed-gate-briefs.md); their older
entry/exit language does not authorize a new gate.

## Later product phases

These are planning horizons, not additional authorized execution gates. Prepare
concrete Roost gates here when the preceding outcome is proven and the phase's
business choices are available. Application delivery rows describe later agent
work through Roost, not application repairs owned by the Codex Roost builder.

The second-application release is paused. It does not block work on reusable Roost controls
or an independently approved application baseline. Use real application work to
test Roost, then repair reusable gaps in separately approved, bounded outcomes.
The owner-selected next application needs its own baseline; the paused release
needs an explicit disposition before it resumes. Expand
agent authority only after proof. The rows guide dependencies, not execution.

| Horizon | Result and entry condition | Existing requirements / decisions |
| --- | --- | --- |
| Deeper cost and progress control | After the owner-to-agent loop, extend budget and no-progress enforcement to other task types as each is admitted; preserve truthful unknown provider usage and require a changed plan before renewed budget. | RF-HOST-010–012, RF-CTX-006/019 |
| Next-application baseline | Reconcile its own intent, code and evidence; configure roles, procedures, context and the next accepted outcome in Roost. Prove owner-visible blockers and authority. | RF-APP-003/009–014; private baseline |
| Company strategic direction | Adopt a private, versioned company purpose; prove relevant decisions and agent tasks compare outcomes to it, then derive measurable targets from a real baseline. | RF-OUT-008; OPEN-STRATEGY-001 |
| Context classification and Worker packet | Classify operational versus historical sources; prove only current, approved, scoped material enters a sealed task packet. | RF-CTX-027; RF-GOV-020 |
| Context API/MCP and audit | With the same fixtures, prove ordinary agent reads exclude old/test material while explicit authorized audit retrieves it with provenance. | RF-CTX-027; RF-SEC-007 |
| Owner access | Reproduce repeat-login behavior; prove sustained ordinary work, exact-action reauthentication and separate agent identity. | RF-SEC-013; OPEN-AUTH-001 |
| Owner-console usability | Inventory every current route/configuration; improve complete journeys in bounded gates with independent review and full-console regression. | RF-UX-010, RF-REL-012 |
| Agent-initiated task planning | A managed agent proposes one real, deduplicated task with outcome, owner, dependencies and risk. Prove owner review and no execution before Ready. | RF-PROD-013, RF-HOST-009, RF-GOV-001 |
| Managed local model execution | Prove one real bounded Roost task through Worker -> managed Hermes -> exact admitted Ollama model, with visible choice, resource limits, evidence, review, recovery and refusal without fallback. Manual smoke is insufficient. | RF-HOST-016–018/022 |
| Task model policy and savings proof | Propose model per task by competence, risk and resources, with owner override. Compare accepted quality, time, rework and total cost against Codex before claiming savings. | RF-HOST-012/017/018/022; OPEN-MODEL-001 |
| Sustained application delivery | In successive authorized gates, managed agents propose and deliver application outcomes; separately owned Codex work fixes reusable Roost gaps. Keep distinct checkouts, one-writer/resource limits, review, release and owner-visible evidence. | RF-PROD-011/013, RF-APP-001–014 |
| Later application outcomes | Agents operating through Roost may reach owner-accepted readiness for each configured application in its own project and task scope. That readiness is not an acceptance gate for building Roost itself. | RF-APP-004/008–014, RF-ACT-010 |
| Reference-site study | Inspect only authorized, version-identified sites and preserve sourced findings, uncertainties and applicability. | RF-CTX-028 |
| Website checklist governance | Independently verify findings and approve a versioned checklist/procedure with acceptance criteria and rollback. | RF-CTX-028 |
| Website method proof | Prove real supervised use of the approved checklist in a scoped application task. | RF-CTX-028 |
| Public entry | Redesign and verify Roost's public page for the approved audience and truthful claims. | RF-UX-011; OPEN-UX-001 |
| Environment stewardship | Before scaling, prove read-only host/VPS inventory and one supervised exact-target update; later mandates require separate acceptance. | RF-HOST-021, RF-RES-001–008; OPEN-HOST-001 |
| Product sales | Prove offer, payments/access, invoices/accounting, support and controlled launch for a ready product. | RF-APP-015, RF-BIZ, RF-SUP; OPEN-FIN-001 |
| Customer-service capability | After sale readiness, configure website/service scoping, delivery, access, acceptance and settlement. | RF-SVC, RF-SCOPE-004/006; OPEN-SVC-001–004 |
| Customer acquisition | After proving delivery capacity and commercial rules, operate prospect qualification, offers and paid delivery. | RF-SVC, RF-SUP, RF-BIZ |
| Mobile application | After reliable web operation, use the same backend and authority; define platform and initial workflows before execution. | RF-SCOPE-001 |

New company needs extend the owning product chapter with status and dependencies.
Report progress against the authorized gate, not a percentage of the evolving
company vision.
