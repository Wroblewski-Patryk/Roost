# Owner-bound Worker bootstrap and recovery admission v1

Owner amendment v31, 2026-09-23. **DONE for the source-only contract and synthetic
model: 16/16 results, 73/73 selected source regressions.** Durable bootstrap
persistence, issuer implementation and real delivery remain PARTIAL; production,
provisioning and execution remain BLOCKED. No network, DNS, database, Docker,
credential provisioning, endpoint or default composition is added or used.

## Separate authority, not an ordinary transport identity

The [strict contract](../../src/modules/api-keys/worker-bootstrap-contract.ts)
and [service](../../src/modules/api-keys/worker-bootstrap.service.ts) resolve the
first-credential cycle at the contract/model level. An ordinary transport identity
still requires its exact active, acknowledged credential. It is never populated
with null, a placeholder credential or the bootstrap ticket. Existing transport,
HTTPS client and handoff coordinator code is unchanged.

`first_enrollment` authorizes exactly one ceremony when the canonical installation
has no prior enrollment, credential or credential high-water history.
`owner_recovery` requires a terminal prior attempt or revoked credential, a fresh
primary-owner authorization, a new decision, ticket, enrollment request and target
credential. A healthy active credential requires the ordinary lifecycle/rotation
path. Revoked hosts or installations remain denied; recovery never reactivates
them. Failed attempts burn their reserved generation even if no secret was sent.

The optional `workerBootstrap` decision proposal is explicitly owner-reserved and
mutually exclusive with delegated authority, credential lifecycle and transport
admission proposals. The service accepts only a current signed, accepted,
owner-reserved decision whose ID, revision and intent digest match the ticket.
Native governance issuance/persistence is not qualified by these source tests.

## Exact, short-lived ticket and channel

The trusted adapter supplies the current primary owner and public issuer key,
workspace, installation ID/epoch, active host ID/epoch/fingerprint, key ID/epoch/
digest, channel revision/certificate/high-water epochs, terminal prior state and
credential/enrollment watermarks. Every binding must equal the signed intent.
Ticket, decision, peer and completion use separate bootstrap signature domains;
normal transport signatures cannot substitute for them.

The ticket binds a device-proof digest and one public target credential ID,
version 1, next epoch and fingerprint. Recovery cannot reuse the prior credential
ID or fingerprint. The target is pre-reserved **public metadata in the synthetic
model**; this atom does not generate or provision an actual credential.

Owner authentication must be no older than five minutes. Ticket issuance cannot
precede authentication or lie in the future. Ticket lifetime is at most two
minutes, within the owner decision, certificate and channel validity. The exact
origin/SNI, approved CA digest and out-of-band leaf evidence come from the signed
owner intent. All resolved and peer addresses must satisfy the existing public
IPv4 policy, and signed peer evidence is valid for at most thirty seconds.
Proxy, redirect and downgrade remain forbidden.

Bootstrap binds one certificate epoch and leaf. `channel.validUntil` is a hard
cutover fence; no ticket may outlive it. Any current channel revision, leaf,
key or epoch change invalidates the old ticket. Rotation requires a fresh current
channel and fresh owner authorization; there is no automatic overlap transfer or
caller pin override. The trusted future adapter must preserve monotonic channel
history and expose the earliest scheduled cutover as the validity fence.

The caller supplies only ticket ID and a 32–128 byte device-proof Buffer. Strict
validation rejects URL, CA, pin, headers, epoch, action and extra arguments.
Neither a bearer API key nor ordinary poll/ACK/status/rotation authority is
derived from this input.

## Reservation, fresh checks and terminal uncertainty

1. In one transaction, check the ticket, signature, current owner decision,
   bindings, absence/terminal credential baseline and proof digest. Atomically
   reserve one attempt and advance enrollment generation and credential epoch.
   The store contract requires uniqueness of ticket, decision, request and host
   generation, with compare-and-swap transitions and rollback on any failure.
2. Read authority again after reservation. Any intervening drift produces a
   terminal blocked receipt with **zero exchange calls**. The ticket remains spent.
3. Pass a deeply frozen, narrowly scoped permit to the explicitly injected
   synthetic bootstrap exchange. Before any body, verify its signed actual-peer
   evidence against fresh authority and atomically mark the attempt dispatched.
   Missing, duplicate, stale or failed verification cannot approve sending.
4. The exchange models only this request's pending-credential delivery and ACK.
   At completion, current public credential state must equal the ticket's exact
   target and be active and acknowledged. No other credential transition passes.
   Signed completion must bind this attempt, request, ticket digest, pre-send peer
   and the SHA-256 of the owned response Buffer (maximum 8192 bytes).
5. Recheck current authority, times and peer before accepting completion. Return
   only public credential metadata and `normalAdmissionRequired: true`.

The exchange has a ten-second deadline. Late peer approval cannot send; late
responses are wiped. Deadline/expiry checks also fence release after asynchronous
completion transitions. A possible send followed by drift, revocation, cutover,
expiry, verification failure or lost response yields terminal `delivery_unknown`.
There is no automatic retry, re-poll or ACK. A durable-terminal-write failure
returns `reconciliation_required`, never success. The future storage adapter must
provide bounded transactions; this model does not cancel a hung database operation.

The terminal receipt never grants renewed authority. Recovery needs a new explicit
owner decision against the current canonical terminal state and higher watermarks.
Successful bootstrap also requires a **new ordinary transport admission** bound
to its exact acknowledged credential before ordinary operations can run.

## Read purity, secret handling and qualification limits

`status` reads the local bootstrap receipt using the current ticket/proof and
authority. It does not send network status, reserve, renew, advance watermarks or
write events. Expired or drifted authority denies status; reconciliation is not
a bypass for normal admission.

The store interface carries only public metadata, hashes and signatures. Device
proofs and owned response buffers are wiped on success and failure, including late
responses. Raw credential material is never returned by this model. Error results
are fixed codes; raw bodies, proofs, credentials and native errors are not logged.
The exchange must wipe its own intermediates if it throws before transferring a
buffer. String/parser/TLS heap copies and production secret storage are unqualified.

Dependencies must explicitly identify as `synthetic_bootstrap_ledger_v1` and
`synthetic_bootstrap_exchange_v1`; absent adapters, key material or verifiable
evidence fail closed. This seam models a **whole bounded ceremony**, not a real
per-request HTTPS/bootstrap implementation. It is not wired into the normal HTTPS
client, routes, default composition, Worker runtime or provider. A production
adapter cannot obtain qualification by copying these marker strings.

The [synthetic suite](../../src/tests/worker-bootstrap.test.ts) covers first
enrollment, recovery with/without an existing candidate, revoked host/installation,
wrong owner/bindings/keys, expiry/replay, 20 concurrent same-ticket and distinct-
ticket consumers of one generation, pre-send zero-exchange drift, post-commit
unknown, certificate cutover/epochs, signature/completion integrity, missing
dependencies, read-only status, rollback, deadline, redaction and buffer wiping.
Socket, HTTP, DNS, fetch and child-process APIs are trapped with zero calls. The
normal inactive-credential rejection is explicitly tested. Server build, lint
and the 73-result source regression selection pass; real HTTPS, native database,
API, web and deployment suites were not run.

`transportQualified`, `implementationReady`, `executionSupported`, `pilotReady`,
`liveAdmissionAllowed`, `pilotExecutionAuthorized`, `pilotExecutionStarted` and
`launchAuthority` all remain false. No task, provider, model, approval, launch or
execution authority is created.

**Exactly one proposed next atom:** source-only durable bootstrap ledger adapter
and additive, unapplied schema design with mocked transactional rollback/replay
tests. Preserve the ordinary admission boundary; no native database application,
provisioning, endpoint calls, default composition or activation in that proposal.
