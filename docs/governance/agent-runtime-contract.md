# Agent Runtime Contract

Last updated: YYYY-MM-DD

## Purpose

Use this document to teach agents the non-negotiable runtime architecture of
the application before they edit code.

Every project should replace the example pipeline and layers below with its
real architecture. The key rule is stable: code that bypasses the approved
runtime contract is wrong even when it appears to work.

## Core Principle

Follow the architecture. Do not simplify it in ways that break system design,
data ownership, side-effect boundaries, or observability.

## Required Understanding

Before writing code, an agent must identify:

- runtime surfaces: web, mobile, API, workers, CLI, cron, MCP, or static app
- source of truth for each important state value
- allowed data flow between modules
- side-effect layer or command boundary
- validation and error-handling path
- logging, trace, audit, or event requirements
- restart, refresh, retry, and recovery expectations

For agent-heavy systems, the agent must also identify:

- which stages are cognitive processors and which stages may perform side
  effects
- the stable structured keys passed between stages
- whether the runtime is single-turn, heartbeat-based, scheduled, or worker-led
- how session continuity is persisted and reset
- how tool calls are authorized, logged, and bounded
- how memory writes and reflection are triggered and verified

## Runtime Flow

Define the real project flow here. Examples:

- `request -> validation -> service -> persistence -> response`
- `event -> normalize -> decide -> command -> effect -> audit`
- `input -> parse -> plan -> execute -> observe -> memory`
- `event -> perception -> context -> motivation -> role -> planning -> expression -> action -> memory -> reflection`
- `wakeup -> adapter invocation -> agent run -> result capture -> session save -> status/log readback`

Agents must not merge stages when the architecture requires them to stay
separate.

Use `docs/architecture/agent-system-primitives.md` when the project has
multi-stage agent cognition. Use
`docs/operations/persistent-agent-runtime-playbook.md` when agents run across
heartbeats, schedules, assignments, or resumable sessions.

## Strict Rules

1. Do not process raw input directly when the project requires normalization.
2. Do not write to persistence, providers, queues, or external APIs outside the
   approved side-effect layer.
3. Use structured data across boundaries; avoid implicit state and raw text
   handoffs where contracts exist.
4. Keep modules separate by responsibility.
5. Do not hardcode secrets, environment values, provider IDs, or deployment
   assumptions.
6. Implement the smallest real slice first, but keep it aligned with the
   approved architecture.
7. Avoid abstractions that do not remove real complexity or match local
   patterns.
8. Log or record required trace, event, operation, or audit fields.
9. If memory, cache, or persistence is written, it must be readable and
   testable later.
10. If the agent runtime exposes tools, commands, or provider routes, discover
    capabilities from the approved manifest/API instead of inventing routes.
11. Persistent agents must coalesce, queue, or reject overlapping wakeups by
    policy; do not start duplicate write-capable runs accidentally.
12. When unsure, follow architecture docs and ask only when the decision would
    change product direction, data safety, permissions, or deployment risk.

## API Rules

- Route handlers should receive, validate, authorize, call internal logic, and
  return structured responses.
- Business logic should live behind the approved service/module boundary.
- API errors should be safe for users and useful for operators.

## Data Rules

- Validate before write.
- Preserve ownership and tenant/workspace boundaries.
- Prefer lifecycle transitions over irreversible deletion unless explicitly
  required.
- Handle conflicts and retries intentionally.
- Keep migrations, seed data, and rollback notes aligned.

## Error Handling

Never fail silently. Always:

- return or raise a safe failure
- preserve enough context for debugging
- avoid leaking secrets or provider internals
- document residual risk when verification is incomplete

Agent runtimes should additionally expose max-turn, timeout, cancellation,
budget, and adapter-startup failures as structured statuses rather than only
chat text or raw logs.

## Anti-Patterns

- merging multiple runtime stages into one convenience function
- bypassing the side-effect layer because it is faster
- direct database writes from agent tools or adapters
- hidden fallback paths that change behavior without visibility
- mock-only flows presented as implemented features
- duplicate contracts in parallel files
- ignoring config, trace, audit, or ownership fields

## Final Rule

Agents are building a system, not isolated code. Every change must respect
structure, flow, separation, evidence, and recovery.
