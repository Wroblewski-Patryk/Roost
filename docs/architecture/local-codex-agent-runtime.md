# Local Codex Agent Runtime

[RF-HERMES-004 / ADR-001 v1](../decisions/ADR-001-direct-codex-app-server-pilot.md)
accepts the pilot target Roost control plane/API → Local Worker → directly Codex
App Server. Hermes is optional outside authority/policy/budget/admission/stop
enforcement; OpenShell is optional isolation. executionSupported=false,
pilotReady=false and liveAdmissionAllowed=false remain unchanged.

[RF-HERMES-003](hermes-clean-transport-api.md) finds no complete clean public
transport API in the pinned Hermes release. Five helper imports are clean; the
connection/session imports still trigger configuration/provider discovery and
denied mkdir. Its recommendation is resolved by ADR-001; the audit remains dated
evidence and does not qualify a production adapter or change admission behavior.

[RF-HERMES-002](../operations/hermes-linux-synthetic-transport.md) verifies a pinned
private Linux installation and an independent bounded Worker transport. Hermes
integration remains blocked by public-session import side effects; no session
turn, model or production runner was enabled. Synthetic process-group proof is
not filesystem/network isolation, real App Server compatibility or pilot admission.

[RF-HERMES-001](hermes-codex-isolation-assessment.md) distinguishes the Hermes
model provider from its optional Codex App Server runtime. Native Codex command
sandboxing is a candidate boundary; OpenShell is not an established prerequisite.
This static assessment leaves provider, output and host-lifecycle admission closed.

[Adopt-before-build and implemented provider contract v5](adopt-before-build.md)
still describe the existing CLI reference and blocked Hermes diagnostics. The
new direct App Server adapter is not implemented, and the RF-HERMES-002 wrapper
is not approved for production. Hermes compatibility is no longer a pilot
prerequisite under ADR-001; all existing task admission denials remain active.
Neither host metadata nor the execution environment flag grants pilot admission.

An [offline examination of the pinned Hermes transport](../operations/hermes-windows-attestation.md#offline-transport-examination-adapter-blocked)
reproduced missing byte and process-tree fences with a fake App Server. It does
not deliver a production adapter or alter this host's spawn/recovery path.

[Material unknown interviews](material-unknown-interviews.md) bind short question blocks to exact human decisions, immutable proposals and dependency-specific Ready fences. Resolution requires fresh Submit and never revives old dependent-operation grants.

[Governed task clarification](governed-task-clarification.md) provides typed specialist conversation and deterministic receipt summaries without changing task authority.

[Typed work handoff](typed-work-handoff.md) records exact recipient acceptance
of a pinned completed result without authorizing review, release or execution.

[Versioned procedure composition](versioned-procedure-composition.md) binds the base,
application extension and risk requirements to the same Ready/execution seal.

[Native task risk assessment](native-task-risk.md) binds the prepared scope and joint
impact to Ready, execution admission and task capability grants. Classification
is followed by [level-specific native admission](native-risk-admission.md); neither activates execution.

[Native serious-incident suspension](native-capability-suspension.md) fences exact
capabilities and reuses the context-stop/recovery boundary. Owner intervention
requires reread/replan and never undoes external changes.

## Current Supervised Runtime

[RF-HOST-035 host lifecycle safety](../operations/host-lifecycle-safety.md)
adds an independent Worker/API denial before recovery, lock, claim and spawn:
current providers lack enforced isolation from Docker/WSL host control. Health
and owner maintenance decisions cannot override it. Non-retryable maintenance
failures retain checkpoints and the writer lock; there is no automatic repair.


The [native content redaction gate](native-runtime-redaction.md) applies before
model dispatch, diagnostics and checkpoint persistence in the API and host.
`native_runtime_redaction_v1` is required for supervised admission. Sensitive
required content blocks; incidents contain no detected values.

Supervised Codex execution is currently blocked by the
[hard output-token admission gate](execution-packet-contract.md#hard-output-token-admission-rf-host-010):
the installed CLI has no proven execution-wide output cap. Even a valid accepted
budget cannot authorize spawn. This is independent of the production disabled flag.

The Windows login host also supports `executionMode: "observe"`. This mode
branches before recovery, writer locking and repository validation into a
separate registration/heartbeat loop. It cannot claim/recover executions or
spawn Codex, even when the API execution flag is enabled. Its application
mapping is advertised as **declared only**, not verified runnable readiness.
It advertises observer/heartbeat capabilities, host version and mode; the API
returns workspace-scoped runtime readiness in register/heartbeat responses.
Both host listings and readiness project an expired heartbeat as offline after
60 seconds. See the [Windows observer runbook](../operations/local-codex-agent-host.md#observer-login-autostart).

Native review commands support [per-agent credential bindings](agent-credential-principal.md)
and require [exact task capability grants](task-capability-grants.md) for agent writes.
Grants authorize only the three native review/manager operations and never activate execution.
These keys do not authorize the host protocol or activate executions. The host
credential below retains its separate integration role.

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

The operator selects an absolute Windows application workspace in the private
Agent Host configuration, for example `C:\Workspaces`. Drive roots and relative
paths are rejected; the repository does not prescribe a machine-specific path.

Every runnable repository must be a direct physical child of the configured root.
The Agent Host rejects paths outside that root, nested paths, `..` traversal,
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
- Codex owns the interactive coding session. The configured `workspace-write`
  mode targets command writes to the selected repository; extra/temporary roots,
  outside reads, provider state and external tools need independent qualification.
  This is not proof that the whole process accesses only that repository.
- Git remains the source of truth for source-code transfer. The Agent Host does
  not commit, push, deploy, or publish.

## Execution Flow

1. The owner creates a normal Roost task linked through its project to exactly
   one application.
2. A human owner/admin/member opens **Prepare execution** in the task workbench
   (or **Save and prepare execution** in Operations), reviews the contract and
   invokes **Submit for execution / Przekaż do wykonania**. This is the only
   versioned, idempotent Ready command, shared with the runtime API. Draft and
   Needs context/decision are durable nonexecuting states. Creation, assignment,
   ordinary edits, old API writes and imports cannot bypass it. Viewers and API
   keys cannot accept the contract.
   Successful validation pins [Ready context](execution-packet-contract.md#accepted-context-at-ready-rf-ctx-006)
   on the existing task. The owner can then queue an execution from the task
   workbench or API. Missing/changed Ready blocks queue and claim. Accepted source
   writes now invalidate Ready in the same database transaction via persisted
   source watches and the shared source/admission fence. The owner can inspect
   changed sources; a reverted edit still requires explicit acceptance again.
3. A Windows Agent Host registers for visibility, confirms protocol admission,
   then inspects pending executions and local ownership through
   [safe recovery](agent-host-recovery.md). Registration grants no writer slot.
4. The host atomically claims one compatible queued execution with a short
   renewable lease.
5. The host fetches current task/application context with the execution-bound
   [versioned packet](execution-packet-contract.md), confirms its lease and
   validates completeness and consistency before execution-specific processes.
   It pins both resolved contexts in the existing checkpoint, checks the local
   repository and seals the bounded `roost-provider-input-v1` envelope. Both
   adapters receive the same canonical input, with provenance, exact model/effort
   and no mandatory startup tools. The existing Direct launcher consumes this
   envelope once; Hermes launch remains blocked. Worker rechecks path/origin,
   branch/commit, then fetches and validates both contexts again immediately before
   `codex exec --json --sandbox workspace-write -`. Changed context prevents
   spawn and requires reconciliation/replanning; recovery compares the same pin.
   A final lease refresh observes the active stop fence; synchronous Ready/risk,
   lease/duration/output/protocol checks guard envelope consumption and spawn.
   Changed or substituted input cannot silently refresh the active session.
   Missing contracts fail with
   owner-visible field diagnostics; they do not start Codex.
6. Heartbeats renew the lease. Structured Codex progress becomes execution
   events visible in Roost. An owner cancellation stops the local process.
   Accepted-source invalidation also durably fences active attempts. The host
   observes it at checkpoints, runner boundaries or heartbeat, stops the process
   tree once and retains ownership for owner reconciliation. Late progress or
   completion cannot renew authority; see the
   [active stop contract](execution-packet-contract.md#active-work-after-accepted-context-changes-rf-ctx-006).
7. The host reports the final response, changed paths, verification commands,
   usage, or a structured failure. Roost stores completion evidence linked to
   the task. The task remains open for [native result review and manager correction
   return](task-review-workflow.md). A review decision binds a reported material
   version and never grants delivery or release authority.

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

### Transport retry versus execution retry (RF-HOST-010/011)

The built-in `openai` provider may perform its bounded internal HTTP/SSE retries.
Worker does not override the reserved `model_providers.openai` configuration.
Those transport operations remain inside the same CLI process, logical turn,
Roost execution/attempt and immutable `roost-provider-input-v1` envelope. They
do not consume another envelope or reset its revisions, deadline, lease or budget.
All transport waiting counts against the original duration; only the existing
Roost heartbeat can confirm still-current lease/context authority, never a
provider response or reconnection message.

One invocation supplies stdin once. A terminal `turn.failed`, nonzero exit,
second logical turn/completion, or missing final turn/result fails the attempt
as non-retryable and stops this host execution path after process-tree cleanup.
Worker neither restarts CLI, selects another provider nor increases the budget.
A nonterminal CLI diagnostic is not a new turn and grants no authority. Explicit
future work remains governed by the existing queue and independent budget review.

The current exec JSONL stream does not expose an authoritative transport retry
counter. Completion/failure accounting therefore reports `transportRetryCount:
null`, never inferred zero. Final reported usage belongs to this one attempt;
`usageAccounting: reported_final_only` does not establish the cost of partial or
undelivered responses (`partialUsageAccounting: unknown`). No exporter, OTel or
external telemetry is enabled. RF-HOST-010 hard output/cost enforcement and the
general RF-HOST-011 loop breaker remain open. A narrowly approved synthetic live
proof cannot relax production's output-budget admission.

This clarifies transport ownership and tightens local Worker terminal-result
validation. It does not change API/DB commands, packet/registry contract v4,
host protocol v1 or `worker_provider_input_v1`; the existing metadata/details
maps carry optional accounting. No new retry engine or shared admission version
is needed. Regression evidence: `test:agent-transport`, existing duration, lease,
recovery and process-context suites.

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
writer lock for reconciliation. Output-token admission now fails closed until an
enforcing runner is proven. Cost enforcement and independent approval of a
replacement budget remain separate gates. Observe mode does not run this timer.

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
existing `capabilities` advertises implemented controls. Protocol metadata uses
the existing host table without a separate version registry.

Both capability lists include `worker_provider_input_v1`, `ready_context_pin_v1`,
`output_budget_fail_closed_v1`, `active_context_stop_v1`, `single_task_scope_v1`
`task_role_separation_v1`, `native_runtime_redaction_v1`,
`native_risk_admission_v1`, `procedure_composition_v1` and
`typed_result_revision_v1` while protocol version
stays `1`. A host without
these controls cannot claim from the new API; a new host cannot run against an
API missing any capability. The separate Ready and active-stop contracts add
their task/execution fields, migrations and scoped endpoints, documented above.

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

Existing installations may retain the former seed's `task_ready_for_codex`
trigger and automation rule. Minimal installation bootstrap neither creates nor
resets these definitions. They document the future event boundary and may only
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
enforcement: it does not inventory Docker resources. The supervised host now
requires the accepted deterministic task branch before preparation and before
the final pre-spawn context fetch; it never creates or switches that branch.
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
| `notesapp` | `NotesApp` | `https://github.com/example-org/NotesApp.git` | `https://notesapp.example.com/` |
| `contentapp` | `ContentApp` | `https://github.com/example-org/ContentApp.git` | `https://content.example.com/pl` |
| `portalapp` | `PortalApp` | `https://github.com/example-org/PortalApp.git` | `https://portalapp.example.com/` |
| `demoapp` | `DemoApp` | `https://github.com/example-org/DemoApp.git` | `https://demoapp.example.com/` |

A commit and push may trigger Coolify deployment, but the Agent Host must not
perform either action unless the governing Roost task explicitly grants that
authority. Repository work and release authority remain separate contracts.

## Governed decision changes

[Decision supersession and reopening](decision-supersession-impact.md) binds explicit
owner acceptance to a versioned downstream impact preview and native risk gates.
Accepted changes fence only affected Ready and active work, retain predecessor
history and require fresh admission. Typed event delivery reopens pending questions
without acceptance, scheduling, new grants or agent activation.

[Delegated decision authority](delegated-decision-authority.md) adds current-owner
reservations and exact versioned ordinary-decision mandates on canonical workforce
routes. Accepted authority enters task context and the Ready/review view. Expiry
caps native admission lifetime; hierarchy, owner or mandate changes use the same
active-stop fence. The host protocol is unchanged and remains in observe mode.
