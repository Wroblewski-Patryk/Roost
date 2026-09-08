# Native task risk assessment (RF-SEC-001)

Native task preparation now requires a current, server-computed assessment.
The assessment covers the prepared task's native execution, result review and
manager correction operations. It grants no role, credential, capability,
execution, tool, Git, provider or release authority. [RF-SEC-002 native admission](native-risk-admission.md) supplies level-specific
evidence gates; production stays disabled/observe.

## Versioned assessment

`roost-native-risk-v1` defines seven mandatory dimensions: money, data, security,
availability, legal, reversibility and users. For every task in the canonical
group, the assessor records each dimension's low/medium/high/critical impact,
rationale and 1–10 current company-record evidence references. Records must have
substantive content, belong to the workspace and be company-wide or belong to
that task's application. The assessment also records uncertainty (none, bounded,
unverifiable), reasons, evidence and any unresolved contradictions. None is an
explicit evidence-backed assertion; it is never a default.

The API computes the maximum impact and the database independently checks the
result. The conservative cumulative rule first takes the maximum per dimension,
then adds one tier for 2–3 related tasks or two tiers for 4–50 tasks, capped at
critical. Bounded uncertainty adds another tier, also capped. The final result
is the maximum of these adjusted dimensions. These are ordinal impact tiers,
not an estimate of financial loss or a calibrated probability model. Even
related low-impact tasks require a joint rationale and cumulative assessment.

Unverifiable uncertainty and declared contradictions are retained as an
append-only Needs decision assessment with no admitting level. Missing fields,
duplicate tasks, stale evidence, incomplete group coverage or over-limit groups
cannot produce an admitting assessment. Unknown content never becomes low.
The deterministic validator checks structured consistency and evidence identity;
it does not independently establish the truth of prose or discover undeclared
semantic contradictions. An accountable human remains responsible for that review.

## Canonical group and window

Scope preparation stores the exact candidate contract, prompt and branch plus
the current task/application/component identity. Application must be the sole
current project link, and the component must be active with the supplied revision.
An optional explicit common release/change set references a current company
record belonging to that application; it is an explicit grouping reference,
not a release approval.

Group traversal uses only workspace-scoped canonical relationships:

- Native review actions link parent/root, correction and specialist descendants.
  Same-task corrections remain on the same task and are included in its source
  version. Lineage is traversed in both directions, including closed ancestors.
- Same application and architecture component, same application and canonical
  goal, or the same application's explicit release/change-set reference.
  For these relationships, pending/active tasks remain in the window regardless
  of age; terminal tasks remain for 30 days after their last update.

Traversal includes transitive relationships and stops at 51 IDs. More than 50
requires reconciliation rather than partial aggregation. A related task lacking
a prepared scope blocks joint assessment. Unrelated workspace tasks are not
aggregated. Relationships in unstructured prose, arbitrary external changes and
unspecified components cannot be inferred by this bounded detector.

## Sources, concurrency and admission

The [procedure composition](versioned-procedure-composition.md) references are also
part of the current risk source. Selecting different published contracts requires
a new assessment before evidence can admit the operation. Active accepted work
retains its pinned versions; publication alone does not upgrade it.

Prepared scopes and assessments are immutable versioned records. Assessment
history includes actor user ID, timestamp, algorithm, source version, each
member's scope version/ID, source revision and lineage IDs. Only a current human
owner/admin/member can prepare or assess; viewers read. Integration keys and
agent credentials gain no new write capability. No automatic assessor runs.

Scope preparation captures the same bounded context-loader read predicates used
by Ready, including missing collection members. Separate risk watches retain
selected evidence. Source changes increment durable per-task revisions; exact
reverts do not restore old assessment validity. Relevant group membership or
scope changes also alter the source hash. Existing source/admission fencing and
serializable transactions order writes, assessment, Submit, grants and execution.

The API's expectedVersion combines source version and latest assessment identity.
Every command uses a workspace request ID plus exact input/actor digest. Identical
replay reads durable results without a second record, including after restart;
changed reuse and stale/concurrent replacement fail with a conflict. Replay of
an assessment never represents a historical result as current. Assessments expire
after 24 hours; every admission rechecks the clock and current sources. There is
no background expiry job.

Submit validates the full execution contract, then requires the exact prepared
input and current assessment. Its Ready receipt/pin binds the assessment ID.
Queue, claim, recovery and active authority checks retain existing Ready fences.
Database guards also deny new execution admission without current risk. A relevant
change marks accepted work Needs revalidation through the existing active-stop
mechanism. Safe cancellation/failure and historical terminal evidence remain
available; historical material changes still invalidate review/grant hashes.

Task capability scope hashes include assessment identity and current risk source
version; grant snapshots name the assessment. Issuance and native review/manager
operation insert guards require current risk. An admitted correction may create
a specialist draft and then invalidate risk for subsequent work. Its existing
single-use receipt records the exact post-effect hash. An exact result replay is
allowed only under the existing credential/time/role gates and unchanged
post-effect hash; it cannot authorize another operation. New work requires a new
joint assessment. This preserves the atomic correction/receipt contract.

## API and console

Routes are relative to `/v1/agent-runtime/tasks/:id`:

| Route | Behavior |
| --- | --- |
| GET `/risk` | Human workspace view, current ID, source precondition, group/relation reasons, latest 20 assessments and up to 500 evidence choices with explicit truncation. |
| POST `/risk/scope` | requestId, expectedVersion, applicationId, candidate contract, optional prompt/baseBranch and explicit nullable releaseSet reference. Prepares and versions scope; does not accept Ready. |
| POST `/risk/assessments` | requestId, expectedVersion, exact group entries and jointRationale. Server computes the result; client final levels/actors/algorithms are rejected. |

Schema failures return 400, authentication/membership failures 401/403, unknown
workspace task 404, and changed scope/evidence or failed admission 409. Native
content redaction applies before persistence and to response projection. Audit
events contain actor, algorithm and technical references, not raw context bodies.

PL/EN **Prepare execution → Risk assessment** uses the existing task modal,
seven-dimension form, evidence choices, uncertainty, cumulative result, blockers,
related tasks and history. **Task grants → Risk assessment** opens the same view.
It supports read-only/error states, current-context refresh, request retry and
unsaved-change exit. Return to the task and explicitly Submit after assessment.

## Migration and validation

`20260908100000_native_task_risk` adds empty scope, assessment, revision and watch
tables with restrictive foreign keys, append-only guards and admission functions.
It does not rewrite existing business data, Ready history, incidents, credentials
or applied migrations; legacy missing assessments fail at new admission.

Tests cover each dimension/max, uncertainty, malformed input, evidence/source
staleness and revert, joint component/release grouping, unrelated tasks,
idempotency, concurrent writes, immutable records, Ready/source races, native
review/correction/grants, safe historical reporting and restart. The migration
preservation fixture applies the full forward chain over synthetic historical
tasks, executions, reviews, credentials and incidents. PL/EN browser tests cover
390/768/1440px, result, blocked, read-only, save and error states.

Before release, verify a private database backup and apply the additive migration
through the established deployment process. Keep secrets, flags and persistent
volumes unchanged. Prefer a forward fix; rollback to an older API would remove
the application-level risk boundary and needs a controlled disabled-runtime
assessment. Never drop the new history or reset a database as rollback.

RF-SEC-001 remains partial for the company-wide target: this is a bounded native
operation assessment, not RF-SEC-002 review/backup/owner-approval automation,
automatic risk discovery, a policy exception, a provider broker or activation.
