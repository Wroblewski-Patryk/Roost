# Agent System Primitives

Last updated: YYYY-MM-DD

## Purpose

Use this document when the product contains AI agents, agentic workflow stages,
or long-running autonomous workers.

The goal is to keep agent architecture explicit enough that future agents can
extend it without turning the system into one large prompt, one hidden
side-effect path, or one untestable runtime blob.

## Core Distinction

Agents are processing units, not personalities.

Personality, tone, role, and brand behavior may shape how a response is
expressed, but they should not erase the boundary between:

- cognitive processing
- planning
- tool or command authorization
- side effects
- memory and reflection
- user-facing expression

## Agent Stage Rules

Every agent stage should have:

1. one responsibility
2. structured input
3. structured output
4. explicit ownership of the fields it reads and writes
5. no hidden side effects unless it is the approved action layer
6. observable failures, retries, and fallback behavior

Do not create a new agent when ordinary deterministic code is simpler,
clearer, and easier to test.

## Common Stage Model

Adapt this model to the project instead of copying it blindly:

```text
event -> perception -> context -> motivation -> role -> planning -> expression -> action -> memory -> reflection
```

Typical responsibilities:

| Stage | Responsibility | Side effects |
| --- | --- | --- |
| Perception | Identify event type, language, intent, topic, ambiguity, and initial risk. | No |
| Context | Build current-turn understanding from event, memory, identity, and goals. | No |
| Motivation | Estimate urgency, importance, salience, and whether to respond, clarify, or act. | No |
| Role | Select behavior stance or collaboration mode. | No |
| Planning | Decide next steps and emit typed domain intents. | No direct external effects |
| Expression | Shape message content, tone, language, and channel-neutral handoff. | No |
| Action | Execute approved commands, tool calls, writes, and deliveries. | Yes |
| Memory | Persist completed episode and durable facts after action result exists. | Yes, bounded |
| Reflection | Analyze patterns and update slower-moving state asynchronously. | Yes, bounded |

## Structured Contract Pattern

Use stable keys across boundaries so stages can be refactored, moved into a
graph runner, or tested independently.

Minimum shared-state shape:

```json
{
  "event": {},
  "identity": {},
  "memory": {},
  "goals": [],
  "tasks": [],
  "perception": {},
  "context": {},
  "motivation": {},
  "role": {},
  "plan": {},
  "expression": {},
  "action_result": {}
}
```

Rules:

1. Each stage reads only the fields it needs.
2. Each stage writes only its owned output key.
3. No stage returns the whole system state as its main output.
4. Conversion between direct runtime calls and graph state is explicit and
   testable.
5. Stage output keys remain stable during orchestration migrations.

## Tool And Agent Type Selection

Choose the simplest agent that fits the task.

| Use case | Prefer |
| --- | --- |
| Single-turn Q&A or classification | simple model call or deterministic function |
| Multi-step work with ordinary tools | function-calling orchestrator |
| Auditable thought/action traces | ReAct-style loop |
| Code generation plus execution | CodeAct or coding-agent runtime |
| Long-context decomposition | recursive or retrieval-backed agent |
| Untrusted input or broad filesystem access | sandboxed wrapper with mount allowlist |
| Scheduled autonomous work | persistent heartbeat agent |

Complex agents are justified by task shape, not by novelty.

## Tool Execution Contract

Tool-using agents should expose:

- a registry key or stable ID
- whether the agent accepts tools
- maximum turn count
- available tool names and schemas
- tool-call start/end telemetry
- tool result shape
- timeout and max-turn failure shape

Tool execution should parse arguments structurally, measure latency where
useful, and return safe errors instead of silently inventing results.

## Side-Effect Boundary

Cognitive stages do not:

- write to the database
- call external providers
- send messages
- mutate durable memory
- approve or execute risky commands

Only the approved action, delivery, memory, reflection, or runtime follow-up
layers may perform side effects, and only through the project-owned API or
service boundary.

## Debug And Observability Surface

Agent-heavy systems should provide a policy-gated debug surface that can expose
runtime structure without leaking private data into normal user payloads.

Useful debug fields:

- trace ID or event ID
- normalized event metadata
- stage outputs
- retrieved memory diagnostics
- selected role or skill metadata
- typed domain intents
- action result
- fallback path used
- runtime policy flags

Pair structural debug validation with user-facing scenario validation. A stage
can be structurally correct while still producing poor product behavior.

## Memory And Reflection

Memory writes should happen after the turn has enough context to be accurate:

1. event
2. context
3. selected role or plan
4. expression
5. action result
6. final episode summary

Reflection should update slower-moving state from repeated evidence, not from a
single weak signal. If reflection is asynchronous, expose queue mode, retry
policy, worker health, and failed-task recovery.

## Common Mistakes

- treating the agent's tone as the agent's architecture
- letting planning execute side effects
- letting action rewrite the answer
- letting expression mutate durable state
- adding an agent where a function would be clearer
- returning loose prose where a typed intent is required
- hiding fallback behavior from health, logs, or debug output
- making deployment shape decide architecture ownership

## Done Signal

This contract is useful when a fresh agent can answer:

1. Which stages exist?
2. What does each stage own?
3. Which layer may perform side effects?
4. Which outputs are stable contracts?
5. How are tool calls, memory writes, and reflection observed?
6. Which scenarios prove the behavior works?
