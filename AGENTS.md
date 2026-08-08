# AGENTS.md - Roost

## Paperclip ownership

This repository is an execution workspace for agents launched by the
LuckySparrow Paperclip Softwarehouse. Paperclip owns agent identity, role,
assignment, workflow, coordination, approvals, and agent skills. Do not create
or infer a second local agent hierarchy.

When a Paperclip run supplies instructions or an issue, those instructions and
that issue define the agent's operational role and scope. Repository guidance
only supplies project-specific technical context and must not replace the
Paperclip role.

## Context

Read `docs/documentation-contract.json`, then load its bounded
`defaultAgentContext` and only sources relevant to the assigned task. Product,
architecture, operations, and release truth lives under `docs/`; historical or
generated evidence is not higher-authority truth.

The `.agents/` directory is intentionally minimal. It must not contain agent
roles, prompts, task boards, project memory, coordination policy, or copies of
Paperclip instructions. Add a repository skill only when it is a narrowly
Roost-specific technical workflow that Paperclip does not already provide.

## Project boundaries

- Keep changes scoped to the assigned issue and preserve unrelated worktree
  changes.
- Follow the documented Roost architecture and update its canonical docs when
  behavior or contracts change.
- Run the smallest relevant verification first; report anything not verified.
- Never store secrets, credentials, tokens, cookies, or production account
  data in repository files, logs, screenshots, or generated artifacts.
- Treat commits, pushes, deployments, destructive actions, production changes,
  and external writes as governed actions requiring the authority stated in
  the Paperclip issue or approval.
