# Decision attestation: Prisma ports and native persistence evidence

## Owner amendment v56: bounded native requalification

Final full native run **24/24 PASS, 0 skipped**, native child and qualification
runner **exit 0**; cleanup independently **PASS**. These are conditional native
persistence results using public synthetic signer, verifier, authentication and
key-authorizer doubles. Production signatures, owner authentication endpoints,
transport, default composition and activation are not qualified.

Exactly one owned, marked disposable PostgreSQL database applied all **83**
migrations. Original migration-82 standalone register/reserve/consume and its
catalog path passed before 83. Legacy operations after 83 and direct SQL strict
anti-ABA denial passed; old rows and null authority opt-in stayed unchanged.
Migration files **1-82** and Prisma schema are unchanged.

The first full run was **21/24 PASS, 3 FAIL** (two subtests plus parent): seal
committed, but full lineage assertions found the new history receipt had no
workspace. History carries `attempt_id`, not `workspace_id` or `ticket_id`.
The only migration-83 correction derives the workspace from that existing
attempt in `decision_attestation_audit`; generated function pins were refreshed.
While the runner retained its owned database, only that function was replaced
from corrected source, and its native body hash verified. No migration replay,
reset, backfill, earlier migration edit or second database occurred. The final
catalog and full suite therefore exercise the corrected function, not a fresh
replay of the final chain from an empty database.

The second full run was **20/24 PASS, 4 FAIL** (three subtests plus parent):
synthetic fixture registration intermittently returned
`bootstrap_ticket_lifecycle_denied` before the operations under test. A bounded
in-memory fixture diagnostic now preserves the underlying transaction error.
The third full run passed unchanged assertions, but did not reproduce that
registration denial. Its root cause is **not established**; a passing final run
must not be described as a proven repair of this intermittent fixture anomaly.

### Final native coverage

- Exact through-fence boundary, all five start phases, six successive epochs,
  both receipt families and nested history/audit proofs sharing an epoch.
- Missing, stale, replayed and foreign receipts, fresh expected global gaps,
  and source/key/owner/lifecycle/issuer/channel/policy mutation deny before any
  port INSERT/UPDATE/DELETE; full fingerprints stay unchanged.
- Twenty concurrent attest, seal and terminal operations each have one winner;
  seal against twenty revokes and revoke against twenty seals preserve both
  lock orders without a deadlock. All eleven rollback faults actually fire,
  including final consume, then restore exact state/history/Event/audit/fence.
- Public key create/adopt/stage/cutover/retire/revoke, positive expiry, terminal
  immutability, successful seal and same-transaction dispatch denial.
- Attest, seal and terminal each exercise deferred rejection (including false
  Prisma success), false/unknown ACK, pre-COMMIT connection loss, real response
  loss after COMMIT and missing/mismatched/unavailable independent READ ONLY
  readback. Uncertainty is non-retryable reconciliation with exactly zero or
  one committed operation. Three wire cuts occurred in the final run, nine
  cumulatively across the three runs; final-run counters are checked separately.
- Exact 111 own trigger bindings, 15 new functions/five helpers and upgraded
  legacy writer pins; trigger/helper tampering, replica/isolation/UTC denial,
  read purity and zero non-database/private-key effects.

Selected source regressions **204/204 PASS**, server build, lint, generated pins,
runner syntax and scoped diff checks PASS. The fixture's accepted-source setup
still uses its documented privileged preparation; it does not qualify the
production acceptance endpoint or real cryptography.

### Cleanup, hashes and remaining authority

The owned database and relay were removed; no helper files were created.
Existing catalog/data/roles fingerprints match across three accessible databases
and 214 table/sequence entries. Container inventory was restored, including the
initially stopped target PostgreSQL; unrelated services were unchanged. No push,
deploy, retained/sandbox cleanup or default activation occurred.

- Final migration-83 LF SHA-256:
  `b16939ff35320afe5f9cc0259edf1e444c7c43b70c7e186dc6a66ce096f9e0b5`.
- Corrected native audit body SHA-256:
  `524ae686d6d97955e3fee6f97cc2e91918ac8817e2119d2e4e712a18972f943b`.
- Final source-chain digest (runner's raw-file hash convention):
  `5e7d56f423aeb4c325edf7a5804551c8ffdc664ac85bf289c48ec69ccaff148b`.
- Existing-database before/after fingerprint SHA-256:
  `e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

The explicit injected ports have conditional native persistence evidence;
`signed_current_decision_unavailable` remains unconditional in the canonical
runtime decision reader. RF-HOST-035 stays **PARTIAL**, production **BLOCKED**.
`implementationReady`, `executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` remain **false**.

Exactly one next recommendation, **not started**: separately authorize a bounded
investigation and deterministic repair of intermittent native fixture
registration, using the new diagnostic and an owned disposable database, before
expanding authority integration. The v55 and older statuses/recommendations
below are historical.

## Owner amendment v55: source fence compatibility repair

The repair is **source/mocked qualified only; native requalification PENDING**.
No database, Docker, network, private signing, default composition or activation
ran in this atom. Only the never-production-applied migration **83** changes;
migrations **1–82** and Prisma schema remain unchanged. This is not a claim that
the v54 native failures have passed. The v54 run and recommendations below are
historical evidence, not current completion or authorization.

### Trigger order and preserved invariants

Migration 81's `transport_bootstrap_source_fence` advances the shared fence at
statement entry for source roots. Its transport row guard advances the same
row again for a transport mutation; `a_transport_bootstrap_advance` runs before
`z_transport_authority_audit`, which captures actual post-trigger state.
Migration 82's lifecycle BEFORE ROW guard advances that same fence and requires
the pre-row epoch `f - 1` to equal the latest automatic ticket receipt for
reserve/consume and active attempt/history transitions. Its AFTER ROW audit
creates the protected Event and receipt; root/history audits also insert the
automatic bootstrap audit row, whose guard advances the fence. Deferred guards
require complete lifecycle/attempt/history/head/audit bindings at COMMIT.

The original migration 83 added `aa_decision_attestation_fence` before every
covered statement, including rows already fenced by 81/82. Consequently the
82 guard observed a new, unreceipted epoch before it even processed a row.
Key/auth/attestation rows also legitimately advanced the shared fence between
ticket issue and seal. Both effects violated the old equality even without ABA.

The repair retains one serialized `ready_source_fence` row, all original trigger
bindings, native audits/receipts, immutable accepted roots, owner and source
checks, deferred COMMIT checks, exact post-COMMIT readback and no-retry policy.
No counter is rewound, receipt rebased, trigger disabled or source row repaired.
For six lifecycle tables and four covered transport tables, the 83 statement
guard now locks the shared fence but lets the existing 81/82 row guard advance
it. Other statement/source fences remain. Empty statements on those tables
retain the old row-writer semantics; existing 81 source fences still run.

For an illustrative issued ticket whose last receipt is F, one create/auth/
attest/start sequence has this source-derived ordering (not native evidence):

| Write | Epoch and automatic evidence |
| --- | --- |
| Public key | F+1, attestation receipt |
| Owner auth | F+2 receipt; its authority event/receipt at F+3 |
| Attest | F+4 receipt; its authority event/receipt at F+5 |
| Reserve | F+6, both old and new receipts |
| Attempt | F+7, seal guard proves the lineage through F+6 |
| Consumed history | Old receipt at F+8; nested audit at F+9; new history receipt also at F+9 |
| Head, consume | F+10 then F+11, automatic receipts |

### Exact lineage and legacy preservation

`decision_attestation_lineage(ticket, through_fence)` anchors at the exact
protected issue/reserve receipt preceding the current attestation. It requires
an opted-in decision, current owner/key/lifecycle, unexpired attestation and
every integer epoch through the requested fence, with a conservative 4096-epoch
bound. Proofs are exact native row/digest/Event joins over existing receipt
tables, not a new journal. Key history belongs to this workspace/installation;
auth and attestation evidence belong to this acceptance/decision/ticket.
Their receipts must precede the attestation's authority-event tail. Afterwards,
only this ticket's start rows with the **current transaction XID** are eligible.
Both receipt families are checked because nested old audits can share a later
epoch with the new outer receipt. Missing epochs, foreign rows, wrong digests,
missing Events, duplicate row proofs, stale receipts and foreign XIDs deny.
Key/source writes after attestation invalidate the start even when a caller
refreshes its expected command fence. General owner/decision/lifecycle/issuer/
channel writes remain conservatively invalidating. Auth's automatic authority
event now targets its own acceptance's decision; it no longer generates
unrelated decision events for the same evidence.

Migration 83 verifies the LF-normalized hash of the entire original 82 writer
body and exactly two occurrences of its gap predicate before upgrading it.
Only those predicates change from `gap` to `gap AND NOT proven_lineage`; every
other statement is identical. The original equality remains the first path.
For legacy decisions the helper returns false, so every former gap still denies.
The original hash is
`1000876fe64fa1808625f0e9b06db2a86f8b4d1aa26d7dd0f6cce07be045e048`;
the reviewed upgraded hash is
`5a20ef2f1215d86cbaec27f129d83eb608b16e92afb074e1e18b0490fc328cf1`.
The lifecycle store accepts that body only with the complete pinned 83 catalog;
82-only installations retain their exact old catalog path and strict authority
read semantics. There are 111 own trigger bindings, 15 new functions including
five helpers, plus the narrowly upgraded existing lifecycle writer body.

The Prisma seal port checks lineage under its existing SERIALIZABLE fence lock
before its first write. The native seal guard checks it again through `f - 1`,
after the original row guard but before any attempt receipt. Same-transaction
dispatch still denies; prepared receipts remain distinct from COMMIT proof.
The v54 millisecond lifecycle timestamp correction and its regression assertion
are retained; six-digit timestamps remain for the new records. Key-stage timing
stays a fixture concern and does not affect the runtime contract.

### Source evidence and remaining gate

**204/204 source/mocked results PASS**, no skips: standalone old/upgraded catalog
paths, exact legacy fence drift denial, attest-to-seal, missing/foreign/stale/
replayed proof denial before any seal write, 20-way attest/seal/terminal races,
seal versus revoke in both lock orders, rollback with a demonstrably reached
fault, unknown COMMIT/no retry, timestamp format and dispatch API denial.
The final focused lineage/port rerun is **22/22 PASS**. Build, lint, generated
migration pins and scoped diff checks pass. The test oracle is deliberately
separate from SQL and cannot prove its runtime syntax, trigger ordering,
isolation or actual COMMIT behavior. Native test expectations were updated to
five helpers but no native test ran.

RF-HOST-035 remains PARTIAL; `signed_current_decision_unavailable`, production
and all eight flags below stay blocked/false. Exactly one next atom is
recommended and **not started**: separately authorized full native
requalification of the revised 83-migration chain and ports in an owned
disposable database, including legacy operations, complete receipt lineage,
20-way contention, reached rollback faults, COMMIT uncertainty and cleanup.

## Owner amendment v54: native evidence and remaining incompatibility

The bounded native qualification **did not pass**. The final executed suite
reported **14/19 PASS, 5 FAIL, 0 skipped** (four failed subtests plus their
parent); the runner exited **1**. Cleanup independently **PASS**. This does not
qualify the complete attestation/attempt-seal contract or production authority.

One explicitly owned disposable PostgreSQL database received the full **83
migration chain**. All migration sources and Prisma schema remain unchanged;
the raw migration-chain SHA-256 was
`ee3af18849be5bd1ea882841c9c988cf5b73510a2c3a5753d96dd8079f386c45`.
Migration 83 was exercised only there and remains unapplied to existing and
production databases. Public synthetic fixtures used injected signer, verifier,
ticket-verifier, authentication and public-key-authorizer doubles. No real
private keys, credentials, signing, transport, provisioning or activation ran.
Accepted-source preparation temporarily suspends older decision-policy guards
for new synthetic rows and restores them before invoking the tested ports;
all migration-83 guards remain active. This does not qualify an acceptance UI
or endpoint, or production key provenance.

Observed native passes include additive legacy preservation and null-seed
denial; exact 111 trigger bindings, 14 function bodies and four helpers;
derived authority revision; attestation and terminal CAS with one winner among
20 commands each; revoke/supersede/reject and early-expire denial; deferred
COMMIT rejection; false/unknown acknowledgement and pre-COMMIT connection loss
with zero committed attestations; actual post-COMMIT response loss with one
immutable attestation and no retry; missing/mismatched/unavailable READ ONLY
readback; guard/helper tampering and restoration; origin/UTC/isolation/source
drift denial; receipt-deletion denial and read purity. Injected-verifier inspect
can observe a persisted attestation, but is **not** complete signed-decision
qualification and is not connected to canonical runtime.

Native execution exposed two port defects. Channel grant `record_digest` uses
native PostgreSQL JSONB text hashing from migration 81; it must be checked in
SQL, separately from the canonical attestation payload digest. That correction
was exercised in the final native run. Existing lifecycle events accept only
millisecond wire timestamps; the port incorrectly replaced these with six-digit
DB timestamps. The port now preserves `advanceTicketLifecycle` output for
reserve/consume. This second fix passed source tests but was **not rerun natively**.
New attestation/history records retain the exact six-digit DB clock.

The three seal-related subtests failed at `bootstrap_lifecycle_cas`: successful
seal, 20-way seal contention, and dispatch-in-start rejection remain unqualified.
Source inspection also identifies a second, unexecuted incompatibility:
migration 83 adds a BEFORE STATEMENT shared-fence increment before migration
82's existing BEFORE ROW increment, while migration 82 requires its `f - 1`
to equal the latest ticket receipt fence. Attestation/key/auth writes also
advance that shared fence without advancing the legacy ticket receipt. The
timestamp correction does not resolve this contract conflict. No guard was
weakened, no receipt was fabricated, and no earlier migration was edited.

The other failed subtest was key staging with a 200 ms setup margin; timing
under native load is a suspected fixture cause, not independently isolated.
An earlier attempt passed the full key lifecycle, but the
final run did not; repeatable qualification is not claimed. The fixture now
allows 10 seconds before overlap and waits until cutover. Its ticket verifier
compares signed record and identity rather than a transient operation ID;
revision assertions sort numeric database revisions rather than text aliases.
Rollback assertions now additionally require the injected failure to have
actually fired: the previous native PASS could merely be an earlier seal
denial. These final fixture hardenings were compiled, not rerun natively.
Positive expiry and the complete seal rollback matrix remain unqualified.

Cleanup removed the uniquely marked database, relay and helper processes;
no helper files were created. The original stopped Roost PostgreSQL container
was restored to stopped; unrelated containers, including Soar, were unchanged.
Fingerprints of all three existing accessible databases and 214 table/sequence
entries match before/after SHA-256
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.
No second database or further native attempt was started after cleanup.

Final source regression results: **194/194 PASS**, no skips, including 14 focused
Prisma-port results and timestamp/native-grant denial regressions. Server build,
lint, offline migration pins and scoped diff checks pass. Source tests cannot
replace the missing native evidence. RF-HOST-035 remains **PARTIAL**, full native
qualification and production **BLOCKED**, with `signed_current_decision_unavailable`
unchanged and all eight readiness flags below false.

Exactly one next recommendation, **not started**: explicitly authorize a bounded
compatibility repair for migration 83's shared-fence interaction with the existing
ticket lifecycle, preserving legacy anti-ABA checks and old migration sources,
then repeat the complete native matrix with fresh disposable-database authority.
This replaces the historical next-step recommendation below.

## Historical v53 source qualification

Owner amendment v53 adds concrete, parameterized SQL ports on an explicitly
injected `Prisma.TransactionClient`. Migration 83 remains **UNAPPLIED**; all
83 migration sources and Prisma schema are unchanged. No database, Docker,
network, DNS, private keys, real signing, credentials, delivery or activation.

`createPrismaDecisionAttestationPorts` provides `projectCanonical`, constrained
`appendChildren`, and `readCommittedOperation`, plus source-only `execute` and
READ ONLY `inspect` orchestration. It requires an injected transaction runner;
it constructs no Prisma client, connection, transaction manager or runtime
composition. The runner must invoke each callback once, commit only after its
successful return, and provide a fresh client/snapshot for each transaction.
Uncertain outcomes before callback completion must throw
`AttestationCommitUnknown`; errors after completion are always reconciliation.

This is the native-row implementation of v52's persistence boundary, **not a
drop-in implementation of its synthetic `AttestationModelState` interface**.
The v51/v52 model remains a protocol oracle. Native projection retains real
authority rows and receipts instead of fabricating a synthetic journal, numeric
fence increment or snapshot-as-truth. No production consumer is connected.

## Canonical inputs and clock

Projection joins existing decision/revision/acceptance/impact-preview and owner
roots, existing ticket/channel/attempt histories, and migration 83 children.
The nullable root seed must equal 1; current authority revision is the checked,
contiguous append-only event chain and must equal the SQL helper result. Owner
membership must be unique and agree with the exact human acceptance. Missing
roots, legacy receipts, changed owner, conflicting intent, gaps, digest mismatch,
stale lifecycle/issuer/channel/policy, terminal ticket or replica mode deny.
Recovery additionally compares the predecessor ticket's exact canonical head.

The explicit source-only accepted revision format is
`body.ownerDecisionAttestation = { version: 'owner-decision-attestation-policy-v1',
revision, evidenceDigest, validFrom, expiresAt }`. `revision` is the policy
revision of this accepted decision, not a guessed global company-policy version.
`evidenceDigest` must hash the exact impact JSON selected by the acceptance's
`preview_id`. Validity is bounded by the accepted ticket/lifecycle interval.
This adds no root or mutable policy store; absent fields deny, and existing
decision routes are not changed to populate them. Company/source writes continue
to advance the shared fence and invalidate existing attestation authority.

The database clock is fetched as an exact six-fractional-digit UTC string.
The transaction must use UTC, origin replication mode and the required isolation;
nonconforming sessions deny without repairing configuration. New key/attestation/
history timestamps use that string; terminal and seal timestamps are generated
by SQL triggers. Acceptance times compare instants without dropping microseconds.
Auth time comes only from the explicitly injected authentication evidence port,
is checked against the exact acceptance/owner/policy and DB freshness clock, and
is receipt-bound. No caller can supply `committedAt`, audit, fence or derived
authority revision. SQL key/policy eligibility also checks database precision.

## Writes, transaction boundary and receipts

Write binding verifies guard/helper fingerprints and locks existing
`ready_source_fence` using `SELECT ... FOR UPDATE` in SERIALIZABLE READ WRITE.
Only one typed operation is allowed per bound client: public-key lifecycle,
owner-auth evidence, exact-acceptance attestation, terminal event, or attempt seal.
All identifiers and values are parameters; table/column names are fixed SQL.
There is no unsafe/raw-string SQL, root UPDATE, receipt INSERT or shadow registry.
Signer, verifier, ticket verifier, authentication and key-authorizer callbacks
are explicit, absent by default, and receive the same bound transaction. Sources
are reprojected after callbacks. Cryptographic qualification is not claimed.

The seal operation reserves an issued ticket when necessary, then inserts the
existing unique-ticket attempt with the attestation seal, its consumed history,
head and consume lifecycle event in the **same transaction**. It uses existing
record schemas and `advanceTicketLifecycle`; old lifecycle guards generate the
existing audit. Migration 83 adds the automatic Event/write-receipt children.
No dispatch API is exposed; the existing migration 83 guard rejects dispatch in
the start transaction. There is no send/provisioning callback.

After writing, full projection verifies all current row receipts. A separate
operation query resolves the inserted child/attempt ID (not a new operation
registry), its immutable mutation digest and writer XID. It checks each exact
row digest against its automatic receipt and protected Event, checks receipt
coverage and derives the operation's authority revision at its actual receipt
fence. It does not predict `fence + 1` or use XID ordering as revision ordering.
Key operations leave decision revision unchanged; auth/attest/terminal events
advance it; attempt lifecycle remains attached to the existing attestation.

After the injected write transaction returns, `execute` requires a **different
READ ONLY RepeatableRead transaction**, revalidates guards and rejoins the exact
immutable operation receipt. The receipt includes sorted row/Event/receipt IDs,
digests, actual fences, XID and recorded DB time. A row timestamp is not proof of
COMMIT. Absent, incomplete, changed or unreadable receipts, false success and
lost/unknown acknowledgements return `reconciliation_required`, `retryable=false`.
No callback retry occurs; an injected runner attempting a second write callback
is refused before binding. A lost actual commit leaves the immutable acceptance
or unique-ticket attempt consumed. With no provable commit, callers must honor
the nonretryable result until canonical reconciliation. Readback proves the
recorded mutation, not future authority; later source edits require fresh inspect.

Public digest domains added: `owner-decision-native-projection-v1`,
`owner-decision-sql-mutation-v1`, `owner-decision-sql-operation-rows-v1`.
They do not reinterpret the synthetic oracle or the ticket-v2 signing domains.

## Verification and remaining gate

**14/14 focused results and 187/187 selected source/mocked regression results
pass**, with no skips. Server TypeScript build, lint, unchanged migration/schema
comparison, offline migration fingerprints and scoped diff checks pass. The
default documentation context remains below 150,000 bytes. No native tests ran.

Source/mocked tests cover each port and key action, exact parameter binding,
DB timestamps, derived revision, audit coverage, atomic seal, rollback at each
write phase including final consume, false/lost/unknown ACK, missing/changed
readback, no retry, absent dependencies, stale sources and guard fingerprints,
read purity and 20 concurrent commands each for attest, seal and terminal.
Network/DNS/process/private-key/sign APIs are trapped. No native SQL syntax,
trigger ordering, actual COMMIT, real contention or crypto qualification follows
from these mocks.

The lower-level append port returns a prepared receipt inside the caller's
transaction; only `execute` adds the separate committed readback. A caller using
the raw ports must preserve that boundary and must not interpret an append return
as COMMIT success. Missing pre-migration source receipts deliberately block;
this atom does not backfill or adopt legacy authority.

`signed_current_decision_unavailable` remains unconditional in canonical runtime.
RF-HOST-035 **PARTIAL**, production **BLOCKED**. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` all remain false.

Exactly one recommended next atom, not started: native qualification of migration
83 and these ports in a separately authorized, owned disposable PostgreSQL
database with synthetic public records and injected signing/verifier doubles,
including actual trigger ordering, additive legacy behavior and post-COMMIT
readback. No production migration, private keys, delivery or activation.
