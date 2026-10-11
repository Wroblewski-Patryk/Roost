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

A rejection after an append-only Ready-basis revalidation closes execution
admission while preserving a manager-only return path. That path requires the
exact latest rejected material, immutable mapping, executor and role provenance;
Ready may differ only by the rejection status/reason. It permits only
`return_to_executor`, not approval, specialist creation, release or another
owner basis revalidation. API eligibility and the database trigger enforce the
same boundary.

An evidence-only coding correction can preserve the preceding local commit.
The Windows Worker requires signed first-write continuation identifying the
rejection and previous native execution, a clean unchanged candidate, and a
fresh fixed regression replay. The replay loads exact parent module bytes in
memory for RED and runs the unchanged candidate test for GREEN in owned Jobs.
Pinned tests/assets/dependencies, exact assertion counts, cleanup and an
in-process receipt are checked. The result records
`verify_existing_local_commit`; it creates no commit and never replaces the
original coding evidence. A new independent exact-material review is required.

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
approve decision and a current [typed return](typed-work-handoff.md) from the
specialist to the accountable manager is accepted. The parent still needs
explicit revalidation/Submit. This is not a general dependency scheduler or an
automatic continuation mechanism.

## Sequential specialist offer (G15)

For one rejected application result, the accountable manager's immutable
`create_specialist_task` action is the offer to its exact, currently qualified
specialist. It creates one linked child draft. The child cannot become Ready
until that specialist, using an active bound API credential, records one
append-only accept receipt. A refusal is terminal for this offer; neither the
owner nor a different specialist can replace it. The offer endpoint exposes the
full proposed contract, correction scope, outcome and budget ceiling to the
owner and exact specialist. It does not itself queue work or spend a budget.

The accepted contract stays exact except for a measurement the owner must
complete and budget fields the owner may narrow. Changes to any other term,
including tests, recovery, roles, references, access or model selection,
invalidate this one offer; they cannot be silently accepted by the existing
receipt. Revocation, expiry or credential version change likewise invalidates
an acceptance for Ready admission; its historical receipt remains. This first
slice has no replacement offer on the same rejection. Only a separate
authenticated workspace-owner Submit can approve the child's single attempt
and bounded duration/configured output
token count. The API and PostgreSQL Ready guard check this boundary; claim and
Worker admission recheck current Ready. Roost does not measure provider cost or
actual token use, and the provider may not enforce the configured output token
setting.

Parent task source reviews do not grant the specialist access to the child's
sources. The owner must review each selected company record and procedure for
the child task through the existing task-bound source-review routes before
Submit. The Ready packet omits unreviewed sources, so a child missing those
reviews remains in Needs context. No automatic source approval is copied.

The child uses the existing native Worker scheduler and one-Writer constraint.
Its latest completed result requires the assigned independent verifier's
approval. The specialist then sends a typed handoff with outcome, changes,
tests, limits and continuation evidence from that child result to the current
accountable manager, who accepts it. PostgreSQL and Ready admission block the
parent until the exact approved result and accepted handoff are current. This
first slice is sequential; it adds no concurrent parent/child Writer and no
general dynamic delegation.

## G15 local and release evidence

On 2026-10-11 the manager's one specialist correction created an immutable
exact offer and Draft child. A bound specialist credential accepted or refused
it once; only a separately authenticated owner Submit set the child's bounded
single-attempt Ready after child-specific source reviews. The existing scheduler
admitted and claimed that child through an actual Windows Writer lock in the
disposable PostgreSQL journey. The child completion in this journey was a
synthetic result after the real claim, followed by independent review and an
accepted typed return. It was not a Hermes/provider execution or proof of
actual provider tokens or cost. Parent Ready remained blocked until the latest
approved child result and accepted current return were present.

All 139 migrations applied to the disposable database. The relevant native
review/API suite passed 29/29, including acceptance, refusal, revoked key,
scoped source review, concurrent decisions and restart replay. The database
and temporary role were removed. Owner Ready UI checks passed 80/80 and the
focused specialist-offer browser test passed 1/1. Native Writer tests passed
20/20, packet tests 76/76, and Gate 2 Worker coding/process tests passed 27
with three fixture skips. `npm run validate`, `npm run codex:check` and
`git diff --check` passed. Independent Security rereview
found no remaining blocker in the inspected code/SQL after the exact-contract,
revoked-key, former-manager-read and null-expiry fixes. No paid model,
application repository change or production company-data write was made for
proof. A production specialist task, actual Worker/Provider completion and a
combined monetary limit remain unobserved.

The read-only release preflight found remote `main`, public health and the
running backend at baseline commit `954055297f60e73c145f726ccb9fcb9b98654ecf`.
PostgreSQL was healthy on the retained named volume. The latest two G14
migrations were finished, with zero unfinished non-rolled-back migrations. A
read-only count found no active execution, the previous backend image was
retained, and the VPS had 14 GB free. The last documented encrypted backup with
isolated restore remains 2026-10-10; this check does not claim a fresh recovery
copy of intervening production changes. No VPS cleanup or deployment occurred
during this preflight.

The normal GitHub push of implementation commit
`a616b4df565c077c75211953407b5b85d6f2b27f` fast-forwarded `main`.
Coolify webhook deployment 6375 finished on 2026-10-11. Public API `/health`
and `/v1/health` and web `/health` returned `ok` with that exact commit;
the web root returned 200. Unauthenticated specialist-offer GET returned 401.
The replacement backend ran beside healthy PostgreSQL on the retained
`rnqqkhl3o3dut4qv56mlxly2_companycore-postgres` volume. Migration
`20261011200000_sequential_specialist_offer` finished without rollback;
there were zero unfinished migrations and zero specialist decision rows.
The prior backend image remained available and root free space was 13 GB.
The signed-in owner task board loaded after deployment. No live specialist
offer existed, so this read-only smoke did not exercise its positive console
flow, Worker execution or production result return. The disposable native
journey and focused browser tests provide those bounded proofs, with the
synthetic-completion limit stated above. G15 is complete at this approved
boundary; G16 and a real specialist attempt need separate authority.

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

## Company information task subset (G11)

A company-information task has no application or Git commit. Its assigned human
verifier may approve or reject one completed Worker result with the exact
information-material SHA-256 seal. The accountable human manager may return a
rejected result to the same executor with a narrower correction scope. Specialist
creation and agent reviewer credentials remain outside this subset. The old
owner-only `review-information` command refuses new writes; historical events
remain readable. The existing human workspace-member `information-result` read
remains available; the new review view, which includes role eligibility and
decision history, is limited to the owner or assigned human verifier/manager.

Review and return require separate, current operation-specific risk admissions,
the accepted Ready pin, assigned Worker, source and role provenance, and a
completed information execution. Both API and database check the matching
admission/input seals and the Worker-reported Windows Job receipt, zero native
tools, no external writes and no changed files. This is checked Worker evidence,
not independent OS attestation or a new provider/model run. A source, role,
ordinary status, Decision or Ready change makes a new review stale. Rejection
alone stays visible as pending manager action; only a manager action is shown as
returned. Approval sets a local Roost task to done, and manager return sets it
to todo; externally sourced task status is left to its provider. Ordinary status
edits never create approval. The append-only decision/action ledger and audit
events retain the distinct verifier and manager actions.
The generic execution-create route accepts only the preparation class for a
preparation Ready pin. It cannot queue a preparation execution against a runtime
Ready pin or hide its result. Company-information retry requires a new owner
Decision and the owner start route; generic retry is refused. Only the owner
may cancel a company-information execution.

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
