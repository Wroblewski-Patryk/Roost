# Production Worker transport admission v1 — source contract

Owner amendment v27, 2026-09-23. **DONE for schema, authority and state-machine
qualification: 9/9 results (eight scenarios plus parent), 36/36 selected source
tests. PARTIAL: persistence. BLOCKED: production use.** This extends the existing
[handoff](worker-credential-lifecycle-v1.md), [HTTPS adapter](worker-handoff-https-v1.md)
and primary-owner decision system. It is not a new PKI, proxy or configuration
service. No production endpoint, DNS, CA, database, Docker or deployment is used.

## Existing authority and exact record

`workerTransport` is a strict optional declaration in the existing governed
decision proposal. It cannot coexist with delegated `authority` or a credential
lifecycle declaration. Resolution reserves it to the current primary owner.
The [service](../../src/modules/api-keys/worker-transport.service.ts) separately
requires current primary ownership/membership, a user authentication time no more
than five minutes old, and exact accepted decision ID, revision, owner and intent
digest. Old/expired/revoked decisions and changed intent are denied. Issuer-signed
decision evidence is mandatory; a caller's JSON assertion is insufficient.

The versioned signed record binds:

- Workspace, installation, registered host and host fingerprint.
- Credential ID, version, binding epoch and fingerprint; current active status is
  read separately. Server ticket key ID, epoch and public-key digest are also bound.
- Exact lowercase DNS HTTPS origin with **explicit port**, including `:443`, and
  matching SNI/TLS server hostname. No URL credentials, path, query or fragment.
- Leaf certificate SHA-256 over DER, validity interval and hostname; public CA
  digest and `owner_approved_ca_digest` trust mode. No private key or certificate
  provisioning payload is accepted.
- Current certificate epoch, reserved high-water epoch, record revision, current
  owner decision/revision/digest, approval time, expiry and unique command ID.
- Optional staged next certificate/epoch and owner-approved evidence, overlap,
  cutover and expiry; fixed no-proxy/no-redirect/no-downgrade and resolver policy.

The production profile intentionally preserves explicit `:443`; it is not passed
to the loopback adapter by silently normalizing or converting its profile. That
adapter still accepts only its separate loopback qualification state.

## Out-of-band bootstrap

The minimal bootstrap flow presents the exact workspace/installation/host,
credential/ticket epochs, origin/SNI/port, CA digest, leaf fingerprint and validity
to a freshly authenticated primary owner. The owner compares the fingerprint
through an independently obtained channel, records its evidence digest and accepts
the exact governed decision. The trusted issuer public key must also come from an
already approved independent installation context, not that untrusted endpoint.

`owner_out_of_band` evidence is required for the initial and staged certificate.
Endpoint-only discovery, self-asserted TLS evidence and trust-on-first-use are
denied. This records an explicit owner attestation; it does not implement or prove
the external verification channel. No external bootstrap UX or channel is built.

## DNS and peer evidence

The first profile is deliberately **public IPv4 only**. Literal-IP origins,
single-label/local hostnames, private, loopback, link-local, shared-address,
documentation, benchmarking, multicast and reserved IPv4 candidates deny. All
IPv6 candidates deny until a separate policy is qualified. There is no generic
DNS override. Public test address strings are evidence values, never contacted.

An issuer-signed observation binds the exact identity, origin, SNI, chosen peer,
complete bounded candidate set (1–16), certificate pin/validity, CA digest and
normal chain/hostname-validation results. Its lifetime and maximum age are
30 seconds. Every candidate must be allowed and the actual peer must belong to
that set; a rebinding to any disallowed address fails closed. Changing a public
IP does not change origin authority: the same hostname, certificate/pin and
owner-approved record remain mandatory.

These are synthetic signed metadata checks. They do not perform DNS, parse a
production certificate or independently validate a real TLS chain. Future
composition must obtain trusted observations and check normal TLS plus the peer
pin **before any body is sent**, as established by the loopback adapter. An
untrusted endpoint cannot supply its own admission evidence.

## Rotation, replay and revocation

Each command compares the current server-head revision and signed-record digest,
consumes a unique request/decision and atomically appends history plus audit.
Neither failed commands nor transaction failures leave partial history.

- Create starts at certificate epoch 1. A fresh admission after a terminal revoke
  requires a new owner decision, unused pin, exact new identity and an epoch one
  above the retained high-water mark. A reserved staged epoch is not reused.
- Stage preserves the current certificate/profile and expiry, reserves exactly
  current epoch + 1 and requires a distinct unused next pin. Overlap cannot start
  in the past or exceed one hour. Staged expiry is after cutover, no more than one
  hour later and no later than record expiry. Certificates must already be valid
  and remain valid through their admitted interval. Records last at most 24 hours.
- Before overlap only current is accepted; in overlap current and next; from
  cutover only next. A separate current-owner cutover decision promotes the exact
  staged certificate. Early/late cutover, skipped epochs and same-epoch profile
  mutation deny. Expired staged state blocks use; no automatic promotion or rollback.
- Revoke is terminal and immediately blocks a new inspection. It remains possible
  after credential/host activity drift using a fresh decision for the exact old
  head and the current trusted issuer. It cannot transfer the old admission to a
  new identity. A new admission is required for changed credential/key bindings.
- An in-flight completion checks the current head/decision again. Revocation or a
  changed head yields terminal unknown/blocked, never retry or new authority.

Lost next certificates and bad rotations require another owner decision and
terminal reconciliation; there is no automatic return to an old pin. Memory
qualification serializes concurrent stage/cutover/revoke and proves one winning
state; it does not establish PostgreSQL concurrency guarantees.

## Local anchor and remaining rollback risk

Inspection requires an exact local anchor containing identity, record revision,
signed-record digest, certificate epoch and high-water epoch. It is checked against
the **current authoritative server head**, its issuer signature and current owner
decision. Old signed records, changed local fields, missing anchors and copied
state from another installation/host fail these checks. There is no default
composition without that independently current head/decision and exact anchor.

Writable local state is **not a security root**. An attacker controlling the same
system account could roll back an anchor and any co-located mutable view of the
server head together. Signatures alone do not prove freshness; a previously valid
signed snapshot may remain cryptographically valid. Compromise of issuer key
material makes this weaker still. This atom does not solve coordinated same-account
rollback, protect an OS keystore, add hardware monotonic storage or qualify a
production issuer. Production use remains blocked pending independently trusted
freshness/monotonicity and explicit provisioning qualification.

## Evidence and persistence status

The [synthetic suite](../../src/tests/worker-transport.test.ts) uses ephemeral
Ed25519 signing objects through the existing owner-ticket signer shape and a
rollback-capable in-memory history/audit ledger. No TLS certificates, Worker
credentials, key files or durable records are provisioned. Test guards forbid
network, DNS, fetch, sockets and target processes; observed effect count is zero.
All six admission flags and `transportQualified` stay false, including success.

Tests cover owner/decision/auth/signature denials, origin/SNI/certificate/bootstrap,
DNS candidates/rebinding, staged pins/expiry, epoch/revision rollback and replay,
concurrent state transitions, credential/host/installation/ticket-key drift,
anchor substitution/copy and rollback after append/audit/precommit. Build, lint
and source regressions pass. Real TLS/HTTP, native database, full API/web and
production deployment suites are not run in this source-only atom.

There is **no persistence adapter or migration for this record yet**. Existing
applied migrations remain untouched. Native uniqueness, audit guards, locking,
durable high-water/revocation storage and crash recovery remain unqualified.

**Exactly one proposed next atom:** implement a source-only Prisma persistence
adapter and additive, unapplied migration for this admission ledger, with
synthetic transaction/rollback tests. Keep real database qualification for a
separately authorized later atom; no production endpoint, provisioning or activation.
