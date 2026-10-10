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
existing proof rather than repeating it for every task. Codex develops Roost
and its Worker; the connected agent works from authorized Roost tasks and
context, never on Roost's source. Configured applications may later exercise
the mechanism, but their readiness does not define Roost's product completion.
Installation paths, domains and credentials stay private.

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

**Gate 1 met (2026-09-27):** production Roost → Worker → Hermes → selected
Codex Responses → Roost completed one signed low-risk task. Provider usage and
forced production cancellation remain unproved. Exact build, execution and
credential evidence is in the [matrix](architecture/traceability-matrix.md).

**Gate 2 met (2026-09-27):** native one-writer coding, checkpoint/resume and
independent rejection/acceptance produced local `774e858a`, without push or
deploy. General scheduling, arbitrary filesystem effects and all recovery
cases remain unproved; see the [matrix](architecture/traceability-matrix.md).

## End-to-end delivery gates

These gates are outcome-sized delivery boundaries, not internal technical
atoms. Complete the currently authorized gate without requesting permission for
ordinary reversible technical work inside it.

## Gate authorization boundary

One user task authorizes one named gate, or the earliest unmet gate if unnamed.
The owner may decompose and repair inside it, but must not start the next gate
without a new user instruction. At completion update this handoff, run checks,
leave recoverable state, report evidence and stop. Remaining account usage is
not continuation authority. Push/deploy need the gate's explicit authority.

### Gate 1 — real agent round trip

An accepted low-risk Roost task is claimed by the intended Windows Worker.
Managed Hermes starts with an explicit approved backend, model and reasoning
effort. The execution reports heartbeats, terminal result, usage when available
and bounded evidence back to Roost. Cancellation and lease loss stop safely.

Internal migrations, signing, credentials and HTTPS wiring were dependencies,
not separate delivery results.

### Gate 2 — governed coding delivery

The agent receives the pinned task/application/procedure context, works only in
the configured canonical checkout, respects the one-writer and one-instance
rules, checkpoints progress, resumes safely after interruption, runs the
required tests and produces a reviewable commit. An independent competent role
accepts or returns the work with reproducible evidence.

Role, Decision and resource controls applied to this bounded pilot; broad
workforce scheduling and learning remain later outcomes.

### Gate 3 — governed release

**Met at native/production evidence level (2026-10-02):** Exact Git/PR/merge,
interrupted deployment, controlled failure, healthy rollback and owned cleanup
passed. [Evidence](operations/governed-release.md).

An accepted exact commit follows Git, deployment, baseline health, observation
and certification or rollback. Audit, secrets, backup/restore, compatibility
and owned cleanup are required; no extra clones or services.

### Gate 4 — pilot application proof

**Production verified:** managed repair `7512bc3`, 1238s healthy observation,
unchanged protected services and independent postrelease verification. Failed
rollback remains unqualified. See [evidence](operations/application-release.md).

One real low-risk defect in the configured pilot application is discovered,
planned, implemented, independently tested, committed, released and verified in
production through Gates 1–3. Application-specific safety rules and any owner
consent explicitly required by `product/requirements.md` remain binding.

### Gate 5 — reusable company operation

**Met at native/deployed-console evidence level (2026-10-04):** a second
configured application reused roles/procedures and an independently accepted
local `3cf9645e`; Roost showed portfolio and Decision evidence. No application
push/deploy or whole-product readiness was proved. See [evidence and limits](operations/internal-application-operation.md).
This proved reuse of internal application operation, not the later company,
commercial or mobile capabilities. Requirement completion still needs the
runtime evidence in the traceability matrix.

### Second-application release — paused by owner

**STOP on 2026-10-10; no gate is active.** Gate 5 local `3cf9645e` and accepted
candidate `d73e6234` remain, but release `bdc1387e` failed at deployment
configuration. No deployment, observation or postrelease acceptance was proved.
Worker and locks were stopped. Exact identities and limits remain in the
[matrix](architecture/traceability-matrix.md) and [Compose record](operations/governed-compose-release.md).
Resumption needs a new owner-approved brief based on the actual stopped state,
installed adapter, permitted effects, reused proof, rollback and bounded budget.
This paused release grants no push, deployment or continuation authority.

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

## Proposed sequence to complete Roost

Only the owner-to-local-agent loop above has an execution brief. G7 onward are
ordered **candidate gates**, not authorization or estimates. Codex implements
Roost and its Worker; the connected agent executes company tasks through Roost,
never Roost source development. Application repair/readiness is a separate
agent workload, not a Codex Roost gate. The paused second-application release
stays paused until the owner separately disposes of it.

Before each gate, inspect the actual path and matrix evidence; brief one user
outcome, proof to reuse, affected surfaces/effects, native positive/negative
checks, owner decision, time/attempt/token/cost limits (unenforced = unknown)
and stop. One materially changed retry, then diagnose and replan; new providers
or larger scope need new approval. Run focused checks and final
`npm run codex:check`; reuse unaffected proof. Include relevant UI, config,
permissions and agent access. Push, deploy, backup and external writes only
when the gate actually has those effects.

| Candidate | One Roost outcome and minimum observable proof | Entry and governing requirements |
| --- | --- | --- |
| G7 Attention UX | Owner completes task/result/Decision journey in the console with truthful states, PL/EN, narrow and responsive views; inventory routes first. | G6; RF-UX-001/002/007/010, RF-REL-012 |
| G8 Trusted packet | One Worker task sees only current, approved, scoped records; old/test records stay auditable but absent by default. | G6; RF-CTX-001/003/005/027 |
| G9 Context API/MCP | The same exclusion holds for ordinary agent search; authorized audit returns history with provenance. | G8; RF-CTX-027, RF-GOV-020, RF-SEC-007 |
| G10 Owner/agent identity | Ordinary owner session lasts for real work; sensitive action reauth preserves context; agent cannot use owner identity. | G6; RF-SEC-003/009/013, OPEN-AUTH-001 |
| G11 Task authority | One task passes Ready validation, scoped mandate, accountable role, Decision/review and auditable return without bypass. | G8–G10; RF-CTX-008–018, RF-GOV-001/014 |
| G12 Progress and budget | Across admitted task types, real no-progress/limit stops are visible; renewed attempt needs changed plan and fresh budget. | G11; RF-HOST-010–012, RF-CTX-006/019 |
| G13 Agent proposal | Agent proposes a sourced, deduplicated company task; owner reviews; no execution before Ready. | G11; RF-PROD-013, RF-CTX-021/022 |
| G14 Scheduling | Ready tasks respect dependency, priority, host capacity and one writer; stop/resume preserves work. | G12–G13; RF-HOST-002/003/009, RF-GOV-013 |
| G15 Delegated work | One bounded specialist handoff returns evidence to its accountable parent without expanding authority or budget. | G14; RF-GOV-010/013, RF-CTX-013–015 |
| G16a People | Owner invites one person with scoped access; a human and a distinct agent can work on the same company task. | G11; RF-PROD-005/010, RF-SEC-009 |
| G16b Composition | Owner configures one department/capability; an approved migration preserves records and consistent views. | G16a; RF-PROD-002–009, RF-ORG-001–005, OPEN-ORG-001 |
| G17 Procedures | Owner versions one human/agent procedure; an active task uses its pinned version and returns a reviewed improvement proposal. | G11; RF-CTX-012/020/026 |
| G18a ClickUp | One governed task sync reconciles provider, Roost record and actor without duplicate authority. | G11; RF-INT-001–005, RF-PROD-003 |
| G18b Drive | One governed file/Doc/Sheet journey preserves provider authority, Roost context and provenance. | G18a; RF-INT-001–005, RF-PROD-003 |
| G19 Company direction | Owner adopts/revises private purpose; one aligned and one conflicting task/decision show evidence or exception. | G11; RF-OUT-003/008 |
| G20 Goals and economics | Owner sees attributable goals, progress, task effort/cost and unknown usage, with source drill-down; agents act within mandate. | G19; RF-OUT-001–007, RF-HOST-012/018, OPEN-STRATEGY-001 |
| G21 Application control | Owner sees one configured application's own baseline, blockers, roles and agent task in Roost; no cross-app assumptions or Codex repair. | G11/G17; RF-APP-001/003/009/013/014, RF-ACT-010; reuse Gate 4/5 proof |
| G22 Local model | One managed Hermes task runs on an explicitly admitted local model; missing model/resources refuse safely, with no silent fallback. | G12; RF-HOST-016–018/022 |
| G23 Model policy | Owner can accept/override a per-task model proposal; comparable accepted outcomes prove or reject savings. | G22; RF-HOST-012/017/022, OPEN-MODEL-001 |
| G24a Site study | Authorized versioned sites yield sourced findings, unknowns and applicability. | G17; RF-CTX-028 |
| G24b Website checklist | Independent review promotes findings into one versioned checklist with acceptance and rollback. | G24a; RF-CTX-028 |
| G24c Method proof | One supervised task uses the approved checklist and returns verifiable evidence. | G24b; RF-CTX-028 |
| G25 Public entry | Roost's pre-login page serves an approved audience with truthful claims and verified navigation/accessibility. | G24c; RF-UX-011, OPEN-UX-001 |
| G26 Product customers | One offering and canonical customer relationship have correct product/app authority and owner view. | G21; RF-BIZ-001–003/009, RF-APP-015 |
| G27 Payment test | One sandbox purchase reconciles payment, app access response, invoice, accounting and Roost exceptions. | G26; RF-BIZ-004–007, OPEN-FIN-001 |
| G28 Live sale | Separately authorized live transaction reconciles the same chain; owner sees revenue and failed-sync attention. | G27; RF-BIZ-005/006/008, RF-SEC-002 |
| G29 Support | One incident and one customer case route to accountable agents with severity, evidence and owner escalation. | G28; RF-SUP-001–004, OPEN-SVC-003 for public commitments |
| G30 Prospecting | Agent proposes a sourced qualified lead consistent with company direction; owner can reject weak evidence without contact. | G19/G26; RF-SVC-001–003, OPEN-STRATEGY-001 |
| G31 Offer/interview | Agent conducts an authorized needs interview and prepares scoped offer; pricing and legal terms need owner-approved authority. | G30; RF-SVC-004–009, OPEN-SVC-001, OPEN-SVC-002 |
| G32a Service start | Accepted scope, paid milestone and isolated access are visible before delivery starts. | G31; RF-SVC-010–012, OPEN-SVC-004 |
| G32b Service acceptance | One delivered milestone has evidence, client acceptance and settlement state in Roost. | G32a; RF-SVC-010–012 |
| G33 Continuing value | Renewal/maintenance work, support and closure show value, ownership and access removal over time. | G32b; RF-SVC-007–012, RF-SUP-001–004 |
| G34a Environment inventory | Agent reports host/VPS state and ranked maintenance findings without changing either host. | G14; RF-HOST-021, RF-RES-001–008 |
| G34b Supervised update | One exact update proves compatible drain, health and recovery; wider mandate needs separate decision. | G34a; RF-HOST-021, OPEN-HOST-001 |
| G35 Data lifecycle | Owner-approved export/retention/removal works across declared sources and preserves recovery/audit rules. | G28/G32; RF-INT-006, OPEN-DATA-001; deferred until activated |
| G36 Mobile | Defined native app uses the same Roost API/authority for one selected workflow and passes device UX/security checks. | Reliable web journeys; RF-SCOPE-001; deferred until activated |

At each milestone (G12, G21, G29, G33 and G36), independently review complete
owner/agent journeys and regress the console. G7 inventories **every** current
view; any view without a later functional gate gets its own bounded UX repair
before G21, and new views receive the same review when built. Reconcile every
applicable accepted requirement against the traceability matrix.
Security, resource, release and activation rules (RF-SEC/RES/REL/ACT) apply
only to each gate's actual effects. Deferred or rejected RF-SCOPE/DEF items
are not silently activated. Application readiness clauses in RF-APP and
RF-PILOT belong to authorized agent company work, not Codex Roost delivery.
Roost completion needs independent proof of the integrated company journeys
and evidence or an explicit later decision for every applicable requirement;
an unmapped or unverified requirement stays open. Report gate evidence and
remaining gaps, never a percentage of the evolving vision.
