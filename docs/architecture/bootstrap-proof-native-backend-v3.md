# Bootstrap v3 SQL backend

Atom A provides migration 87 and source-pinned catalog compatibility for the
[v75 issuance](bootstrap-proof-issuance-v3.md) and
[v76 projection](bootstrap-proof-projection-v3.md) contracts. Status:
**source implementation; UNAPPLIED / NATIVE UNQUALIFIED**. Migrations 1–86 are
unchanged. No Prisma issuance port, endpoint, default wiring, signing or delivery
is supplied. Source checks and mocked legacy regressions are not PostgreSQL
qualification. Persistence/cryptography qualification, `sendPermit` and all
eight readiness/activation flags remain false.

## Explicit SQL API

The caller supplies one SERIALIZABLE read/write transaction, origin replication
role and `SET LOCAL search_path = pg_catalog, public`. The existing
`ready_source_fence` row is locked for the writer. Call
`bootstrap_v3_write(plan, phase)` with the identical complete public v3 plan in
this order: `reservation`, `ticket`, `channel`, `attempt`, `link`, `seal`.
The backend enforces consecutive phase checkpoints and a deferred complete
operation check; an incomplete operation cannot commit. This is not an adapter
that creates transactions or calls an issuer/sealer.

`bootstrap_v3_read(operation_id, through_phase)` returns the stored plan, anchor,
phase evidence, native mutation/receipt/Event/epoch witnesses, final commitment
and issuance receipt. Writer reads recheck the current complete source set.
Historical reads require a separate READ ONLY RepeatableRead transaction with
the same origin/schema restrictions, use the immutable phase frame and verify
its stored final lineage. Historical readback grants no current authority.
Atom B must bind this packet to the existing projector and independently verify
COMMIT; neither a callback return nor this SQL read alone is a delivery permit.

`bootstrap_v3_catalog()` checks the immutable migration manifest: the complete
function dependency closure and attributes, trigger identity/order attributes,
extra source triggers, writer/receipt column layouts and new foreign keys.
TypeScript readers first compare both function metadata and the manifest with
source pins, then call that checked SQL function on the same supplied Db.
Missing, altered or partially upgraded catalogs deny.

## Canonical authority mapping

The same accepted owner decision must contain `workerBootstrapProofAuthority`
(the persisted attachment) and `workerBootstrapAdmissionV3` (the exact v3
intent). Its owner authentication, current lifecycle/anchor, complete public key
histories, channel generation/pins and credential predecessor are rechecked.
No caller boolean substitutes for those rows. The SQL wire uses canonical UTC
timestamps with three fractional digits, consistent with native proof history.

The public issuer material comes from its canonical create/adopt/stage history
record and must match the current installation anchor; revoked/retired material
and a staged generation without cutover deny. Its v3 `authorizationDigest` is
the v72 digest of an object with domain
`roost-bootstrap-v3-issuer-authorization-v1`, `issuerRecordDigest`, `decisionId`,
`acceptanceId` and the accepted v3 `intentDigest`. `validFrom` is the later of
that acceptance and the key's native activation time. `expiresAt` is the exact
accepted v3 intent expiry, bounded to 120 seconds from issuance. The historical
issuer command's expiry is not reinterpreted as the key's lifetime. Reserved
key comparisons use SHA-256 of public Ed25519 SPKI, including conversion of
attestation raw public keys. This public mapping does not verify signatures or
authorize private-key access; the injected trusted issuer/verifier remains absent.

The existing ticket/attempt roots retain their generic revocation metadata
marker `bootstrap-ticket-revocation-proposal-v1`. Their ticket payload, complete
envelope, link and separate immutable attempt seal use strict v3 domains.
The native ticket record stores the existing `{signed, decision}` shape; the
reservation retains the full v3 envelope. Legacy attestation seal columns stay
null, and the v3 attempt seal has its own child/FK. Native record digests and the
legacy migration-86 aggregate remain separate from v3 transcript/full-set hashes.

## Exact native effects and compatibility

The writer follows the v76 17-write recipe and deterministic decision fan-out.
Version-specific prefixes in 12 existing guard/audit functions validate exact
native rows, claim fence epochs, append automatic receipts/Events and sequence
channel/head/audit descendants. Original function bodies remain literal unchanged
branches. The migration verifies their original body hashes before replacement;
old catalog readers recognize a new hash only after full migration-87 validation.
This includes the completion reader's shared transport source-lock dependency.

Reservations, anchors, phases, seals, commitments and evidence ledgers are
immutable. Automatic mutation witnesses hash complete native rows; secret-bearing
source rows are hashed inside SQL and never exported. Inventory covers all 33
source roles and all authority heads, including empty roles and inactive heads.
Reads include the entire fence interval across operations/XIDs plus legacy
receipts without v3 mappings. Foreign writes and unclaimed epochs stay visible
and cause the closed projection to fail. Missing records are not filtered away.
No-op source statements still have native epoch witnesses where existing guards
advance the fence; incomplete phases and post-seal drift fail the commit guard.

## Verification boundary and next atom

Reproduce source pins with `node --import tsx scripts/check-bootstrap-v3-backend.ts`.
The checker hard-pins all 86 historical migration sources; regenerating v3 pins
cannot authorize an edit to them. The backend source suite is
`scripts/tests/bootstrap-v3-backend.test.ts`; it compares the SQL recipe with
v76 for first enrollment/recovery and secondary fan-out, checks exact preserved
legacy bodies, and exercises full/partial/tampered catalog recognition. Existing
channel, lifecycle, proof and completion regression suites cover compatibility.
SQL/PLpgSQL parsing is syntax evidence only, not an applied-database result.

Final selected source/mocked regression: **254/254 PASS**, including 27 backend
source/catalog results, with no failures/skips/cancellations. Server build,
lint (338 routes/45 files), all five pin checks and staged diff checks pass.
Static parsing accepts 117 SQL statements and all 49 new/upgraded function
definitions. The generated catalog pins 177 functions and 323 triggers.
No DB, Docker, native apply/qualification, web build or private signing was run.

Exactly one next atom, **not started**: B, explicit Prisma transaction/authority/
projection/issuance integration with independent committed readback and mocked
failure tests. Database application and native qualification require separate
delegation. RF-HOST-035 remains PARTIAL, production BLOCKED, registration
UNKNOWN / MONITORED RESIDUAL RISK. No push/deploy/activation.
