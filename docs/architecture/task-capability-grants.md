# Task capability grants (RF-SEC-003)

[Native task risk assessment](native-task-risk.md) binds the prepared scope and joint
impact to Ready, execution admission and task capability grants. Classification
is followed by [level-specific native admission](native-risk-admission.md); neither activates execution.

[Serious-incident suspension](native-capability-suspension.md) independently denies
affected native operations and prevents old grants from reviving after restore.

Native agent review and [typed handoff](typed-work-handoff.md) commands require an explicit, durable, single-use grant in
addition to the verified [agent principal](agent-credential-principal.md), current
RF-CTX-010 roles and the [review contract](task-review-workflow.md). Human review
keeps its existing membership and role gates. Deployment issues no grants.

## Authority and scope

Only a current human workspace owner/admin may issue or revoke. The command
transaction rechecks membership. An agent, integration key or body-supplied actor
cannot administer grants. Issuing a grant does not assign a role or repair missing
context. It authorizes exactly one of:

- `review_decision`: the current agent verifier may record approve or reject.
- `return_to_executor`: the current agent manager may return the review correction.
- `create_specialist_task`: the current agent manager may create one dependent
  specialist draft under the existing correction and competency checks.
- `handoff_create`: one current agent sender role may record a typed handoff for
  an exact recipient principal and role.
- `handoff_accept` / `handoff_reject`: the exact agent recipient may decide receipt
  of the named handoff version. Each is a distinct operation and grant.

Handoff grants also pin `snapshot.handoff` (role and exact recipient or handoff ID)
and `handoffSourceVersion`. Consumption links to the handoff or its decision in
the existing one-effect receipt ledger. These operations do not run the receiver.

The immutable record binds workspace, agent, credential ID/version/class, task,
application, completed execution, operation, start, expiry, human issuer and reason.
There are no wildcard, multi-operation or cross-application grants. Application
scope is derived from exactly one current task-project/application link and must
match the completed execution. The client cannot override it or the acting agent.

Validity is at most one hour from issuance and cannot outlive the credential.
Future activation is supported within that window; start may be at most one minute
in the past to tolerate an in-flight request. Tasks must be `todo` or `in_progress`.
Blocked, done, archived, cancelled or context-fenced work is denied.

A database hash binds the current task, project/application revision and link,
execution material, current role profiles, credential lifecycle and issuer
membership. A changed scope requires a new grant. Task and role revisions and
Ready source invalidation preserve changes even when work is reopened or reverted.
Expiry and explicit revocation also deny access. No scheduler is needed to expire
authority: every admission computes current validity. Invalidated/expired records
are retained, not deleted or rewritten. Grants retain restrictive foreign keys
to their task, application, execution and credential so deletion cannot erase this
audit history.

## API

Routes below are relative to `/v1/agent-runtime/tasks/:id`.

| Route | Contract |
| --- | --- |
| GET `/capability-grants` | Human admin catalog of eligible exact operations/credentials, expectedVersion and history (50 rows, scoped nextCursor). |
| POST `/capability-grants` | requestId, expectedVersion, credentialId, operation, validFrom, validUntil, reason. Returns the durable grant; 201 first issue, 200 replay. |
| POST `/capability-grants/:grantId/actions/revoke` | requestId and reason; durable revocation, 200 first call/replay. |
| GET `/review` | Agent `grantAccess` gives operation-specific grant ID and status; human `canManageGrants` exposes administration access. |
| POST `/actions/review` | Agent must add grantId for `review_decision`. Human requests omit grantId. |
| POST `/actions/review-return` | Agent must add grantId matching the exact action. Human requests omit grantId. |

Strict schemas reject extra scope/actor fields. Schema failures return 400, missing
or forbidden identity 401/403, unknown workspace-scoped task/grant 404, and stale,
missing, consumed, wrong-scope or otherwise unusable authority 409. A serialization
conflict is retryable with the same command/requestId; refresh for changed context.
No raw credential or digest is returned. Reasons reject recognized credential
patterns; callers remain responsible for entering a redacted mandate.

## Transaction, audit and replay

Grant, revocation and use records are append-only. Each workspace request ID binds
its exact command input and actor. Identical issuance/revocation retries return
the safe current record; changed input conflicts. Business decisions/actions
reference their grant. One use receipt references exactly one decision or action.

The source fence, serializable transaction and grant/key locks serialize authority
changes with admission. A decision/action, its effects, use receipt and audit event
commit together or all roll back. Database insert guards require an active exact
grant; deferred constraints require its receipt and recheck authority/context after all
transaction effects before commit. The API transaction explicitly runs deferred
checks inside its callback before returning a business result; a failed final
check produces a safe 409 and no committed effect. For specialist
creation, admission precedes child/dependency effects, with child and dependency
references checked at commit. Creating the authorized dependency must not invalidate
the grant before that same command has been admitted.

A consumed grant cannot authorize a new command. An exact persisted command replay
returns the prior result with no second effect or use receipt, including after a
process restart. Replay still requires the same active principal/credential, valid
time, non-revoked grant, current roles and unchanged context after the original
command's own effects. Revoking a consumed grant stops replay while retaining the
original use. Status `consumed` describes historical use; revocation is shown
separately. A competing request may receive 409 and retry after the winner commits.

Audit retains human issuance/revocation separately from agent business use. Safe
labels, credential prefix, IDs, operation, validity and immutable reason are
visible; no secret material is copied into grant snapshots or events.

## Console, migration and release

The PL/EN **Review result → Task grants** panel is available to human owner/admin.
It displays the exact eligible agent/operation, application, time window, reason,
status, issuer, credential prefix, recorded use and revocation history. It supports
explicit issue/revoke, request retry, refresh, pagination and unsaved-change exit.

Migrations `20260908070000_task_capability_grants` and
`20260908070100_task_capability_effect_order`, followed by
`20260908070200_task_capability_commit_fence`, add records, nullable history links
and guards. They do not rewrite existing reviews, infer grants for old agent
commands, seed business data, reset a database or change credential material.
Existing history remains readable; old agent commands without a grant cannot
gain new authority or replay through the new write gate. Human retries retain
their request format.

Take and verify a private backup before deployment. Preserve secrets and volumes.
Prefer a forward fix. Before rolling back to a backend without grant enforcement,
revoke all bound agent credentials using the current governed lifecycle, or verify
there are none. Keep the additive schema and history; never use a down migration
or data reset as rollback.

RF-SEC-003 remains partial: this is the native review command boundary, not a
provider/OS/Git/network/tool or secrets broker, risk engine, automatic issuer,
reviewer invocation, routing system or release authority. No real agent execution
is needed to verify it. Production execution remains disabled and the host observe.

## Clarification operations

[Governed clarification](governed-task-clarification.md) adds `clarification_send` and `clarification_reply`. Grants pin exact sender/recipient roles, both linked task contexts, and exact send/reply/read action; replies and reads also pin thread/message. These operations alone may omit a completed execution. Consumption is linked by `clarification_entry_id`, with the same one-effect and deferred receipt guards.
