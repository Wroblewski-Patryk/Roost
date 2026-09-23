# Canonical bootstrap issuer public authority v1

Owner amendment v39, 2026-09-23. **DONE source-only: 13/13 issuer results,
229/229 selected source results; server build and lint PASS.** The proposed
80th migration is **UNAPPLIED**; all prior 79 migrations are unchanged. Native
SQL/persistence qualification remains **PARTIAL**, production **BLOCKED**.

## Canonical identity and writer inventory

`trusted_provider_ticket_keys` remains the sole key anchor. Its workspace is the
issuer identity (`issuerId=workspaceId`), and its existing installation ID is
immutable. Purpose is exactly `worker-bootstrap-owner-ticket-v1`. No independent
issuer/key registry is introduced. `bootstrap_issuer_history` and its automatic
audit journal are append-only children of that anchor; full validated replay is
the state, not a second independently editable head/cache.

| Existing source/writer | Contract and boundary |
| --- | --- |
| `owner-ticket-store.ts` `rotate` | Existing primary-owner transaction already takes `ready_source_fence`; updates key ID/digest and increments epoch. Existing SQL guard revokes issued task-owner tickets atomically. This behavior remains for legacy rows; a managed row requires the new audited stage transition instead of direct rotation. |
| Direct Prisma/SQL create/update | Found in source test fixtures and `owner-ticket-persistence.test.mjs`; no existing production key-creation endpoint or seeding was found. Proposed `bootstrap_issuer_key_fence` covers every insert/update/delete, including legacy writers. It does not adopt legacy rows. |
| Existing installation anchor guard | Preserves installation and transaction birth. Same-binding key rotation currently returns before its fence; the additional issuer guard closes that specific gap. |
| Existing key update/delete and truncate guards | Preserve monotonic epoch+1, different key ID/digest and immutable anchor/history. They are retained and included in required source fingerprints; no historical function is replaced. |
| New source-only issuer adapter | `create`, `adopt`, `stage`, `cutover`, `revoke`, `retire`, each reserved to the current primary owner and exact accepted, unsuperseded decision. No routes/default composition. |
| Journal/audit writers | Append guard takes the same fence, checks exact public shape and canonical owner/decision. Stage updates the existing key anchor from the journal trigger; all changes and automatic audit share the transaction. Update/delete/truncate of history/audit deny. |

Other canonical sources remain `workspaces`, owner memberships, accepted decision
revisions/acceptances and `ready_source_fence`. Existing ordinary credential and
transport readers keep their conservative current-head matching; bootstrap overlap
does not grant them older-key admission. Existing task-owner ticket revocation is
preserved, and is **not** resolution of bootstrap-ticket revocation authority.

## Public format and lifecycle

[The strict contract](../../src/modules/api-keys/bootstrap-issuer-contract.ts)
admits only Ed25519 public SPKI DER, encoded as canonical base64: 44 bytes with
the Ed25519 AlgorithmIdentifier and a 32-byte public point. SHA-256 covers those
exact DER bytes, matching the existing owner-ticket digest convention. Key ID,
algorithm, format, public material and digest are validated together. Workspace,
issuer, installation and purpose remain immutable across the entire journal.

No signer/private-key/seed/credential interface exists. Unknown fields, alternate
encodings, mismatched digests and private-key-shaped inputs are rejected before
write. The proposed native append guard also constrains every persisted record
and nested material to the public-only shape. Tests contain only three public
Ed25519 points, and trap signing/private-key/keypair generation, network/DNS and
child-process effects. Logs remain empty. Public material is never inferred from
a digest; missing schema/history/material stays blocked.

`create` inserts an absent canonical anchor with epoch 1 in the same transaction;
its native birth marker must be current. `adopt` requires matching existing key
ID/epoch/digest, supplied public material and explicit current-owner adoption
evidence digest. Adoption preserves the existing epoch as high-water and is
prospective: issue times before adoption are denied. It does not reconstruct
unknown pre-adoption history or prove that historical unseen keys were never used.

`stage` reserves exactly high-water+1 and a never-used recorded key ID and public
digest. The existing anchor tracks the newest **reserved** generation, even if a
staged generation is later revoked; epochs are never reclaimed. A stage pins an
activation time and cutover time with overlap greater than zero and at most five
minutes. The prior active key's validity can only shorten, never extend. Cancelling
a staged key does not silently extend the predecessor's deadline.

During the overlap, both the active predecessor and staged successor can be
selected for their exact binding, provided the ticket was issued no earlier than
that generation's activation and no later than the current ceremony. At cutover,
the old key is rejected even for earlier tickets. The successor is also blocked
after the deadline until an explicit owner-authorized `cutover` activates it and
retires the predecessor. No timer or read silently changes state. `revoke` is
terminal for a generation; `retire` ends an expired active/staged generation.
Neither terminal state can return to active. A new generation may be staged after
revocation, but high-water, key ID and digest replay/ABA guards still apply.

## Fence, reads and acknowledgement

[The source adapter](../../src/modules/api-keys/bootstrap-issuer-store.ts) uses
Serializable writes and exactly one fresh Repeatable Read/SQL READ ONLY check of
the immutable committed operation, history/audit digest and canonical head. An
uncertain COMMIT or failed confirmation returns non-retryable
`reconciliation_required`; no callback/write is retried. This command has a
dedicated atomic audit and emits no additional Event.

All eight required triggers are checked against the committed
[guard manifest](../../src/modules/api-keys/bootstrap-issuer-guards.ts): table,
function, event mask, enabled origin mode, absence of predicates/column filters,
deferral and internal-trigger changes, and SHA-256 of each LF-normalized function
body. Function language, return type, volatility, security mode and configuration
are also checked. Missing/disabled/rebound/modified guards, replica mode or absent
shared fence deny. A catalog name alone is insufficient. A privileged replacement
of trusted database/catalog/runtime infrastructure remains outside this proof.

History requires contiguous revisions, unique operation/decision IDs, increasing
audit fence revisions, matching native record digests, immutable binding and full
state-machine replay. The proposed SQL guard handles writer admission, public
shape, identity/CAS and audit; the independent typed replay is mandatory before
any public-key selection. Neither direct SQL rows nor a digest alone are authority.
Native syntax, trigger ordering, isolation and compatibility remain unqualified
until the separate native atom; mocked guard rows are not production evidence.

Status/inspect perform only read transactions, with no repair, seeding, last-use
or expiry writes. The bootstrap store passes the selected ticket's exact issuedAt
to the canonical source. Diagnostic inspection of an existing ticket reads its
stored issue time; a supplied diagnostic time cannot override it. Selection is
checked again against ceremony time, not just historical issue-time validity.

For complete audited state, BootstrapAuthoritySource conditionally removes only
`issuer_public_key_unavailable` and `issuer_writer_fence_unproven`. Combined with
qualified host/installation facts, it still blocks on exactly:

- `bootstrap_channel_authority_unavailable`
- `bootstrap_ticket_revocation_unavailable`
- `signed_current_decision_unavailable`

The factory still refuses a usable bootstrap context; no real signature, ticket,
credential or delivery is created. `implementationReady`, `executionSupported`,
`pilotReady`, `liveAdmissionAllowed`, `pilotExecutionAuthorized` and
`pilotExecutionStarted` remain false, as do `transportQualified` and
`launchAuthority`. No DB/Docker/network/DNS, provisioning, endpoint, target,
model/profile or activation was used in this atom. Retained roots and the
excluded historical sandbox folder were not inspected or modified.

**One recommended next atom:** separately authorized native qualification of the
80-migration chain and issuer lifecycle adapter/guards in one owned disposable
database, including existing rotation compatibility, fault acknowledgement and
verified cleanup. It has not been started.
