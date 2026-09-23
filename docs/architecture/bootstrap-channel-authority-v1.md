# Canonical bootstrap channel authority v1

Owner amendment v41, 2026-09-23. **DONE source-only inventory, proposal and denial
model: 14/14 new results, 53/53 selected results; server build/lint PASS.**
Canonical channel authority remains **BLOCKED**: the current schema cannot express
the required purpose/authority without a migration. RF-HOST-035 remains **PARTIAL**.
No migration, database, Docker, network/DNS, private key, signing, issuance,
credential delivery, provisioning, endpoint/default composition or activation.

## One canonical source and its current limits

The existing `worker_transport_generations`, `worker_transport_history`,
`worker_transport_heads` and `worker_transport_audit` remain the transport source.
There is no new registry, persistent cache or bootstrap-specific shadow head.
The proposed snapshot is a read projection, never a second editable source.

| Existing source | Proven source boundary / missing fact |
| --- | --- |
| `worker-transport-contract.ts`, `worker-transport-store.ts` | Ordinary identity requires a credential ID, version, epoch and fingerprint. Store context uses the exact current credential and acknowledged handoff; service inspection requires an active credential. Removing the credential fails admission. |
| Migration `20260923170000_worker_transport_admission` | Generation `credential_id` is NOT NULL with an ApiKey FK. Strict identity/record/profile shapes have no bootstrap purpose or owner grant. History/head preserve revision, certificate high-water, signed-record digest and chain references. These constraints do not prove a separate bootstrap authority. |
| `transportProfile.bootstrap` | Owner out-of-band evidence for the certificate pin, **not** a first-enrollment/recovery purpose. A valid ordinary record is never reinterpreted as a bootstrap channel. |
| `transportProfile.resolver`, transport observation | Persisted resolver policy is public IPv4 only. An observed public IP set belongs to transient signed peer evidence; no owner-approved exact set is persisted in the channel/intent. |
| `worker-transport-snapshot.ts` | Existing admission snapshot carries ordinary identity, CA digest, permitted pins/epochs and no proxy/redirect/session reuse. It cannot parse the proposed bootstrap snapshot. |
| `worker-handoff-https.ts`, `worker-handoff-coordinator.ts` | Normal handoff uses fresh persisted inspection, signed pre-body and completion evidence. Its injected admitted exchange remains synthetic; no production socket is constructed from the new proposal. Ordinary request/poll/ACK/status and rotation are unchanged. |
| `worker_credential_handoffs` | Exact host/install/origin/pin, owner approval and ACK state; guarded writes. It supplies neither independent first-enrollment channel authority nor CA/resolver/certificate-history authority. |
| Owner, decision, ticket, lifecycle and issuer | Existing workspaces/memberships, accepted decision revisions, bootstrap ticket/ledger, qualified lifecycle and public issuer history remain their respective sources. Existing bootstrap intent pins a channel profile/revision/epoch, but has no complete proposed grant or approved address set. Ticket-revocation and signed-current-decision authority still have independent blockers. |

`createCanonicalBootstrapAuthoritySource.inspect` retains the same admission
blockers and now exposes bounded `channelAuthority` diagnostics, with
`available=false` and these reasons:

- `bootstrap_channel_purpose_not_representable`
- `bootstrap_channel_resolver_set_not_persisted`
- `bootstrap_channel_all_writers_unfenced`

No diagnostic value, missing credential, passed model test, caller boolean or
caller-supplied digest removes `bootstrap_channel_authority_unavailable`.

## Writer and fence inventory

| Writer / mutator | Existing protection and qualification limit |
| --- | --- |
| Transport service commands and Prisma store | Serializable writes take `ready_source_fence`, exact current owner/decision, append generation/history, CAS head, Event and audit in one transaction. Ordinary credential authority is retained. |
| Direct SQL/Prisma generation, history, head and audit writes; native test fixtures | The transport migration installs CHECK/FK/unique constraints but no writer-fence or immutable-history triggers. Adapter-only fence/audit checks cannot prove every writer. No DB/catalog qualification is claimed in this atom. |
| Host/install anchor and lifecycle, public issuer/key writers | Existing lifecycle/issuer guards and journals supply independently qualified facts. The proposed channel binds exact generations, epochs and issuer-history revision/digest; it cannot substitute an online host or key digest for those facts. |
| Ownership/membership and accepted decision writers | Existing owner/decision source locks are relevant. A future canonical grant reader must verify sole primary ownership, exact acceptance, no supersession, and current fence/guard evidence. |
| Handoff and ApiKey lifecycle writers | Existing handoff/credential guards fence their mutations. Their purpose remains credential lifecycle; their evidence does not authorize bootstrap channel reuse. |
| Bootstrap ticket/ledger writers | Existing ledger owns one-time attempts and terminal outcomes. Current revocation/signed-decision proof gaps are not repaired by this proposal. |
| Certificate pin/CA, resolver policy/IP set, expiry and cutover | Pin/CA/profile changes belong to transport history and its writer gap. Approved IP-set/purpose/grant writers do not exist. Time boundaries also require fresh checks even if revision/fence did not change. |

A future grant requires complete writer coverage, immutable/audited history,
current guard definitions and one consistent source-fence snapshot. Merely
checking trigger names or copying an ordinary transport record is insufficient.

## Minimal immutable snapshot proposal

[`bootstrap-channel-contract.ts`](../../src/modules/api-keys/bootstrap-channel-contract.ts)
defines a strict, recursively frozen proposal containing:

- Exact workspace/install/host binding, lifecycle epochs and generation IDs,
  host fingerprint, issuer key tuple plus issuer-history revision/digest.
- Canonical channel generation, revision, record digest, current state and
  purpose restricted to `first_enrollment` or `owner_recovery`.
- Exact HTTPS origin with explicit port, SNI, CA digest, leaf DER pin,
  certificate validity/evidence digest, certificate epoch and high-water.
- Public-IPv4 resolver policy and canonical sorted unique approved address set;
  proxy, redirects, downgrade and session reuse all false.
- Valid-from, expiry and optional hard cutover deadline. At cutover a fresh,
  explicitly authorized snapshot is required; inspection never rotates a pin.

The separate proposed owner grant binds the entire snapshot digest, purpose,
owner, exact decision/revision, ticket ID/digest and expiry. Model proof also
matches the existing ticket intent's binding/channel/purpose, current owner
decision, lifecycle/issuer state and complete fence/writer set. First enrollment
requires absent credential history; recovery requires the existing terminal
recovery intent. Credential absence alone supplies none of this authority.

**The grant is a proposal, not an accepted new decision field or persisted
record.** `acceptedGrantDigest` and the other proof values exist only in explicitly
synthetic model fixtures. They model future verified acceptance/signature/guard
evidence; they do not verify signatures or establish native authority. No adapter
can presently construct this proof from the canonical tables. The normal strict
record, decision and ticket formats remain unchanged.

## Send/completion model and tests

`createBootstrapChannelModel` accepts only a ticket ID and requires explicitly
injected synthetic inspection/exchange. It returns `source_model_only`; its
default is blocked. It accepts no URL, CA, pin, epoch, headers, resolver, snapshot
or ordinary action from the operation caller.

Two fresh inspections must agree before exchange. The peer gate re-inspects and
matches the exact snapshot, request/ticket, origin/SNI/CA/pin/epoch and approved
public IP set. Completion requires the same peer/response correlation and another
fresh inspection. Pre-exchange drift produces zero exchanges. Once exchange may
have sent a body, missing/mismatched proof, exception, changed authority or expired
cutover is terminal `delivery_unknown`; no automatic retry occurs.

The bounded process-local replay map is only a test model, not durable attempt
authority. Real persistence, signatures, HTTP behavior, deadlines/cancellation,
cross-process replay and native writer protection remain unqualified here. The
existing bootstrap ledger continues to own any future durable terminal outcome.

[`bootstrap-channel.test.ts`](../../src/tests/bootstrap-channel.test.ts) qualifies
mocked positive first enrollment/recovery, valid ordinary/legacy rejection,
credential absence, owner/ticket/decision/lifecycle/issuer mismatches, revoked or
stale facts, expiry/cutover, origin/SNI/CA/pin/resolver/IP drift, missing writer
proof, zero-exchange denial, unknown/no-retry, read purity and caller overrides.

Selected verification: channel 14, issuer 13, lifecycle 18, decision policy 8,
all passing with zero skips and private-key/signing APIs trapped before imports.
Existing signing-fixture transport/bootstrap suites and native suites were not
rerun in this atom; no native/network evidence is claimed. Build and lint pass.

`bootstrap_channel_authority_unavailable`, `bootstrap_ticket_revocation_unavailable`
and `signed_current_decision_unavailable` all remain. `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`, `transportQualified` and
`launchAuthority` remain false.

**One recommended next atom:** separately authorize an additive, unapplied
schema/adapter proposal extending the existing transport authority with explicit
bootstrap purpose, owner grant, approved IP set and complete writer fence/audit,
while preserving mandatory active credentials for ordinary admission. Not started.
