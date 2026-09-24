# Signed current bootstrap decision: source-only proposal

Owner amendment v50. This inventory and denial model extend the v49 baseline.
They do not establish persisted signed-decision authority. RF-HOST-035 remains
PARTIAL; production remains BLOCKED by `signed_current_decision_unavailable`.
All six readiness flags and `transportQualified` / `launchAuthority` stay false.
Ordinary acceptance is not a cryptographic signature.

## Existing sources and writers

| Source / writer | Existing behavior and authority limit |
| --- | --- |
| `decisions/decision-governance.ts` | Creates `roost_decision`, immutable revision, preview and acceptance; proposals/supersession use a new decision ID, version follows the predecessor. Acceptance records actor, authority, preview, request hash and capability grants. Ordinary command Events are not signed-decision receipts. Its view calls `state()`, which increments the fence: do not reuse it for a read-only authority projection. |
| `decisions/decisions.routes.ts` | Legacy create/update/archive; governed sources and supersession require governed commands. Legacy status text, including accepted/rejected/archived values, cannot confer signed authority. |
| `product-engineering/finding-service.ts` | Finding journal can create a governed proposal/revision/preview as user or agent; the finding link and actor do not replace primary-owner acceptance or signature. |
| `agent-runtime/task-interview.ts` | Creates `roost_interview` proposals. SQL `task_interview_effects` in migration `20260908150000` changes their status to accepted. This is distinct from governed acceptance and signing. |
| `intake/intake.routes.ts` | Creates `companycore_intake` decision proposals. No governed signature evidence. |
| SQL `decision_acceptance_effects` in migration `20260908170000` | Updates governed decision status, writes task effects and invalidates downstream readiness. `decision_state()` reports accepted whenever an acceptance exists; it does not compute revocation, expiry or current supersession. |
| SQL `decision_history_guard`, `decision_register_guard`, delegated-authority/finding/credential guards | Validate governed inserts and restrict update/delete. Revisions and acceptances are append-only; revision is keyed by decision ID, acceptance is unique per decision. Finding-origin and delegated-agent exceptions must not be interpreted as bootstrap owner authority. |
| Workspace and membership sources | `workspaces.owner_user_id` plus current `workspace_memberships` is the primary-owner truth. Bootstrap uses the conservative sole-owner rule: additional owner membership is ambiguous. Owner role alone is insufficient. |
| Membership writers | Empty-installation `bootstrap/installation.ts` (called by `prisma/seed.ts`); registration and invitation acceptance in `auth/auth.routes.ts`; workspace creation in `workspaces.routes.ts`; role/removal/ownership transfer in `workspace-access.routes.ts`; linked member removal in `workforce.service.ts`. Nested creation, direct SQL and fixtures also require coverage. Ordinary audit logs are not signature/key provenance. |
| Migration `20260923230000`, `transport_bootstrap_source_lock` | Statement-level INSERT/UPDATE/DELETE fence on workspace, membership, decision, revision, acceptance, ticket, host, lifecycle/audit, issuer/audit, trusted key and credential sources; TRUNCATE denied, origin required. This conservative fence invalidates ABA changes but is not a per-decision signature/terminal/audit chain. |
| Direct SQL and fixtures | Native bootstrap-channel fixture and owner-ticket persistence fixtures insert decision/revision/acceptance data, including privileged synthetic setup. Such rows are not cryptographically signed. Disabled/rebound guards, replica mode, delete/truncate, missing receipts or unreviewed definitions must deny future authority. No claim that an all-writer signed-decision guard exists today. |

Inventory scope is executable source in `src`, `scripts`, `prisma` and the current
migration chain. No new runtime writer, migration, schema or endpoint is added.
Governed actions currently expose review-impact/accept, proposal/supersession,
defer/reopen; there is no canonical signed-decision revoke/expire/reject ledger.
Revocation of a ticket, issuer or channel is separate evidence, not that ledger.

`worker-bootstrap-authority-source.ts` joins decision/revision/acceptance and
checks exact owner, intent, purpose and accepted successor. Its `decision()`
still refuses authority. Diagnostics now expose these precise gaps:

| Reason | Missing canonical fact |
| --- | --- |
| `decision_signature_not_persisted` | Domain-bound signature over this exact accepted revision and bootstrap ceremony. |
| `decision_signing_key_history_missing` | Owner-authorized public signing key, purpose, revision/epoch, provenance, validity, retirement/revocation history. |
| `decision_terminal_history_missing` | Append-only decision revocation/rejection/expiry/supersession evidence and unambiguous current head. |
| `decision_all_writer_audit_missing` | Mandatory exact Event/digest/fence receipts and verified guard coverage for every relevant writer. |
| `decision_signed_binding_not_persisted` | Immutable joined binding of decision/revision/acceptance, intent/evidence, ticket content/envelope, lifecycle, issuer, channel and policy. |
| `decision_verifier_unavailable` | Explicit verifier of that purpose, public material and canonical history on the same bound transaction. No default is installed. |

Existing `bootstrap_issuer_history` keys have purpose
`worker-bootstrap-owner-ticket-v1`; transport signatures and provider task-owner
tickets have their own scope. None can silently become a current-owner decision
key or signature. Hashes, `request_hash`, acceptance IDs and `signatureVerified`
flags elsewhere are not replacements.

## Proposed minimal additive persistence, not implemented

Keep the three canonical decision tables. Add immutable attestation children
linked to the exact revision and acceptance, plus append-only terminal events
and constrained current-head/audit projections. Store the domain-separated
payload and signature; reference a purpose-specific, owner-authorized public-key
history with exact key revision/epoch and explicit trust-establishment evidence.
Reuse existing public-key material representation where appropriate, but do not
relabel ticket issuer authority or infer owner authorization from workspace role.
Only public material belongs in this contract; private signing remains external
and out of scope. Key enrollment/rotation trust must be defined before migration.

The payload binds decision ID/revision/body digest, acceptance ID, current owner,
workspace/installation/host binding, `first_enrollment|owner_recovery`, exact
intent and evidence digests, ticket ID/content/envelope digests, host and
installation generations, ticket issuer key epoch and revision/history digest,
channel grant ID/revision/digest, policy revision, validFrom/expiry, and owner
signing key identity/revision/epoch/public/history digests. All must equal an
independent current canonical projection; missing/ambiguous input is denial.

Avoid a digest cycle: create the separate attestation after the immutable ticket
envelope and channel grant are fixed. It references both; neither embeds this
attestation digest. Decision creation/acceptance history binds the revision digest;
only the later sign event binds the complete attestation payload. Existing ticket
v2 digest domains remain unchanged. Never fabricate historical signature evidence
or backfill legacy rows as verified. Legacy/incomplete rows remain blocked.

Every create/revise/accept/reject/revoke/supersede/expire/delete, direct SQL/fixture,
owner/membership, intent/evidence, ticket, lifecycle, issuer, channel, signing-key
and policy writer must lock/increment `ready_source_fence`, enforce monotone
history and atomically write exact Event/digest/fence receipts. UPDATE/DELETE or
TRUNCATE of evidence must be denied; expiry reads must not manufacture events.
Supersession/revocation/expiry invalidates the ceremony even if old acceptance
remains present. Revisions cannot revive an old attestation; require new evidence.
Guard/function identities, configuration and origin must be checked, not asserted
by a request. No migration or inferred writer coverage is supplied in this atom.

## Executable source model and limits

`bootstrap-signed-decision-contract.ts` is a synthetic strict-schema model.
`inspectSignedDecisionModel` validates bindings/history without asserting signature
validity. `createSignedDecisionModel` additionally requires an explicitly injected
verifier, invoked with the same `Prisma.TransactionClient`, frozen parsed payload,
public key/history reference and transaction fence. It checks transaction mode
and fence before/after verification and checks expiry again afterward.

Status and pre-send verification use two separate fresh REPEATABLE READ READ ONLY
snapshots. Their entire projection digest, revision and fence must match. Reads
never update/repair/seed anything. Before send any denial produces zero exchange;
after the exchange may have committed, failed verification/readback is
`delivery_unknown`, `reconciliationRequired=true`, `retryable=false`. There is
no automatic retry. No production composition consumes model success.

Two matching reads cannot close the race between the last SELECT and dispatch.
The future dispatch writer must atomically compare the supplied exact digest/fence
and enforce the existing durable one-attempt/unknown-result seal. This model does
not persist that seal or qualify caller retries, a real database transaction,
cryptographic verification, signing, issuance, secure delivery or activation.
Injected dependencies are trusted test seams, never request-supplied overrides.

## Verification and next boundary

The source suite covers both purposes, unsigned acceptance, stale/terminal/expired
authority, owner transfer/ambiguity, every binding, signature/key/history/audit
gaps, every writer coverage failure, same-transaction verifier and fresh read
requirements, twenty shared concurrent readers across each modeled
revise/accept/revoke interleaving, pre-send denial, post-send uncertainty, purity
and request overrides. Network/DNS/process/key-generation/signing calls are
trapped, and captured logs must remain empty. This is mocked evidence only.

Verification: 16/16 focused tests and 142/142 selected source/mocked tests pass.
Server TypeScript build and lint pass. No native tests, DB/Docker, migration application
or external transport were run in this atom.

Exactly one recommended next atom, not started: define and source-test the
minimal additive attestation/public-key provenance/history persistence contract
and all-writer receipt rules over the existing decision anchors, resolving the
key trust-establishment boundary before writing or applying any migration.
