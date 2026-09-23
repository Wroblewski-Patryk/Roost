# Worker owner-ticket consume and status contract v1

Owner amendment v20, 2026-09-23. **DONE: source contract and synthetic
auth/binding/status qualification. PARTIAL: persistence/real integration.**
The new additive migration has not been applied or tested on PostgreSQL in this
atom. The v19 database result qualifies its earlier code/schema only. No Worker,
provider, real signing key, credential provisioning or network qualification ran.
All six readiness/activation flags remain false.

## Existing authority and endpoint composition

This extends the existing API-key middleware, AgentHost, execution claim,
owner-ticket service and Prisma adapter. It introduces no second credential
system, queue, issuer process or environment activation switch. The application
still mounts handlers without a signer/evidence service: eligible owners or
bound Workers receive unavailable; unbound keys and other principals are denied.

All routes are POST under `/v1/agent-runtime/owner-tickets`, with `no-store`:

| Route | Authorized principal | Effect |
| --- | --- | --- |
| `issue` | Current primary human owner | Exact explicit acceptance and new immutable ticket |
| `consume` | Primary owner, or exact assigned Worker | Same atomic one-use transition and signed acknowledgement |
| `status` | Primary owner, or that same assigned Worker | Read-only bounded observation; never an acknowledgement |
| `revoke`, `rotate` | Current primary human owner | Existing explicit terminal/key operations |

Worker consume/status use the existing `agent-runtime:claim` capability. Scope
membership alone never proves Worker identity. A human may still consume through
the existing owner path; supplying a Worker proof under a human JWT is forbidden.
Agent-bound API keys, generic keys, profile labels and self-reported host metadata
cannot substitute for a Worker binding. A Worker cannot issue, revoke or rotate.

## Credential and immutable ticket binding

[Existing middleware](../../src/auth/api-key.middleware.ts) verifies the token
against the existing `ApiKey` row and derives a
[Worker projection](../../src/auth/worker-ticket-principal.ts) from persisted
fields. A usable credential must be active, unrevoked, unexpired, hashed-only,
not agent-bound, and explicitly carry the claim scope, workspace, registered host,
installation ID, credential version and positive binding epoch. The fingerprint
is SHA-256 of a domain-separated stored key hash; neither the raw credential nor
that stored authentication hash enters the ticket ledger or response.

The additive [migration](../../prisma/migrations/20260923110000_worker_ticket_binding/migration.sql)
adds nullable binding columns to `api_keys`; existing rows remain unbound. It
permits one active bound credential per workspace/host, validates host/workspace
and installation against the existing public key head, prevents retargeting or
resurrection, and requires increasing epochs for replacement bindings. Revocation
advances the credential version under the existing Ready fence. No row is seeded
or converted. Existing credential creation and host registration APIs do not
provision these fields. A governed provisioning workflow remains future work.

At owner issuance, the adapter snapshots the bound credential identity/version/
epoch, host/installation, original claim session, lease-token digest and earliest
credential/claim deadline into `trusted_provider_ticket_worker_bindings`. This is
an immutable extension of the existing ticket ledger. Native guards validate the
exact credential and execution row; only IDs, digests, versions and a deadline are
stored. The parent ticket binds task, execution, attempt, decision/revision, key
epoch, ticket digest and challenge. Its owner-confirmed context digest includes
the Worker binding, Ready, input, Writer, contract and checkpoint. Issuance,
binding, journal and Event share the same transaction. Legacy unbound tickets
remain owner-only and cannot silently acquire Worker authority.

A Worker supplies `worker: {hostId, installationId, leaseToken}` alongside the
existing consume binding fields. The lease token is transient input only; the
server compares its digest to the immutable binding and reconstructs the current
claim before consumption. It independently rereads the credential inside the
Serializable transaction, compares the authenticated projection with the stored
snapshot, and resolves the current host/workspace. A stale middleware snapshot,
another key, changed host/installation/version/epoch or lost claim cannot consume.
Claim/lease/checkpoint changes invalidate the snapshot; they never renew it.

Owner and Worker consume share the same lock, CAS, original consume ID, immutable
journal and attempt spending. Audit records distinguish a host credential from a
human actor without pretending that the Worker is the owner. Failure rolls back
the whole transaction; no automatic retry or reissue exists. Neither successful
consume nor status creates a launch receipt or bypasses managed-Hermes gates.

## Read-only, nonrenewable status

Status accepts the ticket ID/digest and exact task/execution/attempt/challenge/
claim digest, plus the Worker proof for Worker callers. An optional `consumeId`
must match the original. The same assigned Worker may recover a lost response's
original ID for audit/reconciliation; possession of that ID grants no authority.

The response contains only `state`, a bounded `reason`, original `consumeId` or
null, `renewable=false`, and the existing false qualification/launch flags. It
contains no ticket, acceptance, signature, challenge, credential fingerprint,
lease token, new expiry or fresh acknowledgement. Reasons are:
`current_unconsumed`, `spent_reconcile_only`, `revoked`, `key_changed`, `expired`,
`not_yet_valid`, `issuer_unavailable`, `decision_changed`, `claim_changed`,
`context_changed`, `context_unavailable`. Every result has `launchAuthority=false`.

Prisma uses a Serializable `SET TRANSACTION READ ONLY` transaction: no source
fence update, row lock, Ready invalidation write, Event or transition. Middleware
also skips credential usage writes for this route, including a trailing slash.
Repeated polls cannot extend any ticket, claim, Writer, decision or key deadline.
Expiry can be observed while the stored ticket state remains unchanged; status
never writes an `expired` transition. Consumed tickets stay consumed even when
rotation or later drift produces a blocking reason.

Authorization first checks the original credential/binding and lease proof.
An unchanged assigned credential can observe loss of its original current claim
as blocked; an inactive/revoked/replaced credential is denied before any state or
consume ID is disclosed. The primary owner retains the separate inspection path.
Unknown evidence and read failures fail closed. Status is an unsigned diagnostic
observation in this slice, not a production refresh authorization or lease.

## Verification and remaining gates

**102/102 tests PASS**: 48 new Worker-channel tests and 54 existing ticket/provider
regressions. Tests exercise the real HTTP handlers/auth middleware with synthetic
credential storage and signer, read-only Prisma adapter calls with a mocked
database, and a rollback-capable in-memory ledger. One of twenty concurrent
owner/Worker consumes commits; other calls deterministically deny replay. The
original consume ID, journal/Event/attempt counts and deadlines remain stable
under repeated status polls. Wrong credential/host/installation/workspace/version/
epoch, stale claim/Ready/Writer/input, expiry, revocation, key rotation, recovery,
agent/user confusion and direct/manual provider substitutions deny. Target process
APIs are forbidden in the positive scenario. TypeScript build, route lint and
Prisma schema validation pass.

These are **not** PostgreSQL concurrency, native trigger or TLS results. The new
SQL was reviewed as additive/non-destructive; applied migration files were not
edited. No database, container, real profile, model store or retained temporary
root was touched in this atom. No full API/Worker suite, web build, migration
deploy, push or production deploy ran. Default service composition and physical
evidence reconstruction remain unavailable. Secure credential provisioning,
HTTPS origin/bootstrap and authenticated transport/status-to-launch integration
remain blockers; direct Codex and manual Hermes gain no authority.

**Exactly one proposed next atom:** qualify the new additive binding migration,
native credential/host guards and read-only status semantics on an explicitly
authorized owned disposable PostgreSQL database, including owner/Worker races
and revocation races. Use only synthetic keys/evidence, fix only findings, verify
cleanup/preservation, and stop. No real credential provisioning, TLS claim,
provider launch or activation.
