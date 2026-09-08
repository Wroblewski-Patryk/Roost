# Agent Host Recovery v1

[Serious-incident containment](native-capability-suspension.md) retains the same
context fence after restoration. Old attempts never regain recovery authority;
new Ready acceptance and execution are explicit.

Checkpoint metadata is required input to the shared
[native redaction policy](native-runtime-redaction.md), checked before local
writer-state and API persistence. Blocked content cannot resume or spawn. This
does not rewrite old checkpoints or authorize deleting a retained writer lock.

Current bounded recovery contract, accepted in
`roost-interview-foundation-safe-resume-2026-09-05-v1`. Production activation
remains separately controlled; this implementation does not enable the DemoApp pilot.

## Context-invalidated attempts

`contextInvalidatedAt` takes precedence over lease age and every checkpoint stage,
including `claimed`/`prepared`. Classification and writer reclamation both reject
it. Restart never rotates its lease, resumes, spawns, retries or claims new work.
The server preserves the dedicated context-change diagnosis when the host reports
blocked recovery. See the [active stop contract](execution-packet-contract.md#active-work-after-accepted-context-changes-rf-ctx-006).

After confirmed process-tree termination, the host's idempotent `context-stopped`
report retains the API lease and returns the last confirmed checkpoint. Only its
successful acknowledgement allows synchronization of a rejected local checkpoint
intent. A lost acknowledgement leaves local ownership intact; PID absence alone
cannot authorize acknowledgement or recovery on restart.

The trusted operator must verify the old process tree is stopped and inspect
local changes before reconciling the retained writer. If the stop report never
reached Roost, its scoped endpoint accepts the retained token even after expiry
solely to confirm the stop; it does not renew execution authority. Do not expose
the token in logs or repository artifacts. Once confirmed, explicit owner cancel
closes the old attempt and releases only its API lease. Reconcile the local
writer through the existing operator procedure before new work, then explicitly
accept new Ready context and queue a new execution. Never clear the context fence
or treat an effect-bearing checkpoint as safe to replay.

## Supported Stages

| Durable checkpoint | Startup classification | Action |
| --- | --- | --- |
| `claimed` | `restart_same_attempt` | Repeat context/preflight for the existing execution and attempt; no worker has run. |
| `prepared` | `resume_from_checkpoint` | Revalidate context and compare packet/context/workspace digests before proceeding from the pre-spawn checkpoint. |
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
packet revision, workspace digest and `contextRevision`. `claimed` has null or
absent context revision; new later stages require all three SHA-256 digests.
The API reads older checkpoints for diagnostics, but rejects new transitions
without a context pin and cannot recover a legacy prepared record without it.
After preparation all three digests are immutable. A compare-and-swap version update records each stage
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

1. Register and pass [protocol admission](local-codex-agent-runtime.md#hostapi-protocol-admission-rf-host-014), then read
   `/v1/agent-runtime/recovery?hostSlug=...` before writer acquisition or claims.
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
5. Revalidate workspace, origin and sandbox, refresh protocol admission, then call the existing
   execution's `/actions/recover` with the expected checkpoint version and new
   session UUID. Roost first revalidates the original execution-bound Ready pin
   against canonical context in the same transaction. Missing/legacy/changed
   pins reject recovery without changing the lease, attempt or checkpoint.
   Roost then atomically rotates its lease token, increments only the
   checkpoint version, retains execution ID/attempt/task/host, and records
   `recovering` with the stage and reason. Concurrent recovery of one version
   has exactly one winner. The prior lease cannot heartbeat or complete/fail it.
6. Fetch current task/application context, renew authority and pass the execution
   packet and Ready gates again. For `prepared`, require the same packet revision, resolved
   context fingerprint and Git workspace digest. `context_changed` stops recovery
   even if the packet alone remains unchanged. Then repeat the final
   [authoritative refresh before spawn](execution-packet-contract.md#fresh-authoritative-context-before-spawn-rf-ctx-006).
   Proceed only after all checks pass. No new task, execution,
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

Recovery preserves the original server `startedAt`: a rotated lease does not
grant a fresh duration budget. After packet validation, the host checks the
[duration deadline](execution-packet-contract.md#hard-duration-limit) before
execution preparation or spawn. An exhausted `claimed`/`prepared` execution
reports `agent_execution_duration_exceeded` with the rotated lease and
`retryable: false`, retains its identity/attempt and the writer lock, and stops.
It cannot automatically resume, claim again or remove that lock after reporting.

A Ready rejection after successful lease rotation similarly reports
`agent_ready_context_revalidation_required`, nonretryable, using the rotated
lease. The writer record remains retained. Rejection by the recovery API before
rotation instead records a blocked recovery and preserves the original authority.
An old execution is never rebound to a newly submitted acceptance.

Output-token admission also runs after recovery. Claimed/prepared checkpoints
prove no worker has started; their execution ID, attempt and accepted budget
are retained. The production Codex runner rejects them with
`agent_execution_output_budget_unsupported`, using the rotated lease and retaining
the local writer fence. There is no restored or reset usage counter: all stages
where output may have been generated already prohibit automatic recovery.
Synthetic exhaustion followed by a lost failure report leaves the running
checkpoint intact and blocks restart before reclaim/rotation/another claim.
Blind retries of all output-budget failures are rejected by the API.

## Diagnostics, Cleanup And Release

`/actions/recovery-blocked` accepts fixed reason codes under the existing
report permission. It writes `agent_execution_recovery_blocked` into the existing
execution notice and an activity event with stage/reason, without marking the
execution completed, failed or cancelled. The local slot remains retained when
recovery cannot be proven. Transport failure stops locally and preserves the
record instead of pretending that Roost received a diagnostic.

Normal terminal execution releases only its own writer lock; duration expiry
and context/output-budget admission failure retain it even when no child exists or tree
termination was confirmed. Successful reclaim
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
