# Local Codex Agent Host

This runbook connects a Windows laptop containing application repositories to
the production Roost queue on the VPS. The connection is outbound HTTPS only.

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

## Configure Repository Mapping

Copy `config/roost-agent-host.example.json` to a user-owned location such as:

```text
C:\Users\<user>\.roost\agent-host.json
```

Edit only the application-slug-to-path mapping and host label. The file is
secret-free. Keep `workspaceRoot` exactly
`C:\Personal\Projekty\Aplikacje`. A slug must match the Roost
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
$env:ROOST_BASE_URL = "https://api.roost.luckysparrow.ch"
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
| `agent_execution_recovery_blocked` | Read the stage/reason in Agent activity. Preserve local files and reconcile the old process/effects; do not create a duplicate execution or clear locks by age/PID. |
| `agent_host_recovery_required` | The host has an unresolved nonterminal execution. Resolve recovery instead of polling for another task. |
| `agent_host_writer_lock_owner_changed` | Lock ownership is inconsistent. Stop and reconcile; the host will not delete another owner's lock. |
| `workspace_root_not_approved` | Restore the exact `C:\Personal\Projekty\Aplikacje` root. |
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
| Cancellation is delayed | The host checks cancellation on heartbeats, normally within 20 seconds. |

## Key Rotation And Shutdown

- Stop with `Ctrl+C`; the current process exits after its active operation.
- Revoke the key in Roost when the laptop is retired, compromised, or changes
  owner.
- Replace the process environment and restart after rotation.
- Never delete execution history to retry work; use the retry action so the
  audit chain remains visible.

## OpenAI Runtime References

Local regression checks: `npm run test:agent-host-recovery` (separately), `npm run test:agent-host-packet`, `npm run test:agent-host-guard` and
`npm run test:agent-host-lease`, plus `npm run test:agent-host-writer` for
cross-process exclusion, crash retention and safe release. Lease tests cover renewal, rejection, timeout,
late-response behavior and Windows process-tree termination without a real
Codex task or production data. The host runs from the canonical Roost checkout;
shipping its script to the VPS does not activate the local worker or task queue.

- [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
  defines `codex exec`, stdin prompts, JSONL events, sandbox selection, and
  resumable thread identifiers used by the host.
- [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp) documents optional MCP
  tool configuration. Roost's execution lease itself uses the dedicated HTTP
  API so queue control remains visible to the owner console.
- [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) remains a future option
  if the host later needs a typed embedded orchestrator; V1 intentionally uses
  the installed CLI to reuse the laptop's Codex login and local environment.
