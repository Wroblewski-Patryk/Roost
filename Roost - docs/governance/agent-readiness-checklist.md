# Agent Readiness Checklist

## Purpose

Use this checklist before letting agents run autonomous implementation cycles in
a new or newly adopted project.

## Required Context

- [ ] `AGENTS.md` names the real project constraints.
- [ ] `.agents/workflows/general.md` names the actual stack, validation rules,
      and deployment posture.
- [ ] `.codex/context/PROJECT_STATE.md` contains real commands and paths.
- [ ] `.codex/context/TASK_BOARD.md` has an actionable `READY` or `NOW` item.
- [ ] `docs/README.md` points to the canonical docs that actually exist.
- [ ] New app or major surface work used
      `docs/governance/app-creation-playbook.md` and an app blueprint, or the
      project explicitly does not need one.
- [ ] User feedback that changes behavior, UX, visual direction, copy,
      priority, architecture, or validation has a durable home through
      `docs/governance/user-feedback-loop.md`.
- [ ] `docs/planning/mvp-next-commits.md` and the task board agree on the next
      task.
- [ ] Long-running projects have a project-control source such as
      `docs/operations/project-control-system.md` so old plans, evidence gaps,
      local gaps, blocked work, and future expansion are not mixed together.

## Required Safety

- [ ] Uncommitted user changes are identified before edits.
- [ ] No agent instruction points to `!template` or a sibling repository.
- [ ] No required instruction file is missing.
- [ ] No task requires a validation command that is unknown.
- [ ] Secrets, env files, and deploy credentials are documented by ownership,
      not copied into docs.
- [ ] Production, user data, payments, AI behavior, and background jobs are
      classified as high-risk when present.
- [ ] Agent-accessible tools, MCP routes, workflow commands, provider actions,
      or destructive operations follow
      `docs/operations/approval-aware-agent-command-flow.md` or a stricter
      project-specific policy.
- [ ] External operational-memory writes, if present, use scoped credentials,
      startup handshake, and API-only access as described in
      `docs/operations/external-operational-memory-agent-playbook.md`.

## Required Workflow

- [ ] Every task uses `.codex/templates/task-template.md` or a project-approved
      equivalent.
- [ ] Exactly one priority task is selected per implementation iteration.
- [ ] The first implementation slice is a real vertical slice, not a broad
      "build the app" task or mock-only scaffold.
- [ ] Accepted user feedback is reflected in the active task, queue,
      design-memory entry, learning-journal entry, docs, or open decision.
- [ ] The current stage is explicit.
- [ ] Validation evidence is required before `DONE`.
- [ ] Docs and context are updated when repo truth changes.
- [ ] Architecture-heavy projects have an adapted
      `docs/governance/agent-runtime-contract.md` that names the real runtime
      flow and side-effect boundary.
- [ ] Recurring mistakes are captured with `capture-agent-learnings`.

## Required Subagent Setup

- [ ] Subagents are used only when explicitly requested by the user or current
      operator instruction.
- [ ] Critical-path work stays with the main agent.
- [ ] Delegated work has non-overlapping ownership.
- [ ] Delegated output must list files changed, validation run, residual risks,
      and next step.
- [ ] The main agent integrates and verifies subagent output before closure.

## Ready Result

The project is agent-ready when a fresh agent can answer these questions in
under five minutes:

1. What is the product?
2. What stack and commands are real?
3. What task is next?
4. What files are safe to edit?
5. What checks prove the work?
6. What docs must change if behavior changes?
7. What deployment or user-risk constraints apply?
