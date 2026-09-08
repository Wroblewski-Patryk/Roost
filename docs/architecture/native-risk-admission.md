# Native risk admission (RF-SEC-002)

[Versioned procedure composition](versioned-procedure-composition.md) binds the base,
application extension and risk requirements to the same Ready/execution seal.

`roost-native-risk-admission-v1` adds evidence gates to the existing
[computed task risk](native-task-risk.md). It admits only the supported native
task execution, result review and manager correction commands. It does not run
procedures, reviewers, backups, restores, migrations or releases, and does not
grant tools, OS, Git or provider access. Production remains disabled/observe.

## Canonical sources and the evidence gap

`Procedure` already owns active, versioned procedures, their steps and application
links. The gate pins that existing identity/version through the prepared risk
contract; it does not create a parallel procedure store. A linked active procedure
alone does not prove a successful verification for this operation. Existing result
review concerns a completed execution and cannot prove pre-execution review.
Generic decisions and evidence records do not supply an expiring, exact-operation
authorization or independently verified backup metadata.

Three small native tables fill these gaps: immutable `TaskAdmissionScope`,
immutable versioned `TaskAdmissionEvidence`, and a monotonic source-revision head.
Evidence references current workspace company records. The typed attestation
records the current human issuer, server time, exact source/dependency hashes,
verdict, rationale and gate-specific verification. This records accountable
verification already performed; it does not independently attest external facts.

## Policy and exact scope

The server derives requirements from computed risk and explicit operation scope:

| Risk / operation | Required gates |
| --- | --- |
| Low or medium | Active applicable procedure and current successful verification |
| High | Procedure, extended independent review, explicit owner mandate/decision |
| Critical | All high gates, verified backup metadata, executable restore plan, fresh owner approval |
| Destructive production migration, even with computed low | All six critical gates |

Unknown/missing risk or scope fails closed. Clients cannot supply the resulting
requirements or verdict of the admission policy. A scope identifies task type,
environment, exact target and release/change-set company records, a 40-character
commit, explicit destructive flag, active procedure ID and applicability rationale.
Target and release belong to the same application and workspace. The procedure
must have an actionable step, be linked to that application and pinned in the risk contract. Its exact
scope plus the procedure verification attest applicability to the task type and
operation. Scope preparation never grants Ready or execution authority.

Evidence is separately bound to one of `runtime_execute`, `review_decision`,
`return_to_executor` or `create_specialist_task`. An approval for one operation
cannot authorize another task, application, target, release, commit or operation.
Scope changes require new evidence. Operation/environment/destructiveness are
explicit accountable declarations; this bounded system does not inspect arbitrary
SQL, discover undeclared effects or authorize execution of migrations outside the
native host. Such execution remains outside its command surface.

## Evidence and independence

Every attestation references a substantive current company record and carries a
passed/failed verdict. Procedure verification records a command/procedure and
observed result. Extended review covers security, data, reversibility and tests;
a passing review cannot have unresolved findings. A mandate records an explicit
decision, exact allowed scope and exclusions. Only a current owner issues mandates
and critical approval; this slice does not infer delegated decision authority.

Backup evidence records an artifact reference, SHA-256, byte count, capture time,
verification procedure and observed result. Capture must be in the preceding hour.
Restore evidence records the restore procedure, prerequisites/resources,
validation command/procedure and expected result. These fields contain metadata
and redacted instructions, never backup contents or credentials. Owner approval
explicitly accepts the exact operation and residual risk only after every other
required gate is current and passed.

Extended reviewers and backup verifiers must be current owner/admin/member humans
other than the task's current or historical scope authors, accepted human authors
or executor (including linked human workforce aliases). Submit cannot introduce
one of those reviewers as its author. Agent/integration keys cannot manufacture
these attestations. Current memberships and independent identities are checked
again at admission. Qualification certification and automatic reviewer routing
remain separate work.

## Freshness, ordering and enforcement

Procedure, review and mandate evidence expire after 24 hours; backup and restore
evidence after one hour; owner approval after 15 minutes. Admission also expires
with the underlying risk assessment and earliest required evidence. Server time
controls issuance and checks; caller timestamps cannot renew authority. A backup's
capture time may shorten its usable window further.

Gate dependencies follow procedure → review → mandate → backup → restore → owner
approval. Each record binds the current identities of preceding evidence. Replacing
an earlier proof, including with a failure, invalidates dependent attestations;
there is no fallback to an older passing record. Any changed task/application/risk
context, scope, procedure/step/link, referenced record or issuer membership changes
the admission source. Exact referenced-source reverts retain a monotonic epoch.

All writes use workspace idempotency keys, exact actor/input digests, optimistic
versions and the existing serializable Ready source fence. Concurrent replacement
has at most one winner. Identical replay returns history without reissuing evidence
or extending expiry, including after restart. Immutable SQL guards and restrictive
foreign keys prevent history mutation/deletion.

Submit pins an admission seal with the risk assessment. Queue, claim, recovery,
lease/checkpoint/context reads and pre-spawn Ready validation recheck the boundary.
SQL guards deny direct Ready/active-execution writes and native review/grant inserts
without current admission. Source invalidation reuses the existing active context
stop mechanism. Safe cancellation/failure and historical terminal reporting remain
available. Exact consumed capability receipt replay retains the existing post-effect
hash contract; it cannot create another effect or revive authority.

The host requires `native_risk_admission_v1` in the shared protocol. It compares the
current seal, bound commit and expiry, with a five-second stop margin, and verifies
the checkout HEAD immediately before synchronous spawn admission. Missing/old API
declarations or late/expired responses fail closed. This is not binary attestation,
a Git worktree-content attestation, or a guarantee against another unmanaged writer.

## Human API and console

Routes below `/v1/agent-runtime/tasks/:id/risk-admission`:

- GET: current operation gates, required/present/stale/failed status, exact scope,
  evidence/issuer/expiry, last 20 attestations and bounded procedure/record catalogs.
- POST `/scope`: versioned exact scope. Current owner/admin/member only.
- POST `/evidence`: typed single-gate attestation with current reference, verdict
  and gate-specific details. Additional issuer/independence rules apply above.

Schemas reject unknown fields; missing authentication is 401, human role rejection
403, foreign/unknown task 404, and stale scope/evidence/admission 409. Existing
native redaction protects commands and responses; audit events carry technical
references and policy identity. No secret-bearing artifacts belong in this ledger.

PL/EN **Prepare execution → Risk assessment → Admission requirements** shows each
required gate and the next verification action. The same surface is reachable
from task capability grants. It preserves drafts on conflict, supports explicit
context refresh, bounded catalogs, readonly states and unsaved exit protection.
The Ready error points to this flow. A successful attestation does not auto-submit.

## Migration and limits

`20260908110000_native_risk_admission` adds empty tables and guards, preserving
historical tasks, incidents, keys, grants, executions and applied migrations.
Existing tasks receive no synthetic procedure, verification, backup or approval.
The migration preservation fixture covers the full forward chain. API/DB tests
cover every level, low-labelled destructive production migration, missing/stale
proofs, independent authority, wrong scope, replay/restart/concurrency and source
invalidation. Host and PL/EN browser fixtures make no real model/provider calls.

Deploy migration/API/web before rolling out the host declaration, with runtime
disabled. Preserve the database volume and verified private recovery backup;
prefer a forward fix. Removing this gate through an older API/host is not a safe
authority-preserving rollback. Never drop evidence or reset the database.

RF-SEC-002 remains partial for company-wide autonomy. This is a bounded native
admission contract, not a release broker, certified backup/restore system,
automated semantic verifier, risk discovery engine or agent activation.
