# Owner-controlled Worker credential lifecycle v1

Owner amendment v22, 2026-09-23. **DONE: source contract and synthetic service,
HTTP/auth and persistence-model qualification (55 new tests, 118 regressions).
PARTIAL: native persistence. BLOCKED: real provisioning and secure delivery.**
The additive migration is not applied. No database, Docker, production connection,
Worker, provider or model is started. All six activation/readiness flags stay false.
The v21 native result qualifies its earlier 74-migration code/schema only.

## Existing components and closed default composition

This extends `ApiKey`, registered `AgentHost`, governed decision revisions,
`agent_credential_operations`, Events, the existing Ready fence and ticket/claim
recovery. There is no second credential system, service, database or activation
switch. New routes on the existing API-key router are:

| POST route | Required authority | Synthetic effect |
| --- | --- | --- |
| `/v1/api-keys/worker-credentials/enroll` | Fresh current primary owner + exact accepted decision | First generation, or a new generation after terminal revocation |
| `/v1/api-keys/worker-credentials/rotate` | Same authority + exact current generation | Atomic revoke, invalidation, new generation and audit |
| `/v1/api-keys/worker-credentials/revoke` | Same authority + exact current generation | Terminal revoke and invalidation; no replacement |

All return `Cache-Control: no-store`. The application mounts the real service and
Prisma adapter with **no generator, hasher or delivery dependency**. All three
commands are unavailable to an otherwise eligible owner. Other actors are denied.
The only injectable delivery contract in this slice is `synthetic_memory_only`;
its in-memory test generator is never installed in application composition.
No environment switch or automatic secret generation is introduced.

## Fresh primary-owner decision

The signed human token carries `authTime` from password authentication or initial
account/invitation authentication. The command requires an integer timestamp no
more than five minutes old, not in the future. Workspace creation/selection keeps
the original authentication time; it cannot turn an old session into fresh proof.
Legacy tokens without that field remain valid for ordinary existing routes but
cannot operate this lifecycle until the user logs in again. Request JSON and
headers cannot supply or replace the timestamp.

Inside the Serializable transaction, the service rereads the current primary
owner and owner membership. Additional owners, admins, members, delegated actors,
agents, Workers and generic API keys cannot enroll, rotate or revoke.

The existing governed proposal accepts a strict `workerCredential` declaration.
It cannot also declare delegated authority. Acceptance is owner-reserved and must
be accepted by the current primary human owner, with an exact decision ID/revision,
current accepted state and no accepted successor. Its declaration binds:

- Action, workspace, installation and registered host.
- Expected credential ID/version/epoch/fingerprint (all empty/zero only initially).
- Exact new expiry, or null for revocation; `validUntil` for the decision.

The command repeats that exact declaration with a request ID and explicit
acceptance. Matching an unrelated accepted decision does not authorize a change.
New credential expiry must be future and at most 30 days from the command.
No approval is inferred from host registration, scopes or a profile label.

## Generation, scope and irreversible revocation

Credentials remain hashed-only `ApiKey` rows. Each generation has an immutable
workspace/installation/host, increasing host binding epoch, authentication hash,
domain-separated fingerprint, credential version and expiry. The public prefix
is a fixed class label, not a fragment of the synthetic secret. The existing
append-only operation ledger records owner identity, accepted decision/revision,
exact intent and resulting generation; rotation retains the prior ID in intent.

One active generation per workspace/host is enforced by the existing unique
index. Enrollment cannot replace an active generation. Rotation revokes the old
row and creates a new row; revocation increments its version. Revoked generations
are never edited back to active. Explicit reenrollment after revocation creates a
new row and higher epoch. Concurrent changes carry the same exact generation
precondition, so only one succeeds. Database conflicts are bounded denials with
no automatic transaction or generator retry.

The sole stored scope is `agent-runtime:claim`. Because that shared capability
also covers other legacy routes, bound Worker middleware additionally permits
exactly POST claim, ticket consume and ticket status. Registration, heartbeat,
recovery, owner/decision/ticket issuance, provider and release routes are denied.
This is a bounded credential contract, not sufficient authority for a full
production Worker loop. Ordinary unbound/agent credential behavior remains its
separate existing contract; generic key activation cannot edit bound Worker rows.

Authentication checks the current credential and registered host. Claim additionally
rereads credential/version/epoch/fingerprint, installation head and assigned host
inside the Ready transaction, before ownership changes. Host disable/reassignment
revokes bound generations under the new native trigger. Deletion remains restricted
by retained credential history. The existing ticket-key guard already forbids
installation identity transfer. None of these changes silently transfers a key.

## Atomic invalidation and recovery

The new forward migration adds guards/functions/indexes to existing tables only.
Revocation and rotation invalidate unused tickets for the old credential and
fence active claimed/running/waiting executions on that host. Existing journal
triggers record ticket revocations. Consumed tickets remain spent. Execution
attempts, checkpoint and original lease identity remain intact; cancellation and
context invalidation block reuse and require explicit owner reconciliation.
No process is presumed stopped and no replacement is started automatically.

The credential transition, invalidation, replacement and owner audit share one
transaction. An error after any step rolls back all model state. The native
adapter uses Serializable isolation and the existing Ready fence. Its SQL guards,
real concurrency and interaction with native recovery still need PostgreSQL
qualification; in-memory rollback is not evidence that the migration works.

## One-time synthetic response and disclosure limits

Only the first successful committed enrollment/rotation calls the injected
synthetic delivery function. Request replay returns safe historical metadata and
`key: null`; revoke also returns no key. A reused request ID with changed payload
is rejected. The same accepted decision cannot authorize another operation.
If delivery fails after commit, the generation remains durable and the failure is
bounded; replay never reveals the lost secret. A new explicit rotation is needed.

Raw test material exists only in ephemeral buffers and the bounded first synthetic
HTTP response. Buffers returned by the generator are overwritten after use. There
is no promise of production secret protection or heap-copy erasure. Persistence,
audit, status and error projections contain no raw key; unexpected exceptions are
replaced by fixed error codes. No real secret storage or secure transmission is
implemented. Synthetic success still has real provisioning, transport and launch
qualification false, with no launch receipt.

## Evidence and remaining qualification

**173/173 tests PASS**: 55 new lifecycle cases and 118 ticket/provider/redaction/
decision-authority regressions. Service tests use a rollback-capable serialized
model of existing tables. Loopback HTTP uses real handlers, signed tokens and
API-key middleware with synthetic credential storage; claim probes use the real
claim guard. Ticket consume/status authentication probes are separate from the
existing real ticket-service synthetic tests. Prisma adapter decisions and
transaction options are tested with a mock database, not a PostgreSQL engine.

Tests cover owner enrollment/rotation/revocation, denied principals and stale
authentication/decisions, host/installation/workspace drift, duplicate enrollment,
20-way enrollment/rotation and both rotate/revoke orders, one-time replay,
version/epoch/fingerprint drift, revocation/expiry, complete rollback at each
mutation, lost delivery, bounded errors, no raw material in persisted/audit state,
and no target process effect. Target process APIs are forbidden in the positive
scenario. TypeScript build, route lint and documentation checks pass.

The [additive migration](../../prisma/migrations/20260923130000_worker_credential_lifecycle/migration.sql)
is reviewed but **unexecuted**. Prior migration files and Prisma table layout are
unchanged. No full API suite, database/Docker operation, TLS test, private profile,
model store, retained root, push or deploy is touched. Eight pre-existing dirty
documents and the unread design artifact are preserved.

**Exactly one proposed next atom:** qualify this forward migration and the native
owner-decision/auth/credential lifecycle, atomic ticket/claim invalidation,
concurrency and rollback on an explicitly authorized owned disposable PostgreSQL
database, using only synthetic keys/evidence and full preservation/cleanup audits.
No real provisioning, secure delivery/TLS claim, Worker/provider launch or activation.
Stop after that database qualification.
