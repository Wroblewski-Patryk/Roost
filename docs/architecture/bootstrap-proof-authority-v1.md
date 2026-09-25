# Bootstrap peer, completion and binding signing authority

Owner amendment v72. **Approved source-only authority contract; persistence and
cryptographic verification BLOCKED.** This resolves the v71 *model decision*
gap, not its missing canonical persisted history or production verifier.

## Principals and public history

| Messages | Principal / purpose | Root and exact binding | Private responsibility |
| --- | --- | --- | --- |
| peer, completion | `local_worker` / `worker-bootstrap-proof-v1` | Per-installation public-key stream, existing workspace/installation anchor; each key generation binds installation generation, host ID and host generation | Local Worker generates its dedicated key locally; private key stays OS-protected on Windows |
| binding | `roost_server` / `bootstrap-completion-binding-attestation-v1` | Separate workspace public-key stream; each ceremony additionally binds the exact installation/host lifecycle generations through its owner-approved attachment | Separate Roost key, private part exclusively in the server secret store |

Neither principal may reuse ticket issuer or owner-decision attestation authority
or material. The same key ID or DER digest cannot be used across Worker/server
histories, including retired/revoked generations. Reader snapshots must include
the reserved public digests from all ticket-issuer and owner-decision histories;
reuse denies. The Worker root survives lifecycle generation changes so epochs
and revoked-key records cannot be reset by recreating the host. A server key can
serve multiple installations only through separate exact approved attachments.

`bootstrap-proof-key-contract.ts` reuses only the existing strict **public
material parser**, not the ticket issuer's purpose or authorization. Material is
Ed25519, canonical base64 of exact 44-byte SPKI DER with prefix
`302a300506032b6570032100`, and SHA-256 of those DER bytes. No PEM/raw-hex fallback.
Public provenance is an evidence digest plus `local_worker_os_protected` or
`roost_server_secret_store`; it is not private storage or proof of possession.

Each stream has separate owner-approved create/adopt/stage/cutover/retire/revoke
history. Create starts at epoch 1; adopt preserves the explicitly approved legacy
epoch and requires adoption evidence and exact existing public anchor matching
in the future writer. Both are prospective: signing/issue before the first
record denies. Missing history is blocked, not automatically adopted. Stage
reserves high-water + 1 with a never-used key ID/digest and exact provenance;
Worker stages also pin their lifecycle generation. Epochs stay consumed after
revocation. Overlap is positive and at most five minutes. Predecessor deadlines
can only shorten, including when a staged successor is revoked. At hard cutover,
old keys fail even for previously issued tickets; the staged successor also
denies until an explicit cutover record retires predecessors. Retire ends an
eligible expired generation; revoke is terminal, including after retirement.
Readers never advance lifecycle state or extend overlap.

Event revision, previous event digest, monotonic writer fence, unique operation/
decision/audit IDs, exact decision-intent digest and receipt digest are checked
by pure replay. History digest is the digest of the final event, transitively
binding predecessors. These structural checks **do not authenticate** a mock
owner, provenance statement, receipt or database record.

## Owner decision and ticket attachment

`bootstrap-proof-authority-v1` binds workspace, installation, current host and
installation generations, owner, exact accepted decision ID/revision, reserved
enrollment generation, purpose, fresh ticket/request IDs and both public key
references. Each reference includes principal/purpose, key ID, algorithm,
format, DER digest, epoch, high-water, revision and complete history digest.
Both histories must exist before the bootstrap decision is accepted. Key
lifecycle decisions are separate from the subsequent bootstrap decision, avoiding
a digest cycle. The accepted decision and ticket carry the exact attachment
digest before issue and seal. The final signed ticket envelope digest is bound
by each message transcript; it is not embedded inside its own attachment.

First enrollment requires enrollment generation 1, no predecessor and zero
credential high-water. The owner-approved ticket therefore binds the public
Worker key before any delivery. Recovery additionally needs a canonical terminal
prior ceremony with revoked credential, the exact historical Worker key reference,
a currently revoked prior proof key, a fresh higher proof-key epoch and different
decision/ticket/request IDs, plus enrollment generation + 1. Reusing an active or
revoked predecessor proof key is denied. Host/installation revocation or generation
mismatch always denies; this contract never reactivates an installation.

## Exact bytes and compatibility

`bootstrap-proof-encoding.ts` defines a proposed bounded binary encoding, not
JSON serialization. Scalars: null `n`, true `t`, false `f`; safe integer
`i<byteLength>:<ASCII decimal>`; string `s<byteLength>:<UTF-8>`. Arrays are
`a<count>:` followed by ordered elements; objects are `o<count>:` followed by
string key/value pairs sorted by UTF-8 key bytes. Counts/lengths have ordinary
unsigned decimal spelling without leading zeros. Containers and scalars are
self-delimiting. Example: `{b:[1,true,null],a:'x'}` is
`o2:s1:as1:xs1:ba3:i1:1tn` regardless of object insertion order.

Strings must already be NFC and contain no unpaired surrogate or ASCII control/NUL
characters; no normalization occurs while signing. Undefined, non-finite or
fractional/unsafe numbers, negative zero, bigint, sparse/augmented arrays,
non-plain objects, accessors, symbols, hidden properties and cycles reject.
Limits: depth 32, 4096 container members, 131072 encoded bytes. Raw JSON input
is not accepted by the encoder. A future wire decoder must reject duplicate
keys, noncanonical lengths/order/UTF-8 and trailing data before typed projection;
JSON.parse followed by this encoder is **not** that decoder.

The exact signed tuple is the encoding of
`['roost-bootstrap-signing-binary-v1', domain, attachment, context, payload]`.

| Kind | New domain | Exact payload schema |
| --- | --- | --- |
| peer | `roost-worker-bootstrap-peer-proof-v1` | Current canonical peer payload |
| completion | `roost-worker-bootstrap-completion-proof-v1` | Current canonical completion payload, including peer |
| binding | `roost-bootstrap-completion-binding-attestation-v1` | Current `completionBinding` payload |

Context binds authorization digest, ticket ID/envelope digest, request/attempt,
seal digest, dispatch predecessor digest and lifecycle generations. The entire
typed payload is signed, including existing credential, certificate/SNI/address,
time, dispatch and response fields; no field subset or JSON digest substitutes
for it. Required payload/context identity links and issue/signing time ordering
are checked. Existing `validateCompletion` remains mandatory for full relational
credential/transport/dispatch validation in a future integration. Signatures are
exactly 128 lowercase hex characters (64 bytes), with no alternate encoding.

Compatibility proposal: introduce a new ticket v3 carrying this attachment in
the accepted intent and a new explicit signed-proof envelope/version. Preserve
existing v1/v2 bytes, historical signatures, migrations and records. Do not
upgrade, backfill, re-sign or reinterpret them. Existing payload schemas can be
embedded unchanged inside the new transcript. Their internal legacy digest
fields remain bound as data and must also pass current canonical validation.
Legacy tickets without the attachment/history cannot enter this new path; no
version negotiation downgrade or fallback verifier. Ticket v3 persistence,
strict decoding and production wire integration are **not implemented here**.

## Same-Db seam and uncertainty

`bootstrap-proof-authority-contract.ts` exposes explicit
`source_only_mock_proof_ports_v1` read/verify ports. The caller supplies the same
bound transaction Db to both. Strict snapshot validation precedes verification;
fresh key/source/clock reread follows it, even for a false verdict. Snapshot
drift, owner/lifecycle/ticket change, expired time, revoke, hard cutover, modified
verification bytes or any exception denies. Time may advance without changing
other authority facts. Exact history references deliberately invalidate pending
tickets after any key-history change, even if an overlap could otherwise permit
the key. Re-approval/re-issue must be explicit, never a read-side repair.

The boundary model never sends. `before_send` failures return denied;
`after_send` failures return reconciliation_required, retryable=false. A real
adapter must persist uncertain delivery and reconcile from independent exact
evidence, never infer rollback, resend or activate from a verifier response.
Future writers must hold the shared source fence through their operation and
revalidate immediately before commit; a repeatable-read snapshot alone cannot
prove external freshness. Native concurrency/commit qualification remains absent.

## Minimal additive persistence proposal and all writers

No schema/migration is created in v72. Proposed additions only:

- Worker proof history and immutable audit/receipt children of the existing
  workspace/installation key anchor, with exact host/lifecycle foreign keys.
  Server binding history and audit/receipt children of the existing workspace.
  Separate purpose-constrained streams, no parallel installation/identity root.
- Versioned attachment children of existing accepted decision revisions and
  bootstrap ticket/attempt/seal roots, carrying both references and attachment
  digest. Composite foreign keys enforce workspace/install/host/generation and
  decision/ticket identity. Recovery points to immutable predecessor evidence.
- A prospective writer reserves current owner authority under ready_source_fence,
  validates provenance/adoption, canonical history, exact expected revision and
  high-water, and atomically appends event, audit, Event/native writer receipts.
  COMMIT success requires independent exact readback; ambiguity is non-retryable.

All-writer inventory: no current production writer/route/seed/import exists for
these new purposes. Future explicit key writer, decision acceptance/supersession,
ticket issue/seal, host/installation lifecycle and owner-membership changes,
completion/dispatch, direct Prisma/SQL, seed/import/admin/maintenance and
audit/receipt triggers must be covered by the same fence and required guard
catalog. Insert constraints and update/delete/truncate denial apply to every
child; triggers cannot bypass lineage or audit. The existing owner-ticket issuer
writer and owner-decision writer retain their own purpose and cannot populate
these children. The mock inventory literal is a test declaration, not native
all-writer proof. Guard SQL, source fingerprints, native receipts and runtime
reader/writer are blockers requiring later implementation and qualification.

## Status and verification boundary

Source/mocked verification: **17/17 new-model results; 73/73 selected results
PASS**, zero failures/skips/cancellations, exit 0 (24.413 seconds). Tests cover
first enrollment/recovery, separate purposes, lifecycle/adoption/overlap/cutover/
retire/revoke, stale/replayed keys, owner/ticket/lifecycle mismatch, deterministic
bytes and rejected ambiguous values, same-Db read purity, 20 readers versus stage
and 20 versus revoke, time crossing cutover inside verify, before/after-send
drift, malformed signatures and unavailable/default verifier. No write or send
port exists. Low-level crypto/private-key/sign/network/process effects and captured logs
are zero. Server build, lint (338 routes / 45 files) and three contract pins PASS.
An initial TypeScript fixture nullability error was corrected before this final
passing run. Native SQL, real cryptographic vectors, wire decoding and web build
were not run or qualified; existing signing-key-generating suites were excluded.
Diff checks and new documentation links pass. Default context is 143831 bytes
against the 150000-byte limit. All 85 migration directories, Prisma schema,
existing runtime modules and native runner remain unchanged from
`f2dff9a6e3417aec7b21dbe00ffd6da07e08ae7a`.

Private operations exist only as two external TypeScript interface declarations.
No generator, signer, private key, seed, key handle, OS storage or server secret
adapter is implemented or called. Tests use the three fixed public points already
in bootstrap-issuer tests and synthetic verification verdicts; they contain no
signed vectors and do not qualify Ed25519 signature verification.

RF-HOST-035 PARTIAL; production/default verifier unavailable. All eight existing
flags stay false: implementationReady, executionSupported, pilotReady,
liveAdmissionAllowed, pilotExecutionAuthorized, pilotExecutionStarted,
transportQualified, launchAuthority. Registration UNKNOWN / MONITORED RESIDUAL
RISK. Canonical persistence, strict transport decoding, public cryptographic
verification, possession, delivery and provisioning remain blocked. No DB,
Docker, network, delivery, credential creation, endpoint, default wiring,
activation, push or deployment. Unrelated dirty documents and retained artifacts
are untouched; design-qa.md is unread/untracked/unstaged.

Exactly one next recommendation, not started: implement the source-only additive
public proof-key/attachment persistence contract and explicit same-Db reader,
including all-writer guards and receipt/readback rules; leave migration unapplied
and production wiring unavailable until separately qualified.
