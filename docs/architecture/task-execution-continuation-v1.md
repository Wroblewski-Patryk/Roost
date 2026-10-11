# Task execution continuation v1 (G12)

This contract applies to admitted application executions and to
`roost-company-information-runtime-v1`. A company-information preparation
envelope is not a model attempt. The closed synthetic fixed-effect fixture has
its separate one-shot rule.

## Observable progress and limits

The unit of task progress is a terminal attempt and its independent result
review. A completed candidate awaiting review is not accepted progress. A
rejected result or a failed/cancelled attempt may be diagnosed for continuation;
an accepted result closes this task path. An empty native Hermes result is
reported as `hermes_quiet_empty_result` with
`progressObservation.classification=no_accepted_progress`, provided the Worker
can report its terminal state. This says that no candidate was accepted. It
does not claim that the model did no internal work.

The existing Worker deadline starts at the original claim time and cannot be
renewed by heartbeats. Output-token admission for direct Codex remains fail
closed. Managed Hermes has an explicit turn/time/attempt policy, but its
physical model calls, internal tool calls, transport retries, tokens and cost
are unknown unless an enforcing provider receipt becomes available. Roost adds
server-observed elapsed milliseconds to terminal usage. Unknown counters stay
`null`; no text-length estimate or provider silence becomes a meter. Lease-level
429 is transport backoff and does not count as task stagnation. The quiet Hermes
interface does not expose internal 429/Retry-After or semantic turns.

## Stop and continuation authority

`POST /executions/:id/actions/retry` never creates another execution. A new
application execution or company runtime start after a spent task attempt must
pass a new Ready pin and a `task_execution_continuation_approved` event. The
event binds the exact previous terminal execution, checkpoint version and
digest of its stop/result material, the
previous Ready pin, a changed objective/scope/single-task/acceptance plan
digest, the new Ready pin/revision, the fresh bounded budget digest, a short
diagnosis and a changed-plan statement. It is written by the workspace owner,
who is independent of the executing Worker/assigned agent. This is owner
review of the Worker's stopped attempt; it is not a second review of the
owner's own plan. The owner is accountable for the substance of the changed
plan; the digest proves that its recorded fields differ, not that the change
will work. Existing verifier rejection and manager return remain
required when a completed result was rejected.

The owner records approval through
`POST /v1/agent-runtime/tasks/:id/execution-continuation` after preparing a
new Ready. The server looks up the owner event by the exact Ready pin and prior
execution without mutating the Ready projection. Queue/start checks the event
again in the same task-fenced transaction, and binds its ID into the new execution.
Claim, heartbeat and managed information admission recheck that bound event.
Managed application admission rechecks it as well. Terminal read-only
reconciliation cannot rewrite a prior failed attempt after a successor
execution exists for the task.
A changed or missing event, wrong prior attempt, stale stop material, changed pin/revision or
plan/budget, active execution, accepted result or pending review refuses the
new start. A fresh request ID is idempotent only for exactly the same approval
material. A second spend makes the prior event obsolete because it no longer
names the latest spent attempt. For company information, the existing new
owner Decision is additionally required; its derived runtime Ready carries
the approved preparation pin and keeps the same plan/budget digest.

The owner console reads the exact previous status, checkpoint, attempt,
measured-or-unknown usage and stop diagnosis. It exposes continuation approval
only for the latest eligible terminal attempt and current Ready. No synthetic
production task or paid model invocation is required solely to demonstrate the
guard; native process and disposable-database proofs are separate from exact
deployment/health read-back.
Execution history is a paged summary read (50 rows per page); opening one row
reads its result, stop evidence and the 20 most recent events, with total event
count shown. The summary never transports prompts, metadata or event bodies,
and detail omits the prompt and unrelated task/application fields. This keeps
the present production history within the native redaction boundary without
weakening it. An unusually large single result or event payload may still be
blocked by that boundary; such a detail is not claimed readable. Company-
information executions have no application relation and display as company work.

## Remaining boundary

This gate observes progress at attempt/review boundaries. Detecting repeated
ineffective operations *inside* a silent Hermes process needs a structured,
admitted provider observation contract and separate architecture decision.
Provider-internal token/cost/transport meters remain unknown. An owner can
decline continuation; that is a durable stop, not a failure to auto-retry.
