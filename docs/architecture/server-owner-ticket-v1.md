# Server-issued owner ticket and public verification contract v1

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
