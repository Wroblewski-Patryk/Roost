# Agent Delivery Foundations And Activation Contract

Status: accepted target; not an assertion of implemented autonomy.

Source: owner decisions in `Roost - Wywiad`, task
`01a06d26-73a0-79e1-a035-6b4e42380274`, accepted handoff
`roost-interview-foundation-2026-09-05-v1` (2026-09-05).

Scope correction: accepted handoff
`roost-interview-scope-correction-2026-09-05-v1` from the same source supersedes
any implication that the bootstrap implementation automation may modify Soar.

Current authority: accepted scope reset
`roost-interview-foundations-scope-reset-2026-09-05-v1`. It retains multi-application
delivery under owner supervision and defers native Roost self-development,
Constitution work and bootstrap retirement. Earlier self-improvement and
Constitution handoffs do not authorize current implementation work or block
these foundations. Both bootstrap automations remain active until a separate
future owner decision.

## Bootstrap Responsibility

`Roost - Wywiad` defines Roost; `Roost - implementacja` builds and configures
only Roost, its local Agent Host and Roost production infrastructure. It must
not create branches, edit, commit, push or deploy Soar or any other application.
Their requirements are use cases and acceptance criteria for Roost.

The later native flow is: owner Decisions in Roost, complete assigned Roost
task, Agent Host launch of the appropriate worker, work in the application's
canonical repository, and Roost supervision of tests, review, merge, deployment,
evidence, recovery and process improvement. The Soar pilot must use this flow.
The bootstrap automation may prepare and observe it in Roost, but cannot perform
the application change itself, even under a pilot contract.

A runtime handoff is not complete with documentation alone. Deliver the smallest
ready Roost change through implementation/configuration, tests, task branch,
commit, main integration, push, Coolify deployment and production smoke when
access, gates and rollback are available. Report a structured BLOCKER to the
interview task if a required stage is unavailable; do not label it Done.

## Authority And Current Boundary

Roost is LuckySparrow's company operating system. It owns company intent,
organization, goals, procedures, product definitions and application assumptions.
Each application's repository owns its current technical architecture, contracts,
startup and tests. Roost may reference that technical knowledge, but must retain
its provenance and version. Code contradicting an approved assumption is a
defect by default; changing the assumption requires a formal Decision.

This contract refines the target in
[Unified Organizational Operating System](unified-organizational-operating-system.md)
and [Process Core](process-core-workflow-core-architecture.md). It supersedes
older target descriptions where they imply that a CEO or assistant supervises
all directors, or that the owner must routinely approve every future release.
It does not change current API permissions or authorize a broad schema rewrite.

The [current local runtime](local-codex-agent-runtime.md) remains supervised:
`foundation_only` is the default; `ROOST_CODEX_EXECUTION_ENABLED=true` enables
the existing supervised queue and claim path, not autonomous release authority.
The host launches an ephemeral Codex session, reports evidence and leaves the
task open for owner review. It has no implemented merge/deploy/rollback workflow.
An execution marked `completed` is not proof of delivered task completion.

There is no implemented activation-level state machine described by the stages
below. A scoped implementation and its evidence must establish each gate before
the corresponding operations are enabled. Neither this document nor a task's
free text grants a worker new credentials or bypasses command authorization.

## Organization And Work

The existing twelve departments form the company skeleton; `00 General` is
the shared overview. Directors are peers. The Management Director/CEO
coordinates, rather than supervising other directors. Each worker has one
accountable department and one direct supervisor. Cross-department relevance
does not create another reporting line. Delegation follows the shortest valid
hierarchical path; specialists may clarify linked work directly, without
changing assignment, priority or accountability. Conflicts go to the area owner,
then coordination between directors, then an owner Decision if unresolved.

Humans and agents share the workforce model; actions retain actor type and
identity. An agent's profile, competencies, authority and performance history
persist independently of its selected model. Every Codex execution starts with
a fresh bounded session. Extend existing workforce, role, ownership and
department records; do not create parallel directories or permission stores.

The owner sets the company's direction. Agents may create complementary goals
only with a traceable parent supporting that direction. Initiative owners define
outcomes, directors define department streams, and managers decompose these into
small tasks and dependency graphs. A task has one accountable owner and a
verifiable result. Applications mature from Innovation into Products/Services
through evidence-based assessment by the relevant departments, retaining the
same Application identity.

A goal defines the result; a versioned procedure defines how to achieve it;
a pipeline executes that procedure; a task is an executable unit of work.
Use existing pipeline/stage/run and procedure/revision records. Hierarchical
procedures define owner, inputs, outputs, roles, exceptions and evidence gates.
Each run remains tied to its procedure version; revisions cannot silently
change active work.

## Execution Packet And Governance

The current [supervised packet gate](execution-packet-contract.md) validates an
explicit versioned contract against the current task, assignment and scoped
sources before process start, and reports safe field diagnostics. It is the
implemented admission foundation for the target below, not a complete semantic
compiler, hard budget meter or independent review/release workflow.

Before starting an agent, Roost must deterministically compile and validate:

- goal and parent, business purpose, scope and prohibited actions;
- accountable worker, role, competencies and relevant company/product context;
- applicable versioned procedures and skills;
- allowed tools, task authority and environment/resource manifest;
- dependencies, decisions and the versions of source context used;
- time, token and attempt budgets;
- acceptance criteria, required evidence, tests and independent review;
- handoff, recovery/rollback and escalation rules.

Missing mandatory context blocks launch and yields explicit missing-field or
dependency reasons. Empty fields and general prose cannot stand in for validated
authority. Existing context APIs are inputs to this compiler, not a second
source of truth. A material context change during execution requires a checkpoint
and revalidation; an immaterial change may permit documented continuation.

Risk determines required roles, review independence, tests and allowed actions.
The author cannot be the sole tester or final reviewer. Low confidence or a
budget threshold triggers independent analysis and a revised plan, not an
unbounded retry loop. Unresolved product ambiguity reaches the owner through a
Decision containing one question, context, options, recommendation, consequences,
blocked tasks and a deferral option. A clear defect against approved behavior
does not need another interview.

The responsible security function governs task-scoped, time-limited,
least-privilege access. Workers never receive raw secrets in prompts or logs
and cannot raise their own permissions. External operations require an explicit
capability policy and command contract; possessing a token is insufficient.
Existing workspace/key boundaries remain in force until a separately verified
task-scoped access contract replaces or extends them.

Missing competencies initiate HR analysis, a profile/skill definition from the
responsible department, evaluation and probation. Repeated poor results lead to
analysis, training, reassignment or deactivation with history retained. Evaluation
uses verified outcomes, regressions, rework, handoff quality, cost and timeliness,
adjusted for difficulty and risk, rather than self-reported task counts.

## Laptop, Recovery And Resource Invariants

Production Roost and private PostgreSQL remain on the VPS. The Windows worker
uses outbound HTTPS; local development has its own database. No database sync
or direct local access to production PostgreSQL is introduced.

Each application has exactly one canonical local clone under the approved
application root, no additional worktrees/copies, and at most one local runtime
using its declared Compose project and resource manifest. A task branch lives
inside that clone. One writing task may run across the entire laptop at a time;
read-only analysis can run concurrently. This applies across repositories and
host processes, not merely to iterations of one worker loop.

The manifest declares allowed paths, processes, ports, containers, volumes,
networks and databases. Temporary build/test resources must be declared, remain
within the application boundary and be attributable to the attempt. Do not
create alternative clones or persistent test stacks/databases. The resource
hygiene gate removes only known task-owned temporary resources; unknown prior
resources and unrelated file changes require provenance analysis before removal.
Reuse the canonical local runtime instead of launching duplicate instances.

The worker should start after Windows login with visible activity and pause/stop
controls. Checkpoints are recorded at stages, before external operations and
periodically; sleep/shutdown handlers alone cannot guarantee persistence after
power loss. On reconnection, reconcile execution ownership, local processes,
files and resource state before resuming. Resume is the default; restart requires
a reason and retained attempt history. An expired lease alone is not evidence
that the old process stopped. A worker with lost authority must stop writing;
another attempt must not overlap a still-running writer.

Incidents may preempt work through a safe checkpoint. Recovery and scheduling
must preserve one writer, prevent duplicate task execution and avoid creating
extra runtimes. Avoid arbitrary CPU/RAM caps; check resource exhaustion risk and
prevent redundant heavy operations. On the current small infrastructure retain
one last verified local recovery point; external encrypted backup is a future
infrastructure-dependent capability, not a claim of current redundancy.

No separate VPS staging stack is assumed. A lightweight shared Integration Test
Gateway for fixed-IP/callback integrations is an option to assess through its own
contract, not an approved deployment. Production testing is a last resort under
an explicit scoped test contract.

## Release, Evidence And Owner Control

The target code-delivery flow is implementation, independent QA, merge/push,
Coolify deployment of the exact commit, production verification and rollback
when required, without routine owner approval. A code task is Done only when
merge, deployment, absence of observed regressions and required evidence are
verified in Roost. A missing necessary test is part of the task. A rejected
change receives a formal outcome and preserves/transfers valuable work rather
than silently discarding it. Non-code tasks use their own verifiable results.

These are future governed release commands. Current workers retain the existing
release prohibition. Emergency owner stop/rollback must show its scope and
leave audit evidence. Critical incidents contain the affected function and start
recovery while unrelated company work continues. Recovery must be demonstrated,
not inferred from an agent's declaration.

Roost's shared event/notification center is the only current target notification
channel; critical events and Decisions remain visible until handled. Email and
Telegram are deferred. Applications provide normalized health signals; sensitive
data and raw logs stay at their source. Material agent decisions record goal,
supporting data and rules, alternatives, rationale, confidence and outcome.

## Activation Gates

These are ordered acceptance stages, not current API enum values. Every stage
inherits the preceding controls; expansion requires verified evidence and a
scoped command/permission contract. Failed controls prevent expansion.

| Stage | Permitted scope after verification | Required exit evidence |
| --- | --- | --- |
| 1. Contracts | Define organization, context, resources and authority without activating execution. | Current/target separation, bounded task contracts and an audit against existing models. |
| 2. Read-only agents | Scoped audits through existing read boundaries. | Correct task context, source provenance, access isolation, budgets and no unauthorized writes. |
| 3. Local changes | Task branches in the single canonical clone, without release operations. | Validated packet, one laptop-wide writer, lease-loss containment, recovery, resource hygiene and independent checks. Isolation uses scope/authority, not extra worktrees. |
| 4. Soar repair pilot | One reproducible, reversible, low-risk defect outside live trading, keys and data migrations. | Detection, plan/decomposition, implementation, independent tests, merge, exact-commit Coolify deployment and production proof; rollback capability verified. No owner assistance except a product Decision. |
| 5. Broader operations | Additional applications and departments under reviewed mandates and owner supervision. | Configuration-based onboarding, repeated delivery and incident/recovery evidence with correct delegation, independent review, permissions and shared records. Native Roost self-development remains deferred. |
| 6. Soar optimization | Configuration optimization through Soar under a separate mandate. | Validated backtest-to-paper-to-live gates, configuration/version/run identity and safe configuration rollback. |

Soar is the pilot and is changed only by a worker launched from a native Roost
task, never by the bootstrap implementation automation. Its future strategy, immutable configuration version
and run are distinct. Backtest/paper/live reference configuration versions;
configuration rollback selects a prior version. Open positions remain managed
by the version that opened them. The agent optimizes configuration; Soar executes
trading. No orders may be placed by the agent outside Soar.

## Multi-Application Operation

Soar is the first proof, not a specialization of the orchestration core.
Application identity, workspace boundaries, task/project links, context packets,
procedures, routing and activation gates apply uniformly across the portfolio.
Add applications through existing Application, ApplicationProject, repository,
capability/blueprint and host configuration contracts. Do not add a scheduler,
task store or agent directory per application.

Onboarding validates a unique application slug, one canonical clone/origin,
the declared deployment/runtime, complete versioned product and technical context,
task ownership, applicable procedures, access and evidence requirements. The host
validates distinct mappings and compares a claimed application's ID and primary
repository with the allowlist before using its directory. This identity check
does not prove a complete execution packet or autonomous readiness. Adding
another application must not require per-application host code.

Roost remains the bootstrap implementation repository. Its presence in the
application registry does not activate native autonomous self-development.
The owner supervises work, supplies ideas and makes required decisions; manual
programming and daily orchestration are not the intended operating model.

## Current Foundations And Deferred Scope

The current goal is reliable supervised delivery of Soar and subsequent
applications through Roost and local agents: lease safety and recovery, complete
execution packets and competent routing, one writer and one application runtime,
tests and independent review, evidence and releases with rollback, visible work
and owner Decisions, and configuration-based onboarding.

The accepted scope reset defers native autonomous self-development of Roost,
a protected Constitution and its enforcement/trust boundary without a deadline.
They are not prerequisites or blockers for the current foundations. Their earlier
accepted designs remain in Git history rather than as active implementation gates.

Both bootstrap automations remain active until a separate future owner decision.
No pilot, onboarding milestone or automated readiness score currently authorizes
their shutdown. Scheduler state and execution queues remain outside this repository.
