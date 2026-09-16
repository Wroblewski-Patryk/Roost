# Hermes B14 coding smoke v1

B15 follow-up: [installation provenance and reconciliation](hermes-installation-reconciliation-v1.md)
is complete. All original immutable hashes match; one original bytecode changed.
Added wheel RECORDs are consistent, but two transitive versions differ from the
lock. Recommendation B requires owner-approved rebuild plus lazy-install denial
and split attestation; no mutation occurred. B14 remains terminally blocked.
The proposed B15 successor at the end of this document is historical.

RF-RUNTIME-005B14, 2026-09-16: **BLOCKED before provider spawn** by
`hermes_smoke_inventory_changed`. The separately authorized new attempt reached
the fixture baseline and installation preflight, then stopped. No installed
Hermes process or model was started for B14. The attempt is closed without retry;
its separate private `preflight_blocked` spent record is retained. B13's record
is unchanged. Owned fixture cleanup and Writer release passed.

## Owner authority and preserved boundaries

The owner reported successful owner-present OAuth in the exact Worker profile
and explicitly authorized one new B14 task/attempt. The reported nonsensitive
login result was one openai-codex credential with the approved pilot label; no
credential contents were read to verify that report. Runtime session availability
would have been tested only by the authorized process. That stage was not reached.
B13's stale Writer lock was manually removed by the owner and verified absent
before B14. Its previous cleanup action is closed, not an outstanding B14 action.

[ADR-004 version 9](../decisions/ADR-004-native-hermes-codex-pilot.md) records
this narrow authorization. It adds no risk waiver, installation update authority
or general pilot permission. The exact route remains openai-codex,
`gpt-5.6-sol`, `medium`, `file,terminal`, with no alias/clamp/fallback. The v4
profile, `ADR-004-v7-native-tools` acceptance, B7/B9/B11/B12 controls, one Writer,
sealed Ready/input, native Windows Job and independent review remain mandatory.
No runtime ports/server are needed; the existing edit-only application slot is
still reserved if native admission is reached. Typed authority permits only
repository_read, repository_write and local_test, never commit/push/deployment.

The intended command shape (not executed) is:

```text
<attested-hermes.exe> chat --cli --oneshot --quiet --query-file - --provider openai-codex --model gpt-5.6-sol --reasoning medium --toolsets file,terminal --max-turns 24 --run-budget <derived-remaining-seconds>
```

One attempt has at most 300 seconds, a 5000 ms cleanup margin, 24 logical turns
and retry setting 2. No resume, checkpoint continuation, whole-task retry,
worktree or provider/login fallback is authorized. The coordinator and local
preflight both observed 46% primary usage with ordinary usage allowed, below 75%.

## Separate grant, audit and cleanup

The [controller](../../scripts/lib/agent-host-hermes-coding-smoke.mjs) exposes a
fixed B14 local entrypoint, not an API/config switch or caller-selected policy.
It creates fresh fictional task/execution/workspace identities using the existing
[arithmetic fixture](../../scripts/fixtures/hermes-coding-smoke.mjs). There is
one owned repository, a controller baseline commit, subtraction in `add.cjs`,
and an existing Node test. Only the exact minimal addition fix with unchanged
tests/Git authority and an independent post-agent PASS could qualify success.

The [B14 activation](../../scripts/lib/agent-host-hermes-smoke-activation.mjs)
has the fixed scope `one_real_hermes_coding_smoke_b14_only`. It shares the exact
task/model/tools/deadline/executable proof checks with B13, expires within 60
seconds and burns on consumption. Cross-B13/B14 consumption burns and rejects
the grant. Boolean/config claims, serialization, clones and revoked grants
cannot activate it. The controller permits one invocation per scope; the
persistent record prevents restart replay. No grant was issued in this run
because installed inventory verification failed first.

The [audit guard](../../scripts/lib/agent-host-hermes-b14-audit.mjs) requires an
absent Writer lock, a physical B13 spent file and an absent B14 record. It binds
the directory and B13 file identity, size, timestamp and digest in a process-local
opaque proof, rechecking them before reservation and after cleanup. It writes
only fixed scope/state/reason, time and an identity digest with exclusive create.
Neither record can restore activation authority. A preflight failure after task
allocation closes B14 as `preflight_blocked`; a dispatched attempt reserves
`dispatch_reserved` before consumption. The spent records remain private.

The shared cleanup uses original owned fixture/Writer handles. Before spawn it
abandons an unconsumed native boundary if present. After spawn it requires a
genuine same-attempt Job receipt and never repeats pre-spawn abandon. Missing or
forged cleanup proof retains ownership for reconciliation. Native violations or
lost authority cannot be turned into DONE. The report records historical
`activationWasAuthorized` separately from final `activationAuthorized=false`.
Sanitized native classification/digests/violations are retained when available;
raw prompts, output, credentials and private paths are not published.

## Observed installation mismatch

The verifier and manifest policy are unchanged. Expected stable Hermes remains
0.21.2 at `939e45c91d751fadd94dcd1b873ac3cb44846213` (unsigned). The exact
installed inventory cannot currently be qualified against its B13 manifest:

| Inventory | Manifest | Current | Added | Removed |
| --- | ---: | ---: | ---: | ---: |
| Checkout plus virtual environment | 19,131 | 25,446 | 6,315 | 0 |
| Base Python | 5,233 | 5,233 | 0 | 0 |

Metadata-only comparison classifies the additions as 4,238 Python bytecode files
and 2,077 other files. The latter include `.bytecode-fingerprint`, package files
and distribution metadata named boto3, botocore, jmespath and s3transfer, and the
virtual environment's `jp.py` script. Distribution directory names identify
1.42.89, 1.42.97, 1.1.0 and 0.16.1 respectively; this is filename evidence, not
verified provenance, package functionality or a claim that OAuth caused them.
The first fingerprint timestamp overlaps B13; other sampled additions postdate
it. The changes must not be described as exclusively harmless cache generation.

The full verification stops at the inventory mismatch, before all original file
hashes/source/executable checks complete. No claim that those bytes are unchanged
is made. No manifest refresh, installation mutation, cache deletion or policy
exception was used to pass admission. No separate provider/status/version/loader
command or credential-store read was run in B14.

## Actual outcome

| Check | Result |
| --- | --- |
| Baseline test | FAIL, exit 1 in the fresh disposable repository |
| Admission | policyQualified=false; activationWasAuthorized=false; activationAuthorized=false |
| Process | spawnStarted=false; provider exitCode=null; outcome=policy_blocked |
| Reason | hermes_smoke_inventory_changed |
| Controller duration | 1,196 ms; finished 2026-09-16 17:49:18.707 UTC |
| Post-agent test / diff | Not reached; no repair or post-agent PASS claimed |
| Native footprint / Job receipt | Not reached; null evidence, no fabricated receipt |
| Owned fixture | Removed through original marker/ownership proof; remaining=0 |
| Writer | Released through original handle; absent on final readback |
| Persistent state | B13 preserved; separate B14 preflight_blocked record retained; authorization spent |
| Accounting | physicalModelCalls/toolCalls/transportRetries/inputTokens/outputTokens/cost remain null |

No provider process started, so no provider descendants require post-run cleanup.
The compiled launcher was never invoked and was removed with its owned fixture.
Synthetic Job tests are separate evidence and cannot replace a real repair.

## Validation and one proposed successor

Focused tests cover B14/B13 grant separation, replay/restart/JSON rejection,
separate audit records, B13 preservation, preflight terminal state, extra package
inventory rejection, and genuine harmless success/failure Job cleanup with
Writer/temp release. B13 regressions preserve exact model/reasoning/scope,
expiry and sealed input checks. Typecheck, lint and build passed; existing icon
stylesheet, ambient-image and large-chunk build warnings remain. Documentation,
schemas/context/planning budgets, 555 local links, changed-content privacy and
whitespace checks passed. Fourteen focused B13/B14 tests passed, as did the three
admission/provider-launch/Writer regression files. Final readback confirmed v4
profile/attestation validity, zero application lease files and matching owned
attempt directories, no Writer lock, and both separate spent records present.
Database E2E, MCP, production and deployment were not required or run.

All six public flags stay false: implementationReady, executionSupported,
pilotReady, liveAdmissionAllowed, pilotExecutionAuthorized and
pilotExecutionStarted. No full readiness definition was satisfied by this
pre-spawn failure. Public dispatch remains denied.

Exactly one proposed next atom: **RF-RUNTIME-005B15 — source-only qualification
of the changed installed inventory and a controlled reconciliation proposal**.
Establish provenance of added package files and generated bytecode, compare
original source/dependency hashes, then specify an explicit repair or attestation
procedure without silently weakening integrity policy. No package install,
manifest rewrite, deletion, login, provider/model run or new activation is
authorized by this proposal. B14 stops here; do not replay either spent record.
