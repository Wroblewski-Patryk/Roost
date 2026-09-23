# Canonical Worker host and installation lifecycle v1

## COMMIT acknowledgement repair v37 (2026-09-23)

The bounded acknowledgement defect is repaired. **117/117 source results**
(including 18 lifecycle results), server build and lint pass. The previously red
native deferred-COMMIT scenario passes with its original rollback and no-success
assertions intact: **2/2 runner results including the parent**. The other eleven
native scenarios were not rerun after this repair, so full post-fix native
qualification remains **PARTIAL**. Production admission remains **BLOCKED**.

### Proven cause

The [in-memory qualification runner](../../scripts/qualify-worker-identity-commit.py)
uses raw Prisma without the lifecycle adapter or transaction wrapper. A passive
loopback relay forwards bytes unchanged and records only COMMIT/ROLLBACK and
SQLSTATE metadata. PostgreSQL rejects COMMIT with `P0001`; the wire has no COMMIT
completion, then has ROLLBACK completion. The inserted probe row is absent.
Prisma nevertheless resolves the successful callback result.

On the installed Prisma **5.22.0**, library engine
`605197351a3c8bdd595af2d2a9bc3025bca48ea2` returns a parsed object with keys
`backtrace`, `is_panic`, `message`, and no `error_code`. The installed JS
LibraryEngine transaction method classifies an engine result as an error only
when `error_code` is present. Its `_transactionWithCallback` does await COMMIT,
but this unclassified engine error is returned as success. The application and
native test wrapper also await the transaction: neither omits that await. This
locates the failure at the engine-result/JS error-classification boundary on the
tested stack; it is not evidence about other Prisma versions. Dependency files
are unchanged.

### Result contract

The adapter now awaits the write transaction and then performs exactly one fresh
Repeatable Read, SQL READ ONLY transaction. It checks the native guard proof and
the exact operation ID and complete immutable JSON record, matching automatic
audit and SHA-256 digest, and a positive audit fence revision no greater than the
committed shared fence. This proves visibility of the atomic state/history,
audit and fence after commit; later writers may advance the shared fence. This
lifecycle command emits no Event and adds none. The normal native installation
and host adoption writes exercise successful confirmation before the fault case.

A callback failure before completion remains `worker_identity_lifecycle_blocked`.
A transaction rejection after callback completion, false successful COMMIT,
connection loss/unknown commit, missing/mismatched evidence or failed confirmation
returns `LifecycleReconciliationRequired` with `code=reconciliation_required`
and `retryable=false`. It never infers rollback or reports successful delivery
from an uncertain result. There is no callback replay, write retry, reconciliation
write or automatic repair. The dedicated error is secret-free; inspect remains
read-only. Existing epoch, terminal revocation, owner/decision and fence guards
are preserved; all 79 migration files are unchanged.

Mocked regressions cover immediate and delayed COMMIT rejection, rolled-back
false acknowledgement, committed write with lost response, confirmation read
failure/mismatch/transaction rejection, callback failure before COMMIT and normal
success. They count append attempts to prove no write replay and distinguish
rolled-back state from committed-but-unacknowledged state. Native selection runs
only the old failing deferred constraint case, without moving the constraint to
an earlier phase or weakening its assertion.

The five issuer/channel/ticket/decision blockers listed below remain unresolved.
All six flags (`implementationReady`, `executionSupported`, `pilotReady`,
`liveAdmissionAllowed`, `pilotExecutionAuthorized`, `pilotExecutionStarted`),
`transportQualified` and `launchAuthority` remain false. There is no issuance,
delivery, HTTPS/DNS, provisioning, endpoint/default composition, provider/model
run or activation.

### Current-run cleanup

The owned database was dropped only after matching its name, OID, owner and
ownership marker, with zero remaining sessions; absence was verified. The
in-memory relay exited successfully. No helper files or directories were
created outside the controlled repository. PostgreSQL returned to its initial
exited state; backend stayed exited and unrelated containers, images, volumes
and networks retained their baseline state. The three existing connectable
databases and their tables/sequences, schema, catalog and roles have identical
logical fingerprints (SHA-256
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`).
Current-run cleanup and preservation **PASS**. Earlier retained artifacts were
not inspected or modified and are not part of this cleanup result.

**One next recommendation:** separately authorize the full native lifecycle
suite against this repaired adapter, using the same bounded disposable database
and verified cleanup. It has not been started. The v36/v35 evidence and successor
proposals below are historical; earlier retained artifacts are outside v37 scope.

## Native qualification v36 (2026-09-23): BLOCKED on commit acknowledgement

The full **79-migration chain applied successfully** in one ownership-checked
disposable synthetic PostgreSQL database. No migration, including the new
lifecycle migration, required modification. The
[native suite](../../src/tests/worker-identity-lifecycle-native.test.ts) has
**11/12 passing scenarios and one failure**; the runner counts 13 results,
11 passed and two failed including the parent. The separate **114/114 source
regressions**, build and lint pass. Native qualification remains **PARTIAL**;
successful lifecycle-write acknowledgement and production admission are **BLOCKED**.

The failure is reproducible: a deferred constraint trigger raises during COMMIT.
PostgreSQL rolls back the lifecycle state/history, audit and shared fence, proven
by exact before/after snapshots, but the current adapter returns its successful
record. An awaited transaction result alone therefore does not prove that the
record committed on this tested stack. The native test deliberately remains red;
it is neither skipped nor weakened. This qualification atom adds evidence and
does not change the runtime adapter or infer that a failed commit succeeded.

Passing native evidence includes:

- Unknown legacy remains blocked; explicit current-owner adoption and genuinely
  same-transaction creation establish independent generations. Wrong/current
  owner, ambiguous membership and expired intent fail in the adapter and SQL guard.
- Monotonic epochs, terminal revoke, immutable history, fresh replacement and
  installation/host binding reject un-revoke, stale identity, fingerprint reuse,
  ABA and replay. Twenty concurrent native transactions have exactly one winner.
- Failures after fence, append, history and audit writes and before commit roll
  back atomically. PostgreSQL also rolls back the deferred commit failure, but
  its adapter acknowledgement is the unresolved failed assertion above.
- Real Prisma upsert/heartbeat/claim write shapes retain heartbeat reachability
  and reject identity/authority mutations, disable toggles, deletion, reinsertion
  and birth-stamp changes. Existing credential invalidation remains effective.
  Key rotation preserves installation identity; it does not qualify issuer fencing.
- A held shared fence visibly blocks a second host writer with a PostgreSQL lock
  wait until release. All nine required guards are individually disabled in
  rollback probes; each denies. Missing guard, rebound trigger/function binding
  and replica mode also deny. This does not prove resistance to a superuser
  replacing the trusted function bodies or the verifier itself.
- Incomplete history/audit denies. Repeated inspection preserves exact snapshots,
  uses SQL READ ONLY, and SQL rejects writes through that read transaction.
- Canonical BootstrapAuthoritySource clears only the four evidenced lifecycle
  facts and still throws the other five blockers; no authorization or delivery occurs.

Governance reference fixtures are synthetic and prepared with transaction-local
replica mode. Lifecycle/anchor operations and constraint tests explicitly run
with origin triggers. This qualifies canonical-source predicates and persistence,
not the independent owner-decision acceptance UI/API workflow. No new endpoint,
real credential, issuer, delivery, HTTPS/DNS, model or target process is involved.

The four lifecycle facts have native read/constraint evidence for successfully
committed, exact generations. Legacy remains blocked, and the commit response
failure prevents declaring lifecycle writes fully qualified. The five blockers
listed below remain unchanged. All six flags, `transportQualified` and
`launchAuthority` remain false; RF-HOST-035 remains open.

### Cleanup evidence and remaining blocker

The owned database name, OID, owner and ownership comment were checked against
the initial catalog; zero sessions were required before dropping it, and its
absence was confirmed. The owned relay process, children and listener are absent.
Roost PostgreSQL returned to its original **exited** state; backend stayed exited
and both Soar containers stayed running with unchanged lifecycle stamps. Container,
image, volume and network inventory matches the baseline.

All three existing connectable databases, 214 application tables/sequences,
public schema definitions, catalog and roles have identical before/after logical
fingerprints. Canonical audit-payload SHA-256:
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.
The unchanged lifecycle migration SHA-256 is
`4430f3dd8977277dae2b26ad8b4dffee000fce6c0a057f6d70db7d24be44bd00`.

**Full cleanup BLOCKED:** 17 owned temporary helper/evidence files remain outside
the repository. Automatic execution review rejected both checked allowlist cleanup
and a single literal-path file deletion with only `blocked by policy`. No database,
listener or helper process remains, but file cleanup is not claimed complete.
No retained prior-run roots were modified.

**One next recommendation:** finish removal of the explicitly inventoried owned
temporary files after resolving that execution-review block, then verify their
absence. Commit acknowledgement remains a separate unresolved defect; do not
activate or continue native work before cleanup is complete. The v35 source-only
record below is historical.

Owner amendment v35, 2026-09-23. **DONE source-only for the lifecycle contract,
Prisma adapter, proposed additive schema and mocked qualification: 15/15 new
results, 114/114 selected source results.** Build and lint pass. Native SQL
qualification is PARTIAL; migration is **UNAPPLIED**, production/admission BLOCKED.
The four lifecycle gaps can be cleared only for an explicitly established,
fully evidenced generation. Legacy and missing/disabled guards remain blocked.
The five issuer/channel/ticket/decision gaps are unchanged.

## Canonical model and writers

Existing `agent_hosts.id` and `trusted_provider_ticket_keys.installation_id`
remain the identity anchors. The key table has one workspace binding and its
existing trigger forbids changing installation ID; its key epoch is not an
installation lifecycle epoch. It cannot hold independent host/installation
generation history without conflating key rotation with identity revocation.

The proposed [migration](../../prisma/migrations/20260923210000_worker_identity_lifecycle/migration.sql)
therefore adds one canonical `worker_identity_lifecycle` append-only journal for
these previously absent facts, plus its transactionally mandatory audit table.
There is no competing lifecycle field, mutable head or shadow registry. Latest
epoch per workspace/kind/subject is current state; earlier rows remain history.
The audit binds each operation's public record digest to the shared fence revision.
Both existing anchors gain a nullable `lifecycle_birth_xid`, with no default or
backfill. Insert triggers stamp new births; updates cannot change that stamp.
This proves same-transaction creation and is **not an epoch or legacy adoption**.

| Existing writer | Result under the proposed migration |
| --- | --- |
| `agent-runtime.routes.ts`: host register upsert | Shared fence; new anchor remains unadopted. Existing adopted identity/authority fields cannot change. |
| Host heartbeat and execution claim updates | Shared fence; only reachability (`online`/`offline`), last-seen and update timestamps may change on an adopted anchor. These are not lifecycle authority. |
| Direct SQL, fixtures, maintenance, cascade identity edits/deletes | Same triggers; host ID/workspace changes and deletion deny even for legacy, preventing delete/reinsert from manufacturing a new birth. Other adopted authority edits and TRUNCATE deny. Earlier applied maintenance migration is untouched. |
| Existing `worker_host_credentials_guard` | Preserved; lifecycle guard precedes it. It cannot bypass immutable adopted identity. |
| Installation binding insert/change/delete on ticket-key table | Shared fence, immutable birth stamp and denial of changes/deletion after lifecycle history exists. Existing key constraints remain. |
| `owner-ticket-store.ts` key rotation | Installation identity unchanged; issuer/key writer qualification remains a separate blocker. No key policy is changed by this atom. |
| New lifecycle append | Serializable plus shared `ready_source_fence`; exact canonical owner/decision, anchor and predecessor checks; atomic history/state/audit. No automatic retries. |

The source inventory includes production modules, auth, scripts and migration
writers. SQL guards cover paths outside the new adapter rather than relying on
application callers to remember a fence. The reader verifies named guard/function
bindings, enabled origin triggers, isolation and presence of the shared fence.
Disabled/missing guards or replica mode deny. This is not protection against a
database superuser rewriting functions, records and audits or restoring a whole
database; such operation has no qualification here.

## Transitions and explicit adoption

Each host and installation has its own generation UUID and monotonically
increasing epoch across all generations of that existing subject. Every accepted
authority-digest update, revocation and replacement increments exactly once.
Epoch overflow denies. Exact previous operation ID, epoch and generation provide
CAS protection; decision IDs are single-use. A generation UUID cannot reappear.
Host fingerprint reuse across replacement generations also denies.

- `create`: only a provably new anchor born in this same transaction, explicit
  accepted primary-owner intent and fresh generation. Epoch 1 starts that new
  lifecycle; it says nothing about a prior identity. The standalone adapter does
  not create anchors, so future creation orchestration must supply one canonical
  transaction; no creation endpoint or provisioning is added here.
- `adopt`: explicit owner decision names the legacy anchor, new prospective
  generation, exact installation generation, public authority/fingerprint digests
  and adoption-evidence digest. It acknowledges that prior epoch/revocation
  history is unknown and cannot authorize old tickets. No source infers an old
  epoch, and no read, deployment or migration initializes one. Disabled legacy
  hosts cannot be adopted into active authority.
- `update`: active generation only, same exact identities/binding/fingerprint,
  changed owner-approved authority digest and next epoch. It does not edit host
  metadata, capabilities or key policy; existing adopted anchor edits deny.
- `revoke`: next epoch, same generation and binding, terminal revoked state.
  It may close a host after its installation was revoked/replaced. It never
  changes a revoked row back to active or grants delivery/ordinary runtime use.
- `replace`: revoked predecessor only, fresh generation, next epoch, fresh host
  fingerprint for a host and exact current active installation generation.
  Installation replacement does not silently rebind hosts; they require their
  own explicit revoke/replacement. Old IDs/epochs cannot pass fresh admission.

The strict `workerIdentityLifecycle` decision intent cannot be combined with
delegation, bootstrap, credential or transport intent. Both application policy
and append-time canonical decision validation require the current primary owner,
one unambiguous owner membership, current accepted unsuperseded revision, exact
intent and unexpired authority. Adoption evidence is a public digest; private
evidence and all secrets remain outside these records. Owner-authorized adoption
is a contract, not a shipped owner workflow.

## Bootstrap integration and evidence

The [reader/adapter](../../src/modules/api-keys/worker-identity-lifecycle-store.ts)
uses the same transaction client as the bootstrap ledger. Inspect uses Repeatable
Read and SQL READ ONLY. It checks complete bounded history (at most 1,000 rows
per subject), contiguous epochs/predecessors, atomic audit/digest and current
generation binding. Overflow, corrupt/missing audit, unknown rows or missing
schema deny; reads never repair data or advance expiry/fence/history.

For qualified records, `host_epoch_unavailable`,
`host_revocation_history_unavailable`, `installation_epoch_unavailable` and
`installation_revocation_unavailable` are removed from the diagnostic blockers.
Revoked records instead yield `host_revoked`/`installation_revoked`; mismatched or
legacy records stay blocked. This is source-level conditional resolution, not
native or production qualification.

These five gaps remain: `issuer_public_key_unavailable`,
`bootstrap_channel_authority_unavailable`, `bootstrap_ticket_revocation_unavailable`,
`signed_current_decision_unavailable`, `issuer_writer_fence_unproven`.
Bootstrap context therefore still refuses authorization. This atom does not
qualify ordinary credential/transport consumers against lifecycle revocation.

The [source suite](../../src/tests/worker-identity-lifecycle.test.ts) covers
create/adopt, independent epochs, terminal revoke/replacement, stale and ABA
bindings, exact host/installation, twenty concurrent writers with one winner,
state/history/audit/fence/commit rollback, unknown legacy, unfenced writer,
read purity, redaction and bootstrap retaining the five other gaps. Socket,
HTTP/DNS/fetch and child-process effects are trapped. SQL behavior and locks are
modeled; real trigger syntax/order, SQL constraints and isolation are not yet
qualified. Existing 78 migration files remain unchanged; only a 79th is proposed.

No DB/Docker/network/DNS, issuance/delivery, endpoint/UI/provisioning, profile,
target/model or default composition is used. All six flags remain false:
`implementationReady`, `executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`; `transportQualified` and
`launchAuthority` also remain false. RF-HOST-035 remains open.

**Exactly one recommended next atom:** separately authorized native qualification
of this lifecycle migration/adapter and writer guards in one disposable synthetic
database, including legacy adoption, terminal generations, concurrency, rollback,
read purity and verified cleanup. Do not solve the other five blockers or activate
production as part of that qualification. This recommendation has not been started.
