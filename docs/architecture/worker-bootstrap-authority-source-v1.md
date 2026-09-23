# Canonical Worker bootstrap authority projection v1

Current v42: [bootstrap channel schema/adapter proposal](bootstrap-channel-authority-v1.md)
adds a source-only canonical reader over the same transport history/head and
immutable owner grant. Migration 81 is UNAPPLIED; existing installations remain
blocked. Only fresh audited, guard-verified, binding/purpose-matched evidence can
remove the channel gap. Ticket-revocation and signed-current-decision blockers
remain; context never returns usable authority. The qualified issuer/lifecycle
facts are reused, not recreated. Adapter 15/15 and selected source 68/68 results
pass; native migration-81 qualification is NOT RUN. RF-HOST-035 remains PARTIAL,
production BLOCKED and all flags false. No deployment or activation.
The inventory and qualification below are historical.

Owner amendment v34, 2026-09-23. **DONE for source-only canonical projection,
ledger transaction binding and synthetic denial validation: 13/13 new results,
99/99 selected source results. Usable bootstrap authority remains BLOCKED.**
This is an inventory-backed denial adapter, not a production issuer or delivery
composition. Even a complete snapshot of the currently available records lacks
required authority facts. No missing epoch, revocation state or signature is
inferred, seeded or initialized.

## Existing canonical sources

The [source](../../src/modules/api-keys/worker-bootstrap-authority-source.ts)
reads only bounded projections of these existing records. It creates no parallel
authority registry, table, schema, migration, configuration or durable cache.

| Fact | Existing source | Boundary |
| --- | --- | --- |
| Current owner | `workspaces.owner_user_id`, `workspace_memberships` | Exactly one owner membership matching the primary owner; ambiguity blocks. |
| Current decision | `decisions`, `decision_revisions`, `decision_acceptances` | Accepted, unsuperseded, current-owner reserved decision; no agent/credential/delegated actor, conflicting intent or expired binding. Only the parsed bootstrap intent digest is returned. |
| Host | `agent_hosts` | Exact workspace/host and enabled status. Status is not a lifecycle epoch or irreversible revocation history. |
| Installation and issuer binding | `trusted_provider_ticket_keys` | Exact workspace, installation, key ID, key epoch and public-key digest. Key epoch is not installation epoch; digest is not verification key material. |
| Credential generation | `api_keys` | Exact installation/host, current highest credential epoch, active/revoked/expired state, version and public fingerprint. Ties, multiple active credentials, legacy secrets, wrong scope or agent binding block. |
| Handoff and fingerprint | `worker_credential_handoffs` | Exact current credential, installation, host, fingerprint and ACK state. A per-credential fingerprint is not host lifecycle authority. |
| Ordinary channel | `worker_transport_heads`, `worker_transport_history` | Current normal transport revision, profile digest, certificate/high-water epochs, identity and expiry/cutover. Credential-bound ordinary admission is not bootstrap channel authority. |
| Existing bootstrap ticket | `worker_bootstrap_tickets` | Optional exact ticket/owner/decision/binding digest and expiry projection. An immutable ticket is not a current revocation registry. Task-purpose `trusted_provider_tickets` are not reused. |
| Snapshot fence | `ready_source_fence` | The ledger's transaction client, isolation, read-only mode and fence revision are checked before and after projection. |

SQL derives the existing `roost-worker-ticket-v1:` credential fingerprint from
the verifier hash; neither that hash nor raw credentials leave SQL. Output has
only public IDs, digests, epochs, timestamps, fixed state/blocker codes and flags.
No metadata, decision prose, origin, CA material, proof, key or query error is
returned or logged. Strict row/input schemas reject unexpected fields.

Credential absence is reported separately for first enrollment. A zero observed
credential high-water means no credential rows in that snapshot, not an invented
host/installation epoch or permission to enroll. Recovery and ordinary use require
canonical credential history; ordinary use still requires an active credential.

## Explicit structural blockers

Every diagnostic snapshot retains all nine blockers, even with every available
record present and correctly bound:

- `host_epoch_unavailable`: `AgentHost` has no canonical lifecycle epoch.
- `host_revocation_history_unavailable`: disabled status does not preserve irreversible host revocation history.
- `installation_epoch_unavailable`: installation ID on the issuer record is not a lifecycle epoch.
- `installation_revocation_unavailable`: no canonical installation revocation fact exists in these sources.
- `issuer_public_key_unavailable`: issuer records persist only the public-key digest, not an independently resolvable verification key.
- `bootstrap_channel_authority_unavailable`: existing channel authority requires a credential and cannot authorize first enrollment.
- `bootstrap_ticket_revocation_unavailable`: the bootstrap ledger has no independent current ticket-revocation source.
- `signed_current_decision_unavailable`: accepted canonical intent is unsigned; the ticket's archived signed decision cannot prove current authority.
- `issuer_writer_fence_unproven`: the existing issuer-key migration does not establish participation in the shared writer fence. This atom does not edit applied migrations or claim complete writer coverage.

`context`, `decision` and `ticketRevoked` therefore throw bounded blocked errors;
they never fabricate a context, signature or `revoked=false`. The ledger exposes
`inspectAuthority` separately for read-only diagnostics. Its integration cannot
register or consume a real bootstrap ticket, exchange a credential or activate
execution while these gaps remain. The source qualification is explicitly
`canonical_bootstrap_projection_v1`; it is not a production-readiness claim.

## Transaction and evidence limits

The ledger binds the source only after its existing Serializable write fence or
Repeatable Read `SET TRANSACTION READ ONLY`. The binding is scoped to that exact
transaction client and released in `finally`. Unbound, different, expired or
mode/fence-changed clients deny; mid-projection fence drift clears all facts.
WeakMap binding is transient transaction bookkeeping, not a second source of
business authority. Write failures roll back the fence; read inspection performs
no history, audit, expiry or last-use writes.

Repeatable Read provides a coherent historical snapshot, not a guarantee that
another transaction cannot change authority afterward. Missing issuer writer
coverage stays an explicit blocker. A later production integration must prove
every relevant writer participates in the canonical fence and recheck authority
at delivery boundaries; this diagnostic projection grants no send capability.

The [synthetic suite](../../src/tests/worker-bootstrap-authority-source.test.ts)
covers all available facts, each missing component, ambiguous/current owner,
revoke/stale/expiry, key and channel mismatches, first versus recovery/ordinary
credential absence, transaction lifetime, snapshot drift, rollback, read purity
and redaction. Network/DNS/fetch/child-process calls are trapped with zero effects.
Build and lint pass. The 99 source results do not prove native SQL execution or
production source freshness. No database, Docker, DNS, real issuance/delivery,
endpoint, provisioning, target/profile/model or default composition was used.
All 78 existing migrations and ordinary transport behavior remain unchanged.

Earlier [native ledger qualification](worker-bootstrap-ledger-v1.md) remains
historical evidence for persistence with synthetic authority: 10/10 native
results, the 78-migration chain and cleanup PASS. It was not rerun in this atom
and does not qualify this new reader's SQL against PostgreSQL.

All six flags remain false: `implementationReady`, `executionSupported`,
`pilotReady`, `liveAdmissionAllowed`, `pilotExecutionAuthorized` and
`pilotExecutionStarted`. `transportQualified` and `launchAuthority` also remain
false. RF-HOST-035 is not closed.

**One recommended next atom:** define a source-only lifecycle contract for the
missing host/installation epochs and irreversible revocation facts on existing
canonical entities, including writer-fence obligations and explicit handling of
legacy records without inventing initial epochs. This is a proposal, not
authorization for migrations, data initialization, delivery or activation.
