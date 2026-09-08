# Typed work handoff (RF-CTX-013)

Native task handoff records an immutable version of a completed execution's
reported material for one current task-role principal. The exact recipient may
accept receipt or reject it with a code, reason and missing/conflicting sections.
Acceptance changes no assignment, execution, review decision, release authority,
priority or task status. Instructions in the handoff are content; this path does
not execute them or invoke the recipient.

## Contract and provenance

`task_handoffs` is append-only, numbered monotonically within the task. Every row
binds workspace, task, application, latest completed execution, attempt, sender
principal/role and recipient principal/role. `task_handoff_decisions` has exactly
one immutable decision (revision 1) for an exact handoff ID and version.

The API resolves `source` itself. The caller supplies only its digest, the
optimistic view version, exact roles/recipient, an optional rejected version to
supersede, and the typed explanatory content below. Caller-authored source,
commit, result, actor or test attestations are rejected as unknown fields.

| Section | Required content and server reference |
| --- | --- |
| Outcome/state | Explanatory summary and current state; exact execution/material SHA and attempt |
| Pinned context | Persisted checkpoint packet revision/version, Ready pin/revision, composition seal, current risk assessment and runtime admission seal |
| Decisions/mandates | Explanation plus current task-role references, authority scopes, admission evidence and the current native review decision, if any |
| Changes | Named areas; paths from the persisted result, host-observed final task branch/commit, base admission commit and explicit clean/dirty working-tree state |
| Tests/evidence | Assessment plus persisted execution verification and exact current admission evidence IDs, versions, verdicts and references |
| Limits | Known limitations and residual risks |
| Continuation | Separate reproduce, continue and rollback instructions |
| Expected action | One explicit instruction and an `inspect`, `review`, `continue` or `decide` intent |

Source references must still resolve in the same workspace/application. The
result must have a durable prepared-or-later checkpoint, matching context pin,
verification material, an unfenced completed attempt, current roles and current
risk/procedure evidence. Legacy free text or incomplete result records remain
readable through existing views but cannot be promoted into a handoff by inference.

These references attest to **recorded reports and human evidence**. This API does
not inspect a Git repository or independently run tests. The server normalizes persisted command observations into indexed test
references with an execution ID and verification digest. An empty command list
is explicitly `not_recorded`, never passed. Unknown or malformed report shapes
cannot become handoff evidence. Completion accepts a strict `resultRevision`
(commit, task branch, clean/dirty state) from the lease holder. The API binds it
to a generated receipt ID, exact execution, attempt, host and checkpoint version;
arbitrary metadata cannot replace this field. The host reads Git HEAD and branch
after work and includes committed diff paths plus the final working-tree paths.
A dirty result explicitly contains changes outside the recorded commit. The
admission commit remains separately identified as `baseCommit`. New handoffs
require this typed receipt; old completions remain readable. The protocol requires
`typed_result_revision_v1` before this host may execute. These are host observations,
not independent artifact verification by the API.

## Authority and exact operations

The authenticated sender must match one of the five current RF-CTX-010 roles.
Human profiles normalize to their active workspace User membership; an agent
normalizes to its bound WorkforceEntity. An alias/profile cannot create a second
principal, receive its own handoff or bypass current revision, competence and
mandate checks. The recipient is an explicit current role principal, never a
free-text address or an automatically selected receiver.

`handoff_create`, `handoff_accept`, `handoff_reject` are separate native risk,
procedure-composition and suspension operations. Each needs its own current
evidence; approval of review or execution is not reused. Select the required
handoff procedure versions before completing the source execution. Existing
tasks with no handoff selections retain their previous risk/admission reference
representation on upgrade.

Credential-bound writes use the existing task capability ledger, expiry limit,
credential version, revocation, source hash and suspension checks. A creation
grant additionally binds sender role and exact recipient principal/role; a
decision grant binds recipient role and handoff ID. The immutable snapshot pins
the handoff source digest. Grant consumption and the business row commit in one
transaction; a deferred guard verifies the receipt, authority and source again.
The existing credential route allowlist adds only the handoff read/create/accept/
reject routes. It gains no host, task Submit, administrative or execution route.

## History, conflicts and safety

Writes use serializable task/source locking and unique request IDs. Identical
replays return the existing record only while authority, scope, operation and
time constraints remain current. Different content under a reused key conflicts.
Two recipients cannot decide, concurrent decisions cannot both commit, and one
grant cannot produce a second effect. Reconnecting a process does not reconstruct
or replay authority from text; all handoff and receipt state is durable.

A rejection uses `missing_section`, `conflicting_section`,
`insufficient_evidence` or `unclear_action`, a reason and at least one typed section.
Resubmission creates a new version with `supersedes`; the original content and
rejection remain intact. The same rejected version has at most one successor,
and resubmission retains its sender/recipient roles and principals.

Pending records become stale when pinned context, material, roles, evidence or
current execution changes. A result revision epoch prevents edit-and-revert from
reviving a pending handoff. Historical acceptance remains a receipt of the old
version, not permission to use changed material. Stale versions cannot receive a
late decision.

RF-SEC-004 inspects required content before persistence and again before reads,
including replay and source projections. Sensitive content blocks the operation;
safe audit incidents contain classifications and references, never the value.
Display labels alone may be masked. Raw logs, credentials and production records
do not belong in handoff text or examples.

## API and workbench

All routes are scoped under `/v1/agent-runtime/tasks/:id/handoffs`:

- `GET` returns source completeness, current role choices, permissions and a
  bounded history with a validated cursor.
- `POST` creates one version using `createHandoffSchema`.
- `POST /actions/accept` and `/actions/reject` record `decideHandoffSchema` with
  an exact handoff ID/version. The route and decision must agree.

The PL/EN task review workbench opens the handoff editor. Its source/recipient,
completeness and preview steps expose missing context and required fields before
recording. History shows source versions, expected recipient action, acceptance,
rejection and corrected successors. There is no separate task board.

## Verification and scope

Synthetic checks live in `scripts/task-handoff-contract.test.mjs`, the `typed
handoff` API tests, `scripts/task-handoff-ui.test.mjs` and the additive migration
preservation regression. They exercise required fields, exact sources/principals,
redaction, agent grants, single-use receipts, conflicts, staleness and durable
history. No test activates a real model or agent.

RF-CTX-013 remains partial at company scope: this contract covers native completed
execution handoffs. External channels, recipient invocation, automatic routing,
independent Git/test attestation and broader specialist conversations are outside
this implementation.
