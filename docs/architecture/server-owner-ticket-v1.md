# Server-issued owner ticket and public verification contract v1

## Database qualification: owner amendment v19

2026-09-23: **DONE for this database qualification atom**; production remains
unqualified. **15/15 Node integration results (14 scenarios plus their parent)**
and **54/54 existing service/HTTP/adapter/provider regressions** pass.
The complete **73-migration forward SQL chain** applied to one empty, uniquely
owned disposable database inside the already existing local PostgreSQL container.
No applied migration was edited and no new migration was required. This is a
fresh-database forward-chain test, not a production upgrade or deployment.

The [native HTTP qualification](../../src/tests/owner-ticket-api.ts) uses real
JWT/membership authentication, governed owner decision acceptance, risk evidence,
procedure composition, Ready submission and the real Prisma Serializable store.
All database guards remain enabled. The claimed execution is an inert test row;
no Worker, provider or model runs. Only the signer and physical host evidence are
injected synthetic dependencies; existing fixture provider admission is synthetic.
Loopback HTTP does not qualify production HTTPS or Worker transport.

Qualification exposed one runtime defect: accepted decision authority was read
through raw SQL on the deliberately restricted Ready source-watching client.
Ready/risk now obtain the existing typed decision-authority projection through
the original transaction and pass it into the context loader. Generic raw SQL
remains forbidden on the watched client. Task effects/decisions stay watched;
immutable acceptance history and native authority-epoch invalidation remain
authoritative. No permission, provider or activation gate was relaxed.

The database test checks one successful commit and nineteen deterministic replay
denials from twenty concurrent HTTP consumes, with exactly one consume Event,
one terminal ticket transition and its journal entry. Injected failures after
actual issue insertion/audit and consume transition/attempt/audit operations
roll back all their writes. Coverage includes missing/stale decisions, primary
owner and API-key boundaries, bad bindings, synthetic host-evidence drift,
not-before, expiry, native source invalidation, accepted decision supersession,
revocation, rotation and immutable history. Restored request/execution JSON
cannot consume or reissue a spent attempt. The response is not a launch receipt.

Cleanup and preservation **PASS**: the unique database name, catalog OID, owner
and ownership comment matched before drop; it had no active sessions. Its absence
was verified. Logical row/sequence and structural fingerprints for all three
pre-existing connectable databases (214 table/sequence entries), database catalog
and nonsensitive role metadata matched before/after. Existing container identities,
images, volumes and networks matched. The authorized database container returned
to exited; the unrelated running services and exited backend retained their
original states. The owned loopback relay stopped after its children had exited.
No retained temporary root was accessed or changed; unrelated dirty documents
and the unread design artifact were preserved.

Server TypeScript build, route-capability lint and both existing direct-Codex
documentation validators passed. All 73 migration source checksums matched the
pre-run inventory. The full API suite (which includes Worker execution), web
build, production migrations and production transport were not run in this atom.

The test requires an externally prepared owned database named
`companycore_test_owner_ticket_<32 lowercase hex>` and a matching database comment
`owner-ticket-qualification:<same suffix>`. Set `OWNER_TICKET_TEST_DATABASE` to
that name and `DATABASE_URL` to its loopback connection, disable private dotenv,
then run the server build and only the Node test named
`owner ticket native PostgreSQL HTTP qualification` in `dist/tests/api.test.js`.
The guard checks the exact database/comment and skips destructive test resets;
repeated runs create independent fixtures without deleting terminal history.
Database/container provisioning and identity-checked cleanup belong to the
authorized external test harness. The older standalone persistence script was
not run because it would create a second database and bypass historical guards.

Production signer provisioning, authoritative physical evidence reconstruction,
Worker credential/host binding, HTTPS/bootstrap/status refresh and launch
integration remain unqualified. Default endpoints still fail closed and all six
readiness/activation flags remain false. No real keys, provider launch,
transport qualification, push, deployment or activation occurred.

**Exactly one proposed next atom:** specify and synthetically qualify the
authenticated Worker consume/status contract, binding its existing credential
to the assigned host/claim and the original consume ID. Keep owner-only issuance,
no renewable launch authority and fail-closed status refresh. No real keys,
network qualification, provider execution or activation. Stop after that atom.

## Historical implementation: owner amendment v18

2026-09-23: **PARTIAL**. Source services, HTTP handlers, Prisma adapter and
additive persistence migration are implemented. Synthetic service/HTTP tests
pass; PostgreSQL migration/concurrency qualification is **BLOCKED** because the
local Docker Engine is unavailable. It was not started or repaired. Production
composition, host evidence, transport and launch admission remain unavailable.

The existing agent-runtime router exposes POST `/owner-tickets/issue`,
`/owner-tickets/consume`, `/owner-tickets/revoke` and `/owner-tickets/rotate`
under `/v1/agent-runtime`. Its default composition supplies **no service/signer**:
authenticated human owners get `503 owner_ticket_unavailable`; API keys, agents,
Workers and other human roles get `403 owner_ticket_forbidden`. No environment
switch, key generation, disk key read or request-provided dependency can enable
these handlers. Tests inject the service and ephemeral in-memory signer directly.
Even consume is owner-only in this slice. A Worker credential-to-host binding is
not qualified; the target Worker consumption channel below is still future work.

[Service](../../src/modules/agent-runtime/owner-ticket.ts),
[HTTP boundary](../../src/modules/agent-runtime/owner-ticket-http.ts) and
[Prisma adapter](../../src/modules/agent-runtime/owner-ticket-store.ts) remain
inside existing runtime/auth/decision/task components. No new queue, issuer
process or PKI is introduced. The adapter checks fresh membership and primary
ownership, current accepted governed decision/revision and exact task scope,
accepted-by-primary-owner provenance, supersession, live claim/host/attempt,
Ready, risk, procedure, review and source revision gates. It requires an
independent server-injected host-evidence adapter for physical Writer, sealed
input, runtime/profile/Job evidence and challenge. That adapter is **absent**;
task metadata, request JSON or a `signatureValidated` boolean cannot replace it.
The claim digest preserves the existing fixed-program authority digest bytes;
the additional context digest binds host/checkpoint, Ready and complete contract.

Issue is a separate explicit owner confirmation of the exact acceptance and
current-context digests, linked to the current governed decision. It cannot infer
approval from a generic older decision. The immutable ticket row records this
exact confirmation and actor; no full acceptance body or private material is
stored. Only managed Hermes and the existing closed fixed-fixture class qualify
synthetically. Existing model/backend, scope, risk, budgets and release gates
remain mandatory. Ticket TTL is bounded by 60 seconds, acceptance expiry and the
original fixture deadline. The signer result is cryptographically checked before
any row is committed. Missing signer/evidence, drift and uncertainty fail closed.

### Persistence and transaction boundary

[Migration](../../prisma/migrations/20260923090000_trusted_provider_owner_tickets/migration.sql)
adds `trusted_provider_ticket_keys`, `trusted_provider_tickets` and an append-only
`trusted_provider_ticket_journal`. The key head contains only installation ID,
key ID/epoch and public-key digest. Tickets contain public IDs/digests, owner,
task/execution/attempt/decision/revision, challenge/claim binding, bounded times,
state, CAS version and consume/revoke timestamps. No private key, lease token,
raw signature, complete acceptance, secret or diagnostic log is persisted.

Unique execution ID (stricter than per-attempt), decision/revision, ticket ID,
digest and nonce digest prevent reissue under another ticket or nonce. Terminal
rows cannot be reset/deleted; immutable binding fields cannot be edited. The
journal is appended by a database trigger in the head transition transaction.
The service also writes a minimal existing Event record. Prisma uses the existing
Ready source fence and Serializable transactions, row lock plus `state=issued`
and version CAS. Concurrent/unique conflicts deny deterministically as replay;
there is no automatic transaction retry. Audit, transition and attempt spending
commit together, and an acknowledgement is returned only after commit.

Consume rechecks signature/digest, owner, key/epoch, current decision/context,
claim/challenge, task/attempt, not-before/expiry and state. Its signed ack expires
within five seconds and before ticket expiry. It is **not a launch receipt or
task success**. The attempt receives a nonretryable reconciliation marker;
existing recovery/retry commands explicitly refuse ticket-bound executions even
if older execution JSON is restored. A lost reply after commit remains spent.
Rollback before commit restores both state and journal, but the server does not
automatically retry the operation. No provider process is created by either call.

Owner revocation tombstones the unused ticket and its decision/revision binding;
that same decision cannot issue another ticket. Native decision supersession is
rechecked on consume. Public key rotation increments the epoch exactly once and
revokes all unused old tickets in the same transaction, preserving terminal rows.
Initial key-head insertion has no runtime route or seed in this atom. The SQL
review found only new tables/functions/triggers, no edits to applied migrations,
destructive DDL, data reset or recurring seed. It has **not been applied** here.
These guards do not defend a malicious database superuser or a full database
snapshot rollback; neither can be claimed solved by an in-database journal.

### Evidence and remaining blockers

50 new service/HTTP/adapter tests plus four existing provider-admission tests pass.
Twenty concurrent synthetic consume calls yield exactly one commit and nineteen
replay denials. Tests cover owner-only authority, missing/bad signer, current
decision/Ready/Writer/input/claim/backend/model/reasoning/scope/risk/budget/release
drift, expiry, not-before, revocation, rotation, forged digest/signature result,
cross-workspace/task/attempt bindings, restored request JSON, and rollback at
spend/audit/commit. The positive service test forbids child-process APIs.
This uses a rollback-capable **in-memory model**, not real PostgreSQL concurrency.

`npm run validate`, final TypeScript/server build, Prisma schema validation,
route-capability lint and both existing direct-Codex documentation validators
passed. 629 local documentation links passed; default context is 120536 bytes.
The web build retained missing static-asset references and large-chunk warnings;
no UI or asset changes were made. No migration deploy or full API suite ran.

The dedicated [PostgreSQL persistence test](../../scripts/owner-ticket-persistence.test.mjs)
is present but **SKIPPED** on the unavailable Engine. It is intended to check the
forward migration, preservation, real CAS, rollback, old-row restoration denial
and rotation in an owned disposable database. Its synthetic historical fixture
bypasses old governance triggers during setup only; it does not qualify native
Ready/decision HTTP integration. That full integration remains untested too.
The production signer, current host-evidence reconstruction, public bootstrap,
HTTPS transport and Worker identity/admission integration are still blocked.

All six flags remain false: `implementationReady`, `executionSupported`,
`pilotReady`, `liveAdmissionAllowed`, `pilotExecutionAuthorized`,
`pilotExecutionStarted`. Service output also has `realIssuerQualified=false`,
`transportQualified=false`, `launchAuthority=false`. Direct/manual Codex gains
no authority. No real key provisioning, provider/model, VPS, production DB or
retained temporary root was accessed. No push/deploy or activation was performed.

**Exactly one proposed next atom:** qualify the new migration, real concurrent
consume/rollback and native owner/decision/Ready integration on an available,
disposable local PostgreSQL database with the injected test signer. Correct only
failures found in that qualification. No real keys, transport or launch activation.

## Historical v17 source-contract result

2026-09-23, owner amendment v17. **Mechanism selected; source/schema/validator
contract DONE. Production issuer, transport and admission integration BLOCKED.**
Use the existing Roost API installation as the external issuer. The existing
signed trusted-pilot acceptance and one-attempt containment receipts remain the
policy and execution boundaries. No separate broker, PKI, local signing service
or paid service is introduced. This atom provisions nothing.

## Choice and trust boundary

| Candidate | Assessment |
| --- | --- |
| Windows non-exportable CNG/TPM key under the current user | Export restrictions protect key extraction, but do not inherently prohibit signing by another process authorized as that user. Worker and owner currently share that principal. Separate signing permission, user-presence enforcement or another principal would need independent qualification. Not selected. |
| Existing Roost API/server installation | Keeps private signing capability off the laptop. Current human authentication/workspace membership and explicit primary-owner decision gate issuance; the agent API key can only request verification/consumption for its assigned attempt. Selected, subject to implementation and deployment qualification. |

Microsoft documents separate
[export, usage and access-control properties](https://learn.microsoft.com/en-us/windows/win32/seccng/key-storage-property-identifiers)
and signing through an authorized key handle via
[`NCryptSignHash`](https://learn.microsoft.com/en-us/windows/win32/api/ncrypt/nf-ncrypt-ncryptsignhash).
The lack of issuer/verifier separation for the same Windows principal is the
architectural inference; no key store, certificate, registry or ACL was inspected
or changed here.

The private Ed25519 key belongs solely to the server installation secret
configuration/process memory, outside the repository, database, logs, tickets,
Worker environment and laptop. Use existing deployment secret handling; do not
reuse authentication-token, API-key hashing or data-encryption secrets as signing
keys. Later empty-install bootstrap may require explicit configuration; upgrades
must never regenerate keys or seed business records. This slice does not add an
environment secret or signer implementation.

Public verification authority comes from the **fresh authenticated Roost HTTPS
origin**, tied to an operator-approved installation/workspace. A local public-key
file is a cache/candidate only, never a root of authority. Every attempt compares
it to the live server key/epoch; replacement fails closed. No key supplied by a
ticket, task, provider or writable `installation.json` can select the verifier.
The current Worker API client does not yet qualify HTTPS-only origin binding,
redirect refusal or authenticated fresh key-state retrieval. These are explicit
integration blockers, not guarantees produced by parsing a JSON snapshot.

The public origin/installation bootstrap and executing verifier code remain
trusted inputs. Changing those inputs or taking over the process as the same
Windows user is outside the signature guarantee. A signature authorizes an exact
decision; it is not OS isolation, nor proof that unrelated same-user code cannot
act outside Roost or steal a human session. Moving the signing key off the laptop
does not solve compromised server code or a compromised owner session.

## Existing Roost authority, not a Worker decision

The future issue endpoint must use current database-backed human authentication
from [requireAuthContext](../../src/auth/api-key.middleware.ts), human owner-role
checks from [workspace access](../../src/auth/workspace-access.ts), the workspace's
primary owner identity and an explicit, auditable owner decision/revision.
`api_key`/agent credentials, admin membership, role claims from a request body,
task metadata and unattended Worker calls cannot issue, renew or expand it.
The server derives these facts from existing records; the request cannot choose
its own actor or authority. The new pure `assertOwnerTicketIssuer` models this
boundary, but no route calls it yet and no existing auth behavior is changed.

Issuance revalidates the current task/Ready/claim/revisions and exact owner-approved
installation measurements. The server must not pretend it independently measured
the laptop's runtime/profile or established OS confinement. The same accepted
account-level residual risk and independent runtime/lifecycle gates remain.

## Bounded signed data

[`roost-server-owner-ticket-v1`](../../scripts/lib/agent-host-owner-ticket.mjs)
uses a fixed Ed25519 algorithm and canonical bytes from the existing signed
acceptance contract. It carries issuer origin, audience, key ID/epoch, ticket ID,
random nonce, issued/not-before/expiry times, exact acceptance and claim digest.
Lifetime is at most **60 seconds**, contained within the owner acceptance's
lifetime. `renewable=false`; issuance requires a new explicit owner decision.

The embedded existing acceptance binds installation/workspace, decision/revision,
managed Hermes runtime/profile/configuration, selected backend/model/reasoning,
task/execution/attempt, input/Ready revisions, role/competence context, Writer,
filesystem scope, risk and budgets, deadline/output/turn policy, original Job v2,
review/recovery/no-release gates and explicit
`windows_account_authority_not_os_isolation` acknowledgement. The extra claim
digest comes from the genuine original fixture runtime binding. Runtime and
model qualification remain synthetic; no real provider becomes admitted.

The verifier compares the entire acceptance against independently reconstructed
current attempt data. It never adopts ticket contents as that expected state.
Only managed Hermes with a versioned backend is accepted. A change in any bound
fact requires a new decision and attempt; no backend/model fallback follows.

## Online consumption, replay and clock semantics

The server must atomically consume a unique ticket/nonce against current owner
decision, key epoch, assigned Worker, claim and attempt. Enforce uniqueness for
the execution attempt and owner-decision consumption as well as ticket ID and
nonce. A newly signed ticket ID/nonce cannot restart the same spent attempt.
Record only nonsensitive IDs/digests, versions, timestamps and terminal audit
state in existing persistence;
never store the private key, credentials or raw sensitive payload/logs there.
Schema and transaction integration are future work; this atom has no migration.

The initial consume acknowledgement is signed and binds ticket digest, nonce,
fresh Worker challenge, claim, decision/revision, consume ID and `firstUse=true`.
Both server key-state snapshot and acknowledgement are valid for at most **five
seconds**. Offline, absent/unknown authority, stale state, redirects, TLS/origin
failure, replay or consumption uncertainty deny; no cached/offline acceptance.
A timeout after server consumption leaves the attempt spent. Read-only status
reconciliation may recover audit/owned cleanup, never another dispatch.

The stateless verifier checks wall-clock rollback, monotonic rollback and a
wall/monotonic discontinuity over one second, against Worker-owned prior clock
samples. It checks expiry and fresh server times. The future adapter must own
those samples and fresh challenges rather than take them from task JSON.
After process restart, server consumption state remains authoritative; resetting
local files/clock/WeakMaps cannot restore a ticket.

Before create/resume, future integration must refresh current issuer/key/decision
state for the *same* consume ID and original genuine one-attempt receipt. This
status refresh is not a second consumption or renewable launch authorization.
Loss/revocation during execution must stop the owned Job under the existing
lifecycle/recovery contract. The network adapter, status-refresh state machine
and durable CAS are not implemented or represented as proven by these tests.

## Rotation, revocation and recovery

Rotate explicitly on the server: activate a new public key ID and increment the
epoch, retire/revoke the old epoch and refuse its outstanding tickets. There is
no overlap grace for launch in v1. Publish only public material through the
authenticated origin; do not learn a new key from a ticket or local cache.
Revoking/superseding the owner decision or changing its revision also denies.
Any new ticket requires current facts and explicit owner acceptance; Worker
cannot refresh its own authority. Old public material may remain only for audit,
never fresh admission. Key loss means fail closed and separately provisioned
server recovery, not local key generation or resurrection of outstanding work.

## Implemented proof and limits

The verifier is deliberately **stateless and validator-only**: it does not
authenticate the passed server snapshot, fetch data, sign, provision, persist
nonce state or return a launch receipt. Tests model the server's consume CAS in
memory, validate both backend tickets against the exact existing decision, then
separately exercise the existing fixed-fixture admission. A validator result is
explicitly rejected when substituted for an opaque containment receipt.
`transportQualified`, `realIssuerQualified` and `launchAuthority` remain false.
All six public readiness/activation flags remain false. Existing local-anchor
fixtures are historical/synthetic only; they cannot become production authority.

Inherited Users write in the old local state directory therefore does not become
the selected trust root. It is not repaired or silently accepted: replacing the
production trust source, qualifying bootstrap/HTTPS, enforcing owner-only issue
and implementing durable consume/revocation are still blockers. The 39 retained
temporary roots were neither accessed nor changed in this atom. No real key,
certificate, ACL, profile, model store, backend, server or production state changed.

## Verification

**181/181 unique tests passed:** 46 new ticket/issuer cases and 135 existing
trusted-pilot/containment/launch regressions. The two positive backend cases first
validate the exact synthetic ticket/decision, then exercise only the existing
fixed 22-byte program, zero-process Job cleanup and owned-fixture removal.
This is conditional validator plus existing-boundary coverage, not implemented
network-to-launch integration. Tests refuse wrong issuer/key/signature, local
key replacement, Worker self-signing, stale/expired/future/offline state, clock
rollback, replay and reissue against a spent attempt, rotation/revocation and
all enumerated task/runtime/backend/scope/budget/release changes. A plain
validation result cannot replace the original opaque containment receipt.

`npm run validate` passed lint, TypeScript and server/web builds, retaining the
existing large-chunk and plugin-timing warnings. Node syntax, both documentation
validators and whitespace checks passed. No database/API integration or real
issuer transport, backend/model or production trial ran. Test-only private keys
remained in memory; no retained temporary root was inspected or removed.
The eight pre-existing dirty documents and unread `design-qa.md` are excluded.

**Exactly one proposed next atom:** implement and synthetically qualify owner-only
ticket issuance plus atomic one-use consumption in the existing Roost API, using
an injected test signer and existing auth/decision/task authority. Include server
transaction/revocation tests and a reviewed persistence contract, without real
secret provisioning, deployment, Worker activation or provider invocation. Stop
after this source-only contract.
