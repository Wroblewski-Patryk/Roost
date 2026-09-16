# Hermes practical attempt budget v1

RF-RUNTIME-005B9, 2026-09-16. **Implemented and qualified with synthetic inputs and
native harmless Windows fixtures; real Hermes execution remains blocked.**
Authority: [ADR-004 version 6](../decisions/ADR-004-native-hermes-codex-pilot.md).
Hermes remains 0.21.2 at `939e45c91d751fadd94dcd1b873ac3cb44846213`.

The owner accepts unavailable physical model/tool/retry/token/cost accounting as
a supervised pilot residual risk. Small tasks, a finite logical loop, an original
Worker deadline and no automatic whole-task restart are the practical controls.
This explicitly supersedes B8's mandatory pre-dispatch reservation requirement
and its proposed source-only B9. The [B8 source findings](hermes-attempt-budget-contract-v1.md)
remain correct historical evidence: this change does not add a dispatch boundary,
prove 64 physical requests or 96 tool calls, or enforce an output-token/cost cap.
No fork, private entrypoint, proxy, framework or new isolation system is introduced.

## Accepted coding-small-v1 policy

| Control | Enforcement and limit |
| --- | --- |
| Logical loop | Public `--max-turns 24`; exact private `agent.max_turns: 24`. This is not a count of every physical request, tool call or finalization request. |
| Transport retry setting | Exact private `agent.api_max_retries: 2`, consumed by the pinned public initialization. It is not a global counter across all retry paths. |
| Attempt identity | One claimed execution ID, attempt 1, packet maxAttempts 1; no session resume, recovered execution checkpoint or automatic whole-task restart. A new start after interruption needs a new audited Roost execution and Ready authority. |
| Deadline | Original claimed startedAt + accepted packet duration, at most 900 seconds. Five seconds are reserved for cleanup. Claim/start-time drift and expired budgets block before spawn. |
| Public run budget | Integer seconds: `floor((acceptedDeadline - 5000 - sealTime)/1000)`. Bound to the startup/input seal and not recomputed to extend time. Public semantics are advisory wrap-up at 80% and implicit stale-timeout adjustment, including the upstream 60-second floor. Worker stop remains authoritative even if the advisory value exceeds the later remaining time. |
| Native stop | Existing Windows Job owns descendants. The runner rechecks remaining time after compilation, reserves the existing three-second launcher assignment window in the native duration and retains an independent Worker timer/check. Cleanup remains within the original five-second margin; insufficient remaining time denies startup. Missing cleanup proof retains the writer lock. |
| Initial input | At most 131072 serialized UTF-8 bytes, checked before sealing and bound to stdin consumption. This does not cap every internal HTTP request or repeated context expansion. |
| Output | Existing stdout/stderr byte limits remain. Packet maxOutputTokens is intent only; enforcement and monetary cap are unavailable. No text-derived or estimated accounting. |
| Context and route | Exact Ready, input, profile, owner attestation, model/reasoning, task-derived toolsets, argv/environment and original claim bind the attempt. `ultra` is denied because the pin normalizes it; global model policy is unchanged. |
| Continuation | Hermes checkpoints/worktree/modern and legacy fallback remain disabled. Ordinary loop exchanges within one attempt are allowed; process/session replay is not. |

Worker time uses the greatest observed wall-clock/monotonic elapsed time, so a
clock correction cannot restore consumed time. Startup authority still expires
after B7's fixed 60 seconds. Reissuing a diagnostic receipt never extends either
deadline or resets the single-use attempt seal. Roost's durable pre-spawn audit
checkpoints remain; they do not authorize resuming a Hermes attempt. The standard
public CLI's local session storage still exists; no ephemeral-session claim is made.

## Receipts and outcome

The opaque local policy proof binds attempt/task IDs, class, Ready/input seal,
24 turns, retry setting 2, original accepted deadline, advisory run budget, cleanup
margin, initial input cap/size, startup receipt digest, config digest, selected
model/reasoning and task toolsets. Cloned/serialized receipts, API metadata and
packet additions cannot supply this authority. Drift is rechecked before launch.
Process consumption also binds executable/argv/cwd/environment and exact input.

After a process, the diagnostic adds its genuine same-attempt Windows Job receipt,
measured wall time and exit code where available. Physical model calls, tool calls,
transport retries, output tokens and cost are always `null`. No prompt, private
path, raw stdout/stderr, PII, credential or secret is included in these receipts.
Their digests bind the safe report; persisted reports never regain launch authority.

| Classification | Meaning |
| --- | --- |
| candidate_result | Exit 0 with genuine cleanup proof, untrusted output, independent review required. |
| timed_out | Worker/native deadline expired; no retry or completion inference. |
| cancelled | Explicit cancellation, context stop or observed controller closure/shutdown. |
| process_failed | Nonzero exit or process/stream failure with observed cleanup. |
| policy_blocked | Admission/authority failure or missing ownership/cleanup proof. |

A dead controller cannot issue a report. Native controller-loss fixtures prove
descendant cleanup; recovery treats a missing receipt as unqualified and does not
invent success or resume. An observed controller EOF is classified cancelled.
Exit 0 can include a partial answer, exhaustion summary or an incomplete internal
run. Independent verification of output, exact diff/workspace evidence, required
tests and acceptance criteria remains mandatory. The API completion action records
an execution result; it does not set the task to done or authorize release.

## Narrow admission change and private profile

For the v3 local candidate only, the explicitly superseded historical requirements
`hermes_single_turn_enforcement_unproven` and `hermes_output_cost_budget_unproven`
are recorded as accepted residual blockers, replaced by
`hermes_attempt_budget_policy_unproven`. Only genuine current policy/startup proof
discharges that practical-policy blocker. This is an owner scope amendment, not
proof of physical-call or monetary limits. B7's separate config proof continues.

The global registry/API, final launch denial and all six flags remain unchanged:
implementationReady, executionSupported, pilotReady, liveAdmissionAllowed,
pilotExecutionAuthorized and pilotExecutionStarted are false. Public real launch,
native-tool containment, per-attempt cleanup/auth evidence, real runtime/inference,
E2E, pilot and release gates remain. Direct Codex output-budget behavior is unchanged.
Coordinator usage below 75% remains an external gate and is not simulated here.

Private profile v3 adds only `agent.max_turns` and `agent.api_max_retries` to v2.
Exact config digest: `14f252d511b0a47a08288e40af278b20ca086659558e227c1e3403cd81d2a2d6`.
The three authorized private files (profile, Worker binding and owner attestation)
were read back after rebinding; owner ID, confirmation and expiry were preserved.
One backup per file was removed after verification. B3/v1 and B7/v2 bytes and B5's
negative diagnostic remain unchanged as historical evidence. No credential/status
read, installed Hermes/loader execution, model, tool, OAuth or MCP call occurred.

## Verification and next boundary

Targeted tests cover valid pre-spawn proof, oversized duration/input, short cleanup,
replay/resume, claim/Ready/config/argv drift, profile limits, counters as null,
forged metadata and secret-free reports. Native harmless fixtures cover candidate,
timeout, cancellation, nonzero exit, whole-tree cleanup and controller death.
Historical profile/startup/config, input/launch/quiet, provider/lifecycle, duration,
output-budget and Windows Job regressions remain required, plus typecheck, lint,
build, documentation/link/privacy checks and private readback.

PASS: 25 B9 tests, 129 combined B9/quiet/startup/native Job tests, four API provider
admission tests and the historical regression set (14 test files). Typecheck,
lint, build, both documentation validators, 530 local documentation link targets,
CSV/privacy inspection and diff whitespace checks passed. Default context is
68958 bytes. The build retains its existing unresolved asset and chunk-size
warnings. Private readback passed; temporary B9 profiles and fixture processes
were removed. No real inference, live E2E or pilot was run.

Exactly one next proposed atom: **RF-RUNTIME-005B10 — qualify the accepted native
file/terminal tool boundary for the pinned public CLI**, initially source-only,
without model execution or activating a pilot. B9 does not start that work.
