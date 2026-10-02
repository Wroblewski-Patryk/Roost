# Governed release operation and evidence

This is the component contract for Gate 3. The active delivery state and scope
remain in [implementation](../implementation.md). Gate 3 is **certified on the
temporary target** (2026-10-02). Gate 4 is in progress; see
[application release](application-release.md) for its evidence boundary.

## Current certification — 2026-10-02

The normal Windows Worker/Hermes managed coder produced
`de6ebe7a4267078196534a36f73ff9bccb09d3ae` (tree
`467fcad81f5676c80ffbf37d2f30a6ef4ba85827`) after two read-only baseline
canaries and the owner's separate first-write Decision. Three candidate tests
passed; its native execution `eac347c7-5998-4b06-b9d6-159cd298db5a` closed
the owned Windows Job. Independent managed review
`154d5cc2-904b-4413-9947-4820ee413648` accepted that exact commit. A separate
managed release audit completed before owner grant
`21585a17-79ca-4623-aa63-4018f1d03965`. Changed-commit admission returned 409;
read-back proved no grant was created for the changed commit.

The release broker pushed the declared branch, opened PR 1, published the
independent Roost review and merged the exact accepted SHA into private main.
An uncertain merge was reconciled as succeeded at 10:28:59 UTC without repeating
the effect. Repository visibility stayed private; this is the configured broker
path on GitHub Free, not a claim of native protected-branch enforcement against
an administrator acting outside that path.

Candidate deployment `wx4xo4bq7he5a8i48xhmpbq0` was queued exactly once.
A normal controller stop preserved its sealed Writer checkpoint and all sixteen
closed native children, including twelve in authenticated compacted history.
Normal restart qualified the same grant and journal for read-only reconciliation.
Thirteen actual HTTPS samples proved the exact candidate running, initially
healthy and then failed after its configured 30-second fault. HTTP remained 200;
the application health payload correctly caused rejection. Deployment intent
`0ad8fc8b-2842-4647-b470-2d7dcbc54ece` reconciled as failed at 10:52:35 UTC,
without another deployment POST. This proves the Gate 2 recovery repair on the
real release path, not merely a native fixture.

The broker restored the compatible baseline image/configuration/schema through
rollback deployment `dzy2y8t689far4zowki7hte4`. Actual runtime and HTTPS health
matched baseline commit `efac14d67f8f8398d133b20723c92c82046dbc33`, image
`sha256:4041c6fb25be80c38312636fcb4061bab9140c5395ff7ceff483a1a27d4d8de6`,
configuration `bb9d56deb636c365af9f7c6f1a260a4740fcb2df5c7045f33c51973b46a0cbbf`
and schema `386748e356d86b4b02641516c71b6249de9853286efe6840c5b5cb4a347e6f00`.
Rollback succeeded at 10:54:44 UTC and a 64-second healthy observation completed
at 10:56:16 UTC. Synthetic data digest
`efbd6a7dcb4c8700082c53a57beda905fbf38b40e29fdcba72b304fee7b9e889`
stayed unchanged throughout failure and recovery. The target had no database or
business data; this does not claim a production database rollback. Separately,
the prerequisite encrypted production PostgreSQL backup/isolated restore proved
schema, row and sequence parity, authenticated read-back and restore database
absence; its separate key and off-device owner acknowledgement remain private.

Final read-only cleanup intent `980dd672-10cb-4b52-ba68-5fbffe15dd64`
succeeded at 11:24:05 UTC. It proved absence of all sixteen owned resources:
one Coolify application, nine registry versions, four local images and two VPS
images. The exact temporary repository was archived, the clean owned canonical
clone removed, and shared networks, volumes, services and other repositories
preserved. The authoritative journal has 34 resolved operations and status
`completed`; historical absent/failed attempts are retained.

Roost ApplicationEvidence `e3bac90e-be97-4592-82e0-783180267af5` is **verified**,
with reference `roost:gate3:release:21585a17-79ca-4623-aa63-4018f1d03965:certificate:v1`
and payload digest `a27e5b585f4879dd5624ca1e68faef7da6948dd60088605d694cca92d3e212a2`.
It contains typed journal, native execution, independent acceptance, interruption,
backup/restore, health, rollback and cleanup proofs. Archived test records retain
the certificate; Task Events and EvidenceRecords retain operation projections.
Credentials, recovery codes and private installation paths are not in the record.

Root checks passed `npm run test:agent-host-release`, including actual Windows
Git/Job/crash/reclaim checks, plus focused cleanup/provenance tests and standard
typecheck/build/lint/routes/documentation checks. The standard release suite's
optional PostgreSQL integration case was skipped without its environment; the
separate disposable PostgreSQL migration and real HTTP authority checks passed
without skips. These tests supplement the actual release proof above.

### Implementation commit inventory

Gate 3 source/operations history follows Gate 2 commit
`1f7f94aa77856a66e60c1d2f3cd1eaa813cdba9e`. In chronological order, the
reviewable Roost commits through the final code repair are:

`0618d00e`, `26d70006`, `e29ae06f`, `3289ab2b`, `d37e8bbe`, `0735f324`,
`4c567478`, `c729f89a`, `fac409e5`, `7034eee5`, `dec8fe4b`, `4784c1e5`,
`2ed64c2e`, `593df37e`, `a97d97c8`, `2f9c511a`, `98df6776`, `fc4ce855`,
`323ca3d6`, `540c29ad`, `2aafac10`, `08f8685e`, `654b42c1`, `4b00ec65`,
`4dd973bc`, `d16e1303`, `1a326ade`, `73e68dba`, `14cefae3`, `dcad6a85`,
`f6161d27`, `d33da1db`, `41b4ffe2`, `51ad22a7`.

The final code commit is `51ad22a76f4dcb83dac2440e0b5f8491d5ff8f31`.
These are bootstrap implementation commits; the managed test application commit
and its separate deployment/recovery identities are recorded above. The final
documentation commit and exact deployed Roost build are read back separately at
handoff. Git history and the historical checkpoints below retain individual
deployment outcomes, including unsuccessful attempts; no failed queue is treated
as a deployed-version proof.

## Authority and execution

The owner creates a temporary release grant at
`POST /v1/agent-runtime/releases` with a fresh owner session (five minutes).
`governed-release-contract.ts` and the shared CJS wire schema bind the approved
exact commit/tree, base commit/tree, independent review ID/material, distinct
releaser and credential version, application/host and immutable manifest.
The candidate must carry concrete managed coding/native proof. A separate
completed managed read-only execution proves releaser readiness. Both tasks
must still pass the current Ready/source/risk/procedure checks without repinning.
Changed required context, credentials, roles, suspension or application mapping
blocks each subsequent intent.

Issue a dedicated agent credential with `purpose: governed_release`; ordinary
review keys do not gain `agent-runtime:release`. The agent needs `governed release`
competence, `release_authorization` authority and `remote_push`/`deployment` tools.
It cannot create or revoke its own grant. Owner revocation stops new effects;
active credentials or the owner may reconcile old effects by observations only.
The additive `20261001010000_governed_release` migration preserves existing
credentials and business rows. Journal tables are append-only and serialize
operations per application. Outcomes have monotonic sequence numbers.

The optional `governedRelease` installation setting enables a dedicated release
Worker under the laptop's existing Writer. This process never claims or launches
model tasks; finish the managed coding/review/audit processes first. Broker
credentials come from Windows Credential Manager. Fixed adapters accept typed operations, not commands
or model-selected URLs. An unresolved operation prevents another effect.
Task Events and EvidenceRecord projections link to the authoritative release
journal and are visible through Roost; the HTTPS API exposes the detailed journal.

## Private installation configuration

Keep installation settings, paths, domains, ownership records and credentials
outside Git. `governedRelease` has:

- `client`: host/agent IDs, WCM credential target and Roost TLS fingerprint;
- `githubCredentialTarget` and `coolifyCredentialTarget`: `Roost/Gate3/*`;
- `coolify`: HTTPS controller, exact application UUID, candidate/rollback raw
  configuration snapshots and optional controller/health TLS fingerprints;
- `resources`: fixed SSH alias, canonical workspace root and external ownership
  file. Models cannot select a transport or callback through JSON.
- `prerequisites`: private backup configuration and evidence files. The Worker
  verifies the acknowledged installation, separate key, actual encrypted latest
  copy and its authenticated archive/restore identities before admitting release.
- `imageCleanup`: private image ownership file and registry credential target;
  required when image resources are registered for certification cleanup.
  `allowTemporaryPackageRemoval` defaults to false. Enable it only when the
  owner explicitly authorized removal of the entire newly created test package.

The resource ownership file uses `roost-release-resource-ownership-v1`: exact
grant/request/application IDs, Coolify UUID and numeric ID, immutable image
repository/digests, manifest digest, canonical clone physical identity, marker
digest, temporary resource IDs/kinds/creation times and capacity thresholds.
Docker image records also require the `local` or `vps` engine. The same immutable
image may exist on both; duplicates within one engine and missing engine bindings
are refused. The Worker matches this field to its separate image ownership file.
The clone marker lives in `.git/roost-release-owned.json`; the external ledger
survives local cleanup. Preserve a partially deleted, changed or foreign clone.
Never infer ownership from a matching resource name.

## Git, images and health

The private repository uses a broker-owned main credential and an independently
approved Roost decision. GitHub Free private repositories do not provide the
required native protected-branch gate ([GitHub documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)).
Keep visibility private. The broker restricts publication to the declared task
branch and a candidate with exactly one parent equal to the accepted base.
A COMMENT records the independent Roost acceptance; it does not impersonate a
second GitHub reviewer. A non-forced fast-forward must close the PR as merged at
the **same** approved SHA. The certification above proves this exact path;
tree equality cannot substitute a different merge SHA. Operator admin authority
outside the managed mechanism is not a broker capability.

On the inspected Coolify version `/start` queues `HEAD`; merely setting
`git_commit_sha` does not prove an exact Git deployment. The adapter instead pins
an immutable registry image using its content digest. OCI labels are
`org.opencontainers.image.revision`, `io.roost.release.tree`,
`io.roost.release.config` and `io.roost.release.schema`. Retain candidate and
verified prior artifacts through observation and backup verification.
The configuration digest includes raw settings, environment hash and storage
hash; environment/storage replacement is unsupported in this certification path.
Coolify custom labels must use the installed API's base64 representation.
Disable auto-deploy and label regeneration before capturing the snapshots. PATCH
changes only supported differing non-null settings and immutable image/Git pins;
the installed API cannot change `build_pack`. Read back the complete digest.

Actual Docker image ID and registry digest, unique application container and
request/deployment provenance are checked through fixed read-only SSH programs.
Health checks additionally prove commit/tree, configuration, schema and synthetic
data digest. An application cannot embed its own immutable image hash without a
circular build; the journal image digest comes from the actual container/OCI
inspector. If the endpoint supplies a digest, it must agree.

After one deployment POST, wait using GET only for up to sixty seconds. Pending
queues are not version evidence. A unique queue record and actual runtime must
agree before health/observation. A proved unhealthy candidate with unchanged data
permits the exact prior image/config/compatible schema rollback. Missing health,
unknown identity, changed data or ambiguous queue freezes further effects and
requires diagnosis. Verify rollback health and its full observation window before
cleanup. Capacity admission checks Docker, free disk/memory/load and no concurrent
Coolify deployment. Keep existing Coolify cleanup jobs unchanged.

## Backup and owner recovery prerequisites

`roost-release-owner-setup.ps1` is an **owner-only local interactive** setup. It
accepts a registry token through a hidden prompt, asks for the owner-designated
backup folder, creates a separate restore key, displays the recovery code once
and records the owner's off-device acknowledgement. Never run the generate bridge
in an agent tool/log capture. Never copy tokens or recovery codes into Roost,
Git, evidence or chat. Existing unacknowledged code receipts cannot redisplay a
code; the owner must use their retained off-device copy.

`createReleaseBackupGateway(privateConfig).backupAndVerify()` uses fixed SSH
commands and immutable source/restore PostgreSQL container IDs. Restore targets
are fresh random databases with an exact marker and OID, in the existing engine;
production is never restored or reset. Match complete schema, row hashes and
sequence state, encrypt with AES-256-GCM, read back/decrypt, prove the owned restore
database absent, then atomically promote one latest encrypted laptop copy.
Keep the key outside both Git and the backup folder. Data-changing source snapshots
are rejected. Retain the last good copy on failure. Unknown creation/ownership or
active sessions preserves the database/fence; `inspectInterruptedBackup()` reads
the actual state without retrying or deleting it. The recovery setup implements
generation and acknowledgement, not an account recovery login endpoint.

## Uncertainty, recovery and cleanup

Every push, PR, review, merge, configuration, deployment, rollback, individual
resource removal, archive and clone cleanup has its own durable server intent
before the external effect. A lost reply records uncertainty. The next invocation
reads actual state before any retry. A proved absence must be specific to the
operation; a timeout/403 or still-present asynchronously deleting application is
not absence. Credential-bearing Git and its helpers run in a Windows Job; closing
the controller kills owned descendants. No network mutation retries implicitly.

The release Worker tracks every native Git/SSH/Docker child using suspended v2
Job assignment, exact executable identity and a genuine terminal cleanup receipt.
Launcher refresh compilation also runs in an owned Job. Before a server outcome,
seal the HMAC-protected private Writer checkpoint with the exact grant and immutable
journal prefix. Restart after this barrier permits reconciliation only until the
fresh journal proves all outcomes resolved. A crash during a child, missing
receipt, changed journal/key or torn checkpoint retains ownership. Closed receipts
compact into an authenticated bounded history, without relying on historical PID
reuse. Native crash/restart checks and the real interrupted candidate deployment
above prove this repair for the certified path.

A normal controller stop also retains the sealed Writer when the broker records
an uncertain outcome. It exits before another effect; restart must qualify the
same grant, journal and native closure before read-only reconciliation.

Managed dispatch now durably binds the signed execution identity before native
launch. Failed native review retains the exact Writer/application fence. Admission
retirement can recognize a partially archived signed pair without replacing its
identity. Strict existing reconciliation proves the stopped Job before releasing
the exact lease. Historical spent records without native identity remain blocked;
this does not claim recovery from every hypothetical failure.

Coolify application DELETE explicitly disables volume deletion, connected-network
deletion and Docker cleanup. Wait/read back exact HTTP 404 without reissuing DELETE.
Remove registered stopped Docker resources individually only after ownership and
no users are proved. Archive the private repository, delete only the exact clean
owned clone, and record the final read-only absence proofs. Shared resources and
unknown files remain untouched. Remove only certification configuration and keys
after final journal/evidence read-back.
Register each owned local/VPS immutable Docker image and GHCR version separately.
Image cleanup requires application absence, exact digest/ID/tags/creation time,
private linked package/repository and no containers using the image. Use no force,
prune or generic package deletion. The owner registry token needs `read:packages`,
`write:packages` and `delete:packages` for these owned test versions.
GitHub's normalized scope header may omit `read:packages` when `write:packages`
includes it. The adapter accepts either read scope while still requiring deletion
authority and exact actor/private package ownership. A live package GET confirmed
this behavior; the regression also denies a write token without deletion scope.

An uncertain deletion with unchanged exact resource presence is reconciled as
an absent effect before a new broker intent. The same adapter cannot repeat its
spent mutation. Changed identity, inaccessible state or missing source proof
retains the hold. HTTP 400 was observed for the sole remaining untagged test
version. With explicit whole-test-package authority, its cleanup uses an exact
private package ID/owner, the sole complete active-version catalog and cache-only
OCI proofs for every registered version. A second catalog check precedes the
effect. An internal non-serializable, single-use capability permits that exact
package DELETE; arbitrary callers and serialized flags cannot authorize it.
Package/version 404 additionally requires the authenticated owner's complete
package catalog and those immutable prior proofs. This path is qualified for a
user-owned test package, not organization-wide absence. Managed publishers must
be stopped under the existing Writer before cleanup. GitHub has no atomic
catalog/DELETE precondition; concurrent owner/admin publication outside the
managed mechanism is outside this guarantee. Never enable the option for a
shared or previously existing package.

## Historical evidence checkpoints — 2026-10-01 to 2026-10-02

The checkpoints below record earlier incomplete states and repairs. Their pending
or next-action statements are superseded by the current certification above;
they are retained as historical evidence, not an active work queue.

- Live Roost public health/build-info: HTTP 200, build
  `1f7f94aa77856a66e60c1d2f3cd1eaa813cdba9e`. Authenticated prior evidence read-back
  is pending renewed access (Worker key rejected, owner token expired).
- The Gate 2 pilot is clean at accepted commit
  `774e858ae48d1f05d2b56982a7113da983f62af8` on its existing local task branch;
  no pilot edits, push or deployment.
- PostgreSQL migration test: existing rows preserved, old/new credential profiles,
  one winner for concurrent intents, append-only and uncertain-operation fences.
- Scoped API test: ordinary principal denied release, dedicated scope admitted
  read-only queue, agent denied owner grant, invalid owner inputs rejected.
- Windows native recovery fixture: real harmless Job, exact signed identity,
  failed-review reconciliation, retained spent record and fresh application lease.
  This is component recovery evidence, not a Hermes release of the certification app.
- Backup test: real local PostgreSQL custom archive and restore with synthetic
  multiline/JSON data, schema/index/sequence parity, authenticated encryption and
  both owned test databases absent.
- Production backup/restore passed after owner setup: archive 28,151,762 bytes,
  SHA-256 `86e159f5e77f9c1dba16f32a6b5816e00f3a66f973af5b235fec9e5b98403ac7`;
  encrypted read-back, full schema/data/sequence parity, owned restore database
  absence and latest-copy promotion verified at `2026-10-01T16:47:21.572Z`.
  A separate prerequisite read decrypted/authenticated the actual latest copy and
  verified the owner's off-device acknowledgement. No unresolved backup remains.
- Adapters and broker have focused negative/uncertain/progression tests. Remote
  operations use test doubles in these checks; native local Git cleanup is real.
- `npm run test:agent-host-release`: 117/117 passed (101 Node and 16 TypeScript),
  with no skips. The native release recovery case ran nine real Windows Job
  children, killed its broker after the sealed barrier and reconciled without
  repeating its effect. A crash during a child retained the Writer. Its external
  grant/journal were fixtures, not a deployed Roost release. Fixed native Git
  binary input and local Docker inspection also passed.
- `npm run validate` passed lint, type checking and server/web builds. Existing
  web asset/chunk warnings remain; these checks are not deployment evidence.
- Subsequent normalized-registry-scope regression: 31/31 image cleanup tests passed.
- Adjacent native managed-admission, failed-review, B19 reconciliation and Writer
  checks: 37/37 passed without skips. Agent-principal checks: 2/2 passed.
  `npm run codex:check` passed, including all 225 requirements mapped once.
- The owner-designated private repository, canonical clone and one Coolify app
  were created after absence checks. Baseline commits
  `6f3b070b610a5eb3ebbfd91aa23e534bc9d5524c` and
  `1353fc309df99fe679c8ac155f9ae2ec177053e1` were pushed solely to initialize the
  disposable target. A dual-stack health repair initialized baseline commit
  `efac14d67f8f8398d133b20723c92c82046dbc33`; baseline deployment
  `sdn3gz0ehdckey4biy2xubfi` is healthy over verified HTTPS with the exact
  commit/tree/configuration/schema/synthetic-data identities. Earlier failed
  bootstrap deployments were inspected before retry. This is baseline
  initialization, not a managed candidate or release proof.
- Actual independent candidate acceptance, broker PR/merge/deploy, HTTPS/version,
  observation, controlled regression/rollback and final cleanup/archive remain
  unproven. Gate 3 is not accepted. Private installation receipts contain target
  UUID, URL and ownership details; no real deployment settings are distributed.
- Production read-back retained the completed Gate 1 execution and Gate 2
  coding/reviewer executions at the accepted pilot commit. The temporary target
  has its own Roost application, project, context, roles and published procedures.
- GHCR REST omits its repository projection. Cleanup instead verifies original
  immutable OCI manifest/configuration bytes, source label and publication graph.
  A private cache preserves those exact bytes before deletion and revalidates
  them after restart; it never stores credentials or accepts a receipt boolean.
  Focused provenance/cleanup checks: 53/53 passed, including interrupted cleanup
  reconciliation and tamper rejection. The release Worker requires the private
  `imageCleanup.provenanceCacheDirectory` and exact `publicationDigest` for each
  registry version. Native baseline provenance and offline restart passed.
- Roost build `e29ae06f10e90e049c4aea415e644211060e87ad`, deployed by the
  existing main-branch webhook as `x7o2g52eowfm6wlmgmhcltsk`, was confirmed by
  HTTPS build-info and the authenticated Worker-generation catalog. This verifies
  deployment of these mechanisms, not candidate certification.
- A bounded human owner/admin Worker-generation catalog supports ordinary
  credential rotation without guessing historical generation metadata. The
  endpoint returns the actual expired generation; one-use rotation is pending.

Run `npm run test:agent-host-release`, scoped API/migration checks, the Windows
managed recovery fixture, `npm run validate`, `npm run codex:check` and the real
certification path before claiming completion. Resume only Gate 3. The next safe
step is validating the owner's private prerequisites, obtaining a fresh owner
session for configuration, and preserving exact identities during installation.

### Cumulative changes and read-only prerequisites

Risk algorithm `roost-native-risk-v2` retains the full related task group,
source watches, evidence, maximum impact and uncertainty. Only complete
`inspect-readonly` contracts validated by the execution schema, native path
rules and read-only permissions are excluded from the count of changes.
The API derives this from stored immutable scopes; the additive database guard
independently verifies the same count. Missing or malformed scopes count as
changes. Historical v1 assessments remain immutable and conservative.

The focused suite passed 15/15, including real local PostgreSQL checks in a
rolled-back transaction: four audits plus one change remain low, two changes
escalate to medium, four to high, and forged exemptions or low results are
rejected. Production classification passes below; managed certification is pending.

Build `3289ab2b5d9e1d712699ff7f13a4e157f235363a` was pushed to the delivery
branch and main by non-forced fast-forward and deployed through the existing
webhook (`zdr0ux8y640nx9exb0x7z7sh`). HTTPS health/build-info confirmed this
commit. The actual production assessment records all five related tasks,
four qualified read-only scopes and one change, with a server/SQL computed
low result. Component verification passed 124 Node and 32 TypeScript tests,
including the opt-in native PostgreSQL case, without skips. Runtime decisions
are prepared; acceptance, credential rotation and managed release remain pending.

### Atomic procedure evidence at human Decision acceptance

A Decision can affect every related task even when its declared scope names
one task. A new pending Decision invalidates the group's earlier
`decision_supersede` procedure evidence. Human acceptance may now include
explicit `procedureEvidence` (verdict, current evidence reference, rationale,
validation and observed result). The server derives the complete current
impact, validates the exact preview, and records ordinary procedure admissions
for every affected task in the same Serializable transaction as acceptance.
Agents cannot supply this human evidence. Risk, independence, authority and
five-minute owner-authentication guards remain unchanged. Returned admission
errors roll back all earlier evidence through a savepoint; native acceptance
exceptions roll back the outer transaction. No assessment is copied or inferred.

The production rotation attempt was rejected before acceptance or delivery;
read-back confirmed the Decision remained proposed and the prior credential
generation remained unchanged. Its expired request and journal are retained
before preparing a new request. Nine focused tests, local validation and seven
native API tests pass without skips. The disposable PostgreSQL API test
proves stale-reference refusal, rollback of an explicit failed verdict, normal
acceptance and replay without duplicate evidence or events. The atomic
production acceptance and the managed certification remain pending.

Build `0735f3242f86e0327c5d11fc7b3c25376623f32d` was pushed by non-forced
fast-forward and deployed as `ecb88s7jgni39yl6apzhhttj`; HTTPS health and
build-info returned 200 with this exact commit. A controlled production
acceptance with an explicit failed procedure verdict returned
`risk_admission_required`. All five affected tasks retained exactly the same
native admission versions and evidence history, and the Decision remained
proposed. This proves atomic refusal in production; it does not prove a
successful rotation, model execution or release. Fresh owner authentication
is required before continuing those prepared operations.

The subsequent complete positive impact returned `task_ready_context_conflict`
under the ordinary 20-second transaction budget; native
read-back confirmed no acceptance or credential change. Read-only production
`EXPLAIN ANALYZE` measured approximately 246 ms for admission source,
2430 ms for dependencies and 5086 ms for one admission view. Internal compact
evidence now returns only its record identity, without a status or seal claim.
The unchanged final native acceptance guard performs the complete admission
check, avoiding duplicate probes. Explicit structurally valid acceptance with
procedure evidence has a fixed 90-second Serializable transaction budget;
other operations retain 20 seconds. Callers cannot choose these durations.
Conflict diagnostics contain only error code, SQLSTATE and elapsed/budget
times. Authority, evidence, independence, freshness and rollback rules are
unchanged. Every uncertain attempt is read back before any new request.
`GET /v1/decisions/:id/governance?version=1` returns the same current impact,
authority eligibility, preview and optimistic version without the display-only
gate probes or catalogs. Native API checks verify equivalence with the full
view. This keeps short HTTPS handoff and fresh-owner windows usable while
acceptance still validates every task in the complete native transaction.
Eleven focused tests, seven native API tests and the additional projection API
case pass; local validation and `codex:check` pass. Full positive production
impact and the governed release certificate remain pending.

The complete production acceptance also exceeded the scoped 90-second budget
(P2028 after 94608 ms); normal read-back found the same proposed Decision with
no acceptance. Read-only queries in one repeatable-read snapshot showed that
disabling PostgreSQL JIT reduced pending-version calculation from 2744.558 ms
to 647.795 ms with the same result digest. Rollback restored the original JIT
setting. Explicit complete-impact acceptance now uses `SET LOCAL jit = off`
inside its existing Serializable transaction. This changes query compilation
only; native dependency hashes, deferred proposals, freshness and acceptance
guards remain unchanged. Other transactions retain their prior settings.
Ten native API checks passed, including local JIT restoration after success
and rollback, unchanged high/critical gates, stale and concurrent refusals,
atomic evidence acceptance and replay. Validation and `codex:check` passed.
Build `fac409e5007bac35bf30e4c536f044bb8f7d9cc2` was pushed by non-forced
fast-forward. Existing GitHub/Coolify integration started deployment
`sx606sj625am7fpygtrekl74`; queue reconciliation prevented a duplicate manual
deployment. It finished with HTTPS health/build-info 200 at this exact commit.
The reconciled baseline-retention Decision
`db922cd2-cd36-40da-a9a6-92948d55c38f` then received normal acceptance
`46b49de8-94f1-4e60-ba27-f74eb19bb32a` for all five affected tasks in
23647 ms. This Decision grants no execution, credential or release capability.
Worker credential rotation, managed audits and the release certificate still
require their separate normal authority and runtime proof.

The normal HTTPS rotation subsequently completed: device ACK
`ab6f1a9f-3b26-4bb8-8ff9-5f8a7ccbe09f`, new active claim-only credential
`843ef939-c403-4158-ad24-75d9193ca167`, epoch 2, version 1. Protected Windows
storage was verified before ACK; the previous generation was replaced. All
five prepared task-specific runtime Decisions were accepted, and the auditor
passed normal Ready submission. Its first real Worker claim
`d9212577-1b1d-4ecf-8975-96e449e6b0e4` failed before model launch with
`hermes_attempt_budget_invalid`: the accepted selection requests zero API
retries, while the historical startup/budget validators require exactly two.
The terminal claimed checkpoint and absent original process were reconciled
through the existing writer-lock protocol; no lock was cleared by a manual
filesystem bypass. Configuration/Worker correction is required before a new
attempt. These receipts prove connection and safe pre-launch refusal, not a
completed audit or governed release.

The selected retry policy now binds the exact reviewed Hermes profile bytes,
startup receipt and attempt budget: integer settings 0, 1 and 2 are supported,
and mismatched physical configuration is refused. The default two-retry
profile remains byte-identical; historical receipts are accepted only for
that default digest. The installation was migrated to its approved zero-retry
profile while preserving owner attestation identity and expiry. Root integration
checks passed 259 tests with no skips, and `npm run validate` passed. This
corrects the pre-launch refusal; a new managed audit and the governed release
certificate are still required.

The next native auditor `2b43fcaa-be9a-4c00-834b-9acc4f70bae1` stopped before
model launch at `managed_admission_blocked/backend_evidence_persist`. Its
backend receipt passed schema, Ed25519 signature, installation/profile
identity, model policy and owner-attestation checks. At persistence, the
signed issuance time was approximately 148 ms ahead of the Windows clock;
Windows Time reported an unsynchronized local CMOS source. The strict reader
correctly refused a receipt that was not yet current. The stopped Worker,
actual terminal checkpoint and absent native processes were reconciled through
the writer-lock protocol. The expired, verified backend-only artifact was
archived with unchanged bytes under that execution; no native Decision,
dispatch reservation or model launch was created.

Authenticated exact first-write, backend and Decision receipts now wait at
most five monotonic seconds for their issuance time to become current locally.
Existing authority checks run at most 50 ms apart, and expiry, validity-window,
identity and strict reader guards remain in force. Far-future, expired, changed,
unsigned or interrupted receipts fail before publication. Reviewer credential
configuration also permits a distinct bounded Gate 3 protected-storage target,
preserving Gate 2's slot and its existing authority checks. These changes still
require a successful native continuation; they do not certify Gate 3.

Roost deployment `qdd1yzl8chksraqmbmo4lrnr` finished at commit
`4784c1e524e9c77432f2ccbaa0b29f6fe489395c`; HTTPS health and build identity
matched. Auditor `8409b8fb-2d6d-465d-972a-7231d5e9ebf4` then passed signed
managed admission but failed at launch consumption with no accepted result.
The old catch erased the boundary diagnostic, so its precise cause remains
unconfirmed. Cold preparation took 208.5 seconds against a 180-second local
startup seal, providing a concrete expiry hypothesis.

Launch consumption now reports only named boundaries and bounded protocol
codes. The original, nonrenewing startup seal has a 300-second absolute and
monotonic maximum, consistent with the signed native admission upper bound;
Ready, input, profile, executable, environment and current authority checks
remain mandatory. A closed fixture with real signatures, input, startup,
writer, lease and launch readers passes after 208.5 seconds of simulated
preparation; expiry, monotonic expiry and clock rollback remain denied.
This fixture does not invoke a model or prove a completed production audit.

The existing read-only spawn reconciliation also accepts terminal managed
admission failures for auditors, verifiers and code reviewers only after its
exact host/session/version/baseline/process and no-result guards. It records
the prior failure and preserves the failed outcome; coding attempts, changed
trees, accepted results and unknown errors are refused. Normal writer reclaim
requires that exact receipt and the original dead-owner proof. Root integration
passed 104 component checks without skips. Actual release certification,
controlled rollback and owned target cleanup remain pending.

The next auditor `a8e350dd-9f1a-4415-8090-27dfa6cd0b14` failed before
signing/model execution at `source_native_boundary/readonly_boundary_unproven`.
The exact inner cause was not retained by that version. Read-only observations
now preserve bounded repository/process/container change or observation failure
codes, including TCP/Docker timeout, without publishing paths or process rows.
Current Windows TCP and Docker observations were stable in two samples 30
seconds apart; this does not establish the historical failure's cause.

That failure retained the original application lease. Normal HTTPS terminal
reconciliation succeeded, and cleanup stopped while the retained lease lacked
a normal recovery path. The writer protocol now validates the receipt's exact
lease digest, physical single-file identity, nonce, execution/application and
original dead Writer binding under the recovery barrier. It recognizes an
already completed exact lease unlink before retrying the Writer unlink; foreign
or changed artifacts remain blocked. Actual recovery completed at
2026-10-01 21:27:47 UTC through this protocol, with no native process, accepted
result or baseline change. Root checks passed 39 admission and 13 native
Windows writer tests, without skips. The release certificate remains pending.

Roost deployment `cj1ftk9dnqmazis05jb5lvjv` finished at
`593df37ef5031e48603f05fa86aadc9a0887749a`; HTTPS health and build identity
both returned 200 and the exact commit. Native baseline auditor
`28c85e4a-01de-40d0-a5ed-86bebdb09eac` completed at
2026-10-01 21:39:29 UTC on baseline
`efac14d67f8f8398d133b20723c92c82046dbc33`. Its verified read-only evidence
digest is `ba035096a93a7cedad40c24efec3a8ee0956d64c9c6e9f579f3745fbb4ecc661`;
pre/post footprint matched, Git/listening TCP/running container state was
unchanged, native tools were empty, and the owned Windows Job exited zero,
closed and reported zero active processes. Retry intent was zero and the
attempt used the admitted low/two-turn profile; physical calls/token usage
remain unavailable. The model described the baseline and correctly retained
missing candidate, runtime test and final release evidence.

Independent verifier `f63c3c0d-4887-4cd7-8c85-ae9481b353a6` failed at the
claimed checkpoint before a model/result or application lease. Its boundary
error lost the inner reason; this does not invalidate the completed baseline
audit or establish a verified second canary. Normal terminal writer reclaim
completed at 21:43:53 UTC with the exact unchanged baseline footprint and no
pinned native runtime. A separately running desktop application was identified
as a different executable and was left untouched. The first-write Decision,
candidate, independent exact review and governed release remain pending.

Collection, tool qualification and read-only sealing now retain bounded named
boundary causes as well. Nested observation failures and changed snapshots
previously became a generic `unproven` error in these pre-launch stages.
Focused physical-repository fixtures cover that loss of diagnostics without
changing the admission checks, command allowlist, observation scope or timeouts.

Deployment `q13g5wmz4tyft98wek55uaef` finished at
`a97d97c8a72f61a26296de2260ca7848033647d9`, with exact HTTPS health/build
read-back. Verifier `b2c6fab4-a191-4b8f-9dcc-227831ca0870` passed signed
admission but lost its local lease before an accepted result. A later server
expiry is not proof that the Worker accepted that heartbeat locally. Earlier
pending renewal and synchronous preparation are possible causes; the exact
timing of that failure was not retained.

The existing expired read-only spawn reconciliation changed the execution to
`failed/agent_readonly_spawn_reconciled`. At 2026-10-01 22:00:29 UTC, normal
writer reclamation consumed the full current API receipt, checked the exact
read-only contract/Ready/baseline/session/version/no-result bindings and original
dead process, and verified local release. The signed pair was retired without
changing bytes (backend digest
`a0b28cbcd8e0b18a61ab9125ac6dd2477beb20094a7ab48078402c6882881a6b`).
The baseline was unchanged, with no accepted result or pinned native process.
Use the full reconcile response or execution read-back: the recovery catalog
projection does not contain this receipt's contract metadata.

Confirmed renewal now drains an earlier pending heartbeat, checks the original
deadline and obtains a new serialized RPC. The last managed launch boundary
requires that confirmation after context/Ready reads. The 180-second maximum,
five-second cleanup reserve, 45-second confirmation minimum and refusal to
revive expired authority remain unchanged. Bounded counters/durations aid
expiry diagnostics. These changes still require native continuation; they do
not establish a completed second canary or release certificate.

Verifier `1490c34f-12dc-4690-9794-d6fcf8190f57` passed signed admission and
failed before model launch at 2026-10-01 22:10:27 UTC with
`readonly_boundary_unproven/docker_observation_timeout`. No result or verification
was accepted. Docker observation now has a bounded 30-second deadline; missing
or changed observations still refuse admission. Normal terminal reconciliation
also recognizes this exact read-only error, preserving the existing contract,
identity, no-result and physical-process guards. The Worker was stopped with
its original artifacts retained pending deployed reconciliation.

Deployment `l443t4q61jx9g38graqtmrkq` finished at
`98df677642017ed124b487a9e8c7d6bd720acd07`; HTTPS health/build both returned
200 and the exact commit. At 22:21:04 UTC the failed verifier's normal API
receipt retired its exact retained application lease, original dead-owner Writer
and unchanged signed pair (backend digest
`50b2f9f04141f07c04199045d230e0190615885f53be52ee0e7d1ebd5e177c7c`).

Verifier `0a083873-e799-4e23-94a7-b1701badffa2` passed signed admission but
stopped before any accepted result. Its recorded `lease_expired` reason does
not prove actual heartbeat expiry: native cleanup uncertainty also set
`leaseLost` and was incorrectly classified as expiry. The exact earlier native
cause was not retained. Normal expired read-only reconciliation and writer/signed
artifact retirement completed at 22:31:41 UTC with unchanged baseline and no
pinned process. A bounded diagnostic event now distinguishes actual lease expiry
from process uncertainty without serializing exceptions or credentials.

The gated Windows launcher also imposed its three-second startup deadline on
the synchronous physical resume checks. Git/TCP/Docker checks can exceed that
deadline while the owned target remains suspended. Gated v2 now separates its
source-selected 60-second admission window from the unchanged three-second
creation/assignment and cleanup limits. Admission time is deducted from the
original native duration; neither this window nor a late acknowledgment extends
that budget or revives authority. Final managed verification remains required.

Root integration checks passed without skips: 30 lease/diagnostic tests,
71 budget/native-boundary tests and 30 actual Windows Job qualification tests.
The latter proved a 3.6-second admission, deduction from a short task budget,
rejection/cancellation without target execution and the native 60-second cap
while the controller event loop was blocked. These fixtures qualify the repair;
they do not establish the missing managed verifier or release certificate.

Deployment `hiczvfbtm1v2lx37fs2xex37` finished at
`fc4ce855ce5a9caf9c832b722db0a4cd72c25f09`, with HTTPS health/build 200 and
the exact source identity. Verifier `dcdef197-189c-48a0-ad22-14861f5e6d0d`
completed at 2026-10-01 22:47:25.520 UTC. Its native read-only verdict is
`verified`, binding auditor `28c85e4a-01de-40d0-a5ed-86bebdb09eac` and auditor
evidence digest
`ba035096a93a7cedad40c24efec3a8ee0956d64c9c6e9f579f3745fbb4ecc661`.
Verifier evidence digest is
`24e7c7861fa1bfa3d50ecb4291b71b78a662075542b7f4fb37b65a94cdfdc997`.
Both observed baseline `efac14d67f8f8398d133b20723c92c82046dbc33` on `main`
and the same six scoped files/tree. Each execution independently proves unchanged
Git, listening TCP and running-container state; global observation digests need
not match across separate sessions. No file changed, context was not invalidated,
and the verifier's genuine Windows Job exited 0, closed with zero active
processes and a three-millisecond cleanup. The managed attempt used low reasoning,
two turns and zero retries; wall time was 89,744 ms. Token/call/cost telemetry is
unavailable, not zero.

The normal first-write proposal `1e09be6a-234e-43f5-9c3d-3984b1800ad0`
pins both execution identities/digests and this baseline. It proposes only a
managed local `release.json` candidate change, fixed tests and local commit;
remote push, deployment and financial effects are excluded from this Decision.
Separate owner consent was received; normal acceptance
`ccfe16bf-6f3f-42ee-8703-7d8045e39097` is recorded. No further first-write
consent is required for this exact scope.
The candidate, independent exact review, governed release, fault/rollback and
owned cleanup/archive remain pending. Gate 4 has not started.

### Unsigned coding preparation recovery (2026-10-02)

Coding execution `0c036b33-a099-4862-8bbe-9000a95c91cc` stopped at
`spawn_intent`, before signed admission, a native runner or a candidate result.
The exact local expiry cause is unproven. Context transport measured 1.3 seconds;
fresh installation verification blocked the Worker event loop for 21 seconds.
Preparation now requires a newly confirmed lease before that verification and
preserves closed phase diagnostics. Original lease and task budgets remain binding.

`reconcile-coding-unsigned-spawn` terminalizes only an expired, unchanged,
first-attempt managed coding intent. A bound Worker must freshly observe the
dead fenced owner, clean exact task branch/baseline/Ready and absence of active
or archived signed admission, managed spent reservation, native review and
application lease under the recovery barrier. Progress, native activity, output,
review decisions and provider tickets refuse this path. Exact replay returns
the receipt; it grants neither launch nor resume authority. Normal Writer
reclamation matches the complete receipt and rechecks physical artifact absence
under its exclusive barrier. No generic coding spawn intent is reclaimed.

Integration checks include 20 actual Windows Writer tests, 31 lease/diagnostic
tests and 57 credential tests, with no skips. A nonce-owned PostgreSQL/HTTP run
passed both terminalization tests and its adverse authority/result matrix,
restoring user triggers and removing its owned database after marker verification.
These checks qualify recovery code, not the missing release certificate.

Deployment `k11wmvhli03t7yufwmkhgb0k` finished at
`540c29ad52043586d84ec2100774d40e42ac8c73`; health/build returned 200 with
that exact identity. At 23:38:49 UTC the normal unsigned-coding API reconciled
the stopped execution. At 23:38:55 UTC normal Writer reclamation rechecked the
receipt and physical absence, then released the exact dead owner's lock.
The empty task branch created by that Worker was compensated to the unchanged
baseline; no model result or application change was accepted. Execution
`eac347c7-5998-4b06-b9d6-159cd298db5a` was queued with the same Ready pin and
accepted first-write Decision. Its completed result is recorded below.

Release resource projections now retain registered resource identity and
creation time. The dedicated release Worker needs both to match its image
ownership ledger before cleanup; dropping them incorrectly blocked any ledger
containing images. A focused test binds an actual owned fixture ledger to this
projection and rejects a foreign release without transport effects.

### Native certification candidate (2026-10-02)

Execution `eac347c7-5998-4b06-b9d6-159cd298db5a` completed at
23:48:22 UTC with clean local commit `de6ebe7a4267078196534a36f73ff9bccb09d3ae`,
tree `467fcad81f5676c80ffbf37d2f30a6ef4ba85827`. Worker/Hermes changed only
`release.json` to version 2.0.0 with delayed failure after 30 seconds. The fixed
three native tests passed. Signed admission, installation verification and
`verified_candidate` native review passed; the Windows Job closed with root exit
0, no active processes and verified cleanup. Roost retained the exact result.
Independent managed review and release certification remain pending.

The coding procedures now also publish a separate `review_decision` contract,
with the verifier role and repository-read authority only. The exact selection,
full five-task risk assessment and admission evidence precede the independent
review grant. This configuration grants no source write, push or deployment.

Image cleanup accepts an immutable Docker digest alias only when it equals the
recorded repository and digest. Foreign or changed aliases remain refused.
The root rerun passed all 39 focused image-cleanup tests with no skips. These
are component checks, not live cleanup certification.

### Completed candidate basis revalidation

Own automated task receipts are execution outputs; they remain visible in
evidence views but do not alter accepted task inputs. Application execution
context loads project membership without unused sibling task collections.
Human task evidence, required records and explicit dependencies remain watched.

An unchanged completed native coding result can be bound to a fresh
owner-accepted Ready through `GET /executions/:id/result-basis` and
`POST /executions/:id/actions/revalidate-result-basis` under `/v1/agent-runtime`.
The command requires exact versions, commit, original contract, context
references, prompt and baseline, signed native/test evidence, and current risk,
admission, procedure, finding, interview and suspension checks. The append-only
mapping changes review material and requires a new independent review. It does
not rewrite the original native result or Ready pin, revive invalidated work,
accept existing reviews, or authorize release. Source drift invalidates the
mapping and subsequent review/release admission.

Root verification passed 30 component tests and 14 actual PostgreSQL/HTTP tests
with zero skips. The latter applied the forward migration in a nonce-owned
database, exercised owner/version restrictions, exact replay, immutable native
evidence, source drift, output/input watches and ordinary Ready fences, then
removed the owned database and role. The managed release certificate remains
pending. Roost deployment `yzuxho42q6ffu4lmgehyce2m`
finished at `08f8685ef94b71c3c3ad4c4c08d7a3e313bc28ff`; both health/build
endpoints returned 200 with that exact commit.

Deployment `f10u5x4m99b2cwz2jd6d66m0` finished at
`654b42c1ccea24738382d80c989d8e562ee74b31`, with exact health/build 200.
Normal owner commands refreshed the complete five-task assessment, procedure
evidence and three Ready contracts, then recorded revalidation
`f7122ebd-4bbc-44e7-a519-3614d95275ec` for the unchanged native candidate.
Its review material is
`1bb8a5668e1b9b2b2d9252f51af0345ee48acdb456526b733a0e60af63170a89`.
The original native pin/result remains intact; fresh independent review is still
required. The earlier reviewer failed before model launch because its unused
grant was invalidated by a sibling claim. Normal stopped-Worker reclamation
proved process/lease absence and unchanged source before releasing its Writer.

Worker review contracts retain the immutable original native material reference.
Only a current server basis mapping and active grant permit that reference; the
sealed model input contains the full new mapping, while the native audit,
decision and API read-back bind the new material. This avoids changing the
shared risk basis merely to reference its own digest. Root reruns passed 103
Worker/input/review tests, including actual Git collection and an owned Windows
Job, and 14 PostgreSQL/HTTP tests proving the server current-basis flag and
source-drift refusal. All had zero skips. Actual managed review remains pending.

Deployment `eeb1l0imzh9bftsyhok81tqu` finished at
`4b00ec65ba44105b47832a40783200872fdf0a0a`; health/build returned 200 with that
exact commit. Managed reviewer execution
`5c9dfe9b-664e-4c0e-90e9-cc89f7fe6415` completed at 00:35:49 UTC and independently
approved the unchanged candidate in decision
`d9678774-e140-417b-95a2-534a9f05a624`. Its native read-only audit verified equal
pre/post footprints, and its Windows Job closed with zero active processes.
That approval is historical: legacy risk watches prepared before the output/input
fix counted the reviewer's own completion receipt, changing its source revision
and invalidating the joint Ready basis. Normal owner scope commands refreshed all
five watches with identical inputs; a new assessment and Ready precede another
independent review. No release effect used the stale approval.

The additive stale-review migration preserves decisions and native results.
Reviews are unique per execution and exact material. A fresh accepted basis can
replace a stale approval only through a new append-only owner mapping and new
independent review. Current approvals and every rejection remain protected;
rejection requires the existing governed correction path. Capability and handoff
lookups select current material while retaining the historical ledger.

Root verification passed 49 focused component tests and 14 actual PostgreSQL/HTTP
tests with zero skips, plus lint, typecheck, server build and `codex:check`.
The isolated database applied the forward migration and proved stale-approval
remapping, no inherited decision, fresh agent grant/review, protected current
approval and rejection, immutable history and drift refusal; its database and
role were removed. Live release certification remains pending.

Deployment `rsqk3zphd3jp4t23m7mt69jb` finished at
`4dd973bc125b55aa87840a14756936d4a5203c65`; health/build returned 200 with that
commit. Normal basis mapping `ec285162-492b-4edb-929b-a9005f017ca6` bound the
unchanged native candidate to material
`f81ddbbb2b5e97aa0c7b66860c2e7c625fc5564da65698d2ed3bf86e703163be`.
Managed reviewer `ba77e3c6-2da2-4f26-a917-0148e5d4b30e` completed at 00:59:39 UTC;
decision `154d5cc2-904b-4413-9947-4820ee413648` approves the exact candidate.
The separate release-readiness audit `26e15d8d-69c5-4012-a7a8-1db5bb688fe6`
completed at 01:05:29 UTC. Both native read-only audits verified unchanged source,
root exit 0 and closed Windows Jobs with no active descendants. The release
grant and external certification path remain unproven.

Root checks passed 11 focused broker/native-process/Writer-recovery tests with
zero skips, including controller crash after nine genuinely closed children,
forged receipt/key/journal rejection and reconciliation without repeating the
effect. `codex:check` and `git diff --check` passed. The native candidate image
was built from the unchanged, independently approved commit; publication and
release certification remain separate pending effects.

Roost deployment `ztcvxzi0bnei29wzb8he1j46` finished at
`d16e130331ef3fd1107659ccab044ace27f7e049`; both health/build endpoints returned
200 with that commit. The candidate image was published and pulled on the VPS
by immutable digest
`sha256:1de99c544bbf0ae67626a8a9d4289760bdd496163d82cf1137e63e4eb1ce0379`,
without starting a candidate container. Full OCI provenance and actual inventories
cover nine registry versions, four local images and two VPS images. Together with
the owned test application, sixteen resources are recorded for scoped cleanup.
The prepared release manifest binds current independent acceptance, separate
native releaser audit, unchanged healthy baseline and verified backup/restore.
Fresh owner login is still required before its normal release-grant command;
candidate Git push/PR/merge/deployment, fault recovery and cleanup remain unproven.

Normal production admission refused a changed commit with
`409 release_review_stale`; a subsequent read proved no release was created for
that request. Fresh owner admission created release
`21585a17-79ca-4623-aa63-4018f1d03965` for the accepted candidate, review and
separate audit. Expired temporary credentials were renewed normally after the
overnight pause. Engine-scoped ownership checks passed 65 focused cleanup/resource
tests with zero skips. External release effects remain pending.

Native release preflight exposed a Git for Windows incompatibility: Node's
`\\.\nul` device path is rejected as Git's global configuration file. Fixed
adapters now use `NUL` on Windows and the native null device elsewhere. Eight
focused Git/process tests passed with no skips, including six real owned Git
Jobs checking a clean repository, exact branch/commit/tree, parent and origin.
Preflight failure preserved a sealed Writer and genuine closed-child receipt;
its server journal remained empty. Only fixed native error classifications are
retained; stderr paths, URLs and credential values are discarded.

The next native preflight closed twelve owned children before refusing SSH.
Windows OpenSSH exited 255 without `ProgramData` in its minimal environment;
the same read-only connection passed with that system variable alone. The
environment now includes it, and a real owned `ssh -G` test checks configuration
resolution without making a network connection. Release effects remain pending.
Worker refusal diagnostics now retain only an explicit list of admission codes;
all other exception content becomes `release_preflight_unproven`.

### Native release Git path (2026-10-02, certification still incomplete)

Release `21585a17-79ca-4623-aa63-4018f1d03965` recorded push
`72743f91-f6ee-4b18-8e0a-59a4e1dea6db`, PR
`c3c8b736-0279-4bc7-b6f1-7d200379f1bc` and independent acceptance publication
`f8dd4065-3664-4212-b578-30734e90742e`, all succeeded for the accepted commit.
Merge `59982201-def8-4fd0-9769-a1eea3baa3e8` had an uncertain outcome.
Read-only GitHub reconciliation confirmed PR 1 merged at the exact candidate,
with matching main and tree, before any retry. The actual dead controller's
sealed Writer qualified through HMAC, the exact grant/journal and eleven closed
native children (seven compacted into its signed history). Normal restart
persisted `reconciled/succeeded` at 10:28:59 UTC without repeating merge. Deployment,
controlled regression/rollback and final cleanup remain unproven.

### Same-grant owner renewal

`POST /v1/agent-runtime/releases/:id/actions/renew` accepts only a request UUID,
current expected version and new expiry. The original issuer must still be an
owner with a login younger than five minutes. Current credential, exact review,
signed candidate, separate release audit, configuration, readiness and suspension
checks run again. An additive immutable renewal row extends admission by at most
one hour, bounded by credential expiry and the original backup's 24-hour age.
The response's `effectiveExpiresAt` controls admission; original snapshot,
manifest, grant digest and operation journal remain unchanged. Renewal cannot
resolve pending operations, revive revoked authority or reopen completed cleanup.
The Worker reconciles any pending operation before using renewed authority.

Root verification passed 23 focused authority/readiness tests, ten broker and
fixed-diagnostic tests, typecheck, server build, lint, route inventory and
`codex:check`. A fresh disposable PostgreSQL migration and two real HTTP tests
passed without skips, including stale-login, immutable-input and direct-SQL
denial. Normal fresh-owner renewal `a055b067-5c6e-43d7-a901-b9fda57aa4c4`
extended this same grant to 11:24:30 UTC on 2026-10-02; authoritative read-back
confirmed unchanged snapshot and journal prefix. Build
`d33da1dbc4eba60c941ace8ba53d5e5ef1470034` deployed as
`me6zv8noedzrq5v2xj6n7hy5`, with exact HTTPS health/build confirmation.

Before configuration or deployment, inspect the actual immutable artifacts
again. The overnight pause left the candidate image absent on the VPS; its
removal cause was not established. Three configuration attempts were preserved
as uncertain and reconciled as absent before another attempt. Restoring only
the same proven immutable image, source labels and creation identity repaired
this prerequisite without starting a container or changing the manifest.
The following Worker configuration operation succeeded. Shared cleanup jobs
were not modified. Fixed transport diagnostics retain only classified reasons
and numeric HTTP status, never response bodies, headers or arbitrary errors.
