# Decision supersession, impact and reopening (RF-CTX-017)

The existing Decision register owns the statement and predecessor link. Native
`decision_revisions` preserves an immutable proposal, rationale, consequences,
exact conflicting provisions and the predecessor snapshot. A proposal has one
successor line (`supersedesId`, projected `supersededBy`); it never overwrites or
deletes the previous Decision. Independent proposals preserve other decisions.
Pending successors cannot be silently replaced or broadened.

## Declared conflict and computed impact

A current workspace owner records the exact old and new provisions and whether
they contradict, narrow or replace one another. Both quotes must occur in their
respective statements. The server validates that declaration; it does not infer
semantic conflicts with a model. Every proposal states why its scope is the
narrowest affected scope. A replacement's roots must already be downstream of
its predecessor. The UI starts from one task; the strict API accepts up to eight
existing task, application, project, procedure, context, resource or decision roots.
At least one affected native task is required to supply enforceable risk gates.

The traversal follows active canonical dependencies: `depends_on` and `requires`
from upstream to dependent, `blocks` and `review_correction` from blocker to
blocked work. Explicit application/project containment, current procedure
admission and matching Ready/risk source watches participate. Traversal is bounded
to 200 nodes and rejects unsupported, missing or cross-workspace nodes. An
application reached only as a task's context is displayed after traversal and
never expands impact to sibling tasks. Shared-workspace membership alone creates
no impact edge. Related grants, handoffs, open interview cases and risk gates are
listed against the computed tasks. Historical records remain immutable.

A versioned impact preview records the exact graph and source revisions. Editing
and reverting a source cannot restore an old preview: monotonic source heads
participate in its hash. Missing sources leave the recorded history readable,
while current impact and acceptance remain unavailable. The owner must explicitly
refresh the preview and repeat stale verification; preview refresh is not approval.

## Separate acceptance and revalidation

Acceptance is a separate command bound to the current preview. RF-CTX-018
[authority rules](delegated-decision-authority.md) reserve five domains and critical
risk for the primary owner, and admit ordinary decisions only under an exact
versioned mandate. Acceptance requires
`decision_supersede` evidence for every affected task under RF-SEC-002: applicable
procedure verification, high-risk independent review and owner mandate, and all
critical backup, restore and fresh owner-approval gates. Evidence binds the
pending proposal and exact preview. Existing expiry, independent reviewer,
workspace membership and current source checks remain enforced. This operation
uses the native applicable-procedure admission policy; it does not run a model,
execute a procedure, issue a tool grant or expand a mandate.

One serializable transaction records acceptance, accepts only the new Decision,
records exact task/decision effects, invalidates affected Ready/admission/grants,
and fences active or queued work through RF-CTX-006. Effective task context uses
the accepted successor; the predecessor stays readable. Affected handoff and
interview source versions require revalidation. No old Ready pin or consumed
grant is restored. Unrelated task state, active executions and authority remain
unchanged. Assignment, business status and mandate content are not expanded.

## Typed deferral and authoritative event delivery

Silence stays pending. A budget or infrastructure deferral records its explanation,
exact decision/interview target, scope and one reopening condition:

- Resource availability: an existing explicit scoped dependency on a resource,
  then confirmed availability and positive new or increased numeric capacity.
- Configuration change: an existing scoped dependency on a configuration record,
  then a changed structured configuration value; renaming the record is insufficient.
- Owner signal: a deliberate current-owner command with an explanation.
- Deadline: a future instant explicitly selected by the owner; the server rejects
  delivery before that instant.

A current owner delivers the event through the authenticated command. Resource
and configuration events bind a fresh server-derived revision, unchanged scoped
relationship and actual condition transition. Arbitrary `authoritative` flags,
foreign workspace records and stale evidence do not establish authority. This
slice has no scheduler, recurring polling, external notification or automatic
event delivery; even a due deadline needs explicit event delivery. Read operations
never create reminders. Reopening creates exactly one attention event and returns
the target to pending. It never answers a question or accepts a Decision.

For interviews, the deferral links the native immutable defer entry; reopening
applies only while that entry remains current. A typed deferral requires its
reopening event before a new answer. Native answering and separate
acceptance retain their own existing guards. Request keys bind actor and input;
changed retries conflict, repeats deduplicate, and SQL guards preserve these rules
across concurrency and process restarts.

## API and owner console

Under `/v1/decisions`:

- GET `/governance` and `/:id/governance`: bounded queue, history, sources, exact
  impact and current gates. Selected history can be opened outside the queue limit.
- POST `/governance/proposals`: immutable proposal and initial impact preview.
- POST `/:id/governance/actions`: `review_impact` or separately `accept`.
- POST `/deferrals`: typed decision/interview deferral.
- POST `/reopening-events`: verified, scoped reopening signal.

The existing Decisions workbench, dashboard attention, risk admission and interview
surfaces expose the PL/EN flow. Opening admission from a decision selects
`decision_supersede` explicitly. The owner sees lineage, exact conflict, affected
records, revalidation, deferral condition and event history before accepting.
Generic Decision edits cannot bypass governed history. Native redaction applies
to input, source/body projections, replay, shared events and safe error handling.

## Migration and verification

`20260908170000_decision_impact_reopening` adds history/effect/source-head tables,
exact-operation admission and guarded wrappers. It does not seed business data,
reset a database, modify applied migrations or replace credentials or volumes.
The migration preservation test compares existing users, keys, tasks, executions,
review history and 71 historical sanitizer incidents. Release requires the full
API suite, relevant UI suites, build/typecheck/lint, a fresh private backup with
archive verification, retained previous application image and production read-only
smoke. Additive history must be retained on application rollback; use a forward
fix for schema problems. Rollback does not reopen or erase accepted decisions.

Coverage is the native task/decision path. Company-wide semantic discovery,
hierarchy/HR authority, external event delivery and agent activation remain outside
this slice and must not be inferred from this contract.
