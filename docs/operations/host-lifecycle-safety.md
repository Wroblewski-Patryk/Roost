# Windows Docker/WSL lifecycle safety (RF-HOST-035)

RF-RUNTIME-005C [Windows owned-job backend](../architecture/windows-owned-process-job-v1.md)
qualifies process lifetime/cleanup with native fixtures. It is not a filesystem,
credential or host-lifecycle security sandbox and does not remove this independent
admission gate. No Docker, WSL, scheduler or shared host state was changed.

Provider contract v5 enforces **no agent authority over host lifecycle** at the
existing Worker/API admission boundary. Ordinary application work, including
`maintenance` and `local_test`, cannot authorize host maintenance. There is no
additional manager, maintenance executor, socket repair or directory mover.

## Fixed synthetic program decision

RF-RUNTIME-005B30: the owner accepts closed semantics for one new fixed synthetic
program class, implemented as `synthetic_fixed` / `roost-fixed-effect-v1`.
Real API/Ready/claim/Worker E2E now qualifies this class only.

The program must have small auditable repository-owned source, exact verified
source/build/content identity and a check immediately before spawn. It accepts
no caller-selected command, executable, path, arguments or input. Its sole
supplied effect handle is one inherited handle for predetermined bounded output in
its exact owned fixture. Its code contains no network operation, arbitrary
path read, shell/subprocess, explicit dynamic load or host-lifecycle control.
One-shot authority binds task/attempt/Ready, canonical repository and fixture,
claim, Writer/application lease, original B28 ownership, approved runtime and
installation, actual Job, deadline/budget and terminal review/cleanup. After
terminal consumption or restart only the original cleanup chain may recover.

This is a proof about the exact closed program, not removal of Windows token
permissions. It runs under the same user/token with explicitly accepted residual
risk. No filesystem/network sandbox, separate environment or protection from
same-owner tampering is claimed. Source/build/content drift must refuse execution;
a hash alone does not prove semantics.

Hermes, Direct, arbitrary executables, command text and caller-supplied readiness
remain unconditionally denied by their existing gates. Closed synthetic semantics
cannot be used as their isolation evidence, inherited activation or a generic
test/config/environment bypass. Admission requires the exact fixed declaration;
the Worker derives source/build paths privately and checks content immediately
before launch. The task contract must explicitly select this execution class.

The API/PostgreSQL qualification uses a unique temporary database inside the
existing canonical instance, with real admission and no mocked claim or Ready.
Positive execution includes independent public review; failed resume publication
produces zero effect and terminal cleanup. Signed B28 recovery after an interrupted
cleanup retains spent authority and cannot run the program again. See the
[readiness table](../architecture/agent-delivery-readiness.md) for evidence.
The remaining sections describe the unchanged real-provider policy.

## Enforcement and scope

### Host-containment admission binding

2026-09-23: **binding/denial slice DONE; RF-HOST-035 PARTIAL**. Existing
`prepareProviderLaunch` requires genuine one-attempt evidence before returning
a runnable plan. There is **no real-provider proof issuer**: Hermes and Direct
remain blocked even if an outer admission were weakened. Six flags stay false.

[`roost-host-containment-admission-v1`](../../scripts/lib/agent-host-containment.mjs)
authenticates an immutable receipt through a private process-local WeakMap.
The digest identifies a binding, not a signature/bearer token. Copied JSON,
caller signatures, changed versions and lifecycle receipts cannot confer
authority; nothing is loaded from task/API/config/environment proof data.

| Binding | Source and rule |
| --- | --- |
| Provider/runtime | Exact fixed declaration/source, verified executable content/physical identity, compiler, launcher and installation binding. No caller-selected executable. |
| Profile/config | Digests of the fixed execution profile and exact argv, stdin, environment and supplied-handle configuration. |
| Workspace/task | Canonical application/fixture/output-handle identities, execution/workspace/task/application IDs, attempt, input seal and context revisions. |
| Ready/claim | Exact Ready pin, claim-token digest, start/checkpoint identity and fresh Ready/risk/context/authority checks. No raw lease token in evidence. |
| Writer/filesystem | Genuine Writer object and current ownership/physical record digest; exact workspace, fixture and one predetermined output handle. Expansion denied. |
| Host controls | Explicit empty allowlist for the closed program. Credential, process, network, lifecycle and unknown capability requests denied. |
| Lifetime | Existing preparation deadline, at most 60 seconds, wall-clock plus monotonic expiry; one receipt per genuine grant. Failed genuine consumption is spent; no renewal/reconstruction after restart. |

Only the existing B30 `synthetic_fixed` grant issues evidence, labelled
`closed_fixture_only`, `systemIsolation=false`, `realProviderAdmitted=false`.
This qualifies the exact program writing 22 fixed bytes through its inherited
handle. It does **not** remove Windows permissions or show that arbitrary code
lacks filesystem, credential, process, network or Docker/WSL APIs. A genuine
completed Job cleanup receipt also fails admission. No OS adapter is invented.

The Worker issues fixture evidence after its last remote authority refresh.
The shared pre-spawn boundary consumes it before existing grant/input handoff;
the fixed runner rechecks before process creation and suspended-process resume.
Missing proof burns the local input; a later input/authority failure revokes
the partially consumed proof, so a failed handoff cannot reach the runner.
A pre-create refusal consumes the run opportunity and keeps explicit owned
fixture abandonment available. Once creation may have happened, native cleanup,
durable resume/review and reconciliation remain authoritative. Terminal fixture
evidence includes the version/class/binding digest. No retry, supervisor or
parallel recovery system was added; durable B28 recovery remains cleanup-only.

Synthetic denials cover missing/stale/consumed evidence, clock rollback, wrong
runtime/profile/config/workspace/task/attempt/claim, Ready/Writer drift, scope
expansion, credential/process/network/lifecycle/unknown capabilities, malformed
requests, copied/rehashed/tampered receipts, signatures and genuine Job-only
proof. Denials check zero target-process creation, zero output and no resume
authorization. Valid evidence reaches only the fixed fixture and owned cleanup.

Legacy transport/context tests replace only fake transport through an explicit
test-directory loader, retaining their authority/input checks. Production has
no new bypass parameter. These tests do not qualify containment. The harmless
Hermes fixture's stale source pin was refreshed for the already committed
bounded invalid-output/flood modes; fixture source itself was not changed.

Verification: **87/87** focused containment/fixed-launch/provider tests passed,
including failed-handoff revocation and preserved crash/recovery cleanup. The
Hermes admission/profile/startup/budget/native-boundary, input and lifecycle
regressions passed after correcting the stale fixture pin. All six legacy
Worker process suites (context, active stop, packet, duration, recovery, output
budget) passed. `npm run validate` passed lint, TypeScript and server/web builds;
existing unresolved-asset/chunk-size warnings remain. JavaScript syntax, scoped
privacy/diff checks, 631 local links and documentation budgets passed (107,341
default-context bytes; three planning files, largest 26,485 bytes).

Full fingerprints for managed runtime/pilot, manual runtime/profile and model
store still match the preceding audit; no real provider/model or private state
was changed. The eight unrelated dirty documents received concurrent edits
outside this slice and are excluded intact from its commit; no global
before/after equality is claimed for those documents. `design-qa.md` was neither
read nor staged. Database/API integration, production/VPS, container/service
changes and real OS containment trials were not run.

**Exactly one next atom:** read-only qualification of one candidate Windows OS
containment mechanism against filesystem/credential/process/network/host-control
requirements, returning supported/BLOCKED evidence before installation or a
real-provider trial. Current Job evidence alone is insufficient. No model,
private-profile, provider or production activation follows from this slice.

### Terminal evidence after output rejection

2026-09-23: **this process-supervision slice is DONE; RF-HOST-035 remains PARTIAL**.
Existing Windows Job v1/v2, one-use startup/budget proofs and B28 resume/cleanup
remain the architecture. No new supervisor, provider admission or routing layer
was introduced. The missing slice was retaining genuine terminal evidence when
the Worker's output consumer rejected otherwise valid native transport.

Previously, an invalid UTF-8 provider chunk was treated as corrupt native
framing. The receiver stopped reading before the terminal receipt, and the
quiet runner's second await could replace the decoder failure with
`hermes_stop_recovery_unproven`. Cleanup could have succeeded without its proof
reaching the existing attempt-budget/Worker failure evidence.

The [native adapter](../../scripts/lib/agent-host-windows-job.mjs) now stops the
owned Job on consumer rejection, stops delivering payload to that consumer, and
continues bounded parsing/counting solely to verify the native terminal receipt.
Version, attempt, actual Job/process identities, resume correlation, byte counts,
launcher exit, job close and zero active processes must still match. It rejects
the attempt with `windows_job_output_rejected`; arbitrary callback text is never
retained. Malformed transport and missing terminal proof retain the original
fail-closed behavior. Serialized receipt copies cannot confer authority.

The [existing quiet supervisor](../../scripts/lib/agent-host-hermes-quiet.mjs)
preserves its fixed decoder error and genuine cleanup receipt/exit in error
details and the existing versioned attempt-budget completion. Its final await
also observes cleanup on early cancellation, without replacing an already
verified error with a second rejection. Missing cleanup proof still takes
precedence and retains ownership for reconciliation. No error becomes a
candidate result and consumed attempt authority cannot replay.

Native fixtures cover clean exit, non-zero crash, a silent tree reaching its
deadline, cancel, stdout/stderr flood, decoder rejection, surviving descendants
and controller death. Consumer failure is checked on both v1 and gated v2.
The existing deadline governs silence; this change does not invent a new idle
timeout for a potentially healthy provider. Public production admission still
refuses real providers before claim/spawn. These tests qualify transport and
cleanup evidence, not an OS host/filesystem/credential sandbox or real-provider
identity admission. Durable B28 recovery remains cleanup-only.

Verification: the focused native/quiet/budget suite passed **76/76** tests;
the final admission, ownership, native-boundary, lifecycle and recovery suite
passed **198/198** (including repeated budget coverage). `npm run validate`
passed lint, TypeScript and server/web builds. Existing Vite unresolved-asset
and chunk-size warnings remain. Syntax, whitespace/privacy, 474 local links and
documentation budgets passed; default context is 103,208 bytes. The eight
unrelated tracked-file hashes and the private manual-state hash were unchanged;
`design-qa.md` was neither read nor staged. Only temporary synthetic fixtures
ran. Database/API integration, container builds and live provider trials were
not run; no production/VPS, Docker/WSL service or private provider configuration
was changed. All six readiness/authority flags remain false.

The subsequent [binding slice](#host-containment-admission-binding) completes
this proposed pre-spawn evidence boundary synthetically. Its next atom is current;
this historical supervision slice grants no real-provider execution.

The Direct CLI exposes command events after execution. A prompt instruction,
command blacklist, clean PATH or hidden Docker CLI cannot contain scripts,
encoded commands or direct host APIs. Hermes also lacks an admitted containment
adapter. Consequently both current providers report `executionSupported=false`.
Direct admission returns `host_lifecycle_isolation_unproven`; Hermes retains
its existing compatibility blockers and adds this independent blocker.

The shared provider projection ignores caller-supplied health, policy, commands,
decision approval and readiness. Both API admission and the Worker deny
uncontained execution before recovery, writer acquisition, claim or spawn.
The final pre-spawn authority checks also retain the denial. Observe mode
continues registration/heartbeat only. A healthy host is not an execution grant.

Agent-controlled actions forbidden by this contract include atomic
`docker desktop restart`, global `wsl --shutdown`, forced termination of an
integrated user distribution, Docker factory reset/prune, destructive cleanup,
broad socket deletion, deleting inaccessible reparse points, undocumented
settings edits, entering Docker's internal distribution and moving runtime
directories. These are policy identifiers, not a parser used as containment.
Arbitrary unrecognized actions are equally unavailable to current providers.

The local API test launcher now makes one bounded Engine version probe and
fails with `host_maintenance_required` if unavailable. It no longer launches
Docker Desktop or polls through a recovery loop; inherited launch environment
variables cannot restore that behavior. No database tests were run in RF-HOST-035.

## Health, evidence and owner decision

The shared `roost-host-lifecycle-v1` diagnostic contract accepts only fixed
fields/enums, a timestamp, at most 4096 serialized bytes and a maximum age of
60 seconds. Future, expired, malformed or extended input becomes unknown.

| Dimension | Meaning |
| --- | --- |
| Windows Engine | Available, unavailable or unknown through the Windows client. |
| Existing workloads | Baseline continuity, changed or unknown; no payload inspection. |
| User distribution | Running and healthy, naturally stopped, unhealthy or unknown. |
| WSL proxy/socket | Available, unavailable or unknown, independently of Windows Engine. |
| OpenShell | Unproven until separate installation and enforcement evidence; never inferred from Docker. |

`stuck_socket` and `distribution_proxy_exit` observations request
`owner_host_maintenance`. The non-retryable failure preserves checkpoints and
the writer lock through the existing failure/reconciliation path; it does not
restart host services, retry the task or clear ownership. The maintenance
descriptor has `executionAllowed=false` even if health is good or a caller
claims owner approval. It is guidance, not a new Decision database record.

Use the existing workspace-scoped Decision/evidence/activity records for an
owner-reviewed maintenance proposal with exact scope, current Engine/workload/
distribution/proxy evidence, preserved checkpoints and reconciliation criteria.
Acceptance must identify the affected installation and permitted intervention;
application-task approval cannot substitute for it. This release implements no
executor for such a decision. Store canonical enum codes and source references;
the existing responsible-user locale renders PL/EN guidance. Private paths,
container names and raw runtime diagnostics stay in private operator evidence.

There is no background Docker/WSL monitor in this change. Provider metadata
publishes unknown health rather than accepting task/provider declarations or
periodically waking a distribution. Structured health evaluation is a bounded
diagnostic contract, not fresh automatic attestation. Synthetic process tests
inject a trusted dependency to exercise later lease/checkpoint gates; no
configuration, environment variable or API field selects that dependency.

## Recovery evidence and invalidated test premise

The RF-HOST-034 Engine-down result remains historical. Subsequent owner recovery
restored Docker Desktop **4.90.0.238679**, Engine **29.7.2** and the two baseline
workloads. The owner reported that all Docker program processes had to exit
before both active socket-parent directories were moved aside. Docker then
recreated its runtime directories. This was owner maintenance, not a repeatable
agent action or authority for further filesystem changes.

[Docker Desktop 4.90 release notes](https://docs.docker.com/desktop/release-notes/#4900)
describe a Windows stuck-socket startup fix. The owner's machine nevertheless
reproduced an inaccessible `sailor-ingest.sock` and backend crash after the
supported atomic restart. The related upstream
[issue #554](https://github.com/docker/desktop-feedback/issues/554) remained open
and unassigned when checked on 2026-09-13. Neither statement proves a fix here.
Owner evidence dates older stale runtime directories to 2026-08-29, before the
dedicated distribution work. RF-HOST-035 did not inspect or touch those paths.

The owner's later forced user-distribution termination caused a proxy exit and
`DockerDesktop/Wsl/ExecError` after successful native ping/version checks. This
was test-induced proxy failure, not evidence that Windows Engine had failed.
Supported integration OFF/Apply then ON/Apply restored native access, without
a full Engine restart in that observation. These actions were not repeated.
Forced termination is therefore invalid as a natural lifecycle test or cleanup
requirement. Earlier RF-HOST-032/033/034 termination-based durability claims
must not be used as proof of failure on ordinary use or safe cold-start behavior.

## Natural-use verification and verdicts

RF-HOST-035 observed the dedicated distribution already **Running** at baseline,
with Windows Engine 29.7.2 and two running workloads. It did not force a Stopped
baseline. Both harmless native commands used the default non-root identity, an
empty environment plus Linux-only PATH, ELF Docker CLI and the Unix socket.

| Cycle | Native command duration | Idle observation after exit | Result |
| --- | --- | --- | --- |
| 1 | 179 ms | 127.402 s | Running, native server 29.7.2 reachable on next use. |
| 2 | 104 ms | 125.079 s | Running; later post-idle check reconfirmed socket/server and Docker integration process. |

Both cycles passed the permitted healthy-Running branch. No natural stop or
cold-start transition was observed or claimed. Windows Engine and both baseline
workloads remained running afterward; names/status only were compared, without
logs, environment, mounts or application data. No restart, settings toggle,
termination, socket/directory operation or repair was performed.

**HOST-LIFECYCLE-GUARDS-READY** requires the focused guard/process tests, provider
and recovery regressions, static/build checks and these two passing cycles.
It means the current uncontained providers are denied, not that an isolated
execution adapter exists or that these edits were deployed to the running host.

Verification passed: 335 Worker/provider/broker/input/protocol/lease/recovery
regressions, 23 lifecycle tests (including the real test-launcher entrypoint
with a fake Engine), seven inventory-preflight tests, four API contract unit
tests, 42 PL/EN UI states, lint, TypeScript and server/web builds. Screenshots
were also inspected at mobile and desktop widths. Full database/API integration
and Docker container builds were not run because this task excludes those
mutations; the updated database fixtures are typechecked, not live-verified.

The separate **READY-FOR-PINNED-OPENSHELL-INSTALL** prerequisite verdict applies
to the unchanged [RF-HOST-033 pins and installation plan](openshell-installation-preflight.md).
The refreshed snapshot had Windows build 26200, 23,159,398,400 free host bytes,
over 14 GiB guest available memory, unused 8080/8081 ports on both sides,
LanmanServer Running/Auto, the same x86_64 WSL kernel and cgroup2 controllers.
The RF-HOST-033 security-interface evidence remains tied to that unchanged
kernel. The 10 GiB installation reserve still leaves over 10 GiB host headroom.
Recheck volatile resources before a separately authorized install. Hard
disk/log/output bounds, containment and live sandbox behavior remain unproven;
installation readiness grants no execution, installation or model authority.

Keep observe mode, `executionSupported=false`, `pilotReady=false` and Hermes
disabled. The subsequent separately authorized
[RF-HOST-036 artifact installation](openshell-installation-preflight.md#rf-host-036-installed-artifacts-and-proof-limits)
installed the pinned CLI and three image digests without starting a gateway,
sandbox or model. Host lifecycle admission remains unchanged.
