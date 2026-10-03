# Permanent application release

The current gate and authority remain in [implementation](../implementation.md).
This document describes Gate 4 support and its evidence; it does not certify a
production application release.

### Recovery support — 2026-10-03

Authenticated SSH, a new normal boot and a writable root filesystem are
confirmed. Required application endpoints respond; provider storage root cause
is unproven. Monitoring was paused before resuming delivery. The pilot candidate
and prior Gate 2 branch remain local and unchanged. No pilot release occurred.

Two serial contained full-data fingerprints matched while the execution service
was stopped. A subsequent encrypted-backup attempt lost its resource observation
and cancelled only its tagged dump query; it does not qualify backup or restore.
Maintenance now pauses external-position sync/management through the existing
profile service, with encrypted prior flags, lifecycle audit and no credential
rotation. Trading remains paused. Full backup, current independent review,
service recovery and separate exact-commit release consent remain required.

Roost's installed reverse-proxy address changed after restart. Optional
`ROOST_HANDOFF_TRUSTED_PROXY_HOST` selects one configured Docker service label:
server DNS must return exactly one private IPv4 within one second, which must
match the actual socket peer. Sanitized HTTPS authority/path/header checks and
certificate pinning remain required. An unset or empty optional host preserves
legacy exact-IP installations; invalid names, ambiguous/public DNS and lookup
failure deny admission. Eleven focused ingress/production tests pass. Installed
configuration is deployed as `ed399218474846cb1c58b28bce0458fdd208f9bc`,
deployment `ze00dq3vlat2wx4vl6iacu6j`; health/build identity match. A real
certificate-pinned malformed request passes transport and is denied by validation.
Credential delivery remains pending: real acceptance still refused the first
fencing-order correction without issuing or replacing a credential. Internal
procedure evidence now constructs its body and CAS after the normal command's
single fence; the common command still validates, redacts and checks CAS. External
literal bodies retain stale refusal. Seventeen focused tests cover each-fence
invalidation, restrictions, replay and atomic rollback. Live acceptance is pending;
the precise production invalidation path is not yet established.

The controlled restore contains identical full data and sequence state. Its
schema dump initially differed only in built-in public-schema framing because
the source has an ordinary schema owner and template0 uses `pg_database_owner`.
Normalizing that class only in the proven owned restore database reproduced the
exact historical schema bytes. Source schema/ownership remained untouched. The
fixed backup path normalizes only the owned restore public-owner class, never
source roles or ACLs. Primary failure survives a cleanup failure as a fixed
code; the separate cleanup code contains no raw diagnostics. Session drain,
DROP and absence reads share one bounded budget and never terminate clients.
Optional private `restoreCleanupTimeoutMs` accepts 1000–120000 ms, capped by
`timeoutMs`; omission preserves five seconds and the historical config digest.
A real SSH cleanup exhausted that default before DROP. Subsequent native session
drain also exhausted 30 seconds. Both owned attempts were reconciled without
promotion; this installation now uses the bounded 120-second maximum.
Explicit reconciliation requires unchanged installation/configuration/attempt,
local lock identity and exact database OID/marker; it neither repeats dump/create
nor promotes a backup. The interrupted production attempt was reconciled through
this path: owned database and lock are absent, with no promotion. No pilot backup
is certified yet. Another interrupted create was read back absent and its owned
lock retired. A resource-observation transport failure cancelled only its tagged
query. Two subsequent serial IPv4 full-source reads matched with no remaining
owned sessions; this does not by itself certify a backup.
Root verification passed 17 backup tests including actual local PostgreSQL, 17
atomic admission tests, `validate`, `codex:check` and `git diff --check`. Native
backup/fingerprint fixture suites run serially because their global temporary
file observation collides when run concurrently.

An installation-wide housekeeping timer pruned all stopped containers and unused
images every 20 minutes. Its logs confirm deletion of the stopped baseline
execution service/image and a newly created Roost backend during deployment.
The exact timer is stopped and disabled; its unit/script are preserved. This
explains those artifact losses, not the provider filesystem/I/O outage. Future
cleanup must respect active deployments and retained rollback artifacts.
Roost recovered through the normal controller queue as
`recce24c5c5b44981ae67a31`, commit `0462d5f4f418087dd5ea233178ae4839e045085a`;
health/build identity match. Failed and unissued dispatches were read back before
retry. The pilot's existing controller application, canonical branch and generated
configuration remain; no candidate deployment occurred. Baseline service and
compatible rollback artifact recovery remain required before managed release.

## Current evidence — 2026-10-02

The managed Windows Worker/Hermes read-only PWA audit completed as execution
`ab672c9f-57d9-44e6-9df4-ccee24e05b5f`, task
`23429a09-e322-4254-b00e-57033436f9fa`. Its signed native receipt records
unchanged Git, filesystem, process and Docker state, no native model tools and
zero changed files. Evidence digest:
`517f65ed9ee71809211396e3ac51f6838c07c679821693ebf6aace3d0babba1d`.
The pinned baseline is `cf90418cc694dc0cb773a44c001c569407d05f9f`.

The audit identifies a PWA screenshot declared as 512 by 512 while the shipped
PNG is 1000 by 1000. A separate HTTPS observation reproduced the mismatch.
The audit distinguishes that supplied observation from an independent native
retrieval. The managed repair and an independent exact-commit review are recorded
below; current review basis and production release remain pending.
The earlier accepted local pilot branch/commit is preserved.

Independent verifier execution `05f069aa-2a1d-48c1-959d-86a473372460`
completed with a verified native unchanged-state receipt and zero changed files,
but returned a gap: different listener digests across separate sessions.
The first-write gate was held. The structured handoff now carries the validated
prior Git/process/Docker states and explicitly distinguishes each execution's
pre/post comparison from global process identity between executions. Fresh
verifier `e0e4dfc4-2e6e-4018-80c1-2e88c50d2de9` accepted the audit with bounded
uncertainty, confirmed the exact prior linkage and returned zero changed files.
Its native evidence digest is
`d69bd8a255a4cf9d31e55365da3390b008f3367221f3661888cee7a85e511e07`.
The earlier gap report remains in Roost. The model did not independently fetch
production PNG bytes, inspect its deployed source or cryptographically derive
the native admission signatures. Those limits are explicit.

Separate owner first-write Decision `0f3d44ee-fc2b-48a1-83f7-fb50cc705ffc`
was accepted as `d59882ef-659b-407c-8b74-a481f9631409` after fresh login and
explicit human consent. It binds both audits, the baseline, isolated coding
branch, two PWA source/test paths, focused tests and local commit. Push,
deployment and financial writes are excluded. The managed coding selection
was rebound without changing the existing owner's attestation lifetime.

An earlier failed verifier attempt was terminally reconciled through the normal
Worker API, with exact baseline/process absence checks, Writer reclamation and
signed artifact retirement. Worker diagnostics now retain only a fixed process
failure code and authentication hint while still rejecting the native audit.
Four real Windows Job cases cover failure, empty output and successful bounded
completion; arbitrary provider output cannot enter failure diagnostics.
Combined context/receipt/quiet/read-only checks passed 102 tests with no skips.
Fresh encrypted Roost backup `4383119f-c269-4954-9905-d17c024a808e` restored
with schema/row/sequence parity and exact owned restore-database cleanup.
An earlier backup was rejected when runtime writes changed its source; only
the later verified receipt is evidence. This is not a pilot-database backup.

The installed focused workspace Vitest command pins the package, pnpm lock,
resolved CLI, Node binary, workspace and configuration before and after its
owned Windows Job. Read-only installed dependency pins permit pnpm hardlinks;
source and private manifests retain single-link checks. Serial execution and
parsed JSON counts reject empty or skipped suites. Fifteen component tests
passed without skips, including a real Vitest Job and post-test configuration
drift refusal. The actual installed pilot dependency qualified without running
the pilot test or editing its source through the implementation owner.

The coding attempt initially stopped at `claimed` because the installation
still mapped its base to `main`. The unchanged audited branch was configured as
the approved base. Recovery now distinguishes restarting that same pre-effect
attempt from resuming a sealed branch/prepared checkpoint; twenty recovery
tests passed. The existing attempt recovered normally, without manual Writer
removal or a second execution. These checks do not establish candidate acceptance.

The resumed managed coder reached the native fixed candidate test but failed
acceptance. It produced one owned added regression test and no accepted commit.
The four-turn limit did not complete the repair; the attempted test also resolved
the public image as an absolute path, so its failure did not prove the original
dimension defect. A normal runtime replacement proposes eight bounded turns
with the same model, paths, duration and output caps. Existing first-write
consent does not grant push or deployment.

Fixed Worker recovery for this narrow failure requires a signed final failed
review, exact owned added files absent from the baseline, unchanged footprint,
closed original Job and exact accepted recovery scope. It archives the failed
bytes before removing only those files, restores the approved base and removes
only the empty owned task ref. Tracked modifications, foreign changes, links,
identity drift or an uncertain active mutator block recovery. Durable intents
reconcile actual state before another effect; Writer/lease remain retained until
the existing signed native reconciler completes. This is not a general discard
command or authorization to retry a spent model ticket.

The actual failed attempt was restored through that fixed Worker path. One
owned added test was archived, the audited base read back clean, the empty task
ref removed and the earlier accepted pilot commit preserved. Normal signed
reconciliation then released exactly Writer/lease and retired the original
admission, retaining its spent record. Roost holds a separate failure/recovery
record; the failed execution remains immutable. A transient reused process ID
blocked cleanup once; read-only requalification proved absence before cleanup.
No model, commit, push, deployment or financial action occurred during recovery.

The actual deployment has separate Dockerfile targets and mixed baseline source
versions. Source support retains this topology without another application or
deployment migration. Initial production safety reads found active LIVE activity
and nonterminal orders. Later separately authorized maintenance is recorded below;
it is distinct from the managed PWA repair and does not authorize release.

### Managed candidate and review

Coder execution `58387e7a-c4b2-4fbd-acf9-7fd835832eb5` completed through the
normal Windows Worker/Hermes runtime and returned clean local commit
`7512bc395d65df0fca7cf701047033031f63eb7e` on its isolated task branch.
Only the approved manifest and regression test changed. The model reported the
genuine initial dimension assertion failure; its tool budget ended after the
repair. The fixed Worker then ran the actual installed workspace Vitest test:
one passed, zero failed or pending, owned Job closed with zero active children.
It created the local commit only after that green result. The model's report
and the fixed native verification are distinct evidence.

Independent read-only reviewer execution
`a272c952-bf70-47f9-81f6-67108fa606db` completed without changes and approved
that exact commit through normal decision
`fd94c23c-c3b9-4f5f-aaac-250f50305386`. Its unchanged-state evidence digest is
`7773d43c4661ba71697ca50e75847fcd45935bb9664c7985a2fe2b6c1259a6a5`.
Append-only result-basis revalidation
`4a700d6c-bf1d-49f6-84d2-6489c730c6b7` preserved the original native result
and linked the then-current Ready basis. Subsequent release configuration
changes invalidate that acceptance basis; a fresh independent acceptance is
required before release. Historical approval is retained, not grandfathered.

Roost infrastructure commit `ea71213315e61bbc595c347efe9fc8a2fca184e7` was
pushed and deployed as `mtkgm3xb7ms6bi7ubtgf9bkl`; health and build identity
matched the exact commit. It includes nine passing real Windows failed-candidate
recovery cases. This infrastructure deployment did not release the pilot.

Fresh six-target inspection retained the mixed baseline and compatible schema.
Web catches up seven existing dashboard source/test paths in addition to the two
new PWA paths; API/workers have no source or migration delta beyond the PWA
candidate. API health/readiness and the web manifest returned HTTP 200; API
payloads were `ok` and `ready`. Actual LIVE counts remained one active bot,
one running session, five open orders and five pending dedupes. Pilot backup/
restore, stable data fingerprints and separate exact owner release authority
remain unproven at that observation. No pilot push or deployment occurred.

Large repeated group-risk history exceeded the runtime encoded-value scanning
budget. An uncertain assessment reply was reconciled by its exact persisted
request/assessment identity before retry. Risk history now has five-row pages
and a workspace/task-bound cursor; historical records and current assessment
identity remain unchanged. Bounded release context removes redundant copies;
redaction limits and split-secret checks remain enforced.

### Release audit and separately authorized maintenance

Infrastructure commit `f6a3a93aebe5c09988bef708e5e7876f13b0529e` was pushed
and deployed as `y68mu1p1ichdd8wm8ethyaks`; health/build identity matched.
An earlier release-audit attempt was rejected before model launch because its
input exceeded the unchanged provider limit. Normal terminal reconciliation
reclaimed Writer only after unchanged candidate and absent owned processes were
proven. Bounding the actual read paths and supplying an explicitly identified
compact prior-source diff allowed managed audit
`0860059e-2060-4d3f-bbbc-6a18146caf5a` to complete. It returned **blocked**,
with verified unchanged native state, closed Job and zero remaining children.
Its receipt digest is
`33183502ae8e042278c9429f295f1b30096bc000ad554b66608ba49d01d98b8c`.
The historical audit predates the subsequent maintenance and remains intact.

The owner separately authorized stopping bots and reconciling stale local orders.
The LIVE bot was already inactive at the fresh read; the operator stopped the
five remaining PAPER bots through the installed application service. Authenticated
read-only Futures calls through the existing execution worker found zero open
exchange orders and zero nonzero positions. Two exact historical order identifiers
returned FILLED; three returned absence, which does not establish their historical
outcome. No exchange cancellation, trading or position mutation was performed.

After preserving an encrypted local before-state, operator maintenance
`1a6197ca-4832-4e4f-8912-beaf0a10fb57` used a serializable transaction with
unchanged-row checks. It retained five order records: two were reconciled to
FILLED and three administratively EXPIRED, all marked ORPHAN_LOCAL. Five expired
dedupes became nonretryable FAILED; ten audit entries preserve the previous state
and uncertainty. Amounts, fees, positions and history were not removed or changed.
Read-back at 15:27 UTC found zero active bots/running sessions, zero open LIVE
orders/positions, zero unknown mode associations and zero pending LIVE dedupes.
Twenty-three PAPER positions remain recorded. Bots must remain paused until an
explicit owner instruction to restart them.

The API's installed encryption-key configuration differs from the execution
workers; its historical credential decryption failed while the execution worker
decrypted successfully. No secret was rotated, copied into records or changed.
This pre-existing discrepancy remains an explicit limitation. The same API image
and source were restarted under maintenance authority after it consumed about
4.37 GiB. An uncertain restart reply was reconciled from immutable container/image
identity and its new start time before any retry; no second restart occurred.
Fresh web, API health and readiness probes returned HTTP 200 with `ok`/`ready`.

These operator actions are maintenance evidence, not managed source-change or
pilot-release evidence. The scoped encrypted before-state is not a verified full
pilot backup. Full database fingerprint/backup/restore, current independent
acceptance and separate exact owner release authority remain pending. The pilot
candidate remains local and unreleased; the earlier Gate 2 branch is preserved.

### Full fingerprint preparation and VPS recovery

The fixed backup and release gateways retain the historical fingerprint digest
contract. All tables, row multiplicity, ordering-independent row digests
and sequence state remain included. The Worker has an installation-only
`fingerprintTimeoutMs` range of 30,000–300,000 ms, default 300,000 ms; the
backup keeps its existing deadline bounds. The fixed remote program bounds
statement/lock waiting and the whole fingerprint inside the immutable container.
Owned parents reap terminated children; escalation addresses only direct owned
leaves. Native tests cover both TERM and an ignored-TERM leaf, unchanged
PostgreSQL auxiliary processes, zero remaining owned queries and restore parity.
Three rejected intermediate implementations failed independent root checks and
were repaired before the accepted local rerun. None was used on production.
The focused root rerun passed 24 tests with one existing opt-in safety skip.
This is local PostgreSQL/source evidence, not installed pilot release proof.

A separate read-only production diagnostic used the same SQL through direct
`psql` with server statement/lock deadlines, without the new supervisor. The
first complete data fingerprint covered 33 relations in 59.1 seconds, confirming
the former Worker deadline was insufficient. The second read did not complete.
At 16:03 UTC the VPS became unavailable over SSH and all inspected HTTPS
surfaces. Independent Internet access remained available; the cause is unknown.
No pilot push, deployment, full backup or restore was started. The provider KVM
later showed repeating journal read-only filesystem and I/O errors. This does
not establish the storage failure's cause or a relationship to the query.

On 2026-10-03 at 10:25 UTC, authenticated SSH and the deployment console returned.
The new normal boot began at 10:22:37 UTC, with the root filesystem mounted rw.
PostgreSQL restarted at 10:22:49 UTC; a bounded activity read found no other
active query and no active fingerprint. The old postmaster and its interrupted
query therefore cannot still be running. Historical kernel evidence was absent;
current Docker OOM state and available memory do not prove the earlier cause.
Public pilot health/readiness and manifest requests returned HTTP 200. Fresh
all-mode counts found zero active bots, running sessions, pending dedupes and
open orders; 23 retained PAPER positions remain. No automation was reactivated.
The four-hour recovery heartbeat was paused and its saved status read back
before further work. The owner-authorized support update was posted and verified.
Neither restoration nor another restart was initiated by the implementation owner.

The replacement fingerprint streams sorted row hashes inside the container,
preserving historical bytes and one read-only repeatable-read snapshot. Its
session uses 4 MB work memory, a 512 MB temporary-file limit, no parallel query
workers and no JIT; catalog metadata and private transient files are bounded.
Native PostgreSQL tests qualify duplicate/Unicode/partition/sequence parity,
snapshot isolation, external sort, capacity and malformed-pipeline rejection,
backend cancellation and complete owned process/file cleanup. The independent
root run of fingerprint, backup and Worker components passed 26 of 27 tests,
with one existing opt-in skip, including actual backup/restore parity.
This removes aggregate memory growth; it is not a hard PostgreSQL RSS ceiling
and does not resolve the unknown provider storage cause. Production scans still
require fresh capacity, paused writers and serial operation; production full
backup/restore proof remains pending. Do not reinstall, reset data,
delete volumes or retry an uncertain operation. Full pilot backup, stable data,
current independent review and exact owner release approval remain pending.
Five earlier unmarked local synthetic fixture databases are retained pending
individual ownership reconciliation; newly marked fixtures and owned helper
processes from the final test were cleaned with read-back.

Root integration checks passed: 239 Node release tests and 62 TypeScript tests,
zero failures and two existing opt-in skips, including native PostgreSQL parity
and actual Windows process/Git/recovery cases. `codex:check` passed. Pilot restore,
installed release execution and production observation remain unverified.

### Post-recovery task admission correction

The normal API recovery read confirmed the native candidate and append-only
review history were retained. A fresh task submission then correctly refused to
launch, reporting a missing procedure. Inspection found that the release audit
procedure was already linked as optional, while the shared packet validator
treated every application/capability link as globally mandatory. The validator
now honors explicit `required: false`. Required and legacy unspecified links
still block omissions, and every declared procedure retains its active-version
check. The selected task composition remains independently mandatory and sealed.
The focused packet suite passed 74 tests, including actual Windows admission
cases; lint, typecheck and server/web build passed. This is local evidence;
installed Ready revalidation, a new independent review and release remain pending.

## Sealed release contract

Historical `roost-release-manifest-v1` certification manifests retain their
wire shape. Permanent applications use `roost-release-manifest-v2`, purpose
`application_release`, protected resources and `archiveRepository:false`.

For `coolify_git_set`, the source artifact set seals each target identifier,
Dockerfile, accepted commit/tree and configuration digest. This differs from
the immutable OCI images observed after builds. Rollback seals the actual
baseline image and commit/tree per target, including mixed source versions.
Compatible schema and exact configuration/data evidence remain required.

Roost installation metadata binds the target/Dockerfile list and HTTPS origins.
The private ownership ledger, outside repositories, binds application, canonical
clone, repository, targets and protected resources. The installed adapter accepts
no disposable resources and cannot delete an application/clone or archive Git.

## Installation and effects

The dedicated Worker uses strict `adapter:'coolify_git_set'` settings: TLS pins,
fixed SSH host, installed controller source pins, baseline queue identities,
immutable PostgreSQL endpoint, capacity bounds, private ownership ledger and
verified encrypted backup/restore receipts. Credentials remain in Windows
Credential Manager. Model packets/settings cannot choose executable scripts or SQL.

Native SSH/Git operations use the existing owned Windows Job and durable Writer
checkpoint. Normal HTTPS application configuration changes only the exact source
pin. Automatic deployment must be disabled before release push/merge; exact
configuration and actual runtime are rechecked.

Services may seal `expectedJsonStatus:'ok'` or `'ready'` in addition to HTTP
status. Such probes reject a failure payload returned with HTTP 200; volatile
timestamps do not enter the health digest. Probe bodies remain transient.

Each target deployment/rollback has a separate durable Roost intent and
deterministic controller queue identity. Builds are serialized. An uncertain
reply requires reading the exact queue and runtime before repeating an effect.
Read-only reconciliation cannot dispatch another target; a later target needs
its own admitted intent. Final observation matches all accepted queue identities
and actual container/image/source/configuration.

Safety reads real bot/session/order/position/dedupe state. Missing evidence is
blocked. This adapter requires quiescence and stable database fingerprints;
active LIVE or unresolved activity cannot be substituted with zero counts.
Explicit fully resolved PAPER orders and positions are reported separately.
Missing, dangling or mixed mode associations remain unknown or LIVE and block;
PAPER classification does not relax stable backup/data fingerprint checks.
Operating or closing real financial state requires separate owner authority.
A PWA task/login grants neither that authority nor exact-commit release approval.

## Verification boundary

Source checks passed 233 Node release tests, including actual Windows owned
process/recovery/local Git checks; 62 TypeScript tests passed and one optional
PostgreSQL case was skipped. `typecheck`, build, lint and `codex:check` passed.
The additive purpose migration passed two actual isolated PostgreSQL checks:
unchanged existing records, preserved guards and rejected altered scope. Six
installed container/image/source/queue identities were read through the new
state module; services without a Docker HEALTHCHECK were handled explicitly.
These read-only observations do not prove production release/rollback. Actual
grant admission and installed configuration still need verification before release.
