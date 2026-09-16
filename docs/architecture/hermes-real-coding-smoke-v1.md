# Hermes real coding smoke v1

B16 maintenance update: [controlled rebuild and split attestation](hermes-controlled-rebuild-v1.md)
is DONE after owner approval, with profile v5, exact dependency closure and
verified canonical readback. No provider/model run or new activation occurred.
B13/B14 remain spent. The B15 proposal and earlier next-step text below are
historical evidence, not the current maintenance status.

B15 follow-up: [read-only installation qualification](hermes-installation-reconciliation-v1.md)
found added package timestamps inside the B13 process window and a reachable
startup lazy-install path. This supports a side-effect hypothesis, not proven
process attribution. B13's auth failure and evidence limits remain unchanged;
all original immutable files match, while two added transitives are off-lock.

B14 update: the owner manually removed B13's stale Writer lock; absence was
verified before the [separate B14 attempt](hermes-b14-coding-smoke-v1.md). That
cleanup action is closed and B13's spent record remains unchanged. B14 stopped
on installed inventory drift before provider spawn and cleaned its own Writer
and fixture. The B13 observations and pending-action text below are historical.

RF-RUNTIME-005B13, 2026-09-16: **BLOCKED**. The owner authorized exactly one
real supervised coding attempt. That authorization is spent. One installed
Hermes process started and reported an authentication requirement, exiting 1.
No successful inference, repair, independent post-agent PASS or exact accepted
diff was established. No second attempt, login, fallback or automatic retry is
authorized. The retained laptop-wide Writer lock needs one manual owner action.

## Authority and implementation

[ADR-004 version 8](../decisions/ADR-004-native-hermes-codex-pilot.md) records
the narrow one-attempt authorization, not general pilot activation or a new
residual-risk waiver. The owner confirmed the approved account was signed in;
this did not establish runtime session availability. B4/B7/B9/B11 limitations,
the v4 profile and `ADR-004-v7-native-tools` acceptance reference remain unchanged.

The [local controller](../../scripts/lib/agent-host-hermes-coding-smoke.mjs)
has no CLI, API/config activation switch or automatic startup entrypoint. It
requires a trusted local owner-authority callback and genuine Writer, sealed
input/Ready, startup, practical-budget, native-boundary and Windows Job proofs.
The [B12 aggregate](hermes-local-launch-admission-v1.md) is consumed once.
The [opaque activation grant](../../scripts/lib/agent-host-hermes-smoke-activation.mjs)
binds the exact input, workspace, model, reasoning, revisions and deadline; it
expires within 60 seconds, burns on consumption (including mismatch), and cannot
be restored from JSON. A private exclusive-create spent/reserved record is
written before dispatch. It persists across restart and must not be removed to
repeat this authorization. A callback is trusted controller code, not an
authenticated API principal or a capability available to untrusted callers.

The exact route is `openai-codex`, model `gpt-5.6-sol`, reasoning `medium`,
toolsets `file,terminal`, and read/write/local-test authority only. The one
300-second attempt retains B9's 5-second cleanup margin, 24 logical turns and
retry setting 2. No commit, push, deploy, runtime server or declared port is
granted to Hermes. The command shape is:

```text
<attested-hermes.exe> chat --cli --oneshot --quiet --query-file - --provider openai-codex --model gpt-5.6-sol --reasoning medium --toolsets file,terminal --max-turns 24 --run-budget <derived-remaining-seconds>
```

The exact remaining-seconds value was not retained; it is derived from the
original deadline after pre-spawn work and the cleanup margin. The sealed task
goes through stdin, never argv or a repository prompt file. Quiet output is
bounded, redacted and untrusted. A nonzero exit exposes only a fixed diagnostic
enum; the authentication hint is reported text, not account-identity evidence.

## Installation and fixture boundary

[Installation verification](../../scripts/lib/agent-host-hermes-smoke-installation.mjs)
read metadata and hashed the complete 24,364-file installed inventory before
launch: stable Hermes 0.21.2, pin
`939e45c91d751fadd94dcd1b873ac3cb44846213`, unsigned release. It checked the
manifest, detached source HEAD, package version, launcher/interpreter binding,
registry source hashes and exact model/reasoning implementation. No provider
version/status/loader command or credential-content read was used for preflight.
Package-manager dependency hardlinks remain allowed by the existing installation
contract; workspace/temp ownership rules are separate. Physical launcher and
source identity are rechecked immediately before dispatch. This is local
integrity evidence, not a publisher signature or protection against all races.

The pinned source recognizes the canonical model name and passes it unchanged;
`medium` is supported and not clamped. This is source/argv evidence. Actual
response model identity is not observable through this quiet transport. Existing
same-owner credential recovery limitations remain; no account switch or stable
account identity is claimed from the result.

The [fixture](../../scripts/fixtures/hermes-coding-smoke.mjs) creates exactly one
new, marked owned temp root with one Git repository for a fictional arithmetic
application. It cannot adopt an existing directory. A controller baseline commit
contains `add.cjs` with subtraction and unchanged Node tests expecting addition.
The pretest must FAIL. Hermes may change only `add.cjs`. Acceptance requires the
exact minimal subtraction-to-addition replacement, unchanged tests and baseline
HEAD/commit count, then an independent Node test PASS. This order avoids running
modified test code. The fixture's own unit test proves this verifier; it is not
evidence of a real Hermes repair.

Owned-temp cleanup permits Git metadata only inside that newly allocated
repository. Nested/foreign repositories remain rejected. Original opaque
ownership, marker and physical identities are checked before deletion. The
genuine Windows Job must prove same-attempt cleanup before post-spawn removal.

## Observed result and cleanup limitation

| Check | Observed evidence |
| --- | --- |
| Local usage gate | 45% used immediately before the attempt; ordinary usage allowed |
| Baseline | Independent pretest exit 1, FAIL |
| Admission | policyQualified=true; activationAuthorized=true; spawnStarted=true, scoped only to this one attempt |
| Process result | process_failed; exit 1; authentication_required_reported |
| Timing | Dispatch recorded 16:33:03.619 UTC; controller finished 16:33:42.437 UTC; total controller wall time 57,812 ms including preflight |
| Repair evidence | No accepted diff or independent post-agent PASS; success branch was not reached |
| Accounting | Physical model calls, tool calls, transport retries, input/output tokens and cost all null |
| Native process ownership | Assigned before resume; root_exit; genuine cleanup=true; activeProcesses=0 |
| Owned repository/temp | Removed with original ownership proof; remaining=0 |
| Application lease | No retained application lease files in post-attempt readback |
| Writer | Retained stale global lock; original owner process ended; manual reconciliation required |
| Replay | Grant revoked/spent; private dispatch-reserved record retained |

One installed process was launched; the number of actual model requests and
successful inference are not established. Native and budget receipt digests
were captured, but detailed native diff/violation evidence was not retained in
the sanitized result. No exact clean-diff claim is inferred from those digests.

The controller incorrectly invoked the pre-spawn abandon operation after the
native attempt had already completed. That operation rejected the completed
boundary and retained the Writer lock. The correction skips pre-spawn abandon
only with a genuine same-attempt completed Job receipt and no lost-authority
signal. A harmless fixture regression verifies Writer release and retention for
forged/unknown evidence. It does not retrospectively reconcile the real lock or
authorize another installed-provider run. The original opaque Writer handle is
gone; PID/JSON alone must not recreate cleanup authority.

The sole next owner action is manual removal of the stale Writer lock identified
in the private handoff. Preserve the separate spent record. No additional model
run is requested or authorized. Existing private Hermes profile runtime/cache
state is preserved; it is outside the disposable fixture's ownership. Private
profile v4/config digest and owner attestation were validated after the attempt
without credential-content reads. No claim of purging all profile state is made.

## Validation and public status

Synthetic/native tests cover grant expiry, replay, substitutions, exact scope,
fixture FAIL/PASS, unchanged tests, marker tampering, sealed Worker input, the
fixed authentication hint and the post-completion Writer regression. B12/native/
Job tests, budget/provider/input/quiet/lifecycle/Writer regressions, API/review
tests, typecheck, lint and build passed. The existing icon stylesheet,
ambient-image and large-chunk build warnings remain. None of these checks turns
the real BLOCKED attempt into a success. Database E2E, MCP integration,
production, deployment and general pilot execution were not run.

Final checks passed all seven B13 tests, documentation schemas/context/planning
budgets, 547 local document links, the changed-content privacy scan and diff
whitespace checks. Readback confirmed zero matching owned attempt directories,
the retained spent record and stale Writer lock with its original owner absent.

Public `implementationReady`, `executionSupported`, `pilotReady`,
`liveAdmissionAllowed`, `pilotExecutionAuthorized` and `pilotExecutionStarted`
all remain **false**. Ordinary `prepareProviderLaunch` still denies real Hermes.
The local one-attempt diagnostic states are not public capability flags.
