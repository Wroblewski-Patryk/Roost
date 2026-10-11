# G17 procedure improvement from a task result

## Bounded outcome

For one existing application task and existing Procedure, the owner publishes
an exact contract whose steps state executor class, success condition, bounded
retry and escalation. Ready, the Worker packet and the completed result refer
to that immutable version. An authorized executor may propose a sourced change
to one pinned step. A different qualified reviewer diagnoses the result and
applicability. Approval creates a draft next Procedure version, with result,
decision and rollback reference. It does not publish or activate the draft or
change the completed/active task pin. No general step runner or second catalog.

## Starting inventory and integration boundary

`Procedure`/`ProcedureStep` and the Procedures workbench already manage drafts,
active versions and history. `procedure_contract_versions` publishes immutable
base and extension contracts. `task_composition` compiles a sealed step list;
Ready and the Worker packet carry it. Existing contracts specify step role,
tools and evidence, but do not structurally specify executor class, success,
retry and escalation. Existing result material and task review prove a result
and its independent verifier; they do not authorize a procedure change.
Execution metadata stores the composition seal, but no durable full version
and step snapshot for a later improvement proposal. The existing source
`ProcedureStep` has an ID while a contract step has a key; there is no checked
mapping between them.

The bounded extension preserves legacy contract validity and pin behavior.
Newly published G17 contracts carry typed step controls and an exact
source-step reference; publication checks the complete step mapping and source
instruction against the same Procedure version. New executions retain the full
composition snapshot alongside the seal. Legacy executions without that
snapshot cannot create a G17 improvement proposal. The proposal and separate
decision are task/result/version/step-bound, idempotent and append-only.
Approval rechecks the source contract after taking the Ready source fence,
then copies the active source into a new draft in its existing family, changing
only the named step and recording source, applicability and rollback. The
database verifies the remaining Procedure fields, steps and organizational
context, including workspace identity, before recording acceptance.

An accepted draft's content, steps and organizational context are immutable;
later generic PATCH requests are refused. A separate activation action for a
G17 draft requires the workspace owner and does not happen during approval.
The executor's new proposal operation obeys the task/credential capability
suspension. Withdrawal or source changes fail closed on new proposals and
acceptance, including direct SQL writes.

## Proof and release boundary

Use one disposable populated PostgreSQL database for publication, Ready, native
Worker packet, completed result, proposal, independent decision and draft
read-back. Refuse foreign task/step/version, stale result or pin, self-review,
replay with changed input, implicit activation and authority expansion. Verify
PL/EN owner navigation and decision, existing pins, component checks,
`npm run codex:check`, and independent Security review. Standard release follows
recovery/disk preflight; production smoke reads exact build, migration and
unchanged existing business rows only. A packet proves delivery of instructions,
not semantic execution of every step by a model. G18 remains outside this gate.

## G17 verification and release

On 2026-10-11, the additive migration and bounded API/console integration
published exact controlled Procedure steps, pinned the complete composition in
Ready and a queued Worker packet, accepted one result-bound executor proposal,
and created an independently accepted next draft without changing the active
task pin. Accepted draft content, steps and organizational context are
immutable. Source withdrawal, unrelated task/step, changed scope or permissions,
self-review and active capability suspension were denied.

A disposable PostgreSQL database applied all 142 migrations. The focused G17
and adjacent composition API journeys passed 9/9, including native Worker
claim/context read and direct-SQL forgery attempts. Procedure contract checks
passed 14/14; PL/EN owner UI checks passed 3/3. `npm run validate`,
`npm run codex:check` and `git diff --check` passed before release. Independent
Security review identified five defects, all repaired; its final review found
no remaining concrete gap.

Implementation commit `cbc20bf5` was pushed to `origin/main`; Coolify
deployment 6382 completed. Both public health endpoints returned that exact
build and the G17 migration completed without rollback. Read-only production
counts remained 5,223 CompanyRecords, 279 Tasks and 32 Procedures, with zero
G17 proposals or decisions. The logged-in owner view displayed the controlled
step fields after page refresh; an unauthenticated G17 read returned 401.

No production business-data write or paid model call was made. The native packet
proves delivery of pinned instructions, not semantic model execution of every
step. A positive production proposal/decision was not tested. The last
documented encrypted backup and isolated restore remain dated 2026-10-10.
