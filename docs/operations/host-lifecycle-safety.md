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
program class. This is an authorized implementation target, not a currently
admitted provider or a successful end-to-end qualification.

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
test/config/environment bypass. Current code is unchanged and grants no synthetic
activation either. Qualification must use the ordinary API/Worker boundaries.

The required API/PostgreSQL qualification is currently blocked on unavailable
Docker Engine under the narrowly authorized existing-container test-DB route.
No Docker/WSL restart, database access or mutation occurred. See the
[readiness table](../architecture/agent-delivery-readiness.md) for evidence and
the single next prerequisite. The remaining sections describe the unchanged
real-provider and host-maintenance policy.

## Enforcement and scope

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
