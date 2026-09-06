# Local Codex Agent Runtime

## Current Supervised Runtime

The Windows login host also supports `executionMode: "observe"`. This mode
branches before recovery, writer locking and repository validation into a
separate registration/heartbeat loop. It cannot claim/recover executions or
spawn Codex, even when the API execution flag is enabled. Its application
mapping is advertised as **declared only**, not verified runnable readiness.
It advertises observer/heartbeat capabilities, host version and mode; the API
returns workspace-scoped runtime readiness in register/heartbeat responses.
Both host listings and readiness project an expired heartbeat as offline after
60 seconds. See the [Windows observer runbook](../operations/local-codex-agent-host.md#observer-login-autostart).

The canonical login launcher uses a dedicated `mcp_codex_worker` credential in
Windows Credential Manager for the current user. Key creation and activation/
revocation commit a secret-free event atomically with the key mutation. Raw key
material is returned only at creation and never included in audit events.

Task Scheduler enters through a locally compiled Windows GUI executable, which
creates PowerShell with `CreateNoWindow=true`/`UseShellExecute=false`; PowerShell
starts Node the same way. This prevents console creation before script-level
window settings take effect. The GUI launcher waits and forwards the child's
exit code to preserve automatic restart. The same interactive identity, limited
privileges, launcher mutex, singleton port and Credential Manager path remain
in effect. Installation updates one canonical task/binary and restores a running
observer after an action/binary change; unchanged reinstall does not restart it.

This document describes the implemented supervised baseline. The accepted
[autonomy activation contract](autonomy-activation-contract.md) defines the
future model and evidence gates. Its autonomous release target does not change
this host's current authority or turn an execution report into task delivery.

Roost uses a split runtime:

```text
Owner browser
    |
    v
Roost web/API on VPS ---> private PostgreSQL on VPS
    ^
    | HTTPS + workspace-scoped API key (outbound from laptop)
    |
Local Codex Agent Host on Windows ---> local application repositories

Local Roost development ---> local Roost API ---> local PostgreSQL
```

The approved Windows application workspace is exactly:

```text
C:\Personal\Projekty\Aplikacje
```

Every runnable repository must be a direct physical child of this directory.
The Agent Host rejects a different root, nested paths, `..` traversal,
symlinks/junctions, a mismatched Git toplevel, and a mismatched `origin` URL.
Future applications may be added only by creating their repository directly
under this root and explicitly adding their slug, directory, canonical origin,
and deployment URL to the local allowlist.

The allowlist rejects duplicate directories (case-insensitively on the Windows
host) and duplicate normalized origins. Before using a claimed application's
directory, the host requires its ID to match the execution's application ID and
its primary repository to match the local origin. A single repository needs no
primary flag; multiple repositories require exactly one primary. Missing or
ambiguous identity fails before reading execution context or starting Codex.
Roost is excluded from the managed portfolio and cannot be an Agent Host execution target. The host rejects its slug, directory and canonical origin.

The production database is private to the VPS deployment. Neither Codex nor a
local development server connects directly to it. Local development uses a
separate local PostgreSQL database. Production work is exchanged through the
workspace-scoped Roost HTTP API.

This topology keeps code execution where the repositories and Codex login
already exist, while the owner-visible task queue, execution history, and
evidence remain available in Roost on the VPS.

Workspace administrators configure this boundary from `Workspace settings ->
Agent connections`. The panel mirrors the public API base URL, local STDIO MCP
bridge configuration, separate key profiles, approved Windows workspace root,
Agent Host heartbeat, and foundation/execution mode. It never returns an
existing raw key. The `06 People / Agents -> Agent activity` workbench combines
Codex execution events with provider-neutral agent logs and refreshes while
visible.

## Ownership

- Roost owns task intent, application/repository metadata, authorization,
  execution leases, events, cancellation state, results, and evidence.
- PostgreSQL owns durable Roost state in each environment. Development and
  production databases are independent; schema moves through migrations, not
  database synchronization.
- The local Agent Host owns only temporary polling/process state and the mapping
  from an application slug to a local repository path.
- Codex owns the interactive coding session and changes files only inside the
  selected local repository under `workspace-write` sandboxing.
- Git remains the source of truth for source-code transfer. The Agent Host does
  not commit, push, deploy, or publish.

## Execution Flow

1. The owner creates a normal Roost task linked through its project to exactly
   one application.
2. The owner submits an explicit execution contract through the runtime API.
   Successful validation pins [Ready context](execution-packet-contract.md#accepted-context-at-ready-rf-ctx-006)
   on the existing task. The owner can then queue an execution from the task
   workbench or API. Missing/changed Ready blocks queue and claim.
3. A Windows Agent Host registers for visibility, confirms protocol admission,
   then inspects pending executions and local ownership through
   [safe recovery](agent-host-recovery.md). Registration grants no writer slot.
4. The host atomically claims one compatible queued execution with a short
   renewable lease.
5. The host fetches current task/application context with the execution-bound
   [versioned packet](execution-packet-contract.md), confirms its lease and
   validates completeness and consistency before execution-specific processes.
   It pins both resolved contexts in the existing checkpoint, checks the local
   repository, then fetches and validates both contexts again immediately before
   `codex exec --json --sandbox workspace-write -`. Changed context prevents
   spawn and requires reconciliation/replanning; recovery compares the same pin.
   Missing contracts fail with
   owner-visible field diagnostics; they do not start Codex.
6. Heartbeats renew the lease. Structured Codex progress becomes execution
   events visible in Roost. An owner cancellation stops the local process.
7. The host reports the final response, changed paths, verification commands,
   usage, or a structured failure. Roost stores completion evidence linked to
   the task. The task remains open for owner review.

## Security Boundaries

- Only outbound HTTPS from the laptop to the public Roost API is required. No
  inbound port, VPN, shared filesystem, or database tunnel is required.
- The Agent Host uses the `mcp_codex_worker` key profile. It can claim and report
  execution work and read the bounded task/application context; it cannot
  create keys, administer integrations, commit code, or deploy.
- The Roost API key stays in the host process environment. It is removed from
  the child Codex environment and must never be placed in a repository, prompt,
  task description, config JSON, output, or log.
- Repository paths are selected only from the local, secret-free mapping. A
  remote task cannot provide an arbitrary filesystem path.
- The mapping stores a direct-child directory name rather than an arbitrary
  path. It is validated at host startup and again before every execution.
- Non-interactive Codex runs use `--ephemeral` so automated session rollout
  files are not persisted outside the approved project workspace.
- The local configuration must select `workspace-write` (also the default).
  Startup and pre-execution validation reject other sandbox values; free-form
  task, plan or role claims cannot override this configured execution boundary.
- Workspaces scope hosts, queues, leases, events, and results. Lease tokens
  prevent another host from updating a claimed execution.
- Production PostgreSQL is never exposed publicly and is never used by a local
  Roost backend.

## Failure And Recovery

The [recovery contract](agent-host-recovery.md) supports the same execution/attempt
only from matching durable `claimed`/`prepared` checkpoints with valid authority.
Later stages, expired leases and ambiguous state stop with owner-visible
diagnostics. The host acquires the machine-wide writer slot after protocol admission and before claims, and processes
executions sequentially. An expired API lease does not prove that the old process
stopped. The host
renews before launch, uses bounded API requests, and stops the Windows child
process tree on cancellation, rejected authority or expiry of its last confirmed
lease (with a five-second stop margin). A late response cannot revive authority.
The host stops polling after lease loss and never reports that execution as a
success. Its writer lock remains after lease loss or unconfirmed tree termination;
manual reconciliation is required before restart. These controls cannot guarantee
termination during an OS freeze or coordinate tools bypassing the host entrypoint.
Do not activate autonomous writing based on lease expiry alone.

The [packet duration limit](execution-packet-contract.md#hard-duration-limit)
independently stops work five seconds before `maxDurationSeconds` elapses from
the original server `startedAt`. Healthy heartbeats and pre-spawn recovery do
not reset it. Expired or invalid duration context prevents launch/completion,
stops new claims, reports a non-retryable failure when possible and retains the
writer lock for reconciliation. Token/cost enforcement and independent approval
of a replacement budget remain separate gates. Observe mode does not run this timer.

The supported Windows host uses exclusive creation of
`C:\ProgramData\Roost\agent-host-writer.lock`, independent of application slug,
workspace or host key. It is secret-free process/recovery state outside application
repositories. A second compatible host may register a heartbeat but fails before claiming work. Normal
shutdown releases only the lock owned by that process. A crash, empty/corrupted
lock or uncertain execution does not trigger automatic stale-lock removal: old
Codex descendants may still be running. Recovery can reclaim only a matched
pre-spawn checkpoint from a confirmed dead owner under the exclusive recovery
gate; neither PID nor age alone is sufficient. The state directory must be a physical
directory writable only by the trusted host operator; permission failures stop
startup. The CLI configuration cannot choose another lock location.

- Expired `claimed` or `running` leases retain their execution and host identity;
  they require reconciliation and are never automatically put back in the queue.
- Failed and cancelled executions are immutable history. Retry creates a new
  execution linked to the same task and application.
- A disabled host cannot register heartbeats or claim work.
- The owner can cancel queued work immediately. Active cancellation is observed
  on the next heartbeat and acknowledged by the host.

## Host/API Protocol Admission (RF-HOST-014)

The single wire declaration is
[`host-protocol.json`](../../src/modules/agent-runtime/host-protocol.json), shared
by API and host. `runnerVersion` remains a diagnostic build label, not admission.
Existing `metadata.protocolVersion` advertises numeric version `1`,
`metadata.executionMode` explicitly declares `supervised` or `observe`, and
existing `capabilities` advertises implemented controls. No new host table,
version registry, endpoint or migration is used.

Both capability lists now include `ready_context_pin_v1` while protocol version
stays `1`. A host without Ready support cannot claim from the new API; a new host
cannot run against an API missing that capability. The separate Ready task
contract adds two task endpoints and one nullable column, documented above.

Register/heartbeat, host listings and readiness expose `runtime.protocol` (or
root `protocol` for readiness): `version`, `apiCapabilities` and
`requiredHostCapabilities`. Per-host `runtime.compatibility` contains
`compatible`, a fixed `reason` and `missingCapabilities`. Missing, malformed,
older or newer versions are rejected without downgrade. Extra API capabilities
are tolerated, but every baseline capability must exist; an unknown required
host capability blocks the host.

The host checks the API declaration and positive acknowledgement before recovery
inspection, writer acquisition, each claim, recovery lease rotation, context
preparation and final pre-spawn context reads. Final synchronous protocol,
lease and duration assertions precede spawn. Disabled or unknown runtime state
also blocks work. A blocked process continues registration/heartbeat without
writer acquisition, recovery or claim. Blocking after a claim reports failure
when authorized, retains ownership and enters heartbeat-only reconciliation
until operator restart; restoring compatibility cannot replay that execution.

Independently, API recovery inspection, recovery lease rotation and claim check
stored host mode/version/capabilities plus the current request headers
`X-Roost-Host-Protocol` and comma-separated `X-Roost-Host-Capabilities`.
Legacy requests cannot borrow a newer process's stored declaration for the same
host slug. Rejection returns 409 `agent_host_protocol_blocked` with fixed
reasons, without changing attempts, checkpoints or leases. Unknown host returns
404. Lease/terminal reporting remains available for safe stop.
`executionEnabled=true` never bypasses admission.

Observer advertises only observer/heartbeat capabilities and never enters
supervised code. Missing/mismatched API protocol is recorded while online.
Online means recent heartbeat, not runnable readiness. Settings -> Agent
connections shows admission separately from heartbeat and runtime mode.
Server-derived reasons and allowlisted host-reported API/reconciliation reasons
are secret-free; client diagnostics cannot grant authority.

This is a declared compatibility contract, not binary attestation or an
authorization replacement. It does not lock deployments between the final
response and spawn, invalidate running work, coordinate backend/UI/schema
releases, drain/migrate/rollback, or update binaries. RF-HOST-014 remains partial.
Production stays disabled/observe.

## Activation Gate

Production deploys in `foundation_only` mode by default. Unless
`ROOST_CODEX_EXECUTION_ENABLED=true` is explicitly configured, Roost rejects
new execution requests and the Agent Host claim endpoint returns no work. The
database may contain applications, delivery projects, repositories, paused
trigger definitions, and historical executions while execution remains off.

The initial `task_ready_for_codex` trigger and its automation rule are seeded
as paused definitions. They document the future event boundary and may only
emit a `codex_execution_candidate` proposal; they do not create tasks or agent
executions. Activation requires a reviewed automation command contract, local
allowlist validation, a scoped worker key, a running Windows host, and one
explicitly approved non-critical trial.
- Production deployment and local host rollout are separate. Deploy the
  migration/API/web first, then start the laptop host with its production key.

The flag enables only `supervised_execution`. Target read-only, local-change,
pilot-release and broader autonomy stages are defined in the activation contract;
they are not implemented modes of this flag. Before expanding execution, prove
the corresponding context, exclusion, recovery, review and release controls.

## Required Resource Invariants

All implementation work uses one canonical clone per application, without
additional worktrees or copies, and at most one declared local runtime per
application. Initially one writing task is allowed across the entire laptop;
read-only analysis may run concurrently. Existing files and unknown resources
must be preserved until their provenance is understood.

The current path/origin allowlist is a foundation for these rules, not full
enforcement: it does not inventory Docker resources or enforce a task branch.
The writer lock coordinates supported host processes, not arbitrary editors,
bootstrap sessions or external tools; those must still honor the one-writer rule.
A future manifest and recovery contract must extend existing host/API boundaries
before claiming automatic reconciliation or resource hygiene guarantees.

## Explicit Non-Goals

- synchronizing or replicating local and production databases
- allowing Codex to write directly to production PostgreSQL
- running Codex on the resource-constrained VPS
- automatic commits, pushes, deployments, releases, or external communication
- treating task or context text as authority to bypass repository instructions,
  approval gates, or the Agent Host sandbox

## Approved Application Map

| Slug | Local directory | GitHub origin | Deployment |
| --- | --- | --- | --- |
| `aviary` | `Aviary` | `https://github.com/Wroblewski-Patryk/Aviary.git` | `https://aviary.luckysparrow.ch/` |
| `featherly` | `Featherly` | `https://github.com/Wroblewski-Patryk/Featherly.git` | `https://test.wroblewskipatryk.pl/pl` |
| `nest` | `Nest` | `https://github.com/Wroblewski-Patryk/Nest.git` | `https://nest.luckysparrow.ch/` |
| `soar` | `Soar` | `https://github.com/Wroblewski-Patryk/Soar.git` | `https://soar.luckysparrow.ch/` |

A commit and push may trigger Coolify deployment, but the Agent Host must not
perform either action unless the governing Roost task explicitly grants that
authority. Repository work and release authority remain separate contracts.
