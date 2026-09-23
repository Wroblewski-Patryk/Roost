# Canonical bootstrap channel authority v1

Owner amendment v42, 2026-09-23. **DONE for the source-only schema/adapter
proposal: 15/15 new results, 68/68 selected results; server build/lint PASS.**
Migration `20260923230000_bootstrap_transport_authority` is **UNAPPLIED**.
The previous 80 migration files are byte-identical. Native qualification is
**NOT RUN**; RF-HOST-035 remains **PARTIAL**, production **BLOCKED**.
No DB/Docker/network/DNS, private keys/signing, issuance/delivery, provisioning,
endpoints/default composition, target/model/profile changes or activation.

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

## Proposed native writer coverage

| Writer/source | Proposed guard and qualification boundary |
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
current-decision and ticket-revocation checks. Native SQL behavior, real isolation,
rollback, concurrency and ordinary writer compatibility remain unqualified.

## Canonical projection and remaining blockers

`worker-bootstrap-authority-source.ts` supplies the selected ticket ID to the
channel reader. Only a fresh, strictly parsed, audited, guard-verified grant
matching the requested binding/purpose can remove
`bootstrap_channel_authority_unavailable`. Without migration 81 the reader stays
blocked. No caller boolean or synthetic model result removes this blocker.
The broad diagnostic projection can also retain ordinary/handoff diagnostics;
it never returns usable admission authority.

`bootstrap_ticket_revocation_unavailable` and `signed_current_decision_unavailable`
remain unconditionally blocked. `implementationReady`, `executionSupported`,
`pilotReady`, `liveAdmissionAllowed`, `pilotExecutionAuthorized`,
`pilotExecutionStarted`, `transportQualified` and `launchAuthority` remain false.
The v41 `createBootstrapChannelModel` remains a synthetic exchange/peer-denial
model; it is not wired to production persistence, delivery or an HTTP endpoint.

## Verification and next bounded step

Selected source results: adapter 15, channel model 14, issuer 13, lifecycle 18,
decision policy 8; **68 PASS, zero failures/skips**. New mocks cover first/recovery,
ordinary isolation, exact bindings/IP set, expiry/cutover/revoke, read purity,
source ABA, malformed/legacy heads, 20 competing grants and 20 consumes, rollback
at each write phase, false COMMIT acknowledgement/unknown with no retry, every
guard missing/disabled/rebound/changed/deferred incorrectly, zero exchange before
admission, post-consume drift and caller overrides. Mocks serialize transactions;
these are not native concurrency results. Private-key/signing, network/DNS,
process launch and logs are trapped in the new adapter suite.

Prisma schema validation and local client generation pass with private dotenv
reads and network calls blocked. Server build uses the regenerated client.
Lint checks 338 manifest routes/45 route files. Existing private-signing fixture
suites and native SQL suites were not run. No migration was applied.

**One recommended next atom:** separately authorize disposable-database native
qualification of migration 81, direct/ordinary/bootstrap writers, all guard
failures, concurrency, rollback/COMMIT uncertainty and exact cleanup evidence.
Do not start issuance, delivery, production integration or activation. Not started.
