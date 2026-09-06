# Supervised Execution Packet v1

Current contract for the local Agent Host, accepted in
`roost-interview-foundation-execution-packet-gate-2026-09-05-v1`.
It does not activate production agents, automatic recovery or the Soar pilot.

## Preparation And Authority

Queue through the existing `POST /v1/agent-runtime/executions` API, supplying
an explicit `metadata.executionContract`. The existing task-only console trigger
does not author this contract; such a run fails validation until its contract is
prepared through the API. No defaults invent missing intent or permissions.

The host reads
`GET /v1/company-intelligence/tasks/:taskId/agent-context?executionId=:executionId`.
Roost verifies both IDs belong together in the authenticated workspace and adds
`executionPacket` to the existing response. Calls without the optional query
retain their previous shape. Roost binds the packet to the current task,
application, workspace, execution and assigned workforce agent, includes the
task's `updatedAt` revision, and resolves the explicitly named context sources.

The packet has `schemaVersion: roost-execution-packet-v1`, `identity`,
`taskRevision`, `contract`, `sources`, and `revision`. Its revision is SHA-256
over the JSON envelope before the revision field is added. This detects a changed
snapshot; it is not an approval signature or an immutable governance ledger.
Lease tokens and source metadata are not included in this envelope.

## Required Contract Fields

All objects are strict; unknown fields, unknown schema versions, missing values,
empty required lists and unsupported enum values fail closed. Text is nonempty
and bounded to 2,000 characters; required text lists contain at most 30 entries.

| Field | Required value and validation |
| --- | --- |
| `version` | Explicit nonempty contract revision label. |
| `objective` | `outcome` and `goalId` matching the task's current workspace-scoped Goal. v1 uses the existing Goal link as the product/goal basis. |
| `scope` | Nonempty `allowed` and `forbidden` lists; the same entry cannot occur in both, ignoring case. |
| `assignment` | `agentId`, `role`, `competencies`; match the active assigned workforce entity of type `agent`, its primary role and `skillIndex`. |
| `modelSelection` | Explicit `model` and `reasoningEffort` admitted by the Foundation V2 policy below. No inherited/default selection. |
| `context` | Nonempty `company`, `product`, `technical` lists of `{id, revision}`; at most 10 per category. |
| `procedures` | Explicit set of `{id, revision}` referencing active procedures; revision is the string form of their numeric `version`. All application/capability-linked procedures must be included. |
| `skills` | Explicit set of `{name, version}` matching `name@version` entries in the assigned agent's `skillIndex`. |
| `access` | `tools`, `permissions`, `sandbox: workspace-write`, `externalWrites: false`, nonempty `restrictions`. Supported tools/permissions are `repository_read`, `repository_write`, `local_test`, matching the agent's `toolIndex`/`authorityScope`. Every tool also needs its corresponding permission. |
| `dependencies` | Explicit set of `{id, revision, resolution: satisfied, evidence}` covering every linked task dependency. Revisions match `updatedAt`; blocked dependencies fail. |
| `decisions` | Explicit set of `{id, revision}` covering every task-linked decision. Revisions match `updatedAt` and status must be `approved`. This status is operational context, not proof of authenticated owner release authority. |
| `budgets` | Integer `maxAttempts` 1–5, `maxDurationSeconds` 60–3600, `maxOutputTokens` 128–100000. The current claim attempt must be within `maxAttempts`. |
| `acceptance` | Nonempty `criteria`, `tests`, `evidence` lists. |
| `recovery` | Nonempty `handoff`, `failure`, `escalation`, plus `rollback: {mode, instructions}`. Mode is `restore_task_changes` or `not_applicable`; write permission requires the former. |

An explicit set is `{items: [...], noneReason: null}` when populated, or
`{items: [], noneReason: "Task-specific explanation"}` when none apply. An empty
set without a reason, or a populated set with a none-reason, is invalid.

Context references name existing CompanyRecord IDs. Their `revision` is exactly
the API `updatedAt` ISO timestamp. Company sources are workspace-level records
with no application ID; product and technical sources belong to this execution's
application. Only those records are fetched, with at most 30 sources total.
Each needs usable description, purpose, desired state or expected behavior;
a title alone is insufficient. Missing, archived, foreign or revised records
block execution. Source payloads omit arbitrary metadata. Full context and draft
contracts must remain secret-free, as all existing operational records must.

The host also verifies the application context version, ID, workspace, slug and
project link, current task identity/revision/status, and packet digest. Context
selection is not allowed to silently stand in for a missing required source.
The executable synthetic example in
`scripts/fixtures/execution-packet.mjs` demonstrates the complete shape without
production data. Its fixture IDs must be replaced by actual scoped record IDs.

## Start Gate And Diagnostic Result

### Foundation V2 explicit model admission (RF-HOST-016)

Every contract now requires `modelSelection: {model, reasoningEffort}`. Supported
model IDs are `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` and `gpt-6-astra`.
Efforts are `low`, `medium`, `high`, `xhigh`, `max` and `ultra`, except Luna does
not support `ultra`. This bounded allowlist implements the owner minimum 5.6;
unknown aliases, older models, absent values and unsupported pairs fail before
any execution subprocess. Previously prepared contracts without this field must
be corrected and reissued. The envelope remains v1; its explicit contract revision
and digest change with the new field. No task or workforce default fills it in.

The launcher passes `--model`, `--config model_provider="openai"` and
`--config model_reasoning_effort="..."` explicitly, overriding local defaults.
`runner_started.payload.requestedModelSelection` records the requested pair;
it is not provider-confirmed model usage. There is no retry on a different model
or downgrade on provider failure. Availability checks, dynamic routing, risk minima,
owner override UI and observed model telemetry remain separate requirements.
No paid model call or execution activation is needed to verify argument dispatch.

The allowlist/effort support was checked against the installed Codex model catalog
on 2026-09-06. The CLI flags were checked using `codex exec --help`; config keys
and explicit-override precedence are documented in the
[official Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).
Catalog changes require an explicit policy update; they are never inferred from
a model-name numeric prefix. Future automatic delegation must still meet the
separate Roost scheduler and resource gates.

After obtaining task/application context, the host renews and checks its lease,
validates the packet, and only then performs execution-specific Git checks.
Initial invalid packets start neither Codex nor a Git subprocess for that
execution. Host startup still performs the existing local allowlist Git checks
before it registers or claims any task. Final fresh-context admission below
also applies after those read-only preparation checks.

### Fresh authoritative context before spawn (RF-CTX-006)

The host fingerprints both existing context responses at preparation and stores
`contextRevision` alongside `packetRevision` and `workspaceDigest` in the same
local/server recovery checkpoint. SHA-256 covers the complete resolved task and
application contexts, including goal, assignment, access, procedures, decisions,
dependencies, sources and evidence. Only each response's top-level `generatedAt`
is omitted. Object keys are sorted; array order remains significant, so even an
order-only change can conservatively require replanning. This fingerprint is
not an approval signature or a second context store; no context content is saved
in the checkpoint.

After durably recording `spawn_intent` and sending `runner_started`, the host
fetches both scoped context endpoints again with cache bypass. It runs the
existing packet validator on those responses and compares their fingerprint
with the prepared checkpoint. The prompt and task/application labels use the
fresh responses. Lease and elapsed-duration checks then run synchronously before
spawn; there is no further awaited network or repository operation in between.
`runner_started` remains an admission-attempt event, not proof that a model ran.

A changed or invalid final context reports `agent_execution_context_changed`
or `agent_execution_context_invalid`; failed retrieval reports
`agent_execution_context_unavailable`. These use the existing fail action,
`retryable: false`, fixed diagnostics and hash-only comparison details with
schema `roost-context-admission-v1`. Invalid packets also retain the existing
safe field/reason diagnostics as `packetIssues`, without rejected values.
They prevent spawn and further claims and retain
the writer checkpoint. Authentication rejection follows the existing lease-loss
path. Failed reporting never removes the lock or permits another execution.
Review changed records, reconcile the execution and prepare a corrected contract;
the existing API rejects blind retries. The pre-spawn intent barrier is retained
even when this process knows no model started, because a restart cannot assume
that from the barrier alone.

Prepared recovery requires the same context fingerprint, packet and workspace
digests, then repeats the final refresh. Legacy prepared checkpoints without the
new fingerprint cannot be automatically recovered. The API reads legacy records
for diagnostics but rejects unpinned new checkpoint transitions and pins the hash
immutably after preparation. No database column or migration is added.

These are two ordinary authoritative API reads, not an atomic database snapshot
or a lock over concurrent source edits. A change after the last read may escape
this pre-spawn check; mid-execution invalidation and pinning at Ready remain
separate gates. Neither is implemented or claimed by this bounded slice.

An invalid packet reports `execution_packet_invalid` through the existing fail
action with `retryable: false` and:

```json
{
  "schemaVersion": "roost-execution-packet-diagnostics-v1",
  "issues": [{"field": "contract.acceptance", "reason": "missing"}]
}
```

Reasons are `missing`, `invalid`, `mismatch`, `unavailable`, `stale` or `blocked`.
Diagnostics include only schema field paths and fixed reasons, never rejected
values, arbitrary property names, source content, credentials or raw logs.
The failure message lists these fields in the existing execution notice and
activity timeline; structured details remain in `errorState.details`.
Blind retry is rejected with `agent_execution_requires_correction`. Correct the
underlying records and queue a new execution with a corrected contract.

## Hard Duration Limit

The supervised host enforces `budgets.maxDurationSeconds` from the server's
original `AgentExecution.startedAt`, including preparation and time before a
pre-spawn recovery. Heartbeats do not renew this budget. A separate timer starts
Windows process-tree termination five seconds before the deadline. Admission
checks also reject late operation results, launch and completion submission.
The child must have exited and final checks passed before the timer is disarmed
for the bounded terminal API request; waiting for that acknowledgement is outside
the execution budget.

Expiry reports `agent_execution_duration_exceeded` with `retryable: false` through
the existing fail action when authority and termination permit it. Missing,
invalid or future `startedAt` fails closed as
`agent_execution_duration_context_invalid`. Diagnostics contain fixed messages
and numeric limits only. Both cases stop new claims and retain the writer lock.
An unavailable report cannot restart work; uncertain termination uses the
existing reconciliation path instead of claiming a confirmed stop.

Synchronize host/server clocks. Elapsed time cannot decrease within one host
process because a monotonic clock backs wall-clock checks. Clock rollback between
processes, OS/event-loop freezes and detached descendants outside the existing
process-tree containment are not solved by this timer. Independent plan review
and approval of a new budget are required policy; their orchestration remains
separate work. Token and cost meters are not implemented by this duration slice.

## Practical Limits

This is a structural and referential admission gate. It cannot establish the
semantic quality of prose, the truth of dependency evidence, or that an agent
will obey every instruction. The host enforces elapsed duration as described
above; output token budgets remain declared values without a hard meter. The sandbox,
existing lease containment and one-host writer lock remain separate controls.
No worker receives new release permissions through this packet. Scope enforcement,
automatic recovery, independent review orchestration and pilot activation remain
separate work. Production stays `foundation_only` in this batch.

Verification: `npm run test:agent-host-packet`, existing host guard/lease/writer
suites, `npm run test:api:local`, and `npm run validate`.
