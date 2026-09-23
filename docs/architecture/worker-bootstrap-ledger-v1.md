# Durable Worker bootstrap ledger v1

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
