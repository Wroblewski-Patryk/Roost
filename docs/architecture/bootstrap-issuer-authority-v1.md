# Canonical bootstrap issuer public authority v1

Owner amendment v40, 2026-09-23. **DONE bounded native qualification: 16/16
scenarios (17/17 runner results), no skips; 229/229 selected source results,
server build and lint PASS.** All 80 unchanged migrations applied in one owned
disposable PostgreSQL database. This is not a production migration or activation.
Overall bootstrap admission / RF-HOST-035 remains **PARTIAL**, production **BLOCKED**.

## Canonical identity and writer inventory

`trusted_provider_ticket_keys` remains the sole key anchor. Its workspace is the
issuer identity (`issuerId=workspaceId`), and its existing installation ID is
immutable. Purpose is exactly `worker-bootstrap-owner-ticket-v1`. No independent
issuer/key registry is introduced. `bootstrap_issuer_history` and its automatic
audit journal are append-only children of that anchor; full validated replay is
the state, not a second independently editable head/cache.

| Existing source/writer | Contract and boundary |
| --- | --- |
| `owner-ticket-store.ts` `rotate` | Existing primary-owner transaction already takes `ready_source_fence`; updates key ID/digest and increments epoch. Existing SQL guard revokes issued task-owner tickets atomically. This behavior remains for legacy rows; a managed row requires the new audited stage transition instead of direct rotation. |
| Direct Prisma/SQL create/update | Found in source test fixtures and `owner-ticket-persistence.test.mjs`; no existing production key-creation endpoint or seeding was found. Native `bootstrap_issuer_key_fence` covers every insert/update/delete, including legacy writers. It does not adopt legacy rows. |
| Existing installation anchor guard | Preserves installation and transaction birth. Same-binding key rotation currently returns before its fence; the additional issuer guard closes that specific gap. |
| Existing key update/delete and truncate guards | Preserve monotonic epoch+1, different key ID/digest and immutable anchor/history. They are retained and included in required source fingerprints; no historical function is replaced. |
| Issuer adapter, not composed into routes | `create`, `adopt`, `stage`, `cutover`, `revoke`, `retire`, each reserved to the current primary owner and exact accepted, unsuperseded decision. No routes/default composition. |
| Journal/audit writers | Append guard takes the same fence, checks exact public shape and canonical owner/decision. Stage updates the existing key anchor from the journal trigger; all changes and automatic audit share the transaction. Update/delete/truncate of history/audit deny. |

Other canonical sources remain `workspaces`, owner memberships, accepted decision
revisions/acceptances and `ready_source_fence`. Existing ordinary credential and
transport readers keep their conservative current-head matching; bootstrap overlap
does not grant them older-key admission. Existing task-owner ticket revocation is
preserved, and is **not** resolution of bootstrap-ticket revocation authority.

## Public format and lifecycle

[The strict contract](../../src/modules/api-keys/bootstrap-issuer-contract.ts)
admits only Ed25519 public SPKI DER, encoded as canonical base64: 44 bytes with
the Ed25519 AlgorithmIdentifier and a 32-byte public point. SHA-256 covers those
exact DER bytes, matching the existing owner-ticket digest convention. Key ID,
algorithm, format, public material and digest are validated together. Workspace,
issuer, installation and purpose remain immutable across the entire journal.

No signer/private-key/seed/credential interface exists. Unknown fields, alternate
encodings, mismatched digests and private-key-shaped inputs are rejected before
write. The native append guard also constrains every persisted record
and nested material to the public-only shape. Tests contain only three public
Ed25519 points, and trap signing/private-key/keypair generation, network/DNS and
child-process effects. Logs remain empty. Public material is never inferred from
a digest; missing schema/history/material stays blocked.

`create` inserts an absent canonical anchor with epoch 1 in the same transaction;
its native birth marker must be current. `adopt` requires matching existing key
ID/epoch/digest, supplied public material and explicit current-owner adoption
evidence digest. Adoption preserves the existing epoch as high-water and is
prospective: issue times before adoption are denied. It does not reconstruct
unknown pre-adoption history or prove that historical unseen keys were never used.

`stage` reserves exactly high-water+1 and a never-used recorded key ID and public
digest. The existing anchor tracks the newest **reserved** generation, even if a
staged generation is later revoked; epochs are never reclaimed. A stage pins an
activation time and cutover time with overlap greater than zero and at most five
minutes. The prior active key's validity can only shorten, never extend. Cancelling
a staged key does not silently extend the predecessor's deadline.

During the overlap, both the active predecessor and staged successor can be
selected for their exact binding, provided the ticket was issued no earlier than
that generation's activation and no later than the current ceremony. At cutover,
the old key is rejected even for earlier tickets. The successor is also blocked
after the deadline until an explicit owner-authorized `cutover` activates it and
retires the predecessor. No timer or read silently changes state. `revoke` is
terminal for a generation; `retire` ends an expired active/staged generation.
Neither terminal state can return to active. A new generation may be staged after
revocation, but high-water, key ID and digest replay/ABA guards still apply.

## Fence, reads and acknowledgement

[The source adapter](../../src/modules/api-keys/bootstrap-issuer-store.ts) uses
Serializable writes and exactly one fresh Repeatable Read/SQL READ ONLY check of
the immutable committed operation, history/audit digest and canonical head. An
uncertain COMMIT or failed confirmation returns non-retryable
`reconciliation_required`; no callback/write is retried. This command has a
dedicated atomic audit and emits no additional Event.

All eight required triggers are checked against the committed
[guard manifest](../../src/modules/api-keys/bootstrap-issuer-guards.ts): table,
function, event mask, enabled origin mode, absence of predicates/column filters,
deferral and internal-trigger changes, and SHA-256 of each LF-normalized function
body. Function language, return type, volatility, security mode and configuration
are also checked. Missing/disabled/rebound/modified guards, replica mode or absent
shared fence deny. A catalog name alone is insufficient. A privileged replacement
of trusted database/catalog/runtime infrastructure remains outside this proof.

History requires contiguous revisions, unique operation/decision IDs, increasing
audit fence revisions, matching native record digests, immutable binding and full
state-machine replay. The SQL guard handles writer admission, public
shape, identity/CAS and audit; the independent typed replay is mandatory before
any public-key selection. Neither direct SQL rows nor a digest alone are authority.
Native syntax, trigger ordering, isolation and compatibility now pass the bounded
qualification below. Privileged infrastructure and production composition remain
outside that proof; mocked guard rows are not production evidence.

Status/inspect perform only read transactions, with no repair, seeding, last-use
or expiry writes. The bootstrap store passes the selected ticket's exact issuedAt
to the canonical source. Diagnostic inspection of an existing ticket reads its
stored issue time; a supplied diagnostic time cannot override it. Selection is
checked again against ceremony time, not just historical issue-time validity.

For complete audited state, BootstrapAuthoritySource conditionally removes only
`issuer_public_key_unavailable` and `issuer_writer_fence_unproven`. Combined with
qualified host/installation facts, it still blocks on exactly:

- `bootstrap_channel_authority_unavailable`
- `bootstrap_ticket_revocation_unavailable`
- `signed_current_decision_unavailable`

The factory still refuses a usable bootstrap context; no real signature, ticket,
credential or delivery is created. `implementationReady`, `executionSupported`,
`pilotReady`, `liveAdmissionAllowed`, `pilotExecutionAuthorized` and
`pilotExecutionStarted` remain false, as do `transportQualified` and
`launchAuthority`. The native atom used only the selected existing PostgreSQL
container, one owned disposable database and an ephemeral loopback database relay.
No HTTPS/DNS, real issuance, credential delivery, provisioning, endpoint/default
composition, target/model/profile or activation was introduced. Retained roots and
the excluded historical sandbox folder were not inspected or modified.

## Native qualification and limits

[`bootstrap-issuer-native.test.ts`](../../src/tests/bootstrap-issuer-native.test.ts)
is selected by `scripts/qualify-worker-identity-commit.py --suite issuer --scenario full`.
The runner requires an explicitly selected existing PostgreSQL container and user;
it blocks private dotenv reads and creates no external helper files. Synthetic
owner/decision prehistory uses transaction-local replica mode only for fixture
setup. All issuer, key-anchor, rotation and ticket-journal operations under test
use real origin-mode PostgreSQL/Prisma transactions. Boundary times use an injected
clock; no private signing material or usable credentials are generated.

| Native evidence | Result |
| --- | --- |
| Full migration chain | 80/80 applied without SQL edits; prior 79 and migration 80 remain byte-unchanged. |
| Public shape and owner admission | Direct SQL rejects noncanonical SPKI/base64, digest/algorithm/private-field changes, wrong/ambiguous owner, expiry and binding mismatch. Legacy rows remain blocked until explicit prospective adoption. |
| Lifecycle and monotonicity | Create/adopt/stage/cutover/revoke/retire, issue-time and overlap boundaries, terminal states, stale epochs, ABA/reused keys and operation/decision replay pass. Twenty concurrent stage writers produce exactly one winner. |
| Existing rotation compatibility | Real `owner-ticket-store.rotate` increments epoch/fence, revokes an unsigned synthetic task-ticket row, appends its native revoked journal and emits the existing Event. Managed direct rotation is rejected with complete rollback; staging uses the audited issuer path. This does not prove bootstrap-ticket revocation authority. |
| Fence and guard integrity | Direct anchor creation waits on the held shared fence. Managed direct updates/deletes and immutable history/audit edits deny. All eight guards deny inspection when missing, disabled, rebound, body-changed or configured differently; replica and missing audit deny. |
| Atomicity | Failures at fence, anchor creation, history append, automatic audit and pre-COMMIT restore heads, history, audit, ticket journals, Events and fence. Deferred/late COMMIT failures roll back and report `reconciliation_required`. |
| Lost acknowledgement | Real pre-COMMIT connection termination rolls back; one deliberate cut after the backend COMMIT completion leaves exactly one committed operation and audit. Both report non-retryable `reconciliation_required`, with one write callback/append and no replay. |
| Read purity and projection | READ ONLY inspection changes no state/fence and does not repair absent audit. Qualified host/installation plus issuer clears exactly two issuer gaps, leaving exactly the three blockers listed above. Public persisted records/audit validate; signing, external network/DNS/process traps and logs remain empty. |

The independent raw Prisma 5.22 probe reproduces the known deferred-COMMIT false
acknowledgement (transaction promise resolves while PostgreSQL commits zero rows).
The issuer's fresh post-COMMIT readback detects this; a callback return is not
success evidence. The fault relay observed exactly one arm and one actual
post-COMMIT response cut.

Cleanup **PASS**: the uniquely marked database was rechecked by name/OID/owner
and marker, had zero sessions, was dropped and confirmed absent. The ephemeral
relay exited with its listener closed and no helper files. Before/after fingerprints
match across three existing databases and 214 tables/sequences, including schema
and roles. The selected PostgreSQL returned to its original stopped state; backend,
other containers, mounts, images, volumes and networks were unchanged.

Migration chain SHA-256 (80 files):
`529efe0cb272dc64ecb092ee50f31466c02a44d3dccb729be127d8ac872cb20c`.
Preserved preexisting-database fingerprint SHA-256:
`e9e019524b6010b02b30b4635fff99133c4429ffac3f537b05ac860485a281f1`.

The successor [v41 channel inventory/proposal](bootstrap-channel-authority-v1.md)
is complete as a source-only model; canonical channel authority remains blocked
by representation and writer-fence gaps. Its single proposed successor is recorded
there. No bootstrap admission or activation follows from the native issuer result.
