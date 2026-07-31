# LUC-2192 Lifecycle Procedure Publication Contract

## Task Type

Architecture / contract decision

## Current Stage

Verification

## Deliverable For This Stage

Verified canonical reuse decision, implementation-ready typed contract, and
generated architecture evidence for [LUC-2193](/LUC/issues/LUC-2193), without
runtime implementation or protected release action.

## Operation Mode

`ARCHITECT`

## Process Self-Audit

- analyze current state: inspect the lifecycle source, Product Map projection,
  Company OS procedure/versioning foundation, and the recovered audit;
- select one priority task: close only the publication-contract ambiguity;
- plan implementation: define the exact model, packet, read, state, security,
  audit, rollout, and recovery contracts;
- execute: update canonical architecture and project-memory sources;
- verify: run focused architecture/documentation checks and scoped diff review;
- self-review: confirm existing-system reuse, authority preservation, no
  duplicate engine, no arbitrary payload, and no temporary bypass;
- update documentation and knowledge: architecture, decision, requirement,
  risk, module-confidence, task, and mission sources.

## Goal

Select the stable Roost publication contract for
`PROC-SH-APPLICATION-LIFECYCLE` version `1.0` so an authenticated owner can
receive a typed Company OS definition plus a fail-closed Paperclip execution
projection without duplicating Paperclip execution state.

## Why This Matters

The current Product Map is a valid owner surface but accepts an arbitrary
packet and does not publish a stable procedure identity. Implementation cannot
start safely until definition ownership, packet versioning, state semantics,
disclosure boundaries, and rollout are exact.

## Scope

In scope:

- `docs/architecture/lifecycle-procedure-publication-contract.md`;
- Product Map and system-architecture pointers;
- Company OS `Procedure`/`ProcedureStep` and workflow-definition reuse;
- strict Product Map packet schema and composed owner read model;
- authority, authorization, isolation, disclosure, audit, state, migration,
  rollout, recovery, and implementation ownership decisions;
- project decision/requirement/risk/module/task/mission memory.

Out of scope:

- application code, Prisma schema, migrations, seed implementation, API/UI
  implementation, tests, browser proof, push, deploy, restart, credentials,
  database mutation, production smoke, and monitoring activation;
- any Paperclip repository edit or Paperclip write-back.

## Known State

- The existing Product Map transport, workspace persistence, ingress/read
  capabilities, LKG/quarantine behavior, and authenticated route are present.
- The ingress packet is currently accepted as `z.record(z.unknown())`.
- The backend emits public `conflict`; the frontend union instead includes
  `quarantined` and `out_of_order`.
- Company OS already has workspace-scoped `Procedure`, `ProcedureStep`,
  `Process`, `DecisionLog`, `Metric`, version-family lineage, draft activation,
  archive, and rollback-draft commands.
- The source lifecycle contains 18 canonical stages and declares
  `PROC-SH-APPLICATION-LIFECYCLE` version `1.0`.
- [LUC-2193](/LUC/issues/LUC-2193) is blocked by this decision.

## Assumptions

| ID | Classification | Assumption | Handling |
| --- | --- | --- | --- |
| A1 | safe | The authenticated Product Map remains the owner aggregation surface. | Reuse its existing route and UI; add no parallel surface. |
| A2 | safe | Company OS definitions own stable procedure identity while Paperclip owns live gate/evidence state. | Encode as an explicit read-assembler boundary. |
| A3 | safe | The current v1 packet is unsafe to treat as forward-compatible because it accepts arbitrary fields. | Make packet schema `2.0` a breaking, fail-closed protocol change. |
| A4 | risky but bounded | Existing integer `Procedure.version = 1` represents semantic procedure version `1.0`. | Permit only the exact v1.0 mapping; fail closed on future non-zero minor versions until a new decision extends the model. |
| A5 | safe | The existing idempotent Company OS seed path can create the initial per-workspace definition without a schema migration. | Require a seed/backfill implementation and deployment readback; forbid read-time bootstrap. |

No blocking product, data, security, or authority assumption remains for the
architecture stage.

## Selected Architecture

Select audit option 2:

- persist/reconcile the definition through existing Company OS
  `Procedure`/`ProcedureStep` version foundations;
- use a strict Product Map packet v2 only for read-only Paperclip execution
  state;
- compose both on `GET /v1/product-map/projection`;
- join workspace decisions and KPIs through the procedure's process relation;
- derive Paperclip links server-side from structured allowlisted identifiers;
- preserve Paperclip as the only execution/evidence authority.

Rejected:

- packet-only definition duplication;
- a dedicated lifecycle store/route/workflow engine.

## Implementation Plan

1. Add the exact v1.0 definition and 18 steps through the existing idempotent
   seed path.
2. Replace the packet schema with closed Product Map schema `2.0`; retain
   transport version v1.
3. Reject unknown/private keys and validate stored packets before reads.
4. Compose Procedure/steps, Paperclip execution state, process-linked
   decisions/KPIs, server-derived evidence links, and audit correlation.
5. Align backend/frontend states to `current`, `stale`, `conflict`,
   `source_only`, and `unavailable`.
6. Add exact authorization, isolation, disclosure, audit, state, seed,
   supersession, responsive, keyboard, and accessibility proof.
7. Hand one exact candidate to the existing protected release owner; do not
   deploy from the implementation child.

## Acceptance Criteria

- One reuse path is selected and rejected options are recorded.
- Stable ID/version, 18 stages, owner, provenance, freshness, evidence, gates,
  conflicts, supersession, offerings, releases, decisions, KPIs, audit, and
  safe Paperclip links have exact sources and types.
- Every ingress object is closed and bounded; arbitrary JSON is forbidden.
- Server and frontend state semantics are identical and fail closed.
- Unauthorized/cross-workspace reads disclose no target procedure facts.
- No direct Paperclip database read, provider write, callback, acknowledgement,
  parallel workflow engine, or hidden legacy promotion is authorized.
- Migration, rollout, rollback, and ownership decisions are explicit.
- Architecture and project-memory checks pass.

## Definition Of Done

- The canonical architecture contract and architecture indexes are updated.
- Decision, requirement, risk, module-confidence, mission, queue, and project
  state reflect the selection.
- Focused validation passes and the scoped diff has no workaround,
  duplication, unsafe authority expansion, or temporary behavior.
- [LUC-2193](/LUC/issues/LUC-2193) can implement without product or
  authority-boundary ambiguity.
- The Paperclip issue has typed completion evidence and the implementation
  child can unblock through its first-class dependency.

## Validation Plan

- `npm run architecture:refresh`
- `npm run architecture:status`
- `npm run architecture:gate-chains`
- focused content/link checks for the decision and exact contract
- `git diff --check`
- scoped `git diff` self-review

No runtime, API, browser, migration, or deploy validation is applicable to this
architecture-only stage.

## Result Report

- Task summary: selected Company OS Procedure/Step plus Product Map composition.
- Files changed: canonical architecture, map/index, task contract, and
  project-memory/state sources.
- Verification: architecture graph refreshed to `467` nodes / `775` relations /
  `36` chains; status `GREEN`; evidence queue `0`; chain worklist `0`; delta
  `0/0/0`; chain coverage `35/35` (`100%`); all gates pass.
- Runtime implementation: not performed; owned by
  [LUC-2193](/LUC/issues/LUC-2193).
- Migration decision: no Prisma migration; idempotent seed/backfill plus packet
  protocol v2 rollout is required.
- Deployment impact: none from this documentation stage; future producer/
  consumer rollout remains under [LUC-1910](/LUC/issues/LUC-1910).
- Residual risk: implementation and protected release proof remain incomplete.
- Learning: the architecture auto-scaffolder inferred a nonexistent generic
  Product Map route path while consistency gates remained green; the three
  registry rows were corrected, the gate suite was rerun, and the bounded
  post-refresh path-existence guardrail is recorded in the learning journal.
