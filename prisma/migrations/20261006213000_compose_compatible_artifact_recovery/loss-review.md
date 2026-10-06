# Loss review

Source-only additive migration. It creates dedicated functions and four opt-in
triggers on existing governed release tables. It does not alter/drop tables,
replace existing functions, update historical rows, delete records, touch
business data/volumes or provision/rotate keys. Existing ordinary and
`recoveryOnly` triggers continue running unchanged.

Every new trigger branches only on presence of `compatibleArtifactRecovery`.
Malformed presence, missing proof/closure, ambiguity, invalid typed inventory,
changed native/source/public payload, changed owner or review basis refuses.
Failure/absence/uncertainty freezes forward progression; historical missing
images never become executable rollback or a newly observed healthy baseline.
The full sequence includes real smoke before fixture cleanup and runtime resume.

The proof classifier is `owner_verified_native_receipt`. SQL checks normal
ApplicationEvidence ownership, verification, original chronology, canonical
metadata/public payload/snapshot hashes and independent current review links.
It does not authenticate a private root HMAC or inspect Windows/Linux. Those
capabilities remain mandatory before the owner records the evidence and in
the installed native preflight.

Timestamp-to-ISO helper follows existing Prisma TIMESTAMP(3) storage interpreted
as UTC and emits exactly three fractional digits. Basis hashing reconstructs
the raw `reviewState` decision with `action:null`; approved decisions with a
manager action refuse. Original JSON metadata/verification is not transformed.
Actual PostgreSQL rehearsal must confirm this parity against the server's
frozen proof snapshot before production deployment. Static source checks are
not database execution proof.

Rehearsal boundaries: apply to an isolated existing test DB/rolled-back DDL
transaction; compare scope/request/record/basis digests with actual TypeScript
outputs; prove valid insert then denials for unknown keys, missing/cross-workspace
evidence, actor change, changed metadata, stale material/Ready/roles, ambiguous
native attempt, missing/changed closure, declaration-vs-physical absence, skipped
Git/smoke/cleanup/resume, unknown outcome, same-SHA/different-image evidence,
and immutable old histories. Do not run business migrations or reset data.

The existing API still performs its stricter typed schema, health, queue,
mount/config/data/sequences and post-observation qualification. SQL additionally
requires exact replacement images in both runtime and binding evidence for
successful deploy/observe. Retention and final independent healthy-baseline
certification remain separate native/normal workflow evidence.

## Negative observation extension (not yet rehearsed)

The same unapplied transaction now adds dedicated negative validators and an
exclusive `compatibleRecoveryFailure` branch to the new outcome trigger.
Only normal `reconciled` outcomes with `observationOnly:true` and exact
`absent`/`failed` disposition qualify. This records an observation and freezes
the current release; it creates no retry, replacement grant, rollback, data
restore, healthy-baseline adoption or effect authority.

The branch binds the immutable admitted snapshot, canonical request/proof
digests, selected verified human evidence record, original source/scope
approvals, previous failed closure and revocation. It preserves historical
material IDs and does not re-evaluate today's review/role/Ready/credential or
backup lifetime as a prerequisite for recording a bounded negative observation.
Normal API authentication and owner-only reconciliation remain required. The
existing positive outcome, operation, insertion and renewal checks remain strict.

The marker must bind the exact stored release/operation/intent/request/time,
complete five-name physical/absent inventory with no borrowed baseline IDs,
protected running DB/read-only fence, schema/data/sequence parity, current
exclusive proxy-network fence and held cadence states. A complete bounded
queue scan permits zero rows for ABSENT or exactly one target queue for FAILED.
Actual new image metadata must match the accepted commit/tree/image tuple.
An observation failure additionally references the exact earlier successful
deployment and its stored latest outcome, queue and both complete four-image
runtime/binding sets. All validators refuse malformed/missing/null inputs and
exceptions. JSON remains shape/evidence qualification, never an OS attestation.

Root's rollback-only PostgreSQL rehearsal `8519d589` passed 66 content probes:
three terminal negative forms, their counterfactual denials and rejection of
observation failure without actual earlier journal ancestry. Every final
validator also refused missing stored provenance. Functions and triggers were
absent before and after; no business rows were written. The previous 14 probes
remain separate lineage/hash evidence. Full stored negative provenance and
successful observation ancestry are still unverified; neither this rehearsal
nor the static tests prove a native failed closure or authorize deployment.
