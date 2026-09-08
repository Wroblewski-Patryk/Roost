# Versioned procedure composition (RF-CTX-012)

`roost-procedure-composition-v1` composes an exact native task operation from a
published base contract, published application extension and the existing
[risk admission policy](native-risk-admission.md). It is a deterministic contract
compiler and admission boundary, not an automatic procedure runner or workflow engine.
Production remains disabled/observe.

## Existing identity and immutable publication

`Procedure`, `ProcedureStep` and the existing Procedures workbench remain the
canonical procedure registry. The source definition already has a version and
family. Its human-readable steps, expected result and tools are useful context,
but did not provide an immutable, typed task-operation contract or an exact
application extension. `procedure_contract_versions` adds that contract history
to the same Procedure ID; it is not an alternative procedure catalogue.

Each publication records its Procedure ID, monotonically increasing contract
version, digest of the complete procedure and ordered source steps, typed body,
current owner issuer, server time, rationale and idempotency receipt. Publication
requires an active procedure and a current workspace owner. The owner explicitly
reviews the draft in Procedures before publishing. New publications never edit
the source definition or older contract rows. `procedure_contract_withdrawals`
records a separate immutable owner withdrawal with rationale.

Source edits, including edits followed by reverts, create permanent per-version
source invalidations. Updating or deleting a contract, withdrawal, invalidation,
selection or exception is denied by SQL. Restrictive foreign keys retain history.
Publishing again after an approved source change creates a new valid contract;
it never resurrects an invalidated version.

## Typed contract and deterministic selection

A base names a native task type (`code_change`, `maintenance`, `migration`,
`review`) and operation (`runtime_execute`, `review_decision`,
`return_to_executor`, `create_specialist_task`). It requires explicit inputs,
outputs, evidence, completion conditions, all five existing task roles, a tool
ceiling and ordered steps. Each step has a stable key, instruction, role, tools,
inputs, outputs, evidence and preceding-step dependencies.

An extension names the exact application and architecture component, base
Procedure ID, task type and operation. It can append steps and requirements and
narrow the tool ceiling. It cannot remove base roles or requirements, replace
base steps, expand tools or specify risk requirements. Unknown override, nesting
or gate fields are rejected. Roles, capabilities, suspensions, credential scope
and output-budget enforcement remain independent mandatory gates.

A task selection is versioned separately for each native operation and bound to
the current admission scope. It selects existing base and extension Procedure
IDs, including an explicit missing choice. The server selects the latest
published contract for the exact type/operation; extension selection additionally
matches application/component. A newer withdrawn or invalid version blocks
instead of falling back to an older passing version. A selected procedure with
only incompatible publications is a binding conflict, not an exception-eligible
absence. No semantic inference from titles or prose selects a procedure.

The SQL algorithm orders base → extension → server-derived risk gates. It
retains the source layer and contract version ID on every requirement and step,
and both sources plus the prepared task reference for the tool intersection.
Repeated requirements remain visible with their separate origins. Duplicate step
keys are conflicts; replacement is not inferred. Dependencies must refer to an
earlier composed step. This establishes an acyclic order without arbitrary
recursive procedure references. Bounds are two procedure layers, 50 combined
steps, 30 values per requirement list and 60 KB per published contract.

The result includes algorithm identity, selection/scope/risk identities,
application/component/type/operation, exact contract IDs and versions, source
digests, ordered steps, fields, risk gates, exceptions, blockers and its SHA-256
seal. There is no client-supplied final seal, authority or computed risk policy.
The host's resolved Ready hash additionally covers the complete composition body.

## Submission, pin and invalidation

Prepare risk and the exact admission scope, select composition, reassess risk
against those exact version references, then attest risk evidence. Admission evidence binds the selected versions and their validity, so
changing the composition requires renewed evidence. The dependency digest uses
bounded exact references; admission separately recomputes the complete contract.
It does not recursively depend on the resulting admission seal.

Submit validates the ordinary packet and roles, current risk, complete composition
and operation evidence. Missing elements and conflicts persist nonexecuting
diagnostics. Accepted Ready retains the complete immutable composition and the
operation compositions used by its evidence. Queue copies its seal into execution
metadata; claim, checkpoints, context reads, recovery and synchronous pre-spawn
checks retain the same pin. The host requires `procedure_composition_v1`, rejects
missing/mismatched composition and applies the five-second expiry stop margin.
Packet tool access must remain within the composed ceiling; composition never
expands the worker's existing role or capability permissions.

New publication changes the fresh preview and next Submit's precondition, while
accepted/active work keeps its exact references. A new Submit resolves current
versions; if an existing Ready pin used older versions, it first becomes
nonexecuting and requires review/renewal of evidence before a new acceptance.
There is no silent upgrade or automatic submission. A withdrawal or source edit
invalidates Ready immediately and reuses the existing durable active-stop fence.
Expiry/current issuer membership are checked again at admission, including after
API/host restart. Safe cancel/fail and unchanged terminal history remain available.

## Narrow exceptions

An exception is one immutable, versioned approval for exactly `base` or
`extension` absence on the exact task, selected scope, operation, application,
component and risk/composition anchor. It requires a current owner independent
of task/scope authors, executor and selection author, with explicit rationale.
All risk levels use this conservative owner requirement. It expires 15 minutes
after server issuance; a new approval is a new version, never a renewal by replay.

An exception cannot cover selection/risk absence, conflicts, roles, critical
owner approval, backup/restore, suspension or additional tools. A missing base
does not synthesize instructions: the existing prepared task tool allowlist is
the ceiling, further narrowed by an extension, and the full packet and five-role
validator still apply. The exception and issuer/expiry remain visible in the
packet, task UI and event history. Reselecting creates a new anchor and invalidates
the exception. Expiry or issuer/source changes invalidate admission; they never
create an automatic replacement, approval, backup or restore operation.

## API and existing console

- Procedures: GET `/v1/process-core/procedures/:id/contracts`; POST `/publish`
  and `/withdraw` below that path. Humans read; only current owners publish or
  withdraw. The existing Procedures row opens the PL/EN contract editor/history.
- Task readiness: GET `/v1/agent-runtime/tasks/:id/procedure-composition`; POST
  `/selection` and `/exception`. Current members select, viewers read, independent
  owners approve exact exceptions. Integration and agent keys gain no write role.
- Every mutation uses request UUID, exact actor/input digest and reviewed
  expectedVersion under the existing serializable source fence. Replays preserve
  identity and expiry; stale versions, competing writes and changed request reuse
  conflict. Workspace lookups return 404 for foreign identities.

The task view shows fresh versus pinned versions, origins, blockers, steps, tools,
risk requirements, exceptions and final seal. Forms retain drafts on errors,
support explicit refresh and guard unsaved exit. No generated company procedures
or authority are used to fill an empty installation.

## Migration, verification and limits

`20260908120000_procedure_composition` adds empty history tables and admission/source
guards, without modifying applied migrations or historical business data. Deploy
migration/API/web before the host protocol update, preserve the existing database
volume and private verified recovery backup, and keep execution disabled. Prefer
a forward fix; restoring an older binary does not remove the database guards and
is not an authority-preserving rollback plan.

Contract, API/DB, host/recovery, migration-preservation and PL/EN responsive browser
tests cover the bounded compiler and enforcement. Synthetic fixtures make no real
model/provider calls. This does not prove semantic correctness of authored prose,
independent qualifications, actual procedure execution, OS/Git/provider brokerage,
workflow routing or company-wide autonomous readiness. RF-CTX-012 remains partial
for the wider target while this native composition boundary is implemented.
