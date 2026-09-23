# Bootstrap ticket revocation: inventory and fail-closed proposal

Owner amendment v44, 2026-09-23. **DONE source-only inventory/contract/model: 12/12 new, 80/80 selected
results; server build/lint PASS.**
Canonical `bootstrap_ticket_revocation_unavailable` remains **BLOCKED**: the
existing ledger cannot represent the required facts without schema and contract
extensions. `signed_current_decision_unavailable` remains independent and out of
scope. RF-HOST-035 **PARTIAL**, production **BLOCKED**; six readiness flags plus
`transportQualified`/`launchAuthority` false. No migration, schema changes,
DB/Docker/network/DNS, private keys/signing, issuance/delivery or activation.

## Existing canonical entities and exact gaps

| Entity | Available facts and limit |
| --- | --- |
| `worker_bootstrap_tickets` | Signed v1 owner ticket/decision, ID/digest, owner/workspace/host, binding digest, intended generation/credential epoch, target, predecessor attempt and expiry. `issuedAt`, purpose and install/lifecycle/issuer/channel bindings are in the signed payload. There is no explicit ticket `notBefore` or current revoked state/history. |
| `worker_bootstrap_attempts` | Unique ticket consumption and scoped generation/credential epoch, immutable-by-adapter consumed record and predecessor attempt FK. No reservation exists before consume; unconsumed registered tickets can share intended generation. |
| `worker_bootstrap_history` | Attempt-only chain: consumed, dispatched, acknowledged, blocked, delivery_unknown. Mandatory attempt FK prevents a pre-consume ticket-revocation event. None of these states means the ticket was explicitly revoked. |
| `worker_bootstrap_heads` | One consumed-attempt head per workspace/host; not an issue-time generation allocator or per-ticket revocation head. |
| `worker_bootstrap_audit` and Event | Adapter registration/attempt audit links. The partial unique index permits only one pre-attempt audit row per ticket; it cannot hold repeated ticket lifecycle events. No all-writer immutable receipt proof. |
| Lifecycle/issuer/channel | Qualified independent bindings remain required. Revoking/changing these invalidates admission but does not create a ticket-specific terminal revocation history. Task-purpose `trusted_provider_tickets` and their journal cannot substitute. |

Five precise diagnostic reasons are exposed as `ticketRevocationAuthority` by
`worker-bootstrap-authority-source.ts`: notBefore not persisted, terminal
revocation history missing, issue high-water not reserved, all writers unfenced,
and pre-consume recovery unrepresentable. Existing v1 recovery requires a prior
`attemptId`; a ticket revoked before consume has no such attempt. Do not fabricate
an attempt, infer `notBefore=issuedAt`, treat absence as unrevoked, or reuse a
revoked generation. The canonical `ticketRevoked` method still throws its blocker.

## Writer, fence and audit inventory

| Writer/path | Current protection and missing coverage |
| --- | --- |
| `worker-bootstrap-store.register` | Serializable `ready_source_fence`, validates ephemeral ticket/owner decision, inserts ticket + Event/audit atomically. It calls `ticketRevoked` before insertion: a future reader must never treat missing tickets as safe to solve this issue/admission ordering problem. No default issuance composition exists. |
| `reserve` / consume | Same fence; unique attempt/CAS head, history and Event/audit in one transaction. Reserves generation only at consume, not issue. |
| `transition` to dispatched/acknowledged | Reauthorizes current ticket/source; same-fence history/head/audit. Existing service reads again before its peer callback and completion; this is not a durable ticket-revocation source. |
| `transition` to blocked/delivery_unknown | Terminal attempt outcomes can be written after authority loss. Correctly preserves uncertainty, but is not ticket revoke/un-revoke. |
| Issue-time reserve, revoke, expire, reconcile | No canonical ticket lifecycle commands/events. Expiry is checked against the clock; inspect/status must not create expiry events. Reconciliation is not permission to replay. |
| Direct SQL/Prisma/fixtures, update/delete/truncate | Old ledger CHECK/FK/unique constraints remain. Migration 81 fences ticket statements and blocks ticket truncate; it adds neither ticket immutability/revocation receipts nor guards for bootstrap attempts/history/heads/audit. Adapter-only discipline is insufficient. |
| Owner/decision, host/install lifecycle, issuer, channel and credential writers | Existing source fences/guards are relevant and must be checked as one exact snapshot. They do not authorize a ticket-revocation boolean or repair missing ticket history. |
| Synthetic tests | Injected `ticketRevoked` callbacks and fixture SQL are stand-ins only. No route/default composition calls the bootstrap store/service outside tests. |

Any future issue/register, reserve/consume, dispatch/send, revoke, expire, complete,
reconcile or delete path must share the fence and atomic journal/audit, including
direct writers. Deletion must preserve denial/tombstone/high-water evidence rather
than free an ID/generation. Missing/disabled/rebound/changed guards, wrong function
configuration or columns/predicate, replica mode and ambiguous legacy deny.
Read-only inspection cannot initialize, repair or advance this authority.

## Minimal additive extension proposal — not implemented

Keep `worker_bootstrap_tickets` as the sole ticket root and existing attempt
history/head/audit as the execution ledger. Propose only:

1. Explicit versioned immutable public metadata bound to the existing ticket ID,
   signed digest and owner decision: notBefore, purpose, issued/expiry times,
   generation/credential high-water, exact lifecycle/issuer/channel references and
   a terminal predecessor ticket/digest with optional attempt reference. A new
   signed contract version is necessary; v1 payloads are not silently upgraded.
2. An append-only lifecycle-event child of the existing ticket, with chained
   revision/digest and unique issue reservations per workspace/host generation
   and credential epoch. Read high-water from this journal under the same fence;
   no second ticket registry, mutable state table or shadow head. Events referring
   to attempts must bind existing attempt/history records in the same transaction.
3. Automatic Event/digest/transaction/fence receipts for these child events,
   including pre-consume revoke. Preserve the old registration audit/index; it
   cannot be reused as a multi-event pre-attempt journal. Native guards must cover
   every ledger writer, enforce immutability/CAS and terminal revocation, and be
   verified by definitions/settings, not names alone.

These are schema/contract proposals, not DDL. Existing incomplete rows remain
unqualified; no backfill/default or guessed revocation state. Issue-time reservation
must precede usable admission in one acknowledged transaction. Failed or revoked
reservations burn their generation. Recovery requires a fresh owner decision,
new ticket/digest and next high-water, with the exact terminal predecessor; it
never revives or reuses the old ticket. Privileged full-database rollback is not
claimed to be solved by an in-database fence.

## Source-only model and qualification

`bootstrap-ticket-revocation-contract.ts` models strict immutable identity,
chained events/receipts, monotonic fence/high-water evidence, writer coverage and
terminal state rules. Before send, revoke/expiry deny exchange. After dispatch or
possible commit, authority loss yields delivery_unknown/reconciliation_required,
never automatic retry or a claim that a credential was undone. Reconciliation
closes uncertainty without un-revoke or renewed admission. The model takes two
fresh consistent reads before consume, dispatch/exchange and completion, plus
post-completion verification. Caller inputs contain only the ticket ID.

`createTicketRevocationModel` is explicitly synthetic and blocked without injected
mock dependencies; its proof labels/guard booleans are NOT database or signature
evidence. It allocates no real ticket/credential and retains no registry. The
single in-memory transactional fixture exists only in tests. Physical network
send/cancellation, real concurrency, native rollback/COMMIT, issuance and SQL
writer protection are not qualified by this model.

Verification: **12/12 new results**, plus channel adapter 15, channel model 14,
issuer 13, lifecycle 18 and decision policy 8: **80 PASS, zero failures/skips**.
Mocks cover first/recovery identity, issue/consume/revoke/expire, 20 consumes racing
revoke in both orderings, pre-send zero exchange, post-send/post-completion unknown,
terminal reconciliation, stale generations/ABA/replay, atomic rollback of
history/audit/fence, uncertain commit without retry, every writer-proof failure,
replica/legacy, read purity and caller overrides. Public projections are frozen.
Network/DNS, subprocess and private-key/signing APIs are trapped; private dotenv
reads are disabled. These are source/model results, not native concurrency or
SQL qualification. Native and private-signing fixture suites were not run.
Lint: 338 routes/45 route files; diff check and context budget pass. All 81
migration files and Prisma schema remain unchanged.

**One recommended next atom:** separately authorize an additive, unapplied
schema/adapter proposal for the existing ticket root plus immutable lifecycle
child/receipts and versioned notBefore/predecessor binding, preserving the current
attempt ledger and all legacy denials. Do not implement signed-current-decision
authority or issuance/delivery/activation in that atom. Not started.
