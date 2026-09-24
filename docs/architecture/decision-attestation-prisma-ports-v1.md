# Decision attestation: concrete Prisma ports (unapplied)

Owner amendment v53 adds concrete, parameterized SQL ports on an explicitly
injected `Prisma.TransactionClient`. Migration 83 remains **UNAPPLIED**; all
83 migration sources and Prisma schema are unchanged. No database, Docker,
network, DNS, private keys, real signing, credentials, delivery or activation.

`createPrismaDecisionAttestationPorts` provides `projectCanonical`, constrained
`appendChildren`, and `readCommittedOperation`, plus source-only `execute` and
READ ONLY `inspect` orchestration. It requires an injected transaction runner;
it constructs no Prisma client, connection, transaction manager or runtime
composition. The runner must invoke each callback once, commit only after its
successful return, and provide a fresh client/snapshot for each transaction.
Uncertain outcomes before callback completion must throw
`AttestationCommitUnknown`; errors after completion are always reconciliation.

This is the native-row implementation of v52's persistence boundary, **not a
drop-in implementation of its synthetic `AttestationModelState` interface**.
The v51/v52 model remains a protocol oracle. Native projection retains real
authority rows and receipts instead of fabricating a synthetic journal, numeric
fence increment or snapshot-as-truth. No production consumer is connected.

## Canonical inputs and clock

Projection joins existing decision/revision/acceptance/impact-preview and owner
roots, existing ticket/channel/attempt histories, and migration 83 children.
The nullable root seed must equal 1; current authority revision is the checked,
contiguous append-only event chain and must equal the SQL helper result. Owner
membership must be unique and agree with the exact human acceptance. Missing
roots, legacy receipts, changed owner, conflicting intent, gaps, digest mismatch,
stale lifecycle/issuer/channel/policy, terminal ticket or replica mode deny.
Recovery additionally compares the predecessor ticket's exact canonical head.

The explicit source-only accepted revision format is
`body.ownerDecisionAttestation = { version: 'owner-decision-attestation-policy-v1',
revision, evidenceDigest, validFrom, expiresAt }`. `revision` is the policy
revision of this accepted decision, not a guessed global company-policy version.
`evidenceDigest` must hash the exact impact JSON selected by the acceptance's
`preview_id`. Validity is bounded by the accepted ticket/lifecycle interval.
This adds no root or mutable policy store; absent fields deny, and existing
decision routes are not changed to populate them. Company/source writes continue
to advance the shared fence and invalidate existing attestation authority.

The database clock is fetched as an exact six-fractional-digit UTC string.
The transaction must use UTC, origin replication mode and the required isolation;
nonconforming sessions deny without repairing configuration. New key/attestation/
history timestamps use that string; terminal and seal timestamps are generated
by SQL triggers. Acceptance times compare instants without dropping microseconds.
Auth time comes only from the explicitly injected authentication evidence port,
is checked against the exact acceptance/owner/policy and DB freshness clock, and
is receipt-bound. No caller can supply `committedAt`, audit, fence or derived
authority revision. SQL key/policy eligibility also checks database precision.

## Writes, transaction boundary and receipts

Write binding verifies guard/helper fingerprints and locks existing
`ready_source_fence` using `SELECT ... FOR UPDATE` in SERIALIZABLE READ WRITE.
Only one typed operation is allowed per bound client: public-key lifecycle,
owner-auth evidence, exact-acceptance attestation, terminal event, or attempt seal.
All identifiers and values are parameters; table/column names are fixed SQL.
There is no unsafe/raw-string SQL, root UPDATE, receipt INSERT or shadow registry.
Signer, verifier, ticket verifier, authentication and key-authorizer callbacks
are explicit, absent by default, and receive the same bound transaction. Sources
are reprojected after callbacks. Cryptographic qualification is not claimed.

The seal operation reserves an issued ticket when necessary, then inserts the
existing unique-ticket attempt with the attestation seal, its consumed history,
head and consume lifecycle event in the **same transaction**. It uses existing
record schemas and `advanceTicketLifecycle`; old lifecycle guards generate the
existing audit. Migration 83 adds the automatic Event/write-receipt children.
No dispatch API is exposed; the existing migration 83 guard rejects dispatch in
the start transaction. There is no send/provisioning callback.

After writing, full projection verifies all current row receipts. A separate
operation query resolves the inserted child/attempt ID (not a new operation
registry), its immutable mutation digest and writer XID. It checks each exact
row digest against its automatic receipt and protected Event, checks receipt
coverage and derives the operation's authority revision at its actual receipt
fence. It does not predict `fence + 1` or use XID ordering as revision ordering.
Key operations leave decision revision unchanged; auth/attest/terminal events
advance it; attempt lifecycle remains attached to the existing attestation.

After the injected write transaction returns, `execute` requires a **different
READ ONLY RepeatableRead transaction**, revalidates guards and rejoins the exact
immutable operation receipt. The receipt includes sorted row/Event/receipt IDs,
digests, actual fences, XID and recorded DB time. A row timestamp is not proof of
COMMIT. Absent, incomplete, changed or unreadable receipts, false success and
lost/unknown acknowledgements return `reconciliation_required`, `retryable=false`.
No callback retry occurs; an injected runner attempting a second write callback
is refused before binding. A lost actual commit leaves the immutable acceptance
or unique-ticket attempt consumed. With no provable commit, callers must honor
the nonretryable result until canonical reconciliation. Readback proves the
recorded mutation, not future authority; later source edits require fresh inspect.

Public digest domains added: `owner-decision-native-projection-v1`,
`owner-decision-sql-mutation-v1`, `owner-decision-sql-operation-rows-v1`.
They do not reinterpret the synthetic oracle or the ticket-v2 signing domains.

## Verification and remaining gate

**14/14 focused results and 187/187 selected source/mocked regression results
pass**, with no skips. Server TypeScript build, lint, unchanged migration/schema
comparison, offline migration fingerprints and scoped diff checks pass. The
default documentation context remains below 150,000 bytes. No native tests ran.

Source/mocked tests cover each port and key action, exact parameter binding,
DB timestamps, derived revision, audit coverage, atomic seal, rollback at each
write phase including final consume, false/lost/unknown ACK, missing/changed
readback, no retry, absent dependencies, stale sources and guard fingerprints,
read purity and 20 concurrent commands each for attest, seal and terminal.
Network/DNS/process/private-key/sign APIs are trapped. No native SQL syntax,
trigger ordering, actual COMMIT, real contention or crypto qualification follows
from these mocks.

The lower-level append port returns a prepared receipt inside the caller's
transaction; only `execute` adds the separate committed readback. A caller using
the raw ports must preserve that boundary and must not interpret an append return
as COMMIT success. Missing pre-migration source receipts deliberately block;
this atom does not backfill or adopt legacy authority.

`signed_current_decision_unavailable` remains unconditional in canonical runtime.
RF-HOST-035 **PARTIAL**, production **BLOCKED**. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` all remain false.

Exactly one recommended next atom, not started: native qualification of migration
83 and these ports in a separately authorized, owned disposable PostgreSQL
database with synthetic public records and injected signing/verifier doubles,
including actual trigger ordering, additive legacy behavior and post-COMMIT
readback. No production migration, private keys, delivery or activation.
