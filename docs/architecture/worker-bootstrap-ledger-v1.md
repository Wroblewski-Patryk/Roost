# Durable Worker bootstrap ledger v1

## Native qualification, owner amendment v33 (2026-09-23)

**DONE: 10/10 native PostgreSQL results (nine subtests and their parent), plus
86/86 selected source regressions; 96/96 results in total.** Build, lint and diff
checks pass. The full **78-migration** chain applied successfully in exactly one
owned disposable database. No migration needed a correction: all 78 committed
files, including the bootstrap migration, remain byte-for-byte unchanged.

The [native suite](../../src/tests/worker-bootstrap-native.test.ts) first checks
an explicit test-only database name, loopback URL, database owner and exact
ownership marker. It never defaults to an existing application database. Only
then does it create synthetic public authority fixture rows. Their resolver uses
the same transaction client and writer fence as the ledger. Fixture preparation
uses transaction-local replica mode solely for synthetic business references;
all adapter operations and constraint tests explicitly verify normal origin mode.
This qualifies persistence, not production governance/issuer/provisioning.

Evidence obtained against real PostgreSQL:

- First enrollment persists the signed ticket, peer/completion evidence, one head
  and an atomic Event/audit chain. Recovery from canonically revoked or expired
  credentials keeps previous history and binds the latest predecessor.
- Twenty simultaneous consumes of one ticket, and twenty distinct tickets for
  one generation, each produce exactly one winner. Twenty completion transactions
  append exactly one acknowledged history entry and audit. An uncertain original
  completion closes terminally; it does not release a second successful result.
- Real UNIQUE, FK and CHECK failures reject duplicate heads, mismatched head
  digests, invalid generations/states, absent owner/predecessor references,
  non-owner-reserved decisions and deletion of referenced history.
- Wrong owner, revoked host/installation, stale host/installation/issuer/channel
  epochs, expiry, replay and an older recovery predecessor fail closed.
- Injected faults after ticket/attempt/history/head/Event/audit writes and before
  commit prove atomic rollback. Dispatch and completion failures preserve no
  partial successful revision. Failed terminal writes retain a spent attempt and
  return `reconciliation_required`; later consume never sends again.
- A canonical authority writer actually holds the shared fence row lock. The
  competing consume is observed in PostgreSQL `pg_stat_activity` waiting on a
  lock, then denies after the revocation commits. Repeatable Read sees the same
  authority snapshot across a concurrently committed source change; a subsequent
  transaction sees and rejects the new generation.
- Status/inspection run with SQL `transaction_read_only=on`. Repeated and expired
  reads leave ledger, Events, audit and fence snapshots identical. Both an adapter
  write through `read` and a direct SQL write in READ ONLY mode fail.

No real credential was issued. Synthetic public authority and the simulated
ceremony are not real delivery. HTTPS, DNS, fetch and target-process APIs are
trapped with zero calls; database communication alone is permitted. No real
issuer secret, production source configuration, profile or model is loaded.

### Resource isolation and cleanup evidence

Docker was inventoried read-only before action. Only the existing, initially
stopped Roost PostgreSQL container was started. Soar containers, volumes and
networks were untouched. Before creating the test database, server-side logical
fingerprints covered all **three existing connectable databases, 214 application tables/sequences, public
schema definitions (columns/indexes/constraints/functions), catalog and roles**. Production row contents were never exported; only hashes/counts were
captured temporarily outside the repository.

The database used a new unique name and ownership comment. Cleanup revalidated
its name, OID, owner and marker against the original inventory, required zero
sessions, dropped only that database and confirmed absence. The owned loopback
relay and its verified children were stopped; its listener and process were
confirmed absent. All 17 enumerated temporary helper/evidence files and their
owned directory were deleted. No retained evidence roots were touched.

Before/after database fingerprints were identical, with combined SHA-256:
`ae26d6b122ce8fe93aea04281559aaf8abc781eb40930268d0fa8b7ebf8cbeb6`.
Container/image/volume/network inventory matched. Roost PostgreSQL was restored
to **exited**, Roost backend remained **exited**, and both Soar database/cache
containers remained **running** with unchanged identities and lifecycle stamps.
PostgreSQL's own start/stop timestamps necessarily reflect this authorized run;
the equality claim concerns logical database state and restored operational state.
**Cleanup PASS; no owned database, relay or temporary evidence directory remains.**

The bootstrap migration SHA-256 used in the 78-file chain was
`40d5d455f85863fa99d716bbabfe4354c34f352c75dcb3c9bbdeae2bc6f6f180`.
It has now been applied in the disposable qualification database only. Its original
source-only header below is historical; the migration file was not edited, and no
migration was applied to an existing Roost database.

### Remaining boundary and one next atom

Native ledger SQL, locking/isolation, rollback and read-only behavior are now
qualified within this synthetic authority fixture. Production canonical
`BootstrapAuthoritySource`, actual owner-ticket issuance, real credential delivery,
secure secret handling and freshness outside the database remain **PARTIAL**.
Privileged SQL mutation/whole-database rollback protection is not established.
Production, provisioning and execution remain **BLOCKED**. All six admission flags,
`transportQualified` and `launchAuthority` stay false; normal admission, endpoints
and default composition are unchanged.

**Exactly one recommended next atom:** source-only canonical
`BootstrapAuthoritySource` integration with existing owner/decision/host/
installation/credential/issuer records and synthetic fail-closed tests. Missing
canonical epochs or revocation facts must remain explicit blockers, never invented
or initialized as a side effect. No real issuance, provisioning or activation.
This next atom has not been started.

## Historical source-only design and v32 evidence

Owner amendment v32, 2026-09-23. **DONE for source-only adapter, additive schema
and transactional mocks: 13/13 adapter results, 86/86 selected source results.**
The migration is **UNAPPLIED**. Native database behavior and production authority
integration are PARTIAL; provisioning, production and execution remain BLOCKED.

This extends the [bootstrap/recovery contract](worker-bootstrap-admission-v1.md).
Ordinary transport admission, its store, HTTPS client, handoff coordinator and
credential requirements are unchanged. Bootstrap does not become a credential or
grant ordinary poll, ACK, status, rotation, provider, task or execution authority.

## Source boundary and authority dependency

The [Prisma transaction adapter](../../src/modules/api-keys/worker-bootstrap-store.ts)
uses parameterized SQL against five new migration-owned tables. It never constructs
a client, signer, socket, database, credential or target process. No generated
Prisma model/client change is needed for these bounded raw queries. The SQL
migration owns the tables; do not use schema push to synthesize or apply them.

Its mandatory `BootstrapAuthoritySource` supplies current public owner, workspace,
installation/host/issuer/channel bindings and epochs, canonical credential status
and high-water, signed current owner-reserved decision, and ticket revocation.
Each method receives the **same transaction client** used by the ledger. A future
production implementation must derive these facts from authoritative records,
share the canonical writer fence, enforce installation/host revocation, and never
accept caller assertions as current truth. That production source implementation,
ticket issuance and governance-to-source integration are **not implemented here**.
Missing dependencies or records deny; there is no fallback to the signed ticket
as current authority or to an active-credential placeholder.

The explicit qualification remains `synthetic_bootstrap_authority_v1` and
`synthetic_bootstrap_ledger_v1`. Marker strings are not security attestations or
permission to connect a production source. Tests inject synthetic public authority
fixtures, with no real issuer configuration, user session or business data.

## Public records and immutable bindings

The [strict persistence schemas](../../src/modules/api-keys/worker-bootstrap-persistence-contract.ts)
reject unknown properties and bound serialized record sizes. No proof buffer,
credential secret, authorization header, raw response or arbitrary caller payload
is persisted. Stored signatures, fingerprints, device-proof/record/response digests
and signed public peer observations are evidence, not bearer credentials.

| Table | Role and invariants |
| --- | --- |
| `worker_bootstrap_tickets` | Immutable signed ticket plus accepted owner-reserved decision snapshot. Unique ticket/digest, decision, request and target ID; exact binding digest, intended generation/epoch, predecessor and expiry. |
| `worker_bootstrap_attempts` | One immutable reservation per ticket and per workspace/host generation and credential epoch. Scoped FK to the ticket; predecessor FK binds the immediately previous generation of the same workspace/host. |
| `worker_bootstrap_history` | Append-only revision/digest/state chain for each attempt. Exact signed peer at dispatch and completion evidence at ACK; terminal blocked/unknown entries preserve prior evidence. |
| `worker_bootstrap_heads` | One current pointer per workspace/host, updated by compare-and-swap on previous history ID and digest. Composite FKs bind attempt, generation, epoch, revision, state and history digest. |
| `worker_bootstrap_audit` | One audit link for registration and each history entry, referencing the Event written in the same transaction. Event payload contains fixed public IDs, digest, state and false launch authority. |

Registration verifies the signed ticket against current authority and a fresh
signed owner decision; it does not reserve a generation or issue a credential.
Multiple distinct, valid tickets may target a currently empty generation, but only
one can reserve it. Decision/request/target reuse is rejected at registration.
Reservation rechecks all authority and consumes both watermarks atomically.

Workspace/host scope, installation, owner, issuer, channel, target, request and
decision stay immutable inside the signed ticket and attempt. Loaders compare
record digests and SQL projections against parsed payloads before use. New recovery
cannot lower installation/host/key/channel/certificate/high-water epochs, swap an
identity under the same epoch or change a leaf under the same certificate epoch.
The service and adapter share the same bootstrap authorization and peer checks.

## Canonical recovery, transactions and terminal outcomes

First enrollment requires both an absent ledger history and a canonical source
with no credential or credential high-water history. A missing head with existing
attempts is corruption, not an empty installation. A source high-water ahead of
the ledger is a conflict requiring reconciliation, not permission to skip epochs.

Recovery binds the actual latest head attempt, not a caller-selected predecessor.
It requires blocked/unknown history, or an acknowledged attempt whose exact
credential is now canonically revoked/expired. That source state is read, not
created by the adapter. Revoked host/installation still deny every new admission.
The predecessor, baseline credential, generation and high-water must match at
registration and again at reservation. A fresh owner decision, ticket, request
and credential target are mandatory; old IDs/generations cannot be resurrected.

Writes run in `Serializable` transactions with the existing canonical writer fence,
a ten-second transaction timeout and bounded wait. No serialization, uniqueness,
transport or commit error retries the callback. Registration, reservation and each
state transition include their Event and audit writes; failure rolls back all of
that transaction's writes, including the fence. A failed completion cannot leave
a success history without its audit.

Allowed transitions are consumed to dispatched/blocked/unknown, dispatched to
acknowledged/unknown, and acknowledged to unknown solely for uncertain late
release. Terminal blocked/unknown attempts cannot resume. Dispatch requires signed
peer evidence and current authority; ACK requires exact signed completion, the
same peer/attempt/request/ticket/target and current acknowledged credential state.
The service verifies the actual response Buffer digest before passing completion
to storage; storage independently validates its signed public envelope. Expiry
after asynchronous audit work rolls back dispatch/completion rather than accepting
a late successful write.

Terminal uncertainty may be recorded after revocation or expiry; this only closes
authority. If even that write fails, the service returns `reconciliation_required`.
The retained attempt still prevents a new consume. Lost transaction responses do
not authorize retry: the persisted ticket/attempt/head must be reconciled before
any fresh owner recovery. No background expiry mutation or delivery retry is added.

`read` uses Repeatable Read plus `SET TRANSACTION READ ONLY`; status/inspection do
not increment the fence, write history/audit/Event, renew expiry or change last-use
metadata. Attempting a write through a read callback fails. Stored expiry remains
historical evidence; merely reading an expired record cannot advance state.

## Additive and unapplied schema; limits of evidence

The new [migration](../../prisma/migrations/20260923190000_worker_bootstrap_ledger/migration.sql)
contains only CREATE TABLE/INDEX declarations inside a transaction. It adds five
tables and indexes with RESTRICT FKs, unique reservations/completions, chain and
state checks. There is no existing-table ALTER, data write/reset, credential change
or deletion. The previous 77 migration files are unchanged. The migration was not
applied and no DB/Docker/network command was run for this atom.

The [rollback-capable mock suite](../../src/tests/worker-bootstrap-prisma.test.ts)
executes the actual adapter's parameterized SQL shapes and simulates its uniqueness,
CAS and transactional rollback boundaries. It covers first enrollment, terminal
recovery, revoked infrastructure, wrong owner, expiry and stale epochs, 20 same-
ticket consumers, 20 tickets reserving one generation, 20 completion attempts,
replay/ABA, immutable bindings, missing heads, corrupted public records, read
purity and every registration/reservation/dispatch/completion/audit failure phase.
Failed terminal writes, late expiry, post-commit drift and fresh recovery are also
covered. Socket/HTTP/DNS/fetch/child-process APIs are trapped with zero calls; logs
contain no secrets. Build, lint and 86 source results pass.

These mocks **do not prove PostgreSQL execution, real locking, FK/CHECK enforcement,
SQL syntax acceptance, native isolation, or production authority-source freshness**.
Direct privileged SQL edits, rollback of the whole database and external side effects
are not protected by append discipline or unsigned local record digests. Full
production delivery, issuer storage and heap secret-erasure remain unqualified.

All six admission flags, `transportQualified` and `launchAuthority` remain false.
No default composition, endpoints, profiles, models, provisioning or activation.

**Exactly one recommended next atom:** native qualification of this ledger and
the new migration in an explicitly authorized isolated disposable database, using
synthetic authority sources and testing real SQL constraints/concurrency/rollback,
with cleanup evidence. Keep production authority and delivery unqualified; do not
activate endpoints or agents. This recommendation is not started by this atom.
