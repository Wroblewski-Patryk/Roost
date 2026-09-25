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

One implementation owner carries this objective through all gates below. The
owner may plan substeps, modify several components and create multiple
reviewable commits, but does not hand the work back merely because an adapter,
migration, test fixture or technical contract is complete.

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

The latest completed bootstrap work is:

- `bbb758ce` — source-only v3 issuance contract;
- `091a6f8e` — exact v3 source projection lineage;
- `5d3de878` — source-only migration 87 SQL backend and catalog guards.

For `5d3de878`, 254 selected source/mocked tests, server build, lint and catalog
pin checks passed. Migration 87 is still unapplied and native-unqualified. Its
Prisma transaction/authority/projection/issuance integration is absent.

These commits are foundations, not a working agent runtime. At this starting
point:

| Capability | Current truth |
| --- | --- |
| Accepted task starts a real managed agent | Not working |
| Roost and the Windows Worker exchange a production-authorized task | Partial foundations only |
| Worker starts managed Hermes | Not working |
| Hermes routes explicitly to approved Codex or local Ollama | Source/manual evidence only; not a managed Roost run |
| Result and evidence return to Roost | Partial data/API foundations; no complete real run |
| Independent review and release execute | Partial contracts; no complete orchestration |
| Commit, push, deployment, health proof and rollback execute as one flow | Not working |
| Pilot application is repaired through that flow | Not started |

All public readiness, execution, pilot and live-admission flags remain false.
Production and the configured pilot application have not been changed by the
latest bootstrap commits.

## End-to-end delivery gates

These gates are outcomes, not separate implementation owners. Continue from one
gate to the next without requesting permission for ordinary reversible
technical work.

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

An accepted exact commit follows the configured Git and deployment path,
production health is observed against a recorded baseline, and the release is
either certified or rolled back. The path proves audit, secrets boundaries,
backup/restore prerequisites, compatibility, monitoring and cleanup without
creating extra clones, services or abandoned branches.

### Gate 4 — pilot application proof

One real low-risk defect in the configured pilot application is discovered,
planned, implemented, independently tested, committed, released and verified in
production through Gates 1–3. Application-specific safety rules and any owner
consent explicitly required by `product/requirements.md` remain binding.

### Gate 5 — reusable company operation

The same mechanism can onboard another configured application without changing
the core runtime. Remaining accepted requirements are reconciled against real
operation: organization and competencies, procedures and goals, attention and
Decision UX, localization/time, recovery, resources, security, monitoring,
release and continuous improvement. A requirement is complete only with the
runtime evidence defined in the traceability matrix.

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
