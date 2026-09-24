# Decision attestation: Prisma ports and blocked native qualification

## Owner amendment v54: native evidence and remaining incompatibility

The bounded native qualification **did not pass**. The final executed suite
reported **14/19 PASS, 5 FAIL, 0 skipped** (four failed subtests plus their
parent); the runner exited **1**. Cleanup independently **PASS**. This does not
qualify the complete attestation/attempt-seal contract or production authority.

One explicitly owned disposable PostgreSQL database received the full **83
migration chain**. All migration sources and Prisma schema remain unchanged;
the raw migration-chain SHA-256 was
`ee3af18849be5bd1ea882841c9c988cf5b73510a2c3a5753d96dd8079f386c45`.
Migration 83 was exercised only there and remains unapplied to existing and
production databases. Public synthetic fixtures used injected signer, verifier,
ticket-verifier, authentication and public-key-authorizer doubles. No real
private keys, credentials, signing, transport, provisioning or activation ran.
Accepted-source preparation temporarily suspends older decision-policy guards
for new synthetic rows and restores them before invoking the tested ports;
all migration-83 guards remain active. This does not qualify an acceptance UI
or endpoint, or production key provenance.

Observed native passes include additive legacy preservation and null-seed
denial; exact 111 trigger bindings, 14 function bodies and four helpers;
derived authority revision; attestation and terminal CAS with one winner among
20 commands each; revoke/supersede/reject and early-expire denial; deferred
COMMIT rejection; false/unknown acknowledgement and pre-COMMIT connection loss
with zero committed attestations; actual post-COMMIT response loss with one
immutable attestation and no retry; missing/mismatched/unavailable READ ONLY
readback; guard/helper tampering and restoration; origin/UTC/isolation/source
drift denial; receipt-deletion denial and read purity. Injected-verifier inspect
can observe a persisted attestation, but is **not** complete signed-decision
qualification and is not connected to canonical runtime.

Native execution exposed two port defects. Channel grant `record_digest` uses
native PostgreSQL JSONB text hashing from migration 81; it must be checked in
SQL, separately from the canonical attestation payload digest. That correction
was exercised in the final native run. Existing lifecycle events accept only
millisecond wire timestamps; the port incorrectly replaced these with six-digit
DB timestamps. The port now preserves `advanceTicketLifecycle` output for
reserve/consume. This second fix passed source tests but was **not rerun natively**.
New attestation/history records retain the exact six-digit DB clock.

The three seal-related subtests failed at `bootstrap_lifecycle_cas`: successful
seal, 20-way seal contention, and dispatch-in-start rejection remain unqualified.
Source inspection also identifies a second, unexecuted incompatibility:
migration 83 adds a BEFORE STATEMENT shared-fence increment before migration
82's existing BEFORE ROW increment, while migration 82 requires its `f - 1`
to equal the latest ticket receipt fence. Attestation/key/auth writes also
advance that shared fence without advancing the legacy ticket receipt. The
timestamp correction does not resolve this contract conflict. No guard was
weakened, no receipt was fabricated, and no earlier migration was edited.

The other failed subtest was key staging with a 200 ms setup margin; timing
under native load is a suspected fixture cause, not independently isolated.
An earlier attempt passed the full key lifecycle, but the
final run did not; repeatable qualification is not claimed. The fixture now
allows 10 seconds before overlap and waits until cutover. Its ticket verifier
compares signed record and identity rather than a transient operation ID;
revision assertions sort numeric database revisions rather than text aliases.
Rollback assertions now additionally require the injected failure to have
actually fired: the previous native PASS could merely be an earlier seal
denial. These final fixture hardenings were compiled, not rerun natively.
Positive expiry and the complete seal rollback matrix remain unqualified.

Cleanup removed the uniquely marked database, relay and helper processes;
no helper files were created. The original stopped Roost PostgreSQL container
was restored to stopped; unrelated containers, including Soar, were unchanged.
Fingerprints of all three existing accessible databases and 214 table/sequence
entries match before/after SHA-256
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.
No second database or further native attempt was started after cleanup.

Final source regression results: **194/194 PASS**, no skips, including 14 focused
Prisma-port results and timestamp/native-grant denial regressions. Server build,
lint, offline migration pins and scoped diff checks pass. Source tests cannot
replace the missing native evidence. RF-HOST-035 remains **PARTIAL**, full native
qualification and production **BLOCKED**, with `signed_current_decision_unavailable`
unchanged and all eight readiness flags below false.

Exactly one next recommendation, **not started**: explicitly authorize a bounded
compatibility repair for migration 83's shared-fence interaction with the existing
ticket lifecycle, preserving legacy anti-ABA checks and old migration sources,
then repeat the complete native matrix with fresh disposable-database authority.
This replaces the historical next-step recommendation below.

## Historical v53 source qualification

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
