# Local Codex Agent Host

Foundation V2 requires an explicit `metadata.executionContract.modelSelection`
for every supervised execution. See the [packet model admission contract](../architecture/execution-packet-contract.md#foundation-v2-explicit-model-admission-rf-host-016).
Older packets without model and reasoning effort fail closed. Observer mode is
unaffected and remains the configured mode until separately authorized gates pass.

This runbook connects a Windows laptop containing application repositories to
the production Roost queue on the VPS. The connection is outbound HTTPS only.

## Observer Login Autostart

The approved foundation installation uses exactly one task, `Roost Agent Host
Observer`, triggered at the owner's Windows login. It runs hidden, at limited
privilege, using the interactive Windows identity and `IgnoreNew` for duplicate
task starts. The task's executable is the locally compiled Windows GUI launcher
`roost-agent-host-launcher.exe`, not a console executable. It creates the system
Windows PowerShell process with `UseShellExecute=false` and `CreateNoWindow=true`
before PowerShell runs `roost-agent-host-windows.ps1 -Action Run`. PowerShell
likewise starts Node without a console. `-WindowStyle Hidden` and the task's
`Hidden` setting alone do not prevent an initial console flash; the GUI subsystem
and no-console process creation are the actual mechanism. The GUI launcher waits
for PowerShell and returns its exit code so Task Scheduler can detect failure
and restart the same action. It does not read credentials or log child output.
The launcher mutex also excludes repeated manual launcher starts;
the observer's fixed exclusive loopback port `127.0.0.1:43179` excludes a second
Node observer across sessions. This socket accepts no commands and immediately
closes connections. Windows releases the socket after a crash. Observer mode
does not use or clear the supervised writer/recovery lock.

Canonical user files are under `%USERPROFILE%\.roost\agent-host` (a direct
profile directory avoids packaged-app LocalAppData virtualization, so both
Codex and the Windows login task see the same files):

- `agent-host.json`: secret-free config copied from the example, with
  `executionMode: "observe"`, `baseUrl: "https://api.roost.example.com"`,
  one stable host slug and declared repository mappings.
- `status.json`: PID, host/workspace IDs, version, mode, last confirmed heartbeat
  and fixed diagnostic reasons. This is a last observation, not proof that its
  PID is still alive. Check the task and current heartbeat together.
- `stop.request`: cooperative stop signal; the launcher clears it on next start.
- `launcher-status.txt`: fixed launch-failure diagnostic when needed.
- `roost-agent-host-launcher.exe`: compiled from the canonical
  `scripts/roost-agent-host-launcher.cs` with the Windows .NET Framework 4 compiler
  as `winexe`; no SDK download or executable committed to Git.
- `roost-agent-host-launcher.exe.build.json`: source/binary SHA-256 fingerprints
  only, used to skip rebuilding an unchanged binary. A temporary `.pending.exe`
  is published only after compilation succeeds and removed on handled failure.

Keep this directory writable only by the Windows owner, SYSTEM and
administrators. The launcher references the canonical Roost checkout and reads
the generic Windows Credential Manager target `Roost/AgentHost/Observer`.
`Persist=2` persists for this user on this machine; it does not grant other
Windows users access. The dedicated API key uses `mcp_codex_worker`, never the
bootstrap/seed key. Provision through authenticated `POST /v1/api-keys` and
transfer its one-time response directly into `RoostCredential.Write` in memory
using `scripts/roost-agent-credential.ps1`. Never paste secrets into commands,
JSON, task arguments, Git, transcripts, or screenshots. The launcher passes the
key only in the child process environment, removes its own reference, and
does not write process output to log files.

From the canonical Roost checkout:

```powershell
.\scripts\roost-agent-host-windows.ps1 -Action Install
.\scripts\roost-agent-host-windows.ps1 -Action Start
.\scripts\roost-agent-host-windows.ps1 -Action Status
.\scripts\roost-agent-host-windows.ps1 -Action Stop
```

`Install` replaces the same named task; it does not create another host. A local
installation mutex serializes updates. It compiles before interrupting a running
observer; changing the binary/action cooperatively stops the old observer,
publishes the binary and restores a previously running task. Unchanged source
and binary hashes skip compilation and leave the observer process running.
The Windows .NET Framework 4 x64 compiler must exist at
`%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe`; a missing compiler or
failed build leaves the current task untouched. An invalid build fingerprint is
rebuilt, never executed as configuration. Keep the source checkout and local
state under trusted owner control.
`Start` does not register another task. `Stop` asks the host to exit and waits
up to 30 seconds; production projects offline within 60 seconds after its last
heartbeat. Run `Start` to restart. Stop before editing config or updating the
checkout. A stable workspace and slug upsert the same production host record.
Network failures retry without executing work. Invalid credentials or disabled
hosts stop with a fixed reason. After correcting them, explicitly start again.
The existing Task Scheduler policy allows three retries, one minute apart,
after an action-start failure. It is not proof of restart after arbitrary child
exit: a synthetic child returning 17 did not restart on this Windows host,
whether the initial start was manual or time-triggered. The GUI wrapper passes
that code through unchanged; a separate process supervisor is outside this fix.
A port conflict fails closed; inspect its owning process before changing
anything, rather than killing an unknown process or deleting writer locks.

`npm run test:agent-host-launcher` is Windows-only. It compiles the real source,
checks its GUI PE subsystem, verifies `GetConsoleWindow()==0` from a synthetic
PowerShell child, path quoting, exit-code propagation and unchanged-build
idempotence and safe source upgrades/build failures. A uniquely named temporary
scheduled task tests automatic retry after a controlled action-start failure,
then is removed along
with its exact temporary files. It does not read credentials or stop/crash the
real observer. A real login/reboot is not simulated by this test: inspect the
owner-specific logon trigger and verify at the next normal login. Launcher-only
changes require local `Install` and verification, not a VPS rollout.

Windows mechanism references: Microsoft documents the
[Windows executable compiler target](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/output#outputtype)
and [CreateNoWindow with UseShellExecute=false](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.createnowindow?view=netframework-4.8.1).
The [Task Scheduler protocol](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-tsch/2ff4aa5a-7bc4-449f-bbb1-27475645867f)
defines the bounded meaning of `RestartOnFailure` used by that test.

To rotate, stop the host, create a new dedicated scoped key, write it directly
to the same credential target, revoke the old key with `PATCH /v1/api-keys/:id`
and `{ "active": false }`, then start and verify a fresh heartbeat. If storage
fails, revoke the newly created key before retrying. Creation and revocation
are recorded atomically as `api_key.created` / `api_key.revoked` events with
actor, resource ID and safe scope/profile metadata, never raw key material.

When an authorized production operator has container access but no human API
session, `dist/operations/provision-agent-host-key.js` provides a narrow
administrative path inside the existing backend container. It uses the same
audited key service as the API. Its strict input contains action (`create` or
`revoke`), workspace UUID, dedicated name, `ownerAuthorized: true`, and key ID
only for revoke. Creation fixes the profile to `mcp_codex_worker` and rejects an
existing active name; revocation requires matching workspace, name and exact
profile. It cannot create broad keys. It requires production mode and a captured
stdout receiver; never run it directly in a terminal. Pipe the one-time JSON
response through SSH straight into the Windows credential-store receiver in
memory, and print only the new key ID/profile after successful storage. Audit
source is `owner_authorized_host_provisioning`, actor is system (not an
impersonated human). This administrative operation requires explicit owner
authority and does not relax the API's human-admin checks.

In `Workspace settings -> Agent connections`, verify online/offline, heartbeat,
host version, observer mode, workspace and declared applications. The visible
panel refreshes every 15 seconds and shows a read error separately from offline.
Observer mode
always disables execution locally, independently of the server flag. Production
must remain `foundation_only` / execution disabled until a separate owner
decision. No Codex login is required for observation and no application
repository is inspected or changed. Supervised setup below is a separate,
explicit activation path; an omitted `executionMode` retains legacy supervised
behavior. The login launcher rejects any mode other than `observe`.

## Prerequisites

- The Roost migration and API/web build containing the agent-runtime endpoints
  are deployed on the VPS.
- `codex` and `git` are available in `PATH` on the laptop.
- `codex login` succeeds for the local Windows user that will run the host.
- Every runnable Roost application has a stable slug and a local repository.
- The owner creates an API key with profile `mcp_codex_worker`. Copy the raw key
  once into a Windows secret manager or the process environment; never write it
  to this repository or the JSON config.
- Production remains in foundation-only mode until the owner explicitly sets
  `ROOST_CODEX_EXECUTION_ENABLED=true`. Starting a host before that gate is
  harmless: registration/readiness may work, but claims return no work.

## Local Development Database

Develop and test Roost against local PostgreSQL as documented in
`docs/engineering/local-development.md`. Keep the local `DATABASE_URL` pointed
at localhost. Do not copy production data down, point the local backend at the
VPS database, or synchronize database files. Apply the same reviewed Prisma
migrations independently in local and production environments.

## Host/API Compatibility

Ship the same [protocol declaration](../../src/modules/agent-runtime/host-protocol.json)
with API and host. `runnerVersion` is informational; do not edit config or claim
extra capabilities to bypass an incompatible binary. Register/heartbeat and
Settings -> Agent connections expose admission reasons separately from online.
`host_protocol_missing/mismatch`, `host_capabilities_missing` and
`request_protocol_missing/mismatch` require a compatible host/API release;
`observer_mode` and `runtime_disabled` are intentional in production.

Deploy API first while execution remains disabled, then normally stop/start the
observer to load updated modules. A new host against an old API stays online with
`api_protocol_missing`; an old host against a new API cannot recover/claim
without the required contract. No automatic update, drain or rollback is provided.
Do not activate agents as part of upgrading.

After a post-claim compatibility failure, inspect the existing execution and
writer checkpoint before restart. `execution_reconciliation_required` is a
heartbeat-only hold, not authority to clear ownership or create another run.
See the [protocol contract](../architecture/local-codex-agent-runtime.md#hostapi-protocol-admission-rf-host-014).

## Configure Repository Mapping

Copy `config/roost-agent-host.example.json` to a user-owned location such as:

```text
C:\Users\<user>\.roost\agent-host.json
```

Set the host label, absolute `workspaceRoot`, public `baseUrl` and repository
mapping for this installation. The example paths and applications are fictional.
Keep the real file outside Git. A slug must match the Roost
`Application.slug`; each `directory` must be a direct child of the root and its
`originUrl` must match the local Git `origin`.

Validate the complete allowlist before adding the API key:

```powershell
$env:ROOST_AGENT_HOST_CONFIG = "$env:USERPROFILE\.roost\agent-host.json"
npm run agent:codex-host:check
```

The check fails closed for missing/non-Git directories, paths outside the
approved root, nested paths, links/junctions, Git-root mismatches, and origin
mismatches. The same validation runs before every claimed execution.

## Add An Application Through Configuration

Use the existing workspace-scoped Application and delivery-project relationship.
Set the application's canonical repository (exactly one primary when multiple
repositories exist), deployment metadata and technical/product context. Add its
slug, direct-child directory and origin to the same host allowlist, then run
`npm run agent:codex-host:check -- <config-path>`. No per-application host code is
needed. Adding a mapping alone does not satisfy execution-context or activation
gates and does not authorize the bootstrap automation to edit that application.

Two slugs cannot point at the same Windows directory or duplicate clones of the
same remote. A claimed application's ID and repository must agree with the local
mapping before the host reads task context or starts Codex. Correct inconsistent
metadata/configuration through its owning contract rather than bypassing the
check. The same onboarding rules apply when the target application is Roost.

## Start In PowerShell

Set secrets only for the current process and start the long-running host:

```powershell
$env:ROOST_BASE_URL = "https://api.roost.example.com"
$env:ROOST_AGENT_API_KEY = "cc_v1_replace_with_one_time_key"
$env:ROOST_AGENT_HOST_CONFIG = "$env:USERPROFILE\.roost\agent-host.json"
npm run agent:codex-host
```

Run this command from the Roost checkout. A successful start prints the
registered host name and ID. The owner console shows it in `06 People/Agents`
under **Agent activity**. `Workspace settings -> Agent connections` shows the
same API endpoint, current host heartbeat, foundation/execution mode, and
copyable setup commands.

For a local end-to-end test, use a separate development key and:

```powershell
$env:ROOST_BASE_URL = "http://localhost:3102"
```

## Queue And Observe Work

Before queueing, prepare `metadata.executionContract` through the existing
execution API using the [packet contract](../architecture/execution-packet-contract.md).
Task-only console requests do not fill its mandatory fields. The host fetches
the current execution-bound packet and rejects missing or inconsistent context
before starting execution subprocesses. Corrections require updated source records
and a new execution with an explicit corrected contract.

1. Link the Roost task's project to one application in Product Engineering.
2. Open the task workbench and select **Run with Codex**.
3. Open **Codex runs** to inspect queue state, host heartbeat, progress events,
   changed files, verification, final response, and errors.
4. Use **Cancel** for active work. Use **Retry** only after reviewing a failed or
   cancelled run.
5. Review the local Git diff. Commit, push, deploy, and mark the task complete
   through the normal owner-approved workflow.

If a task has no application link or more than one matching application, Roost
rejects queueing rather than guessing which local repository to edit.

## Production Service

At startup the host first inspects its own nonterminal Roost executions.
[Recovery v1](../architecture/agent-host-recovery.md) can resume the same execution
only before the durable spawn barrier, with a matching local/API checkpoint,
confirmed dead prior parent, valid lease, unchanged prepared packet/workspace
and a single writer lock. Long shutdowns that outlast the lease, interrupted
Codex work and uncertain effects require operator reconciliation.

After an interactive trial, run the host under a Windows service wrapper or
Task Scheduler using the same Windows user that owns the Codex login and local
repositories. Configure automatic restart, a working directory of the Roost
checkout, and environment variables from a protected machine-level secret
source. Do not embed the API key in a checked-in script or task XML export.

Run only one writing host on the laptop. Before registration the supported CLI
atomically acquires `C:\ProgramData\Roost\agent-host-writer.lock`. All application
slugs, workspace keys and host labels share that location. The directory must be
physical and writable by the trusted host operator; do not relax its permissions
to let an untrusted task modify the lock. No local config field overrides the
location. A second host exits without registering or claiming work.

Normal shutdown releases only its own lock. A crash, lease loss or failure to
confirm process-tree termination retains the lock. Do not remove it based only
on age or an absent parent PID: descendants may still be writing. Reconcile the
previous process tree, execution and local files first; only then may the trusted
operator remove this exact stale lock and restart. Never delete unknown state
directories or script automatic lock cleanup. Service restart policies must stop
retrying when operator reconciliation is required. This does not police other
coding tools; bootstrap sessions must still obey the single-writer rule.

Atomic API claims alone do not prove an expired worker stopped.
The host renews before launching Codex, makes API calls with a ten-second timeout,
and stops the Windows process tree when authority is rejected or the confirmed
lease reaches its five-second stop margin. It then stops polling for new work.
Reconcile local processes and files before restarting; do not start a second host
as a recovery shortcut. A late heartbeat cannot revive lost authority.

The supervised host also enforces the packet's `maxDurationSeconds` from the
original server `startedAt`, with a five-second process-stop reserve. This clock
includes preparation and downtime before safe pre-spawn recovery; heartbeats
cannot extend it. Keep Windows and server clocks synchronized. Duration expiry
stops claims and retains the writer lock even after confirmed termination.
Reconcile processes/files and independently review the plan and new budget
before another execution; do not clear the lock or retry automatically.
This change does not enable execution or change observe mode.

Supervised hosts also refresh authoritative task/application context after the
durable spawn barrier and before creating the model process. The refreshed
context must match `contextRevision` saved at preparation. Context changes,
validation failures or failed refresh stop further claims and retain the lock;
review the current records and reconcile the execution before queuing a new
contract. A `runner_started` event alone does not prove a model started. Legacy
prepared checkpoints without a context pin require reconciliation. Deploy the
updated API and use the updated canonical host before supervised execution:
old hosts cannot write the newly required pinned checkpoints. Observation is
unaffected. See the [fresh-context contract](../architecture/execution-packet-contract.md#fresh-authoritative-context-before-spawn-rf-ctx-006)
for the remaining concurrent-edit and Ready/mid-execution boundaries.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Host exits with `ROOST_* is required` | Set all three process environment variables. |
| HTTP `401` or `403` | Rotate/recreate the key with `mcp_codex_worker`; confirm the production URL. |
| `agent_host_not_found` | Confirm the key workspace and that registration was not disabled. |
| No task is claimed | Match application slugs in Roost and the JSON config; confirm the task-project-application link. |
| `repository_mapping_missing` | Add the exact application slug and a valid local path. |
| `agent_host_platform_not_approved` | Run this host on the approved Windows laptop, not on the VPS. |
| `agent_host_sandbox_not_approved` | Use `workspace-write`. Other sandbox modes require a separately implemented execution contract and cannot be enabled through local config. |
| `agent_host_writer_locked` | Another host or unresolved prior execution owns the slot. Reconcile it before removing the exact lock; never start a second writer or auto-clear by PID/age. |
| `execution_packet_invalid` | Read the field/reason list in Agent activity or execution details. Correct the contract or referenced versions. Diagnostics contain no rejected values or raw logs. |
| `agent_execution_requires_correction` | The previous failure disallows blind retry. Correct the source records and queue a new execution contract. |
| `agent_execution_duration_exceeded` | The original time budget is exhausted. Reconcile the retained writer lock and effects, independently review the plan and approve a new budget before queuing another execution. |
| `agent_execution_duration_context_invalid` | Correct missing/invalid execution start time or duration and synchronize the host/server clocks; reconcile the retained writer lock before restart. |
| `agent_execution_context_changed` / `agent_execution_context_invalid` | No model started. Review the current task/application records, reconcile the retained checkpoint and prepare a corrected execution contract. |
| `agent_execution_context_unavailable` | No model started. Restore authoritative context access, reconcile the existing execution and its retained lock; do not bypass the refresh with a cached snapshot. |
| `agent_checkpoint_context_required` | Update the canonical host to include the resolved-context pin; never fabricate one for an older prepared checkpoint. |
| `agent_execution_recovery_blocked` | Read the stage/reason in Agent activity. Preserve local files and reconcile the old process/effects; do not create a duplicate execution or clear locks by age/PID. |
| `agent_host_recovery_required` | The host has an unresolved nonterminal execution. Resolve recovery instead of polling for another task. |
| `agent_host_writer_lock_owner_changed` | Lock ownership is inconsistent. Stop and reconcile; the host will not delete another owner's lock. |
| `workspace_root_not_approved` | Restore the exact `C:\Workspaces` root. |
| `repository_path_outside_workspace` | Use one direct child directory; remove traversal or nested paths. |
| `repository_directory_missing_or_linked` | Restore a physical local repository; links and junctions are rejected. |
| `repository_origin_mismatch` | Correct the local `origin` or the allowlisted canonical GitHub URL after owner review. |
| `repository_directory_ambiguous` / `repository_origin_ambiguous` | Remove ambiguous mapping aliases through the owning configuration; do not create another clone. |
| `execution_application_mismatch` / `execution_repository_mismatch` | Reconcile the Roost application identity and canonical repository with the approved mapping. |
| `execution_repository_ambiguous` | Declare a repository, or exactly one primary when there are several. |
| `codex_process_failed` | Run `codex login`, confirm CLI availability, and inspect the local terminal plus the Roost execution event. |
| Run returns to queued | Reconcile the old process, interrupted files and resources before restarting; expiry alone does not prove safe ownership. |
| `agent_execution_lease_expired` / `agent_execution_lease_rejected` | The host stopped after losing authority. Check API availability/access and reconcile the previous process before restarting. |
| `agent_process_tree_stop_failed` | Do not restart or claim more work until the previous process tree is confirmed stopped. |
| `agent_execution_output_budget_unsupported` | No supervised execution can start with the current CLI. An execution-wide enforcing runner must be proven and approved; do not add a guessed flag or disable the gate. |
| `agent_execution_output_budget_invalid` / `agent_execution_output_budget_exceeded` | Retain the writer fence, reconcile the run and obtain independent review of any replacement budget. No blind retry. |
| Cancellation is delayed | The host checks cancellation on heartbeats, normally within 20 seconds. |

## Key Rotation And Shutdown

- Stop with `Ctrl+C`; the current process exits after its active operation.
- Revoke the key in Roost when the laptop is retired, compromised, or changes
  owner.
- Replace the process environment and restart after rotation.
- Never delete execution history to retry work; use the retry action so the
  audit chain remains visible.

## OpenAI Runtime References

Output-budget rollout adds no migration. Keep execution disabled, deploy API and
host with `output_budget_fail_closed_v1`, then normally Stop/Start the observer.
Verify exact image/commit, health and observer online/observe/runtime_disabled.
The production CLI remains blocked even if the execution environment flag is
later enabled. Its budget factory cannot be selected through host JSON or env.
Do not roll back to a mixed or older executing pair; keep execution disabled
through rollback. See the [guarantee and reference evidence](../architecture/execution-packet-contract.md#hard-output-token-admission-rf-host-010).

Ready rollout: apply additive migration `20260906141000_task_ready_context_pin`
with the API release, keep `ROOST_CODEX_EXECUTION_ENABLED=false`, and restart the
local observer normally to load `ready_context_pin_v1`. Verify exact API image,
migration metadata, health, and observer `online`/`observe`/`runtime_disabled`.
Older tasks stay unpinned; never backfill Ready from status or assignment.
Mixed host/API versions fail capability admission. Rollback can leave the
nullable column in place, but must keep execution disabled: an older API/host
pair lacks the Ready gate. No destructive schema rollback is needed.

To prepare future authorized work, submit the reviewed contract through
`POST /v1/agent-runtime/tasks/:id/actions/submit-for-execution`; inspect
`GET /v1/agent-runtime/tasks/:id/execution-readiness`, then explicitly queue.
`needs_revalidation` requires review/replan and resubmission after reconciling
the prior active execution. Readiness inspection can persist an invalidation.
The owner task workbench now authors and revalidates the contract through the
existing Ready command. Its human owner/admin/member gate excludes API keys;
the observer's capabilities are unchanged. Acceptance is available while execution
is disabled, but does not queue work or activate the host. This UI/API slice adds
no migration and does not enable execution.

`node --test scripts/agent-host-ready-context.test.mjs` covers Ready fingerprint
semantics. Context process tests cover missing/legacy/changed pins, API rejection
at preparation/final read and no spawn/second claim. Local API tests cover safe
migration, acceptance history, queue races, changed source/goal, checkpoint and
recovery rejection, immutable execution pins and successful completion.

Local regression checks: `npm run test:agent-host-recovery` (separately), `npm run test:agent-host-packet`, `npm run test:agent-host-guard` and
`npm run test:agent-host-lease`, plus `npm run test:agent-host-writer` for
cross-process exclusion, crash retention and safe release. Lease tests cover renewal, rejection, timeout,
late-response behavior and Windows process-tree termination without a real
Codex task or production data. The host runs from the canonical Roost checkout;
shipping its script to the VPS does not activate the local worker or task queue.

`npm run test:agent-host-duration` covers the independent timer, clock changes,
late completion, invalid/expired admission, synthetic Windows child/descendant
termination, unavailable reporting and uncertain stops. Recovery tests also
cover exhausted budgets at both safe pre-spawn stages without resetting time.

`npm run test:agent-host-context` covers context/permission/source changes,
late prepare-to-spawn edits, unavailable refresh/reporting, revoked authority
and unchanged context delivered fresh to a synthetic child. Recovery and local
API suites cover pin preservation, legacy rejection and duplicate prevention.

- [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
  defines `codex exec`, stdin prompts, JSONL events, sandbox selection, and
  resumable thread identifiers used by the host.
- [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp) documents optional MCP
  tool configuration. Roost's execution lease itself uses the dedicated HTTP
  API so queue control remains visible to the owner console.
- [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) remains a future option
  if the host later needs a typed embedded orchestrator; V1 intentionally uses
  the installed CLI to reuse the laptop's Codex login and local environment.
