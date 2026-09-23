# Canonical bootstrap channel authority v1

Owner amendment v43, 2026-09-23. **Native qualification: 19/19 results PASS;
selected source tests: 68/68 PASS; server build/lint PASS.** All 81 migrations
applied in one owned disposable PostgreSQL database, including an ordinary
transport fixture inserted before migration 81. No migration SQL changed.
This is not deployment: migration 81 remains unapplied outside qualification.
RF-HOST-035 remains **PARTIAL**, production **BLOCKED**, all eight flags false.
No real credentials/private keys, signing, issuance/delivery, HTTPS/DNS,
provisioning, endpoint/default composition, target/model/profile or activation.

## One canonical authority and the authorized schema widening

`worker_transport_generations`, `worker_transport_history`,
`worker_transport_heads` and `worker_transport_audit` remain the only canonical
transport generation/history/head/audit. Bootstrap transitions use that same
revision chain and certificate high-water. Grants and native write receipts are
immutable children, not another registry, root or shadow head.

The owner explicitly authorized a narrow exception to strictly additive DDL:
add nullable `purpose`, remove the blanket credential/signature/decision-ID
NOT NULL where bootstrap cannot satisfy it, and replace it with disjoint CHECKs.
NULL purpose preserves ordinary/legacy meaning and the old ordinary JSON CHECK
expressions verbatim. Ordinary credentials stay non-null with the existing ApiKey
FK; ordinary signed records keep non-null signature and decision ID. Explicit
`first_enrollment`/`owner_recovery` generations require a NULL credential and a
separate exact identity. Bootstrap transitions have no ordinary signed identity.
No default, backfill, dummy credential, reinterpretation, seed or data deletion.
The migration first checks existing ordinary rows, then checks every retained
ordinary CHECK expression before wrapping only the JSON-shape checks. Shared
chain, FK, unique, revision, state and high-water constraints are retained.

Existing ordinary service admission still requires an active credential and
acknowledged handoff. Bootstrap is not an ordinary admission snapshot. An old
ordinary head without the new native receipt is unavailable; an audited ordinary
record can provide a spent high-water mark only after strict ordinary parsing.
Automatic bootstrap-to-ordinary handoff is not implemented or qualified.

## Immutable owner grant and single-use transitions

`bootstrap-channel-persistence-contract.ts` and the explicit
`createPrismaBootstrapChannelStore` factory bind the accepted primary-owner
decision/revision/acceptance, ticket ID/digest and entire strict snapshot:

- Exact workspace, host/install lifecycle epochs and generation IDs, host
  fingerprint, issuer key tuple and public issuer-history revision/digest.
- Purpose, transport generation/revision/digest, certificate epoch/high-water,
  HTTPS origin/SNI, CA digest, leaf pin, certificate validity and evidence digest.
- Exact sorted unique public IPv4 set, resolver policy and validity/cutover.
  Proxy, redirect, downgrade and session reuse are false.

The snapshot digest covers its fields except its own digest field. Native JSONB
row digests and application review digests are distinct, explicitly checked
representations. Raw credentials, signing keys and private material have no slot.
The proposal accepts only ticket/decision IDs, expected revisions, operation IDs
and permitted actions from callers; network/snapshot/CA/pin/IP/header overrides
are rejected. Snapshot values come from the accepted owner decision.

A grant starts on an absent or revoked canonical head, advances certificate
high-water and forbids reusing any historical pin/generation. `grant -> consume`
is one-time CAS; `revoke`, `unknown` and `close` are terminal. A consumed grant is
unavailable to inspection. Close after changed source authority becomes unknown.
Possible COMMIT loss or an unconfirmed write returns reconciliation-required,
delivery-unknown and non-retryable; no second attempt is made. Reconciliation is
not implemented here, and an uncertain write must not be automatically resumed.
These records do not replace the bootstrap attempt ledger or authorize exchange.

## Native writer coverage

| Writer/source | Guard and qualification boundary |
| --- | --- |
| Generation/history/head/ordinary audit/grant, including direct SQL and fixtures | Serializable origin-session writes acquire/increment the shared source fence. Immutable rows deny update/delete/truncate. History checks the current head/chain; deferred checks require same-transaction history/head/audit. |
| Canonical bootstrap history | A trigger advances the same head and appends Event and audit atomically; no second head or caller-managed acknowledgement. |
| Native write receipts | Automatic append records exact row digest, generation, transaction and fence. Direct insert/update/delete/truncate is denied. |
| Owner/membership, decisions/revisions/acceptances, tickets, hosts, lifecycle/history audit, issuer/history audit/key anchor, ApiKeys | Statement guards acquire/increment the shared fence; truncate and non-origin writes deny. Existing lifecycle/issuer guards remain independently required. |
| Guard catalog and snapshot helper | Reader checks all 47 expected trigger instances, exact table/function/event bindings, normalized body hashes, enabled/origin mode, deferral, language/security/configuration and source-fence presence; helper body/signature/settings are checked separately. |

The fence is deliberately conservative and global: any covered source mutation,
even unrelated to this host, invalidates an unconsumed grant. Reverting source
values does not restore its epoch, so ABA cannot revive approval. This imposes a
throughput/availability cost; partitioned fencing is not part of this proposal.
Time expiry and hard cutover are checked even without a source write. Missing,
disabled, rebound or modified guard evidence fails closed. Catalog fingerprinting
is not a claim of protection from a database superuser or restored database.

Writes use a serializable transaction and a separate read-only post-COMMIT proof.
Inspections use repeatable-read/read-only and never seed, repair or advance a
fence. Grant reads recheck current sole primary owner/acceptance, exact ticket,
qualified lifecycle and issuer, and the absence of active credentials (no credential
history for first enrollment). The full
bootstrap admission path still owns its stricter credential baseline, signed
current-decision and ticket-revocation checks. The native qualification below covers SQL guards, rollback, concurrent writers
and ordinary persistence compatibility. It does not qualify production exchange
or cryptographic issuance; ordinary fixture signatures are inert placeholders.

## Canonical projection and remaining blockers

`worker-bootstrap-authority-source.ts` supplies the selected ticket ID to the
channel reader. Only a fresh, strictly parsed, audited, guard-verified grant
matching the requested binding/purpose can remove
`bootstrap_channel_authority_unavailable`. Without migration 81 installed the reader stays
blocked. No caller boolean or synthetic model result removes this blocker.
The broad diagnostic projection can also retain ordinary/handoff diagnostics;
it never returns usable admission authority.

`bootstrap_ticket_revocation_unavailable` and `signed_current_decision_unavailable`
remain unconditionally blocked. `implementationReady`, `executionSupported`,
`pilotReady`, `liveAdmissionAllowed`, `pilotExecutionAuthorized`,
`pilotExecutionStarted`, `transportQualified` and `launchAuthority` remain false.
The v41 `createBootstrapChannelModel` remains a synthetic exchange/peer-denial
model; it is not wired to production persistence, delivery or an HTTP endpoint.

## Native and source evidence

[`bootstrap-channel-native.test.ts`](../../src/tests/bootstrap-channel-native.test.ts)
and its public-only fixture run through the existing owned-database qualifier
with `--suite channel --scenario full`. No application seed is run. Privileged
fixture preparation is distinguished from tested origin-session writers.

| Native case | Evidence |
| --- | --- |
| 81 migrations and preflight | One ordinary generation/history/head/audit inserted under the old schema; original fields and every old ordinary CHECK expression preserved. NULL ordinary credential, missing ApiKey FK and extra ordinary JSON fields reject. Bootstrap generations retain NULL credential and separate shape. |
| First enrollment/recovery | Same canonical head/history; immutable owner grant; exact owner/decision/ticket/lifecycle/issuer/CA/pin/origin binding; canonical public IPv4 helper, expiry/cutover, terminal revoke/unknown/close and replay rejection. |
| Ordinary runtime and direct writers | Existing store append/audit and direct SQL produce all four native receipts; inactive credential produces inactive admission context. No generated credential or valid synthetic signature is needed for this persistence-only proof. |
| Atomicity and writer fence | Generation/grant/history/head/audit/Event/fence snapshots restore on each failure; orphan generation cannot survive deferred COMMIT. Shared fence blocks a direct source writer; same-value source update invalidates prior approval. |
| Concurrent attempts | 20 grants: one winner; 20 consumes: one winner; two durable transitions, no callback retries. |
| Guard tampering | 47 guards x 7 mutations = 329 read-denial probes (missing, disabled, rebound, body, config, columns, predicate); all 47 disabled guards also deny writes. Replica reads/writes and missing audit fail closed. |
| COMMIT uncertainty | Deferred/late rejection, real connection loss before COMMIT and actual post-COMMIT response cut return reconciliation-required, delivery-unknown, non-retryable. Rollbacks leave zero effects; committed response loss leaves exactly one operation. |
| Inspection/projection | Repeatable-read/read-only inspections do not repair or mutate; post-consume drift closes unknown. Canonical context removes only the channel gap and retains the two independent blockers. |

The first two suite attempts found only fixture preparation defects (reused inert
hashes and an invalid actor fixture), corrected without migration/runtime edits.
The final complete suite has 18 subtests plus its parent: **19 PASS, zero skips**.
All attempts used the same owned database; the schema was applied only once.
The running qualifier still expected one fault-relay cut across corrective suite
attempts. Its final counter assertion consequently exits nonzero after cleanup;
this does not replace or invalidate the separately reported native test and
cleanup results. The committed runner now counts attempts (maximum three), with
its exact counter assertions checked for one and three executions. No second
database run was opened to repeat already established native evidence.

Source results remain **68 PASS**: adapter 15, channel model 14, issuer 13,
lifecycle 18, decision policy 8. Private-key/signing APIs are trapped; the native
suite also traps non-database network/DNS, process launch and logs. Build passes;
lint covers 338 routes/45 route files; diff check passes. Existing signing-fixture
suites were not rerun. Prisma schema/client are unchanged from v42.

Cleanup **PASS**: the database name/OID/owner/marker were rechecked, zero
sessions remained, and the database was removed and confirmed absent. Relay
process/listener closed; no helper files or persistent external directories.
Before/after fingerprints match for all three preexisting databases and 214
tables/sequences, schema and roles. Container/image/volume/network inventory
is restored: selected PostgreSQL stopped again, backend stayed stopped, unrelated
containers remained running and unchanged. No database in an unrelated container was queried.

Existing-database fingerprint SHA-256:
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

Migration chain SHA-256 (81 files):
`581f2ecfd8a4e349af001e0519e36e0eb4bb409df112ef00c29a295543425067`.
Prior 80 files remain byte-identical:
`529efe0cb272dc64ecb092ee50f31466c02a44d3dccb729be127d8ac872cb20c`.

The successor [v44 ticket-revocation inventory/contract](bootstrap-ticket-revocation-v1.md)
is complete source-only. It identifies five structural gaps and retains the
revocation blocker, independent of this channel qualification. Its single next
schema/adapter proposal is recorded there; no further atom is started.
