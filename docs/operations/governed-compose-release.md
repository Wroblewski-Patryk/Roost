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
log unchanged. Independent native review `6e916681-dedf-4fad-bc91-7b7b575d6f79`
rejected it solely for that omission; the manager returned the same task to its
executor through the normal governed action.
The separate actual `npm run build` passed on this exact candidate in a closed
Windows Job with version verification, unchanged source/dependencies and owned
output cleanup. It is not an image/deployed-app or whole-product proof.
The preceding claimed-only refusal was reconciled without model/source effects.
The canonical build helper's unassigned preparation refusal was likewise checked
for absent processes/outputs before retry; saved JSON was not treated as a fresh
native receipt. The final build receipt is a separate actual execution.
Managed continuation `16ac99ca-c40d-456f-ace1-dffdd0401fdc` produced
`c82e68b30f937e00438d6b64a3c39e010364e24d`, directly based on `c21e0e0c`, changing
only the append-only regression log. Twelve source/test/config/lock seals remain
unchanged. Its separate seven-test receipt and actual canonical build both passed
in closed native Jobs; generated build outputs were removed. The older candidate's
build remains historical evidence. Independent read-only execution
`41e75879-8765-4dac-bcf5-4c93b69d90a4` approved this exact candidate in decision
`25632c42-648f-4e17-abe0-547203c4f53d`, binding material
`95a98f930d679a4c7f2ecbc31f9371c60c766898cb26406ff1e471709eb21859`.
The review consumed 131035/131072 input bytes, made no source changes and ended
with root exit 0, zero active processes and a closed Windows Job. The normal
review API reports `approved`; no basis revalidation was needed. An earlier
input measurement refused two private paths before model launch; that unclaimed
queue was cancelled before a narrowly sanitized replacement was measured/bound.

A claimed pre-model refusal also exposed a recycled Windows PID. Reclaim now
requires complete native identity and a strictly later creation time for the
different process. The normal terminal reconciliation retained its checkpoint;
the official Worker reclaimed it without terminating the unrelated process.

Worker is stopped; no application push, deployment or release grant exists.

### Bounded activity proof after observation (deployed contracts; proof pending)

The optional sealed Compose manifest now governs `smoke`, `fixture_cleanup`
and `runtime_resume` before terminal cleanup. Roost `15d857eb` and additive
migration `20261004151000_release_post_observation_fixture` are deployed with
exact build/health and migration checksum verification. Application release
and post-observation proof remain pending.
The fixture owns exactly one synthetic user/session and one negative memory ID;
it preserves business rows, sequences and the full schema. Ingress isolation
requires the exact owned firewall rule, a negative public probe and a positive
internal backend/frontend version/readiness probe before opening the write window.
An actual browser checks empty and populated recent activity with provider/external
actions disabled. Cleanup restores full baseline parity before restoring the
original role setting, rule absence and existing cadence containers. Resume needs
the complete public health window plus fresh actual loop receipts; a skipped tick
requires a verified source/configuration expectation. Unknown results are read
back before any retry. The new migration extends an operation CHECK only; it is
applied without resetting data.

The root reran the Compose/installed activity suite (538 passing tests), shared
native-process/broker recovery regressions (23), legacy contract/Git-set checks
(33), and the Python fixture/runtime controllers (18/34). `codex:check` passes;
lint/typecheck/build passed during integration. Fixed read-only prerequisite
reads confirm matching installed configuration, route, scheduler and entrypoint
sources in the application and both cadence containers; they neither start a
tick nor claim deployment/postrelease proof. The private package factory passes
161 guards and returns buffers only. Normal Coolify HTTPS credentials and
secret-reference provisioning are qualified. API readback exposes UUIDs/flags;
value hashes come from the installed model bound to the same key and UUID.
Never claim that API responses disclosed values. The existing target is pinned
to its baseline with automatic deployment disabled; original settings remain
recoverable. A fresh encrypted backup, isolated same-image migration adoption
and full schema/data/sequence parity pass. Store each application's retained
backup in a separate folder; installation IDs may be shared.

Real Docker/PG reads required Worker corrections: paused containers report
`Status=paused`, absent Health needs a map lookup, and PostgreSQL IP comparisons
use `host(inet)` without subnet suffixes. The maintenance connection uses a
separate admin database so it cannot inherit the application role's DB-scoped
read-only setting. These Worker corrections are source-verified; the complete
five-service post-release path has not run.

Where proxy traffic stays on a bridge that bypasses host filtering, private
settings can select application-namespace `INPUT`. Exact proxy container/image
and full network digests are required. The controller derives and rechecks the
live application PID, namespace and addresses before/after every rule command;
only proxy-to-application TCP ingress is fenced. Published ports, namespace or
proxy drift refuse further effects and require reconciliation. Native baseline
preparation proved public denial, then reopened health while preserving DB and
cadence fences; it does not substitute for governed post-observation proof.

The releaser credential is renewed through normal Roost API and WCM readback.
An independent readiness task exists. Unused build-cache cleanup recovered
4.927 GB without removing images, volumes or application data. The sealed
release package, independent native audit and separate owner exact-manifest
grant remain pending. Revoke the owner's temporary Coolify token through the
normal UI after use. No application push/deploy or fixture write has occurred.
