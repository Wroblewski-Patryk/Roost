# Decision attestation: Prisma ports and native persistence evidence

## Owner amendment v76: source-only v3 projection

Owner amendment v76: [v3 source projection](bootstrap-proof-projection-v3.md)
defines exact own-XID/receipt lineage, complete source sets, explicit shared/nested
epoch cardinality and immutable phase prefixes. Source-only; native projection,
persistence and production authority remain BLOCKED. No migration 87 or changes
to guards/migrations 1–86. RF-HOST-035 PARTIAL; all eight flags false, registration
UNKNOWN / MONITORED RESIDUAL RISK. Exactly one next atom, not started: additive
migration 87 and pin-checked guard/native-port upgrades. Native qualification
comes later. Earlier entries are historical.

## Owner amendment v71: public completion verifier blocked on signer authority

**Minimal blocked contract DONE; cryptographic verifier BLOCKED.** The delegated
fallback applies: the current public-key model does not authorize a canonical
signer for peer, completion or binding. No signing authority is inferred from
an existing key's ability to verify Ed25519 bytes.

Signer/key-purpose inventory:

| Source | Existing authority | Missing authority |
| --- | --- | --- |
| `bootstrap-issuer-contract.ts`, `bootstrap-issuer-authority-v1.md` | Canonical Ed25519 SPKI DER history, purpose `worker-bootstrap-owner-ticket-v1`, issuer = workspace, installation binding, epoch/revision/high-water and rotation history | No peer/completion/binding purpose or worker signer identity/history |
| `TrustedProviderTicketKey` in Prisma schema | Workspace/installation ticket-key anchor with key ID, epoch and digest | No additional signer purpose or host identity; not a second key registry |
| `decision-attestation-key-model.ts` | `owner-decision-attestation-v1`, raw-public-hex, its own digest/history | Owner decision authority cannot authorize worker proofs |
| `bootstrap-signed-decision-contract.ts` | `bootstrap-current-owner-decision-v1`, raw public key proposal | Does not define peer/completion/binding authority |
| `worker-bootstrap.service.ts` | Synthetic context reuses its supplied ticket public key for ticket/decision/peer/completion | Synthetic convention is not canonical signer qualification |

`bootstrap-canonical-completion-verifier.ts` exports the frozen
`completionPublicVerifierContract` and explicit
`createCanonicalCompletionPublicVerifier()` dependency accepted by
`createCanonicalBootstrapCompletion`. This is an **always-denying availability
contract**, not cryptographic verification: `verify` returns false without
reading the supplied Db, request, public key or any trust callback. It accepts
no alternate key reader or caller-supplied authority. `cryptographyQualified`
and `signerAuthorityQualified` are false. Precise blockers are
`bootstrap_peer_signer_purpose_history_unavailable`,
`bootstrap_completion_signer_purpose_history_unavailable` and
`bootstrap_binding_signer_purpose_history_unavailable`. Default composition
still has no verifier; no endpoint or runtime wiring changes.

Existing wire inventory, **not a newly approved encoding**: peer and completion
use `roost-worker-bootstrap-v1:peer` and `roost-worker-bootstrap-v1:completion`;
binding uses `roost-bootstrap-canonical-completion-v1`. Existing helpers encode
UTF-8 `domain + ':' + reviewDigest(payload)`, with a SHA-256 hex digest of JSON
after recursively sorting object keys and preserving array order. Generic
`reviewDigest` alone does not qualify untrusted raw JSON: JSON coercions and
duplicate-key loss, Unicode and NUL policy still need an explicit strict wire
contract. No domain, signature format or existing signed bytes changed.

The minimum future contract must explicitly identify which principal signs
each kind and authorize its purpose in canonical public-key history, linked to
the actual issuer/worker identity and installation/host generations. It must
bind exact key ID/purpose/Ed25519/SPKI DER format and digest, epoch/high-water/
revision, issue/completion/observation time, and stage/cutover/overlap/revoke/
retire history; old keys must fail after hard cutover. Selection and fresh key
and source rereads must use the same bound Db and deny drift. Strict canonical
44-byte Ed25519 SPKI DER/base64 and 64-byte signature encoding, separate versioned
domains, unambiguous canonical bytes and low-level fail-closed verification
must retain all lifecycle/credential/ticket/envelope/request/attempt/seal/
dispatch/certificate/SNI/address/time/digest bindings already checked by
`validateCompletion`. No signer principal or new purpose is approved here.

Focused denial integration: **6/6 PASS**, including first enrollment, recovery,
default composition, wrong/invented purposes, hostile Db/request objects and
20 concurrent completions. Zero writes, credential activation, provider calls,
private-key/sign/verify/network/process effects or captured logs. This tests
the blocker, not valid signatures or concurrency against rotation/revocation.
No new signed public vectors, RFC8032 signature qualification or provenance
claims: **NOT RUN / BLOCKED** are positive peer/completion/binding verification,
signature/field/key tampering, malformed DER/base64/signature rejection,
cryptographic domain separation, fresh key reread and 20 verification-versus-
rotate/revoke races. Existing issuer public-point tests do not qualify these
signatures. Synthetic verifier doubles remain test-only.

Selected source/mocked regression: **56/56 PASS**, zero failures/skips/cancellations,
exit 0 (24.227 seconds), covering the new denial contract, existing canonical
completion and canonical issuer suites. Server build, lint (338 routes / 45
files) and all three contract-pin checks pass. Legacy bootstrap suites that
generate test signing keys were not run. No native suite or web build this atom.
Diff checks pass; all 85 migration directories, Prisma schema, existing runtime
and runner remain unchanged from `abc397719c620d2ce8229ac874cf34bab97c82fe`.
Default context is 143919 bytes, below the 150000-byte limit.

No private key, seed, keypair or signing operation was introduced or used in
this atom. No DB, Docker, network, credential creation, delivery/provisioning,
schema/migration edit, default activation, push or deployment. The v70 native
20/20 below is historical persistence evidence and is not cryptographic proof.
Unrelated dirty documents, unread/untracked/unstaged `design-qa.md`, retained
roots and historical sandbox content remain untouched.

RF-HOST-035 remains **PARTIAL**, production **BLOCKED**. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` remain false. Registration cause remains UNKNOWN / MONITORED
RESIDUAL RISK. Possession proof, secure delivery/provisioning and ordinary
successor admission remain outside this atom.

Exactly one next recommendation, **not started**: owner-approved source-only
signer identity/purpose/history contract for all three message kinds, resolving
the canonical authority gap before implementing public-signature verification.
Earlier next-atom recommendations below are historical.

## Owner amendment v70: canonical completion recovery without fallback

**Full native suite: 20/20 PASS, zero failures/skips/cancellations, native child
exit 0, nativeRuns=1, 446.072 seconds.** Exactly one fresh owned disposable
PostgreSQL 16 database received the final unchanged 85-migration chain from zero.
No retry, schema reset, migration edit or function replacement was needed.
This atom changes only the canonical completion fixture, its recovery assertions
and documentation. Runtime, Prisma schema and qualification runner are unchanged
from delegated baseline `6de4bd98fe4e4c10a53713e09c7939d911f2432f`.

`completionRecoveryPrior` now awaits exactly one real
`createPrismaBootstrapChannelStore(db).transition({action:'revoke', ...})`.
Its result must match the exact operation ID, revision 2, action revoke and state
revoked. Any rejection, including `reconciliation_required`, propagates immediately
and prevents ticket recovery setup. The historical catch and its independent SQL
row/head/native-receipt/writer-XID proof are deleted. No manual readback,
`reconcileRevocation` call, error substitution or write retry remains in that
setup. A source check confirmed one direct call, zero catches, zero manual raw
queries and zero explicit reconciliation calls in `completionRecoveryPrior`.
The returned successful record is passed through to the recovery assertion;
the runtime's own committed readback remains the only channel success gate.

The native recovery case establishes all of the following in sequence:

- Actual credential and handoff revocation precede direct channel revoke/readback
  success at channel revision 2; actual ticket revocation then supplies recovery's
  canonical predecessor.
- Both the public baseline and the actual stored predecessor have credential
  version 2. The stored predecessor is inactive with a revocation timestamp.
- The fresh candidate has a different ID, is inactive before completion and has
  epoch 2. It is inert fixture data with no corresponding usable credential.
- Existing injected signed peer/completion/binding evidence doubles and possession
  checks execute through the real explicit completion factory.
- Exactly 11 writer statements produce one completion, the exact target ID and
  fingerprint, an acknowledged handoff with ACK timestamp and an active epoch-2
  fixture record. The native output records `directChannelRevoke=true`,
  `reconciliationFallback=false`, `predecessorVersion=2`, `freshCandidateEpoch=2`,
  `statements=11`, `acknowledged=true` and `activated=1`.

The **entire** existing completion suite ran, not a recovery-only selection:
first enrollment and recovery, 20 independent clients/PIDs with one completion
writer, read-only exact replay/conflict denial, invalid signature/possession
verdicts, 16 internally re-signed binding mutations, all 11 rollback phases,
real deferred rejection including migration-85 receipt rejection despite Prisma
false resolution, actual pre-COMMIT connection termination, false/lost ACK,
two real post-COMMIT response cuts, missing/mismatched/unavailable independent
readback, four callback source mutations, six immediately-before-COMMIT source
mutations, eight malformed direct completion inserts, receipt/Event/digest/XID/
fence/head/lineage tampering, ticket revocation/restart and immutable guards.
Read paths do not repair evidence. Uncertain completion remains
`reconciliation_required`, `retryable=false`, with zero automatic write retries.

The runner's exact success assertions pass: `faultRelay.armed=2`,
`faultRelay.applied=2`, `lostCommitResponseCuts=2`, `fullSuite=true`, `skips=0`,
`nativeExitCode=0`, `nativeRuns=1`, `migrations=85`,
`finalMigrationSourceChanged=false`. Applied/final source-chain SHA-256:
`17a6849ec2c0442bb3d34b3a1e1d335321e95026312ff283051a527ecda2fbdd`.
All migrations 1-85, runtime modules, Prisma schema and runner compare unchanged
with the delegated baseline. No production migration was applied.

Cleanup **PASS**, runner **exit 0**: the single owned DB was removed, relay
listener/process closed, no active owned sessions remained and zero external
helper files/directories were created. Container/volume/image/network inventory
was restored, Roost PostgreSQL returned to its initial stopped state and Soar
remained unchanged. The three existing databases / 214 tables and sequences
retain the same before/after fingerprint:
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

Source/mocked regression **349/349 PASS**, zero failures/skips/cancellations,
exit 0 (47.870 seconds). Server build, lint (338 routes / 45 files), three
contract-pin checks, runner AST and scoped/staged diff checks pass. Default
context remains below 150000 bytes. No web change or web build. Unrelated dirty
product/planning documents, unread/untracked/unstaged `design-qa.md`, retained
roots and historical sandbox content remain untouched. No push or deploy.

The legacy channel revoke integration gap in canonical completion recovery is
**closed for the tested native persistence path**. There is no newly discovered
runtime defect. This qualifies the real committed persistence/readback behavior
with injected public signature and possession doubles; it does not qualify
cryptography, real delivery, usable-key/credential creation or provisioning.
No default composition, endpoint or installation/target/profile/model activation
was introduced. Non-database network/DNS/listener/process/private-key/signing
APIs remain forbidden in the suite; `forbiddenEffects=0`, `privateKeys=0`,
`realDelivery=0`, `defaultActivation=false`.

RF-HOST-035 remains **PARTIAL**, production **BLOCKED**. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` remain false. Only explicit canonical completion can report
completionRecorded/credentialActivated after exact committed proof; default and
legacy durable paths remain false. Registration cause remains UNKNOWN /
MONITORED RESIDUAL RISK. Concrete production signature verification, possession
proof, secure delivery/provisioning and ordinary successor admission remain
outside this persistence qualification.

Exactly one next recommendation, **not started**: a source-only explicitly
injected public-signature verifier for canonical completion peer/completion/
binding, qualified with fixed public test vectors and current issuer binding,
without private-key access, default wiring or activation.

## Owner amendment v69: native channel revocation readback passes

**Final native run: 16/16 PASS, zero failures/skips/cancellations, native child
exit 0, 56.880 seconds.** One fresh owned disposable PostgreSQL 16 database was
created; the complete unchanged 85-migration chain was applied once from zero.
The qualifier ran twice in the same DB/OID without schema reset or migration
replacement. The first run was **8/16 PASS, exit 1**: its opted-in fixture decisions
lacked the required decision revisions and were rolled back by a deferred guard
despite a resolved Prisma promise. Corrected fixture creation includes the
revision, forces deferred constraints before returning, restores the older policy
guards and independently confirms the committed N before invoking the runtime.
All migration-83 triggers stay active during that preparation. This corrects
fixture evidence; the first failed run is not presented as a clean pass.

The final suite calls the real `createPrismaBootstrapChannelStore().transition`
and `reconcileRevocation` with actual migration-81/83 triggers, rows, receipts and
Events. Complete committed proof returns a successful revoke Promise directly.
There is no fallback that catches a failed revoke and labels a manual read as
success, and no mocked SQL verdict. Public source fixtures contain no usable
credential, private key, signer or real delivery. N=0 exercises the legacy exact
reader path on the final catalog; N=1 and N=3 exercise the attested causal path.

| Opted-in roots N | Before F | Native head H | Audit/history A | Final T | Authority children |
| --- | --- | --- | --- | --- | --- |
| 0 | 653 | 656 | 657 | 657 | 0 |
| 1 | 695 | 698 | 700 | 701 | 2 |
| 3 | 759 | 762 | 766 | 769 | 6 |

These are actual final-run values, not predicted replacements for readback.
They establish H=F+3, A=H+N+1 and T=A+N. Native head and source-head receipts share
H; native audit/history and source-history receipts share A. Each opted-in decision
has one head-source child followed by one history-source child, with exact
predecessor digest/revision. Independent assertions check the real child receipt
fences, XIDs, canonical row digests and Event payloads. Runtime readback verifies
the exact operation, head, previous history, generation, grant and native full-row
receipt bindings. Repeated explicit reconciliation leaves canonical snapshots
unchanged and executes READ ONLY Repeatable Read only.

One minimal source correction was required by review of the native negative
cases: selecting only native receipts with the operation's XID hid an extra
foreign-XID receipt in the same interval. The base query now includes own-XID
receipts **or any native receipt in the reconstructed interval**; existing exact
cardinality, digest and XID checks reject the foreign duplicate. This is covered
by a new source regression and the native corruption matrix. No fence comparison,
source lineage check, catalog pin or migration was weakened.

| Native boundary | Final evidence |
| --- | --- |
| Transport bindings | Eight committed corruption cases deny: missing native receipt, wrong XID/digest, foreign duplicate receipt, wrong head, predecessor, generation and grant. |
| Source lineage | Nine committed cases deny: missing/duplicate/foreign/stale/gapped/unrelated receipt, digest mismatch, authority predecessor corruption and internally consistent foreign-XID replay. |
| Events / fence / operation | All five automatic Events in an N=1 revoke reject wrong payloads; current-fence regression/gap, stale or missing head and five exact-operation substitutions deny. |
| COMMIT uncertainty | False ACK, explicit pre-COMMIT rollback, actual writer connection termination and real deferred native audit rejection return reconciliation_required, leave no committed revoke and perform no writer retry. |
| Committed response loss | Synthetic caller-response loss and two real relay cuts after PostgreSQL COMMIT leave exactly one revoke, return reconciliation_required and succeed only through explicit exact READ ONLY reconciliation. Final-cut N=1: F/H/A/T=1203/1206/1208/1209; N=3: 1267/1270/1274/1277. |
| Incomplete / concurrent readback | Removing an actual committed receipt or performing a separate origin source mutation between COMMIT and readback denies; subsequent reads do not repair or rebase the proof. |
| Purity / pins | Replica reads, a disabled source trigger and altered helper volatility deny. Restoring exact catalog metadata restores successful reconciliation. Direct guarded receipt deletes reject. Non-DB network/DNS/listener/process/private-key/signing APIs are forbidden; effects=0. |

Fault-relay aggregate assertions pass: three armed/applied cuts across both runs
(one in the failed run, **two in the final full run**), `fullSuite=true`, `skips=0`,
`nativeRuns=2`, `nativeExitCode=0`. The chain matches final source exactly:
`17a6849ec2c0442bb3d34b3a1e1d335321e95026312ff283051a527ecda2fbdd`.
All migrations 1-85 and Prisma schema compare unchanged with delegated baseline
`e3db77138a33247de2bc23d5277ad733dda09bff`. No production migration was applied.

Cleanup **PASS**, runner **exit 0**: the single owned database was removed;
relay listener/process closed, no active owned DB sessions remained, and zero
external helper files/directories were created. Container/volume/image/network
inventory was restored, Roost PostgreSQL returned to its initial stopped state,
and Soar remained unchanged. The three existing databases / 214 tables and
sequences retain the exact before/after fingerprint:
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

Source/mocked regression **349/349 PASS**, zero failures/skips, exit 0 (45.182
seconds). Server build, lint (338 routes / 45 files), three contract-pin checks,
runner AST and scoped/staged diff checks pass; default context remains below
150000 bytes. No web change or web build. Unrelated dirty documents,
`design-qa.md` (unread/untracked/unstaged), retained roots and historical sandbox
content remain untouched. No default wiring, deployment, push, real key or
credential delivery, provisioning or installation/target/profile/model activation.

The legacy channel revoke readback gap is **closed for the tested native path**.
This does not broaden authority or qualify production transport. RF-HOST-035
remains **PARTIAL**, production **BLOCKED**. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` remain false. Existing explicit canonical completion/activation
retains its committed-proof condition; default/legacy durable flags remain false.
Historical registration cause is UNKNOWN / MONITORED RESIDUAL RISK.

Exactly one next recommendation, **not started**: bounded native canonical
completion recovery regression with the historical channel-revoke reconciliation
fallback removed from its fixture, requiring direct successful revoke/readback
before recovery and rerunning the complete completion suite on an owned DB.

## Owner amendment v68: source-only legacy channel revocation readback

The legacy channel store no longer treats the native history receipt's fence as
necessarily equal to the final committed fence for `revoke`. On attestation-enabled
sources, migration 83 appends automatic decision-authority source changes after
that receipt. The old equality could therefore report `reconciliation_required`
after a valid committed revocation. This atom changes only the source reader,
its store integration, mocked regression fixtures/tests and this documentation;
it does not qualify the new SQL on PostgreSQL.

The algorithm is tied to the existing pinned migration-81/83 trigger bodies.
Let F be the fence locked before the revoke and N the number of opted-in workspace
decision roots (`authority_revision=1`):

| Phase | Exact fence / evidence |
| --- | --- |
| History INSERT and head UPSERT | History BEFORE ROW, speculative head INSERT and actual head UPDATE advance three epochs. Native head receipt and source head receipt share H=F+3. |
| Head source changes | Exactly one authority child per opted-in decision, with its own automatic receipt/Event, occupies H+1 through H+N. |
| Native audit/history | Native audit INSERT advances one epoch. Native audit and history receipts, plus the source history receipt, share A=H+N+1. |
| History source changes | Exactly one authority child per same decision occupies A+1 through A+N. Final fence T=F+4+2N. |

The three initial increments are derived from the pinned writer/UPSERT order,
not unexplained gaps permitted by a relaxed comparison. With N=0, the old exact
catalog path requires A=H+1 and T=A and references no migration-82/83 relations
or helpers. An expanded tail requires the complete pinned attestation catalog.
Distinct native and source receipts can legitimately share a phase's epoch;
duplicate identities or child epochs cannot substitute for missing evidence.

The write transaction captures its actual writer XID and F/T witness. A separate
Repeatable Read READ ONLY transaction must observe the exact operation record,
current head, predecessor, generation and grant bindings, automatic channel Event,
native audit and all three native full-row receipts for that XID. An expanded tail
also reads actual source rows, all authority children of that writer, and all
attestation receipts either belonging to that writer or within the complete
interval, including foreign receipts. It validates exact row digests, Event
metadata/payload, source bindings, decision set, operations, XIDs, unique receipt
and Event identities, predecessor digests/revisions and every causal epoch.
The head-source predecessor precedes the operation; each history-source child
extends its own head-source child. The captured witness is never reset to a
newer current fence. A concurrent unrelated source change fails closed.

False/unknown COMMIT, a lost response or an incomplete independent readback returns
`ChannelReconciliationRequired` (`code=reconciliation_required`,
`retryable=false`, `deliveryUnknown=true`), without an automatic retry. Writer and
read callbacks cannot be replayed to authorize success. The explicit
`reconcileRevocation(exactOperationRecord)` method can independently reconstruct
only that committed revoke in READ ONLY Repeatable Read. Successful repeated
reconciliation is idempotent; missing/conflicting/unavailable proof remains
reconciliation-required. It never invokes transition, repairs or backfills rows,
refreshes a write witness or grants launch/delivery authority. Existing status and
inspection stay read only; other transition types retain their existing proof.

Validation **PASS**: 348/348 selected source/mocked tests, zero failures/skips/
cancellations, exit 0 (42.203 seconds), including 45 new revocation readback tests
and the existing channel-store/ticket-lifecycle suites. Coverage includes legacy
and attested catalogs, N=1/N=3 causal tails, legitimate shared epochs, receipt,
Event/XID/digest/head/operation mismatches, missing/duplicate/foreign/replayed
proof, gaps/regressions, concurrent source change, false/lost/unknown COMMIT,
missing/repeated callbacks, explicit exact read-only reconciliation and no retry.
The new suite forbids network, DNS, listener, process-launch, key-generation and
signing APIs; observed effects=0. Mocked SQL verdicts are not native SQL execution
or proof that the PostgreSQL trigger sequence has passed.

Server build, lint (338 routes / 45 files), three source-contract pin checks and
scoped/staged diff checks pass. All 85 migration files and Prisma schema compare
unchanged with the delegated baseline `04de66d877dffc7fa4043aec575f58544a916fe2`;
no native harness change. Default documentation context is below 150000 bytes.
No DB/Docker/private-key/network run, migration/reset, real delivery, default
wiring, credential generation, installation/target/profile/model activation,
push or deploy. Unrelated worktree changes and retained directories are preserved.

RF-HOST-035 remains **PARTIAL**, production **BLOCKED**. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` remain false. Canonical explicit completion/activation retains
its existing committed-proof condition; default and legacy durable flags remain
false. Historical registration cause remains UNKNOWN / MONITORED RESIDUAL RISK.
The v67 native 20/20 result below applies to its unchanged baseline and does not
qualify this new legacy readback implementation.

Exactly one next recommendation, **not started**: bounded native qualification of
this source-only channel revocation readback fix on a fresh owned disposable DB,
including actual trigger order, independent receipt/XID/fence proof and uncertain
COMMIT/read-only reconciliation, without a fixture fallback hiding failure.

## Owner amendment v67: full native completion rerun passes

**20/20 PASS, zero failures/skips/cancellations, native child exit 0, runner exit 0,
nativeRuns=1, 416.558 seconds.** This rerun used the unchanged committed harness
from `e9671f2d5c3ddc29ae62a312be308f0b4ad98fc9` on one fresh owned PostgreSQL 16
disposable database. All 85 final migrations were applied from zero, without schema
reset, function replacement, migration edits or backfill. This atom changes only
documentation evidence. The v66 callback-fixture qualification gap is now closed;
the unsuccessful v66 result below remains historical evidence.

The real explicit completion factory and existing concrete authority, dispatch,
credential, handoff and lifecycle stores were used. Public peer/completion/binding
verification and possession checks remain injected synthetic doubles on the same
Db; no private key, cryptographic signing API, credential generation, real delivery,
provisioning, endpoint, default wiring or installation/target/profile/model
activation was performed. The tested activation concerns exact inert fixture
ApiKey facts, not delivery of a usable secret.

| Native evidence | Complete rerun result |
| --- | --- |
| First enrollment / recovery | PASS: 11 statements atomically persist completion, acknowledged handoff and exact active credential, independently read back. Recovery retains actual revoked predecessor version 2 and activates new epoch 2. |
| Contention / replay | PASS: 20 independent clients and 20 writer backend PIDs produce one writer, activation and credential operation. Identical completed replay is READ ONLY/idempotent; conflicting replay denies. |
| Rollback | PASS: all 11 statement faults hit their intended phase; all canonical snapshots/fence values match before/after, with zero activation. |
| COMMIT/readback | PASS: real deferred rejection, native migration-85 missing-receipt rejection despite Prisma false resolution, pre-COMMIT connection termination, false/lost ACK, two real post-COMMIT response cuts, and missing/mismatched/unavailable independent readback. Uncertainty is reconciliation_required with retryable=false and zero or one persisted activation. No automatic operation retries. |
| Callback drift | PASS: all four host/credential/handoff/fence mutations actually execute in controlled fixture mode, restore origin before the real observer, then deny and roll back with no completion writes. |
| Immediately before COMMIT | PASS: all six fence/decision/certificate/key/channel/credential mutations deny and roll back. |
| Binding / tampering | PASS: 16 re-signed binding mutations, invalid verifier/possession verdicts, eight malformed direct child inserts, missing/extra receipt, Event/digest/XID/fence/head/lineage corruption, ticket revocation/reconstruction and immutable guards. Read paths do not repair evidence. |

The runner's success-only aggregate assertions were reached and passed:
`faultRelay.armed=2`, `faultRelay.applied=2`, `lostCommitResponseCuts=2`,
`fullSuite=true`, `skips=0`, `nativeExitCode=0`, `nativeRuns=1`,
`migrations=85`, `finalMigrationSourceChanged=false` and exact applied/final
source-chain equality. All migrations 1-85, Prisma schema, runtime and harness
remain unchanged. Chain SHA-256:
`17a6849ec2c0442bb3d34b3a1e1d335321e95026312ff283051a527ecda2fbdd`.
Migration 85 LF SHA-256:
`92235ec16e72b98d9170b040e1650b331896f0cb89cba895f3267a2b9fba7237`.
Production migration application remains unauthorized.

Cleanup **PASS**: the sole owned DB was removed, relay listener/process closed,
zero external helper files/directories were created, initial container inventory
was restored, Roost PostgreSQL returned to its initial stopped state and Soar was
unchanged. All three existing databases / 214 tables and sequences retain the
same before/after fingerprint:
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.
Source tests **288/288 PASS**, zero skips, exit 0 (44.857 seconds). Server build,
lint (338 routes / 45 files), three source-pin checks, runner AST and scoped/staged
diff checks pass. Default documentation context remains below 150000 bytes.
No web build was needed; this rerun introduces no code change.

Qualification is limited to the tested native persistence path and injected
public-evidence context. Only the explicit factory may return
completionRecorded=true/credentialActivated=true after verified committed proof;
default and legacy durable paths remain false. RF-HOST-035 PARTIAL, production
BLOCKED; implementationReady, executionSupported, pilotReady, liveAdmissionAllowed,
pilotExecutionAuthorized, pilotExecutionStarted, transportQualified and
launchAuthority remain false. Historical registration cause remains UNKNOWN /
MONITORED RESIDUAL RISK.

The known legacy channel-store revocation readback gap is unchanged and outside
this atom: an attestation-enabled fixture may commit revoke then receive
reconciliation_required from the older strict-fence readback. The fixture proves
the exact committed row/current head/native receipt/XID independently without
retrying. This successful completion rerun does not qualify that legacy readback.

Exactly one next recommendation, **not started**: source-only correction of the
legacy channel-store revocation readback for attestation-enabled sources, retaining
exact committed receipt, writer-XID and causal-fence proof rather than dropping
fence checks; no migration, default wiring, real delivery or activation changes.

## Owner amendment v66: native completion evidence, qualification blocked

**Last full native run: 18/20 PASS, zero skips, native exit 1, runner exit 1,
416.718 seconds.** One subtest and its parent failed. This is not a successful
native qualification, even though all other completion scenarios passed.

The real explicit completion factory, concrete SQL writer, branded authority
reader and existing dispatch/credential/handoff/lifecycle stores were exercised
on PostgreSQL 16 with Prisma 5.22.0. Twenty separate clients had distinct backend
PIDs. Public signature and possession checks remained synthetic injected doubles
on the same writer Db; no cryptographic signing API/private key, real delivery,
credential generator, provisioning, endpoint or default composition was used.
Inactive candidate ApiKey/handoff facts were owned fixtures prepared after ticket
issue and before attestation/seal. There is no deploy-time or recurring seed.

| Native case | Observed result |
| --- | --- |
| First enrollment and owner recovery | PASS: all 11 concrete statements commit atomically; independent readback proves exact acknowledged handoff and active credential. Recovery uses actual revoked prior credential version 2 and new epoch 2. |
| Contention and replay | PASS: 20 clients / 20 writer backend PIDs, one completion writer, one activation and one credential operation; exact completed replay is READ ONLY/idempotent, conflicting evidence denies. |
| Binding and callback verdicts | PASS: 16 internally re-signed binding mutations and invalid peer/completion/binding/possession verdicts deny without completion writes. Doubles do not qualify cryptography. |
| Statement rollback | PASS: injected faults after each of the 11 actual statements, each confirmed hit; full canonical table/fence snapshots remain identical, zero activation. |
| Transaction ambiguity | PASS: real deferred rejection, migration-85 missing-receipt rejection despite Prisma false resolution, actual pre-COMMIT connection termination, false/lost ACK, two real post-COMMIT relay-cut scenarios and missing/mismatched/unavailable independent readback. Results require reconciliation, never automatic retry; persisted activation is zero or one. |
| Callback source drift | FAIL: the first host mutation was rejected by the existing worker_identity_authority_requires_lifecycle guard before the test's post-mutation hit flag. Remaining callback mutations in that loop were not reached. No native completion success was returned. |
| Immediately before COMMIT | PASS: six injected fence/decision/certificate/key/channel/credential changes are rejected and fully rolled back. Fault preparation temporarily uses replica mode inside the owned transaction; writer/deferred checks run in origin mode. |
| Direct insertion and committed corruption | PASS: eight malformed child inserts; missing/extra receipt, Event payload, row digest, XID, fence, head and predecessor-lineage corruption all deny. Read paths do not repair data. Ticket revocation/reconstruction and immutable-row guards also pass. |

The final source fixture now injects callback corruption temporarily in replica
mode, restores origin before returning to the real observer, and records the hit
only after the mutation. This mirrors the separately passing pre-COMMIT fault
fixture; it is not a production writer or a weakened guard. **That correction has
compilation evidence only; a final complete native exit-0 run is still missing.**
The one-database delegation has been exhausted and cleaned up; no second database
was created or next atom started.

Three native suite executions in one runner used the same disposable database/OID, rebuilding
only its public schema and reapplying all 85 migrations before each retry. Run 1
exposed candidate preparation before first-enrollment ticket issue; run 2 exposed
the legacy channel store's strict fence readback after a committed revocation.
Two bounded recovery probes (one diagnostic join correction, one success) used
that same database before the last schema rebuild. The recovery fixture now
catches only reconciliation_required and proves the exact committed channel row,
current head, original row digest and writer XID independently, without retrying
the write. This does not repair or qualify the legacy store's default readback;
that compatibility gap remains separate from canonical completion.

All migrations 1-85 and the Prisma schema are unchanged; no SQL correction was
needed. Fresh applied chain SHA-256:
`17a6849ec2c0442bb3d34b3a1e1d335321e95026312ff283051a527ecda2fbdd`.
Migration 85 LF SHA-256:
`92235ec16e72b98d9170b040e1650b331896f0cb89cba895f3267a2b9fba7237`.
Production application remains unauthorized. The runner's final success-only
aggregate assertions were not reached after the failed test.

Cleanup independently **PASS**: owned database removed, relay listener/process
closed, no helper files/external helper directories created, original container
inventory restored (including stopped Roost PostgreSQL), Soar untouched. All
three existing databases / 214 tables and sequences have identical before/after
fingerprint `e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.
Selected source tests: 288/288 PASS, zero skips. Server build, lint (338 routes /
45 files), three source-pin checks, runner AST and scoped diff checks pass.
No web build: backend/test-only atom. Default context stays within 150000 bytes.

The new explicit factory's completionRecorded/credentialActivated can be true
only for a proved committed result. Default/legacy durable paths remain false.
RF-HOST-035 PARTIAL; production BLOCKED; implementationReady, executionSupported,
pilotReady, liveAdmissionAllowed, pilotExecutionAuthorized, pilotExecutionStarted,
transportQualified and launchAuthority remain false. Historical registration cause
remains UNKNOWN / MONITORED RESIDUAL RISK; the newly classified fixture error does
not resolve that separate historical question.

Exactly one next recommendation, **not started**: a bounded full native rerun of
the corrected completion fixture, under a new one-disposable-database delegation,
requiring 20/20 PASS, exit 0, relay counters, final-chain equality and cleanup.

## Owner amendment v65: signed canonical completion, source only

`createCanonicalBootstrapCompletion` is an explicit, unwired factory. It uses the
existing canonical authority reader and durable dispatch history, not a second
credential registry or the HTTPS coordinator's process-local latches. There is no
network transport, signer, private-key access, credential creation, provisioning,
endpoint, default composition or activation of installation/profile/target/model.

| Existing root | Integration and boundary |
| --- | --- |
| Signed bootstrap peer/completion | Original signatures are retained. An additional signed binding covers the exact final command, durable predecessor receipt, seal/envelope, request, lifecycle generations, credential generation/fingerprint, handoff/approval, peer/completion digests and issued/completed times. Ordinary coordinator peer observations are not silently converted into bootstrap signatures. |
| Ticket/attempt and dispatch | Existing branded authority reader runs in READ ONLY RepeatableRead. The same global source fence is locked in the write transaction; exact unchanged authority and dispatch predecessor are mandatory. Final durable dispatch append precedes canonical dispatched/acknowledged histories and matching dispatch/complete ticket events. Existing roots and their guards remain authoritative. |
| ApiKey / handoff / credential operations | The target must already exist inactive and unrevoked, with an awaiting_ack handoff and separately accepted owner credential decision. Candidate/handoff preparation must precede the signed seal; this atom does not prepare them. Recovery uses the exact approved predecessor. Public fingerprint alone is not possession evidence. An explicit provider must validate existing handoff possession/ACK and return the exact SQL-derived public fact under the same transaction/fence. |
| Transport | Existing bootstrap transport grant/history/head, peer address/SNI/CA/pin/certificate epoch and lifecycle generations remain bound through authority and immutable-source digests. No ordinary credential transport generation is created. Successor ordinary admission remains unqualified. |
| Receipt children | UNAPPLIED additive migration 85 introduces worker_bootstrap_completions and worker_bootstrap_completion_receipts with FKs to existing dispatch/attempt/ticket/handoff/ApiKey roots. The child records evidence and receipt links, not a mutable authority projection. No migration 1-84 edits or Prisma schema changes. |

The verifier is explicitly injected and called for peer, completion and the new
binding with domain-separated payloads. Peer/completion retain the existing
`roost-worker-bootstrap-v1:peer` / `:completion` domains; the binding uses
`roost-bootstrap-canonical-completion-v1`. Verification must authenticate the
exact current issuer public key and signed canonical payload digest. No default
verifier or credential-possession provider exists. Source fixtures use synthetic
signature strings and injected verdicts; they do not qualify cryptography.
Every callback shares the bound writer transaction. Public facts, source digest,
fence and validity are rechecked after callbacks; mutation or time drift denies.

The concrete SQL writer performs 11 statements within one Serializable callback:
final durable dispatch, two attempt histories/ticket events, one final head CAS, handoff ACK,
existing-key activation CAS, existing credential operation/Event and the new
completion child. Existing automatic bootstrap/decision receipts and Events remain
intact. The proof joins exact full-row digests, writer XID and observed fence
interval against the complete allowed receipt set, checking both source and legacy receipt sets. The mutable head is CASed once:
its legacy receipt key is unique per row/transaction, so two head writes would
conflict. Both immutable history records and matching ticket events are retained.
The exact fence interval includes three statement epochs: attestation on handoff
and ApiKey, plus transport-bootstrap on ApiKey. Those pinned statement fences
precede the row fences; additional gaps deny. Source hashes cover all relevant workspace authority
rows; only the exact target active bit and ACK state/time are excluded as intended
writes. Foreign receipt rows or changes to other source fields deny. Native guard
catalogs are pinned, including existing credential/handoff guards. Deferred checks
require the final receipt, exact current fence, full proof and unexpired authority.

An independent READ ONLY transaction checks the persisted child, automatic Event,
full-row receipt, canonical heads, actual active credential and causal proof after
COMMIT. Transaction-promise resolution alone is insufficient. Missing, mismatched
or unavailable readback, false/lost ACK and possible COMMIT uncertainty return
reconciliation_required with retryable=false; there is no automatic retry or
resend. Identical evidence can acknowledge an already committed result without
writes; changed evidence/operation/receipt denies. New factories reconstruct from
storage. Historical rows are retained after later revocation; failure to prove the
current completed/active state does not erase or rewrite them. Terminal dispatch
states cannot be reopened by this completion factory.

Verification: 37/37 focused source/mock tests and 288/288 selected source/mock
tests pass, zero skips. Coverage includes first enrollment/recovery, 47 invalid
binding/fact/time mutations, missing/invalid verifiers and possession provider,
20 concurrent factories with one activation, exact/conflicting replay, restart,
read purity, rollback at all 11 writer statements, deferred rejection, false/lost
ACK, missing/mismatched/unavailable receipt readback, callback drift and a change
immediately before COMMIT. These are source/mock results only. Server TypeScript
build, lint (338 routes / 45 files), all three source-pin checks and scoped diff
checks pass. No web build: backend-only atom. Default context remains below the
150000-byte documentation budget.
No database, Docker, native SQL execution or real network was used for v65.
Migration 85 and its PL/pgSQL guards remain **UNAPPLIED / NATIVE UNQUALIFIED**;
source tests cannot establish PostgreSQL trigger/deferred-constraint behavior,
actual concurrent transaction isolation, production trust or credential delivery.
The new factory's completionRecorded/credentialActivated flags are conditionally
true only for the full verified source/mock transaction model. The existing
ordinary/durable default paths are unchanged and retain false flags.

RF-HOST-035 **PARTIAL**, production **BLOCKED**. implementationReady,
executionSupported, pilotReady, liveAdmissionAllowed, pilotExecutionAuthorized,
pilotExecutionStarted, transportQualified and launchAuthority remain false.
Historical registration cause stays UNKNOWN / MONITORED RESIDUAL RISK.
Exactly one next recommendation, **not started**: separately authorize bounded
native qualification of migration 85 and the full canonical completion transaction,
including real rollback, deferred rejection, contention and COMMIT/readback loss.

## Owner amendment v64: native causal dispatch lineage qualification

**Final complete run: 24/24 PASS, zero skips, native exit 0,
runner exit 0, nativeRuns=1, 569.722 seconds.** One owned disposable
PostgreSQL database applied the complete final 84-migration chain from empty.
The real durable adapter, composition and unified status reader were used.
Twenty separate clients have distinct backend PIDs. Fresh factories model restart
boundaries; no OS process restart, production signer/trust or real delivery is
claimed.

| Boundary | Native evidence |
| --- | --- |
| Causal chain | Seal, consumed attempt/ticket anchors, every dispatch predecessor, request/response, Event/full-row digest, XID and fence match. Own dispatch writes leave the signed-source fence unchanged. First enrollment and owner recovery both complete the adapter sequence. Terminal unknown/reconcile/recover/cancel preserve every predecessor. |
| Contention | Twenty distinct writer clients at each of six normal phases produce one committed next receipt. Twenty composition factories produce one synthetic exchange and one completion. Separate twenty-way completion races retain exact final-operation idempotency without another permit. |
| Direct SQL | All 22 malformed appends deny: missing/extra lineage, null/replayed parent, wrong operation/Event/record/request/full-row digest/XID/fence, foreign anchor, altered seal/source receipt and ticket revision/digest, revision gap and duplicate operation. A valid append still succeeds afterward. |
| Corruption and drift | Eight explicitly corrupted owned-fixture cases cover missing history/receipt, wrong Event/full-row digest/XID/fence, missing exact source digest and source-fence regression. Status/writes deny without repair; each fixture is restored and independently fingerprinted. Normal guarded UPDATE/DELETE/TRUNCATE remains rejected. Ten source-drift cases and a change between read and lock deny writes. |
| Canonical revocation | The existing ticket lifecycle store performs real revocation, appends blocked attempt history and updates the current head. The original seal/receipt anchor remains identical, historyIntegrity=true, authorityCurrent=false, current attempt=blocked, effective delivery=unknown and no retry/permit. Status uses one READ ONLY snapshot. |
| Restart and purity | Fresh factories rebuild the whole lineage and separate current authority from historical integrity. Expired leases cannot restore send/completion; explicit pre-send resume raises owner high water. Canonical table fingerprints remain identical across inspection. |
| COMMIT | Twelve phases times six rollback modes: after insert, before COMMIT, injected deferred rejection, actual deferred receipt rejection, false ACK and real pre-COMMIT connection termination. All 72 preserve exact snapshots with zero transitions. Lost ACK at each phase leaves exactly one transition and no permit. Missing/mismatched/unavailable readback after send/completion denies. Two actual relay cuts after PostgreSQL COMMIT preserve one transition each; armed=2/applied=2. |

### Historical head correction

The v63 mocked later-ticket-event case did not move the canonical attempt head.
The real revocation contract also writes blocked attempt history and replaces that
head. Reading the current head as the original consumed row would therefore
misclassify valid history as damaged. The bounded reader correction reconstructs
the exact original public head from immutable attempt metadata and revision-one
consumed history. Its full-row digest must equal the original automatic receipt,
and the complete original operation receipt-set digest must still equal the stored
dispatch anchor. Missing or altered evidence still denies. Current head status is
read separately with its own exact receipt/Event. The current authority reader
continues to use the actual current head and strict completeness; no historical
projection can authorize a writer. This is a READ ONLY derivation, not a new head,
registry, backfill or source-authority exception.

**No migration correction was needed.** Migrations 1-84 and the Prisma schema are
unchanged from v63; migration 84 remains unapplied outside owned qualification
databases. Applied/final raw-file chain SHA-256:
`725ecf536d28bffea1886c47ab23875636939782a4052f53f15d16d3b88a1bf8`.
Migration-84 LF SHA-256:
`26c2fb9731b60583f5266397f3e473dbdbcac7bb80b1435dbef760457dfc8e54`.
Unchanged migrations 1-83 raw-file chain:
`5e7d56f423aeb4c325edf7a5804551c8ffdc664ac85bf289c48ec69ccaff148b`.

Cleanup independently **PASS**: owned database removed, relay/listener and child
processes closed, helperFilesCreated=0, zero external directories. Before/after
catalog, table/sequence, structure and role fingerprints match across three
existing databases / 214 tables and sequences:
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.
Roost PostgreSQL returned to stopped; other containers/inventory remained unchanged.
Soar was not operated. No private dotenv, credential/key generation, provisioning,
target/model/profile, real delivery or activation occurred.

Selected source/mocked tests **251/251 PASS, zero skips**. Server TypeScript build,
lint (338 routes / 45 files), both source-pin checks, runner syntax and scoped diff
checks PASS. No web build: backend-only changes. Protected dirty product/planning
documents, unread `design-qa.md` and retained roots are excluded.

Adapter completion still reports `completionRecorded=false`,
`credentialActivated=false` and `signed_bootstrap_completion_required`. Verified
signed peer/completion, atomic canonical lifecycle completion, real credential
facts, production trust/delivery and successor admission remain separate gaps.
RF-HOST-035 **PARTIAL**, production **BLOCKED**; `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` all remain false. Historical registration cause remains
UNKNOWN / MONITORED RESIDUAL RISK.

Exactly one next recommendation, **not started**: source-only integration of
verified signed peer/completion evidence with atomic canonical attempt/ticket
lifecycle completion and exact causal receipts, without default delivery or
credential activation from a response digest alone. Older recommendations below
are historical.

## Owner amendment v63: canonical dispatch receipt lineage, source only

The existing ticket and attempt roots remain the only roots. Every dispatch
record now embeds a strict `bootstrap-dispatch-lineage-v1` value: the exact
attempt seal digest and committed seal-operation receipt (including its complete
receipt-set digest), consumed ticket revision/head digest/receipt, consumed
attempt history/head digest/receipt, and the previous dispatch operation, Event,
record/request/full-row digests, writer XID and fence. The first parent is null;
all later parents must equal the actual preceding committed receipt. The current
operation/request and response/completion digests are bound by its immutable
record/full-row receipt. Anchor and authority revision/digest stay identical
through claim, send, completion, unknown, reconcile, recover and cancellation.

`bootstrap-dispatch-lineage.ts` reads the original canonical seal operation and
its automatic receipts. Its historical operation read checks the original writer's
rows and exact stored receipt-set digest; later lifecycle children from another
writer are not required to occur in that earlier transaction. Current authority
retains the existing stricter complete-child check. An audited later revocation
therefore remains visible as authority drift without erasing the consumed anchor.
The adapter replays the complete child state machine,
recomputes command digests, verifies all receipt/Event identities, rejects gaps,
duplicates, substituted source/foreign/replayed receipts, and re-reads the anchor
under the write lock and after COMMIT. Missing evidence fails closed. No new
registry, mutable head, process latch, automatic retry or source authority exists.

**Fence rule:** the admitted interval starts and ends at the exact committed
seal-operation fence. Dispatch children lock that same global fence without
incrementing it; their independent revision/owner epoch/claim generation and
receipt chain advance instead. Thus there are zero own *source* epochs to excuse.
Any increase is explicitly `foreign_source_epoch`, a decrease `fence_regression`;
neither admits work. The original canonical authority reader is unchanged.
Source drift before send grants no permit; after `send_started` the projected
state is `delivery_unknown`, with reconciliation required and retry disabled.

**One read projection:** `inspect` uses one database-enforced READ ONLY,
repeatable-read snapshot for canonical consumed heads, the separately audited
current ticket fact, every dispatch receipt, last receipt, lease and recovery
status. `historyIntegrity=true` means this bounded evidence was verified;
`authorityCurrent` is evaluated separately by the canonical reader and fence
rule. Expiry, revocation or unrelated authority changes can leave intact history
readable while disabling all writes/permits. Invalid or unavailable history
returns `historyIntegrity=false`, never a usable fallback. Fresh factories rebuild
this result from persisted rows only. They model process boundaries, not an OS
restart. No read grants a send/completion permit or writes a recovery decision.

### Canonical completion integration boundary

A dispatch `completed` record proves the adapter callback result and exact
response digest, not canonical bootstrap acknowledgement. The existing attempt
contract requires a verified `signedBootstrapPeer`, then a verified
`signedBootstrapCompletion` bound to ticket, request, target credential, peer and
time. The ticket requires a dispatched predecessor. This protocol currently has
only a consumed canonical attempt/ticket and a response digest; those inputs do
not satisfy either transition. It therefore leaves both canonical heads consumed
and explicitly reports `completionRecorded=false`, `credentialActivated=false`
and `signed_bootstrap_completion_required`. Composition reports the same
limitation. No fabricated signed proof, success mapping or root mutation is used.

The minimal future integration contract must receive and verify those exact
signed peer/completion and actual credential facts, preserve the current attempt
and ticket identities, and atomically append the permitted canonical predecessor
and terminal histories/heads plus their automatic Event/receipts. The canonical
writes must link their exact causal receipts back to the final dispatch and seal,
account for every resulting source epoch under an explicitly qualified rule,
and pass independent committed readback before reporting canonical completion.
Until this is implemented and qualified, no dispatch-only response can activate
a credential. Unknown/reconcile/recover/cancel remain linked child dispositions;
they neither fabricate canonical terminal facts nor reset consumed roots.

### Source-only schema and verification scope

Only the **nonproduction migration 84** changes: its existing guard validates the
strict lineage JSON against canonical receipt identities/sets and the immediately
preceding receipt/Event. The existing full-row dispatch receipt binds the new
field without new columns, tables or heads. The generated guard-body pin changes
with it. Migrations 1-83 and the Prisma schema remain unchanged. No migration was
applied in this atom; the v62 native PASS below applies to its earlier guard and
**does not qualify these new fields or SQL**. Existing legacy child rows without
lineage are denied; there is no backfill or silent admission path.

Selected source/mocked tests **251/251 PASS, zero skips**; server TypeScript
build, lint (338 routes / 45 files), both migration pin checks and scoped diff
checks PASS. Default context is 145184 bytes, below its 150000-byte budget.

Source/mocked tests cover both enrollment paths, twenty concurrent fresh factories
at each of the six normal phases, receipt/anchor tampering, all terminal parents,
restart reconstruction, unrelated epochs, read purity, rollback, false/lost ACK,
readback failure and no repeated external effect. Native SQL, Docker, databases,
network delivery and a web build are intentionally outside this source-only atom.

RF-HOST-035 remains **PARTIAL**, production **BLOCKED**. All eight flags remain
false: `implementationReady`, `executionSupported`, `pilotReady`,
`liveAdmissionAllowed`, `pilotExecutionAuthorized`, `pilotExecutionStarted`,
`transportQualified`, `launchAuthority`. The historical registration cause remains
UNKNOWN / MONITORED RESIDUAL RISK. Default wiring, production trust, delivery,
credential activation and successor admission remain unqualified.

Exactly one next recommendation, **not started**: bounded native qualification of
this causal lineage and changed migration-84 guard in an owned disposable database,
including direct malformed appends, twenty-client contention and uncertain COMMIT.
All recommendations and native evidence in v62 and older sections are historical.

## Owner amendment v62: native durable dispatch/completion qualification

**Final full run: 20/20 PASS, zero skips, native exit 0, nativeRuns=1,
488.335 seconds.** The actual `bootstrap-dispatch-prisma` adapter and durable
composition ran against a fresh complete 84-migration chain. Twenty separate
Prisma clients held distinct PostgreSQL backend PIDs. Fresh adapter factories
model process/restart boundaries; this is not an OS process restart test.
Exchange/completion, signing, owner authentication and key trust remain public
synthetic seams. No default wiring or real delivery was introduced.

| Boundary | Native evidence |
| --- | --- |
| State machine and authority | First enrollment and owner recovery complete all six normal transitions on the same attempt. Prepare, claim, start-send, outcome, start-complete, complete and status use distinct clients/PIDs; all writes have separate XIDs and exact immutable Event/receipt readback. The signed-source fence remains unchanged by dispatch children. |
| Competing owners | Twenty concurrent claims on twenty writer PIDs yield one committed owner. Twenty independent composition factories yield exactly one synthetic exchange and one completion. Twenty start-complete and twenty final-complete contenders each produce one winning append. |
| Completion identity | Exact final operation/request and response/completion-operation digests are idempotently acknowledged without another permit. Changed response, completion operation or final operation is denied. |
| Restart/lease | Pre-send recovery requires explicit expired-lease resume and increased ownerEpoch/claimGeneration. Old owners and stale CAS values deny. `send_started`, `delivery_unknown` and `completion_started` never regain a permit through restart or lease expiry. Expiry during committed readback also returns no permit. |
| Source drift | Owner, credential, host, installation, decision, ticket, lifecycle, issuer, channel and global-fence changes block writes. The audited history remains inspectable with `authorityCurrent=false`. A source change between the authority read and claim lock produces no append. |
| Rollback | Twelve phases times six failure modes: after-insert rollback, pre-COMMIT rollback, injected deferred rejection, actual migration-84 deferred rejection after removal of its uncommitted receipt, false ACK, and real connection termination before COMMIT. All 72 cases retain the exact pre-operation table fingerprints and zero committed transitions. |
| Uncertain COMMIT | Lost ACK at every phase leaves exactly one transition and no work permit. Missing, conflicting or unavailable independent readback after send/final completion also denies. Two real relay cuts after PostgreSQL COMMIT each leave one operation; armed=2, applied=2, no replay. |
| Terminal disposition | Explicit fresh-authority reconcile/recover/cancel retain history and do not reset the attempt. Invalid evidence/scope/CAS denies. Revoked/expired authority can inspect but cannot perform terminal mutations. |
| Integrity and purity | Native UPDATE/DELETE/TRUNCATE and malformed direct append are rejected. All eight new trigger bindings/bodies are checked; disabling each guard, changing a canonical helper configuration, replica mode or a read-only write transaction denies. Status uses database-enforced READ ONLY transactions and unchanged canonical-table fingerprints. |

The first, **uncounted** full attempt failed (0/20) and was independently cleaned
up before the final fresh run. Its first failure identified a digest-domain
mismatch in migration 84: the existing canonical reader's `ticketDigest` is the
ticket lifecycle **head** digest, whereas the original constraint compared it
with the signed envelope digest. The minimal correction compares the lifecycle
head and separately checks the seal's signed `ticketEnvelopeDigest` against the
ticket root. No TypeScript authority contract or existing writer was relaxed.
Only migration 84 and its generated guard-body pin changed; migrations 1-83 are
unchanged. The final database applied this corrected chain from empty, with no
post-application function replacement. Migration 84 remains unapplied outside
the disposable qualification databases.

The initial recovery fixture also omitted the required prior-channel revocation.
Its registration alert was classified against `validateChannelGrant`'s requirement
for a revoked predecessor channel, and the fixture now performs that canonical
transition before registration, as the earlier reader suite already did. The
final run had no unexpected registration denial. This identified fixture error
does not resolve the older incident: historical root cause UNKNOWN remains
MONITORED RESIDUAL RISK with the same reopen condition.

- Final applied/source raw-file chain SHA-256:
  `023340baa83c128b600dfbbdca282bf3790d30b1803429d4e7a8a6107eb73413`.
- Corrected migration-84 LF SHA-256:
  `d6c75c21183aeac4ccd3b39e6b8d2be68a797e8465d05363fc6fcc05cf7ae46e`.
- Native dispatch guard body SHA-256:
  `c44f0b63b257446f70d0adcddd1ae55c06daf4309160e7bf36d9e6c17d6b4df2`.
- Existing-data fingerprint (three databases / 214 tables and sequences):
  `e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

Cleanup independently **PASS**, final runner **exit 0**: owned database removed,
relay/listener and child process closed, helperFilesCreated=0, before/after
existing-data/structure/role fingerprints identical, container/volume/image/network
inventory restored. Roost PostgreSQL returned to its original stopped state;
Soar PostgreSQL/Redis stayed running and unchanged. Each run owned one disposable
database at a time. The earlier failed database was removed before the final
database was created. No external helper directory,
private dotenv, secret/key generation, provider delivery, HTTPS/DNS, provisioning,
target/model/profile or activation is part of this qualification.

Selected source/mocked tests **238/238 PASS, zero skips**. Server TypeScript
build, lint (338 routes / 45 files), both migration pin checks, runner syntax and
scoped diff checks PASS. No web build was run; no web behavior changed. Protected
dirty product/planning work and unread `design-qa.md` are excluded from the atom.

RF-HOST-035 remains **PARTIAL**, production **BLOCKED**. All eight flags remain
false: `implementationReady`, `executionSupported`, `pilotReady`,
`liveAdmissionAllowed`, `pilotExecutionAuthorized`, `pilotExecutionStarted`,
`transportQualified`, `launchAuthority`. This qualifies the durable child
protocol, not production trust/crypto/delivery, credential activation, or the
legacy bootstrap/ticket heads, which still remain consumed. Terminal writes
after revocation/expiry and successor admission need their explicit authority.

Exactly one next recommendation, **not started**: a source-only integration of
durable dispatch/completion receipts with the canonical attempt/ticket lifecycle,
using exact causal receipt lineage without weakening source-drift checks or
enabling delivery/default wiring. Older recommendations below are historical.

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
