# Bootstrap v3 source projection and receipt lineage

Owner amendment v76: **source-only projection contract and transactional tests
DONE; native projection/persistence BLOCKED**. This extends the
[v75 issuance contract](bootstrap-proof-issuance-v3.md), without wiring a default
port, changing SQL/guards 1–86 or creating migration 87. It does not confer
signing, delivery, admission or activation authority.

## Immutable source boundary

`bootstrap-proof-projection.ts` defines an immutable pre-operation anchor bound
to the v3 plan, operation, workspace, writer XID, initial fence, protected authority
facts, full source-row inventory and every decision-authority head. Required
owner/authentication/decision/lifecycle/issuer/key/attachment identities and public
bindings are checked against the plan. Full native row digests remain opaque;
the port must extract and verify their logical bindings from canonical rows.

The coverage list includes all inputs of `bootstrap_proof_sources` and the proof,
channel, audit and authority children needed by v3. Complete sets include empty
roles, reject duplicates and use deterministic role/key ordering. The new
`roost-bootstrap-v3-full-source-set-v1` digest is **not** migration 86's JSONB
aggregate digest; neither digest is silently converted or rewritten. A future
v3 authority reader must explicitly supply this versioned inventory/digest.
Bounded arrays/encoding limits deny instead of truncating source sets. Each
ledger record retains the v72 128-KiB limit; the collection has a 1-MiB budget
and commits to the complete ordered per-record hashes. A large nested trace is
not reinterpreted as one signing message, and no record is omitted to make it fit.

## Exact own changes

Each phase has a closed logical write recipe; these roles do not prescribe SQL
tables or columns for migration 87:

| Phase | Allowed own rows and automatic effects |
| --- | --- |
| reservation | One v3 reservation tied to attachment and complete plan digest. |
| ticket | Ticket registration, issue lifecycle record and audit; lifecycle/attestation receipts. |
| channel | Exact generation, grant, history, head and audit; transport/attestation receipts as specified by role. |
| attempt | Attempt, consumed history, head, audit and ticket consumption; lifecycle/attestation receipts. |
| link | One proof link with the complete v3 binding and proof receipt. |
| seal | One immutable attempt seal and its operation audit with projection receipts. |

Ticket registration and the four channel sources (generation/grant/history/head)
also produce exactly one `source_change` authority event per eligible decision.
Eligibility is bound to the captured decision row, including inactive heads.
Each event advances its own decision revision once, binds the exact previous
digest and causal source row/mutation, and has its own attestation receipt/Event.
Other decision actions, extra fan-out or missing decisions deny. Audit and
authority descendants have exact parent mutation and parent receipt links.

Every mutation belongs to the same operation/XID and expected phase/slot, has
an exact before-row digest, expected public binding and chained predecessor.
Receipts bind native receipt identity/full digest, full native Event digest,
one-to-one normalized Event, row digest, phase, epoch and causal parent.
Receipt/Event identities cannot be reused across rows or epoch evidence.

Fence epochs are contiguous from the original anchor. Each has an automatic
native receipt/Event witness and an explicit causal driver/root and guard role.
Shared epochs require exact member/receipt/Event lists and counts; members must
belong to the same causal root. Empty statement epochs require their own witness
before the driver's row and cannot repeat a driver/guard pair. Nested guard
epochs require a real descendant. Gaps, regressions, borrowed roots, duplicate
epochs/receipts and unaccounted rows deny; there is no "latest fence wins" rule.

After replaying this closed lineage, the complete observed row set and all
authority heads must equal the exact expected result. Protected facts cannot
change. The returned projection points back to the original source digest and
authority head; it never overwrites or repairs current data. Foreign or ABA
changes cannot disappear through exclusion by XID or restoration of row values.

## Read port and commit boundary

`V3ProjectionPort.read` must return the complete interval across **all** XIDs and
operations, not prefilter away foreign evidence. The future native adapter must
verify origin/isolation/source lock, pinned writer/guard coverage, exact native
row/receipt/Event mappings and completeness. Existing receipts alone do not
supply every new epoch witness; missing evidence must block. Marker strings and
opaque digests returned by a mock do not authenticate a database.

`createV3ProjectionReader` has no default port and no write/repair/rebase method.
On one writer Db it allows consecutive phases only, pins every previously
verified mutation/receipt/epoch byte-for-byte, and latches failure. A coherent
rewrite with recomputed hashes still cannot replace a verified prefix. Independent
post-COMMIT readback or historical replay must provide the exact immutable final
commitment (plan/anchor, writer XID, fence interval, final set and lineage digest)
and passes the same projector. Reconciliation is read-only and grants no current
send authority. The transactional test model never retries uncertain writes.

## Verification and remaining boundary

Final selected source/mocked regression: **176/176 PASS**, including 34 results
in the projection suite, with no failures/skips/cancellations. Server build,
lint (338 routes/45 files), four existing source-pin checks and diff checks pass.
No DB, Docker, native apply, web build or real signing was run. The new suite's
private-crypto/network/DNS/listener/subprocess traps recorded zero calls and
application logs were empty.

Source/model checks cover first/recovery, each phase, shared and nested epochs,
fan-out eligibility, full-row drift, rehashed tampering, missing/duplicate/gapped
lineage, 20 concurrent own-versus-foreign readers, immutable prefixes, rollback,
false/lost COMMIT and independent missing/changed readback. Model success is not
SQL/native qualification; no private crypto, network, delivery or default wiring
is supplied. Persistence/cryptography qualification, sendPermit and all eight
readiness/activation flags remain false. RF-HOST-035 PARTIAL, production BLOCKED,
registration UNKNOWN / MONITORED RESIDUAL RISK.

Exactly one next recommendation, **not started**: additive migration 87 and
pin-checked versioned guard upgrades/native projection port satisfying this
contract while preserving the legacy branches and migration files. Native
qualification remains a later separate atom. No push/deploy.
