# G14 central scheduling and critical incident preemption

This contract implements RF-HOST-002, RF-HOST-003 and RF-HOST-009 for a
supervised local Worker. G12 remains the authority for a new attempt after an
interrupted execution. A scheduler claim never creates a new execution or
spends a new model budget.

## Queue admission

`POST /v1/agent-runtime/executions/claim` considers queued attempt-zero work
for the bound host. It rejects an offline host or a resource observation older
than 60 seconds. The observation reports free and total memory, free and total
space on the Writer state volume, and logical CPU count. Invalid, absent,
future or inconsistent observations deny admission. Application work requires
at least 4 GiB free memory and 8 GiB free disk; company information work
requires 2 GiB and 2 GiB. Both require two logical CPUs. These are admission
floors, not reservations or a claim that Hermes is otherwise isolated.

The scheduler considers all matching queued executions so that older blocked
entries cannot hide later Ready work. It accepts task priority `low`,
`normal`, `high` or `critical`;
an absent priority is `normal`. Each complete 24 hours in the queue raises the
effective band by one, capped at `critical`. Higher effective bands precede
older entries, with the execution ID breaking ties. Aging changes claim order;
it never grants preemption authority. Invalid priority or a task outside
`todo`/`in_progress` is skipped.

Active `depends_on` and `requires` task relations point from the dependent
task to its prerequisite. Active `blocks` relations point from the blocker to
the dependent task. `blocked` relation status also remains a gate. Every
prerequisite must exist in the same workspace with Task status `done`.
Resolved and archived relations no longer block. A stale Ready pin, failed
G12 continuation, capability suspension or unsupported host skips that
candidate, allowing a later eligible item to be claimed. Ready and
continuation are rechecked inside a serializable transaction. A host row lock
and a database unique index ensure one active execution per host; an expired
lease retains its slot until reconciled or safely closed. The Windows Writer
lock remains a separate cross-process laptop fence.

## Owner confirmed critical incident

An active `technical_incident` CompanyRecord with priority `critical` and an
already queued, current Ready critical Task are necessary but do not by
themselves stop a Worker. The current workspace owner must make a fresh,
exact command for one running incumbent: incident ID, incoming execution ID,
incumbent ID, expected checkpoint version and reason. The command checks the
current owner identity, exact displayed incident revision, host fit, resources, dependency completion, Ready and
G12 continuation. A serializable transaction records the incident revision
and digest, exact task/execution/host binding and owner identity in
`critical_preemptions`, sets `cancelRequestedAt` on the incumbent, and records
an event. A duplicate or stale request is denied. The owner console lists
current candidates, but POST rechecks every fact and is authoritative.

The incumbent heartbeat then returns
`agent_execution_preemption_requested`. Ordinary completion, failure or
cancellation cannot close that pending request. The bound Worker stops its
managed Windows Job, verifies an in-process cleanup receipt with zero active
processes, and sends the exact lease token, checkpoint version, attempt ID,
Writer digest and stop facts to `preemption-stopped`. Roost records the stop
fact and increments the version of the existing recovery checkpoint in one
transaction with terminal cancellation. An exact repeated ACK only reads
back the same stopped fact; a restart replay cannot create one. The Worker
persists the returned checkpoint into its Writer state before releasing the
Writer. A missing Job receipt, uncertain server ACK or failed local checkpoint
write retains the Writer for reconciliation. Roost trusts the bound Worker attestation; it
cannot directly inspect a remote kernel Job handle.

Before its first stop ACK request, the Worker fsyncs a recovery intent beside
the Writer. The request body, including the lease token, is protected with
Windows CurrentUser DPAPI; the file holds no plaintext token. If a response is
lost, a restarted Worker can only use that intent for an exact `replayOnly`
read of a stop already committed by Roost. It checks the original Writer file
identity and native process absence before applying the returned checkpoint
and retiring the Writer. Failure to decrypt or verify the intent keeps the
Writer locked for manual reconciliation.

The interrupted task remains unfinished. A later attempt needs the G12
changed-plan owner approval, a new budget and fresh Ready. This path never
replays an effect or silently renews a model attempt.
