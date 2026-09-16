# Hermes B17 one-shot coding smoke v1

Subsequent [B18 diagnosis](hermes-b18-footprint-diagnosis-v1.md) completed source/synthetic work but left real-cause attribution and recovery proof BLOCKED. The B18 successor proposal below is historical; B17 remains spent.

RF-RUNTIME-005B17, 2026-09-16: **BLOCKED after one real provider start**.
The root process exited 0, but native review reported
`hermes_native_boundary_violation` / `unexpected_changed_path`. Independent
verification of the exact repair was unavailable. Exit 0 is not task acceptance.
This follows the [B16 rebuild](hermes-controlled-rebuild-v1.md) and the explicit
one-attempt owner amendment in [ADR-004 v10](../decisions/ADR-004-native-hermes-codex-pilot.md).
The authorization is spent; no restart, retry or further execution follows.

## Authorized boundary

The unchanged Hermes 0.21.2 pin is
`939e45c91d751fadd94dcd1b873ac3cb44846213`, with exact `openai-codex`,
`gpt-5.6-sol` and `medium`. One newly owned disposable arithmetic Git repository
contains `add.cjs` and unchanged `add.test.cjs`. The only permitted edit replaces
`return a - b` with `return a + b`; baseline `node --test` must fail before launch.
Only file/terminal tools and repository read/write/local-test authority apply.
No model commit, push, deployment, Git configuration change, package manager,
remote access, login, fallback, extra checkout or application runtime is allowed.

One task, one attempt, one provider start, maxAttempts 1, original deadline at
most 300 seconds, cleanup margin 5 seconds, maxTurns 24 and api_max_retries 2
are retained. These settings do not prove physical request/token/cost limits.
Native Windows Job ownership and the existing v7 residual-risk acceptance apply.
The ordinary-usage precheck observed 51% used; no reset was consumed.

The fixed `one_real_hermes_coding_smoke_b17_only` grant is opaque, expiring and
one-use. It rejects B13/B14 grants, copies and changed task/model/workspace
bindings. A separate exclusive B17 spent record prevents replay after restart;
the B13 and B14 records remain byte-identical. The fixture has both genuine
cleanup ownership and a B17 scope marker outside the repository. No public
CLI, API, configuration toggle or automatic entrypoint is added.

## Installation controls

Full immutable/generated hashes are checked initially and immediately before
grant consumption. Repeated short-lived admission callbacks use a private
observation of the completed full pass: complete path set, physical root/file
identities, sizes, change/write times, modes and links. Serialized copies cannot
reuse it. This avoids spending expiring admission proofs on repeated full disk
scans; it does not replace full initial, final pre-spawn or post-run verification.
The native Job launcher is prepared after the initial installation scan.

Explicit Writer-held cache reconciliation admits only mapped CPython caches or
the exact checkout fingerprint. Changed cache bodies must equal compilation of
verified immutable source under the pinned isolated interpreter, without importing
or executing Hermes. A bounded two-file transaction can update only the generated
receipt and its attestation digest, preserving the B16 generation and immutable
manifest. New source, packages, launchers, orphan caches or header drift block.
No real receipt update was necessary or performed in this attempt.

A native filesystem watcher supplements the full checks. It admits only
provisional source-mapped cache events and fails closed on unrecognized changes
or observation errors. Its lack of an alarm is not proof of transient or
outside-root isolation. Private authentication/session contents were not inspected.

## Observed result and limits

| Evidence | Result |
| --- | --- |
| Baseline | FAIL, exit 1, one failing arithmetic test |
| Preflight/cache reconciliation | PASS; no generated changes, additions or removals |
| Installation | 23,653 immutable + 826 generated files; exact pin/profile v5 |
| Policy and private activation | Qualified, authorized once, one provider process started |
| Command | `chat --cli --oneshot --quiet --query-file - --provider openai-codex --model gpt-5.6-sol --reasoning medium --toolsets file,terminal --max-turns 24 --run-budget <derived>` |
| Provider/root result | Exit 0; about 72.8 seconds provider phase; 134.8 seconds controller total |
| Native footprint | `boundary_violation`, `unexpected_changed_path`; nine changed-path digests |
| Independent repair/test/diff | BLOCKED: exact safe verification unavailable; no post-agent PASS or minimal repair is claimed |
| Native Job | Assigned before resume, root_exit, cleanup true, active processes 0 |
| Installation watcher | No observed violation; bounded notification coverage only |
| Owned temporary fixture | Removed with genuine ownership/Job evidence; remaining 0 |
| Controller post-install reconciliation | Not reached because the native violation retained Writer authority for reconciliation |
| Separate post-result file-only readback | PASS: full immutable/generated inventory, bindings/profile and hashes unchanged; no receipt writes or provider execution |
| Final host metadata | Writer retained with owner process absent; one application lease retained; installation executable-path process count 0 |
| Attempt accounting | Physical model/tool/retry counts, input/output tokens and cost all null; actual response model identity unobservable in quiet mode |
| Spent evidence | B13/B14 preserved, separate B17 record retained, activation revoked and non-reusable |

The private result contains only bounded classifications and digests, not raw
provider output or the prompt. Nine digests do not identify the changed filenames
or prove their cause. The deleted fixture cannot support a retrospective exact
diff. Neither agent misbehavior nor a footprint false positive is established.
The later file-only readback establishes the recorded installation state at
that check; it does not discharge the retained native boundary or application lease.

All six **public** flags remain false: implementationReady, executionSupported,
pilotReady, liveAdmissionAllowed, pilotExecutionAuthorized and
pilotExecutionStarted. The private B17 start is recorded separately and does not
imply public activation or successful coding capability.

## Validation and disposition

The focused B14/B17/coding-smoke/rebuild suite passed 42 tests, including
cross-scope/replay rejection, immutable freshness, exact fixture repair, generated
transaction rollback, isolated synthetic bytecode-body proof and real native
watcher events. These fixtures are not additional provider attempts.
`npm run validate` passed lint, typecheck and build; existing stylesheet/image
resolution and bundle-size warnings remain. Changed-document links, structural
invariants, changed-text privacy and `git diff --check` passed. The broader docs
scan found two preexisting missing target images in the unchanged city-dashboard
UX specification; they remain outside this scope. Python documentation validators
and DB/Docker tests were not run. No push or deployment occurred.

Exactly one proposed successor is **RF-RUNTIME-005B18: source-only native
footprint diagnosis and reconciliation-plan qualification**. Review the retained
nonsecret evidence and comparison/controller logic, reproduce candidate causes
with harmless synthetic fixtures, and specify an ownership-safe reconciliation
plan for the retained Writer/application lease. Do not claim recovery of the
deleted real diff. No real provider start, lock/lease deletion, installation or
profile mutation, auth operation or new grant is included. This successor is
proposed only; B17 stops here.
