# Supervised Execution Packet v1

[Native task risk assessment](native-task-risk.md) binds the prepared scope and joint
impact to Ready, execution admission and task capability grants. Classification
does not implement RF-SEC-002 level-specific authority or activate execution.

Required packet/model content also passes the shared
[native runtime redaction gate](native-runtime-redaction.md). Sensitive or
previously redacted content cannot authorize model spawn.

Current contract for the local Agent Host, extending the original execution
packet gate with versioned Submit, one task scope and explicit role admission.
It does not activate production agents, automatic recovery or the DemoApp pilot.

## Explicit task roles (RF-CTX-010)

The existing Submit contract requires `taskRoles`, schema version
`roost-task-roles-v1`, with exactly one `{id, revision}` reference for each of
`requester`, `accountableManager`, `executor`, `verifier` and `releaser`.
The requester ID is a User ID and its revision is the current workspace
membership `updatedAt`. Other IDs and revisions reference current workspace
WorkforceEntity records. The manager reference must equal the existing
`singleTask.accountableManager`; executor must equal the task assignment and
contract `assignment.agentId`. There is no second role assignment store.

The first successful governed Submit binds the authenticated human requester
and submission ID into nullable `Task.executionRoleProvenance`, schema
`roost-role-provenance-v1`. This establishes the origin of governed admission;
it does not reconstruct the creator or authors of a historical/imported task.
Rejected submissions leave that origin unset. Accepted submissions preserve
the original requester and append the submitting human and executor to a
deduplicated author history (maximum 1,000 principals). The receipt, accepted
pin, provenance and event commit atomically. No client supplies provenance.
Removing or replacing that origin/history through ordinary writes is rejected.

All role workers must be active, workspace scoped and have a declared working
role. A human worker must link through `source=user` and `externalId` to a
current owner/admin/member membership. An agent principal is its workforce ID;
an agent using a human source link is ambiguous and rejected. Requester and
current Submit author also require current write-eligible memberships.
Manager `authorityScope` must explicitly contain `task_accountability`, verifier
`task_verification`, and releaser `release_authorization`. Verifier and executor
`skillIndex` must cover the contract assignment competencies. Existing executor
tool/access checks also apply. These are declared profile mandates and skills,
not certification or proof of a particular credential-bound running agent.

Verifier and releaser must be independent of the current executor and every
accepted author/executor principal. Human workforce aliases resolve to User IDs,
so choosing another profile of the same author does not bypass independence.
Changing the executor does not erase its earlier authorship. This slice does
not require verifier and releaser to be different from each other.

Current role authorities and provenance are part of the Ready fingerprint and
source watches. Membership/profile/assignment edits invalidate acceptance;
queue, claim and host admission recheck it before an attempt or model spawn.
An ordinary task edit remains allowed and invalidates Ready through the existing
source trigger. Missing, stale, conflicting or insufficient role evidence yields
Needs context. Status edits, imports, old APIs and prompt text grant no authority.
Both protocol capability lists require `task_role_separation_v1`; protocol
version remains 1 and observe mode is unchanged.

The shared PL/EN editor exposes current requester, manager, executor, verifier
and releaser, explicit revision refresh, conflict diagnostics and accepted-role
summary. Its worker catalog is capped at 500 and signals truncation; server
resolution remains authoritative. Legacy contracts remain editable. Migrations
`20260908040000` through `20260908040200` add nullable provenance, invalidate old
Ready without inventing roles, watch memberships and preserve ordinary source
edits. They preserve business rows, credentials and volumes and do not seed.
The forward corrections retain already-applied migration history.

RF-CTX-010 remains partially implemented: native review/return and release
execution, delegated authority certification, per-agent credential attestation,
broker/merge/push and activation are outside this role-admission slice.

## Preparation And Authority

An unresolved native review rejection blocks new admission. Manager returns and
specialist drafts require another explicit Submit with the agreed correction
scope and a reviewed measurement. See [RF-CTX-014](task-review-workflow.md).

First submit the explicit contract through
`POST /v1/agent-runtime/tasks/:id/actions/submit-for-execution` with
`{requestId, expectedVersion, applicationId, contract, prompt?, baseBranch?}`. This requires
`agent-runtime:write` and a current human workspace owner/admin/member role.
Viewers and API keys, including wildcard keys and worker profiles, cannot accept Ready.
The API resolves current canonical context and runs the same packet validator
as the host. Only successful validation creates Ready. Creation, assignment and
ordinary task status edits do not create it. Submission itself never queues work
and is available while execution is disabled.

Then queue through `POST /v1/agent-runtime/executions` with `taskId` (and
`applicationId` when needed). The API copies the accepted contract, instruction,
branch and pin into the execution. Supplied alternatives must match; caller pins
cannot override the server pin. The task workbench opens a shared PL/EN contract
editor through **Prepare execution**. The Operations task preview saves ordinary
task edits before opening it through **Save and prepare execution**. Acceptance
and queueing are separate actions; disabled runtime keeps queueing unavailable.
No defaults invent missing intent or permissions.

### Owner contract editor (RF-CTX-008)

`GET /v1/agent-runtime/tasks/:id/execution-readiness?editor=1` adds a workspace-scoped
editor projection to the existing readiness result. Optional `applicationId`
must identify an application linked to the task project. It returns labels,
revision references, an opaque `submissionVersion`, the accepted editable contract, acceptance author/time,
current human write eligibility and execution availability. It excludes resolved
source bodies and agent runtime metadata. Company/application sources are bounded
to 500 recent nonarchived records; project/goal/agent choices to 500; procedure,
dependency and decision choices retain the task-context loader's bounds. This is
a bounded catalog, not global source search. Server resolution remains authoritative
and may reject a reference absent from the resolved execution context.

The form authors intent, scope, context references, model/effort, permitted tools,
budgets, acceptance evidence and recovery. Missing optional context requires an
explicit reason. Adding a reference preserves selected revisions; upgrading stale
references requires a separate action. Project/goal/executor corrections use the
existing work-item PATCH; changes to only internal links do not call ClickUp.
The client sends the reviewed `submissionVersion` as `expectedVersion` and a
UUID `requestId`, never an admission pin, validation proof or acceptance identity.
Only the existing submit command can validate and persist admission. Task status remains
separate from Ready, and prior acceptance proof remains visible after invalidation.
Errors display fixed translated diagnostic groups without echoing raw payloads.
The form action is **Submit for execution / Przekaż do wykonania**. Missing input
persists **Needs context**, or **Needs decision** when all diagnostics concern
decisions. Translated diagnostics survive refresh; rejected input is not stored.
The form retains unaccepted edits, uses the same request ID on ambiguous network
retry, and requires refreshing/reviewing a stale version. Automatic interviews
remain outside this slice.

### Submit is the only Ready transition (RF-CTX-008)

Migration `20260907230000_submit_only_ready` makes `Task.executionReadiness`
non-null with a durable `draft` default, preserving ordinary `Task.status` as the
independent delivery workflow. Creation, assignment, imports and free status edits
cannot grant executable Ready. Missing/legacy command preconditions are rejected;
the command continues to require a current human owner/admin/member, including a
membership recheck inside its transaction. Wildcard API keys remain ineligible.

The editor's opaque version hashes its canonical task/application context, selected
application, task update time and current admission state. The submit transaction
locks the shared source fence and task, compares that reviewed version, resolves
the submitted references and runs the complete existing packet validator. Scope,
assignment, sources, model, access, budget, acceptance and recovery validation all
run before persisting source watches, the Ready pin, command receipt and event.
An incomplete command atomically records a nonexecuting state and safe field/reason
diagnostics instead. Stale versions and transaction conflicts fail closed without
acceptance. Structural validation is not a proof of arbitrary semantic completeness
or execution/provider readiness.

`task_execution_submissions` holds task/request identity, actor, canonical request
hash, transaction identity, admission digest and bounded result. No rejected input
or source body is stored there. A task/request key accepts only the same payload
and actor. Repeated delivery returns the durable result without a new pin/event;
an accepted receipt is rechecked against current Ready and cannot restore a
superseded or invalidated pin. Concurrent transactions may return a serialization
conflict; retrying the same command safely resolves the committed receipt. A new
payload or reviewed version requires a new request ID. API restart loses no receipt.

A database trigger permits new/changed Ready only with a matching successful
command receipt, exact admission digest, eligible member and the same database
transaction. Ordinary ORM/SQL writes, old API code and imports cannot forge or
restore it from a prior receipt. Receipts are immutable until their owning task
is deleted. Earlier Ready proofs are invalidated with `submission_required` during
migration; active attempts receive the existing stop fence. The receipt insertion
is a trusted command implementation boundary: unrestricted database writers who
can fabricate command records, disable triggers or replace code are outside it.
No trigger or client check substitutes for server authorization and validation.

Submission grants Ready only. Queue and claim remain separate guarded operations;
there is no automatic interview, scheduling, activation, or new execution on
create/assign/edit. PostgreSQL tests cover rollback, stale context, concurrency,
receipt replay across a fresh API process, rejected alternate writes and explicit
queue/claim. PL/EN browser tests cover durable states and retry after a lost response.

### Accepted context at Ready (RF-CTX-006)

`Task.executionReadiness` is a JSON field, separate from ordinary
`Task.status`. Migration `20260906141000_task_ready_context_pin` originally added
it as nullable; the Submit-only migration above introduces durable Draft defaults.
Ready stores schema `roost-ready-context-v1`, command UUID, acceptance
UUID, SHA-256 revision, accepted contract/instruction/branch/application,
validator identity, the same validated revision, timestamp and submitting actor.
Source context stays in its canonical records. `task_execution_ready` events
retain prior acceptance proofs; invalidation adds `task_execution_ready_invalidated`
with hashes and fixed reasons. This is an operational validation record, not
independent owner release approval or an immutable audit ledger.

The shared Ready fingerprint covers both resolved context responses, explicit
contract and source revisions, plus instruction and branch. It omits response
`generatedAt`, the execution-specific packet envelope, Ready bookkeeping, and
this task's `updatedAt`/`todo` to `in_progress` claim transition. Object keys and
entity collections identified by `id` are sorted. Other ordered arrays, source
revisions, statuses, goal/scope/assignment/access/dependency/procedure and context
changes remain material. The existing bounded context selection is reused;
this is not a new complete-context compiler. Explicit contract sources are
always resolved and validated independently of that selection.

Acceptance, queue, claim, every checkpoint and pre-spawn
recovery gates use a serializable transaction, update the source fence, then
lock the Task row. Queue and
retry bind one accepted pin, reject active duplicates, and never refresh a pin
implicitly. Heartbeat/completion metadata cannot replace the contract or pin.
Serialization/timeouts fail closed with `task_ready_context_conflict`.
An execution-bound active task-context read also checks Ready.
`GET /v1/agent-runtime/tasks/:id/execution-readiness` returns the derived state
and persists a detected invalidation; it requires `agent-runtime:read`.

Missing/legacy proofs return `task_ready_pin_required`. Material differences
return `task_ready_revalidation_required`, persist `needs_revalidation` and keep
the previous proof. Reverting records after detected invalidation does not
restore Ready. Reconcile/cancel the prior execution, review/replan the task and
submit the current contract explicitly. Changing a referenced source revision
also requires updating that contract reference. An invalid submission preserves
the historical proof but changes admission to a nonexecuting state and returns
safe field/reason diagnostics.

Migration `20260907213000_ready_source_invalidation` makes source invalidation
eager and transactional. Ready acceptance records `sourceWatchVersion: "1"`
and a persisted read scope in `task_ready_source_watches`. The scope compiler
wraps only the two context loaders: it follows Prisma's relation metadata and
captures their scalar filters and nested includes, including empty collections.
It covers explicit contract sources, task/goal/assignment, organizational
context, dependencies, procedures/policies, and the application graph. Collection
filters conservatively cover selection candidates before ordering/truncation;
a change to an omitted candidate can therefore invalidate Ready. This is not
a promise of minimum invalidations. Rows outside the captured predicates do not
invalidate the pin. The bounded feature-ID query retains its ID predicate while
omitting its redundant application-tenant guard for invalidation only.
Unsupported query/relation shapes and missing source triggers fail acceptance.
No source bodies or runtime credentials are stored in the watch table.

Every INSERT/UPDATE/DELETE on the covered source tables first updates the
singleton `ready_source_fence` in a BEFORE STATEMENT trigger. This is a global
database serialization point, including shared definitions: source mutation and
Ready admission acquire it before task/source row locks. The revision write
forces an older serializable snapshot to abort instead of installing a pin that
missed a committed edit. SQLSTATE 40001/40P01 (including Prisma raw-query P2010),
P2034 and transaction timeouts fail admission closed. It deliberately trades
parallel source-write throughput for a small, explicit correctness boundary;
it is not a per-workspace concurrent scheduler.

An AFTER ROW trigger matches both old and new source rows and atomically sets
affected pins to `needs_revalidation` / `context_changed`. The old revision,
contract and validation proof remain historical evidence, never valid admission.
The same transaction records one transition event per pin and accumulates one
`changedSources` entry per table/ID with label, operation and first-change time.
Duplicate edits and an edit followed by an exact revert cannot restore Ready;
rolling back the source transaction also rolls back invalidation and its event.
Task Ready bookkeeping and the accepted task's todo/in_progress claim transition
remain excluded. A task update that changes only its automatic timestamp is a
no-op for eager invalidation; the existing full fingerprint comparison remains
the conservative fallback for other accepted task projections.

The owner readiness response and PL/EN workbench expose the reason and changed
source references on their next read/refresh. The UI has no push subscription.
Reacceptance replaces the watch scope and clears the change list. Older Ready
proofs are explicitly invalidated by migration (`source_watch_required`); a
database guard rejects an older API trying to store Ready without source watches.
Watches and invalidations survive API restart; no in-memory queue is required.

The host checks the execution-bound Ready proof against its fetched contexts
before preparation and again after the final fresh fetch. A missing/changed
proof or API rejection yields `agent_ready_context_revalidation_required`,
`retryable: false`, no model start, no further claim, and retained ownership
after claim. API rejection before claim does not reserve an execution.
These gates and source writes are serialized at database admission: a source
write committed before claim prevents claiming the old pin; a later write
invalidates it and requests the active-work stop described below. No transaction
spans database commit to local spawn. The production
output-budget guard still refuses model spawn, and execution remains disabled.

### Active work after accepted context changes (RF-CTX-006)

Migration `20260907220000_active_context_stop` adds `contextInvalidatedAt`,
`contextStoppedAt` and `contextInvalidation` to AgentExecution. Ready invalidation
atomically fences claimed/running/waiting attempts, preserving the last confirmed
checkpoint, attempt and lease. The signal records the accepted pin and changed
source references. The first change emits `context_stop_requested`; subsequent
distinct sources update diagnostics without another stop request. Revert, restart
or new Ready acceptance never clears an old attempt's fence. Deployment backfills
already invalid pins.

Execution mutations share the source fence. Heartbeat, every checkpoint,
completion and recovery reject fenced attempts with
`agent_execution_context_invalidated`. Completion and evidence commit in one
guarded transaction: source-first rejects completion; completion-first remains
historical completed work. A database guard also prevents older API code from
advancing checkpoints, renewing/rotating leases or completing/failing fenced
attempts. Both protocol lists require `active_context_stop_v1` for admission.

The host checks authority before local checkpoint intents, at observed runner
item/turn boundaries and through its periodic 20-second heartbeat. It invokes
the idempotent process-tree stop once, stops renewal and claims, and retains the
writer lock. Only confirmed tree termination permits the scoped report
`POST /executions/:id/actions/context-stopped` with the retained lease token.
This report is idempotent, accepts an expired token without renewal, records
`context_stopped`, and returns the last server-confirmed checkpoint. Only after
successful acknowledgement does the host synchronize its local checkpoint.
Failed tree termination or lost acknowledgement never authorizes checkpoint
replacement or automatic restart. This is a host report, not machine attestation.

The PL/EN owner view distinguishes requested and confirmed stops, lists changed
sources and asks for local-change reconciliation. After confirmation the owner
may explicitly close the old attempt, releasing its API lease only. Review new
context opens the existing Ready editor. Explicit acceptance and a new queue
action create new authority; the old attempt cannot retry or rebind. Local writer
reconciliation remains a trusted operator action; see
[recovery](agent-host-recovery.md#context-invalidated-attempts).

Stopping occurs at the next host-observable checkpoint/event/heartbeat, not
atomically inside an arbitrary runner tool or OS operation. Work can occur
between source commit and observation. Transport/lease safeguards bound normal
operation but cannot guarantee termination during an OS freeze. A retained
checkpoint does not prove rollback or replay safety after effects. PostgreSQL
tests cover late writes and source/completion races; fake-runner tests cover
actual child/descendant termination, duplicate signals, lost acknowledgements
and refused restart. No live provider/model test or activation is claimed.

The host reads
`GET /v1/company-intelligence/tasks/:taskId/agent-context?executionId=:executionId`.
Roost verifies both IDs belong together in the authenticated workspace and adds
`executionPacket` to the existing response. Calls without the optional query
retain their previous shape. Roost binds the packet to the current task,
application, workspace, execution and assigned workforce agent, includes the
task's `updatedAt` revision, and resolves the explicitly named context sources.

The packet has `schemaVersion: roost-execution-packet-v1`, `identity`,
`taskRevision`, `contract`, `scopeAuthorities`, `sources`, and `revision`. Its revision is SHA-256
over the JSON envelope before the revision field is added. This detects a changed
snapshot; it is not an approval signature or an immutable governance ledger.
Lease tokens and source metadata are not included in this envelope.

## Required Contract Fields

All objects are strict; unknown fields, unknown schema versions, missing values,
empty required lists and unsupported enum values fail closed. Text is nonempty
and bounded to 2,000 characters; required text lists contain at most 30 entries.

| Field | Required value and validation |
| --- | --- |
| `version` | Explicit nonempty contract revision label. |
| `objective` | `outcome` and `goalId` matching the task's current workspace-scoped Goal. v1 uses the existing Goal link as the product/goal basis. |
| `scope` | Nonempty `allowed` and `forbidden` lists; the same entry cannot occur in both, ignoring case. |
| `assignment` | `agentId`, `role`, `competencies`; match the active assigned workforce entity of type `agent`, its primary role and `skillIndex`. |
| `singleTask` | Required `roost-single-task-v1` scope described below; one resolved application/component, accountable manager, assigned executor, measured outcome and deterministic task branch. |
| `modelSelection` | Explicit `model` and `reasoningEffort` admitted by the Foundation V2 policy below. No inherited/default selection. |
| `context` | Nonempty `company`, `product`, `technical` lists of `{id, revision}`; at most 10 per category. |
| `procedures` | Explicit set of `{id, revision}` referencing active procedures; revision is the string form of their numeric `version`. All application/capability-linked procedures must be included. |
| `skills` | Explicit set of `{name, version}` matching `name@version` entries in the assigned agent's `skillIndex`. |
| `access` | `tools`, `permissions`, `sandbox: workspace-write`, `externalWrites: false`, nonempty `restrictions`. Supported tools/permissions are `repository_read`, `repository_write`, `local_test`, matching the agent's `toolIndex`/`authorityScope`. Every tool also needs its corresponding permission. |
| `dependencies` | Explicit set of `{id, revision, resolution: satisfied, evidence}` covering every linked task dependency. Revisions match `updatedAt`; blocked dependencies fail. |
| `decisions` | Explicit set of `{id, revision}` covering every task-linked decision. Revisions match `updatedAt` and status must be `approved`. This status is operational context, not proof of authenticated owner release authority. |
| `budgets` | Integer `maxAttempts` 1–5, `maxDurationSeconds` 60–3600, `maxOutputTokens` 128–100000. The current claim attempt must be within `maxAttempts`. |
| `acceptance` | Nonempty `criteria`, `tests`, `evidence` lists. |
| `recovery` | Nonempty `handoff`, `failure`, `escalation`, plus `rollback: {mode, instructions}`. Mode is `restore_task_changes` or `not_applicable`; write permission requires the former. |

An explicit set is `{items: [...], noneReason: null}` when populated, or
`{items: [], noneReason: "Task-specific explanation"}` when none apply. An empty
set without a reason, or a populated set with a none-reason, is invalid.

Context references name existing CompanyRecord IDs. Their `revision` is exactly
the API `updatedAt` ISO timestamp. Company sources are workspace-level records
with no application ID; product and technical sources belong to this execution's
application. Only those records are fetched, with at most 30 sources total.
Each needs usable description, purpose, desired state or expected behavior;
a title alone is insufficient. Missing, archived, foreign or revised records
block execution. Source payloads omit arbitrary metadata. Full context and draft
contracts must remain secret-free, as all existing operational records must.

The host also verifies the application context version, ID, workspace, slug and
project link, current task identity/revision/status, and packet digest. Context
selection is not allowed to silently stand in for a missing required source.
The executable synthetic example in
`scripts/fixtures/execution-packet.mjs` demonstrates the complete shape without
production data. Its fixture IDs must be replaced by actual scoped record IDs.

### Single-task scope (RF-CTX-009)

`singleTask` is mandatory at Submit, queue, claim and host packet admission. Its
stable `contractId` is `roost-task:<task UUID>` and its sole permitted `branch` is
`codex/task-<task UUID>`, including resubmission and retry. `applicationId` must
match the execution. `component: {id, revision}` resolves an active architecture
component in that application; `accountableManager: {id, revision}` resolves an
active workforce entity in the current workspace. Revisions are exact `updatedAt`
ISO timestamps. The existing assigned agent is the sole executor. No default
manager, inferred component or extra executor is added.

`measurement` requires `metric`, `comparison` (`eq`, `lte`, `gte`), a finite numeric
`target`, `unit` and an explicit verification `method`. `problems` has one to three
distinct entries with `statement`, `componentId`, `outcome` and nullable
`causalLink`. Every entry must refer to the same component and exactly the same
`objective.outcome`. A single problem requires null `causalLink` and `commonCause`.
Two or three symptoms require a nonempty causal link of at least 20 characters
per symptom and `commonCause: {mechanism, inseparability, evidence: {id, revision}}`.
Both explanations require at least 20 characters; evidence must be one of the
explicit current technical sources, which undergoes normal source validation.
Different components or outcomes, duplicate symptoms, lists and explicit compound
action/independent-problem signals in PL/EN fail with split advice and Needs
context. Outcome/problem statements and the common mechanism are limited to 400
characters by this ambiguity gate. These are deterministic structural and textual
checks, not proof that arbitrary prose describes a truly inseparable cause.
Semantic completeness and independent acceptance remain outstanding; RF-CTX-009
therefore remains partially implemented. Role admission is defined in RF-CTX-010 below.

The owner editor exposes these fields in PL/EN, preserves old contracts for editing,
shows the accepted exception and records the exact scope/outcome in the Ready event.
It creates no child tasks. Scope authorities are included in packet and Ready
fingerprints; their watched source changes invalidate acceptance immediately.
Any contract edit needs a new Submit using the existing version/concurrency and
idempotency checks. Migration `20260908001000_single_task_scope` moves all historical
Ready pins to Needs revalidation without inferring scope, preserving their history
and fencing active attempts. An additive DB trigger prevents an old API from
writing legacy Ready during rollout. Full validation and same-transaction Submit
receipts remain required; status changes, assignment, imports and direct ordinary
Task writes do not grant acceptance.

The supervised host reads Git's current symbolic branch before preparation and
again before the final fresh-context check immediately preceding spawn. Detached
HEAD or a mismatch fails with `agent_task_branch_mismatch`, retains recovery
evidence/writer protection and starts no model process. It does not create or
switch branches. Arbitrary external Git writers are outside the host lock's
coordination boundary. Protocol version stays 1, with mandatory
`single_task_scope_v1` on both sides; older supervised hosts fail closed.

## Start Gate And Diagnostic Result

### Foundation V2 explicit model admission (RF-HOST-016)

Every contract now requires `modelSelection: {model, reasoningEffort}`. Supported
model IDs are `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` and `gpt-6-astra`.
Efforts are `low`, `medium`, `high`, `xhigh`, `max` and `ultra`, except Luna does
not support `ultra`. This bounded allowlist implements the owner minimum 5.6;
unknown aliases, older models, absent values and unsupported pairs fail before
any execution subprocess. Previously prepared contracts without this field must
be corrected and reissued. The envelope remains v1; its explicit contract revision
and digest change with the new field. No task or workforce default fills it in.

The launcher passes `--model`, `--config model_provider="openai"` and
`--config model_reasoning_effort="..."` explicitly, overriding local defaults.
`runner_started.payload.requestedModelSelection` records the requested pair;
it is not provider-confirmed model usage. There is no retry on a different model
or downgrade on provider failure. Availability checks, dynamic routing, risk minima,
owner override UI and observed model telemetry remain separate requirements.
No paid model call or execution activation is needed to verify argument dispatch.

The allowlist/effort support was checked against the installed Codex model catalog
on 2026-09-06. The CLI flags were checked using `codex exec --help`; config keys
and explicit-override precedence are documented in the
[official Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).
Catalog changes require an explicit policy update; they are never inferred from
a model-name numeric prefix. Future automatic delegation must still meet the
separate Roost scheduler and resource gates.

After obtaining task/application context, the host renews and checks its lease,
validates the packet, and only then performs execution-specific Git checks.
Initial invalid packets start neither Codex nor a Git subprocess for that
execution. Host startup still performs the existing local allowlist Git checks
before it registers or claims any task. Final fresh-context admission below
also applies after those read-only preparation checks.

### Fresh authoritative context before spawn (RF-CTX-006)

The host fingerprints both existing context responses at preparation and stores
`contextRevision` alongside `packetRevision` and `workspaceDigest` in the same
local/server recovery checkpoint. SHA-256 covers the complete resolved task and
application contexts, including goal, assignment, access, procedures, decisions,
dependencies, sources and evidence. Only each response's top-level `generatedAt`
is omitted. Object keys are sorted; array order remains significant, so even an
order-only change can conservatively require replanning. This fingerprint is
not an approval signature or a second context store; no context content is saved
in the checkpoint.

After durably recording `spawn_intent` and sending `runner_started`, the host
fetches both scoped context endpoints again with cache bypass. It runs the
existing packet validator on those responses and compares their fingerprint
with the prepared checkpoint. The prompt and task/application labels use the
fresh responses. Lease and elapsed-duration checks then run synchronously before
spawn; there is no further awaited network or repository operation in between.
`runner_started` remains an admission-attempt event, not proof that a model ran.

A changed or invalid final context reports `agent_execution_context_changed`
or `agent_execution_context_invalid`; failed retrieval reports
`agent_execution_context_unavailable`. These use the existing fail action,
`retryable: false`, fixed diagnostics and hash-only comparison details with
schema `roost-context-admission-v1`. Invalid packets also retain the existing
safe field/reason diagnostics as `packetIssues`, without rejected values.
They prevent spawn and further claims and retain
the writer checkpoint. Authentication rejection follows the existing lease-loss
path. Failed reporting never removes the lock or permits another execution.
Review changed records, reconcile the execution and prepare a corrected contract;
the existing API rejects blind retries. The pre-spawn intent barrier is retained
even when this process knows no model started, because a restart cannot assume
that from the barrier alone.

Prepared recovery requires the same context fingerprint, packet and workspace
digests, then repeats the final refresh. Legacy prepared checkpoints without the
new fingerprint cannot be automatically recovered. The API reads legacy records
for diagnostics but rejects unpinned new checkpoint transitions and pins the hash
immutably after preparation. These checkpoint fields use the earlier recovery
storage; the separate Ready pin uses the additive Task migration above.

These are two ordinary authoritative API reads, not an atomic database snapshot
or a lock over concurrent source edits. A change after the last read may escape
this pre-spawn check. Ready adds the acceptance gate; active-work stopping above
handles subsequent observed invalidation without an atomic database-to-process
transition.

An invalid packet reports `execution_packet_invalid` through the existing fail
action with `retryable: false` and:

```json
{
  "schemaVersion": "roost-execution-packet-diagnostics-v1",
  "issues": [{"field": "contract.acceptance", "reason": "missing"}]
}
```

Reasons are `missing`, `invalid`, `mismatch`, `unavailable`, `stale` or `blocked`.
Diagnostics include only schema field paths and fixed reasons, never rejected
values, arbitrary property names, source content, credentials or raw logs.
The failure message lists these fields in the existing execution notice and
activity timeline; structured details remain in `errorState.details`.
Blind retry is rejected with `agent_execution_requires_correction`. Correct the
underlying records and queue a new execution with a corrected contract.

## Hard Duration Limit

The supervised host enforces `budgets.maxDurationSeconds` from the server's
original `AgentExecution.startedAt`, including preparation and time before a
pre-spawn recovery. Heartbeats do not renew this budget. A separate timer starts
Windows process-tree termination five seconds before the deadline. Admission
checks also reject late operation results, launch and completion submission.
The child must have exited and final checks passed before the timer is disarmed
for the bounded terminal API request; waiting for that acknowledgement is outside
the execution budget.

Expiry reports `agent_execution_duration_exceeded` with `retryable: false` through
the existing fail action when authority and termination permit it. Missing,
invalid or future `startedAt` fails closed as
`agent_execution_duration_context_invalid`. Diagnostics contain fixed messages
and numeric limits only. Both cases stop new claims and retain the writer lock.
An unavailable report cannot restart work; uncertain termination uses the
existing reconciliation path instead of claiming a confirmed stop.

Synchronize host/server clocks. Elapsed time cannot decrease within one host
process because a monotonic clock backs wall-clock checks. Clock rollback between
processes, OS/event-loop freezes and detached descendants outside the existing
process-tree containment are not solved by this timer. Independent plan review
and approval of a new budget are required policy; their orchestration remains
separate work. Token and cost meters are not implemented by this duration slice.

## Hard Output Token Admission (RF-HOST-010)

`budgets.maxOutputTokens` remains an explicit accepted contract integer in
128–100000, with the existing model/effort allowlist. Ready pins it; queue copies
it into execution metadata, and worker heartbeats/reports cannot replace it.
It is an output budget for one execution/attempt, including reasoning, not a
duration, input/context limit, monetary cap or authority to approve more budget.
No selected model is runnable without a proven enforcing transport.

**Current guarantee: fail closed before Codex spawn.** On 2026-09-06 the installed
`codex-cli 0.153.4` (`codex exec --help`) and the
[official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
did not establish a hard output-token cap covering an entire `codex exec` run.
`tool_output_token_limit` truncates tool results; it does not cap model generation.
The [JSONL interface](https://learn.chatgpt.com/docs/non-interactive-mode) reports
usage on `turn.completed`, after generation. This is not synchronous admission
for every provider response and descendant agent. There is no proven finite
overshoot margin. No guessed flag, prompt instruction, account usage percentage,
text-length estimate or post-turn meter is accepted as a hard limit.

The production CLI therefore always uses `createCodexOutputBudget`, which rejects
even a valid budget as `agent_execution_output_budget_unsupported`. This occurs
after packet/Ready validation and before execution-specific Git preparation or
the durable spawn barrier. A malformed output budget fails the packet gate and
also halts further claims. No configuration, environment or packet field can
enable the observational guard instead. A binary update does not remove this
block; a proven runner contract and separate implementation review are required.
The factory injection on exported `runHost` exists for trusted synthetic process
tests, like the existing lock injection; the CLI does not expose it.

The shared `output_budget_fail_closed_v1` capability is mandatory on both sides,
with protocol version still 1. An older process cannot reuse stored host metadata
to claim or recover because request headers are checked too. Supervised host
metadata and runtime diagnostics expose `output_token_limit_unsupported`.
Observer behavior is unchanged and never enters this gate.

For synthetic runner verification only, the observational guard sums output and
any separately reported reasoning counts conservatively across completed turns.
It never subtracts input/cache counts or resets the total on a heartbeat. At or
above the limit, or on invalid usage, it calls the existing idempotent stop path,
rejects late completion, stops further claims and retains the writer checkpoint.
Windows process-tree termination, reporting uncertainty and lease loss retain
their existing reconciliation boundaries. This proves the containment path,
**not a usable hard cap for Codex or a bound on its overshoot**.

`agent_execution_output_budget_invalid`, `agent_execution_output_budget_exceeded`
and `agent_execution_output_budget_unsupported` are nonretryable, including when
a caller submits `retryable: true`. Diagnostics contain fixed text, numeric
limits/counts and enforcement mode only. Failed terminal reports preserve the
local fence. No prompt, response text or raw usage payload is echoed in errors.

Recovery cannot replenish a pool: matching claimed/prepared checkpoints prove
no worker started, retain identity/attempt/contract and rerun the same blocking
gate. The existing spawn-intent barrier prevents automatic recovery from any
potentially consumed state; no consumption ledger is reset or invented. A
failed run cannot use blind retry to obtain another pool. Independent approval
of a replacement plan/budget and monetary enforcement remain separate work.

Verification: `npm run test:agent-host-output-budget`, the complete host regression
suite and local API tests. No paid/provider model calls or production activation.

## Practical Limits

This is a structural and referential admission gate. It cannot establish the
semantic quality of prose, the truth of dependency evidence, or that an agent
will obey every instruction. The host enforces elapsed duration as described
above; output token guarantees currently use the fail-closed admission described
above, so supervised Codex execution is unavailable. The sandbox,
existing lease containment and one-host writer lock remain separate controls.
No worker receives new release permissions through this packet. Scope enforcement,
automatic recovery, independent review orchestration and pilot activation remain
separate work. Production stays `foundation_only` in this batch.

Verification: `npm run test:agent-host-packet`, existing host guard/lease/writer
suites, `npm run test:api:local`, and `npm run validate`.
