# Persisted admission and HTTPS handoff coordinator v1

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

Owner amendment v30, 2026-09-23. **DONE for source-only coordination and synthetic
qualification: 11/11 results, 57/57 selected source regressions.** Real exchange
integration is PARTIAL; production/bootstrap/provisioning/execution remain BLOCKED.
No network, DNS, database, Docker, credential provisioning or target process is
used in this atom. All six admission flags, `transportQualified` and launch
authority remain false. Default composition and public endpoints are unchanged.

## One internal boundary

The [coordinator](../../src/modules/api-keys/worker-handoff-coordinator.ts) accepts
only request/poll/ack/status and their strict existing device fields. Request
callers omit origin and certificate fingerprint; the coordinator derives them.
URL/host/port/CA/pin/epoch/proxy/redirect/resolver/snapshot/header overrides and
extra arguments fail before exchange. Direct Codex, App Server, manual, owner
approval and arbitrary HTTP operations are not this surface.

Dependencies are explicit: a trusted current-record/anchor loader, the persisted
admission service's inspect and completeVerified methods, and the existing HTTPS
client's internal `sendAdmitted` seam. Missing dependencies/qualified snapshot
deny. This does not create a second decision policy, public endpoint, credential
store or network client. The HTTPS client shares its existing action paths,
response parser, limits and enrollment pin binding with the new seam.

The internal exchange seam accepts only an explicitly injected
`synthetic_persisted_admission_v1` driver. It cannot construct production sockets
from a production snapshot. Existing real loopback HTTPS behavior remains separate;
its configuration is never disguised as public IPv4 production admission. A real
issuer/CA/socket implementation is still unqualified.

## Ordering, immutable configuration and signed observations

1. Load the exact record/anchor and inspect the persisted head, current owner
   decision and credential/host/installation/ticket-key bindings.
2. Receive a strict, deeply frozen public snapshot: identity/generation bindings,
   revision/digest/current state, exact origin/SNI/CA digest, certificate and
   high-water epochs, decision ID/revision/intent digest, expiry, resolver policy,
   fixed no-proxy/no-redirect/no-downgrade/no-session-reuse and time-allowed
   certificates with owner bootstrap evidence digests.
3. Repeat inspection after asynchronous preparation. Changed authority/head/pins
   denies with **zero exchange calls**. Derive POST/path and a fresh operation UUID
   locally; bind request ID/action and the snapshot digest to that operation.
4. The exchange presents signed actual peer/address/certificate evidence before
   releasing the request body. `completeVerified(..., before_send)` rereads
   persisted authority and checks evidence. A change here blocks body send; a
   real future implementation may already have performed a TLS handshake.
5. Validate the bounded response using the existing HTTPS response schema. Bind
   the actual response SHA-256, phase, outcome and commit uncertainty to signed
   peer evidence for the **same** operation. The peer/address/pin/epoch must also
   match the pre-send observation.
6. Before accepting any credential, ACK or status result, run
   `completeVerified(..., complete)` against current persisted state. A changed
   head, owner/decision/credential/host/installation/key binding, expired admission
   or no-longer-allowed peer returns terminal `delivery_unknown`/blocked.

The snapshot is the sole HTTPS configuration source. Public CA **digest** is an
identity constraint, not CA material or permission to provision it. Current and
staged pins are derived from the same existing rotation contract. Completion
recomputes time eligibility even if no head revision changed: old leaf fails
after cutover, while a next leaf present in both original and current allowed
sets can still pass. A head-changing cutover/revoke always invalidates the old
snapshot. An enrollment already bound to a particular leaf retains that stricter
existing handoff binding; overlap does not silently transfer it to a new leaf.

## Replay, uncertainty, read purity and secret handling

One process-local request lock admits one of 20 concurrent operations for the
same request ID. A completion callback can be consumed only once. Missing,
replayed, bypassed or failed verification cannot release data. The retained ID
set is bounded at 128 and does not evict replay state to gain capacity; the client
limits active exchanges to 32. These are process-local correlations, not durable
completion records or authority across restart. No automatic retry is added.

The existing maximum overall deadline of ten seconds also covers peer and final
verification. A late peer approval cannot send a body after deadline; a late
completion cannot release a credential. Late response buffers are wiped. Timeout,
redirect, HTTP failure, malformed/oversize response, uncertain commit or authority
drift block the outcome. An uncertain enrollment cannot poll/ACK again; status is
read-only reconciliation under a fresh current admission, not renewed authority.
Recovery uses a new enrollment ID and the existing independent owner workflow.

Admission reads and both rechecks use the existing read interface. No admission
history/head/audit/Event/high-water/expiry, credential, ticket or task write is
introduced; no new persistence fields or migration are needed. Status polls leave
the ledger and authority fixtures identical. No observation/audit write is added.

Owned request/proof/response buffers are zeroed on success and failure. Admitted
poll delivery is returned as a caller-owned Buffer only after verification;
rejected delivery buffers are zeroed. The caller must wipe an accepted Buffer.
No body/proof/authorization/HMAC/raw credential or native error is logged. JSON
parser/string/TLS heap copies cannot be claimed erased; production secret storage
and zeroization remain unqualified.

## Evidence and remaining bootstrap gap

The [synthetic tests](../../src/tests/worker-handoff-coordinator.test.ts) use the
rollback-capable admission fixture and the existing HTTPS client's injected
exchange seam. They cover exact ordering, caller overrides, all binding drift
before exchange/after commit, staged overlap/time cutover, copied/stale snapshots,
peer/address/pin/epoch mismatch, operation/completion replay, missing verifiers,
20 concurrent status/poll operations, response faults, immutable reads and late
deadline completions. Socket/network/DNS/fetch/child-process APIs are trapped and
observe zero calls; secret-bearing logs are absent. Server build, lint and source
regressions pass. Real HTTPS, native DB/API/web and deployment suites are not run.

The current admission contract requires an **already active, acknowledged Worker
credential**. Therefore this coordinator cannot authorize the first credential
of a new installation. If a real credential rotation changes that binding during
handoff, the required completion check denies the old snapshot. These are explicit
bootstrap/recovery blockers, not permission to relax exact-generation checks.
Real signed socket observations, independent freshness/monotonicity, secure issuer
and CA material, production provisioning and activation also remain unqualified.

**Exactly one proposed next atom:** define and synthetically validate a source-only
bootstrap/recovery admission contract that resolves the active-credential cycle
while preserving exact owner/installation/host authority and terminal uncertainty.
Do not provision, add default composition, contact endpoints or activate agents.
