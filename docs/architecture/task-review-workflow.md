# Native result review and correction return (RF-CTX-014)

Roost records review and the manager's response over the existing Task and
AgentExecution. It does not execute a reviewer, edit files or grant release
authority. PostgreSQL remains the source of truth; human clients use the scoped
runtime API and the existing Operations workbench.

Agent writes additionally require a current, exact single-use
[task capability grant](task-capability-grants.md). `grantId` is mandatory for an
agent decision or manager action and must match that operation; it is omitted for
human commands. Current grant status and IDs are discoverable in the review view.

## Material and authority

The current material is the newest execution by creation time and ID, which must
be completed, have a completion timestamp, remain unfenced, and retain the task's
accepted Ready pin and assigned executor. Legacy results without explicit
RF-CTX-009/010 context are readable but cannot gain a review decision by inference.

The material snapshot binds execution/task/application IDs, execution attempt,
completion timestamp, reported summary/final response, changed paths, reported
verification, execution contract and Ready pin. Its material version is SHA-256
of the canonical PostgreSQL JSONB representation; API and DB verify the same
value. This versions the reported material, not an independently attested Git
tree or physical artifact. Reported tests and review evidence remain claims to
be assessed by the verifier; recording them does not run those tests.

Current RF-CTX-010 role identities, profile revisions, membership, declared
skills and mandates must still resolve. The exact linked human principal or
[credential-bound agent principal](agent-credential-principal.md) can decide as
the accepted verifier or accountable manager. Human sessions require a current
owner/admin/member membership; ownership alone is insufficient. Agent credentials
require the exact current worker, unexpired/nonrevoked key, explicit command scope
and task mandate. Accepted authors/executors cannot independently review, including
human aliases. Generic keys and request fields never select the acting identity.

## Commands

All routes are under `/v1/agent-runtime/tasks/:id`:

| Route | Contract |
| --- | --- |
| `GET /review` | Current material, opaque expectedVersion, materialVersion, role eligibility, current decision, bounded history and specialist catalog. Optional scoped UUID cursor pages history (50 decisions per page); specialist catalog is capped at 500 and signals truncation. |
| `POST /actions/review` | requestId, expectedVersion, executionId, materialVersion and approve/reject evidence. Requires the assigned human or bound agent verifier and agent-runtime:write. |
| `POST /actions/review-return` | requestId, expectedVersion, reviewId and return_to_executor/create_specialist_task; scoped correction selection and current specialist reference when applicable. Requires the assigned human or bound agent manager and agent-runtime:write. |

Approve requires an assessment and at least one evidence/test reference with an
observed result. Reject additionally requires reproduction steps, expected and
observed behavior, allowed correction scope, excluded changes, one correction
outcome and required competencies. Text and arrays are bounded and common
credential-shaped text is rejected. Evidence must be redacted by its author;
this is not a general secret detector. Evidence references are stored as text,
never fetched or executed by the command.

One review attempt/decision is stored per completed execution. The API's
expectedVersion also covers current task state, role authorities and prior
decision/action. A new result, reassignment, changed task, altered role evidence
or competing decision invalidates a stale command. Transactions reuse the Ready
source fence and task lock plus the execution lock under serializable isolation.
Competing requests have at most one committed winner. A repeated request ID with
identical input/actor replays the durable record; changed input conflicts. Current
role authority is still checked on replay. No process memory is needed after a
restart. Historical replay never creates a new effect or grants current Ready.

## Rejection and manager action

Review records evidence and, on reject, invalidates Ready. It does not change
task assignment, branch, ordinary status, files or external systems. Approval
does not close the task, merge, push, release or queue another execution.

An unresolved rejection blocks a new Submit/queue. The manager may narrow the
reviewer's correction scope, while its outcome, exclusions and competencies
remain fixed. Exactly one disposition is committed for that rejection:

- **return_to_executor** keeps the same Task ID and original assigned executor.
  It writes an editable correction contract draft with the same deterministic
  task branch. The measurement needs explicit review before another Submit.
- **create_specialist_task** creates one native Task for a different, current,
  active agent whose declared competencies cover the correction. It has its own
  deterministic identity and RF-CTX-009/010 contract draft, a canonical Dependency
  from the parent, and an immutable action link. Its requester provenance remains
  unset until its first successful governed Submit. It never starts Ready.

Correction Submit is still subject to the full packet validator and versioned
RF-CTX-008 command. The agreed correction scope, outcome, competencies, component
and executor cannot be silently replaced. A parent awaiting a specialist remains
blocked until the specialist's latest completed result receives an independent
approve decision; the parent still needs explicit revalidation/Submit. This is
not a general dependency scheduler or an automatic continuation mechanism.

## History and UI

TaskReviewDecision and TaskReviewAction are append-only, with request hashes,
actors, profile identities, material/authority snapshots, scope and timestamps.
Database triggers reject update/delete of history, replacement of reviewed
material and mutation of the linked dependency's identity. Restrictive foreign
keys retain task/execution/dependency relations. Ordinary Event records project
the transitions; they are not the only audit source.

The PL/EN Operations task preview opens **Review result** without saving or
patching the task. Unsaved task edits must be handled first. The existing Ready
editor also opens review. The review view shows material version, responsible
people, evidence, current eligibility, decisions and correction history. A
dependent task links to its contract draft in the same Operations workbench.
Forms retain their idempotency key on connection failure; a stale result can be
refreshed explicitly. Empty, loading, read-only, stale, failure and success states
do not fabricate actionable work.

## Migration and verification boundary

Migrations `20260908050000` through `20260908050300` add the review records and
guards without changing existing tasks, results, users, credentials or volumes.
Forward corrections preserve applied migration history. Existing data receives
no invented review, approval or manager decision. Empty-database API tests and a
separate existing-data upgrade fixture cover both migration paths.

RF-CTX-014 remains partially implemented at the full agent-company level:
the native human and credential-bound agent command workflow is implemented,
while automatic reviewer invocation, independent artifact/Git attestation,
HR certification, hierarchical routing and broker/release execution remain
separate gates. Execution stays disabled and the host stays observe.
