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
rotation. Trading remains paused. Full backup, service recovery and current
independent review are verified below; exact-commit release consent is absent.

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
Real acceptance refused the first fencing-order correction without issuing or
replacing a credential. Internal
procedure evidence now constructs its body and CAS after the normal command's
single fence; the common command still validates, redacts and checks CAS. External
literal bodies retain stale refusal. Seventeen focused tests cover each-fence
invalidation, restrictions, replay and atomic rollback. Production diagnosis then
distinguished native INSERT denial from CAS: five earlier tasks in the complete
six-task impact had stale risk assessments. Their unchanged exact policy records
were read individually; the bounded catalogue was truncated and could not prove
absence. Two normal assessments refreshed the same prepared groups. All six
native evidence INSERTs and decision admission seals passed in a transaction
fully rolled back before a new handoff.
The subsequent normal HTTPS rotation completed under decision
`78ef42b8-5926-49ac-bfae-6713bda10c57`, request
`5aa3afef-f92d-479a-9b2c-6f999b29cbf9`. Protected Windows storage read-back,
device ACK and server catalogue verify active epoch 3 and revoked epoch 2.
No old task execution, pilot push or release consent follows from this rotation.

The standalone provider checker now uses the same canonical repository validation
as the normal managed Worker before inspecting a sealed profile. Raw installation
mappings contain directory names, not validated paths; inspecting them directly
had incorrectly reported unavailable managed admission. All 28 focused provider
tests pass. The actual Windows installation check exits zero with
`managed_hermes_codex_low_v1`, execution supported and no blockers. Generic
compatibility/authentication fields remain separate from managed admission;
this inventory check neither launches a model nor certifies a new task execution.

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
this path: owned database and lock are absent, with no promotion. Those attempts
did not certify a backup. Another interrupted create was read back absent and its owned
lock retired. A resource-observation transport failure cancelled only its tagged
query. Two subsequent serial IPv4 full-source reads matched with no remaining
owned sessions; this did not by itself certify a backup.
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
configuration remain; no candidate deployment occurred. At that checkpoint,
baseline service and compatible rollback artifacts still required recovery.

The first baseline rebuild queue `r43c83668d6064748885c30c` failed with SSH
exit 255 after successful compilation, during the final image ownership step.
Read-back found a terminal failed queue, no active deployment and no remaining
owned helper or execution-service container. This is not a released candidate.
Coolify's shared SSH master can be closed by its concurrent health refresh;
that mechanism is a transport risk, not a proven cause of the provider outage.
The existing installation now sets `MUX_ENABLED=false`; only its controller was
recreated on the same image, preserving source pins, command limits and all
application services. One exact unused Roost build-cache entry was reclaimed;
no image, volume or application data was deleted. A fresh contained full-data
read matched the certified backup before a new uniquely identified baseline
queue `r0ea03ba3b84040e68fce52a` finished. Runtime read-back at 14:09:40 UTC
verified unchanged source `cf90418c`, retained image
`sha256:c773439f95200b614e79ce1af5a8474755ef54926b0bcde93c20e87faabbdcc8`,
running state, no OOM and zero restarts. Full data/sequence/schema parity with
the certified backup passed after startup at 14:14:05 UTC. Six-target runtime
and configuration read-back passed at 14:14:47 UTC; health/readiness passed at
14:15:37 UTC. Trading remains paused and 23 PAPER positions are preserved.
Scoped unused unshared build-stage caches were reclaimed with exact absence
read-back, preserving all images, services and volumes. This recovered an
existing baseline; the candidate remains local and unreleased.

The subsequent monitored normal backup gateway completed on 2026-10-03 at
13:47:38 UTC: backup `811332d3-67ab-4e9c-afae-c12bc374fa84`, archive
212,322,910 bytes, encrypted copy 212,323,495 bytes. Full source fingerprints
before/after export and the isolated restore agree on schema, all table rows,
multiplicity and sequence state. Encrypted latest-copy read-back, owned restore
absence and zero tagged PostgreSQL sessions pass. Both persistent SSH channels
closed normally. The operation retained 44 bounded resource samples: minimum
4,938 MiB available memory and 12,844 MiB available disk; no parallel build/scan.
Archive digest: `477c186f0a7b873e9f62c5031eb4e2ea712c4042431220e1b1f1eb5421b626a6`.
An earlier completed dump hit the five-minute restore-input budget; its exact
owned database/lock were reconciled without promotion. Another lost its resource
observer and cancelled only its tagged query, with subsequent zero-session and
absent-lock read-back. This installation uses a ten-minute operation budget,
the unchanged two-minute cleanup cap and a twenty-minute total transport cap.
The SSH keepalive now leaves the unchanged 35-second resource-freshness guard
to detect a stale observation first. This successful attempt qualifies the backup;
it does not establish a cause for intermittent SSH stalls or provider storage loss.

## Earlier observations — 2026-10-02

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
below; the current review basis is refreshed below and production release is pending.
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

Historical post-recovery reviewer execution
`4d7e218a-c632-410c-8a18-3edf11fb4a9d` approved the exact candidate through
decision `0a0751be-8633-430a-b350-e3b8b796957a`, material
`3238d5ac4dbe7fbea63d42ec5b6e5638e785a6537c92d44d9dd8c710633f8f00`.
Append-only basis revalidation `06bd2036-cae5-4680-9e16-b4a6149c1343`
binds the preserved native coding evidence to refreshed Ready. Native review
confirmed unchanged Git/process/Docker state and zero surviving owned children;
the normal Worker stopped and its writer lock was absent. Actual sealed input
was 116,327 bytes under the unchanged 131,072-byte cap. Approval relies on
the signed genuine candidate test; the reviewer did not execute another test.
Later review supersedes this approval.

Reviewer `5d505c06-8f0d-48c9-88ae-2ecd80b517c3` rejected the unchanged
candidate through decision `b7862b0f-6a61-4861-883e-8acba820c097`: the
native GREEN receipt exists, but the historical RED assertion was only
model-reported. Its paired unchanged Git/process/Docker proof and closed Job
are verified. The rejection remains immutable; current independent acceptance
is absent. A fixed native Worker replay, invoked by the operator, now proves
one actual dimension assertion failure against the exact parent module and
one passing unchanged-candidate test, without changing any pilot file or Git
state. Receipt digest
`2ed7b00145cb7abd8e85fa699234e4fdcf51090f88fa73c13ded20e2de95123a` is
preliminary operator evidence, not a new managed execution or historical RED
receipt. Accountable manager return `f94a6688-ead6-4815-975d-6fd48e24e135`
then admitted new managed execution `2948f84d-fa86-4d14-8c73-621bc41ba6fb`.
Its fixed native replay verified RED exit 1 (one actual assertion failure) and
GREEN exit 0 (one passing test), with no skips, candidate edits or new commit.
Coding-test digest
`990d032aef0377ca264a4917ba23f7fd735c7ec5d3981be06801206ebeb8ae83`
and local-commit verification digest
`297239ca78762d38d385f614f518c5061c814395af83028e2e3f1425ea6dd918`
bind the unchanged candidate to the prior rejection and owner first-write
decision. Signed native admission, paired unchanged footprint, closed Job,
zero surviving children and absent writer lock passed. The historical rejection
is preserved. Fresh reviewer `0d66d98b-3f24-4ff9-a991-6ac9b1461ec9`
approved exact candidate `7512bc395d65df0fca7cf701047033031f63eb7e`
through decision `655a3ade-567d-496e-821b-9a5fa2367d21`, on current mapped
basis `b45dd66ed048ec2da61f49290b4909695bfecce07c4f235880c9fc10e998da5a`.
Its unchanged native footprint, signed admission and closed Job passed.
Roost backend
`e4003d231bb97a99befc602ec55d588a4343393e` is deployed and healthy; Worker
source `f8ff3c2e2c6503a147fff534b2294e340eda30df` also rejects private replay
configuration located inside the application checkout.

Final read-only release audit `def562bd-bb5f-44e7-abdb-822b02edefa4`
completed with 129429 input bytes, paired unchanged Git/process/Docker states,
closed Job, zero surviving children and absent writer lock. It found the
frontend correction technically suitable, while withholding release authority.
Its statement that candidate acceptance was still required is contradicted by
the subsequent authoritative review read-back: the exact current decision above
is approved. The earlier independent full-context audit verification remains
historical evidence; it is not verification of this new audit. Private release
preparation independently checked the live acceptance, mapped Ready, native
candidate, audit, installed roles, protected baselines, backup and capacity;
it granted no authority and executed no external effect. Shared risk-group Ready
reads are serialized to avoid the normal transaction-conflict refusal.

Prepared manifest digest
`fe4b83d3ac2ab2d35dbf81f79ee56fe6d72d60d95a54e536070bb7f4178ead02`
selects one frontend target, three public probes and 1200 seconds of observation.
At that preparation, all six automatic-deployment controls required a disable and
read-back before push. The frontend also includes the seven existing dashboard
paths between its older deployed baseline and the current main base. No API,
worker, schema or data delta is introduced. Exact owner release consent was
absent at that preparation; candidate deployment and post-release observation remain
unverified. Current capacity passed after reclaiming 19 individually identified
unshared cache records from two owned Roost builds; six pilot images and the
current Roost image were protected. Capacity must be refreshed before dispatch.

The owner's subsequent direct instruction approved the exact prepared release.
Six normal single-field Coolify PATCHes disabled automatic deployment; paired
read-back verified unchanged environment, storage, topology, source pin and
running baseline images. This installed API omits its numeric internal ID and
settings from GET responses: target UUID/repository/branch/Dockerfile are checked
through HTTPS, while exact internal ID, boolean and configuration digest are
checked through bounded installed-controller reads. An initial SSH failure and
projection refusals occurred before any effect intent; no PATCH was repeated.
Fresh six-target runtime, unchanged schema, three HTTP probes and capacity passed.
The final manifest digest is
`54f5c9b90c1db92e139be61658ca5c5556c7e4a834619d41300aad037e8271bb`;
comparison permits only the authorized auto-deploy configuration change and
new observation timestamps. Separate consent is retained privately for this
exact regenerated request. Fresh owner authentication admitted active grant
`7f28822a-c4bd-444d-877f-f351038bf6cf`; dedicated Worker installation passed.
Its first preflight issued no operation: the Git adapter incorrectly applied the
certification target's private-repository restriction to the existing public
pilot. Retained application manifests now allow proven existing public/private
visibility without any visibility mutation; certification manifests still deny
public targets. Unknown visibility and archived repositories remain denied.
Fixed diagnostics now preserve the corresponding safe refusal code.
Ten focused Git/diagnostic tests passed; broker/installed-worker/recovery checks
passed 36 tests with one opt-in PostgreSQL skip. Actual read-back proved an empty
release journal, absent remote candidate, unchanged main and six closed native
children; the signed Writer checkpoint qualified for normal reclaim. The second
normal Worker launch reclaimed it. Release/production observation remain pending.

Normal application configuration now selects one frontend release target while
retaining all six runtime targets. The other five exact deployed baselines
have no source delta outside frontend paths. All six remain protected and must
have automatic deployment disabled before an authorized push. The selected
build budget is the actual frontend image allowance plus 5 GiB transient build
space and a 6 GiB retained disk floor; fresh dispatch evidence is mandatory.
Two individually identified unused cache entries from the owned baseline
recovery were removed, preserving all six images and running services.

Release audit `2ffd4780-c6b4-4b92-8afe-2f4fe41e5358` failed before model start
because its sealed input exceeded 131,072 bytes. Normal terminal reclamation
verified process/lease absence and unchanged candidate. Successor
`10c59ce4-cdd2-4e69-91dd-b38ae9aa6cd1` completed with 130,094 input bytes;
its model refused technical readiness because changed-test bodies were absent.
Worker's paired receipt independently verified unchanged Git/process/Docker state,
closed Job and absent writer lock. This is not release acceptance. The lossless
procedure-reference serializer preserves full selected procedures and application
supplements under the unchanged cap; 43 input and 74 transport/launch tests,
independent source review, `validate` and `codex:check` pass. Worker source
`8b2602be8d859de4acc27eb88ad391a8f3d31e95` is committed and pushed.
Full runtime/test diffs are admitted through normal refreshed Ready and independent review;
the native two-file inspection scope remains unchanged.

Full-context release audit `e93426bf-8f27-445b-99cc-80bcb1f24ac3` completed
with 126,855 input bytes and a verified paired unchanged-state receipt.
Independent verifier `08bf22ee-500a-43fc-a44e-b0bd683cf7ac` completed with
118,136 bytes, matching the exact prior audit, candidate and both file hashes.
It resolved the auditor's temporal uncertainty about postflight receipt fields;
both owned Jobs closed with no children and normal Stop left no writer lock.
It also flagged different releasers in different task packets. Candidate release
is governed by the coding task's releaser, distinct from coder and code reviewer;
the read-only audit retains its own separate releaser, as task role validation
rejects self-release. These task roles must not be treated as a global identity.
Normal release approval validation remains required; no role was reassigned.
The first verifier attempt `139a1c49-900d-40b6-a8b7-4f75c7f4894e` stopped
before model start because its native admission still pinned the baseline commit.
Normal terminal reclamation verified absence; a new admission scope pins the
candidate and reselects the same published procedure versions. This qualifies
read-only verification, not production release. Exact owner consent, disabling
auto-deploy, candidate deployment, 1,200-second observation and served
manifest/PNG verification remain pending.

Coder execution `58387e7a-c4b2-4fbd-acf9-7fd835832eb5` completed through the
normal Windows Worker/Hermes runtime and returned clean local commit
`7512bc395d65df0fca7cf701047033031f63eb7e` on its isolated task branch.
Only the approved manifest and regression test changed. The model reported the
initial dimension assertion failure; its tool budget ended after the
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

### Reserved native preflight recovery

An installed release stopped before its first external intent with one reserved
SSH child lacking an assignment or terminal receipt. Legacy reservations do not
bind the native protocol; they cannot prove that the target never ran. Recovery
therefore records resources absent and outcome unproven, never a fabricated
terminal receipt or successful execution.

The normal Writer acquisition checks the exact signed grant, empty journal,
dead owner, one final null reservation and genuine closure of every earlier
child. It pins the inspected native source and system SSH identity, then obtains
an actual bounded Windows inventory. Any SSH or native launcher process blocks
recovery. The inspected launcher uses atomic Job assignment, a noninheritable
handle and KILL_ON_JOB_CLOSE in both protocol versions. The original signed
Writer and qualification are archived privately before race-fenced reclamation.
Git and every scoped Coolify baseline are recognized again by the broker before
the first new intent. Assigned children missing a terminal receipt still block.

Native tests exercised dead/live owners, a live unrelated SSH-name fixture,
changed/nonempty journal refusal, preserved archive and reconciliation-only
restriction. Four native recovery cases passed; the focused installed adapter,
state and diagnostic suites passed 27 tests with one existing opt-in skip.
The real blocked reservation qualified through native process absence and exact
remote candidate/main read-back. Normal Worker reclamation preserved the original
signed record. Repetition identified the cause: the fixed fingerprint command
is 9558 characters, exceeding the unchanged 8192-character native argument bound.
The installed adapter now streams that unchanged source program through SSH stdin;
shared request validation rejects oversized arguments before reserving a child.
Fourteen adapter cases passed with one opt-in skip. Managed release proof remains
pending; no push or deployment was admitted by these blocked attempts.

The native streamed fingerprint closed successfully, but its duration exceeded
the original 60-second build capability. A fresh successful terminal Job receipt
can now reattest only that exact unchanged launcher image, before another release
child; copied receipts, other artifacts and elapsed time alone cannot qualify.
This does not extend execution deadlines or release authority. Larger existing
Git histories use an isolated template-free bare repository with a read-only
object alternate and exact commit/tree/connectivity checks. No history pack
crosses the bounded native stdout/stdin; only the later isolated push receives
the credential. Canonical hooks, config and object contents remain untouched.

### Configuration outcome reconciliation

The normal Worker pushed the exact accepted candidate and created PR 1. Its
merge reply was uncertain; authoritative Git/PR reads proved the exact candidate
already merged. The normal signed Writer reclaim reconciled that operation
without another merge. A later configuration preflight read failed, leaving a
durable uncertain intent with genuinely closed native children. Read-back found
the original configured source pin and no active deployment. A separate owned
native safety read then passed, including full certified data/schema parity.
The original failure's precise cause is unproven; no raw logs are retained.

Configuration absence now requires an optional installation reference to the
byte-exact, hashed capture made before the intent. Configured source pins are
checked separately from mixed running baseline commits. Every recorded protected
configuration, runtime image/source/queue and automatic-deployment control must
remain unchanged. Safety, backup, baseline health and a second preimage read are
required before the normal broker can record absence. Partial, changed, missing
or unknown evidence remains uncertain; legacy settings remain compatible. The
absence receipt retains actual baseline target rows, never a candidate deployment
claim. Reconciliation performs no configuration write. Fixed diagnostic causes
survive privately without exception bodies, credentials or journal changes.

The owned native runner also classifies SSH timeout, connection closure and host
identity refusal using fixed signatures restricted to the pinned SSH executable.
Only those fixed categories reach private diagnostics; stderr and exception bodies
are not retained. An unknown native failure remains unproven. This changes no
deadline, host-key policy, reconciliation guard or release authority.

Installed `sshAddressFamily` may be `auto`, `ipv4` or `ipv6`; omission keeps
OpenSSH's existing selection. Explicit selection applies to every installed SSH
read and dispatch, preserving host identity checks, credentials and deadlines.
A production read-only diagnosis reproduced an SSH timeout with a closed native
Job; a separate IPv4 probe succeeded. Selecting that verified route is installation
configuration, not proof that IPv6 caused the earlier timeout.

Focused integration checks passed 95 tests with one existing opt-in PostgreSQL
skip; `codex:check` passed. Native release continuation and production observation
remain pending at this source checkpoint.

Source checks passed 233 Node release tests, including actual Windows owned
process/recovery/local Git checks; 62 TypeScript tests passed and one optional
PostgreSQL case was skipped. `typecheck`, build, lint and `codex:check` passed.
The additive purpose migration passed two actual isolated PostgreSQL checks:
unchanged existing records, preserved guards and rejected altered scope. Six
installed container/image/source/queue identities were read through the new
state module; services without a Docker HEALTHCHECK were handled explicitly.
These read-only observations do not prove production release/rollback. Actual
grant admission and installed configuration still need verification before release.
