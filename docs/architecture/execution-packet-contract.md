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

After obtaining fresh task/application context, the host renews and checks its
lease, validates the packet, and only then performs execution-specific Git
checks. It validates again after reporting `runner_started`, immediately before
Codex spawn, with a valid lease. Invalid packets start neither Codex nor a Git
subprocess for that execution. Host startup still performs the existing local
allowlist Git checks before it registers or claims any task.

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

## Practical Limits

This is a structural and referential admission gate. It cannot establish the
semantic quality of prose, the truth of dependency evidence, or that an agent
will obey every instruction. v1 validates declared duration/token budgets and
passes them in context; it does not add a hard runtime/token meter. The sandbox,
existing lease containment and one-host writer lock remain separate controls.
No worker receives new release permissions through this packet. Scope enforcement,
automatic recovery, independent review orchestration and pilot activation remain
separate work. Production stays `foundation_only` in this batch.

Verification: `npm run test:agent-host-packet`, existing host guard/lease/writer
suites, `npm run test:api:local`, and `npm run validate`.
