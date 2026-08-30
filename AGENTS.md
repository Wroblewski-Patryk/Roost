# AGENTS.md - Roost

## Context

Read `docs/documentation-contract.json`, then load its bounded
`defaultAgentContext` and only the sources relevant to the task. Product,
architecture, operations and release truth lives under `docs/`.

Do not create repository-local agent roles, task boards, project memory or
coordination systems. External tools such as Codex keep their
execution state outside this repository.

## Project boundaries

- Keep changes scoped and preserve unrelated worktree changes.
- Follow the documented architecture and update canonical docs when runtime
  behavior or contracts change.
- Run the smallest relevant verification first and report anything not run.
- Never store secrets, credentials, tokens, cookies, production data or
  sensitive logs in repository files or generated artifacts.
- Commits, pushes, deployments, destructive operations and external writes
  require the authority stated by the user or governing task.
