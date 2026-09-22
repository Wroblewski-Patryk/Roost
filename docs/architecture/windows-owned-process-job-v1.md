# Windows owned-process job v1

Current B28 amendment: [original ownership before resume](fixture-ownership-before-resume.md).
Native coding uses gated Windows Job v2 with durable Ready/origin/actual-Job
bindings before acknowledgment and ResumeThread. Ordinary reconciliation can
restore cleanup authority only. Generic low-level v1 remains for qualification,
not a native-coding fallback. All six flags remain false; no provider run is
authorized. Earlier observations and successor proposals below are historical.

Current policy/evidence ordering: [B19 root-scoped review v2](hermes-root-scoped-review-reconciliation-v2.md).
It supersedes exact-path classification and adds durable review/process identity
bindings for future attempts. Historical observations below remain unchanged;
legacy B17 recovery is still blocked and no new execution is authorized.

RF-RUNTIME-005C, 2026-09-16. Protocol: `roost-windows-job-v1`.
Status: **NATIVE FIXTURE QUALIFIED; PROVIDER EXECUTION STILL DISABLED**.
This removes the raw-process stop-proof gap for the new backend only. It does not
qualify Hermes itself, credentials, native tools, filesystem isolation or budgets.

## Ownership and launch

`scripts/roost-windows-job.cs` is a per-attempt native launcher. It is separate
from `roost-agent-host-launcher.cs` and the PowerShell observer/scheduler launcher,
which remain unchanged. Existing Task Scheduler tests create a scheduled task and
are deliberately not run by this atom. No service, scheduled task, account, ACL,
registry, firewall, VM, WSL or Docker changes are needed.

The launcher creates an unnamed, non-inheritable Job Object, sets and reads back
`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` with neither breakaway flag, then creates the
exact target with `CREATE_SUSPENDED`. A `STARTUPINFOEX` JOB_LIST assigns the new job
**inside CreateProcess**, before returning a process handle or executing user code.
This also closes the suspended-orphan crash window of userspace spawn-then-assign.
The launcher verifies membership and ActiveProcesses=1, emits assignment evidence,
and calls ResumeThread only afterward. A separate HANDLE_LIST permits only the
target's three pipe handles; neither job ownership nor the controller channel is
inherited. No shell or process search is used for ownership.

The launcher's current-job membership is recorded. Windows enforces inherited
outer-job restrictions when creating the nested target; incompatible restrictions
fail before resume. There is no breakaway retry. The implementation requires
Windows 10+/Server 2016+ JOB_LIST support and x64 .NET Framework/compiler support;
missing facilities fail closed. Successful nested assignment was tested on the
current Windows x64 host. This is not a promise about every host/outer job policy.

Primary references: Microsoft's [process attributes](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)
define JOB_LIST and explicit handle inheritance; [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)
and [nested jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs)
define inherited restrictions and last-handle cleanup. The repository tests verify
the local implementation, rather than treating those descriptions as host evidence.

## Bounded private protocol

Worker writes one UTF-8 JSON request on the launcher's private stdin, with exact
version, attempt UUID, absolute EXE/cwd, argv array, explicit environment map,
base64 input, duration and stop deadline. Unknown fields fail. Paths, environment
and input remain private pipe data; they are never included in public receipts.
Target stdin is written once and closed. Controller stdin stays open for one
versioned stop command; EOF also stops the job. A malformed command fails closed.

| Boundary | Limit / semantics |
| --- | --- |
| Initial request | 262144 bytes; argv <=64, command line <30000 UTF-16 characters, environment <=128 keys/32767 characters. |
| Target stdin/stdout/stderr | 131072 / 131072 / 32768 bytes, independently bounded. |
| Control message | 1024 bytes; fixed reason enum and exact attempt identity. |
| Launcher output | JSONL assignment, base64 data and one terminal receipt; <=8192 bytes/line, <=4096 events and <=350000 total wire bytes. |
| Startup | 3000 ms protocol/startup deadline, independent watchdog at 3500 ms. |
| Run | Finite 1..3600000 ms, supplied from the Worker's remaining execution budget. |
| Stop | Native accounting/pump completion <=3000 ms; launcher watchdog adds at most 500 ms, Worker emergency close at 4000 ms, within the existing 5-second stop margin. |
| Compilation | Before any target exists, bounded at 30 seconds; authority/budget rechecked afterward. It grants no extra execution time. |

The terminal receipt contains version/attempt, logical job UUID (not a named job),
assigned-before-resume, resumed, limits, current/inherited job state, root exit
(null if no root was created), ActiveProcesses, jobClosed, termination reason,
cleanup result/time and output byte counts. Worker binds it to source and launcher
SHA-256 and accepts it only after clean launcher exit, strict protocol parsing and
zero active processes. Target stdout cannot forge this separate protocol channel.
Hermes quiet decoding/redaction and the untrusted-output contract still apply.

## Stop and failure

The 2026-09-23 [terminal-evidence slice](../operations/host-lifecycle-safety.md#terminal-evidence-after-output-rejection)
separates a rejected output consumer from malformed native framing. Consumer
rejection stops the Job and further payload delivery while bounded parsing
continues until the correlated cleanup receipt. Completion still rejects;
only genuine terminal proof is attached to the failure. Callback text is not
retained. The quiet supervisor forwards the original fixed failure code, exit
and receipt through existing error/budget evidence. Missing or corrupt native
proof remains unqualified, with no new launch or replay authority.

Normal root exit, cancellation, timeout, lease/context loss, controller shutdown,
closed controller pipe and preparation/output errors terminate the owned job.
Even normal root exit requires TerminateJobObject, root-handle wait, job accounting
ActiveProcesses=0, bounded pipe completion and confirmed job-handle close before
success. Killing the launcher closes its sole job handle in the kernel; abruptly
killing the Node controller closes its private control pipe. Native fixtures cover
both paths. A watchdog handles blocked output/read paths without an unbounded wait.

No taskkill, PID/age inference or unrelated-process termination supplies evidence.
The only direct root termination is via the exact newly created suspended process
handle on failed preparation. Worker may emergency-terminate its own launcher
handle; without a terminal native accounting receipt this remains
`hermes_stop_recovery_unproven`, with writer ownership retained for reconciliation.
A crash never manufactures a durable stop acknowledgement or replays an attempt.

Job membership is process-lifetime containment, **not a security sandbox** against
same-user process manipulation or effects through external services. Native-tool,
host-lifecycle, auth and filesystem boundaries remain separately blocked. This
qualification does not replace them or claim that arbitrary hostile code is isolated.

## Admission, build and recovery

`agent-host-windows-job.mjs` builds the versioned C# source using the existing
system compiler into an owned temporary directory, checks the binary hash before
launch and removes artifacts after completion. No EXE/build stamp is distributed
or installed by this task. A hard Worker crash may leave its private temporary
build directory for operator reconciliation; it does not justify broad cleanup.

Only a successful real native receipt, held by identity in the producing Worker's
WeakMap and younger than 60 seconds on a monotonic clock, can remove
`hermes_stop_recovery_unproven` from the local launch-candidate projection.
Copied JSON, API/config declarations, registry evidence and fault-injected builds
cannot do so. The shared API projection remains conservative because it has no
local handle/proof. The launcher must still supply a new receipt for every attempt.
The Worker Hermes branch now uses this backend and attaches the receipt to
`verification`; Direct's spawn, argv, stdin and event handling are unchanged.

`prepareProviderLaunch` still refuses Hermes before spawn. All six execution/pilot/
live flags remain false. Remaining blockers cover the effective configuration,
authentication boundary, internal turns/retries, native tools, hard token/cost
budget and overall public launch qualification. No fixture receipt activates any
of these capabilities. The original writer-lock, context-stop acknowledgement and
recovery contracts continue to govern uncertainty and controller crashes.

## Native verification and next atom

`agent-host-windows-job.test.mjs` runs one instance at a time, with owned compiled
root/child/grandchild fixtures and bounded self-expiry as an extra test safety net.
It checks natural exit, surviving descendants, cancel/timeout/lease/context/close,
launcher crash, abrupt Node controller crash, nested jobs, denied breakaway,
exact stdin/quoted argv, invalid EXE/cwd/argv, native assignment/resume failures,
independent stdout/stderr limits and preservation of a concurrent foreign fixture.
The quiet runner is exercised with a harmless fixture, never Hermes or a model.
Each completed scenario checks accounting and fixture disappearance; owned builds
are removed at the end. Negative fault injection exists only in a separate test
compile and its receipts cannot qualify admission.

Next single atom remains **RF-RUNTIME-005B: owner-present Codex OAuth plus minimal
Blank Slate configuration**, separately delegated. It is not started here and is
not an execution grant. No OAuth, real Hermes/Codex/model, MCP, VPS, database,
push or deployment occurs in RF-RUNTIME-005C.
