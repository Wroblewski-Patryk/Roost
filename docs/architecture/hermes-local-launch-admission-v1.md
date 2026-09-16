# Hermes local launch admission v1

Historical successor: [B14](hermes-b14-coding-smoke-v1.md) is blocked before spawn
by installed inventory drift; no real process ran. B13 lock cleanup is closed.
All six public flags remain false.

Historical B13 update: [the separately owner-authorized real coding smoke](hermes-real-coding-smoke-v1.md)
is BLOCKED after one launch reporting authentication required. That narrow grant
is spent; no retry is authorized. Job and repository cleanup passed; one manual
owner action remains for the stale Writer lock. All six public flags stay false.
The B12-only activation-denial statements below retain their historical scope.

RF-RUNTIME-005B12, 2026-09-16. **Local source/synthetic policy qualified;
real activation denied.** Hermes remains pinned to 0.21.2 /
`939e45c91d751fadd94dcd1b873ac3cb44846213`. No installed Hermes command,
loader, model, OAuth/status, MCP, E2E or release was run for this qualification.
ADR-004 stays version 7; no additional risk acceptance is inferred.

## Current pre-spawn inventory

| Boundary | Local evidence and remaining limitation |
| --- | --- |
| Registry/version/pin | Exact shared registry identity and closed provider policy, checked by the sealed startup validator. This verifies the declared candidate, not installed executable/source bytes. Installed readback remains a prerequisite to real execution. |
| Same-owner authentication | Genuine profile audit, private owner-attestation identity/digest, Ready binding, expiry/revocation checks. B4 attestation is not an observed available session or stable account identity; silent account changes remain possible. No credential contents are read. |
| Profile/config | Genuine v4 seal and fresh exact bytes/file identity, sidecar/overlay absence, accepted risk reference, same physical profile and repository. No private schema migration is needed. |
| Startup | Genuine B7 startup receipt binds pin/provider/profile/input/Ready/model/reasoning, exact public argv, minimal environment, file/terminal categories and canonical cwd. Accepted local skills sync/banner effects remain; network update checks are disabled. |
| Practical budget | Genuine B9 receipt binds the original attempt/deadline/input, 24 logical turns, retry setting 2, cleanup margin and single use. Counters and hard token/cost caps remain unavailable; B8 findings and B9's explicit waiver are unchanged. |
| Native authority | Genuine B11 proof binds exactly read/write/local-test authority, root/Git identity/branch/head/origin, Writer/application lease, declared ports where required, dirty bytes, bounded footprint, marked owned temps and same startup/budget. Partial observation is not filesystem/network isolation. |
| Task/stdin | Worker-issued opaque frozen input, task/execution/workspace/application/attempt identities and packet/context/Ready/risk/composition revisions. Final input consumption rechecks live authority and fresh context and burns the seal. |
| Windows Job | Fresh process-local, non-fault-injected compiled launcher capability with source/binary hashes and physical file identity. It qualifies the available backend only. Actual same-attempt cleanup requires a new genuine post-run native receipt. A previous run's cleanup cannot qualify this launch. |
| Activation/pilot | B12 issues no real activation. B13 adds a separate scoped local owner grant; its sole real attempt is spent and BLOCKED. Public dispatch still denies unconditionally, including after successful local qualification. |

## One aggregate, separate authority

[Local admission](../../scripts/lib/agent-host-hermes-launch-admission.mjs)
collects opaque owner/startup/budget/native/Job proofs and rechecks them as one
set. Missing, extra, unknown, serialized, expired, consumed or cross-input proofs
fail closed. The startup and budget must share the exact issued objects; native
receipt digests must match that startup, budget and owner attestation. Worker
input object identity supplies the common task/attempt/Ready/model/tools boundary.
Profile, environment, workspace, deadline and file drift are rechecked, not
trusted from receipt JSON. Expiry uses the existing wall/monotonic startup and
budget checks; Job capability also expires after 60 seconds.

The v4 [launch projection](../../scripts/lib/agent-host-provider-launch.mjs)
uses this inventory instead of separately subtracting local exceptions. Legacy
v1-v3 projections remain diagnostic and cannot issue this aggregate. The two
accepted B9 residual blockers are identified as waivers, never enforcement.
Without a genuine current Job capability, local policy remains unqualified.
With all evidence the local receipt states:

```
policyQualified = true
activationAuthorized = false
spawnStarted = false
```

The privacy receipt contains fixed states and digests, not prompt/code/diff,
paths, task IDs, personal identifiers, secrets or raw output. It explicitly sets
installedExecutableVerified, authSessionObserved and futureCleanupProven to
false. Its process-local WeakMap provenance is required; persistence/JSON/API
metadata cannot restore authority after restart. A final handoff consumes both
aggregate and input once, revalidates authority/context, and passes the exact
sealed stdin/candidate plus original budget/native/Job proofs. The owned runner
rechecks startup/process/native scope and authority, recomputes remaining time
after footprint work, and checks the same Job artifact immediately before spawn.

This qualification does not change any public capability:
implementationReady, executionSupported, pilotReady, liveAdmissionAllowed,
pilotExecutionAuthorized and pilotExecutionStarted all remain **false**.
Public/API/config claims cannot promote the local receipt. Real
prepareProviderLaunch still throws hermes_public_launch_contract_unqualified;
command and args remain null in its candidate projection. There is no fallback,
automatic restart or automatic activation on application startup.

## Harmless fixture authority and evidence

The separate [test fixture adapter](../../scripts/fixtures/hermes-launch.mjs)
compiles only the existing repository-owned process-tree C# fixture into a fresh
owned temporary directory from a fixed-digest source snapshot. Its opaque, expiring, single-use activation grant is
bound to that exact binary/source/file identity. It accepts no executable or
source override and cannot authorize installed Hermes. A boolean, JSON clone or
grant for a different executable is denied. Within B12 only this test adapter may report
activationAuthorized=true and spawnStarted=true, with scope=harmless_fixture_only.
B13 records the distinct real-attempt scope and its spent activation.

[Admission tests](../../scripts/agent-host-hermes-launch-admission.test.mjs)
check complete qualification without spawn, every omitted/serialized proof,
cross-input proofs, candidate/model/reasoning/tools/deadline substitutions,
expiry, profile/footprint/binary drift, replay, budget reuse, final deadline
changes and conservative public projection. The native harmless run checks
digest equality of actual UTF-8 stdin, argv, environment and cwd, atomic Job
assignment, matching attempt/launcher and zero active descendants. Timeout,
cancellation and controller shutdown reject success and verify owned cleanup.
The [native Job regressions](../../scripts/agent-host-windows-job.test.mjs)
also cover actual launcher/Node-controller death, surviving descendants,
breakaway denial and preservation of a concurrent foreign fixture. A controller
crash may clean descendants without a completion receipt; no proof is invented.

All fixture directories are owned, bounded, removed after their process tree has
stopped and checked for leftovers. B11's previously reported temporary leftover
was removed manually by the owner; the coordinator verified its absence before
B12. B11 cleanup is therefore closed by that verified owner action, without
publishing the private path. The historical B4/B8/B10 observations remain valid.

The three existing private profile/binding/owner-attestation resources were read
back without modification: profile v4 and its public digest match, and owner
attestation validation passed. No backup, migration or credential read was needed.

Validation passed: the B12 admission cases, 25 native-boundary cases, 22 native
Job cases including the parent suite, 13 B3-B11/provider/input/launch/quiet/
writer/workspace/lifecycle regression files, and 20 API/review unit cases.
The final post-footprint profile recheck was tested explicitly; the 49 budget/
quiet cases passed again after that runner change. Typecheck, lint, server/web
build, documentation schema/context/planning budgets, local links, privacy and
diff checks passed. Build retains the existing unresolved icon stylesheet and
ambient-image warnings and the existing large web chunk warning. These checks
do not qualify installed-provider execution, database E2E, MCP or release.

## Historical B12 proposal, superseded by the B13 result

**RF-RUNTIME-005B13: one supervised, bounded coding smoke**, only after separate
explicit owner activation. It is proposed, not started or authorized by B12.
The current qualified profile exposes file/terminal for exact coding-local
authority; a no-tool/no-write mode has not been qualified and is not invented.

Before its first real launch, B13 must read back installed executable integrity,
the fixed source pin and v4 config/binding/attestation without executing a
version/status/loader command or reading credentials. The owner must confirm
the same-account session is currently available, renew/revoke attestation if
needed, and explicitly authorize this one Ready-bound task. Such confirmation
still does not prove silent auth/session changes cannot occur. Missing or
unknown evidence blocks the run. The existing global usage-below-75% rule and
all global gates remain binding; B12 supplies no way to bypass them. Any real
activation mechanism needs a separately reviewed authority change.

Use one disposable fictional application, one existing validated checkout, one
Writer and application lease, tightly bounded declared write paths and local
acceptance check, original practical deadline, native owned-tree cleanup and
independent review. No commit/push/deploy follows from the coding authority.
MCP integration, full E2E, ongoing pilot activation and release are separate
gates, not additional B12 tasks or implied permission.
