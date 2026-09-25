# Orchestration and subagents

## Root ownership

The root agent owns the current outcome from inspection through demonstration.
It decides the integration order, protects shared state, reconciles results and
is the only agent that declares gate status.

Use subagents only when at least one of these is true:

- independent repository areas can be inspected in parallel;
- alternative failure causes benefit from separate investigation;
- a bounded component can be implemented without touching files owned by
  another active agent;
- an independent review materially reduces security, migration, release or
  evidence risk.

Keep short work, decisions depending on previous results and changes to shared
contracts in the root agent.

## Delegation contract

Every delegated task states:

- one concrete question or deliverable;
- allowed read and write scope;
- files or resources that must not be changed;
- required checks or evidence;
- whether the result is analysis, a patch or an independent review.

Do not delegate the same ambiguous objective to several agents. Do not ask a
subagent to decide product intent already recorded in canonical sources.

## Concurrent writes

Before allowing a subagent to edit:

1. Freeze the shared interface or contract it will use.
2. Assign a file surface that does not overlap another active writer.
3. Keep schema migrations, shared configuration, canonical planning and final
   integration under the root owner unless they are the subagent's sole,
   isolated assignment.
4. Require the subagent to list changed files and commands run.

The root agent then inspects the actual diff, resolves integration conflicts and
runs the material checks. A subagent's final message is never proof by itself.

## Reviews

Prefer an independent subagent review after a coherent implementation exists,
especially for database migrations, authority boundaries, secrets, release or
cross-process lifecycle. Give the reviewer the accepted requirements and raw
artifacts, not the desired verdict. The implementation owner fixes findings and
reruns verification before advancing the gate.

## Token and activity discipline

Parallelism must reduce elapsed time or improve evidence coverage. Do not spawn
agents for status narration, duplicate repo tours, or work that depends on the
same next result. Reuse an existing agent for a related follow-up when its
context remains valid.
