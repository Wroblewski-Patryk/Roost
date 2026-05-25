# Persistent Agent Runtime Playbook

Last updated: YYYY-MM-DD

## Purpose

Use this playbook when agents run repeatedly over time instead of only inside a
single chat turn.

Persistent agents need explicit wakeups, session handling, budgets, logs,
status, and recovery. Without those contracts they drift into duplicate runs,
hidden costs, stale sessions, and unverifiable work.

## Heartbeat Model

Persistent agents should run in bounded heartbeats:

1. a trigger wakes the agent
2. the runtime invokes the configured adapter
3. the adapter gives the agent scoped prompt and context
4. the agent works until success, timeout, cancellation, or failure
5. the runtime captures output, logs, token/cost usage, and session state
6. status and activity are persisted for audit and UI readback

Agents do not need to run continuously to behave autonomously.

## Wakeup Sources

Recommended wake reasons:

| Wake reason | Meaning |
| --- | --- |
| `timer` | Scheduled interval or cron fired. |
| `assignment` | Work was assigned or checked out to the agent. |
| `mention` | A user or another agent explicitly asked for attention. |
| `on_demand` | Manual operator/API invocation. |
| `automation` | System workflow triggered the wakeup. |
| `approval_resolved` | A previously blocked approval changed state. |

If an agent is already running, new compatible wakeups should be coalesced or
queued by policy instead of launching duplicate overlapping runs.

## Agent Identity

Each heartbeat should inject scoped identity and context, such as:

| Value | Purpose |
| --- | --- |
| agent ID | Stable identity for logs, API writes, and session recall. |
| workspace or tenant ID | Ownership and authorization boundary. |
| API base URL | Runtime API target. |
| short-lived API key or token | Scoped authentication for this run. |
| run ID | Current heartbeat/run record. |
| wake reason | Why the agent woke up. |
| triggering task/comment/approval ID | Bounded target context when available. |

Tokens and service keys are secret material. Do not print them in prompts,
logs, screenshots, traces, or task notes.

## Adapter Configuration

Document the real adapter set for the project.

Common adapter families:

- local CLI adapter
- process adapter
- HTTP adapter
- hosted agent runtime
- coding-agent SDK adapter
- workflow/MCP adapter

Each adapter should define:

- working directory or remote workspace
- command, URL, or SDK entrypoint
- timeout
- cancellation behavior
- grace period before force stop
- environment variables
- model or runtime options
- allowed tools or capabilities
- diagnostics command or test-environment check

## Runtime Configuration

Minimum per-agent runtime settings:

| Setting | Why it matters |
| --- | --- |
| enabled/paused status | Allows operators to stop bad loops. |
| heartbeat interval | Controls polling pressure and cost. |
| wake-on-assignment | Supports event-driven work. |
| wake-on-demand | Supports manual repair and inspection. |
| cooldown | Prevents rapid duplicate runs. |
| timeout | Bounds resource usage. |
| budget | Prevents runaway cost. |
| context mode | Controls how much state is injected. |
| prompt or instruction bundle | Keeps behavior repeatable. |

Deprecated prompt fields should be migrated into the current managed
instruction or template system instead of preserved forever.

## Session Persistence

Resumable adapters may persist session IDs or conversation state between
heartbeats.

Use session reset when:

- the instruction strategy changed significantly
- the agent is stuck in a bad loop
- stale context is overriding current repository truth
- a recovery run needs a clean baseline

Session continuity is helpful, but repository truth and current runtime state
must remain higher authority than stale session memory.

## Run Status

Recommended run statuses:

| Status | Meaning |
| --- | --- |
| `queued` | Wakeup accepted but not started. |
| `running` | Agent heartbeat is executing. |
| `succeeded` | Agent exited successfully and result was captured. |
| `failed` | Agent exited with an error. |
| `timed_out` | Runtime exceeded timeout. |
| `cancelled` | Operator or system cancelled the run. |
| `budget_exceeded` | Runtime stopped or paused due to budget. |

Recommended agent statuses:

| Status | Meaning |
| --- | --- |
| `active` | Eligible for wakeups. |
| `idle` | Active and not currently running. |
| `running` | A heartbeat is in progress. |
| `error` | Last heartbeat failed and needs attention. |
| `paused` | Temporarily disabled. |
| `terminated` | Permanently deactivated. |

## Logs And Live Readback

Capture enough evidence to debug a run without reading private model context
from chat memory:

- start/end timestamps
- wake reason
- adapter command or route name, without secrets
- run status timeline
- stdout/stderr excerpts
- full log location
- token and cost usage when available
- session before/after ID when relevant
- task/activity changes caused by the agent
- tool calls and tool results where safe

For UI-backed products, live status and log updates should reconnect cleanly
after browser/network interruptions.

## Safety Patterns

Use conservative defaults:

- short timeout for experimental agents
- narrow credentials
- read-only mode until write behavior is approved
- explicit working directory
- bounded tools
- budget and cooldown
- manifest or capability discovery before writes
- session reset and pause controls

Local CLI adapters usually run with host permissions. Treat their prompts,
environment variables, and working directories as a security boundary.

## QA Matrix

Persistent-agent QA should include:

| Scenario | Expected proof |
| --- | --- |
| launch from template | agent exists with intended tools/config |
| manual run | status transitions and output captured |
| queued instruction | instruction delivered on next heartbeat |
| scheduled daemon | repeated ticks fire without overlap |
| pause/resume | no runs while paused; runs resume cleanly |
| budget exhaustion | agent stops or pauses with visible reason |
| error recovery | failed run can recover or reset session |
| channel binding | outbound/inbound channel behavior works |
| memory inspection | session or memory reflects accumulated work |
| trace inspection | logs show tool calls and failure points |
| credential revocation | run fails safely without corrupting state |
| message flood | queue drains or backpressure is visible |
| process crash | checkpoint/session recovery is deterministic |

## Troubleshooting Order

1. Check adapter command availability or remote endpoint health.
2. Verify credentials are present and scoped.
3. Verify working directory or workspace exists.
4. Inspect current run status and last error.
5. Inspect full run log.
6. Confirm timeout and budget are realistic.
7. Reset session if stale context is suspected.
8. Pause the agent if it repeats destructive, costly, or noisy failures.

## Done Signal

A persistent-agent runtime is ready when an operator can create an agent, test
its environment, trigger a heartbeat, inspect live logs, pause it, reset its
session, and prove the run with durable status, cost, and activity records.
