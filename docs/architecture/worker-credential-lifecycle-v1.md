# Owner-controlled Worker credential lifecycle v1

Owner amendment v31: [bootstrap/recovery admission](worker-bootstrap-admission-v1.md)
is **DONE as a source-only contract/model: 16/16 results, 73/73 source regressions**.
A separate current-owner ticket admits one first enrollment or terminal recovery;
ordinary poll/ACK/status/rotation retain their existing credential requirements.
Exact bindings, burned generations, replay, expiry/cutover and post-commit unknown
are enforced synthetically. No native persistence, network, provisioning or default
composition; all admission flags false. Durable issuer/delivery integration is
PARTIAL and production BLOCKED. Exactly one proposed next atom: a source-only
bootstrap ledger adapter and additive unapplied schema with mocked transaction
validation. Earlier successor proposals below are historical.

Owner amendment v30: [persisted admission/HTTPS coordinator](worker-handoff-coordinator-v1.md)
is **DONE for source-only integration: 11/11 results, 57/57 source regressions**.
Immutable snapshots are the only configuration source; inspection, pre-body peer
recheck and signed operation/response completion reject drift and stale pins.
Concurrent/replayed completion, uncertainty, read-only status and buffer wiping
are qualified with an injected synthetic exchange on the existing HTTPS client.
No persistence/migration change, real network/DB/Docker or activation; flags false.
Real exchange remains PARTIAL and production BLOCKED. Integration exposes an
active-credential prerequisite that blocks first enrollment and rotation recovery.
Exactly one proposed next atom: a source-only bootstrap/recovery admission contract
and synthetic validation resolving that cycle without relaxing owner/host bindings.
Earlier successor proposals below are historical.

Owner amendment v29: [native transport persistence](worker-transport-admission-v1.md)
is **DONE: 9/9 PostgreSQL results, 55/55 selected native/source results**.
Real Prisma/Serializable concurrency (20 attempts per create/stage/cutover/revoke/
readmit), FK/unique/CHECK constraints, atomic rollback and SQL read-only inspection
pass. The previously unapplied migration needed a JSON-operator parenthesis fix;
it then applied with the full 77-file chain. Earlier 76 migrations unchanged.
Cleanup PASS: owned database absent, three existing database fingerprints equal,
Roost PostgreSQL exited, backend/Soar unchanged. Production remains BLOCKED and
all flags false. Exactly one proposed next atom: source-only integration of
persisted admission with the HTTPS handoff boundary and synthetic denial tests;
no endpoints, provisioning, default composition or activation. Earlier proposals
below are historical; native evidence does not qualify governance fixture setup
or privileged SQL/whole-database rollback protection.

Owner amendment v28: [transport admission persistence](worker-transport-admission-v1.md)
is DONE for the source Prisma adapter and synthetic transactions: **10/10 results,
46/46 selected source regressions**. Four additive tables preserve identity
generations, one workspace/host head, monotonic history and atomic Event/audit.
Serializable writes use the existing fence and exact revision/digest; read snapshots
perform no writes. Migration **UNAPPLIED**; native persistence qualification PARTIAL,
production TLS/DNS/provisioning and execution BLOCKED. Default composition absent,
all six flags plus `transportQualified` false. Exactly one proposed next atom:
separately authorized native PostgreSQL qualification in a disposable synthetic
database. Earlier successor proposals below are historical.

Owner amendment v27: [source transport admission](worker-transport-admission-v1.md)
qualifies exact primary-owner authority, signed origin/DNS/certificate metadata,
credential/ticket-key binding, monotonic epoch transitions and revoke in memory:
9/9 results, 36/36 selected source tests. No durable adapter/migration yet; no
real network, DB/Docker, provisioning or activation. Production admission remains
BLOCKED, including independently trusted monotonicity/freshness; all six flags
false. One next atom: source-only Prisma adapter and additive unapplied migration
with synthetic ledger/rollback tests. Earlier next-atom proposals are historical.

Owner amendment v26: [loopback HTTPS adapter qualification](worker-handoff-https-v1.md)
is **DONE: 9/9 real loopback HTTPS results, 189/189 selected tests including prior
regressions**. Normal TLS validation plus exact certificate DER SHA-256 pinning,
bounded pin overlap/cutover, direct proxy-free connections, closed routes/schemas,
timeouts, 20-way poll/ACK and lost-response recovery are qualified with ephemeral
test certificates and synthetic credentials. Production TLS/DNS/certificate
provisioning and secret storage remain BLOCKED; default composition and all six
flags stay false. No DB/Docker or target process is used. Cleanup: no remaining
server/socket/timer or certificate/key file. Exactly one next atom: source-only
production HTTPS/DNS/certificate admission contract with synthetic denial tests,
exact installation/host/owner binding and epoch rollback denial. Earlier results
and next-atom proposals below are historical.

Owner amendment v25, 2026-09-23. **DONE for native handoff qualification:
9/9 PostgreSQL/HTTP results (eight scenarios plus parent), 180/180 selected
regressions. BLOCKED: real TLS, provisioning, secret storage and launch.**
The complete unchanged 76-migration chain, including the handoff migration, was
applied once to one uniquely owned disposable database. No applied migration was
edited. Default application routes remain closed; all six admission flags stay
false. Earlier v24/v23 results and proposed next atoms below are historical.

The [native suite](../../src/tests/worker-handoff-api.ts) uses the actual handler,
authentication middleware, service, shared credential operations and
[Prisma adapter](../../src/modules/api-keys/worker-handoff-store.ts). Its HTTP
server binds loopback only. HTTPS origin/certificate/redirect/proxy evidence is
explicitly injected synthetic evidence, never a request header/body assertion;
this is **not real TLS qualification**. Generator, hasher and HMAC proof use only
ephemeral synthetic material. Controlled service time exercises deadline recovery.

- Device request has no owner authority; a fresh primary owner accepts the exact
  governed decision before delivery. Foreign/non-primary humans, agents, Workers,
  stale authentication/decisions and binding/proof/transport drift are denied.
- Twenty concurrent polls produce exactly one bounded raw-secret response and
  one inactive candidate. Other responses contain spent-request metadata only.
  Twenty concurrent ACKs produce one activation, one operation ledger entry and
  one acknowledgement Event. Replay never retrieves the secret.
- Serializable conflicts never retry a command or generator. A conflicting
  poll/ACK may perform one read-only lookup, revalidate device proof and trusted
  transport, and return spent-request metadata. Without that proof it denies.
- Lost delivery becomes `delivery_unknown` after the deadline; its pending key
  is revoked. New request plus new owner decision is required for recovery.
  Concurrent rotation and pending recovery preserve one current generation.
- Injected failures after request/approval writes, revoke/invalidation, candidate
  insertion, ACK activation, ledger/Event writes and before commit restore the
  complete snapshot including the Ready fence. Post-commit delivery failure
  intentionally retains a spent request and inactive candidate until reconciliation.
- PostgreSQL rejects direct activation before ACK, immutable-binding edits,
  history deletion and an ACK missing its activation/audit commit. All public
  tables, status and captured logs are checked for raw synthetic keys and device
  proofs; none persists. Generated and decoded proof buffers are zeroed. This
  does not claim erasure of JavaScript string copies or production secret storage.
- No execution, claim, ticket, provider or launch receipt is created by handoff;
  target process APIs are forbidden. Direct Codex, App Server and manual provider
  admission remain denied and all six flags remain false.

Cleanup and preservation **PASS**: both HTTP servers and Prisma connections
closed. The owned loopback relay was identity-checked, had zero children and was
stopped; its absence was verified. The unique database name/OID/owner/comment and
zero sessions were verified before dropping only that database and confirming
absence. Logical fingerprints of three existing databases (214 table/sequence
entries), schema, catalog and role metadata match. Container/image/volume/network
inventories match; the database container is back to exited. Soar and backend
states are unchanged. Eight dirty documents, the unread design artifact and 39
retained roots were not modified by this atom. No push or deploy.

**Exactly one proposed next atom:** qualify an explicit HTTPS transport adapter
on loopback using ephemeral test certificates and synthetic credentials, including
origin/certificate pinning, redirects and proxy drift. No production provisioning,
secret-store integration, Worker/provider/model launch or activation; stop after
that transport qualification. Full API/web and production deployment tests were
not run in this database atom.

Owner amendment v24, 2026-09-23. **DONE for source-only handoff contract and
synthetic qualification: 7/7 tests. PARTIAL: future persistence. BLOCKED: real
HTTPS/TLS, provisioning and launch.** The local device request carries only
hashes and exact installation/host/origin/certificate evidence; it has no owner
or task authority. A fresh primary owner approves one exact governed decision.
The Worker then polls the exact origin with the device secret/challenge and gets
one bounded synthetic raw credential response. A delivery ack proves possession
without repeating the secret; only that ack may activate the pending generation.
The new additive handoff migration is unexecuted. No database, Docker, real
network, secret store, Worker, provider or model is started; six flags remain false.
The v23 native lifecycle result below is historical for the earlier migration.

Owner amendment v23, 2026-09-23. **DONE for bounded native qualification:
12/12 PostgreSQL/HTTP results (11 scenarios plus parent), 173/173 synthetic
regressions. BLOCKED: real provisioning, secure delivery/TLS and launch.**
The 75-migration chain is qualified on one owned disposable database with
synthetic keys/evidence. No production migration, Worker, provider or model runs.
All six activation/readiness flags stay false. Default composition remains closed.
The v22 source-only and v21 ticket-only results are historical.

## Existing components and closed default composition

This extends `ApiKey`, registered `AgentHost`, governed decision revisions,
`agent_credential_operations`, Events, the existing Ready fence and ticket/claim
recovery. There is no second credential system, service, database or activation
switch. New routes on the existing API-key router are:

| POST route | Required authority | Synthetic effect |
| --- | --- | --- |
| `/v1/api-keys/worker-credentials/enroll` | Fresh current primary owner + exact accepted decision | First generation, or a new generation after terminal revocation |
| `/v1/api-keys/worker-credentials/rotate` | Same authority + exact current generation | Atomic revoke, invalidation, new generation and audit |
| `/v1/api-keys/worker-credentials/revoke` | Same authority + exact current generation | Terminal revoke and invalidation; no replacement |

All return `Cache-Control: no-store`. The application mounts the real service and
Prisma adapter with **no generator, hasher or delivery dependency**. All three
commands are unavailable to an otherwise eligible owner. Other actors are denied.
The only injectable delivery contract in this slice is `synthetic_memory_only`;
its in-memory test generator is never installed in application composition.
No environment switch or automatic secret generation is introduced.

## Fresh primary-owner decision

The signed human token carries `authTime` from password authentication or initial
account/invitation authentication. The command requires an integer timestamp no
more than five minutes old, not in the future. Workspace creation/selection keeps
the original authentication time; it cannot turn an old session into fresh proof.
Legacy tokens without that field remain valid for ordinary existing routes but
cannot operate this lifecycle until the user logs in again. Request JSON and
headers cannot supply or replace the timestamp.

## One-time device handoff

The handoff uses a bounded device-authorization style flow on the existing
credential lifecycle. A local installation creates a high-entropy device secret,
challenge and host fingerprint, then sends only their hashes with its exact
workspace/installation/registered-host binding. The request has a short TTL,
bounded poll/approval attempts and an exact HTTPS origin plus certificate
fingerprint. A user code is a short reference only; it is not credential
authority. The default HTTP routes remain hard-closed because no secure transport
adapter is composed.

The current primary owner compares that binding and accepts a strict
`workerCredential` decision whose `handoff` binding matches the request digest,
origin, certificate and replacement request. Agents, Workers, API keys and
non-primary humans cannot approve it. Approval alone creates no ApiKey, ticket,
claim, task, provider or launch authority.

After approval, the Worker must present the original device secret and challenge
to the exact trusted origin. HTTP, redirect, proxy-origin drift, alternate host
or port, certificate mismatch and unvalidated TLS fail closed. At most one
serialized poll can create a pending hashed-only credential and disclose the raw
synthetic value. The request becomes spent immediately; concurrent polls and all
replays return terminal metadata without the value.

The pending credential is inactive until the Worker sends an ack containing the
credential fingerprint, response digest and an HMAC proof derived from its raw
credential. The ack is atomic with activation and owner audit. It never carries
the raw credential. If the response is lost or the ack deadline passes, the
pending credential is revoked and the request becomes `delivery_unknown`.
Recovery requires a new explicit owner decision and request; the old request and
generation are terminal before a replacement may be delivered. There is no
retransmission of the old value and no state with two current generations.

Persisted handoff state is limited to hashes, fingerprints, binding metadata,
attempt counters, expiry, state and terminal delivery outcome. Raw device secrets,
challenges, raw credential responses and ack material never enter DB, Event,
audit, status, error or log projections. Synthetic buffers are cleared after each
operation. The source adapter uses a rollback-capable memory model only; it is not
evidence for the [new handoff migration](../../prisma/migrations/20260923150000_worker_credential_handoff/migration.sql) or real TLS.

Inside the Serializable transaction, the service rereads the current primary
owner and owner membership. Additional owners, admins, members, delegated actors,
agents, Workers and generic API keys cannot enroll, rotate or revoke.

The existing governed proposal accepts a strict `workerCredential` declaration.
It cannot also declare delegated authority. Acceptance is owner-reserved and must
be accepted by the current primary human owner, with an exact decision ID/revision,
current accepted state and no accepted successor. Its declaration binds:

- Action, workspace, installation and registered host.
- Expected credential ID/version/epoch/fingerprint (all empty/zero only initially).
- Exact new expiry, or null for revocation; `validUntil` for the decision.

The command repeats that exact declaration with a request ID and explicit
acceptance. Matching an unrelated accepted decision does not authorize a change.
New credential expiry must be future and at most 30 days from the command.
No approval is inferred from host registration, scopes or a profile label.

## Generation, scope and irreversible revocation

Credentials remain hashed-only `ApiKey` rows. Each generation has an immutable
workspace/installation/host, increasing host binding epoch, authentication hash,
domain-separated fingerprint, credential version and expiry. The public prefix
is a fixed class label, not a fragment of the synthetic secret. The existing
append-only operation ledger records owner identity, accepted decision/revision,
exact intent and resulting generation; rotation retains the prior ID in intent.

One active generation per workspace/host is enforced by the existing unique
index. Enrollment cannot replace an active generation. Rotation revokes the old
row and creates a new row; revocation increments its version. Revoked generations
are never edited back to active. Explicit reenrollment after revocation creates a
new row and higher epoch. Concurrent changes carry the same exact generation
precondition, so only one succeeds. Database conflicts are bounded denials with
no automatic transaction or generator retry.

The sole stored scope is `agent-runtime:claim`. Because that shared capability
also covers other legacy routes, bound Worker middleware additionally permits
exactly POST claim, ticket consume and ticket status. Registration, heartbeat,
recovery, owner/decision/ticket issuance, provider and release routes are denied.
This is a bounded credential contract, not sufficient authority for a full
production Worker loop. Ordinary unbound/agent credential behavior remains its
separate existing contract; generic key activation cannot edit bound Worker rows.

Authentication checks the current credential and registered host. Claim additionally
rereads credential/version/epoch/fingerprint, installation head and assigned host
inside the Ready transaction, before ownership changes. Host disable/reassignment
revokes bound generations under the new native trigger. Deletion remains restricted
by retained credential history. The existing ticket-key guard already forbids
installation identity transfer. None of these changes silently transfers a key.

## Atomic invalidation and recovery

The new forward migration adds guards/functions/indexes to existing tables only.
Revocation and rotation invalidate unused tickets for the old credential and
fence active claimed/running/waiting executions on that host. Existing journal
triggers record ticket revocations. Consumed tickets remain spent. Execution
attempts, checkpoint and original lease identity remain intact; cancellation and
context invalidation block reuse and require explicit owner reconciliation.
No process is presumed stopped and no replacement is started automatically.

The credential transition, invalidation, replacement and owner audit share one
transaction. An error after any step rolls back all model state. The native
adapter uses Serializable isolation and the existing Ready fence. The v23 native
tests exercise SQL guards, real concurrency and ticket/claim recovery state in
PostgreSQL. In-memory rollback alone remains insufficient evidence.

## One-time synthetic response and disclosure limits

Only the first successful committed enrollment/rotation calls the injected
synthetic delivery function. Request replay returns safe historical metadata and
`key: null`; revoke also returns no key. A reused request ID with changed payload
is rejected. The same accepted decision cannot authorize another operation.
If delivery fails after commit, the generation remains durable and the failure is
bounded; replay never reveals the lost secret. A new explicit rotation is needed.

Raw test material exists only in ephemeral buffers and the bounded first synthetic
HTTP response. Buffers returned by the generator are overwritten after use. There
is no promise of production secret protection or heap-copy erasure. Persistence,
audit, status and error projections contain no raw key; unexpected exceptions are
replaced by fixed error codes. No real secret storage or secure transmission is
implemented. Synthetic success still has real provisioning, transport and launch
qualification false, with no launch receipt.

## Evidence and remaining qualification

**173/173 tests PASS**: 55 new lifecycle cases and 118 ticket/provider/redaction/
decision-authority regressions. Service tests use a rollback-capable serialized
model of existing tables. Loopback HTTP uses real handlers, signed tokens and
API-key middleware with synthetic credential storage; claim probes use the real
claim guard. Ticket consume/status authentication probes are separate from the
existing real ticket-service synthetic tests. Prisma adapter decisions and
transaction options are tested with a mock database, not a PostgreSQL engine.

Tests cover owner enrollment/rotation/revocation, denied principals and stale
authentication/decisions, host/installation/workspace drift, duplicate enrollment,
20-way enrollment/rotation and both rotate/revoke orders, one-time replay,
version/epoch/fingerprint drift, revocation/expiry, complete rollback at each
mutation, lost delivery, bounded errors, no raw material in persisted/audit state,
and no target process effect. Target process APIs are forbidden in the positive
scenario. TypeScript build, route lint and documentation checks pass.

## Native PostgreSQL qualification

The [native suite](../../src/tests/worker-credential-api.ts) uses real Prisma,
signed human tokens, API-key middleware, governed proposal/acceptance, the Ready
fence and ticket service behind loopback HTTP. A claim probe runs the production
credential guard inside a Ready transaction; it does not enable the full Worker
loop or bypass its production activation gate. Signer, physical evidence and
credential delivery stay synthetic and ephemeral. Target process APIs are blocked.

The [forward migration](../../prisma/migrations/20260923130000_worker_credential_lifecycle/migration.sql)
initially failed SQL parsing at two CASE comparisons. Its transaction rolled back
completely. Parenthesizing those expressions repaired the **previously unapplied**
75th migration; the prior 74 files were unchanged. It then applied in the same
owned database, without reset, reseeding, disabling triggers or a second database.
All 75 applied file hashes remained unchanged for the rest of qualification.
No migration already applied before this atom was edited.

Native evidence covers:

- Twenty concurrent enrollments: one durable generation and one secret response;
  other requests conflict or replay metadata. Twenty rotations: one new current
  generation, with parallel old-key claim/status requests. Twenty rotate/revoke
  requests likewise have one winning transition.
- Concurrent real ticket consumption and revocation: a ticket becomes spent or
  revoked exactly once; no resurrection. After the terminal credential commit,
  old-key claim/consume/status all deny. Unused tickets revoke atomically and
  prepared old proof cannot be used by the replacement key.
- Rollback after actual revoke, invalidation, insertion, ledger/Event writes and
  before commit restores the complete snapshot, including Ready fence, tickets,
  journal, bindings and execution state. PostgreSQL also rejects tampered owner,
  revision and intent at the final audit insert, rolling back earlier writes.
- Primary-owner/fresh-auth/accepted-decision gates, generation drift, expiry,
  host reassignment/disable/deletion, installation/workspace drift, terminal
  history, duplicate commands and missing delivery dependencies fail closed.
- All public tables are scanned for every generated raw synthetic key; none is
  persisted in credentials, journal, Events or audit. Logs and serialized prepared
  fixtures contain none; generated buffers are wiped. Delivery occurs once after
  commit, while replay returns metadata. No launch receipt or target process.

The full API/web suite, production migration, real secure delivery and network TLS
qualification are not run. Native evidence does not authorize real credentials,
provider execution or activation. Eight pre-existing dirty documents, the unread
design artifact, private profiles/model storage and retained roots stay untouched.

Cleanup/preservation **PASS**: both HTTP servers and Prisma connections closed.
The owned loopback relay was identity-checked, had zero children and was stopped;
no relay process remained. Before DROP, exact database name/OID/owner/comment and
zero active sessions were verified, followed by verified absence. Before/after
logical fingerprints of three existing databases (214 table/sequence entries),
schema, catalog and role metadata match. Container/image/volume/network inventory
matches; the existing database container is back to exited, unrelated services
and the stopped backend retain their original states. No new container, image,
volume, role or persistent database remains. No push or deploy.

**Historical v24 proposed next atom (completed by v25):** qualify the additive handoff migration and
its native owner-decision, exact-origin/certificate, one-time poll/ack, recovery,
concurrency and rollback boundaries on one explicitly authorized disposable
PostgreSQL database using synthetic hashes/evidence only. Do not qualify real
TLS, provisioning, secret storage, Worker/provider launch or activation. Stop
after that database qualification.
