# Agent Host Recovery v1

Current bounded recovery contract, accepted in
`roost-interview-foundation-safe-resume-2026-09-05-v1`. Production activation
remains separately controlled; this implementation does not enable the Soar pilot.

## Supported Stages

| Durable checkpoint | Startup classification | Action |
| --- | --- | --- |
| `claimed` | `restart_same_attempt` | Repeat context/preflight for the existing execution and attempt; no worker has run. |
| `prepared` | `resume_from_checkpoint` | Revalidate context and compare packet/workspace digests before proceeding from the pre-spawn checkpoint. |
| `spawn_intent` | Ambiguous: a worker may have started | Stop with diagnostic; never repeat automatically. |
| `running` | Worker or descendants may remain; work may have effects | Stop with diagnostic. |
| `effect_possible` | A command or external tool may have acted | Stop with diagnostic; reconcile evidence first. |
| Missing, inconsistent or corrupt state | Ambiguous ownership/stage | Stop with diagnostic; preserve files and processes for reconciliation. |

Every automatic recovery also requires an unexpired server lease. Expiry blocks
recovery; it does not authorize a new writer or establish process termination.
Consequently a long laptop shutdown requires operator reconciliation even when
the last checkpoint was before spawn. Short restarts, including an OS restart
that preserves a still-valid lease, can recover only with the remaining checks.

The current Codex process remains `--ephemeral`. Resuming inside an interrupted
Codex conversation, reconciling partially executed commands, renewing authority
after expiry and resuming after release/migration/external writes are future
stages. They are not inferred from a thread ID or an apparently clean Git tree.

## Ownership And Durable Evidence

Roost stores `AgentExecution.checkpoint` and its integer `checkpointVersion`.
The strict `roost-recovery-v1` checkpoint contains a stage, process session UUID,
packet revision and workspace digest. `claimed` has null digests; later stages
require SHA-256 digests. A compare-and-swap version update records each stage
and a human-readable event in the same database transaction. Unknown fields and
arbitrary diagnostic reasons are rejected. No credentials, prompts, command
text, source content or production data enter the checkpoint.

The existing machine-wide writer lock stores the same checkpoint, execution,
workspace, task/application IDs, attempt and version. This state remains under
`C:\ProgramData\Roost`, outside repositories. The lock session UUID is an
ownership identifier, not a credential. File writes are flushed before moving
on; a torn/truncated file is invalid and cannot authorize recovery.

The host writes locally before confirming each stage through Roost. A crash
between the two stores leaves inconsistent versions and blocks restart. It
durably records `spawn_intent` in both stores before creating Codex. Therefore
matching `claimed` or `prepared` records establish that this host did not start
a writer. `effect_possible` is recorded conservatively on command/tool events;
even a missing such event cannot make the earlier spawn barrier safe to replay.

## Startup And Lease Fencing

1. Read `/v1/agent-runtime/recovery?hostSlug=...` before registration or claims.
   It returns this workspace/host's nonterminal executions without lease tokens.
   Multiple pending executions stop startup rather than choosing one silently.
2. Classify the checkpoint and lease. A disabled runtime, cancellation, expired
   authority or unsafe stage stops before acquiring recovery authority.
3. Acquire the machine-wide writer slot. A live/unknown old owner blocks it.
   Reclaim is allowed only when the old parent is gone **and** the local record
   exactly matches Roost's valid pre-spawn checkpoint. A dead PID alone remains
   insufficient; reused PIDs conservatively block recovery.
4. An exclusive `agent-host-recovery.lock` serializes reclaim checks. Recheck
   ownership before removing the exact prior writer file, then use exclusive
   writer-file creation again. A competing process cannot own the same slot.
5. Revalidate the approved workspace, origin and sandbox. Call the existing
   execution's `/actions/recover` with the expected checkpoint version and new
   session UUID. Roost atomically rotates its lease token, increments only the
   checkpoint version, retains execution ID/attempt/task/host, and records
   `recovering` with the stage and reason. Concurrent recovery of one version
   has exactly one winner. The prior lease cannot heartbeat or complete/fail it.
6. Fetch current task/application context, renew authority and pass the execution
   packet gate again. For `prepared`, require the same packet revision and Git
   workspace digest. Proceed only after all checks pass. No new task, execution,
   branch, worktree, clone, runtime or application directory is created.

The workspace digest covers HEAD, current branch identity, staged/unstaged diffs
and non-ignored untracked file contents. Only the digest is persisted. External
diff drivers are disabled; bounded reads fail closed for symlinks or excessive
data. Ignored runtime files, external APIs and database effects cannot be proven
by this digest, which is why it never permits replay after `spawn_intent`.

Ordinary claim no longer requeues expired executions or automatically marks them
cancelled. It only admits never-started queued work (`attempt = 0`) and refuses
another claim while this host has nonterminal claimed/running work. A separate
owner-created retry remains a separate explicit action, not host recovery.

## Diagnostics, Cleanup And Release

`/actions/recovery-blocked` accepts fixed reason codes under the existing
report permission. It writes `agent_execution_recovery_blocked` into the existing
execution notice and an activity event with stage/reason, without marking the
execution completed, failed or cancelled. The local slot remains retained when
recovery cannot be proven. Transport failure stops locally and preserves the
record instead of pretending that Roost received a diagnostic.

Normal terminal execution releases only its own writer lock. Successful reclaim
removes only the matched prior writer file and its own temporary recovery gate.
An orphan recovery gate, corrupt state or uncertain process tree needs trusted
operator reconciliation. Never clear either file merely by age, empty contents
or parent-PID absence, and never delete source changes or unknown artifacts.

The migration adds two columns with empty/zero defaults. Older records lack a
valid checkpoint and require reconciliation. A code rollback can ignore the
new columns; do not roll a running host back to the older auto-requeue behavior.
Drain or reconcile work first. No destructive database rollback is required.

Verification: `npm run test:agent-host-recovery` runs controlled process exits,
two competing restarts, checkpoint/lease/sandbox/repository changes and stages
before/after spawn. Run it separately from tests that mutate the same workspace
because the digest intentionally detects such concurrent changes. Existing host
suites and `npm run test:api:local` cover regression, migration, workspace scope,
checkpoint CAS, old-token fencing and owner-visible secret-free diagnostics.
