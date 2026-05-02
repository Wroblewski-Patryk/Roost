# Architecture Source Of Truth

This document defines how architecture decisions should be treated in the
repository.

## Purpose

The `docs/architecture/` folder is the canonical record of the application's
approved architecture:

- system boundaries
- ownership of data and state
- module and integration contracts
- deployment shape
- technology choices that are already decided

Treat these files as implementation constraints, not as loose suggestions.

## Default Rule

- Build the application to match the approved architecture.
- Do not silently change architecture during implementation.
- Do not reinterpret unclear architecture in a way that expands scope.
- If implementation exposes a gap or mismatch, stop implementation and escalate
  before changing architectural direction.
- Prefer asking for a decision over shipping an incorrect workaround.

## What Agents May Do Without Re-Approving Architecture

- implement work that fits the documented boundaries
- add clarifying detail that does not change behavior or ownership
- document discovered inconsistencies
- propose follow-up tasks that improve implementation quality inside the
  approved architecture

## What Requires Explicit User Approval First

- changing module boundaries or service responsibilities
- moving source-of-truth ownership for data or state
- replacing an approved integration pattern with another one
- changing deployment topology or runtime shape
- changing a confirmed tech-stack decision that affects architecture
- introducing a new cross-cutting pattern that contradicts existing
  architecture docs

## Mandatory Decision Flow For Mismatches

When implementation does not fit approved architecture:

1. describe the mismatch clearly
2. propose 2 to 3 valid options with tradeoffs
3. wait for explicit user decision

Agents must not self-approve a workaround or architecture rewrite.

If there is a strong argument for a better design, the agent should present the
case in conversation first, including tradeoffs and why the current
architecture may be insufficient. The agent must not self-approve the change.

## Required Architecture Files

At minimum, keep these files aligned:

- `docs/architecture/system-architecture.md`
- `docs/architecture/tech-stack.md`

Projects may add more architecture docs or ADRs, but these baseline files
should always stay current.

## Implementation Contract

Before architecture-impacting work is marked complete, confirm:

- the task still fits the approved architecture
- any deviation was explicitly approved
- the architecture docs and implementation remain synchronized
- no workaround path was introduced to bypass architecture constraints
- existing mechanisms were reused before proposing new structures
