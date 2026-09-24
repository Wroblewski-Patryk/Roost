# Owner decision attestation persistence proposal

Owner amendment v51. Source-only specification and executable transaction/key
models; no migration, Prisma schema change, database, signing or activation.
This resolves the trust choice left open by the
[v50 inventory](bootstrap-signed-current-decision-v1.md). That inventory remains
the writer/source reference; its hypothetical owner-key signing format is
historical and is not an alternative production authority route.

## Trust boundary

Roost authenticates the primary owner's exact acceptance through its existing
session and authorization checks against `workspaces.owner_user_id` and current
membership. The conservative bootstrap sole-owner rule remains: ambiguous owner
membership denies. A dedicated installation server key with immutable purpose
`owner-decision-attestation-v1` then attests that canonical acceptance after
rechecking owner, intent, sources, authentication evidence and validity under the
shared source fence. This is a server attestation of authenticated owner action,
not a personal cryptographic signature by the owner.

The private key exists only in the installation's private configuration/secret
store. It must never enter a database, repository, log, fixture, model state,
request or verifier. Server configuration selects the signing key; a request
cannot choose it. Public provenance records bind installation, purpose, key ID,
algorithm/format/material digest, epoch, authorized installation configuration
evidence and public-material verification evidence. Initial create/adopt is
authorized by the installation operator's private configuration boundary, not by
a self-signed row or possession of an ordinary database role. Later lifecycle
commands require current owner authorization and existing trusted configuration.
Database history alone cannot establish the external secret-store trust root.

The baseline authentication evidence level is `roost_session`, bound to owner,
workspace, exact acceptance, authentication and acceptance times, policy revision
and an opaque session-evidence digest. Store no session token or cookie. Require
fresh authentication (at most five minutes) when attesting and check freshness
again after signing. The stable evidence-level field permits future
`roost_session_2fa` / `webauthn` strengthening without changing payload shape;
neither authentication flow is implemented or required here. Missing historical
authentication evidence must not be invented from an acceptance timestamp.

Bootstrap issuer purpose remains `worker-bootstrap-owner-ticket-v1`. Its keys,
provider owner-ticket signatures and existing `worker_bootstrap_tickets.record`
decision signature slots cannot be reinterpreted as this new server attestation.
No default signer, verifier, canonical provenance resolver or composition exists.

## Minimal additive persistence design (not implemented)

| Existing anchor / proposed additive change | Required invariants |
| --- | --- |
| `decisions.authority_revision` | Add a monotone authority counter on the existing decision root. No second decision registry or current-decision head. Canonical revision/acceptance and successor queries still determine decision truth. Legacy counter/history gaps deny. |
| `decision_owner_auth_evidence` child of exact acceptance | Immutable public evidence/digest/level and policy revision with composite decision/workspace/owner/acceptance references. Current owner and membership are joined live, never copied as lasting permission. |
| `decision_attestations` child of revision + acceptance | Immutable payload, signature, algorithm/purpose/version, signing-key creation-history reference and authority revision. Unique exact acceptance and authority revision; no overwrite or re-attestation of a consumed/revoked old acceptance. Composite references enforce workspace/owner/decision consistency. |
| `decision_attestation_key_history` child of workspace/installation | Append-only create/adopt/stage/cutover/retire/revoke public events with predecessor digest and monotone revision/epoch. Derive high-water and eligible generations from history; no independent key authority head. Purpose and material cannot be relabelled. |
| `decision_authority_events` child of existing decision | Append-only source/attest/terminal events with authority revision, relevant immutable digests, prior digest and time. Supersede/revoke/expire/reject are terminal for the old attestation. Source-revise invalidation does not mutate an existing `decision_revisions` row; governed replacement still uses its new canonical decision ID. |
| `decision_authority_write_receipts` plus existing `events` | Exact journal/event/digest/fence/writer-transaction receipts, unique and atomic with every covered source write. Key lifecycle receipts carry the same workspace/installation scope. No opportunistic repair from reads. |
| Existing `worker_bootstrap_attempts` + history/audit | Extend the existing unique `ticket_id` attempt seal with attestation ID/digest, decision authority revision, source digest and start fence. Preserve one-ticket/one-attempt and generation rules. Append dispatch/completion evidence to the existing attempt history; no competing attempt registry. |

The in-memory test model groups these proposed rows into a snapshot for atomic
rollback tests. Its `canonical`, `keys`, `journal` and `seals` arrays are not
proposals for another database root/head or production snapshot-blob table.
Model `started/dispatched/completed` phases map to existing attempt lifecycle
semantics; an adapter and additive constraints still need specification in SQL.
Keep existing data intact and unqualified until complete provenance/history
exists. No automatic backfill, migration application, reset or new seed.

## Immutable payload and digest graph

Payload version/purpose is `owner-decision-attestation-v1`. It binds exact
decision ID/revision/body digest, acceptance ID, current primary owner/workspace,
owner-auth evidence digest/level, first-enrollment or recovery purpose, exact
intent/evidence, ticket ID/content/envelope digests, host/installation identities
and generations, ticket issuer key ID/epoch/public digest plus history revision,
channel grant ID/revision/digest, policy revision, validity interval and monotone
authority revision. It also pins the dedicated signing key ID, epoch, public
digest and immutable creation/adoption/stage history event revision/digest.

All new hashes use canonical `reviewDigest({domain,value})`. Domains are explicit:

| Domain | Value / dependency direction |
| --- | --- |
| `owner-decision-public-key-v1` | Public algorithm, format and material only. |
| `owner-decision-key-event-v1` | Public lifecycle event and previous event digest. |
| `owner-decision-auth-evidence-v1` | Canonical public authentication evidence. |
| `owner-decision-attestation-payload-v1` | Payload referencing immutable ticket, grant, auth and key history. This digest is supplied to the signer/verifier seam. |
| `owner-decision-attestation-envelope-v1` | Persisted payload + signature + public attestation ID/time. |
| `owner-decision-persistence-state-v1` | Synthetic test projection used for CAS/receipt assertions; production needs an equivalent bounded canonical projection, not a database blob. |
| `owner-decision-journal-v1` | Journal event containing prior digest and resulting state digest; receipt references this event. |

The ticket and grant exist before the separate attestation. They do not embed
its digest. Authentication evidence and key provenance do not depend on this
attestation's signature. Journal state excludes the journal/receipts themselves;
the model seal's `sourceDigest` refers to the pre-seal snapshot. These choices
avoid ticket/signature, journal and attempt-seal cycles. Existing ticket-v2
domains remain unchanged. The model comparison domain and synthetic test
signature digest have no wire or cryptographic authority.

## Key and decision lifecycle

Create/adopt starts a new purpose-specific history at epoch one with explicit
external provenance; adopt never upgrades legacy undocumented trust by guessing.
Stage reserves exactly high-water + 1, forbids reused public material and records
an overlap schedule bounded to 120 seconds and both keys' validity. Before
overlap only the old generation is eligible; during overlap both are eligible.
At the cutoff the old key is ineligible even without a cutover write. An overdue
uncommitted cutover blocks use of the staged key as well. Explicit cutover moves
the old key to retiring and the staged key to active; retire and revoke are
terminal. No epoch/high-water rollback, revoked-key reuse or automatic fallback.
A revoked pending rotation is preserved and blocks automatic rescheduling; a
separately authorized recovery design would be required to replace it.

Existing attestations may verify with an eligible older generation during the
bounded overlap; the signed key reference pins its immutable material/provenance
event, not an always-changing global key head. Current lifecycle is derived from
the whole audited history. After retirement/revocation/cutoff they deny. Key
lifecycle changes advance the shared source fence; decision source changes
advance both fence and authority revision. Accepted successor, reject, revoke,
expiry, owner/intent change or missing history invalidates old authority. Reading
expiry never writes an event or repairs the ledger.

## Writers and one-attempt protocol

Extend the [v50 writer inventory](bootstrap-signed-current-decision-v1.md) with
attest, authentication-evidence, key-history and ceremony operations. Every
create/revise/accept/attest/reject/revoke/supersede/expire/delete, direct SQL/fixture
and **interview acceptance-effect** writer must take `ready_source_fence` first,
advance the appropriate counter and atomically persist exact Event/audit/receipt
evidence. This includes ordinary canonical routes, SQL effects, membership and
ownership changes, intent/evidence, ticket, lifecycle, issuer, channel and policy
writers. Covered deletes invalidate authority; physical deletion of evidence and
TRUNCATE must be prohibited. No mutation may bypass guards via replica mode,
changed function/binding/configuration, a stale counter or privileged fixture.
The model's guard assertions are synthetic; native catalog/trigger coverage is
still unqualified. Database-superuser tampering is not solved by model booleans.

1. Inspect/status uses two distinct REPEATABLE READ READ ONLY transactions with
   exact source digest, authority revision and fence equality. Signer/verifier
   receive the same bound `Db` and frozen public material; a verifier is required
   even after signing. Requests cannot supply signatures, keys or overrides.
2. Start takes a SERIALIZABLE write transaction and locks the shared source fence.
   CAS compares the full preflight digest/revision/fence, re-verifies authority,
   then **commits** the unique existing-attempt seal and receipt before sending.
3. Dispatch takes the shared fence again. Any change since start, missing seal,
   old revision, bad signature or terminal state denies with zero exchange. Keep
   that fence locked through the bounded injected send callback. This closes the
   gap after the last read: competing source writers serialize before or after
   the actual send boundary, not between validation and send. No real transport
   is provided; timeout/transaction-budget qualification remains future work.
4. Possible send followed by rollback or missing commit acknowledgement is
   `delivery_unknown` / reconciliation required, never retryable. Even rollback
   of dispatch leaves the previously committed start seal, so no second run may
   send again. Completion rechecks authority and exact dispatch fence in its own
   write transaction and appends the receipt only if both still match.

A lost start-commit acknowledgement is also unknown with zero exchange; a lost
attestation-commit acknowledgement requires reconciliation and does not invoke
the signer again. Readback failure after send cannot prove rollback. A surviving
start/dispatched seal is conservatively unusable even if no terminal-unknown
write can be committed. Recovery requires a new authorized ceremony, not reuse
of the old acceptance/ticket. Read-only status does not write reconciliation.

## Source evidence and remaining gate

`decision-attestation-key-model.ts` and
`decision-attestation-persistence-model.ts` contain explicit synthetic seams only.
Verification: **18/18 focused tests and 160/160 selected source/mocked tests pass**;
server TypeScript build, lint and scoped `git diff --check` pass. No native tests
were run. The 82 migration files and Prisma schema are unchanged.
Tests use public fixtures, digest stand-ins for signatures, serialized transaction
mocks, rollback fault points and shared concurrent schedules. They trap network,
DNS, subprocess, private-key creation and real signing APIs; logs must be empty.
They do not qualify cryptography, SQL/catalog guards, native concurrency,
secret-store provisioning, secure delivery or production transaction timeouts.

`signed_current_decision_unavailable` remains unconditional in the canonical
source; default signer/verifier/provenance/history/persistence remain absent.
RF-HOST-035 PARTIAL; production BLOCKED. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` are all false. No production endpoint or composition changes.

Exactly one recommended next atom, not started: translate this proposal into a
reviewable **unapplied additive migration and source-only persistence adapter
contract**, preserving existing decision/attempt anchors and fail-closed gates;
do not apply it or qualify it against a database without a separate delegation.
