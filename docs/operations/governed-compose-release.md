# Governed Compose application release

The authorized outcome remains in [implementation](../implementation.md).
The second application release is pending. Component checks establish source
behavior; they do not establish a production release.

## Installed boundary

`coolify_compose` is a separate strict manifest and installed-adapter discriminator.
Existing single-image and Git-set wire formats retain their existing digests.
One permanent target binds repository/source/tree, effective Compose configuration,
all declared services and mounts, controller pins, backup and observation policy.
It has no disposable owned resources; application/repository deletion is refused.

Candidate and rollback phases use sealed private artifacts and typed policies.
Settings cannot select commands, modules, SQL or model predicates. The fixed
renderer produces normal Coolify custom build/start commands. Before staging or
dispatch, the adapter verifies the current unresolved durable intent, exact
release snapshot, configuration and controller identities. The controller rechecks
artifact, images, mounts and invariants before creating a deterministic queue.
An existing queue is read before dispatch; uncertain results require read-back.
Failed/cancelled or absent queues use a separate typed recovery observation.
It requires the same retained healthy baseline services/images/mounts, exact
operation and deterministic queue identity, quiescent control plane, unchanged
configuration, schema and data. Proven candidate failure or absence becomes
FAILED and proceeds only to sealed rollback and observation; it never redispatches
the candidate. Partial deployment/drift remains uncertain. Failed or absent
rollback requires diagnosis. These paths have component evidence; their installed
production proof remains pending.

## Recovery and maintenance

Ordinary Coolify Compose rollback rebuilds images. Governed rollback uses retained
immutable images and a sealed effective Compose artifact, with no build or pull.
Every built service, including migration, is accounted for. Missing historical
migrators/queues remain missing. A legacy observation is not a new deployment
receipt. An adopted migration image needs actual compatibility evidence.

Cadences are held during the release window. A `created` cadence is allowed only
with zero exit status and no health result. An application/database in that state
is not healthy. The database read-only fence, absence of competing active sessions,
schema and complete data/sequence fingerprint must be verified. A recreated DB
container requires the exact retained image/mounts and current qualified finished
queue. Fingerprint reads recheck identity before and after. The exact owner package
must describe maintenance and restoration. Capacity checks use actual disk,
memory, load and the global deployment queue; they authorize no capacity purchase
or broad Docker pruning.

## Runtime evidence

Evidence retains each service/container/image, actual queue/source/tree,
configuration and runtime-set digest, with no single-image summary. HTTPS probes
independently require exact backend/frontend revisions and the application's own
required readiness fields. A finished queue with starting health receives at most
60 seconds of read-only settling. An unresolved result remains uncertain without
redispatch. Observation covers the full manifest window.

Own application smoke and independent postrelease verification remain required.
Any smoke writes/model calls need explicit bounded scope in the exact owner release
package. Infrastructure health does not prove application behavior or readiness
of the whole product.

## Verified prerequisite — 2026-10-04

The actual PostgreSQL 15 fingerprint exposed an unsupported shell-status variable
and absence of `ps`. The fixed reader uses atomic per-relation digest/completion
markers and `/proc` process-group inspection. Native injected failures refused
partial/stale digests; timeout closed the group without database changes or
temporary-directory residue. The existing local PostgreSQL 16.14 checks passed.

Backup `6e2298cb-8856-4d0a-a261-ef8315e69f79` was encrypted, read back and restored
into an isolated temporary database. Exact schema/data parity passed and the
temporary database was confirmed absent. Archive digest:
`424c97d6b19f5754ed19576e9d6165b669eb3e91748654d9b0ae743b4cac141a`.
Encrypted digest:
`a4ad0f9081208afef6517d0457e748358a2cc942ff7f58a33055d538615a369c`.
This proves the database prerequisite. Installed Compose release and independent
deployed acceptance remain unproven.

The retained baseline application image was also qualified as an adopted migration
image on one owned database restored from that archive. Actual migration/config
file hashes matched the baseline Git source; Alembic exited 0. Schema, data and
sequence digests stayed identical, the process group closed and the owned database
was confirmed absent. This proves that bounded compatibility rehearsal, without
claiming a historical migrator image, historical queue or full-image provenance.
The encrypted archive stayed unchanged; production database data was not modified.

Managed read-only audit `41a15e29-f9d1-4844-9c37-e2f31c72d1e1` and independent
verifier `53feb9ea-45b8-45e1-8e44-c9c9916f0f61` confirmed the canonical build
blocker and minimal typed ESM correction. Both completed with unchanged paired
Git/process/Docker receipts and closed Jobs with zero active processes. They
grant neither first-write consent nor exact-commit release authority. The new
correction, canonical build and independent candidate acceptance remain pending.
Separate first-write Decision `b38e356d-6a86-41da-8b96-bc294f86af0a` and managed
runtime Decision `93177555-bb51-4c6f-b9ae-350c7d75cd18` were accepted after the
owner's explicit three-path build-fix consent. They permit local correction/tests
and a commit, followed by independent review; neither grants push or deployment.

The SQL read-only risk mirror was updated through one new additive migration,
without changing applied migrations or assessment history. Actual strict managed
turn-budget boundary cases passed on the existing local PostgreSQL 16.14 inside
a rolled-back transaction. Roost `3d240c2f` was pushed and deployed through queue
`aays28lhsm9vc04wu3p4lgta`; health/build-info returned 200 with that exact commit.
The completed production migration checksum matched its committed SQL bytes.

The new fixed public probe also read the existing deployment: backend/frontend
revisions agreed with its actual baseline and both required readiness fields
passed. The diagnostic readiness response was 70,842 bytes; the reader now has
a fixed 128 KiB backend bound and independent 64 KiB frontend bound, with tests
for both limits. Response bodies remain transient and are excluded from evidence.

Managed coder `b5fe6ed3-ce6e-4224-b5cd-eb1a7284150d` produced clean local
`c21e0e0cc52a8de7301869953121f48983f4d3ae`, based on preserved `3cf9645e`.
The fixed Worker recorded seven passing tests and a closed native Job. The model
reported an actual six-pass/one-fail TS2580 reproduction before the correction;
its tool budget ended after two authorized paths, leaving the required regression
log unchanged. Independent review remains pending and must evaluate that omission.
The separate actual `npm run build` passed on this exact candidate in a closed
Windows Job with version verification, unchanged source/dependencies and owned
output cleanup. It is not an image/deployed-app or whole-product proof.
The preceding claimed-only refusal was reconciled without model/source effects.
The canonical build helper's unassigned preparation refusal was likewise checked
for absent processes/outputs before retry; saved JSON was not treated as a fresh
native receipt. The final build receipt is a separate actual execution.
Worker is stopped; no application push, deployment or release grant exists.
