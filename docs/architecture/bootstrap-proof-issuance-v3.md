# Bootstrap v3 issuance and attempt seal contract

Owner amendment v75, explicitly narrowed by the coordinator: **source-only
contract, injected orchestration and transactional model DONE; persistence
integration and production signing BLOCKED**. The [v74 public reservation](bootstrap-proof-persistence-v1.md)
is the intended parent. This atom adds no migration 87, SQL writer, Prisma
composition, endpoint, default issuer or sealer. Migrations and guards 1–86 are
unchanged. Existing SQL continues to deny v3 links and legacy v1/v2 cannot enter
the new contract.

## Public wire and authority

`bootstrap-proof-issuance-contract.ts` defines separate strict v3 intent,
ticket content, envelope, link binding, attempt seal and receipt schemas. There
is no v1/v2 fallback or nullable mixed-version seal. The command contains only
an operation ID, attachment ID and expected attachment/authority/source/fence
digests. Callers cannot select keys, a different ticket, channel or target.

The injected authority must provide the exact persisted owner-approved
attachment and both complete public key histories. The model validates exact
principal/purpose/key references and history digests, owner and accepted decision,
fresh authentication, ticket/request/enrollment generation, lifecycle identities,
issuer grant and exact channel certificate/resolver snapshot. Recovery requires
a revoked prior credential and proof key, exact terminal predecessor and new
ceremony IDs/epoch. Revocation, hard cutover, stale heads, ambiguity, material
reuse, malformed inputs and mismatches deny.

Signing transcripts use the v72 binary encoding of
`["roost-bootstrap-signing-binary-v1", domain, attachment, context, payload]`.
The context binds deterministic child IDs, authority revision/digest, source
fence/digest, issuer, lifecycle and channel grant. Content, owner decision and
seal use different v3 domains. The content digest hashes the actual content
transcript. The envelope digest covers both public signatures; the seal covers
the exact envelope and link binding. The final link adds the seal digest,
avoiding a circular signature. Fixed synthetic signature strings in tests are
not cryptographic evidence.

## Injected transaction contract

`createBootstrapProofV3Issuance` requires four explicit interfaces: transaction
ports, authority reader, owner-ticket issuer/verifier and binding sealer/verifier.
Their qualification strings describe the seam; they are not authentication or
production authority. Only test implementations exist for this new path.

The orchestrator requests one SERIALIZABLE writer with the existing source lock,
origin role and exact schema scope. It reads authority, prepares and verifies
the ticket and seal, then appends reservation, ticket, channel, attempt, link
and seal phases on that same Db. It rechecks authority after both external
interfaces and each phase, checks constraints and reads the complete result
before returning. A distinct READ ONLY RepeatableRead transaction must confirm
the committed plan and receipt. Transaction callback/Db reuse, wrong return
identity, isolation changes or mismatched XID/fence deny.

The persistence port must enforce unique reservation/root identities, atomic
rollback, exact graph/Event/audit receipts and native writer/fence provenance;
it must validate rows against the receipt before returning `readOperation`.
The TypeScript receipt checks cannot substitute for these database obligations.

Unknown, false or lost COMMIT/readback yields `reconciliation_required`,
`retryable: false` and `issuanceRecorded: null`. There is no automatic retry.
Exact existing commands reconcile through reads without issuer/sealer calls.
A bounded process-local set also prevents a second write attempt after an
uncertain operation; it is not durable authority. After a restart, callers must
use inspection/reconciliation for an uncertain command, not resubmit it as new.
Historical reconciliation does not establish current authority. `beforeSend`
rechecks the current authority and bound fence/XID, and always returns
`sendPermit: false`; this atom contains no send operation.

## Persistence blocker and next atom

Ticket/channel writes themselves append `decision_authority_events` and change
`bootstrap_proof_sources`. Ignoring those changes would conceal foreign drift
or ABA; comparing an unchanged digest would reject the operation's own writes.
The transactional fixture models an ideal projection but does not implement or
qualify this behavior in PostgreSQL.

Exactly one next recommendation, **not started**: implement the canonical v3
projection that recognizes only exact own-XID/receipt lineage, rejecting foreign
source changes and ABA, then the additive migration 87 and pin-checked versioned
guard upgrades required for persistence. Preserve the legacy branch and all
historical migration files. Native qualification is a later separate atom.

## Verification and limits

Final source/mocked regression: **142/142 PASS**, including 36 results in the new
v3 suite, with no failures, skips or cancellations. It covers first enrollment
and recovery, 20 competing operations with one winner, 20 identical submissions
with one issuance, all six phase rollbacks, receipt/graph corruption, source
drift/ABA, missing interfaces, legacy denial, COMMIT/readback faults and read
purity. Private-key generation/sign/verify, network/DNS/listener and subprocess
traps recorded zero calls in the new suite; it also emitted no application logs.
These are source/model claims, not SQL/native or cryptographic qualification.

Server build, lint and the four existing source-pin checks pass. No database,
Docker, migration application, web build, real signing, delivery or activation
was run. RF-HOST-035 remains PARTIAL; production authority BLOCKED, registration
UNKNOWN / MONITORED RESIDUAL RISK. Persistence/cryptography qualification and all
eight readiness/activation flags remain false. No push or deployment.
