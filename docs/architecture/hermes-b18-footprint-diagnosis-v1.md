# Hermes B18 footprint diagnosis and reconciliation plan v1

The separately owner-approved [B20 legacy exception](hermes-b20-legacy-recovery-v1.md)
completed exact B17 lease/Writer removal and preserved all spent records. The
exception is terminally spent/disabled; B19 strict recovery remains unchanged.
Earlier recovery-pending statements below are historical. B17 repair/test
acceptance remains unproven; no new execution is authorized.

Current policy/evidence ordering: [B19 root-scoped review v2](hermes-root-scoped-review-reconciliation-v2.md).
It supersedes exact-path classification and adds durable review/process identity
bindings for future attempts. Historical observations below remain unchanged;
legacy B17 recovery is still blocked and no new execution is authorized.

RF-RUNTIME-005B18, 2026-09-16: **BLOCKED for attribution of the real B17 cause
and proof sufficient to remove its retained locks**. Source/synthetic diagnosis
is complete. The known comparison behavior and loss of diagnostic evidence are
confirmed; they do not establish which files actually changed in
[B17](hermes-b17-coding-smoke-v1.md). The deleted fixture is unavailable.
No provider/model, installed interpreter, authentication or maintenance command
was executed. Production enforcement and ADR-004 decision version 10 are unchanged.

## Bounded retained evidence

Read-only inspection covered the exact retained Writer, one application lease
and the B17 spent record. Physical file identities, single-link/non-reparse
status, bounded size, content digests and stable read metadata were checked.
The actual artifact names, owner identifiers and host paths remain private.

| Fact | What it establishes | What is missing |
| --- | --- | --- |
| Writer has ownerPid, ownerNonce and createdAt only | A bounded lock record with unchanged physical identity/bytes | No process creation identity, executable identity, task checkpoint or full execution tuple |
| Lease has version, nonce, attempt, application digest and writer nonce | Its writer nonce equals the retained Writer; application digest matches its filename | No full task/workspace/application identity tuple, process creation time or durable Job identity |
| B17 spent scope is one_real_hermes_coding_smoke_b17_only, state dispatch_reserved | The B17 grant is consumed and cannot be replayed | Its attemptDigest hashes the complete envelope identity, not the lease's attempt UUID alone |
| Lock, lease and spent timestamps are ordered consistently with B17 | Temporal corroboration | Timestamps are not an exact cryptographic join or authorization |
| Exact recorded PID absent in independent Node and Windows CIM observations | No process occupies that PID at the observation times | No persisted PID plus creation-time binding to the original owner; historical PID reuse cannot be excluded |
| B17 recorded Job cleanup true / activeProcesses 0 | Historical completion evidence reported by the original controller | No fresh opaque Job handle or complete durable process-identity chain for a restarted reconciler |

The exact source of the spent digest is
`sha256(JSON.stringify({executionId, workspaceId, taskId, applicationId, attempt}))`.
The lease contains execution ID plus an application digest; remaining values are
not available from these artifacts. Hashing only its attempt does not match the
spent digest and must not be treated as a corruption finding. There is no valid
way to manufacture the missing tuple or process creation time from timestamps.
Current PID absence alone is not a PID-reuse-resistant recovery authorization.
No whole-machine process/command-line scan or process termination was performed.

## Actual policy and comparison path

The B17 packet explicitly declared `nativeBoundary.writePaths = ["add.cjs"]`
and repository_read, repository_write and local_test authority. The controller
passed its sealed envelope to native-boundary preparation, which retained this
scope and supplied it to `compareNativeFootprint`. There is no missing allowed
path handoff and no glob expansion. Each path grants itself and descendants;
required parent-directory additions are permitted. `src/add.mjs` is an additional
synthetic layout in B18, not a claim about B17's real repository.

`captureNativeFootprint` checks canonical root/Git identities, HEAD, branch,
origin, worktree list, dirty-file content hashes, bounded tree metadata and
protected Git authority hashes. It observes no secret contents. Inventory rows
include inode identity, file size, modification time and link count. The comparator
marks any changed row outside declared paths as `unexpected_changed_path`, even
when Git reports identical bytes. An atomic replacement of a permitted file is
allowed; a byte-identical replacement of an undeclared file can still violate
this metadata policy. Ordinary new repository source outside the exact list is
also a violation under the current contract, despite repository_write authority.

| Boundary/category | Current handling |
| --- | --- |
| Workspace content | Dirty bytes plus metadata; changes checked against exact path/directory list |
| Protected .git | Separate metadata/authority digest; drift is repository_metadata_or_identity_drift; objects/logs have partial coverage |
| Task-owned temp and scope markers | Marked root is outside the repository; B17 markers already exist before sibling capture; fixture ownership is separately checked |
| Nested .git, bare repository or extra worktree | Capture rejects; completion maps capture failure to footprint_unavailable |
| Reparse/secret-named file | Capture rejects before content read/hash; completion maps failure to footprint_unavailable |
| Outside-root content | Not observed by repository capture; parent sibling name/inode changes are checked separately, existing sibling-file bytes are not |
| Dependencies/runtime/session/cache | Dependency subtrees have partial metadata observation; no application runtime was requested; accepted private startup/cache effects are not ordinary repository-write authority |
| Installation | Separate B17 watcher/split checks; later readback PASS is not workspace acceptance or a root-cause diagnosis |

The real receipt contains only `unexpected_changed_path` and nine path digests,
with no metadata-drift or footprint-unavailable classification. At least one
observed workspace row was outside the narrow policy and/or the sibling check
failed. The nine digests enumerate changed inventory rows, not necessarily nine
forbidden files. Their names, bytes, categories and actor remain unavailable.
No attempt was made to guess/reverse the real path hashes.

## Synthetic reproduction

The diagnostic test imports the **unchanged production capture/comparison**
functions. Each case creates a new B18-owned marked root and local repository,
with deterministic failing arithmetic baseline, hooks disabled and no network.
The CJS baseline implementation/test bytes match B17. Git observations use the
same GIT_OPTIONAL_LOCKS=0 policy. Each root is removed by its genuine ownership
proof; explicitly created nested-directory/junction probes are removed first
after checking their identities. No real host lock or lease is adopted.

| Controlled variant | Exact observed result |
| --- | --- |
| Only add.cjs repair plus node --test | Test PASS; no violations; one changed row |
| Only src/add.mjs repair plus node --test | Test PASS; no violations; one changed row with that path declared |
| Atomic temp write then rename over allowed file | Test PASS; no violations; one changed row |
| Repaired file plus surviving adjacent atomic temp | unexpected_changed_path; two changed rows |
| Terminal test on failing baseline plus git status | No violations; zero changed rows |
| New src/helper.mjs | unexpected_changed_path with exact-file scope; no violation with explicit src directory scope |
| Protected .git/config change | repository_metadata_or_identity_drift |
| Synthetic nested repository-shaped directory | native_extra_repository at capture; footprint_unavailable in completion mapping |
| Junction to B18-owned external sentinel | native_reparse_denied at capture; footprint_unavailable in completion mapping |
| Modify existing sentinel outside repo but inside owned test root | No observed repository change; confirms outside-root observation gap |
| Synthetic .env filename | native_scope_invalid before content hashing; footprint_unavailable in completion mapping |
| Byte-identical atomic rewrite of undeclared test | Git clean, but unexpected_changed_path due changed physical metadata |

These results confirm mechanisms, not the real B17 actor or operation. Normal
minimal repair/test alone did not reproduce B17. The real cause therefore remains
BLOCKED, rather than ROOT_CAUSE_CONFIRMED.

## Confirmed ordering and evidence defect

Native completion captures/classifies the footprint inside the provider runner
before returning a candidate. A violation throws, so the normal `fixture.verify()`
path is skipped. In `finally`, B17 does call `fixture.observeUnfixed()` **before**
fixture cleanup. It requires exact initial/fixed bytes, unchanged tests, scope
marker and exact Git status before executing tests. Failure is collapsed into
`hermes_smoke_independent_verification_unavailable` with no precise safe reason.

Cleanup then deletes the owned fixture when the genuine Job proof is available,
even if independent verification failed and keepWriter is true. Thus cleanup did
not precede the attempted check, but it did precede successful verification and
durable capture of enough evidence to diagnose its failure. Only unsalted path
hashes/generic reason survive. Native violation also retains the application
lease and Writer; keepWriter causes the controller's post-install audit to be
skipped. The later independent installation readback does not close that state.

## One recommended B19 runtime/reconciliation delta

Choose **root-scoped changed set + protected-path denylist + acceptance review**.
Repository_write under the already sealed canonical root permits discovery of
ordinary code files without making an unknown pathname alone a security-boundary
violation. Task-declared expected files remain strict acceptance criteria: B17's
one-operator task would still fail acceptance for extra/unexpected outputs. This
proposal does not retroactively accept B17 or grant a wider task scope.

Worker-owned enforcement must still reject normalized protected Git paths,
secret/credential paths, reparse/hardlink escapes, nested/bare repositories,
worktrees/clones, outside-root changes when observable, extra application
instances and mutation of preexisting dirty data. Case/alias/path normalization
and negative cases are required. Prompt rules are only supplementary. Native
shell/outside-root/transient observation gaps remain the existing disclosed v7
risk; this change cannot claim OS isolation or prevention of unseen shell effects.

Recommended completion order:

1. Confirm owned-process completion and preserve a bounded evidence snapshot.
   Retain category, change kind, before/after existence and byte-equality flags,
   test-file integrity, specific closed error codes and attempt-scoped HMAC path
   IDs. Never persist source bytes, raw prompt/output or private absolute paths.
   Use a random per-attempt key; raw unsalted path hashes are not a privacy claim.
2. Independently verify only known-safe test bytes and permitted execution. If
   safety checks fail, record the precise refusal without executing modified code.
   Keep the fixture until verification reaches a durable terminal result.
3. Classify protected-boundary failures separately from task acceptance failure;
   persist the final evidence/decision with installation checks and cleanup intent.
4. Remove only proved-owned fixture artifacts. If emergency removal is necessary,
   capture the bounded snapshot first. Missing snapshot/identity proof means retain
   the fixture and report a cleanup blocker; do not erase evidence to report success.
5. Reconcile eligible lease/Writer state under genuine authority. Preserve spent
   evidence regardless of success, failure or cleanup state. Durable completion
   must bind process identities before ephemeral Job evidence expires; serialized
   receipts alone never become a generic cleanup or execution capability.

This is one proposed B19 implementation atom with synthetic validation, not an
implementation or activation in B18. It includes one narrowly scoped cleanup
operation for the two B17 lease artifacts, governed by the following contract.

## Owner-approved B17 cleanup contract

**Separate explicit owner approval is required, and is not sufficient by itself.**
The existing contract does not permit recovering post-spawn locks from PID/age.
B18 does not delete either artifact. B19 must fail closed for the current legacy
records unless independently trustworthy missing evidence becomes available.

The one cleanup operation must:

1. Bind approval to both exact private artifact locations, expected physical
   identities/content digests and a narrow expiry. Recheck parent identities,
   non-reparse/single-link files and stable bytes. Never enumerate-and-delete
   matching names, force a Writer acquisition, or adopt another lock.
2. Prove lease writer nonce equals Writer owner nonce; prove the exact original
   task/workspace/application/execution/attempt tuple hashes to B17's spent record
   using its original serialization and matches lease/application bindings.
   Preserve and compare B13/B14/B17 records before and after. Current evidence
   supplies only the first relationship, so this gate presently fails.
3. Prove the original owner using PID plus creation time and executable/process
   identity, and prove its Job/descendants have ended. A current different process
   at the same PID is foreign and must not be stopped or adopted. Historical
   self-reported JSON, PID absence and plausible timestamps alone cannot mint the
   missing process/Job binding. Current records cannot pass this gate unaided.
4. Acquire a dedicated exclusive recovery barrier respected by Writer admission;
   refuse if it is already held. Re-read both artifacts and proof while holding
   it. Authorize no provider/application start during reconciliation.
5. Journal the approved pair outside the repo, remove only the bound application
   lease, then the bound Writer, with exact identity/byte checks before each step
   and readback after. On interruption retain the barrier/reconciliation state;
   resume only from verified durable identity-bound state and explicit scope.
   Never delete a replacement file or clear unrelated leases as rollback.
6. Report exact outcome and unchanged spent evidence; do not issue an activation
   grant or automatically start a smoke afterward.

The missing legacy tuple/process proof cannot be backfilled as though it existed
at B17 launch. Approval to implement B19 is not approval to delete the locks.
If B19 cannot satisfy these prerequisites, its cleanup component remains BLOCKED
and the artifacts stay in place.

## Validation and stop

12 synthetic cases passed with owned fixture cleanup asserted after every case;
all child Git/Node invocations completed synchronously and the test runner exited.
No B18 background process or temporary root remains. The exact retained host
artifacts and B13/B14/B17 spent records were read back unchanged. Scoped document
links, documentation budgets/schema invariants, changed-text privacy and Git
diff checks passed. Existing two missing city-dashboard image links are outside
the changed documentation. No production executable changed, so application
lint/typecheck/build and Python documentation validators were not rerun; no
installed provider/interpreter, DB, Docker or integration test was executed.

All six public flags remain false; ADR-004 remains v10. One local commit records
this diagnosis. The sole proposed successor is **RF-RUNTIME-005B19**, implementing
the described policy/evidence-ordering fix and guarded reconciliation delta after
separate delegation. No real activation is proposed or started. B18 stops here.
