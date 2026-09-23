# Worker handoff loopback HTTPS adapter v1

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

Current successor v27: [production admission source contract](worker-transport-admission-v1.md)
passes 9/9 synthetic results and 36/36 source tests; it adds no production
transport composition. Exact owner authority, signed metadata, epochs and local
anchor checks are qualified only in memory. Persistence remains absent and
same-account rollback is not solved. The single next atom is a source-only Prisma
adapter and additive unapplied migration with synthetic transaction tests.
The v26 evidence below remains valid; its former next-atom proposal is historical.

Owner amendment v26, 2026-09-23. **DONE for bounded loopback HTTPS adapter
qualification: 9/9 results (eight scenarios plus parent).** Production TLS/DNS,
certificate provisioning, secret storage and launch remain **BLOCKED**. This
extends the [handoff lifecycle](worker-credential-lifecycle-v1.md); it does not
enable its default routes or any of the six admission flags. No database or
Docker operation is part of this atom.

## Explicit composition and authority

The [adapter](../../src/modules/api-keys/worker-handoff-https.ts) accepts only the
explicit `loopback_https_v1` state, canonical HTTPS origin, loopback address,
injected public CA, exact certificate pin policy and sealed timeouts. Missing or
unknown configuration returns a fixed unavailable result. There is no production
state, configuration discovery, environment switch or default dependency.

The typed client exposes only `send(action, body)` and `close()`. Allowed actions
are request, poll, ACK and status, each mapped to one existing handoff POST route.
Owner approval uses the existing independent owner decision/service path; this
device transport cannot approve. There is no caller-supplied URL, path, method,
header, authorization token, redirect handler, tunnel or generic fetch facility.
Strict existing request/proof schemas reject additional fields and bound device
proofs. Proofs use canonical base64url on the wire and never headers.

## TLS, origin and pins

An origin must equal its canonical URL origin exactly: HTTPS, lowercase DNS host,
exact non-default port (or implicit 443), no credentials, path, query or fragment.
This qualification accepts DNS names mapped explicitly to `127.0.0.1` or `::1`;
IP-literal origins and non-loopback addresses are unavailable. No operating-system
DNS resolution is used or qualified. The configured DNS hostname remains the TLS
SNI and normal certificate hostname check. The connected address is checked before
sending the body.

Normal Node TLS chain, hostname and validity checks stay enabled with
`rejectUnauthorized: true` and TLS 1.2 or newer. **The pin is SHA-256 of the entire
leaf certificate DER**, matching the existing `certificateFingerprint` contract;
it is not SPKI. A matching pin never replaces CA, hostname or time validation.
The explicit test CA is scoped to each connection; system trust is not modified.
Bodies are sent only after the authenticated handshake and address/binding checks.

The immutable pin policy has one positive epoch and current pin. An explicitly
staged next pin must differ, use exactly epoch + 1, and specify an overlap start
and cutover with positive overlap no longer than one hour. Before overlap only
current is accepted; during overlap current and next; at/after cutover only next.
Unknown and old pins deny. Every connection performs a fresh handshake: no TLS
session cache or shared global Agent. This is a test-fixture rotation contract,
not real certificate provisioning or persisted epoch/rollback protection.

A request created by a client additionally binds that client request ID to its
exact approved certificate fingerprint. A staged transport pin cannot silently
move an existing request to a different certificate. Such a transition requires
a new request and owner decision. Fresh clients still require the complete exact
transport configuration; they cannot claim an earlier pending ACK session.

## Redirect, proxy and resource boundaries

Every 3xx response is denied, including same-origin redirects and downgrade.
Each connection uses an isolated direct HTTPS Agent; HTTP_PROXY, HTTPS_PROXY,
ALL_PROXY, their lowercase variants and environment proxy enablement are ignored.
There is no PAC resolver, proxy support or change to system proxy/firewall/registry.

Request/response JSON is limited to 8192 bytes and response headers to 4096 bytes.
Responses require a bounded Content-Length and JSON media type. Chunked encoding,
compression, malformed UTF-8/JSON, additional fields and unexpected response
shapes are rejected. Only poll may return a bounded raw key, with matching
request/workspace/installation/host metadata and inactive credential projection.
Server diagnostics and response headers are never forwarded to the caller.

Configuration seals connect/handshake and idle-read timers (25–5000 ms), plus an
overall deadline (50–10000 ms, no shorter than either timer). Read activity cannot
extend the overall deadline. At most 32 operations may be in flight and 128
request IDs retained per client; capacity exhaustion denies instead of evicting
replay history. Close cancels all owned connections. There are no automatic retries.

## Uncertain delivery, ACK and redaction

Once a request body may have reached the server, connection loss or timeout returns
`delivery_unknown`. The same client refuses another poll/ACK for that uncertain
request. Status remains available for reconciliation; a new enrollment and owner
decision are required to recover a lost credential. A failed post-commit response
never triggers another poll, generator invocation or secret disclosure.

Only a client that received the pending credential may send its ACK. Concurrent
or subsequent ACK replay is denied locally; the service separately retains its
existing terminal, non-reactivating replay semantics. A restarted client is not
durable secret storage and cannot automatically resume ACK authority.

Only fixed diagnostics leave the adapter on failure. It does not log URLs, CA
material, headers, bodies, device proofs, raw credentials or native TLS errors.
Owned request/response/proof buffers are zeroed. Returned credential strings and
TLS library heap copies cannot be claimed erased; production secret handling is
unqualified. `transportQualified`, provisioning and launch authority remain false.

## Evidence and cleanup

The [real HTTPS tests](../../src/tests/worker-handoff-https.test.ts) compose the
existing service and handler with a serialized synthetic backend and independent
owner approval. They cover 20 polls/one secret, 20 ACKs/one admitted ACK, normal TLS
and exact pinning, untrusted/self-signed/expired/future/wrong-host certificates,
wrong certificate/SPKI pins, current/next/old pin transitions, rejected origin and
operation changes, poisoned proxy environment, redirects, response bounds, stalls,
deadline and lost-response recovery. All traffic is loopback; target process APIs
are forbidden after the certificate-generation utility exits.

The Python fixture generator requires the test environment's `cryptography`
package. It creates certificates and private keys in memory and passes them to
the test through a captured pipe; it creates no certificate/key files. There is
no committed test private key. The tests check closed servers, sockets and timers,
zeroed owned key buffers, no secret-bearing diagnostics/artifacts and unchanged
false admission flags. They modify no system trust, network settings or private
installation state. Existing dirty docs, unread design artifact and retained roots
are outside the mutation scope. Full API/web, native PostgreSQL and production
deployment tests are not run in this transport atom.

**Exactly one proposed next atom:** define and synthetically qualify the
production HTTPS/DNS/certificate admission contract for an exact installation and
host, including explicit owner authority and certificate epoch rollback denial.
Do not provision real certificates or credentials, integrate a secret store,
contact a production endpoint or activate a Worker/provider/model. Stop after
that source-only admission atom.
