# Decision attestation: unapplied migration and adapter contract

Historical v52 contract; concrete native-row ports are now documented in
[owner amendment v53](decision-attestation-prisma-ports-v1.md). The synthetic
model interface below is retained as an oracle, not fabricated database history.

Owner amendment v52 implements one source-only follow-up to the
[v51 persistence proposal](decision-attestation-persistence-v1.md).
Migration `20260925010000_decision_attestation` is **UNAPPLIED**. There are now
83 migration sources; the earlier 82 are byte-equivalent after LF normalization
to commit `90207c31`. No database, Docker, migration application or native tests
were used. No Prisma schema/client changes, route or default composition.

## Additive schema and existing truth

Five child relations are proposed: `decision_owner_auth_evidence`,
`decision_attestation_key_history`, `decision_attestations`,
`decision_authority_events`, `decision_attestation_write_receipts`. Foreign keys
retain existing decision/revision/acceptance and workspace anchors. No second
decision root, head or attempt registry is created. The existing
`worker_bootstrap_attempts` unique ticket constraint remains; its nullable
attestation ID, seal, mutation digest and recorded timestamp extend that row.
The seal contains exact attestation envelope digest, authority revision, source
digest/fence and the full immutable owner/key/ticket/lifecycle/issuer/channel/
policy payload. The SQL guard supplies the actual insert fence after existing
statement triggers advance it. Its row timestamp is **not COMMIT evidence**.

There is an important additive compatibility refinement of v51: the existing
`decision_register_guard` prohibits updating accepted decisions, including a new
counter column. We do not replace/bypass that guard. `decisions.authority_revision`
is therefore a nullable, immutable opt-in seed (`1` only on a fresh governed
proposal INSERT), with no default or UPDATE/backfill path. Current monotone
authority revision is derived by `decision_attestation_revision()` from the
append-only child events; the seed alone never authorizes anything. Legacy rows
remain NULL and blocked. Existing application decision writers are unchanged
and do not automatically opt records into this format.

Public key history enforces the dedicated `owner-decision-attestation-v1` purpose,
exact installation/public provenance, initial create/adopt, epoch/high-water
growth, bounded 120-second overlap, explicit cutover and terminal retire/revoke.
Key history derives state, with no mutable key head. Missing initial provenance
is not adopted automatically. Terminal decision actions are supersede, revoke,
expire and reject. Other covered source edits conservatively invalidate all
opted-in decisions in that workspace by appending source events; old attestations
cannot revive after an owner/binding/policy ABA. Key rotation instead advances
the shared fence and applies explicit current-key eligibility, retaining overlap.

The migration only adds columns, tables, constraints, functions and triggers.
It does not alter old function bodies, rewrite prior migrations, reset data,
seed records or backfill admission. Nullable attempt additions may make old
whole-row receipts incomplete for this new authority; they are not repaired or
silently accepted. Existing data is preserved and legacy authority stays blocked.

## Writers, receipts and fingerprint checks

Thirty-three source/child tables receive shared-fence locking, row audit and TRUNCATE
denial. Coverage includes decisions/revisions/acceptances/previews, workspace and
membership, interview cases/entries and their acceptance effects, company records
(policy sources), ticket/attempt/lifecycle rows, host/install history, issuer/key
anchors and transport/channel history. Inserts, updates and deletes produce
automatic public digest-only Events and immutable write receipts. Auth/attest
and terminal children are append-only; attempted deletion of protected roots or
evidence denies. Receipt/Event equality is also checked at deferred commit time.
SQL shape checks do not claim to verify a cryptographic signature.

`decision-attestation-guards.ts` pins **111 new trigger bindings and four helper
bodies**. The adapter additionally requires the existing ticket/channel/issuer
guards and helper fingerprints. Catalog checks cover schema, table/function,
trigger kind, enabled/origin, arguments, predicate/column filters, deferred mode,
language, security/configuration, volatility and normalized body hash. Missing,
disabled, rebound, altered or replica proof denies. The offline command
`node scripts/check-decision-attestation-contract.mjs` checks pins, coverage and
additive shape; `--write-guards` is only for explicit reviewed source changes.
It does not execute or parse PostgreSQL procedurally and is not native validation.
Opted-in ticket decisions require a sealed attempt. Existing attempt-history
transitions additionally reject stale/terminal attestation and dispatch in the
same transaction as start; the original attempt/history writers remain in place.

## Adapter boundary and digest graph

`createDecisionAttestationAdapter` provides public key create/adopt/stage/cutover/
retire/revoke, current owner-auth evidence recording, exact-acceptance attestation,
terminal transition, existing-attempt start seal and READ ONLY inspection.
It requires explicitly injected transaction, canonical projection, child-insert,
committed-operation readback, owner-authentication and public-key-authorization
ports, plus signer/verifier for attestation. **Concrete Prisma row projection and
insert mapping ports are not supplied by this atom.** This is an executable
adapter contract with mocked persistence, not a composed canonical SQL store.

The projection port must join the original roots, child histories and exact
receipts; translate SQL source events into the validated model projection; and
resolve current policy/intent/evidence without guessing. It must preserve exact
canonical timestamps and derive the current revision from events, not return the
seed. The insert port receives bounded **child deltas**, not a writable canonical
snapshot. It must use the same bound SERIALIZABLE transaction and shared fence,
insert immutable children, or create/consume the existing ticket attempt through
its existing lifecycle writer in that transaction. It must never UPDATE the
accepted decision or store a model snapshot blob as another source of truth.
The v51 in-memory grouping remains a test oracle, not a database representation.

An operation ID is an existing inserted child/attempt ID, not a new operation
registry. Its immutable `mutation_digest` binds the requested delta. The writer
port must check actual generated rows and automatic Event/receipt links before
returning a rows digest and actual fence; it must not echo caller claims. The
separate readback port must rejoin those exact rows/receipts, reject missing or
ambiguous operation IDs, and recompute the same public receipt. Adapter success
confirms that mutation receipt, not that authority remains usable after later
concurrent changes; `inspect` checks current usability separately.

The v51 public-key, key-event, auth-evidence and signed payload/envelope domains
remain unchanged. The new `owner-decision-child-mutation-v1` hashes a bounded
delta; native authority-row receipts use `owner-decision-authority-event-v1` so
they do not reinterpret the v51 synthetic snapshot-journal domain. Ticket and
grant precede the attestation; the attestation precedes the attempt seal;
automatic audit hashes public rows and references Events. None embeds its own
resulting digest. Existing ticket-v2 domains and signatures are unchanged.

## COMMIT uncertainty and remaining gate

Verification: **13/13 adapter tests, 31/31 combined adapter/model tests and
173/173 selected source/mocked tests pass**. Server TypeScript build, lint,
offline fingerprint/additive checks and scoped `git diff --check` pass. The old
82-file LF-normalized source chain hash is
`f27c8a40fcc81ccda7f3b427f27b377a748fdcf44dbc05ae3535e742a227fceb`.

Each successful write callback is followed by a **different READ ONLY
REPEATABLE READ transaction** that verifies guards and the exact committed
operation receipt. A resolved transaction promise with absent/changed receipt,
failed readback, or lost acknowledgement yields `reconciliation_required`,
`retryable=false`; the adapter never retries. After an actual uncertain commit,
the immutable acceptance/attempt seal prevents a second signing/start. When no
commit can be established, callers must honor the non-retryable result and await
canonical reconciliation; this adapter does not invent an external uncertainty
registry. Inspection is pure and never repairs missing history or receipts.

No exchange/delivery method is exposed by this adapter. Its model exchange seam
always denies. v51's separate source protocol still models the shared fence held
through the send boundary; actual dispatch/timeout/native transaction behavior
is not qualified here. Signer/verifier callbacks receive the same bound Db and
frozen public material. No private-key reader, key generation, real sign API,
credential, network/DNS, endpoint, target/model/profile or activation is added.
Tests trap those effects and inspect sources for private-key/signing APIs.

`signed_current_decision_unavailable` remains unconditional in the canonical
source. RF-HOST-035 **PARTIAL**, production **BLOCKED**. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` remain false. Native SQL syntax/trigger execution, deployment
compatibility, cryptographic verification and concrete canonical ports are not
qualified by these source/mocked results.

Exactly one recommended next atom, not started: implement and source-test the
concrete Prisma canonical projection/insert/readback ports for this contract,
including derived revision, automatic fence/receipt mapping and same-transaction
existing-attempt lifecycle integration, while keeping migration 83 unapplied and
all production gates closed.
