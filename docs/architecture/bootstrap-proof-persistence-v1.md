# Public proof authority persistence

Owner amendment v73. **Source-only persistence/ports DONE; migration 86
UNAPPLIED; native and production authority BLOCKED.** Implements the public
children of the [approved signer model](bootstrap-proof-authority-v1.md).

## Children and guards

Migration `20260925040000_bootstrap_proof_authority` adds four SQL-owned children:

| Child | Parent/binding and role |
| --- | --- |
| `bootstrap_proof_key_history` | Separate `local_worker` and `roost_server` streams under existing workspace/installation roots, no mutable head. Exact purpose, SPKI DER, key ID/digest, epoch/high-water/revision and binary history digest; create/adopt/stage/cutover/retire/revoke replay. Worker rows reference exact installation/host lifecycle records and generations. |
| `bootstrap_proof_attachments` | Immutable pre-issue reservation under the exact accepted decision revision. Both key-history references, owner, workspace/installation/host generations, ticket/request and enrollment generation. No second ticket/installation registry. |
| `bootstrap_proof_ticket_links` | Composite FK child connecting a reservation to existing ticket/attempt roots. Reserved for the future explicit v3 wire/seal; writes currently deny. |
| `bootstrap_proof_write_receipts` | Immutable audit/receipt child of exactly one operation, joined to the canonical Event, native writer XID, source digest and numeric fence interval. |

No Prisma schema change, default, seed/backfill, data rewrite, or edit to
migrations 1–85. Additional unique indexes support composite FK identities.
Runtime catalog checks pin **19 functions, 59 triggers and 18 foreign keys**,
including exact function arguments/body digests, table/function binding, trigger
kind/deferred policy, enabled origin role, unpredicated coverage, validated FK
column pairs/targets and valid referenced unique indexes. Existing attestation,
dispatch and completion catalogs remain mandatory dependencies. Missing,
disabled, replica, rebound, changed-body, wrong-FK or legacy catalogs deny.

All-writer inventory covers key children; workspace/membership and decision
revision/acceptance/supersession/impact roots; lifecycle/host/installation roots;
ticket/attempt/history/head/lifecycle events; dispatch/completion; credential and
handoff sources. These statement guards also cover direct SQL/Prisma, import,
admin and fixtures. They perform a **same-value MVCC write** on the existing
`ready_source_fence`, forcing stale serializable writers to conflict without
adding unreceipted numeric increments to existing protocols. Existing pinned
source guards retain their numeric increments/audits. This compatibility is
source-reviewed only; native behavior remains unqualified. New key/attachment
inserts increment the same fence once and automatically append Event/receipt.
Deferred commit guards recheck exact evidence and root source digest. History,
attachments, receipts and their Events cannot be mutated or truncated.

Primary-owner reservation is explicit even if a proposal supplies a delegated
`authority` field; SQL additionally requires the exact accepted owner-reserved
revision without that declaration. Current owner/lifecycle checks cannot be
supplied as request booleans. Public material reuse is blocked both directions:
new proof keys cannot reuse issuer/owner-decision keys, and new issuer/attestation
writes cannot reuse any recorded proof key. Private material is never selected
into ports or written to children. Root-sensitive values are hashed inside SQL;
only the source digest leaves that query.

## Ports, bytes and committed evidence

`createPrismaProofAuthorityStore` requires an explicit transaction client and
exposes applyKey, attach, inspect and inspectOperation. Writes use SERIALIZABLE;
inspection and separate post-COMMIT readback use READ ONLY RepeatableRead.
Callbacks and Db instances cannot be reused. The same writer Db supplies owner,
lifecycle, complete history, clock/fence, public insert and precommit readback.
Effective schemas must be exactly pg_catalog/public; transaction setup fixes the
search path, and origin role/isolation are validated. No client, signer,
cryptographic verifier or endpoint is installed by default.

The SQL binary encoder mirrors v72 tagged lengths/counts, ordered arrays and
UTF-8-sorted object keys. Each public record stores exact BYTEA plus its digest;
both SQL and TypeScript recompute and compare them. It is not a JSON signature
downgrade. JSONB is storage projection only and cannot attest raw JSON duplicate
keys or original lexical spelling. Strict future wire decoding and cross-language
native encoding parity still require qualification.

Full key replay validates ordering, previous/history/intent/receipt digests,
monotonic epochs/high-water, bounded overlap and hard cutover/terminal revocation.
The reader checks each immutable row against its exact Event and write receipt,
then checks current key references, owner, lifecycle and attachment bindings.
`readCanonicalProofAuthority(db, attachment)` returns persisted public facts and
explicit blockers, **not a production verifier capability or a qualified v72
ticket/transport snapshot**. Repeated reads never repair or advance state.

A resolved write transaction is not success evidence. A new read-only transaction
must return the exact prepared row, canonical binary bytes and receipt/Event
binding. Missing/mismatched evidence, false resolution, lost COMMIT response or
readback failure returns reconciliation_required, retryable=false. Writes never
retry automatically. inspectOperation provides explicit read-only reconciliation;
it can identify a committed operation after lost ACK without re-executing it.

## Deliberate ticket boundary

The attachment reservation precedes ticket issuance, so it cannot have an FK to
a nonexistent ticket. The separate link child provides that FK once roots exist.
Existing v1/v2 tickets cannot acquire new signing authority through a sidecar.
The link guard checks the proposed v3 attachment/envelope identity and then denies
with `bootstrap_proof_v3_seal_unavailable`: v3 issuance and qualified sealing are
not implemented by this storage atom. No production signer/verifier, credential,
delivery, provisioning or activation is inferred from a persisted reservation.
Native qualification must preserve this denial, not relax it to make legacy
fixtures pass. Recovery persistence tests use public canonical-root doubles;
they are not evidence of a working v3 recovery ceremony.

## Evidence and remaining boundary

New transactional-mocked suite: **33/33 PASS**. Selected source/mocked regression:
**106/106 PASS**, zero failures/skips/cancellations, exit 0 (29.177 seconds).
Final focused rerun after PostgreSQL catalog type-name normalization: **33/33
PASS**, exit 0 (24.999 seconds); final server build also passes.
Includes first/recovery and all six key lifecycle actions; same-Db operations and
independent readback; 20 competing writers/one winner and 20 pure readers; all six
row/audit/Event/receipt/constraint/source rollback phases for keys and attachments;
false/lost COMMIT and missing/mismatched readback; guard/role/schema/FK tampering;
wrong principal/purpose/binding/history and public material reuse; malformed
committed bytes/receipts/Events; absent default composition and owner reservation.
These mocks exercise the real TypeScript SQL ports, not actual PostgreSQL guards.

Server build, lint (338 routes/45 files), four source-pin checks and diff checks
pass. Consolidated default context is 143089/150000 bytes. SQL execution/DDL compilation, real concurrent writers, deferred native
COMMIT and PostgreSQL binary parity were **NOT RUN**. Migration 86 remains
UNAPPLIED. No DB/Docker/network or web build; signing-key-generating legacy suites
were excluded. No private/keypair/seed/sign operation: low-level crypto private/
sign/verify, network/DNS/process APIs are trapped; forbidden effects/logs are zero.
The initial public points are fixed existing test material, not signed vectors.

RF-HOST-035 PARTIAL; native qualification, ticket-v3/seal and production signature
verification remain BLOCKED. All eight flags stay false: implementationReady,
executionSupported, pilotReady, liveAdmissionAllowed, pilotExecutionAuthorized,
pilotExecutionStarted, transportQualified, launchAuthority. Registration UNKNOWN /
MONITORED RESIDUAL RISK. Unrelated dirty documents and retained artifacts remain
untouched; design-qa.md stays unread/untracked/unstaged. No push/deploy.

Exactly one next recommendation, not started: **native qualification** of the
final 86-migration chain in one explicitly authorized owned disposable database,
including SQL/TypeScript binary parity, full history/attachment/guard/FK tests,
actual concurrent writers, rollback/deferred COMMIT/lost ACK/readback, compatibility
with existing numeric fence receipts, intentional v3-link denial and cleanup.
