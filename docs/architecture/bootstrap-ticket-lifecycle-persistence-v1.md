# Bootstrap ticket lifecycle persistence and qualification

Owner amendment v49, 2026-09-25. One isolated native reader/authority
qualification atom after `13cf3781`, using the unchanged 82-migration chain in one
owned disposable PostgreSQL 16 database. No production code, schema or migration
changes; no private keys/signing, credentials, issuance/delivery, HTTPS/DNS,
endpoints, default composition, provisioning or activation. Migration 82 remains
not deployed to an existing installation.

`bootstrap_ticket_revocation_unavailable` is **conditionally qualified with injected verification**
only when the explicit synthetic verifier and complete signed canonical evidence
succeed. Native qualification covers this projection/persistence boundary, not
real cryptography; the source-only qualification tag remains unchanged. Default/production composition stays **BLOCKED**;
`signed_current_decision_unavailable` is unchanged. RF-HOST-035 **PARTIAL**,
production **BLOCKED**. `implementationReady`, `executionSupported`, `pilotReady`,
`liveAdmissionAllowed`, `pilotExecutionAuthorized`, `pilotExecutionStarted`,
`transportQualified` and `launchAuthority` all remain **false**.

## Schema and ownership

`20260924010000_bootstrap_ticket_lifecycle/migration.sql` extends the existing
SQL-owned bootstrap schema. Prisma models/client are unchanged, as with the
existing bootstrap tables. All preceding 81 migration files are unchanged.

| Existing / new relation | Responsibility |
| --- | --- |
| `worker_bootstrap_tickets` | Sole ticket root. Nullable `lifecycle_identity` is a version partition, never a legacy default. New registrations require strict immutable v2 public payload metadata, explicit issued/not-before/expiry, owner/decision, purpose, lifecycle/issuer/channel bindings, generation and credential epoch. Partial unique indexes reserve both generations at issue. |
| Existing attempts/history/heads/audit | Sole execution ledger, unchanged identity and FKs. Consume creates the real attempt; dispatch/completion/terminal uncertainty append its existing history, advance the existing head and receive the existing audit. |
| `worker_bootstrap_lifecycle_events` | Append-only child of the root: issue, reserve, consume, revoke, expire, dispatch, complete, unknown, reconcile. CAS revision/digest, attempt/history references and transaction identity. No new head/state registry. |
| `worker_bootstrap_write_receipts` | Automatic child receipts for every root, attempt, history, head, audit and lifecycle-event write, with protected Event, row digest, writer transaction and shared fence revision. No admission state. |

The two old generation/predecessor CHECKs are wrapped conditionally: their exact
original expressions still govern NULL/version-1 rows. Explicit new metadata and
native guards govern the new partition. No old rows, data, FKs or generation
allocators are rewritten. New attempts have an explicit lifecycle version.
Pre-consume recovery names the exact terminal predecessor ticket/digest/history
and a **NULL attempt ID**; no dummy attempt is created. If it was consumed, the
existing predecessor attempt FK remains meaningful. Issue reads the highest root
generation under the shared fence; terminal tickets retain their reservation.
Failed transactions reserve nothing; committed unknown/revoked issues burn their
generation. Incomplete legacy in the same scope blocks a new issue.

The signed v2 public envelope includes the metadata except `ticketDigest`.
Strict v2 ingestion never upgrades a v1 payload or accepts extra override fields.
The acyclic digest order is planned snapshot -> ticket content -> signed envelope
-> channel grant. Each digest uses canonical `reviewDigest` over the object below:

| Digest | Exact domain and input |
| --- | --- |
| `channelDigest` | `{domain: 'worker-bootstrap-channel-plan-v2', snapshot}` |
| Verifier content digest | `{domain: 'worker-bootstrap-ticket-content-v2', payload}` |
| `ticketDigest` | `{domain: 'worker-bootstrap-ticket-envelope-v2', signed}` |

The strict planned snapshot includes its existing snapshot `recordDigest`, but
contains no ticket, grant, history or receipt digest. Signed lifecycle metadata
contains `channelDigest`, excludes `ticketDigest`; the grant binds the resulting
envelope digest. This supersedes v45's planned history-digest interpretation.

## Transactions and denial

The new factory `createPrismaTicketLifecycleStore` registers supplied public
records and applies strict ID/revision/fence commands. It creates no Prisma
client, signature or credential. Serializable transactions use the existing
`ready_source_fence`; native guards deny update/delete/truncate, enforce the
terminal state machine, and require deferred atomic links to the original
attempt ledger. Revoke/expiry before dispatch blocks exchange; after dispatch or
completion it records sticky `delivery_unknown`. Reconciliation closes an unknown
outcome without un-revoke, replaying attempt history, or claiming credential undo.

Readers verify **89 distinct trigger definitions and 7 helper definitions**,
including inherited source/lifecycle/issuer/channel writers, exact bindings,
function configuration, trigger mode and digest. Missing, disabled, rebound,
changed guards or replica mode deny. Receipt/Event verification and monotonic
fence/generation/history checks reject replay and source ABA. This does not claim
protection against a privileged full-database rollback or a malicious DB owner.

Inspection uses READ ONLY / RepeatableRead and never repairs or expires state.
Each mutation is followed by a fresh transaction proving its exact receipt/head.
A callback return or false COMMIT ACK is insufficient: uncertain commits/readback
produce `reconciliation_required`, with no automatic retry. The explicitly
synthetic protocol driver performs paired fresh reads before exchange and before
completion (12 reads over its successful sequence), then checks completion again.
Late authority loss produces `delivery_unknown`, never success.

## Issue/channel ordering and remaining qualification

`createPrismaTicketLifecycleStore` requires an explicit ticket signature verifier
and channel binder; missing dependencies deny before opening a write transaction.
There is **no default verifier or binder**. The verifier receives frozen exact
public payload, identity, time and both ticket digests in the fenced transaction.
Its contract requires Ed25519 verification of UTF-8
`worker-bootstrap-ticket-content-v2:<contentDigest>` against the exact current
issuer public key. Real cryptographic verification is not implemented or
qualified here; tests inject synthetic results and never sign or use private keys.
This seam supplies no signed-current-decision authority.

The concrete `createBootstrapV2ChannelBinding` reuses the existing channel grant
writer and canonical generations/history/head/audit. It creates no transaction
or second channel registry. One Serializable transaction holds the shared fence:
verify the strict ticket -> insert/reserve its root -> resolve the exact accepted
channel decision -> bind its planned snapshot -> reverify -> append issue and
receipt/Event/audit -> inspect the complete binding. It checks exact owner,
workspace, installation, host, issuer, purpose, generations, time and TLS profile.

The native guards link root, transport generation/grant/history and issue
receipts by the same transaction ID, exact row digests and increasing fence
order. Deferred issue checks reject an incomplete binding. Before binding or
before the issue receipt there is no usable ticket. Any failure rolls back all
writes. Standalone v2 channel grants and later binding deny; historical standalone
v1 channel behavior remains unchanged. A separate READ ONLY transaction confirms
the complete current binding and exact latest receipt after COMMIT; false ACK,
unknown COMMIT or readback failure gives `reconciliation_required`, without retry.

Do not wire this proposal into production or remove either canonical blocker
unconditionally; the source-only reader condition is defined below. Production completion/credential-source integration remains
unqualified; synthetic callbacks are not signatures, TLS or delivery evidence.

## Canonical revocation reader

`createCanonicalBootstrapAuthoritySource(clock, ticketVerifier)` now exposes
`inspectTicketRevocation` and delegates `ticketRevoked` to the same canonical
ledger reader used by lifecycle persistence. The dependency is explicitly tagged
`synthetic_canonical_ticket_revocation_verifier_v1`; there is no default verifier,
route or production composition. A successful synthetic result does not qualify
real cryptographic signatures or signed-current-decision authority.

The reader receives the source's already-bound transaction and original fence,
performs SELECTs only, and creates no transaction, cache, registry, repair, seed
or backfill. It checks strict root identity and envelope/content digests, complete
lifecycle/attempt/history/head/audit/Event/receipt evidence, generation high-water,
validity, sole current owner, installation/host lifecycle, issuer revision/public
key/epoch and original atomic channel binding. The verifier receives the exact
frozen signed envelope, digests and canonical public issuer evidence using the
same transaction object. Bound-mode/fence checks bracket the read and verifier;
unbound, released, changed or incomplete evidence fails closed.

| State | Reader behavior |
| --- | --- |
| `valid_not_revoked` | Complete current issued/reserved ticket within validity; boolean revocation is false. |
| `consumed` | Exact consumed/dispatched attempt binding, still current; phase remains explicit in `head`. |
| `completed` | Completion is readable; replay/admission is denied. |
| `terminal_revoked` | Sticky denial, including before consume with a null attempt ID. |
| `expired` | Explicit expiry or elapsed signed expiry, without a status write. |
| `terminal_unknown` | Reconciliation required, non-retryable; no admission. |
| `invalid_incomplete` | Missing root/history/proof, stale authority/key/channel, signature refusal or unavailable verifier; never interpreted as unrevoked. |

Terminal predecessor reads require their immutable original channel binding,
not a current old channel. Pre-consume recovery preserves `attemptId: null`;
consumed recovery preserves the exact real attempt. Neither path manufactures
an attempt or reopens old admission. Default authority keeps both blockers;
explicit complete source-only evidence may remove only the revocation blocker.
The decision method and production context still deny signed decision authority.

A separate explicitly synthetic boundary driver requires two fresh bound READ
ONLY reads before exchange and two before completion. Full projections, including
revision/digest/fence, must match within each pair and across exchange. Before-send
revoke/drift denies with zero exchange; after a possible commit any loss or change
returns `delivery_unknown`, reconciliation required, and no retry. Callbacks have
no defaults; this does not enable real delivery or completion.

## Verification

**v49: 13/13 native results (12 subtests plus parent), 126/126 source/mocked
results; build, lint and scoped diff checks pass.** The suite uses the real
`createCanonicalBootstrapAuthoritySource`, existing store and shared canonical
ledger reader. No substitute reader or mutation of production implementation was
used. Native states cover valid, consumed, completed, revoked, terminal unknown,
invalid/incomplete and missing root. Expiry is exercised with an injected clock
against the real persisted validity interval. Both pre-consume and consumed
terminal recovery retain their exact nullable attempt binding.

Twenty concurrent READ ONLY snapshots during an uncommitted fenced revoke all
observe the original revision/digest/fence; twenty fresh snapshots after commit
all observe the terminal revision and newer fence. The reader never converts
missing evidence into unrevoked. Paired fresh transactions before exchange and
completion require equal projections. Before-send revoke gives zero exchanges;
after-send revoke, reply loss or completion uncertainty gives non-retryable
`delivery_unknown` and reconciliation, with no repeated callback.

Status under READ ONLY/RepeatableRead and a bound Serializable transaction uses
the same Db object as its verifier and leaves table counts/digests unchanged.
Missing root/lifecycle events/attempt/history/head/audit/receipts/lifecycle audit/
issuer audit/channel evidence, stale owner/generation/lifecycle/issuer epoch/
channel/fence, verifier refusal/absence and caller overrides deny. One disabled
guard, one altered helper configuration and replica mode were checked and
restored; the previous exhaustive guard suite was not repeated. A fence change
inside a bound writer invalidates the proof and rolls back. Actual loss of a
revoke COMMIT response and separate post-commit readback failure each report
`reconciliation_required` once while independent reads find one committed result.

One fixture correction was needed: changing the physical generation column was
already rejected by a preserved SQL CHECK, so the reader-denial probe instead
corrupts lifecycle metadata in privileged disposable-only preparation. The full
suite was repeated in the same owned DB. The orchestration counter was corrected
to count the final attempt's COMMIT-response cut in addition to prior test cuts;
this never retries an admission/revoke callback. The running orchestrator retained
its old expected-one counter and exited 1 on that obsolete assertion after the
13/13 native pass; its `finally` cleanup independently reported PASS. The corrected
counter passed three offline checks (including a previous full-run cut); no extra
DB run was started. No migration or production correction occurred.

All 82 unchanged migrations were applied, with source chain SHA-256
`55595533bed30f24e40e724c1eb88be1ba27ad5323cc9f93f488acebd982ea4d`.
The owned DB/relay were removed and the listener closed. Fingerprints for the
three pre-existing connectable databases (214 tables/sequences) matched before
and after; the original Roost PostgreSQL stopped state and container inventory
were restored. Unrelated containers, images, volumes and networks were unchanged;
no external helper files/directories remained.

Earlier evidence remains scoped: v48 added ten reader source subtests (33/33
lifecycle results, 126/126 selected); v47 qualified atomic ingestion (17/17 native,
103/103 selected source), including eleven rollback phases, twenty concurrent
admissions, deferred/late COMMIT rejection and native guard fingerprints. None of
these results qualifies real signatures, delivery, production or launch authority.

**One recommended next atom:** source-only inventory, contract and denial model
for signed-current-decision authority over the existing decision revisions and
acceptances, including exact signature/owner/intent/fence dependencies. Keep its
blocker, absent default verifier and production gate until separate qualification.
Not started.
