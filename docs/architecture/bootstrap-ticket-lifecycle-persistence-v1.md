# Bootstrap ticket lifecycle persistence proposal

Owner amendment v45, 2026-09-24. One source-only atom after `d899883d`.
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

The signed v2 public envelope includes the metadata except `ticketDigest`; the
digest binds that signed envelope externally, avoiding a circular digest. It is
a strict new persistence shape, not reinterpretation of a signed v1 ticket or a
cryptographic signature verifier. `channelDigest` binds the planned immutable
channel history record, not a caller-supplied revocation boolean.

## Transactions and denial

The new factory `createPrismaTicketLifecycleStore` registers supplied public
records and applies strict ID/revision/fence commands. It creates no Prisma
client, signature or credential. Serializable transactions use the existing
`ready_source_fence`; native guards deny update/delete/truncate, enforce the
terminal state machine, and require deferred atomic links to the original
attempt ledger. Revoke/expiry before dispatch blocks exchange; after dispatch or
completion it records sticky `delivery_unknown`. Reconciliation closes an unknown
outcome without un-revoke, replaying attempt history, or claiming credential undo.

Readers verify **89 distinct trigger definitions and 6 helper definitions**,
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

Channel grants require a root ticket. Issue therefore checks owner/lifecycle/
issuer anchors and reserves the immutable planned channel binding first. A
successful issue ACK confirms that reservation, **not** usable admission. Without
an exact current ticket-bound grant, inspect returns `usable: false`.

A trusted transaction-scoped binder seam can insert the corresponding channel
binding after the root and before the issue receipt, in the same transaction.
There is **no default binder**. A separate later channel write invalidates the
issue fence; status cannot refresh it. Existing channel and signature readers
still accept v1 tickets; their v2 ingestion/composition is not implemented here.
Do not wire this proposal into the current bootstrap service or remove either
canonical blocker. Production completion/credential-source integration remains
unqualified; synthetic callbacks are not signatures, TLS or delivery evidence.

## Verification

**15/15 new results; 95/95 selected source/mocked results, zero failures/skips.**
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

**One recommended next atom:** source-only v2 ticket ingestion and atomic
issue/channel-binding integration using the existing channel store, with tests
for the complete ordering and denial path. Keep migration 82 unapplied and both
canonical blockers active; no signed-current-decision authority or activation.
Not started. Native migration/COMMIT qualification remains a later gate.
