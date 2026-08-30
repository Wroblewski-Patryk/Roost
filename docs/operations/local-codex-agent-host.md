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

After an interactive trial, run the host under a Windows service wrapper or
Task Scheduler using the same Windows user that owns the Codex login and local
repositories. Configure automatic restart, a working directory of the Roost
checkout, and environment variables from a protected machine-level secret
source. Do not embed the API key in a checked-in script or task XML export.

Only one host is necessary initially. Multiple hosts are safe: atomic claims
and leases prevent the same queued execution from being assigned twice.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Host exits with `ROOST_* is required` | Set all three process environment variables. |
| HTTP `401` or `403` | Rotate/recreate the key with `mcp_codex_worker`; confirm the production URL. |
| `agent_host_not_found` | Confirm the key workspace and that registration was not disabled. |
| No task is claimed | Match application slugs in Roost and the JSON config; confirm the task-project-application link. |
| `repository_mapping_missing` | Add the exact application slug and a valid local path. |
| `agent_host_platform_not_approved` | Run this host on the approved Windows laptop, not on the VPS. |
| `workspace_root_not_approved` | Restore the exact `C:\Personal\Projekty\Aplikacje` root. |
| `repository_path_outside_workspace` | Use one direct child directory; remove traversal or nested paths. |
| `repository_directory_missing_or_linked` | Restore a physical local repository; links and junctions are rejected. |
| `repository_origin_mismatch` | Correct the local `origin` or the allowlisted canonical GitHub URL after owner review. |
| `codex_process_failed` | Run `codex login`, confirm CLI availability, and inspect the local terminal plus the Roost execution event. |
| Run returns to queued | The host stopped renewing its 90-second lease; restart it and review the interrupted worktree before retrying. |
| Cancellation is delayed | The host checks cancellation on heartbeats, normally within 20 seconds. |

## Key Rotation And Shutdown

- Stop with `Ctrl+C`; the current process exits after its active operation.
- Revoke the key in Roost when the laptop is retired, compromised, or changes
  owner.
- Replace the process environment and restart after rotation.
- Never delete execution history to retry work; use the retry action so the
  audit chain remains visible.

## OpenAI Runtime References

- [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
  defines `codex exec`, stdin prompts, JSONL events, sandbox selection, and
  resumable thread identifiers used by the host.
- [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp) documents optional MCP
  tool configuration. Roost's execution lease itself uses the dedicated HTTP
  API so queue control remains visible to the owner console.
- [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) remains a future option
  if the host later needs a typed embedded orchestrator; V1 intentionally uses
  the installed CLI to reuse the laptop's Codex login and local environment.
