# Autonomous Application And Business Lifecycle Projection

Status: active company-knowledge contract
Version: 1.0
Effective date: 2026-07-26

## Purpose

Roost is the owner-facing company knowledge and management plane for the
application lifecycle. It presents how an offering moves from direction and a
validated problem through product delivery, release, operation, measured
business outcomes, and improvement.

This document defines the Roost projection. It does not replace the Paperclip
execution record or product-repository truth:

- Paperclip owns live agent assignments, issues, runs, approvals, budgets,
  blockers, recovery, and completion evidence.
- Roost owns the durable company-facing offering, procedure, decision,
  dependency, KPI, and operating-state projection.
- Each product repository owns its versioned product intent, architecture,
  source, tests, release contract, runbooks, and actual implementation.
- Coolify, VPS, and providers supply observed runtime facts, not product or
  commercial intent.

Conflicts are shown and reconciled at the accountable source. Roost must never
silently apply last-write-wins to semantic conflicts.

## Lifecycle

```text
direction
  -> opportunity validation
  -> product discovery
  -> business and risk framing
  -> product/UX acceptance
  -> architecture and delivery design
  -> implementation
  -> verification and independent review
  -> release readiness
  -> source-control and deployment
  -> production acceptance
  -> operation and support
  -> outcome measurement
  -> retrospective and improvement
  -> expand, maintain, reframe, pause, retire, or return to discovery
```

Deployment is neither product acceptance nor commercial readiness. The owner
surface must keep personal-use, guided-pilot, self-serve, and commercial use
boundaries separate and versioned.

## Procedure Projection Record

Roost should represent the lifecycle as a stable procedure record with:

- stable ID `PROC-SH-APPLICATION-LIFECYCLE` and semantic version;
- lifecycle status: draft, active, review, superseded, or archived;
- accountable owner and participating departments/roles;
- trigger, entry criteria, inputs, stages, decisions, outputs, exit criteria;
- offering, initiative, release, environment, repository, and external-system
  relations;
- applicable policy gates and approval authority;
- source and deployed SHA, version-alignment state, and observed/verified time;
- gate results: `verified`, justified `not_applicable`, `blocked`, `stale`, or
  `failed`;
- evidence links and source authority for every material claim;
- risks, assumptions, known limitations, rollback/forward-fix path;
- product, reliability, support, cost, adoption, and business outcome KPIs;
- incident, retrospective, learning, supersession, and next-review links.

Only `verified` and justified `not_applicable` are green. A projected stage may
summarize several Paperclip issues, but it cannot turn their intermediate state
into an accepted business outcome without the accountable acceptance mapping.

## Owner-Facing Stage Model

| Stage | Owner question | Required projection |
| --- | --- | --- |
| Direction | Why should this exist now? | strategic fit, owner, active/parked state, opportunity cost |
| Validation | Is the user problem and intended outcome credible? | target user, job, evidence, assumptions, falsification result |
| Business framing | What value, cost, risk, and promise are accepted? | value proposition, use/pricing boundary, constraints, success metrics |
| Product and UX | Can the intended user complete the right journey? | scoped journeys, acceptance, states, accessibility, limitations |
| Architecture and risk | Can it be built and operated safely? | systems, data, tenancy, integrations, threats, migration, recovery |
| Delivery | Is one accountable end-to-end slice runnable? | plan, dependencies, owners, WIP, tests, environments, gates |
| Build and verify | Was the slice implemented and independently proven? | source changes, tests, browser QA, review, security, docs |
| Release | Is a known immutable candidate safe to ship? | source SHA, gate decision, capacity, migration, rollback, smoke plan |
| Production acceptance | Does the declared journey work on the deployed SHA? | deployment/readiness/browser/log/restart/data evidence |
| Operation | Who owns health, support, incidents, backup, and cost? | SLO/SLI, alerts, support path, capacity, recovery and incident state |
| Outcome | Did the release create the intended user/business result? | adoption, task success, reliability, support, cost, feedback, risk |
| Learning | What changes before the next cycle? | retrospective, causal finding, prevention, eval/regression, next decision |

## Integration Rules

1. Roost consumes versioned, least-privilege projections from Paperclip and
   product repositories; it does not read their databases directly.
2. Every imported fact retains source identity, version/SHA, observation time,
   freshness, confidence, owner, and supersession state.
3. Mechanical facts may refresh automatically when their source is verified.
   Product readiness, commercial transition, policy, authority, and semantic
   decisions require accountable promotion.
4. A Roost work item may aggregate several Paperclip issues. Internal
   implementation, test, security, recovery, and run artifacts are linked, not
   blindly copied into business task state.
5. Provider synchronization uses stable IDs, revision checks, idempotency,
   loop prevention, conflict queues, tombstones, audit, and bounded repair.
6. The current read-only Paperclip-to-Roost integration phase does not
   authorize publishing or mutating hosted procedure records. Write support
   requires a separately approved capability, permission, audit, denial,
   rollback, and monitoring contract.

## Production Publication Gate

The procedure may be called `live in Roost` only when an authenticated owner
surface or procedure API returns version `1.0`, links the active offering and
release projections, preserves source/evidence metadata, and passes:

- authorized read and cross-workspace denial;
- stale/conflict rendering;
- inaccessible-source degradation;
- mobile and desktop owner-flow review;
- audit visibility;
- no-secret/no-private-data evidence.

Until then, this repository document is `source_only`; local Paperclip agent
instructions remain the active execution awareness mechanism.

## Related Sources

- `docs/maps/product-map.md`
- `docs/maps/release-ops-map.md`
- `docs/pipelines/pipeline-registry.md`
- `docs/governance/world-class-product-engineering-standard.md`
- `docs/governance/autonomous-engineering-loop.md`
- `docs/security/secure-development-lifecycle.md`
- `docs/releases/release-train.md`
- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/operations/post-deploy-smoke.md`
- `docs/operations/rollback-and-recovery.md`
