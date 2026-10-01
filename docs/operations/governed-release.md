# Governed release operation and evidence

This is the component contract for Gate 3. The active delivery state and scope
remain in [implementation](../implementation.md). Gate 3 is **in progress**.
Provisioning, unit checks and harmless native fixtures do not certify release.

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

The resource ownership file uses `roost-release-resource-ownership-v1`: exact
grant/request/application IDs, Coolify UUID and numeric ID, immutable image
repository/digests, manifest digest, canonical clone physical identity, marker
digest, temporary resource IDs/kinds/creation times and capacity thresholds.
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
the **same** approved SHA. This behavior still needs the real certification test;
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
reuse. This repair has native crash/restart evidence; external release certification
remains pending.

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
prune or package-wide delete. The owner registry token needs `read:packages`,
`write:packages` and `delete:packages` for these owned test versions.

## Evidence checkpoint — 2026-10-01

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
  both owned test databases absent. Production backup/off-device setup is pending.
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
- Adjacent native managed-admission, failed-review, B19 reconciliation and Writer
  checks: 37/37 passed without skips. Agent-principal checks: 2/2 passed.
  `npm run codex:check` passed, including all 225 requirements mapped once.
- The owner-designated private repository, canonical clone and one Coolify app
  were created after absence checks. Baseline commits
  `6f3b070b610a5eb3ebbfd91aa23e534bc9d5524c` and
  `1353fc309df99fe679c8ac155f9ae2ec177053e1` were pushed solely to initialize the
  disposable target. No application deployment or managed release yet.
- Actual independent candidate acceptance, broker PR/merge/deploy, HTTPS/version,
  observation, controlled regression/rollback and final cleanup/archive remain
  unproven. Gate 3 is not accepted. Private installation receipts contain target
  UUID, URL and ownership details; no real deployment settings are distributed.

Run `npm run test:agent-host-release`, scoped API/migration checks, the Windows
managed recovery fixture, `npm run validate`, `npm run codex:check` and the real
certification path before claiming completion. Resume only Gate 3. The next safe
step is validating the owner's private prerequisites, obtaining a fresh owner
session for configuration, and preserving exact identities during installation.
