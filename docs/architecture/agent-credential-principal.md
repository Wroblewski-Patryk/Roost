# Agent credential principal binding (RF-GOV-014)

## Identity and supported commands

An agent credential is a hashed ApiKey bound permanently to exactly one existing
workspace-scoped WorkforceEntity ID. The worker must be active, have type agent
and not be a human login profile (`source=user`). Names, aliases, models,
runtime profile text, request bodies and headers never select the principal.
No human membership or owner session is created for an agent.

This credential class supports the native RF-CTX-014 review workflow. Its explicit
capabilities allow connection metadata, task/workforce reads, task review reads
and the two review/manager commands. A separate method/path allowlist rejects
other commands, host execution, Submit, key administration, MCP dispatch and
release operations even if another route uses the same capability. The current
supported agent interface for these commands is HTTP. Other service clients keep
their existing scoped integration behavior; their unbound keys cannot act as a
task verifier or manager. No installation credentials are automatically converted.

Authentication derives workspace and agent ID from the verified credential and
current database records. Inactive, revoked, expired or invalidly bound keys fail
closed. The review transaction rechecks credential identity, revision, expiry,
active worker and scopes under the existing source fence and key row lock. It
then resolves the exact accepted role, current profile revision, mandate,
competencies and independent authorship using RF-CTX-010. The key is identity,
not sufficient task authority. Native agent writes also require the exact
[RF-SEC-003 task capability grant](task-capability-grants.md). Humans retain the existing current membership and
exact linked role checks. Workspace ownership alone still cannot review.

## Lifecycle and retry

Only a current human workspace owner/admin can provision, rotate or revoke.
The same permission is rechecked inside the serializable command transaction.
The existing Workspace settings access panel exposes a PL/EN agent credential
subsection; integration key controls remain separate on that same surface.

| Endpoint | Input |
| --- | --- |
| GET `/v1/api-keys/agent-credentials` | Safe credential/agent catalog, capped at 500 each with truncation flag. |
| POST `/v1/api-keys/agent-credentials` | requestId, agentId, name, expiresAt. |
| POST `/v1/api-keys/:id/actions/rotate` | requestId, expectedVersion, expiresAt. |
| POST `/v1/api-keys/:id/actions/revoke` | requestId, expectedVersion. |

Expiry is mandatory, in the future and at most 366 days away. An active credential
slot is unique per agent, including an expired key until explicitly rotated or
revoked. Rotation atomically revokes the old row and creates a new credential ID
for the same agent. Revocation is permanent. Rebinding an existing row, extending
its expiry, replacing its digest/prefix/scopes or deleting its history is rejected
by database guards. A different agent requires an explicitly provisioned new key.

Disabling the workforce identity or changing its source, external/runtime identity,
or type revokes its keys and emits secret-free invalidation events.
An ID/workspace move is prohibited once any credential history exists.
Reactivating the worker does not revive those credentials. Role/skill/mandate
changes retain the credential identity but invalidate task authority through the
existing role/context rules. Names and ordinary display edits grant no authority.

Commands persist an append-only AgentCredentialOperation in the same transaction.
Workspace request IDs bind action, target, input and human administrator. Identical
retries return the current safe record with `replayed=true`; changed input conflicts.
Concurrent commands have at most one committed winner and otherwise require a
fresh version/retry. Durable receipts support process restarts.

Raw material is generated in memory, stored only as a digest and returned once
on successful creation/rotation. A replay returns `key=null`; it cannot recover
a lost first response. The UI explains this and offers explicit rotation. It
retains the request ID after a connection error, shows the secret only in the
one-time dialog and never persists it in browser storage. List, event and receipt
responses contain no raw key or digest. Last use does not change the lifecycle
version. Current expiry/status, safe prefix, agent label/ID and last use are visible.

## Review audit

TaskReviewDecision and TaskReviewAction retain either actorUserId or actorAgentId
with actorCredentialId and actorCredentialPrefix. A database check forbids mixed
or absent attribution. The review guard validates the current credential against
the exact workforce role and rejects author/self-review. Agent events use
`actorType=agent` and the bound workforce ID, never the owner or credential ID as
the agent. Credential ID/prefix remain separate audit evidence. Human creation of
a credential is correctly attributed to its administrator, not to the new agent.

Reviewed material, decisions/actions and lifecycle receipts remain immutable.
Rotation or revocation never rewrites past actors or evidence. A new credential
cannot replay an old credential's review request as its own action. The read view
retains the prior decision and credential prefix. Human request hashes retain
their existing format so deployment does not invalidate prior human retries.

## Migration and rollback

Migrations `20260908060000_agent_credential_principal` and
`20260908060100_agent_principal_workspace` add nullable binding/expiry/
revocation fields, lifecycle version/receipts, review actor fields and guards.
They change no existing credential material, scopes, active states, users, tasks
or evidence. Existing human actors remain human; no identity is guessed or seeded.
The structural upgrade fixture preserves legacy credential columns and human
review evidence. Empty-database API tests also run the full migration chain.

Take a verified private backup before deployment and preserve the database volume
and hashing/authentication secrets. Prefer a forward fix. An older backend does
not enforce this credential class: before rolling back to it, revoke every bound
credential with the current governed command, or verify there are none. Retain
the additive schema and audit records; do not reverse migrations or reset data.

## Verification and remaining boundary

Focused schema/route tests and API/DB regression cover exact agents, spoofed
fields/headers, foreign workspaces, legacy keys, inactive/expired keys, identity
changes, rotation/revocation, current role authority, audit, concurrency and
restart replay. Browser checks cover PL/EN loading, empty, error, status, creation,
rotation, revocation, secret delivery/replay, keyboard closure and responsive UI.

RF-GOV-014 remains partial for the full agent company: this supplies a governed
principal for native review commands, not per-agent migration of every legacy
integration/host command or a general capability broker beyond the native task review grants. No agents
are provisioned or activated on deployment. Provider calls, automatic reviewers,
hierarchical routing, HR/certification, merge/push/release and other applications
remain outside this change. Production execution remains disabled; host observe.
