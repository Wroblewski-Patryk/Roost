# Permanent application release

For the distinct Compose provider and its current prerequisite evidence, see
[governed Compose release](governed-compose-release.md). Its release remains pending.

The current gate and authority remain in [implementation](../implementation.md).
This document records Gate 4 evidence. The current state below supersedes the
dated recovery and source checkpoints that follow.

## Current production proof — 2026-10-03

Gate 4 is production verified for the bounded PWA repair. Managed release
`da2536bd-eb56-45c0-87a6-06967a53e676` deployed exact candidate
`7512bc395d65df0fca7cf701047033031f63eb7e`, passed a full 1238-second healthy
observation and completed retention cleanup. Independent postrelease execution
`5ad30a92-d457-4456-957f-4e480e81ed27` returned `verified`; its paired native
receipt confirms unchanged state, the prior audit binding and a closed Job.
Production readbacks show declared/actual PWA dimensions 1000x1000, preserved
schema/data and five protected services, and paused trading. This proves one
repair, not all application flows or LIVE trading. Stop before Gate 5.

The first candidate observation failed after 1055 seconds:
the sealed digest identifies one false API `/health` probe while the frontend
and API `/ready` were healthy; runtime and full schema/data identity matched.
Current operator probes return HTTP 200 with expected payloads, but do not
explain that historical refusal. Normal Worker initiated controlled rollback;
rollback configuration succeeded. Queue `r4dca13b09cd352d8fcfdbd8` finished at
18:54:16 UTC on the prior commit, but rebuilt image
`sha256:23366ff709b15f282476d4e60a6a5e41e080f425089a14f925d4d7be78091247`
differs from the sealed baseline
`sha256:c6ad4493af3d6e770d354fc6b915af2475a6cc9225fa2325de0c1e977e1c7ad1`.
Exact Docker and containerd reads found that baseline image absent. The normal
Worker subsequently reconciled that exact operation as failed and stopped with
its Writer released; rollback remains unqualified. No full-server restore was run. The historical unhealthy
probe reason is unknown. This attempt must remain unsuccessful.

The owner subsequently accepted the healthy rebuilt image above, on the same
baseline commit, as a new baseline. This authorizes securing its exact artifact,
truthfully closing the failed grant, obtaining new independent acceptance and
issuing a new grant for the unchanged candidate. Data, protected services and
paused trading remain preserved. It does not authorize reinstalling the VPS,
deleting data or advancing Gate 5. Recovery support `34a9eaaa` was deployed through
one reconciled normal queue; HTTPS health and build identity match. The adopted
image was exported with authenticated encryption and restored locally with the
same complete OCI index identity; all pre-existing local images were preserved.
Its unchanged three health probes passed 41 samples over 1200 seconds. This is
owner baseline evidence, not new managed candidate release evidence. Normal
read-only reconciliation and immutable FAILED closure are now proven. Fresh
native verification and an independent acceptance are proven; a new release is
tracked separately below. Build capacity was subsequently recovered.

The owner authorized temporary read-only backup access for exact image recovery.
Two provider mount attempts failed; fresh provider read-back reports no mounted
restore point. The VPS itself reports active local boot. A bounded read of 4754
Docker/containerd/BuildKit directories found no exact image descriptor blob.
No backup was restored over the server, imported or left exposed. The retained
Writer was independently qualified against its HMAC, current grant and journal:
owner absent, observer stopped and all 10 registered children closed. Provider
backup access failed for the old recovery path. The new owner-authorized baseline
path no longer depends on that mount and cannot certify the old rollback.
Private recovery tooling is prepared separately;
its fixture checks are not production image recovery evidence.

Recovery support is deployed on `a0ec89e4`; qualification is separate from release proof.
A typed `rollback_image_mismatch` may reconcile a finished queue as failed only
when source, tree, configuration, schema, data and queue identity still match.
It never satisfies successful rollback. A later rollback requires the exact
preserved image. Installed image protection pins the controller's model and
cleanup code, checks retention capacity, and retains an application-specific
baseline alias before candidate dispatch; read-only reconciliation creates none.

A same-commit successor grant may reuse completed Git publication only after
the predecessor has exact-image recovery, a full healthy rollback observation
and retained cleanup. The server derives and rechecks its immutable lineage;
fresh approval, readiness and owner authentication remain required. It starts
at configuration and cannot push, open/review a PR or merge again. The current
incomplete recovery does not qualify for this grant. These additions have not
yet been demonstrated by the live Worker.

### Owner-adopted baseline restart

This separate path does not qualify the strict successful-rollback successor.
`actions/authorize-reconciliation` requires a fresh owner, a normally provisioned
current credential of the same agent and explicit unresolved operation IDs. Its
immutable authorization lasts at most one hour and permits only reads and
`observationOnly` reconciled outcomes against the original snapshot and journal.
It cannot execute an expired grant or change its credential binding.

`actions/close-failed` requires an attributed terminal rollback image failure,
no unresolved operations, fresh exact runtime/configuration/schema/data/queue
evidence and the full original healthy observation duration. It records the
owner's consent digest, an immutable FAILED closure and atomic revocation.
Historical grant bytes and failed outcomes remain unchanged.

Fresh coding material may use `nativeBoundary.existingCommitVerification` with
the exact release, FAILED closure, owner consent digest and prior execution/commit.
All three managed admission phases must match that pointer to current Ready.
The server verifies the immutable closure/revocation and earlier accepted native
candidate against the original first-write approval. Its signed authority permits
only `verify_existing_local_commit`, with `localCommit:false`; it carries no
reviewer rejection or manager-return claim. The Worker requires a genuine native
RED/GREEN replay, exact clean branch/tree and renewed matching signed authority.
It cannot create an empty commit. This evidence-only addition now has an actual
managed native execution and new independent acceptance; a new release remains required.

A new grant may then carry `baselineRestart`; its server-derived
`publishedGitBasis` references the closure and verified prior Git operations.
It preserves the real candidate parent, source and protected services, requires
new independent review and release-audit identities, and runs ordinary current
readiness checks. Protected IDs retain their exact order and append only missing
baseline images attested by the closure. The Worker independently checks current
remote Git and installed baseline queues, then starts at deployment configuration.
It cannot repeat push, PR, review publication or merge. Source qualification is
distinct from the still-required new managed deployment and observation proof.

### Adopted-baseline continuation evidence — 2026-10-03

Normal Worker reconciliation outcome `bd546561-6eda-41ac-8af3-d6d900a5d198`
at 21:11:59 UTC resolved rollback operation
`26109e8a-a617-4578-9e11-dc23d911e644` as `failed`, with
`rollback_image_mismatch` and `observationOnly:true`. Fresh six-service runtime,
configuration, schema, full data identity and strict health checks supported
normal owner closure `90e65069-4a8e-465b-ae37-8e6692e68fa0`, digest
`c03e40f42a6801e9a2328cddec30521b77ae36a7d94f119d8fbc7716d3d5809d`.
The original release remains FAILED; historical Git and failed observation were
not rewritten. Its authority was atomically revoked. The normal Worker stopped,
its process exited successfully and its Writer lock is absent.

New managed verification `d670f051-3c9a-42f6-8438-25c7ccde124d` completed at
21:28:51 UTC. The fixed native assertion reproduced the original dimensions
failure (one failed test), then the unchanged candidate passed its regression
(one passed, zero failed or skipped). Owned native processes closed with zero
active children. Receipt
`1ca0a6b502c7bd28cb834d882ac88c4eda7b60e98c2b375ad6937332f249e031`
records `verify_existing_local_commit`, `commitCreated:false`, no push/deployment,
the exact candidate/parent/tree and the authenticated FAILED closure pointer.
The original first-write approval and Gate 2 branch remain preserved.

Independent read-only execution `3ac40202-075d-4f44-9fdb-9b650977eb90`
completed at 21:38:14 UTC. Its native unchanged-state receipt pinned the new
verification and current material
`73967ef2284590e22f7a40d595c8cdc3c5c86b1d5257aed0adb2f0ea721292b7`.
Distinct reviewer decision `a4aa7a19-7e2b-4231-9025-8a6d4b9c5c03` approved the
exact candidate at 21:38:10 UTC; normal read-back then confirmed `basisCurrent:true`.
Owned processes closed and the normal Worker stopped with Writer absence read
back. This acceptance grants no production release authority. Later audit-context
and group-risk updates require append-only basis revalidation and a new current
review before release; this earlier acceptance remains historical evidence.

A private offline preparation validates the frontend-only adopted-baseline
manifest, appends protection for its exact image, preserves the original Git
parent and all previous protected IDs, and carries the actual closure/new review
identities. It preserves timestamps rather than claiming old evidence is fresh.
It makes no external writes and grants no authority. Capacity, dated safety/
backup evidence, current independent release audit, exact Ready/basis, installed
binding and fresh owner grant must qualify before normal Worker dispatch.

Initial bounded capacity evidence reported 8,153,202,688 available disk bytes against
13,927,274,934 required: unchanged 6 GiB free-disk floor, 5 GiB frontend build
allowance and 2,116,114,870-byte final image. The shortfall is 5,774,072,246 bytes.
Remaining unshared cache and individually attributed obsolete images do not
prove sufficient physical reclaim; protected rollback, unresolved cache intents,
shared layers, containers, volumes and data remain intact. Thirteen private
capacity-analysis checks passed. Neither unmeasured build peaks nor the existing
candidate tag justify lowering this budget or bypassing normal deployment.
The owner rejected paid expansion and authorized deletion of proven obsolete
resources while preserving working applications and avoiding unnecessary Windows
archives. Scoped native cleanup removed three obsolete unused Roost images and
the unused failed candidate image, preserving all other images, 31 containers
and 21 volumes at each read-back. The exact failed candidate was first retained
in an authenticated encrypted archive and restored with its exact OCI root on
Docker Desktop; that proof is retained. Twenty-eight dated, unused Roost
pre-change archives from September 8–12 were individually pinned, hashed and
removed after verification of the current encrypted Roost backup. No new archive
of those obsolete files was copied to Windows.

Native systemd 30-day vacuum removed 50 closed historical journal segments,
retaining all segments from September 5 onward, including the VPS incident.
This is a one-time owner-authorized maintenance operation, not a duplicate
Coolify cleanup scheduler. Exact read-back verified the removals. These scoped
operations recovered about 7.16 GB, bringing actual free space to 15.32 GB.
The owner separately removed the unused automation project; subsequent inventory
reported about 25 GB free. That external deletion is not attributed to Roost.
All six pilot runtimes, their configuration and schema remained unchanged.
Fresh full row/multiplicity/sequence parity against backup
`811332d3-67ab-4e9c-afae-c12bc374fa84` passed in 66 seconds at 22:03:58 UTC,
with zero owned sessions; three HTTPS probes passed. The conservative build
budget and resource floors remain unchanged. Two disposable local image-restore
imports and the unnecessary obsolete-image archive were removed; encrypted
candidate/baseline recovery sources and native proof remain intact. Three further
unused local Roost build/fixture images were individually removed, with all
other local images, containers and volumes preserved. At 22:07 UTC, the bounded
resource read-back qualified 28,076,093,440 free disk bytes, 5,306,030,000 available
memory bytes and load 0.55 against unchanged limits. Physical Windows VHD
compaction was not performed or claimed.
Managed release audit `e62dcbd8-2094-422a-9d9a-2cb48e556220` completed at
22:21:51 UTC with signed admission, unchanged source and zero owned children.
Its original Ready pin remains current. It honestly required a later current
independent acceptance and fresh release authority; it did not attest a future
review. Execution `a109087f-51f2-4f09-935e-dd45007cd795` then independently
approved the exact candidate under decision
`01d5559f-5b83-4de5-8efd-5908733dcef8` at 22:26:38 UTC and material
`178169d266dc1f2fa24ec811b183b7bf2ee0956ba19f477d75703608af4f2529`.
Actual native cleanup closed its Job and the normal Worker stopped; the owned
review binding was removed. Serial normal API reads confirmed current acceptance
and both original audit and revalidated coder Ready. The local default-branch
reference was fast-forwarded to the already verified remote merge without
changing the candidate worktree, earlier Gate 2 branch or remote Git history.

Fresh six-service runtime/health, paused writers, local authenticated backup,
exact-image archive authentication, credential and controller source read-backs
qualified a private normal release request. Forty-one offline guard checks passed;
these checks create no authority. The request preserves the immutable FAILED
closure, exact adopted image and all protected resources. Server-derived Git
publication lineage must be read back before dispatch; the next operation is
configuration, with no repeat push/PR/merge. New managed grant
`da2536bd-eb56-45c0-87a6-06967a53e676`, manifest
`a655202c1a6fbae2807e6da81e29fe1ec1423cda1dae0f589e9c16cfe1b59f8b`,
binds that current acceptance and the owner-adopted baseline. Configuration
`0433f6e7-e469-4f25-806e-b518824b429c` succeeded. Deployment
`2a7cd3a4-79fc-49c5-9f81-248c8bb99df4` dispatched queue
`r39bd5854d21bc53ac279b63` once; it finished at 22:49:34 UTC.
Normal restart reconciled the finished queue without repeating deployment:
outcome `02cf1d5c-214a-4078-90f4-b72fd2ae545a` proves exact candidate/tree,
image `sha256:a2c974deb04727c1f35159511b4e91b37f9fa9853529e42b0f5ac57eb1c8034e`,
healthy services and unchanged schema/data. A dated operator HTTP/PNG read
also confirms declared and actual screenshot dimensions are both 1000x1000.

Observation `3ed4a07c-da8b-4995-bfb0-2c5ad6ddb24f` interrupted with the
fixed native classification `release_child_ssh_timeout` at 23:04:49 UTC.
It is uncertain, not a successful shortened observation. All 71 registered
children closed; the signed Writer was retained. Windows subsequently reused
the exited owner's PID for an unrelated process. Worker fix `98d96126` compares
the authenticated owner's native creation time with the current exact-PID
observation; equal creation time still blocks, and malformed/unavailable
observation cannot qualify recovery. No replacement process is terminated.
Seven recovery tests passed, including actual Windows Job/crash/live-owner
cases; independent source review found no blocking defect. Actual operator
read-back authenticated the retained checkpoint and proved differing creation
times before normal Worker reclaimed it for reconciliation only. The same
grant was renewed with immutable snapshot and journal prefix preserved.
Normal Worker reconciled the same observation as succeeded in outcome
`a3156d60-b2e7-4e17-a9d0-b660c47381db`: 1238 actual seconds, healthy,
same exact candidate/tree/image and unchanged schema/data. Retention cleanup
`c8bf0433-11e1-4b3b-94af-03dc2aa70da7` succeeded with application and repository
retained; the release is completed. Normal stop returned zero, the terminal
signed checkpoint passed HMAC/current-grant/journal and native child-absence
checks, and the Writer is absent. Only the owned release runtime binding was
removed. Dated root read-backs confirm six healthy runtime identities,
unchanged five protected services/configurations/schema, exact deployed PWA
dimensions, paused trading/sync, retained 23 PAPER positions and exact adopted
rollback image. Available disk is 22,955,282,432 bytes.

The earlier audit cannot serve as the postrelease verifier's exact repository
snapshot after the documented local default-reference fast-forward changed
bounded Git metadata. Fresh managed two-file auditor
`717a9845-3e47-46e0-83c9-e72bd007f10e` supplied a verified native receipt,
unchanged Git/process/Docker state and a closed Job. Its model response remains
`blocked`: the auditor could not see its own after-turn receipt and requested
explanations of snapshot/tree identity, configuration aggregation and original
Git publication lineage. Those gaps were supplied to the distinct verifier;
the blocked response was preserved rather than rewritten as positive evidence.
The auditor's native evidence digest is
`4680eb580f373bd9a5457dcdbd0d86c8febe96d9a8e3236379bac98831fd7773`.
Managed admission records accepted `signed_native_v1`; the readable JSON alone
is not represented as a standalone signature.

Distinct postrelease verifier `5ad30a92-d457-4456-957f-4e480e81ed27` completed
at 23:53:50.978 UTC with `GATE4_POSTRELEASE_VERDICT: verified`. It assessed the
original four publication outcomes, exact Git tree, aggregate/target configuration
mapping, managed release journal and dated production observations. Its own
after-turn native receipt validates the exact prior auditor execution/digest,
unchanged Git/process/Docker state and a closed Job with zero active children;
native audit digest is
`d8425a2d3611d23db81fb423ac14a74dfd7a1f31d6b3baa56eedd32df54a9281`.
Actual auditor/verifier context sizes were 121483/129347 bytes. Production facts
retain operator/Roost provenance; no model HTTP or command access is implied.
Normal stop returned zero for both runs and the Writer is absent.

After completion, the obsolete failed-candidate encrypted archive was removed
with exact size/hash and absence verification (425824043 logical bytes).
Its historical restore proof remains, while the adopted baseline encrypted
archive, current candidate image and verified database backup are retained.
No credential rotation or shared-resource deletion was implied by cleanup.
Gate 4 is complete within this scope. The Worker-only fix is installed from
local source `98d96126`; the unchanged server remains deployed on `a0ec89e4`.

Qualification of this recovery support: 62 adapter/broker/diagnostic/native
checkpoint tests passed; 46 installed Worker/gateway tests passed with one
existing opt-in PostgreSQL test skipped; 48 backend contract tests passed.
The successor migration qualification passed 10 tests against a disposable
local PostgreSQL database, including the complete existing/new guard stack for
positive grant insertion and configuration intent. The database was removed
with absence read back. Independent source review's retention-evidence defect
was corrected and rechecked. `npm run validate`, `npm run codex:check` and
`git diff --check` passed. These checks do not prove live image recovery.

Initial candidate deployment evidence follows. Exact pilot
commit `7512bc395d65df0fca7cf701047033031f63eb7e`, tree
`e3615195b9ece13c635e9a248f77a178b993ced8`, was deployed by the normal
Windows release Worker. Deployment `ra59fe70c4ae9d08d7cf9627` was dispatched
once, finished at 18:20:46 UTC, then reconciled from its actual queue and runtime
without another dispatch. The initial healthy runtime image was
`sha256:0730ccda842cca665a6bdc36f78ed26d2263ca499a29adad575130ce1c7f327e`.

The governed release is `7f28822a-c4bd-444d-877f-f351038bf6cf`, sealed manifest
`54f5c9b90c1db92e139be61658ca5c5556c7e4a834619d41300aad037e8271bb`.
Normal push, PR 1, independent review and exact merge are recorded in Roost.
The uncertain merge was read back rather than repeated. The original uncertain
configuration intent was proven absent against its immutable original protected
baseline; a later authorized configuration intent succeeded. The build exceeded
the bounded queue wait, so the Worker closed all 38 native children and retained
its signed checkpoint. Normal restart reconciled the same finished queue as
healthy before beginning the required 1200-second candidate observation.

Independent acceptance `655a3ade-567d-496e-821b-9a5fa2367d21` binds exact
commit and coding material
`b45dd66ed048ec2da61f49290b4909695bfecce07c4f235880c9fc10e998da5a`.
Managed existing-commit continuation `2948f84d-fa86-4d14-8c73-621bc41ba6fb`
proved actual native RED on the parent and GREEN on the unchanged candidate,
with a closed Windows Job and paired unchanged evidence. Release auditor
`def562bd-bb5f-44e7-abdb-822b02edefa4` independently assessed the complete
bounded context. Historical audits and older review approvals below are not
substitutes for these current identities.

The owner separately authorized first write and exact release. Same-snapshot
renewal `42f4f2aa-9557-4d13-9b3e-f2a227730b92` provides the recovery window
through 19:40:00 UTC; it changes no commit, service scope or protected resource.
Only the frontend is deployed. Its actual prior running commit was `0960b097`,
while the repository reference was `cf90418c` and the original configured pin
was `9d1801d9`. The release includes the separately audited existing frontend
catch-up and the new two-file PWA repair. It is not a claim that only two files
differ from the old production image. The other five services remain protected.

Encrypted backup `811332d3-67ab-4e9c-afae-c12bc374fa84` and its isolated restore
verified full schema, rows, multiplicity and sequences at 13:47:38 UTC. Managed
release checks retain schema digest
`c18ebd92b86234a8c3f247b3f5d2898d18447c81f71ee9150a8aa3caacf267a0`
and data digest
`2fbc5b3cfb6f2f5624629553f8e0c0f809083af9c3b3088c319791cb19dd27a1`.
Trading, PAPER writers and external position synchronization remain paused;
23 historical PAPER positions are retained. The Gate 2 local commit and branch
remain preserved. This proof does not certify all application functions, LIVE
trading, or the historical OVH/storage and API-encryption issues.

### Historical recovery and implementation checkpoints

The following sections retain dated states, including earlier absent consent,
pending release and failed attempts. They are historical evidence rather than
the current release status.

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

### Revalidating an unchanged Compose baseline

A retained application restarting a closed release may supply
`baselineRevalidation` with its normal owner release request. It preserves the
manifest's original observation time, exact code approval and native readiness.
This is owner attestation of actual platform reads, not a server inspection or
new native signature. The owner reviews the supplemental evidence with the
exact release scope; its complete bytes enter the request hash and snapshot.

The shared validator binds application, host, candidate and base commits/trees,
the entire stable baseline, target source/configuration/images, rollback,
protected resources, backup and closed-release lineage. Nine component reads
must each be no more than five minutes old and never in the future. Complete
configuration, services, schema/data/sequences/catalog, health, capacity,
backup presence, fixture absence, empty queues and held maintenance controls
are mandatory. A timestamp or receipt hash alone cannot qualify.

The original one-hour rule still applies without supplemental evidence.
Credential-bounded release expiry, fresh owner authentication, independent
approval, native readiness, 24-hour restore freshness and Worker preeffect
inspection remain required. Changed artifacts fail binding; they need their
own checks and approval. Historical receipts are never rewritten or restamped.
Source tests prove this validator; an actual owner grant and runtime outcome
are still required to prove installation use.

### Persisted Compose model readback and retry diagnosis

The normal grant `6b4471c5-9c12-4204-abc2-010d1b0d20b3` bound unchanged
candidate `c82e68b3`, manifest `742c2d4d` and current code acceptance `b8f69273`.
Its sole configuration operation `c12aa38f` returned uncertainty; the official
Worker reconciled it as ABSENT at `2026-10-05T20:52:01.679Z`. Original evidence
time is preserved. No candidate deployment queue was created; baseline health,
data, schema, service identities and held cadences remained compatible.
Signed original 156-child and reconciliation 88-child checkpoints are retained;
both controllers exited zero. HMAC, full journal, actual process absence and
exact lock/state comparison passed before owned lock archival and release.

The installed model retained `git_commit_sha` as an Eloquent `Stringable` after
`save()`. Comparing this transient object with the required string failed and
rolled back the transaction. Plain `refresh()` then dropped the model's default
relationship-count projections. The corrected adapter requeries through the
same locked model query, preserving those projections while checking actual
persisted values. Exact commit/command comparisons and all protected-field and
configuration invariants remain mandatory. The installation's API rules remain
unchanged; no permission or validation relaxation is introduced.

Native rollback rehearsal `bb121957-9d28-4cd8-b384-ee015d2c14a3` at
`2026-10-05T20:55:25.775Z` applied the exact fields inside a transaction, verified
readback, then rolled back. Complete parity of all ten controller application
records passed with zero queued deployments and zero persistent application
writes. This is installation compatibility evidence, not a shipped release.
The gateway retains configuration errors as non-enumerable in-memory causes so
the broker can emit only its bounded diagnostic codes; arbitrary error text is
never written to the release journal or serialized as evidence. Focused config,
gateway and transport diagnostic checks passed 67 tests, including lost query
projections and the real gateway-to-HTTPS diagnostic path.

Normal closure `4d4d7db5-9517-4a13-a8ff-0daf1f954ddd` durably records this attempt
as FAILED. Normal credential rotation issued `ed39ef15` and verified its masked
Windows Credential Manager storage, preserving all six existing scopes.
The current release gate remains incomplete. A distinct native audit and new
exact authority must precede another attempt. Deployment, full observation,
fixture cleanup, cadence recovery and independent postruntime acceptance remain
required.

### Fresh source qualification and current release authority

Native audit execution `d1004c62-8448-4d46-b7f5-ee9c177fab9a` preserves its
literal twelve-finding `CHANGES_REQUIRED` result and earlier negative audits.
Its missing current-source build was resolved by actual Windows Job run
`3e8510be-5e00-4ae5-a384-b2c62692e677`, completed at
`2026-10-05T21:44:42.463Z`: the canonical build and all seven tests passed for
exact candidate c82. Both Jobs closed with zero active processes; original
output state and source/dependency parity were restored. A preceding pre-spawn
path refusal remains a separate failure record; guarded prestate recovery did
not turn that refusal into build evidence.

Independent read-only execution `62ee94ce-b1a3-42dc-affc-979f39d5de67` produced
normal current approval `17f8c1db-91b0-4661-ac6f-c3be7a2a9648` for exact c82 and
material `eed23b95`. Signed closure and official Worker shutdown are verified.
Finding disposition retains the audit verbatim: current build is qualified,
configuration compatibility is only a rolled-back rehearsal, and actual
deployment/observation/cleanup/recovery/postruntime proof remains mandatory.
Private qualification checks passed 137 tests, including rejection of forged
build status and noncanonical native executable/working-directory paths.

Normal owner grant `63750d89-3606-4c1b-8654-174d128c8ddb` binds unchanged manifest
`742c2d4d`, current independent acceptance and fresh nine-read baseline. It was
read back from Roost before binding and starting the official Worker. Existing
Git publication is inherited without replay. The root supervises journal reads
every 30 seconds; this is not an autonomous daemon or external alert service.
Its later journal confirms configuration success, candidate queue absence,
rollback configuration success and rollback queue absence. No candidate was
deployed; the prior four services remain healthy. The final reconciliation at
`2026-10-05T22:21:58.764Z` preserves data/schema parity and empty deployment IDs.
Official reconciliation-only controller closed with zero active children;
HMAC/OS qualification covers all four operations and 52 registered closed
children. The prior 65-child closure is retained separately. Writer/recovery
locks are absent. Both configuration mutations remain successful facts.

The original rollback validator rejected the missing baseline migration
container. The narrow repair permits only that absence while still checking
the sealed migrator image and complete artifact. Actual read-only VPS rehearsal
`242d0888-0ca6-416f-bd68-58c1e29fb3fa` demonstrates original refusal, corrected
qualification and rejection of a changed migration image digest. It performs
only bounded Docker inspection and no deployment. JavaScript/PHP controller
checks pass 11 tests; focused diagnostic checks pass 74. Fixed diagnostic
causes remain private classifications and cannot supply absence evidence.

Changing the pinned renderer requires a reviewed replacement manifest; old
manifest 742 cannot authorize the modified controller. The governed FAILED close
for this exact two-absent-queue journal now has source qualification. Deployment, complete
observation, fixture cleanup, cadence recovery and postruntime acceptance are
still unproven. This checkpoint does not complete the release gate.

The closure requires both original queue-absence outcomes, the successful
configuration mutations, exact retained services and actual rollback
configuration, nine fresh component reads, and newer native closure. It keeps
the historical evidence clocks and never promotes queue absence to deployment.
An explicit baseline adoption binds this authentic closure and the old/new
renderer identities. The deterministic replacement manifest preserves commands,
artifacts, images, source, data, health and effect policy; it derives all three
configuration and artifact-set digests again. Fresh revalidation, a replacement
credential/runtime and current independent approval remain mandatory. The
inherited Git identifiers prohibit repeated push/PR/review/merge.

When retained rollback commands also describe the admitted new baseline, the
Worker selects their descriptor from its exact current snapshot and durable
journal: baseline before rollback starts, rollback afterwards. Command or
snapshot drift is refused. Focused Worker checks pass 202 tests; backend closure,
adoption and prior freshness/restart regressions pass 96. Typecheck passes.
Roost backup `f478b19d` has encrypted-copy and isolated-restore evidence at
`2026-10-05T22:31:02.160Z`; the same backend was restored healthy afterwards.

Roost commit `ac4203a8ddd1f8680585e16fe9fb37afe9932c36` was pushed to the
delivery branch and main. Its existing automatic deployment
`fu0dbjl0ci7wgmw75x5xdpoi` finished; `/health` and `/api/build-info` both returned
200 and the exact SHA at `2026-10-05T22:47:51.748Z`. Closure request
`b02da409-41b2-4e90-b9c8-702b347ebe80` did not create a FAILED receipt. Normal
readback retained the four immutable operations, expired status and zero
closures. A bounded PostgreSQL read-only transaction confirmed that the existing
failed-baseline and closure-revalidation SQL functions both reject this new
two-queue case. Source/API tests do not prove its database integration. An
additive database migration is required before another prepared closure;
the original request is not replayed. All Workers remain stopped.

Backup `c3f26c34-f52c-4e35-9f5c-2dbab6216f48` protects the next Roost migration:
35,239,515 archive bytes, isolated restore verified at
`2026-10-05T22:53:48.554Z`, temporary restore database removed, original backend
restarted healthy. This is Roost maintenance evidence; Aviary has not been
deployed and the release gate remains incomplete.
An earlier backup preparation with a stale database-container reference failed
before completion and remains a failure record. The corrected private binding
preserves the database, volume, encryption key and previous backup records.
### Two-queue database guard parity — 2026-10-05

The additive `20261005230000_compose_queue_absence_closure_adoption`
migration retains earlier closure paths, immutable operation/outcome history,
credential guards and Git lineage. It accepts only the exact successful
candidate/rollback configuration changes followed by two reconciled absent
queues, a closed native tree and nine fresh component reads. Adoption derives
the retained rollback configuration as the new baseline, pins the corrected
renderer and recalculates every configuration/artifact digest; changed scope
or controller commands are refused. It does not replay already published Git.

The first SQL rehearsal failed compilation before persistence; bounded readback
confirmed unchanged function definitions and release history. The corrected
migration passed actual release `63750d89` in a rolled-back transaction:
receipt `1f8734aa-d545-41d1-92e1-3081971155c7`, eight probes, complete
function/history parity. Positive closure and recipe parity passed; writer,
queue, configuration, stale-read and changed recipe cases were refused.
These probes never inserted an owner closure or granted release authority.
The separate disposable PostgreSQL test passed all five checks, including
guarded closure/revocation, inherited Git/adoption, negative inserts and old
guard preservation; its temporary database was removed. Backend typecheck and
59 focused shared/backend tests passed. Roost deployment and normal owner
closure were then required; Aviary remains undeployed and its cadences held.

Deployment readback at `2026-10-05T23:13:20.610Z` confirms Roost
`241c12649ae41e9999a779e1f75251f09b79680b`, pushed to branch and main,
sole automatic queue `ukrtf327hyqx5hhxpltf6bmu` finished, health and
build-info HTTP 200 with that exact commit. Database receipt
`241c1264-1791242010870` verifies the applied migration checksum against
committed bytes, four new functions, two triggers and unchanged four-operation,
zero-closure history before the normal closure below. Aviary is not deployed.

### Normal two-queue closure and replacement audit — 2026-10-05

Normal owner closure `4a98987c-d93b-4c14-9655-7cbd41957bb6` persisted FAILED
for `63750d89`; receipt `de0a888d` preserves all four original operations,
two absent queues and the signed closed native tree. Ordinary rotations
verified releaser V8 `751701d5` and independent reviewer V3 `13339a52` in
Windows Credential Manager; no secret was saved in records. These credentials
are distinct from release authority.

Installed package `47b29b55` contains eight physically verified files and
manifest `b374cfe3`. The allowed deterministic recipe adopts the retained
rollback configuration and corrected renderer; commands, artifacts, data,
services and inherited Git remain bound. A first local preparation failed
before installation because the native key file identity used a rounded NTFS
inode. Reading the actual identity as bigint repaired that comparison without
changing the key or evidence.

Actual readonly audit `ba9a2999` completed at `2026-10-05T23:26:54.895Z`:
signed native admission, unchanged repository, closed job and no application
writes. Its 129,513-byte provider input passed the 131,072-byte bound.
Normal Worker shutdown closed controller 221632 with exit 0. All 17 literal
CHANGES_REQUIRED findings remain preserved. The fresh build closes only the
historical missing-build finding; installed version, migration, health, smoke,
1,200-second observation, fixture cleanup, cadence restoration and independent
postrelease acceptance still require actual release evidence. Current exact
independent approval and normal owner release authority remain pending.

### Unchanged readonly audit basis — 2026-10-06

Adding the required independent audit-receipt review changed the reviewer's
prompt and therefore the shared risk assessment. Normal API readback `aaa0b17f`
confirmed the completed audit's Ready became `needs_revalidation`, while the
existing coding-only basis endpoint returned `completed_result_native_unproven`.
Rerunning or changing the audit would discard valid evidence unnecessarily.

The additive `20261006002000_readonly_completed_result_basis` migration and
matching API eligibility allow only an unchanged completed auditor result with
signed managed admission, exact job/source identity, closed zero-process tree,
unchanged repository/process/Docker evidence, no lease and no application writes.
Contract, prompt, base, application and admitted commit must match fresh Ready.
Owner, latest-result, review/rejection, context, admission, composition and
suspension guards remain. The coding native guard is preserved verbatim.
The append-only mapping does not change the native result, original Ready,
timestamps, CHANGES_REQUIRED verdict or release authority.

Root checks: 57 focused tests, including the existing rejection-disposition
PostgreSQL proof; 39 new checks with a real forward disposable PostgreSQL
migration, refusal probes and immutable-history checks; `npm run validate`.
The first new database fixture failed its actor constraint and was corrected;
the rerun passed without skips. Its owned test database was removed.
Roost `3403347e` deployed through sole queue `vxjyd1667huaazybo79hgjl0`;
health/build-info confirmed the exact commit at 23:57:44.952 UTC. Database
readback confirmed the forward migration checksum and original history.
Normal Ready `fa16d08e` and append-only audit mapping `d7758c8c` preserve
the original native result and all 17 findings. The stale coder procedure was
refreshed only after actual durable rejection `b66ec4d0` was read and archived;
normal coder mapping and reviewer Ready then succeeded.

Reviewer execution `228eaf9c` was initially unclaimed. Actual measurement at
00:05:27.014 UTC refused 136,612 bytes against 131,072 before any model call.
The refusal is preserved. Repeated application domain and readiness-dimension
definitions are the bounded context repair; no task scope, Ready or cap is
changed. Actual successor measurement and independent review remain required.

The Worker now packs only canonically identical capability domain/readiness-dimension
records into `roost-application-shared-records-v1`. Each full record remains once,
with canonical digest; field-specific indexes must match declared relation IDs.
Exact restoration verifies the original complete projected context digest.
Unsupported or conflicting records remain inline. Malformed, missing, changed,
ambiguous or supplementary references are rejected. Full original context still
undergoes redaction, Ready revision and freshness checks before projection;
no discovery, permission, audit or release authority is granted by references.
Provider measurement and launch use the same projection and unchanged cap.
Root's 80 shared-record, integration and existing provider-input checks pass.
Roost `3274aef5` deployed through sole queue `e9gvqvplxp8eigmhn0v95axi`;
exact health/version confirmed at 00:16:26.753 UTC. The same queued review's
successor measurement passed at 130426 bytes; its original refusal is retained.
Actual execution `228eaf9c` failed at 00:18:50.295 UTC with
`code_reviewer_unproven/model_schema_correction`. Offline read-only Hermes
session inspection confirms `correction.scope` and `correction.excluded` were
strings, although the strict response schema requires arrays. The raw reject
is not an accepted review decision. Official controller 124956 closed with
exit 0. Normal readonly terminal reconciliation preserves that failure.

The provider instructions now state the existing JSON field types, array
bounds and prohibition of extra fields explicitly. Validation and review
authority are unchanged. Root's 128 relevant schema, provider-input and
shared-record checks pass. A new actual review, release and postrelease
acceptance remain required; no candidate deployment is proven.

### Independently supplied audit evidence for code review

The rejected raw response also identified an availability gap: audit findings
and receipt attribution arrived through the owner instruction rather than
Worker-qualified evidence. A code-reviewer contract can now optionally pin
`priorAudit.executionId` and the original `priorAudit.receiptDigest`. The
existing leased prior-audit endpoint preserves verifier behavior and supplies
only the pinned completed independent auditor result to the assigned Worker.
The code-review path also requires signed native admission and a successfully
closed zero-process job. The Worker rechecks identity, original receipt digest,
current repository commit/branch/tree, clean result and source selection.
It transports all original findings with their original native receipts and
timestamps as bounded `codeReviewerPriorAudit` evidence. Later Ready mappings
cannot replace that evidence. The input seal binds the optional pin to the
packet; missing, changed or unpinned evidence is refused. Evidence remains
untrusted model context and grants no release authority.

The packet test's synthetic successful completions now retain two expected
terminal journal files. Its cleanup omitted them and failed `ENOTEMPTY` despite
successful assertions; cleanup now removes only those two owned fixture files.
The corrected 74-check suite passes without skips. Root's 123 relevant review,
prior-audit and provider checks pass; `npm run validate` passes. Actual delivery
through the new evidence path remains required.

Forward migration `20261006010000_code_reviewer_prior_audit_risk` updates only
the strict readonly schema function. No stored assessment or business row is
changed. Root's 36 checks, including real rolled-back PostgreSQL refusal and
classification probes, pass without skips. Existing verifier/coder rules remain.

The lossless shared-domain projection now also covers `gaps[*].domain`, only
through a unique capability-definition relation. Conflicting or unsupported
groups remain inline. Exact restoration and legacy v1 packets remain supported;
39 focused checks pass. Saved actual input inspection shows 5228 fewer bytes,
with all records restored exactly. This is a size diagnosis, not launch proof.

Roost `171a76f3` deployed through sole queue `zhes1pyhu5s7ndfsju21k83o`;
health/version confirmed at 00:45:57.460 UTC. Migration
`20261006010000_code_reviewer_prior_audit_risk` checksum and schema mirror
match the deployed source. Actual input measurement: 130296/131072 bytes.
Review `ab692270` stopped before model launch at backend-evidence persistence:
old signed admission files from failed `228eaf9c` remained active. Normal
reconciliation and shared writer/application reclamation completed at
00:54:42.763 UTC. The expired authenticated prior pair was archived with exact
byte preservation. Worker failure cleanup now requires the same execution's
signed pair and an observed closed native Job; it retains the original failure
and ownership fences. All 50 managed/prior-audit checks, including actual Windows Jobs, pass.
A new actual accepted review and application release remain pending.

Actual review `4793c21f-6864-4365-bc3c-a01bb687676c` completed at
01:03:22.463 UTC on 6 October. Its signed closed native Job reports no workspace
changes, and its separate artifact independently passes the original `ba9a2999`
audit provenance. Code decision `f3df40a7-0b5a-493e-8f90-07f51fae5b6d` is
REJECT: the dated log does not contain the later exact candidate receipts.
Official Worker controller `124596` closed normally at 01:06:09.475 UTC.
Neither that artifact pass nor completed execution grants release authority.

The chronology dispute was independently inspected against the accepted
requirements and app log rules. A commit cannot embed its own resulting hash
and post-commit receipts. Preserve the rejection and use its existing manager
return: the executor will append the specifically requested predecessor
receipts as history; any successor's later checks belong to its formal handoff.
Do not rewrite a verdict or revalidate rejected material to bypass that return.
Manager extension version 2, selection and a fresh nine-member risk assessment
are recorded; normal `return_to_executor` procedure admission passed. Its
expired credential rotation is prepared, with fresh owner authentication still
required. No return, application edit, new candidate, release grant or app
deployment has occurred. Private rotation/correction preparation checks pass
7/7 and 3/3; the gate remains incomplete.

Normal manager credential rotation and masked Windows Credential Manager
readback completed on 6 October. Return `99bb9555` preserved rejection
`f3df40a7` and its exact log-only correction. Nine-member risk, procedure
selection and admission were renewed. Ready correctly retained a rejected
submission, but its compound-intent heuristic incorrectly treated the noun
phrase “and build receipts” as another build instruction. The shared validator
now distinguishes named build evidence from another build target; structured
cardinality, component, outcome and manager correction checks are unchanged.
All 97 packet/single-task checks and `npm run validate` pass. Roost `f817253b`
was deployed and its health/version read back at 09:41:27 UTC on 6 October.

Fresh Ready `ce767548` admitted the exact returned correction. Actual Worker
execution `645f792b` completed at 09:47:41 UTC: local successor `c64378df`,
tree `968ff13c`, only ten appended log lines, seven tests passed and the native
Job closed with zero active processes. All twelve protected sources remained
unchanged. Test receipt `ccf6cddf` and local-commit receipt `4f4bcbfe` bind this
successor; predecessor receipts remain historical. The official controller
closed normally and the Worker stopped. A distinct exact-successor canonical
build and fresh independent review remain required before any new release
package, Git path or application deployment. The gate is incomplete.

The distinct successor build `6c602f42` completed at 10:01:33.755 UTC on
6 October. Actual `npm run build` and a separate seven-test Job passed;
generated HTML and bundle contained the exact successor SHA. Both native Jobs
closed with zero active processes; source, dependencies and tooling remained
unchanged and only new build outputs were removed. The signed private evidence
digest is `e04c6ba0`; its canonical handoff digest is `13596acd`. This is new
successor proof, not a promotion of the predecessor build. The independent
review preparation binds `645f792b` and original material `39d86760`, twelve
source seals and the full latest log section. Its expired reviewer credential
rotation is prepared; fresh owner authentication is the remaining dependency
before normal admission, measurement and Worker execution. No successor Git
publication or application deployment has occurred.

Independent successor review `234dfc97` completed at 10:14:21.438 UTC on
6 October. Normal decision `4dc1812a` APPROVES exact `c64378df` on original
material `39d86760`. The original result needs no fabricated basis mapping;
`basisCurrent` denotes a recorded mapping, not whether an unmapped approval
is valid. Full provider input was 117841/131072 bytes. Native read-only
footprints stayed unchanged; the signed archived admission pair passed core
verification, all owned process identities were absent, and the official
controller closed normally. This code approval does not certify an app release.
A new exact package, manifest audit, Git path and runtime proof remain required.
