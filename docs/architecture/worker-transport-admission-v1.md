# Production Worker transport admission v1 — contract and persistence

Owner amendment v31: [bootstrap/recovery admission](worker-bootstrap-admission-v1.md)
is **DONE as a source-only contract/model: 16/16 results, 73/73 source regressions**.
A separate current-owner ticket admits one first enrollment or terminal recovery;
ordinary poll/ACK/status/rotation retain their existing credential requirements.
Exact bindings, burned generations, replay, expiry/cutover and post-commit unknown
are enforced synthetically. No native persistence, network, provisioning or default
composition; all admission flags false. Durable issuer/delivery integration is
PARTIAL and production BLOCKED. Exactly one proposed next atom: a source-only
bootstrap ledger adapter and additive unapplied schema with mocked transaction
validation. Earlier successor proposals below are historical.

Owner amendment v30: [persisted admission/HTTPS coordinator](worker-handoff-coordinator-v1.md)
is **DONE for source-only integration: 11/11 results, 57/57 source regressions**.
Immutable snapshots are the only configuration source; inspection, pre-body peer
recheck and signed operation/response completion reject drift and stale pins.
Concurrent/replayed completion, uncertainty, read-only status and buffer wiping
are qualified with an injected synthetic exchange on the existing HTTPS client.
No persistence/migration change, real network/DB/Docker or activation; flags false.
Real exchange remains PARTIAL and production BLOCKED. Integration exposes an
active-credential prerequisite that blocks first enrollment and rotation recovery.
Exactly one proposed next atom: a source-only bootstrap/recovery admission contract
and synthetic validation resolving that cycle without relaxing owner/host bindings.
Earlier successor proposals below are historical.

Owner amendment v29, 2026-09-23. **DONE: bounded native PostgreSQL persistence
qualification, 9/9 results and 55/55 selected native/source results.** The 77-file
migration chain was applied only in one owned disposable synthetic database.
The new migration's first attempt failed and rolled back: PostgreSQL required
parentheses around seven nested JSON projections before subtraction of allowed
keys. Only this never-applied migration was corrected, then applied successfully;
the preceding 76 migrations remain unchanged. No default composition or production
database deployment; all six admission flags plus `transportQualified` stay false.
The v28 UNAPPLIED status below is historical, not a claim that production was migrated.

## Native persistence qualification (v29)

The [native suite](../../src/tests/worker-transport-native.test.ts) runs the real
Prisma adapter and production state machine on PostgreSQL. It verifies create,
stage, cutover, revoke and fresh readmission, including a replacement installation
and credential with one workspace/host head and preserved earlier generations.
Five batches of **20 real transactions** each (create/stage/cutover/revoke/readmit)
produce exactly one commit per expected head and bounded `revision_changed`
conflicts for the others. No duplicate head/history revision is committed.

Fault injection after generation/history/head create or update/Event/audit and
immediately before commit leaves complete persistent snapshots identical. Native
FK/unique/CHECK probes reject duplicate heads, mismatched digest/history/Event,
invalid predecessor, terminal generation reuse, skipped/zero high-water and
unknown secret-like JSON keys. Separate service tests deny replay, stale
revision/digest, reused pins/epochs, revoked resurrection and authoritative source
drift. Old history is unchanged during all normal transitions.

Inspect/complete use real RepeatableRead transactions. The test harness additionally
executes `SET TRANSACTION READ ONLY` and confirms `transaction_read_only=on`;
operations succeed without touching heads/history/generations/audit/Event, the
Ready fence or credential expiry/last-used fields. Expired inspection also leaves
the snapshot unchanged. Completion after revoke returns `delivery_unknown`.

Canonical source preconditions are synthetic fixtures, created only after exact
database-name/owner/comment checks. Fixture preparation uses transaction-local
`session_replication_role=replica` for existing owner/credential/handoff/decision
rows; it never applies to adapter or tamper transactions, which assert `origin`.
This deliberately does **not** requalify full governed-decision or credential
handoff acceptance workflows. Their existing source rows are read through the
real adapter and decision projections are signed with ephemeral in-memory keys.
No application seed, backend, endpoint, TLS/DNS/provisioning or Worker/provider/
model process is run. Only the database harness uses local PostgreSQL transport;
all non-database network/socket/DNS/fetch/process effects are trapped at zero.

Privileged SQL immutability and whole-database rollback remain outside this
contract. A deliberate signature UPDATE succeeds inside an always-rolled-back
probe, demonstrating that append-only history is an adapter guarantee, not a
database-superuser security boundary. Production provisioning, independent
freshness/monotonicity, secure issuer/key storage and execution remain BLOCKED.

Cleanup **PASS**: Prisma and the owned database relay are closed, with no child
connections. Exact owned database name/OID/owner/comment and zero sessions were
verified before DROP; its absence was verified afterward. Baseline/after logical
fingerprints match for all three pre-existing databases and 214 tables/sequences,
including schema/function/constraint/index/catalog/role metadata. Container IDs,
images, mounts, volumes and networks match. Only the existing Roost PostgreSQL
container was started and is now exited; backend remained exited and Soar
PostgreSQL/Redis remained running and unchanged. An interrupted final fingerprint
was repeated to completion before the final stop; no database was recreated.
No container/image/volume/role was created or removed. External harness evidence
retains only local synthetic results and logical fingerprints; no private data is
copied into repository evidence.

**Exactly one proposed next atom:** a source-only adapter connecting persisted
admission inspection/completion to the existing HTTPS handoff boundary, with
synthetic fail-closed integration tests. Keep default composition absent and all
flags false; no endpoint contact, provisioning or activation. Earlier proposed
successors below are historical.

Owner amendment v28, 2026-09-23. **DONE: source-only Prisma adapter and
synthetic transaction qualification (10/10 results; 46/46 selected source
regressions). Migration UNAPPLIED. PARTIAL: native persistence qualification.
BLOCKED: production transport and execution.** Default composition remains
absent and all six admission flags plus `transportQualified` remain false.
No database/Docker, endpoint, TLS/DNS provisioning or Worker/provider/model
activation is part of this atom. Earlier successor proposals are historical.

Owner amendment v27, 2026-09-23. **DONE for schema, authority and state-machine
qualification: 9/9 results (eight scenarios plus parent), 36/36 selected source
tests. PARTIAL: persistence. BLOCKED: production use.** This extends the existing
[handoff](worker-credential-lifecycle-v1.md), [HTTPS adapter](worker-handoff-https-v1.md)
and primary-owner decision system. It is not a new PKI, proxy or configuration
service. No production endpoint, DNS, CA, database, Docker or deployment is used.

## Existing authority and exact record

`workerTransport` is a strict optional declaration in the existing governed
decision proposal. It cannot coexist with delegated `authority` or a credential
lifecycle declaration. Resolution reserves it to the current primary owner.
The [service](../../src/modules/api-keys/worker-transport.service.ts) separately
requires current primary ownership/membership, a user authentication time no more
than five minutes old, and exact accepted decision ID, revision, owner and intent
digest. Old/expired/revoked decisions and changed intent are denied. Issuer-signed
decision evidence is mandatory; a caller's JSON assertion is insufficient.

The versioned signed record binds:

- Workspace, installation, registered host and host fingerprint.
- Credential ID, version, binding epoch and fingerprint; current active status is
  read separately. Server ticket key ID, epoch and public-key digest are also bound.
- Exact lowercase DNS HTTPS origin with **explicit port**, including `:443`, and
  matching SNI/TLS server hostname. No URL credentials, path, query or fragment.
- Leaf certificate SHA-256 over DER, validity interval and hostname; public CA
  digest and `owner_approved_ca_digest` trust mode. No private key or certificate
  provisioning payload is accepted.
- Current certificate epoch, reserved high-water epoch, record revision, current
  owner decision/revision/digest, approval time, expiry and unique command ID.
- Optional staged next certificate/epoch and owner-approved evidence, overlap,
  cutover and expiry; fixed no-proxy/no-redirect/no-downgrade and resolver policy.

The production profile intentionally preserves explicit `:443`; it is not passed
to the loopback adapter by silently normalizing or converting its profile. That
adapter still accepts only its separate loopback qualification state.

## Out-of-band bootstrap

The minimal bootstrap flow presents the exact workspace/installation/host,
credential/ticket epochs, origin/SNI/port, CA digest, leaf fingerprint and validity
to a freshly authenticated primary owner. The owner compares the fingerprint
through an independently obtained channel, records its evidence digest and accepts
the exact governed decision. The trusted issuer public key must also come from an
already approved independent installation context, not that untrusted endpoint.

`owner_out_of_band` evidence is required for the initial and staged certificate.
Endpoint-only discovery, self-asserted TLS evidence and trust-on-first-use are
denied. This records an explicit owner attestation; it does not implement or prove
the external verification channel. No external bootstrap UX or channel is built.

## DNS and peer evidence

The first profile is deliberately **public IPv4 only**. Literal-IP origins,
single-label/local hostnames, private, loopback, link-local, shared-address,
documentation, benchmarking, multicast and reserved IPv4 candidates deny. All
IPv6 candidates deny until a separate policy is qualified. There is no generic
DNS override. Public test address strings are evidence values, never contacted.

An issuer-signed observation binds the exact identity, origin, SNI, chosen peer,
complete bounded candidate set (1–16), certificate pin/validity, CA digest and
normal chain/hostname-validation results. Its lifetime and maximum age are
30 seconds. Every candidate must be allowed and the actual peer must belong to
that set; a rebinding to any disallowed address fails closed. Changing a public
IP does not change origin authority: the same hostname, certificate/pin and
owner-approved record remain mandatory.

These are synthetic signed metadata checks. They do not perform DNS, parse a
production certificate or independently validate a real TLS chain. Future
composition must obtain trusted observations and check normal TLS plus the peer
pin **before any body is sent**, as established by the loopback adapter. An
untrusted endpoint cannot supply its own admission evidence.

## Rotation, replay and revocation

Each command compares the current server-head revision and signed-record digest,
consumes a unique request/decision and atomically appends history plus audit.
Neither failed commands nor transaction failures leave partial history.

- Create starts at certificate epoch 1. A fresh admission after a terminal revoke
  requires a new owner decision, unused pin, exact new identity and an epoch one
  above the retained high-water mark. A reserved staged epoch is not reused.
- Stage preserves the current certificate/profile and expiry, reserves exactly
  current epoch + 1 and requires a distinct unused next pin. Overlap cannot start
  in the past or exceed one hour. Staged expiry is after cutover, no more than one
  hour later and no later than record expiry. Certificates must already be valid
  and remain valid through their admitted interval. Records last at most 24 hours.
- Before overlap only current is accepted; in overlap current and next; from
  cutover only next. A separate current-owner cutover decision promotes the exact
  staged certificate. Early/late cutover, skipped epochs and same-epoch profile
  mutation deny. Expired staged state blocks use; no automatic promotion or rollback.
- Revoke is terminal and immediately blocks a new inspection. It remains possible
  after credential/host activity drift using a fresh decision for the exact old
  head and the current trusted issuer. It cannot transfer the old admission to a
  new identity. A new admission is required for changed credential/key bindings.
- An in-flight completion checks the current head/decision again. Revocation or a
  changed head yields terminal unknown/blocked, never retry or new authority.

Lost next certificates and bad rotations require another owner decision and
terminal reconciliation; there is no automatic return to an old pin. Memory
qualification serializes concurrent stage/cutover/revoke and proves one winning
state; it does not establish PostgreSQL concurrency guarantees.

## Local anchor and remaining rollback risk

Inspection requires an exact local anchor containing identity, record revision,
signed-record digest, certificate epoch and high-water epoch. It is checked against
the **current authoritative server head**, its issuer signature and current owner
decision. Old signed records, changed local fields, missing anchors and copied
state from another installation/host fail these checks. There is no default
composition without that independently current head/decision and exact anchor.

Writable local state is **not a security root**. An attacker controlling the same
system account could roll back an anchor and any co-located mutable view of the
server head together. Signatures alone do not prove freshness; a previously valid
signed snapshot may remain cryptographically valid. Compromise of issuer key
material makes this weaker still. This atom does not solve coordinated same-account
rollback, protect an OS keystore, add hardware monotonic storage or qualify a
production issuer. Production use remains blocked pending independently trusted
freshness/monotonicity and explicit provisioning qualification.

## Evidence and persistence status

The [synthetic suite](../../src/tests/worker-transport.test.ts) uses ephemeral
Ed25519 signing objects through the existing owner-ticket signer shape and a
rollback-capable in-memory history/audit ledger. No TLS certificates, Worker
credentials, key files or durable records are provisioned. Test guards forbid
network, DNS, fetch, sockets and target processes; observed effect count is zero.
All six admission flags and `transportQualified` stay false, including success.

Tests cover owner/decision/auth/signature denials, origin/SNI/certificate/bootstrap,
DNS candidates/rebinding, staged pins/expiry, epoch/revision rollback and replay,
concurrent state transitions, credential/host/installation/ticket-key drift,
anchor substitution/copy and rollback after append/audit/precommit. Build, lint
and source regressions pass. Real TLS/HTTP, native database, full API/web and
production deployment suites are not run in this source-only atom.

## Source persistence adapter (v28)

The explicitly injected [Prisma adapter](../../src/modules/api-keys/worker-transport-store.ts)
implements the existing service interface. Writes use one Serializable transaction
and the existing constant `ready_source_fence` update, shared with canonical
owner/decision/credential writers. Expected revision and signed-record digest are
checked again in a conditional head update; uniqueness/serialization conflicts
return `revision_changed`, without retrying the callback. History, head, Event
and audit reference commit together; a callback omitting audit cannot commit.

The [new additive migration](../../prisma/migrations/20260923170000_worker_transport_admission/migration.sql)
is **UNAPPLIED**. It only creates four tables and indexes, with no existing-row
changes, seeding, resets or edits to the preceding 76 migrations:

- `worker_transport_generations`: immutable identity/bindings and their digest.
  Every create/re-admit gets a new generation UUID, including identical bindings.
- `worker_transport_history`: immutable public signed admission record, indexed
  pins, unique command/decision, owner/decision revision/intent digest, predecessor
  revision/digest/high-water/state/generation and exact generation reference.
- `worker_transport_heads`: one pointer per **workspace + host**, deliberately
  stronger than workspace + installation + host. High-water survives an
  installation replacement. A composite FK binds the pointer's revision, digest,
  state and epochs to the same immutable history row.
- `worker_transport_audit`: one append-only reference per history row to its Event.

Checks cover bounded public JSON, positive/monotonic high-water, consecutive
revisions and a new generation after terminal revoke. A predecessor composite FK
prevents substituting invented previous state/epoch. Strict recursive Zod
serialization rejects unknown fields before writes. Persisted data contains only
public identity, origin/SNI/certificate/CA/resolver metadata, evidence digests and
the **admission record** signature. No raw signed owner-decision/ticket payload,
private key, certificate material, credential secret or credential hash is copied.
The credential hash is selected only to derive its canonical public fingerprint.

Authority uses bounded ORM lookups: current workspace owner/membership, exact
host, latest bound credential, acknowledged handoff and trusted ticket-key digest.
The host fingerprint comes from the existing credential handoff. Decisions come
from existing canonical revision/acceptance tables and must be accepted, current,
owner-reserved, undelegated and not superseded. An injected trusted issuer signs
the public decision projection transiently; it is never stored. The projection
expires at admission expiry, or the fresh command's `validUntil` for revoke so
an expired admission can still be revoked. No new decision authority is introduced.

`TransportDecisionRevisionSource`, `TransportDecisionAcceptanceSource` and
`TransportHandoffSource` are bounded, read-only Prisma projections of **existing**
migration-owned tables; omitted legacy columns are intentional. Do not use
`prisma db push` or derive table changes from these projections. All DDL remains
owned by reviewed migrations. The only raw query in this adapter is the constant
write fence; head/history/audit and authority access use Prisma delegates.

Inspect/complete use a RepeatableRead snapshot through a read capability whose
append/audit methods deny. They perform no fence, expiry renewal, audit insertion,
credential `lastUsedAt` or other persistent write. Each completion obtains a new
snapshot; revocation/changed head then blocks completion. This is an application
read capability, not a separately provisioned database read-only role.

The [Prisma mock suite](../../src/tests/worker-transport-prisma.test.ts) exercises
the actual adapter against a rollback-capable transaction client: full lifecycle,
replacement identity, one winner among 20 stage/cutover/revoke attempts each,
CAS/duplicate-head conflicts, read purity, replay/epoch/pin/authority/drift denials,
strict serialization and rollback after generation/history/head/Event/audit and
before commit. It checks migration statement scope, FKs, checks and indexes.
Network, DNS, sockets and child processes are forbidden in the tests, with zero
observed effects. Local Prisma validation/generation, server build and lint pass.

Manual migration review finds no destructive DDL or existing data mutation. It
does **not** establish PostgreSQL execution, native locking, database constraint
behavior, crash recovery or performance. Append-only behavior is enforced by the
adapter's normal API; privileged SQL writes/deletes and coordinated database
rollback are not solved by these checks. Native database, full API/web, real
TLS/HTTP and deployment suites were not run in this source-only atom.

**Exactly one proposed next atom:** separately authorized native PostgreSQL
qualification of this adapter and unchanged additive migration chain, using a
disposable synthetic database to check real concurrency, constraints, transaction
rollback and cleanup. Production endpoint contact, provisioning and activation
remain outside that atom.
