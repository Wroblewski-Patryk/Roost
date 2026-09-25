# Decision attestation: Prisma ports and native persistence evidence

## Owner amendment v61: durable dispatch and completion, source only

`createDurableDispatchAdapter` and the explicit
`createAttestedBootstrapComposition` now use committed attempt ownership.
The v59/v60 process-local latch survives only in a historical test harness;
it is no longer a runtime composition. No default client, transport, endpoint,
credential provisioning or activation is supplied.

**Schema decision:** the existing ticket, attempt, history, head, audit, Event
and receipt relations remain the attempt source of truth. Their states do not
represent a process owner, lease, send-start marker or completion-start marker.
Unapplied migration 84 therefore adds only `worker_bootstrap_dispatch_history`
and `worker_bootstrap_dispatch_receipts`, foreign-key children of the existing
attempt. No second attempt/task registry, root mutation, seed, backfill, defaults,
or edits to migrations 1-83. The append-only history is the ownership head;
there is no independently writable dispatch head.

| Action | Required state | Result and authority |
| --- | --- | --- |
| prepare | No dispatch child; exact committed sealed attempt | `sealed_ready`; no send permission. |
| claim | `sealed_ready` | `claimed_not_sent`; owner UUID, epoch and claim generation, database observed claimedAt, bounded lease (maximum 30 seconds). |
| resume | `claimed_not_sent`, expired lease | Explicit new operation and fresh authority; owner epoch and claim generation each increase by one. No implicit renewal. |
| start_send | Exact live owner/CAS in `claimed_not_sent` | Commit `send_started`, independently read it back, then grant one synthetic send. Replaying the operation never grants another permit. |
| outcome / unknown | Exact live owner in `send_started` | `delivered` with public response digest, or `delivery_unknown`. No response/secret payload is persisted. |
| start_complete | `delivered`, exact live owner and response digest | Commit `completion_started` with exact completion operation ID; independent readback precedes the synthetic completion callback. |
| complete | `completion_started`, same live owner, operation and response | `completed`. Only replay of the identical final operation/request digest is acknowledged idempotently, without another callback. |
| require_reconciliation | Nonterminal state except `terminal_failed` | Explicit operation, evidence digest and fresh authority; append `reconciliation_required`. |
| reconcile | `delivery_unknown`, `completion_started` or `reconciliation_required` | Explicit evidence/operation and fresh authority; append `terminal_failed`. It cannot infer successful delivery from a timeout. |
| recover / cancel | `terminal_failed`; cancellation also before send | Append `cancelled`, preserve all history. This closes the old attempt; it never resets it or allocates a successor ticket/credential. |

Each writer first reads the existing branded canonical authority reader in a
fresh READ ONLY RepeatableRead transaction. Serializable writes lock the same
`ready_source_fence` row and the exact attempt, compare authority revision/digest/
fence, immutable seal digest, owner/binding, installation/host generations,
ticket digest and credential epoch, then compare child revision/digest and owner
epoch/claim generation. Database time bounds every lease and authority expiry.
Every phase requires a previously committed predecessor, not another append in
the same transaction. SQL guards create immutable Event/receipt pairs, validate
them at deferred COMMIT, and reject UPDATE/DELETE/TRUNCATE. Runtime reads pin all
eight new trigger bindings and bodies in addition to the existing authority
catalog. `check-bootstrap-dispatch-contract.mjs` checks the source pins offline.

Dispatch children **lock but do not advance the signed-source fence**: ownership
does not change signed decision authority or the consumed attempt seal. Their
own append-only revision/digest and claim generation provide the CAS/high water.
Any actual source writer still advances the global fence and blocks further
dispatch. This explicit separation avoids pretending that an old seal receipt
matches a newly advanced source fence. It does not weaken any existing writer
or change migration-83 lineage predicates.

An independent fresh READ ONLY transaction must find the exact row, request
digest, writer XID, Event and receipt after every write. A resolved transaction
promise alone is insufficient. Rollback, false/lost COMMIT acknowledgement or
missing/conflicting readback returns `reconciliation_required`, `retryable=false`,
and no work permit. There is no automatic compensating write after an uncertain
COMMIT; the durable row may be absent or at its last committed phase. Inspection
reports a persisted send/completion start as needing reconciliation, never as
permission to replay. An expired lease after either start cannot restore work.

Inspection is read-only even after expiry/revocation/source drift: it may return
the exact audited historical head with `authorityCurrent=false`, never authority
to write. Terminal writers still require a fresh valid original authority. If
that authority is revoked/expired, terminal mutation is **BLOCKED**; inventing a
replacement owner decision or reusing the old seal is not recovery. Authorizing
a distinct successor ceremony remains a separate existing admission contract.
The legacy bootstrap/ticket lifecycle heads remain consumed in this source atom;
durable child completion is not proof of credential activation or native legacy
completion integration.

Source/mocked verification covers first enrollment/recovery; twenty claim,
completion-owner and terminal-completion races; twenty independent composition
factories with one synthetic exchange/completion; pre-send restart/resume and
anti-ABA fencing; no resend after start or lease expiry; owner/credential/host/
revision drift; exact completion idempotency versus conflicts; rollback and
false/lost COMMIT ACK at every normal and terminal phase; receipt/readback faults;
history tampering; pure stale-authority status and terminal recovery/cancel.
Mocks share serialized durable storage across factories and fresh transaction
objects. This models multiple processes; it is **not native multi-process or
PostgreSQL/MVCC qualification**. Network, subprocess, private-key and signing
effects are forbidden in the tests. No database or Docker was used for v61.

Validation: **238/238 selected source/mocked tests PASS, 0 skipped** (including
20 results in the new suite), server TypeScript build and lint (338 routes /
45 files) PASS. Migration-83 and migration-84 source pins and scoped diff checks
PASS. No native tests or web build were run; no web behavior changed.

RF-HOST-035 remains **PARTIAL**, production **BLOCKED**. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` remain false. Production crypto/auth/trust, real delivery,
native SQL behavior, successor recovery and explicit activation remain gates.
Historical registration root cause UNKNOWN remains MONITORED RESIDUAL RISK;
v61 supplies no new native evidence about that incident.

Exactly one next recommendation, **not started**: separately authorize bounded
native qualification of migration 84 and this adapter, including real distinct
database clients, transaction loss and cleanup evidence, without default wiring
or real delivery. All earlier recommendations below are historical.

## Owner amendment v60: native canonical reader/composition qualification

**18/18 PASS, 0 skipped, native child exit 0, nativeRuns=1**, 148.663 seconds.
The actual `createCanonicalBootstrapAuthoritySource`, concrete attestation ports,
`createDecisionAuthorityReader` and `createAttestedBootstrapComposition` ran on
PostgreSQL against the unchanged final 83-migration chain. No runtime contract,
migration or Prisma schema correction was needed. Added only the native suite,
its runner selection, and bounded recovery/cutover fixture options.

| Boundary | Native evidence |
| --- | --- |
| Complete first enrollment and recovery | Current owner/lifecycle/issuer/channel/ticket/decision plus immutable attempt seal and committed operation receipt; recovery preserves a real terminal predecessor with nullable prior attempt. |
| Same transaction | Signature, ticket, owner-auth and key-trust doubles receive the exact bound Db proxy used by the native SQL projections and lifecycle/issuer readers. No nested read transaction. |
| Freshness and equality | Four distinct READ ONLY RepeatableRead transaction clients; each before-send/before-complete pair uses separate Prisma clients and distinct backend PIDs. Transaction timestamps differ; revision/digest/fence/seal remain equal. |
| Read purity | All 31 selected canonical source/history/audit/receipt/Event/fence tables match before/after successful read/composition. Proxy rejects DML; PostgreSQL enforces READ ONLY. |
| Invalid authority | Missing/copied/wrong capability, evidence/version/dependency, false signature/auth/key/ticket verification, unsigned or changed owner/revision/policy/lifecycle/issuer/channel/binding, key revocation, terminal decisions, clock expiry and certificate cutover deny. |
| Existing attempt | Missing/mismatched seal, absent/mismatched receipt, terminal head and unsealed attempt deny; no repair or new attempt is synthesized. |
| Before send | A committed source-revision or revocation change between the paired snapshots yields zero exchange. A held old MVCC snapshot cannot substitute for the fresh second client. |
| After possible exchange commit | Source/revoke drift, synthetic reply loss, readback failure or completion uncertainty yields `delivery_unknown`, `reconciliationRequired=true`, `retryable=false`; no repeated exchange/completion. |
| Twenty-way native concurrency | Twenty reads see one committed projection while a revoke/source-revision writer is held; after COMMIT all twenty deny. Twenty concurrent source factories produce exactly one synthetic exchange in the same process. |
| COMMIT uncertainty | False seal acknowledgement leaves zero attempts; missing/mismatched/unavailable independent readback leaves one committed attempt and returns non-retryable reconciliation. One real relay cut after PostgreSQL COMMIT leaves exactly one seal, confirmed by pure read-only reconciliation, with no command retry or exchange. |

The trust and delivery callbacks are public synthetic doubles. A signature-shaped
public digest is qualification data, not cryptographic signing. The test forbids
private-key/signing APIs, HTTP/DNS/TLS/delivery connections, subprocess creation
inside the test, and fetch; the existing owned PostgreSQL relay is the only DB
transport. No credentials, provisioning, endpoints, default composition, target,
model/profile or activation were added. Test corruption/preparation is confined
to newly created public fixtures in the owned database; admission reads run in
origin mode with the real pinned guards enabled.

**Process-local only:** the one-exchange concurrency result does not qualify a
cross-process or restart-safe dispatch claim. Inspection after an uncertain seal
COMMIT supplies reconciliation evidence, not authority to auto-send or retry.
Durable atomic dispatch/completion ownership and terminal recovery remain
production gaps, together with real crypto/auth/key trust, secure delivery and
explicit runtime/default wiring and activation approval.

One owned disposable database applied the final chain from empty with no function
replacement. Read-only inventory and baseline covered three existing accessible
Roost PostgreSQL databases and 214 table/sequence fingerprints. Soar was outside
execution scope. Cleanup independently **PASS**, final runner **exit 0**: owned
database removed, relay closed, helperFilesCreated=0, original container/volume/
image/network inventory restored. Existing data/structure/role fingerprints are
identical before and after; Roost PostgreSQL returned to its original stopped
state and other containers remained unchanged.

- Applied/final raw-file source-chain SHA-256:
  `5e7d56f423aeb4c325edf7a5804551c8ffdc664ac85bf289c48ec69ccaff148b`.
- Migration-83 LF SHA-256 (unchanged):
  `b16939ff35320afe5f9cc0259edf1e444c7c43b70c7e186dc6a66ce096f9e0b5`.
- Before/after existing-data SHA-256:
  `e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

Selected source regressions **218/218 PASS, 0 skipped, exit 0**. Full server/web
build, lint (338 routes / 45 files), migration pins, runner syntax and scoped diff
checks PASS. Existing web asset-resolution and large-chunk warnings remain; no
web source changed. Protected dirty product/planning files were preserved and
excluded from this commit; no push or deployment occurred.

The registration monitored-risk guard remains active. An unexpected valid fixture
registration denial emits `unexpected_registration_denial`, `reopen=true`, and
blocks further fixture registration in that run; no retry/reissue is inferred.
No such denial occurred. The historical incident remains MONITORED RESIDUAL RISK,
root cause UNKNOWN; this pass does not claim to repair it.

Conditional signed-current-decision source authority is now natively qualified
with these explicit synthetic dependencies. Default `signed_current_decision_unavailable`
and legacy context/store remain blocked. RF-HOST-035 **PARTIAL**, production
**BLOCKED**. `implementationReady`, `executionSupported`, `pilotReady`,
`liveAdmissionAllowed`, `pilotExecutionAuthorized`, `pilotExecutionStarted`,
`transportQualified` and `launchAuthority` are all false.

Exactly one next recommendation, **not started**: source-only durable dispatch/
completion adapter on the existing attempt ledger, with committed-claim and
terminal reconciliation semantics and no default activation. Older entries below
are historical; v59 source evidence is supplemented, not replaced, by this run.

## Owner amendment v59: canonical decision reader and source composition

`createCanonicalBootstrapAuthoritySource(clock, ticketVerifier, decisionAuthority)`
now accepts an explicit reader capability. `inspectDecisionAuthority`, the v2
branch of `inspect`, and `decision` use it only inside the source's bound
repeatable-read READ ONLY transaction. Missing, copied, untrusted or incomplete
dependencies retain `signed_current_decision_unavailable`. No runtime route or
default factory creates this capability. Legacy `context` remains blocked and the
legacy store parses only its original v1 signed envelope: a native v2 attestation
is never silently converted to a different signature domain.

`createDecisionAuthorityReader` accepts only the frozen concrete port object
issued by `createPrismaDecisionAttestationPorts`, the exact capability version
and `decisionReaderEvidence`. The evidence pins migration-83 LF SHA-256 and the
complete guard/helper catalog, and names v58 commit
`3970dffe2b7e3de0a73d7beb06a13af19d2ab5f4`. This is evidence of the previously
qualified persistence implementation, **not native qualification of the new
reader/composition**. The existing historical port version contains `unapplied`;
that identifier is preserved for compatibility, not used as deployment status.
Every read rechecks the native catalog. A matching text tag alone grants nothing.

The additive `inspectBound` port performs concrete `projectCanonical`, ticket
verification and current attestation signature verification on that same Db.
The reader also replays existing canonical lifecycle and issuer histories on
that Db, verifies the exact issuer history head, and validates the protected
channel plan at the current database time. The pinned native projection joins
owner/membership, accepted revision/preview/policy, authentication evidence,
attestation envelope, derived authority-event revision and terminal events,
key purpose/material/epoch/high-water/history, ticket and attempt/lifecycle
receipts, channel bindings and recovery predecessor. It reprojects after the
explicit owner-authentication and public-key-trust callbacks. Missing verifier,
false result, invalid policy, stale owner/key, revoked authority, expired validity
or altered source fence fails closed. No signer or private-key API is added.
The trust seams are explicitly `synthetic_decision_reader_trust_v1` in this atom;
they do not claim production cryptographic or authentication qualification.

For a sealed attempt, the independent SELECT of the existing operation receipts
must match its entire row, mutation digest, derived authority revision and current
source fence. No intervening source write is silently accepted. The immutable
seal must bind the exact attempt, ticket, attestation, signed bindings and start
state. Inspection is pure, never starts or repairs an attempt, and never invokes
mutating `decisionGovernanceView`.

`createAttestedBootstrapComposition` is an opt-in **synthetic source driver**.
It accepts no replacement projector, network configuration or caller authority.
It obtains two distinct, fresh READ ONLY Db projections before exchange and two
more before completion. All four must match revision, full projection digest,
fence and seal; the existing ticket must be consumed for that exact attempt.
Clock observations are checked for validity on each read but excluded from digest
equality. Callback replay, reused Db and fabricated transaction return values
deny. A missing/mismatched seal or pre-send drift produces zero exchanges.
After possible exchange commit, failure or drift returns `delivery_unknown`,
`reconciliationRequired=true`, `retryable=false`; completion is not retried.

The bounded process-local attempt latch prevents concurrent/repeated sends,
including new factory instances in the same process. **It is not a durable
cross-process claim** and is not persisted by read-only inspection. Durable
atomic dispatch/completion, restart recovery and real delivery remain explicit
production gaps. The driver is not connected to endpoints or default runtime.
No new schema, migration, registry, credentials, keys, DB/Docker operation,
network exchange, provisioning, target/model/profile or activation was used.

Validation: focused reader/composition **14/14 PASS** using mocked native rows
and public synthetic verifier/auth/key/transport doubles. Coverage includes both
first enrollment and recovery, four distinct Db identities, unchanged database
state/audit/fence, missing evidence/seams, invalid signatures, owner/revision/key/
terminal/binding/validity drift, channel cutover, callbacks changing authority,
exact committed attempt receipt, absent/mismatched/reused/terminal attempts,
pre-send zero exchange and post-commit uncertainty without retry. Twenty
concurrent source runs yield one exchange; twenty reads race revise/revoke and
cannot restore authority. The fixture serializes writes and deliberately exposes
read drift: these tests **do not claim native MVCC or distributed concurrency**.
Source test guards forbid network, processes and real signing.

Final selected source regressions **218/218 PASS, 0 skipped**; server TypeScript
build, lint (338 routes / 45 files), migration guard pins, read-surface AST check
and scoped `git diff --check` PASS. All 83 migrations and Prisma schema remain
unchanged. Native DB/Docker/network tests and the web build were not run in this
source-only backend atom. Default context was consolidated below its 150000-byte
budget; protected product/planning changes were excluded from the commit.

RF-HOST-035 remains **PARTIAL**, production **BLOCKED**. Only a complete explicitly
injected source projection can remove the signed-decision blocker; default runtime
cannot. `implementationReady`, `executionSupported`, `pilotReady`,
`liveAdmissionAllowed`, `pilotExecutionAuthorized`, `pilotExecutionStarted`,
`transportQualified` and `launchAuthority` remain false. v58 registration risk
remains MONITORED RESIDUAL RISK, cause UNKNOWN, with its existing reopen condition.

Exactly one next recommendation, **not started**: separately authorized bounded
native qualification of this reader/composition against the unchanged final
migration chain, using public synthetic dependencies and no real delivery.
Earlier statuses and next-atom recommendations below are historical.

## Owner amendment v58: deterministic boundaries and monitored residual risk

One **11-row deterministic matrix PASS** (one invocation, 21.766 seconds): eight
admitted registrations with eight seals, three expected controls, zero unexpected
denials and zero retries. The matrix has a 180-second internal / 240-second
process cap, fresh identities per row, explicit awaited ordering and no random
sleeps or fuzzing. The event clock uses the database transaction-start millisecond
projection; separate samples use an independent read-only transaction. Different
backend PIDs verify separation, including two clients where selected. Every
registration itself stays atomic; only measurement/ordering varies.

| Variant | Event clock / measurement | Fence pre-read / ordering | Observed result |
| --- | --- | --- | --- |
| 1 | tx start -1 ms / after insert | no | register + seal PASS |
| 2 | tx start +1 ms / after insert | no | register + seal PASS |
| 3 | tx start -1 ms / before insert | yes | register + seal PASS |
| 4 | tx start +1 ms / before insert | yes | register + seal PASS |
| 5 | separate transaction, same client +1 ms / after | yes | register + seal PASS |
| 6 | separate client sample +1 ms / after | no | register + seal PASS |
| 7 | tx start +1 ms / after | read-only peer while registration holds fence | register + seal PASS |
| 8 | tx start +1 ms / after | business-value-preserving source write commits before snapshot | register + seal PASS |
| 9 | tx start +1 ms / after | source writer commits after snapshot/pre-read | expected SQLSTATE 40001; zero ticket/issue rows |
| 10 | tx start +1 ms / after | source writer commits before independent confirmation | expected reconciliation_required; exactly one ticket/issue row |
| 11 | tx start +60000 ms / after | future-time negative control | expected P0001/bootstrap_lifecycle_cas; zero ticket/issue rows |

The no-op business-value write still advances the protected source fence, as it
must. Row 9 fails at the native fence lock with `could not serialize access due
to concurrent update`; native constraint/context are null, not fabricated.
Row 10 is an application readback refusal, with no native SQLSTATE/trigger, and
returns non-retryable reconciliation after its one actual COMMIT. Row 11 reports
`bootstrap_lifecycle_write_guard()` at its RAISE. Public in-memory evidence binds
the phase, identity/event, XID, fence, clock and prior successful receipt lineage.
These controls demonstrate correct guards for known invalid schedules/inputs;
they do **not** establish which cause produced the historical v56 anomaly.
No native guard defect or unexpected valid-input refusal was reproduced. There
is no behavioral fix claim and no runtime port/migration/schema change.

### Risk classification and actionable diagnostic

The historical incident is now **MONITORED RESIDUAL RISK**, with cause UNKNOWN.
Under this owner delegation it is **not, by itself, a gate against further
canonical decision-reader/composition integration**. This supersedes the v56/v57
residual-blocker classification, without removing any production authority gate.
No additional random stress testing is recommended without new evidence.

The native registration runtime emits `native_registration_denial` with
`retryable=false`, `requiresClassification=true` and bounded synthetic diagnostic
data whenever registration fails. The matrix emits
`unexpected_registration_denial` with `reopen=true` on a valid-row refusal;
expected controls are classified only after their exact error and committed-row
assertions pass. Marked wire diagnostics provide PostgreSQL SQLSTATE/message,
constraint/table and function/trigger context when PostgreSQL supplies them.
The controlled denials exercised this path. Signals are in-memory/stdout/stderr
only, with no durable logs or secrets. This is native-harness monitoring; no
production telemetry sink or default composition was installed.

**Reopen condition:** any unplanned refusal of a valid matrix registration or an
ordinary fresh-chain native fixture, or a contradictory COMMIT/readback count.
Stop that attempt, retain the bounded diagnostic and investigate its concrete
SQLSTATE/phase/clock/fence evidence. Do not retry/reissue; an uncertain committed
operation requires independent read-only reconciliation. Expected stale-input,
future-time or controlled serialization denials alone are not evidence of a
broken guard. Broader production diagnostic wiring belongs to explicit composition.

### Final verification and authority

Exactly one owned disposable DB applied the unchanged **final 83-migration chain
from empty**, without replacement functions, reset or backfill. One full native
suite then passed **24/24, 0 skipped**, three applied post-COMMIT cuts, child and
final runner **exit 0**. Selected source **204/204**, full server/web build, lint,
generated pins, runner syntax and scoped diff PASS. Existing web asset/chunk
warnings remain outside this backend test scope. Cleanup independently **PASS**:
owned DB/relay removed, helperFilesCreated=0, inventory restored; three existing
accessible databases and 214 table/sequence fingerprints match. Other services,
dirty documents and retained roots were preserved; no push/deploy/activation.

- Migration-83 LF SHA-256 (unchanged):
  `b16939ff35320afe5f9cc0259edf1e444c7c43b70c7e186dc6a66ce096f9e0b5`.
- Fresh applied/final source-chain digest:
  `5e7d56f423aeb4c325edf7a5804551c8ffdc664ac85bf289c48ec69ccaff148b`.
- Existing database before/after fingerprint SHA-256:
  `e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

RF-HOST-035 remains **PARTIAL**, production **BLOCKED**, and canonical
`signed_current_decision_unavailable` is unchanged. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` all remain false. Public synthetic doubles qualify no real
signature, authentication, transport or delivery authority.

Exactly one next recommendation, **not started**: source-only canonical decision
reader/composition wiring to explicitly injected qualified attestation ports,
with absent/untrusted dependencies failing closed and default activation unchanged.
Earlier entries below are historical.

## Owner amendment v57: bounded registration investigation

The intermittent fixture registration denial was **not reproduced**. Two bounded
serial experiments each completed **48/48 new registrations and 6/6 seals**, with
zero operation retries (96 registrations, 12 seals total). They stopped after
their fixed count, with an additional 180-second in-test/240-second process cap.
The first measured before writes; the second moved observations after successful
writes so no diagnostic SQL round trip separates a freshly generated event time
from its native guard. This is controlled reproduction evidence, not proof that
the historical failure cannot recur. **Root cause remains UNKNOWN; no runtime or
fixture behavior fix is claimed.** The residual registration blocker remains.

The new optional runner probe and fixture diagnostics retain only public synthetic
metadata in memory: transaction/write phase, native clock and host clock bounds,
fence/XID, relevant protected receipt lineage, input identity/event and original
SQLSTATE/message. The owned relay additionally preserves native constraint/table
and PL/pgSQL context (including the trigger function where supplied) for marked
registration errors. No query payloads, credentials or durable logs are written.
Experiments fail at their first denial; retrying the same registration is absent.
The diagnostic was not exercised by an actual registration failure in this atom.

One marked disposable database applied the **final 83-migration chain from empty**,
including the existing corrected audit function. No migration file, Prisma schema,
runtime port or guard changed; no function replacement, reset or backfill occurred.
The existing privileged synthetic source preparation is unchanged; tested
registration operations run with origin guards and ordinary protected receipts.
No guard suspension or receipt fabrication was added to bypass a refusal.

After the two experiments, exactly one full native suite passed **24/24, 0 skipped**,
child and final runner **exit 0**, with three applied post-COMMIT wire cuts.
The original 82-only preflight and final catalog/legacy/seal/lineage/lifecycle suite
passed on this fresh replay. Selected source regressions **204/204**, full server
and web build, lint, generated pins, runner syntax and scoped diff checks PASS.
The web build reported unresolved runtime asset references and a large-chunk
warning; no frontend change or browser qualification is part of this atom.

Cleanup independently **PASS**: the owned database and relay were removed,
helperFilesCreated=0, inventory restored, and existing three accessible databases /
214 table-sequence fingerprints unchanged. Unrelated services and dirty documents
were preserved; no retained-root cleanup, push, deployment or activation occurred.

- Unchanged migration-83 LF SHA-256:
  `b16939ff35320afe5f9cc0259edf1e444c7c43b70c7e186dc6a66ce096f9e0b5`.
- Fresh applied and final source-chain digest:
  `5e7d56f423aeb4c325edf7a5804551c8ffdc664ac85bf289c48ec69ccaff148b`.
- Existing database before/after fingerprint SHA-256:
  `e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

Fresh replay is now evidenced, but the registration anomaly is still a residual
blocker. Canonical `signed_current_decision_unavailable` is unchanged; RF-HOST-035
**PARTIAL**, production **BLOCKED**. All six readiness/execution flags plus
`transportQualified` and `launchAuthority` remain false. Public synthetic doubles
provide no production signature/authentication/transport authority.

Exactly one next recommendation, **not started**: a separately authorized,
controlled registration clock-boundary and transaction-ordering experiment,
using this diagnostic to distinguish fixture scheduling from native refusal.
Earlier v56 and older statuses/recommendations below are historical.

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
