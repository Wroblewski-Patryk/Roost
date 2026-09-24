# Bootstrap ticket lifecycle persistence proposal

Owner amendment v46, 2026-09-24. One source-only integration atom after `b40ef604`.
Migration **82 is UNAPPLIED**. No DB, Docker, native SQL, network/DNS, key material,
signing, issuance, delivery, endpoints, default composition or activation.

`bootstrap_ticket_revocation_unavailable` stays **BLOCKED** in the canonical
authority source; `signed_current_decision_unavailable` is unchanged/out of scope.
RF-HOST-035 **PARTIAL**, production **BLOCKED**. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` are all **false**, including successful synthetic results.

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

The native proposal links root, transport generation/grant/history and issue
receipts by the same transaction ID, exact row digests and increasing fence
order. Deferred issue checks reject an incomplete binding. Before binding or
before the issue receipt there is no usable ticket. Any failure rolls back all
writes. Standalone v2 channel grants and later binding deny; historical standalone
v1 channel behavior remains unchanged. A separate READ ONLY transaction confirms
the complete current binding and exact latest receipt after COMMIT; false ACK,
unknown COMMIT or readback failure gives `reconciliation_required`, without retry.

Do not wire this proposal into the current bootstrap service or remove either
canonical blocker. Production completion/credential-source integration remains
unqualified; synthetic callbacks are not signatures, TLS or delivery evidence.

## Verification

**23/23 lifecycle results (8 added); 103/103 selected source/mocked results,
zero failures/skips.**
Server build, lint (338 routes / 45 route files) and diff check pass. Native SQL,
Prisma migration application and DB/COMMIT qualification were **not run**.

Source/mocked tests cover issue-time reservations, pre-consume recovery, 20-way
issue/reserve/consume competition and revoke in both lock orders, before-send zero
exchange, terminal unknown/reconcile, stale generation/fence, history/audit ABA,
rollback of state/Event/audit/fence, missing/changed guards and helpers, replica,
legacy denial, read purity, override rejection, and false/unknown COMMIT ACK.
Racing revocation uses the same CAS: if another write wins first, the stale revoke
command is rejected and must be freshly reviewed; the adapter never retries it.
Mocks serialize promises; they do not qualify PostgreSQL concurrency or DDL.
Network, DNS, process launch and private-key/signing APIs are trapped in tests.

Integrated tests use the actual shared channel writer with a transaction mock:
full issue/reserve/consume, pre-consume recovery with no fabricated attempt,
digest domains, verifier inputs, every write-phase rollback, verifier failure
after binding, false/unknown COMMIT, 20 concurrent admissions yielding one root
and one binding, missing/no-op dependencies, late binding, v1/override denial,
read purity and owner/issuer/lifecycle/channel/purpose/certificate/time drift.

**One recommended next atom:** separately authorize isolated native PostgreSQL
qualification of migration 82 and atomic v2 issue/channel binding with a synthetic
verifier. Qualify rollback, deferred COMMIT and concurrency; keep both canonical
blockers and all readiness flags unchanged. No production keys or activation.
Not started; this atom did not apply the migration or access a database.
