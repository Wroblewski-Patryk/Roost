# Public proof authority persistence

Owner amendment v74. **Public persistence and bounded native qualification DONE;
production signing/issuance authority BLOCKED.** Migration 86 was qualified only
in one owned disposable PostgreSQL database. Existing installations were not
migrated. Implements the public children of the
[approved signer model](bootstrap-proof-authority-v1.md).

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
verified natively by the existing eleven-statement completion writer and its
committed numeric receipts under the final 86-migration chain. New key/attachment
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
keys or original lexical spelling. Native SQL/TypeScript bytes and digest parity are verified for supported
values, ordering, Unicode and limits. This object-only port rejects raw JSON
strings; strict future wire decoding remains outside its qualification.

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

Final native suite: **23/23 PASS**, no failures/skips/cancellations, child/runner exit 0,
116.168 seconds. One owned database/OID was retained across bounded corrections;
each native retry rebuilt only its disposable schema and applied the full chain.
The final fifth native run used unchanged final test sources and migration bytes.
Earlier failed/interrupted probes are not qualification evidence.

Three minimal migration-86 corrections were necessary: parenthesize a CASE
expression in PL/pgSQL, accept Prisma's bigint revision parameter, and use the
existing host status rather than a nonexistent enabled column. Migrations 1–85
and the Prisma schema remain byte-for-byte unchanged. Fixture-only corrections
separated the deliberately disconnected writer from the control client and added
the required expiry to an inert revoked credential. No runtime port was relaxed.

The native suite exercises the real Prisma public ports and SQL guards:

- First reservation and recovery against exact public canonical roots; both
  principals' create/adopt/stage/cutover/retire/revoke histories, overlap,
  hard cutover, terminal revocation, high-water and material-purpose separation.
- SQL/TypeScript binary bytes and digest parity; array order, UTF-8 object-key
  order, safe integers and rejection of controls, unpaired Unicode, coercions,
  noncanonical text and depth/container/byte limits. JSONB lexical duplicate
  members and negative zero cannot be authenticated after JSON parsing.
- Twenty distinct PostgreSQL writers with one winner and twenty pure readers;
  exact owner/decision/root/generation/ticket/request/history bindings.
- All 19 function configurations, 59 trigger enablements and 18 FKs individually
  tampered and transactionally restored; changed function body, replica role and
  shadow search path denied. Final catalogs match the pinned source.
- Key/attachment child, Event, receipt and source rollback; pre-COMMIT termination,
  real deferred COMMIT rejection, false/lost acknowledgement and independent
  missing/mismatched/unavailable readback. Uncertainty is nonretryable and yields
  zero or one committed operation. Two actual post-COMMIT wire cuts in the final
  run reconcile read-only; four cuts total include an earlier failed test run.
- Immutable/corrupt byte, receipt, native-XID, fence and Event denial; source drift
  rollback and stale SERIALIZABLE conflict without an extra numeric increment.
- The real canonical completion compatibility fixture preserves migrations
  81–85 receipts and all eleven statements. Its synthetic verifier/credential
  fixture does not establish signing, possession or production activation.
- Legacy v1/v2 links deny with bootstrap_proof_legacy_ticket_blocked; proposed
  v3 links still deny with bootstrap_proof_v3_seal_unavailable. Recovery uses
  inert pre-existing roots; no v3 issuance/sealing ceremony is manufactured.

Final chain SHA-256:
`08f3d8e57f4886762e4d9437d44b3ac7a5eb9b03e1aef4faac19033fc2b145bc`.
Unchanged first 85 migrations:
`17a6849ec2c0442bb3d34b3a1e1d335321e95026312ff283051a527ecda2fbdd`.
Final native test/fixture source SHA-256:
`7f82e4ca5de71a74463b864aaa1b565d8303183ccab157e931f55418b2dffe59`.

Cleanup **PASS**: the owned database was removed, relay/listener and test processes
closed, no runtime helper files/directories created, and the selected database
container restored to its initial stopped state. Unrelated containers and all
three existing databases (214 tables/sequences) are unchanged. Before/after
fingerprint SHA-256:
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

Selected source/mocked regression **106/106 PASS**, no failures/skips/cancellations,
exit 0 (26.559 seconds), including the 33-result public persistence suite.
Server build, lint (338 routes/45 files), four source-pin checks and diff checks
pass. Default context is 144720/150000 bytes. No web build or signing-key-generating
legacy suite was run. Unrelated dirty product/planning documents and retained
artifacts were preserved; design-qa.md remained unread/untracked/unstaged.

RF-HOST-035 PARTIAL; ticket-v3/seal and production signature verification remain
BLOCKED. The ports retain their conservative source-only qualification marker
and blockers; native evidence alone does not install a production composition.
All eight flags stay false: implementationReady, executionSupported, pilotReady,
liveAdmissionAllowed, pilotExecutionAuthorized, pilotExecutionStarted,
transportQualified, launchAuthority. Registration UNKNOWN / MONITORED RESIDUAL
RISK. Fixed public vectors only; no private key generation/signing, usable
credentials, delivery, provisioning or production activation. No push/deploy.

Exactly one next recommendation, not started: source-only v3 ticket issuance and
seal integration bound to the persisted public proof-authority reservation,
with explicit injected authority, denial tests and no default activation.
